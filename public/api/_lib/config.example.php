<?php
/**
 * MollBazar API configuration — TEMPLATE.
 *
 * Copy this file to ONE of these locations and fill in real values:
 *   1. /home/<cpanel-user>/mollbazar_config.php   (recommended: outside the web root)
 *   2. <web root>/api/_lib/config.php              (denied over HTTP by .htaccess)
 *
 * Never commit the real file. Generate secrets with:
 *   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 */
return [
    // cPanel -> MySQL Databases
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'CPANELUSER_mollbazar',
    'db_user' => 'CPANELUSER_mollbazar',
    'db_pass' => 'CHANGE_ME',

    // At least 32 random characters. Changing it signs every user out.
    'jwt_secret' => 'CHANGE_ME_TO_64_RANDOM_HEX_CHARS',

    // Public site address (no trailing slash). Used for e-mail links and OAuth.
    'site_url' => 'https://mollbazar.uz',
    // Extra origins allowed for redirects/CORS, e.g. 'https://www.mollbazar.uz'.
    'additional_redirect_origins' => ['https://www.mollbazar.uz'],

    // true  => accounts are active immediately (no confirmation e-mail needed)
    // false => users must click the confirmation link before signing in
    'autoconfirm_email' => true,

    // E-mail: Resend API key (recommended) or leave empty to use PHP mail().
    'mail_from' => 'MollBazar <noreply@mollbazar.uz>',
    'resend_api_key' => '',

    // Google sign-in (Google Cloud Console -> OAuth client, Web application).
    // Authorized redirect URI: https://mollbazar.uz/api/auth/v1/callback
    'google_client_id' => '',
    'google_client_secret' => '',

    // Web Push (optional) — the same VAPID pair as VITE_WEB_PUSH_VAPID_PUBLIC_KEY.
    'vapid_public_key' => '',
    'vapid_private_key' => '',
    'vapid_subject' => 'mailto:admin@mollbazar.uz',

    // Never enable on the live site: exposes SQL error text in responses.
    'debug' => false,
];
