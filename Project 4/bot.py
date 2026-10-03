import os
import asyncio
import discord
from discord.ext import commands
from dotenv import load_dotenv
from image_generator import create_welcome_banner
from io import BytesIO

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
WELCOME_CHANNEL_ID = int(os.getenv("WELCOME_CHANNEL_ID", "0"))
AUTO_ROLE_ID = int(os.getenv("AUTO_ROLE_ID", "0"))
GUILD_ID = int(os.getenv("GUILD_ID", "0"))
BRAND_LOGO_PATH = os.getenv("BRAND_LOGO_PATH", "assets/logo.png")

intents = discord.Intents.default()
intents.members = True  # IMPORTANT for on_member_join
intents.guilds = True
intents.message_content = False

bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user} (ID: {bot.user.id})")
    try:
        synced = await bot.tree.sync(guild=discord.Object(id=GUILD_ID)) if GUILD_ID else await bot.tree.sync()
        print(f"🔧 Synced {len(synced)} app commands.")
    except Exception as e:
        print(f"App command sync failed: {e}")
    print("Bot is ready.")

async def _generate_banner_for_member(member: discord.Member) -> str:
    # Fetch avatar bytes
    avatar_bytes = None
    try:
        avatar_bytes = await member.display_avatar.read()
    except Exception:
        pass
    username = str(member.display_name)
    out_path = os.path.join("banners", f"welcome_{member.id}.jpg")
    return create_welcome_banner(username, avatar_bytes, BRAND_LOGO_PATH, out_path)

@bot.event
async def on_member_join(member: discord.Member):
    # If GUILD_ID is set, ignore joins from other guilds (safety)
    if GUILD_ID and member.guild.id != GUILD_ID:
        return

    channel = member.guild.get_channel(WELCOME_CHANNEL_ID) if WELCOME_CHANNEL_ID else None
    if not channel:
        # Try to find a system channel fallback
        channel = member.guild.system_channel

    # Auto role assignment (optional)
    if AUTO_ROLE_ID:
        role = member.guild.get_role(AUTO_ROLE_ID)
        if role:
            try:
                await member.add_roles(role, reason="Auto role on join")
            except Exception as e:
                print(f"Failed to assign role: {e}")

    # Generate banner
    banner_path = await _generate_banner_for_member(member)

    # Build an embed
    embed = discord.Embed(
        title=f"Welcome to LEVEL UP, {member.display_name}!",
        description=f"Glad to have you here, {member.mention}. Make yourself at home 🎮",
        color=discord.Color.fuchsia()
    )
    embed.set_thumbnail(url=member.display_avatar.url if member.display_avatar else discord.Embed.Empty)
    embed.set_image(url=f"attachment://banner.jpg")
    embed.add_field(name="Member Count", value=str(member.guild.member_count))
    embed.set_footer(text="LEVEL UP — Neon vibes, pro service")

    file = None
    try:
        file = discord.File(banner_path, filename="banner.jpg")
    except Exception as e:
        print(f"Could not attach banner: {e}")

    try:
        if channel:
            await channel.send(file=file, embed=embed)
    except Exception as e:
        print(f"Failed to send welcome message: {e}")

# --- Slash command to test banner manually ---
@bot.tree.command(name="test_welcome", description="Generate a test welcome banner for yourself.")
async def test_welcome(interaction: discord.Interaction):
    if GUILD_ID and interaction.guild_id != GUILD_ID:
        await interaction.response.send_message("This command is locked to the configured guild.", ephemeral=True)
        return

    await interaction.response.defer(ephemeral=True)
    member = interaction.user if isinstance(interaction.user, discord.Member) else interaction.guild.get_member(interaction.user.id)
    banner_path = await _generate_banner_for_member(member)
    file = discord.File(banner_path, filename="banner.jpg")
    embed = discord.Embed(title="Test Welcome", description="Here's how your welcome banner looks!", color=discord.Color.blurple())
    embed.set_image(url="attachment://banner.jpg")
    await interaction.followup.send(file=file, embed=embed, ephemeral=True)

if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("Please set DISCORD_TOKEN in your environment (.env)")
    bot.run(TOKEN)
