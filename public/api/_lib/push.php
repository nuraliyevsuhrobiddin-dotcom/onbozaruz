<?php
/**
 * Web Push (RFC 8030 / 8291 aes128gcm / RFC 8292 VAPID) without external
 * libraries — replaces the Supabase pg_net trigger + Vercel /api/push/deliver.
 * Deliveries run after the HTTP response has been flushed.
 */
defined('MB_API') or exit;

class Push
{
    private static $queue = [];
    private static $registered = false;

    public static function configured()
    {
        return mb_config('vapid_public_key') !== '' && mb_config('vapid_private_key') !== ''
            && function_exists('openssl_pkey_derive') && function_exists('curl_multi_init') && function_exists('hash_hkdf');
    }

    public static function queue($notificationId)
    {
        if (!self::configured()) return;
        self::$queue[] = $notificationId;
        if (!self::$registered) {
            self::$registered = true;
            register_shutdown_function([__CLASS__, 'flush']);
        }
    }

    public static function flush()
    {
        if (!self::$queue) return;
        if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
        elseif (function_exists('litespeed_finish_request')) @litespeed_finish_request();
        @ignore_user_abort(true);
        @set_time_limit(30);
        $ids = array_unique(self::$queue);
        self::$queue = [];
        try {
            foreach ($ids as $id) self::deliver($id);
        } catch (Throwable $e) {
            error_log('[MollBazar] push delivery error: ' . $e->getMessage());
        }
    }

    public static function isAllowedEndpoint($endpoint)
    {
        if (!is_string($endpoint) || strlen($endpoint) > 700) return false;
        $u = parse_url($endpoint);
        if (!$u || (isset($u['scheme']) ? $u['scheme'] : '') !== 'https' || isset($u['user']) || isset($u['pass']) || isset($u['port']) || isset($u['fragment'])) return false;
        $h = isset($u['host']) ? strtolower($u['host']) : '';
        return in_array($h, ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'wns.windows.com'], true)
            || substr($h, -strlen('.notify.windows.com')) === '.notify.windows.com';
    }

    public static function isValidKeys($p256dh, $auth)
    {
        if (!is_string($p256dh) || !is_string($auth)) return false;
        if (!preg_match('/^[A-Za-z0-9_-]{87}=?$/', $p256dh) || !preg_match('/^[A-Za-z0-9_-]{22}(==)?$/', $auth)) return false;
        $pub = b64url_decode(rtrim($p256dh, '='));
        return strlen($pub) === 65 && ord($pub[0]) === 4 && strlen(b64url_decode(rtrim($auth, '='))) === 16;
    }

    private static function targetUrl($n)
    {
        $t = $n['target_type'];
        $id = $n['target_id'];
        if ($t === 'b2b_order' && $id) return '/#market/order/' . rawurlencode($id);
        if ($t === 'b2b_product' && $id) return '/#market/product/' . rawurlencode($id);
        if ($t === 'order') return '/#profile/orders';
        if ($t === 'supplier_profile') return '/#market/dashboard';
        return '/#home';
    }

    private static function deliver($notificationId)
    {
        $n = Db::one('SELECT id, user_id, title, body, target_type, target_id, type FROM notifications WHERE id = ?', [$notificationId]);
        if (!$n) return;
        $subs = Db::all('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [$n['user_id']]);
        if (!$subs) return;
        $payload = json_encode([
            'title' => $n['title'],
            'body' => (string)$n['body'],
            'tag' => 'mollbazar-' . $n['id'],
            'data' => ['url' => self::targetUrl($n)],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $topic = 'n-' . substr(str_replace('-', '', $n['id']), 0, 30);

        $mh = curl_multi_init();
        $handles = [];
        foreach ($subs as $s) {
            if (!self::isAllowedEndpoint($s['endpoint']) || !self::isValidKeys($s['p256dh'], $s['auth'])) {
                Db::exec('DELETE FROM push_subscriptions WHERE endpoint = ?', [$s['endpoint']]);
                continue;
            }
            $body = self::encrypt($payload, $s['p256dh'], $s['auth']);
            if ($body === null) continue;
            $ch = curl_init($s['endpoint']);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => [
                    'TTL: 3600',
                    'Urgency: high',
                    'Topic: ' . $topic,
                    'Content-Type: application/octet-stream',
                    'Content-Encoding: aes128gcm',
                    'Authorization: ' . self::vapidHeader($s['endpoint']),
                ],
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[] = [$ch, $s['endpoint']];
        }
        do {
            $status = curl_multi_exec($mh, $running);
            if ($running) curl_multi_select($mh, 1.0);
        } while ($running && $status === CURLM_OK);
        foreach ($handles as $h) {
            $code = (int)curl_getinfo($h[0], CURLINFO_HTTP_CODE);
            if ($code === 404 || $code === 410) Db::exec('DELETE FROM push_subscriptions WHERE endpoint = ?', [$h[1]]);
            elseif ($code >= 400 || $code === 0) error_log('[MollBazar] push delivery failed with HTTP ' . $code);
            curl_multi_remove_handle($mh, $h[0]);
            curl_close($h[0]);
        }
        curl_multi_close($mh);
    }

    // ---------------------------------------------------------- crypto
    private static function der2pemPublic($raw65)
    {
        $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $raw65;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private static function privatePem($d32, $pub65)
    {
        $der = hex2bin('30770201010420') . $d32 . hex2bin('a00a06082a8648ce3d030107a144034200') . $pub65;
        return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
    }

    private static function pad32($s)
    {
        return str_pad($s, 32, "\0", STR_PAD_LEFT);
    }

    /** aes128gcm content encoding (RFC 8291). */
    public static function encrypt($payload, $p256dhB64, $authB64)
    {
        $uaPublic = b64url_decode(rtrim($p256dhB64, '='));
        $authSecret = b64url_decode(rtrim($authB64, '='));
        $local = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        if (!$local) return null;
        $details = openssl_pkey_get_details($local);
        $asPublic = "\x04" . self::pad32($details['ec']['x']) . self::pad32($details['ec']['y']);
        $peer = openssl_pkey_get_public(self::der2pemPublic($uaPublic));
        if (!$peer) return null;
        $ecdh = openssl_pkey_derive($peer, $local, 32);
        if ($ecdh === false) return null;
        $ecdh = self::pad32($ecdh);
        $ikm = hash_hkdf('sha256', $ecdh, 32, "WebPush: info\0" . $uaPublic . $asPublic, $authSecret);
        $salt = random_bytes(16);
        $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
        $tag = '';
        $cipher = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($cipher === false) return null;
        return $salt . pack('N', 4096) . chr(65) . $asPublic . $cipher . $tag;
    }

    private static function vapidHeader($endpoint)
    {
        $u = parse_url($endpoint);
        $aud = $u['scheme'] . '://' . $u['host'];
        $header = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $claims = b64url_encode(json_encode(['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => (string)mb_config('vapid_subject')]));
        $pub = b64url_decode(rtrim((string)mb_config('vapid_public_key'), '='));
        $priv = b64url_decode(rtrim((string)mb_config('vapid_private_key'), '='));
        $key = openssl_pkey_get_private(self::privatePem(self::pad32($priv), $pub));
        $der = '';
        openssl_sign("$header.$claims", $der, $key, OPENSSL_ALGO_SHA256);
        $sig = self::derToRaw($der);
        return 'vapid t=' . "$header.$claims." . b64url_encode($sig) . ', k=' . rtrim((string)mb_config('vapid_public_key'), '=');
    }

    /** ECDSA DER signature -> 64-byte r||s. */
    private static function derToRaw($der)
    {
        $offset = 2;
        if (ord($der[1]) & 0x80) $offset += ord($der[1]) & 0x7f;
        $rLen = ord($der[$offset + 1]);
        $r = substr($der, $offset + 2, $rLen);
        $offset = $offset + 2 + $rLen;
        $sLen = ord($der[$offset + 1]);
        $s = substr($der, $offset + 2, $sLen);
        $r = ltrim($r, "\0");
        $s = ltrim($s, "\0");
        return self::pad32($r) . self::pad32($s);
    }
}
