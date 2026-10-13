"""Entry point: start the local server, global hotkeys, and the Chrome window."""

from __future__ import annotations

import logging
import sys
import time

from screen_answer.browser import open_ui
from screen_answer.config import config_dir, load_settings
from screen_answer.server import Controller, EventHub, start_server

log = logging.getLogger("screen_answer")

STARTUP_GRACE = 90  # seconds to wait for the UI's first heartbeat
# Chrome throttles timers in minimized windows to about once a minute, so the
# heartbeat-only fallback has to be generous.
HEARTBEAT_TIMEOUT = 150
HANDOFF_WINDOW = 10  # a Chrome process that exits this fast handed off to a running one


def _setup_logging() -> None:
    handlers: list[logging.Handler] = []
    try:
        config_dir().mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(config_dir() / "screen-answer.log", encoding="utf-8"))
    except OSError:
        pass
    if sys.stderr is not None:  # None in the windowed .exe
        handlers.append(logging.StreamHandler())
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", handlers=handlers)


def _enable_windows_dpi_awareness() -> None:
    """So screenshots are captured at the monitor's real resolution."""
    if sys.platform == "win32":
        try:
            import ctypes

            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            pass


def _start_hotkeys(controller: Controller):
    try:
        from pynput import keyboard
    except Exception as e:
        log.warning("global hotkeys unavailable: %s", e)
        return None

    state = {"listener": None, "keys": None}

    def refresh() -> None:
        s = controller.settings
        keys = (s.hotkey_full, s.hotkey_region)
        if keys == state["keys"]:
            return
        if state["listener"] is not None:
            state["listener"].stop()
        bindings = {}
        if s.hotkey_full:
            bindings[s.hotkey_full] = lambda: controller.start_capture("full")
        if s.hotkey_region:
            bindings[s.hotkey_region] = lambda: controller.start_capture("region")
        try:
            listener = keyboard.GlobalHotKeys(bindings)
            listener.daemon = True
            listener.start()
            state["listener"] = listener
        except Exception as e:
            log.warning("couldn't register hotkeys %s: %s", keys, e)
            state["listener"] = None
            controller.hub.emit("toast", {"message": f"Hotkeys not registered: {e}"})
        state["keys"] = keys

    return refresh


def main() -> None:
    _setup_logging()
    _enable_windows_dpi_awareness()

    controller_hub = EventHub()
    controller = Controller(load_settings(), controller_hub)
    server, url = start_server(controller, controller_hub)
    log.info("UI served at %s", url.split("?")[0])

    refresh_hotkeys = _start_hotkeys(controller)
    browser = open_ui(url)
    if browser is None:
        log.info("Chrome not found; opened the default browser instead")

    started = time.monotonic()
    browser_exit: float | None = None
    try:
        while True:
            time.sleep(1)
            if refresh_hotkeys:
                refresh_hotkeys()  # picks up hotkey changes saved in Settings
            now = time.monotonic()
            if browser is not None and browser_exit is None and browser.poll() is not None:
                browser_exit = now
            if browser is not None and browser_exit is None:
                continue  # our Chrome window is open
            if browser_exit is not None and browser_exit - started > HANDOFF_WINDOW:
                break  # the user closed the app window
            # No process to watch (default browser, or Chrome handed off): use the heartbeat.
            if controller.ever_pinged:
                if now - controller.last_ping > HEARTBEAT_TIMEOUT:
                    break
            elif now - started > STARTUP_GRACE:
                break
    except KeyboardInterrupt:
        pass
    finally:
        controller.stop()
        server.shutdown()
        log.info("exiting")


if __name__ == "__main__":
    main()
