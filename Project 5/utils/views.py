from __future__ import annotations

import discord

from utils.constants import VIEW_ONBOARDING_START


def resolve_member(interaction: discord.Interaction):
    if isinstance(interaction.user, discord.Member):
        return interaction.user

    guild = interaction.guild
    if guild is None:
        config = interaction.client.services["config"]
        if config.guild_id:
            guild = interaction.client.get_guild(config.guild_id)
    if guild is None:
        return None
    return guild.get_member(interaction.user.id)


class OnboardingWizardView(discord.ui.View):
    STEP_KEYS = ("welcome", "terms", "region", "notifications", "playstyle", "rules", "complete")

    def __init__(self, bot, member: discord.Member) -> None:
        super().__init__(timeout=900)
        self.bot = bot
        self.member_id = member.id
        self.guild_id = member.guild.id
        stored = bot.services["onboarding"].get_member_state(member.guild.id, member.id)

        self.step_index = 0
        self.terms_accepted = bool(stored.get("accepted_rules"))
        self.rules_accepted = bool(stored.get("accepted_rules"))
        self.region_value = next(iter(stored.get("selected_roles", {}).get("region", [])), None)
        self.notification_values = list(stored.get("selected_roles", {}).get("notifications", []))
        self.playstyle_value = next(iter(stored.get("selected_roles", {}).get("games", [])), None)
        self.completion_result: dict | None = None
        self.is_finishing = False

        self._rebuild_items()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.member_id:
            await interaction.response.send_message("This onboarding wizard belongs to another member.", ephemeral=True)
            return False
        return True

    def build_embed(self) -> discord.Embed:
        config = self.bot.services["config"]
        brand = self.bot.services["branding"]
        step_key = self.STEP_KEYS[self.step_index]
        step_number = self.step_index + 1
        total_steps = len(self.STEP_KEYS)
        embed = discord.Embed(color=config.color("accent_color"))
        embed.set_author(name=f"{config.get('branding', 'brand_name', default='LEVEL UP')} Onboarding Wizard")
        embed.add_field(name="Progress", value=f"`{self._progress_bar()}`  Step {step_number} of {total_steps}", inline=False)

        if step_key == "welcome":
            embed.title = "Welcome!"
            embed.description = "Let's customize your experience with a guided onboarding flow."
            embed.add_field(
                name="What to expect",
                value="We will walk through access, region, notification roles, playstyle, and rules one step at a time.",
                inline=False,
            )
        elif step_key == "terms":
            embed.title = "Terms & Privacy"
            embed.description = "Please confirm that you understand the onboarding flow before continuing."
            embed.add_field(
                name="Confirmation Required",
                value="You must accept this step before the Next button unlocks.",
                inline=False,
            )
            embed.add_field(name="Status", value="Accepted" if self.terms_accepted else "Pending confirmation", inline=False)
        elif step_key == "region":
            embed.title = "Region / Language"
            embed.description = "Choose the region or language role that best matches you."
            embed.add_field(
                name="Current Selection",
                value=self._selected_label("region", self.region_value) or "No region selected yet.",
                inline=False,
            )
        elif step_key == "notifications":
            embed.title = "Notification Preferences"
            embed.description = "Pick the updates you want to receive. You can select multiple roles here."
            embed.add_field(
                name="Current Selection",
                value=", ".join(self._selected_labels("notifications", self.notification_values)) or "No notification roles selected yet.",
                inline=False,
            )
        elif step_key == "playstyle":
            embed.title = "Playstyle"
            embed.description = "Choose the playstyle role you want us to apply."
            embed.add_field(
                name="Current Selection",
                value=self._selected_label("games", self.playstyle_value) or "Choose either PvE or PvP to continue.",
                inline=False,
            )
            embed.add_field(
                name="Exclusive Logic",
                value="Selecting PvE removes PvP, and selecting PvP removes PvE.",
                inline=False,
            )
        elif step_key == "rules":
            rules = self.bot.services["config"].get("messages", "dm_rules_summary", default=[])
            embed.title = "Server Rules"
            embed.description = "Please review the short rules summary and confirm your agreement to finish onboarding."
            embed.add_field(
                name="Rules Summary",
                value="\n".join(f"- {line}" for line in rules) or "No short rules summary is configured yet.",
                inline=False,
            )
            embed.add_field(name="Agreement", value="Confirmed" if self.rules_accepted else "Waiting for confirmation", inline=False)
        elif step_key == "complete":
            result = self.completion_result or {}
            full_access = "Unlocked" if result.get("verification_ok") else "Pending staff attention"
            preference_sync = "Applied" if result.get("selectors_ok") else "Some roles need review"
            embed.title = "Onboarding Complete"
            embed.description = "Your onboarding session has been processed."
            embed.color = config.color("success_color") if result.get("ok") else config.color("warning_color")
            embed.add_field(name="Full Access", value=full_access, inline=False)
            embed.add_field(name="Preference Roles", value=preference_sync, inline=False)
            embed.add_field(
                name="Assigned Roles",
                value=", ".join(result.get("assigned_roles", [])) or "No new roles were added.",
                inline=False,
            )
            if result.get("removed_roles"):
                embed.add_field(name="Removed Roles", value=", ".join(result["removed_roles"]), inline=False)
            if result.get("issues"):
                embed.add_field(name="Notes", value="\n".join(f"- {item}" for item in result["issues"])[:1024], inline=False)

        embed.set_footer(text=brand.footer_text())
        return embed

    def _rebuild_items(self) -> None:
        self.clear_items()
        step_key = self.STEP_KEYS[self.step_index]

        if step_key == "terms":
            self.add_item(ToggleAgreementButton(self, field_name="terms"))
        elif step_key == "region":
            self.add_item(StepSelect(self, category_key="region", placeholder="Choose your region"))
        elif step_key == "notifications":
            self.add_item(StepSelect(self, category_key="notifications", placeholder="Choose your notifications"))
        elif step_key == "playstyle":
            self.add_item(StepSelect(self, category_key="games", placeholder="Choose your playstyle"))
        elif step_key == "rules":
            self.add_item(ToggleAgreementButton(self, field_name="rules"))

        if step_key != "complete":
            back = NavButton(self, direction=-1, label="Back", style=discord.ButtonStyle.secondary)
            back.disabled = self.step_index == 0 or self.is_finishing
            self.add_item(back)

            if step_key == "rules":
                finish = FinishButton(self)
                finish.disabled = not self.rules_accepted or self.is_finishing
                self.add_item(finish)
            else:
                next_button = NavButton(
                    self,
                    direction=1,
                    label="Continue" if step_key == "welcome" else "Next",
                    style=discord.ButtonStyle.primary,
                )
                next_button.disabled = not self._can_advance() or self.is_finishing
                self.add_item(next_button)

    def _can_advance(self) -> bool:
        step_key = self.STEP_KEYS[self.step_index]
        if step_key == "terms":
            return self.terms_accepted
        if step_key == "playstyle":
            return bool(self.playstyle_value)
        return True

    def move(self, direction: int) -> None:
        self.step_index = max(0, min(len(self.STEP_KEYS) - 1, self.step_index + direction))
        self._rebuild_items()

    def toggle(self, field_name: str) -> None:
        if field_name == "terms":
            self.terms_accepted = not self.terms_accepted
        elif field_name == "rules":
            self.rules_accepted = not self.rules_accepted
        self._rebuild_items()

    async def finalize(self, interaction: discord.Interaction) -> None:
        member = resolve_member(interaction)
        if member is None:
            self.completion_result = {
                "ok": False,
                "verification_ok": False,
                "selectors_ok": False,
                "assigned_roles": [],
                "removed_roles": [],
                "issues": ["Member context became unavailable during onboarding."],
            }
            self.step_index = len(self.STEP_KEYS) - 1
            self._rebuild_items()
            await interaction.response.edit_message(embed=self.build_embed(), view=self)
            return

        self.is_finishing = True
        self._rebuild_items()
        await interaction.response.defer()

        self.completion_result = await self.bot.services["onboarding"].complete_guided_onboarding(
            member,
            region_value=self.region_value,
            notification_values=self.notification_values,
            playstyle_value=self.playstyle_value,
            terms_accepted=self.terms_accepted,
            rules_accepted=self.rules_accepted,
        )
        self.is_finishing = False
        self.step_index = len(self.STEP_KEYS) - 1
        self._rebuild_items()
        await interaction.edit_original_response(embed=self.build_embed(), view=self)

    def set_selection(self, category_key: str, values: list[str]) -> None:
        if category_key == "region":
            self.region_value = values[0] if values else None
        elif category_key == "notifications":
            self.notification_values = values
        elif category_key == "games":
            self.playstyle_value = values[0] if values else None
        self._rebuild_items()

    def category(self, key: str) -> dict | None:
        for category in self.bot.services["config"].get("role_selectors", default=[]):
            if category.get("key") == key:
                return category
        return None

    def _selected_label(self, category_key: str, selected_value: str | None) -> str | None:
        if not selected_value:
            return None
        category = self.category(category_key) or {}
        for role in category.get("roles", []):
            if str(role.get("id")) == str(selected_value):
                return role.get("label")
        return None

    def _selected_labels(self, category_key: str, values: list[str]) -> list[str]:
        category = self.category(category_key) or {}
        labels: list[str] = []
        value_set = {str(value) for value in values}
        for role in category.get("roles", []):
            if str(role.get("id")) in value_set:
                labels.append(role.get("label", str(role.get("id"))))
        return labels

    def _progress_bar(self) -> str:
        total = len(self.STEP_KEYS)
        completed = self.step_index + 1
        return "[" + ("=" * completed) + ("-" * (total - completed)) + "]"


class StartOnboardingButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Start Onboarding", style=discord.ButtonStyle.primary, custom_id=VIEW_ONBOARDING_START)

    async def callback(self, interaction: discord.Interaction) -> None:
        member = resolve_member(interaction)
        if member is None:
            await interaction.response.send_message("Member context unavailable.", ephemeral=True)
            return

        wizard = OnboardingWizardView(interaction.client, member)
        await interaction.response.send_message(embed=wizard.build_embed(), view=wizard, ephemeral=True)


class ToggleAgreementButton(discord.ui.Button):
    def __init__(self, wizard: OnboardingWizardView, *, field_name: str) -> None:
        active = wizard.terms_accepted if field_name == "terms" else wizard.rules_accepted
        label = "Accepted" if active else "Confirm Agreement"
        style = discord.ButtonStyle.success if active else discord.ButtonStyle.secondary
        super().__init__(label=label, style=style)
        self.wizard = wizard
        self.field_name = field_name

    async def callback(self, interaction: discord.Interaction) -> None:
        self.wizard.toggle(self.field_name)
        await interaction.response.edit_message(embed=self.wizard.build_embed(), view=self.wizard)


class StepSelect(discord.ui.Select):
    def __init__(self, wizard: OnboardingWizardView, *, category_key: str, placeholder: str) -> None:
        category = wizard.category(category_key) or {}
        selected_values: list[str]
        if category_key == "region":
            selected_values = [wizard.region_value] if wizard.region_value else []
        elif category_key == "notifications":
            selected_values = wizard.notification_values
        else:
            selected_values = [wizard.playstyle_value] if wizard.playstyle_value else []

        options = []
        for role in category.get("roles", []):
            options.append(
                discord.SelectOption(
                    label=role.get("label", str(role.get("id"))),
                    value=str(role.get("id")),
                    description=role.get("description", "")[:100],
                    emoji=role.get("emoji"),
                    default=str(role.get("id")) in {str(value) for value in selected_values},
                )
            )

        max_values = int(category.get("max_values", len(options) or 1))
        if category_key == "games":
            max_values = 1

        super().__init__(
            placeholder=placeholder,
            min_values=int(category.get("min_values", 0)),
            max_values=min(max_values, len(options)) if options else 1,
            options=options or [discord.SelectOption(label="No options configured", value="missing", default=True)],
            disabled=not options,
        )
        self.wizard = wizard
        self.category_key = category_key

    async def callback(self, interaction: discord.Interaction) -> None:
        self.wizard.set_selection(self.category_key, list(self.values))
        await interaction.response.edit_message(embed=self.wizard.build_embed(), view=self.wizard)


class NavButton(discord.ui.Button):
    def __init__(self, wizard: OnboardingWizardView, *, direction: int, label: str, style: discord.ButtonStyle) -> None:
        super().__init__(label=label, style=style)
        self.wizard = wizard
        self.direction = direction

    async def callback(self, interaction: discord.Interaction) -> None:
        self.wizard.move(self.direction)
        await interaction.response.edit_message(embed=self.wizard.build_embed(), view=self.wizard)


class FinishButton(discord.ui.Button):
    def __init__(self, wizard: OnboardingWizardView) -> None:
        super().__init__(label="Finish", style=discord.ButtonStyle.success)
        self.wizard = wizard

    async def callback(self, interaction: discord.Interaction) -> None:
        await self.wizard.finalize(interaction)


class OnboardingView(discord.ui.View):
    def __init__(self, role_selectors: list[dict]) -> None:
        super().__init__(timeout=None)
        self.add_item(StartOnboardingButton())
