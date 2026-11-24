<?php
/**
 * Router for PHP's built-in server — mimics public/api/.htaccess locally:
 *   php -S 127.0.0.1:8080 -t public ahost/dev-router.php
 * Needs public/api/_lib/config.php (copy config.example.php) pointing at a local MySQL/MariaDB.
 */
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($path, '/api/') !== 0) {
    return false; // let the built-in server serve the SPA build / static files
}
if (preg_match('#^/api/(_lib|_data)(/|$)#', $path)) {
    http_response_code(403);
    exit;
}
$file = realpath(__DIR__ . '/../public' . $path);
$storage = realpath(__DIR__ . '/../public/api/storage');
if ($file && is_file($file) && $storage && strpos($file, $storage) === 0) {
    return false; // uploaded media served statically
}
$_SERVER['HTTP_AUTHORIZATION'] = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
require __DIR__ . '/../public/api/index.php';
