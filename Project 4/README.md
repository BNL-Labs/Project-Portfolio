# LEVEL UP Welcomer Bot

Neon-styled Discord welcomer bot for the LEVEL UP server. Sends a custom embed and a dynamic welcome banner that matches your brand (neon cyan/magenta on dark background).

## Features
- Dynamic **welcome banner** with user avatar, username, and LEVEL UP brand vibe
- **Welcome embed** with member count
- **Auto role** assignment (optional)
- `/test_welcome` slash command for quick preview
- Config via `.env`

## Quick Start
1. **Create a Discord bot** in the Developer Portal, add it to your server with **Server Members Intent** enabled.
2. Download this folder and run:
   ```bash
   pip install -r requirements.txt
   cp .env.example .env  # edit it
   python bot.py
   ```

### .env fields
- `DISCORD_TOKEN` — your bot token
- `WELCOME_CHANNEL_ID` — channel ID where welcome message goes
- `AUTO_ROLE_ID` — role ID to auto-assign (optional, set 0 to disable)
- `GUILD_ID` — (optional) lock bot to a single guild ID for safety
- `BRAND_LOGO_PATH` — path to your LEVEL UP logo image (default: assets/logo.png)

## Deploy Notes
- If hosting on Pella/Render/Heroku, make sure to:
  - Add the environment variables in the dashboard
  - Keep **Privileged Gateway Intents** enabled (Members)
  - Mount/writeable storage if you want to save banner images; or modify code to stream bytes directly.

## Fonts
The banner uses **DejaVuSans-Bold** if available (bundled with Pillow). You can replace with your own font by editing `image_generator._load_font` to point to a TTF file (e.g., `assets/YourFont.ttf`).

Enjoy! 🎮
