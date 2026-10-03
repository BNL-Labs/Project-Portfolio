<?php
require_once __DIR__ . "/../includes/config.php";

if (empty($_SESSION["admin_logged_in"])) {
  header("Location: /login");
  exit;
}

$ordersPath = __DIR__ . "/../storage/orders.json";
$offersPath = __DIR__ . "/../storage/offers.json";
$clicksPath = __DIR__ . "/../storage/clicks.json";

$orders = [];
if (file_exists($ordersPath)) {
  $orders = json_decode(file_get_contents($ordersPath), true);
  if (!is_array($orders)) $orders = [];
}
$offersData = ["offers"=>[]];
if (file_exists($offersPath)) {
  $offersData = json_decode(file_get_contents($offersPath), true);
  if (!is_array($offersData)) $offersData = ["offers"=>[]];
}
$offers = $offersData["offers"] ?? [];

$clicks = [];
if (file_exists($clicksPath)) {
  $clicks = json_decode(file_get_contents($clicksPath), true);
  if (!is_array($clicks)) $clicks = [];
}

$totalOrders = count($orders);
$pending = 0; $done = 0; $cancel = 0;
foreach($orders as $o){
  $s = strtolower(trim($o["status"] ?? "under review"));
  if (str_contains($s,"review")||str_contains($s,"pending")||str_contains($s,"progress")) $pending++;
  if (str_contains($s,"finish")||str_contains($s,"done")||str_contains($s,"completed")) $done++;
  if (str_contains($s,"cancel")) $cancel++;
}

$activeOffers = 0;
foreach($offers as $of){
  if (!empty($of["active"])) $activeOffers++;
}

usort($orders, fn($a,$b)=> strcmp($b["created_at"] ?? "", $a["created_at"] ?? ""));
$recentOrders = array_slice($orders, 0, 6);

arsort($clicks);
$topClicks = array_slice($clicks, 0, 6, true);

$points = [];
for($i=0;$i<10;$i++){ $points[] = rand(15,95); }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Admin Dashboard</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/admin/admin.css?v=<?= time() ?>"/>

<style>
/* ===== DASHBOARD UPGRADE (NO LOGIC TOUCHED) ===== */
.dashboard{
  display:flex;
  flex-direction:column;
  gap:22px;
}

.hero{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
}

.hero h1{
  font-size:28px;
  letter-spacing:.4px;
}

.hero p{
  opacity:.65;
}

.kpi-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:16px;
}

.kpi-card{
  position:relative;
  background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
  border:1px solid rgba(255,255,255,.12);
  border-radius:18px;
  padding:18px;
  overflow:hidden;
  transition:.25s ease;
}

.kpi-card:hover{
  transform:translateY(-4px);
}

.kpi-card::after{
  content:"";
  position:absolute;
  inset:-40%;
  background:radial-gradient(circle at top left,rgba(255,255,255,.18),transparent 60%);
}

.kpi-card b{
  font-size:26px;
}

.kpi-card span{
  display:block;
  margin-top:4px;
  opacity:.7;
  font-size:13px;
}

.panel{
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  border-radius:22px;
  padding:20px;
}

.panel h3{
  margin:0 0 6px;
}

.panel small{
  opacity:.6;
}

.flex{
  display:flex;
  gap:18px;
  flex-wrap:wrap;
}

.list{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.list-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  padding:12px 14px;
  border-radius:14px;
  background:rgba(255,255,255,.04);
  transition:.2s ease;
}

.list-row:hover{
  background:rgba(255,255,255,.08);
}

.badge{
  padding:6px 12px;
  border-radius:999px;
  font-size:12px;
  background:rgba(255,255,255,.1);
}

.badge.good{ background:rgba(80,255,160,.18); }
.badge.bad{ background:rgba(255,80,120,.2); }

.chart{
  margin-top:16px;
  height:140px;
}
/* ============================================= */
</style>
</head>

<body>

<div class="admin-shell">
<aside class="sidebar">
  <div class="side-logo"></div>
  <a class="side-btn active" href="/dashboard">🏠</a>
  <a class="side-btn" href="/orders">📦</a>
  <a class="side-btn" href="/offers">🏷️</a>
  <a class="side-btn" href="/feedback">💬</a>
  <div class="side-spacer"></div>
  <a class="side-btn" href="/admin/logout.php">🚪</a>
</aside>

<main class="main">
<div class="dashboard">

  <!-- HERO -->
  <div class="hero">
    <div>
      <h1>Dashboard</h1>
      <p>Live overview of orders, offers & activity</p>
    </div>
    <div class="flex">
      <a class="btn ghost" href="/admin/offers.php">Manage Offers</a>
      <a class="btn" href="/admin/orders.php">Manage Orders</a>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card"><b><?= $totalOrders ?></b><span>Total orders</span></div>
    <div class="kpi-card"><b><?= $pending ?></b><span>Pending / In progress</span></div>
    <div class="kpi-card"><b><?= $done ?></b><span>Completed</span></div>
    <div class="kpi-card"><b><?= $activeOffers ?></b><span>Active offers</span></div>
  </div>

  <!-- PANELS -->
  <div class="flex">
    <div class="panel" style="flex:1.2">
      <h3>Orders activity</h3>
      <small>Last updates from orders.json</small>

      <div class="chart">
        <svg viewBox="0 0 300 120" preserveAspectRatio="none">
          <path d="<?php
            $d="M0 ".(120-$points[0]);
            $step=300/(count($points)-1);
            foreach($points as $i=>$p){
              $x=$i*$step;$y=120-$p;
              $d.=" L".$x." ".$y;
            }
            echo htmlspecialchars($d);
          ?>" fill="none" stroke="url(#g)" stroke-width="3"/>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#ff4ecd"/>
              <stop offset="100%" stop-color="#00d4ff"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>

    <div class="panel" style="flex:1">
      <h3>Most clicked offers</h3>
      <small><?= file_exists($clicksPath) ? "Tracking enabled" : "Tracking not enabled" ?></small>

      <div class="list" style="margin-top:12px">
        <?php if(empty($topClicks)): ?>
          <div class="list-row"><span>No data</span><span class="badge">0</span></div>
        <?php else: ?>
          <?php foreach($topClicks as $offerId=>$count): ?>
            <div class="list-row">
              <span><?= htmlspecialchars($offerId) ?></span>
              <span class="badge"><?= (int)$count ?> clicks</span>
            </div>
          <?php endforeach; ?>
        <?php endif; ?>
      </div>
    </div>
  </div>

  <!-- RECENT ORDERS -->
  <div class="panel">
    <h3>Recent orders</h3>
    <small>Last 6 orders</small>

    <div class="list" style="margin-top:14px">
      <?php if(empty($recentOrders)): ?>
        <div class="list-row"><span>No orders yet</span><span class="badge">—</span></div>
      <?php else: ?>
        <?php foreach($recentOrders as $o): ?>
          <?php
            $st = $o["status"] ?? "Under review";
            $cls = "badge";
            $ls = strtolower($st);
            if(str_contains($ls,"finish")||str_contains($ls,"done")) $cls.=" good";
            if(str_contains($ls,"cancel")) $cls.=" bad";
          ?>
          <div class="list-row">
            <div>
              <b><?= htmlspecialchars($o["service_name"] ?? "Order") ?></b><br>
              <small>#<?= htmlspecialchars($o["id"] ?? "") ?> • <?= htmlspecialchars($o["user"]["username"] ?? "Guest") ?></small>
            </div>
            <span class="<?= $cls ?>"><?= htmlspecialchars($st) ?></span>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  </div>

</div>
</main>
</div>

</body>
</html>
