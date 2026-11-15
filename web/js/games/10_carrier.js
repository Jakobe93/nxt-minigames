reg({id: 'carrier', name: 'Carrier Tune', desc: 'Turn the dials until your carrier sits on the target signal, then hold the lock until it registers.',
controls: 'Drag or ← → to turn · ↑ ↓ picks a dial',
mount(root, api) {
  const P = {freq: {label: 'Freq', min: 1, max: 5, step: .05, f: v => `${v.toFixed(2)}k`},
             amp: {label: 'Gain', min: .25, max: 1, step: .01, f: v => `${Math.round(v * 100)}%`},
             phase: {label: 'Phase', min: 0, max: 6.28, step: .03, f: v => `${Math.round(v * 57.3)}°`}};
  const act = api.d <= 3 ? ['freq'] : api.d <= 6 ? ['freq', 'amp'] : ['freq', 'amp', 'phase'];
  const rounds = api.ti('rounds', 1, 2), tol = api.t('tolerance', .12, .05), noise = api.d >= 5 ? api.t('noise', 0, .12) : 0, drift = api.d >= 8 ? .35 : 0;
  let round = 0, hold = 0, sel = 0; const T = {}, Y = {};
  const rnd = k => { const p = P[k]; return +(p.min + Math.random() * (p.max - p.min)).toFixed(2); };
  function newTarget() { for (const k in P) { T[k] = rnd(k); Y[k] = T[k]; } for (const k of act) { do Y[k] = rnd(k); while (Math.abs(Y[k] - T[k]) < (P[k].max - P[k].min) * .25); } sync(); }
  const crt = E('div', {class: 'crt'}), x = U.canvas(crt, 400, 250);
  const lamp = E('i', {class: 'ct2-lamp'}), meter = E('i'), q = E('b');
  const clamp = (k, v) => Math.max(P[k].min, Math.min(P[k].max, v));
  const knobs = act.map((k, i) => {
    const p = P[k], s = S('svg', {viewBox: '0 0 100 100', class: 'kn-svg'});
    for (let t = 0; t <= 20; t++) { const a = (-135 + t * 13.5) * Math.PI / 180 - Math.PI / 2, r1 = t % 5 ? 44 : 41;
      s.append(S('line', {x1: 50 + Math.cos(a) * r1, y1: 50 + Math.sin(a) * r1, x2: 50 + Math.cos(a) * 48, y2: 50 + Math.sin(a) * 48, class: 'kn-tick'})); }
    s.append(S('circle', {cx: 50, cy: 50, r: 34, class: 'kn-body'}), S('circle', {cx: 50, cy: 50, r: 27, class: 'kn-cap'}));
    const ind = S('line', {x1: 50, y1: 50, x2: 50, y2: 22, class: 'kn-ind'}); s.append(ind);
    const out = E('b'), el = E('div', {class: 'kn'}, s, E('span', {text: p.label}), out);
    let drag = null;
    api.on(s, 'mousedown', e => { e.preventDefault(); sel = i; drag = {y: e.clientY, v: Y[k]}; sync(); });
    api.on(window, 'mousemove', e => { if (!drag) return; Y[k] = clamp(k, drag.v + (drag.y - e.clientY) / 160 * (p.max - p.min)); sync(); });
    api.on(window, 'mouseup', () => drag = null);
    api.on(s, 'wheel', e => { e.preventDefault(); sel = i; Y[k] = clamp(k, Y[k] - Math.sign(e.deltaY) * p.step * 2); sync(); }, {passive: false});
    return {k, el, ind, out};
  });
  root.append(E('div', {class: 'ct2'}, E('div', {class: 'ct2-scope'}, crt, E('div', {class: 'ct2-meta'}, lamp, E('span', {}, 'Match ', q), E('div', {class: 'ct-m'}, meter))),
    E('div', {class: 'ct2-knobs'}, knobs.map(o => o.el))));
  function sync() { knobs.forEach((o, i) => { const p = P[o.k], f = (Y[o.k] - p.min) / (p.max - p.min);
    o.ind.setAttribute('transform', `rotate(${-135 + f * 270} 50 50)`); o.out.textContent = p.f(Y[o.k]); o.el.classList.toggle('sel', i === sel); }); }
  const wave = o => u => o.amp * Math.sin(TAU * o.freq * u + o.phase);
  function err() { let s = 0; for (let i = 0; i <= 120; i++) { const u = i / 120; s += Math.abs(wave(Y)(u) - wave(T)(u)); } return s / 121 / 2; }
  api.key(e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + (e.key === 'ArrowUp' ? -1 : 1) + act.length) % act.length; sync(); } });
  const held = {}; api.on(window, 'keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); held[e.key] = e.shiftKey ? .25 : 1; } });
  api.on(window, 'keyup', e => delete held[e.key]);
  let rep = 0; x.fillStyle = C.sunk; x.fillRect(0, 0, 400, 250);
  api.loop(dt => {
    rep -= dt; const dir = (held.ArrowRight ? 1 : 0) - (held.ArrowLeft ? 1 : 0);
    if (dir && rep <= 0) { const k = act[sel], p = P[k]; Y[k] = clamp(k, Y[k] + dir * p.step * (held.ArrowRight || held.ArrowLeft)); rep = .03; sync(); }
    if (drift) T.phase = (T.phase + drift * dt) % 6.28;
    const e = err(), match = Math.max(0, 1 - e / .5), locked = e < tol;
    hold = locked ? hold + dt : Math.max(0, hold - dt * 2);
    meter.style.transform = `scaleX(${Math.min(1, hold / 1.2)})`; meter.className = locked ? 'on' : ''; lamp.classList.toggle('on', locked);
    q.textContent = `${Math.round(match * 100)}%`;
    if (hold >= 1.2) { round++; hold = 0; if (round >= rounds) return api.win('Carrier locked'); newTarget(); }
    api.status(`<span>Lock <b>${round}/${rounds}</b></span>`);
    // phosphor persistence: fade the previous frame instead of clearing it
    x.fillStyle = U.a(C.sunk, .32); x.fillRect(0, 0, 400, 250);
    x.strokeStyle = U.a(C.ink, .06); x.lineWidth = 1;
    for (let gx = 0; gx <= 400; gx += 40) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 250); x.stroke(); }
    for (let gy = 25; gy < 250; gy += 50) { x.beginPath(); x.moveTo(0, gy); x.lineTo(400, gy); x.stroke(); }
    const plot = (fn, col, w, dash, jit) => { x.strokeStyle = col; x.lineWidth = w; x.setLineDash(dash); x.beginPath();
      for (let i = 0; i <= 140; i++) { const u = i / 140, y = 125 - (fn(u) + (jit ? (Math.random() * 2 - 1) * jit : 0)) * 100; i ? x.lineTo(u * 400, y) : x.moveTo(0, y); } x.stroke(); x.setLineDash([]); };
    plot(wave(T), U.a(C.amber, .8), 1.6, [5, 5], noise);
    x.shadowColor = locked ? C.green : C.cyan; x.shadowBlur = 10; plot(wave(Y), locked ? C.green : C.cyan, 2.4, [], 0); x.shadowBlur = 0;
  });
  newTarget(); api.timer(api.ti('time', 35, 60));
}});
