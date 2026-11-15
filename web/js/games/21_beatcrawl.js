reg({id: 'beatcrawl', name: 'Beat Crawler', theme: 'club', desc: 'The maze runs on the clock. You move one step per beat, and so do the trace daemons. Miss the beat and you stall.',
controls: 'Arrows or WASD, on the beat',
mount(root, api) {
  const cw = api.ti('mazeW', 8, 11), chh = api.ti('mazeH', 5, 7), COLS = cw * 2 + 1, ROWS = chh * 2 + 1;
  const nD = api.ti('daemons', 2, 3), every = api.d <= 4 ? 2 : 1, nFrag = api.ti('fragments', 12, 20), lives = api.ti('strikes', 3, 2), scareB = api.ti('spoofBeats', 12, 8);
  const R = Rhythm.create(api, {bpm: api.t('bpm', 96, 118)}); R.windows(api.t('perfect', .075, .05), api.t('good', .17, .12));
  // ---- maze (DFS + braid so there are loops to dodge through) ----
  const open = Array.from({length: ROWS}, () => Array(COLS).fill(false)); const seen = new Set(['1,1']), stack = [[1, 1]]; open[1][1] = true;
  while (stack.length) { const [r, c] = stack[stack.length - 1];
    const nx = U.shuffle([[0, 2], [2, 0], [0, -2], [-2, 0]]).map(([a, b]) => [r + a, c + b, r + a / 2, c + b / 2]).filter(([R2, C2]) => R2 > 0 && R2 < ROWS - 1 && C2 > 0 && C2 < COLS - 1 && !seen.has(R2 + ',' + C2));
    if (!nx.length) { stack.pop(); continue; } const [R2, C2, mr, mc] = nx[0]; open[mr][mc] = open[R2][C2] = true; seen.add(R2 + ',' + C2); stack.push([R2, C2]); }
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (!open[r][c] && (r % 2 === 1) !== (c % 2 === 1) && Math.random() < .3) open[r][c] = true;
  const isOpen = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS && open[r][c];
  const cr = 2 * Math.floor(chh / 2) + 1, cc = 2 * Math.floor(cw / 2) + 1; for (let c = cc - 1; c <= cc + 1; c++) open[cr][c] = true;
  const start = {r: ROWS - 2, c: 1};
  const tiles = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (open[r][c]) tiles.push([r, c]);
  const tokens = [[1, COLS - 2], [ROWS - 2, COLS - 2], [1, 1]].slice(0, api.d <= 5 ? 3 : 2).map(([r, c]) => ({r, c}));
  const frags = U.shuffle(tiles.filter(([r, c]) => Math.abs(r - start.r) + Math.abs(c - start.c) > 2 && !(r === cr && Math.abs(c - cc) <= 1) && !tokens.some(k => k.r === r && k.c === c))).slice(0, nFrag).map(([r, c]) => ({r, c}));
  const total = frags.length;
  const P = {r: start.r, c: start.c, pr: start.r, pc: start.c, mt: -9};
  const D = Array.from({length: nD}, (_, i) => ({r: cr, c: cc - 1 + i % 3, pr: cr, pc: cc - 1 + i % 3, mt: -9, home: [cr, cc - 1 + i % 3], wait: 2 + i * 3, dead: false, ambush: i % 2 === 1 && api.d >= 6}));
  let got = 0, strikes = 0, scare = 0, lastBeat = -99, movedBeat = -99, grace = 0, streak = 0; const pops = [];
  const DIRS = {arrowup: [-1, 0], w: [-1, 0], arrowdown: [1, 0], s: [1, 0], arrowleft: [0, -1], a: [0, -1], arrowright: [0, 1], d: [0, 1]};
  let face = [0, 0];
  function collide() {
    for (const g of D) { if (g.wait > 0 || g.dead) continue;
      const same = g.r === P.r && g.c === P.c, swap = g.r === P.pr && g.c === P.pc && g.pr === P.r && g.pc === P.c;
      if (!same && !swap) continue;
      if (scare > 0) { g.dead = true; pops.push({txt: 'PURGED', col: C.amber, a: 1.2}); continue; }
      strikes++; st(); pops.push({txt: 'TRACED', col: C.red, a: 1.4});
      if (strikes >= lives) return api.fail('Trace daemon caught you');
      Object.assign(P, {r: start.r, c: start.c, pr: start.r, pc: start.c}); D.forEach((d, i) => Object.assign(d, {r: d.home[0], c: d.home[1], pr: d.home[0], pc: d.home[1], wait: 2 + i * 2, dead: false})); grace = 2; return; }
  }
  function pickup() {
    const fi = frags.findIndex(f => f.r === P.r && f.c === P.c); if (fi >= 0) { frags.splice(fi, 1); got++; R.blip(1480, .04, 'triangle', .18); st(); }
    const ti = tokens.findIndex(k => k.r === P.r && k.c === P.c); if (ti >= 0) { tokens.splice(ti, 1); scare = scareB; pops.push({txt: 'SPOOF ACTIVE', col: C.amber, a: 1.4}); }
    if (!frags.length) api.win('All fragments extracted on the beat');
  }
  api.key(e => {
    const m = DIRS[U.k(e)]; if (!m) return; e.preventDefault(); face = m;
    const now = R.time(), b = Math.round(now / R.beat), j = R.judge(now - b * R.beat);
    if (now < -R.good) return;
    if (!j || b === movedBeat) { streak = 0; pops.push({txt: 'STALL', col: C.dim, a: 1}); return; }
    movedBeat = b; streak++;
    if (!isOpen(P.r + m[0], P.c + m[1])) { pops.push({txt: 'WALL', col: C.dim, a: .8}); return; }
    P.pr = P.r; P.pc = P.c; P.r += m[0]; P.c += m[1]; P.mt = now; pickup(); if (api.alive) collide();
  });
  function stepDaemons(beatIdx) {
    if (grace > 0) { grace--; return; }
    for (const g of D) {
      if (g.wait > 0) { g.wait--; continue; }
      if (!g.dead && beatIdx % every) continue;
      const opts = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([a, b]) => isOpen(g.r + a, g.c + b));
      if (!opts.length) continue;
      const back = [g.r - g.pr, g.c - g.pc]; let cand = opts.filter(([a, b]) => !(a === -back[0] && b === -back[1] && (a || b))); if (!cand.length) cand = opts;
      const tgt = g.dead ? {r: g.home[0], c: g.home[1]} : g.ambush ? {r: P.r + face[0] * 3, c: P.c + face[1] * 3} : P;
      const dist = ([a, b]) => Math.hypot(g.r + a - tgt.r, g.c + b - tgt.c);
      let mv = Math.random() < api.t('chaos', .45, .2) ? U.pick(cand) : cand.sort((p, q) => (scare > 0 && !g.dead ? dist(q) - dist(p) : dist(p) - dist(q)))[0];
      g.pr = g.r; g.pc = g.c; g.r += mv[0]; g.c += mv[1]; g.mt = R.time();
      if (g.dead && g.r === g.home[0] && g.c === g.home[1]) { g.dead = false; g.wait = 2; }
    }
  }
  const T = Math.floor(Math.min(520 / COLS, 330 / ROWS)), W = COLS * T, H = ROWS * T + 46, CW = 640, OX = Math.round((CW - W) / 2), x = U.canvas(root, CW, H);
  x.canvas.style.marginTop = `${Math.max(0, (410 - H) / 2)}px`;
  const st = () => api.status(`<span>Fragments <b>${got}/${total}</b></span><span>Strikes${U.strikes(strikes, lives)}</span>`);
  api.loop(dt => {
    const now = R.time(), b = Math.floor(now / R.beat);
    if (b > lastBeat && now >= 0) { lastBeat = b; stepDaemons(b); if (scare > 0) scare--; collide(); if (!api.alive) return; }
    pops.forEach(p => p.a -= dt * 1.5);
    const pulse = R.pulse(), lerp = (e, k) => Math.min(1, (now - e.mt) / .09);
    const pos = e => { const k = lerp(e); return [(e.pc + (e.c - e.pc) * k) * T + T / 2, (e.pr + (e.r - e.pr) * k) * T + T / 2]; };
    // ---- draw ----
    x.clearRect(0, 0, CW, H);
    // speaker stacks either side of the floor, cones kick on every beat
    if (OX >= 48) for (const sx of [OX / 2, CW - OX / 2]) { const sw = Math.min(58, OX - 14);
      x.fillStyle = '#111016'; U.rr(x, sx - sw / 2, 10, sw, ROWS * T - 10, 6); x.fill(); x.strokeStyle = U.a(C.ink, .15); x.lineWidth = 1; x.stroke();
      for (const [cy, r] of [[ROWS * T * .3, sw * .36], [ROWS * T * .7, sw * .36], [ROWS * T * .08 + 10, sw * .16]]) {
        const k = 1 + (NUI.reduce ? 0 : pulse * .12); x.fillStyle = '#050407'; x.beginPath(); x.arc(sx, cy, r * k + 3, 0, TAU); x.fill();
        const g = x.createRadialGradient(sx, cy, 1, sx, cy, r * k); g.addColorStop(0, U.a(C.floor ? C.floor[Math.floor(Math.max(0, now) / R.beat) % C.floor.length] : C.cyan, .5 + pulse * .5)); g.addColorStop(.35, '#2a2533'); g.addColorStop(1, '#16131c');
        x.fillStyle = g; x.beginPath(); x.arc(sx, cy, r * k, 0, TAU); x.fill(); } }
    x.save(); x.translate(OX, 0);
    x.fillStyle = C.sunk; x.fillRect(0, 0, W, ROWS * T);
    if (C.floor && !NUI.reduce) { const bi = Math.floor(Math.max(0, now) / R.beat);   // disco floor: checkerboard swaps and recolours every beat
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (open[r][c] && (r + c + bi) % 2 === 0) {
        x.fillStyle = U.a(C.floor[(r * 7 + c * 3 + bi) % C.floor.length], .07 + pulse * .2); x.fillRect(c * T + 1, r * T + 1, T - 2, T - 2); } }
    const WC = C.wall || C.cyan;
    x.strokeStyle = U.a(WC, .4 + pulse * .45); x.lineWidth = 1.5; x.fillStyle = U.a(WC, .05 + pulse * .06);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!open[r][c]) { const X = c * T, Y = r * T; x.fillRect(X, Y, T, T); x.beginPath();
      if (isOpen(r - 1, c)) { x.moveTo(X, Y + .5); x.lineTo(X + T, Y + .5); } if (isOpen(r + 1, c)) { x.moveTo(X, Y + T - .5); x.lineTo(X + T, Y + T - .5); }
      if (isOpen(r, c - 1)) { x.moveTo(X + .5, Y); x.lineTo(X + .5, Y + T); } if (isOpen(r, c + 1)) { x.moveTo(X + T - .5, Y); x.lineTo(X + T - .5, Y + T); } x.stroke(); }
    x.fillStyle = C.text; frags.forEach(f => x.fillRect(f.c * T + T / 2 - 2, f.r * T + T / 2 - 2, 4, 4));
    tokens.forEach(k => { const s = 5 + pulse * 2, X = k.c * T + T / 2, Y = k.r * T + T / 2; x.fillStyle = C.amber; x.beginPath(); x.moveTo(X, Y - s); x.lineTo(X + s, Y); x.lineTo(X, Y + s); x.lineTo(X - s, Y); x.fill(); });
    D.forEach(g => { const [X, Y] = pos(g), s = T * .36, col = g.dead ? U.a(C.dim, .6) : scare > 0 ? (scare <= 2 && Math.floor(now * 8) % 2 ? C.text : C.amber) : C.red;
      x.strokeStyle = col; x.lineWidth = 2; x.shadowColor = col; x.shadowBlur = g.dead ? 0 : 6 + pulse * 8;
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; x[k ? 'lineTo' : 'moveTo'](X + Math.cos(a) * s, Y + Math.sin(a) * s); } x.closePath(); x.stroke(); x.shadowBlur = 0; });
    const [px, py] = pos(P), ps = T * (.3 + pulse * .06); x.shadowColor = C.cyan; x.shadowBlur = 12; x.strokeStyle = C.cyan; x.lineWidth = 2; x.strokeRect(px - ps, py - ps, ps * 2, ps * 2);
    x.fillStyle = C.cyan; x.fillRect(px - 3, py - 3, 6, 6); x.shadowBlur = 0;
    // beat bar: ticks slide into the centre marker, press when they meet
    const by = ROWS * T + 26, cx = W / 2; x.fillStyle = C.raise; x.fillRect(20, by - 1, W - 40, 2);
    for (let k = -3; k <= 3; k++) { const bt = (Math.ceil(now / R.beat) + k) * R.beat, off = (bt - now) / R.beat * 70; if (Math.abs(off) > cx - 24) continue;
      x.fillStyle = U.a(C.cyan, .9 - Math.abs(off) / (cx) ); x.fillRect(cx + off - 2, by - 9, 4, 18); x.fillRect(cx - off - 2, by - 9, 4, 18); }
    x.strokeStyle = U.a(C.text, .5 + pulse * .5); x.lineWidth = 2; x.strokeRect(cx - 10, by - 12, 20, 24);
    x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `700 11px ${C.ff}`; x.fillStyle = C.dim; x.fillText(scare > 0 ? `SPOOF ${scare} BEATS` : `${Math.round(R.bpm)} BPM`, 20, by + 16);
    x.textAlign = 'right'; x.fillText(`ON-BEAT STREAK ${streak}`, W - 20, by + 16);
    x.textAlign = 'center'; x.font = `700 14px ${C.ff}`;
    pops.forEach(p => { if (p.a > 0) { x.globalAlpha = Math.min(1, p.a); x.fillStyle = p.col; x.fillText(p.txt, px, py - T * .7 - (1 - Math.min(1, p.a)) * 10); x.globalAlpha = 1; } });
    if (now < 0) { x.fillStyle = C.text; x.font = `700 40px ${C.ff}`; x.fillText(Math.ceil(-now / R.beat), W / 2, ROWS * T / 2); }
    x.restore();
  });
  api.timer(api.ti('time', 110, 90)); st();
}});
