"""Hide/show the app's Chrome window around a screenshot (Windows only; no-op elsewhere)."""

from __future__ import annotations

import sys
import time

WINDOW_TITLE = "Screen Answer"

if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes

    _user32 = ctypes.windll.user32
    _SW_MINIMIZE = 6
    _SW_RESTORE = 9
    _EnumProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def _find_windows() -> list[int]:
        found: list[int] = []

        def callback(hwnd, _lparam):
            if _user32.IsWindowVisible(hwnd):
                length = _user32.GetWindowTextLengthW(hwnd)
                if length:
                    buf = ctypes.create_unicode_buffer(length + 1)
                    _user32.GetWindowTextW(hwnd, buf, length + 1)
                    if buf.value == WINDOW_TITLE:
                        found.append(hwnd)
            return True

        _user32.EnumWindows(_EnumProc(callback), 0)
        return found

    def hide_app_window() -> bool:
        windows = _find_windows()
        for hwnd in windows:
            _user32.ShowWindow(hwnd, _SW_MINIMIZE)
        if windows:
            time.sleep(0.35)  # let the minimize animation finish before capturing
        return bool(windows)

    def show_app_window() -> None:
        for hwnd in _find_windows() or _find_minimized():
            # Restore only; Screen Answer never sends keystrokes or clicks.
            _user32.ShowWindow(hwnd, _SW_RESTORE)
            _user32.SetForegroundWindow(hwnd)

    def _find_minimized() -> list[int]:
        hwnd = _user32.FindWindowW(None, WINDOW_TITLE)
        return [hwnd] if hwnd else []

else:

    def hide_app_window() -> bool:
        return False

    def show_app_window() -> None:
        pass
