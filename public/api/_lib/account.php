<?php
/**
 * Former Vercel serverless functions, now PHP:
 *   POST /api/account/delete, POST /api/auth/send-welcome, POST /api/push/subscribe, GET /api/health
 * plus periodic housekeeping that used to be pg_cron.
 */
defined('MB_API') or exit;

class Account
{
    private static function requireActiveUser()
    {
        $ctx = Ctx::current();
        if (!$ctx->isAuthenticated()) send_json(401, ['ok' => false, 'error' => 'Autentifikatsiya talab qilinadi.']);
        if ($ctx->sessionId && !Db::value('SELECT 1 FROM auth_sessions WHERE id = ?', [$ctx->sessionId])) {
            send_json(401, ['ok' => false, 'error' => 'Sessiya yaroqsiz yoki muddati tugagan.']);
        }
        if (!$ctx->isActive()) send_json(403, ['ok' => false, 'error' => 'Akkaunt faol emas.']);
        return $ctx;
    }

    public static function delete()
    {
        if (request_method() !== 'POST') send_json(405, ['ok' => false, 'error' => "Faqat POST so'rovi qabul qilinadi."]);
        $ctx = self::requireActiveUser();
        Db::transaction(function () use ($ctx) {
            // profiles -> auth_users is ON DELETE CASCADE, and every app table cascades from profiles.
            Db::exec('DELETE FROM auth_users WHERE id = ?', [$ctx->uid]);
        });
        self::removeTree(Storage::root() . '/' . Storage::BUCKET . '/' . $ctx->uid);
        send_json(200, ['ok' => true]);
    }

    private static function removeTree($dir)
    {
        if (!is_dir($dir) || !is_uuid(basename($dir))) return;
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $f) {
            if ($f->isDir()) @rmdir($f->getPathname());
            else @unlink($f->getPathname());
        }
        @rmdir($dir);
    }

    public static function sendWelcome()
    {
        if (request_method() !== 'POST') send_json(405, ['ok' => false, 'error' => "Faqat POST so'rovi qabul qilinadi."]);
        $ctx = self::requireActiveUser();
        $u = Db::one('SELECT * FROM auth_users WHERE id = ?', [$ctx->uid]);
        if (!$u || !$u['email_confirmed_at']) send_json(403, ['ok' => false, 'error' => 'Avval email manzilini tasdiqlang.']);
        if (!$u['email']) send_json(400, ['ok' => false, 'error' => 'Akkauntingizda email manzili topilmadi.']);
        $claimed = Db::transaction(function () use ($ctx) {
            $row = Db::one('SELECT claimed_at FROM welcome_email_claims WHERE user_id = ? FOR UPDATE', [$ctx->uid]);
            if ($row && strtotime($row['claimed_at'] . ' UTC') > time() - 600) return false;
            Db::exec('INSERT INTO welcome_email_claims (user_id, claimed_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE claimed_at = VALUES(claimed_at)', [$ctx->uid, db_now()]);
            return true;
        });
        if (!$claimed) send_json(429, ['ok' => false, 'error' => 'Xush kelibsiz xati yaqinda yuborilgan.']);
        $meta = json_decode((string)$u['raw_user_meta_data'], true);
        $name = is_array($meta) && isset($meta['name']) && is_string($meta['name']) ? mb_substr($meta['name'], 0, 120) : '';
        $role = is_array($meta) && isset($meta['role']) && in_array($meta['role'], ['business', 'seller', 'buyer'], true) ? $meta['role'] : 'seller';
        if (!Mailer::welcome(strtolower($u['email']), $name, $role)) send_json(500, ['ok' => false, 'error' => 'Email yuborishda xatolik yuz berdi.']);
        send_json(200, ['ok' => true, 'message' => 'Xush kelibsiz xati muvaffaqiyatli yuborildi.']);
    }

    public static function pushSubscribe()
    {
        if (request_method() !== 'POST') send_json(405, ['ok' => false, 'error' => "Faqat POST so'rovi qabul qilinadi."]);
        $ctx = self::requireActiveUser();
        $body = json_body();
        $endpoint = is_array($body) && isset($body['endpoint']) ? $body['endpoint'] : null;
        $keys = is_array($body) && isset($body['keys']) && is_array($body['keys']) ? $body['keys'] : [];
        $p256dh = isset($keys['p256dh']) ? $keys['p256dh'] : null;
        $auth = isset($keys['auth']) ? $keys['auth'] : null;
        if (!Push::isAllowedEndpoint($endpoint) || !Push::isValidKeys($p256dh, $auth)) {
            send_json(422, ['ok' => false, 'error' => "Push subscription ma'lumoti yaroqsiz."]);
        }
        Db::exec('INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, updated_at) VALUES (?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), updated_at = VALUES(updated_at)',
            [$endpoint, $ctx->uid, $p256dh, $auth, db_now()]);
        send_json(201, ['ok' => true]);
    }

    public static function health()
    {
        $db = 'ok';
        try { Db::value('SELECT 1'); } catch (Throwable $e) { $db = 'error'; }
        send_json($db === 'ok' ? 200 : 503, [
            'status' => $db === 'ok' ? 'ok' : 'degraded',
            'database' => $db,
            'email' => trim((string)mb_config('resend_api_key')) !== '' ? 'resend' : 'php-mail',
            'push' => Push::configured() ? 'enabled' : 'disabled',
            'time' => gmdate('c'),
        ]);
    }
}

class Maintenance
{
    /** Hourly housekeeping (replaces pg_cron delete-expired-posts). Runs after the response. */
    public static function schedule()
    {
        register_shutdown_function(function () {
            try {
                $last = Db::value("SELECT n FROM app_kv WHERE k = 'maintenance:last'");
                if ($last !== null && (int)$last > time() - 3600) return;
                Db::exec("INSERT INTO app_kv (k, v, n, updated_at) VALUES ('maintenance:last', NULL, ?, ?) ON DUPLICATE KEY UPDATE n = VALUES(n), updated_at = VALUES(updated_at)", [time(), db_now()]);
                Db::exec('DELETE FROM posts WHERE expires_at IS NOT NULL AND expires_at < ?', [db_now()]);
                $dayAgo = gmdate('Y-m-d H:i:s', time() - 86400);
                Db::exec('DELETE FROM auth_flow_state WHERE created_at < ?', [$dayAgo]);
                Db::exec('DELETE FROM auth_one_time_tokens WHERE created_at < ?', [gmdate('Y-m-d H:i:s', time() - 2 * 86400)]);
                Db::exec("DELETE FROM app_kv WHERE k NOT LIKE 'seq:%' AND k <> 'maintenance:last' AND updated_at < ?", [$dayAgo]);
                Db::exec('DELETE FROM auth_refresh_tokens WHERE revoked = 1 AND updated_at < ?', [$dayAgo]);
                Tus::cleanup();
            } catch (Throwable $e) {
                error_log('[MollBazar] maintenance failed: ' . $e->getMessage());
            }
        });
    }
}
