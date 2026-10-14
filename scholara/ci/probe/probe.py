"""CI probe: what does the Windows runner support? Prints facts, never fails."""
import ctypes, http.server, json, os, platform, subprocess, sys, threading, time, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOKEN = os.environ.get("GITHUB_TOKEN", "")

def section(t): print("\n=====", t, flush=True)

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

section("system")
print(platform.platform(), sys.version)
try:
    import psutil  # noqa
except ImportError:
    pass
print("cpu count", os.cpu_count())

section("chrome")
for p in [r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"]:
    if os.path.exists(p):
        out = subprocess.run(["powershell", "-NoProfile", "-Command", f"(Get-Item '{p}').VersionInfo.ProductVersion"], capture_output=True, text=True)
        print(p, out.stdout.strip())
        CHROME = p

section("inno / nsis")
for p in [r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe", r"C:\Program Files\Inno Setup 6\ISCC.exe", r"C:\Program Files (x86)\NSIS\makensis.exe"]:
    print(p, os.path.exists(p))

section("llama.cpp latest release")
try:
    rel = get("https://api.github.com/repos/ggml-org/llama.cpp/releases/latest", {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})
    print(rel["tag_name"], rel["published_at"])
    for a in rel["assets"]:
        if "win" in a["name"] or "ubuntu" in a["name"]:
            print("  ", a["name"], a["size"])
except Exception as e:
    print("ERR", e)

section("huggingface models")
for repo in ["ggml-org/Qwen2.5-VL-3B-Instruct-GGUF", "ggml-org/Qwen2.5-VL-7B-Instruct-GGUF",
             "Qwen/Qwen3-VL-4B-Instruct-GGUF", "Qwen/Qwen3-VL-2B-Instruct-GGUF", "Qwen/Qwen3-VL-8B-Instruct-GGUF",
             "ggml-org/Qwen3-VL-4B-Instruct-GGUF", "ggml-org/Qwen3-VL-2B-Instruct-GGUF", "ggml-org/Qwen3-VL-8B-Instruct-GGUF",
             "unsloth/Qwen3-VL-4B-Instruct-GGUF", "ggml-org/gemma-3-4b-it-GGUF", "ggml-org/SmolVLM2-2.2B-Instruct-GGUF",
             "ggml-org/UI-TARS-1.5-7B-GGUF", "ggml-org/Holo1.5-3B-GGUF", "ggml-org/Qwen3.5-4B-GGUF", "Qwen/Qwen3.5-4B-GGUF",
             "ggml-org/Qwen3-VL-30B-A3B-Instruct-GGUF"]:
    try:
        info = get(f"https://huggingface.co/api/models/{repo}?blobs=true")
        print(repo, "sha", info.get("sha"))
        for s in info.get("siblings", []):
            if s["rfilename"].endswith(".gguf"):
                lfs = s.get("lfs") or {}
                print("   ", s["rfilename"], s.get("size"), lfs.get("sha256"))
    except Exception as e:
        print(repo, "ERR", e)

section("screen + input")
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception as e:
    print("dpi", e)
u = ctypes.windll.user32
print("screen", u.GetSystemMetrics(0), u.GetSystemMetrics(1), "virtual", u.GetSystemMetrics(78), u.GetSystemMetrics(79))
print("input desktop / foreground", u.GetForegroundWindow())
class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]
print("SetCursorPos", u.SetCursorPos(200, 150))
pt = POINT(); u.GetCursorPos(ctypes.byref(pt)); print("cursor now", pt.x, pt.y)
try:
    import mss
    with mss.mss() as s:
        shot = s.grab(s.monitors[1])
        px = shot.pixel(10, 10)
        print("mss ok", shot.size, "pixel", px)
except Exception as e:
    print("mss ERR", e)

section("--load-extension with branded Chrome")
hits = []
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        hits.append(self.path); self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 38555), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
ext = HERE / "ext"
for label, extra in [("plain", []), ("disable-feature", ["--disable-features=DisableLoadExtensionCommandLineSwitch"])]:
    hits.clear()
    prof = Path(os.environ.get("RUNNER_TEMP", ".")) / f"prof-{label}"
    args = [CHROME, f"--user-data-dir={prof}", f"--load-extension={ext}", "--no-first-run", "--no-default-browser-check", *extra, "about:blank"]
    p = subprocess.Popen(args)
    time.sleep(15)
    print(label, "extension pinged:", bool(hits), hits)
    p.kill(); time.sleep(2)
    subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
    time.sleep(2)

section("remote debugging port with custom profile")
prof = Path(os.environ.get("RUNNER_TEMP", ".")) / "prof-rdp"
p = subprocess.Popen([CHROME, f"--user-data-dir={prof}", "--remote-debugging-port=0", "--no-first-run", "about:blank"])
time.sleep(8)
f = prof / "DevToolsActivePort"
print("DevToolsActivePort exists", f.exists(), f.read_text() if f.exists() else "")
p.kill()
subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
print("done")
