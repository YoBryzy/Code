"""Open the UI as a standalone Google Chrome app window (falls back to Edge, then any browser)."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

from screen_answer.config import config_dir


def _windows_candidates() -> list[Path]:
    roots = [os.environ.get(k) for k in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
    paths = [Path(r) / "Google" / "Chrome" / "Application" / "chrome.exe" for r in roots if r]
    try:
        import winreg

        for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
            try:
                key = winreg.OpenKey(hive, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")
                paths.append(Path(winreg.QueryValue(key, None)))
            except OSError:
                pass
    except ImportError:
        pass
    # Edge is Chromium too and ships with every Windows install.
    paths += [Path(r) / "Microsoft" / "Edge" / "Application" / "msedge.exe" for r in roots if r]
    return paths


def find_chrome() -> str | None:
    if sys.platform == "win32":
        candidates = _windows_candidates()
    elif sys.platform == "darwin":
        candidates = [
            Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            Path.home() / "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
        ]
    else:
        candidates = [
            Path(p)
            for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge")
            if (p := shutil.which(name))
        ]
    for path in candidates:
        if path.is_file():
            return str(path)
    return None


def open_ui(url: str) -> subprocess.Popen | None:
    """Launch the UI. Returns the Chrome process when one was started, else None."""
    chrome = find_chrome()
    if chrome:
        profile = config_dir() / "chrome-profile"
        profile.mkdir(parents=True, exist_ok=True)
        args = [
            chrome,
            f"--app={url}",
            f"--user-data-dir={profile}",  # own profile: separate window, own lifetime
            "--window-size=1240,860",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-features=Translate",
        ]
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        try:
            return subprocess.Popen(args, creationflags=flags)
        except OSError:
            pass
    webbrowser.open(url)
    return None
