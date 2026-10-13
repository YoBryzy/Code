"use strict";

// ---------- auth token (passed in the launch URL, kept for reloads) ----------
const params = new URLSearchParams(location.search);
let TOKEN = params.get("token") || "";
try {
  if (TOKEN) sessionStorage.setItem("sa-token", TOKEN);
  else TOKEN = sessionStorage.getItem("sa-token") || "";
} catch (_) { /* storage unavailable */ }
if (params.has("token")) history.replaceState(null, "", "/");

const $ = (id) => document.getElementById(id);
const state = {
  app: null,
  busy: false,
  delay: 0,
  current: null, // { card, body, raw }
  region: null,  // { id, start, box }
};

async function api(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Token": TOKEN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (_) { /* empty */ }
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- toasts ----------
function toast(message, kind = "") {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  $("toasts").appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 3200);
}

// ---------- hotkey labels ----------
function hotkeyHTML(spec) {
  if (!spec) return '<span class="kbd">—</span>';
  const mac = state.app && state.app.platform === "darwin";
  return spec.split("+").map((part) => {
    let k = part.replace(/[<>]/g, "");
    const names = { ctrl: "Ctrl", shift: "Shift", alt: mac ? "⌥" : "Alt", cmd: "⌘", space: "Space", enter: "Enter" };
    k = names[k.toLowerCase()] || (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
    return `<span class="kbd">${escapeHTML(k)}</span>`;
  }).join("");
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- app state ----------
function applyState(app) {
  state.app = app;
  const s = app.settings;
  $("versionTag").textContent = `v${app.version} · AI screen reader`;
  $("modelChipText").textContent = `${prettyModel(s.model)} · ${s.effort}`;
  $("hotkeyFull").innerHTML = hotkeyHTML(s.hotkey_full);
  $("hotkeyFullEmpty").innerHTML = hotkeyHTML(s.hotkey_full);
  $("hotkeyRegion").innerHTML = hotkeyHTML(s.hotkey_region);
  $("scopeGroup").hidden = app.monitors < 2;
  setSegment($("scopeSeg"), s.all_monitors ? "all" : "one");
  $("welcome").hidden = app.has_key;
  setBusy(app.busy);
}

function prettyModel(id) {
  const m = /claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id || "");
  if (!m) return id || "Claude";
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? "." + m[3] : ""}`;
}

function setSegment(seg, value) {
  seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.value === String(value)));
}

// ---------- "AI is using your computer" banner ----------
let bannerTimer = null;
function setAiBanner(mode) {
  const el = $("aiBanner");
  clearTimeout(bannerTimer);
  if (mode === "on") {
    el.dataset.state = "on";
    $("aiBannerText").textContent = "AI is using your computer — reading your screen to answer";
  } else if (mode === "done") {
    el.dataset.state = "done";
    $("aiBannerText").textContent = "The AI has stopped. Nothing was clicked or typed.";
    bannerTimer = setTimeout(() => { el.dataset.state = "off"; }, 6000);
  } else {
    el.dataset.state = "off";
  }
}

function setBusy(busy) {
  if (busy && !state.busy) setAiBanner("on");
  if (!busy && state.busy) setAiBanner("done");
  state.busy = busy;
  $("scanBtn").disabled = busy;
  $("regionBtn").disabled = busy;
  $("stopBtn").disabled = !busy;
  const canFollow = !busy && !!state.current;
  $("followInput").disabled = !canFollow;
  $("sendBtn").disabled = !canFollow;
  $("previewCard").classList.toggle("scanning", busy);
  if (!busy) setTimeout(() => { if (!state.busy) $("stepper").hidden = true; }, 1600);
}

const STAGES = ["capturing", "reading", "thinking", "answering"];
const STAGE_TEXT = { idle: "Ready", capturing: "Capturing screen", reading: "Reading your screen", thinking: "Thinking", answering: "Writing answer", error: "Something went wrong" };

function setStage(stage, text) {
  const pill = $("statusPill");
  pill.dataset.stage = stage;
  $("statusText").textContent = text || STAGE_TEXT[stage] || "Ready";
  const idx = STAGES.indexOf(stage);
  if (idx < 0) return;
  $("stepper").hidden = false;
  const steps = [...document.querySelectorAll(".step")];
  const lines = [...document.querySelectorAll(".step-line")];
  steps.forEach((el, i) => {
    el.classList.toggle("done", i < idx);
    el.classList.toggle("current", i === idx);
  });
  lines.forEach((el, i) => el.classList.toggle("done", i < idx));
}

function finishStepper() {
  document.querySelectorAll(".step").forEach((el) => { el.classList.add("done"); el.classList.remove("current"); });
  document.querySelectorAll(".step-line").forEach((el) => el.classList.add("done"));
}

// ---------- conversation rendering ----------
const SPARK = '<svg viewBox="0 0 20 20"><path d="M10 2l2.2 4.8L17 9l-4.8 2.2L10 16l-2.2-4.8L3 9l4.8-2.2z" fill="currentColor"/></svg>';

function clearConversation() {
  $("conversation").innerHTML = "";
  state.current = null;
}

function addAnswerCard() {
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.innerHTML = `<div class="answer-card"><div class="label-row"><span class="spark">${SPARK}</span>Screen Answer</div>
    <div class="answer-body"><div class="skeleton"><span></span><span></span><span></span></div></div></div>`;
  $("conversation").appendChild(turn);
  state.current = { card: turn.querySelector(".answer-card"), body: turn.querySelector(".answer-body"), raw: "" };
  scrollToEnd();
}

function addUserBubble(text) {
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.innerHTML = `<div class="user-bubble">${escapeHTML(text)}</div>`;
  $("conversation").appendChild(turn);
}

const ANSWER_RE = /^\s*(?:(?:Q(?:uestion)?\s*)?(\d+)[.):]\s*)?(?:\*\*)?(Final answer|Answer)(?:\*\*)?\s*[:\-–]\s*(.*)$/i;

function renderAnswer(raw, streaming) {
  const out = [];
  let chipCount = 0;
  for (const line of raw.split("\n")) {
    const m = ANSWER_RE.exec(line);
    if (m) {
      chipCount += 1;
      const num = m[1] || (chipCount > 1 ? String(chipCount) : "✓");
      out.push(`<div class="answer-chip"><span class="num">${escapeHTML(num)}</span><div><span class="tag">${escapeHTML(m[2])}</span><span class="val">${escapeHTML(m[3])}</span></div></div>`);
    } else if (!line.trim()) {
      out.push('<p class="gap"></p>');
    } else if (/^( {4}|\t)/.test(line)) {
      out.push(`<p class="code">${escapeHTML(line)}</p>`);
    } else {
      out.push(`<p>${escapeHTML(line)}</p>`);
    }
  }
  let html = out.join("");
  if (streaming) html += '<span class="caret"></span>';
  return html;
}

let renderQueued = false;
function appendDelta(text) {
  if (!state.current) addAnswerCard();
  state.current.raw += text;
  if (!renderQueued) {
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (!state.current || state.current.finished) return;
      const nearBottom = isNearBottom();
      state.current.body.innerHTML = renderAnswer(state.current.raw, true);
      if (nearBottom) scrollToEnd();
    });
  }
}

function finishAnswer(note) {
  if (!state.current) return;
  const cur = state.current;
  cur.finished = true;
  cur.body.innerHTML = cur.raw ? renderAnswer(cur.raw, false) : "";
  if (note) cur.body.insertAdjacentHTML("beforeend", `<div class="stopped-line">${escapeHTML(note)}</div>`);
}

function showError(message) {
  if (!state.current) addAnswerCard();
  const cur = state.current;
  cur.finished = true;
  cur.card.classList.add("error");
  cur.body.innerHTML = (cur.raw ? renderAnswer(cur.raw, false) : "") +
    `<p class="error-line">⚠ ${escapeHTML(message)}</p>`;
  scrollToEnd();
}

function isNearBottom() {
  const c = $("conversation");
  return c.scrollHeight - c.scrollTop - c.clientHeight < 80;
}
function scrollToEnd() {
  const c = $("conversation");
  c.scrollTop = c.scrollHeight;
}

function showPreviews(previews) {
  $("previewEmpty").hidden = true;
  $("previewImages").innerHTML = previews.map((src, i) => `<img src="${src}" alt="Capture ${i + 1}">`).join("");
}

// ---------- server events ----------
function connectEvents() {
  const es = new EventSource(`/api/events?token=${encodeURIComponent(TOKEN)}`);
  es.onmessage = (msg) => {
    let ev;
    try { ev = JSON.parse(msg.data); } catch (_) { return; }
    handleEvent(ev);
  };
  es.onerror = () => {
    setStage("error", "Reconnecting…");
  };
  es.onopen = () => { if (!state.busy) setStage("idle"); };
}

function handleEvent(ev) {
  switch (ev.event) {
    case "hello":
    case "settings":
      applyState(ev);
      break;
    case "need_key":
      $("welcome").hidden = false;
      $("welcomeKey").focus();
      break;
    case "countdown":
      runCountdown(ev.seconds);
      break;
    case "status":
      if (ev.stage === "capturing") { setBusy(true); hideCountdown(); }
      setStage(ev.stage, ev.text && ev.text.replace(/…|\.\.\.$/, ""));
      break;
    case "region":
      setBusy(false);
      setAiBanner("off"); // captured, but nothing has been answered yet
      setStage("idle");
      openRegion(ev);
      break;
    case "new_answer":
      clearConversation();
      showPreviews(ev.previews || []);
      addAnswerCard();
      setBusy(true);
      setStage("reading");
      break;
    case "follow_up":
      addUserBubble(ev.text);
      addAnswerCard();
      setBusy(true);
      setStage("reading");
      break;
    case "delta":
      if (state.current && !state.current.raw) setStage("answering");
      appendDelta(ev.text);
      break;
    case "done":
      finishAnswer(ev.stopped ? "Stopped." : "");
      finishStepper();
      setBusy(false);
      setStage("idle", ev.stopped ? "Stopped" : "Done");
      setTimeout(() => { if (!state.busy) setStage("idle"); }, 2500);
      break;
    case "error":
      hideCountdown();
      showError(ev.message);
      setBusy(false);
      setStage("error");
      break;
    case "toast":
      toast(ev.message);
      break;
  }
}

// ---------- capture actions ----------
async function capture(mode) {
  if (state.busy) return;
  const allMonitors = state.app && state.app.monitors > 1 ? state.app.settings.all_monitors : undefined;
  try {
    await api("/api/capture", { mode, delay: state.delay, all_monitors: allMonitors });
  } catch (e) {
    toast(e.message, "bad");
  }
}

let countdownTimer = null;
function runCountdown(seconds) {
  const overlay = $("countdown");
  const num = $("countdownNum");
  const ring = $("countdownProgress");
  overlay.hidden = false;
  let left = seconds;
  num.textContent = left;
  ring.style.transition = "none";
  ring.style.strokeDashoffset = "0";
  requestAnimationFrame(() => {
    ring.style.transition = `stroke-dashoffset ${seconds}s linear`;
    ring.style.strokeDashoffset = "327";
  });
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) { hideCountdown(); return; }
    num.textContent = left;
    num.style.animation = "none";
    void num.offsetWidth;
    num.style.animation = "";
  }, 1000);
}
function hideCountdown() {
  clearInterval(countdownTimer);
  $("countdown").hidden = true;
}

// ---------- region selection ----------
function openRegion(ev) {
  state.region = { id: ev.id, start: null, box: null };
  state.regionNatural = ev.width;
  const img = $("regionImg");
  img.src = ev.preview;
  $("regionBox").hidden = true;
  $("regionConfirm").disabled = true;
  $("regionOverlay").hidden = false;
}

function closeRegion() {
  $("regionOverlay").hidden = true;
  $("regionImg").removeAttribute("src");
  state.region = null;
}

function regionPoint(e) {
  const r = $("regionImg").getBoundingClientRect();
  return {
    x: Math.min(Math.max(e.clientX - r.left, 0), r.width),
    y: Math.min(Math.max(e.clientY - r.top, 0), r.height),
    r,
  };
}

function drawRegionBox(a, b) {
  const img = $("regionImg");
  const stage = $("regionStage").getBoundingClientRect();
  const r = img.getBoundingClientRect();
  const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
  const box = $("regionBox");
  box.hidden = false;
  box.style.left = `${r.left - stage.left + left}px`;
  box.style.top = `${r.top - stage.top + top}px`;
  box.style.width = `${w}px`;
  box.style.height = `${h}px`;
  const scale = (state.regionNatural || img.naturalWidth || r.width) / r.width;
  $("regionSize").textContent = `${Math.round(w * scale)} × ${Math.round(h * scale)}`;
  state.region.box = { x: left / r.width, y: top / r.height, w: w / r.width, h: h / r.height };
  $("regionConfirm").disabled = w < 8 || h < 8;
}

function setupRegion() {
  const img = $("regionImg");
  img.addEventListener("mousedown", (e) => {
    if (!state.region) return;
    e.preventDefault();
    state.region.start = regionPoint(e);
  });
  window.addEventListener("mousemove", (e) => {
    if (state.region && state.region.start) drawRegionBox(state.region.start, regionPoint(e));
  });
  window.addEventListener("mouseup", (e) => {
    if (!state.region || !state.region.start) return;
    drawRegionBox(state.region.start, regionPoint(e));
    state.region.start = null;
  });
  $("regionCancel").addEventListener("click", closeRegion);
  $("regionConfirm").addEventListener("click", confirmRegion);
  window.addEventListener("keydown", (e) => {
    if ($("regionOverlay").hidden) return;
    if (e.key === "Escape") closeRegion();
    if (e.key === "Enter" && !$("regionConfirm").disabled) confirmRegion();
  });
}

async function confirmRegion() {
  if (!state.region || !state.region.box) return;
  const { id, box } = state.region;
  closeRegion();
  try {
    await api("/api/region", { id, box });
  } catch (e) {
    toast(e.message, "bad");
  }
}

// ---------- settings drawer ----------
function openDrawer() {
  const app = state.app;
  if (!app) return;
  const s = app.settings;
  $("apiKey").value = "";
  $("apiKey").placeholder = app.has_key ? `Saved (${app.key_hint}) — paste to replace` : "sk-ant-…";
  $("modelSelect").innerHTML = app.models.map((m) => `<option value="${m}">${prettyModel(m)} (${m})</option>`).join("");
  $("modelSelect").value = s.model;
  $("effortSeg").innerHTML = app.efforts.map((e) => `<button type="button" data-value="${e}">${e}</button>`).join("");
  setSegment($("effortSeg"), s.effort);
  $("monitorSelect").innerHTML = Array.from({ length: Math.max(app.monitors, 1) }, (_, i) =>
    `<option value="${i + 1}">${i === 0 ? "Primary monitor" : `Monitor ${i + 1}`}</option>`).join("");
  $("monitorSelect").value = String(Math.min(s.monitor, Math.max(app.monitors, 1)));
  $("minimizeToggle").checked = s.minimize_while_capturing;
  $("hotkeyFullInput").value = s.hotkey_full;
  $("hotkeyRegionInput").value = s.hotkey_region;
  $("extraInput").value = s.extra_instructions;
  $("drawerBackdrop").hidden = false;
  $("drawer").classList.add("open");
  $("drawer").setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  $("drawer").classList.remove("open");
  $("drawer").setAttribute("aria-hidden", "true");
  $("drawerBackdrop").hidden = true;
}

async function saveSettings(e) {
  e.preventDefault();
  const effort = $("effortSeg").querySelector(".active");
  const body = {
    model: $("modelSelect").value,
    effort: effort ? effort.dataset.value : undefined,
    monitor: parseInt($("monitorSelect").value, 10) || 1,
    minimize_while_capturing: $("minimizeToggle").checked,
    hotkey_full: $("hotkeyFullInput").value,
    hotkey_region: $("hotkeyRegionInput").value,
    extra_instructions: $("extraInput").value,
  };
  if ($("apiKey").value.trim()) body.api_key = $("apiKey").value.trim();
  try {
    applyState(await api("/api/settings", body));
    closeDrawer();
    toast("Settings saved", "ok");
  } catch (err) {
    toast(err.message, "bad");
  }
}

// ---------- wire up ----------
function init() {
  $("scanBtn").addEventListener("click", () => capture("full"));
  $("regionBtn").addEventListener("click", () => capture("region"));
  $("stopBtn").addEventListener("click", () => api("/api/stop", {}).catch(() => {}));
  $("copyBtn").addEventListener("click", async () => {
    const text = state.current ? state.current.raw.trim() : "";
    if (!text) return toast("Nothing to copy yet");
    try { await navigator.clipboard.writeText(text); toast("Answer copied", "ok"); }
    catch (_) { toast("Couldn't access the clipboard", "bad"); }
  });

  $("delaySeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.delay = Number(b.dataset.value);
    setSegment($("delaySeg"), b.dataset.value);
  });
  $("scopeSeg").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setSegment($("scopeSeg"), b.dataset.value);
    try { applyState(await api("/api/settings", { all_monitors: b.dataset.value === "all" })); }
    catch (err) { toast(err.message, "bad"); }
  });
  $("effortSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setSegment($("effortSeg"), b.dataset.value);
  });

  $("composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("followInput").value.trim();
    if (!text || state.busy) return;
    $("followInput").value = "";
    try { await api("/api/followup", { text }); }
    catch (err) { toast(err.message, "bad"); $("followInput").value = text; }
  });

  $("settingsBtn").addEventListener("click", openDrawer);
  $("modelChip").addEventListener("click", openDrawer);
  $("drawerClose").addEventListener("click", closeDrawer);
  $("settingsCancel").addEventListener("click", closeDrawer);
  $("drawerBackdrop").addEventListener("click", closeDrawer);
  $("settingsForm").addEventListener("submit", saveSettings);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  $("welcomeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = $("welcomeKey").value.trim();
    if (!key) return;
    try {
      applyState(await api("/api/settings", { api_key: key }));
      $("welcomeKey").value = "";
      toast("You're all set — press the hotkey on any question", "ok");
    } catch (err) {
      toast(err.message, "bad");
    }
  });

  setupRegion();
  connectEvents();
  // Heartbeat so the app can tell when this window has been closed.
  const ping = () => api("/api/ping", {}).catch(() => {});
  ping();
  setInterval(ping, 3000);
}

init();
