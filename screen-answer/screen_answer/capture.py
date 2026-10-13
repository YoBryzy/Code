"""Screen capture and image preparation for the Claude API."""

from __future__ import annotations

import base64
import io

import mss
from PIL import Image

# Long-edge cap: keeps on-screen text legible while staying well under API image limits.
MAX_LONG_EDGE = 2000
MAX_BASE64_BYTES = 4_500_000


def monitor_count() -> int:
    with mss.mss() as sct:
        return len(sct.monitors) - 1  # monitors[0] is the union of all screens


def _to_image(shot) -> Image.Image:
    return Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")


def grab_screen(monitor: int = 1) -> Image.Image:
    """Screenshot one monitor (1-based, mss numbering). Falls back to the primary."""
    with mss.mss() as sct:
        if monitor < 1 or monitor >= len(sct.monitors):
            monitor = 1
        return _to_image(sct.grab(sct.monitors[monitor]))


def grab_all_monitors() -> list[Image.Image]:
    """One full-resolution screenshot per monitor (kept separate so text stays sharp)."""
    with mss.mss() as sct:
        return [_to_image(sct.grab(m)) for m in sct.monitors[1:]]


def _fit(img: Image.Image, max_edge: int) -> Image.Image:
    img = img.convert("RGB")
    longest = max(img.size)
    if longest > max_edge:
        scale = max_edge / longest
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    return img


def encode_for_api(img: Image.Image) -> tuple[str, str]:
    """Downscale if needed and return (media_type, base64_data)."""
    img = _fit(img, MAX_LONG_EDGE)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    data = base64.b64encode(buf.getvalue())
    if len(data) <= MAX_BASE64_BYTES:
        return "image/png", data.decode("ascii")

    # Photo-heavy screens can make large PNGs; JPEG keeps text readable at a fraction of the size.
    for quality in (90, 80, 70):
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        data = base64.b64encode(buf.getvalue())
        if len(data) <= MAX_BASE64_BYTES:
            break
    return "image/jpeg", data.decode("ascii")


def preview_data_url(img: Image.Image, max_edge: int = 1600, quality: int = 82) -> str:
    """Small JPEG data URL for showing the capture in the UI."""
    img = _fit(img, max_edge)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
