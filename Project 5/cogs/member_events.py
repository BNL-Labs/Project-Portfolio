from __future__ import annotations

from datetime import datetime, timedelta, timezone

import discord
from discord.ext import commands, tasks


class MemberEvents(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.verification_reminder_loop.start()
        self.anniversary_loop.start()

    def cog_unload(self) -> None:
        self.verification_reminder_loop.cancel()
        self.anniversary_loop.cancel()

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        print(f"Logged in as {self.bot.user} (ID: {self.bot.user.id})")

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        await self.bot.services["welcome"].handle_member_join(member)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member) -> None:
        await self.bot.services["onboarding"].record_leave(member)
        if self.bot.services["config"].get("features", "goodbye_enabled", default=True):
            await self.bot.services["welcome"].send_goodbye(member)
        await self.bot.services["logging"].send(
            member.guild,
            title="Member Left",
            description=f"{member.mention} left the server.",
            color=self.bot.services["config"].color("danger_color"),
        )

    @commands.Cog.listener()
    async def on_member_update(self, before: discord.Member, after: discord.Member) -> None:
        if before.premium_since is None and after.premium_since is not None:
            await self.bot.services["welcome"].send_boost_milestone(after)
            await self.bot.services["logging"].send(
                after.guild,
                title="Server Boost",
                description=f"{after.mention} boosted the server.",
                color=self.bot.services["config"].color("success_color"),
            )

    @tasks.loop(minutes=10)
    async def verification_reminder_loop(self) -> None:
        config = self.bot.services["config"]
        if not config.get("features", "verification_enabled", default=True):
            return
        if not config.get("verification", "reminder_enabled", default=True):
            return

        reminder_after = timedelta(minutes=int(config.get("verification", "reminder_after_minutes", default=20)))
        max_reminders = int(config.get("verification", "max_reminders", default=2))
        now = datetime.now(timezone.utc)
        snapshot = self.bot.services["storage"].snapshot()

        for guild in self.bot.guilds:
            for member in guild.members:
                if member.bot:
                    continue
                state = snapshot["members"].get(self.bot.services["onboarding"].member_key(guild.id, member.id), {})
                if not state or state.get("verified"):
                    continue
                joined_at_raw = state.get("last_join_at")
                if not joined_at_raw:
                    continue
                joined_at = datetime.fromisoformat(joined_at_raw)
                if now - joined_at < reminder_after:
                    continue
                if int(state.get("reminders_sent", 0)) >= max_reminders:
                    continue
                try:
                    await member.send(config.get("messages", "verification_reminder", default="Please verify to unlock the server."))
                except discord.HTTPException:
                    continue
                await self.bot.services["onboarding"].mark_reminder_sent(member)

    @verification_reminder_loop.before_loop
    async def before_verification_reminder_loop(self) -> None:
        await self.bot.wait_until_ready()

    @tasks.loop(hours=12)
    async def anniversary_loop(self) -> None:
        await self.bot.services["welcome"].send_anniversary_messages()

    @anniversary_loop.before_loop
    async def before_anniversary_loop(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MemberEvents(bot))
