reg({id: 'memdiff', name: 'Memory Diff', theme: 'terminal',
desc: 'Two memory images, a few bytes apart. Find every byte that changed. The decode strip shows your cursor row as text.',
controls: 'Arrows move · Enter marks · or click a byte',
mount(root, api) {
  const cols = api.ti('cols', 6, 10), rows = api.ti('rows', 5, 8), nd = api.ti('diffs', 3, 7), maxS = api.ti('errors', 3, 1), subtle = api.d >= 6;
  // bias toward printable ASCII so the decode strip reads like real memory
  const byte = () => Math.random() < .55 ? 0x20 + U.rand(95) : U.rand(256);
  const A = Array.from({length: cols * rows}, byte), B = [...A];
  const diffs = new Set(U.shuffle(A.map((_, i) => i)).slice(0, nd));
  diffs.forEach(i => { let v; do v = subtle ? (Math.random() < .5 ? (A[i] & 0xF0) | U.rand(16) : (A[i] & 0x0F) | (U.rand(16) << 4)) : byte(); while (v === A[i]); B[i] = v; });
  const base = (0x1000 + U.rand(0xE000)) & 0xFFF0, off = i => `0x${U.hex(base + i, 4)}`;
  const asc = v => v >= 0x20 && v < 0x7F ? String.fromCharCode(v) : '.';
  let found = 0, strikes = 0, cur = 0;
  const cw = Math.min(28, Math.floor((236 - (cols - 1) * 2) / cols));
  const panes = [];
  function pane(name, arr) {
    const cells = [];
    const body = E('div', {class: 'md3-body'}, Array.from({length: rows}, (_, r) => E('div', {class: 'md3-row'},
      E('span', {class: 'md3-off', text: off(r * cols)}),
      E('span', {class: 'md3-bytes', style: `grid-template-columns:repeat(${cols},${cw}px)`}, Array.from({length: cols}, (_, c) => { const i = r * cols + c;
        return (cells[i] = E('button', {class: 'md3-b', text: U.hex(arr[i]), onclick: () => { cur = i; mark(); }})); })))));
    panes.push(cells);
    return E('div', {class: 'md3-pane'}, E('div', {class: 'md3-name', text: name}), body);
  }
  const stripA = E('div', {class: 'md3-txt'}), stripB = E('div', {class: 'md3-txt'}), stripH = E('span'), stripV = E('span', {class: 'md3-val'});
  root.append(E('div', {class: 'md3'},
    E('div', {class: 'md3-panes'}, pane('Image A', A), pane('Image B', B)),
    E('div', {class: 'md3-dec'},
      E('div', {class: 'md3-dh'}, E('span', {text: 'Decode'}), stripH, stripV),
      E('div', {class: 'md3-dl'}, E('b', {text: 'A'}), stripA),
      E('div', {class: 'md3-dl'}, E('b', {text: 'B'}), stripB))));
  function decodeRow(el, arr) {
    const r = Math.floor(cur / cols);
    el.replaceChildren(...Array.from({length: cols}, (_, c) => { const i = r * cols + c;
      return E('i', {class: (i === cur ? 'cur ' : '') + (panes[0][i].classList.contains('ok') ? 'ok' : ''), text: asc(arr[i])}); }));
  }
  function paint() {
    panes.forEach(cells => cells.forEach((el, i) => el.classList.toggle('cur', i === cur)));
    const r = Math.floor(cur / cols);
    stripH.textContent = `${off(r * cols)}  +${U.hex(cur % cols)}`;
    stripV.textContent = `A ${U.hex(A[cur])} '${asc(A[cur])}'   B ${U.hex(B[cur])} '${asc(B[cur])}'`;
    decodeRow(stripA, A); decodeRow(stripB, B);
    api.status(`<span>Found <b>${found}/${nd}</b></span><span>Strikes left <b>${maxS - strikes}</b></span>`);
  }
  function mark() {
    const i = cur;
    if (panes[0][i].classList.contains('ok')) return paint();
    if (diffs.has(i)) { panes.forEach(p => p[i].classList.add('ok')); found++; paint(); if (found === nd) api.win('All modifications isolated'); return; }
    strikes++; panes.forEach(p => { const el = p[i]; el.classList.add('bad'); api.after(420, () => el.classList.remove('bad')); });
    paint(); if (strikes >= maxS) api.fail('False positive — scan flagged');
  }
  api.key(e => {
    const r = Math.floor(cur / cols), c = cur % cols;
    const mv = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1]}[e.key.startsWith('Arrow') ? e.key : U.k(e)];
    if (mv) { e.preventDefault(); cur = Math.max(0, Math.min(rows - 1, r + mv[0])) * cols + Math.max(0, Math.min(cols - 1, c + mv[1])); paint(); }
    else if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); mark(); }
  });
  api.timer(api.ti('time', 60, 45)); paint();
}});
