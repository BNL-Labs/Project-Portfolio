from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.constants import THEME_PRESETS


def admin_only() -> app_commands.check:
    async def predicate(interaction: discord.Interaction) -> bool:
        if not interaction.user.guild_permissions.manage_guild:
            raise app_commands.CheckFailure("You need Manage Server to use this command.")
        return True

    return app_commands.check(predicate)


class AdminCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="test_welcome", description="Preview the public welcome message.")
    @admin_only()
    async def test_welcome(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        await interaction.response.defer(ephemeral=True)
        target = member or interaction.user
        risk = self.bot.services["analysis"].analyze(target)
        await self.bot.services["welcome"].send_public_welcome(target, risk, False)
        await interaction.followup.send("Welcome message sent.", ephemeral=True)

    @app_commands.command(name="test_goodbye", description="Preview the goodbye message in the goodbye channel.")
    @admin_only()
    async def test_goodbye(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        await interaction.response.defer(ephemeral=True)
        target = member or interaction.user
        await self.bot.services["welcome"].send_goodbye(target)
        await interaction.followup.send("Goodbye message sent.", ephemeral=True)

    @app_commands.command(name="test_dm", description="Send the onboarding DM guide.")
    @admin_only()
    async def test_dm(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        await interaction.response.defer(ephemeral=True)
        target = member or interaction.user
        sent = await self.bot.services["welcome"].send_dm_guide(target)
        await interaction.followup.send("DM guide sent." if sent else "Could not send the DM guide.", ephemeral=True)

    @app_commands.command(name="preview_theme", description="Preview a welcome banner theme.")
    @admin_only()
    @app_commands.describe(theme="Theme preset to preview")
    async def preview_theme(self, interaction: discord.Interaction, theme: str, member: discord.Member | None = None) -> None:
        if theme not in THEME_PRESETS:
            await interaction.response.send_message(f"Theme must be one of: {', '.join(THEME_PRESETS)}", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        await self.bot.services["welcome"].send_theme_preview(interaction, theme, member or interaction.user)

    @preview_theme.autocomplete("theme")
    async def preview_theme_autocomplete(self, interaction: discord.Interaction, current: str):
        return [
            app_commands.Choice(name=theme, value=theme)
            for theme in THEME_PRESETS
            if current.lower() in theme.lower()
        ][:25]

    @app_commands.command(name="memberinfo", description="Show onboarding and risk details for a member.")
    @admin_only()
    async def memberinfo(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        target = member or interaction.user
        info_lines = self.bot.services["onboarding"].build_status_lines(target)
        embed = discord.Embed(
            title=f"Member Insight: {target.display_name}",
            description="\n".join(info_lines),
            color=self.bot.services["config"].color("accent_color"),
        )
        embed.set_thumbnail(url=target.display_avatar.url)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="onboarding_status", description="Show onboarding completion for yourself or another member.")
    async def onboarding_status(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        target = member or interaction.user
        if member and not interaction.user.guild_permissions.manage_guild and target.id != interaction.user.id:
            await interaction.response.send_message("You can only check your own onboarding status.", ephemeral=True)
            return
        info_lines = self.bot.services["onboarding"].build_status_lines(target)
        embed = discord.Embed(
            title=f"Onboarding Status: {target.display_name}",
            description="\n".join(info_lines),
            color=self.bot.services["config"].color("accent_color"),
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="send_onboarding_panel", description="Send the onboarding panel to a channel.")
    @admin_only()
    async def send_onboarding_panel(self, interaction: discord.Interaction, channel: discord.TextChannel | None = None) -> None:
        target_channel = channel or interaction.channel
        embed = discord.Embed(
            title="Community Onboarding Wizard",
            description="Launch a guided, multi-step onboarding flow with premium step-by-step setup.",
            color=self.bot.services["config"].color("accent_color"),
        )
        embed.set_footer(text=self.bot.services["branding"].footer_text())
        await target_channel.send(embed=embed, view=self.bot.onboarding_view)
        await interaction.response.send_message(f"Onboarding panel sent in {target_channel.mention}.", ephemeral=True)

    @app_commands.command(name="reload_config", description="Reload bot configuration from disk.")
    @admin_only()
    async def reload_config(self, interaction: discord.Interaction) -> None:
        self.bot.services["config"].reload()
        self.bot.rebuild_onboarding_view()
        await interaction.response.send_message("Configuration reloaded. Post a new onboarding panel or restart the bot if you changed role selector layout.", ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AdminCog(bot))
