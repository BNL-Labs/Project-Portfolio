# Kamas Bot

A Discord order and ticket bot built with Node.js and `discord.js`.

## Requirements

- Node.js 18 or newer
- A Discord application and bot token
- A Discord server where you can configure commands, roles, and channels

## Setup

1. Run `npm install`.
2. Copy `config.example.json` to `config.json`.
3. Replace every placeholder in `config.json` and the marked placeholder IDs/payment references in the source with your own values.
4. Run `npm run deploy` to register the guild commands.
5. Run `npm start`.

`config.json` and `orders.json` are ignored because they contain credentials or live user/order information. The bot creates `orders.json` after the first order.

