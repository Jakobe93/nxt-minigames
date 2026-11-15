reg({id: 'handshake', name: 'Handshake Sync', desc: 'Two endpoints orbit out of phase. Fire when they line up to complete the handshake.',
controls: 'Space or click when the markers align',
mount(root, api) {
  const need = api.ti('hits', 3, 6), maxMiss = api.ti('faults', 3, 1), tol = api.t('windowDeg', 24, 11) * Math.PI / 180, assist = api.d <= 4;
  let w1 = api.t('outerSpeed', 1.2, 2.2), w2 = -api.t('innerSpeed', .8, 1.6), a1 = Math.random() * TAU, a2 = a1 + Math.PI;
  let hits = 0, miss = 0, fl = 0, flc = C.green;
  const x = U.canvas(root, 400, 400), cx = 200, cy = 200, R1 = 158, R2 = 116;
  const gap = () => { const v = ((a1 - a2) % TAU + TAU) % TAU; return Math.min(v, TAU - v); };
  function press() {
    if (gap() <= tol) {
      hits++; fl = 1; flc = C.green;
      if (hits >= need) return api.win('Handshake established');
      const j = api.t('jitter', .08, .3);
      w1 *= 1 + (Math.random() * 2 - 1) * j; w2 *= 1 + (Math.random() * 2 - 1) * j;
      if (api.d >= 7 && Math.random() < .5) w2 = -w2 * .9;   // direction flip on hard
      a2 += Math.PI * (.6 + Math.random() * .8);
    } else { miss++; fl = 1; flc = C.red; if (miss >= maxMiss) return api.fail('Sync lost'); }
    st();
  }
  const st = () => api.status(`<span>Synced <b>${hits}/${need}</b></span><span>Faults${U.strikes(miss, maxMiss)}</span>`);
  api.key(e => { if (e.code === 'Space') { e.preventDefault(); press(); } });
  api.on(x.canvas, 'mousedown', press);
  api.loop(dt => {
    a1 += w1 * dt; a2 += w2 * dt; fl = Math.max(0, fl - dt * 2.5);
    const inW = gap() <= tol;
    x.clearRect(0, 0, 400, 400);
    x.lineWidth = 2; x.strokeStyle = C.raise;
    for (const r of [R1, R2]) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke(); }
    // ticks
    x.strokeStyle = C.mute; x.lineWidth = 1;
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r0 = i % 4 ? R1 + 8 : R1 + 4; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * (R1 + 13), cy + Math.sin(a) * (R1 + 13)); x.stroke(); }
    // sync window on outer ring, centred on the inner endpoint
    x.lineWidth = 10; x.lineCap = 'round'; x.strokeStyle = inW ? U.a(C.green, .55) : U.a(C.amber, .28);
    x.beginPath(); x.arc(cx, cy, R1, a2 - tol, a2 + tol); x.stroke();
    // inner spoke
    x.lineWidth = 2; x.strokeStyle = U.a(C.amber, .35);
    x.beginPath(); x.moveTo(cx + Math.cos(a2) * R2, cy + Math.sin(a2) * R2); x.lineTo(cx + Math.cos(a2) * (R1 - 10), cy + Math.sin(a2) * (R1 - 10)); x.stroke();
    if (assist && inW) { x.strokeStyle = C.green; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + Math.cos(a2) * R2, cy + Math.sin(a2) * R2); x.lineTo(cx + Math.cos(a1) * R1, cy + Math.sin(a1) * R1); x.stroke(); }
    const dot = (a, r, col, s) => { x.shadowColor = col; x.shadowBlur = 14; x.fillStyle = col; x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, 0, TAU); x.fill(); x.shadowBlur = 0; };
    dot(a2, R2, C.amber, 8); dot(a1, R1, C.cyan, 9);
    // centre readout
    if (fl) { x.globalAlpha = fl * .35; x.fillStyle = flc; x.beginPath(); x.arc(cx, cy, 70, 0, TAU); x.fill(); x.globalAlpha = 1; }
    x.textAlign = 'center'; x.fillStyle = C.text; x.font = `700 46px ${C.ff}`; x.fillText(`${hits}/${need}`, cx, cy + 12);
    x.fillStyle = C.dim; x.font = `600 14px ${C.ff}`; x.fillText('SYNCED', cx, cy + 36);
  });
  api.timer(api.ti('time', 40, 30)); st();
}});
