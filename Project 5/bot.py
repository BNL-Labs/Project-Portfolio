from __future__ import annotations

import asyncio
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from services.banner_service import BannerService
from services.branding_service import BrandingService
from services.config_service import ConfigService
from services.logging_service import LoggingService
from services.member_analysis_service import MemberAnalysisService
from services.onboarding_service import OnboardingService
from services.storage_service import StorageService
from services.welcome_service import WelcomeService
from utils.constants import EXTENSIONS
from utils.files import cleanup_old_files, ensure_directories
from utils.views import OnboardingView


class PremiumWelcomerBot(commands.Bot):
    def __init__(self, root: Path) -> None:
        intents = discord.Intents.default()
        intents.members = True
        intents.guilds = True
        super().__init__(command_prefix=commands.when_mentioned, intents=intents)
        self.root = root
        self.services = {}
        self.onboarding_view: OnboardingView | None = None
        self._view_registered = False

    async def setup_hook(self) -> None:
        config = ConfigService(self.root)
        storage = StorageService(config.state_path)
        await storage.initialize()

        generated_dir = self.root / "generated"
        ensure_directories(generated_dir, self.root / "data", self.root / "config")
        cleanup_old_files(generated_dir, max_age_seconds=3600)

        branding = BrandingService(config)
        banner = BannerService(config, branding, generated_dir)
        logging = LoggingService(self, config, branding)
        analysis = MemberAnalysisService(config)
        onboarding = OnboardingService(self, config, storage, logging)
        welcome = WelcomeService(self, config, storage, branding, banner, logging, analysis, onboarding)

        self.services = {
            "config": config,
            "storage": storage,
            "branding": branding,
            "banner": banner,
            "logging": logging,
            "analysis": analysis,
            "onboarding": onboarding,
            "welcome": welcome,
        }

        self.rebuild_onboarding_view()

        for extension in EXTENSIONS:
            await self.load_extension(extension)

        if config.auto_sync_commands:
            if config.guild_id:
                guild_object = discord.Object(id=config.guild_id)
                self.tree.copy_global_to(guild=guild_object)
                synced = await self.tree.sync(guild=guild_object)
            else:
                synced = await self.tree.sync()
            print(f"Synced {len(synced)} command(s).")

    def rebuild_onboarding_view(self) -> None:
        role_selectors = self.services["config"].get("role_selectors", default=[]) if self.services else []
        self.onboarding_view = OnboardingView(role_selectors)
        if not self._view_registered:
            self.add_view(self.onboarding_view)
            self._view_registered = True


async def main() -> None:
    load_dotenv()
    root = Path(__file__).resolve().parent
    bot = PremiumWelcomerBot(root)
    token = bot.services.get("config").token if bot.services else None
    if not token:
        config = ConfigService(root)
        token = config.token
    if not token:
        raise SystemExit("Please set DISCORD_TOKEN in your environment.")
    await bot.start(token)


if __name__ == "__main__":
    asyncio.run(main())
