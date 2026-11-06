(function () {
  'use strict';

  /* ---------- CONFIGURATION ---------- */
  // Fixed start: 2026-11-07 00:53:00 Asia/Dhaka (UTC+6, no DST).
  var START_MS = Date.parse('2026-11-07T00:53:00+06:00');
  var DHAKA_OFFSET_MS = 6 * 3600 * 1000;

  // Set to a video URL you have the right to publish, or leave empty.
  var VIDEO_URL = '';

  var LINES = [
    'Waiting for a reply that may change everything.',
    'Some moments remain unanswered.',
    'Time continues, even when emotions stand still.',
    'Between anger, sadness, and hope.',
    'Still waiting. Still remembering. Still moving forward.',
    'May this pain eventually lead to peace.'
  ];

  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- STOPWATCH (timestamp-derived, never incremented) ---------- */
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

  function calendarDiff(startMs, nowMs) {
    // Work in Dhaka wall-clock time using UTC getters on shifted timestamps.
    var a = new Date(startMs + DHAKA_OFFSET_MS), b = new Date(nowMs + DHAKA_OFFSET_MS);
    var y = b.getUTCFullYear() - a.getUTCFullYear();
    var mo = b.getUTCMonth() - a.getUTCMonth();
    var d = b.getUTCDate() - a.getUTCDate();
    var h = b.getUTCHours() - a.getUTCHours();
    var mi = b.getUTCMinutes() - a.getUTCMinutes();
    var s = b.getUTCSeconds() - a.getUTCSeconds();
    if (s < 0) { s += 60; mi--; }
    if (mi < 0) { mi += 60; h--; }
    if (h < 0) { h += 24; d--; }
    if (d < 0) { // borrow days from the month before "now"
      d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); mo--;
    }
    if (mo < 0) { mo += 12; y--; }
    return { y: y, mo: mo, d: d, h: h, mi: mi, s: s };
  }

  var el = { h: $('h'), m: $('m'), s: $('s'), main: $('main') };
  var bEl = { y: $('b-y'), mo: $('b-mo'), d: $('b-d'), h: $('b-h'), mi: $('b-mi'), s: $('b-s') };
  var lastLen = 0;

  function fit() {
    var box = el.main.parentNode.clientWidth;
    var chars = el.h.textContent.length + 4 + 2; // digits + two colons (~2 chars each incl. margin)
    var size = Math.min(96, box / (chars * 0.62));
    el.main.style.fontSize = Math.max(14, size) + 'px';
  }

  function tick() {
    var elapsed = Math.max(0, Date.now() - START_MS);
    var totalSec = Math.floor(elapsed / 1000);
    var hours = Math.floor(totalSec / 3600);
    var min = Math.floor(totalSec / 60) % 60;
    var sec = totalSec % 60;

    var hStr = pad(hours, 6);
    el.h.textContent = hStr;
    el.m.textContent = pad(min, 2);
    el.s.textContent = pad(sec, 2);
    if (hStr.length !== lastLen) { lastLen = hStr.length; fit(); }

    var c = calendarDiff(START_MS, Math.max(START_MS, Date.now()));
    for (var k in c) bEl[k].textContent = c[k];
  }

  function loop() {
    tick();
    // Align to the next whole second; each tick recomputes from the clock.
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
  }
  loop();
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('focus', tick);
  window.addEventListener('pageshow', tick);
  window.addEventListener('resize', fit);

  /* ---------- EMOTIONAL TEXT (one line at a time) ---------- */
  var lineEl = $('line'), li = 0;
  function showLine() {
    lineEl.textContent = LINES[li];
    lineEl.classList.remove('off');
    li = (li + 1) % LINES.length;
  }
  showLine();
  if (!reduce) {
    setInterval(function () {
      lineEl.classList.add('off');
      setTimeout(showLine, 1900);
    }, 9000);
  } else {
    setInterval(showLine, 9000);
  }

  /* ---------- BACKGROUND DUST (lightweight, pauses when hidden) ---------- */
  var cv = $('dust');
  if (cv && !reduce) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, P = [], raf = 0;
    var N = Math.min(45, Math.floor(window.innerWidth / 12));
    var size = function () {
      var r = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = innerWidth * r; H = cv.height = innerHeight * r;
    };
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < N; i++) P.push({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4,
      v: Math.random() * .00006 + .00002, a: Math.random() * .4 + .1,
      red: Math.random() < .45
    });
    var draw = function () {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i]; p.y -= p.v; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * (W / innerWidth), 0, 6.283);
        ctx.fillStyle = p.red ? 'rgba(179,18,43,' + p.a + ')' : 'rgba(233,228,230,' + p.a * .5 + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf); else draw();
    });
  }

  /* ---------- VIDEO (never autoplays, never uploads) ---------- */
  var vid = $('vid'), frame = vid.parentNode, pickInput = $('file');
  function loadVideo(src) { vid.src = src; vid.preload = 'metadata'; frame.classList.add('has'); }
  if (VIDEO_URL) loadVideo(VIDEO_URL);
  pickInput.addEventListener('change', function () {
    if (pickInput.files && pickInput.files[0]) loadVideo(URL.createObjectURL(pickInput.files[0]));
  });
  $('pick').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickInput.click(); }
  });

  /* ---------- PRIVATE COPY (text comes only from config.private.js) ---------- */
  var toast = $('toast'), toastT = 0;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('on'); }, 2200);
  }
  function legacyCopy(text) {
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t); return ok;
  }
  $('copy').addEventListener('click', function () {
    var text = window.RUNA_PRIVATE && window.RUNA_PRIVATE.copyText;
    if (!text) { say('Not configured.'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { say('Copied successfully.'); },
        function () { say(legacyCopy(text) ? 'Copied successfully.' : 'Copy failed.'); });
    } else {
      say(legacyCopy(text) ? 'Copied successfully.' : 'Copy failed.');
    }
  });
})();
