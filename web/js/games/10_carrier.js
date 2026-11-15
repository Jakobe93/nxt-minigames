reg({id: 'carrier', name: 'Carrier Tune', desc: 'Tune your carrier wave onto the target signal and hold the lock until it registers.',
controls: '↑ ↓ select a dial · ← → adjust · hold Shift for fine',
mount(root, api) {
  const P = {freq: {label: 'Frequency', min: 1, max: 5, step: .05, f: v => `${v.toFixed(2)} kHz`},
             amp: {label: 'Amplitude', min: .25, max: 1, step: .01, f: v => `${Math.round(v * 100)}%`},
             phase: {label: 'Phase', min: 0, max: 6.28, step: .03, f: v => `${Math.round(v * 57.3)}°`}};
  const act = api.d <= 3 ? ['freq'] : api.d <= 6 ? ['freq', 'amp'] : ['freq', 'amp', 'phase'];
  const rounds = api.ti('rounds', 1, 2), tol = api.t('tolerance', .12, .05), noise = api.d >= 5 ? api.t('noise', 0, .12) : 0, drift = api.d >= 8 ? .35 : 0;
  let round = 0, hold = 0, sel = 0; const T = {}, Y = {};
  const rnd = k => { const p = P[k]; return +(p.min + Math.random() * (p.max - p.min)).toFixed(2); };
  function newTarget() { for (const k in P) { T[k] = rnd(k); Y[k] = T[k]; } for (const k of act) { do Y[k] = rnd(k); while (Math.abs(Y[k] - T[k]) < (P[k].max - P[k].min) * .25); } sync(); }
  const x = U.canvas(root, 640, 210);
  const dials = E('div', {class: 'ct-dials'}), meter = E('i'), q = E('b');
  const rows = act.map((k, i) => { const p = P[k];
    const inp = E('input', {type: 'range', min: p.min, max: p.max, step: p.step, oninput: e => { Y[k] = +e.target.value; sel = i; sync(); }});
    const out = E('span', {class: 'ct-o'});
    const row = E('div', {class: 'ct-r', onmousedown: () => { sel = i; sync(); }}, E('span', {class: 'ct-l', text: p.label}), inp, out);
    row.inp = inp; row.out = out; row.k = k; return row; });
  dials.append(...rows);
  root.append(E('div', {class: 'ct-meta'}, E('span', {}, 'Signal match ', q), E('div', {class: 'ct-m'}, meter)), dials);
  function sync() { rows.forEach((r, i) => { r.inp.value = Y[r.k]; r.out.textContent = P[r.k].f(Y[r.k]); r.classList.toggle('sel', i === sel); }); }
  const wave = (o, t) => u => o.amp * Math.sin(TAU * o.freq * u + o.phase);
  function err() { let s = 0; for (let i = 0; i <= 120; i++) { const u = i / 120; s += Math.abs(wave(Y)(u) - wave(T)(u)); } return s / 121 / 2; }
  api.key(e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + (e.key === 'ArrowUp' ? -1 : 1) + act.length) % act.length; sync(); }
  });
  const held = {}; api.on(window, 'keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); held[e.key] = e.shiftKey ? .25 : 1; } });
  api.on(window, 'keyup', e => delete held[e.key]);
  let rep = 0;
  api.loop((dt, t) => {
    rep -= dt; const dir = (held.ArrowRight ? 1 : 0) - (held.ArrowLeft ? 1 : 0);
    if (dir && rep <= 0) { const k = act[sel], p = P[k]; Y[k] = Math.max(p.min, Math.min(p.max, Y[k] + dir * p.step * (held.ArrowRight || held.ArrowLeft))); if (k === 'phase') Y[k] = +Y[k].toFixed(3); rep = .03; sync(); }
    if (drift) T.phase = (T.phase + drift * dt) % 6.28;
    const e = err(), match = Math.max(0, 1 - e / .5), locked = e < tol;
    hold = locked ? hold + dt : Math.max(0, hold - dt * 2);
    meter.style.transform = `scaleX(${Math.min(1, hold / 1.2)})`; meter.className = locked ? 'on' : '';
    q.textContent = `${Math.round(match * 100)}%`;
    if (hold >= 1.2) { round++; hold = 0; if (round >= rounds) return api.win('Carrier locked'); newTarget(); }
    api.status(`<span>Lock <b>${round}/${rounds}</b></span>`);
    // draw
    x.clearRect(0, 0, 640, 210); x.fillStyle = C.sunk; U.rr(x, 0, 0, 640, 210, 6); x.fill();
    x.strokeStyle = U.a(C.ink, .05); x.lineWidth = 1;
    for (let gx = 0; gx <= 640; gx += 40) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 210); x.stroke(); }
    x.beginPath(); x.moveTo(0, 105); x.lineTo(640, 105); x.stroke();
    const plot = (fn, col, w, dash, jit) => { x.strokeStyle = col; x.lineWidth = w; x.setLineDash(dash); x.beginPath();
      for (let i = 0; i <= 160; i++) { const u = i / 160, y = 105 - (fn(u) + (jit ? (Math.random() * 2 - 1) * jit : 0)) * 88; i ? x.lineTo(u * 640, y) : x.moveTo(0, y); } x.stroke(); x.setLineDash([]); };
    plot(wave(T), U.a(C.amber, .85), 2, [6, 5], noise);
    x.shadowColor = C.cyan; x.shadowBlur = locked ? 12 : 4; plot(wave(Y), locked ? C.green : C.cyan, 2.5, [], 0); x.shadowBlur = 0;
    x.font = `600 13px ${C.ff}`; x.fillStyle = C.amber; x.fillText('TARGET', 12, 20); x.fillStyle = C.cyan; x.fillText('YOUR CARRIER', 70, 20);
  });
  newTarget(); api.timer(api.ti('time', 35, 60));
}});
