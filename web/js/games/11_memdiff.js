reg({id: 'memdiff', name: 'Memory Diff', desc: 'Two memory snapshots, a few bytes apart. Find every byte that changed.',
controls: 'Click the bytes that differ',
mount(root, api) {
  const cols = api.ti('cols', 6, 10), rows = api.ti('rows', 5, 8), nd = api.ti('diffs', 3, 7), maxS = api.ti('errors', 3, 1), subtle = api.d >= 6;
  const A = Array.from({length: cols * rows}, () => U.rand(256)), B = [...A];
  const diffs = new Set(U.shuffle(A.map((_, i) => i)).slice(0, nd));
  diffs.forEach(i => { let v; do v = subtle ? (Math.random() < .5 ? (A[i] & 0xF0) | U.rand(16) : (A[i] & 0x0F) | (U.rand(16) << 4)) : U.rand(256); while (v === A[i]); B[i] = v; });
  let found = 0, strikes = 0; const base = 0x7F000 + U.rand(0xF00) * 16;
  const cw = Math.min(30, Math.floor((648 - 26 - 60 - 4 * cols) / (2 * cols))), fs = cw < 26 ? 13 : 15;
  const mk = (arr, side) => { const g = E('div', {class: 'md-g', style: `grid-template-columns:repeat(${cols},${cw}px);--fs:${fs}px`});
    const els = arr.map((v, i) => E('button', {class: 'md-c', text: U.hex(v), onclick: () => pick(i)})); g.append(...els); g.els = els; return g; };
  const ga = mk(A), gb = mk(B);
  const addr = E('div', {class: 'md-addr'}, Array.from({length: rows}, (_, r) => E('span', {text: U.hex(base + r * cols, 5)})));
  root.append(E('div', {class: 'md'},
    E('div', {}, E('div', {class: 'lbl', text: 'Snapshot A'}), E('div', {class: 'md-row'}, addr, ga)),
    E('div', {}, E('div', {class: 'lbl', text: 'Snapshot B'}), gb)));
  function pick(i) {
    if (ga.els[i].classList.contains('ok')) return;
    if (diffs.has(i)) { ga.els[i].classList.add('ok'); gb.els[i].classList.add('ok'); if (++found === nd) return api.win('All modifications isolated'); }
    else { strikes++; for (const g of [ga, gb]) { const el = g.els[i]; el.classList.add('bad'); api.after(420, () => el.classList.remove('bad')); } if (strikes >= maxS) return api.fail('False positive — scan flagged'); }
    st();
  }
  const st = () => api.status(`<span>Found <b>${found}/${nd}</b></span><span>Errors${U.strikes(strikes, maxS)}</span>`);
  api.timer(api.ti('time', 60, 45)); st();
}});
