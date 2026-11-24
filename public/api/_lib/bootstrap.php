<?php
/**
 * MollBazar API bootstrap: config, database, errors, shared helpers.
 *
 * The API speaks the same HTTP protocol as Supabase (PostgREST /rest/v1,
 * GoTrue /auth/v1, Storage /storage/v1), so the existing frontend works
 * unchanged against this PHP + MySQL backend on Ahost.
 */
defined('MB_API') or exit;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
class ApiError extends Exception
{
    public $status;
    public $codeStr;
    public $details;
    public $hint;
    public $extra;

    public function __construct($status, $code, $message, $details = null, $hint = null, $extra = [])
    {
        parent::__construct($message);
        $this->status = (int)$status;
        $this->codeStr = (string)$code;
        $this->details = $details;
        $this->hint = $hint;
        $this->extra = $extra;
    }
}

/** RAISE EXCEPTION equivalent — PostgREST answers these with 400 / P0001. */
function raise_exception($message)
{
    throw new ApiError(400, 'P0001', $message);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function mb_config($key = null, $default = null)
{
    static $config = null;
    if ($config === null) {
        $defaults = [
            'db_host' => 'localhost',
            'db_port' => 3306,
            'db_name' => '',
            'db_user' => '',
            'db_pass' => '',
            'jwt_secret' => '',
            'site_url' => '',
            'additional_redirect_origins' => [],
            'access_token_ttl' => 3600,
            'autoconfirm_email' => true,
            'mail_from' => 'MollBazar <noreply@mollbazar.uz>',
            'resend_api_key' => '',
            'google_client_id' => '',
            'google_client_secret' => '',
            // Overridable only so the OAuth flow can be tested against a local stand-in.
            'google_auth_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'google_token_url' => 'https://oauth2.googleapis.com/token',
            'storage_dir' => dirname(__DIR__) . '/storage/v1/object/public',
            'tus_dir' => __DIR__ . '/../_data/tus',
            'max_upload_bytes' => 104857600,
            'vapid_public_key' => '',
            'vapid_private_key' => '',
            'vapid_subject' => 'mailto:admin@mollbazar.uz',
            'debug' => false,
        ];
        $loaded = [];
        $candidates = [];
        if (getenv('MOLLBAZAR_CONFIG')) $candidates[] = getenv('MOLLBAZAR_CONFIG');
        // Preferred: one directory ABOVE the web root, unreachable over HTTP.
        $docRoot = dirname(dirname(__DIR__));
        $candidates[] = dirname($docRoot) . '/mollbazar_config.php';
        $candidates[] = $docRoot . '/mollbazar_config.php';
        $candidates[] = __DIR__ . '/config.php';
        foreach ($candidates as $file) {
            if ($file && is_file($file)) {
                $value = require $file;
                if (is_array($value)) {
                    $loaded = $value;
                    break;
                }
            }
        }
        $config = array_merge($defaults, $loaded);
    }
    if ($key === null) return $config;
    return array_key_exists($key, $config) ? $config[$key] : $default;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
class Db
{
    /** @var PDO|null */
    private static $pdo = null;
    private static $depth = 0;

    public static function pdo()
    {
        if (self::$pdo === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                mb_config('db_host'),
                (int)mb_config('db_port'),
                mb_config('db_name')
            );
            try {
                self::$pdo = new PDO($dsn, mb_config('db_user'), mb_config('db_pass'), [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_STRINGIFY_FETCHES => false,
                ]);
            } catch (PDOException $e) {
                error_log('[MollBazar] DB connect failed: ' . $e->getMessage());
                throw new ApiError(503, 'PGRST000', "Ma'lumotlar bazasiga ulanib bo'lmadi");
            }
            // Store and compare every timestamp in UTC, like timestamptz.
            self::$pdo->exec("SET time_zone = '+00:00'");
            self::$pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        }
        return self::$pdo;
    }

    public static function query($sql, array $params = [])
    {
        try {
            $stmt = self::pdo()->prepare($sql);
            $stmt->execute(array_values($params));
            return $stmt;
        } catch (PDOException $e) {
            throw self::translate($e);
        }
    }

    public static function all($sql, array $params = [])
    {
        return self::query($sql, $params)->fetchAll();
    }

    public static function one($sql, array $params = [])
    {
        $row = self::query($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function value($sql, array $params = [])
    {
        $value = self::query($sql, $params)->fetchColumn();
        return $value === false ? null : $value;
    }

    public static function exec($sql, array $params = [])
    {
        return self::query($sql, $params)->rowCount();
    }

    /** Nested-safe transaction: only the outermost call commits. */
    public static function transaction(callable $fn)
    {
        $pdo = self::pdo();
        if (self::$depth === 0) $pdo->beginTransaction();
        self::$depth++;
        try {
            $result = $fn();
            self::$depth--;
            if (self::$depth === 0) $pdo->commit();
            return $result;
        } catch (Throwable $e) {
            self::$depth--;
            if (self::$depth === 0 && $pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /** Maps MySQL errors onto the PostgreSQL SQLSTATEs the frontend checks for. */
    public static function translate(PDOException $e)
    {
        $info = $e->errorInfo;
        $driverCode = isset($info[1]) ? (int)$info[1] : 0;
        $msg = isset($info[2]) ? $info[2] : $e->getMessage();
        switch ($driverCode) {
            case 1062:
                return new ApiError(409, '23505', 'duplicate key value violates unique constraint', $msg);
            case 1451:
                return new ApiError(409, '23503', 'update or delete on table violates foreign key constraint', $msg);
            case 1452:
                return new ApiError(409, '23503', 'insert or update on table violates foreign key constraint', $msg);
            case 1048:
            case 1364:
                return new ApiError(400, '23502', 'null value violates not-null constraint', $msg);
            case 1264:
            case 1265:
            case 1366:
            case 1292:
                return new ApiError(400, '22P02', 'invalid input syntax', $msg);
            case 1406:
                return new ApiError(400, '22001', 'value too long', $msg);
            case 3819:
            case 4025:
                return new ApiError(400, '23514', 'new row violates check constraint', $msg);
            case 1213:
            case 1205:
                return new ApiError(503, '40001', 'could not serialize access, please retry', $msg);
        }
        error_log('[MollBazar] SQL error: ' . $e->getMessage());
        return new ApiError(500, 'XX000', mb_config('debug') ? $msg : 'Server xatoligi', null);
    }
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
function uuid4()
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20);
}

function is_uuid($v)
{
    return is_string($v) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $v) === 1;
}

/** Current UTC time in MySQL DATETIME(6) format. */
function db_now()
{
    $d = new DateTime('now', new DateTimeZone('UTC'));
    return $d->format('Y-m-d H:i:s.u');
}

/** Today's date in Asia/Tashkent, as the Supabase functions used. */
function tashkent_today()
{
    $d = new DateTime('now', new DateTimeZone('Asia/Tashkent'));
    return $d->format('Y-m-d');
}

function random_token($bytes = 32)
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

function b64url_encode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode($data)
{
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function str_starts($haystack, $needle)
{
    return strncmp($haystack, $needle, strlen($needle)) === 0;
}

function request_header($name)
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    if (isset($_SERVER[$key])) return $_SERVER[$key];
    if ($key === 'HTTP_AUTHORIZATION') {
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) return $v;
            }
        }
    }
    if ($key === 'HTTP_CONTENT_TYPE' && isset($_SERVER['CONTENT_TYPE'])) return $_SERVER['CONTENT_TYPE'];
    if ($key === 'HTTP_CONTENT_LENGTH' && isset($_SERVER['CONTENT_LENGTH'])) return $_SERVER['CONTENT_LENGTH'];
    return null;
}

function request_method()
{
    return strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET');
}

function raw_body()
{
    static $body = null;
    if ($body === null) {
        $body = (string)file_get_contents('php://input');
    }
    return $body;
}

function json_body()
{
    $raw = raw_body();
    if ($raw === '') return null;
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new ApiError(400, 'PGRST102', 'Empty or invalid json');
    }
    return $data;
}

/**
 * Query-string parser that keeps repeated keys and dots — PHP's $_GET
 * collapses `created_at=gte.x&created_at=lte.y` and mangles `a.b` keys.
 * Returns a list of [key, value] pairs.
 */
function query_pairs()
{
    $qs = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
    $pairs = [];
    if ($qs === '') return $pairs;
    foreach (explode('&', $qs) as $part) {
        if ($part === '') continue;
        $eq = strpos($part, '=');
        if ($eq === false) {
            $pairs[] = [urldecode($part), ''];
        } else {
            $pairs[] = [urldecode(substr($part, 0, $eq)), urldecode(substr($part, $eq + 1))];
        }
    }
    return $pairs;
}

function query_param($name, $default = null)
{
    foreach (query_pairs() as $pair) {
        if ($pair[0] === $name) return $pair[1];
    }
    return $default;
}

function client_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? substr($_SERVER['REMOTE_ADDR'], 0, 64) : '';
}

function send_json($status, $data, array $headers = [])
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        foreach ($headers as $k => $v) header($k . ': ' . $v);
    }
    if (request_method() !== 'HEAD') {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    exit;
}

function send_empty($status, array $headers = [])
{
    if (!headers_sent()) {
        http_response_code($status);
        foreach ($headers as $k => $v) header($k . ': ' . $v);
    }
    exit;
}

/** Simple fixed-window rate limit stored in MySQL. */
function rate_limit($bucket, $limit, $windowSeconds)
{
    $key = substr($bucket, 0, 191);
    $now = time();
    $windowStart = $now - ($now % $windowSeconds);
    $row = Db::one('SELECT v, n FROM app_kv WHERE k = ?', [$key]);
    if ($row && (int)$row['v'] === $windowStart) {
        if ((int)$row['n'] >= $limit) {
            throw new ApiError(429, 'over_request_rate_limit', "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.");
        }
        Db::exec('UPDATE app_kv SET n = n + 1, updated_at = ? WHERE k = ?', [db_now(), $key]);
    } else {
        Db::exec(
            'INSERT INTO app_kv (k, v, n, updated_at) VALUES (?, ?, 1, ?) ON DUPLICATE KEY UPDATE v = VALUES(v), n = 1, updated_at = VALUES(updated_at)',
            [$key, (string)$windowStart, db_now()]
        );
    }
}

/** Atomic counter used for b2b order numbers (replaces a PG sequence). */
function next_sequence($name)
{
    return Db::transaction(function () use ($name) {
        $key = 'seq:' . $name;
        Db::exec('INSERT INTO app_kv (k, v, n, updated_at) VALUES (?, NULL, 0, ?) ON DUPLICATE KEY UPDATE k = k', [$key, db_now()]);
        $row = Db::one('SELECT n FROM app_kv WHERE k = ? FOR UPDATE', [$key]);
        $next = (int)$row['n'] + 1;
        Db::exec('UPDATE app_kv SET n = ?, updated_at = ? WHERE k = ?', [$next, db_now(), $key]);
        return $next;
    });
}
