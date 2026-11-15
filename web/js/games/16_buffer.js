reg({id: 'buffer', name: 'Buffer Flush', desc: 'Data blocks stream into the buffer. Fill complete rows to flush them before the buffer overflows.',
controls: '← → move · ↑ rotate · ↓ soft drop · Space hard drop',
mount(root, api) {
  const COLS = 8, ROWS = 14, CS = 26, goal = api.ti('lines', 6, 12), fall = api.t('dropSec', .8, .28);
  const garbage = api.d >= 7 ? api.ti('garbageSec', 16, 10) : 0;
  // mixed polyomino set: dominoes/triominoes/tetrominoes, pentominoes from D7
  const SHAPES = [[[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]]];
  if (api.d >= 7) SHAPES.push([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]], [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
  const board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  const norm = cells => { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([a, b]) => [a - mx, b - my]); };
  const rot = cells => norm(cells.map(([a, b]) => [-b, a]));
  const bag = []; const next = () => { if (!bag.length) bag.push(...U.shuffle(SHAPES.map((_, i) => i))); return bag.pop(); };
  let cur = null, nxt = next(), flushed = 0, t = 0, gT = garbage, flash = [], over = false, ghost = api.d <= 5;
  const fits = (cells, px, py) => cells.every(([a, b]) => { const X = px + a, Y = py + b; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !board[Y][X]); });
  const tag = () => U.hex(U.rand(256));
  function spawn() {
    const cells = norm(SHAPES[nxt]); nxt = next();
    const w = Math.max(...cells.map(c => c[0])) + 1; cur = {cells, x: Math.floor((COLS - w) / 2), y: -1};
    if (!fits(cur.cells, cur.x, cur.y + 1)) { over = true; api.fail('Buffer overflow'); }
  }
  function lock() {
    for (const [a, b] of cur.cells) { const Y = cur.y + b; if (Y < 0) { over = true; return api.fail('Buffer overflow'); } board[Y][cur.x + a] = {t: tag()}; }
    const full = []; for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) full.push(y);
    if (full.length) { flash = full.map(y => ({y, t: .25})); for (const y of full) { board.splice(y, 1); board.unshift(Array(COLS).fill(null)); }
      flushed += full.length; st(); if (flushed >= goal) return api.win('Buffer flushed'); }
    spawn();
  }
  const move = (dx, dy) => { if (!cur || over) return false; if (fits(cur.cells, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; return true; } return false; };
  const turn = () => { if (!cur) return; const r = rot(cur.cells); for (const k of [0, -1, 1, -2, 2]) if (fits(r, cur.x + k, cur.y)) { cur.cells = r; cur.x += k; return; } };
  const drop = () => { if (!cur) return; while (move(0, 1)); lock(); t = 0; };
  const held = {}; let rep = 0;
  api.on(window, 'keydown', e => { if (!api.alive) return; const k = U.k(e);
    const d = k === 'a' || e.key === 'ArrowLeft' ? -1 : k === 'd' || e.key === 'ArrowRight' ? 1 : 0;
    if (d && !held[d]) { held[d] = true; move(d, 0); rep = .17; }
    if ((e.key === 'ArrowUp' || k === 'w') && !e.repeat) turn();
    if (e.key === 'ArrowDown' || k === 's') { held.down = true; e.preventDefault(); }
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); drop(); } });
  api.on(window, 'keyup', e => { const k = U.k(e);
    if (k === 'a' || e.key === 'ArrowLeft') held[-1] = false; if (k === 'd' || e.key === 'ArrowRight') held[1] = false;
    if (e.key === 'ArrowDown' || k === 's') held.down = false; });
  const W = 640, H = 400, BX = Math.round((W - COLS * CS) / 2), BY = 12, x = U.canvas(root, W, H);
  const st = () => api.status(`<span>Flushed <b>${flushed}/${goal}</b></span>`);
  function cell(px, py, col, alpha, txt) {
    x.fillStyle = U.a(col, .18 * alpha); x.fillRect(px + 1, py + 1, CS - 2, CS - 2);
    x.strokeStyle = U.a(col, .9 * alpha); x.lineWidth = 1.5; x.strokeRect(px + 2, py + 2, CS - 4, CS - 4);
    if (txt) { x.fillStyle = U.a(col, .7 * alpha); x.fillText(txt, px + CS / 2, py + CS / 2 + 1); }
  }
  spawn();
  api.loop(dt => {
    if (over) return;
    rep -= dt; for (const d of [-1, 1]) if (held[d] && rep <= 0) { move(d, 0); rep = .05; }
    t += dt * (held.down ? 8 : 1);
    if (t >= fall) { t = 0; if (!move(0, 1)) lock(); if (!api.alive) return; }
    if (garbage) { gT -= dt; if (gT <= 0) { gT = garbage; const hole = U.rand(COLS);
      if (board[0].some(Boolean)) { over = true; return api.fail('Buffer overflow'); }
      board.shift(); board.push(Array.from({length: COLS}, (_, i) => i === hole ? null : {t: 'XX', bad: 1}));
      if (cur && !fits(cur.cells, cur.x, cur.y)) cur.y--; } }
    flash.forEach(f => f.t -= dt); flash = flash.filter(f => f.t > 0);
    // ---- draw ----
    x.clearRect(0, 0, W, H);
    x.fillStyle = C.sunk; x.fillRect(BX, BY, COLS * CS, ROWS * CS);
    x.strokeStyle = U.a(C.ink, .05); x.lineWidth = 1;
    for (let i = 1; i < COLS; i++) { x.beginPath(); x.moveTo(BX + i * CS + .5, BY); x.lineTo(BX + i * CS + .5, BY + ROWS * CS); x.stroke(); }
    for (let j = 1; j < ROWS; j++) { x.beginPath(); x.moveTo(BX, BY + j * CS + .5); x.lineTo(BX + COLS * CS, BY + j * CS + .5); x.stroke(); }
    x.strokeStyle = U.a(C.cyan, .5); x.strokeRect(BX - .5, BY - .5, COLS * CS + 1, ROWS * CS + 1);
    x.fillStyle = U.a(C.red, .5); x.fillRect(BX, BY + 2 * CS, COLS * CS, 1);
    x.font = `600 10px ${C.ff}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let y = 0; y < ROWS; y++) for (let c = 0; c < COLS; c++) { const b = board[y][c]; if (b) cell(BX + c * CS, BY + y * CS, b.bad ? C.red : C.cyan, 1, b.t); }
    for (const f of flash) { x.fillStyle = U.a(C.green, f.t * 3); x.fillRect(BX, BY + f.y * CS, COLS * CS, CS); }
    if (cur) {
      if (ghost) { let gy = cur.y; while (fits(cur.cells, cur.x, gy + 1)) gy++; for (const [a, b] of cur.cells) if (gy + b >= 0) { x.strokeStyle = U.a(C.cyan, .25); x.setLineDash([3, 3]); x.strokeRect(BX + (cur.x + a) * CS + 3, BY + (gy + b) * CS + 3, CS - 6, CS - 6); x.setLineDash([]); } }
      for (const [a, b] of cur.cells) if (cur.y + b >= 0) cell(BX + (cur.x + a) * CS, BY + (cur.y + b) * CS, C.amber, 1, '');
    }
    // side panels
    const SX = BX + COLS * CS + 26;
    x.textAlign = 'left'; x.font = `700 11px ${C.ff}`; x.fillStyle = C.dim; x.fillText('NEXT BLOCK', SX, BY + 8);
    x.strokeStyle = C.line || U.a(C.ink, .15); x.strokeStyle = U.a(C.cyan, .3); x.strokeRect(SX, BY + 20, 92, 92);
    const nc = norm(SHAPES[nxt]), nw = Math.max(...nc.map(c => c[0])) + 1, nh = Math.max(...nc.map(c => c[1])) + 1, s = 18;
    for (const [a, b] of nc) { const px = SX + 46 - nw * s / 2 + a * s, py = BY + 66 - nh * s / 2 + b * s; x.fillStyle = U.a(C.amber, .2); x.fillRect(px + 1, py + 1, s - 2, s - 2); x.strokeStyle = C.amber; x.strokeRect(px + 2, py + 2, s - 4, s - 4); }
    x.fillStyle = C.dim; x.fillText('FLUSHED', SX, BY + 140); x.fillStyle = C.text; x.font = `700 26px ${C.ff}`; x.fillText(`${flushed}/${goal}`, SX, BY + 164);
    if (garbage) { x.font = `700 11px ${C.ff}`; x.fillStyle = C.red; x.fillText('CORRUPTION IN', SX, BY + 200); x.fillStyle = C.text; x.font = `700 20px ${C.ff}`; x.fillText(`${Math.ceil(gT)}s`, SX, BY + 222); }
    const LX = BX - 26; x.textAlign = 'right'; x.font = `700 11px ${C.ff}`; x.fillStyle = C.dim;
    x.fillText('BUFFER', LX, BY + 8); x.fillText(`${COLS}×${ROWS}`, LX, BY + 24);
    x.fillStyle = U.a(C.red, .8); x.fillText('OVERFLOW ▸', LX, BY + 2 * CS);
  });
  api.timer(api.ti('time', 120, 90)); st();
}});
