<?php
/**
 * Schema metadata access and value conversion between the JSON wire format
 * (what PostgREST would send/receive) and MySQL storage.
 */
defined('MB_API') or exit;

class Schema
{
    private static $tables = null;

    public static function all()
    {
        if (self::$tables === null) self::$tables = require __DIR__ . '/schema.php';
        return self::$tables;
    }

    public static function table($name)
    {
        $all = self::all();
        return isset($all[$name]) ? $all[$name] : null;
    }

    public static function hasColumn($table, $col)
    {
        $t = self::table($table);
        return $t !== null && isset($t['cols'][$col]);
    }

    public static function colType($table, $col)
    {
        $t = self::table($table);
        return $t['cols'][$col][0];
    }

    public static function columns($table)
    {
        $t = self::table($table);
        return array_keys($t['cols']);
    }

    public static function pk($table)
    {
        $t = self::table($table);
        return $t['pk'];
    }

    public static function q($ident)
    {
        return '`' . str_replace('`', '``', $ident) . '`';
    }

    /** JSON/wire value -> MySQL parameter. */
    public static function toDb($table, $col, $value)
    {
        if ($value === null) return null;
        $type = self::colType($table, $col);
        $base = explode(':', $type)[0];
        switch ($base) {
            case 'uuid':
                if (!is_string($value) || !is_uuid($value)) {
                    throw new ApiError(400, '22P02', 'invalid input syntax for type uuid: "' . (is_scalar($value) ? $value : 'object') . '"');
                }
                return strtolower($value);
            case 'int':
            case 'bigint':
                if (is_bool($value)) return $value ? 1 : 0;
                if (is_int($value)) return $value;
                if (is_float($value) && floor($value) == $value) return (int)$value;
                if (is_string($value) && preg_match('/^-?\d+$/', trim($value))) return (int)trim($value);
                throw new ApiError(400, '22P02', 'invalid input syntax for type integer: "' . (is_scalar($value) ? $value : 'object') . '"');
            case 'num':
                if (is_bool($value)) return $value ? '1' : '0';
                if (is_int($value)) return (string)$value;
                if (is_float($value)) {
                    if (!is_finite($value)) throw new ApiError(400, '22P02', 'invalid input syntax for type numeric');
                    return self::floatToString($value);
                }
                if (is_string($value) && is_numeric(trim($value))) return trim($value);
                throw new ApiError(400, '22P02', 'invalid input syntax for type numeric: "' . (is_scalar($value) ? $value : 'object') . '"');
            case 'float':
                if (is_numeric($value)) return (float)$value;
                throw new ApiError(400, '22P02', 'invalid input syntax for type double precision');
            case 'bool':
                if (is_bool($value)) return $value ? 1 : 0;
                if ($value === 1 || $value === 0) return $value;
                $s = strtolower(trim((string)$value));
                if (in_array($s, ['true', 't', '1', 'yes', 'on'], true)) return 1;
                if (in_array($s, ['false', 'f', '0', 'no', 'off'], true)) return 0;
                throw new ApiError(400, '22P02', 'invalid input syntax for type boolean: "' . $value . '"');
            case 'ts':
                return self::parseTimestamp($value);
            case 'date':
                $s = is_string($value) ? trim($value) : '';
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $s, $m)) {
                    $d = DateTime::createFromFormat('!Y-m-d', $m[1], new DateTimeZone('UTC'));
                    if ($d && $d->format('Y-m-d') === $m[1]) return $m[1];
                }
                throw new ApiError(400, '22007', 'invalid input syntax for type date: "' . $s . '"');
            case 'json':
                return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            case 'textarr':
                if (is_string($value)) $value = self::parsePgArray($value);
                if (!is_array($value)) throw new ApiError(400, '22P02', 'malformed array literal');
                $out = [];
                foreach ($value as $item) $out[] = $item === null ? null : (string)$item;
                return json_encode(array_values($out), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            default: // text, vc
                if (is_bool($value)) return $value ? 'true' : 'false';
                if (is_array($value)) return json_encode($value, JSON_UNESCAPED_UNICODE);
                return (string)$value;
        }
    }

    /** MySQL value -> JSON/wire value (PostgREST representation). */
    public static function fromDb($table, $col, $value)
    {
        if ($value === null) return null;
        $type = self::colType($table, $col);
        $base = explode(':', $type)[0];
        switch ($base) {
            case 'int':
            case 'bigint':
                return (int)$value;
            case 'num':
                return self::numberOut($value);
            case 'float':
                return (float)$value;
            case 'bool':
                return (bool)(int)$value;
            case 'ts':
                return self::formatTimestamp($value);
            case 'date':
                return substr((string)$value, 0, 10);
            case 'json':
                $d = json_decode((string)$value, true);
                return $d;
            case 'textarr':
                $d = json_decode((string)$value, true);
                return is_array($d) ? array_values($d) : [];
            default:
                return (string)$value;
        }
    }

    public static function rowFromDb($table, array $row)
    {
        $out = [];
        foreach ($row as $col => $value) {
            $out[$col] = self::hasColumn($table, $col) ? self::fromDb($table, $col, $value) : $value;
        }
        return $out;
    }

    public static function numberOut($value)
    {
        $s = (string)$value;
        if (strpos($s, '.') !== false) {
            $s = rtrim(rtrim($s, '0'), '.');
        }
        if ($s === '' || $s === '-') $s = '0';
        if (preg_match('/^-?\d+$/', $s) && strlen(ltrim($s, '-')) < 16) return (int)$s;
        return (float)$s;
    }

    public static function floatToString($f)
    {
        $s = rtrim(rtrim(sprintf('%.10F', $f), '0'), '.');
        return $s === '' || $s === '-0' ? '0' : $s;
    }

    public static function parseTimestamp($value)
    {
        if ($value instanceof DateTime) {
            $d = clone $value;
        } else {
            $s = trim((string)$value);
            if ($s === '' ) throw new ApiError(400, '22007', 'invalid input syntax for type timestamp with time zone: ""');
            if (strtolower($s) === 'now()' || strtolower($s) === 'now') return db_now();
            try {
                // Bare "YYYY-MM-DD HH:MM:SS" values are UTC, like Postgres with TZ=UTC.
                $d = new DateTime($s, new DateTimeZone('UTC'));
            } catch (Exception $e) {
                throw new ApiError(400, '22007', 'invalid input syntax for type timestamp with time zone: "' . $s . '"');
            }
        }
        $d->setTimezone(new DateTimeZone('UTC'));
        return $d->format('Y-m-d H:i:s.u');
    }

    public static function formatTimestamp($value)
    {
        $s = (string)$value;
        $d = DateTime::createFromFormat('Y-m-d H:i:s.u', $s, new DateTimeZone('UTC'));
        if (!$d) $d = DateTime::createFromFormat('Y-m-d H:i:s', $s, new DateTimeZone('UTC'));
        if (!$d) return $s;
        // Postgres/PostgREST style: 2026-10-05T07:30:00.5+00:00 (fraction trimmed, omitted when zero).
        $frac = rtrim($d->format('u'), '0');
        return $d->format('Y-m-d\TH:i:s') . ($frac !== '' ? '.' . $frac : '') . '+00:00';
    }

    /** Minimal parser for PostgreSQL array literals such as {a,"b c"}. */
    public static function parsePgArray($s)
    {
        $s = trim($s);
        if ($s === '' ) return [];
        if ($s[0] === '[') {
            $d = json_decode($s, true);
            return is_array($d) ? $d : [];
        }
        if ($s[0] !== '{' || substr($s, -1) !== '}') return [$s];
        $inner = substr($s, 1, -1);
        if ($inner === '') return [];
        $out = [];
        $cur = '';
        $quoted = false;
        $wasQuoted = false;
        $len = strlen($inner);
        for ($i = 0; $i < $len; $i++) {
            $ch = $inner[$i];
            if ($quoted) {
                if ($ch === '\\' && $i + 1 < $len) { $cur .= $inner[++$i]; continue; }
                if ($ch === '"') { $quoted = false; continue; }
                $cur .= $ch;
            } else {
                if ($ch === '"') { $quoted = true; $wasQuoted = true; continue; }
                if ($ch === ',') {
                    $out[] = (!$wasQuoted && strtoupper($cur) === 'NULL') ? null : $cur;
                    $cur = '';
                    $wasQuoted = false;
                    continue;
                }
                $cur .= $ch;
            }
        }
        $out[] = (!$wasQuoted && strtoupper($cur) === 'NULL') ? null : $cur;
        return $out;
    }

    /** Value used when an INSERT omits the column (mirrors the PG DEFAULT). */
    public static function defaultFor($table, $col)
    {
        $spec = self::table($table)['cols'][$col];
        $default = $spec[2];
        if ($default === null) return [false, null];
        if ($default === '@uuid') return [true, uuid4()];
        if ($default === '@now') return [true, db_now()];
        if ($default === '@emptyarr' || $default === '@emptyjson') return [true, '[]'];
        if (is_string($default) && str_starts($default, '@seq:')) {
            $n = next_sequence(substr($default, 5));
            return [true, 'ONB-' . str_pad((string)$n, 6, '0', STR_PAD_LEFT)];
        }
        if (is_bool($default)) return [true, $default ? 1 : 0];
        if (is_float($default) || is_int($default)) return [true, self::colType($table, $col) === 'int' ? (int)$default : (string)$default];
        return [true, $default];
    }

    /** Type-aware equality for DB values (used by triggers' IS DISTINCT FROM). */
    public static function same($table, $col, $a, $b)
    {
        if ($a === null || $b === null) return $a === $b;
        $base = explode(':', self::colType($table, $col))[0];
        switch ($base) {
            case 'num':
            case 'float':
                return abs((float)$a - (float)$b) < 1e-9;
            case 'int':
            case 'bigint':
            case 'bool':
                return (int)$a === (int)$b;
            case 'ts':
                return self::parseTimestamp($a) === self::parseTimestamp($b);
            case 'json':
            case 'textarr':
                return json_decode((string)$a, true) == json_decode((string)$b, true);
            default:
                return (string)$a === (string)$b;
        }
    }

    /**
     * Relationship lookup for resource embedding.
     * Returns ['kind' => 'm2o'|'o2m', 'local' => col, 'foreign' => col] or throws.
     */
    public static function relationship($from, $to, $hint = null)
    {
        $candidates = [];
        $fromDef = self::table($from);
        $toDef = self::table($to);
        if ($toDef === null || !empty($toDef['internal'])) {
            throw new ApiError(400, 'PGRST200', "Could not find a relationship between '$from' and '$to' in the schema cache");
        }
        foreach (isset($fromDef['fks']) ? $fromDef['fks'] : [] as $fk) {
            if ($fk[1] === $to && ($hint === null || $hint === $fk[0])) {
                $candidates[] = ['kind' => 'm2o', 'local' => $fk[0], 'foreign' => $fk[2]];
            }
        }
        foreach (isset($toDef['fks']) ? $toDef['fks'] : [] as $fk) {
            if ($fk[1] === $from && ($hint === null || $hint === $fk[0])) {
                $candidates[] = ['kind' => 'o2m', 'local' => $fk[2], 'foreign' => $fk[0]];
            }
        }
        if (count($candidates) === 0) {
            throw new ApiError(400, 'PGRST200', "Could not find a relationship between '$from' and '$to' in the schema cache");
        }
        if (count($candidates) > 1) {
            throw new ApiError(300, 'PGRST201', "Could not embed because more than one relationship was found for '$from' and '$to'");
        }
        return $candidates[0];
    }
}
