"""Local web server that powers the Chrome UI.

Bound to 127.0.0.1 only. Every /api call must carry the per-launch token, and the
Host header must be the loopback address, so other websites can't drive the app.
"""

from __future__ import annotations

import json
import logging
import queue
import secrets
import sys
import threading
import time
import uuid
from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from PIL import Image

from screen_answer import APP_NAME, __version__
from screen_answer.capture import encode_for_api, grab_all_monitors, grab_screen, monitor_count, preview_data_url
from screen_answer.config import EFFORT_LEVELS, Settings, save_settings
from screen_answer.solver import MODEL_CHOICES, Cancelled, Solver
from screen_answer.window import hide_app_window, show_app_window

log = logging.getLogger(__name__)


def web_root() -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base / "screen_answer" / "web"


CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


class EventHub:
    """Fan-out of server-sent events to every open UI window."""

    def __init__(self) -> None:
        self._clients: list[queue.Queue] = []
        self._lock = threading.Lock()

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue()
        with self._lock:
            self._clients.append(q)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        with self._lock:
            if q in self._clients:
                self._clients.remove(q)

    def emit(self, event: str, data: dict | None = None) -> None:
        payload = json.dumps({"event": event, **(data or {})})
        with self._lock:
            for q in self._clients:
                q.put(payload)


def mask_key(key: str) -> str:
    return f"{key[:7]}…{key[-4:]}" if len(key) > 14 else ("set" if key else "")


class Controller:
    def __init__(self, settings: Settings, hub: EventHub):
        self.settings = settings
        self.hub = hub
        self.solver: Solver | None = None
        self.cancel = threading.Event()
        self.busy = threading.Lock()
        self.pending_region: tuple[str, Image.Image] | None = None
        self.last_ping = time.monotonic()
        self.ever_pinged = False

    # ----- state -----

    def public_state(self) -> dict:
        s = self.settings
        key = s.resolved_api_key()
        try:
            monitors = monitor_count()
        except Exception:
            monitors = 1
        settings = asdict(s)
        settings.pop("api_key")
        return {
            "app": APP_NAME,
            "version": __version__,
            "has_key": bool(key),
            "key_hint": mask_key(key),
            "monitors": monitors,
            "models": list(MODEL_CHOICES),
            "efforts": list(EFFORT_LEVELS),
            "busy": self.busy.locked(),
            "settings": settings,
            "platform": sys.platform,
        }

    def update_settings(self, data: dict) -> dict:
        s = self.settings
        if isinstance(data.get("api_key"), str) and data["api_key"].strip():
            s.api_key = data["api_key"].strip()
        if data.get("clear_api_key"):
            s.api_key = ""
        if data.get("model") in MODEL_CHOICES:
            s.model = data["model"]
        if data.get("effort") in EFFORT_LEVELS:
            s.effort = data["effort"]
        if isinstance(data.get("monitor"), int):
            s.monitor = max(1, data["monitor"])
        for flag in ("all_monitors", "minimize_while_capturing"):
            if isinstance(data.get(flag), bool):
                setattr(s, flag, data[flag])
        for text in ("hotkey_full", "hotkey_region", "extra_instructions"):
            if isinstance(data.get(text), str):
                setattr(s, text, data[text].strip())
        save_settings(s)
        self.hub.emit("settings", self.public_state())
        return self.public_state()

    # ----- capture -----

    def start_capture(self, mode: str, delay: float = 0, all_monitors: bool | None = None) -> None:
        """mode: 'full' answers immediately; 'region' sends the shot to the UI for cropping."""
        if not self.settings.resolved_api_key():
            self.hub.emit("need_key")
            show_app_window()
            return
        if not self.busy.acquire(blocking=False):
            self.hub.emit("toast", {"message": "Still working on the last one - press Stop first."})
            return
        use_all = self.settings.all_monitors if all_monitors is None else all_monitors
        threading.Thread(target=self._capture, args=(mode, delay, use_all), daemon=True).start()

    def _capture(self, mode: str, delay: float, use_all: bool) -> None:
        try:
            if delay > 0:
                self.hub.emit("countdown", {"seconds": int(delay)})
                time.sleep(delay)
            self.hub.emit("status", {"stage": "capturing", "text": "Capturing screen…"})
            hidden = hide_app_window() if self.settings.minimize_while_capturing else False
            try:
                if mode == "full" and use_all:
                    images = grab_all_monitors()
                else:
                    images = [grab_screen(self.settings.monitor)]
            finally:
                if hidden or mode == "region":
                    show_app_window()
        except Exception as e:
            log.exception("capture failed")
            self.busy.release()
            self.hub.emit("error", {"message": f"Couldn't capture the screen: {e}"})
            return

        if mode == "region":
            shot_id = uuid.uuid4().hex
            self.pending_region = (shot_id, images[0])
            self.busy.release()
            self.hub.emit("region", {
                "id": shot_id,
                "preview": preview_data_url(images[0], max_edge=2400, quality=88),
                "width": images[0].width,
                "height": images[0].height,
            })
            self.hub.emit("status", {"stage": "idle", "text": "Select an area"})
            return

        self._answer_images(images)

    def answer_region(self, shot_id: str, box: dict) -> None:
        if not self.pending_region or self.pending_region[0] != shot_id:
            raise ValueError("That capture expired - take a new one.")
        if not self.busy.acquire(blocking=False):
            raise ValueError("Still working on the last one.")
        img = self.pending_region[1]
        self.pending_region = None
        try:
            x, y, w, h = (float(box[k]) for k in ("x", "y", "w", "h"))
        except (KeyError, TypeError, ValueError):
            self.busy.release()
            raise ValueError("Invalid selection.")
        left = max(0, min(img.width, round(x * img.width)))
        top = max(0, min(img.height, round(y * img.height)))
        right = max(left + 1, min(img.width, round((x + w) * img.width)))
        bottom = max(top + 1, min(img.height, round((y + h) * img.height)))
        crop = img.crop((left, top, right, bottom))
        threading.Thread(target=self._answer_images, args=([crop],), daemon=True).start()

    def _answer_images(self, images: list[Image.Image]) -> None:
        """Runs on a worker thread while holding self.busy."""
        try:
            self.solver = Solver(
                self.settings.resolved_api_key(),
                self.settings.model,
                self.settings.effort,
                self.settings.extra_instructions,
            )
            self.solver.new_screenshot([encode_for_api(img) for img in images])
            self.hub.emit("new_answer", {
                "previews": [preview_data_url(img, max_edge=900, quality=78) for img in images],
                "sizes": [[img.width, img.height] for img in images],
            })
        except Exception as e:
            log.exception("prepare failed")
            self.busy.release()
            self.hub.emit("error", {"message": f"Couldn't prepare the request: {e}"})
            return
        self._run_solver()

    def follow_up(self, text: str) -> None:
        text = text.strip()
        if not text:
            raise ValueError("Type a question first.")
        if self.solver is None or not self.solver.messages:
            raise ValueError("Scan your screen first.")
        if not self.busy.acquire(blocking=False):
            raise ValueError("Still working on the last one.")
        self.solver.add_follow_up(text)
        self.hub.emit("follow_up", {"text": text})
        threading.Thread(target=self._run_solver, daemon=True).start()

    def _run_solver(self) -> None:
        """Runs on a worker thread while holding self.busy; always releases it."""
        self.cancel = threading.Event()
        try:
            self.solver.run(
                on_text=lambda t: self.hub.emit("delta", {"text": t}),
                on_status=lambda s: self.hub.emit("status", {"stage": _stage(s), "text": s}),
                cancel=self.cancel,
            )
            self.hub.emit("done", {"stopped": False})
        except Cancelled:
            self.hub.emit("done", {"stopped": True})
        except RuntimeError as e:
            self.hub.emit("error", {"message": str(e)})
        except Exception as e:
            log.exception("solver crashed")
            self.hub.emit("error", {"message": f"Unexpected error: {e}"})
        finally:
            self.busy.release()

    def stop(self) -> None:
        self.cancel.set()

    def ping(self) -> None:
        self.last_ping = time.monotonic()
        self.ever_pinged = True


def _stage(status: str) -> str:
    s = status.lower()
    if s.startswith("thinking"):
        return "thinking"
    if s.startswith("answering"):
        return "answering"
    return "reading"


def make_handler(controller: Controller, hub: EventHub, token: str, port_ref: list[int]):
    root = web_root().resolve()

    class Handler(BaseHTTPRequestHandler):
        server_version = "ScreenAnswer"

        def log_message(self, fmt, *args):  # keep the console quiet
            log.debug("%s - %s", self.address_string(), fmt % args)

        # ----- helpers -----

        def _host_ok(self) -> bool:
            host = self.headers.get("Host", "")
            return host in (f"127.0.0.1:{port_ref[0]}", f"localhost:{port_ref[0]}")

        def _token_ok(self, query: dict) -> bool:
            supplied = self.headers.get("X-Token") or (query.get("token") or [""])[0]
            return secrets.compare_digest(supplied, token)

        def _send_json(self, data: dict, status: int = 200) -> None:
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _read_json(self) -> dict:
            length = int(self.headers.get("Content-Length") or 0)
            if length > 1_000_000:
                raise ValueError("Request too large.")
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw or b"{}")
            if not isinstance(data, dict):
                raise ValueError("Expected a JSON object.")
            return data

        # ----- routes -----

        def do_GET(self) -> None:
            if not self._host_ok():
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            url = urlparse(self.path)
            query = parse_qs(url.query)
            if url.path.startswith("/api/"):
                if not self._token_ok(query):
                    self.send_error(HTTPStatus.UNAUTHORIZED)
                    return
                if url.path == "/api/events":
                    self._stream_events()
                elif url.path == "/api/state":
                    self._send_json(controller.public_state())
                else:
                    self.send_error(HTTPStatus.NOT_FOUND)
                return
            self._serve_static(url.path)

        def do_POST(self) -> None:
            if not self._host_ok():
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            url = urlparse(self.path)
            if not self._token_ok(parse_qs(url.query)):
                self.send_error(HTTPStatus.UNAUTHORIZED)
                return
            try:
                data = self._read_json()
                route = url.path
                if route == "/api/capture":
                    mode = data.get("mode") if data.get("mode") in ("full", "region") else "full"
                    delay = min(max(float(data.get("delay") or 0), 0), 10)
                    all_mon = data.get("all_monitors") if isinstance(data.get("all_monitors"), bool) else None
                    controller.start_capture(mode, delay, all_mon)
                    self._send_json({"ok": True})
                elif route == "/api/region":
                    controller.answer_region(str(data.get("id")), data.get("box") or {})
                    self._send_json({"ok": True})
                elif route == "/api/followup":
                    controller.follow_up(str(data.get("text") or ""))
                    self._send_json({"ok": True})
                elif route == "/api/stop":
                    controller.stop()
                    self._send_json({"ok": True})
                elif route == "/api/settings":
                    self._send_json(controller.update_settings(data))
                elif route == "/api/ping":
                    controller.ping()
                    self._send_json({"ok": True})
                else:
                    self.send_error(HTTPStatus.NOT_FOUND)
            except (ValueError, OSError) as e:
                self._send_json({"ok": False, "error": str(e)}, 400)

        def _serve_static(self, path: str) -> None:
            rel = "index.html" if path in ("", "/") else path.lstrip("/")
            target = (root / rel).resolve()
            if root not in target.parents or not target.is_file():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            body = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", CONTENT_TYPES.get(target.suffix, "application/octet-stream"))
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)

        def _stream_events(self) -> None:
            q = hub.subscribe()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            try:
                self.wfile.write(f"data: {json.dumps({'event': 'hello', **controller.public_state()})}\n\n".encode())
                self.wfile.flush()
                while True:
                    try:
                        payload = q.get(timeout=15)
                        self.wfile.write(f"data: {payload}\n\n".encode())
                    except queue.Empty:
                        self.wfile.write(b": keep-alive\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
                pass
            finally:
                hub.unsubscribe(q)

    return Handler


def start_server(controller: Controller, hub: EventHub) -> tuple[ThreadingHTTPServer, str]:
    token = secrets.token_urlsafe(24)
    port_ref = [0]
    server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(controller, hub, token, port_ref))
    server.daemon_threads = True
    port_ref[0] = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{port_ref[0]}/?token={token}"
