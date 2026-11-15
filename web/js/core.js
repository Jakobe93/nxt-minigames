/* nxt-minigames core: helpers + session engine. Each game registers {id,name,desc,controls,mount(root,api)}. */
const $ = (s, r = document) => r.querySelector(s);
/* Themes. `cyan` is the primary accent role and `green` the success role, whatever the actual hue.
   Canvas games read C at draw time, so switching theme restyles them live. */
const THEMES = {
  nxt: {cyan: '#34c9e8', amber: '#f5a524', green: '#34c98a', red: '#f5556d', text: '#E8ECF3', dim: '#8A90A6', mute: '#4A4F63',
        raise: '#1F2230', panel: '#181A24', base: '#12131B', sunk: '#0E0F15', ink: '#FFFFFF', ff: 'Rajdhani, sans-serif',
        cables: ['#34c9e8', '#f5a524', '#34c98a', '#f5556d', '#a98bff', '#e8e26a', '#ff8fd1', '#7fd6ff'],
        say: {start: 'Start', again: 'Run again', ok: 'Access granted', no: 'Trace failed'}},
  terminal: {cyan: '#4ef08a', amber: '#e8c547', green: '#b8ffd2', red: '#f0645a', text: '#C6F5D6', dim: '#6FAE86', mute: '#2F5A41',
        raise: '#0F1A14', panel: '#0A120E', base: '#050807', sunk: '#030604', ink: '#4ef08a', ff: "'JetBrains Mono', Consolas, monospace",
        cables: ['#4ef08a', '#e8c547', '#f0645a', '#7fd6ff', '#c6f5d6', '#ff9f5a', '#b18cff', '#e3f06a'],
        say: {start: 'Connect', again: 'Reconnect', ok: 'Access granted', no: 'Connection lost'}},
  // ---- per-game identity themes (rhythm set) ----
  synthwave: {cyan: '#2de2e6', amber: '#ff4fd8', green: '#b18cff', red: '#ff5566', text: '#f3e9ff', dim: '#9a86c2', mute: '#4a3a6b',
        raise: '#241a3d', panel: '#1a1230', base: '#120b22', sunk: '#0b0616', ink: '#e0c8ff', ff: 'Rajdhani, sans-serif',
        cables: ['#2de2e6', '#ff4fd8', '#b18cff', '#ff5566', '#ffd166', '#7afcff', '#ff9ef0', '#9dff9d'],
        say: {start: 'Sync up', again: 'Replay', ok: 'In sync', no: 'Out of sync'}},
  tactical: {cyan: '#ffb000', amber: '#ff6a1f', green: '#a4ff5c', red: '#ff3b30', text: '#ffe2a8', dim: '#b38a4a', mute: '#5a4526',
        raise: '#1d1709', panel: '#151006', base: '#0e0b05', sunk: '#080602', ink: '#ffb000', ff: "'JetBrains Mono', Consolas, monospace",
        cables: ['#ffb000', '#ff6a1f', '#a4ff5c', '#ff3b30', '#ffe2a8', '#ffd35c', '#c9ff9a', '#ff9a6b'],
        say: {start: 'Engage', again: 'Re-engage', ok: 'Port open', no: 'Knock rejected'}},
  telegraph: {cyan: '#f2c46d', amber: '#d98b52', green: '#a8d672', red: '#e2553f', text: '#f3e6cc', dim: '#b39a78', mute: '#5c4632',
        raise: '#33231a', panel: '#241810', base: '#1a120b', sunk: '#120c07', ink: '#f2c46d', ff: 'Rajdhani, sans-serif',
        cables: ['#f2c46d', '#d98b52', '#a8d672', '#e2553f', '#f3e6cc', '#c9a36a', '#8fb86a', '#b5623a'],
        say: {start: 'Key up', again: 'Resend', ok: 'Message sent', no: 'Garbled'}},
  sampler: {cyan: '#35d0ba', amber: '#ff9f1c', green: '#c3f73a', red: '#ff4f79', text: '#f1f1ee', dim: '#9a9ca3', mute: '#4b4d54',
        raise: '#2e3035', panel: '#232428', base: '#1b1c1f', sunk: '#141518', ink: '#ffffff', ff: 'Rajdhani, sans-serif',
        cables: ['#35d0ba', '#ff9f1c', '#c3f73a', '#ff4f79', '#7aa2ff', '#ffe066', '#b784ff', '#5ef0d4'],
        say: {start: 'Play', again: 'Again', ok: 'Pattern matched', no: 'Off tempo'}},
  arcade: {cyan: '#3fa9ff', amber: '#ffcc00', green: '#44ff66', red: '#ff2d4a', text: '#fff4e0', dim: '#b59b7a', mute: '#5a4630',
        raise: '#221a2c', panel: '#1a1422', base: '#110d17', sunk: '#0a0710', ink: '#ffcc00', ff: 'Rajdhani, sans-serif',
        cables: ['#3fa9ff', '#ffcc00', '#44ff66', '#ff2d4a', '#ff7ad9', '#ff9a1f', '#9d7bff', '#7afcff'],
        say: {start: 'Press start', again: 'Play again', ok: 'Winner', no: 'Game over'}},
  club: {cyan: '#00f0ff', amber: '#ffe600', green: '#39ff88', red: '#ff3860', text: '#fdf0ff', dim: '#a58bc4', mute: '#4a3566', wall: '#b026ff',
        raise: '#1d1230', panel: '#120a1f', base: '#0a0612', sunk: '#07040d', ink: '#ff9bf0', ff: 'Rajdhani, sans-serif',
        floor: ['#ff2bd6', '#00f0ff', '#39ff88', '#ffe600', '#b026ff'],
        cables: ['#00f0ff', '#ff2bd6', '#39ff88', '#ffe600', '#b026ff', '#ff8a00', '#7afcff', '#ff9bf0'],
        say: {start: 'Hit the floor', again: 'Again', ok: 'Floor cleared', no: 'Traced'}},
};
const C = {};
let THEME = 'terminal';
// Theme resolution: per-call override > the game's own default (reg {theme}) > server Config.Theme.
let BASE_THEME = 'terminal', FORCE_THEME = null;
const themeFor = g => (FORCE_THEME && THEMES[FORCE_THEME]) ? FORCE_THEME : (g && THEMES[g.theme]) ? g.theme : BASE_THEME;
function applyTheme(name) {
  THEME = THEMES[name] ? name : 'terminal';
  for (const k in C) delete C[k];
  Object.assign(C, THEMES[THEME]);
  document.body.dataset.theme = THEME;
}
applyTheme(THEME);
const TAU = Math.PI * 2;
function E(tag, p = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in p) { const v = p[k];
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c);
  return e;
}
function S(tag, p = {}) { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in p) e.setAttribute(k, p[k]); return e; }
const U = {
  L: (a, b, d) => a + (b - a) * (d - 1) / 9,
  Li: (a, b, d) => Math.round(U.L(a, b, d)),
  rand: n => Math.floor(Math.random() * n),
  pick: a => a[Math.floor(Math.random() * a.length)],
  shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  hex: (n, w = 2) => n.toString(16).toUpperCase().padStart(w, '0'),
  a(hex, al) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${al})`; },
  // Layout-independent key: physical letter/space keys by position (e.code), so A/S/D/W/Z/X work on
  // AZERTY, Cyrillic and other layouts; everything else (arrows, Enter, digits) by e.key, lower-cased.
  k(e) { const c = e.code || ''; return c.startsWith('Key') ? c.slice(3).toLowerCase() : c === 'Space' ? ' ' : (e.key || '').toLowerCase(); },
  shake(el) { if (NUI.reduce) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); },
  strikes: (used, max) => `<span class="pips">${Array.from({length: max}, (_, i) => `<i class="${i < used ? 'x' : ''}"></i>`).join('')}</span>`,
  canvas(parent, w, h) {
    const dpr = window.devicePixelRatio || 1;
    const c = E('canvas', {class: 'cv', width: w * dpr, height: h * dpr, style: `width:${w}px;height:${h}px`});
    parent.append(c); const x = c.getContext('2d'); x.scale(dpr, dpr); x.W = w; x.H = h; return x;
  },
  rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); },
};
const GAMES = [];

/* ---------- shared rhythm engine ----------
   One beat clock per session: song time (seconds, negative during the count-in), synthesised
   drums scheduled ahead on Web Audio, a visual pulse for muted play, and PERFECT/GOOD timing
   judgement. Audio is optional: if the context is blocked the game still runs on the clock. */
const Rhythm = {
  create(api, {bpm, countIn = 4, drums = true, volume = NUI.volume}) {
    const beat = 60 / bpm, lead = countIn * beat, p0 = performance.now();
    let ctx = null, out = null, noise = null, a0 = 0;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      out = ctx.createGain(); out.gain.value = volume; out.connect(ctx.destination); a0 = ctx.currentTime;
      noise = ctx.createBuffer(1, ctx.sampleRate * .1, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    const at = songT => a0 + lead + songT - NUI.audioOffset;   // song time -> audio clock (offset: Config.AudioOffsetMs)
    const r = {
      bpm, beat, lead, perfect: .06, good: .12,
      time: () => (performance.now() - p0) / 1000 - lead,
      pulse() { const t = r.time() / beat; return Math.pow(1 - (t - Math.floor(t)), 3); },
      windows(p, g) { r.perfect = p; r.good = g; },
      judge(dt) { const a = Math.abs(dt); return a <= r.perfect ? 'perfect' : a <= r.good ? 'good' : null; },
      blip(freq, dur = .09, type = 'square', vol = .5, when = null) {
        if (!ctx) return; const t = when == null ? ctx.currentTime : at(when); if (t < ctx.currentTime - .01) return;
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
      },
      kick(when) { if (!ctx) return; const t = at(when), o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
        g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g); g.connect(out); o.start(t); o.stop(t + .18); },
      hat(when, vol = .18) { if (!ctx) return; const t = at(when), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .04);
        s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + .06); },
      tone: null,
      toneOn(freq = 700) { if (!ctx || r.tone) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(.35, ctx.currentTime + .01); o.connect(g); g.connect(out); o.start(); r.tone = {o, g}; },
      toneOff() { if (!r.tone) return; const {o, g} = r.tone, t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .015); o.stop(t + .03); r.tone = null; },
    };
    // schedule count-in clicks + drums a little ahead of the clock
    let next = -countIn;                                      // next beat index (in beats, song time / beat)
    api.loop(() => {
      if (!ctx) return; const horizon = r.time() + .25;
      while (next * beat < horizon) {
        const t = next * beat;
        if (next < 0) r.blip(next === -countIn ? 1320 : 990, .05, 'square', .25, t);
        else if (drums) { if (next % 2 === 0) r.kick(t); r.hat(t); r.hat(t + beat / 2, .1); }
        next++;
      }
    });
    api.cleanup(() => { r.toneOff(); if (ctx) ctx.close(); });
    return r;
  },
};
const reg = g => GAMES.push(g);

/* ---------- NUI bridge ---------- */
const IN_GAME = typeof GetParentResourceName === 'function';
const RES = IN_GAME ? GetParentResourceName() : 'nxt-minigames';
function post(cb, data = {}) {
  if (!IN_GAME) return Promise.resolve(null);
  return fetch(`https://${RES}/${cb}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)})
    .then(r => r.json()).catch(() => null);
}
const NUI = {mode: null, token: null, tuning: {}, enabled: null, introTimer: 0, reduce: false, volume: .32, audioOffset: 0};
// Player settings sent with every play/viewer message (client/nui.lua Nui.withPrefs).
// Reduce motion is nxt-hud's switch: shakes, sweeps and ambient flashing stop; beat cues stay.
function prefs(m) {
  NUI.reduce = m.reduceMotion === true;
  document.documentElement.classList.toggle('nx-reduce', NUI.reduce);
  if (typeof m.volume === 'number') NUI.volume = Math.max(0, Math.min(1, m.volume));
  if (typeof m.audioOffsetMs === 'number') NUI.audioOffset = m.audioOffsetMs / 1000;
}
const findGame = id => GAMES.find(g => g.id === id);
function setState(word, cls = '') { const e = $('#mgState'); e.textContent = word; e.className = 'mg-state ' + cls; }
const clock = ms => { const t = Math.max(0, ms) / 1000; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`; };

/* ---------- session engine ---------- */
let SESSION = null;
function begin(g, d) {
  end(SESSION);
  const body = $('#mgBody'); body.innerHTML = ''; body.className = 'mg-body g-' + g.id;
  const tune = NUI.tuning[g.id] || {};
  const s = {g, d, alive: true, clean: [], deadline: 0, total: 0, t0: performance.now(), mode: NUI.mode, token: NUI.token};
  SESSION = s;
  const curve = (n, a, b) => { const o = tune[n]; return Array.isArray(o) && o.length === 2 ? U.L(+o[0], +o[1], d) : U.L(a, b, d); };
  const api = {
    d,
    t: curve, ti: (n, a, b) => Math.round(curve(n, a, b)),
    get alive() { return s.alive; },
    status: html => { if (SESSION === s) $('#mgStatus').innerHTML = html; },
    timer: sec => { s.total = sec * 1000; s.deadline = performance.now() + sec * 1000; },
    win: msg => finish(s, true, msg), fail: msg => finish(s, false, msg),
    on(t, ev, fn, o) { t.addEventListener(ev, fn, o); s.clean.push(() => t.removeEventListener(ev, fn, o)); },
    key(fn) { api.on(window, 'keydown', e => { if (s.alive && !e.repeat) fn(e); }); },
    loop(fn) { let last = performance.now(), id; const f = t => { if (!s.alive) return; const dt = Math.min(.05, (t - last) / 1000); last = t; fn(dt, t); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); s.clean.push(() => cancelAnimationFrame(id)); },
    cleanup(fn) { s.clean.push(fn); },
    after(ms, fn) { const id = setTimeout(() => { if (s.alive) fn(); }, ms); s.clean.push(() => clearTimeout(id)); return id; },
  };
  s.api = api;
  document.activeElement?.blur?.();
  api.on(body, 'mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  setState('Breaching');
  try { g.mount(body, api); } catch (err) { console.error(`[nxt-minigames] ${g.id} mount failed`, err); return finish(s, false, 'Minigame failed to load'); }
  (function tick() {
    if (!s.alive) return;
    const bar = $('#mgTimer'), now = performance.now();
    $('#mgClock').textContent = s.deadline ? `TTL ${clock(s.deadline - now)}` : `UP ${clock(now - s.t0)}`;
    if (s.deadline) {
      const f = Math.max(0, (s.deadline - performance.now()) / s.total);
      bar.style.transform = `scaleX(${f})`; bar.className = f < .2 ? 'crit' : f < .5 ? 'warn' : '';
      if (f <= 0) return finish(s, false, 'Time expired');
    } else bar.style.transform = 'scaleX(0)';
    requestAnimationFrame(tick);
  })();
}
function end(s) { if (!s || !s.alive) return; s.alive = false; s.clean.forEach(f => f()); s.clean = []; }
function finish(s, ok, msg) {
  if (!s.alive) return;
  end(s);
  const ms = Math.round(performance.now() - s.t0), secs = (ms / 1000).toFixed(1);
  const play = s.mode === 'play';
  if (play) post('result', {token: s.token, ok, reason: msg || ''});
  else $('#devLog').prepend(E('li', {class: ok ? 'ok' : 'no'}, E('span', {text: `${s.g.name} · D${s.d}`}), E('span', {text: `${ok ? 'Pass' : 'Fail'} ${secs}s`})));
  setState(ok ? 'Granted' : 'Traced', ok ? 'ok' : 'no');
  overlay(E('div', {class: 'ov'},
    E('div', {class: 'ov-k', text: s.g.name}),
    E('div', {class: 'ov-t ' + (ok ? 'ok' : 'no'), text: ok ? C.say.ok : C.say.no}),
    E('div', {class: 'ov-d', text: msg || ''}),
    E('div', {class: 'ov-c', text: `Difficulty ${s.d} · ${secs}s`}),
    !play && E('button', {class: 'btn pri', text: C.say.again, onclick: () => intro(s.g, s.d)})));
}
function overlay(node) { const o = $('#mgOver'); o.innerHTML = ''; if (node) { o.append(node); o.classList.add('show'); } else o.classList.remove('show'); }
function intro(g, d, autoMs = 0) {
  applyTheme(themeFor(g));
  end(SESSION); SESSION = null; clearTimeout(NUI.introTimer);
  $('#mgTitle').textContent = g.name;
  $('#mgPips').innerHTML = Array.from({length: 10}, (_, i) => `<i class="${i < d ? 'on' : ''}"></i>`).join('');
  $('#mgStatus').innerHTML = ''; $('#mgFoot').textContent = g.controls; $('#mgTimer').style.transform = 'scaleX(0)';
  $('#mgBody').innerHTML = ''; $('#mgClock').textContent = 'TTL --:--.-'; setState('Standby');
  const go = () => { clearTimeout(NUI.introTimer); overlay(null); begin(g, d); };
  overlay(E('div', {class: 'ov'},
    E('div', {class: 'ov-k', text: `Difficulty ${d}`}),
    E('div', {class: 'ov-t', text: g.name}),
    E('div', {class: 'ov-d', text: g.desc}),
    E('div', {class: 'ov-c', text: g.controls}),
    E('button', {class: 'btn pri', text: C.say.start, onclick: go}),
    autoMs > 0 && E('div', {class: 'ov-auto'}, E('i', {style: `animation-duration:${autoMs}ms`}))));
  if (autoMs > 0) NUI.introTimer = setTimeout(go, autoMs);
}

/* ---------- modes ---------- */
function show(mode) { NUI.mode = mode; document.body.className = mode ? 'mode-' + mode : ''; }
function hideAll() { clearTimeout(NUI.introTimer); end(SESSION); SESSION = null; overlay(null); $('#mgBody').innerHTML = ''; show(null); }

function openPlay(m) {
  const g = findGame(m.id);
  prefs(m); NUI.token = m.token; NUI.tuning = m.tuning || {}; BASE_THEME = THEMES[m.theme] ? m.theme : BASE_THEME; FORCE_THEME = m.forceTheme || null;
  show('play');
  if (!g) { post('result', {token: m.token, ok: false, reason: 'unknown_game'}); return; }
  intro(g, Math.max(1, Math.min(10, m.difficulty | 0)), m.introMs ?? 3500);
}

let harnessBuilt = false, hSel = null, hDiff = 2, hPaint = () => {};
function openViewer(m) {
  NUI.token = null; NUI.tuning = m.tuning || {}; NUI.enabled = Array.isArray(m.enabled) ? new Set(m.enabled) : null;
  prefs(m); BASE_THEME = THEMES[m.theme] ? m.theme : BASE_THEME; FORCE_THEME = null; applyTheme(BASE_THEME);
  show('viewer');
  const list = GAMES.filter(g => !NUI.enabled || NUI.enabled.has(g.id));
  const gl = $('#devGames'), dl = $('#devDiff');
  gl.innerHTML = ''; if (!list.includes(hSel)) hSel = list[0];
  const paint = () => {
    [...gl.children].forEach((b, i) => b.classList.toggle('on', list[i] === hSel));
    [...dl.children].forEach((b, i) => b.classList.toggle('on', i + 1 === hDiff));
    $('#devDesc').textContent = hSel ? hSel.desc : 'No minigames enabled.';
    [...$('#devTheme').children].forEach(b => b.classList.toggle('on', b.dataset.k === (FORCE_THEME || 'auto')));
  };
  hPaint = paint;
  list.forEach(g => gl.append(E('button', {text: g.name, onclick: () => { hSel = g; paint(); intro(hSel, hDiff); }})));
  if (!harnessBuilt) {
    for (let i = 1; i <= 10; i++) dl.append(E('button', {text: i, onclick: () => { hDiff = i; paint(); if (hSel) intro(hSel, hDiff); }}));
    $('#devRun').onclick = () => hSel && intro(hSel, hDiff);
    $('#devClose').onclick = closeViewer;
    const tl = $('#devTheme');
    ['auto', ...Object.keys(THEMES)].forEach(k => tl.append(E('button', {text: k, 'data-k': k, title: k === 'auto' ? "Each game's own default" : `Force ${k} on every game`, onclick: () => { FORCE_THEME = k === 'auto' ? null : k; hPaint(); if (hSel) intro(hSel, hDiff); }})));
    harnessBuilt = true;
  }
  paint(); if (hSel) intro(hSel, hDiff);
}
function closeViewer() { if (NUI.mode !== 'viewer') return; hideAll(); post('viewerClose'); }

window.addEventListener('message', e => {
  const m = e.data || {};
  if (m.action === 'play') openPlay(m);
  else if (m.action === 'viewer') openViewer(m);
  else if (m.action === 'close') hideAll();
});
window.addEventListener('keydown', e => {
  if (!NUI.mode) return;
  if (e.key === 'Escape') {
    if (SESSION && SESSION.alive) finish(SESSION, false, 'Aborted');
    else if (NUI.mode === 'viewer') closeViewer();
    else if (NUI.mode === 'play' && !SESSION && NUI.token) { // aborted from the intro card
      clearTimeout(NUI.introTimer); overlay(null);
      post('result', {token: NUI.token, ok: false, reason: 'Aborted'}); NUI.token = null;
    }
  } else if ((e.key === 'Enter' || e.code === 'Space') && $('#mgOver').classList.contains('show')) {
    const b = $('#mgOver .btn'); if (b) { e.preventDefault(); b.click(); }
  }
});
