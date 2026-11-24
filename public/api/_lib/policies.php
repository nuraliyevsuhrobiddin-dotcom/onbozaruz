<?php
/**
 * Port of the Supabase security layer:
 *   - table grants (incl. REVOKEs) and column grants
 *   - RLS policies  (select / insert = WITH CHECK / update = USING / delete)
 *   - RESTRICTIVE "active_account_required"
 *   - BEFORE/AFTER triggers (moderation, counters, notifications, B2B rules)
 *
 * Policy closures return true, false, or [sql, params] over alias `t`.
 * Trigger closures receive DB-typed rows (as stored in MySQL).
 */
defined('MB_API') or exit;

class P
{
    public static function any()
    {
        $sqls = [];
        $params = [];
        foreach (func_get_args() as $part) {
            if ($part === true) return true;
            if ($part === false || $part === null) continue;
            $sqls[] = '(' . $part[0] . ')';
            $params = array_merge($params, $part[1]);
        }
        return $sqls ? [implode(' OR ', $sqls), $params] : false;
    }

    public static function uidIs($col, Ctx $c)
    {
        return $c->uid ? ['t.' . Schema::q($col) . ' = ?', [$c->uid]] : false;
    }

    public static function ownSupplier($col, Ctx $c)
    {
        return $c->uid ? ['t.' . Schema::q($col) . ' IN (SELECT sp.id FROM supplier_profiles sp WHERE sp.user_id = ?)', [$c->uid]] : false;
    }

    public static function ownBusiness($col, Ctx $c)
    {
        return $c->uid ? ['t.' . Schema::q($col) . ' IN (SELECT bp.id FROM business_profiles bp WHERE bp.user_id = ?)', [$c->uid]] : false;
    }

    public static function admin(Ctx $c)
    {
        return $c->isAdmin();
    }

    public static function changed($table, array $new, array $old, $col)
    {
        return !Schema::same($table, $col, isset($old[$col]) ? $old[$col] : null, isset($new[$col]) ? $new[$col] : null);
    }

    public static function checkViolation($table, $name)
    {
        throw new ApiError(400, '23514', "new row for relation \"$table\" violates check constraint \"$name\"");
    }

    public static function validCoords($lat, $lng)
    {
        if ($lat === null && $lng === null) return true;
        if ($lat === null || $lng === null) return false;
        return (float)$lat >= -90 && (float)$lat <= 90 && (float)$lng >= -180 && (float)$lng <= 180;
    }
}

class Notify
{
    /** INSERT INTO notifications … (always via the trusted server, like SECURITY DEFINER). */
    public static function create($userId, $type, $title, $body = '', $targetType = '', $targetId = '', $actorId = null, $actorName = '', $actorAvatar = '')
    {
        if (!$userId) return null;
        $id = uuid4();
        Db::exec(
            'INSERT INTO notifications (id, user_id, type, title, body, target_type, target_id, actor_id, actor_name, actor_avatar, is_read, created_at, message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
            [$id, $userId, $type, $title, (string)$body, (string)$targetType, (string)$targetId, $actorId, (string)$actorName, (string)$actorAvatar, db_now(), '']
        );
        Push::queue($id);
        return $id;
    }

    public static function fmtNumber($n)
    {
        $s = Schema::numberOut($n);
        return is_float($s) ? rtrim(rtrim(sprintf('%.2F', $s), '0'), '.') : (string)$s;
    }
}

class B2B
{
    public static function notifyNewOrder(array $order)
    {
        $supplierUser = Db::value('SELECT user_id FROM supplier_profiles WHERE id = ?', [$order['supplier_id']]);
        if ($supplierUser) {
            Notify::create($supplierUser, 'b2b_new_order', 'Yangi ulgurji buyurtma', $order['order_number'], 'b2b_order', $order['id']);
        }
        foreach (Db::all('SELECT id FROM profiles WHERE is_admin = 1') as $admin) {
            if ($admin['id'] !== $supplierUser) {
                Notify::create($admin['id'], 'b2b_new_order', 'Yangi B2B buyurtma: #' . $order['order_number'],
                    'Buyurtma summasi: ' . Notify::fmtNumber($order['total']) . " so'm", 'b2b_order', $order['id']);
            }
        }
    }

    /** handle_b2b_order_status_change + notify_on_b2b_order_status_change */
    public static function afterOrderUpdate(array $new, array $old)
    {
        $terminal = ['delivered', 'rejected', 'cancelled'];
        if ($old['status'] !== $new['status'] && !in_array($old['status'], $terminal, true)) {
            if (in_array($new['status'], ['rejected', 'cancelled'], true)) {
                Db::exec('UPDATE b2b_products p JOIN b2b_order_items oi ON oi.product_id = p.id
                          SET p.available_qty = p.available_qty + oi.quantity, p.updated_at = ?
                          WHERE oi.order_id = ?', [db_now(), $new['id']]);
                Db::exec("UPDATE commission_ledger SET status = 'voided', updated_at = ? WHERE order_id = ?", [db_now(), $new['id']]);
            }
            if ($new['status'] === 'delivered') {
                Db::exec("UPDATE commission_ledger SET status = 'settled', updated_at = ? WHERE order_id = ?", [db_now(), $new['id']]);
            }
        }
        if ($old['status'] !== $new['status']) {
            Notify::create($new['buyer_user_id'], 'b2b_order_status', 'Buyurtma holati yangilandi',
                $new['order_number'] . ' — ' . $new['status'], 'b2b_order', $new['id']);
        }
    }

    public static function supplierUserId($supplierId)
    {
        return Db::value('SELECT user_id FROM supplier_profiles WHERE id = ?', [$supplierId]);
    }

    public static function isOwnSupplier($supplierId, Ctx $c)
    {
        return $c->uid && (bool)Db::value('SELECT 1 FROM supplier_profiles WHERE id = ? AND user_id = ?', [$supplierId, $c->uid]);
    }

    public static function isOwnBusiness($businessId, Ctx $c)
    {
        return $c->uid && (bool)Db::value('SELECT 1 FROM business_profiles WHERE id = ? AND user_id = ?', [$businessId, $c->uid]);
    }

    public static function isVerifiedSupplier($supplierId)
    {
        return (bool)Db::value("SELECT 1 FROM supplier_profiles WHERE id = ? AND verification_status = 'approved'", [$supplierId]);
    }

    /** validate_agro_product_link + b2b_products_agro_check */
    public static function checkAgroProduct(array $row, $old = null)
    {
        if (!in_array($row['availability'], ['available', 'upcoming'], true)
            || ($row['availability'] === 'upcoming' && empty($row['available_from']))
            || !P::validCoords($row['latitude'], $row['longitude'])) {
            P::checkViolation('b2b_products', 'b2b_products_agro_check');
        }
        if ((float)$row['wholesale_price'] < 0) P::checkViolation('b2b_products', 'b2b_products_wholesale_price_check');
        if ((int)$row['moq'] < 1) P::checkViolation('b2b_products', 'b2b_products_moq_check');
        if ((int)$row['available_qty'] < 0) P::checkViolation('b2b_products', 'b2b_products_available_qty_check');
        $link = $row['linked_post_id'];
        if ($link !== null && ($old === null || $link !== $old['linked_post_id'])) {
            $ok = Db::value("SELECT 1 FROM posts p JOIN supplier_profiles s ON s.user_id = p.user_id
                             WHERE p.id = ? AND s.id = ? AND p.status = 'approved'", [$link, $row['supplier_id']]);
            if (!$ok) raise_exception("Faqat o'zingizning tasdiqlangan e'loningizni bog'lang");
        }
    }
}

class Policies
{
    private static $defs = null;

    public static function get($table)
    {
        if (self::$defs === null) self::$defs = self::define();
        return isset(self::$defs[$table]) ? self::$defs[$table] : ['grants' => ['anon' => '', 'authenticated' => '']];
    }

    private static function define()
    {
        $postContentFields = ['title', 'description', 'category', 'category_name', 'media_url', 'poster_url', 'type', 'price',
            'numeric_price', 'min_order', 'location', 'latitude', 'longitude', 'phone', 'telegram', 'condition'];

        return [
            // ---------------------------------------------------------- profiles
            'profiles' => [
                'grants' => ['anon' => 'riu', 'authenticated' => 'riu'], // DELETE revoked: deletion goes through /api/account/delete
                'require_active' => ['insert', 'update', 'delete'],
                'select' => function (Ctx $c) { return P::any(P::uidIs('id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return $c->uid ? ["t.`id` = ? AND t.`is_admin` = 0 AND t.`status` = 'active'", [$c->uid]] : false; },
                'update' => function (Ctx $c) { return P::any(P::uidIs('id', $c), P::admin($c)); },
                'before_insert' => function (array &$row, Ctx $c) {
                    if ($c->service) return;
                    $row['is_admin'] = 0;
                    $row['status'] = 'active';
                    $email = Db::value('SELECT email FROM auth_users WHERE id = ?', [isset($row['id']) ? $row['id'] : '']);
                    $row['email'] = $email ? $email : ($row['id'] . '@user.mollbazar.uz');
                },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if ($c->service) return;
                    $new['email'] = $old['email'];
                    if ((int)$new['is_admin'] !== (int)$old['is_admin'] || $new['status'] !== $old['status']) {
                        if (!$c->isAdmin()) {
                            $new['is_admin'] = $old['is_admin'];
                            $new['status'] = $old['status'];
                        }
                    }
                    $new['id'] = $old['id'];
                },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    foreach (['name', 'avatar_url', 'location', 'phone'] as $f) {
                        if (P::changed('profiles', $new, $old, $f)) {
                            Db::exec('UPDATE posts SET seller_name = ?, seller_avatar = ?, phone = ?, updated_at = ? WHERE user_id = ?',
                                [$new['name'], (string)$new['avatar_url'], (string)$new['phone'], db_now(), $new['id']]);
                            return;
                        }
                    }
                },
            ],

            // ---------------------------------------------------------- posts
            'posts' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'], // anon reads posts_public
                'select' => function (Ctx $c) { return P::any(["t.`status` = 'approved'", []], P::uidIs('user_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'update' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'before_insert' => function (array &$row, Ctx $c) {
                    if (!P::validCoords(isset($row['latitude']) ? $row['latitude'] : null, isset($row['longitude']) ? $row['longitude'] : null)) {
                        P::checkViolation('posts', 'posts_coordinates_check');
                    }
                    $row['sold_at'] = !empty($row['is_sold']) ? db_now() : null;
                    if (!$c->isAdmin()) {
                        $row['status'] = 'pending';
                        $row['rejection_reason'] = null;
                    }
                },
                'before_update' => function (array &$new, array $old, Ctx $c) use ($postContentFields) {
                    if (!P::validCoords($new['latitude'], $new['longitude'])) P::checkViolation('posts', 'posts_coordinates_check');
                    // The server owns the sale timestamp; marking sold is not a content edit.
                    if (P::changed('posts', $new, $old, 'is_sold')) {
                        $new['sold_at'] = (int)$new['is_sold'] === 1 ? db_now() : null;
                    } else {
                        $new['sold_at'] = $old['sold_at'];
                    }
                    if ($c->isAdmin()) return;
                    $new['status'] = $old['status'];
                    $new['rejection_reason'] = $old['rejection_reason'];
                    if ($old['status'] !== 'blocked') {
                        foreach ($postContentFields as $f) {
                            if (P::changed('posts', $new, $old, $f)) {
                                $new['status'] = 'pending';
                                $new['rejection_reason'] = null;
                                break;
                            }
                        }
                    }
                },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    if ($new['user_id'] && $old['status'] !== $new['status'] && in_array($new['status'], ['approved', 'rejected'], true)) {
                        $approved = $new['status'] === 'approved';
                        Notify::create($new['user_id'], $approved ? 'post_approved' : 'post_rejected',
                            $approved ? "E'loningiz tasdiqlandi" : "E'loningiz rad etildi",
                            $approved ? $new['title'] : ((string)$new['rejection_reason'] !== '' ? $new['rejection_reason'] : $new['title']),
                            'post', $new['id']);
                    }
                },
            ],

            // ---------------------------------------------------------- products (legacy market)
            'products' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'],
                'select' => function (Ctx $c) {
                    return P::any(["t.`approval_status` = 'approved'", []], P::uidIs('submitted_by', $c), P::uidIs('seller_id', $c), P::admin($c));
                },
                'insert' => function (Ctx $c) {
                    if (!$c->uid) return false;
                    return P::any(P::admin($c), P::uidIs('submitted_by', $c), P::uidIs('seller_id', $c));
                },
                'update' => function (Ctx $c) { return P::any(P::uidIs('seller_id', $c), P::uidIs('submitted_by', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::any(P::uidIs('seller_id', $c), P::uidIs('submitted_by', $c), P::admin($c)); },
                'before_insert' => function (array &$row, Ctx $c) {
                    if ($c->isAdmin()) return;
                    $row['approval_status'] = 'pending';
                    if (!isset($row['source']) || $row['source'] === null || $row['source'] === 'admin') $row['source'] = 'user';
                },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if ($c->isAdmin()) return;
                    $new['approval_status'] = $old['approval_status'];
                    if ($new['source'] === null || $new['source'] === 'admin') $new['source'] = 'user';
                },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    if ($new['seller_id'] && $old['approval_status'] !== $new['approval_status'] && in_array($new['approval_status'], ['approved', 'rejected'], true)) {
                        $approved = $new['approval_status'] === 'approved';
                        Notify::create($new['seller_id'], $approved ? 'product_approved' : 'product_rejected',
                            $approved ? 'Mahsulotingiz tasdiqlandi' : 'Mahsulotingiz rad etildi', $new['title'], 'product', $new['id']);
                    }
                },
            ],

            // ---------------------------------------------------------- orders (legacy market)
            'orders' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'],
                'select' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'update' => function (Ctx $c) { return P::admin($c); },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    if ($new['user_id'] && $old['status'] !== $new['status']) {
                        Notify::create($new['user_id'], 'order_status', 'Buyurtma holati yangilandi',
                            $new['status'] . ' — ' . $new['product_name'], 'order', $new['id']);
                    }
                },
            ],

            // ---------------------------------------------------------- comments
            'comments' => [
                'select' => function (Ctx $c) { return true; },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'after_insert' => function (array $row, Ctx $c) {
                    Db::exec('UPDATE posts SET comments_count = comments_count + 1, updated_at = ? WHERE id = ?', [db_now(), $row['post_id']]);
                    $owner = Db::value('SELECT user_id FROM posts WHERE id = ?', [$row['post_id']]);
                    if ($owner && $owner !== $row['user_id']) {
                        Notify::create($owner, 'comment', 'Yangi izoh', $row['content'], 'post', $row['post_id'], $row['user_id'], $row['user_name'], (string)$row['user_avatar']);
                    }
                },
            ],

            // ---------------------------------------------------------- saved / liked
            'saved_posts' => [
                'select' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'delete' => function (Ctx $c) { return P::uidIs('user_id', $c); },
            ],
            'liked_posts' => [
                'select' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'delete' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'after_insert' => function (array $row, Ctx $c) {
                    Db::exec('UPDATE posts SET likes_count = likes_count + 1, updated_at = ? WHERE id = ?', [db_now(), $row['post_id']]);
                    $post = Db::one('SELECT user_id, title FROM posts WHERE id = ?', [$row['post_id']]);
                    if ($post && $post['user_id'] && $post['user_id'] !== $row['user_id']) {
                        $liker = Db::one('SELECT name, avatar_url FROM profiles WHERE id = ?', [$row['user_id']]);
                        Notify::create($post['user_id'], 'like', 'Yangi layk', (string)$post['title'], 'post', $row['post_id'], $row['user_id'],
                            $liker ? (string)$liker['name'] : '', $liker ? (string)$liker['avatar_url'] : '');
                    }
                },
                'after_delete' => function (array $old, Ctx $c) {
                    Db::exec('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1), updated_at = ? WHERE id = ?', [db_now(), $old['post_id']]);
                },
            ],

            // ---------------------------------------------------------- seller follows
            // A user sees and changes only their own follows, and cannot follow themselves.
            'seller_follows' => [
                'grants' => ['anon' => '', 'authenticated' => 'rid'],
                'select' => function (Ctx $c) { return P::uidIs('follower_id', $c); },
                'insert' => function (Ctx $c) { return $c->uid ? ['t.`follower_id` = ? AND t.`seller_id` <> ?', [$c->uid, $c->uid]] : false; },
                'delete' => function (Ctx $c) { return P::uidIs('follower_id', $c); },
            ],

            // ---------------------------------------------------------- categories
            'categories' => [
                'select' => function (Ctx $c) { return true; },
                'insert' => function (Ctx $c) { return P::admin($c); },
                'update' => function (Ctx $c) { return P::admin($c); },
                'delete' => function (Ctx $c) { return P::admin($c); },
            ],

            // ---------------------------------------------------------- reports / audit
            'reports' => [
                'select' => function (Ctx $c) { return P::admin($c); },
                'insert' => function (Ctx $c) { return P::uidIs('reporter_id', $c); },
                'update' => function (Ctx $c) { return P::admin($c); },
            ],
            'audit_logs' => [
                'select' => function (Ctx $c) { return P::admin($c); },
                'insert' => function (Ctx $c) { return P::admin($c); },
            ],

            // ---------------------------------------------------------- notifications
            'notifications' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'],
                'select' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'insert' => function (Ctx $c) { return P::admin($c); },
                'update' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'delete' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'after_insert' => function (array $row, Ctx $c) { Push::queue($row['id']); },
            ],

            // ---------------------------------------------------------- product reviews
            'product_reviews' => [
                'select' => function (Ctx $c) { return true; },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'update' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'delete' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'before_insert' => function (array &$row, Ctx $c) {
                    if (!isset($row['rating']) || (int)$row['rating'] < 1 || (int)$row['rating'] > 5) P::checkViolation('product_reviews', 'product_reviews_rating_check');
                },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if ((int)$new['rating'] < 1 || (int)$new['rating'] > 5) P::checkViolation('product_reviews', 'product_reviews_rating_check');
                },
                'after_insert' => function (array $row, Ctx $c) { Policies::syncProductRating($row['product_id']); },
                'after_update' => function (array $new, array $old, Ctx $c) { Policies::syncProductRating($new['product_id']); },
                'after_delete' => function (array $old, Ctx $c) { Policies::syncProductRating($old['product_id']); },
            ],

            // ---------------------------------------------------------- B2B: buyers
            'business_profiles' => [
                'grants' => ['anon' => 'r', 'authenticated' => 'riud'],
                'insert_cols' => ['user_id', 'store_name', 'owner_name', 'phone', 'business_type', 'region', 'district', 'description', 'logo_url'],
                'update_cols' => ['store_name', 'owner_name', 'phone', 'business_type', 'region', 'district', 'description', 'logo_url'],
                'select' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'update' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::admin($c); },
            ],
            'business_addresses' => [
                'grants' => ['anon' => 'r', 'authenticated' => 'riu'],
                'select' => function (Ctx $c) { return P::any(P::ownBusiness('business_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::ownBusiness('business_id', $c); },
                'update' => function (Ctx $c) { return P::any(P::ownBusiness('business_id', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::any(P::ownBusiness('business_id', $c), P::admin($c)); },
            ],

            // ---------------------------------------------------------- B2B: suppliers
            'supplier_profiles' => [
                'grants' => ['anon' => 'r', 'authenticated' => 'riu'],
                'select' => function (Ctx $c) { return P::any(["t.`verification_status` = 'approved'", []], P::uidIs('user_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::uidIs('user_id', $c); },
                'update' => function (Ctx $c) { return P::any(P::uidIs('user_id', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::admin($c); },
                'before_insert' => function (array &$row, Ctx $c) {
                    if ($c->isAdmin()) return;
                    $row['verification_status'] = 'pending';
                    $row['commission_rate'] = '5.00';
                    $row['rejection_reason'] = '';
                },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if ($c->isAdmin()) return;
                    foreach (['verification_status', 'commission_rate', 'rejection_reason', 'user_id'] as $f) $new[$f] = $old[$f];
                },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    if ($old['verification_status'] === $new['verification_status']) return;
                    $reason = (string)$new['rejection_reason'] !== '' ? $new['rejection_reason'] : $new['company_name'];
                    if ($new['verification_status'] === 'approved') {
                        Notify::create($new['user_id'], 'supplier_approved', 'Tabriklaymiz! Supplier sifatida tasdiqlandingiz', $new['company_name'], 'supplier_profile', $new['id']);
                        $pending = Db::value("SELECT 1 FROM contracts WHERE supplier_id = ? AND status = 'pending'", [$new['id']]);
                        if (!$pending) {
                            Db::exec("INSERT INTO contracts (id, supplier_id, contract_version, commission_rate, status, termination_reason, signature_ref, created_at, updated_at)
                                      VALUES (?, ?, 'v1', ?, 'pending', '', '', ?, ?)", [uuid4(), $new['id'], $new['commission_rate'], db_now(), db_now()]);
                        }
                    } elseif ($new['verification_status'] === 'rejected') {
                        Notify::create($new['user_id'], 'supplier_rejected', 'Ariza rad etildi', $reason, 'supplier_profile', $new['id']);
                    } elseif ($new['verification_status'] === 'suspended') {
                        Notify::create($new['user_id'], 'supplier_suspended', "Akkauntingiz vaqtincha to'xtatildi", $reason, 'supplier_profile', $new['id']);
                    }
                },
            ],
            'contracts' => [
                'grants' => ['anon' => '', 'authenticated' => 'ru'],
                'select' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'update' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if ($c->isAdmin()) return;
                    $new['supplier_id'] = $old['supplier_id'];
                    $new['commission_rate'] = $old['commission_rate'];
                    $new['contract_version'] = $old['contract_version'];
                    if ($old['status'] !== 'pending') raise_exception("Shartnoma holatini faqat admin o'zgartira oladi");
                    if (!in_array($new['status'], ['accepted', 'rejected'], true)) raise_exception("Ruxsatsiz holat o'zgarishi");
                    if ($new['status'] === 'accepted') $new['accepted_at'] = db_now();
                },
            ],
            'b2b_products' => [
                'select' => function (Ctx $c) { return P::any(["t.`status` = 'approved'", []], P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'update' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'before_insert' => function (array &$row, Ctx $c) {
                    if (!$c->isAdmin()) {
                        if (!B2B::isOwnSupplier($row['supplier_id'], $c)) raise_exception("Ruxsat yo'q");
                        if (!B2B::isVerifiedSupplier($row['supplier_id'])) raise_exception("Faqat tasdiqlangan supplierlar mahsulot qo'sha oladi");
                        $accepted = Db::value("SELECT 1 FROM contracts WHERE supplier_id = ? AND status = 'accepted'", [$row['supplier_id']]);
                        if (!$accepted) raise_exception('Avval hamkorlik shartnomasini qabul qiling');
                        $row['status'] = 'pending';
                        $row['rejection_reason'] = '';
                    }
                    B2B::checkAgroProduct($row);
                },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if (!$c->isAdmin()) {
                        $new['supplier_id'] = $old['supplier_id'];
                        if ($new['status'] === 'approved' && $old['status'] !== 'approved') $new['status'] = 'pending';
                    }
                    B2B::checkAgroProduct($new, $old);
                },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    if ($old['status'] !== $new['status'] && in_array($new['status'], ['approved', 'rejected'], true)) {
                        $uid = B2B::supplierUserId($new['supplier_id']);
                        $approved = $new['status'] === 'approved';
                        Notify::create($uid, $approved ? 'b2b_product_approved' : 'b2b_product_rejected',
                            $approved ? 'Mahsulotingiz tasdiqlandi' : 'Mahsulotingiz rad etildi', $new['name'], 'b2b_product', $new['id']);
                    }
                },
            ],
            'b2b_orders' => [
                'grants' => ['anon' => '', 'authenticated' => 'rud'],
                'update_cols' => ['status', 'rejection_reason'],
                'select' => function (Ctx $c) { return P::any(P::uidIs('buyer_user_id', $c), P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'update' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'delete' => function (Ctx $c) { return P::admin($c); },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    $terminal = ['delivered', 'rejected', 'cancelled'];
                    if (in_array($old['status'], $terminal, true) && $new['status'] !== $old['status']) {
                        raise_exception("Yakunlangan buyurtma holatini o'zgartirib bo'lmaydi");
                    }
                    if (!$c->isAdmin() && $new['status'] !== $old['status']) {
                        $allowed = [
                            'pending' => ['supplier_confirmed', 'rejected', 'cancelled'],
                            'supplier_confirmed' => ['preparing', 'rejected', 'cancelled'],
                            'preparing' => ['ready', 'rejected', 'cancelled'],
                            'ready' => ['delivering', 'rejected', 'cancelled'],
                            'delivering' => ['delivered', 'rejected', 'cancelled'],
                        ];
                        if (!isset($allowed[$old['status']]) || !in_array($new['status'], $allowed[$old['status']], true)) {
                            raise_exception("Buyurtma holatini bu bosqichga o'tkazib bo'lmaydi");
                        }
                        if ($new['status'] === 'delivered' && $new['payment_method'] === 'cash' && $new['payment_status'] !== 'cash_confirmed') {
                            raise_exception("Yetkazilgan deb belgilashdan oldin naqd to'lovni tasdiqlang");
                        }
                    }
                    if ($new['status'] === 'rejected' && trim((string)$new['rejection_reason']) === '') {
                        raise_exception('Rad etish sababi kiritilishi shart');
                    }
                },
                'after_update' => function (array $new, array $old, Ctx $c) { B2B::afterOrderUpdate($new, $old); },
            ],
            'b2b_order_items' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'],
                'select' => function (Ctx $c) {
                    if ($c->isAdmin()) return true;
                    if (!$c->uid) return false;
                    return ['t.`order_id` IN (SELECT o.id FROM b2b_orders o WHERE o.buyer_user_id = ? OR o.supplier_id IN (SELECT sp.id FROM supplier_profiles sp WHERE sp.user_id = ?))', [$c->uid, $c->uid]];
                },
                'insert' => function (Ctx $c) { return P::admin($c); },
                'update' => function (Ctx $c) { return P::admin($c); },
                'delete' => function (Ctx $c) { return P::admin($c); },
            ],
            'commission_ledger' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'],
                'select' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::admin($c); },
                'update' => function (Ctx $c) { return P::admin($c); },
                'delete' => function (Ctx $c) { return P::admin($c); },
            ],
            'supplier_settlements' => [
                'grants' => ['anon' => '', 'authenticated' => 'riud'],
                'select' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::admin($c); },
                'update' => function (Ctx $c) { return P::admin($c); },
                'delete' => function (Ctx $c) { return P::admin($c); },
            ],
            'b2b_config' => [
                'grants' => ['anon' => 'ru', 'authenticated' => 'ru'],
                'select' => function (Ctx $c) { return true; },
                'update' => function (Ctx $c) { return P::admin($c); },
            ],
            'b2b_cashback_transactions' => [
                'grants' => ['anon' => '', 'authenticated' => 'r'],
                'select' => function (Ctx $c) { return P::any(P::ownBusiness('business_id', $c), P::admin($c)); },
            ],
            'b2b_direct_offers' => [
                'grants' => ['anon' => '', 'authenticated' => 'riu'],
                'insert_cols' => ['supplier_id', 'business_id', 'message', 'discount_percent', 'products'],
                'update_cols' => ['status'],
                'select' => function (Ctx $c) { return P::any(P::ownSupplier('supplier_id', $c), P::ownBusiness('business_id', $c), P::admin($c)); },
                'insert' => function (Ctx $c) { return P::ownSupplier('supplier_id', $c); },
                'update' => function (Ctx $c) { return P::any(P::ownBusiness('business_id', $c), P::admin($c)); },
                'before_update' => function (array &$new, array $old, Ctx $c) {
                    if ($c->isAdmin()) return;
                    if ($old['status'] !== 'pending') raise_exception("Bu taklif allaqachon ko'rib chiqilgan");
                    if (!in_array($new['status'], ['accepted', 'declined'], true)) raise_exception('Taklif faqat qabul qilinishi yoki rad etilishi mumkin');
                },
                'after_insert' => function (array $row, Ctx $c) {
                    $owner = Db::value('SELECT user_id FROM business_profiles WHERE id = ?', [$row['business_id']]);
                    $supplier = Db::value('SELECT company_name FROM supplier_profiles WHERE id = ?', [$row['supplier_id']]);
                    Notify::create($owner, 'b2b_offer', 'Yangi tijorat taklifi 🤝',
                        ($supplier ? $supplier : 'Supplier') . " sizning do'koningizga yangi taklif yubordi", 'b2b_offer', $row['id']);
                },
                'after_update' => function (array $new, array $old, Ctx $c) {
                    if ($old['status'] === $new['status'] || !in_array($new['status'], ['accepted', 'declined'], true)) return;
                    $owner = B2B::supplierUserId($new['supplier_id']);
                    $store = Db::value('SELECT store_name FROM business_profiles WHERE id = ?', [$new['business_id']]);
                    $accepted = $new['status'] === 'accepted';
                    Notify::create($owner, 'b2b_offer_status', $accepted ? 'Taklifingiz qabul qilindi! 🎉' : 'Taklifingiz rad etildi',
                        ($store ? $store : "Do'kon") . ' taklifingizni ' . ($accepted ? 'qabul qildi' : 'rad etdi'), 'b2b_offer', $new['id']);
                },
            ],
            'broadcast_announcements' => [
                'grants' => ['anon' => '', 'authenticated' => 'rid'],
                'select' => function (Ctx $c) { return P::admin($c); },
                'insert' => function (Ctx $c) { return P::admin($c); },
                'delete' => function (Ctx $c) { return P::admin($c); },
            ],

            // ---------------------------------------------------------- agro trade (writes via RPC only)
            'agro_purchase_requests' => [
                'grants' => ['anon' => 'r', 'authenticated' => 'r'],
                'select' => function (Ctx $c) {
                    return P::any(["t.`status` = 'open' AND t.`needed_by` >= ?", [tashkent_today()]], P::uidIs('user_id', $c));
                },
            ],
            'agro_trade_offers' => [
                'grants' => ['anon' => '', 'authenticated' => 'r'],
                'select' => function (Ctx $c) {
                    return $c->uid ? ['(t.`buyer_user_id` = ? OR t.`seller_user_id` = ?)', [$c->uid, $c->uid]] : false;
                },
            ],

            // ---------------------------------------------------------- server-only
            'push_subscriptions' => ['grants' => ['anon' => '', 'authenticated' => '']],
            'welcome_email_claims' => ['grants' => ['anon' => '', 'authenticated' => '']],
        ];
    }

    public static function syncProductRating($productId)
    {
        $row = Db::one('SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS cnt FROM product_reviews WHERE product_id = ?', [$productId]);
        $avg = ($row && $row['avg_rating'] !== null) ? $row['avg_rating'] : '5.0';
        Db::exec('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?', [$avg, (int)($row ? $row['cnt'] : 0), $productId]);
    }
}
