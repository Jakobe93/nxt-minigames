reg({id: 'crawler', name: 'Net Crawler', desc: 'Collect every data fragment in the maze while trace daemons hunt you. Grab a spoof token to turn the tables for a few seconds.',
controls: 'Arrow keys or WASD to move',
mount(root, api) {
  const cw = api.ti('mazeW', 10, 13), chh = api.ti('mazeH', 7, 8), COLS = cw * 2 + 1, ROWS = chh * 2 + 1;
  const nD = api.ti('daemons', 2, 4), dSpeedK = api.t('daemonSpeed', .62, .92), chaos = api.t('chaos', .45, .08);
  const nFrag = api.ti('fragments', 16, 30), nTok = api.ti('tokens', 3, 2), scareS = api.t('spoofSec', 6, 3), lives = api.ti('strikes', 3, 1);
  const T = Math.floor(Math.min(620 / COLS, 380 / ROWS)), W = COLS * T, H = ROWS * T, PS = 5.2;
  // ---- maze: DFS carve, then knock out extra walls so the chase has loops ----
  const open = Array.from({length: ROWS}, () => Array(COLS).fill(false));
  const seen = new Set(), stack = [[1, 1]]; open[1][1] = true; seen.add('1,1');
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nx = U.shuffle([[0, 2], [2, 0], [0, -2], [-2, 0]]).map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2])
      .filter(([R, Cc]) => R > 0 && R < ROWS - 1 && Cc > 0 && Cc < COLS - 1 && !seen.has(R + ',' + Cc));
    if (!nx.length) { stack.pop(); continue; }
    const [R, Cc, mr, mc] = nx[0]; open[mr][mc] = open[R][Cc] = true; seen.add(R + ',' + Cc); stack.push([R, Cc]);
  }
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++)
    if (!open[r][c] && ((r % 2 === 1) !== (c % 2 === 1)) && Math.random() < .28) open[r][c] = true;   // braid
  const cr = 2 * Math.floor(chh / 2) + 1, cc = 2 * Math.floor(cw / 2) + 1;                           // daemon nest (a cell centre)
  for (let r = cr - 1; r <= cr + 1; r++) for (let c = cc - 2; c <= cc + 2; c++) if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1) open[r][c] = true;
  const isOpen = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS && open[r][c];
  const start = {r: ROWS - 2, c: cc};
  // ---- pickups ----
  const tiles = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (open[r][c]) tiles.push([r, c]);
  const far = ([r, c], p, d) => Math.abs(r - p.r) + Math.abs(c - p.c) > d;
  const corners = [[1, 1], [1, COLS - 2], [ROWS - 2, 1], [ROWS - 2, COLS - 2]];
  const tokens = U.shuffle(corners).slice(0, nTok).map(([r, c]) => ({r, c}));
  const frags = U.shuffle(tiles.filter(t => far(t, start, 2) && far(t, {r: cr, c: cc}, 2) && !tokens.some(k => k.r === t[0] && k.c === t[1])))
    .slice(0, nFrag).map(([r, c]) => ({r, c}));
  const total = frags.length; let got = 0, strikes = 0, scare = 0, freeze = 0, pulse = 0;
  // ---- entities: tile position + direction + progress toward the next tile ----
  const DIRS = {up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1]};
  const P = {r: start.r, c: start.c, d: [0, 0], p: 0, want: null};
  const daemons = Array.from({length: nD}, (_, i) => ({r: cr, c: cc - 1 + (i % 3), d: [0, 0], p: 0, wait: 1.2 + i * 2.2, home: [cr, cc - 1 + (i % 3)], ambush: i % 2 === 1 && api.d >= 6, dead: 0}));
  const pos = e => [e.c + e.d[1] * e.p, e.r + e.d[0] * e.p];
  function reset() { Object.assign(P, {r: start.r, c: start.c, d: [0, 0], p: 0, want: null});
    daemons.forEach((g, i) => Object.assign(g, {r: g.home[0], c: g.home[1], d: [0, 0], p: 0, wait: 1 + i * 1.6, dead: 0})); scare = 0; }
  api.key(e => { const k = U.k(e), m = {arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right'}[k];
    if (m) { e.preventDefault(); P.want = DIRS[m];
      if (P.d[0] === -P.want[0] && P.d[1] === -P.want[1] && (P.d[0] || P.d[1])) { P.r += P.d[0]; P.c += P.d[1]; P.d = P.want; P.p = 1 - P.p; } } });
  function stepPlayer(dt) {
    if (!P.d[0] && !P.d[1]) { if (P.want && isOpen(P.r + P.want[0], P.c + P.want[1])) P.d = P.want; else return; }
    P.p += PS * dt;
    while (P.p >= 1) { P.r += P.d[0]; P.c += P.d[1]; P.p -= 1; arrive();
      if (P.want && isOpen(P.r + P.want[0], P.c + P.want[1])) P.d = P.want;
      else if (!isOpen(P.r + P.d[0], P.c + P.d[1])) { P.d = [0, 0]; P.p = 0; break; } }
  }
  function arrive() {
    const fi = frags.findIndex(f => f.r === P.r && f.c === P.c); if (fi >= 0) { frags.splice(fi, 1); got++; st(); }
    const ti = tokens.findIndex(f => f.r === P.r && f.c === P.c); if (ti >= 0) { tokens.splice(ti, 1); scare = scareS; daemons.forEach(g => { g.d = [-g.d[0], -g.d[1]]; g.p = 1 - g.p; g.r -= g.d[0]; g.c -= g.d[1]; }); }
    if (!frags.length) api.win('All fragments extracted');
  }
  function steer(g) {
    const opts = Object.values(DIRS).filter(([dr, dc]) => isOpen(g.r + dr, g.c + dc));
    let cand = opts.filter(([dr, dc]) => !(dr === -g.d[0] && dc === -g.d[1])); if (!cand.length) cand = opts;
    if (!cand.length) return [0, 0];
    if (Math.random() < chaos) return U.pick(cand);
    const tgt = g.dead ? {r: g.home[0], c: g.home[1]} : g.ambush ? {r: P.r + P.d[0] * 4, c: P.c + P.d[1] * 4} : P;
    const dist = ([dr, dc]) => Math.hypot(g.r + dr - tgt.r, g.c + dc - tgt.c);
    return cand.sort((a, b) => scare > 0 && !g.dead ? dist(b) - dist(a) : dist(a) - dist(b))[0];
  }
  function stepDaemon(g, dt) {
    if (g.wait > 0) { g.wait -= dt; return; }
    const sp = PS * dSpeedK * (g.dead ? 2 : scare > 0 ? .55 : 1);
    if (!g.d[0] && !g.d[1]) g.d = steer(g);
    g.p += sp * dt;
    while (g.p >= 1) { g.r += g.d[0]; g.c += g.d[1]; g.p -= 1;
      if (g.dead && g.r === g.home[0] && g.c === g.home[1]) { g.dead = 0; g.wait = 1.5; g.d = [0, 0]; g.p = 0; break; }
      g.d = steer(g); if (!g.d[0] && !g.d[1]) { g.p = 0; break; } }
  }
  const x = U.canvas(root, W, H);
  root.firstChild.style.marginTop = `${Math.max(0, (400 - H) / 2)}px`;
  const st = () => api.status(`<span>Fragments <b>${got}/${total}</b></span><span>Strikes${U.strikes(strikes, lives)}</span>`);
  api.loop(dt => {
    pulse += dt;
    if (freeze > 0) freeze -= dt;
    else {
      scare = Math.max(0, scare - dt);
      stepPlayer(dt); if (!api.alive) return;
      daemons.forEach(g => stepDaemon(g, dt));
      const [px, py] = pos(P);
      for (const g of daemons) { if (g.wait > 0 || g.dead) continue; const [gx, gy] = pos(g);
        if (Math.hypot(px - gx, py - gy) < .6) {
          if (scare > 0) { g.dead = 1; }
          else { strikes++; st(); if (strikes >= lives) return api.fail('Trace daemon caught you'); freeze = 1; reset(); break; } } }
    }
    // ---- draw ----
    x.clearRect(0, 0, W, H); x.fillStyle = C.sunk; x.fillRect(0, 0, W, H);
    x.strokeStyle = U.a(C.cyan, .55); x.lineWidth = 1.5; x.fillStyle = U.a(C.cyan, .07);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!open[r][c]) {
      const X = c * T, Y = r * T; x.fillRect(X, Y, T, T);
      x.beginPath();
      if (isOpen(r - 1, c)) { x.moveTo(X, Y + .5); x.lineTo(X + T, Y + .5); }
      if (isOpen(r + 1, c)) { x.moveTo(X, Y + T - .5); x.lineTo(X + T, Y + T - .5); }
      if (isOpen(r, c - 1)) { x.moveTo(X + .5, Y); x.lineTo(X + .5, Y + T); }
      if (isOpen(r, c + 1)) { x.moveTo(X + T - .5, Y); x.lineTo(X + T - .5, Y + T); }
      x.stroke(); }
    x.fillStyle = C.text; for (const f of frags) x.fillRect(f.c * T + T / 2 - 2, f.r * T + T / 2 - 2, 4, 4);
    for (const k of tokens) { const s = 5 + Math.sin(pulse * 6) * 1.5, X = k.c * T + T / 2, Y = k.r * T + T / 2;
      x.fillStyle = C.amber; x.beginPath(); x.moveTo(X, Y - s); x.lineTo(X + s, Y); x.lineTo(X, Y + s); x.lineTo(X - s, Y); x.fill(); }
    for (const g of daemons) { const [gx, gy] = pos(g), X = gx * T + T / 2, Y = gy * T + T / 2, s = T * .38;
      const blink = scare > 0 && scare < 1.5 && Math.floor(pulse * 8) % 2;
      const col = g.dead ? U.a(C.dim, .6) : scare > 0 ? (blink ? C.text : C.amber) : C.red;
      x.strokeStyle = col; x.lineWidth = 2; x.shadowColor = col; x.shadowBlur = g.dead ? 0 : 10;
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; x[k ? 'lineTo' : 'moveTo'](X + Math.cos(a) * s, Y + Math.sin(a) * s); } x.closePath(); x.stroke();
      x.shadowBlur = 0; x.fillStyle = col; x.fillRect(X - 3 + (g.d[1] * 2), Y - 1.5 + (g.d[0] * 2), 6, 3); }
    const [px, py] = pos(P), X = px * T + T / 2, Y = py * T + T / 2, col = freeze > 0 && Math.floor(pulse * 10) % 2 ? C.red : C.cyan;
    x.shadowColor = col; x.shadowBlur = 12; x.strokeStyle = col; x.lineWidth = 2; x.strokeRect(X - T * .3, Y - T * .3, T * .6, T * .6);
    x.fillStyle = col; x.fillRect(X - 3, Y - 3, 6, 6); x.shadowBlur = 0;
    if (scare > 0) { x.fillStyle = C.amber; x.fillRect(0, H - 3, W * scare / scareS, 3); }
  });
  api.timer(api.ti('time', 100, 80)); st();
}});
