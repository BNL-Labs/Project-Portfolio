<?php
require_once __DIR__ . "/../includes/config.php";

if (empty($_SESSION["admin_logged_in"])) {
  header("Location: /admin/login.php");
  exit;
}

$OFFERS_FILE = __DIR__ . "/../storage/offers.json";

function read_offers_file($path){
  if(!file_exists($path)){
    return ["updated_at"=>gmdate("c"), "offers"=>[]];
  }
  $raw = file_get_contents($path);
  $data = json_decode($raw, true);
  if(!is_array($data)) return ["updated_at"=>gmdate("c"), "offers"=>[]];
  if(!isset($data["offers"]) || !is_array($data["offers"])) {
    $data["offers"] = [];
  }
  return $data;
}

function write_offers_file($path, $data){
  $data["updated_at"] = gmdate("c");
  $json = json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
  $tmp = $path . ".tmp";
  file_put_contents($tmp, $json, LOCK_EX);
  rename($tmp, $path);
}

$data = read_offers_file($OFFERS_FILE);

if($_SERVER["REQUEST_METHOD"] === "POST"){
  $action = $_POST["action"] ?? "";
  $id = trim($_POST["id"] ?? "");

  if($action === "delete" && $id !== ""){
    $data["offers"] = array_values(
      array_filter($data["offers"], fn($o)=>($o["id"] ?? "") !== $id)
    );
    write_offers_file($OFFERS_FILE, $data);
    header("Location: /admin/offers.php?ok=1");
    exit;
  }

  if($action === "toggle" && $id !== ""){
    foreach($data["offers"] as &$o){
      if(($o["id"] ?? "") === $id){
        $o["active"] = empty($o["active"]);
        break;
      }
    }
    unset($o);
    write_offers_file($OFFERS_FILE, $data);
    header("Location: /admin/offers.php?ok=1");
    exit;
  }
}

$offers = $data["offers"];

usort($offers, function($a,$b){
  $sa = intval($a["sort"] ?? 999);
  $sb = intval($b["sort"] ?? 999);
  if($sa === $sb) return strcmp($a["title"] ?? "", $b["title"] ?? "");
  return $sa <=> $sb;
});
?>

<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Admin — Offers</title>
<meta name="robots" content="noindex, nofollow">

<link rel="stylesheet" href="/admin/admin.css?v=<?= time() ?>">

<style>

/* ===== Offers Admin UI ===== */

.searchbar{
display:flex;
gap:12px;
flex-wrap:wrap;
margin-bottom:16px;
}

.searchbar input{
flex:1;
min-width:220px;
padding:10px 14px;
border-radius:10px;
border:1px solid rgba(255,255,255,.1);
background:rgba(255,255,255,.04);
color:white;
}

.table-wrap{
overflow:auto;
}

.status-pill{
padding:4px 10px;
border-radius:20px;
font-size:12px;
font-weight:600;
}

.status-active{
background:rgba(0,255,170,.12);
color:#00ffb3;
}

.status-hidden{
background:rgba(255,100,100,.12);
color:#ff6b6b;
}

.actions{
display:flex;
gap:6px;
flex-wrap:wrap;
}

.offer-row:hover{
background:rgba(255,255,255,.03);
}

.stat-grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
gap:12px;
margin-bottom:18px;
}

.stat{
background:rgba(255,255,255,.04);
padding:14px;
border-radius:12px;
border:1px solid rgba(255,255,255,.06);
}

.stat b{
font-size:18px;
display:block;
}

</style>

</head>
<body>

<div class="layout">

<?php include __DIR__ . "/partials/sidebar.php"; ?>

<main class="content">

<div class="admin-top">
<div>
<h1>Offers</h1>
<p class="sub">Manage Services & Store offers from one place.</p>
</div>

<a class="btn" href="/admin/offer-edit.php">+ Add offer</a>
</div>

<?php
$total = count($offers);
$active = count(array_filter($offers, fn($o)=>!empty($o["active"])));
$hidden = $total - $active;
?>

<div class="stat-grid">

<div class="stat">
<b><?= $total ?></b>
Total Offers
</div>

<div class="stat">
<b><?= $active ?></b>
Active
</div>

<div class="stat">
<b><?= $hidden ?></b>
Hidden
</div>

</div>


<div class="card pad">

<div class="searchbar">
<input type="text" id="search" placeholder="Search offers...">
</div>

<div class="table-wrap">

<table class="table" id="offersTable">

<thead>
<tr>
<th>ID</th>
<th>Section</th>
<th>Title</th>
<th>Price</th>
<th>Status</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

<?php foreach($offers as $o): ?>

<tr class="offer-row">

<td>
<code><?= htmlspecialchars($o["id"] ?? "") ?></code>
</td>

<td>
<?= htmlspecialchars($o["section"] ?? "") ?>
</td>

<td>
<b><?= htmlspecialchars($o["title"] ?? "") ?></b><br>
<span class="sub"><?= htmlspecialchars($o["subtitle"] ?? "") ?></span>
</td>

<td>
<?= htmlspecialchars((string)($o["price"] ?? "")) ?>
<?= htmlspecialchars($o["price_unit"] ?? "") ?>
</td>

<td>

<?php if(!empty($o["active"])): ?>
<span class="status-pill status-active">Active</span>
<?php else: ?>
<span class="status-pill status-hidden">Hidden</span>
<?php endif; ?>

</td>

<td>

<div class="actions">

<a class="btn ghost"
href="/admin/offer-edit.php?id=<?= urlencode($o["id"] ?? "") ?>">
Edit
</a>

<form method="post">
<input type="hidden" name="action" value="toggle">
<input type="hidden" name="id" value="<?= htmlspecialchars($o["id"] ?? "") ?>">
<button class="btn ghost" type="submit">
<?= !empty($o["active"]) ? "Hide" : "Show" ?>
</button>
</form>

<form method="post"
onsubmit="return confirm('Delete this offer?');">

<input type="hidden" name="action" value="delete">
<input type="hidden" name="id" value="<?= htmlspecialchars($o["id"] ?? "") ?>">

<button class="btn ghost" type="submit">
Delete
</button>

</form>

</div>

</td>

</tr>

<?php endforeach; ?>

<?php if(empty($offers)): ?>

<tr>
<td colspan="6" style="opacity:.6">
No offers yet.
</td>
</tr>

<?php endif; ?>

</tbody>
</table>

</div>
</div>

</main>
</div>

<script>

/* ===== Live Search ===== */

const search = document.getElementById("search");
const rows = document.querySelectorAll("#offersTable tbody tr");

search.addEventListener("keyup", function(){

const value = this.value.toLowerCase();

rows.forEach(row=>{

row.style.display =
row.innerText.toLowerCase().includes(value)
? ""
: "none";

});

});

</script>

</body>
</html>
