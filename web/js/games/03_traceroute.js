reg({id: 'traceroute', name: 'Traceroute', desc: 'Watch the route hop across the network, then retrace it in the same order.',
controls: 'Watch, then click the routers in order',
mount(root, api) {
  const g = api.ti('grid', 4, 6), n = api.ti('hops', 4, 9), ms = api.ti('flashMs', 760, 380);
  let lives = api.d <= 3 ? 2 : 1, idx = 0, phase = 'demo', timed = false;
  const route = U.shuffle([...Array(g * g).keys()]).slice(0, n);
  const a = 1 + U.rand(200), b = 1 + U.rand(200), ip = i => `10.${a}.${b}.${octs[i]}`;
  const octs = Array.from({length: g * g}, () => 1 + U.rand(254));
  const dst = `10.${a}.${b}.${1 + U.rand(254)}`;
  const wrap = E('div', {class: 'tr2-map'}), svg = S('svg', {class: 'tr2-svg'});
  const grid = E('div', {class: 'tr2-grid', style: `grid-template-columns:repeat(${g},1fr)`});
  const nodes = Array.from({length: g * g}, (_, i) => E('button', {class: 'tr2-n', onclick: () => click(i)}, E('i', {class: 'tr2-led'}), E('span', {text: `.${octs[i]}`}), E('em')));
  grid.append(...nodes); wrap.append(svg, grid);
  const con = E('div', {class: 'tr2-con'});
  root.append(E('div', {class: 'tr2'}, wrap, E('div', {class: 'tr2-term'}, E('div', {class: 'lbl', text: 'Console'}), con)));
  const line = (t, cls = '') => { con.append(E('div', {class: 'tr2-l ' + cls, text: t})); con.scrollTop = 1e6; };
  const ctr = i => { const r = nodes[i].getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + r.height / 2]; };
  const link = (i, j, cls) => { const [x1, y1] = ctr(i), [x2, y2] = ctr(j); svg.append(S('line', {x1, y1, x2, y2, class: cls})); };
  // static mesh between neighbours
  api.after(0, () => { for (let i = 0; i < g * g; i++) { if (i % g < g - 1) link(i, i + 1, 'mesh'); if (i + g < g * g) link(i, i + g, 'mesh'); } });
  const clearRoute = () => { svg.querySelectorAll('line:not(.mesh)').forEach(l => l.remove()); nodes.forEach(nd => { nd.className = 'tr2-n'; nd.querySelector('em').textContent = ''; }); };
  const ms2 = () => `${(8 + Math.random() * 30).toFixed(0).padStart(3)} ms`;
  function demo(k) {
    if (k === 0) { con.replaceChildren(); line(`$ traceroute ${dst}`, 'cmd'); line(`traceroute to ${dst}, ${n} hops max`, 'dim'); }
    if (k === n) return api.after(ms * 1.3, () => { clearRoute(); phase = 'input'; line('-- replay the route --', 'dim'); st(); if (!timed) { timed = true; api.timer(api.ti('time', 14, 9) + n); } });
    nodes.forEach(nd => nd.classList.remove('lit'));
    nodes[route[k]].classList.add('lit', 'seen');
    if (k) link(route[k - 1], route[k], 'demo');
    line(`${String(k + 1).padStart(2)}  ${ip(route[k]).padEnd(14)} ${ms2()}`);
    api.after(ms, () => demo(k + 1));
  }
  function click(i) {
    if (phase !== 'input') return;
    if (i === route[idx]) {
      nodes[i].classList.add('ok'); nodes[i].querySelector('em').textContent = idx + 1;
      if (idx) link(route[idx - 1], i, 'ok');
      line(`${String(idx + 1).padStart(2)}  ${ip(i).padEnd(14)} ${ms2()}`, 'ok');
      if (++idx === n) { line(`${dst} reached`, 'ok'); return api.win('Route traced'); }
    } else {
      nodes[i].classList.add('bad'); line(`${String(idx + 1).padStart(2)}  ${ip(i).padEnd(14)}  !H`, 'bad'); lives--;
      if (lives <= 0) return api.fail('Wrong hop — trace dropped');
      phase = 'demo'; idx = 0; api.after(700, () => { clearRoute(); st(); demo(0); });
    }
    st();
  }
  const st = () => api.status(phase === 'demo' ? '<span>Watch the route</span>' : `<span>Hop <b>${idx}/${n}</b></span>${lives > 1 ? '<span>Retry available</span>' : ''}`);
  st(); api.after(700, () => demo(0));
}});
