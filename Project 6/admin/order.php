<?php
require_once __DIR__ . "/../includes/config.php";

if (empty($_SESSION["admin_logged_in"])) {
  header("Location: /admin/login.php");
  exit;
}

$path = __DIR__ . "/../storage/orders.json";
$orders = [];
if (file_exists($path)) {
  $orders = json_decode(file_get_contents($path), true);
  if (!is_array($orders)) $orders = [];
}

$id = trim((string)($_GET["id"] ?? ""));
if ($id === "") {
  http_response_code(400);
  exit("Missing order id.");
}

$idx = -1;
for ($i = 0; $i < count($orders); $i++) {
  if ((string)($orders[$i]["id"] ?? "") === $id) {
    $idx = $i;
    break;
  }
}
if ($idx < 0) {
  http_response_code(404);
  exit("Order not found.");
}

$statuses = ["Under review","In progress","Finishing soon","Completed","Cancelled"];

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  require_csrf();

  $new_status = $_POST["status"] ?? "Under review";
  $note = trim($_POST["admin_note"] ?? "");

  if (!in_array($new_status, $statuses)) {
    $new_status = "Under review";
  }

  $orders[$idx]["status"] = $new_status;
  $orders[$idx]["status_updated_at"] = date("c");
  $orders[$idx]["admin_note"] = $note;

  file_put_contents(
    $path,
    json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
  );

  header("Location: /admin/order.php?id=" . urlencode($id));
  exit;
}

$o = $orders[$idx];

function status_pill_class($st){
  $ls = strtolower(trim((string)$st));
  if (str_contains($ls,"cancel")) return "pill bad";
  if (str_contains($ls,"complete") || str_contains($ls,"done") || str_contains($ls,"finish")) return "pill good";
  if (str_contains($ls,"progress")) return "pill warn";
  return "pill";
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Manage Order <?= htmlspecialchars($id) ?></title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="/admin/admin.css?v=<?= time() ?>">
  <style>
    .grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;}
    @media (max-width: 980px){ .grid{grid-template-columns:1fr;} }
    .kv{display:grid;grid-template-columns:160px 1fr;gap:10px;margin:8px 0;}
    .kv b{color:rgba(255,255,255,.72);font-size:13px;letter-spacing:.08em;text-transform:uppercase;}
    .kv span{color:rgba(255,255,255,.92);}
    .titleRow{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
  </style>
</head>
<body>

<div class="layout">
  <?php include __DIR__ . "/partials/sidebar.php"; ?>

  <main class="content">
    <div class="admin-top titleRow">
      <div>
        <h1>Manage Order</h1>
        <p class="sub">Order ID: <b><?= htmlspecialchars($id) ?></b></p>
      </div>
      <a class="btn ghost" href="/admin/orders.php">← Back</a>
    </div>

    <div class="grid">

      <section class="card pad">
        <div class="row" style="margin-bottom:8px;">
          <b>Order Details</b>
          <span class="<?= status_pill_class($o["status"] ?? "Under review") ?>">
            <?= htmlspecialchars($o["status"] ?? "Under review") ?>
          </span>
        </div>

        <div class="kv"><b>Service</b><span><?= htmlspecialchars($o["service_name"] ?? "") ?></span></div>
        <div class="kv"><b>User</b><span>
          <?= htmlspecialchars($o["user"]["username"] ?? "Guest") ?>
          <span style="color:rgba(255,255,255,.55)"> (Discord: <?= htmlspecialchars($o["user"]["discord_id"] ?? "—") ?>)</span>
        </span></div>
        <div class="kv"><b>Email</b><span><?= htmlspecialchars($o["user"]["email"] ?? "—") ?></span></div>
        <div class="kv"><b>Server</b><span><?= htmlspecialchars($o["server"] ?? "") ?></span></div>
        <div class="kv"><b><?= htmlspecialchars($o["bonus_label"] ?? "Bonus") ?></b><span><?= htmlspecialchars($o["bonus"] ?? "") ?></span></div>
        <div class="kv"><b>Quantity</b><span><?= (int)($o["qty"] ?? 1) ?></span></div>
        <div class="kv"><b>Total</b><span><?= htmlspecialchars(($o["total"] ?? 0) . " " . ($o["currency"] ?? "")) ?></span></div>

        <hr class="hr">

        <div class="notice">
          <b>Updated:</b>
          <span class="sub"><?= htmlspecialchars($o["status_updated_at"] ?? $o["created_at"] ?? "") ?></span>
        </div>
      </section>

      <section class="card pad">
        <b>Update Status</b>
        <p class="sub" style="margin-top:6px;">Change status + write a note shown to the user.</p>

        <form method="post" style="margin-top:12px;">
          <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_token()) ?>"/>

          <label class="sub" style="display:block;margin:10px 0 6px;">Status</label>
          <select name="status">
            <?php foreach ($statuses as $s): ?>
              <option <?= (($o["status"] ?? "") === $s) ? "selected" : "" ?>>
                <?= htmlspecialchars($s) ?>
              </option>
            <?php endforeach; ?>
          </select>

          <label class="sub" style="display:block;margin:12px 0 6px;">Admin note (shown to the user)</label>
          <textarea name="admin_note" rows="5"><?= htmlspecialchars($o["admin_note"] ?? "") ?></textarea>

          <div style="height:12px"></div>
          <button class="btn" type="submit">Save changes</button>
        </form>
      </section>

    </div>

  </main>
</div>

</body>
</html>
