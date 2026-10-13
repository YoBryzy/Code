"""Settings persisted as JSON in the user's config directory."""

from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass, fields
from pathlib import Path

EFFORT_LEVELS = ("low", "medium", "high", "xhigh", "max")
DEFAULT_MODEL = "claude-opus-5-5"


def config_dir() -> Path:
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming")
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config")
    return base / "ScreenAnswer"


CONFIG_PATH = config_dir() / "config.json"


@dataclass
class Settings:
    api_key: str = ""
    model: str = DEFAULT_MODEL
    effort: str = "medium"
    monitor: int = 1  # mss index: 1 = primary monitor, 2 = second, ...
    all_monitors: bool = False  # full-screen scans include every monitor
    hotkey_full: str = "<ctrl>+<shift>+a"
    hotkey_region: str = "<ctrl>+<shift>+s"
    minimize_while_capturing: bool = True
    extra_instructions: str = ""

    def resolved_api_key(self) -> str:
        return self.api_key.strip() or os.environ.get("ANTHROPIC_API_KEY", "").strip()


def load_settings(path: Path = CONFIG_PATH) -> Settings:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return Settings()
    known = {f.name for f in fields(Settings)}
    settings = Settings(**{k: v for k, v in raw.items() if k in known})
    if settings.effort not in EFFORT_LEVELS:
        settings.effort = "medium"
    return settings


def save_settings(settings: Settings, path: Path = CONFIG_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(asdict(settings), indent=2), encoding="utf-8")
    if sys.platform != "win32":
        os.chmod(tmp, 0o600)  # the file holds an API key
    tmp.replace(path)
