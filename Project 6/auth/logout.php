<?php
require_once __DIR__ . '/../includes/config.php';

unset($_SESSION['discord_user']);
session_regenerate_id(true);

header('Location: ' . route_url('home'));
exit;
