from __future__ import annotations

import discord


class LoggingService:
    def __init__(self, bot, config_service, branding_service) -> None:
        self.bot = bot
        self.config = config_service
        self.branding = branding_service

    async def send(self, guild: discord.Guild, *, title: str, description: str, color: int | None = None, fields: list[tuple[str, str, bool]] | None = None) -> None:
        channel_id = self.config.get_channel_id("logs_channel_id")
        if not channel_id:
            return

        try:
            channel = guild.get_channel(channel_id) or await guild.fetch_channel(channel_id)
        except discord.HTTPException:
            return
        if not channel:
            return

        embed = discord.Embed(
            title=title,
            description=description,
            color=color or self.config.color("accent_color"),
        )
        for name, value, inline in fields or []:
            embed.add_field(name=name, value=value, inline=inline)
        embed.set_footer(text=self.branding.footer_text())
        await channel.send(embed=embed)
