"""Download the UI artwork generated with Higgsfield into screen_answer/web/assets/.

The UI falls back to CSS-only visuals if these files are missing, so this step is
optional for development but runs automatically in the release build.
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_36US7GmRvEMi8QK5CbpjHfuCXy4"
ASSETS = {
    # App icon / logo
    "icon.png": f"{CDN}/hf_20261013_012553_868ac24b-efdf-4282-b9e5-1f50628b5911.png",
    # Aurora background
    "bg.png": f"{CDN}/hf_20261013_012552_4e6b307d-39ba-41c9-bdad-9fcecea2163b.png",
    # Empty-state illustration
    "empty.png": f"{CDN}/hf_20261013_012553_3f5aae31-3165-474b-9571-bf02871018fc.png",
}
# Downscale so the .exe stays small; the UI never shows them larger than this.
MAX_EDGE = {"icon.png": 512, "bg.png": 1920, "empty.png": 900}

DEST = Path(__file__).resolve().parent / "screen_answer" / "web" / "assets"


def main() -> int:
    from PIL import Image

    DEST.mkdir(parents=True, exist_ok=True)
    failed = 0
    for name, url in ASSETS.items():
        target = DEST / name
        if target.exists():
            print(f"have  {name}")
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "screen-answer-build"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                target.write_bytes(resp.read())
            img = Image.open(target)
            img.thumbnail((MAX_EDGE[name], MAX_EDGE[name]), Image.LANCZOS)
            img.save(target, optimize=True)
            print(f"got   {name} {img.size}")
        except Exception as e:  # keep building; the UI has fallbacks
            failed += 1
            print(f"FAIL  {name}: {e}", file=sys.stderr)
    return 1 if failed and "--strict" in sys.argv else 0


if __name__ == "__main__":
    sys.exit(main())
