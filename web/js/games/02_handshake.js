reg({id: 'handshake', name: 'Handshake Sync', desc: 'The scope beam sweeps for the remote endpoint. Fire when the beam crosses its blip to complete the handshake.',
controls: 'Space or click when the beam crosses the blip',
mount(root, api) {
  const need = api.ti('hits', 3, 6), maxMiss = api.ti('faults', 3, 1), tol = api.t('windowDeg', 24, 11) * Math.PI / 180, assist = api.d <= 4;
  let w1 = api.t('outerSpeed', 1.2, 2.2), w2 = -api.t('innerSpeed', .8, 1.6), a1 = Math.random() * TAU, a2 = a1 + Math.PI;
  let hits = 0, miss = 0, fx = [], lastHit = -1;
  const S = 400, x = U.canvas(root, S, 400), cx = 200, cy = 200, R = 172, BR = R * .64;
  const gap = () => { const v = ((a1 - a2) % TAU + TAU) % TAU; return Math.min(v, TAU - v); };
  function press() {
    const p = [cx + Math.cos(a2) * BR, cy + Math.sin(a2) * BR];
    if (gap() <= tol) {
      hits++; fx.push({x: p[0], y: p[1], r: 6, c: C.green});
      if (hits >= need) return api.win('Handshake established');
      const j = api.t('jitter', .08, .3);
      w1 *= 1 + (Math.random() * 2 - 1) * j; w2 *= 1 + (Math.random() * 2 - 1) * j;
      if (api.d >= 7 && Math.random() < .5) w2 = -w2 * .9;
      a2 += Math.PI * (.6 + Math.random() * .8);
    } else { miss++; fx.push({x: cx + Math.cos(a1) * BR, y: cy + Math.sin(a1) * BR, r: 6, c: C.red}); if (miss >= maxMiss) return api.fail('Sync lost'); }
    st();
  }
  const st = () => api.status(`<span>Synced <b>${hits}/${need}</b></span><span>Faults${U.strikes(miss, maxMiss)}</span>`);
  api.key(e => { if (e.code === 'Space') { e.preventDefault(); press(); } });
  api.on(x.canvas, 'mousedown', press);
  api.loop(dt => {
    a1 += w1 * dt; a2 += w2 * dt;
    const dir = Math.sign(w1) || 1, inW = gap() <= tol;
    x.clearRect(0, 0, S, 400);
    // scope face
    x.fillStyle = C.sunk; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
    x.strokeStyle = U.a(C.cyan, .16); x.lineWidth = 1;
    for (const f of [.25, .5, .75, 1]) { x.beginPath(); x.arc(cx, cy, R * f, 0, TAU); x.stroke(); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke(); }
    x.fillStyle = U.a(C.cyan, .45); x.font = `600 10px ${C.ff}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU - Math.PI / 2; x.fillText(String(k * 90).padStart(3, '0'), cx + Math.cos(a) * (R + 13), cy + Math.sin(a) * (R + 13)); }
    // sync window: a faint sector around the blip's bearing
    x.fillStyle = inW ? U.a(C.green, .16) : U.a(C.amber, assist ? .1 : .05);
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a2 - tol, a2 + tol); x.closePath(); x.fill();
    // beam with phosphor trail
    for (let k = 0; k < 28; k++) { const t = k / 28, a = a1 - dir * t * .9;
      x.fillStyle = U.a(C.cyan, .22 * (1 - t) * (1 - t)); x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, dir > 0 ? a - .035 : a, dir > 0 ? a : a + .035); x.closePath(); x.fill(); }
    x.strokeStyle = C.cyan; x.lineWidth = 2; x.shadowColor = C.cyan; x.shadowBlur = 10;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); x.stroke(); x.shadowBlur = 0;
    // blip: brightest just after the beam passes, never fully dark
    const behind = (((a1 - a2) * dir) % TAU + TAU) % TAU, glow = Math.max(.35, 1 - behind / (TAU * .85));
    const bx = cx + Math.cos(a2) * BR, by = cy + Math.sin(a2) * BR;
    x.fillStyle = U.a(C.amber, glow); x.shadowColor = C.amber; x.shadowBlur = 14 * glow;
    x.beginPath(); x.arc(bx, by, 6, 0, TAU); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = U.a(C.amber, .5 * glow); x.lineWidth = 1; x.strokeRect(bx - 11, by - 11, 22, 22);
    // hit / miss rings
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.r += dt * 70; const a = 1 - f.r / 46; if (a <= 0) { fx.splice(i, 1); continue; }
      x.strokeStyle = U.a(f.c, a); x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, f.r, 0, TAU); x.stroke(); }
    x.fillStyle = C.sunk; x.fillRect(cx - 46, cy + R - 44, 92, 28);
    x.fillStyle = C.text; x.font = `700 18px ${C.ff}`; x.fillText(`SYNC ${hits}/${need}`, cx, cy + R - 30);
  });
  api.timer(api.ti('time', 40, 30)); st();
}});
