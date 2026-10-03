from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Callable


DEFAULT_STATE = {
    "members": {},
    "milestones": {
        "member_counts": [],
        "boost_messages": [],
        "anniversaries": {},
    },
}


class StorageService:
    def __init__(self, state_path: Path) -> None:
        self.state_path = state_path
        self._state: dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.state_path.exists():
            self.state_path.write_text(json.dumps(DEFAULT_STATE, indent=2), encoding="utf-8")
        self._state = json.loads(self.state_path.read_text(encoding="utf-8") or "{}")
        self._ensure_shape()

    def _ensure_shape(self) -> None:
        if not self._state:
            self._state = deepcopy(DEFAULT_STATE)
        self._state.setdefault("members", {})
        self._state.setdefault("milestones", {})
        self._state["milestones"].setdefault("member_counts", [])
        self._state["milestones"].setdefault("boost_messages", [])
        self._state["milestones"].setdefault("anniversaries", {})

    def snapshot(self) -> dict[str, Any]:
        return deepcopy(self._state)

    async def update(self, mutator: Callable[[dict[str, Any]], Any]) -> Any:
        async with self._lock:
            working = deepcopy(self._state)
            result = mutator(working)
            self._state = working
            self._ensure_shape()
            self.state_path.write_text(json.dumps(self._state, indent=2), encoding="utf-8")
            return result
