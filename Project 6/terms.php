<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Terms of Service | UP Dofus';
$meta_description = 'Review the UP Dofus terms covering order confirmation, support expectations, digital delivery, and service limitations.';
$canonical_url = canonical_url('terms');
$active = '';

include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container legal-page">
    <div class="page-hero card pad legal-hero">
      <h1>Terms of Service</h1>
      <p>Last updated: <?= e(date('F Y')) ?></p>
    </div>

    <article class="card pad legal-card">
      <p>By using the UP Dofus storefront, support channels, and checkout pages, you agree to the following terms.</p>

      <h2>Digital service scope</h2>
      <p>UP Dofus provides digital game-related services such as power-leveling, account-oriented offers, and custom requests that are confirmed directly with the customer.</p>

      <h2>Order confirmation</h2>
      <p>An order submission does not mean work starts instantly. We use the support ticket flow to confirm scope, price, timing, and any special conditions before starting.</p>

      <h2>Customer responsibilities</h2>
      <ul>
        <li>Provide accurate order and contact information.</li>
        <li>Remain reachable through Discord or the chosen contact method.</li>
        <li>Confirm any important details requested by support.</li>
      </ul>

      <h2>Delivery timing</h2>
      <p>Delivery estimates depend on workload, request type, and service conditions. Timing shared in support is an estimate unless clearly stated otherwise.</p>

      <h2>Refunds and cancellations</h2>
      <p>Because the services are digital and workflow-based, refunds are reviewed case by case. If a request cannot be completed on our side, we review the situation and decide the fairest outcome.</p>

      <h2>Platform and gameplay changes</h2>
      <p>We are not responsible for game-side updates, platform disruptions, or other external changes that affect the service conditions after ordering.</p>

      <h2>Need clarification?</h2>
      <p>If anything in these terms is unclear, contact us through the support page before placing an order.</p>
    </article>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
