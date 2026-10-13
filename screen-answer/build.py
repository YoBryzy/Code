"""Build the standalone app with PyInstaller: dist/ScreenAnswer.exe on Windows."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PYNPUT_BACKEND = {"win32": "_win32", "darwin": "_darwin"}.get(sys.platform, "_xorg")


def make_icon() -> Path | None:
    from PIL import Image

    png = HERE / "screen_answer" / "web" / "assets" / "icon.png"
    if not png.exists():
        return None
    ico = HERE / "build" / "icon.ico"
    ico.parent.mkdir(exist_ok=True)
    img = Image.open(png).convert("RGBA")
    side = min(img.size)
    # The generated art has a margin around the tile; crop it so the icon fills the space.
    inset = round(side * 0.08)
    img = img.crop((inset, inset, side - inset, side - inset))
    img.save(ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    return ico


def main() -> None:
    subprocess.run([sys.executable, str(HERE / "fetch_assets.py")], check=True)
    icon = make_icon()
    web = HERE / "screen_answer" / "web"
    args = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm", "--clean", "--onefile", "--windowed",
        "--name", "ScreenAnswer",
        "--add-data", f"{web}{os.pathsep}screen_answer/web",
        # pynput picks its keyboard backend at runtime, so PyInstaller can't see it.
        "--hidden-import", f"pynput.keyboard.{PYNPUT_BACKEND}",
        "--hidden-import", f"pynput.mouse.{PYNPUT_BACKEND}",
        str(HERE / "run.py"),
    ]
    if icon:
        args[3:3] = ["--icon", str(icon)]
    subprocess.run(args, check=True, cwd=HERE)
    print("Built:", next((HERE / "dist").iterdir()))


if __name__ == "__main__":
    main()
