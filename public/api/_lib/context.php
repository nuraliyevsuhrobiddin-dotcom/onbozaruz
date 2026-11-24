<?php
/**
 * JWT (HS256) and the per-request security context — the PHP equivalent of
 * auth.uid(), auth.role(), public.is_admin() and public.is_active_account().
 */
defined('MB_API') or exit;

class Jwt
{
    public static function secret()
    {
        $secret = (string)mb_config('jwt_secret');
        if (strlen($secret) < 32) {
            throw new ApiError(500, 'PGRST300', 'Server config error: jwt_secret must be at least 32 characters');
        }
        return $secret;
    }

    public static function encode(array $claims)
    {
        $header = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = b64url_encode(json_encode($claims, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $sig = b64url_encode(hash_hmac('sha256', "$header.$payload", self::secret(), true));
        return "$header.$payload.$sig";
    }

    /** Returns claims or throws ApiError(401). */
    public static function decode($token)
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) throw new ApiError(401, 'PGRST301', 'JWT is malformed');
        list($h, $p, $s) = $parts;
        $header = json_decode((string)b64url_decode($h), true);
        if (!is_array($header) || (isset($header['alg']) ? $header['alg'] : '') !== 'HS256') {
            throw new ApiError(401, 'PGRST301', 'JWT algorithm not supported');
        }
        $expected = b64url_encode(hash_hmac('sha256', "$h.$p", self::secret(), true));
        if (!hash_equals($expected, $s)) throw new ApiError(401, 'PGRST301', 'JWT signature is invalid');
        $claims = json_decode((string)b64url_decode($p), true);
        if (!is_array($claims)) throw new ApiError(401, 'PGRST301', 'JWT is malformed');
        if (isset($claims['exp']) && (int)$claims['exp'] < time()) {
            throw new ApiError(401, 'PGRST303', 'JWT expired');
        }
        return $claims;
    }
}

class Ctx
{
    public $uid = null;
    public $role = 'anon';
    public $email = null;
    public $sessionId = null;
    public $claims = [];
    /** Trusted server-side operations (imports, cron) bypass row policies. */
    public $service = false;
    private $profileLoaded = false;
    private $isAdmin = false;
    private $isActive = false;

    private static $current = null;

    public static function current()
    {
        if (self::$current === null) self::$current = self::fromRequest();
        return self::$current;
    }

    public static function setCurrent(Ctx $ctx)
    {
        self::$current = $ctx;
    }

    public static function service()
    {
        $c = new Ctx();
        $c->role = 'service_role';
        $c->service = true;
        return $c;
    }

    public static function forUser($uid)
    {
        $c = new Ctx();
        $c->uid = $uid;
        $c->role = 'authenticated';
        return $c;
    }

    private static function fromRequest()
    {
        $c = new Ctx();
        $auth = (string)request_header('Authorization');
        if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) return $c;
        $token = trim($m[1]);
        $apikey = (string)request_header('apikey');
        // supabase-js sends the public anon key as the bearer for anonymous calls.
        if ($token === '' || ($apikey !== '' && hash_equals($apikey, $token)) || substr_count($token, '.') !== 2) {
            return $c;
        }
        $claims = Jwt::decode($token);
        $role = isset($claims['role']) ? $claims['role'] : 'anon';
        if ($role === 'authenticated' && !empty($claims['sub']) && is_uuid($claims['sub'])) {
            $c->uid = strtolower($claims['sub']);
            $c->role = 'authenticated';
            $c->email = isset($claims['email']) ? $claims['email'] : null;
            $c->sessionId = isset($claims['session_id']) ? $claims['session_id'] : null;
            $c->claims = $claims;
        }
        return $c;
    }

    private function loadProfile()
    {
        if ($this->profileLoaded) return;
        $this->profileLoaded = true;
        if ($this->uid === null) return;
        $row = Db::one('SELECT is_admin, status FROM profiles WHERE id = ?', [$this->uid]);
        if ($row) {
            $this->isActive = $row['status'] === 'active';
            $this->isAdmin = $this->isActive && (int)$row['is_admin'] === 1;
        }
    }

    public function isAuthenticated()
    {
        return $this->uid !== null;
    }

    /** public.is_admin() — active admins only. */
    public function isAdmin()
    {
        if ($this->service) return true;
        $this->loadProfile();
        return $this->isAdmin;
    }

    /** public.is_active_account() */
    public function isActive()
    {
        if ($this->service) return true;
        $this->loadProfile();
        return $this->isActive;
    }

    public function refresh()
    {
        $this->profileLoaded = false;
    }
}
