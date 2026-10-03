from __future__ import annotations

from pathlib import Path
from time import time


def ensure_directories(*paths: Path) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def cleanup_old_files(directory: Path, max_age_seconds: int = 3600) -> int:
    if not directory.exists():
        return 0

    now = time()
    removed = 0
    for file_path in directory.iterdir():
        if not file_path.is_file():
            continue
        age = now - file_path.stat().st_mtime
        if age > max_age_seconds:
            file_path.unlink(missing_ok=True)
            removed += 1
    return removed
