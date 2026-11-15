reg({id: 'portknock', name: 'Port Knock', theme: 'tactical', desc: 'Knock on each port as its ring closes, in order, on the beat. Follow drag trails and spin up brute-force dials.',
controls: 'Click or Z/X on the ring · hold trails · circle spinners',
mount(root, api) {
  const W = 640, H = 400, N = api.ti('knocks', 14, 24), maxM = api.ti('misses', 6, 4), rad = api.t('size', 32, 26), appr = api.t('approach', 1.35, .9);
  const R = Rhythm.create(api, {bpm: api.t('bpm', 92, 118)}); R.windows(api.t('perfect', .085, .055), api.t('good', .17, .12));
  const trailP = api.d >= 4 ? api.t('trails', .15, .35) : 0, spins = api.d >= 7 ? 1 : 0, spinNeed = api.t('spinTurns', 2, 3);
  const gaps = api.d <= 3 ? [2, 2, 1] : api.d <= 7 ? [1, 1, 2] : [1, 1, 1, 2];
  // ---- chart ----
  const objs = []; let t = 0, px = W / 2, py = H / 2, num = 0, spinAt = spins ? Math.floor(N * .6) : -1;
  const place = () => { for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, d = 95 + Math.random() * 80, nx = px + Math.cos(a) * d, ny = py + Math.sin(a) * d;
    if (nx < 55 || nx > W - 55 || ny < 50 || ny > H - 70) continue; if (objs.slice(-3).some(o => Math.hypot(o.x - nx, o.y - ny) < rad * 2.6)) continue; return [nx, ny]; }
    return [60 + Math.random() * (W - 120), 60 + Math.random() * (H - 140)]; };
  for (let i = 0; i < N; i++) {
    t += U.pick(gaps) * R.beat;
    if (i === spinAt) { const dur = 3 * R.beat; objs.push({kind: 'spin', t, dur, x: W / 2, y: H / 2 - 10, st: null, turns: 0}); t += dur; px = W / 2; py = H / 2; continue; }
    num = num % 6 + 1; const [x0, y0] = place();
    if (Math.random() < trailP) {
      px = x0; py = y0; const [x2, y2] = place(), dur = (Math.random() < .5 ? 1 : 2) * R.beat, mx = (x0 + x2) / 2, my = (y0 + y2) / 2;
      const nx = -(y2 - y0), ny = x2 - x0, nl = Math.hypot(nx, ny) || 1, bend = (Math.random() * 2 - 1) * 60;
      objs.push({kind: 'trail', t, dur, x: x0, y: y0, x2, y2, cx: mx + nx / nl * bend, cy: my + ny / nl * bend, num, st: null});
      t += dur; px = x2; py = y2;
    } else { objs.push({kind: 'tap', t, x: x0, y: y0, num, st: null}); px = x0; py = y0; }
  }
  const END = objs[objs.length - 1].t + (objs[objs.length - 1].dur || 0) + .7;
  const bez = (o, p) => { const q = 1 - p; return [q * q * o.x + 2 * q * p * o.cx + p * p * o.x2, q * q * o.y + 2 * q * p * o.cy + p * p * o.y2]; };
  let misses = 0, streak = 0, done = 0, mx = W / 2, my = H / 2, held = 0, lastAng = null; const pops = [];
  const x = U.canvas(root, W, H); x.canvas.style.cursor = 'none';
  const front = () => objs.find(o => o.st === null || o.st === 'holding' || o.st === 'spinning');
  const pop = (px, py, txt, col) => pops.push({x: px, y: py, txt, col, a: 1});
  function good(o, j) { streak++; done++; o.done = R.time(); pop(o.kind === 'trail' ? o.x2 : o.x, (o.kind === 'trail' ? o.y2 : o.y) - rad - 8, j === 'perfect' ? 'PERFECT' : 'GOOD', j === 'perfect' ? C.green : C.cyan);
    if (streak % 10 === 0 && misses > 0) { misses--; pop(W / 2, 24, 'REPAIRED', C.amber); } st(); }
  function bad(o, why) { o.st = 'miss'; o.done = R.time(); misses++; streak = 0; pop(o.x, o.y - rad - 8, why, C.red); st(); if (misses >= maxM) api.fail('Knock sequence rejected'); }
  function down() {
    held++; if (held > 1) return; const o = front(); if (!o) return; const now = R.time();
    if (o.kind === 'spin') { if (now >= o.t - R.good && o.st === null) { o.st = 'spinning'; lastAng = Math.atan2(my - o.y, mx - o.x); } return; }
    if (o.st !== null) return;
    const inside = Math.hypot(mx - o.x, my - o.y) <= rad * 1.2, dt = now - o.t;
    if (inside && Math.abs(dt) <= R.good) { const j = R.judge(dt); R.blip(j === 'perfect' ? 1760 : 1320, .05, 'triangle', .25);
      if (o.kind === 'trail') { o.st = 'holding'; o.j = j; } else { o.st = j; good(o, j); } return; }
    if (inside && dt < -R.good && dt > -appr * .55) return bad(o, 'EARLY');
    if (!inside && objs.some(k => k !== o && k.st === null && k.kind !== 'spin' && now > k.t - appr && Math.hypot(mx - k.x, my - k.y) <= rad)) { streak = 0; pop(mx, my - 20, 'ORDER', C.dim); st(); }
  }
  function up() { held = Math.max(0, held - 1); if (held) return; const o = front(); if (!o) return; const now = R.time();
    if (o.st === 'holding' && now < o.t + o.dur - R.good) bad(o, 'DROPPED');
    if (o.st === 'spinning') lastAng = null; }
  api.on(x.canvas, 'mousemove', e => { mx = e.offsetX; my = e.offsetY; });
  api.on(x.canvas, 'mousedown', e => { mx = e.offsetX; my = e.offsetY; down(); });
  api.on(window, 'mouseup', () => { if (held) up(); });
  const kz = {}; api.on(window, 'keydown', e => { const k = U.k(e); if ((k === 'z' || k === 'x') && !kz[k] && api.alive) { kz[k] = 1; down(); } });
  api.on(window, 'keyup', e => { const k = U.k(e); if ((k === 'z' || k === 'x') && kz[k]) { kz[k] = 0; up(); } });
  const st = () => api.status(`<span>Knocks <b>${done}/${objs.length}</b></span><span>Streak <b>${streak}</b></span><span>Misses${U.strikes(misses, maxM)}</span>`);
  api.loop(dt => {
    const now = R.time(), o = front();
    if (o) {
      if (o.st === null && o.kind !== 'spin' && now > o.t + R.good) bad(o, 'MISS');
      else if (o.st === 'holding') { const [bx, by] = bez(o, Math.min(1, (now - o.t) / o.dur));
        if (Math.hypot(mx - bx, my - by) > rad * 2.4) bad(o, 'LOST'); else if (now >= o.t + o.dur) { o.st = o.j; good(o, o.j); } }
      else if (o.kind === 'spin') {
        if (o.st === 'spinning' && held && lastAng !== null) { const a = Math.atan2(my - o.y, mx - o.x); let d = a - lastAng; d = (d + Math.PI * 3) % TAU - Math.PI; o.turns += Math.abs(d) / TAU; lastAng = a; }
        else if (o.st === 'spinning' && held) lastAng = Math.atan2(my - o.y, mx - o.x);
        if (now >= o.t + o.dur) { if (o.turns >= spinNeed) { o.st = 'perfect'; good(o, 'perfect'); } else bad(o, 'SPIN'); }
      }
      if (!api.alive) return;
    }
    if (now > END) return api.win(`Port opened · ${done}/${objs.length} knocks`);
    pops.forEach(p => p.a -= dt * 1.4);
    // ---- draw ----
    const pulse = R.pulse();
    x.clearRect(0, 0, W, H); x.fillStyle = C.sunk; x.fillRect(0, 0, W, H);
    x.fillStyle = U.a(C.ink, .07 + pulse * .05); for (let gx = 20; gx < W; gx += 40) for (let gy = 20; gy < H; gy += 40) x.fillRect(gx, gy, 2, 2);
    const vis = objs.filter(k => (k.st === null || k.st === 'holding' || k.st === 'spinning') && now > k.t - appr);
    // follow points to the next object
    for (let i = 0; i < vis.length - 1; i++) { const a = vis[i], b = vis[i + 1]; const ax = a.kind === 'trail' ? a.x2 : a.x, ay = a.kind === 'trail' ? a.y2 : a.y;
      const d = Math.hypot(b.x - ax, b.y - ay); x.fillStyle = U.a(C.cyan, .35); for (let s = rad * 1.4; s < d - rad * 1.4; s += 14) x.fillRect(ax + (b.x - ax) * s / d - 1.5, ay + (b.y - ay) * s / d - 1.5, 3, 3); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const k of [...vis].reverse()) {
      const fade = Math.min(1, (now - (k.t - appr)) / .25);
      x.globalAlpha = fade;
      if (k.kind === 'spin') {
        const p = Math.min(1, k.turns / spinNeed), left = Math.max(0, k.t + k.dur - Math.max(now, k.t));
        x.strokeStyle = U.a(C.cyan, .25); x.lineWidth = 2; x.beginPath(); x.arc(k.x, k.y, 110, 0, TAU); x.stroke();
        x.strokeStyle = p >= 1 ? C.green : C.amber; x.lineWidth = 8; x.beginPath(); x.arc(k.x, k.y, 110, -Math.PI / 2, -Math.PI / 2 + TAU * p); x.stroke();
        const a = k.turns * TAU; x.strokeStyle = C.cyan; x.lineWidth = 3; x.beginPath(); x.moveTo(k.x, k.y); x.lineTo(k.x + Math.cos(a - Math.PI / 2) * 90, k.y + Math.sin(a - Math.PI / 2) * 90); x.stroke();
        x.fillStyle = C.text; x.font = `700 16px ${C.ff}`; x.fillText(k.st === 'spinning' ? `${Math.round(p * 100)}%` : 'HOLD + SPIN', k.x, k.y - 12);
        x.fillStyle = C.dim; x.font = `700 11px ${C.ff}`; x.fillText(`BRUTE FORCE · ${left.toFixed(1)}s`, k.x, k.y + 12);
        x.globalAlpha = 1; continue;
      }
      if (k.kind === 'trail') {
        x.lineCap = 'round'; x.strokeStyle = U.a(C.cyan, .14); x.lineWidth = rad * 1.8; x.beginPath(); x.moveTo(k.x, k.y); x.quadraticCurveTo(k.cx, k.cy, k.x2, k.y2); x.stroke();
        x.strokeStyle = U.a(C.cyan, .5); x.lineWidth = 1.5; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(k.x, k.y); x.quadraticCurveTo(k.cx, k.cy, k.x2, k.y2); x.stroke(); x.setLineDash([]);
        x.strokeStyle = U.a(C.cyan, .6); x.lineWidth = 2; x.beginPath(); x.arc(k.x2, k.y2, rad * .75, 0, TAU); x.stroke();
        if (k.st === 'holding') { const [bx, by] = bez(k, Math.min(1, (now - k.t) / k.dur));
          x.strokeStyle = U.a(C.green, .5); x.lineWidth = 1.5; x.beginPath(); x.arc(bx, by, rad * 2.4, 0, TAU); x.stroke();
          x.fillStyle = C.green; x.shadowColor = C.green; x.shadowBlur = 14; x.beginPath(); x.arc(bx, by, rad * .6, 0, TAU); x.fill(); x.shadowBlur = 0; x.globalAlpha = 1; continue; }
      }
      // node + approach ring
      const ap = Math.max(0, (k.t - now) / appr);
      x.fillStyle = C.base; x.strokeStyle = C.cyan; x.lineWidth = 2.5; x.beginPath(); x.arc(k.x, k.y, rad, 0, TAU); x.fill(); x.stroke();
      x.strokeStyle = U.a(C.cyan, .3); x.lineWidth = 1; x.beginPath(); x.arc(k.x, k.y, rad - 6, 0, TAU); x.stroke();
      if (THEME === 'tactical') { const q = rad + 7, t2 = 7; x.strokeStyle = C.cyan; x.lineWidth = 2; x.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { x.moveTo(k.x + sx * q, k.y + sy * (q - t2)); x.lineTo(k.x + sx * q, k.y + sy * q); x.lineTo(k.x + sx * (q - t2), k.y + sy * q); } x.stroke(); }
      x.fillStyle = C.text; x.font = `700 ${Math.round(rad * .8)}px ${C.ff}`; x.fillText(k.num, k.x, k.y + 1);
      if (ap > 0) { x.strokeStyle = U.a(ap < .15 ? C.green : C.amber, .9); x.lineWidth = 2; x.beginPath(); x.arc(k.x, k.y, rad * (1 + ap * 2.2), 0, TAU); x.stroke(); }
      x.fillStyle = C.dim; x.font = `600 9px ${C.ff}`; x.fillText(`:${[21, 22, 23, 80, 443, 8080][k.num - 1]}`, k.x, k.y + rad + 11);
      x.globalAlpha = 1;
    }
    x.font = `700 13px ${C.ff}`;
    for (const p of pops) if (p.a > 0) { x.globalAlpha = Math.min(1, p.a); x.fillStyle = p.col; x.fillText(p.txt, p.x, p.y - (1 - p.a) * 10); x.globalAlpha = 1; }
    // upcoming-ports belt
    const up = objs.filter(k => (k.st === null || k.st === 'holding' || k.st === 'spinning') && k.kind !== 'spin').slice(0, 7);
    x.fillStyle = U.a(C.base, .85); x.fillRect(0, H - 26, W, 23); x.textAlign = 'left'; x.font = `700 10px ${C.ff}`; x.fillStyle = C.dim; x.fillText('QUEUE', 10, H - 14);
    up.forEach((k, i) => { const bx = 60 + i * 74; x.strokeStyle = i ? U.a(C.cyan, .35) : C.cyan; x.lineWidth = 1.5; x.strokeRect(bx, H - 22, 66, 15);
      x.fillStyle = i ? C.dim : C.cyan; x.textAlign = 'center'; x.fillText(`${k.num} ▸ :${[21, 22, 23, 80, 443, 8080][k.num - 1]}${k.kind === 'trail' ? ' ≈' : ''}`, bx + 33, H - 14); });
    x.textAlign = 'center';
    // reticle cursor
    x.strokeStyle = held ? C.green : C.text; x.lineWidth = 1.5; x.beginPath(); x.arc(mx, my, 9, 0, TAU);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { x.moveTo(mx + a * 5, my + b * 5); x.lineTo(mx + a * 15, my + b * 15); } x.stroke();
    x.fillStyle = held ? C.green : C.text; x.fillRect(mx - 1, my - 1, 2, 2);
    if (now < 0) { x.fillStyle = C.text; x.font = `700 44px ${C.ff}`; x.fillText(Math.ceil(-now / R.beat), W / 2, H / 2); }
    x.fillStyle = C.raise; x.fillRect(0, H - 3, W, 3); x.fillStyle = C.cyan; x.fillRect(0, H - 3, W * Math.max(0, Math.min(1, now / END)), 3);
  });
  st();
}});
