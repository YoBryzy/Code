# Screen Answer

A Windows desktop app that reads the questions on your screen and answers them with Claude.

Double-click **ScreenAnswer.exe** and its UI opens in a Google Chrome app window. Press
**Ctrl+Shift+A** in any app or website. Screen Answer hides its window, takes a screenshot,
reads everything visible (text, code, charts, diagrams and answer choices) and streams the
answer back. Press **Ctrl+Shift+S** to drag a box around one question instead.

## Features

- **Global hotkeys** that work while any app is focused (you can change them in Settings).
- **Full-screen scan** of one monitor or all of them, with an optional 3 s or 5 s delay.
- **Select area**: freezes the screen so you can drag a box around a single question.
- **Streaming answers**: the answer is shown first in a highlighted box, followed by a short
  explanation. You can ask follow-up questions about the same screen.
- **Settings**: model (Opus 5.5 by default), effort level, monitor, hotkeys, and extra
  instructions such as "answer in Spanish".
- The UI uses artwork generated with Higgsfield (`screen_answer/web/assets/`): the app icon,
  the aurora background and the empty-state illustration.

## Download

Each push to `screen-answer/` triggers the **Build Screen Answer (.exe)** GitHub Actions
workflow. To download the app:

1. Open the repository's **Actions** tab and select the latest *Build Screen Answer (.exe)* run.
2. Download the **ScreenAnswer-windows** artifact and unzip it to get `ScreenAnswer.exe`.

If you push a tag named `screen-answer-v*` (for example `screen-answer-v1.0.0`), the workflow
also attaches the .exe to a GitHub Release.

> The .exe isn't code-signed, so Windows SmartScreen may show "Windows protected your PC" the
> first time you open it. Click **More info**, then **Run anyway**.

## First run

1. Open `ScreenAnswer.exe`. A Chrome window opens. If Chrome isn't installed, Microsoft Edge
   or your default browser opens instead.
2. Paste your Anthropic API key (create one at console.anthropic.com). The key is stored only
   on this computer, in `%APPDATA%\ScreenAnswer\config.json`.
3. Open a question and press **Ctrl+Shift+A**.

Closing the window quits the app. The log file is `%APPDATA%\ScreenAnswer\screen-answer.log`.

## How it works

```
ScreenAnswer.exe
 ├─ local web server on 127.0.0.1 (random port, per-launch token)
 │    ├─ serves the UI (screen_answer/web)
 │    └─ /api/*: capture, answer, follow-ups and settings, plus a server-sent event stream
 ├─ global hotkeys (pynput)
 ├─ screen capture (mss); the app's Chrome window is minimized during capture
 └─ Claude API (anthropic SDK): streaming, adaptive thinking, server-side refusal fallback
```

Screenshots are sent at up to 2000 px on the long edge. With several monitors, each monitor
is sent as its own image so text stays sharp. Screenshots go only to the Claude API and are
never saved to disk.

## Develop

```bash
cd screen-answer
pip install -r requirements.txt
python -m screen_answer  # starts the server and opens Chrome
```

Build the .exe on Windows with `pip install pyinstaller` and then `python build.py`. The output
is `dist/ScreenAnswer.exe`. PyInstaller can't cross-compile, so build on Windows or use the
GitHub Actions workflow.

| File | Purpose |
| --- | --- |
| `screen_answer/main.py` | Entry point: starts the server, hotkeys and the Chrome window, and tracks the app's lifetime |
| `screen_answer/server.py` | Local HTTP API, event stream and capture/answer controller |
| `screen_answer/solver.py` | Claude request, prompt and streaming |
| `screen_answer/capture.py` | Screenshots and image encoding |
| `screen_answer/browser.py` | Finds Chrome and opens it in app mode |
| `screen_answer/window.py` | Minimizes and restores the app window around captures (Windows) |
| `screen_answer/web/` | The UI (HTML, CSS and JS) |
