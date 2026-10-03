<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'My Orders | UP Dofus';
$meta_description = 'Private order tracking area for logged-in UP Dofus customers.';
$canonical_url = canonical_url('my-orders');
$meta_robots = 'noindex, follow';
$active = '';

require_once __DIR__ . '/includes/data.php';
include __DIR__ . '/includes/header.php';

if (!is_logged_in()) {
    ?>
    <section class="section">
      <div class="container">
        <div class="notice warn"><strong>Login required.</strong> Login with Discord to see your order history and status updates.</div>
        <div class="cta" style="margin-top:16px;">
          <a class="btn" href="/auth/login.php">Login with Discord</a>
        </div>
      </div>
    </section>
    <?php
    include __DIR__ . '/includes/footer.php';
    exit;
}

$user = current_user();
$discordId = $user['id'] ?? null;
$path = __DIR__ . '/storage/orders.json';
$orders = is_file($path) ? json_decode((string) file_get_contents($path), true) : [];
if (!is_array($orders)) {
    $orders = [];
}

$mine = array_values(array_filter($orders, static fn($order) => !empty($order['user']['discord_id']) && $order['user']['discord_id'] === $discordId));
usort($mine, static fn($a, $b) => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <h1>My Orders</h1>
      <p>This private page shows the orders linked to your Discord account and any admin updates added to them.</p>
    </div>

<?php if ($mine === []): ?>
    <div class="notice">
      <strong>No linked orders yet.</strong> Start from the <a href="<?= e(route_url('services')) ?>">Services</a> or <a href="<?= e(route_url('packages')) ?>">Packages</a> pages, then log in before ordering to attach future requests automatically.
    </div>
<?php else: ?>
    <div class="grid cards">
<?php foreach ($mine as $order): ?>
      <article class="card product">
        <div class="card-top">
          <div>
            <h2 class="card-title"><?= e($order['service_name'] ?? '') ?></h2>
            <p class="card-sub">Order ID: <?= e($order['id'] ?? '') ?></p>
          </div>
          <div class="card-price"><?= e((string) (($order['total'] ?? 0) . ' ' . ($order['currency'] ?? ''))) ?></div>
        </div>
        <p class="microcopy"><?= e(($order['bonus_label'] ?? 'Bonus')) ?>: <?= e($order['bonus'] ?? '') ?> · Server: <?= e($order['server'] ?? '') ?> · Qty: <?= e((string) ($order['qty'] ?? 1)) ?></p>
        <div class="notice">
          <strong>Status:</strong> <?= e($order['status'] ?? 'Under review') ?><br>
          <span class="mini">Updated: <?= e($order['status_updated_at'] ?? $order['created_at'] ?? '') ?></span>
<?php if (!empty($order['admin_note'])): ?>
          <div style="margin-top:10px;"><strong>Update:</strong> <?= nl2br(e($order['admin_note'])) ?></div>
<?php endif; ?>
        </div>
      </article>
<?php endforeach; ?>
    </div>
<?php endif; ?>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
