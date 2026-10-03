<?php
require_once __DIR__ . '/includes/config.php';

$page_title = 'Support | Contact UP Dofus';
$meta_description = 'Contact UP Dofus for custom requests, order questions, and support. Discord is the fastest option, with a contact form available as backup.';
$canonical_url = canonical_url('support');
$active = 'support';

$sent = false;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $name = trim((string) ($_POST['name'] ?? ''));
    $contact = trim((string) ($_POST['contact'] ?? ''));
    $message = trim((string) ($_POST['message'] ?? ''));

    if ($name === '' || $contact === '' || $message === '') {
        $error = 'Please fill in all support fields.';
    } else {
        $safeName = preg_replace('/[\r\n]+/', ' ', $name);
        $safeContact = preg_replace('/[\r\n]+/', ' ', $contact);
        $safeMessage = trim(preg_replace('/\r\n|\r/', "\n", $message) ?? '');

        if ($SUPPORT_EMAIL !== '' && filter_var($SUPPORT_EMAIL, FILTER_VALIDATE_EMAIL)) {
            $subject = '[UP DOFUS] Support request from ' . $safeName;
            $body = "Name: {$safeName}\nContact: {$safeContact}\n\n{$safeMessage}\n";
            @mail($SUPPORT_EMAIL, $subject, $body);
        }

        $logLine = date('c') . ' | ' . $safeName . ' | ' . $safeContact . ' | ' . str_replace(["\n", "\r"], ' ', $safeMessage) . PHP_EOL;
        @file_put_contents(__DIR__ . '/storage/support.log', $logLine, FILE_APPEND);

        $sent = true;
    }
}

include __DIR__ . '/includes/header.php';
?>
<section class="section">
  <div class="container">
    <div class="page-hero card pad">
      <h1>Support and custom requests</h1>
      <p>Discord is the fastest support route for new orders, custom quotes, and ticket follow-up. Use the form below if you want to contact us directly from the site.</p>
    </div>

<?php if ($sent): ?>
    <div class="notice success"><strong>Message received.</strong> We saved your request and will follow up through the contact details you provided.</div>
<?php elseif ($error !== ''): ?>
    <div class="notice warn"><strong>Message not sent.</strong> <?= e($error) ?></div>
<?php endif; ?>

    <div class="split-section">
      <div class="card pad">
        <h2>Best contact options</h2>
        <div class="contact-list">
<?php if ($DISCORD_SERVER_INVITE !== ''): ?>
          <a class="link-card" href="<?= e($DISCORD_SERVER_INVITE) ?>" target="_blank" rel="noreferrer" <?= analytics_attrs('discord_join_click', ['location' => 'support_page']) ?>>
            <strong>Join Discord</strong>
            <span>Fastest route for order follow-up and support tickets.</span>
          </a>
<?php endif; ?>
          <div class="link-card">
            <strong>Ticket-first support</strong>
            <span>Mention your order ID in <?= e($ORDER_CHANNEL_HINT) ?> so the team can find the request faster.</span>
          </div>
<?php if ($SUPPORT_EMAIL !== ''): ?>
          <a class="link-card" href="mailto:<?= e($SUPPORT_EMAIL) ?>">
            <strong>Email backup</strong>
            <span><?= e($SUPPORT_EMAIL) ?></span>
          </a>
<?php endif; ?>
        </div>
      </div>

      <div class="card pad">
        <h2>Send a message</h2>
        <form class="form" method="post" data-track-submit="support_form_submit">
          <?= csrf_field() ?>
          <div class="field">
            <label for="support-name">Your name</label>
            <input id="support-name" name="name" placeholder="Your display name" required>
          </div>
          <div class="field">
            <label for="support-contact">Discord, email, or another contact</label>
            <input id="support-contact" name="contact" placeholder="Discord username or email address" required>
          </div>
          <div class="field">
            <label for="support-message">What do you need help with?</label>
            <textarea id="support-message" name="message" placeholder="Tell us the service, server, timing, or custom request." required></textarea>
          </div>
          <button class="btn" type="submit">Send support message</button>
        </form>
      </div>
    </div>
  </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
