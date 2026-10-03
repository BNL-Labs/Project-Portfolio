<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'UP Dofus | Trusted Dofus Power-Leveling and Account Services';
$meta_description = 'Order trusted Dofus power-leveling, account services, and custom requests with clear ticket confirmation, secure workflow, and responsive support.';
$canonical_url = canonical_url('home');
$active = 'home';
$faqItems = [
    [
        'question' => 'How does an order start?',
        'answer' => 'You choose a service, submit your order details, and we confirm the price, timing, and workflow inside your Discord ticket before any work begins.',
    ],
    [
        'question' => 'Do I need to join Discord?',
        'answer' => 'Discord is the fastest support flow because it keeps identity, updates, and confirmations in one place, but you can also contact us through the support page.',
    ],
    [
        'question' => 'Can I request something custom?',
        'answer' => 'Yes. Custom boosts and special account requests are quoted through support so the scope and delivery plan stay clear before we start.',
    ],
];
$json_ld = [[
    '@type' => 'FAQPage',
    'mainEntity' => array_map(
        static fn(array $item) => [
            '@type' => 'Question',
            'name' => $item['question'],
            'acceptedAnswer' => [
                '@type' => 'Answer',
                'text' => $item['answer'],
            ],
        ],
        $faqItems
    ),
]];

require_once __DIR__ . '/includes/data.php';
include __DIR__ . '/includes/header.php';

$feedbackFile = __DIR__ . '/storage/feedbacks.json';
$feedbackData = is_file($feedbackFile) ? json_decode((string) file_get_contents($feedbackFile), true) : ['items' => []];
$feedbackItems = array_values(array_filter($feedbackData['items'] ?? [], static fn($item) => !empty($item['approved'])));
usort($feedbackItems, static fn($a, $b) => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
$feedbackItems = array_slice($feedbackItems, 0, 3);
?>
<section class="hero section">
  <div class="container">
    <div class="grid-hero">
      <div class="card pad hero-copy">
        <span class="badge">Fast replies, clear confirmation, secure workflow</span>
        <h1 class="h1">Premium Dofus power-leveling and account services with real ticket support.</h1>
        <p class="lead">
          UP Dofus helps you order faster and with more confidence: pick a service, confirm the details in ticket, and follow the delivery with direct support updates.
        </p>
        <div class="cta">
          <a class="btn" href="<?= e(route_url('services')) ?>">Browse Services</a>
          <a class="btn ghost" href="<?= e(route_url('packages')) ?>">View Packages</a>
          <a class="btn ghost" href="<?= e(route_url('support')) ?>">Open Support</a>
<?php if ($DISCORD_SERVER_INVITE !== ''): ?>
          <a class="pill" href="<?= e($DISCORD_SERVER_INVITE) ?>" target="_blank" rel="noreferrer" <?= analytics_attrs('discord_join_click', ['location' => 'home_hero']) ?>>Join Discord</a>
<?php endif; ?>
        </div>
        <div class="stats">
          <div class="stat"><b>Before start</b><span>Price and workflow confirmed in ticket</span></div>
          <div class="stat"><b>Responsive</b><span>Ticket updates and support follow-up</span></div>
          <div class="stat"><b>Flexible</b><span>Standard packages and custom requests</span></div>
        </div>
      </div>
      <aside class="preview" aria-label="Order process preview">
        <div class="shine" aria-hidden="true"></div>
        <div class="inner">
          <div class="kv">
            <div class="tag">ORDER FLOW</div>
            <div class="chip"><?= e(trim($ORDER_CHANNEL_HINT, '#')) ?></div>
          </div>
          <ol class="of-steps">
            <li data-step="1"><div class="txt"><b>Choose a service</b> or package that matches your goal.</div></li>
            <li data-step="2"><div class="txt"><b>Set the server and options</b> so the request is clear.</div></li>
            <li data-step="3"><div class="txt"><b>Submit the order</b> and receive your order ID instantly.</div></li>
            <li data-step="4"><div class="txt"><b>Open the Discord ticket</b> and mention the order ID in <?= e($ORDER_CHANNEL_HINT) ?>.</div></li>
            <li data-step="5"><div class="txt"><b>We confirm delivery and price</b> before work starts.</div></li>
          </ol>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>Why players choose UP Dofus</h2>
      <p>Built for clarity, support, and smooth ordering instead of rushed or confusing handoffs.</p>
    </div>
    <div class="grid-3">
      <article class="card feature">
        <div class="icon">1</div>
        <h3>Clear order process</h3>
        <p>Every order moves through a simple path: package selection, ticket confirmation, then delivery updates.</p>
      </article>
      <article class="card feature">
        <div class="icon">2</div>
        <h3>Trust before delivery</h3>
        <p>We confirm scope, timing, and details before anything starts so there is less confusion later.</p>
      </article>
      <article class="card feature">
        <div class="icon">3</div>
        <h3>Support-first workflow</h3>
        <p>Discord remains the main support channel so status questions and next steps stay easy to follow.</p>
      </article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container split-section">
    <div class="card pad">
      <h2>What you can do from here</h2>
      <p>Move directly to the part of the storefront that matches your goal.</p>
      <div class="link-grid">
        <a class="link-card" href="<?= e(route_url('services')) ?>"><strong>Services</strong><span>Browse leveling and account service categories.</span></a>
        <a class="link-card" href="<?= e(route_url('packages')) ?>"><strong>Packages</strong><span>Open ready-to-order offers tied to the checkout flow.</span></a>
        <a class="link-card" href="<?= e(route_url('feedbacks')) ?>"><strong>Feedbacks</strong><span>Read approved customer reviews and leave your own.</span></a>
        <a class="link-card" href="<?= e(route_url('support')) ?>"><strong>Support</strong><span>Ask about custom requests, timing, or any order issue.</span></a>
      </div>
    </div>
    <div class="card pad">
      <h2>Trust signals that matter</h2>
      <ul class="check-list">
        <li>Order ID generated at checkout for easier follow-up.</li>
        <li>Discord ticket reminder shown after every successful order.</li>
        <li>Support route available for custom requests and questions.</li>
        <li>Public feedback section with moderation before publishing.</li>
      </ul>
    </div>
  </div>
</section>

<section class="section" id="feedbacks">
  <div class="container">
    <div class="section-head section-head-inline">
      <div>
        <h2>Latest approved feedbacks</h2>
        <p>Recent reviews from customers who completed their orders through the storefront.</p>
      </div>
      <a class="btn ghost" href="<?= e(route_url('feedbacks')) ?>">View all feedbacks</a>
    </div>
    <div class="fb-grid">
<?php if ($feedbackItems === []): ?>
      <div class="notice" style="grid-column:1/-1;">No approved feedbacks yet.</div>
<?php else: ?>
<?php foreach ($feedbackItems as $item): ?>
      <article class="fb-card">
        <div class="fb-top">
          <div class="fb-avatar"><?= e(strtoupper(mb_substr((string) ($item['name'] ?? 'G'), 0, 1))) ?></div>
          <div class="fb-who">
            <div class="fb-name"><?= e($item['name'] ?? 'Guest') ?></div>
            <div class="fb-meta"><?= e(($item['service'] ?? '') !== '' ? $item['service'] : 'Customer') ?></div>
          </div>
          <div class="fb-stars"><?= e(str_repeat('★', (int) ($item['rating'] ?? 5)) . str_repeat('☆', max(0, 5 - (int) ($item['rating'] ?? 5)))) ?></div>
        </div>
        <p class="fb-text"><?= e($item['text'] ?? '') ?></p>
      </article>
<?php endforeach; ?>
<?php endif; ?>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>Frequently asked questions</h2>
      <p>Short answers to the most common ordering and support questions.</p>
    </div>
    <div class="faq-list">
<?php foreach ($faqItems as $item): ?>
      <article class="card faq-card">
        <h3><?= e($item['question']) ?></h3>
        <p><?= e($item['answer']) ?></p>
      </article>
<?php endforeach; ?>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
