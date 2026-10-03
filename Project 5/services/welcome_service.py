from __future__ import annotations

from datetime import datetime, timezone

import discord

from utils.formatting import humanize_timedelta
from utils.placeholders import build_member_placeholders


class WelcomeService:
    def __init__(
        self,
        bot,
        config_service,
        storage_service,
        branding_service,
        banner_service,
        logging_service,
        analysis_service,
        onboarding_service,
    ) -> None:
        self.bot = bot
        self.config = config_service
        self.storage = storage_service
        self.branding = branding_service
        self.banner = banner_service
        self.logging = logging_service
        self.analysis = analysis_service
        self.onboarding = onboarding_service

    async def handle_member_join(self, member: discord.Member) -> None:
        if self.config.guild_id and member.guild.id != self.config.guild_id:
            return

        risk = self.analysis.analyze(member)
        existing = self.onboarding.get_member_state(member.guild.id, member.id)
        returning_member = bool(existing.get("last_leave_at"))

        await self.onboarding.record_join(member, risk.risk_level, risk.account_age_days, returning_member)
        assigned_roles = await self.onboarding.assign_join_roles(member)

        welcome_message = None
        if self.config.get("features", "public_welcome_enabled", default=True):
            welcome_message = await self.send_public_welcome(member, risk, returning_member)

        dm_sent = False
        if self.config.get("features", "dm_guide_enabled", default=True):
            dm_sent = await self.send_dm_guide(member)

        await self.logging.send(
            member.guild,
            title="Member Joined",
            description=f"{member.mention} joined the server.",
            color=self.config.color("accent_color"),
            fields=[
                ("Risk", risk.summary, True),
                ("Roles assigned", ", ".join(assigned_roles) if assigned_roles else "None", True),
                ("DM guide", "Sent" if dm_sent else "Skipped / failed", True),
                ("Welcome message", "Sent" if welcome_message else "Skipped", True),
            ],
        )

        if risk.risk_level in {"high", "medium"} and self.config.get("anti_alt", "warn_in_logs", default=True):
            await self.logging.send(
                member.guild,
                title="Suspicious Account Detected",
                description=f"{member.mention} triggered the anti-alt checker.",
                color=self.config.color("warning_color"),
                fields=[
                    ("Risk level", risk.risk_level.title(), True),
                    ("Account age", f"{risk.account_age_days} day(s)", True),
                ],
            )

        await self.send_join_milestones(member)

    async def send_public_welcome(self, member: discord.Member, risk, returning_member: bool = False):
        channel = await self._get_channel(member.guild, "welcome_channel_id")
        if not channel:
            channel = member.guild.system_channel
        if not channel:
            return None

        placeholders = build_member_placeholders(member)
        title_template = self.config.get("branding", "welcome_title", default="{username}, welcome to {guild}")
        description_template = self.config.get(
            "messages",
            "public_welcome_description",
            default="Your onboarding wizard is ready. Click the button below to move through setup one step at a time.",
        )

        extra_lines = []
        if returning_member and self.config.get("features", "returning_member_welcome_enabled", default=True):
            extra_lines.append(
                self.branding.render(
                    self.config.get("messages", "returning_member_description", default="Welcome back, {user}."),
                    placeholders,
                )
            )
        if risk.risk_level == "high":
            note = self.config.get("messages", "public_welcome_high_risk_note", default="")
            if note:
                extra_lines.append(note)

        avatar_bytes = await self._read_avatar(member)
        banner_bytes, filename = self.banner.create_banner(
            member=member,
            avatar_bytes=avatar_bytes,
            banner_type="returning" if returning_member else "welcome",
            theme=self.config.get("branding", "default_theme", default="pastel_luxe"),
            highlight_text="WELCOME BACK" if returning_member else "WELCOME TO",
            subtitle=member.guild.name,
        )
        file = discord.File(banner_bytes, filename=filename)

        account_age = max(0, (datetime.now(timezone.utc) - member.created_at).days)
        description = self.branding.render(description_template, placeholders)
        if extra_lines:
            description = description + "\n\n" + "\n".join(extra_lines)

        embed = discord.Embed(
            title=self.branding.render(title_template, placeholders),
            description=description,
            color=self.config.color("accent_color"),
        )
        embed.set_author(
            name=f"{member.guild.name} Onboarding",
            icon_url=member.guild.icon.url if member.guild.icon else member.display_avatar.url,
        )
        embed.set_image(url=f"attachment://{filename}")
        embed.add_field(
            name="Guided Setup",
            value="Use the onboarding button below to move through each step with Back and Next navigation.",
            inline=False,
        )
        embed.add_field(
            name="What You Will Configure",
            value="Terms, region, notification roles, playstyle, and final rules confirmation are all handled inside the wizard.",
            inline=False,
        )
        embed.add_field(
            name="Account Review",
            value=f"{risk.summary}\nAccount age: **{account_age} day(s)**\nMember number: **#{member.guild.member_count}**",
            inline=False,
        )
        embed.set_footer(text=self.branding.footer_text())

        view = self.bot.onboarding_view
        return await channel.send(content=member.mention, embed=embed, file=file, view=view)

    async def send_dm_guide(self, member: discord.Member) -> bool:
        try:
            placeholders = build_member_placeholders(member)
            embed = discord.Embed(
                title=self.branding.render(self.config.get("messages", "dm_title", default="Welcome to {guild}"), placeholders),
                description=self.branding.render(
                    self.config.get(
                        "messages",
                        "dm_description",
                        default="Your onboarding wizard is ready. Review the essentials below, then return to the server and press Start Onboarding.",
                    ),
                    placeholders,
                ),
                color=self.config.color("accent_color"),
            )
            embed.set_author(
                name=f"{member.guild.name} Member Guide",
                icon_url=member.guild.icon.url if member.guild.icon else member.display_avatar.url,
            )
            embed.add_field(
                name="Rules Summary",
                value="\n".join(f"- {line}" for line in self.config.get("messages", "dm_rules_summary", default=[])) or "No summary configured.",
                inline=False,
            )
            embed.add_field(
                name="Useful Channels",
                value="\n".join(self.config.get("messages", "dm_useful_channels", default=[])) or "No channel list configured.",
                inline=False,
            )
            embed.add_field(
                name="Need Help?",
                value=self.config.get("messages", "dm_support_text", default="Contact staff if you need help."),
                inline=False,
            )
            embed.set_footer(text=self.branding.footer_text())
            await member.send(embed=embed, view=self.bot.onboarding_view)
            return True
        except discord.HTTPException:
            return False

    async def send_goodbye(self, member: discord.Member, *, preview: bool = False):
        channel = await self._get_channel(member.guild, "goodbye_channel_id")
        if not channel:
            return None

        state = self.onboarding.get_member_state(member.guild.id, member.id)
        first_join_at = state.get("first_join_at")
        time_in_server = "unknown"
        if first_join_at:
            joined = datetime.fromisoformat(first_join_at)
            time_in_server = humanize_timedelta((datetime.now(timezone.utc) - joined).total_seconds())

        placeholders = build_member_placeholders(member, {"time_in_server": time_in_server})
        avatar_bytes = await self._read_avatar(member)
        banner_bytes, filename = self.banner.create_banner(
            member=member,
            avatar_bytes=avatar_bytes,
            banner_type="goodbye",
            theme=self.config.get("branding", "default_theme", default="pastel_luxe"),
            highlight_text="SEE YOU SOON",
            subtitle=f"{member.guild.name}  |  Stayed {time_in_server}",
        )
        embed = discord.Embed(
            title=self.branding.render(self.config.get("branding", "goodbye_title", default="Goodbye, {username}"), placeholders),
            description=self.branding.render(self.config.get("messages", "goodbye_description", default="{username} left the server."), placeholders),
            color=self.config.color("danger_color"),
        )
        file = discord.File(banner_bytes, filename=filename)
        embed.set_image(url=f"attachment://{filename}")
        embed.set_footer(text=self.branding.footer_text())

        if preview:
            return embed, file
        return await channel.send(embed=embed, file=file)

    async def send_theme_preview(self, interaction: discord.Interaction, theme: str, member: discord.Member) -> None:
        avatar_bytes = await self._read_avatar(member)
        banner_bytes, filename = self.banner.create_banner(
            member=member,
            avatar_bytes=avatar_bytes,
            banner_type="preview",
            theme=theme,
            highlight_text=theme.replace("_", " ").upper(),
            subtitle=f"{member.guild.name}  |  Theme Preview",
        )
        file = discord.File(banner_bytes, filename=filename)
        embed = discord.Embed(
            title=f"{theme.replace('_', ' ').title()} Theme Preview",
            description="Preview of the configured welcome card style.",
            color=self.config.color("accent_color"),
        )
        embed.set_image(url=f"attachment://{filename}")
        await interaction.followup.send(embed=embed, file=file, ephemeral=True)

    async def send_join_milestones(self, member: discord.Member) -> None:
        if self.config.get("features", "member_count_milestones_enabled", default=True):
            await self._send_member_count_milestone(member.guild)

    async def send_boost_milestone(self, member: discord.Member) -> None:
        if not self.config.get("features", "boost_messages_enabled", default=True):
            return
        channel = await self._get_channel(member.guild, "welcome_channel_id")
        if not channel:
            return
        embed = discord.Embed(
            title="Server Boost Received",
            description=f"Thanks {member.mention} for boosting **{member.guild.name}** and supporting the community.",
            color=self.config.color("success_color"),
        )
        embed.set_footer(text=self.branding.footer_text())
        await channel.send(embed=embed)

    async def send_anniversary_messages(self) -> int:
        if not self.config.get("features", "anniversary_messages_enabled", default=True):
            return 0

        count = 0
        state = self.storage.snapshot()
        today = datetime.now(timezone.utc).date()
        anniversary_bucket = state["milestones"].get("anniversaries", {})
        new_entries: dict[str, str] = {}

        for guild in self.bot.guilds:
            channel = await self._get_channel(guild, "welcome_channel_id")
            if not channel:
                continue
            for member in guild.members:
                if member.bot or not member.joined_at:
                    continue
                if member.joined_at.month != today.month or member.joined_at.day != today.day:
                    continue
                year_key = f"{guild.id}:{member.id}:{today.year}"
                if anniversary_bucket.get(year_key):
                    continue
                years = max(1, today.year - member.joined_at.year)
                embed = discord.Embed(
                    title="Membership Anniversary",
                    description=f"{member.mention} has been with **{guild.name}** for **{years} year(s)**. Thanks for being part of the community.",
                    color=self.config.color("success_color"),
                )
                embed.set_footer(text=self.branding.footer_text())
                await channel.send(embed=embed)
                new_entries[year_key] = today.isoformat()
                count += 1

        if count:

            def mutator(current: dict) -> dict:
                current["milestones"]["anniversaries"].update(new_entries)
                return current

            await self.storage.update(mutator)
        return count

    async def _send_member_count_milestone(self, guild: discord.Guild) -> None:
        channel = await self._get_channel(guild, "welcome_channel_id")
        if not channel:
            return

        target_values = set(int(value) for value in self.config.get("milestones", "member_count_values", default=[]))
        member_count = guild.member_count
        if member_count not in target_values:
            return

        def mutator(state: dict) -> bool:
            bucket = state["milestones"]["member_counts"]
            key = f"{guild.id}:{member_count}"
            if key in bucket:
                return False
            bucket.append(key)
            return True

        should_send = await self.storage.update(mutator)
        if not should_send:
            return

        embed = discord.Embed(
            title="Community Milestone",
            description=f"**{guild.name}** just reached **{member_count} members**. Welcome to the next chapter.",
            color=self.config.color("success_color"),
        )
        embed.set_footer(text=self.branding.footer_text())
        await channel.send(embed=embed)

    async def _get_channel(self, guild: discord.Guild, key: str):
        channel_id = self.config.get_channel_id(key)
        if not channel_id:
            return None
        return guild.get_channel(channel_id)

    async def _read_avatar(self, member: discord.Member) -> bytes | None:
        try:
            return await member.display_avatar.read()
        except discord.HTTPException:
            return None
