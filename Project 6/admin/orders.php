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

  // ✅ DELETE order (same logic)
  if ($_SERVER["REQUEST_METHOD"] === "POST") {
    require_csrf();

    $action = $_POST["action"] ?? "";
    $id = trim((string)($_POST["id"] ?? ""));

    if ($action === "delete" && $id !== "") {
      $before = count($orders);
      $orders = array_values(array_filter($orders, function($o) use ($id){
        return (string)($o["id"] ?? "") !== $id;
      }));

      if (count($orders) !== $before) {
        file_put_contents($path, json_encode($orders, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
      }

      header("Location: /admin/orders.php?ok=1");
      exit;
    }
  }
}

// search + filter (same logic)
$q = trim($_GET["q"] ?? "");
$status = trim($_GET["status"] ?? "");

$filtered = $orders;

if ($q !== "") {
  $qq = mb_strtolower($q);
  $filtered = array_values(array_filter($filtered, function($o) use ($qq){
    $id = (string)($o["id"] ?? "");
    $email = mb_strtolower((string)($o["user"]["email"] ?? ""));
    $server = mb_strtolower((string)($o["server"] ?? ""));
    return (mb_strpos(mb_strtolower($id), $qq) !== false)
        || (mb_strpos($email, $qq) !== false)
        || (mb_strpos($server, $qq) !== false);
  }));
}

if ($status !== "") {
  $ss = mb_strtolower($status);
  $filtered = array_values(array_filter($filtered, function($o) use ($ss){
    $s = mb_strtolower(trim((string)($o["status"] ?? "Under review")));
    return $s === $ss;
  }));
}

// sort newest first (same logic)
usort($filtered, function($a,$b){
  return strcmp(($b["created_at"] ?? ""), ($a["created_at"] ?? ""));
});

$statuses = ["Under review","In progress","Finishing soon","Completed","Cancelled"];

// quick stats (UI only)
$total = count($orders);
$pending = 0; $done = 0; $cancel = 0;
foreach($orders as $o){
  $s = strtolower(trim((string)($o["status"] ?? "under review")));
  if (str_contains($s,"review") || str_contains($s,"progress")) $pending++;
  if (str_contains($s,"complete") || str_contains($s,"done") || str_contains($s,"finish")) $done++;
  if (str_contains($s,"cancel")) $cancel++;
}

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
  <title>Admin — Orders</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="/admin/admin.css?v=<?= time() ?>">
  <style>
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:14px;}
    .stat{padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);}
    .stat b{display:block;font-size:20px;}
    .stat small{color:rgba(255,255,255,.55);}
    .filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
    .filters .in{min-width:240px}
    .row-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;white-space:nowrap;}
    .clickRow{cursor:pointer;}
    .clickRow td{transition:.12s ease;}
    .clickRow:hover td{transform:translateY(-1px);}
  </style>
</head>
<body>

<div class="layout">
  <?php include __DIR__ . "/partials/sidebar.php"; ?>

  <main class="content">
    <div class="admin-top">
      <div>
        <h1>Orders</h1>
        <p class="sub">Search, filter, and manage orders.</p>
      </div>
    </div>

    <?php if (!empty($_GET["ok"])): ?>
      <div class="notice" style="margin-bottom:14px;">✅ Order deleted.</div>
    <?php endif; ?>

    <div class="stats">
      <div class="stat"><b><?= (int)$total ?></b><small>Total orders</small></div>
      <div class="stat"><b><?= (int)$pending ?></b><small>Pending / In progress</small></div>
      <div class="stat"><b><?= (int)$done ?></b><small>Completed</small></div>
      <div class="stat"><b><?= (int)$cancel ?></b><small>Cancelled</small></div>
    </div>

    <div class="card pad" style="margin-bottom:14px;">
      <form method="get" class="filters">
        <input class="in" name="q" value="<?= htmlspecialchars($q) ?>" placeholder="Search id / email / server">
        <select class="in" name="status">
          <option value="">All statuses</option>
          <?php foreach($statuses as $st): ?>
            <option value="<?= htmlspecialchars($st) ?>" <?= ($status===$st ? "selected" : "") ?>>
              <?= htmlspecialchars($st) ?>
            </option>
          <?php endforeach; ?>
        </select>
        <button class="btn" type="submit">Filter</button>
        <a class="btn ghost" href="/admin/orders.php">Reset</a>
      </form>
    </div>

    <div class="card pad">
      <div class="wrap">
        <table class="table" id="ordersTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Created</th>
              <th>Server</th>
              <th>Email</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
          <?php if (empty($filtered)): ?>
            <tr><td colspan="6" style="opacity:.7;">No orders found.</td></tr>
          <?php else: ?>
            <?php foreach($filtered as $o):
              $oid = (string)($o["id"] ?? "");
              $st = (string)($o["status"] ?? "Under review");
            ?>
              <tr class="clickRow" data-href="/admin/order.php?id=<?= urlencode($oid) ?>">
                <td><b><?= htmlspecialchars($oid) ?></b></td>
                <td><?= htmlspecialchars($o["created_at"] ?? "-") ?></td>
                <td><?= htmlspecialchars($o["server"] ?? "-") ?></td>
                <td><?= htmlspecialchars($o["user"]["email"] ?? "-") ?></td>
                <td><span class="<?= status_pill_class($st) ?>"><?= htmlspecialchars($st) ?></span></td>
                <td style="text-align:right;">
                  <div class="row-actions">
                    <a class="btn small" href="/admin/order.php?id=<?= urlencode($oid) ?>">Manage</a>

                    <form method="post" style="display:inline" onsubmit="return confirm('Delete this order permanently?');">
                      <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_token()) ?>">
                      <input type="hidden" name="action" value="delete">
                      <input type="hidden" name="id" value="<?= htmlspecialchars($oid) ?>">
                      <button class="btn danger small" type="submit">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>

  </main>
</div>

<script>
  // UX only: click row to open manage page (doesn't change backend)
  document.querySelectorAll(".clickRow").forEach(tr=>{
    tr.addEventListener("click", (e)=>{
      if (e.target.closest("a,button,form,input,select,textarea,label")) return;
      const href = tr.getAttribute("data-href");
      if (href) location.href = href;
    });
  });
</script>

</body>
</html>
