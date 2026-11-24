<?php
/**
 * /rest/v1/rpc/{fn} — PHP ports of the Supabase SQL functions.
 * SECURITY DEFINER functions use direct SQL (bypassing row policies) and
 * perform their own authorization exactly like the originals.
 */
defined('MB_API') or exit;

class Rpc
{
    private static function fns()
    {
        return [
            'increment_post_views' => 'incrementPostViews',
            'seller_follower_count' => 'sellerFollowerCount',
            'get_public_stores_for_map' => 'publicStoresForMap',
            'create_b2b_order' => 'createB2BOrder',
            'supplier_confirm_cash_payment' => 'supplierConfirmCashPayment',
            'set_b2b_cashback_rate' => 'setCashbackRate',
            'request_cashback_withdrawal' => 'requestCashbackWithdrawal',
            'admin_update_cashback_withdrawal' => 'adminUpdateCashbackWithdrawal',
            'admin_grant_business_cashback' => 'adminGrantBusinessCashback',
            'admin_update_business_store' => 'adminUpdateBusinessStore',
            'register_business_buyer_with_address' => 'registerBusinessBuyer',
            'create_agro_request' => 'createAgroRequest',
            'close_agro_request' => 'closeAgroRequest',
            'send_agro_offer' => 'sendAgroOffer',
            'respond_agro_offer' => 'respondAgroOffer',
            'nearby_posts' => 'nearbyPosts',
            'nearby_b2b_products' => 'nearbyB2BProducts',
            'is_admin' => 'isAdmin',
            'is_active_account' => 'isActiveAccount',
        ];
    }

    /** Functions whose EXECUTE was revoked from browser roles. */
    private static function revoked()
    {
        return ['decrement_product_stock', 'claim_welcome_email', 'check_agro_offer_target', 'validate_agro_product_link',
            'guard_upcoming_checkout', 'handle_new_user', 'protect_profile_insert'];
    }

    public static function handle($name, $method)
    {
        $ctx = Ctx::current();
        if (in_array($name, self::revoked(), true)) {
            throw new ApiError($ctx->isAuthenticated() ? 403 : 401, '42501', "permission denied for function $name");
        }
        $fns = self::fns();
        if (!isset($fns[$name])) {
            throw new ApiError(404, 'PGRST202', "Could not find the function public.$name without parameters in the schema cache");
        }
        if ($method === 'GET' || $method === 'HEAD') {
            $args = [];
            foreach (query_pairs() as $pair) $args[$pair[0]] = $pair[1];
        } elseif ($method === 'POST') {
            $body = json_body();
            $args = is_array($body) ? $body : [];
        } else {
            throw new ApiError(405, 'PGRST101', 'Only GET and POST are allowed for RPC');
        }
        $result = call_user_func([__CLASS__, $fns[$name]], $args, $ctx);
        if ($result === null) send_empty(204);
        send_json(200, $result);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------
    private static function arg(array $args, $key, $default = null)
    {
        return array_key_exists($key, $args) ? $args[$key] : $default;
    }

    private static function requireActive(Ctx $c)
    {
        if (!$c->isAuthenticated() || !$c->isActive()) {
            throw new ApiError(403, '42501', 'Akkaunt faol emas');
        }
    }

    private static function num($v, $label = 'numeric')
    {
        if ($v === null || $v === '') return null;
        if (!is_numeric($v)) throw new ApiError(400, '22P02', "invalid input syntax for type $label: \"$v\"");
        return (float)$v;
    }

    private static function uuidArg($v)
    {
        if ($v === null || $v === '') return null;
        if (!is_uuid((string)$v)) throw new ApiError(400, '22P02', 'invalid input syntax for type uuid: "' . $v . '"');
        return strtolower((string)$v);
    }

    private static function dateArg($v)
    {
        if ($v === null || $v === '') return null;
        $s = (string)$v;
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', substr($s, 0, 10))) throw new ApiError(400, '22007', 'invalid input syntax for type date: "' . $s . '"');
        return substr($s, 0, 10);
    }

    private static function money($f)
    {
        return Schema::floatToString(round((float)$f, 6));
    }

    private static function wire($table, $row)
    {
        return $row ? Schema::rowFromDb($table, $row) : null;
    }

    // ------------------------------------------------------------------
    // posts
    // ------------------------------------------------------------------
    private static function incrementPostViews(array $a, Ctx $c)
    {
        $id = self::uuidArg(self::arg($a, 'p_post_id'));
        if ($c->isAuthenticated() && !$c->isActive()) return null;
        Db::exec("UPDATE posts SET views_count = views_count + 1 WHERE id = ? AND status = 'approved'", [$id]);
        return null;
    }

    /** Public follower count shown on a seller's profile; who follows stays private. */
    private static function sellerFollowerCount(array $a, Ctx $c)
    {
        $id = self::uuidArg(self::arg($a, 'p_seller_id'));
        if ($id === null) return 0;
        return (int)Db::value('SELECT COUNT(*) FROM seller_follows WHERE seller_id = ?', [$id]);
    }

    private static function nearbyPosts(array $a, Ctx $c)
    {
        $lat = self::num(self::arg($a, 'p_lat'));
        $lng = self::num(self::arg($a, 'p_lng'));
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            raise_exception("Xarita nuqtasi noto'g'ri");
        }
        if ($c->isAuthenticated() && !$c->isActive()) return [];
        $limit = self::arg($a, 'p_limit', 300);
        $limit = max(1, min($limit === null ? 300 : (int)$limit, 1000));
        $dist = 'POW(SIN(RADIANS(p.latitude - ?) / 2), 2) + COS(RADIANS(?)) * COS(RADIANS(p.latitude)) * POW(SIN(RADIANS(p.longitude - ?) / 2), 2)';
        $rows = Db::all(
            "SELECT p.*, ($dist) AS _dist FROM posts p
             WHERE p.status = 'approved' AND (p.expires_at IS NULL OR p.expires_at > ?)
             ORDER BY p.is_sold ASC, (_dist IS NULL) ASC, _dist ASC, p.created_at DESC, p.id
             LIMIT $limit",
            [$lat, $lat, $lng, db_now()]
        );
        $active = $c->isAuthenticated() && $c->isActive();
        $out = [];
        foreach ($rows as $r) {
            unset($r['_dist']);
            if (!$active) { $r['phone'] = ''; $r['telegram'] = ''; }
            $out[] = Schema::rowFromDb('posts', $r);
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // B2B map / marketplace
    // ------------------------------------------------------------------
    private static function publicStoresForMap(array $a, Ctx $c)
    {
        $rows = Db::all(
            "SELECT bp.id, bp.store_name, bp.business_type, bp.region, bp.district, COALESCE(ba.address, '') AS address,
                    ba.latitude, ba.longitude, bp.logo_url, bp.description, bp.created_at
             FROM business_profiles bp
             JOIN business_addresses ba ON ba.id = (
                SELECT a.id FROM business_addresses a
                WHERE a.business_id = bp.id AND a.is_default = 1
                  AND a.latitude BETWEEN -90 AND 90 AND a.longitude BETWEEN -180 AND 180
                ORDER BY a.id LIMIT 1)
             WHERE bp.status = 'active'"
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => $r['id'],
                'store_name' => $r['store_name'],
                'business_type' => $r['business_type'],
                'region' => $r['region'],
                'district' => $r['district'],
                'address' => $r['address'],
                'latitude' => $r['latitude'] === null ? null : Schema::numberOut($r['latitude']),
                'longitude' => $r['longitude'] === null ? null : Schema::numberOut($r['longitude']),
                'logo_url' => $r['logo_url'],
                'description' => $r['description'],
                'created_at' => Schema::formatTimestamp($r['created_at']),
            ];
        }
        return $out;
    }

    private static function nearbyB2BProducts(array $a, Ctx $c)
    {
        $lat = self::num(self::arg($a, 'p_lat'));
        $lng = self::num(self::arg($a, 'p_lng'));
        if ($lat === null || $lng === null || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            raise_exception("Xarita nuqtasi noto'g'ri");
        }
        if ($c->isAuthenticated() && !$c->isActive()) return [];
        $f = self::arg($a, 'p_filters', []);
        if (is_string($f)) $f = json_decode($f, true);
        if (!is_array($f)) $f = [];
        $where = ["p.status = 'approved'"];
        $params = [$lat, $lat, $lng];
        $search = isset($f['search']) ? trim((string)$f['search']) : '';
        if ($search !== '') {
            $where[] = "LOCATE(LOWER(?), LOWER(CONCAT(p.name, ' ', COALESCE(p.brand, ''), ' ', p.variety))) > 0";
            $params[] = $search;
        }
        if (!empty($f['category'])) { $where[] = 'p.category = ?'; $params[] = (string)$f['category']; }
        if (isset($f['minPrice']) && $f['minPrice'] !== null && $f['minPrice'] !== '') { $where[] = 'p.wholesale_price >= ?'; $params[] = self::num($f['minPrice']); }
        if (isset($f['maxPrice']) && $f['maxPrice'] !== null && $f['maxPrice'] !== '') { $where[] = 'p.wholesale_price <= ?'; $params[] = self::num($f['maxPrice']); }
        if (isset($f['minMoq']) && $f['minMoq'] !== null && $f['minMoq'] !== '') { $where[] = 'p.moq <= ?'; $params[] = self::num($f['minMoq']); }
        if (!empty($f['deliveryOnly']) && $f['deliveryOnly'] !== 'false') $where[] = 'p.delivery_available = 1';
        if (!empty($f['verifiedOnly']) && $f['verifiedOnly'] !== 'false') $where[] = "s.verification_status = 'approved'";
        if (!empty($f['region'])) {
            $where[] = '(COALESCE(JSON_LENGTH(p.delivery_regions), 0) = 0 OR JSON_CONTAINS(p.delivery_regions, JSON_QUOTE(?)))';
            $params[] = (string)$f['region'];
        }
        $dist = 'POW(SIN(RADIANS(p.latitude - ?) / 2), 2) + COS(RADIANS(?)) * COS(RADIANS(p.latitude)) * POW(SIN(RADIANS(p.longitude - ?) / 2), 2)';
        $rows = Db::all(
            "SELECT p.*, ($dist) AS _dist, s.company_name AS _s_company, s.verification_status AS _s_status, s.region AS _s_region
             FROM b2b_products p LEFT JOIN supplier_profiles s ON s.id = p.supplier_id
             WHERE " . implode(' AND ', $where) . '
             ORDER BY (_dist IS NULL) ASC, _dist ASC, p.created_at DESC, p.id LIMIT 300',
            $params
        );
        $out = [];
        foreach ($rows as $r) {
            $sp = ['company_name' => $r['_s_company'], 'verification_status' => $r['_s_status'], 'region' => $r['_s_region']];
            unset($r['_dist'], $r['_s_company'], $r['_s_status'], $r['_s_region']);
            $w = Schema::rowFromDb('b2b_products', $r);
            $w['supplier_profiles'] = $sp;
            $out[] = $w;
        }
        return $out;
    }

    private static function createB2BOrder(array $a, Ctx $c)
    {
        self::requireActive($c);
        $businessId = self::uuidArg(self::arg($a, 'p_business_id'));
        $supplierId = self::uuidArg(self::arg($a, 'p_supplier_id'));
        if (!B2B::isOwnBusiness($businessId, $c)) raise_exception("Ruxsat yo'q: bu biznes profiliga tegishli emassiz");
        if (!B2B::isVerifiedSupplier($supplierId)) raise_exception('Supplier tasdiqlanmagan');
        $method = (string)self::arg($a, 'p_payment_method');
        if (!in_array($method, ['cash', 'online'], true)) raise_exception("Noto'g'ri to'lov usuli");
        if ($method === 'online') raise_exception("Onlayn to'lov hali mavjud emas");
        $cashback = self::num(self::arg($a, 'p_cashback_used', 0));
        if ($cashback === null) $cashback = 0.0;
        if ($cashback < 0) raise_exception("Keshbek miqdori manfiy bo'lishi mumkin emas");
        $items = self::arg($a, 'p_items', []);
        if (is_string($items)) $items = json_decode($items, true);
        if (!is_array($items)) $items = [];

        return Db::transaction(function () use ($a, $c, $businessId, $supplierId, $method, $cashback, $items) {
            $rate = (float)Db::value('SELECT commission_rate FROM supplier_profiles WHERE id = ?', [$supplierId]);
            $orderId = uuid4();
            $orderNumber = 'ONB-' . str_pad((string)next_sequence('b2b_order_number'), 6, '0', STR_PAD_LEFT);
            $now = db_now();
            Db::exec(
                "INSERT INTO b2b_orders (id, order_number, business_id, supplier_id, buyer_user_id, subtotal, delivery_fee, total,
                    payment_method, payment_status, status, rejection_reason, commission_rate, commission_amount, supplier_amount,
                    delivery_store_name, delivery_phone, delivery_region, delivery_district, delivery_address, delivery_note,
                    created_at, updated_at, cashback_used, cashback_earned)
                 VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 'cash_pending', 'pending', '', ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)",
                [$orderId, $orderNumber, $businessId, $supplierId, $c->uid, $method, self::money($rate),
                    (string)self::arg($a, 'p_delivery_store_name', ''), (string)self::arg($a, 'p_delivery_phone', ''),
                    (string)self::arg($a, 'p_delivery_region', ''), (string)self::arg($a, 'p_delivery_district', ''),
                    (string)self::arg($a, 'p_delivery_address', ''), (string)self::arg($a, 'p_delivery_note', ''), $now, $now]
            );
            $subtotal = 0.0;
            foreach ($items as $item) {
                $pid = self::uuidArg(isset($item['product_id']) ? $item['product_id'] : null);
                $qty = isset($item['quantity']) ? (int)$item['quantity'] : 0;
                $p = Db::one("SELECT * FROM b2b_products WHERE id = ? AND supplier_id = ? AND status = 'approved' FOR UPDATE", [$pid, $supplierId]);
                if (!$p) raise_exception('Mahsulot topilmadi yoki faol emas');
                if ($qty < (int)$p['moq']) raise_exception("Miqdor MOQ dan kam: {$p['name']} (min {$p['moq']})");
                if ((int)$p['available_qty'] < $qty) raise_exception("Yetarli zaxira yo'q: {$p['name']}");
                if ($qty < 1) P::checkViolation('b2b_order_items', 'b2b_order_items_quantity_check');
                if ($p['availability'] === 'upcoming') raise_exception('Kutilayotgan hosil uchun avval sana va shartlarni kelishing');
                $price = (float)$p['wholesale_price'];
                $line = $price * $qty;
                $subtotal += $line;
                $images = json_decode((string)$p['images'], true);
                Db::exec(
                    'INSERT INTO b2b_order_items (id, order_id, product_id, product_name, product_image, unit, unit_price, quantity, line_total, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [uuid4(), $orderId, $p['id'], $p['name'], (is_array($images) && isset($images[0])) ? (string)$images[0] : '', $p['unit'],
                        self::money($price), $qty, self::money($line), db_now()]
                );
                Db::exec('UPDATE b2b_products SET available_qty = available_qty - ?, updated_at = ? WHERE id = ?', [$qty, db_now(), $p['id']]);
            }
            if ($subtotal <= 0) raise_exception("Savat bo'sh");
            if ($cashback > $subtotal) raise_exception("Keshbek buyurtma summasidan katta bo'lishi mumkin emas");
            $commission = round($subtotal * $rate / 100, 2);
            $supplierAmount = $subtotal - $commission;
            $total = $subtotal - $cashback;
            if ($cashback > 0) {
                $balance = (float)Db::value('SELECT cashback_balance FROM business_profiles WHERE id = ? FOR UPDATE', [$businessId]);
                if ($balance < $cashback) raise_exception("Hamyonda yetarli keshbek mablag'i yo'q");
                Db::exec('UPDATE business_profiles SET cashback_balance = cashback_balance - ? WHERE id = ?', [self::money($cashback), $businessId]);
                Db::exec(
                    "INSERT INTO b2b_cashback_transactions (id, business_id, order_id, cashback_rate, amount, type, status, payout_details, description, created_at)
                     VALUES (?, ?, ?, 0, ?, 'redeemed', 'completed', '', 'Buyurtmada ishlatildi', ?)",
                    [uuid4(), $businessId, $orderId, self::money(-$cashback), db_now()]
                );
            }
            Db::exec('UPDATE b2b_orders SET subtotal = ?, total = ?, commission_amount = ?, supplier_amount = ?, cashback_used = ? WHERE id = ?',
                [self::money($subtotal), self::money($total), self::money($commission), self::money($supplierAmount), self::money($cashback), $orderId]);
            Db::exec(
                "INSERT INTO commission_ledger (id, order_id, supplier_id, gross_amount, commission_rate, commission_amount, supplier_amount, payment_method, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)",
                [uuid4(), $orderId, $supplierId, self::money($subtotal), self::money($rate), self::money($commission), self::money($supplierAmount), $method, db_now(), db_now()]
            );
            B2B::notifyNewOrder(['id' => $orderId, 'order_number' => $orderNumber, 'supplier_id' => $supplierId, 'total' => $total]);
            return $orderId;
        });
    }

    private static function supplierConfirmCashPayment(array $a, Ctx $c)
    {
        self::requireActive($c);
        $orderId = self::uuidArg(self::arg($a, 'p_order_id'));
        Db::transaction(function () use ($c, $orderId) {
            $o = Db::one('SELECT * FROM b2b_orders WHERE id = ? FOR UPDATE', [$orderId]);
            if (!$o) raise_exception('Buyurtma topilmadi');
            if (!B2B::isOwnSupplier($o['supplier_id'], $c)) raise_exception("Ruxsat yo'q: bu buyurtma sizga tegishli emas");
            if ($o['payment_method'] !== 'cash' || $o['payment_status'] !== 'cash_pending') raise_exception("Bu buyurtma naqd to'lov tasdig'ini kutmayapti");
            $rate = Db::value('SELECT cashback_rate FROM b2b_config WHERE id = 1');
            $rate = $rate === null ? 0.0 : (float)$rate;
            $earned = round((float)$o['total'] * $rate / 100, 2);
            Db::exec("UPDATE b2b_orders SET payment_status = 'cash_confirmed', cashback_earned = ? WHERE id = ?", [self::money($earned), $orderId]);
            if ($earned > 0) {
                Db::exec('UPDATE business_profiles SET cashback_balance = cashback_balance + ? WHERE id = ?', [self::money($earned), $o['business_id']]);
                $rateStr = Notify::fmtNumber($rate);
                Db::exec(
                    "INSERT INTO b2b_cashback_transactions (id, business_id, order_id, cashback_rate, amount, type, status, payout_details, description, created_at)
                     VALUES (?, ?, ?, ?, ?, 'earned', 'completed', '', ?, ?)",
                    [uuid4(), $o['business_id'], $orderId, self::money($rate), self::money($earned), $o['order_number'] . ' buyurtmasi uchun ' . $rateStr . '% keshbek', db_now()]
                );
                Notify::create($o['buyer_user_id'], 'b2b_cashback', 'Keshbek hisobingizga tushdi!',
                    $o['order_number'] . ' buyurtmasi uchun +' . Notify::fmtNumber($earned) . " so'm keshbek qo'shildi", 'b2b_order', $orderId);
            }
        });
        return null;
    }

    private static function setCashbackRate(array $a, Ctx $c)
    {
        self::requireActive($c);
        if (!$c->isAdmin()) raise_exception("Faqat admin keshbek foizini o'zgartira oladi");
        $rate = self::num(self::arg($a, 'p_rate'));
        if ($rate === null || $rate < 0 || $rate > 100) raise_exception("Foiz 0 dan 100 gacha bo'lishi kerak");
        Db::exec('UPDATE b2b_config SET cashback_rate = ?, updated_at = ? WHERE id = 1', [self::money($rate), db_now()]);
        return null;
    }

    private static function requestCashbackWithdrawal(array $a, Ctx $c)
    {
        self::requireActive($c);
        $businessId = self::uuidArg(self::arg($a, 'p_business_id'));
        if (!B2B::isOwnBusiness($businessId, $c)) raise_exception("Ruxsat yo'q: bu biznes profiliga tegishli emassiz");
        $amount = self::num(self::arg($a, 'p_amount'));
        if ($amount === null || $amount <= 0) raise_exception("Chiqarish summasi 0 dan katta bo'lishi kerak");
        $details = (string)self::arg($a, 'p_payout_details', '');
        return Db::transaction(function () use ($businessId, $amount, $details) {
            $balance = (float)Db::value('SELECT cashback_balance FROM business_profiles WHERE id = ? FOR UPDATE', [$businessId]);
            if ($balance < $amount) raise_exception("Hamyonda yetarli keshbek mablag'i yo'q");
            Db::exec('UPDATE business_profiles SET cashback_balance = cashback_balance - ? WHERE id = ?', [self::money($amount), $businessId]);
            $id = uuid4();
            Db::exec(
                "INSERT INTO b2b_cashback_transactions (id, business_id, order_id, cashback_rate, amount, type, status, payout_details, description, created_at)
                 VALUES (?, ?, NULL, 0, ?, 'withdrawn', 'pending', ?, ?, ?)",
                [$id, $businessId, self::money(-$amount), $details, "Keshbekni yechib olish so'rovi (" . $details . ')', db_now()]
            );
            return $id;
        });
    }

    private static function adminUpdateCashbackWithdrawal(array $a, Ctx $c)
    {
        self::requireActive($c);
        if (!$c->isAdmin()) raise_exception("Faqat admin so'rovni ko'rib chiqadi");
        $status = (string)self::arg($a, 'p_status');
        if (!in_array($status, ['completed', 'rejected'], true)) raise_exception("Noto'g'ri holat");
        $txId = self::uuidArg(self::arg($a, 'p_tx_id'));
        Db::transaction(function () use ($txId, $status) {
            $tx = Db::one("SELECT * FROM b2b_cashback_transactions WHERE id = ? AND type = 'withdrawn' AND status = 'pending' FOR UPDATE", [$txId]);
            if (!$tx) raise_exception("So'rov topilmadi yoki allaqachon ko'rib chiqilgan");
            if ($status === 'rejected') {
                Db::exec('UPDATE business_profiles SET cashback_balance = cashback_balance + ? WHERE id = ?', [self::money(abs((float)$tx['amount'])), $tx['business_id']]);
            }
            Db::exec('UPDATE b2b_cashback_transactions SET status = ? WHERE id = ?', [$status, $txId]);
            $owner = Db::value('SELECT user_id FROM business_profiles WHERE id = ?', [$tx['business_id']]);
            if ($status === 'completed') {
                Notify::create($owner, 'b2b_cashback', "Keshbek to'lovi amalga oshirildi",
                    Notify::fmtNumber(abs((float)$tx['amount'])) . " so'm keshbek kartangizga o'tkazildi", 'b2b_cashback', $txId);
            } else {
                Notify::create($owner, 'b2b_cashback', "Keshbek so'rovi bekor qilindi", "Mablag' hamyoningizga qaytarildi", 'b2b_cashback', $txId);
            }
        });
        return null;
    }

    private static function adminGrantBusinessCashback(array $a, Ctx $c)
    {
        self::requireActive($c);
        if (!$c->isAdmin()) raise_exception('Faqat admin bonus keshbek bera oladi');
        $amount = self::num(self::arg($a, 'p_amount'));
        if ($amount === null || $amount <= 0) raise_exception("Bonus summasi 0 dan katta bo'lishi kerak");
        $businessId = self::uuidArg(self::arg($a, 'p_business_id'));
        $desc = (string)self::arg($a, 'p_description', '');
        return Db::transaction(function () use ($businessId, $amount, $desc) {
            $n = Db::exec('UPDATE business_profiles SET cashback_balance = cashback_balance + ? WHERE id = ?', [self::money($amount), $businessId]);
            if ($n === 0 && !Db::value('SELECT 1 FROM business_profiles WHERE id = ?', [$businessId])) raise_exception('Biznes profili topilmadi');
            $id = uuid4();
            Db::exec(
                "INSERT INTO b2b_cashback_transactions (id, business_id, order_id, cashback_rate, amount, type, status, payout_details, description, created_at)
                 VALUES (?, ?, NULL, 0, ?, 'admin_bonus', 'completed', '', ?, ?)",
                [$id, $businessId, self::money($amount), $desc !== '' ? $desc : 'Admin tomonidan taqdim etilgan maxsus bonus', db_now()]
            );
            $owner = Db::value('SELECT user_id FROM business_profiles WHERE id = ?', [$businessId]);
            Notify::create($owner, 'b2b_cashback', 'Sizga bonus keshbek berildi!',
                '+' . Notify::fmtNumber($amount) . " so'm keshbek hamyoningizga qo'shildi", 'b2b_cashback', $id);
            return $id;
        });
    }

    private static function adminUpdateBusinessStore(array $a, Ctx $c)
    {
        self::requireActive($c);
        if (!$c->isAdmin()) raise_exception('Faqat admin biznes profilini boshqara oladi');
        $id = self::uuidArg(self::arg($a, 'p_business_id'));
        $status = self::arg($a, 'p_status');
        if ($status !== null && !in_array($status, ['active', 'suspended'], true)) raise_exception("Noto'g'ri biznes holati");
        $balance = self::num(self::arg($a, 'p_cashback_balance'));
        if ($balance !== null && $balance < 0) raise_exception("Keshbek balansi manfiy bo'lishi mumkin emas");
        $type = self::arg($a, 'p_business_type');
        if ($type !== null) {
            $allowed = Schema::table('business_profiles')['enum']['business_type'];
            if (!in_array($type, $allowed, true)) P::checkViolation('business_profiles', 'business_profiles_business_type_check');
        }
        Db::transaction(function () use ($a, $id, $status, $balance, $type) {
            $set = [];
            $params = [];
            foreach (['store_name' => 'p_store_name', 'owner_name' => 'p_owner_name', 'phone' => 'p_phone', 'region' => 'p_region',
                         'district' => 'p_district', 'description' => 'p_description'] as $col => $key) {
                $v = self::arg($a, $key);
                if ($v !== null) { $set[] = "`$col` = ?"; $params[] = (string)$v; }
            }
            if ($type !== null) { $set[] = '`business_type` = ?'; $params[] = $type; }
            if ($status !== null) { $set[] = '`status` = ?'; $params[] = $status; }
            if ($balance !== null) { $set[] = '`cashback_balance` = ?'; $params[] = self::money($balance); }
            $set[] = '`updated_at` = ?';
            $params[] = db_now();
            $params[] = $id;
            if (!Db::value('SELECT 1 FROM business_profiles WHERE id = ?', [$id])) raise_exception('Biznes profili topilmadi');
            Db::exec('UPDATE business_profiles SET ' . implode(', ', $set) . ' WHERE id = ?', $params);

            $addrKeys = ['p_store_name', 'p_phone', 'p_region', 'p_district', 'p_address', 'p_latitude', 'p_longitude'];
            $touch = false;
            foreach ($addrKeys as $k) if (self::arg($a, $k) !== null) $touch = true;
            if (!$touch) return;
            $lat = self::num(self::arg($a, 'p_latitude'));
            $lng = self::num(self::arg($a, 'p_longitude'));
            $existing = Db::value('SELECT id FROM business_addresses WHERE business_id = ? AND is_default = 1 LIMIT 1', [$id]);
            if ($existing) {
                $set = [];
                $params = [];
                foreach (['store_name' => 'p_store_name', 'phone' => 'p_phone', 'region' => 'p_region', 'district' => 'p_district', 'address' => 'p_address'] as $col => $key) {
                    $v = self::arg($a, $key);
                    if ($v !== null) { $set[] = "`$col` = ?"; $params[] = (string)$v; }
                }
                if ($lat !== null) { $set[] = '`latitude` = ?'; $params[] = self::money($lat); }
                if ($lng !== null) { $set[] = '`longitude` = ?'; $params[] = self::money($lng); }
                if ($set) {
                    $params[] = $id;
                    Db::exec('UPDATE business_addresses SET ' . implode(', ', $set) . ' WHERE business_id = ? AND is_default = 1', $params);
                }
            } else {
                Db::exec(
                    "INSERT INTO business_addresses (id, business_id, label, store_name, phone, region, district, address, delivery_note, latitude, longitude, is_default, created_at)
                     VALUES (?, ?, 'Asosiy manzil', ?, ?, ?, ?, ?, '', ?, ?, 1, ?)",
                    [uuid4(), $id, (string)self::arg($a, 'p_store_name', ''), (string)self::arg($a, 'p_phone', ''), (string)self::arg($a, 'p_region', ''),
                        (string)self::arg($a, 'p_district', ''), (string)self::arg($a, 'p_address', ''),
                        $lat === null ? null : self::money($lat), $lng === null ? null : self::money($lng), db_now()]
                );
            }
        });
        return null;
    }

    private static function registerBusinessBuyer(array $a, Ctx $c)
    {
        if (!$c->isAuthenticated()) raise_exception('Avval akkauntingizga kiring');
        self::requireActive($c);
        $in = self::arg($a, 'p_input', []);
        if (is_string($in)) $in = json_decode($in, true);
        if (!is_array($in)) $in = [];
        $get = function ($k) use ($in) { return isset($in[$k]) && $in[$k] !== null ? trim((string)$in[$k]) : ''; };
        if ($get('storeName') === '' || $get('phone') === '' || $get('region') === '' || $get('district') === '' || $get('address') === '') {
            raise_exception("Profil nomi, telefon va to'liq manzil majburiy");
        }
        $lat = self::num(isset($in['latitude']) ? $in['latitude'] : null);
        $lng = self::num(isset($in['longitude']) ? $in['longitude'] : null);
        if (!P::validCoords($lat, $lng)) raise_exception("Xarita nuqtasi noto'g'ri");
        $type = isset($in['businessType']) ? (string)$in['businessType'] : 'other';
        if (!in_array($type, Schema::table('business_profiles')['enum']['business_type'], true)) {
            P::checkViolation('business_profiles', 'business_profiles_business_type_check');
        }
        return Db::transaction(function () use ($c, $in, $get, $lat, $lng, $type) {
            $id = uuid4();
            $now = db_now();
            Db::exec(
                "INSERT INTO business_profiles (id, user_id, store_name, owner_name, phone, business_type, region, district, description, logo_url, status, created_at, updated_at, cashback_balance)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0)",
                [$id, $c->uid, $get('storeName'), isset($in['ownerName']) ? (string)$in['ownerName'] : '', (string)$in['phone'], $type,
                    (string)$in['region'], (string)$in['district'], isset($in['description']) ? (string)$in['description'] : '',
                    isset($in['logoUrl']) ? (string)$in['logoUrl'] : '', $now, $now]
            );
            $address = $get('address');
            Db::exec(
                "INSERT INTO business_addresses (id, business_id, label, store_name, phone, region, district, address, delivery_note, latitude, longitude, is_default, created_at)
                 VALUES (?, ?, 'Asosiy manzil', ?, ?, ?, ?, ?, '', ?, ?, 1, ?)",
                [uuid4(), $id, $get('storeName'), (string)$in['phone'], (string)$in['region'], (string)$in['district'], $address,
                    $lat === null ? null : self::money($lat), $lng === null ? null : self::money($lng), $now]
            );
            $profile = self::wire('business_profiles', Db::one('SELECT * FROM business_profiles WHERE id = ?', [$id]));
            $profile['address'] = $address;
            $profile['latitude'] = $lat;
            $profile['longitude'] = $lng;
            return $profile;
        });
    }

    // ------------------------------------------------------------------
    // Agro trade
    // ------------------------------------------------------------------
    private static function createAgroRequest(array $a, Ctx $c)
    {
        self::requireActive($c);
        $in = self::arg($a, 'p_input', []);
        if (is_string($in)) $in = json_decode($in, true);
        if (!is_array($in)) $in = [];
        $g = function ($k) use ($in) { return isset($in[$k]) ? $in[$k] : null; };
        $neededBy = self::dateArg($g('neededBy'));
        if ($neededBy === null) P::checkViolation('agro_purchase_requests', 'agro_purchase_requests_needed_by_not_null');
        if ($neededBy < tashkent_today()) raise_exception("So'rov sanasi o'tgan");
        $name = Db::value('SELECT name FROM profiles WHERE id = ?', [$c->uid]);
        if ($name === null) raise_exception('query returned no rows');
        $title = trim((string)$g('title'));
        $category = (string)$g('category');
        $variety = $g('variety') === null ? '' : (string)$g('variety');
        $qty = self::num($g('quantity'));
        $unit = (string)$g('unit');
        $target = self::num($g('targetPrice'));
        $location = trim((string)$g('location'));
        $lat = self::num($g('latitude'));
        $lng = self::num($g('longitude'));
        $dm = (string)$g('deliveryMethod');
        $desc = $g('description') === null ? '' : (string)$g('description');
        $len = function ($s) { return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s); };
        $t = 'agro_purchase_requests';
        if ($len($title) < 1 || $len($title) > 160) P::checkViolation($t, 'agro_purchase_requests_title_check');
        if ($len(trim($category)) < 1 || $len(trim($category)) > 160) P::checkViolation($t, 'agro_purchase_requests_category_check');
        if ($len($variety) > 160) P::checkViolation($t, 'agro_purchase_requests_variety_check');
        if ($qty === null || $qty <= 0 || $qty > 1e12) P::checkViolation($t, 'agro_purchase_requests_quantity_check');
        if ($len(trim($unit)) < 1 || $len(trim($unit)) > 30) P::checkViolation($t, 'agro_purchase_requests_unit_check');
        if ($target !== null && ($target <= 0 || $target > 1e12)) P::checkViolation($t, 'agro_purchase_requests_target_price_check');
        if ($len($location) < 1 || $len($location) > 500) P::checkViolation($t, 'agro_purchase_requests_location_check');
        if ($lat === null || $lat < -90 || $lat > 90) P::checkViolation($t, 'agro_purchase_requests_latitude_check');
        if ($lng === null || $lng < -180 || $lng > 180) P::checkViolation($t, 'agro_purchase_requests_longitude_check');
        if (!in_array($dm, ['pickup', 'delivery', 'either'], true)) P::checkViolation($t, 'agro_purchase_requests_delivery_method_check');
        if ($len($desc) > 4000) P::checkViolation($t, 'agro_purchase_requests_description_check');
        $id = uuid4();
        Db::exec(
            "INSERT INTO agro_purchase_requests (id, user_id, buyer_name, title, category, variety, quantity, reserved_quantity, unit, target_price,
                needed_by, location, latitude, longitude, delivery_method, description, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)",
            [$id, $c->uid, $name, $title, $category, $variety, self::money($qty), $unit, $target === null ? null : self::money($target),
                $neededBy, $location, $lat, $lng, $dm, $desc, db_now()]
        );
        return self::wire('agro_purchase_requests', Db::one('SELECT * FROM agro_purchase_requests WHERE id = ?', [$id]));
    }

    private static function closeAgroRequest(array $a, Ctx $c)
    {
        self::requireActive($c);
        $id = self::uuidArg(self::arg($a, 'p_id'));
        $exists = Db::value('SELECT 1 FROM agro_purchase_requests WHERE id = ? AND user_id = ?', [$id, $c->uid]);
        if (!$exists) raise_exception("Ruxsat yo'q yoki so'rov topilmadi");
        Db::exec("UPDATE agro_purchase_requests SET status = 'closed' WHERE id = ? AND user_id = ?", [$id, $c->uid]);
        return null;
    }

    /** check_agro_offer_target (locks the request/product row). */
    private static function checkOfferTarget(array $o)
    {
        $today = tashkent_today();
        if ($o['quantity'] === null || $o['quantity'] <= 0 || $o['unit_price'] === null || $o['unit_price'] <= 0
            || $o['delivery_date'] === null || $o['delivery_date'] < $today || !in_array($o['delivery_method'], ['pickup', 'delivery'], true)) {
            raise_exception("Miqdor, narx, sana va yetkazish usulini tekshiring");
        }
        if ($o['quantity'] > 1e12 || $o['unit_price'] > 1e12) P::checkViolation('agro_trade_offers', 'agro_trade_offers_quantity_check');
        $ok = Db::value("SELECT 1 FROM supplier_profiles s WHERE s.user_id = ? AND s.verification_status = 'approved'
                         AND EXISTS (SELECT 1 FROM contracts c WHERE c.supplier_id = s.id AND c.status = 'accepted')", [$o['seller_user_id']]);
        if (!$ok) raise_exception("Sotuvchi tasdiqlangan va shartnomani qabul qilgan bo'lishi kerak");
        if ($o['request_id'] !== null) {
            $r = Db::one('SELECT * FROM agro_purchase_requests WHERE id = ? FOR UPDATE', [$o['request_id']]);
            if (!$r) raise_exception('query returned no rows');
            if ($r['status'] !== 'open' || $r['needed_by'] < $today) raise_exception("So'rov yopilgan yoki muddati tugagan");
            if ($o['quantity'] > (float)$r['quantity'] - (float)$r['reserved_quantity']) raise_exception("So'rovdagi qolgan miqdor yetarli emas");
            if ($o['delivery_date'] > $r['needed_by'] || ($r['delivery_method'] !== 'either' && $o['delivery_method'] !== $r['delivery_method'])) {
                raise_exception("Sana yoki yetkazish usuli so'rovga mos emas");
            }
        } else {
            $p = Db::one('SELECT * FROM b2b_products WHERE id = ? FOR UPDATE', [$o['product_id']]);
            if (!$p) raise_exception('query returned no rows');
            if ($p['status'] !== 'approved') raise_exception('Mahsulot sotuvda emas');
            if ($p['unit'] !== $o['unit']) raise_exception("Mahsulot birligi o'zgargan");
            if ($o['quantity'] != floor($o['quantity']) || $o['quantity'] < (int)$p['moq'] || $o['quantity'] > (int)$p['available_qty']) {
                raise_exception("Miqdor butun son, MOQ va zaxiraga mos bo'lishi kerak");
            }
            if ($p['availability'] === 'upcoming' && $p['available_from'] !== null && $o['delivery_date'] < $p['available_from']) {
                raise_exception("Hosil hali tayyor bo'lmaydi");
            }
            if ($o['delivery_method'] === 'delivery' && !(int)$p['delivery_available']) raise_exception('Yetkazib berish mavjud emas');
        }
    }

    private static function sendAgroOffer(array $a, Ctx $c)
    {
        self::requireActive($c);
        $in = self::arg($a, 'p_input', []);
        if (is_string($in)) $in = json_decode($in, true);
        if (!is_array($in)) $in = [];
        $g = function ($k) use ($in) { return isset($in[$k]) ? $in[$k] : null; };
        $o = [
            'request_id' => self::uuidArg($g('requestId')),
            'product_id' => self::uuidArg($g('productId')),
        ];
        if (($o['request_id'] === null) === ($o['product_id'] === null)) raise_exception("Bitta e'lonni tanlang");
        return Db::transaction(function () use ($c, $g, $o) {
            if ($o['request_id'] !== null) {
                $r = Db::one('SELECT * FROM agro_purchase_requests WHERE id = ?', [$o['request_id']]);
                if (!$r) raise_exception('query returned no rows');
                $o['buyer_user_id'] = $r['user_id'];
                $o['buyer_name'] = $r['buyer_name'];
                $o['seller_user_id'] = $c->uid;
                $o['product_name'] = $r['title'];
                $o['unit'] = $r['unit'];
            } else {
                $p = Db::one('SELECT * FROM b2b_products WHERE id = ?', [$o['product_id']]);
                if (!$p) raise_exception('query returned no rows');
                $o['buyer_user_id'] = $c->uid;
                $o['seller_user_id'] = Db::value('SELECT user_id FROM supplier_profiles WHERE id = ?', [$p['supplier_id']]);
                $o['buyer_name'] = Db::value('SELECT name FROM profiles WHERE id = ?', [$c->uid]);
                if ($o['seller_user_id'] === null || $o['buyer_name'] === null) raise_exception('query returned no rows');
                $o['product_name'] = $p['name'];
                $o['unit'] = $p['unit'];
            }
            if ($o['buyer_user_id'] === $o['seller_user_id']) raise_exception("O'z e'loningizga taklif yubora olmaysiz");
            $o['seller_name'] = Db::value('SELECT company_name FROM supplier_profiles WHERE user_id = ?', [$o['seller_user_id']]);
            if ($o['seller_name'] === null) raise_exception('query returned no rows');
            $o['proposed_by'] = $c->uid;
            $o['quantity'] = self::num($g('quantity'));
            $o['unit_price'] = self::num($g('unitPrice'));
            $o['delivery_date'] = self::dateArg($g('deliveryDate'));
            $o['delivery_method'] = (string)$g('deliveryMethod');
            $o['message'] = $g('message') === null ? '' : (string)$g('message');
            if ((function_exists('mb_strlen') ? mb_strlen($o['message'], 'UTF-8') : strlen($o['message'])) > 2000) {
                P::checkViolation('agro_trade_offers', 'agro_trade_offers_message_check');
            }
            self::checkOfferTarget($o);
            $id = uuid4();
            $now = db_now();
            Db::exec(
                "INSERT INTO agro_trade_offers (id, request_id, product_id, product_name, unit, buyer_user_id, seller_user_id, buyer_name, seller_name,
                    proposed_by, quantity, unit_price, delivery_date, delivery_method, message, status, version, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed', 1, ?, ?)",
                [$id, $o['request_id'], $o['product_id'], $o['product_name'], $o['unit'], $o['buyer_user_id'], $o['seller_user_id'],
                    $o['buyer_name'], $o['seller_name'], $o['proposed_by'], self::money($o['quantity']), self::money($o['unit_price']),
                    $o['delivery_date'], $o['delivery_method'], $o['message'], $now, $now]
            );
            return self::wire('agro_trade_offers', Db::one('SELECT * FROM agro_trade_offers WHERE id = ?', [$id]));
        });
    }

    private static function respondAgroOffer(array $a, Ctx $c)
    {
        self::requireActive($c);
        $id = self::uuidArg(self::arg($a, 'p_id'));
        $action = (string)self::arg($a, 'p_action');
        $version = self::arg($a, 'p_version');
        $terms = self::arg($a, 'p_terms');
        if (is_string($terms)) $terms = json_decode($terms, true);
        return Db::transaction(function () use ($c, $id, $action, $version, $terms) {
            $row = Db::one('SELECT * FROM agro_trade_offers WHERE id = ? FOR UPDATE', [$id]);
            if (!$row) raise_exception('query returned no rows');
            if (!$c->uid || !in_array($c->uid, [$row['buyer_user_id'], $row['seller_user_id']], true)) raise_exception("Ruxsat yo'q");
            if ($version === null || (int)$row['version'] !== (int)$version) raise_exception("Taklif o'zgargan. Sahifani yangilang");
            $o = $row;
            $o['quantity'] = (float)$row['quantity'];
            $o['unit_price'] = (float)$row['unit_price'];
            $delta = 0.0;
            if ($action === 'cancel' && in_array($o['status'], ['proposed', 'accepted', 'ready'], true)) {
                if (in_array($o['status'], ['accepted', 'ready'], true)) $delta = -$o['quantity'];
                $o['status'] = 'cancelled';
            } elseif ($o['status'] === 'proposed' && $c->uid !== $o['proposed_by'] && in_array($action, ['accept', 'decline', 'counter'], true)) {
                if ($action === 'decline') {
                    $o['status'] = 'declined';
                } else {
                    if ($action === 'counter') {
                        $t = is_array($terms) ? $terms : [];
                        $o['quantity'] = self::num(isset($t['quantity']) ? $t['quantity'] : null);
                        $o['unit_price'] = self::num(isset($t['unitPrice']) ? $t['unitPrice'] : null);
                        $o['delivery_date'] = self::dateArg(isset($t['deliveryDate']) ? $t['deliveryDate'] : null);
                        $o['delivery_method'] = isset($t['deliveryMethod']) ? (string)$t['deliveryMethod'] : null;
                        $o['message'] = isset($t['message']) ? (string)$t['message'] : '';
                        $o['proposed_by'] = $c->uid;
                    }
                    self::checkOfferTarget($o);
                    if ($action === 'accept') { $o['status'] = 'accepted'; $delta = $o['quantity']; }
                }
            } elseif ($action === 'ready' && $o['status'] === 'accepted' && $c->uid === $o['seller_user_id']) {
                $o['status'] = 'ready';
            } elseif ($action === 'deliver' && $o['status'] === 'ready' && $o['delivery_method'] === 'delivery' && $c->uid === $o['seller_user_id']) {
                $o['status'] = 'delivering';
            } elseif ($action === 'complete' && $c->uid === $o['buyer_user_id']
                && ($o['status'] === 'delivering' || ($o['status'] === 'ready' && $o['delivery_method'] === 'pickup'))) {
                $o['status'] = 'completed';
            } else {
                raise_exception("Bu holatda ushbu amalni bajarib bo'lmaydi");
            }
            if ($delta != 0) {
                if ($o['request_id'] !== null) {
                    Db::exec('UPDATE agro_purchase_requests SET reserved_quantity = reserved_quantity + ? WHERE id = ?', [self::money($delta), $o['request_id']]);
                    $chk = Db::one('SELECT quantity, reserved_quantity FROM agro_purchase_requests WHERE id = ?', [$o['request_id']]);
                    if ((float)$chk['reserved_quantity'] < 0 || (float)$chk['reserved_quantity'] > (float)$chk['quantity']) {
                        P::checkViolation('agro_purchase_requests', 'agro_purchase_requests_check');
                    }
                } else {
                    Db::exec('UPDATE b2b_products SET available_qty = available_qty - ? WHERE id = ?', [(int)round($delta), $o['product_id']]);
                    if ((int)Db::value('SELECT available_qty FROM b2b_products WHERE id = ?', [$o['product_id']]) < 0) {
                        P::checkViolation('b2b_products', 'b2b_products_available_qty_check');
                    }
                }
            }
            Db::exec(
                'UPDATE agro_trade_offers SET quantity = ?, unit_price = ?, delivery_date = ?, delivery_method = ?, message = ?, proposed_by = ?,
                    status = ?, version = version + 1, updated_at = ? WHERE id = ?',
                [self::money($o['quantity']), self::money($o['unit_price']), $o['delivery_date'], $o['delivery_method'], (string)$o['message'],
                    $o['proposed_by'], $o['status'], db_now(), $id]
            );
            return self::wire('agro_trade_offers', Db::one('SELECT * FROM agro_trade_offers WHERE id = ?', [$id]));
        });
    }

    private static function isAdmin(array $a, Ctx $c)
    {
        return $c->isAdmin();
    }

    private static function isActiveAccount(array $a, Ctx $c)
    {
        return $c->isAuthenticated() && $c->isActive();
    }
}
