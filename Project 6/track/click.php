<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/config.php';

header('Content-Type: application/json');

$offer = trim((string) ($_GET['offer'] ?? ''));
if ($offer === '' || !preg_match('/^[a-z0-9\-_.]+$/i', $offer)) {
    echo json_encode(['ok' => false]);
    exit;
}

$path = __DIR__ . '/../storage/clicks.json';
$data = [];
if (is_file($path)) {
    $decoded = json_decode((string) file_get_contents($path), true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}

$data[$offer] = (int) ($data[$offer] ?? 0) + 1;

$tmp = $path . '.tmp';
file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
rename($tmp, $path);

echo json_encode(['ok' => true, 'offer' => $offer, 'count' => $data[$offer]]);
