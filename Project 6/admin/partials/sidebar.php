<?php
// admin/partials/sidebar.php
$here = basename($_SERVER["PHP_SELF"] ?? "");
$active = function(string $file) use ($here){
  return $here === $file ? " active" : "";
};
?>
<aside class="a-side">
  <a class="a-brand" href="/admin/index.php" title="UP DOFUS Admin">
    <span class="a-logo" aria-hidden="true"></span>
    <span class="a-brandText">
      <b>UP DOFUS</b>
      <small>Admin Panel</small>
    </span>
  </a>

  <nav class="a-nav">
    <a class="a-link<?= $active("index.php") ?>" href="/dashboard">
      <span class="a-ic">🏠</span><span>Dashboard</span>
    </a>
    <a class="a-link<?= $active("orders.php") ?><?= $active("order.php") ?>" href="/orders">
      <span class="a-ic">📦</span><span>Orders</span>
    </a>
    <a class="a-link<?= $active("offers.php") ?><?= $active("offer-edit.php") ?>" href="/offers">
      <span class="a-ic">🏷️</span><span>Offers</span>
    </a>
    <a class="a-link<?= $active("feedback-control.php") ?>" href="/feedback">
      <span class="a-ic">💬</span><span>Feedbacks</span>
    </a>
  </nav>

  <div class="a-spacer"></div>

  <a class="a-link danger" href="/admin/logout.php" onclick="return confirm('Logout now?');">
    <span class="a-ic">🚪</span><span>Logout</span>
  </a>

  <div class="a-foot">
    <span class="a-dot"></span>
    <small>Secure area</small>
  </div>
</aside>