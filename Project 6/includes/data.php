<?php
/**
 * =========================================================
 *  UP DOFUS – SMART DATA CONFIG
 *  Edit ONLY this file to manage:
 *  - Servers
 *  - Services (Boosting / Selling)
 *  - Prices
 *  - Discounts
 * =========================================================
 */

/* ========================================================
 * SERVERS
 * ====================================================== */
$SERVER_GROUPS = [
  "Mono"  => ["DAKAL", "MIKHAL", "KOURIAL"],
  "Multi" => ["BRIAL", "RAFAL", "SALAR"],
];

// Flatten server list (used in checkout select)
$ALL_SERVERS = array_values(array_unique(
  array_merge(...array_values($SERVER_GROUPS))
));
sort($ALL_SERVERS);

/* ========================================================
 * DISCOUNTS
 * ====================================================== */
$DISCOUNTS = [
  "grand_commands" => [
    "enabled" => true,
    "min_qty" => 20,
    "percent" => 10,
    "applies_to" => ["account-selling"], // service IDs only
  ],
];

/* ========================================================
 * SERVICE TEMPLATES (avoid repetition)
 * ====================================================== */
function PL_SERVICE($id, $name, $price, $tag){
  return [
    "id" => $id,
    "type" => "boosting",                 // 🔑 used by checkout
    "category" => "Power-Leveling",
    "name" => $name,
    "subtitle" => "Fast • Safe • Trusted",
    "price_type" => "fixed",
    "base_price" => $price,
    "currency_label" => "M Kamas",
    "tag" => $tag,
    "details" => [
      "You give us the account, we deliver the level.",
      "Progress updates via ticket.",
    ],
  ];
}

/* ========================================================
 * SERVICES (USED BY CHECKOUT)
 * IMPORTANT: id MUST match checkout links
 * ====================================================== */
$SERVICES = [

  // -------- POWER LEVELING --------
  PL_SERVICE("pl-1-100", "Level 1 → 100", 6,  "Starter"),
  PL_SERVICE("pl-1-150", "Level 1 → 150", 12, "Popular"),
  PL_SERVICE("pl-1-199", "Level 1 → 199", 17, "Pro"),
  PL_SERVICE("pl-1-200", "Level 1 → 200", 22, "Max"),

  // -------- CUSTOM BOOST --------
  [
    "id" => "pl-custom",
    "type" => "boosting",
    "category" => "Power-Leveling",
    "name" => "Custom Boost",
    "subtitle" => "Example: 120 → 180",
    "price_type" => "quote",
    "base_price" => 0,
    "currency_label" => "",
    "tag" => "Custom",
    "details" => [
      "Open a ticket and describe your request.",
      "We send price & delivery time before start.",
    ],
  ],

  // -------- ACCOUNT SELLING --------
  [
    "id" => "account-selling",
    "type" => "selling",                  // 🔑 VERY IMPORTANT
    "category" => "Accounts",
    "name" => "Account Selling",
    "subtitle" => "Trusted delivery • Clear info",
    "price_type" => "fixed",
    "base_price" => 1,                    // price per account
    "currency_label" => "Unit",
    "tag" => "Hot",
    "details" => [
      "Price is per account.",
      "Grand Commands discount may apply.",
    ],
  ],
];

/* ========================================================
 * STORE ADD-ONS (OPTIONAL)
 * ====================================================== */
$STORE_ITEMS = [
  ["id"=>"priority","name"=>"Priority Delivery","tag"=>"Boost"],
  ["id"=>"report","name"=>"Progress Report","tag"=>"Info"],
  ["id"=>"safe","name"=>"Safe Mode","tag"=>"Safety"],
];

/* ========================================================
 * HELPERS (USED EVERYWHERE)
 * ====================================================== */
function money_label($service){
  if (($service["price_type"] ?? "") === "quote") return "Quote";
  return $service["base_price"] . " " . ($service["currency_label"] ?? "");
}

function find_service($services, $id){
  foreach ($services as $s) {
    if (($s["id"] ?? "") === $id) return $s;
  }
  return null;
}

function service_type($service){
  return $service["type"] ?? "boosting";
}

function calc_grand_commands_discount($discounts, $service_id, $qty){
  $rule = $discounts["grand_commands"] ?? null;
  if (!$rule || empty($rule["enabled"])) return 0;
  if ($qty < (int)$rule["min_qty"]) return 0;
  if (!in_array($service_id, $rule["applies_to"] ?? [])) return 0;
  return (float)$rule["percent"];
}

function calc_total_price($service, $qty, $discount_percent){
  if (($service["price_type"] ?? "") !== "fixed") {
    return ["subtotal"=>0, "discount"=>0, "total"=>0];
  }

  $subtotal = (float)$service["base_price"] * (int)$qty;
  $discount = $subtotal * ($discount_percent / 100);
  return [
    "subtotal" => $subtotal,
    "discount" => $discount,
    "total"    => $subtotal - $discount,
  ];
}