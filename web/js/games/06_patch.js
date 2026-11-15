reg({id: 'patch', name: 'Patch Panel', desc: 'Cable each port on the left to the jack with the matching label on the right.',
controls: 'Click a port, then its matching jack',
mount(root, api) {
  const n = api.ti('pairs', 4, 8), maxS = api.ti('faults', 3, 1), hint = api.d <= 3;
  const HX = '0123456789ABCDEF', CF = {'8': 'B', 'B': '8', '0': 'D', 'D': '0', 'E': 'F', 'F': 'E', '6': '5', '5': '6', '1': '7', '7': '1', '3': '8', 'C': '0'};
  let labels;
  if (api.d <= 3) labels = U.shuffle(['VLAN 10', 'VLAN 20', 'WAN', 'DMZ', 'CCTV', 'VOIP', 'CORE', 'EDGE']).slice(0, n);
  else {
    const w = api.d >= 6 ? 4 : 3, set = new Set();
    const base = Array.from({length: w}, () => U.pick(HX)).join('');
    let guard = 0;
    while (set.size < n) { if (++guard > 400) { set.add(Array.from({length: w}, () => U.pick(HX)).join('')); continue; }
      let s = api.d >= 6 ? [...base] : Array.from({length: w}, () => U.pick(HX));
      if (api.d >= 6) { const k = api.d >= 9 ? 2 : 1; for (let t = 0; t < k; t++) { const p = U.rand(w); s[p] = api.d >= 9 && CF[s[p]] && Math.random() < .7 ? CF[s[p]] : U.pick(HX); } }
      set.add(s.join(''));
    }
    labels = [...set];
  }
  const cols = C.cables;
  const right = U.shuffle(labels.map((_, i) => i));
  let sel = null, done = 0, strikes = 0;
  const svg = S('svg', {class: 'pp-svg'}), wrap = E('div', {class: 'pp'});
  const mk = (side, i) => E('button', {class: 'pp-j', 'data-side': side, onclick: () => pick(side, i), style: hint ? `--hc:${cols[i]}` : ''},
    side === 'L' ? [E('span', {class: 'pp-t', text: labels[i]}), E('i', {class: 'pp-h'})] : [E('i', {class: 'pp-h'}), E('span', {class: 'pp-t', text: labels[i]})]);
  const L = labels.map((_, i) => mk('L', i)), Rm = {}; const R = right.map(i => (Rm[i] = mk('R', i)));
  wrap.append(E('div', {class: 'pp-col'}, E('div', {class: 'lbl', text: 'Switch ports'}), L), svg, E('div', {class: 'pp-col r'}, E('div', {class: 'lbl', text: 'Patch jacks'}), R));
  root.append(wrap);
  if (hint) wrap.classList.add('hint');
  const hc = el => { const a = el.querySelector('.pp-h').getBoundingClientRect(), s = svg.getBoundingClientRect(); return [a.left - s.left + a.width / 2, a.top - s.top + a.height / 2]; };
  function cable(a, b, cls, col) {
    const [x1, y1] = hc(a), [x2, y2] = hc(b), dx = (x2 - x1) * .45;
    const p = S('path', {d: `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`, class: 'pp-c ' + cls});
    if (col) p.style.stroke = col; svg.append(p); return p;
  }
  function pick(side, i) {
    const el = side === 'L' ? L[i] : Rm[i];
    if (el.classList.contains('done')) return;
    if (!sel || sel.side === side) { if (sel) sel.el.classList.remove('sel'); sel = {side, i, el}; el.classList.add('sel'); return; }
    const a = side === 'L' ? el : sel.el, b = side === 'L' ? sel.el : el, li = side === 'L' ? i : sel.i, ri = side === 'L' ? sel.i : i;
    sel.el.classList.remove('sel'); sel = null;
    if (li === ri) { a.classList.add('done'); b.classList.add('done'); cable(a, b, 'ok', cols[li % cols.length]); done++; st(); if (done === n) api.win('Panel patched'); }
    else { strikes++; const p = cable(a, b, 'bad'); U.shake(b); api.after(450, () => p.remove()); st(); if (strikes >= maxS) api.after(460, () => api.fail('Wrong jack — link fault')); }
  }
  const st = () => api.status(`<span>Patched <b>${done}/${n}</b></span><span>Faults${U.strikes(strikes, maxS)}</span>`);
  api.timer(api.ti('time', 60, 40)); st();
}});
