<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Customer Feedbacks | UP Dofus Reviews';
$meta_description = 'Read approved UP Dofus customer feedbacks, understand the moderation process, and submit your own review after an order.';
$canonical_url = canonical_url('feedbacks');
$active = 'feedbacks';

$file = __DIR__ . '/storage/feedbacks.json';

function fb_read(string $path): array
{
    if (!is_file($path)) {
        return ['updated_at' => gmdate('c'), 'items' => []];
    }

    $raw = json_decode((string) file_get_contents($path), true);
    if (!is_array($raw)) {
        return ['updated_at' => gmdate('c'), 'items' => []];
    }

    $raw['items'] = isset($raw['items']) && is_array($raw['items']) ? $raw['items'] : [];
    return $raw;
}

function fb_write(string $path, array $data): void
{
    $data['updated_at'] = gmdate('c');
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
    rename($tmp, $path);
}

function fb_clean(string $value, int $max = 200): string
{
    $value = trim(preg_replace('/\s+/', ' ', $value) ?? '');
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}

$data = fb_read($file);
$error = '';
$submitted = !empty($_GET['submitted']);

if (!isset($_SESSION['fb_last_submit'])) {
    $_SESSION['fb_last_submit'] = 0;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    if (time() - (int) $_SESSION['fb_last_submit'] < 20) {
        $error = 'Please wait a little before submitting another feedback.';
    } else {
        $name = fb_clean((string) ($_POST['name'] ?? 'Guest'), 40);
        $service = fb_clean((string) ($_POST['service'] ?? ''), 80);
        $rating = max(1, min(5, (int) ($_POST['rating'] ?? 5)));
        $text = fb_clean((string) ($_POST['text'] ?? ''), 320);

        if (strlen($text) < 10) {
            $error = 'Please write at least 10 characters.';
        } else {
            $data['items'][] = [
                'id' => 'fb-' . bin2hex(random_bytes(6)),
                'name' => $name !== '' ? $name : 'Guest',
                'service' => $service,
                'rating' => $rating,
                'text' => $text,
                'created_at' => gmdate('c'),
                'approved' => false,
            ];

            fb_write($file, $data);
            $_SESSION['fb_last_submit'] = time();
            header('Location: ' . route_url('feedbacks', ['submitted' => 1]) . '#leave');
            exit;
        }
    }
}

$items = array_values(array_filter($data['items'] ?? [], static fn($item) => !empty($item['approved'])));
usort($items, static fn($a, $b) => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));

$totalApproved = count($items);
$avg = 0;
if ($totalApproved > 0) {
    $sum = array_reduce($items, static fn($carry, $item) => $carry + (int) ($item['rating'] ?? 5), 0);
    $avg = round($sum / $totalApproved, 1);
}

$json_ld = [];
if ($totalApproved > 0) {
    $reviewNodes = array_map(
        static fn(array $item) => [
            '@type' => 'Review',
            'reviewRating' => [
                '@type' => 'Rating',
                'ratingValue' => (int) ($item['rating'] ?? 5),
                'bestRating' => 5,
            ],
            'author' => [
                '@type' => 'Person',
                'name' => (string) ($item['name'] ?? 'Customer'),
            ],
            'reviewBody' => (string) ($item['text'] ?? ''),
            'datePublished' => substr((string) ($item['created_at'] ?? ''), 0, 10),
        ],
        array_slice($items, 0, 6)
    );

    $json_ld[] = [
        '@type' => 'Service',
        'name' => 'UP Dofus customer reviews',
        'url' => canonical_url('feedbacks'),
        'provider' => ['@id' => rtrim($SITE_URL, '/') . '/#organization'],
        'aggregateRating' => [
            '@type' => 'AggregateRating',
            'ratingValue' => $avg,
            'reviewCount' => $totalApproved,
            'bestRating' => 5,
        ],
        'review' => $reviewNodes,
    ];
}

include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <span class="badge">Approved reviews only, with moderation before publishing</span>
      <h1>Customer feedbacks that reinforce trust.</h1>
      <p>Reviews on this page are moderated before going live. The goal is to keep the feedback section useful, credible, and aligned with the real storefront experience.</p>
    </div>

    <div class="split-section">
      <div class="card pad">
        <h2>Review overview</h2>
        <div class="stats">
          <div class="stat"><b><?= e((string) $totalApproved) ?></b><span>Approved reviews</span></div>
          <div class="stat"><b><?= $avg > 0 ? e((string) $avg) : '—' ?></b><span>Average rating</span></div>
          <div class="stat"><b>Moderated</b><span>Checked before public display</span></div>
        </div>
      </div>
      <div class="card pad">
        <h2>What we moderate for</h2>
        <ul class="check-list">
          <li>Real order-related feedback rather than spam.</li>
          <li>Clear wording that helps future customers.</li>
          <li>Respectful, readable public reviews.</li>
        </ul>
      </div>
    </div>

    <div class="toolbar">
      <div class="search">
        <span aria-hidden="true">🔎</span>
        <input data-feedback-search placeholder="Search name, service, or review text..." aria-label="Search feedbacks">
      </div>
      <div class="chip-row">
        <button class="chip active" type="button" data-stars-filter="all">All</button>
        <button class="chip" type="button" data-stars-filter="5">5★</button>
        <button class="chip" type="button" data-stars-filter="4">4★+</button>
        <button class="chip" type="button" data-stars-filter="3">3★+</button>
      </div>
    </div>

    <div class="fb-grid" data-feedback-grid>
<?php if ($items === []): ?>
      <div class="notice" style="grid-column:1/-1;">No approved feedbacks yet. Be the first to leave one below.</div>
<?php else: ?>
<?php foreach ($items as $item): ?>
<?php
    $rating = (int) ($item['rating'] ?? 5);
    $hay = strtolower((string) (($item['name'] ?? '') . ' ' . ($item['service'] ?? '') . ' ' . ($item['text'] ?? '')));
?>
      <article class="fb-card" data-feedback-card data-stars="<?= e((string) $rating) ?>" data-hay="<?= e($hay) ?>">
        <div class="fb-top">
          <div class="fb-avatar"><?= e(strtoupper(mb_substr((string) ($item['name'] ?? 'G'), 0, 1))) ?></div>
          <div class="fb-who">
            <div class="fb-name"><?= e($item['name'] ?? 'Guest') ?></div>
            <div class="fb-meta"><?= e(($item['service'] ?? '') !== '' ? $item['service'] : 'Customer') ?> · <?= e(substr((string) ($item['created_at'] ?? ''), 0, 10)) ?></div>
          </div>
          <div class="fb-stars"><?= e(str_repeat('★', $rating) . str_repeat('☆', max(0, 5 - $rating))) ?></div>
        </div>
        <p class="fb-text"><?= e($item['text'] ?? '') ?></p>
      </article>
<?php endforeach; ?>
<?php endif; ?>
    </div>

    <div id="leave" class="card pad feedback-form-wrap">
      <div class="section-head section-head-inline">
        <div>
          <h2>Leave your feedback</h2>
          <p>Your review is submitted privately first and appears only after moderation.</p>
        </div>
        <a class="btn ghost" href="<?= e(route_url('support')) ?>">Need help?</a>
      </div>

<?php if ($submitted): ?>
      <div class="notice success"><strong>Thanks.</strong> Your feedback was submitted and is waiting for approval.</div>
<?php endif; ?>
<?php if ($error !== ''): ?>
      <div class="notice warn"><strong>Feedback not submitted.</strong> <?= e($error) ?></div>
<?php endif; ?>

      <form class="form" method="post" data-track-submit="feedback_submit">
        <?= csrf_field() ?>
        <div class="split-section">
          <div class="field">
            <label for="fb-name">Name</label>
            <input id="fb-name" name="name" placeholder="Optional display name">
          </div>
          <div class="field">
            <label for="fb-service">Service</label>
            <input id="fb-service" name="service" placeholder="Optional service name">
          </div>
        </div>
        <div class="field">
          <label for="fb-rating">Rating</label>
          <select id="fb-rating" name="rating">
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★☆ (4)</option>
            <option value="3">★★★☆☆ (3)</option>
            <option value="2">★★☆☆☆ (2)</option>
            <option value="1">★☆☆☆☆ (1)</option>
          </select>
        </div>
        <div class="field">
          <label for="fb-text">Your feedback</label>
          <textarea id="fb-text" name="text" rows="5" placeholder="Tell us about the speed, communication, or support experience."></textarea>
        </div>
        <div class="cta">
          <button class="btn" type="submit">Submit feedback</button>
          <a class="btn ghost" href="<?= e(route_url('support')) ?>">Open support</a>
        </div>
      </form>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
