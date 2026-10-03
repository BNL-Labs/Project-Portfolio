<?php
require_once __DIR__ . '/../includes/config.php';

$code = $_GET['code'] ?? null;
$state = $_GET['state'] ?? null;

if (!$code || !$state || !hash_equals((string) ($_SESSION['oauth_state'] ?? ''), (string) $state)) {
    http_response_code(400);
    exit('Invalid login state. Please try again.');
}

unset($_SESSION['oauth_state']);

if ($DISCORD_CLIENT_ID === '' || $DISCORD_CLIENT_SECRET === '' || $DISCORD_REDIRECT_URI === '') {
    http_response_code(503);
    exit('Discord login is temporarily unavailable.');
}

$tokenRequest = http_build_query([
    'client_id' => $DISCORD_CLIENT_ID,
    'client_secret' => $DISCORD_CLIENT_SECRET,
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $DISCORD_REDIRECT_URI,
    'scope' => $DISCORD_SCOPES,
]);

$tokenHandle = curl_init('https://discord.com/api/oauth2/token');
curl_setopt_array($tokenHandle, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $tokenRequest,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_TIMEOUT => 15,
]);
$tokenResponse = curl_exec($tokenHandle);
$tokenHttp = curl_getinfo($tokenHandle, CURLINFO_HTTP_CODE);
curl_close($tokenHandle);

$token = is_string($tokenResponse) ? json_decode($tokenResponse, true) : null;
$accessToken = is_array($token) ? ($token['access_token'] ?? null) : null;
if (!is_string($accessToken) || $accessToken === '' || $tokenHttp >= 400) {
    http_response_code(502);
    exit('Could not complete Discord login. Please try again.');
}

$userHandle = curl_init('https://discord.com/api/users/@me');
curl_setopt_array($userHandle, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken],
    CURLOPT_TIMEOUT => 15,
]);
$userResponse = curl_exec($userHandle);
$userHttp = curl_getinfo($userHandle, CURLINFO_HTTP_CODE);
curl_close($userHandle);

$user = is_string($userResponse) ? json_decode($userResponse, true) : null;
if (!is_array($user) || $userHttp >= 400) {
    http_response_code(502);
    exit('Could not fetch your Discord profile. Please try again.');
}

session_regenerate_id(true);
$_SESSION['discord_user'] = [
    'id' => $user['id'] ?? null,
    'username' => $user['username'] ?? null,
    'discriminator' => $user['discriminator'] ?? null,
    'avatar' => $user['avatar'] ?? null,
    'email' => $user['email'] ?? null,
];

header('Location: ' . route_url('home'));
exit;
