<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Dofus Services | Power-Leveling and Account Help';
$meta_description = 'Browse UP Dofus services for power-leveling, account support, and custom Dofus requests with clear ticket confirmation and transparent order flow.';
$canonical_url = canonical_url('services');
$active = 'services';

require_once __DIR__ . '/includes/data.php';

$offersFile = __DIR__ . '/storage/offers.json';
$data = is_file($offersFile) ? json_decode((string) file_get_contents($offersFile), true) : ['offers' => []];
$offers = array_values(array_filter($data['offers'] ?? [], static fn($offer) => ($offer['section'] ?? '') === 'services' && !empty($offer['active'])));
usort($offers, static fn($a, $b) => (int) ($a['sort'] ?? 999) <=> (int) ($b['sort'] ?? 999));

$json_ld = array_map(
    static fn(array $offer) => [
        '@type' => 'Service',
        'name' => (string) ($offer['title'] ?? 'UP Dofus Service'),
        'description' => trim((string) (($offer['subtitle'] ?? '') . ' ' . implode(' ', (array) ($offer['bullets'] ?? [])))),
        'provider' => ['@id' => rtrim((string) $GLOBALS['SITE_URL'], '/') . '/#organization'],
        'areaServed' => 'Online',
        'url' => canonical_url('packages', ['focus' => (string) ($offer['id'] ?? '')]),
    ],
    array_slice($offers, 0, 6)
);

include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <span class="badge">Search-ready services, clear routing, and custom support</span>
      <h1>Dofus services built for smooth ordering and safer follow-up.</h1>
      <p>Browse the storefront services that lead into our package and checkout flow. Each offer points you toward the matching package or order path so you can continue without guesswork.</p>
    </div>

    <div class="notice">
      <strong>Grand Commands:</strong>
      <?php
      $grandCommands = $DISCOUNTS['grand_commands'] ?? null;
      echo $grandCommands && !empty($grandCommands['enabled'])
          ? e($grandCommands['percent']) . '% discount from ' . e($grandCommands['min_qty']) . ' quantity on eligible account-selling orders.'
          : 'Currently disabled.';
      ?>
    </div>

    <div class="toolbar">
      <div class="search">
        <span aria-hidden="true">🔎</span>
        <input data-search placeholder="Search services, levels, or account offers..." aria-label="Search services">
      </div>
      <a class="btn ghost" href="<?= e(route_url('support')) ?>">Need a custom request?</a>
    </div>

    <div class="grid cards" data-filter-grid>
<?php if ($offers === []): ?>
      <div class="notice">No services offers yet. Add offers from Admin with <strong>Section = services</strong> and <strong>Active</strong>.</div>
<?php endif; ?>
<?php foreach ($offers as $offer): ?>
<?php
    $query = trim((string) (($offer['title'] ?? '') . ' ' . ($offer['subtitle'] ?? '')));
    $href = route_url('packages', ['q' => $query, 'focus' => (string) ($offer['id'] ?? '')]);
    $haystack = trim((string) (($offer['title'] ?? '') . ' ' . ($offer['subtitle'] ?? '') . ' ' . implode(' ', (array) ($offer['bullets'] ?? []))));
?>
      <article class="card offer-card" data-card data-hay="<?= e($haystack) ?>">
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
        <a class="btn" href="<?= e($href) ?>" data-offer-id="<?= e($offer['id'] ?? '') ?>" <?= analytics_attrs('service_card_click', ['offer-id' => $offer['id'] ?? '', 'section' => 'services']) ?>>
          <?= e($offer['cta_label'] ?? 'View matching package') ?>
        </a>
      </article>
<?php endforeach; ?>
    </div>
  </div>
</section>

<section class="section">
  <div class="container split-section">
    <div class="card pad">
      <h2>How it works</h2>
      <ol class="process-list">
        <li>Choose the service that matches your goal.</li>
        <li>Open the related package flow and submit the order details.</li>
        <li>Use your order ID in Discord so support can confirm scope and timing.</li>
      </ol>
    </div>
    <div class="card pad">
      <h2>Need something outside the listed offers?</h2>
      <p>Custom boosts and uncommon account requests are still welcome. Use the support page so we can quote the request clearly before work begins.</p>
      <a class="btn ghost" href="<?= e(route_url('support')) ?>">Open support</a>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
