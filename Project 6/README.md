# UP Dofus Store

A PHP storefront for Dofus power-leveling, account services, orders, feedback, Discord OAuth, and a small administration area.

## Requirements

- PHP 8.0 or newer
- A writable `storage/` directory
- Optional Discord OAuth credentials

## Local setup

1. Copy `.env.example` to `.env`.
2. Set your local values. For admin access, generate `ADMIN_PASSWORD_HASH` with `php -r "echo password_hash('your-password', PASSWORD_DEFAULT), PHP_EOL;"`.
3. From this folder, run `php -S localhost:8000`.
4. Open `http://localhost:8000`.

Runtime JSON and log files inside `storage/` are ignored so orders, analytics, support messages, and feedback are never committed.

