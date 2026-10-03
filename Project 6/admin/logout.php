<?php
require_once __DIR__ . '/../includes/config.php';

admin_logout();
header('Location: /admin/login.php');
exit;
