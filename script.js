(() => {
  "use strict";

  /* ---------- CONFIG ---------- */
  const START = "2026-11-07T00:53:00+06:00"; // Asia/Dhaka, fixed forever
  const START_MS = Date.parse(START);
  const DHAKA_OFFSET_MS = 6 * 3600 * 1000;    // Bangladesh: UTC+6, no DST
  const VIDEO_URL = "";                        // <- set a video URL here (placeholder, nothing invented)
  const LINES = [
    "Waiting for a reply that may change everything.",
    "Some moments remain unanswered.",
    "Time continues, even when emotions stand still.",
    "Between anger, sadness, and hope.",
    "Still waiting. Still remembering. Still moving forward.",
    "May this pain eventually lead to peace."
  ];

  const $ = id => document.getElementById(id);
  const pad = (n, w) => String(n).padStart(w, "0");

  /* ---------- STOPWATCH (timestamp-derived, BigInt = no upper limit) ---------- */
  const elH = $("h"), elM = $("m"), elS = $("s"), digits = $("digits");
  let lastSec = -1;

  function elapsedMs() {
    return Math.max(0, Date.now() - START_MS); // never a countdown
  }

  function renderMain(ms) {
    const total = BigInt(Math.floor(ms / 1000));
    const h = total / 3600n, m = (total / 60n) % 60n, s = total % 60n;
    const hs = h.toString().padStart(6, "0");
    elH.textContent = hs;
    elM.textContent = pad(m, 2);
    elS.textContent = pad(s, 2);
    fit(hs.length);
  }

  // shrink font so the full number never overflows the viewport
  let lastLen = 0, lastW = 0;
  function fit(len) {
    const w = window.innerWidth;
    if (len === lastLen && w === lastW) return;
    lastLen = len; lastW = w;
    const chars = len + 2 + 2 + 6;               // digits + separators + gaps
    const avail = digits.parentElement.clientWidth || w;
    const size = Math.min(83, (avail * 0.96) / (chars * 0.62));
    digits.style.setProperty("--fs", Math.max(14, size) + "px");
  }

  /* ---------- CALENDAR BREAKDOWN (Dhaka wall-clock, true calendar months) ---------- */
  const daysInMonth = (y, mo) => new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  function breakdown(nowMs) {
    const a = new Date(START_MS + DHAKA_OFFSET_MS), b = new Date(Math.max(nowMs, START_MS) + DHAKA_OFFSET_MS);
    let y = b.getUTCFullYear() - a.getUTCFullYear();
    let mo = b.getUTCMonth() - a.getUTCMonth();
    let d = b.getUTCDate() - a.getUTCDate();
    let h = b.getUTCHours() - a.getUTCHours();
    let mi = b.getUTCMinutes() - a.getUTCMinutes();
    let s = b.getUTCSeconds() - a.getUTCSeconds();
    if (s < 0) { s += 60; mi--; }
    if (mi < 0) { mi += 60; h--; }
    if (h < 0) { h += 24; d--; }
    if (d < 0) {
      let pm = b.getUTCMonth() - 1, py = b.getUTCFullYear();
      if (pm < 0) { pm = 11; py--; }
      d += daysInMonth(py, pm); mo--;
    }
    if (mo < 0) { mo += 12; y--; }
    return { y, mo, d, h, mi, s };
  }
  const bEls = ["y","mo","d","h","mi","s"].map(k => [k, $("b-" + k)]);
  function renderBreakdown(ms) {
    const r = breakdown(START_MS + ms);
    for (const [k, el] of bEls) el.textContent = r[k];
  }

  /* ---------- TICK (rAF only while visible; re-derives from clock each frame) ---------- */
  function tick() {
    const ms = elapsedMs();
    const sec = Math.floor(ms / 1000);
    if (sec !== lastSec) { lastSec = sec; renderMain(ms); renderBreakdown(ms); }
  }
  let timer = null;
  function loop() { tick(); timer = setTimeout(loop, 250); } // cheap; correctness comes from Date.now()
  loop();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { lastSec = -1; tick(); } });
  window.addEventListener("pageshow", () => { lastSec = -1; tick(); });
  window.addEventListener("resize", () => { lastLen = 0; tick(); });

  /* ---------- EMOTIONAL LINES ---------- */
  const lineEl = $("line");
  let li = 0;
  function showLine() {
    lineEl.classList.remove("on");
    setTimeout(() => {
      lineEl.textContent = LINES[li];
      li = (li + 1) % LINES.length;
      lineEl.classList.add("on");
    }, 2300);
  }
  lineEl.textContent = LINES[0]; li = 1;
  requestAnimationFrame(() => lineEl.classList.add("on"));
  setInterval(() => { if (!document.hidden) showLine(); }, 9000);

  /* ---------- BACKGROUND DUST (light, pauses when hidden) ---------- */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = $("dust");
  if (cv && !reduce) {
    const ctx = cv.getContext("2d");
    let W, H, P = [], raf;
    const N = Math.min(40, Math.floor(innerWidth / 14));
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    size(); addEventListener("resize", size);
    for (let i = 0; i < N; i++) P.push({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .4,
      v: Math.random() * .00006 + .00002, a: Math.random() * .35 + .08,
      red: Math.random() < .5
    });
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y -= p.v; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.beginPath();
        ctx.fillStyle = p.red ? `rgba(190,30,45,${p.a})` : `rgba(235,230,230,${p.a * .6})`;
        ctx.arc(p.x * W, p.y * H, p.r * (W / innerWidth), 0, 6.283);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf); else draw();
    });
  }

  /* ---------- VIDEO (no autoplay, no auto download) ---------- */
  const video = $("video"), frame = video.parentElement, fileIn = $("videoFile");
  function setSrc(src) { video.src = src; video.load(); frame.classList.add("has-src"); }
  if (VIDEO_URL) setSrc(VIDEO_URL);
  fileIn.addEventListener("change", () => {
    const f = fileIn.files && fileIn.files[0];
    if (f) setSrc(URL.createObjectURL(f)); // stays on this device only
  });

  /* ---------- PRIVATE COPY ---------- */
  const toast = $("toast");
  let toastT;
  function say(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("show"), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove(); return ok;
  }
  $("copyBtn").addEventListener("click", async () => {
    const text = window.RUNA_PRIVATE && window.RUNA_PRIVATE.copyText;
    if (!text) { say("Nothing configured."); return; }
    say((await copyText(text)) ? "Copied successfully." : "Copy failed.");
  });
})();
