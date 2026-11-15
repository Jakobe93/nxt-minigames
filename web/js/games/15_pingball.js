reg({id: 'pingball', name: 'Ping Ball', theme: 'arcade',
desc: 'Plunge the ping into the table and light every network node. Drain the ball and it costs one — you have a few.',
controls: 'Hold + release Space to plunge · A / ← and D / → flippers',
mount(root, api) {
  const nT = api.ti('targets', 4, 8), lives = api.ti('strikes', 3, 2), G = api.t('gravity', 760, 980);
  const W = 640, H = 410, BR = 7;
  const L = 186, R = 498, R2 = 528, TOP = 30, CXT = (L + R) / 2;
  // ---- table geometry ----
  const seg = [], wall = (pts, e = .5) => { for (let i = 0; i < pts.length - 1; i++) seg.push({a: pts[i], b: pts[i + 1], e}); };
  const arc = []; for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI / 2; arc.push([R2 - 42 + Math.cos(a) * 42, 72 + Math.sin(a) * 42]); }
  wall([[L, 300], [L, 74], [L + 44, TOP], ...arc, [R2, 400]], .55);
  wall([[R, 404], [R, 124]], .4);                                   // plunger-lane inner wall
  const gate = {a: [R, 124], b: [R2, 86], e: .5, on: false};           // one-way gate closes behind a launched ball
  const PL = [CXT - 64, 364], PR = [CXT + 64, 364], FL = 56;
  wall([[L, 300], [PL[0] - 4, PL[1] - 2]]); wall([[R, 300], [PR[0] + 4, PR[1] - 2]]);
  const sling = [[[L + 34, 246], [L + 34, 290], [PL[0] - 26, 326]], [[R - 34, 246], [R - 34, 290], [PR[0] + 26, 326]]];
  sling.forEach(p => { seg.push({a: p[0], b: p[1], e: .5}); seg.push({a: p[1], b: p[2], e: .5}); seg.push({a: p[2], b: p[0], e: 1.2, kick: 1}); });
  const bumpers = [[CXT, 118], [CXT - 56, 166], [CXT + 56, 166]].map(([x, y]) => ({x, y, r: 20, fl: 0}));
  const SPOTS = [[L + 34, 112], [R - 34, 112], [CXT - 96, 64], [CXT + 96, 64], [L + 24, 200], [R - 24, 200], [CXT, 222], [CXT - 62, 250], [CXT + 62, 250], [CXT, 58]];
  const targets = U.shuffle(SPOTS).slice(0, nT).map(([x, y]) => ({x, y, r: 10, lit: false, fl: 0}));
  const flip = [{p: PL, rest: .5, up: -.48, a: .5, w: 0, key: false}, {p: PR, rest: Math.PI - .5, up: Math.PI + .48, a: Math.PI - .5, w: 0, key: false}];
  const tip = f => [f.p[0] + Math.cos(f.a) * FL, f.p[1] + Math.sin(f.a) * FL];
  const PLY = 386; let pull = 0, pulling = false, ball = null, drained = 0, lit = 0, score = 0, idle = 0, fx = [];
  const onPlunger = () => ball && ball.x > R && ball.y > PLY - 40 && Math.abs(ball.vy) < 1;
  const serve = () => { ball = {x: (R + R2) / 2, y: PLY - BR - 1, vx: 0, vy: 0}; gate.on = false; idle = 0; dmd(`BALL ${drained + 1}`, 'PLUNGE!'); };
  // ---- dot-matrix display: text rasterised once per change, drawn as lit dots ----
  const DW = 64, DH = 30, dm = document.createElement('canvas'); dm.width = DW; dm.height = DH; const dc = dm.getContext('2d');
  let dots = null, msgT = 0;
  function dmd(a, b, hold = 1.6) { dc.clearRect(0, 0, DW, DH); dc.fillStyle = '#fff'; dc.textAlign = 'center'; dc.textBaseline = 'middle';
    dc.font = 'bold 11px monospace'; dc.fillText(a, DW / 2, 8); dc.font = 'bold 12px monospace'; dc.fillText(b, DW / 2, 22);
    const d = dc.getImageData(0, 0, DW, DH).data; dots = []; for (let y = 0; y < DH; y++) for (let x2 = 0; x2 < DW; x2++) if (d[(y * DW + x2) * 4 + 3] > 110) dots.push([x2, y]);
    msgT = hold; }
  const page = () => { const p = Math.floor(performance.now() / 2600) % 2; return p ? [`NODES ${lit}/${nT}`, `BALL ${Math.min(drained + 1, lives)}/${lives}`] : ['SCORE', String(score).padStart(6, '0')]; };
  let lastPage = '';
  // ---- collisions ----
  function vsCircle(cx, cy, r, e, kick) {
    const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy), m = r + BR; if (d >= m || d === 0) return false;
    const nx = dx / d, ny = dy / d; ball.x = cx + nx * m; ball.y = cy + ny * m; const vn = ball.vx * nx + ball.vy * ny;
    if (kick) { ball.vx += nx * (kick - Math.min(0, vn)); ball.vy += ny * (kick - Math.min(0, vn)); } else if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
    return true;
  }
  function vsSeg(a, b, thick, e, pv) {
    const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey, t = Math.max(0, Math.min(1, ((ball.x - a[0]) * ex + (ball.y - a[1]) * ey) / l2));
    const px = a[0] + ex * t, py = a[1] + ey * t, dx = ball.x - px, dy = ball.y - py, d = Math.hypot(dx, dy), m = BR + thick;
    if (d >= m || d === 0) return false; const nx = dx / d, ny = dy / d; ball.x = px + nx * m; ball.y = py + ny * m;
    const [svx, svy] = pv ? pv(px, py) : [0, 0], vn = (ball.vx - svx) * nx + (ball.vy - svy) * ny;
    if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; } return true;
  }
  const launch = () => { if (onPlunger()) { ball.vy = -(620 + pull * 880); ball.vx = 0; } pull = 0; pulling = false; };
  api.on(window, 'keydown', e => { const k = U.k(e);
    if (k === 'a' || e.key === 'ArrowLeft') flip[0].key = true; if (k === 'd' || e.key === 'ArrowRight') flip[1].key = true;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) pulling = true; } });
  api.on(window, 'keyup', e => { const k = U.k(e);
    if (k === 'a' || e.key === 'ArrowLeft') flip[0].key = false; if (k === 'd' || e.key === 'ArrowRight') flip[1].key = false;
    if (e.code === 'Space' && pulling) launch(); });
  const x = U.canvas(root, W, H);
  api.on(x.canvas, 'mousedown', e => { if (e.offsetX > R && e.offsetY > 300) pulling = true; else flip[e.offsetX < CXT ? 0 : 1].key = true; });
  api.on(window, 'mouseup', () => { flip[0].key = flip[1].key = false; if (pulling) launch(); });
  const st = () => api.status(`<span>Nodes <b>${lit}/${nT}</b></span><span>Balls${U.strikes(drained, lives)}</span>`);
  api.loop((dt, t) => {
    if (pulling) pull = Math.min(1, pull + dt * 1.4);
    const SUB = 8, h = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      for (const f of flip) { const tgt = f.key ? f.up : f.rest, sp = 22 * h, prev = f.a; f.a += Math.max(-sp, Math.min(sp, tgt - f.a)); f.w = (f.a - prev) / h; }
      if (!ball) continue;
      ball.vy += G * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      if (!gate.on && ball.x < R - 10) gate.on = true;
      if (ball.x > R && ball.vy >= 0) { const top = PLY + pull * 22 - BR; if (ball.y >= top) { ball.y = top; ball.vy = 0; ball.vx = 0; ball.x = (R + R2) / 2; } }
      for (const g of seg) if (vsSeg(g.a, g.b, 0, g.e) && g.kick) { const n = Math.hypot(ball.vx, ball.vy) || 1; ball.vx += ball.vx / n * 120; ball.vy -= 80; score += 10; }
      if (gate.on) vsSeg(gate.a, gate.b, 0, gate.e);
      for (const f of flip) vsSeg(f.p, tip(f), 5, .3, (px, py) => [-f.w * (py - f.p[1]), f.w * (px - f.p[0])]);
      for (const b of bumpers) if (vsCircle(b.x, b.y, b.r, 0, 460)) { b.fl = 1; score += 100; }
      for (const g of targets) if (vsCircle(g.x, g.y, g.r, .7)) { g.fl = 1;
        if (!g.lit) { g.lit = true; lit++; score += 1000; fx.push({x: g.x, y: g.y, r: 8}); dmd('NODE LIT', `${lit} OF ${nT}`); st(); if (lit >= nT) { dmd('JACKPOT', 'ACCESS'); return api.win(`Every node lit · ${score} pts`); } }
        else score += 250; }
      const sp = Math.hypot(ball.vx, ball.vy); if (sp > 1500) { ball.vx *= 1500 / sp; ball.vy *= 1500 / sp; }
      if (ball.y > H + 20) { ball = null; drained++; st(); if (drained >= lives) { dmd('GAME', 'OVER'); return api.fail('Last ping drained'); } dmd('DRAIN', 'BALL LOST'); setTimeout(() => api.alive && serve(), 1200); }
    }
    if (onPlunger() && !pulling) { idle += dt; if (idle > 6) { pull = .75; launch(); } } else idle = 0;   // auto-plunge so a run can't stall
    bumpers.forEach(b => b.fl = Math.max(0, b.fl - dt * 4)); targets.forEach(g => g.fl = Math.max(0, g.fl - dt * 3));
    if (msgT > 0) msgT -= dt; else { const pg = page(), k = pg.join('|'); if (k !== lastPage) { lastPage = k; dmd(pg[0], pg[1], 0); } }
    // ---- draw: cabinet ----
    x.clearRect(0, 0, W, H);
    // backbox + dot-matrix display
    x.fillStyle = '#07050a'; U.rr(x, 12, 12, 156, 94, 6); x.fill(); x.strokeStyle = '#3a3440'; x.lineWidth = 2; x.stroke();
    x.fillStyle = 'rgba(255,138,31,.07)'; for (let yy = 0; yy < DH; yy++) for (let xx = 0; xx < DW; xx++) if ((xx + yy) % 1 === 0) x.fillRect(19 + xx * 2.2, 22 + yy * 2.2, 1.4, 1.4);
    x.fillStyle = '#ff8a1f'; x.shadowColor = '#ff8a1f'; x.shadowBlur = 4; if (dots) for (const [xx, yy] of dots) x.fillRect(19 + xx * 2.2, 22 + yy * 2.2, 1.6, 1.6); x.shadowBlur = 0;
    // instruction card + node lamps
    x.fillStyle = '#efe6d2'; U.rr(x, 12, 118, 156, 108, 4); x.fill();
    x.fillStyle = '#1b1420'; x.font = `700 12px ${C.ff}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NODE HUNT', 90, 134);
    x.font = `600 10px ${C.ff}`; x.fillText('LIGHT EVERY NODE', 90, 150); x.fillText('BUMPER 100 · NODE 1000', 90, 164);
    targets.forEach((g, i) => { const cx = 36 + (i % 4) * 36, cy = 186 + Math.floor(i / 4) * 22; x.fillStyle = g.lit ? C.amber : '#b9ad96'; x.beginPath(); x.arc(cx, cy, 7, 0, TAU); x.fill(); x.strokeStyle = '#1b1420'; x.lineWidth = 1; x.stroke(); });
    x.fillStyle = C.dim; x.font = `700 11px ${C.ff}`; x.fillText(`BALL ${Math.min(drained + 1, lives)} OF ${lives}`, 90, 246);
    // table bed: side rails, playfield wood-ish gradient
    x.fillStyle = '#9aa3ad'; x.fillRect(L - 12, 8, 6, H); x.fillRect(R2 + 6, 8, 6, H);
    const pf = x.createLinearGradient(0, 0, 0, H); pf.addColorStop(0, '#1d1430'); pf.addColorStop(1, '#0d0918');
    x.fillStyle = pf; x.beginPath(); x.moveTo(L, H); x.lineTo(L, 74); x.lineTo(L + 44, TOP); arc.forEach(p => x.lineTo(...p)); x.lineTo(R2, H); x.fill();
    // chasing arrow inserts up the centre
    for (let k = 0; k < 4; k++) { const on = !NUI.reduce && (Math.floor(t / 180) % 4) === k, ay = 318 - k * 22; x.fillStyle = on ? U.a(C.cyan, .85) : U.a(C.cyan, .14);
      x.beginPath(); x.moveTo(CXT, ay - 9); x.lineTo(CXT + 12, ay + 5); x.lineTo(CXT - 12, ay + 5); x.fill(); }
    // walls as chrome rails
    x.lineCap = 'round';
    for (const g of seg) { x.strokeStyle = g.kick ? '#ffffff' : '#c7ced6'; x.lineWidth = g.kick ? 4 : 3; x.beginPath(); x.moveTo(...g.a); x.lineTo(...g.b); x.stroke(); }
    if (gate.on) { x.strokeStyle = '#c7ced6'; x.lineWidth = 2; x.beginPath(); x.moveTo(...gate.a); x.lineTo(...gate.b); x.stroke(); }
    // sling rubbers glow
    sling.forEach(p => { x.fillStyle = U.a(C.red, .22); x.beginPath(); x.moveTo(...p[0]); x.lineTo(...p[1]); x.lineTo(...p[2]); x.fill(); });
    // node targets with lamp inserts
    for (const g of targets) { x.fillStyle = g.lit ? U.a(C.amber, .35 + g.fl * .4) : U.a(C.amber, .08); x.beginPath(); x.arc(g.x, g.y, g.r + 7, 0, TAU); x.fill();
      x.fillStyle = g.lit ? C.amber : '#3a2f24'; x.strokeStyle = g.lit ? '#fff3b0' : C.amber; x.lineWidth = 2; x.shadowColor = C.amber; x.shadowBlur = g.lit ? 14 : 0;
      x.beginPath(); x.arc(g.x, g.y, g.r, 0, TAU); x.fill(); x.stroke(); x.shadowBlur = 0; }
    // pop bumpers: skirt + coloured cap
    for (const b of bumpers) { x.fillStyle = '#e8e8e8'; x.beginPath(); x.arc(b.x, b.y, b.r, 0, TAU); x.fill();
      x.fillStyle = b.fl ? '#ffffff' : C.red; x.shadowColor = C.red; x.shadowBlur = 6 + b.fl * 22; x.beginPath(); x.arc(b.x, b.y, b.r - 5, 0, TAU); x.fill(); x.shadowBlur = 0;
      x.fillStyle = b.fl ? C.red : '#ffe3e8'; x.font = `700 9px ${C.ff}`; x.fillText('100', b.x, b.y + 1); }
    // flippers: white bat, red rubber edge
    for (const f of flip) { const [tx, ty] = tip(f); x.strokeStyle = C.red; x.lineWidth = 13; x.beginPath(); x.moveTo(...f.p); x.lineTo(tx, ty); x.stroke();
      x.strokeStyle = '#f5f5f5'; x.lineWidth = 9; x.beginPath(); x.moveTo(...f.p); x.lineTo(tx, ty); x.stroke(); x.fillStyle = '#888'; x.beginPath(); x.arc(f.p[0], f.p[1], 3, 0, TAU); x.fill(); }
    // plunger
    const py = PLY + pull * 22; x.fillStyle = '#c7ced6'; x.fillRect(R + 8, py, R2 - R - 16, 5); x.fillStyle = '#7d858f'; x.fillRect((R + R2) / 2 - 2, py + 5, 4, H - py);
    x.fillStyle = C.red; x.beginPath(); x.arc((R + R2) / 2, H - 4, 8, Math.PI, 0); x.fill();
    if (onPlunger()) { x.fillStyle = pulling ? C.amber : U.a(C.amber, .5 + Math.sin(t / 150) * .3); x.font = `700 10px ${C.ff}`; x.textAlign = 'left'; x.fillText('◀ SPACE', R2 + 16, PLY - 8); x.textAlign = 'center'; }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.r += dt * 70; const a = 1 - f.r / 44; if (a <= 0) { fx.splice(i, 1); continue; } x.strokeStyle = U.a(C.amber, a); x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, f.r, 0, TAU); x.stroke(); }
    // chrome ball
    if (ball) { const bg = x.createRadialGradient(ball.x - 2, ball.y - 3, 1, ball.x, ball.y, BR); bg.addColorStop(0, '#ffffff'); bg.addColorStop(.6, '#b9c0c8'); bg.addColorStop(1, '#5d646c');
      x.fillStyle = bg; x.beginPath(); x.arc(ball.x, ball.y, BR, 0, TAU); x.fill(); }
    // apron + control legend
    x.fillStyle = '#07050a'; x.fillRect(PL[0] + 8, H - 12, PR[0] - PL[0] - 16, 12);
    x.textAlign = 'center'; x.fillStyle = C.dim; x.font = `700 11px ${C.ff}`;
    x.fillText('FLIPPERS', 590, 300); x.fillStyle = C.text; x.font = `700 13px ${C.ff}`; x.fillText('A ◀  ▶ D', 590, 320);
    x.fillStyle = C.dim; x.font = `700 11px ${C.ff}`; x.fillText('PLUNGER', 590, 356); x.fillStyle = C.text; x.font = `700 13px ${C.ff}`; x.fillText('SPACE', 590, 376);
  });
  serve(); st();
}});
