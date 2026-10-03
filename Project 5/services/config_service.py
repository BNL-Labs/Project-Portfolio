from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class ConfigService:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.config_path = root / os.getenv("CONFIG_PATH", "config/settings.json")
        self.state_path = root / os.getenv("STATE_PATH", "data/state.json")
        self.token = os.getenv("DISCORD_TOKEN", "")
        self.guild_id = self._as_optional_int(os.getenv("GUILD_ID", ""))
        self.auto_sync_commands = os.getenv("AUTO_SYNC_COMMANDS", "true").lower() == "true"
        self._data: dict[str, Any] = {}
        self.reload()

    def reload(self) -> dict[str, Any]:
        source_path = self.config_path if self.config_path.exists() else self.root / "config/settings.example.json"
        self._data = json.loads(source_path.read_text(encoding="utf-8"))
        return self._data

    @property
    def data(self) -> dict[str, Any]:
        return self._data

    def get(self, *keys: str, default: Any = None) -> Any:
        node: Any = self._data
        for key in keys:
            if not isinstance(node, dict):
                return default
            node = node.get(key)
            if node is None:
                return default
        return node

    def resolve_path(self, value: str | None) -> Path | None:
        if not value:
            return None
        return (self.root / value).resolve()

    def get_channel_id(self, key: str) -> int | None:
        return self._as_optional_int(self.get("channels", key, default=""))

    def get_role_id(self, key: str) -> int | None:
        return self._as_optional_int(self.get("roles", key, default=""))

    def color(self, key: str) -> int:
        return int(self.get("branding", key, default=0x5865F2))

    @staticmethod
    def _as_optional_int(value: str | int | None) -> int | None:
        if value in (None, "", "0"):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.startswith("EDIT_"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None
