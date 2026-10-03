<?php require_once __DIR__ . '/config.php'; ?>
<?php
$resolved_title = trim((string) ($page_title ?? $SITE_NAME));
$resolved_description = trim((string) ($meta_description ?? $SITE_DESCRIPTION));
$resolved_canonical = trim((string) ($canonical_url ?? canonical_url(request_path())));
$resolved_robots = trim((string) ($meta_robots ?? 'index, follow'));
$resolved_og_title = trim((string) ($og_title ?? $resolved_title));
$resolved_og_description = trim((string) ($og_description ?? $resolved_description));
$resolved_og_image = trim((string) ($og_image ?? $DEFAULT_OG_IMAGE));
$resolved_twitter_card = trim((string) ($twitter_card ?? 'summary_large_image'));
$body_class = 'page-' . preg_replace('/[^a-z0-9\-]+/', '-', strtolower((string) ($active ?? 'generic')));

$schemaNodes = [];
if (stripos($resolved_robots, 'noindex') === false) {
    $schemaNodes = array_merge($schemaNodes, base_schema_nodes());
}

if (!empty($json_ld) && is_array($json_ld)) {
    $extraNodes = array_is_list($json_ld) ? $json_ld : [$json_ld];
    $schemaNodes = array_merge($schemaNodes, $extraNodes);
}
?>
<!doctype html>
<html lang="<?= e($SITE_LANGUAGE) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($resolved_title) ?></title>
  <meta name="description" content="<?= e($resolved_description) ?>">
  <meta name="robots" content="<?= e($resolved_robots) ?>">
  <meta name="theme-color" content="#0b1020">
  <link rel="canonical" href="<?= e($resolved_canonical) ?>">
  <link rel="icon" href="/assets/img/favicon.ico" sizes="32x32">
  <link rel="icon" href="/assets/img/favicon.ico" sizes="192x192">
  <link rel="apple-touch-icon" href="/assets/img/favicon.ico">
  <meta property="og:locale" content="<?= e($SITE_LOCALE) ?>">
  <meta property="og:site_name" content="<?= e($SITE_NAME) ?>">
  <meta property="og:type" content="website">
  <meta property="og:title" content="<?= e($resolved_og_title) ?>">
  <meta property="og:description" content="<?= e($resolved_og_description) ?>">
  <meta property="og:url" content="<?= e($resolved_canonical) ?>">
  <meta property="og:image" content="<?= e($resolved_og_image) ?>">
  <meta name="twitter:card" content="<?= e($resolved_twitter_card) ?>">
  <meta name="twitter:title" content="<?= e($resolved_og_title) ?>">
  <meta name="twitter:description" content="<?= e($resolved_og_description) ?>">
  <meta name="twitter:image" content="<?= e($resolved_og_image) ?>">
<?php if ($SITE_TWITTER !== ''): ?>
  <meta name="twitter:site" content="<?= e($SITE_TWITTER) ?>">
<?php endif; ?>
<?php if ($SEARCH_CONSOLE_VERIFICATION !== ''): ?>
  <meta name="google-site-verification" content="<?= e($SEARCH_CONSOLE_VERIFICATION) ?>">
<?php endif; ?>
  <link rel="stylesheet" href="/assets/css/style.css?v=20260410">
<?php if ($GTM_CONTAINER_ID !== ''): ?>
  <script>
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','<?= e($GTM_CONTAINER_ID) ?>');
  </script>
<?php elseif ($GA_MEASUREMENT_ID !== ''): ?>
  <script async src="https://www.googletagmanager.com/gtag/js?id=<?= e($GA_MEASUREMENT_ID) ?>"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '<?= e($GA_MEASUREMENT_ID) ?>');
  </script>
<?php endif; ?>
<?php if ($schemaNodes !== []): ?>
  <script type="application/ld+json"><?= json_encode(['@context' => 'https://schema.org', '@graph' => $schemaNodes], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
<?php endif; ?>
</head>
<body class="<?= e($body_class) ?>">
<?php if ($GTM_CONTAINER_ID !== ''): ?>
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=<?= e($GTM_CONTAINER_ID) ?>" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<?php endif; ?>
  <a class="skip-link" href="#content">Skip to content</a>
  <div class="topbar">
    <div class="container">
      <div class="nav">
        <a class="brand" href="<?= e(route_url('home')) ?>">
          <img class="brand-logo" src="/assets/img/up-logo.ico" alt="UP Dofus logo">
          <span class="brand-copy">
            <span class="brand-name"><?= e($SITE_NAME) ?></span>
            <span class="brand-tag"><?= e($SITE_TAGLINE) ?></span>
          </span>
        </a>

        <div class="navlinks">
          <a class="pill <?= ($active ?? '') === 'home' ? 'active' : '' ?>" href="<?= e(route_url('home')) ?>">Home</a>
          <a class="pill <?= ($active ?? '') === 'services' ? 'active' : '' ?>" href="<?= e(route_url('services')) ?>">Services</a>
          <a class="pill <?= ($active ?? '') === 'store' ? 'active' : '' ?>" href="<?= e(route_url('packages')) ?>">Packages</a>
          <a class="pill <?= ($active ?? '') === 'about' ? 'active' : '' ?>" href="<?= e(route_url('about')) ?>">About</a>
          <a class="pill <?= ($active ?? '') === 'feedbacks' ? 'active' : '' ?>" href="<?= e(route_url('feedbacks')) ?>">Feedbacks</a>
          <a class="pill <?= ($active ?? '') === 'support' ? 'active' : '' ?>" href="<?= e(route_url('support')) ?>">Support</a>

<?php if (is_logged_in()): ?>
<?php $u = current_user(); ?>
          <div class="user-menu" data-user-menu>
            <button class="user-btn" type="button" aria-expanded="false" aria-haspopup="menu" data-user-toggle>
              <span class="dot" aria-hidden="true"></span>
              <span><?= e($u['username'] ?? 'User') ?></span>
              <span class="chev" aria-hidden="true">▾</span>
            </button>
            <div class="user-dd" role="menu" hidden data-user-dropdown>
              <a href="<?= e(route_url('my-orders')) ?>" role="menuitem">My Orders</a>
              <a href="/auth/logout.php" role="menuitem">Logout</a>
            </div>
          </div>
<?php else: ?>
          <a class="btn" href="/auth/login.php">Login with Discord</a>
<?php endif; ?>
        </div>
      </div>
    </div>
  </div>
  <main id="content">
