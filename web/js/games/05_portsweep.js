reg({id: 'portsweep', name: 'Port Sweep', desc: 'Probe every open port without touching a honeypot. Numbers count the honeypots next to a port.',
controls: 'Click probes · right-click flags · click a number to chord',
mount(root, api) {
  const N = api.ti('grid', 7, 10), M = Math.round(N * N * api.t('density', .13, .19)), secs = api.ti('time', 120, 100);
  const cells = Array.from({length: N * N}, () => ({mine: false, rev: false, flag: false, adj: 0}));
  let armed = false, open = 0, t0 = performance.now();
  const nb = i => { const r = Math.floor(i / N), c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const R = r + dr, Cc = c + dc; if (R >= 0 && R < N && Cc >= 0 && Cc < N) o.push(R * N + Cc); } return o; };
  const sz = Math.floor(Math.min(34, 330 / N));
  const seg = n => { const s = String(Math.max(-99, Math.min(999, n))).padStart(3, '0'); return E('span', {class: 'ms-led'}, E('i', {text: '888'}), E('b', {text: s})); };
  const left = E('div'), right = E('div'), face = E('button', {class: 'ms-face', text: ':)'});
  const grid = E('div', {class: 'ms-grid', style: `grid-template-columns:repeat(${N},${sz}px);grid-auto-rows:${sz}px;--fs:${Math.round(sz * .55)}px`});
  const els = cells.map((_, i) => E('button', {class: 'ms-c', onclick: () => click(i), oncontextmenu: e => { e.preventDefault(); flag(i); }}));
  grid.append(...els);
  api.on(grid, 'mousedown', e => { if (e.button === 0) face.textContent = ':O'; });
  api.on(window, 'mouseup', () => { if (api.alive) face.textContent = ':)'; });
  root.append(E('div', {class: 'ms'}, E('div', {class: 'ms-box'}, E('div', {class: 'ms-bar'}, left, face, right), E('div', {class: 'ms-well'}, grid))));
  function arm(safe) {
    const ban = new Set([safe, ...nb(safe)]);
    U.shuffle(cells.map((_, i) => i).filter(i => !ban.has(i))).slice(0, M).forEach(i => cells[i].mine = true);
    cells.forEach((c, i) => c.adj = nb(i).filter(j => cells[j].mine).length); armed = true;
  }
  function reveal(i) {
    const st = [i];
    while (st.length) { const j = st.pop(), k = cells[j]; if (k.rev || k.flag) continue;
      if (k.mine) return boom(j);
      k.rev = true; open++; els[j].className = 'ms-c rev n' + k.adj; els[j].textContent = k.adj || '';
      if (!k.adj) st.push(...nb(j)); }
    return true;
  }
  function boom(j) {
    cells.forEach((k, x) => { if (k.mine && !k.flag) els[x].className = 'ms-c rev mine'; if (!k.mine && k.flag) els[x].className = 'ms-c rev wrong'; });
    els[j].classList.add('boom'); face.textContent = 'X('; api.fail('Honeypot tripped — you were traced'); return false;
  }
  function click(i) {
    const c = cells[i]; if (c.flag) return;
    if (!armed) arm(i);
    if (c.rev) {                            // chord: open neighbours when flags match the number
      const n = nb(i); if (!c.adj || n.filter(j => cells[j].flag).length !== c.adj) return;
      for (const j of n) if (!cells[j].rev && !cells[j].flag && !reveal(j)) return;
    } else if (!reveal(i)) return;
    paint(); if (open === N * N - M) { face.textContent = 'B)'; api.win('All open ports mapped'); }
  }
  function flag(i) { const c = cells[i]; if (c.rev) return; c.flag = !c.flag; els[i].classList.toggle('flag', c.flag); paint(); }
  function paint() { left.replaceChildren(seg(M - cells.filter(c => c.flag).length)); api.status(`<span>Probed <b>${open}/${N * N - M}</b></span>`); }
  let shown = -1;
  api.loop(() => { const v = Math.ceil(Math.max(0, secs - (performance.now() - t0) / 1000)); if (v !== shown) { shown = v; right.replaceChildren(seg(v)); } });
  api.timer(secs); paint();
}});
