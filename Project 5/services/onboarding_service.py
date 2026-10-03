from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import discord

from utils.formatting import bool_icon


class OnboardingService:
    def __init__(self, bot, config_service, storage_service, logging_service) -> None:
        self.bot = bot
        self.config = config_service
        self.storage = storage_service
        self.logging = logging_service

    def member_key(self, guild_id: int, member_id: int) -> str:
        return f"{guild_id}:{member_id}"

    async def record_join(self, member: discord.Member, risk_level: str, account_age_days: int, returning_member: bool) -> dict[str, Any]:
        timestamp = datetime.now(timezone.utc).isoformat()

        def mutator(state: dict[str, Any]) -> dict[str, Any]:
            members = state["members"]
            key = self.member_key(member.guild.id, member.id)
            existing = members.get(key, {})
            first_join_at = existing.get("first_join_at", timestamp)
            members[key] = {
                **existing,
                "guild_id": member.guild.id,
                "member_id": member.id,
                "username": str(member),
                "display_name": member.display_name,
                "first_join_at": first_join_at,
                "last_join_at": timestamp,
                "last_leave_at": existing.get("last_leave_at"),
                "accepted_rules": existing.get("accepted_rules", False),
                "verified": existing.get("verified", False),
                "verified_at": existing.get("verified_at"),
                "onboarding_completed_at": existing.get("onboarding_completed_at"),
                "risk_level": risk_level,
                "account_age_days": account_age_days,
                "returning_member": returning_member,
                "reminders_sent": 0,
                "reminder_last_sent_at": None,
                "selected_roles": existing.get("selected_roles", {}),
            }
            return members[key]

        return await self.storage.update(mutator)

    async def record_leave(self, member: discord.Member) -> dict[str, Any] | None:
        timestamp = datetime.now(timezone.utc).isoformat()

        def mutator(state: dict[str, Any]) -> dict[str, Any] | None:
            key = self.member_key(member.guild.id, member.id)
            existing = state["members"].get(key)
            if not existing:
                return None
            existing["last_leave_at"] = timestamp
            existing["display_name"] = member.display_name
            return existing

        return await self.storage.update(mutator)

    async def assign_join_roles(self, member: discord.Member) -> list[str]:
        if member.bot:
            role = self._get_configured_role(member.guild, "bot_role_id")
            if not role:
                return []
            result = await self._apply_role_changes(
                member,
                add_roles=[role],
                remove_roles=[],
                reason="Bot auto-role",
                context="bot join role",
            )
            if not result["ok"]:
                await self._log_role_issue(
                    member.guild,
                    member,
                    "bot-join",
                    "Failed to assign the bot autorole.",
                    details=result["errors"],
                )
            return result["added"]

        verification_enabled = self.config.get("features", "verification_enabled", default=True)
        role_key = "unverified_role_id" if verification_enabled else "auto_role_id"
        reason = "Unverified onboarding role" if verification_enabled else "Auto role on join"
        role = self._get_configured_role(member.guild, role_key)
        if not role:
            return []

        result = await self._apply_role_changes(
            member,
            add_roles=[role],
            remove_roles=[],
            reason=reason,
            context="join role assignment",
        )
        if not result["ok"]:
            await self._log_role_issue(
                member.guild,
                member,
                "join",
                "Failed to assign the onboarding join role.",
                details=result["errors"],
            )
        return result["added"]

    async def complete_verification(self, member: discord.Member) -> dict[str, Any]:
        verified_role = self._get_configured_role(member.guild, "verified_role_id")
        unverified_role = self._get_configured_role(member.guild, "unverified_role_id")
        auto_role = self._get_configured_role(member.guild, "auto_role_id")

        roles_to_add = [role for role in (verified_role, auto_role) if role]
        roles_to_remove = [role for role in (unverified_role,) if role]
        result = await self._apply_role_changes(
            member,
            add_roles=roles_to_add,
            remove_roles=roles_to_remove,
            reason="Verification completed",
            context="verification role update",
        )

        if not result["ok"]:
            await self._log_role_issue(
                member.guild,
                member,
                "verification",
                "Failed to update roles during verification.",
                details=result["errors"],
            )
            return result

        def mutator(state: dict[str, Any]) -> dict[str, Any]:
            key = self.member_key(member.guild.id, member.id)
            entry = state["members"].setdefault(key, {})
            now = datetime.now(timezone.utc).isoformat()
            entry["accepted_rules"] = True
            entry["verified"] = True
            entry["verified_at"] = now
            entry["onboarding_completed_at"] = now
            return entry

        await self.storage.update(mutator)
        return result

    async def update_role_selection(self, member: discord.Member, category_key: str, selected_values: list[str]) -> dict[str, Any]:
        category = next((item for item in self.config.get("role_selectors", default=[]) if item["key"] == category_key), None)
        if not category:
            return {
                "ok": False,
                "user_message": "This role selector is no longer available. Please contact staff.",
                "added": [],
                "removed": [],
                "failed": [],
            }

        working_member = await self._fetch_member_fresh(member)
        validation = await self._validate_role_environment(working_member)
        if validation["error"]:
            await self._log_role_issue(
                working_member.guild,
                working_member,
                category_key,
                validation["error"],
                details=validation["details"],
            )
            return {
                "ok": False,
                "user_message": validation["error"],
                "added": [],
                "removed": [],
                "failed": [],
            }

        selected_set = {str(value) for value in selected_values}
        resolved_roles = self._resolve_selector_roles(working_member.guild, category, validation["bot_member"])
        if not resolved_roles["available"] and resolved_roles["issues"]:
            user_message = "This selector is temporarily unavailable because one or more roles are misconfigured."
            await self._log_role_issue(
                working_member.guild,
                working_member,
                category_key,
                user_message,
                details=resolved_roles["issues"],
            )
            return {
                "ok": False,
                "user_message": user_message,
                "added": [],
                "removed": [],
                "failed": [],
            }

        known_roles = resolved_roles["available"]
        selected_roles = [role for role_id, role in known_roles.items() if role_id in selected_set]
        roles_to_remove = [role for role_id, role in known_roles.items() if role_id not in selected_set and role in working_member.roles]

        result = await self._apply_role_changes(
            working_member,
            add_roles=selected_roles,
            remove_roles=roles_to_remove,
            reason=f"Role selector: {category_key}",
            context=f"selector:{category_key}",
        )

        selected_role_ids = [str(role.id) for role in selected_roles]

        def mutator(state: dict[str, Any]) -> dict[str, Any]:
            key = self.member_key(working_member.guild.id, working_member.id)
            entry = state["members"].setdefault(key, {})
            entry.setdefault("selected_roles", {})
            entry["selected_roles"][category_key] = selected_role_ids
            return entry

        await self.storage.update(mutator)

        issue_lines = list(resolved_roles["issues"])
        if result["errors"]:
            issue_lines.extend(result["errors"])

        summary = []
        if result["added"]:
            summary.append(f"Assigned: {', '.join(result['added'])}")
        if result["removed"]:
            summary.append(f"Removed: {', '.join(result['removed'])}")
        if not summary and result["ok"]:
            summary.append("Your roles were already up to date.")
        if issue_lines and result["ok"]:
            summary.append("Some options could not be processed. Staff have been notified.")
            await self._log_role_issue(
                working_member.guild,
                working_member,
                category_key,
                "Selector completed with configuration warnings.",
                details=issue_lines,
            )
        if not result["ok"]:
            await self._log_role_issue(
                working_member.guild,
                working_member,
                category_key,
                "Role selector failed after retry.",
                details=issue_lines or result["errors"],
            )
            return {
                "ok": False,
                "user_message": "I couldn't finish updating your roles right now. Please try again in a moment or contact staff.",
                "added": result["added"],
                "removed": result["removed"],
                "failed": issue_lines,
            }

        return {
            "ok": True,
            "user_message": "\n".join(summary),
            "added": result["added"],
            "removed": result["removed"],
            "failed": issue_lines,
        }

    async def mark_reminder_sent(self, member: discord.Member) -> None:
        def mutator(state: dict[str, Any]) -> dict[str, Any]:
            key = self.member_key(member.guild.id, member.id)
            entry = state["members"].setdefault(key, {})
            entry["reminders_sent"] = int(entry.get("reminders_sent", 0)) + 1
            entry["reminder_last_sent_at"] = datetime.now(timezone.utc).isoformat()
            return entry

        await self.storage.update(mutator)

    def get_member_state(self, guild_id: int, member_id: int) -> dict[str, Any]:
        state = self.storage.snapshot()
        return state["members"].get(self.member_key(guild_id, member_id), {})

    def build_status_lines(self, member: discord.Member) -> list[str]:
        info = self.get_member_state(member.guild.id, member.id)
        selected_roles = info.get("selected_roles", {})
        selected_count = sum(len(values) for values in selected_roles.values())
        return [
            f"Verified: {bool_icon(bool(info.get('verified')))}",
            f"Rules accepted: {bool_icon(bool(info.get('accepted_rules')))}",
            f"Risk level: {info.get('risk_level', 'unknown')}",
            f"Account age: {info.get('account_age_days', 'unknown')} days",
            f"Role selections: {selected_count}",
            f"Returning member: {bool_icon(bool(info.get('returning_member')))}",
        ]

    async def complete_guided_onboarding(
        self,
        member: discord.Member,
        *,
        region_value: str | None,
        notification_values: list[str],
        playstyle_value: str | None,
        terms_accepted: bool,
        rules_accepted: bool,
    ) -> dict[str, Any]:
        if not terms_accepted:
            return {
                "ok": False,
                "verification_ok": False,
                "selectors_ok": False,
                "assigned_roles": [],
                "removed_roles": [],
                "issues": ["You need to accept the Terms & Privacy step before finishing onboarding."],
            }

        if not rules_accepted:
            return {
                "ok": False,
                "verification_ok": False,
                "selectors_ok": False,
                "assigned_roles": [],
                "removed_roles": [],
                "issues": ["You need to confirm the server rules before finishing onboarding."],
            }

        working_member = await self._fetch_member_fresh(member)
        assigned_roles: list[str] = []
        removed_roles: list[str] = []
        issues: list[str] = []
        selector_results: list[dict[str, Any]] = []

        steps = [
            ("region", [region_value] if region_value else []),
            ("notifications", notification_values),
            ("games", [playstyle_value] if playstyle_value else []),
        ]

        for category_key, values in steps:
            result = await self.update_role_selection(working_member, category_key, values)
            selector_results.append(result)
            assigned_roles.extend(result.get("added", []))
            removed_roles.extend(result.get("removed", []))
            if not result.get("ok"):
                issues.append(result.get("user_message", f"{category_key} selection failed."))
            if result.get("failed"):
                issues.extend(result["failed"])
            working_member = await self._fetch_member_fresh(working_member)

        verification = await self.complete_verification(working_member)
        assigned_roles.extend(verification.get("added", []))
        removed_roles.extend(verification.get("removed", []))
        if not verification.get("ok"):
            issues.append("I could not fully unlock your access because the verification role update failed.")
            issues.extend(verification.get("errors", []))

        return {
            "ok": verification.get("ok") and all(result.get("ok") for result in selector_results),
            "verification_ok": verification.get("ok"),
            "selectors_ok": all(result.get("ok") for result in selector_results),
            "assigned_roles": self._dedupe_names(assigned_roles),
            "removed_roles": self._dedupe_names(removed_roles),
            "issues": self._dedupe_names(issues),
        }

    async def _fetch_member_fresh(self, member: discord.Member) -> discord.Member:
        try:
            return await member.guild.fetch_member(member.id)
        except discord.HTTPException:
            return member

    async def _validate_role_environment(self, member: discord.Member) -> dict[str, Any]:
        bot_member = member.guild.me or member.guild.get_member(self.bot.user.id if self.bot.user else 0)
        if bot_member is None and self.bot.user:
            try:
                bot_member = await member.guild.fetch_member(self.bot.user.id)
            except discord.HTTPException:
                bot_member = None

        if bot_member is None:
            return {
                "error": "I couldn't verify my role permissions in this server.",
                "details": ["Bot member could not be fetched from the guild."],
                "bot_member": None,
            }

        if not bot_member.guild_permissions.manage_roles:
            return {
                "error": "I need the Manage Roles permission before I can update your selections.",
                "details": ["Bot is missing the Manage Roles permission."],
                "bot_member": bot_member,
            }

        return {"error": None, "details": [], "bot_member": bot_member}

    def _resolve_selector_roles(self, guild: discord.Guild, category: dict, bot_member: discord.Member) -> dict[str, Any]:
        available: dict[str, discord.Role] = {}
        issues: list[str] = []

        for role_data in category.get("roles", []):
            label = role_data.get("label", "Unknown role")
            raw_role_id = role_data.get("id")
            role_id = self.config._as_optional_int(raw_role_id)
            if not role_id:
                issues.append(f"{label}: invalid role id `{raw_role_id}`.")
                continue

            role = guild.get_role(role_id)
            if role is None:
                issues.append(f"{label}: role `{role_id}` was not found in the server.")
                continue

            if role.managed:
                issues.append(f"{label}: role `{role.name}` is managed by an integration and cannot be assigned manually.")
                continue

            if guild.owner_id != bot_member.id and bot_member.top_role <= role:
                issues.append(f"{label}: bot role hierarchy is too low for `{role.name}`.")
                continue

            available[str(role.id)] = role

        return {"available": available, "issues": issues}

    async def _apply_role_changes(
        self,
        member: discord.Member,
        *,
        add_roles: list[discord.Role],
        remove_roles: list[discord.Role],
        reason: str,
        context: str,
    ) -> dict[str, Any]:
        add_roles = self._unique_roles(add_roles)
        remove_roles = self._unique_roles(remove_roles)
        add_roles = [role for role in add_roles if role not in member.roles]
        remove_roles = [role for role in remove_roles if role in member.roles and role not in add_roles]

        if not add_roles and not remove_roles:
            return {"ok": True, "added": [], "removed": [], "errors": []}

        errors: list[str] = []
        working_member = member

        for attempt in range(2):
            try:
                if remove_roles:
                    await working_member.remove_roles(*remove_roles, reason=reason)
                if add_roles:
                    await working_member.add_roles(*add_roles, reason=reason)
            except discord.Forbidden as exc:
                errors.append(f"{context}: Discord denied the role update ({exc.__class__.__name__}).")
                break
            except discord.HTTPException as exc:
                errors.append(f"{context}: Discord API error during role update ({exc}).")
                if attempt == 1:
                    break

            working_member = await self._fetch_member_fresh(working_member)
            role_ids = {role.id for role in working_member.roles}
            missing_adds = [role for role in add_roles if role.id not in role_ids]
            lingering_removals = [role for role in remove_roles if role.id in role_ids]

            if not missing_adds and not lingering_removals:
                return {
                    "ok": True,
                    "added": [role.name for role in add_roles],
                    "removed": [role.name for role in remove_roles],
                    "errors": errors,
                }

            if attempt == 0:
                add_roles = missing_adds
                remove_roles = lingering_removals
                errors.append(
                    f"{context}: verification mismatch after first update, retrying once."
                )
                continue

            if missing_adds:
                errors.append(f"{context}: roles still missing after retry: {', '.join(role.name for role in missing_adds)}.")
            if lingering_removals:
                errors.append(f"{context}: roles still present after retry: {', '.join(role.name for role in lingering_removals)}.")

        return {"ok": False, "added": [], "removed": [], "errors": errors}

    def _get_configured_role(self, guild: discord.Guild, key: str) -> discord.Role | None:
        role_id = self.config.get_role_id(key)
        if not role_id:
            return None
        return guild.get_role(role_id)

    def _unique_roles(self, roles: list[discord.Role]) -> list[discord.Role]:
        unique: list[discord.Role] = []
        seen: set[int] = set()
        for role in roles:
            if role.id in seen:
                continue
            unique.append(role)
            seen.add(role.id)
        return unique

    def _dedupe_names(self, values: list[str]) -> list[str]:
        deduped: list[str] = []
        seen: set[str] = set()
        for value in values:
            if value in seen or not value:
                continue
            deduped.append(value)
            seen.add(value)
        return deduped

    async def _log_role_issue(
        self,
        guild: discord.Guild,
        member: discord.Member,
        category_key: str,
        summary: str,
        *,
        details: list[str] | None = None,
    ) -> None:
        await self.logging.send(
            guild,
            title="Role Assignment Issue",
            description=f"{member.mention} hit a role selector problem in `{category_key}`.",
            color=self.config.color("warning_color"),
            fields=[
                ("Summary", summary, False),
                ("Details", "\n".join(details or ["No extra details provided."])[:1024], False),
            ],
        )
