# LX Concierge

LX Concierge is a production-minded Discord commerce concierge for the Luxenza luxury shop server. It keeps public interaction elegant and button-led while moving real order, support, review, and campaign workflows into private branded spaces for staff and clients.

## Highlights

- Button, select menu, and modal-led public UX
- Owner-only setup flow for channels, roles, categories, logs, and panel syncing
- Private order lounges with status controls, notes, logs, and transcripts
- Separate support lounges with VIP-aware priority handling
- Review capture, testimonials flow, VIP tools, blacklist controls, and campaign tools
- MongoDB persistence with Mongoose models for orders, tickets, settings, reviews, discounts, transcripts, and staff actions

## Stack

- Node.js 20+
- discord.js 14.25.1
- MongoDB with Mongoose
- dotenv
- Modular CommonJS architecture

## Project Structure

```text
Luxenza/
  package.json
  .env.example
  README.md
  scripts/
    register-commands.js
  src/
    buttons/
    commands/
      owner/
      staff/
      utility/
    config/
    events/
    handlers/
    middleware/
    modals/
    models/
    panels/
    selects/
    services/
    utils/
    index.js
```

## Environment

Copy `.env.example` to `.env` and fill in:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
MONGODB_URI=your_mongodb_connection
BOT_PREFIX=/
OWNER_USER_ID=optional_owner_user_id
DEFAULT_GUILD_ID=optional_guild_id_for_fast_command_registration
VERIFICATION_WELCOME_DM=true
TRANSCRIPT_UPLOADS=true
```

## Installation

```bash
npm install
npm run register
npm start
```

## First-Time Setup

1. Invite the bot with `applications.commands`, `Manage Roles`, `Manage Channels`, `View Channels`, `Send Messages`, `Embed Links`, and `Read Message History`.
2. Run `/setup` as the owner.
3. Map channels with `/set-channel`.
4. Map staff, client, payment, location, and preference roles with `/set-role`.
5. Map order and support categories with `/set-category`.
6. Run `/sync-panels` to deploy the concierge UI.
7. Validate everything with `/system-status`.

## Public Experience

- Verification is handled from the verification panel.
- Profile preferences are updated through select menus.
- Orders are created from the order panel and open private channels.
- Support requests are created from the support panel and open private channels.
- Reviews are submitted through the review panel.
- Order tracking is available through the order status panel or `/order-status`.

## Staff Experience

- `/announce`
- `/campaign-create`
- `/discount-create`
- `/discount-list`
- `/discount-end`
- `/vip-add`
- `/vip-remove`
- `/client-history`
- `/blacklist`
- `/unblacklist`
- `/lock-orders`
- `/unlock-orders`
- `/panic-mode`

All staff commands are additionally protected by role checks in the middleware layer.

## Owner Commands

- `/setup`
- `/set-channel`
- `/set-role`
- `/set-category`
- `/sync-panels`
- `/reload-config`
- `/system-status`

## Notes

- Role selection supports single-select by default and can be relaxed with feature flags in `BotSettings`.
- Duplicate active orders are blocked by default.
- Panic mode automatically pauses new public ordering.
- Closed order and support lounges generate transcript records and can upload transcript files into the configured transcript channel.

## Recommended VPS Deployment

- Use PM2 or systemd to keep the process alive.
- Store secrets in environment variables, never in source files.
- Use a managed MongoDB deployment or a secured self-hosted MongoDB instance.
- Run `npm run register` whenever command definitions change.
