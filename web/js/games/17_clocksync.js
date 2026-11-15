reg({id: 'clocksync', name: 'Clock Sync', theme: 'synthwave',
desc: 'Bits race down the highway. Clock each one in as it crosses the sync line, on the beat. From D7, full-width bursts need Space.',
controls: 'A S D on the line · Space for bursts · hold long bits',
mount(root, api) {
  const KEYS = ['a', 's', 'd', ' '], burstOn = api.d >= 7, N = api.ti('notes', 18, 32), maxM = api.ti('misses', 7, 4);
  const chordP = api.d >= 4 ? api.t('chords', .06, .18) : 0, holdP = api.d >= 6 ? .12 : 0, burstP = burstOn ? .12 : 0, travel = api.t('travel', 2.0, 1.35);
  const R = Rhythm.create(api, {bpm: api.t('bpm', 88, 124)}); R.windows(api.t('perfect', .075, .05), api.t('good', .16, .11));
  const e8 = R.beat / 2;
  // ---- chart on the 8th grid; lane 3 = full-width burst (Space) ----
  const notes = []; let slot = 0, last = -1;
  const gaps = api.d <= 3 ? [2, 2, 4] : api.d <= 6 ? [1, 2, 2, 3] : [1, 2, 2, 2, 3];
  while (notes.length < N) {
    slot += U.pick(gaps); const t = slot * e8;
    if (Math.random() < burstP && last !== 3) { notes.push({t, lane: 3, hold: 0, bit: U.rand(2), st: null}); last = 3; continue; }
    let lane; do lane = U.rand(3); while (lane === last && Math.random() < .6); last = lane;
    const hold = Math.random() < holdP ? (2 + U.rand(3)) * e8 : 0;
    notes.push({t, lane, hold, bit: U.rand(2), st: null});
    if (!hold && Math.random() < chordP && notes.length < N) { let l2; do l2 = U.rand(3); while (l2 === lane); notes.push({t, lane: l2, hold: 0, bit: U.rand(2), st: null}); }
    if (hold) slot += Math.round(hold / e8);
  }
  const END = Math.max(...notes.map(n => n.t + n.hold)) + .8;
  let misses = 0, streak = 0, best = 0, done = 0; const pops = [], flash = [0, 0, 0, 0], down = [false, false, false, false], sparks = [];
  // ---- perspective highway ----
  const W = 640, H = 400, CX = 320, HY = 322, VY = 44, LW = 104, K = 2.4;
  const sc = p => 1 / (1 + K * Math.max(-.2, p)), Y = p => VY + (HY - VY) * sc(p), X = (off, p) => CX + off * sc(p);
  const laneOff = l => (l - 1) * LW;
  const x = U.canvas(root, W, H);
  const pop = (lane, txt, col) => pops.push({lane, txt, col, a: 1});
  function hit(lane, j) { streak++; best = Math.max(best, streak); pop(lane, j === 'perfect' ? 'PERFECT' : 'GOOD', j === 'perfect' ? C.green : C.cyan);
    R.blip(j === 'perfect' ? 1760 : 1320, .04, 'triangle', .2);
    if (!NUI.reduce) for (let k = 0; k < 10; k++) sparks.push({x: lane === 3 ? CX + (Math.random() - .5) * 300 : CX + laneOff(lane), y: HY, vx: (Math.random() - .5) * 220, vy: -80 - Math.random() * 200, a: 1, c: lane === 3 ? C.amber : [C.cyan, C.amber, C.green][lane]});
    if (streak % 10 === 0 && misses > 0) { misses--; pop(lane, 'REPAIRED', C.amber); } st(); }
  function miss(lane, why = 'MISS') { misses++; streak = 0; pop(lane, why, C.red); st(); if (misses >= maxM) api.fail('Receiver lost clock sync'); }
  function press(k) {
    const now = R.time(); flash[k] = 1; let bestN = null;
    for (const n of notes) { if (n.t - now > R.good) break; if (n.lane !== k || n.st) continue;
      if (Math.abs(now - n.t) <= R.good && (!bestN || Math.abs(now - n.t) < Math.abs(now - bestN.t))) bestN = n; }
    if (bestN) { const j = R.judge(now - bestN.t); if (bestN.hold) { bestN.st = 'holding'; bestN.j = j; } else { bestN.st = j; done++; } hit(k, j); return; }
    if (api.d >= 9) miss(k, 'OFF-BEAT'); else if (api.d >= 5) { streak = 0; pop(k, 'OFF-BEAT', C.dim); st(); }
  }
  function release(k) { const now = R.time();
    for (const n of notes) if (n.lane === k && n.st === 'holding') { if (now < n.t + n.hold - R.good) { n.st = 'miss'; miss(k, 'DROPPED'); } else { n.st = n.j; done++; st(); } } }
  const keyOf = e => KEYS.indexOf(U.k(e));
  api.on(window, 'keydown', e => { const k = keyOf(e); if (k < 0) return; e.preventDefault(); if (e.repeat || !api.alive || (k === 3 && !burstOn)) return; down[k] = true; press(k); });
  api.on(window, 'keyup', e => { const k = keyOf(e); if (k < 0 || !down[k]) return; down[k] = false; release(k); });
  const st = () => api.status(`<span>Bits <b>${done}/${notes.length}</b></span><span>Streak <b>${streak}</b></span>`);
  api.loop(dt => {
    const now = R.time();
    for (const n of notes) {
      if (n.st === null && now > n.t + R.good) { n.st = 'miss'; miss(n.lane, 'MISS'); if (!api.alive) return; }
      if (n.st === 'holding' && now >= n.t + n.hold) { n.st = n.j; done++; st(); }
    }
    if (now > END) return api.win(`Clock locked · best streak ${best}`);
    flash.forEach((v, i) => flash[i] = Math.max(0, v - dt * 5)); pops.forEach(p => p.a -= dt * 1.6);
    sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; s.a -= dt * 2; });
    const pulse = R.pulse(), cols = [C.cyan, C.amber, C.green], synth = THEME === 'synthwave';
    // ---- sky: sun + horizon ----
    x.clearRect(0, 0, W, H);
    if (synth) {
      const sg = x.createLinearGradient(0, VY - 70, 0, VY + 20); sg.addColorStop(0, '#ffd166'); sg.addColorStop(.55, '#ff4fd8'); sg.addColorStop(1, '#7a2bd6');
      x.save(); x.beginPath(); x.arc(CX, VY + 6, 64, Math.PI, 0); x.clip(); x.fillStyle = sg; x.globalAlpha = .55 + pulse * .25; x.fillRect(CX - 70, VY - 70, 140, 80);
      x.globalAlpha = 1; x.fillStyle = C.base; for (let k = 0; k < 6; k++) x.fillRect(CX - 70, VY - 4 - k * 9, 140, 1.5 + k * .7); x.restore();
    }
    x.fillStyle = U.a(C.amber, .5); x.fillRect(0, VY + 6, W, 1);
    // ---- highway surface ----
    const P0 = 1.35, pF = -.12, halfW = LW * 1.5 + 10;
    x.beginPath(); x.moveTo(X(-halfW, P0), Y(P0)); x.lineTo(X(halfW, P0), Y(P0)); x.lineTo(X(halfW, pF), Y(pF)); x.lineTo(X(-halfW, pF), Y(pF)); x.closePath();
    const hg = x.createLinearGradient(0, Y(P0), 0, Y(pF)); hg.addColorStop(0, U.a(C.sunk, .2)); hg.addColorStop(1, C.sunk); x.fillStyle = hg; x.fill();
    x.strokeStyle = U.a(C.amber, .7); x.lineWidth = 2; x.stroke();
    for (const off of [-LW / 2, LW / 2]) { x.strokeStyle = U.a(C.ink, .14); x.lineWidth = 1; x.beginPath(); x.moveTo(X(off, P0), Y(P0)); x.lineTo(X(off, pF), Y(pF)); x.stroke(); }
    for (let i = 0; i < 3; i++) if (down[i]) { const o = laneOff(i); x.fillStyle = U.a(cols[i], .08); x.beginPath(); x.moveTo(X(o - LW / 2, P0), Y(P0)); x.lineTo(X(o + LW / 2, P0), Y(P0)); x.lineTo(X(o + LW / 2, 0), Y(0)); x.lineTo(X(o - LW / 2, 0), Y(0)); x.fill(); }
    for (let b = Math.ceil(now / R.beat); ; b++) { const p = (b * R.beat - now) / travel; if (p > P0) break; if (p < 0) continue;
      x.strokeStyle = U.a(C.ink, b % 4 === 0 ? .2 : .07); x.lineWidth = 1; x.beginPath(); x.moveTo(X(-halfW, p), Y(p)); x.lineTo(X(halfW, p), Y(p)); x.stroke(); }
    // ---- notes, far to near ----
    const vis = notes.filter(n => (!n.st || n.st === 'holding') && (n.t - now) / travel < P0).reverse();
    for (const n of vis) {
      const p = Math.max(0, (n.t - now) / travel), s = sc(p), fade = Math.min(1, (P0 - p) / .25), y = Y(p);
      x.globalAlpha = fade;
      if (n.lane === 3) { const w = halfW - 8; x.fillStyle = U.a(C.amber, .3); x.strokeStyle = C.amber; x.lineWidth = 2; x.shadowColor = C.amber; x.shadowBlur = 10 * s;
        x.fillRect(X(-w, p), y - 7 * s, 2 * w * s, 14 * s); x.strokeRect(X(-w, p), y - 7 * s, 2 * w * s, 14 * s); x.shadowBlur = 0; x.globalAlpha = 1; continue; }
      const o = laneOff(n.lane), c = cols[n.lane];
      if (n.hold) { const pe = Math.max(0, (n.t + n.hold - now) / travel), tw = 12;
        x.fillStyle = U.a(c, n.st === 'holding' ? .55 : .3); x.beginPath(); x.moveTo(X(o - tw, p), y); x.lineTo(X(o + tw, p), y); x.lineTo(X(o + tw, Math.min(P0, pe)), Y(Math.min(P0, pe))); x.lineTo(X(o - tw, Math.min(P0, pe)), Y(Math.min(P0, pe))); x.fill(); }
      if (n.st === 'holding') { x.globalAlpha = 1; continue; }
      const gx = X(o, p), gw = 40 * s, gh = 16 * s;
      x.fillStyle = C.base; x.strokeStyle = c; x.lineWidth = 2.5 * s + .5; x.shadowColor = c; x.shadowBlur = 12 * s;
      x.beginPath(); x.moveTo(gx - gw, y); x.lineTo(gx - gw * .6, y - gh); x.lineTo(gx + gw * .6, y - gh); x.lineTo(gx + gw, y); x.lineTo(gx + gw * .6, y + gh); x.lineTo(gx - gw * .6, y + gh); x.closePath(); x.fill(); x.stroke(); x.shadowBlur = 0;
      if (s > .45) { x.fillStyle = c; x.font = `700 ${Math.round(18 * s)}px ${C.ff}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n.bit, gx, y + 1); }
      x.globalAlpha = 1;
    }
    // ---- sync line + keycaps ----
    x.fillStyle = U.a(C.cyan, .35 + pulse * .6); x.shadowColor = C.cyan; x.shadowBlur = 8 + pulse * 16; x.fillRect(X(-halfW, 0), HY - 1.5, 2 * halfW, 3); x.shadowBlur = 0;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { const cx = CX + laneOff(i), f = Math.max(flash[i], down[i] ? .6 : 0), c = cols[i];
      x.fillStyle = C.base; x.strokeStyle = U.a(c, .55 + f * .45); x.lineWidth = 2; x.shadowColor = c; x.shadowBlur = f * 18;
      x.beginPath(); x.ellipse(cx, HY, 38, 14, 0, 0, TAU); x.fill(); x.stroke(); x.shadowBlur = 0;
      if (f) { x.fillStyle = U.a(c, .3 * f); x.fill(); }
      x.fillStyle = f ? c : C.text; x.font = `700 15px ${C.ff}`; x.fillText(KEYS[i].toUpperCase(), cx, HY + 1); }
    if (burstOn) { const f = Math.max(flash[3], down[3] ? .6 : 0); x.strokeStyle = U.a(C.amber, .5 + f * .5); x.fillStyle = U.a(C.amber, .08 + f * .3); x.lineWidth = 1.5;
      x.fillRect(CX - 150, HY + 26, 300, 22); x.strokeRect(CX - 150, HY + 26, 300, 22); x.fillStyle = f ? C.amber : C.dim; x.font = `700 12px ${C.ff}`; x.fillText('SPACE · BURST', CX, HY + 37); }
    // sparks + pops
    sparks.forEach(s => { if (s.a > 0) { x.fillStyle = U.a(s.c, s.a); x.fillRect(s.x, s.y, 3, 3); } });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].a <= 0) sparks.splice(i, 1);
    x.font = `700 13px ${C.ff}`;
    for (const p of pops) if (p.a > 0) { x.globalAlpha = Math.min(1, p.a); x.fillStyle = p.col; x.fillText(p.txt, p.lane === 3 ? CX : CX + laneOff(p.lane), HY - 34 - (1 - p.a) * 14); x.globalAlpha = 1; }
    // ---- side HUD: sync meter (misses left) + streak ----
    x.textAlign = 'center'; x.fillStyle = C.dim; x.font = `700 10px ${C.ff}`; x.fillText('SYNC', 52, 76);
    for (let i = 0; i < maxM; i++) { const on = i < maxM - misses, yy = 272 - i * (180 / maxM); x.fillStyle = on ? (maxM - misses <= 2 ? C.red : C.cyan) : C.raise; x.fillRect(38, yy - (180 / maxM) + 4, 28, 180 / maxM - 6); }
    x.fillText('STREAK', W - 60, 76); x.fillStyle = C.text; x.font = `700 38px ${C.ff}`; x.fillText(streak, W - 60, 116);
    x.fillStyle = C.dim; x.font = `700 10px ${C.ff}`; x.fillText(misses ? `REPAIR IN ${10 - streak % 10}` : 'CLEAN', W - 60, 146);
    x.fillText(`${Math.round(R.bpm)} BPM`, W - 60, 272);
    if (now < 0) { x.fillStyle = C.text; x.font = `700 44px ${C.ff}`; x.fillText(Math.ceil(-now / R.beat), CX, 190); }
    x.fillStyle = C.raise; x.fillRect(0, H - 3, W, 3); x.fillStyle = C.cyan; x.fillRect(0, H - 3, W * Math.max(0, Math.min(1, now / END)), 3);
  });
  st();
}});
