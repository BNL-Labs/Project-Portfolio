# LEVEL UP Premium Welcomer

Premium Discord onboarding and welcomer system built with Python and `discord.py`.

## What changed

This project was rebuilt from a simple single-file welcomer into a modular onboarding bot with:

- premium branded welcome banners
- public welcome embeds plus optional DM guide
- rules acceptance and verification flow
- role selector onboarding menus
- auto-role and verified/unverified role handling
- anti-alt account age analysis
- goodbye messages
- boost and member-count celebration messages
- onboarding and moderation logs
- slash-command testing and previews
- JSON-based persistent state for lightweight hosting

## Project structure

- `bot.py`
- `cogs/`
- `services/`
- `utils/`
- `config/`
- `generated/`
- `data/`
- `assets/`

## Setup

1. Create a bot in the Discord Developer Portal.
2. Enable the `SERVER MEMBERS INTENT`.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create `.env` from `.env.example`.
5. Edit `config/settings.json`.
6. Run the bot:

```bash
python bot.py
```

## Required `.env` values

- `DISCORD_TOKEN`
- `GUILD_ID` optional, but recommended if you only use one server
- `CONFIG_PATH`
- `STATE_PATH`
- `AUTO_SYNC_COMMANDS`

## Required config placeholders

Before going live, fill these in `config/settings.json`:

- `channels.welcome_channel_id`
- `channels.goodbye_channel_id`
- `channels.logs_channel_id`
- `channels.onboarding_channel_id`
- `channels.rules_channel_id`
- `roles.auto_role_id`
- `roles.verified_role_id`
- `roles.unverified_role_id`
- `roles.bot_role_id`
- `branding.brand_logo_path`
- `branding.background_paths`
- `role_selectors[*].roles[*].id`

## Commands

- `/test_welcome`
- `/test_goodbye`
- `/test_dm`
- `/preview_theme`
- `/memberinfo`
- `/onboarding_status`
- `/send_onboarding_panel`
- `/reload_config`

## Theme presets

- `neon`
- `luxury`
- `gaming`
- `minimalist`
- `dark_premium`

## Hosting notes

- Lightweight enough for shared hosting and single-folder deployment
- Generated images are streamed from memory by default
- The `generated/` directory is cleaned on startup
- Persistent state is stored in `data/state.json`

## Important note

The credential found in the original local project was intentionally excluded from this public copy. Rotate the old token in the Discord Developer Portal before deploying this version, then place the new token only in your untracked `.env` file.
