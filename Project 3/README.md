# LevelUP PL Bot

Production-ready Discord bot for selling Dofus power leveling services directly inside Discord.

## What this bot does

- Slash commands only
- Premium PL order panel with `Buy PL`, `Ask Question`, and `Report Issue`
- Staff command-center panel with buttons for staff/admin actions
- Interactive PL configurator with server, current level, target level, speed, notes, price, and ETA
- Private order tickets for customer + staff
- Moroccan payment flow:
  - `CIH -> CIH`
  - `OTHER BANK -> CIH`
  - optional `Kamas payment`
- Bank-fee aware billing with configurable fee profiles and per-order manual override
- Payment proof capture from image attachments in the ticket
- Staff validation controls:
  - claim order
  - verify payment
  - reject payment
  - ask new proof
  - change status
  - update progress
  - add private staff note
  - adjust billing
  - complete or cancel order
- Completion confirmation and review flow
- JSON persistence for Pella-friendly hosting

## Stack

- Node.js 18+
- `discord.js` `^14.22.0`
- `dotenv`
- Local JSON storage in `data/store.json`

## Folder structure

- `src/commands`
- `src/components`
- `src/events`
- `src/handlers`
- `src/services`
- `src/utils`
- `config/settings.json`
- `config/settings.example.json`
- `data/store.json`

## Pella Hosting setup

1. Upload the bot folder to Pella Hosting.
2. Set the startup command to `npm install && npm start`.
3. Create a `.env` file from `.env.example`.
4. Edit `config/settings.json` with your real role IDs, category IDs, channels, and payment details.
5. Start the bot once to auto-deploy slash commands.
6. Use `/panel mode:public` in Discord to post the customer panel.
7. Use `/panel mode:staff` in a staff-only channel to post the staff button dashboard.

## Environment variables

Use `.env.example` as the template.

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `AUTO_DEPLOY_COMMANDS`
- `CONFIG_PATH`
- `STORE_PATH`

## Config placeholders you must fill

Edit `config/settings.json`:

- `roles.staffRoleIds`
- `roles.managerRoleIds`
- `channels.panelChannelId`
- `channels.logsChannelId`
- `channels.feedbackChannelId`
- `tickets.categoryId`
- `tickets.archiveCategoryId`
- `payment.cihToCih.accountHolderName`
- `payment.cihToCih.shortAccountNumber`
- `payment.cihToCih.contact`
- `payment.otherBankToCih.accountHolderName`
- `payment.otherBankToCih.fullRib`
- `payment.otherBankToCih.contact`
- `payment.kamas.enabled`
- `payment.kamas.instructions`
- `payment.kamas.referenceRate`
- `pricing.packages`
- `pricing.dynamic`
- `pricing.rush`

## Payment logic summary

- The buyer selects a payment profile during the order configurator.
- The bot calculates:
  - base PL price
  - rush surcharge if selected
  - bank transfer fee from the selected fee profile
  - final total
- `CIH -> CIH` uses the short CIH account number and defaults to `0 MAD`.
- `OTHER BANK -> CIH` uses the full RIB and can add sender-bank fees to the total.
- Unknown banks can use the fallback fee profile or staff can override the bank fee per order with `Adjust Billing`.
- After the buyer uploads an image proof inside the ticket, the order moves to `Waiting Verification`.
- Staff then verify, reject, or request a new proof.

## Slash commands

- `/panel`
- `/panel mode:staff`
- `/order create`
- `/order status`
- `/order progress`
- `/order claim`
- `/order complete`
- `/order cancel`
- `/order note`
- `/ticket close`
- `/ticket adduser`
- `/ticket removeuser`
- `/payment verify`
- `/payment reject`
- `/config show`
- `/config reload`

## Notes

- The old Python bot was removed and replaced with a full Node.js `discord.js` rebuild.
- Fee examples for Moroccan banks are intentionally config-driven because transfer fees can change over time.
- Reviews are saved in `data/store.json`.
