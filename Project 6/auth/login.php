<?php
require_once __DIR__ . '/../includes/config.php';

if ($DISCORD_CLIENT_ID === '' || $DISCORD_CLIENT_SECRET === '' || $DISCORD_REDIRECT_URI === '') {
    http_response_code(503);
    exit('Discord login is temporarily unavailable.');
}

$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

$params = [
    'client_id' => $DISCORD_CLIENT_ID,
    'redirect_uri' => $DISCORD_REDIRECT_URI,
    'response_type' => 'code',
    'scope' => $DISCORD_SCOPES,
    'state' => $state,
    'prompt' => 'consent',
];

header('Location: https://discord.com/api/oauth2/authorize?' . http_build_query($params));
exit;
