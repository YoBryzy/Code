"""CI probe 2: llama.cpp Windows assets + real Qwen3-VL timing on the runner."""
import base64, io, json, os, subprocess, sys, time, urllib.request, zipfile
from pathlib import Path

TOKEN = os.environ.get("GITHUB_TOKEN", "")
WORK = Path(os.environ.get("RUNNER_TEMP", ".")) / "probe2"
WORK.mkdir(parents=True, exist_ok=True)
CACHE = Path(os.environ.get("MODEL_CACHE", WORK / "models"))
CACHE.mkdir(parents=True, exist_ok=True)

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def dl(url, dest):
    if dest.exists():
        print("cached", dest.name); return
    t = time.time()
    tmp = dest.with_suffix(".part")
    with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.replace(dest)
    print("downloaded", dest.name, dest.stat().st_size, f"{time.time()-t:.0f}s")

print("===== llama.cpp releases")
hdr = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
rels = get("https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=4", hdr)
for r in rels:
    print(r["tag_name"], r["published_at"], r["prerelease"], len(r["assets"]))
    for a in r["assets"]:
        print("   ", a["name"], a["size"])
pick = None
for r in rels:
    for a in r["assets"]:
        n = a["name"].lower()
        if "win" in n and "cpu" in n and "x64" in n and n.endswith(".zip"):
            pick = (r["tag_name"], a); break
    if pick: break
print("PICK", pick and (pick[0], pick[1]["name"]))
tag, asset = pick
z = WORK / asset["name"]
dl(asset["browser_download_url"], z)
bindir = WORK / "llama"
with zipfile.ZipFile(z) as zf:
    zf.extractall(bindir)
exe = next(bindir.rglob("llama-server.exe"))
print("exe", exe)
print(sorted(p.name for p in exe.parent.iterdir()))
for args in (["--version"], ["--list-devices"]):
    out = subprocess.run([str(exe), *args], capture_output=True, text=True, timeout=60)
    print(args, out.returncode, out.stdout[-1500:], out.stderr[-1500:])
help_out = subprocess.run([str(exe), "--help"], capture_output=True, text=True, timeout=60).stdout
for line in help_out.splitlines():
    if any(k in line for k in ("image", "mmproj", "jinja", "webui", "ctx-size", "threads ", "--port", "-ngl", "reasoning", "parallel")):
        print("HELP", line)

import mss
from PIL import Image
with mss.MSS() if hasattr(mss, "MSS") else mss.mss() as s:
    shot = s.grab(s.monitors[1])
img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
buf = io.BytesIO(); img.save(buf, "JPEG", quality=85)
b64 = base64.b64encode(buf.getvalue()).decode()

HF = "https://huggingface.co/{}/resolve/main/{}"
models = {
    "2b": ("Qwen/Qwen3-VL-2B-Instruct-GGUF", "Qwen3VL-2B-Instruct-Q4_K_M.gguf", "mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf"),
    "4b": ("Qwen/Qwen3-VL-4B-Instruct-GGUF", "Qwen3VL-4B-Instruct-Q4_K_M.gguf", "mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf"),
}
schema = {"type": "object", "properties": {"what": {"type": "string"}, "windows": {"type": "array", "items": {"type": "string"}}, "x": {"type": "integer"}, "y": {"type": "integer"}}, "required": ["what", "windows", "x", "y"]}
for key, (repo, mf, pf) in models.items():
    m, p = CACHE / mf, CACHE / pf
    dl(HF.format(repo, mf), m); dl(HF.format(repo, pf), p)
    port = 18080
    log = open(WORK / f"server-{key}.log", "w")
    t0 = time.time()
    srv = subprocess.Popen([str(exe), "-m", str(m), "--mmproj", str(p), "--host", "127.0.0.1", "--port", str(port), "-c", "8192", "--no-webui"], stdout=log, stderr=subprocess.STDOUT)
    while True:
        try:
            h = get(f"http://127.0.0.1:{port}/health")
            if h.get("status") == "ok": break
        except Exception:
            pass
        if srv.poll() is not None: print("server died"); break
        time.sleep(1)
    print(key, "load time", f"{time.time()-t0:.1f}s")
    body = {
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}},
            {"type": "text", "text": "Describe this screen in one sentence, list visible window titles, and give the pixel x,y of the Start button / taskbar. Image is 1024x768."}]}],
        "temperature": 0, "max_tokens": 300,
        "response_format": {"type": "json_schema", "json_schema": {"name": "r", "schema": schema}},
    }
    t1 = time.time()
    req = urllib.request.Request(f"http://127.0.0.1:{port}/v1/chat/completions", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            resp = json.loads(r.read())
        print(key, "request time", f"{time.time()-t1:.1f}s")
        print(key, "content", resp["choices"][0]["message"]["content"])
        print(key, "usage", resp.get("usage"), resp.get("timings"))
    except Exception as e:
        print(key, "request ERR", e)
    srv.kill(); log.close()
    print((WORK / f"server-{key}.log").read_text()[-3000:])
