<?php
/**
 * PostgREST-compatible engine (the subset supabase-js uses):
 *   GET/HEAD  /rest/v1/{table}?select=*,rel(cols)&col=op.val&or=(...)&order=..&limit=..&offset=..
 *   POST      /rest/v1/{table}   (insert / upsert)
 *   PATCH     /rest/v1/{table}?filters
 *   DELETE    /rest/v1/{table}?filters
 *   POST      /rest/v1/rpc/{fn}
 *
 * Every row access goes through Policies (the port of the Supabase RLS
 * policies, column grants and triggers). Identifiers are validated against
 * the schema; values are always bound parameters.
 */
defined('MB_API') or exit;

class Rest
{
    const RESERVED = ['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'];
    const MAX_ROWS = 1000;

    /** Read-only views that existed in Supabase. */
    private static function views()
    {
        return [
            'posts_public' => ['base' => 'posts', 'where' => "t.`status` = 'approved'", 'blank' => ['phone', 'telegram']],
            'products_public' => ['base' => 'products', 'where' => "t.`approval_status` = 'approved'", 'blank' => ['phone', 'telegram']],
        ];
    }

    public static function handle($resource, $method)
    {
        if (str_starts($resource, 'rpc/')) {
            Rpc::handle(substr($resource, 4), $method);
            return;
        }
        $views = self::views();
        $view = isset($views[$resource]) ? $views[$resource] : null;
        $table = $view ? $view['base'] : $resource;
        $def = Schema::table($table);
        if ($def === null || !empty($def['internal']) || !preg_match('/^[a-z0-9_]+$/', $resource)) {
            throw new ApiError(404, 'PGRST205', "Could not find the table 'public.$resource' in the schema cache");
        }
        $ctx = Ctx::current();
        switch ($method) {
            case 'GET':
            case 'HEAD':
                self::read($table, $view, $ctx, $method === 'HEAD');
                return;
            case 'POST':
                if ($view) throw new ApiError(405, '42809', "cannot insert into view \"$resource\"");
                self::insert($table, $ctx);
                return;
            case 'PATCH':
                if ($view) throw new ApiError(405, '42809', "cannot update view \"$resource\"");
                self::update($table, $ctx);
                return;
            case 'DELETE':
                if ($view) throw new ApiError(405, '42809', "cannot delete from view \"$resource\"");
                self::delete($table, $ctx);
                return;
        }
        throw new ApiError(405, 'PGRST117', 'Unsupported HTTP method: ' . $method);
    }

    // ------------------------------------------------------------------
    // Request parsing
    // ------------------------------------------------------------------
    public static function prefer()
    {
        $out = [];
        $raw = (string)request_header('Prefer');
        foreach (preg_split('/\s*,\s*/', $raw) as $part) {
            if ($part === '') continue;
            $kv = explode('=', $part, 2);
            $out[trim($kv[0])] = isset($kv[1]) ? trim($kv[1]) : '';
        }
        return $out;
    }

    public static function wantsObject()
    {
        return stripos((string)request_header('Accept'), 'application/vnd.pgrst.object+json') !== false;
    }

    /**
     * select grammar: item(,item)* where item is
     *   *  |  [alias:]col[::cast]  |  [alias:]rel[!hint][!inner](select)
     */
    public static function parseSelect($s)
    {
        $s = trim((string)$s);
        if ($s === '') $s = '*';
        $items = self::splitTopLevel($s);
        $result = ['star' => false, 'cols' => [], 'embeds' => []];
        foreach ($items as $raw) {
            $item = trim($raw);
            if ($item === '') continue;
            if ($item === '*') { $result['star'] = true; continue; }
            $alias = null;
            $paren = strpos($item, '(');
            $colon = strpos($item, ':');
            if ($colon !== false && ($paren === false || $colon < $paren) && substr($item, $colon, 2) !== '::') {
                $alias = trim(substr($item, 0, $colon));
                $item = trim(substr($item, $colon + 1));
                $paren = strpos($item, '(');
            }
            if ($paren !== false) {
                if (substr($item, -1) !== ')') throw new ApiError(400, 'PGRST100', 'failed to parse select parameter (' . $s . ')');
                $head = substr($item, 0, $paren);
                $inner = substr($item, $paren + 1, -1);
                $bits = explode('!', $head);
                $rel = array_shift($bits);
                $hint = null;
                $innerJoin = false;
                foreach ($bits as $b) {
                    if ($b === 'inner') $innerJoin = true;
                    elseif ($b === 'left') $innerJoin = false;
                    else $hint = $b;
                }
                if (str_starts($rel, '...')) throw new ApiError(400, 'PGRST100', 'spread embeds are not supported');
                $result['embeds'][] = [
                    'table' => $rel,
                    'alias' => $alias !== null ? $alias : $rel,
                    'hint' => $hint,
                    'inner' => $innerJoin,
                    'select' => self::parseSelect($inner),
                ];
            } else {
                $name = $item;
                $cast = strpos($name, '::');
                if ($cast !== false) $name = substr($name, 0, $cast);
                $name = trim($name);
                $result['cols'][] = ['name' => $name, 'alias' => $alias !== null ? $alias : $name];
            }
        }
        if (!$result['star'] && count($result['cols']) === 0 && count($result['embeds']) === 0) $result['star'] = true;
        return $result;
    }

    /** Splits on commas that are not inside parentheses or double quotes. */
    public static function splitTopLevel($s)
    {
        $parts = [];
        $depth = 0;
        $quoted = false;
        $cur = '';
        $len = strlen($s);
        for ($i = 0; $i < $len; $i++) {
            $ch = $s[$i];
            if ($ch === '"' && ($i === 0 || $s[$i - 1] !== '\\')) $quoted = !$quoted;
            if (!$quoted) {
                if ($ch === '(') $depth++;
                elseif ($ch === ')') $depth--;
                elseif ($ch === ',' && $depth === 0) { $parts[] = $cur; $cur = ''; continue; }
            }
            $cur .= $ch;
        }
        $parts[] = $cur;
        return $parts;
    }

    private static function filterPairs()
    {
        $out = [];
        foreach (query_pairs() as $pair) {
            if (in_array($pair[0], self::RESERVED, true)) continue;
            $out[] = $pair;
        }
        return $out;
    }

    public static function buildWhere($table, array $pairs)
    {
        $clauses = [];
        $params = [];
        foreach ($pairs as $pair) {
            list($key, $value) = $pair;
            if (in_array($key, ['or', 'and', 'not.or', 'not.and'], true)) {
                $neg = str_starts($key, 'not.');
                $op = $neg ? substr($key, 4) : $key;
                list($sql, $p) = self::logic($table, $op, $value);
                $clauses[] = ($neg ? 'NOT ' : '') . $sql;
                $params = array_merge($params, $p);
                continue;
            }
            if (strpos($key, '.') !== false) {
                throw new ApiError(400, 'PGRST100', 'Filtering on embedded resources is not supported: ' . $key);
            }
            list($sql, $p) = self::condition($table, $key, $value);
            $clauses[] = $sql;
            $params = array_merge($params, $p);
        }
        return [count($clauses) ? implode(' AND ', $clauses) : '1=1', $params];
    }

    /** or=(a.eq.1,and(b.gt.2,c.is.null)) */
    private static function logic($table, $op, $value)
    {
        $value = trim($value);
        if ($value === '' || $value[0] !== '(' || substr($value, -1) !== ')') {
            throw new ApiError(400, 'PGRST100', 'failed to parse logic tree (' . $value . ')');
        }
        $items = self::splitTopLevel(substr($value, 1, -1));
        $parts = [];
        $params = [];
        foreach ($items as $item) {
            $item = trim($item);
            if ($item === '') continue;
            if (preg_match('/^(not\.)?(and|or)(\(.*\))$/s', $item, $m)) {
                list($sql, $p) = self::logic($table, $m[2], $m[3]);
                $parts[] = ($m[1] ? 'NOT ' : '') . $sql;
                $params = array_merge($params, $p);
                continue;
            }
            $dot = strpos($item, '.');
            if ($dot === false) throw new ApiError(400, 'PGRST100', 'failed to parse logic tree (' . $value . ')');
            list($sql, $p) = self::condition($table, substr($item, 0, $dot), substr($item, $dot + 1), true);
            $parts[] = $sql;
            $params = array_merge($params, $p);
        }
        if (!$parts) return ['1=1', []];
        return ['(' . implode($op === 'or' ? ' OR ' : ' AND ', $parts) . ')', $params];
    }

    private static function unquote($v)
    {
        $v = trim($v);
        if (strlen($v) >= 2 && $v[0] === '"' && substr($v, -1) === '"') {
            return str_replace(['\\"', '\\\\'], ['"', '\\'], substr($v, 1, -1));
        }
        return $v;
    }

    private static function condition($table, $col, $expr, $inLogic = false)
    {
        $col = trim($col);
        if (!Schema::hasColumn($table, $col)) {
            throw new ApiError(400, '42703', "column $table.$col does not exist");
        }
        $neg = false;
        if (str_starts($expr, 'not.')) { $neg = true; $expr = substr($expr, 4); }
        $dot = strpos($expr, '.');
        if ($dot === false) throw new ApiError(400, 'PGRST100', '"failed to parse filter (' . $expr . ')"');
        $op = substr($expr, 0, $dot);
        $val = substr($expr, $dot + 1);
        if ($inLogic) $val = self::unquote($val);
        $c = 't.' . Schema::q($col);
        $type = explode(':', Schema::colType($table, $col))[0];
        $params = [];
        $ops = ['eq' => '=', 'neq' => '<>', 'gt' => '>', 'gte' => '>=', 'lt' => '<', 'lte' => '<='];
        if (isset($ops[$op])) {
            $sql = "$c {$ops[$op]} ?";
            $params[] = self::filterValue($table, $col, $val);
        } elseif ($op === 'like' || $op === 'ilike') {
            $pattern = str_replace('*', '%', $val);
            $target = in_array($type, ['text', 'vc', 'uuid'], true) ? $c : "CAST($c AS CHAR)";
            $sql = $op === 'like' ? "$target LIKE ? COLLATE utf8mb4_bin" : "$target LIKE ?";
            $params[] = $pattern;
        } elseif ($op === 'is') {
            $v = strtolower($val);
            if ($v === 'null' || $v === 'unknown') $sql = "$c IS NULL";
            elseif ($v === 'true') $sql = "$c = 1";
            elseif ($v === 'false') $sql = "$c = 0";
            else throw new ApiError(400, 'PGRST100', 'failed to parse filter (is.' . $val . ')');
        } elseif ($op === 'in') {
            $v = trim($val);
            if ($v === '' || $v[0] !== '(' || substr($v, -1) !== ')') throw new ApiError(400, 'PGRST100', 'failed to parse filter (in.' . $val . ')');
            $items = array_map([__CLASS__, 'unquote'], self::splitTopLevel(substr($v, 1, -1)));
            $items = array_values(array_filter($items, function ($x) { return $x !== ''; }));
            if (!$items) {
                $sql = '1=0';
            } else {
                $sql = "$c IN (" . implode(',', array_fill(0, count($items), '?')) . ')';
                foreach ($items as $item) $params[] = self::filterValue($table, $col, $item);
            }
        } elseif (($op === 'cs' || $op === 'ov' || $op === 'cd') && $type === 'textarr') {
            $items = Schema::parsePgArray($val);
            if (!$items) {
                $sql = $op === 'ov' ? '1=0' : '1=1';
            } elseif ($op === 'cd') {
                $sql = "JSON_CONTAINS(CAST(? AS JSON), $c)";
                $params[] = json_encode(array_values($items), JSON_UNESCAPED_UNICODE);
            } else {
                $bits = [];
                foreach ($items as $item) { $bits[] = "JSON_CONTAINS($c, JSON_QUOTE(?))"; $params[] = (string)$item; }
                $sql = '(' . implode($op === 'cs' ? ' AND ' : ' OR ', $bits) . ')';
            }
        } else {
            throw new ApiError(400, 'PGRST100', 'Unsupported filter operator: ' . $op);
        }
        return [$neg ? "NOT ($sql)" : $sql, $params];
    }

    private static function filterValue($table, $col, $val)
    {
        $type = explode(':', Schema::colType($table, $col))[0];
        if (in_array($type, ['text', 'vc'], true)) return $val;
        return Schema::toDb($table, $col, $val);
    }

    private static function buildOrder($table, $order)
    {
        if ($order === null || $order === '') return '';
        $parts = [];
        foreach (self::splitTopLevel($order) as $item) {
            $bits = explode('.', trim($item));
            $col = array_shift($bits);
            if (!Schema::hasColumn($table, $col)) throw new ApiError(400, '42703', "column $table.$col does not exist");
            $dir = 'ASC';
            $nulls = null;
            foreach ($bits as $b) {
                if ($b === 'desc') $dir = 'DESC';
                elseif ($b === 'asc') $dir = 'ASC';
                elseif ($b === 'nullsfirst') $nulls = 'first';
                elseif ($b === 'nullslast') $nulls = 'last';
            }
            // PostgreSQL defaults: ASC -> NULLS LAST, DESC -> NULLS FIRST.
            if ($nulls === null) $nulls = $dir === 'ASC' ? 'last' : 'first';
            $c = 't.' . Schema::q($col);
            $parts[] = "($c IS NULL) " . ($nulls === 'first' ? 'DESC' : 'ASC');
            $parts[] = "$c $dir";
        }
        return ' ORDER BY ' . implode(', ', $parts);
    }

    // ------------------------------------------------------------------
    // Policies glue
    // ------------------------------------------------------------------
    public static function assertGrant($table, Ctx $ctx, $command)
    {
        if ($ctx->service) return;
        $pol = Policies::get($table);
        $grants = isset($pol['grants']) ? $pol['grants'] : ['anon' => 'riud', 'authenticated' => 'riud'];
        $role = $ctx->isAuthenticated() ? 'authenticated' : 'anon';
        $letters = isset($grants[$role]) ? $grants[$role] : '';
        $letter = ['select' => 'r', 'insert' => 'i', 'update' => 'u', 'delete' => 'd'][$command];
        if (strpos($letters, $letter) === false) {
            throw new ApiError($ctx->isAuthenticated() ? 403 : 401, '42501', "permission denied for table $table");
        }
    }

    /** Combined USING/WITH CHECK condition for a command: [sql, params]. */
    public static function policySql($table, Ctx $ctx, $command)
    {
        if ($ctx->service) return ['1=1', []];
        $pol = Policies::get($table);
        if ($ctx->isAuthenticated()) {
            $requireActive = isset($pol['require_active']) ? $pol['require_active'] : true;
            $activeApplies = $requireActive === true || (is_array($requireActive) && in_array($command, $requireActive, true));
            if ($activeApplies && !$ctx->isActive()) return ['1=0', []];
        }
        if (!isset($pol[$command])) return ['1=0', []];
        $res = $pol[$command]($ctx);
        if ($res === true) return ['1=1', []];
        if ($res === false || $res === null) return ['1=0', []];
        return [$res[0], isset($res[1]) ? $res[1] : []];
    }

    private static function viewSql($view, Ctx $ctx)
    {
        if ($ctx->isAuthenticated() && !$ctx->isActive()) return ['1=0', []];
        return [$view['where'], []];
    }

    private static function pkWhere($table, array $pkVals)
    {
        $parts = [];
        $params = [];
        foreach (Schema::pk($table) as $col) {
            $parts[] = 't.' . Schema::q($col) . ' = ?';
            $params[] = $pkVals[$col];
        }
        return [implode(' AND ', $parts), $params];
    }

    private static function checkEnums($table, array $row)
    {
        $def = Schema::table($table);
        if (empty($def['enum'])) return;
        foreach ($def['enum'] as $col => $allowed) {
            if (array_key_exists($col, $row) && $row[$col] !== null && !in_array((string)$row[$col], $allowed, true)) {
                throw new ApiError(400, '23514', "new row for relation \"$table\" violates check constraint \"{$table}_{$col}_check\"");
            }
        }
    }

    private static function assertColumns($table, array $input)
    {
        foreach ($input as $k => $_) {
            if (!Schema::hasColumn($table, $k)) {
                throw new ApiError(400, 'PGRST204', "Could not find the '$k' column of '$table' in the schema cache");
            }
        }
    }

    private static function assertColumnGrant($table, Ctx $ctx, array $input, $kind)
    {
        if ($ctx->service) return;
        $pol = Policies::get($table);
        $key = $kind . '_cols';
        if (!isset($pol[$key])) return;
        foreach ($input as $k => $_) {
            if (!in_array($k, $pol[$key], true)) {
                throw new ApiError(403, '42501', "permission denied for table $table");
            }
        }
    }

    private static function hook($table, $name)
    {
        $pol = Policies::get($table);
        return isset($pol[$name]) ? $pol[$name] : null;
    }

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------
    private static function read($table, $view, Ctx $ctx, $head)
    {
        if ($view) {
            // Views are granted to anon + authenticated and run as owner.
            list($pw, $pp) = self::viewSql($view, $ctx);
        } else {
            self::assertGrant($table, $ctx, 'select');
            list($pw, $pp) = self::policySql($table, $ctx, 'select');
        }
        $select = self::parseSelect(query_param('select', '*'));
        list($fw, $fp) = self::buildWhere($table, self::filterPairs());
        $where = "($fw) AND ($pw)";
        $params = array_merge($fp, $pp);
        $order = self::buildOrder($table, query_param('order'));
        $limit = query_param('limit');
        $offset = query_param('offset');
        $limitN = ($limit !== null && preg_match('/^\d+$/', $limit)) ? min((int)$limit, self::MAX_ROWS) : self::MAX_ROWS;
        $offsetN = ($offset !== null && preg_match('/^\d+$/', $offset)) ? (int)$offset : 0;

        $prefer = self::prefer();
        $count = null;
        if (isset($prefer['count'])) {
            $count = (int)Db::value('SELECT COUNT(*) FROM ' . Schema::q($table) . " AS t WHERE $where", $params);
        }

        $rows = [];
        if (!$head) {
            $sql = 'SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE $where$order LIMIT $limitN OFFSET $offsetN";
            $rows = Db::all($sql, $params);
            if ($view) {
                foreach ($rows as &$r) foreach ($view['blank'] as $b) $r[$b] = '';
                unset($r);
            }
        }
        $shaped = array_values(self::shape($table, $rows, $select, $ctx));
        self::respondRows(200, $shaped, $offsetN, $count, $head);
    }

    private static function respondRows($status, array $rows, $offset, $count, $head = false)
    {
        $n = count($rows);
        $range = ($n > 0 ? $offset . '-' . ($offset + $n - 1) : '*') . '/' . ($count === null ? '*' : $count);
        $headers = ['Content-Range' => $range];
        if (self::wantsObject()) {
            if ($n !== 1) {
                throw new ApiError(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned', "The result contains $n rows");
            }
            if ($head) send_empty($status, $headers);
            send_json($status, $rows[0], $headers);
        }
        if ($head) send_empty($status, $headers);
        send_json($status, $rows, $headers);
    }

    /**
     * Converts DB rows to wire rows, resolves embeds, applies projection.
     * Returns rows in order; rows dropped by !inner embeds are removed.
     */
    public static function shape($table, array $dbRows, array $select, Ctx $ctx)
    {
        if (!$dbRows) return [];
        $embedded = [];
        foreach ($select['embeds'] as $ei => $emb) {
            $rel = Schema::relationship($table, $emb['table'], $emb['hint']);
            $keys = [];
            foreach ($dbRows as $r) {
                $v = isset($r[$rel['local']]) ? $r[$rel['local']] : null;
                if ($v !== null) $keys[(string)$v] = true;
            }
            $byKey = [];
            if ($keys) {
                $allowed = true;
                try {
                    self::assertGrant($emb['table'], $ctx, 'select');
                } catch (ApiError $e) {
                    $allowed = false;
                }
                if ($allowed) {
                    list($pw, $pp) = self::policySql($emb['table'], $ctx, 'select');
                    $keyList = array_keys($keys);
                    $in = implode(',', array_fill(0, count($keyList), '?'));
                    $childRows = Db::all(
                        'SELECT t.* FROM ' . Schema::q($emb['table']) . ' AS t WHERE t.' . Schema::q($rel['foreign']) . " IN ($in) AND ($pw)",
                        array_merge($keyList, $pp)
                    );
                    $shapedChildren = self::shape($emb['table'], $childRows, $emb['select'], $ctx);
                    foreach ($childRows as $ci => $cr) {
                        if (!array_key_exists($ci, $shapedChildren)) continue;
                        $byKey[(string)$cr[$rel['foreign']]][] = $shapedChildren[$ci];
                    }
                }
            }
            $embedded[$ei] = ['rel' => $rel, 'byKey' => $byKey];
        }

        $out = [];
        foreach ($dbRows as $i => $r) {
            $wire = Schema::rowFromDb($table, $r);
            $row = [];
            if ($select['star']) {
                $row = $wire;
            }
            foreach ($select['cols'] as $c) {
                if (!array_key_exists($c['name'], $wire)) {
                    throw new ApiError(400, '42703', "column $table.{$c['name']} does not exist");
                }
                $row[$c['alias']] = $wire[$c['name']];
            }
            $keep = true;
            foreach ($select['embeds'] as $ei => $emb) {
                $rel = $embedded[$ei]['rel'];
                $local = isset($r[$rel['local']]) ? (string)$r[$rel['local']] : null;
                $children = ($local !== null && isset($embedded[$ei]['byKey'][$local])) ? $embedded[$ei]['byKey'][$local] : [];
                if ($rel['kind'] === 'm2o') {
                    $row[$emb['alias']] = $children ? $children[0] : null;
                    if ($emb['inner'] && !$children) $keep = false;
                } else {
                    $row[$emb['alias']] = $children;
                    if ($emb['inner'] && !$children) $keep = false;
                }
            }
            if ($keep) $out[$i] = $row;
        }
        return $out;
    }

    /** Fetches rows by primary keys honouring the select policy, then shapes them. */
    private static function representation($table, array $pkList, Ctx $ctx)
    {
        if (!$pkList) return [];
        $select = self::parseSelect(query_param('select', '*'));
        list($pw, $pp) = self::policySql($table, $ctx, 'select');
        $rows = [];
        foreach ($pkList as $pkVals) {
            list($w, $p) = self::pkWhere($table, $pkVals);
            $row = Db::one('SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE $w AND ($pw)", array_merge($p, $pp));
            if ($row) $rows[] = $row;
        }
        return array_values(self::shape($table, $rows, $select, $ctx));
    }

    // ------------------------------------------------------------------
    // Writes
    // ------------------------------------------------------------------
    private static function bodyRows()
    {
        $body = json_body();
        if ($body === null) throw new ApiError(400, 'PGRST102', 'Empty or invalid json');
        if (!is_array($body)) throw new ApiError(400, 'PGRST102', 'Empty or invalid json');
        if (count($body) === 0) return [];
        $isList = array_keys($body) === range(0, count($body) - 1);
        $rows = $isList ? $body : [$body];
        foreach ($rows as $r) {
            if (!is_array($r)) throw new ApiError(400, 'PGRST102', 'All object keys must match');
        }
        return $rows;
    }

    private static function insert($table, Ctx $ctx)
    {
        self::assertGrant($table, $ctx, 'insert');
        $rows = self::bodyRows();
        $prefer = self::prefer();
        $resolution = isset($prefer['resolution']) ? $prefer['resolution'] : null;
        $onConflictRaw = query_param('on_conflict');
        $conflictCols = $onConflictRaw ? array_map('trim', explode(',', $onConflictRaw)) : Schema::pk($table);
        foreach ($conflictCols as $cc) {
            if (!Schema::hasColumn($table, $cc)) throw new ApiError(400, '42703', "column $table.$cc does not exist");
        }

        $wantRows = (isset($prefer['return']) ? $prefer['return'] : 'minimal') === 'representation';
        // As in Postgres' INSERT ... RETURNING, rows the caller may not SELECT abort the whole statement.
        $out = Db::transaction(function () use ($table, $ctx, $rows, $resolution, $conflictCols, $wantRows) {
            $pkList = [];
            foreach ($rows as $input) {
                self::assertColumns($table, $input);
                if ($resolution === 'merge-duplicates' || $resolution === 'ignore-duplicates') {
                    $existing = self::findConflict($table, $input, $conflictCols);
                    if ($existing) {
                        if ($resolution === 'ignore-duplicates') continue;
                        self::assertGrant($table, $ctx, 'update');
                        self::assertColumnGrant($table, $ctx, $input, 'update');
                        list($uw, $up) = self::policySql($table, $ctx, 'update');
                        list($w, $p) = self::pkWhere($table, self::pkOf($table, $existing));
                        $locked = Db::one('SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE $w AND ($uw) FOR UPDATE", array_merge($p, $up));
                        if (!$locked) {
                            throw new ApiError(403, '42501', "new row violates row-level security policy (USING expression) for table \"$table\"");
                        }
                        $patch = [];
                        foreach ($input as $k => $v) $patch[$k] = Schema::toDb($table, $k, $v);
                        $pkList[] = self::updateOne($table, $locked, $patch, $ctx);
                        continue;
                    }
                }
                $pkList[] = self::insertRow($table, $input, $ctx);
            }
            if (!$wantRows) return null;
            $out = self::representation($table, $pkList, $ctx);
            if (count($out) < count($pkList)) {
                throw new ApiError(403, '42501', "new row violates row-level security policy for table \"$table\"");
            }
            return $out;
        });

        if ($wantRows) self::respondRows(201, $out, 0, null);
        send_empty(201);
    }

    private static function findConflict($table, array $input, array $cols)
    {
        $parts = [];
        $params = [];
        foreach ($cols as $c) {
            if (!array_key_exists($c, $input) || $input[$c] === null) return null;
            $parts[] = 't.' . Schema::q($c) . ' = ?';
            $params[] = Schema::toDb($table, $c, $input[$c]);
        }
        return Db::one('SELECT t.* FROM ' . Schema::q($table) . ' AS t WHERE ' . implode(' AND ', $parts), $params);
    }

    private static function pkOf($table, array $row)
    {
        $out = [];
        foreach (Schema::pk($table) as $c) $out[$c] = $row[$c];
        return $out;
    }

    /** Inserts one row through grants, defaults, BEFORE trigger, WITH CHECK and AFTER trigger. */
    public static function insertRow($table, array $input, Ctx $ctx)
    {
        self::assertColumnGrant($table, $ctx, $input, 'insert');
        $row = [];
        foreach ($input as $k => $v) $row[$k] = Schema::toDb($table, $k, $v);
        // Like Postgres' NEW record, triggers see every column (NULL when absent).
        $implicitNull = [];
        foreach (Schema::columns($table) as $col) {
            if (!array_key_exists($col, $row)) {
                list($has, $default) = Schema::defaultFor($table, $col);
                $row[$col] = $has ? $default : null;
                if (!$has) $implicitNull[] = $col;
            }
        }
        $before = self::hook($table, 'before_insert');
        if ($before) $before($row, $ctx);
        // Columns nobody set stay out of the INSERT, so MySQL reports a missing required value as before.
        foreach ($implicitNull as $col) {
            if ($row[$col] === null) unset($row[$col]);
        }
        self::checkEnums($table, $row);
        $cols = array_keys($row);
        $sql = 'INSERT INTO ' . Schema::q($table) . ' (' . implode(',', array_map(['Schema', 'q'], $cols)) . ') VALUES (' .
            implode(',', array_fill(0, count($cols), '?')) . ')';
        Db::exec($sql, array_values($row));
        $pkVals = self::pkOf($table, $row);

        if (!$ctx->service) {
            list($cw, $cp) = self::policySql($table, $ctx, 'insert');
            list($w, $p) = self::pkWhere($table, $pkVals);
            $ok = Db::value('SELECT 1 FROM ' . Schema::q($table) . " AS t WHERE $w AND ($cw)", array_merge($p, $cp));
            if (!$ok) throw new ApiError(403, '42501', "new row violates row-level security policy for table \"$table\"");
        }
        $after = self::hook($table, 'after_insert');
        if ($after) {
            list($w, $p) = self::pkWhere($table, $pkVals);
            $fresh = Db::one('SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE $w", $p);
            $after($fresh, $ctx);
        }
        return $pkVals;
    }

    /** Applies a DB-typed patch to one locked row: BEFORE trigger, UPDATE, WITH CHECK, AFTER trigger. */
    public static function updateOne($table, array $old, array $patch, Ctx $ctx)
    {
        $new = array_merge($old, $patch);
        $before = self::hook($table, 'before_update');
        if ($before) $before($new, $old, $ctx);
        self::checkEnums($table, $new);
        $set = [];
        $params = [];
        foreach ($new as $col => $value) {
            if (!Schema::hasColumn($table, $col)) continue;
            if (array_key_exists($col, $patch) || !Schema::same($table, $col, $old[$col], $value)) {
                $set[] = Schema::q($col) . ' = ?';
                $params[] = $value;
            }
        }
        $pkVals = self::pkOf($table, $old);
        if ($set) {
            $where = [];
            foreach ($pkVals as $c => $v) { $where[] = Schema::q($c) . ' = ?'; $params[] = $v; }
            Db::exec('UPDATE ' . Schema::q($table) . ' SET ' . implode(', ', $set) . ' WHERE ' . implode(' AND ', $where), $params);
        }
        $newPk = self::pkOf($table, $new);
        if (!$ctx->service) {
            $pol = Policies::get($table);
            list($cw, $cp) = self::policySql($table, $ctx, isset($pol['update_check']) ? 'update_check' : 'update');
            list($w, $p) = self::pkWhere($table, $newPk);
            $ok = Db::value('SELECT 1 FROM ' . Schema::q($table) . " AS t WHERE $w AND ($cw)", array_merge($p, $cp));
            if (!$ok) throw new ApiError(403, '42501', "new row violates row-level security policy for table \"$table\"");
        }
        $after = self::hook($table, 'after_update');
        if ($after) {
            list($w, $p) = self::pkWhere($table, $newPk);
            $fresh = Db::one('SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE $w", $p);
            $after($fresh, $old, $ctx);
        }
        return $newPk;
    }

    private static function update($table, Ctx $ctx)
    {
        self::assertGrant($table, $ctx, 'update');
        $body = json_body();
        if (!is_array($body)) throw new ApiError(400, 'PGRST102', 'Empty or invalid json');
        self::assertColumns($table, $body);
        self::assertColumnGrant($table, $ctx, $body, 'update');
        $patch = [];
        foreach ($body as $k => $v) $patch[$k] = Schema::toDb($table, $k, $v);

        list($fw, $fp) = self::buildWhere($table, self::filterPairs());
        list($uw, $up) = self::policySql($table, $ctx, 'update');
        $limit = query_param('limit');
        $limitSql = ($limit !== null && preg_match('/^\d+$/', $limit)) ? ' LIMIT ' . (int)$limit : '';

        $prefer = self::prefer();
        $wantRows = (isset($prefer['return']) ? $prefer['return'] : 'minimal') === 'representation';
        list($pkList, $out) = Db::transaction(function () use ($table, $ctx, $patch, $fw, $fp, $uw, $up, $limitSql, $wantRows) {
            $rows = Db::all('SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE ($fw) AND ($uw)$limitSql FOR UPDATE", array_merge($fp, $up));
            $pkList = [];
            foreach ($rows as $old) $pkList[] = self::updateOne($table, $old, $patch, $ctx);
            if (!$wantRows) return [$pkList, null];
            // UPDATE ... RETURNING: an updated row the caller can no longer SELECT is an error, not a silent drop.
            $out = self::representation($table, $pkList, $ctx);
            if (count($out) < count($pkList)) {
                throw new ApiError(403, '42501', "new row violates row-level security policy for table \"$table\"");
            }
            return [$pkList, $out];
        });

        if ($wantRows) {
            self::respondRows(200, $out, 0, isset($prefer['count']) ? count($pkList) : null);
        }
        send_empty(204, isset($prefer['count']) ? ['Content-Range' => '*/' . count($pkList)] : []);
    }

    private static function delete($table, Ctx $ctx)
    {
        self::assertGrant($table, $ctx, 'delete');
        list($fw, $fp) = self::buildWhere($table, self::filterPairs());
        list($dw, $dp) = self::policySql($table, $ctx, 'delete');
        $prefer = self::prefer();
        $wantRows = (isset($prefer['return']) ? $prefer['return'] : 'minimal') === 'representation';
        $select = self::parseSelect(query_param('select', '*'));

        $result = Db::transaction(function () use ($table, $ctx, $fw, $fp, $dw, $dp, $wantRows, $select) {
            $rows = Db::all('SELECT t.* FROM ' . Schema::q($table) . " AS t WHERE ($fw) AND ($dw) FOR UPDATE", array_merge($fp, $dp));
            $shaped = [];
            if ($wantRows && $rows) {
                // Deleted rows are returned only where the caller could also SELECT them.
                list($sw, $sp) = self::policySql($table, $ctx, 'select');
                $visible = [];
                foreach ($rows as $r) {
                    list($w, $p) = self::pkWhere($table, self::pkOf($table, $r));
                    if (Db::value('SELECT 1 FROM ' . Schema::q($table) . " AS t WHERE $w AND ($sw)", array_merge($p, $sp))) $visible[] = $r;
                }
                $shaped = array_values(self::shape($table, $visible, $select, $ctx));
            }
            $after = self::hook($table, 'after_delete');
            foreach ($rows as $old) {
                $where = [];
                $params = [];
                foreach (self::pkOf($table, $old) as $c => $v) { $where[] = Schema::q($c) . ' = ?'; $params[] = $v; }
                Db::exec('DELETE FROM ' . Schema::q($table) . ' WHERE ' . implode(' AND ', $where), $params);
                if ($after) $after($old, $ctx);
            }
            return ['count' => count($rows), 'rows' => $shaped];
        });

        if ($wantRows) self::respondRows(200, $result['rows'], 0, isset($prefer['count']) ? $result['count'] : null);
        send_empty(204, isset($prefer['count']) ? ['Content-Range' => '*/' . $result['count']] : []);
    }
}
