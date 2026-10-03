<?php
declare(strict_types=1);

if (!function_exists('array_is_list')) {
    function array_is_list(array $array): bool
    {
        return $array === [] || array_keys($array) === range(0, count($array) - 1);
    }
}

function load_env_file(string $path): void
{
    static $loaded = [];

    if (isset($loaded[$path]) || !is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        [$name, $value] = array_pad(explode('=', $line, 2), 2, '');
        $name = trim($name);
        $value = trim($value);

        if ($name === '' || array_key_exists($name, $_ENV) || getenv($name) !== false) {
            continue;
        }

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }

    $loaded[$path] = true;
}

load_env_file(__DIR__ . '/../.env');

function env_value(string $key, mixed $default = null): mixed
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }

    return $value;
}

function is_local_environment(): bool
{
    $appEnv = strtolower((string) env_value('APP_ENV', ''));
    if (in_array($appEnv, ['local', 'development', 'dev'], true)) {
        return true;
    }

    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? ''));
    if ($host !== '' && preg_match('/^(localhost|127\.0\.0\.1|::1)(:\d+)?$/', $host)) {
        return true;
    }

    return PHP_SAPI === 'cli-server';
}

function env_or_local(string $key, string $localDefault = ''): string
{
    $value = env_value($key);
    if (is_string($value) && $value !== '') {
        return $value;
    }

    return is_local_environment() ? $localDefault : '';
}

function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$SITE_NAME = (string) env_value('SITE_NAME', 'UP Dofus');
$SITE_TAGLINE = (string) env_value('SITE_TAGLINE', 'Power-Leveling, Accounts, and Dofus Services');
$SITE_DESCRIPTION = (string) env_value(
    'SITE_DESCRIPTION',
    'UP Dofus offers trusted Dofus power-leveling, account services, and responsive ticket-based support with a secure confirmation workflow.'
);
$SITE_URL = rtrim((string) env_value('SITE_URL', is_local_environment() ? 'http://localhost' : 'https://up-dofus.fr'), '/');
$SITE_LANGUAGE = (string) env_value('SITE_LANGUAGE', 'en');
$SITE_LOCALE = (string) env_value('SITE_LOCALE', 'en_US');
$SITE_TWITTER = (string) env_value('SITE_TWITTER', '');
$DEFAULT_OG_IMAGE = (string) env_value('DEFAULT_OG_IMAGE', $SITE_URL . '/assets/img/up-logo.ico');

$DISCORD_SERVER_INVITE = (string) env_value('DISCORD_SERVER_INVITE', '');
$ORDER_CHANNEL_HINT = (string) env_value('ORDER_CHANNEL_HINT', '#order-here');
$SUPPORT_EMAIL = env_or_local('SUPPORT_EMAIL', '');

$DISCORD_CLIENT_ID = env_or_local('DISCORD_CLIENT_ID', '');
$DISCORD_CLIENT_SECRET = env_or_local('DISCORD_CLIENT_SECRET', '');
$DISCORD_REDIRECT_URI = env_or_local('DISCORD_REDIRECT_URI', 'http://localhost/auth/callback.php');
$DISCORD_SCOPES = (string) env_value('DISCORD_SCOPES', 'identify email');

$ADMIN_USERNAME = env_or_local('ADMIN_USERNAME', '');
$ADMIN_PASSWORD_HASH = (string) env_value('ADMIN_PASSWORD_HASH', '');

$GA_MEASUREMENT_ID = (string) env_value('GA_MEASUREMENT_ID', '');
$GTM_CONTAINER_ID = (string) env_value('GTM_CONTAINER_ID', '');
$SEARCH_CONSOLE_VERIFICATION = (string) env_value('SEARCH_CONSOLE_VERIFICATION', '');
$ENABLE_LOCAL_EVENT_LOG = filter_var((string) env_value('ENABLE_LOCAL_EVENT_LOG', '1'), FILTER_VALIDATE_BOOL);

$sessionSecure = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';

if (session_status() === PHP_SESSION_NONE) {
    session_name('UPDOFUSSESSID');

    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $sessionSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        session_set_cookie_params(0, '/; samesite=Lax', '', $sessionSecure, true);
    }

    session_start();
}

function is_logged_in(): bool
{
    return !empty($_SESSION['discord_user']);
}

function current_user(): ?array
{
    $user = $_SESSION['discord_user'] ?? null;
    return is_array($user) ? $user : null;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    return (string) $_SESSION['csrf'];
}

function csrf_field(string $field = 'csrf'): string
{
    return '<input type="hidden" name="' . e($field) . '" value="' . e(csrf_token()) . '">';
}

function require_csrf(array $fieldNames = ['csrf', 'csrf_token']): void
{
    foreach ($fieldNames as $field) {
        $sent = $_POST[$field] ?? '';
        if (is_string($sent) && hash_equals((string) ($_SESSION['csrf'] ?? ''), $sent)) {
            return;
        }
    }

    http_response_code(400);
    exit('Your session expired. Please refresh the page and try again.');
}

function admin_is_logged_in(): bool
{
    return !empty($_SESSION['admin_logged_in']);
}

function admin_require_login(): void
{
    if (!admin_is_logged_in()) {
        header('Location: /admin/login.php');
        exit;
    }
}

function admin_authenticate(string $username, string $password): bool
{
    $expectedUser = (string) ($GLOBALS['ADMIN_USERNAME'] ?? '');
    $hash = (string) ($GLOBALS['ADMIN_PASSWORD_HASH'] ?? '');

    if ($expectedUser === '' || $hash === '') {
        return false;
    }

    return hash_equals($expectedUser, trim($username)) && password_verify($password, $hash);
}

function admin_login(string $username): void
{
    session_regenerate_id(true);
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['admin_user'] = $username;
}

function admin_logout(): void
{
    unset($_SESSION['admin_logged_in'], $_SESSION['admin_user']);
    session_regenerate_id(true);
}

function url_for(string $path, array $query = [], bool $absolute = false): string
{
    $path = '/' . ltrim($path, '/');
    $url = $absolute ? rtrim((string) $GLOBALS['SITE_URL'], '/') . $path : $path;

    if ($query !== []) {
        $url .= '?' . http_build_query($query);
    }

    return $url;
}

function route_url(string $route, array $query = [], bool $absolute = false): string
{
    $routes = [
        'home' => '/',
        'services' => '/services',
        'packages' => '/packages',
        'about' => '/about',
        'support' => '/support',
        'feedbacks' => '/feedbacks',
        'privacy' => '/privacy',
        'terms' => '/terms',
        'checkout' => '/checkout',
        'my-orders' => '/my-orders',
        'dashboard' => '/dashboard',
        'orders' => '/orders',
        'offers' => '/offers',
        'feedback' => '/feedback',
        'login' => '/login',
    ];

    $path = $routes[$route] ?? $route;
    return url_for($path, $query, $absolute);
}

function canonical_url(string $routeOrPath, array $query = []): string
{
    if ($routeOrPath === '' || $routeOrPath[0] === '/') {
        return url_for($routeOrPath === '' ? '/' : $routeOrPath, $query, true);
    }

    return route_url($routeOrPath, $query, true);
}

function request_path(): string
{
    $path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
    return $path === '' ? '/' : $path;
}

function analytics_attrs(string $event, array $payload = []): string
{
    $attrs = ['data-track' => $event];
    foreach ($payload as $key => $value) {
        if ($value === null || $value === '') {
            continue;
        }

        $attr = 'data-' . preg_replace('/[^a-z0-9\-]/', '-', strtolower((string) $key));
        $attrs[$attr] = (string) $value;
    }

    $parts = [];
    foreach ($attrs as $name => $value) {
        $parts[] = $name . '="' . e($value) . '"';
    }

    return implode(' ', $parts);
}

function base_schema_nodes(): array
{
    $siteUrl = rtrim((string) $GLOBALS['SITE_URL'], '/');

    return [
        [
            '@type' => 'Organization',
            '@id' => $siteUrl . '/#organization',
            'name' => (string) $GLOBALS['SITE_NAME'],
            'url' => $siteUrl . '/',
            'description' => (string) $GLOBALS['SITE_DESCRIPTION'],
            'logo' => [
                '@type' => 'ImageObject',
                'url' => (string) $GLOBALS['DEFAULT_OG_IMAGE'],
            ],
            'sameAs' => array_values(array_filter([
                (string) ($GLOBALS['DISCORD_SERVER_INVITE'] ?? ''),
            ])),
            'contactPoint' => [
                '@type' => 'ContactPoint',
                'contactType' => 'customer support',
                'email' => (string) ($GLOBALS['SUPPORT_EMAIL'] ?? ''),
                'url' => route_url('support', [], true),
                'availableLanguage' => ['English'],
            ],
        ],
        [
            '@type' => 'WebSite',
            '@id' => $siteUrl . '/#website',
            'url' => $siteUrl . '/',
            'name' => (string) $GLOBALS['SITE_NAME'],
            'description' => (string) $GLOBALS['SITE_DESCRIPTION'],
            'publisher' => ['@id' => $siteUrl . '/#organization'],
            'inLanguage' => (string) $GLOBALS['SITE_LANGUAGE'],
        ],
    ];
}
