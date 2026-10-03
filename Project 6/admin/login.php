<?php
require_once __DIR__ . '/../includes/config.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();

    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (admin_authenticate($username, $password)) {
        admin_login($username);
        header('Location: ' . route_url('dashboard'));
        exit;
    }

    $error = 'Invalid admin credentials.';
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Login | UP Dofus</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/assets/css/style.css?v=20260410">
</head>
<body class="page-admin-login">
  <main class="admin-login-shell">
    <section class="admin-login-card">
      <a class="brand" href="<?= e(route_url('home')) ?>">
        <img class="brand-logo" src="/assets/img/up-logo.ico" alt="UP Dofus logo">
        <span class="brand-copy">
          <span class="brand-name">UP Dofus</span>
          <span class="brand-tag">Admin access</span>
        </span>
      </a>

      <div class="section-head">
        <h1>Admin Login</h1>
        <p>Use your configured admin username and password hash from the environment settings.</p>
      </div>

<?php if ($error !== ''): ?>
      <div class="notice warn"><strong>Login failed.</strong> <?= e($error) ?></div>
<?php endif; ?>

      <form class="form" method="post">
        <?= csrf_field() ?>
        <div class="field">
          <label for="admin-username">Username</label>
          <input id="admin-username" name="username" autocomplete="username" required autofocus>
        </div>
        <div class="field">
          <label for="admin-password">Password</label>
          <input id="admin-password" type="password" name="password" autocomplete="current-password" required>
        </div>
        <button class="btn" type="submit">Login</button>
      </form>
    </section>
  </main>
</body>
</html>
