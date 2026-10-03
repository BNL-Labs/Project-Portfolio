<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode((string) $raw, true);
if (!is_array($payload)) {
    echo json_encode(['ok' => false]);
    exit;
}

$event = trim((string) ($payload['event'] ?? ''));
if ($event === '' || !preg_match('/^[a-z0-9_:-]+$/i', $event)) {
    echo json_encode(['ok' => false]);
    exit;
}

$record = [
    'event' => $event,
    'ts' => gmdate('c'),
    'path' => request_path(),
    'payload' => array_filter(
        (array) ($payload['payload'] ?? []),
        static fn($value) => is_scalar($value) && strlen((string) $value) <= 300
    ),
];

if ($ENABLE_LOCAL_EVENT_LOG) {
    $line = json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (is_string($line)) {
        file_put_contents(__DIR__ . '/../storage/events.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}

echo json_encode(['ok' => true]);
