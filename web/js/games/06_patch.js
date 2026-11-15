reg({id: 'patch', name: 'Patch Panel', desc: 'Cable each switch port to the patch jack with the matching label.',
controls: 'Click a port, then its matching jack',
mount(root, api) {
  const n = api.ti('pairs', 4, 8), maxS = api.ti('faults', 3, 1), hint = api.d <= 3;
  const HX = '0123456789ABCDEF', CF = {'8': 'B', 'B': '8', '0': 'D', 'D': '0', 'E': 'F', 'F': 'E', '6': '5', '5': '6', '1': '7', '7': '1', '3': '8', 'C': '0'};
  let labels;
  if (api.d <= 3) labels = U.shuffle(['VLAN10', 'VLAN20', 'WAN', 'DMZ', 'CCTV', 'VOIP', 'CORE', 'EDGE']).slice(0, n);
  else { const w = api.d >= 6 ? 4 : 3, set = new Set(), base = Array.from({length: w}, () => U.pick(HX)).join('');
    let guard = 0;
    while (set.size < n) { if (++guard > 400) { set.add(Array.from({length: w}, () => U.pick(HX)).join('')); continue; } let s = api.d >= 6 ? [...base] : Array.from({length: w}, () => U.pick(HX));
      if (api.d >= 6) { for (let t = 0; t < (api.d >= 9 ? 2 : 1); t++) { const p = U.rand(w); s[p] = api.d >= 9 && CF[s[p]] && Math.random() < .7 ? CF[s[p]] : U.pick(HX); } }
      set.add(s.join('')); }
    labels = [...set]; }
  const cols = C.cables, right = U.shuffle(labels.map((_, i) => i));
  let sel = null, done = 0, strikes = 0;
  const svg = S('svg', {class: 'rk-svg'});
  const jack = (side, i, k) => E('button', {class: 'rk-j', onclick: () => pick(side, i), style: hint ? `--hc:${cols[i]}` : ''},
    side === 'T' ? [E('span', {class: 'rk-t', text: labels[i]}), E('i', {class: 'rk-port'}), E('b', {class: 'rk-led'}), E('small', {text: `P${String(k + 1).padStart(2, '0')}`})]
                 : [E('small', {text: `J${String(k + 1).padStart(2, '0')}`}), E('b', {class: 'rk-led'}), E('i', {class: 'rk-port'}), E('span', {class: 'rk-t', text: labels[i]})]);
  const T = labels.map((_, i) => jack('T', i, i)), Rm = {}; right.forEach((i, k) => Rm[i] = jack('B', i, k));
  const unit = (name, kids) => E('div', {class: 'rk-unit'}, E('i', {class: 'rk-ear'}), E('div', {class: 'rk-face'}, E('div', {class: 'rk-name', text: name}), E('div', {class: 'rk-row', style: `grid-template-columns:repeat(${n},1fr)`}, kids)), E('i', {class: 'rk-ear'}));
  const wrap = E('div', {class: 'rk' + (hint ? ' hint' : '')}, unit('SW-CORE-01 · 1GbE', T), svg, unit('PATCH-A · CAT6', right.map(i => Rm[i])));
  root.append(wrap);
  const pt = el => { const a = el.querySelector('.rk-port').getBoundingClientRect(), s = wrap.getBoundingClientRect(); return [a.left - s.left + a.width / 2, a.top - s.top + a.height / 2]; };
  function cable(a, b, cls, col) {
    const [x1, y1] = pt(a), [x2, y2] = pt(b), sag = 60 + Math.abs(x2 - x1) * .25;
    const p = S('path', {d: `M${x1} ${y1} C${x1} ${y1 + sag} ${x2} ${y2 - sag} ${x2} ${y2}`, class: 'rk-c ' + cls});
    if (col) p.style.stroke = col; svg.append(p); return p;
  }
  function pick(side, i) {
    const el = side === 'T' ? T[i] : Rm[i];
    if (el.classList.contains('done')) return;
    if (!sel || sel.side === side) { if (sel) sel.el.classList.remove('sel'); sel = {side, i, el}; el.classList.add('sel'); return; }
    const a = side === 'T' ? el : sel.el, b = side === 'T' ? sel.el : el, ti = side === 'T' ? i : sel.i, bi = side === 'T' ? sel.i : i;
    sel.el.classList.remove('sel'); sel = null;
    if (ti === bi) { a.classList.add('done'); b.classList.add('done'); cable(a, b, 'ok', cols[ti % cols.length]); done++; st(); if (done === n) api.win('Panel patched'); }
    else { strikes++; const p = cable(a, b, 'bad'); a.classList.add('fault'); b.classList.add('fault'); U.shake(b);
      api.after(450, () => { p.remove(); a.classList.remove('fault'); b.classList.remove('fault'); }); st(); if (strikes >= maxS) api.after(460, () => api.fail('Wrong jack — link fault')); }
  }
  const st = () => api.status(`<span>Patched <b>${done}/${n}</b></span><span>Faults${U.strikes(strikes, maxS)}</span>`);
  api.timer(api.ti('time', 60, 40)); st();
}});
