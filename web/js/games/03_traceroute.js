reg({id: 'traceroute', name: 'Traceroute', desc: 'Watch the route hop across the network, then retrace it in the same order.',
controls: 'Watch, then click the nodes in order',
mount(root, api) {
  const g = api.ti('grid', 4, 6), n = api.ti('hops', 4, 9), ms = api.ti('flashMs', 760, 380);
  let lives = api.d <= 3 ? 2 : 1, idx = 0, phase = "demo", timed = false;
  const route = U.shuffle([...Array(g * g).keys()]).slice(0, n);
  const wrap = E('div', {class: 'tr'}), svg = S('svg', {class: 'tr-svg'});
  const grid = E('div', {class: 'tr-grid', style: `grid-template-columns:repeat(${g},1fr)`});
  const nodes = Array.from({length: g * g}, (_, i) => E('button', {class: 'tr-n', onclick: () => click(i)}, E('span', {text: `.${1 + U.rand(254)}`}), E('em')));
  grid.append(...nodes); wrap.append(svg, grid); root.append(wrap);
  const ctr = i => { const a = nodes[i].getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [a.left - w.left + a.width / 2, a.top - w.top + a.height / 2]; };
  const link = (i, j, cls) => { const [x1, y1] = ctr(i), [x2, y2] = ctr(j); svg.append(S('line', {x1, y1, x2, y2, class: cls})); };
  const reset = () => { svg.innerHTML = ''; nodes.forEach(nd => { nd.className = 'tr-n'; nd.querySelector('em').textContent = ''; }); };
  function demo(k) {
    if (k === n) return api.after(ms * 1.3, () => { reset(); phase = 'input'; st(); if (!timed) { timed = true; api.timer(api.ti('time', 14, 9) + n); } });
    nodes.forEach(nd => nd.classList.remove('lit'));
    nodes[route[k]].classList.add('lit', 'seen');
    if (k) link(route[k - 1], route[k], 'demo');
    api.after(ms, () => demo(k + 1));
  }
  function click(i) {
    if (phase !== 'input') return;
    if (i === route[idx]) {
      nodes[i].classList.add('ok'); nodes[i].querySelector('em').textContent = idx + 1;
      if (idx) link(route[idx - 1], i, 'ok');
      if (++idx === n) return api.win('Route traced');
    } else {
      nodes[i].classList.add('bad'); lives--;
      if (lives <= 0) return api.fail('Wrong hop — trace dropped');
      phase = 'demo'; idx = 0;
      api.after(500, () => { reset(); st(); demo(0); });
    }
    st();
  }
  const st = () => api.status(phase === 'demo' ? '<span>Watch the route</span>' : `<span>Hop <b>${idx}/${n}</b></span>${lives > 1 ? '<span>Retry available</span>' : ''}`);
  st(); api.after(700, () => demo(0));
}});
