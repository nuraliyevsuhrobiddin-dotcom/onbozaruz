-- =====================================================================
-- MollBazar — RESET: drops every MollBazar table (old AI tables included).
-- 1) phpMyAdmin -> Export the database first (backup).
-- 2) Import this file, then mollbazar_schema.sql, then mollbazar_data.sql.
-- =====================================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `post_likes`;
DROP TABLE IF EXISTS `admin_audit_logs`;
DROP TABLE IF EXISTS `welcome_email_claims`;
DROP TABLE IF EXISTS `push_subscriptions`;
DROP TABLE IF EXISTS `agro_trade_offers`;
DROP TABLE IF EXISTS `agro_purchase_requests`;
DROP TABLE IF EXISTS `broadcast_announcements`;
DROP TABLE IF EXISTS `b2b_direct_offers`;
DROP TABLE IF EXISTS `b2b_cashback_transactions`;
DROP TABLE IF EXISTS `b2b_config`;
DROP TABLE IF EXISTS `supplier_settlements`;
DROP TABLE IF EXISTS `commission_ledger`;
DROP TABLE IF EXISTS `b2b_order_items`;
DROP TABLE IF EXISTS `b2b_orders`;
DROP TABLE IF EXISTS `b2b_products`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `supplier_profiles`;
DROP TABLE IF EXISTS `business_addresses`;
DROP TABLE IF EXISTS `business_profiles`;
DROP TABLE IF EXISTS `product_reviews`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `seller_follows`;
DROP TABLE IF EXISTS `liked_posts`;
DROP TABLE IF EXISTS `saved_posts`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `posts`;
DROP TABLE IF EXISTS `profiles`;
DROP TABLE IF EXISTS `app_kv`;
DROP TABLE IF EXISTS `auth_one_time_tokens`;
DROP TABLE IF EXISTS `auth_flow_state`;
DROP TABLE IF EXISTS `auth_refresh_tokens`;
DROP TABLE IF EXISTS `auth_sessions`;
DROP TABLE IF EXISTS `auth_identities`;
DROP TABLE IF EXISTS `auth_users`;
SET FOREIGN_KEY_CHECKS = 1;
