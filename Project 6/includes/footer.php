  </main>
  <footer class="footer">
    <div class="container">
      <div class="footgrid">
        <div class="footer-panel">
          <div class="footer-brand">
            <img class="brand-logo" src="/assets/img/up-logo.ico" alt="UP Dofus logo">
            <div>
              <div class="footer-title"><?= e($SITE_NAME) ?></div>
              <p class="mini"><?= e($SITE_TAGLINE) ?></p>
            </div>
          </div>
          <p class="mini footer-copy">
            Trusted Dofus power-leveling, account services, and responsive ticket support with confirmation before every order starts.
          </p>
          <div class="footer-trust">
            <span class="trust-pill">Order confirmation before work starts</span>
            <span class="trust-pill">Discord ticket updates</span>
            <span class="trust-pill">Clear support follow-up</span>
          </div>
        </div>

        <div class="footer-panel">
          <h2 class="footer-heading">Explore</h2>
          <div class="footlinks">
            <a href="<?= e(route_url('services')) ?>">Services</a>
            <a href="<?= e(route_url('packages')) ?>">Packages</a>
            <a href="<?= e(route_url('feedbacks')) ?>">Feedbacks</a>
            <a href="<?= e(route_url('support')) ?>">Support</a>
            <a href="<?= e(route_url('about')) ?>">About</a>
          </div>
        </div>

        <div class="footer-panel">
          <h2 class="footer-heading">Trust & Help</h2>
          <div class="footlinks">
            <a href="<?= e(route_url('privacy')) ?>">Privacy Policy</a>
            <a href="<?= e(route_url('terms')) ?>">Terms of Service</a>
<?php if ($DISCORD_SERVER_INVITE !== ''): ?>
            <a href="<?= e($DISCORD_SERVER_INVITE) ?>" target="_blank" rel="noreferrer" <?= analytics_attrs('discord_join_click', ['location' => 'footer']) ?>>Join Discord</a>
<?php endif; ?>
<?php if ($SUPPORT_EMAIL !== ''): ?>
            <a href="mailto:<?= e($SUPPORT_EMAIL) ?>"><?= e($SUPPORT_EMAIL) ?></a>
<?php endif; ?>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <span class="mini">© <?= date('Y') ?> <?= e($SITE_NAME) ?>. All rights reserved.</span>
        <span class="mini">Sitemap: <a href="/sitemap.xml">/sitemap.xml</a></span>
      </div>
    </div>
  </footer>

  <script>
    window.UPDOFUS = <?= json_encode([
        'eventEndpoint' => '/track/event.php',
        'clickEndpoint' => '/track/click.php',
        'localEventLog' => $ENABLE_LOCAL_EVENT_LOG,
        'gaMeasurementId' => $GA_MEASUREMENT_ID,
        'gtmContainerId' => $GTM_CONTAINER_ID,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
  </script>
  <script src="/assets/js/app.js?v=20260410"></script>
</body>
</html>
