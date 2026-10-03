<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Privacy Policy | UP Dofus';
$meta_description = 'Read how UP Dofus handles order information, Discord account data, support messages, and basic site analytics.';
$canonical_url = canonical_url('privacy');
$active = '';

include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container legal-page">
    <div class="page-hero card pad legal-hero">
      <h1>Privacy Policy</h1>
      <p>Last updated: <?= e(date('F Y')) ?></p>
    </div>

    <article class="card pad legal-card">
      <p>UP Dofus collects only the information needed to process orders, respond to support requests, and maintain the storefront experience.</p>

      <h2>Information we collect</h2>
      <ul>
        <li>Discord account details returned during login, such as username, ID, and email when provided.</li>
        <li>Order information such as service, server, quantity, and notes.</li>
        <li>Support messages sent through the contact form.</li>
        <li>Basic storefront interaction events used for analytics and visibility tracking.</li>
      </ul>

      <h2>How we use it</h2>
      <p>We use this information to manage orders, identify customers in support, improve the storefront flow, and maintain a basic analytics trail for service and package visibility.</p>

      <h2>Storage and access</h2>
      <p>Order, feedback, support, and tracking data are stored only for operational needs tied to the storefront. Access is intended for the UP Dofus team managing the site and orders.</p>

      <h2>Third-party services</h2>
      <p>The site may rely on Discord OAuth, hosting providers, and optional analytics tooling such as Google Analytics or Google Tag Manager when configured.</p>

      <h2>Your options</h2>
      <p>If you have a privacy question or want to request help related to stored support or order data, contact us through the support page or official Discord server.</p>
    </article>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
