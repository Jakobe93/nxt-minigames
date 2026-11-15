reg({id: 'keymatrix', name: 'Key Matrix', desc: 'Upload the sequence into the buffer. Picks alternate between the active row and column.',
controls: 'Click codes in the highlighted line',
mount(root, api) {
  const N = api.ti('grid', 5, 7), Sq = api.ti('sequence', 3, 6), buf = Sq + api.ti('slack', 3, 0);
  const pool = ['1C', '55', 'BD', 'E9', '7A', 'FF'].slice(0, api.ti('codes', 4, 6));
  const seq = Array.from({length: Sq}, () => U.pick(pool));
  const val = Array.from({length: N * N}, () => U.pick(pool));
  // plant a guaranteed solution path starting in row 0
  for (let tries = 0; tries < 50; tries++) {
    const used = new Set(), path = []; let r = 0, c = U.rand(N), rowMode = true, ok = true;
    path.push(r * N + c); used.add(r * N + c);
    for (let k = 1; k < Sq && ok; k++) {
      const opts = [];
      for (let t = 0; t < N; t++) { const id = rowMode ? t * N + c : r * N + t; if (!used.has(id) && (rowMode ? t !== r : t !== c)) opts.push(id); }
      if (!opts.length) { ok = false; break; }
      const id = U.pick(opts); path.push(id); used.add(id); r = Math.floor(id / N); c = id % N; rowMode = !rowMode;
    }
    if (ok) { path.forEach((id, k) => val[id] = seq[k]); break; }
  }
  let line = {row: true, i: 0}; const taken = new Set(), bufArr = [];
  const grid = E('div', {class: 'km-grid', style: `grid-template-columns:repeat(${N},1fr)`});
  const cells = val.map((v, id) => E('button', {class: 'km-c', text: v, onclick: () => pick(id), onmouseenter: () => hover(id), onmouseleave: () => hover(-1)}));
  grid.append(...cells);
  const seqEl = E('div', {class: 'km-seq km-tape'}, seq.map(v => E('span', {text: v})));
  const bufEl = E('div', {class: 'km-buf km-tape'}, Array.from({length: buf}, () => E('span')));
  root.append(E('div', {class: 'km km2'}, E('div', {class: 'km-card'}, E('div', {class: 'km-cardh'}, E('span', {text: 'KEY MATRIX'}), E('span', {text: `${N}×${N} · CARD 0${1 + U.rand(9)}`})), grid),
    E('div', {class: 'km-side'}, E('div', {class: 'lbl', text: 'Target sequence'}), seqEl, E('div', {class: 'lbl', text: 'Upload tape'}), bufEl,
      E('p', {class: 'km-note', text: 'The sequence must appear unbroken in the buffer. Start in the top row.'}))));
  const inLine = (id, L) => L.row ? Math.floor(id / N) === L.i : id % N === L.i;
  function paint() {
    cells.forEach((el, id) => { el.classList.toggle('act', inLine(id, line) && !taken.has(id)); el.classList.toggle('used', taken.has(id)); });
    [...bufEl.children].forEach((s, k) => { s.textContent = bufArr[k] || ''; s.classList.toggle('fill', k < bufArr.length); });
    // longest suffix of buffer that is a prefix of seq
    let m = 0; for (let k = Math.min(Sq, bufArr.length); k > 0; k--) if (bufArr.slice(-k).join() === seq.slice(0, k).join()) { m = k; break; }
    [...seqEl.children].forEach((s, k) => s.classList.toggle('on', k < m));
    api.status(`<span>Buffer <b>${bufArr.length}/${buf}</b></span>`);
  }
  function hover(id) {
    cells.forEach(el => el.classList.remove('nxt'));
    if (id < 0 || !inLine(id, line) || taken.has(id)) return;
    const nl = line.row ? {row: false, i: id % N} : {row: true, i: Math.floor(id / N)};
    cells.forEach((el, j) => { if (j !== id && inLine(j, nl) && !taken.has(j)) el.classList.add('nxt'); });
  }
  function pick(id) {
    if (!inLine(id, line) || taken.has(id)) return;
    taken.add(id); bufArr.push(val[id]);
    line = line.row ? {row: false, i: id % N} : {row: true, i: Math.floor(id / N)};
    hover(-1); paint();
    if (bufArr.join(' ').includes(seq.join(' '))) return api.win('Sequence uploaded');
    if (bufArr.length >= buf) return api.fail('Buffer full — sequence rejected');
    if (!cells.some((_, j) => inLine(j, line) && !taken.has(j))) return api.fail('No codes left on the active line');
  }
  api.timer(api.ti('time', 60, 35)); paint();
}});
