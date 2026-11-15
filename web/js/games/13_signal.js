reg({id: 'signal', name: 'Signal Path', desc: 'Rotate the relay tiles until the signal flows from the source to the receiver.',
controls: 'Click to rotate clockwise · right-click to rotate back',
mount(root, api) {
  const N = api.ti('grid', 4, 7), Nb = 1, Eb = 2, Sb = 4, Wb = 8, D = [[-1, 0, Nb, Sb], [0, 1, Eb, Wb], [1, 0, Sb, Nb], [0, -1, Wb, Eb]];
  const rot = m => ((m << 1) | (m >> 3)) & 15, rotb = m => ((m >> 1) | (m << 3)) & 15;
  const sr = U.rand(N), tiles = new Array(N * N).fill(0);
  // random DFS from source cell to any cell in the last column
  const seen = new Set(); let path = null;
  (function dfs(r, c, acc) {
    if (path) return; acc.push(r * N + c); seen.add(r * N + c);
    if (c === N - 1 && acc.length >= N + Math.floor(api.d / 3)) { path = [...acc]; return; }
    for (const [dr, dc] of U.shuffle(D).sort((a, b) => (b[1] - a[1]) * (Math.random() < .55 ? 1 : 0))) {
      const R = r + dr, Cc = c + dc; if (R >= 0 && R < N && Cc >= 0 && Cc < N && !seen.has(R * N + Cc)) dfs(R, Cc, acc); if (path) return; }
    acc.pop();
  })(sr, 0, []);
  if (!path) { path = []; for (let c = 0; c < N; c++) path.push(sr * N + c); }
  const tr = Math.floor(path[path.length - 1] / N);
  const dirTo = (a, b) => { const dr = Math.floor(b / N) - Math.floor(a / N), dc = b % N - a % N; return D.find(d => d[0] === dr && d[1] === dc)[2]; };
  path.forEach((id, k) => { let m = 0; m |= k ? dirTo(id, path[k - 1]) : Wb; m |= k < path.length - 1 ? dirTo(id, path[k + 1]) : Eb; tiles[id] = m; });
  const onPath = new Set(path);
  for (let i = 0; i < N * N; i++) if (!onPath.has(i)) { let m = U.pick([5, 3, 3, 7]); for (let k = U.rand(4); k > 0; k--) m = rot(m); tiles[i] = m; }
  for (let i = 0; i < N * N; i++) for (let k = 1 + U.rand(3); k > 0; k--) tiles[i] = rot(tiles[i]);
  let moves = 0;
  const sz = Math.floor(Math.min(58, 340 / N));
  const grid = E('div', {class: 'sp-grid', style: `grid-template-columns:repeat(${N},${sz}px);grid-auto-rows:${sz}px;gap:0`});
  const els = tiles.map((_, i) => E('button', {class: 'sp-t', onclick: () => turn(i, 1), oncontextmenu: e => { e.preventDefault(); turn(i, -1); }}));
  grid.append(...els);
  // connectors are positioned against the grid itself (not the board), with a copper stub the same width as a trace
  const stub = () => E('i', {class: 'sp-stub', style: `height:${Math.round(sz * .14)}px`});
  const port = (row, cls, txt) => E('div', {class: 'sp-port ' + cls, style: `top:${row * sz + sz / 2}px`}, cls === 'src' ? [E('span', {text: txt}), stub()] : [stub(), E('span', {text: txt})]);
  const board = E('div', {class: 'sp-board pcb'}, E('div', {class: 'pcb-silk', text: `NXT-RELAY REV ${String.fromCharCode(65 + U.rand(6))} · ${N}×${N}`}), E('div', {class: 'sp-gw'}, grid, port(sr, 'src', 'J1'), port(tr, 'dst', 'U1 RX')));
  root.append(E('div', {class: 'sp'}, board));
  function powered() {
    const on = new Set(); if (!(tiles[sr * N] & Wb)) return on;
    const st = [sr * N]; on.add(sr * N);
    while (st.length) { const id = st.pop(), r = Math.floor(id / N), c = id % N;
      for (const [dr, dc, a, b] of D) { const R = r + dr, Cc = c + dc, j = R * N + Cc;
        if (R < 0 || R >= N || Cc < 0 || Cc >= N || on.has(j)) continue; if ((tiles[id] & a) && (tiles[j] & b)) { on.add(j); st.push(j); } } }
    return on;
  }
  function draw(i, on) {
    const m = tiles[i], g = S('svg', {viewBox: '0 0 100 100'}), pts = {1: [50, 0], 2: [100, 50], 4: [50, 100], 8: [0, 50]};
    for (const b of [1, 2, 4, 8]) if (m & b) g.append(S('line', {x1: 50, y1: 50, x2: pts[b][0], y2: pts[b][1]}));
    g.append(S('circle', {cx: 50, cy: 50, r: 13, class: 'pad'}), S('circle', {cx: 50, cy: 50, r: 5, class: 'via'}));
    els[i].replaceChildren(g); els[i].classList.toggle('on', on.has(i));
  }
  function paint(anim, dir) {
    const on = powered(); tiles.forEach((_, i) => draw(i, on));
    if (anim != null) { const s = els[anim].firstChild; s.style.transition = 'none'; s.style.transform = `rotate(${-90 * dir}deg)`; void s.offsetWidth; s.style.transition = 'transform .12s'; s.style.transform = 'none'; }
    const done = on.has(tr * N + N - 1) && (tiles[tr * N + N - 1] & Eb);
    board.classList.toggle('live', !!done);
    api.status(`<span>Rotations <b>${moves}</b></span>`);
    return done;
  }
  function turn(i, dir) { tiles[i] = dir > 0 ? rot(tiles[i]) : rotb(tiles[i]); moves++; if (paint(i, dir)) api.after(300, () => api.win('Signal received')); }
  let guard = 0; while (paint() && guard++ < 10) tiles[path[0]] = rot(tiles[path[0]]);
  api.timer(api.ti('time', 45, 75));
}});
