<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'About UP Dofus | Process, Support, and Service Philosophy';
$meta_description = 'Learn how UP Dofus handles communication, order confirmation, support, and delivery for Dofus services and packages.';
$canonical_url = canonical_url('about');
$active = 'about';

$json_ld = [[
    '@type' => 'AboutPage',
    'name' => 'About UP Dofus',
    'url' => canonical_url('about'),
    'description' => 'Overview of the UP Dofus process, communication style, and service approach.',
]];
include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <h1>About UP Dofus</h1>
      <p>UP Dofus is built around clear communication, confirmed order details, and support that stays available through the full order flow instead of disappearing after checkout.</p>
    </div>

    <div class="grid-3">
      <article class="card feature">
        <div class="icon">A</div>
        <h2>Communication first</h2>
        <p>We keep support centered around ticket-based follow-up so questions, confirmations, and updates stay in one place.</p>
      </article>
      <article class="card feature">
        <div class="icon">B</div>
        <h2>Confirmed before start</h2>
        <p>The goal is not just to accept an order quickly. It is to confirm the scope and next steps clearly before any work begins.</p>
      </article>
      <article class="card feature">
        <div class="icon">C</div>
        <h2>Built for repeat trust</h2>
        <p>The storefront, feedback page, and support flow are designed to make returning customers feel confident and informed.</p>
      </article>
    </div>

    <div class="split-section">
      <div class="card pad">
        <h2>How the service philosophy works in practice</h2>
        <ul class="check-list">
          <li>Ready-to-order packages are mapped to the checkout flow.</li>
          <li>Custom requests can still be quoted through support.</li>
          <li>Discord remains the fastest route for status updates and confirmations.</li>
          <li>Orders receive an ID so support can pick them up faster.</li>
        </ul>
      </div>
      <div class="card pad">
        <h2>What we focus on</h2>
        <p>Clean handoffs, reliable support, and a premium storefront experience that feels more trustworthy than a basic one-page contact form.</p>
        <div class="cta">
          <a class="btn" href="<?= e(route_url('services')) ?>">Browse services</a>
          <a class="btn ghost" href="<?= e(route_url('support')) ?>">Contact support</a>
        </div>
      </div>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
