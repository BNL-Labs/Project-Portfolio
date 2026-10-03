<?php
require_once __DIR__ . "/../includes/config.php";
require_once __DIR__ . "/../includes/data.php";

if (empty($_SESSION["admin_logged_in"])) {
  header("Location: /admin/login.php");
  exit;
}

$OFFERS_FILE = __DIR__ . "/../storage/offers.json";

function read_offers_file($path){
  if(!file_exists($path)) return ["updated_at"=>gmdate("c"), "offers"=>[]];
  $raw = file_get_contents($path);
  $data = json_decode($raw, true);
  if(!is_array($data)) $data = ["updated_at"=>gmdate("c"), "offers"=>[]];
  if(!isset($data["offers"]) || !is_array($data["offers"])) $data["offers"] = [];
  return $data;
}

function write_offers_file($path, $data){
  $data["updated_at"] = gmdate("c");
  $json = json_encode($data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  $tmp = $path . ".tmp";
  file_put_contents($tmp, $json, LOCK_EX);
  rename($tmp, $path);
}

$data = read_offers_file($OFFERS_FILE);
$id = trim($_GET["id"] ?? "");
$editing = $id !== "";

// Build service options from data.php (SOURCE OF TRUTH)
$SERVICE_OPTIONS = [];
foreach ($SERVICES as $s) {
  $sid = $s["id"] ?? "";
  if ($sid === "") continue;
  $SERVICE_OPTIONS[$sid] = [
    "name" => $s["name"] ?? $sid,
    "type" => $s["type"] ?? "boosting",
  ];
}

$current = null;
foreach($data["offers"] as $o){
  if(($o["id"] ?? "") === $id){ $current = $o; break; }
}

$err = "";
if($_SERVER["REQUEST_METHOD"] === "POST"){
  $id2 = trim($_POST["id"] ?? "");
  $section = $_POST["section"] ?? "services";
  $title = trim($_POST["title"] ?? "");
  $subtitle = trim($_POST["subtitle"] ?? "");
  $price = floatval($_POST["price"] ?? 0);
  $price_unit = trim($_POST["price_unit"] ?? "Kamas");
  $cta_label = trim($_POST["cta_label"] ?? "Buy / Order");
  $sort = intval($_POST["sort"] ?? 100);
  $active = !empty($_POST["active"]);

  // ✅ SAFE: only allow selecting real services from data.php
  $service_code = trim($_POST["service_code"] ?? "");

  $bullets_raw = trim($_POST["bullets"] ?? "");
  $bullets = array_values(array_filter(array_map("trim", preg_split("/\r\n|\n|\r/", $bullets_raw))));

  if($id2 === "" || !preg_match('/^[a-z0-9\-]+$/', $id2)){
    $err = "ID required (lowercase letters/numbers/dash only).";
  } elseif($title === ""){
    $err = "Title required.";
  } elseif($service_code === "" || !isset($SERVICE_OPTIONS[$service_code])){
    $err = "Please select a valid Linked Service (Checkout).";
  } else {

    // ✅ SMART: type is auto from data.php (no admin mistakes)
    $type = $SERVICE_OPTIONS[$service_code]["type"] ?? "boosting";

    $new = [
      "id" => $id2,
      "section" => $section,
      "title" => $title,
      "subtitle" => $subtitle,
      "price" => $price,
      "price_unit" => $price_unit,
      "cta_label" => $cta_label,
      "checkout_params" => ["type"=>$type, "service"=>$service_code],
      "bullets" => $bullets,
      "active" => $active,
      "sort" => $sort
    ];

    $found = false;
    foreach($data["offers"] as $i => $o){
      if(($o["id"] ?? "") === $id2 || ($editing && ($o["id"] ?? "") === $id)){
        $data["offers"][$i] = $new;
        $found = true;
        break;
      }
    }
    if(!$found) $data["offers"][] = $new;

    write_offers_file($OFFERS_FILE, $data);
    header("Location: /admin/offers.php?ok=1");
    exit;
  }
}

$val = function($k, $default="") use ($current){
  return htmlspecialchars($current[$k] ?? $default);
};

$bulletsText = "";
if(isset($current["bullets"]) && is_array($current["bullets"])) {
  $bulletsText = implode("\n", $current["bullets"]);
}

$secVal = $current["section"] ?? "services";

// For selected service in dropdown:
$serviceVal = $current["checkout_params"]["service"] ?? "";
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Admin — <?= $editing ? "Edit" : "Add" ?> Offer</title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/admin/admin.css?v=<?= time() ?>">

<style>
/* ===== Offer Editor UI (NO LOGIC CHANGES) ===== */
:root{
  --bg:#0b0d12;
  --panel:rgba(255,255,255,.06);
  --panel2:rgba(255,255,255,.08);
  --line:rgba(255,255,255,.12);
  --text:rgba(255,255,255,.92);
  --muted:rgba(255,255,255,.62);
  --muted2:rgba(255,255,255,.50);
  --grad:linear-gradient(135deg,#ff4ecd,#00d4ff);
  --shadow:0 24px 80px rgba(0,0,0,.55);
  --r:22px;
  --r2:16px;
}

.offer-wrap{
  display:grid;
  grid-template-columns: 1.15fr .85fr;
  gap:16px;
}

@media (max-width: 980px){
  .offer-wrap{ grid-template-columns: 1fr; }
}

.panelX{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:var(--r);
  box-shadow:var(--shadow);
  overflow:hidden;
}

.panelHead{
  padding:16px 16px;
  border-bottom:1px solid rgba(255,255,255,.10);
  background:rgba(0,0,0,.16);
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}
.panelHead h2{
  margin:0;
  font-size:16px;
  letter-spacing:.2px;
}
.panelHead p{
  margin:6px 0 0;
  color:var(--muted2);
  font-size:13px;
  max-width:70ch;
}
.tag{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:8px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.05);
  font-size:12px;
  color:var(--muted);
}
.dot{
  width:8px;height:8px;border-radius:50%;
  background:rgba(255,255,255,.35);
  box-shadow:0 0 0 4px rgba(255,255,255,.06);
}
.dot.ok{ background: rgba(66,245,170,.95); box-shadow:0 0 0 4px rgba(66,245,170,.12); }
.dot.warn{ background: rgba(255,198,76,.95); box-shadow:0 0 0 4px rgba(255,198,76,.12); }

.bodyPad{ padding:16px; }

.hint{
  color:rgba(255,255,255,.65);
  font-size:13px;
  margin-top:10px;
  line-height:1.35;
}

.formGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
@media (max-width: 680px){
  .formGrid{ grid-template-columns:1fr; }
}

.fieldX{
  display:flex;
  flex-direction:column;
  gap:7px;
}
.fieldX label{
  font-size:12px;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:rgba(255,255,255,.60);
}
.inputX, .selectX, .textareaX{
  width:100%;
  padding:12px 12px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.22);
  color:var(--text);
  outline:none;
  transition: .18s ease;
  font-size:14px;
}
.textareaX{ min-height: 140px; resize: vertical; }
.inputX:focus, .selectX:focus, .textareaX:focus{
  border-color: rgba(255,255,255,.22);
  transform: translateY(-1px);
}

.row2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
@media (max-width: 680px){
  .row2{ grid-template-columns:1fr; }
}

.switch{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:12px 12px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.04);
}
.switch small{ color:var(--muted2); }
.tog{
  position:relative;
  width:46px;
  height:28px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(0,0,0,.25);
  transition:.18s ease;
  flex:0 0 auto;
}
.tog::after{
  content:"";
  position:absolute;
  width:22px; height:22px;
  top:50%; left:3px;
  transform: translateY(-50%);
  border-radius:50%;
  background:rgba(255,255,255,.82);
  transition:.18s ease;
}
.switch input{ display:none; }
.switch input:checked + .tog{
  background: linear-gradient(135deg, rgba(255,78,205,.8), rgba(0,212,255,.8));
  border-color: rgba(255,255,255,.0);
}
.switch input:checked + .tog::after{
  left: 20px;
  background: rgba(10,12,18,.95);
}

.stickyActions{
  position: sticky;
  bottom: 12px;
  padding: 12px;
  margin-top: 14px;
  border-radius: 18px;
  border:1px solid rgba(255,255,255,.12);
  background: rgba(10,12,18,.62);
  backdrop-filter: blur(10px);
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  box-shadow: 0 18px 60px rgba(0,0,0,.45);
}
@media (max-width: 560px){
  .stickyActions{ flex-direction:column; align-items:stretch; }
}
.actionsLeft{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.actionsRight{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.btnX{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:11px 12px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.06);
  color:var(--text);
  cursor:pointer;
  text-decoration:none;
  transition:.18s ease;
  user-select:none;
  white-space:nowrap;
}
.btnX:hover{ transform: translateY(-1px); background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.18); }
.btnX.primary{
  border:none;
  color:#0b0d12;
  background: var(--grad);
  box-shadow: 0 16px 52px rgba(0,0,0,.45);
}
.btnX.primary:hover{ transform: translateY(-1px) scale(1.01); }
.btnX.ghost{
  background: transparent;
}

.previewCard{
  padding:16px;
}
.previewBox{
  position:relative;
  border-radius:20px;
  border:1px solid rgba(255,255,255,.12);
  background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
  overflow:hidden;
  padding:16px;
}
.previewBox::before{
  content:"";
  position:absolute;
  inset:-50%;
  background: radial-gradient(circle at top left, rgba(255,255,255,.18), transparent 60%);
}
.previewInner{ position:relative; z-index:1; }
.previewTop{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
}
.previewTitle{
  font-size:18px;
  margin:0;
  letter-spacing:.2px;
}
.previewSub{
  margin:8px 0 0;
  color:var(--muted);
  font-size:13px;
}
.priceLine{
  margin-top:12px;
  display:flex;
  align-items:baseline;
  gap:10px;
}
.priceLine b{ font-size:22px; }
.priceLine span{ color:var(--muted2); font-size:13px; }
.previewBullets{
  margin:14px 0 0;
  padding:0 0 0 18px;
  color: rgba(255,255,255,.86);
  font-size:13px;
}
.previewCta{
  margin-top:14px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.pill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.22);
  color:var(--muted);
  font-size:12px;
}
.note{
  margin-top:12px;
  color: var(--muted2);
  font-size: 12px;
  line-height: 1.4;
}
hr.sep{
  border:none;
  height:1px;
  background:rgba(255,255,255,.10);
  margin:14px 0;
}

.noticeX{
  margin-bottom: 14px;
  padding: 12px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,80,120,.30);
  background: rgba(255,80,120,.12);
}

kbd{
  padding:2px 6px;
  border-radius:8px;
  border:1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.25);
  font-size: 12px;
  color: rgba(255,255,255,.8);
}

/* ===== keep your existing admin top spacing, but make it nicer ===== */
.admin-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  margin-bottom: 14px;
}
.admin-top h1{ margin:0; font-size:24px; letter-spacing:.2px; }
.admin-top .sub{ margin:6px 0 0; color: rgba(255,255,255,.62); }
</style>
</head>

<body>
<div class="layout">
  <?php include __DIR__ . "/partials/sidebar.php"; ?>

  <main class="content">

    <div class="admin-top">
      <div>
        <h1><?= $editing ? "Edit Offer" : "Add Offer" ?></h1>
        <p class="sub">This controls what appears on Services and Store pages.</p>
      </div>
      <a class="btn ghost" href="/admin/offers.php">← Back</a>
    </div>

    <?php if($err): ?>
      <div class="noticeX"><?= htmlspecialchars($err) ?></div>
    <?php endif; ?>

    <div class="offer-wrap">

      <!-- LEFT: EDITOR -->
      <section class="panelX">
        <div class="panelHead">
          <div>
            <h2>Offer Editor</h2>
            <p>Fill in details, choose the linked service, then save. The preview updates live.</p>
          </div>
          <div class="tag">
            <span class="dot <?= $editing ? "ok" : "warn" ?>"></span>
            <span><?= $editing ? "Editing: " . htmlspecialchars($id) : "New offer" ?></span>
          </div>
        </div>

        <div class="bodyPad">
          <form method="post" class="admin-form" id="offerForm">

            <div class="formGrid">
              <div class="fieldX">
                <label>ID (slug)</label>
                <input class="inputX" name="id" value="<?= $editing ? htmlspecialchars($id) : "" ?>" <?= $editing ? "readonly" : "" ?> placeholder="example: pl-1-200-brial">
              </div>

              <div class="fieldX">
                <label>Section</label>
                <select class="selectX" name="section" id="section">
                  <option value="services" <?= $secVal==="services"?"selected":"" ?>>Services</option>
                  <option value="store" <?= $secVal==="store"?"selected":"" ?>>Store</option>
                </select>
              </div>
            </div>

            <div style="height:12px"></div>

            <div class="fieldX">
              <label>Title</label>
              <input class="inputX" name="title" id="title" value="<?= $val("title") ?>" placeholder="PL Level 1 → 200 BRIAL">
            </div>

            <div class="fieldX" style="margin-top:12px">
              <label>Subtitle</label>
              <input class="inputX" name="subtitle" id="subtitle" value="<?= $val("subtitle") ?>" placeholder="Fast & safe leveling">
            </div>

            <div style="height:12px"></div>

            <div class="fieldX">
              <label>Linked Service (Checkout)</label>
              <select class="selectX" name="service_code" id="service_code" required>
                <option value="">— Select a service —</option>
                <?php foreach ($SERVICE_OPTIONS as $sid => $s): ?>
                  <option value="<?= htmlspecialchars($sid) ?>" <?= ($serviceVal === $sid) ? "selected" : "" ?>>
                    <?= htmlspecialchars($s["name"]) ?> — (<?= htmlspecialchars($sid) ?>) — <?= htmlspecialchars($s["type"]) ?>
                  </option>
                <?php endforeach; ?>
              </select>
              <div class="hint">
                This controls where <b>Buy / Order</b> sends the user. Only valid services are allowed.
              </div>
            </div>

            <div style="height:12px"></div>

            <div class="row2">
              <div class="fieldX">
                <label>Price</label>
                <input class="inputX" name="price" id="price" type="number" step="0.01" value="<?= htmlspecialchars($current["price"] ?? 0) ?>">
              </div>

              <div class="fieldX">
                <label>Price unit</label>
                <input class="inputX" name="price_unit" id="price_unit" value="<?= $val("price_unit","Kamas") ?>">
              </div>
            </div>

            <div class="fieldX" style="margin-top:12px">
              <label>CTA label</label>
              <input class="inputX" name="cta_label" id="cta_label" value="<?= $val("cta_label","Buy / Order") ?>">
            </div>

            <div style="height:12px"></div>

            <div class="row2">
              <div class="fieldX">
                <label>Sort</label>
                <input class="inputX" name="sort" id="sort" type="number" value="<?= htmlspecialchars($current["sort"] ?? 100) ?>">
              </div>

              <div class="fieldX">
                <label>Active</label>
                <div class="switch">
                  <div>
                    <b style="font-size:14px;letter-spacing:.2px;">Publish offer</b><br>
                    <small>Visible to users</small>
                  </div>
                  <label style="display:flex;align-items:center;gap:10px;margin:0;">
                    <input type="checkbox" name="active" value="1" id="active" <?= !empty($current["active"]) ? "checked" : "" ?>>
                    <span class="tog" aria-hidden="true"></span>
                  </label>
                </div>
              </div>
            </div>

            <div style="height:12px"></div>

            <div class="fieldX">
              <label>Bullets</label>
              <textarea class="textareaX" name="bullets" id="bullets" rows="6" placeholder="One bullet per line"><?= htmlspecialchars($bulletsText) ?></textarea>
              <div class="hint">
                Tip: One bullet per line. Use short, clear benefits. <span class="pill"><span class="dot ok"></span> UX matters</span>
              </div>
            </div>

            <div class="stickyActions">
              <div class="actionsLeft">
                <span class="pill" title="Keyboard shortcuts">
                  <b>Shortcuts:</b> <kbd>Ctrl</kbd> + <kbd>S</kbd> save • <kbd>Esc</kbd> back
                </span>
                <span class="pill" id="liveState">
                  <span class="dot <?= !empty($current["active"]) ? "ok" : "warn" ?>"></span>
                  <span><?= !empty($current["active"]) ? "Active" : "Inactive" ?></span>
                </span>
              </div>
              <div class="actionsRight">
                <button class="btnX primary" type="submit"><?= $editing ? "Save changes" : "Create offer" ?></button>
                <a class="btnX ghost" href="/admin/offers.php">Cancel</a>
              </div>
            </div>

          </form>
        </div>
      </section>

      <!-- RIGHT: LIVE PREVIEW -->
      <aside class="panelX">
        <div class="panelHead">
          <div>
            <h2>Live Preview</h2>
            <p>How this card may look on your Services/Store pages (preview only).</p>
          </div>
          <div class="tag">
            <span class="dot ok"></span>
            <span>Realtime</span>
          </div>
        </div>

        <div class="previewCard">
          <div class="previewBox">
            <div class="previewInner">
              <div class="previewTop">
                <div>
                  <h3 class="previewTitle" id="pv_title"><?= $val("title", $editing ? "" : "Your offer title") ?></h3>
                  <div class="previewSub" id="pv_sub"><?= $val("subtitle", "Your subtitle goes here…") ?></div>
                </div>
                <span class="pill" id="pv_section"><?= htmlspecialchars($secVal) ?></span>
              </div>

              <div class="priceLine">
                <b id="pv_price"><?= htmlspecialchars((string)($current["price"] ?? 0)) ?></b>
                <span id="pv_unit"><?= $val("price_unit","Kamas") ?></span>
              </div>

              <hr class="sep">

              <ul class="previewBullets" id="pv_bullets">
                <?php
                  $pv = [];
                  if(isset($current["bullets"]) && is_array($current["bullets"])) $pv = $current["bullets"];
                  if(empty($pv)) $pv = ["Fast delivery", "Safe method", "Support included"];
                  foreach($pv as $b){
                    echo "<li>".htmlspecialchars($b)."</li>";
                  }
                ?>
              </ul>

              <div class="previewCta">
                <span class="btnX primary" style="pointer-events:none;" id="pv_cta"><?= $val("cta_label","Buy / Order") ?></span>
                <span class="pill" id="pv_service"><?= htmlspecialchars($serviceVal ?: "no service selected") ?></span>
              </div>

              <div class="note">
                This preview doesn’t change your frontend layout — it helps you verify the data quickly.
              </div>
            </div>
          </div>
        </div>
      </aside>

    </div>

  </main>
</div>

<script>
/* UX only: live preview + shortcuts (NO backend changes) */
(function(){
  const $ = (id)=>document.getElementById(id);

  const title = $("title");
  const subtitle = $("subtitle");
  const price = $("price");
  const unit = $("price_unit");
  const cta = $("cta_label");
  const bullets = $("bullets");
  const section = $("section");
  const service = $("service_code");
  const active = $("active");
  const liveState = $("liveState");

  function safeText(el, v){
    if(!el) return;
    el.textContent = (v ?? "").toString().trim();
  }

  function renderBullets(text){
    const ul = $("pv_bullets");
    if(!ul) return;
    ul.innerHTML = "";
    const lines = (text || "")
      .split(/\r\n|\n|\r/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const arr = lines.length ? lines : ["Fast delivery","Safe method","Support included"];
    for(const line of arr){
      const li = document.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    }
  }

  function refresh(){
    safeText($("pv_title"), title?.value || "Your offer title");
    safeText($("pv_sub"), subtitle?.value || "Your subtitle goes here…");
    safeText($("pv_price"), (price?.value || "0"));
    safeText($("pv_unit"), (unit?.value || "Kamas"));
    safeText($("pv_cta"), (cta?.value || "Buy / Order"));
    safeText($("pv_section"), (section?.value || "services"));

    const sv = service?.value || "no service selected";
    safeText($("pv_service"), sv);

    renderBullets(bullets?.value || "");

    if(active && liveState){
      const dot = liveState.querySelector(".dot");
      const txt = liveState.querySelector("span:last-child");
      const isOn = !!active.checked;
      if(dot){
        dot.classList.toggle("ok", isOn);
        dot.classList.toggle("warn", !isOn);
      }
      if(txt) txt.textContent = isOn ? "Active" : "Inactive";
    }
  }

  ["input","change","keyup"].forEach(evt=>{
    document.addEventListener(evt, (e)=>{
      if(e.target && ["title","subtitle","price","price_unit","cta_label","bullets","section","service_code","active"].includes(e.target.id)){
        refresh();
      }
    }, true);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e)=>{
    // Ctrl/Cmd + S => submit
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
      e.preventDefault();
      document.getElementById("offerForm")?.submit();
    }
    // Esc => back
    if(e.key === "Escape"){
      window.location.href = "/admin/offers.php";
    }
  });

  refresh();
})();
</script>
</body>
</html>
