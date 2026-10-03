from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def build_member_placeholders(member, extra: dict[str, Any] | None = None) -> dict[str, str]:
    created_at = member.created_at.astimezone(timezone.utc) if member.created_at else datetime.now(timezone.utc)
    joined_at = member.joined_at.astimezone(timezone.utc) if member.joined_at else datetime.now(timezone.utc)
    values = {
        "user": member.mention,
        "username": member.display_name,
        "guild": member.guild.name,
        "member_count": str(member.guild.member_count),
        "account_created": created_at.strftime("%Y-%m-%d"),
        "joined_at": joined_at.strftime("%Y-%m-%d"),
    }
    if extra:
        values.update({key: str(value) for key, value in extra.items()})
    return values


def render_template(template: str, values: dict[str, str]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace(f"{{{key}}}", value)
    return rendered
