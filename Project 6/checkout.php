<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Checkout | Confirm Your Dofus Order';
$meta_description = 'Submit your UP Dofus order, choose server and options, and receive an order ID to continue in Discord support.';
$canonical_url = canonical_url('checkout');
$meta_robots = 'noindex, follow';
$active = '';

require_once __DIR__ . '/includes/data.php';

$serviceId = trim((string) ($_GET['service'] ?? ''));
$type = strtolower(trim((string) ($_GET['type'] ?? '')));
$service = find_service($SERVICES, $serviceId);

include __DIR__ . '/includes/header.php';

if (!$service) {
    ?>
    <section class="section">
      <div class="container">
        <div class="notice warn"><strong>Service not found.</strong> Please choose a package from the store.</div>
        <div class="cta" style="margin-top:16px;">
          <a class="btn" href="<?= e(route_url('packages')) ?>">Back to packages</a>
        </div>
      </div>
    </section>
    <?php
    include __DIR__ . '/includes/footer.php';
    exit;
}

$serviceIdLower = strtolower((string) ($service['id'] ?? ''));
$serviceNameLower = strtolower((string) ($service['name'] ?? ''));
$isAccountSelling = in_array($type, ['selling', 'account_selling', 'accounts_selling'], true)
    || str_contains($serviceIdLower, 'selling')
    || str_contains($serviceNameLower, 'selling');

$labelBonus = $isAccountSelling ? 'Class' : 'Bonus';
$errorRequired = $isAccountSelling ? 'Server and class are required.' : 'Server and bonus are required.';
$bonusOptionsBoosting = ['x1', 'x2', 'x3', 'Other'];
$bonusOptionsSelling = ['Cra', 'Ecaflip', 'Eliotrope', 'Eniripsa', 'Enutrof', 'Feca', 'Foggernaut', 'Forgelance', 'Huppermage', 'Iop', 'Masqueraider', 'Osamodas', 'Ouginak', 'Pandawa', 'Rogue', 'Sacrier', 'Sadida', 'Sram', 'Xelor'];

$sent = false;
$error = '';
$orderId = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $server = trim((string) ($_POST['server'] ?? ''));
    $bonus = trim((string) ($_POST['bonus'] ?? ''));
    $qty = max(1, (int) ($_POST['qty'] ?? 1));
    $notes = trim((string) ($_POST['notes'] ?? ''));

    if ($server === '' || $bonus === '') {
        $error = $errorRequired;
    } else {
        $user = current_user();
        $discountPercent = calc_grand_commands_discount($DISCOUNTS, (string) $service['id'], $qty);
        $calc = calc_total_price($service, $qty, $discountPercent);
        $orderId = 'UP-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));

        $order = [
            'id' => $orderId,
            'created_at' => date('c'),
            'status' => 'Under review',
            'status_updated_at' => date('c'),
            'service_id' => $service['id'],
            'service_name' => $service['name'],
            'server' => $server,
            'bonus' => $bonus,
            'bonus_label' => $labelBonus,
            'order_type' => $isAccountSelling ? 'account_selling' : 'accounts_boosting',
            'qty' => $qty,
            'price_type' => $service['price_type'],
            'currency' => $service['currency_label'] ?? '',
            'subtotal' => $calc['subtotal'] ?? 0,
            'discount_percent' => $discountPercent,
            'discount' => $calc['discount'] ?? 0,
            'total' => $calc['total'] ?? 0,
            'notes_user' => $notes,
            'admin_note' => '',
            'user' => [
                'discord_id' => $user['id'] ?? null,
                'username' => $user ? (($user['username'] ?? '') . (isset($user['discriminator']) ? '#' . $user['discriminator'] : '')) : 'Guest',
                'email' => $user['email'] ?? '',
            ],
        ];

        $path = __DIR__ . '/storage/orders.json';
        $orders = is_file($path) ? json_decode((string) file_get_contents($path), true) : [];
        if (!is_array($orders)) {
            $orders = [];
        }
        $orders[] = $order;

        file_put_contents($path, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        @file_put_contents(__DIR__ . '/storage/orders.log', date('c') . " | ORDER {$orderId}\n", FILE_APPEND);

        $sent = true;
    }
}
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <span class="badge">Checkout linked to the current PHP order flow</span>
      <h1>Confirm your order details and continue in Discord.</h1>
      <p>We review the order, confirm price and delivery in ticket, and only then move forward with the workflow.</p>
    </div>

<?php if ($sent): ?>
    <div class="success-panel card pad">
      <h2>Order submitted successfully.</h2>
      <p>Your order has been saved. Use the order ID below when you open or update your Discord ticket so the team can pick up the request faster.</p>
      <div class="order-id-box"><?= e($orderId) ?></div>
      <ol class="process-list">
        <li>Join or open your Discord ticket in <?= e($ORDER_CHANNEL_HINT) ?>.</li>
        <li>Share the order ID <strong><?= e($orderId) ?></strong>.</li>
        <li>Wait for confirmation of price, timing, and delivery details before work starts.</li>
      </ol>
      <div class="cta">
        <a class="btn" href="<?= e(route_url('support')) ?>">Open support</a>
        <a class="btn ghost" href="<?= e(route_url('packages')) ?>">Back to packages</a>
      </div>
    </div>
<?php else: ?>
<?php if (!is_logged_in()): ?>
    <div class="notice">
      <strong>Tip:</strong> Login with Discord first if you want the order linked to your account automatically for the My Orders page.
      <div class="cta" style="margin-top:12px;">
        <a class="btn ghost" href="/auth/login.php">Login with Discord</a>
      </div>
    </div>
<?php endif; ?>

<?php if ($error !== ''): ?>
    <div class="notice warn"><strong>We could not submit the order.</strong> <?= e($error) ?></div>
<?php endif; ?>

    <div class="card pad checkout-layout">
      <div>
        <h2><?= e($service['name']) ?></h2>
        <p class="mini"><?= e($service['subtitle'] ?? '') ?></p>
        <div class="price-tag"><?= e(money_label($service)) ?></div>
        <div class="notice" style="margin-top:16px;">
          <strong>Grand Commands:</strong>
          <?php
          $grandCommands = $DISCOUNTS['grand_commands'] ?? null;
          echo $grandCommands && !empty($grandCommands['enabled'])
              ? e($grandCommands['percent']) . '% discount from ' . e($grandCommands['min_qty']) . ' quantity on eligible account-selling orders.'
              : 'Currently disabled.';
          ?>
        </div>
      </div>

      <form class="form" method="post" data-track-submit="checkout_submit">
        <?= csrf_field() ?>
        <div class="field">
          <label for="server">Server</label>
          <select id="server" name="server" required>
            <option value="">Select a server</option>
<?php foreach ($ALL_SERVERS as $serverOption): ?>
            <option value="<?= e($serverOption) ?>"><?= e($serverOption) ?></option>
<?php endforeach; ?>
          </select>
        </div>

        <div class="field">
          <label for="bonus"><?= e($labelBonus) ?></label>
          <select id="bonus" name="bonus" required>
            <option value="">Select <?= strtolower(e($labelBonus)) ?></option>
<?php foreach ($isAccountSelling ? $bonusOptionsSelling : $bonusOptionsBoosting as $option): ?>
            <option value="<?= e($option) ?>"><?= e($option) ?></option>
<?php endforeach; ?>
          </select>
        </div>

        <div class="field">
          <label for="qty">Quantity</label>
          <input id="qty" type="number" name="qty" min="1" value="1" required>
        </div>

        <div class="field">
          <label for="notes">Extra notes</label>
          <textarea id="notes" name="notes" placeholder="Share account details, timing, or custom instructions if needed."></textarea>
        </div>

        <button class="btn" type="submit">Submit order</button>
        <p class="form-note">By placing an order, you agree to our <a href="<?= e(route_url('terms')) ?>">Terms of Service</a> and <a href="<?= e(route_url('privacy')) ?>">Privacy Policy</a>.</p>
      </form>
    </div>
<?php endif; ?>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
