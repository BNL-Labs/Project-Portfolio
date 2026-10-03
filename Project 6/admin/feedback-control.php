<?php
// admin/feedback-control.php
require_once __DIR__ . "/../includes/config.php";

if (empty($_SESSION["admin_logged_in"])) {
  header("Location: /login");
  exit;
}


$page_title = "Feedback Control";
$active = "feedbacks_control";

// Same storage used by public feedbacks.php
$FILE = __DIR__ . "/../storage/feedbacks.json";

/* ----------------- Storage helpers ----------------- */
function fb_read($path){
  if(!file_exists($path)) return ["updated_at"=>gmdate("c"), "items"=>[]];
  $raw = file_get_contents($path);
  $data = json_decode($raw, true);
  if(!is_array($data)) $data = ["updated_at"=>gmdate("c"), "items"=>[]];
  if(!isset($data["items"]) || !is_array($data["items"])) $data["items"] = [];
  return $data;
}
function fb_write($path, $data){
  $data["updated_at"] = gmdate("c");
  $json = json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  $tmp = $path . ".tmp";
  file_put_contents($tmp, $json, LOCK_EX);
  rename($tmp, $path);
}
function fb_clean($s, $max=300){
  $s = trim((string)$s);
  $s = preg_replace('/\s+/', ' ', $s);
  if(function_exists("mb_substr")) $s = mb_substr($s, 0, $max);
  else $s = substr($s, 0, $max);
  return $s;
}
function fb_h($s){ return htmlspecialchars((string)$s, ENT_QUOTES, "UTF-8"); }

$data = fb_read($FILE);
$items = $data["items"] ?? [];

$flash = "";
$flash_type = "ok";

/* ----------------- Actions ----------------- */
if($_SERVER["REQUEST_METHOD"] === "POST"){
  require_csrf();
  $action = $_POST["action"] ?? "";
  $id = $_POST["id"] ?? "";
  $ids = $_POST["ids"] ?? []; // bulk

  // helper to find index by id
  $findIndex = function($id) use (&$items){
    foreach($items as $i=>$it){
      if(($it["id"] ?? "") === $id) return $i;
    }
    return -1;
  };

  if($action === "toggle_approve"){
    $idx = $findIndex($id);
    if($idx >= 0){
      $items[$idx]["approved"] = empty($items[$idx]["approved"]);
      $flash = "Updated approval status.";
    } else {
      $flash = "Feedback not found.";
      $flash_type = "err";
    }
  }

  if($action === "delete_one"){
    $idx = $findIndex($id);
    if($idx >= 0){
      array_splice($items, $idx, 1);
      $flash = "Feedback deleted.";
    } else {
      $flash = "Feedback not found.";
      $flash_type = "err";
    }
  }

  if($action === "edit_one"){
    $idx = $findIndex($id);
    if($idx >= 0){
      $name = fb_clean($_POST["name"] ?? "Guest", 40);
      $service = fb_clean($_POST["service"] ?? "", 80);
      $rating = (int)($_POST["rating"] ?? 5);
      $text = fb_clean($_POST["text"] ?? "", 500);

      if($rating < 1 || $rating > 5) $rating = 5;

      if($text === "" || strlen($text) < 3){
        $flash = "Text is too short.";
        $flash_type = "err";
      } else {
        $items[$idx]["name"] = $name !== "" ? $name : "Guest";
        $items[$idx]["service"] = $service;
        $items[$idx]["rating"] = $rating;
        $items[$idx]["text"] = $text;
        // Keep created_at, but add edited_at
        $items[$idx]["edited_at"] = gmdate("c");
        $flash = "Feedback updated.";
      }
    } else {
      $flash = "Feedback not found.";
      $flash_type = "err";
    }
  }

  if($action === "bulk_approve" || $action === "bulk_unapprove" || $action === "bulk_delete"){
    if(!is_array($ids)) $ids = [];
    $ids = array_values(array_filter($ids, fn($x)=>is_string($x) && $x !== ""));
    if(count($ids) === 0){
      $flash = "Select at least one item.";
      $flash_type = "err";
    } else {
      if($action === "bulk_delete"){
        $set = array_flip($ids);
        $items = array_values(array_filter($items, fn($it)=>empty($set[$it["id"] ?? ""])));
        $flash = "Bulk delete done.";
      } else {
        $target = ($action === "bulk_approve") ? true : false;
        $set = array_flip($ids);
        foreach($items as $i=>$it){
          $fid = $it["id"] ?? "";
          if($fid !== "" && isset($set[$fid])){
            $items[$i]["approved"] = $target;
          }
        }
        $flash = $target ? "Bulk approve done." : "Bulk unapprove done.";
      }
    }
  }

  $data["items"] = $items;
  fb_write($FILE, $data);

  // redirect to avoid resubmit
  $q = http_build_query([
    "flash" => $flash,
    "type" => $flash_type,
    "tab"  => $_GET["tab"] ?? "all",
    "q"    => $_GET["q"] ?? "",
    "sort" => $_GET["sort"] ?? "new",
  ]);
  header("Location: /feedback?$q");
  exit;
  
}

/* ----------------- UI State (filters) ----------------- */
$flash = $_GET["flash"] ?? "";
$flash_type = $_GET["type"] ?? "ok";

$tab = $_GET["tab"] ?? "all";          // all | approved | pending
$q = trim((string)($_GET["q"] ?? ""));  // search
$sort = $_GET["sort"] ?? "new";        // new | old | rating_high | rating_low

// compute stats
$total = count($items);
$approvedCount = 0;
$pendingCount = 0;
foreach($items as $it){
  if(!empty($it["approved"])) $approvedCount++;
  else $pendingCount++;
}

// filter
$filtered = $items;

// tab filter
if($tab === "approved"){
  $filtered = array_values(array_filter($filtered, fn($it)=>!empty($it["approved"])));
} elseif($tab === "pending"){
  $filtered = array_values(array_filter($filtered, fn($it)=>empty($it["approved"])));
}

// search filter
if($q !== ""){
  $qq = mb_strtolower($q);
  $filtered = array_values(array_filter($filtered, function($it) use ($qq){
    $hay = mb_strtolower(
      ($it["name"] ?? "") . " " .
      ($it["service"] ?? "") . " " .
      ($it["text"] ?? "") . " " .
      ($it["id"] ?? "")
    );
    return mb_strpos($hay, $qq) !== false;
  }));
}

// sort
$toTime = function($iso){
  $t = strtotime((string)$iso);
  return $t ? $t : 0;
};

if($sort === "old"){
  usort($filtered, fn($a,$b)=>$toTime($a["created_at"] ?? "") <=> $toTime($b["created_at"] ?? ""));
} elseif($sort === "rating_high"){
  usort($filtered, fn($a,$b)=>(int)($b["rating"] ?? 5) <=> (int)($a["rating"] ?? 5));
} elseif($sort === "rating_low"){
  usort($filtered, fn($a,$b)=>(int)($a["rating"] ?? 5) <=> (int)($b["rating"] ?? 5));
} else {
  // new
  usort($filtered, fn($a,$b)=>$toTime($b["created_at"] ?? "") <=> $toTime($a["created_at"] ?? ""));
}

function stars($n){
  $n = max(1, min(5, (int)$n));
  $out = "";
  for($i=1;$i<=5;$i++){
    $out .= $i <= $n ? "★" : "☆";
  }
  return $out;
}

?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= fb_h($page_title) ?> — Admin</title>
  <meta name="robots" content="noindex, nofollow">

  <style>
    :root{
      --bg: #0b0d12;
      --panel: rgba(255,255,255,.06);
      --panel2: rgba(255,255,255,.08);
      --line: rgba(255,255,255,.10);
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.65);
      --muted2: rgba(255,255,255,.52);
      --shadow: 0 20px 70px rgba(0,0,0,.45);
      --r: 18px;
      --r2: 14px;
      --pad: 16px;
      --grad: linear-gradient(135deg, rgba(255,0,153,.95), rgba(0,204,255,.95));
      --ok: rgba(66, 245, 170, .95);
      --err: rgba(255, 85, 120, .95);
      --warn: rgba(255, 198, 76, .95);
    }

    *{ box-sizing:border-box; }
    body{
      margin:0;
      background:
        radial-gradient(900px 500px at 20% -10%, rgba(0,204,255,.18), transparent 60%),
        radial-gradient(900px 500px at 80% -10%, rgba(255,0,153,.18), transparent 60%),
        radial-gradient(900px 500px at 50% 110%, rgba(155, 96, 255, .14), transparent 60%),
        var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji";
      line-height: 1.45;
    }

    .wrap{
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 18px 120px;
  min-height: 100vh;
}
    .topbar{
      display:flex; align-items:center; justify-content:space-between;
      gap: 14px; margin-bottom: 18px;
    }
    .brand{
      display:flex; align-items:center; gap: 12px;
    }
    .logo{
      width: 44px; height: 44px; border-radius: 14px;
      background: var(--grad);
      box-shadow: 0 14px 40px rgba(0,0,0,.35);
      position: relative;
      overflow: hidden;
    }
    .logo:after{
      content:"";
      position:absolute; inset:-40%;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 55%);
      transform: rotate(20deg);
      animation: shimmer 5.5s ease-in-out infinite;
    }
    @keyframes shimmer{
      0%,100%{ transform: rotate(20deg) translateX(-10%); opacity: .7;}
      50%{ transform: rotate(20deg) translateX(10%); opacity: 1;}
    }

    .brand h1{ font-size: 18px; margin:0; letter-spacing: .2px;}
    .brand p{ margin:0; color: var(--muted2); font-size: 13px; }

    .actions{
      display:flex; gap: 10px; flex-wrap:wrap; align-items:center; justify-content:flex-end;
    }

    .btn{
      border: 1px solid var(--line);
      background: rgba(255,255,255,.06);
      color: var(--text);
      padding: 10px 12px;
      border-radius: 12px;
      cursor: pointer;
      text-decoration:none;
      display:inline-flex; align-items:center; gap: 10px;
      transition: transform .16s ease, background .16s ease, border-color .16s ease;
      user-select:none;
    }
    .btn:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.18); background: rgba(255,255,255,.09); }
    .btn.primary{
      border: none;
      background: var(--grad);
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
    }
    .btn.primary:hover{ transform: translateY(-1px) scale(1.01); }
    .btn.danger{ border-color: rgba(255,85,120,.35); }
    .btn.danger:hover{ background: rgba(255,85,120,.10); }

    .grid{
      display:grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .panel{
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  overflow: visible; /* 🔥 allow table to show */
}

    .hero{
      padding: 18px;
      display:grid;
      grid-template-columns: 1.3fr .7fr;
      gap: 16px;
    }
    @media (max-width: 900px){
      .hero{ grid-template-columns: 1fr; }
    }

    .hero-title{ font-size: 22px; margin:0 0 6px; letter-spacing:.2px; }
    .hero-sub{ margin:0; color: var(--muted); font-size: 14px; max-width: 70ch;}
    .chips{ display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    .chip{
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.05);
      display:flex; gap: 10px; align-items: baseline;
      min-width: 180px;
    }
    .chip b{ font-size: 18px; }
    .chip span{ color: var(--muted2); font-size: 13px; }

    .tools{
      padding: 14px 18px;
      border-top: 1px solid var(--line);
      display:flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items:center;
      justify-content: space-between;
    }

    .left-tools{ display:flex; gap: 10px; flex-wrap:wrap; align-items:center; }
    .right-tools{ display:flex; gap: 10px; flex-wrap:wrap; align-items:center; justify-content:flex-end; }

    .input, .select{
      background: rgba(0,0,0,.25);
      border: 1px solid var(--line);
      color: var(--text);
      border-radius: 12px;
      padding: 10px 12px;
      outline: none;
      min-width: 220px;
      transition: border-color .16s ease, transform .16s ease;
    }
    .select{ min-width: 160px; }
    .input:focus, .select:focus{ border-color: rgba(255,255,255,.22); transform: translateY(-1px); }

    .tabs{
      display:flex; gap: 8px; flex-wrap:wrap;
      padding: 14px 18px 0;
    }
    .tab{
      padding: 9px 12px;
      border-radius: 999px;
      border: 1px solid var(--line);
      color: var(--muted);
      text-decoration:none;
      background: rgba(255,255,255,.04);
      transition: all .16s ease;
    }
    .tab:hover{ color: var(--text); border-color: rgba(255,255,255,.18); transform: translateY(-1px); }
    .tab.active{
      color: #0b0d12;
      border-color: transparent;
      background: var(--grad);
      font-weight: 700;
    }

    .table{
      width: 100%;
      border-collapse: collapse;
    }
    .thead th{
      text-align:left;
      padding: 12px 14px;
      font-size: 12px;
      color: var(--muted2);
      letter-spacing: .12em;
      text-transform: uppercase;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: rgba(0,0,0,.20);
    }
    .row td{
      padding: 14px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      vertical-align: top;
      animation: rowIn .25s ease both;
    }
    @keyframes rowIn{
      from{ opacity: 0; transform: translateY(6px); }
      to{ opacity: 1; transform: translateY(0); }
    }
    .row:hover td{ background: rgba(255,255,255,.03); }

    .mini{
      font-size: 12px; color: var(--muted2);
    }
    .idpill{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,.22);
      display:inline-block;
    }
    .badge{
      display:inline-flex; align-items:center; gap:8px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
      font-size: 12px;
      background: rgba(255,255,255,.04);
      color: var(--muted);
    }
    .dot{
      width: 8px; height: 8px; border-radius: 99px;
      background: rgba(255,255,255,.35);
      box-shadow: 0 0 0 4px rgba(255,255,255,.06);
    }
    .badge.ok .dot{ background: var(--ok); box-shadow: 0 0 0 4px rgba(66,245,170,.12); }
    .badge.warn .dot{ background: var(--warn); box-shadow: 0 0 0 4px rgba(255,198,76,.12); }

    .stars{ letter-spacing: .12em; font-size: 14px; }
    .text{
      max-width: 62ch;
      color: rgba(255,255,255,.86);
      font-size: 14px;
      margin-top: 6px;
    }
    .meta{
      display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top: 8px;
    }
    .meta .pill{
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.04);
      color: var(--muted);
      font-size: 12px;
    }

    .row-actions{
      display:flex; gap: 8px; flex-wrap:wrap;
    }
    .icon{
      width: 18px; height: 18px; display:inline-block;
      filter: drop-shadow(0 10px 20px rgba(0,0,0,.3));
    }

    .flash{
      margin: 14px 18px 0;
      padding: 12px 12px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.05);
      display:flex; align-items:center; justify-content:space-between; gap: 12px;
      animation: pop .28s ease both;
    }
    @keyframes pop{
      from{ opacity:0; transform: translateY(-6px); }
      to{ opacity:1; transform: translateY(0); }
    }
    .flash strong{ font-size: 14px; }
    .flash.ok{ border-color: rgba(66,245,170,.25); }
    .flash.err{ border-color: rgba(255,85,120,.25); }

    /* Modal */
    .modal{
      position: fixed; inset:0;
      display:none;
      align-items:center; justify-content:center;
      padding: 18px;
      background: rgba(0,0,0,.55);
      backdrop-filter: blur(10px);
      z-index: 9999;
    }
    .modal.show{ display:flex; }
    .sheet{
      width: min(760px, 100%);
      background: rgba(15,18,26,.92);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 22px;
      box-shadow: 0 30px 90px rgba(0,0,0,.6);
      overflow:hidden;
      transform: translateY(10px);
      opacity: 0;
      animation: sheetIn .22s ease forwards;
    }
    @keyframes sheetIn{
      to{ transform: translateY(0); opacity: 1; }
    }
    .sheet-head{
      padding: 16px 16px;
      display:flex; align-items:center; justify-content:space-between; gap: 10px;
      border-bottom: 1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.18);
    }
    .sheet-head h3{ margin:0; font-size: 16px; letter-spacing:.2px; }
    .sheet-body{ padding: 16px; display:grid; gap: 10px; }
    .two{
      display:grid; gap: 10px;
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 700px){
      .two{ grid-template-columns: 1fr; }
      .input, .select{ min-width: 0; width: 100%; }
    }
    .textarea{
      min-height: 120px;
      resize: vertical;
      width: 100%;
    }
    .sheet-foot{
      padding: 14px 16px;
      display:flex; justify-content:flex-end; gap: 10px; flex-wrap:wrap;
      border-top: 1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.18);
    }

    .check{
      width: 18px; height: 18px;
      accent-color: #00ccff;
      transform: translateY(2px);
      cursor:pointer;
    }

    .bulkbar{
      padding: 12px 18px;
      border-top: 1px solid var(--line);
      display:flex; justify-content:space-between; align-items:center; gap: 10px; flex-wrap:wrap;
      background: rgba(0,0,0,.18);
    }
    .bulkbar b{ font-size: 13px; color: var(--muted); }

    .hint{
      color: var(--muted2);
      font-size: 12px;
      padding: 12px 18px 18px;
    }
    .hint a{ color: rgba(255,255,255,.88); }
  </style>
</head>

<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand">
        <div class="logo" aria-hidden="true"></div>
        <div>
          <h1>Feedback Control</h1>
          <p>Moderate reviews, keep homepage clean, and approve only the best.</p>
        </div>
      </div>

      <div class="actions">
        <a class="btn" href="/feedbacks" target="_blank" rel="noopener">
          Public Feedbacks
        </a>
        <a class="btn primary" href="/dashboard">
          Dashboard
        </a>
      </div>
    </div>

    <div class="panel">
      <div class="hero">
        <div>
          <h2 class="hero-title">Manage Feedbacks</h2>
          <p class="hero-sub">
            You can Approve, unapprove, edit content, delete spam.
          </p>

          <div class="chips">
            <div class="chip"><b><?= (int)$total ?></b><span>Total</span></div>
            <div class="chip"><b><?= (int)$approvedCount ?></b><span>Approved</span></div>
            <div class="chip"><b><?= (int)$pendingCount ?></b><span>Pending</span></div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; justify-content:center; gap:10px;">
          <div class="badge <?= $pendingCount>0 ? "warn" : "" ?>">
            <span class="dot"></span>
            <span><?= $pendingCount>0 ? "Under review" : "All good — no pending" ?></span>
          </div>
          <div class="badge ok">
            <span class="dot"></span>
            <span>Approved</span>
          </div>
        </div>
      </div>

      <?php if($flash !== ""): ?>
        <div class="flash <?= fb_h($flash_type) ?>">
          <strong><?= fb_h($flash) ?></strong>
          <button class="btn" type="button" onclick="this.parentElement.remove()">Dismiss</button>
        </div>
      <?php endif; ?>

      <div class="tabs">
        <?php
          $mk = function($t) use ($tab,$q,$sort){
            return "/feedback?" . http_build_query(["tab"=>$t,"q"=>$q,"sort"=>$sort]);
          };
        ?>
        <a class="tab <?= $tab==="all"?"active":"" ?>" href="<?= fb_h($mk("all")) ?>">All</a>
        <a class="tab <?= $tab==="approved"?"active":"" ?>" href="<?= fb_h($mk("approved")) ?>">Approved</a>
        <a class="tab <?= $tab==="pending"?"active":"" ?>" href="<?= fb_h($mk("pending")) ?>">Pending</a>
      </div><br/>

      <form method="get" action="/feedback" class="tools">
        <div class="left-tools">
          <input type="hidden" name="tab" value="<?= fb_h($tab) ?>" />
          <input class="input" name="q" value="<?= fb_h($q) ?>" placeholder="Search name / service / text / id…" />
          <select class="select" name="sort">
            <option value="new" <?= $sort==="new"?"selected":"" ?>>Newest first</option>
            <option value="old" <?= $sort==="old"?"selected":"" ?>>Oldest first</option>
            <option value="rating_high" <?= $sort==="rating_high"?"selected":"" ?>>Rating: high</option>
            <option value="rating_low" <?= $sort==="rating_low"?"selected":"" ?>>Rating: low</option>
          </select>
          <button class="btn" type="submit">Apply</button>
          <a class="btn" href="/feedback">Reset</a>
        </div>

        <div class="right-tools">
          <span class="mini"><?= count($filtered) ?> results</span>
        </div>
      </form>

      <form id="bulkForm" method="post" action="/feedback?<?= fb_h(http_build_query(["tab"=>$tab,"q"=>$q,"sort"=>$sort])) ?>">
        <?= csrf_field() ?>

        <div style="overflow:auto; max-height: 70vh;">
          <table class="table">
            <thead class="thead">
              <tr>
                <th style="width:52px;">
                  <input id="checkAll" class="check" type="checkbox" title="Select all" />
                </th>
                <th style="width:180px;">Status</th>
                <th>Feedback</th>
                <th style="width:250px;">Actions</th>
              </tr>
            </thead>

            <tbody>
              <?php if(count($filtered) === 0): ?>
                <tr class="row">
                  <td colspan="4" style="padding:18px; color: rgba(255,255,255,.75);">
                    No items found.
                  </td>
                </tr>
              <?php endif; ?>

              <?php foreach($filtered as $it): 
                $fid = (string)($it["id"] ?? "");
                $approved = !empty($it["approved"]);
                $name = (string)($it["name"] ?? "Guest");
                $service = (string)($it["service"] ?? "");
                $rating = (int)($it["rating"] ?? 5);
                $text = (string)($it["text"] ?? "");
                $created = (string)($it["created_at"] ?? "");
              ?>
                <tr class="row"
                    data-id="<?= fb_h($fid) ?>"
                    data-name="<?= fb_h($name) ?>"
                    data-service="<?= fb_h($service) ?>"
                    data-rating="<?= fb_h((string)$rating) ?>"
                    data-text="<?= fb_h($text) ?>"
                    data-approved="<?= $approved ? "1" : "0" ?>"
                >
                  <td>
                    <input class="check rowCheck" type="checkbox" name="ids[]" value="<?= fb_h($fid) ?>" />
                  </td>

                  <td>
                    <div class="badge <?= $approved ? "ok" : "warn" ?>">
                      <span class="dot"></span>
                      <span><?= $approved ? "Approved" : "Pending" ?></span>
                    </div>
                    <div style="margin-top:10px;">
                      <span class="idpill"><?= fb_h($fid) ?></span>
                    </div>
                  </td>

                  <td>
                    <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                      <div style="font-weight:800; letter-spacing:.2px;"><?= fb_h($name) ?></div>
                      <?php if($service !== ""): ?>
                        <div class="mini">• <?= fb_h($service) ?></div>
                      <?php endif; ?>
                    </div>

                    <div class="stars" title="Rating: <?= (int)$rating ?>/5"><?= fb_h(stars($rating)) ?></div>
                    <div class="text"><?= fb_h($text) ?></div>

                    <div class="meta">
                      <span class="pill">Created: <?= fb_h($created) ?></span>
                      <?php if(!empty($it["edited_at"])): ?>
                        <span class="pill">Edited: <?= fb_h($it["edited_at"]) ?></span>
                      <?php endif; ?>
                    </div>
                  </td>

                  <td>
                    <div class="row-actions">
                      <button class="btn" type="button" onclick="openEdit(this)">
                        Edit
                      </button>

                      <form method="post" action="/feedback?<?= fb_h(http_build_query(["tab"=>$tab,"q"=>$q,"sort"=>$sort])) ?>" style="display:inline;">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="toggle_approve" />
                        <input type="hidden" name="id" value="<?= fb_h($fid) ?>" />
                        <button class="btn <?= $approved ? "" : "primary" ?>" type="submit">
                          <?= $approved ? "Unapprove" : "Approve" ?>
                        </button>
                      </form>

                      <form method="post" action="/feedback?<?= fb_h(http_build_query(["tab"=>$tab,"q"=>$q,"sort"=>$sort])) ?>" style="display:inline;"
                            onsubmit="return confirm('Delete this feedback? This cannot be undone.');">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="delete_one" />
                        <input type="hidden" name="id" value="<?= fb_h($fid) ?>" />
                        <button class="btn danger" type="submit">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>

        <div class="bulkbar">
          <b><span id="selCount">0</span> selected</b>
          <div class="row-actions">
            <button class="btn primary" type="submit" name="action" value="bulk_approve">Approve All</button>
            <button class="btn" type="submit" name="action" value="bulk_unapprove">Unapprove All</button>
            <button class="btn danger" type="submit" name="action" value="bulk_delete"
                    onclick="return confirm('Delete selected feedbacks? This cannot be undone.');">
              Delete All
            </button>
          </div>
        </div>

        <div class="hint">
          Review, approve, or remove submitted feedback from this dashboard.
        </div>
      </form>
    </div>
  </div>

  <!-- EDIT MODAL -->
  <div id="modal" class="modal" role="dialog" aria-modal="true" aria-hidden="true" onclick="backdropClose(event)">
    <div class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-head">
        <h3>Edit Feedback</h3>
        <button class="btn" type="button" onclick="closeModal()">Close</button>
      </div>

      <form id="editForm" method="post" action="/admin/feedback-control.php?<?= fb_h(http_build_query(["tab"=>$tab,"q"=>$q,"sort"=>$sort])) ?>">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="edit_one" />
        <input type="hidden" name="id" id="edit_id" value="" />

        <div class="sheet-body">
          <div class="two">
            <div>
              <div class="mini" style="margin-bottom:6px;">Name</div>
              <input class="input" name="name" id="edit_name" maxlength="40" />
            </div>
            <div>
              <div class="mini" style="margin-bottom:6px;">Service</div>
              <input class="input" name="service" id="edit_service" maxlength="80" />
            </div>
          </div>

          <div class="two">
            <div>
              <div class="mini" style="margin-bottom:6px;">Rating (1-5)</div>
              <select class="select" name="rating" id="edit_rating">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            <div>
              <div class="mini" style="margin-bottom:6px;">Quick actions</div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn primary" type="button" onclick="approveFromModal(true)">Approve</button>
                <button class="btn" type="button" onclick="approveFromModal(false)">Unapprove</button>
              </div>
              <div class="mini" style="margin-top:8px; color: var(--muted2);">
                (Approve/Unapprove here triggers save below.)
              </div>
            </div>
          </div>

          <div>
            <div class="mini" style="margin-bottom:6px;">Text</div>
            <textarea class="input textarea" name="text" id="edit_text" maxlength="500"></textarea>
          </div>
        </div>

        <div class="sheet-foot">
          <button class="btn" type="button" onclick="closeModal()">Cancel</button>
          <button class="btn primary" type="submit">Save changes</button>
        </div>
      </form>

      <form id="toggleForm" method="post" action="/admin/feedback-control.php?<?= fb_h(http_build_query(["tab"=>$tab,"q"=>$q,"sort"=>$sort])) ?>" style="display:none;">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="toggle_approve" />
        <input type="hidden" name="id" id="toggle_id" value="" />
      </form>
    </div>
  </div>

  <script>
    const modal = document.getElementById("modal");
    const checkAll = document.getElementById("checkAll");
    const rowChecks = () => Array.from(document.querySelectorAll(".rowCheck"));
    const selCount = document.getElementById("selCount");

    function updateSelectedCount(){
      const n = rowChecks().filter(c => c.checked).length;
      selCount.textContent = n;
    }

    checkAll?.addEventListener("change", () => {
      rowChecks().forEach(c => c.checked = checkAll.checked);
      updateSelectedCount();
    });

    document.addEventListener("change", (e) => {
      if(e.target.classList && e.target.classList.contains("rowCheck")){
        updateSelectedCount();
      }
    });

    function openEdit(btn){
      const tr = btn.closest("tr");
      if(!tr) return;

      document.getElementById("edit_id").value = tr.dataset.id || "";
      document.getElementById("edit_name").value = tr.dataset.name || "";
      document.getElementById("edit_service").value = tr.dataset.service || "";
      document.getElementById("edit_rating").value = tr.dataset.rating || "5";
      document.getElementById("edit_text").value = tr.dataset.text || "";

      document.getElementById("toggle_id").value = tr.dataset.id || "";

      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");

      setTimeout(() => document.getElementById("edit_name")?.focus(), 60);
    }

    function closeModal(){
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    }

    function backdropClose(e){
      if(e.target === modal) closeModal();
    }

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && modal.classList.contains("show")) closeModal();
    });

    function approveFromModal(wantApprove){
      // Toggle only if needed
      const tr = document.querySelector('tr[data-id="'+CSS.escape(document.getElementById("toggle_id").value)+'"]');
      if(!tr) return;

      const currentlyApproved = tr.dataset.approved === "1";
      if(wantApprove === currentlyApproved){
        alert(wantApprove ? "Already approved." : "Already pending.");
        return;
      }

      // Submit toggle form (server will redirect back)
      document.getElementById("toggleForm").submit();
    }

    // init count
    updateSelectedCount();
  </script>
</body>
</html>
