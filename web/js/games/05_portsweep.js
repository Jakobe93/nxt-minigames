reg({id: 'portsweep', name: 'Port Sweep', desc: 'Probe every open port without touching a honeypot. Numbers count the honeypots next to a port.',
controls: 'Click to probe · Right-click or F-mode to flag',
mount(root, api) {
  const N = api.ti('grid', 5, 8), M = Math.round(N * N * api.t('density', .12, .19));
  const cells = Array.from({length: N * N}, () => ({mine: false, rev: false, flag: false, adj: 0}));
  let armed = false, open = 0, flagMode = false;
  const nb = i => { const r = Math.floor(i / N), c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const R = r + dr, Cc = c + dc; if (R >= 0 && R < N && Cc >= 0 && Cc < N) o.push(R * N + Cc); } return o; };
  const sz = Math.floor(Math.min(46, 360 / N));
  const grid = E('div', {class: 'ps-grid', style: `grid-template-columns:repeat(${N},${sz}px);grid-auto-rows:${sz}px`});
  const els = cells.map((_, i) => E('button', {class: 'ps-c', onclick: () => flagMode ? flag(i) : probe(i), oncontextmenu: e => { e.preventDefault(); flag(i); }}));
  grid.append(...els);
  const fm = E('button', {class: 'btn ps-fm', text: 'F-mode: probe', onclick: () => toggleFM()});
  root.append(E('div', {class: 'ps'}, grid, E('div', {class: 'ps-side'},
    E('div', {class: 'lbl', text: 'Legend'}),
    E('div', {class: 'ps-leg'}, E('span', {class: 'ps-c rev n1', text: '1'}), 'honeypots adjacent'),
    E('div', {class: 'ps-leg'}, E('span', {class: 'ps-c flag'}), 'flagged as honeypot'), fm)));
  function toggleFM() { flagMode = !flagMode; fm.textContent = 'F-mode: ' + (flagMode ? 'flag' : 'probe'); fm.classList.toggle('pri', flagMode); }
  function arm(safe) {
    const ban = new Set([safe, ...nb(safe)]);
    U.shuffle(cells.map((_, i) => i).filter(i => !ban.has(i))).slice(0, M).forEach(i => cells[i].mine = true);
    cells.forEach((c, i) => c.adj = nb(i).filter(j => cells[j].mine).length); armed = true;
  }
  function probe(i) {
    const c = cells[i]; if (c.rev || c.flag) return;
    if (!armed) arm(i);
    if (c.mine) {
      cells.forEach((k, j) => { if (k.mine) els[j].className = 'ps-c mine'; }); els[i].classList.add('boom');
      return api.fail('Honeypot tripped — you were traced');
    }
    const st = [i];
    while (st.length) { const j = st.pop(), k = cells[j]; if (k.rev || k.flag) continue; k.rev = true; open++;
      els[j].className = 'ps-c rev' + (k.adj ? ' n' + Math.min(k.adj, 4) : ''); els[j].textContent = k.adj || '';
      if (!k.adj) st.push(...nb(j)); }
    stat();
    if (open === N * N - M) api.win('All open ports mapped');
  }
  function flag(i) { const c = cells[i]; if (c.rev) return; c.flag = !c.flag; els[i].classList.toggle('flag', c.flag); stat(); }
  const stat = () => api.status(`<span>Honeypots <b>${M - cells.filter(c => c.flag).length}</b></span><span>Probed <b>${open}/${N * N - M}</b></span>`);
  api.key(e => { if (e.key.toLowerCase() === 'f') toggleFM(); });
  api.timer(api.ti('time', 120, 90)); stat();
}});
