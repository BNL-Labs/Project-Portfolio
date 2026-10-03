<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Dofus Packages | Ready-to-Order Offers';
$meta_description = 'Compare UP Dofus packages, search offers quickly, and go straight into checkout with the correct linked service and order options.';
$canonical_url = canonical_url('packages');
$active = 'store';

require_once __DIR__ . '/includes/data.php';

$offersFile = __DIR__ . '/storage/offers.json';
$data = is_file($offersFile) ? json_decode((string) file_get_contents($offersFile), true) : ['offers' => []];
$offers = array_values(array_filter($data['offers'] ?? [], static fn($offer) => ($offer['section'] ?? '') === 'store' && !empty($offer['active'])));
usort($offers, static fn($a, $b) => (int) ($a['sort'] ?? 999) <=> (int) ($b['sort'] ?? 999));

$query = trim((string) ($_GET['q'] ?? ''));
$focus = trim((string) ($_GET['focus'] ?? ''));

$json_ld = array_map(
    static function (array $offer) use ($SERVICES): array {
        $serviceId = $offer['checkout_params']['service'] ?? '';
        $service = $serviceId !== '' ? find_service($SERVICES, $serviceId) : null;

        return [
            '@type' => 'Service',
            'name' => (string) ($offer['title'] ?? 'UP Dofus Package'),
            'description' => trim((string) (($offer['subtitle'] ?? '') . ' ' . implode(' ', (array) ($offer['bullets'] ?? [])))),
            'provider' => ['@id' => rtrim((string) $GLOBALS['SITE_URL'], '/') . '/#organization'],
            'offers' => [
                '@type' => 'Offer',
                'url' => canonical_url('checkout', ['service' => (string) ($service['id'] ?? ''), 'type' => (string) ($service['type'] ?? 'boosting')]),
            ],
        ];
    },
    array_slice($offers, 0, 6)
);

include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <span class="badge">Search packages, match the right checkout, and keep custom requests visible</span>
      <h1>Dofus packages ready for checkout.</h1>
      <p>Use search to narrow the list, open the matching package, and continue into the linked checkout flow with the correct service configuration.</p>
    </div>

    <div class="toolbar">
      <div class="search">
        <span aria-hidden="true">🔎</span>
        <input data-search value="<?= e($query) ?>" placeholder="Search accounts, packs, priority, server help..." aria-label="Search packages">
      </div>
      <a class="btn ghost" href="<?= e(route_url('support')) ?>">Request a custom quote</a>
    </div>

    <div class="grid cards" data-filter-grid data-focus="<?= e($focus) ?>">
<?php if ($offers === []): ?>
      <div class="notice">No store offers yet. Add offers from Admin with <strong>Section = store</strong> and <strong>Active</strong>.</div>
<?php endif; ?>
<?php foreach ($offers as $offer): ?>
<?php
    $serviceId = $offer['checkout_params']['service'] ?? '';
    $service = $serviceId !== '' ? find_service($SERVICES, $serviceId) : null;
    $checkoutHref = $service
        ? route_url('checkout', ['service' => $serviceId, 'type' => (string) ($service['type'] ?? 'boosting')])
        : route_url('packages');
    $haystack = trim((string) (($offer['title'] ?? '') . ' ' . ($offer['subtitle'] ?? '') . ' ' . implode(' ', (array) ($offer['bullets'] ?? []))));
    $isFocused = $focus !== '' && $focus === (string) ($offer['id'] ?? '');
?>
      <article class="card offer-card<?= $isFocused ? ' is-focused' : '' ?>" id="offer-<?= e($offer['id'] ?? '') ?>" data-card data-offer-id="<?= e($offer['id'] ?? '') ?>" data-hay="<?= e($haystack) ?>">
        <div class="card-top">
          <div>
            <h2 class="card-title"><?= e($offer['title'] ?? '') ?></h2>
            <p class="card-sub"><?= e($offer['subtitle'] ?? '') ?></p>
          </div>
          <div class="card-price"><?= e((string) ($offer['price'] ?? '')) ?> <?= e($offer['price_unit'] ?? '') ?></div>
        </div>
<?php if (!empty($offer['bullets']) && is_array($offer['bullets'])): ?>
        <ul class="bullets">
<?php foreach ($offer['bullets'] as $bullet): ?>
          <li><?= e($bullet) ?></li>
<?php endforeach; ?>
        </ul>
<?php endif; ?>
        <p class="microcopy"><?= e($service ? 'This package opens the correct checkout with its linked service.' : 'Link this offer to a service in Admin to enable checkout.') ?></p>
        <div class="cta cta-stack">
          <a class="btn" href="<?= e($checkoutHref) ?>" data-offer-id="<?= e($offer['id'] ?? '') ?>" <?= analytics_attrs('package_click', ['offer-id' => $offer['id'] ?? '', 'section' => 'store']) ?>>
            <?= e($offer['cta_label'] ?? 'Order this package') ?>
          </a>
          <a class="btn ghost" href="<?= e(route_url('support')) ?>">Need a custom package?</a>
        </div>
      </article>
<?php endforeach; ?>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
