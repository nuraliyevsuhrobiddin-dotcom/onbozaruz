<?php
/**
 * MollBazar API front controller (Ahost / cPanel).
 *
 * Exposes a Supabase-compatible surface under /api so the existing frontend
 * (supabase-js) works unchanged:
 *   /api/rest/v1/*     PostgREST          /api/auth/v1/*    GoTrue
 *   /api/storage/v1/*  Storage + tus      /api/health, /api/account/delete,
 *   /api/auth/send-welcome, /api/push/subscribe
 */
define('MB_API', true);

require __DIR__ . '/_lib/bootstrap.php';
require __DIR__ . '/_lib/schema_util.php';
require __DIR__ . '/_lib/context.php';
require __DIR__ . '/_lib/policies.php';
require __DIR__ . '/_lib/rest.php';
require __DIR__ . '/_lib/rpc.php';
require __DIR__ . '/_lib/auth.php';
require __DIR__ . '/_lib/mailer.php';
require __DIR__ . '/_lib/push.php';
require __DIR__ . '/_lib/mp4.php';
require __DIR__ . '/_lib/storage.php';
require __DIR__ . '/_lib/account.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);
// Non-fatal PHP diagnostics are logged, never turned into failed requests
// (hosting PHP versions differ and emit different deprecations).
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return false;
    error_log("[MollBazar] PHP notice ($severity): $message @ " . basename($file) . ":$line");
    return true;
});

$uri = (string)parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$pos = strpos($uri, '/api/');
$route = $pos === false ? '' : substr($uri, $pos + 5);
$method = request_method();
$area = 'app';
if (str_starts($route, 'rest/v1/')) $area = 'rest';
elseif (str_starts($route, 'auth/v1/')) $area = 'auth';
elseif (str_starts($route, 'storage/v1/')) $area = 'storage';

function mb_cors()
{
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if ($origin === '') return;
    $allowed = array_merge([rtrim((string)mb_config('site_url'), '/')], (array)mb_config('additional_redirect_origins'));
    if (!in_array(rtrim($origin, '/'), array_map(function ($o) { return rtrim($o, '/'); }, $allowed), true)) return;
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: authorization, apikey, x-client-info, content-type, prefer, accept, accept-profile, content-profile, range, x-upsert, x-supabase-api-version, tus-resumable, upload-length, upload-offset, upload-metadata, x-http-method-override');
    header('Access-Control-Allow-Methods: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Expose-Headers: Content-Range, Location, Upload-Offset, Upload-Length, Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size');
    header('Access-Control-Max-Age: 600');
}

function mb_error_response($area, ApiError $e)
{
    if ($area === 'auth') {
        if (str_starts($e->codeStr, 'PGRST30')) {
            // GoTrue wording for an invalid/expired bearer token.
            $e = new ApiError(403, 'bad_jwt', 'invalid JWT: unable to parse or verify signature, ' . $e->getMessage());
        }
        $body = array_merge(['code' => $e->status, 'error_code' => $e->codeStr, 'msg' => $e->getMessage(), 'message' => $e->getMessage()], $e->extra);
        send_json($e->status, $body);
    }
    if ($area === 'storage') {
        send_json($e->status, ['statusCode' => (string)$e->status, 'error' => $e->codeStr, 'message' => $e->getMessage()]);
    }
    if ($area === 'rest') {
        send_json($e->status, ['code' => $e->codeStr, 'message' => $e->getMessage(), 'details' => $e->details, 'hint' => $e->hint]);
    }
    send_json($e->status, ['ok' => false, 'error' => $e->getMessage()]);
}

try {
    mb_cors();
    if ($method === 'OPTIONS' && !str_starts($route, 'storage/v1/upload/resumable')) send_empty(204);
    if ($area !== 'app' || $route !== 'health') Maintenance::schedule();

    if ($area === 'rest') {
        Rest::handle(rawurldecode(substr($route, strlen('rest/v1/'))), $method);
    } elseif ($area === 'auth') {
        Auth::handle(substr($route, strlen('auth/v1/')), $method);
    } elseif ($area === 'storage') {
        Storage::handle(substr($route, strlen('storage/v1/')), $method);
    } else {
        switch (rtrim($route, '/')) {
            case 'health':
                Account::health();
            case 'account/delete':
                Account::delete();
            case 'auth/send-welcome':
                Account::sendWelcome();
            case 'push/subscribe':
                Account::pushSubscribe();
            case 'send-email':
            case 'auth/send-verification':
            case 'auth/send-password-reset':
                send_json(410, ['ok' => false, 'error' => "Bu endpoint o'chirilgan. Tizim xatlari server tomonidan yuboriladi."]);
        }
        throw new ApiError(404, 'not_found', 'Endpoint topilmadi');
    }
} catch (ApiError $e) {
    mb_error_response($area, $e);
} catch (Throwable $e) {
    error_log('[MollBazar] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $msg = mb_config('debug') ? $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine() : 'Server xatoligi';
    mb_error_response($area, new ApiError(500, $area === 'auth' ? 'unexpected_failure' : 'XX000', $msg));
}
