<?php
/**
 * Supabase Storage-compatible /storage/v1 for the public `listing-media` bucket.
 *   POST|PUT /object/{bucket}/{path}        multipart or raw upload
 *   DELETE   /object/{bucket}  {prefixes}   remove
 *   TUS      /upload/resumable[/{id}]       resumable uploads (large videos)
 * Files are written to <api>/storage/v1/object/public/{bucket}/{path}, so the
 * public URL supabase-js builds is served directly by Apache/LiteSpeed.
 */
defined('MB_API') or exit;

class Storage
{
    const BUCKET = 'listing-media';

    private static function allowedMimes()
    {
        return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    }

    private static function allowedExts()
    {
        return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'];
    }

    public static function fail($status, $error, $message)
    {
        throw new ApiError($status, $error, $message);
    }

    public static function handle($path, $method)
    {
        $path = ltrim($path, '/');
        if ($path === 'upload/resumable' || str_starts($path, 'upload/resumable/')) {
            $id = trim(substr($path, strlen('upload/resumable')), '/');
            Tus::handle($id, $method);
            return;
        }
        if (str_starts($path, 'object/public/')) {
            self::servePublic(substr($path, strlen('object/public/')));
            return;
        }
        if (str_starts($path, 'object/')) {
            $rest = substr($path, strlen('object/'));
            $slash = strpos($rest, '/');
            $bucket = $slash === false ? $rest : substr($rest, 0, $slash);
            $object = $slash === false ? '' : substr($rest, $slash + 1);
            if ($method === 'DELETE' && $object === '') { self::remove($bucket); return; }
            if ($method === 'POST' || $method === 'PUT') { self::upload($bucket, $object, $method === 'PUT'); return; }
        }
        self::fail(404, 'not_found', 'Route not found');
    }

    public static function root()
    {
        return rtrim((string)mb_config('storage_dir'), '/\\');
    }

    /** Validates bucket + object name; returns the cleaned object name. */
    public static function cleanObject($bucket, $object)
    {
        if ($bucket !== self::BUCKET) self::fail(404, 'Bucket not found', 'Bucket not found');
        $object = rawurldecode($object);
        $segments = array_values(array_filter(explode('/', $object), function ($s) { return $s !== ''; }));
        if (!$segments || count($segments) > 6 || strlen($object) > 400) self::fail(400, 'InvalidKey', 'Invalid key: ' . $object);
        foreach ($segments as $seg) {
            if ($seg === '.' || $seg === '..' || !preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/', $seg)) {
                self::fail(400, 'InvalidKey', 'Invalid key: ' . $object);
            }
        }
        $ext = strtolower(pathinfo(end($segments), PATHINFO_EXTENSION));
        if (!in_array($ext, self::allowedExts(), true)) {
            self::fail(415, 'invalid_mime_type', 'mime type not supported');
        }
        return implode('/', $segments);
    }

    /** storage.foldername(name)[1] = auth.uid() OR is_admin(), active account only. */
    public static function assertCanWrite(Ctx $ctx, $object)
    {
        if (!$ctx->isAuthenticated()) self::fail(403, 'Unauthorized', 'new row violates row-level security policy');
        if (!$ctx->isActive()) self::fail(403, 'Unauthorized', 'new row violates row-level security policy');
        $first = explode('/', $object)[0];
        if ($first !== $ctx->uid && !$ctx->isAdmin()) {
            self::fail(403, 'Unauthorized', 'new row violates row-level security policy');
        }
    }

    public static function detectMime($file, $claimed)
    {
        $mime = '';
        if (function_exists('finfo_open')) {
            $f = finfo_open(FILEINFO_MIME_TYPE);
            if ($f) { $mime = (string)finfo_file($f, $file); finfo_close($f); }
        }
        if ($mime === '' || $mime === 'application/octet-stream') $mime = (string)$claimed;
        if ($mime === 'image/jpg') $mime = 'image/jpeg';
        return $mime;
    }

    public static function assertMedia($file, $claimed)
    {
        $mime = self::detectMime($file, $claimed);
        if (!in_array($mime, self::allowedMimes(), true)) {
            self::fail(415, 'invalid_mime_type', "mime type $mime is not supported");
        }
        return $mime;
    }

    public static function targetPath($object)
    {
        return self::root() . '/' . self::BUCKET . '/' . $object;
    }

    public static function place($tmpFile, $object, $isUploadedFile)
    {
        $target = self::targetPath($object);
        $dir = dirname($target);
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            self::fail(500, 'internal', 'Storage directory is not writable');
        }
        $ok = $isUploadedFile ? @move_uploaded_file($tmpFile, $target) : @rename($tmpFile, $target);
        if (!$ok && !$isUploadedFile) $ok = @copy($tmpFile, $target) && @unlink($tmpFile);
        if (!$ok) self::fail(500, 'internal', 'Faylni saqlab bo‘lmadi');
        @chmod($target, 0644);
        // Phone videos usually keep their index at the end; move it to the front
        // so playback can start after the first bytes arrive.
        if (preg_match('/\.(mp4|m4v|mov)$/i', $target)) Mp4::faststart($target);
        return $target;
    }

    private static function upload($bucket, $object, $isPut)
    {
        $ctx = Ctx::current();
        $object = self::cleanObject($bucket, $object);
        self::assertCanWrite($ctx, $object);
        $upsert = $isPut || strtolower((string)request_header('x-upsert')) === 'true';
        $target = self::targetPath($object);
        if (file_exists($target) && !$upsert) self::fail(409, 'Duplicate', 'The resource already exists');
        $max = (int)mb_config('max_upload_bytes');

        $contentType = (string)request_header('Content-Type');
        if (stripos($contentType, 'multipart/form-data') !== false) {
            $file = null;
            foreach ($_FILES as $f) { if (is_array($f) && isset($f['tmp_name']) && !is_array($f['tmp_name'])) { $file = $f; break; } }
            if (!$file) {
                if (empty($_FILES) && (int)request_header('Content-Length') > 0) self::fail(413, 'Payload too large', 'The object exceeded the maximum allowed size');
                self::fail(400, 'InvalidRequest', 'No file uploaded');
            }
            if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) self::fail(413, 'Payload too large', 'The object exceeded the maximum allowed size');
            if ($file['error'] !== UPLOAD_ERR_OK) self::fail(400, 'InvalidRequest', 'Upload failed (' . $file['error'] . ')');
            if ($file['size'] > $max) self::fail(413, 'Payload too large', 'The object exceeded the maximum allowed size');
            self::assertMedia($file['tmp_name'], $file['type']);
            self::place($file['tmp_name'], $object, true);
        } else {
            $tmp = tempnam(sys_get_temp_dir(), 'mbup');
            $in = fopen('php://input', 'rb');
            $out = fopen($tmp, 'wb');
            $bytes = stream_copy_to_stream($in, $out, $max + 1);
            fclose($in);
            fclose($out);
            if ($bytes > $max) { @unlink($tmp); self::fail(413, 'Payload too large', 'The object exceeded the maximum allowed size'); }
            if ($bytes === 0) { @unlink($tmp); self::fail(400, 'InvalidRequest', 'Empty body'); }
            try {
                self::assertMedia($tmp, $contentType);
            } catch (ApiError $e) {
                @unlink($tmp);
                throw $e;
            }
            self::place($tmp, $object, false);
        }
        send_json(200, ['Key' => self::BUCKET . '/' . $object, 'Id' => uuid4()]);
    }

    private static function remove($bucket)
    {
        $ctx = Ctx::current();
        if ($bucket !== self::BUCKET) self::fail(404, 'Bucket not found', 'Bucket not found');
        $body = json_body();
        $prefixes = is_array($body) && isset($body['prefixes']) && is_array($body['prefixes']) ? $body['prefixes'] : [];
        $deleted = [];
        foreach ($prefixes as $p) {
            try {
                $object = self::cleanObject($bucket, (string)$p);
                self::assertCanWrite($ctx, $object);
            } catch (ApiError $e) {
                continue;
            }
            $target = self::targetPath($object);
            if (is_file($target) && @unlink($target)) {
                $deleted[] = ['name' => $object, 'bucket_id' => $bucket, 'id' => uuid4(), 'metadata' => new stdClass()];
            }
        }
        send_json(200, $deleted);
    }

    /** Only reached when the web server did not find the file itself. */
    private static function servePublic($rest)
    {
        $slash = strpos($rest, '/');
        if ($slash === false) self::fail(404, 'not_found', 'Object not found');
        try {
            $object = self::cleanObject(substr($rest, 0, $slash), substr($rest, $slash + 1));
        } catch (ApiError $e) {
            self::fail(404, 'not_found', 'Object not found');
        }
        $file = self::targetPath($object);
        if (!is_file($file)) self::fail(404, 'not_found', 'Object not found');
        $mime = self::detectMime($file, 'application/octet-stream');
        $size = filesize($file);
        header('Content-Type: ' . $mime);
        header('Accept-Ranges: bytes');
        header('Cache-Control: public, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        $start = 0;
        $end = $size - 1;
        if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
            if ($m[1] !== '') $start = (int)$m[1];
            if ($m[2] !== '') $end = min((int)$m[2], $size - 1);
            if ($m[1] === '' && $m[2] !== '') { $start = max(0, $size - (int)$m[2]); $end = $size - 1; }
            if ($start > $end || $start >= $size) {
                header('Content-Range: bytes */' . $size);
                send_empty(416);
            }
            http_response_code(206);
            header("Content-Range: bytes $start-$end/$size");
        }
        header('Content-Length: ' . ($end - $start + 1));
        if (request_method() === 'HEAD') exit;
        $fp = fopen($file, 'rb');
        fseek($fp, $start);
        $left = $end - $start + 1;
        while ($left > 0 && !feof($fp)) {
            $chunk = fread($fp, (int)min(65536, $left));
            echo $chunk;
            $left -= strlen($chunk);
            flush();
        }
        fclose($fp);
        exit;
    }
}

/** Minimal tus 1.0.0 server (creation, creation-with-upload, termination). */
class Tus
{
    private static function dir()
    {
        $d = rtrim((string)mb_config('tus_dir'), '/\\');
        if (!is_dir($d)) @mkdir($d, 0755, true);
        return $d;
    }

    private static function headers(array $extra = [])
    {
        header('Tus-Resumable: 1.0.0');
        header('Cache-Control: no-store');
        foreach ($extra as $k => $v) header("$k: $v");
    }

    private static function metaFile($id)
    {
        if (!preg_match('/^[0-9a-f-]{36}$/', $id)) Storage::fail(404, 'not_found', 'Upload not found');
        return self::dir() . '/' . $id . '.json';
    }

    private static function load($id)
    {
        $file = self::metaFile($id);
        if (!is_file($file)) Storage::fail(404, 'not_found', 'Upload not found');
        $meta = json_decode((string)file_get_contents($file), true);
        $ctx = Ctx::current();
        if (!is_array($meta) || !$ctx->isAuthenticated() || $meta['uid'] !== $ctx->uid) Storage::fail(403, 'Unauthorized', 'Upload belongs to another user');
        return $meta;
    }

    private static function save($id, array $meta)
    {
        file_put_contents(self::metaFile($id), json_encode($meta), LOCK_EX);
    }

    public static function handle($id, $method)
    {
        if ($method === 'OPTIONS') {
            self::headers(['Tus-Version' => '1.0.0', 'Tus-Extension' => 'creation,creation-with-upload,termination', 'Tus-Max-Size' => (string)(int)mb_config('max_upload_bytes')]);
            send_empty(204);
        }
        if ($id === '' && $method === 'POST') self::create();
        if ($id !== '' && $method === 'HEAD') {
            $meta = self::load($id);
            self::headers(['Upload-Offset' => (string)$meta['offset'], 'Upload-Length' => (string)$meta['length']]);
            send_empty(200);
        }
        if ($id !== '' && ($method === 'PATCH' || ($method === 'POST' && strtoupper((string)request_header('X-HTTP-Method-Override')) === 'PATCH'))) self::patch($id);
        if ($id !== '' && $method === 'DELETE') {
            self::load($id);
            @unlink(self::dir() . '/' . $id . '.part');
            @unlink(self::metaFile($id));
            self::headers();
            send_empty(204);
        }
        Storage::fail(405, 'method_not_allowed', 'Method not allowed');
    }

    private static function parseMetadata($header)
    {
        $out = [];
        foreach (explode(',', (string)$header) as $pair) {
            $pair = trim($pair);
            if ($pair === '') continue;
            $bits = explode(' ', $pair, 2);
            $out[$bits[0]] = isset($bits[1]) ? (string)base64_decode($bits[1]) : '';
        }
        return $out;
    }

    private static function create()
    {
        $ctx = Ctx::current();
        $length = request_header('Upload-Length');
        if ($length === null || !preg_match('/^\d+$/', $length)) Storage::fail(400, 'InvalidRequest', 'Upload-Length required');
        $length = (int)$length;
        if ($length > (int)mb_config('max_upload_bytes')) Storage::fail(413, 'Payload too large', 'The object exceeded the maximum allowed size');
        $meta = self::parseMetadata(request_header('Upload-Metadata'));
        $bucket = isset($meta['bucketName']) ? $meta['bucketName'] : '';
        $object = Storage::cleanObject($bucket, isset($meta['objectName']) ? $meta['objectName'] : '');
        Storage::assertCanWrite($ctx, $object);
        $contentType = isset($meta['contentType']) ? $meta['contentType'] : '';
        if ($contentType !== '' && !in_array($contentType, ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'image/jpg'], true)) {
            Storage::fail(415, 'invalid_mime_type', "mime type $contentType is not supported");
        }
        $upsert = strtolower((string)request_header('x-upsert')) === 'true';
        if (file_exists(Storage::targetPath($object)) && !$upsert) Storage::fail(409, 'Duplicate', 'The resource already exists');
        $id = uuid4();
        $state = ['uid' => $ctx->uid, 'object' => $object, 'length' => $length, 'offset' => 0, 'contentType' => $contentType, 'created' => time()];
        touch(self::dir() . '/' . $id . '.part');
        self::save($id, $state);
        $location = self::location($id);
        if (stripos((string)request_header('Content-Type'), 'application/offset+octet-stream') !== false && (int)request_header('Content-Length') > 0) {
            $state = self::append($id, $state);
        }
        self::headers(['Location' => $location, 'Upload-Offset' => (string)$state['offset']]);
        send_empty(201);
    }

    private static function location($id)
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $base = substr($uri, 0, strpos($uri, '/storage/v1/upload/resumable'));
        return ($https ? 'https://' : 'http://') . $host . $base . '/storage/v1/upload/resumable/' . $id;
    }

    private static function patch($id)
    {
        $state = self::load($id);
        if (stripos((string)request_header('Content-Type'), 'application/offset+octet-stream') === false) {
            Storage::fail(415, 'InvalidRequest', 'Content-Type must be application/offset+octet-stream');
        }
        $offset = request_header('Upload-Offset');
        if ($offset === null || (int)$offset !== (int)$state['offset']) {
            self::headers(['Upload-Offset' => (string)$state['offset']]);
            Storage::fail(409, 'Conflict', 'Upload-Offset mismatch');
        }
        $state = self::append($id, $state);
        self::headers(['Upload-Offset' => (string)$state['offset']]);
        send_empty(204);
    }

    private static function append($id, array $state)
    {
        $part = self::dir() . '/' . $id . '.part';
        $in = fopen('php://input', 'rb');
        $out = fopen($part, 'ab');
        if (!flock($out, LOCK_EX)) Storage::fail(423, 'Locked', 'Upload is locked');
        $remaining = $state['length'] - $state['offset'];
        $written = stream_copy_to_stream($in, $out, $remaining + 1);
        flock($out, LOCK_UN);
        fclose($in);
        fclose($out);
        if ($written > $remaining) {
            @unlink($part);
            @unlink(self::metaFile($id));
            Storage::fail(413, 'Payload too large', 'Upload exceeds declared Upload-Length');
        }
        $state['offset'] += $written;
        if ($state['offset'] >= $state['length']) {
            try {
                Storage::assertMedia($part, $state['contentType']);
                Storage::place($part, $state['object'], false);
            } finally {
                @unlink($part);
                @unlink(self::metaFile($id));
            }
        } else {
            self::save($id, $state);
        }
        return $state;
    }

    public static function cleanup()
    {
        $d = self::dir();
        foreach (glob($d . '/*.json') ?: [] as $f) {
            if (filemtime($f) < time() - 86400) {
                @unlink($f);
                @unlink(substr($f, 0, -5) . '.part');
            }
        }
    }
}
