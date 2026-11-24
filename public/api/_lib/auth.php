<?php
/**
 * GoTrue-compatible /auth/v1 — what supabase-js (auth-js) calls:
 *   POST /signup, POST /token?grant_type=password|refresh_token|pkce,
 *   GET|PUT /user, POST /logout, POST /recover, POST /resend,
 *   GET /verify, GET /authorize?provider=google, GET /callback, GET /settings
 *
 * Passwords are bcrypt (identical to Supabase's encrypted_password), so
 * migrated users keep signing in with their existing passwords.
 */
defined('MB_API') or exit;

class Auth
{
    const ONE_TIME_TOKEN_TTL = 86400;
    const RECOVERY_TOKEN_TTL = 3600;
    const FLOW_TTL = 900;
    const REFRESH_REUSE_SECONDS = 10;

    public static function fail($status, $code, $msg, array $extra = [])
    {
        throw new ApiError($status, $code, $msg, null, null, $extra);
    }

    public static function handle($path, $method)
    {
        $path = trim($path, '/');
        switch ($path) {
            case 'signup':
                if ($method === 'POST') return self::signup();
                break;
            case 'token':
                if ($method === 'POST') return self::token();
                break;
            case 'user':
                if ($method === 'GET') return self::getUser();
                if ($method === 'PUT') return self::updateUser();
                break;
            case 'logout':
                if ($method === 'POST') return self::logout();
                break;
            case 'recover':
                if ($method === 'POST') return self::recover();
                break;
            case 'resend':
                if ($method === 'POST') return self::resend();
                break;
            case 'verify':
                if ($method === 'GET') return self::verifyLink();
                if ($method === 'POST') return self::verifyToken();
                break;
            case 'authorize':
                if ($method === 'GET') return self::authorize();
                break;
            case 'callback':
                if ($method === 'GET' || $method === 'POST') return self::oauthCallback();
                break;
            case 'settings':
                send_json(200, [
                    'external' => ['email' => true, 'phone' => false, 'google' => self::googleEnabled()],
                    'disable_signup' => false,
                    'mailer_autoconfirm' => (bool)mb_config('autoconfirm_email'),
                    'phone_autoconfirm' => false,
                ]);
            case 'health':
                send_json(200, ['version' => 'mollbazar-php', 'name' => 'GoTrue', 'description' => 'MollBazar Auth']);
        }
        self::fail(404, 'not_found', 'Not Found');
    }

    // ------------------------------------------------------------------
    // users / sessions
    // ------------------------------------------------------------------
    public static function userObject(array $u)
    {
        $identities = [];
        foreach (Db::all('SELECT * FROM auth_identities WHERE user_id = ? ORDER BY created_at', [$u['id']]) as $i) {
            $identities[] = [
                'identity_id' => $i['id'],
                'id' => $i['provider_id'],
                'user_id' => $i['user_id'],
                'identity_data' => json_decode((string)$i['identity_data'], true) ?: new stdClass(),
                'provider' => $i['provider'],
                'email' => $i['email'],
                'last_sign_in_at' => $i['last_sign_in_at'] ? Schema::formatTimestamp($i['last_sign_in_at']) : null,
                'created_at' => Schema::formatTimestamp($i['created_at']),
                'updated_at' => Schema::formatTimestamp($i['updated_at']),
            ];
        }
        $ts = function ($v) { return $v ? Schema::formatTimestamp($v) : null; };
        $app = json_decode((string)$u['raw_app_meta_data'], true);
        $meta = json_decode((string)$u['raw_user_meta_data'], true);
        return [
            'id' => $u['id'],
            'aud' => 'authenticated',
            'role' => 'authenticated',
            'email' => (string)$u['email'],
            'email_confirmed_at' => $ts($u['email_confirmed_at']),
            'phone' => (string)$u['phone'],
            'confirmed_at' => $ts($u['email_confirmed_at']),
            'confirmation_sent_at' => $ts($u['confirmation_sent_at']),
            'recovery_sent_at' => $ts($u['recovery_sent_at']),
            'last_sign_in_at' => $ts($u['last_sign_in_at']),
            'app_metadata' => is_array($app) && $app ? $app : ['provider' => 'email', 'providers' => ['email']],
            'user_metadata' => is_array($meta) && $meta ? $meta : new stdClass(),
            'identities' => $identities,
            'created_at' => $ts($u['created_at']),
            'updated_at' => $ts($u['updated_at']),
            'is_anonymous' => false,
        ];
    }

    private static function findUser($id)
    {
        return Db::one('SELECT * FROM auth_users WHERE id = ?', [$id]);
    }

    private static function accessToken(array $u, $sessionId, $method)
    {
        $ttl = (int)mb_config('access_token_ttl');
        $now = time();
        $app = json_decode((string)$u['raw_app_meta_data'], true);
        $meta = json_decode((string)$u['raw_user_meta_data'], true);
        $claims = [
            'iss' => rtrim((string)mb_config('site_url'), '/') . '/api/auth/v1',
            'sub' => $u['id'],
            'aud' => 'authenticated',
            'exp' => $now + $ttl,
            'iat' => $now,
            'email' => (string)$u['email'],
            'phone' => (string)$u['phone'],
            'app_metadata' => is_array($app) && $app ? $app : ['provider' => 'email', 'providers' => ['email']],
            'user_metadata' => is_array($meta) && $meta ? $meta : new stdClass(),
            'role' => 'authenticated',
            'aal' => 'aal1',
            'amr' => [['method' => $method, 'timestamp' => $now]],
            'session_id' => $sessionId,
            'is_anonymous' => false,
        ];
        return [Jwt::encode($claims), $ttl, $now + $ttl];
    }

    private static function newRefreshToken($userId, $sessionId)
    {
        $token = random_token(24);
        Db::exec('INSERT INTO auth_refresh_tokens (id, token_hash, user_id, session_id, revoked, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
            [uuid4(), hash('sha256', $token), $userId, $sessionId, db_now(), db_now()]);
        return $token;
    }

    public static function issueSession($userId, $method = 'password')
    {
        $sessionId = uuid4();
        Db::exec('INSERT INTO auth_sessions (id, user_id, user_agent, ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [$sessionId, $userId, substr((string)request_header('User-Agent'), 0, 500), client_ip(), db_now(), db_now()]);
        Db::exec('UPDATE auth_users SET last_sign_in_at = ?, updated_at = ? WHERE id = ?', [db_now(), db_now(), $userId]);
        $u = self::findUser($userId);
        $refresh = self::newRefreshToken($userId, $sessionId);
        return self::sessionPayload($u, $sessionId, $refresh, $method);
    }

    private static function sessionPayload(array $u, $sessionId, $refresh, $method)
    {
        list($access, $ttl, $exp) = self::accessToken($u, $sessionId, $method);
        return [
            'access_token' => $access,
            'token_type' => 'bearer',
            'expires_in' => $ttl,
            'expires_at' => $exp,
            'refresh_token' => $refresh,
            'user' => self::userObject($u),
        ];
    }

    /** public.handle_new_user() */
    public static function createProfile(array $u)
    {
        $meta = json_decode((string)$u['raw_user_meta_data'], true);
        if (!is_array($meta)) $meta = [];
        $m = function ($k) use ($meta) { return isset($meta[$k]) && is_scalar($meta[$k]) ? (string)$meta[$k] : null; };
        $email = $u['email'] ? $u['email'] : ($u['id'] . '@user.mollbazar.uz');
        $local = explode('@', $u['email'] ? $u['email'] : 'User')[0];
        $handleLocal = explode('@', $u['email'] ? $u['email'] : ('user_' . substr($u['id'], 0, 6)))[0];
        $name = $m('name') !== null ? $m('name') : ($m('full_name') !== null ? $m('full_name') : $local);
        Db::exec(
            "INSERT INTO profiles (id, email, name, handle, phone, avatar_url, cover_url, location, business_name, bio, role, is_admin, created_at, updated_at, website, telegram, status)
             VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, '', ?, 0, ?, ?, '', '', 'active')
             ON DUPLICATE KEY UPDATE email = VALUES(email),
                name = IF(name = '', VALUES(name), name), handle = IF(handle = '', VALUES(handle), handle),
                location = IF(location = '', VALUES(location), location), business_name = IF(business_name = '', VALUES(business_name), business_name)",
            [$u['id'], $email, $name, $m('handle') !== null ? $m('handle') : $handleLocal, $m('phone') !== null ? $m('phone') : '',
                $m('avatar_url') !== null ? $m('avatar_url') : '', $m('location') !== null ? $m('location') : '',
                $m('businessName') !== null ? $m('businessName') : '', $m('role') !== null ? $m('role') : 'seller', db_now(), db_now()]
        );
    }

    private static function bearerUser()
    {
        $ctx = Ctx::current();
        if (!$ctx->isAuthenticated()) self::fail(401, 'no_authorization', 'This endpoint requires a Bearer token');
        if ($ctx->sessionId && !Db::value('SELECT 1 FROM auth_sessions WHERE id = ?', [$ctx->sessionId])) {
            self::fail(403, 'session_not_found', 'Session from session_id claim in JWT does not exist');
        }
        $u = self::findUser($ctx->uid);
        if (!$u) self::fail(403, 'user_not_found', 'User from sub claim in JWT does not exist');
        return $u;
    }

    // ------------------------------------------------------------------
    // redirects / PKCE
    // ------------------------------------------------------------------
    private static function siteUrl()
    {
        $site = rtrim((string)mb_config('site_url'), '/');
        if ($site === '') {
            $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
            $site = ($https ? 'https://' : 'http://') . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost');
        }
        return $site;
    }

    /** Only redirect back to our own site (prevents open redirects). */
    private static function safeRedirect($url)
    {
        $site = self::siteUrl();
        if (!$url) return $site;
        $allowed = array_merge([$site], (array)mb_config('additional_redirect_origins'));
        $p = parse_url($url);
        if (!$p || empty($p['scheme']) || empty($p['host'])) return $site;
        $origin = strtolower($p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : ''));
        foreach ($allowed as $a) {
            $ap = parse_url($a);
            if (!$ap || empty($ap['host'])) continue;
            $ao = strtolower($ap['scheme'] . '://' . $ap['host'] . (isset($ap['port']) ? ':' . $ap['port'] : ''));
            if ($ao === $origin) return $url;
        }
        return $site;
    }

    /** scheme://host[:port] of an already validated (safeRedirect) URL. */
    private static function originOf($url)
    {
        $p = parse_url($url);
        if (!$p || empty($p['scheme']) || empty($p['host'])) return self::siteUrl();
        return $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    }

    private static function appendQuery($url, array $params)
    {
        $hash = '';
        $pos = strpos($url, '#');
        if ($pos !== false) { $hash = substr($url, $pos); $url = substr($url, 0, $pos); }
        return $url . (strpos($url, '?') === false ? '?' : '&') . http_build_query($params) . $hash;
    }

    private static function redirect($url)
    {
        header('Location: ' . $url, true, 303);
        header('Cache-Control: no-store');
        exit;
    }

    private static function redirectWithError($redirectTo, $code, $description)
    {
        $url = self::safeRedirect($redirectTo);
        $url = preg_replace('/#.*$/', '', $url);
        self::redirect($url . '#' . http_build_query(['error' => 'access_denied', 'error_code' => $code, 'error_description' => $description]));
    }

    private static function createFlowState($userId, $challenge, $method, $provider, $authMethod, $redirectTo, $oauthState = null)
    {
        $id = uuid4();
        Db::exec('INSERT INTO auth_flow_state (id, user_id, auth_code, oauth_state, code_challenge, code_challenge_method, provider, authentication_method, redirect_to, created_at)
                  VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)',
            [$id, $userId, $oauthState, $challenge, $method, $provider, $authMethod, (string)$redirectTo, db_now()]);
        return $id;
    }

    /** Finish a verified login: PKCE (?code=) when a challenge exists, else implicit (#access_token=). */
    private static function completeRedirect($userId, $flowStateId, $redirectTo, $type, $method)
    {
        $redirectTo = self::safeRedirect($redirectTo);
        if ($flowStateId) {
            $flow = Db::one('SELECT * FROM auth_flow_state WHERE id = ?', [$flowStateId]);
            if ($flow && $flow['code_challenge']) {
                $code = uuid4();
                Db::exec('UPDATE auth_flow_state SET user_id = ?, auth_code = ?, auth_code_issued_at = ? WHERE id = ?', [$userId, $code, db_now(), $flowStateId]);
                self::redirect(self::appendQuery($redirectTo, ['code' => $code]));
            }
        }
        $s = self::issueSession($userId, $method);
        $base = preg_replace('/#.*$/', '', $redirectTo);
        self::redirect($base . '#' . http_build_query([
            'access_token' => $s['access_token'],
            'expires_at' => $s['expires_at'],
            'expires_in' => $s['expires_in'],
            'refresh_token' => $s['refresh_token'],
            'token_type' => 'bearer',
            'type' => $type,
        ]));
    }

    private static function codeChallenge(array $body)
    {
        $challenge = isset($body['code_challenge']) ? (string)$body['code_challenge'] : '';
        $method = isset($body['code_challenge_method']) ? strtolower((string)$body['code_challenge_method']) : '';
        if ($challenge === '') return [null, null];
        if (!in_array($method, ['s256', 'plain'], true)) self::fail(400, 'validation_failed', 'Code challenge method not supported');
        return [$challenge, $method];
    }

    private static function oneTimeToken($userId, $type, $redirectTo, $flowStateId)
    {
        $token = random_token(24);
        Db::exec('DELETE FROM auth_one_time_tokens WHERE user_id = ? AND token_type = ?', [$userId, $type]);
        Db::exec('INSERT INTO auth_one_time_tokens (id, user_id, token_type, token_hash, flow_state_id, redirect_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuid4(), $userId, $type, hash('sha256', $token), $flowStateId, (string)$redirectTo, db_now()]);
        return $token;
    }

    private static function verifyUrl($token, $type, $redirectTo)
    {
        return self::siteUrl() . '/api/auth/v1/verify?' . http_build_query(['token' => $token, 'type' => $type, 'redirect_to' => $redirectTo]);
    }

    private static function sendConfirmation(array $u, $redirectTo, $challenge, $method)
    {
        $flow = $challenge ? self::createFlowState($u['id'], $challenge, $method, 'email', 'email/signup', $redirectTo) : null;
        $token = self::oneTimeToken($u['id'], 'signup', $redirectTo, $flow);
        $meta = json_decode((string)$u['raw_user_meta_data'], true);
        Mailer::confirmation($u['email'], is_array($meta) && isset($meta['name']) ? $meta['name'] : '', self::verifyUrl($token, 'signup', $redirectTo));
        Db::exec('UPDATE auth_users SET confirmation_sent_at = ? WHERE id = ?', [db_now(), $u['id']]);
    }

    // ------------------------------------------------------------------
    // endpoints
    // ------------------------------------------------------------------
    private static function signup()
    {
        $body = json_body();
        if (!is_array($body)) $body = [];
        rate_limit('signup:' . client_ip(), 10, 3600);
        $email = strtolower(trim(isset($body['email']) ? (string)$body['email'] : ''));
        $password = isset($body['password']) ? (string)$body['password'] : '';
        if ($email === '') {
            if (!empty($body['phone'])) self::fail(400, 'phone_provider_disabled', 'Phone signups are disabled');
            self::fail(400, 'validation_failed', 'To signup, please provide your email');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 191) self::fail(400, 'validation_failed', 'Unable to validate email address: invalid format');
        if (strlen($password) < 6) {
            self::fail(422, 'weak_password', 'Password should be at least 6 characters.', ['weak_password' => ['reasons' => ['length']]]);
        }
        if (strlen($password) > 72) self::fail(422, 'weak_password', 'Password cannot be longer than 72 characters');
        $data = isset($body['data']) && is_array($body['data']) ? $body['data'] : [];
        $redirectTo = self::safeRedirect(query_param('redirect_to', isset($body['redirect_to']) ? $body['redirect_to'] : null));
        list($challenge, $method) = self::codeChallenge($body);
        $autoconfirm = (bool)mb_config('autoconfirm_email');

        $existing = Db::one('SELECT * FROM auth_users WHERE email = ?', [$email]);
        if ($existing) {
            if ($existing['email_confirmed_at'] || $autoconfirm) self::fail(422, 'user_already_exists', 'User already registered');
            self::sendConfirmation($existing, $redirectTo, $challenge, $method);
            send_json(200, self::userObject($existing));
        }

        $u = Db::transaction(function () use ($email, $password, $data, $autoconfirm) {
            $id = uuid4();
            $now = db_now();
            Db::exec('INSERT INTO auth_users (id, email, phone, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
                      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)',
                [$id, $email, password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]), $autoconfirm ? $now : null,
                    json_encode(['provider' => 'email', 'providers' => ['email']]), json_encode($data ? $data : new stdClass(), JSON_UNESCAPED_UNICODE), $now, $now]);
            Db::exec('INSERT INTO auth_identities (id, user_id, provider, provider_id, identity_data, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [uuid4(), $id, 'email', $id, json_encode(['sub' => $id, 'email' => $email, 'email_verified' => $autoconfirm, 'phone_verified' => false]), $email, $now, $now]);
            $u = self::findUser($id);
            self::createProfile($u);
            return $u;
        });

        if ($autoconfirm) send_json(200, self::issueSession($u['id'], 'password'));
        self::sendConfirmation($u, $redirectTo, $challenge, $method);
        send_json(200, self::userObject(self::findUser($u['id'])));
    }

    private static function token()
    {
        $grant = query_param('grant_type', '');
        $body = json_body();
        if (!is_array($body)) $body = [];
        if ($grant === 'password') return self::passwordGrant($body);
        if ($grant === 'refresh_token') return self::refreshGrant($body);
        if ($grant === 'pkce') return self::pkceGrant($body);
        self::fail(400, 'validation_failed', 'unsupported_grant_type');
    }

    private static function passwordGrant(array $body)
    {
        $email = strtolower(trim(isset($body['email']) ? (string)$body['email'] : ''));
        $phone = trim(isset($body['phone']) ? (string)$body['phone'] : '');
        $password = isset($body['password']) ? (string)$body['password'] : '';
        $ident = $email !== '' ? $email : $phone;
        rate_limit('login-ip:' . client_ip(), 30, 300);
        rate_limit('login:' . hash('sha256', $ident), 10, 300);
        if ($email !== '') {
            $u = Db::one('SELECT * FROM auth_users WHERE email = ?', [$email]);
        } elseif ($phone !== '') {
            $digits = preg_replace('/\D+/', '', $phone);
            $u = Db::one('SELECT * FROM auth_users WHERE phone = ? OR phone = ?', [$phone, $digits]);
        } else {
            self::fail(400, 'validation_failed', 'Only an email address or phone number should be provided on login.');
        }
        $hashOk = $u && $u['encrypted_password'] && password_verify($password, $u['encrypted_password']);
        if (!$hashOk) self::fail(400, 'invalid_credentials', 'Invalid login credentials');
        if (!$u['email_confirmed_at'] && !mb_config('autoconfirm_email') && $email !== '') {
            self::fail(400, 'email_not_confirmed', 'Email not confirmed');
        }
        if ($u['banned_until'] && $u['banned_until'] > db_now()) self::fail(400, 'user_banned', 'User is banned');
        // Upgrade legacy $2a$ hashes transparently.
        if (password_needs_rehash($u['encrypted_password'], PASSWORD_BCRYPT, ['cost' => 10])) {
            Db::exec('UPDATE auth_users SET encrypted_password = ? WHERE id = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]), $u['id']]);
        }
        send_json(200, self::issueSession($u['id'], 'password'));
    }

    private static function refreshGrant(array $body)
    {
        $token = isset($body['refresh_token']) ? (string)$body['refresh_token'] : '';
        if ($token === '') self::fail(400, 'validation_failed', 'Refresh Token is required');
        rate_limit('refresh:' . client_ip(), 120, 300);
        $payload = Db::transaction(function () use ($token) {
            $row = Db::one('SELECT * FROM auth_refresh_tokens WHERE token_hash = ? FOR UPDATE', [hash('sha256', $token)]);
            if (!$row) self::fail(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
            if (!Db::value('SELECT 1 FROM auth_sessions WHERE id = ?', [$row['session_id']])) {
                self::fail(400, 'session_not_found', 'Invalid Refresh Token: Session Expired');
            }
            if ((int)$row['revoked'] === 1) {
                $age = time() - strtotime($row['updated_at'] . ' UTC');
                if ($age > self::REFRESH_REUSE_SECONDS) {
                    // Reuse of a rotated token: treat as theft and end the session.
                    Db::exec('DELETE FROM auth_sessions WHERE id = ?', [$row['session_id']]);
                    self::fail(400, 'refresh_token_already_used', 'Invalid Refresh Token: Already Used');
                }
            } else {
                Db::exec('UPDATE auth_refresh_tokens SET revoked = 1, updated_at = ? WHERE id = ?', [db_now(), $row['id']]);
            }
            $u = self::findUser($row['user_id']);
            if (!$u) self::fail(400, 'user_not_found', 'User not found');
            Db::exec('UPDATE auth_sessions SET updated_at = ? WHERE id = ?', [db_now(), $row['session_id']]);
            $new = self::newRefreshToken($u['id'], $row['session_id']);
            return self::sessionPayload($u, $row['session_id'], $new, 'token_refresh');
        });
        send_json(200, $payload);
    }

    private static function pkceGrant(array $body)
    {
        $code = isset($body['auth_code']) ? (string)$body['auth_code'] : '';
        $verifier = isset($body['code_verifier']) ? (string)$body['code_verifier'] : '';
        if ($code === '' || $verifier === '') self::fail(400, 'validation_failed', 'invalid request: both auth code and code verifier should be non-empty');
        $flow = Db::one('SELECT * FROM auth_flow_state WHERE auth_code = ?', [$code]);
        if (!$flow || !$flow['user_id']) self::fail(404, 'flow_state_not_found', 'invalid flow state, no valid flow state found');
        if (strtotime($flow['auth_code_issued_at'] . ' UTC') < time() - self::FLOW_TTL) {
            Db::exec('DELETE FROM auth_flow_state WHERE id = ?', [$flow['id']]);
            self::fail(422, 'flow_state_expired', 'invalid flow state, flow state has expired');
        }
        $expected = $flow['code_challenge_method'] === 'plain' ? $verifier : b64url_encode(hash('sha256', $verifier, true));
        if (!hash_equals((string)$flow['code_challenge'], $expected)) {
            self::fail(403, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
        }
        Db::exec('DELETE FROM auth_flow_state WHERE id = ?', [$flow['id']]);
        $method = $flow['provider'] === 'google' ? 'oauth' : ($flow['authentication_method'] === 'email/recovery' ? 'otp' : 'email/signup');
        send_json(200, self::issueSession($flow['user_id'], $method));
    }

    private static function getUser()
    {
        $u = self::bearerUser();
        send_json(200, self::userObject($u));
    }

    private static function updateUser()
    {
        $u = self::bearerUser();
        $body = json_body();
        if (!is_array($body)) $body = [];
        if (isset($body['password'])) {
            $pw = (string)$body['password'];
            if (strlen($pw) < 6) self::fail(422, 'weak_password', 'Password should be at least 6 characters.', ['weak_password' => ['reasons' => ['length']]]);
            if (strlen($pw) > 72) self::fail(422, 'weak_password', 'Password cannot be longer than 72 characters');
            if ($u['encrypted_password'] && password_verify($pw, $u['encrypted_password'])) {
                self::fail(422, 'same_password', 'New password should be different from the old password.');
            }
            Db::exec('UPDATE auth_users SET encrypted_password = ?, updated_at = ? WHERE id = ?', [password_hash($pw, PASSWORD_BCRYPT, ['cost' => 10]), db_now(), $u['id']]);
        }
        if (isset($body['email']) && strtolower(trim((string)$body['email'])) !== strtolower((string)$u['email'])) {
            self::fail(422, 'email_change_not_supported', "Email manzilini o'zgartirish hozircha qo'llab-quvvatlanmaydi");
        }
        if (isset($body['data']) && is_array($body['data'])) {
            $meta = json_decode((string)$u['raw_user_meta_data'], true);
            if (!is_array($meta)) $meta = [];
            $meta = array_merge($meta, $body['data']);
            Db::exec('UPDATE auth_users SET raw_user_meta_data = ?, updated_at = ? WHERE id = ?', [json_encode($meta, JSON_UNESCAPED_UNICODE), db_now(), $u['id']]);
        }
        send_json(200, self::userObject(self::findUser($u['id'])));
    }

    private static function logout()
    {
        $ctx = Ctx::current();
        if (!$ctx->isAuthenticated()) self::fail(401, 'no_authorization', 'This endpoint requires a Bearer token');
        $scope = query_param('scope', 'global');
        if ($scope === 'local' && $ctx->sessionId) {
            Db::exec('DELETE FROM auth_sessions WHERE id = ?', [$ctx->sessionId]);
        } elseif ($scope === 'others' && $ctx->sessionId) {
            Db::exec('DELETE FROM auth_sessions WHERE user_id = ? AND id <> ?', [$ctx->uid, $ctx->sessionId]);
        } else {
            Db::exec('DELETE FROM auth_sessions WHERE user_id = ?', [$ctx->uid]);
        }
        send_empty(204);
    }

    private static function recover()
    {
        $body = json_body();
        if (!is_array($body)) $body = [];
        $email = strtolower(trim(isset($body['email']) ? (string)$body['email'] : ''));
        if ($email === '') self::fail(422, 'validation_failed', 'Password recovery requires an email');
        rate_limit('recover-ip:' . client_ip(), 10, 3600);
        rate_limit('recover:' . hash('sha256', $email), 3, 900);
        $redirectTo = self::safeRedirect(query_param('redirect_to', isset($body['redirect_to']) ? $body['redirect_to'] : null));
        $u = Db::one('SELECT * FROM auth_users WHERE email = ?', [$email]);
        if ($u) {
            // The e-mail link opens the site's own /auth/reset page, which posts the
            // token to POST /verify. Unlike a GET link this works on any device and
            // is not used up by mail scanners that pre-open links.
            $token = self::oneTimeToken($u['id'], 'recovery', $redirectTo, null);
            $name = Db::value('SELECT name FROM profiles WHERE id = ?', [$u['id']]);
            $resetUrl = self::appendQuery(self::originOf($redirectTo) . '/auth/reset', ['token_hash' => $token, 'type' => 'recovery']);
            Mailer::recovery($u['email'], (string)$name, $resetUrl);
            Db::exec('UPDATE auth_users SET recovery_sent_at = ? WHERE id = ?', [db_now(), $u['id']]);
        }
        send_json(200, new stdClass());
    }

    private static function resend()
    {
        $body = json_body();
        if (!is_array($body)) $body = [];
        $email = strtolower(trim(isset($body['email']) ? (string)$body['email'] : ''));
        $type = isset($body['type']) ? (string)$body['type'] : 'signup';
        if ($type !== 'signup') self::fail(400, 'validation_failed', 'Only signup confirmation can be resent');
        rate_limit('resend:' . hash('sha256', $email . client_ip()), 3, 900);
        $u = $email !== '' ? Db::one('SELECT * FROM auth_users WHERE email = ?', [$email]) : null;
        if ($u && !$u['email_confirmed_at']) {
            $redirectTo = self::safeRedirect(query_param('redirect_to', isset($body['redirect_to']) ? $body['redirect_to'] : null));
            list($challenge, $method) = self::codeChallenge($body);
            self::sendConfirmation($u, $redirectTo, $challenge, $method);
        }
        send_json(200, new stdClass());
    }

    private static function tokenExpired(array $row)
    {
        $ttl = $row['token_type'] === 'recovery' ? self::RECOVERY_TOKEN_TTL : self::ONE_TIME_TOKEN_TTL;
        return strtotime($row['created_at'] . ' UTC') < time() - $ttl;
    }

    /** POST /verify {type, token_hash}: exchanges an e-mailed one-time token for a session. */
    private static function verifyToken()
    {
        $body = json_body();
        if (!is_array($body)) $body = [];
        $type = isset($body['type']) ? (string)$body['type'] : '';
        $token = isset($body['token_hash']) ? (string)$body['token_hash'] : '';
        if ($token === '' || !in_array($type, ['recovery', 'signup', 'email'], true)) {
            self::fail(400, 'validation_failed', 'Verify requires a token_hash and a type');
        }
        rate_limit('verify:' . client_ip(), 20, 300);
        $row = Db::one('SELECT * FROM auth_one_time_tokens WHERE token_hash = ?', [hash('sha256', $token)]);
        $typeOk = $row && ($row['token_type'] === $type || ($type === 'email' && $row['token_type'] === 'signup'));
        if (!$row || !$typeOk || $row['used_at'] || self::tokenExpired($row)) {
            self::fail(403, 'otp_expired', 'Email link is invalid or has expired');
        }
        $u = self::findUser($row['user_id']);
        if (!$u) self::fail(403, 'otp_expired', 'Email link is invalid or has expired');
        if ($u['banned_until'] && $u['banned_until'] > db_now()) self::fail(400, 'user_banned', 'User is banned');
        Db::exec('UPDATE auth_one_time_tokens SET used_at = ? WHERE id = ?', [db_now(), $row['id']]);
        // Opening the e-mailed link proves control of the inbox.
        Db::exec('UPDATE auth_users SET email_confirmed_at = COALESCE(email_confirmed_at, ?), updated_at = ? WHERE id = ?', [db_now(), db_now(), $row['user_id']]);
        send_json(200, self::issueSession($row['user_id'], $row['token_type'] === 'recovery' ? 'otp' : 'email/signup'));
    }

    private static function verifyLink()
    {
        $token = (string)query_param('token', '');
        $type = (string)query_param('type', 'signup');
        $redirectTo = self::safeRedirect(query_param('redirect_to'));
        $row = $token !== '' ? Db::one('SELECT * FROM auth_one_time_tokens WHERE token_hash = ?', [hash('sha256', $token)]) : null;
        $typeOk = $row && ($row['token_type'] === $type || ($type === 'email' && $row['token_type'] === 'signup'));
        if (!$row || !$typeOk || $row['used_at'] || self::tokenExpired($row)) {
            self::redirectWithError($redirectTo, 'otp_expired', 'Email link is invalid or has expired');
        }
        Db::exec('UPDATE auth_one_time_tokens SET used_at = ? WHERE id = ?', [db_now(), $row['id']]);
        if ($row['token_type'] === 'signup') {
            Db::exec('UPDATE auth_users SET email_confirmed_at = COALESCE(email_confirmed_at, ?), updated_at = ? WHERE id = ?', [db_now(), db_now(), $row['user_id']]);
        } else {
            // Following a recovery link proves control of the inbox.
            Db::exec('UPDATE auth_users SET email_confirmed_at = COALESCE(email_confirmed_at, ?) WHERE id = ?', [db_now(), $row['user_id']]);
        }
        $target = $row['redirect_to'] ? self::safeRedirect($row['redirect_to']) : $redirectTo;
        self::completeRedirect($row['user_id'], $row['flow_state_id'], $target, $row['token_type'] === 'signup' ? 'signup' : 'recovery', 'otp');
    }

    // ------------------------------------------------------------------
    // Google OAuth
    // ------------------------------------------------------------------
    private static function googleEnabled()
    {
        return mb_config('google_client_id') !== '' && mb_config('google_client_secret') !== '';
    }

    private static function callbackUrl()
    {
        return self::siteUrl() . '/api/auth/v1/callback';
    }

    private static function authorize()
    {
        $provider = (string)query_param('provider', '');
        $redirectTo = self::safeRedirect(query_param('redirect_to'));
        if ($provider !== 'google') self::redirectWithError($redirectTo, 'validation_failed', 'Unsupported provider: provider is not enabled');
        if (!self::googleEnabled()) self::redirectWithError($redirectTo, 'provider_disabled', 'Google kirishi hali sozlanmagan');
        $challenge = (string)query_param('code_challenge', '');
        $method = strtolower((string)query_param('code_challenge_method', ''));
        if ($challenge !== '' && !in_array($method, ['s256', 'plain'], true)) $method = 's256';
        $state = random_token(24);
        self::createFlowState(null, $challenge !== '' ? $challenge : null, $challenge !== '' ? $method : null, 'google', 'oauth', $redirectTo, $state);
        $scopes = trim('openid email profile ' . (string)query_param('scopes', ''));
        self::redirect(mb_config('google_auth_url') . '?' . http_build_query([
            'client_id' => mb_config('google_client_id'),
            'redirect_uri' => self::callbackUrl(),
            'response_type' => 'code',
            'scope' => $scopes,
            'state' => $state,
            'access_type' => 'online',
            'prompt' => 'select_account',
        ]));
    }

    private static function oauthCallback()
    {
        $state = isset($_GET['state']) ? (string)$_GET['state'] : (isset($_POST['state']) ? (string)$_POST['state'] : '');
        $flow = $state !== '' ? Db::one('SELECT * FROM auth_flow_state WHERE oauth_state = ?', [$state]) : null;
        if (!$flow) self::redirectWithError(null, 'bad_oauth_state', 'OAuth state topilmadi yoki eskirgan');
        $redirectTo = $flow['redirect_to'];
        Db::exec('UPDATE auth_flow_state SET oauth_state = NULL WHERE id = ?', [$flow['id']]);
        if (strtotime($flow['created_at'] . ' UTC') < time() - self::FLOW_TTL) self::redirectWithError($redirectTo, 'flow_state_expired', 'Kirish muddati tugadi, qayta urinib ko‘ring');
        if (!empty($_GET['error'])) self::redirectWithError($redirectTo, 'oauth_provider_error', (string)$_GET['error']);
        $code = isset($_GET['code']) ? (string)$_GET['code'] : '';
        if ($code === '') self::redirectWithError($redirectTo, 'bad_oauth_callback', 'OAuth kodi topilmadi');

        $ch = curl_init(mb_config('google_token_url'));
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_POSTFIELDS => http_build_query([
                'code' => $code,
                'client_id' => mb_config('google_client_id'),
                'client_secret' => mb_config('google_client_secret'),
                'redirect_uri' => self::callbackUrl(),
                'grant_type' => 'authorization_code',
            ]),
        ]);
        $res = json_decode((string)curl_exec($ch), true);
        curl_close($ch);
        if (!is_array($res) || empty($res['id_token'])) self::redirectWithError($redirectTo, 'oauth_token_error', 'Google bilan bog‘lanib bo‘lmadi');
        $parts = explode('.', $res['id_token']);
        $claims = count($parts) === 3 ? json_decode((string)b64url_decode($parts[1]), true) : null;
        // The id_token came straight from Google's token endpoint over TLS, so its claims are trusted;
        // we still pin issuer and audience.
        if (!is_array($claims) || (isset($claims['aud']) ? $claims['aud'] : '') !== mb_config('google_client_id')
            || !in_array(isset($claims['iss']) ? $claims['iss'] : '', ['https://accounts.google.com', 'accounts.google.com'], true)
            || empty($claims['sub'])) {
            self::redirectWithError($redirectTo, 'oauth_token_error', 'Google javobi yaroqsiz');
        }
        $sub = (string)$claims['sub'];
        $email = strtolower(isset($claims['email']) ? (string)$claims['email'] : '');
        $verified = !empty($claims['email_verified']);
        $identityData = [
            'iss' => $claims['iss'], 'sub' => $sub, 'email' => $email, 'email_verified' => $verified,
            'name' => isset($claims['name']) ? $claims['name'] : '', 'full_name' => isset($claims['name']) ? $claims['name'] : '',
            'picture' => isset($claims['picture']) ? $claims['picture'] : '', 'avatar_url' => isset($claims['picture']) ? $claims['picture'] : '',
            'provider_id' => $sub, 'phone_verified' => false,
        ];

        try {
            $userId = self::linkGoogleUser($sub, $email, $verified, $identityData);
        } catch (ApiError $e) {
            self::redirectWithError($redirectTo, $e->codeStr, $e->getMessage());
        }
        self::completeRedirect($userId, $flow['id'], $redirectTo, 'signup', 'oauth');
    }

    private static function linkGoogleUser($sub, $email, $verified, array $identityData)
    {
        return Db::transaction(function () use ($sub, $email, $verified, $identityData) {
            $now = db_now();
            $identity = Db::one("SELECT * FROM auth_identities WHERE provider = 'google' AND provider_id = ?", [$sub]);
            if ($identity) {
                Db::exec('UPDATE auth_identities SET identity_data = ?, email = ?, last_sign_in_at = ?, updated_at = ? WHERE id = ?',
                    [json_encode($identityData, JSON_UNESCAPED_UNICODE), $email, $now, $now, $identity['id']]);
                return $identity['user_id'];
            }
            if (!$verified || $email === '') self::fail(400, 'email_not_verified', 'Google email manzili tasdiqlanmagan');
            $u = Db::one('SELECT * FROM auth_users WHERE email = ?', [$email]);
            if (!$u) {
                $id = uuid4();
                $meta = $identityData;
                Db::exec('INSERT INTO auth_users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
                          VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
                    [$id, $email, $now, json_encode(['provider' => 'google', 'providers' => ['google']]), json_encode($meta, JSON_UNESCAPED_UNICODE), $now, $now]);
                $u = self::findUser($id);
                self::createProfile($u);
            } else {
                $app = json_decode((string)$u['raw_app_meta_data'], true);
                if (!is_array($app)) $app = ['provider' => 'email', 'providers' => ['email']];
                $providers = isset($app['providers']) && is_array($app['providers']) ? $app['providers'] : [];
                if (!in_array('google', $providers, true)) $providers[] = 'google';
                $app['providers'] = $providers;
                Db::exec('UPDATE auth_users SET raw_app_meta_data = ?, email_confirmed_at = COALESCE(email_confirmed_at, ?), updated_at = ? WHERE id = ?',
                    [json_encode($app), $now, $now, $u['id']]);
            }
            Db::exec('INSERT INTO auth_identities (id, user_id, provider, provider_id, identity_data, email, last_sign_in_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [uuid4(), $u['id'], 'google', $sub, json_encode($identityData, JSON_UNESCAPED_UNICODE), $email, $now, $now, $now]);
            return $u['id'];
        });
    }
}
