reg({id: 'packet', name: 'Packet Audit', desc: 'Inspect each captured packet against the firewall ruleset and allow or drop it before it times out.',
controls: 'A / ← allow · D / → drop',
mount(root, api) {
  const F = {
    subnet: {label: 'Source', vals: ['10.0', '172.16', '192.168', '45.33'], txt: v => `src ${v}.x.x`},
    port: {label: 'Port', vals: [22, 23, 53, 80, 443, 3389, 8080], txt: v => `dst port ${v}`},
    proto: {label: 'Proto', vals: ['TCP', 'UDP'], txt: v => `proto ${v}`},
    flag: {label: 'Flag', vals: ['SYN', 'ACK', 'RST', 'PSH', 'FIN'], txt: v => `flag ${v}`},
  };
  const SVC = {22: 'ssh', 23: 'telnet', 53: 'dns', 80: 'http', 443: 'https', 3389: 'rdp', 8080: 'http-alt'};
  const nR = api.ti('rules', 1, 3), total = api.ti('packets', 8, 16), per = api.ti('packetMs', 5600, 2400), maxS = api.ti('errors', 3, 1);
  const rules = U.shuffle(['port', 'subnet', 'flag', 'proto']).slice(0, nR).map(f => ({f, v: U.pick(F[f].vals)}));
  let exc = null;
  if (api.d >= 8) { const sv = F.subnet.vals.filter(v => !rules.some(r => r.f === 'subnet' && r.v === v)); exc = {f: 'subnet', v: U.pick(sv)}; }
  const hit = p => rules.some(r => p[r.f] === r.v), verdict = p => hit(p) && !(exc && p.subnet === exc.v);
  function gen(i) {
    const p = {}; for (const k in F) p[k] = U.pick(F[k].vals);
    if (Math.random() < .5) { const r = U.pick(rules); p[r.f] = r.v; if (exc) while (p.subnet === exc.v) p.subnet = U.pick(F.subnet.vals); p[r.f] = r.v; }
    else if (exc && Math.random() < .35) { const r = rules.find(r => r.f !== 'subnet'); if (r) { p[r.f] = r.v; p.subnet = exc.v; } }
    else for (const r of rules) { let g = 0; while (p[r.f] === r.v && g++ < 20) p[r.f] = U.pick(F[r.f].vals); }
    p.oct = `${1 + U.rand(254)}.${1 + U.rand(254)}`; p.no = 1400 + i * (3 + U.rand(9)); p.len = 54 + U.rand(1400); p.ttl = U.pick([64, 128, 255]);
    return p;
  }
  const queue = Array.from({length: total}, (_, i) => gen(i));
  let i = 0, strikes = 0, t = 0, lock = false;
  const tbody = E('div', {class: 'ws-rows'}), detail = E('div', {class: 'ws-detail'}), hex = E('div', {class: 'ws-hex'}), bar = E('i');
  root.append(E('div', {class: 'ws'},
    E('div', {class: 'ws-filter'}, E('span', {class: 'ws-fl', text: 'Ruleset'}),
      rules.map(r => E('span', {class: 'ws-chip drop', text: `drop ${F[r.f].txt(r.v)}`})),
      exc && E('span', {class: 'ws-chip allow', text: `allow ${F.subnet.txt(exc.v)} (overrides)`}),
      E('span', {class: 'ws-else', text: 'else allow'})),
    E('div', {class: 'ws-table'}, E('div', {class: 'ws-row ws-head'}, ['No.', 'Source', 'Proto', 'Port', 'Flag', 'Info'].map(h => E('span', {text: h}))), tbody),
    E('div', {class: 'ws-bottom'}, E('div', {class: 'ws-pane'}, detail, hex),
      E('div', {class: 'ws-act'}, E('div', {class: 'ws-bar'}, bar),
        E('button', {class: 'btn ws-a', text: 'Allow  A', onclick: () => judge(false)}), E('button', {class: 'btn ws-d', text: 'Drop  D', onclick: () => judge(true)})))));
  const src = p => `${p.subnet}.${p.oct}`;
  const row = (p, cls) => E('div', {class: 'ws-row ' + cls}, E('span', {text: p.no}), E('span', {text: src(p)}), E('span', {text: p.proto}), E('span', {text: p.port}), E('span', {text: p.flag}),
    E('span', {text: p.dec ? p.dec : `${SVC[p.port]} → ${p.port} [${p.flag}] len=${p.len}`}));
  function render() {
    const done = queue.slice(Math.max(0, i - 3), i).map(p => row(p, 'past ' + (p.ok ? 'ok' : 'bad')));
    const cur = i < total ? [row(queue[i], 'cur')] : [], next = queue.slice(i + 1, i + 4).map(p => row(p, 'next'));
    tbody.replaceChildren(...done, ...cur, ...next);
    const p = queue[i]; if (!p) return;
    detail.replaceChildren(
      E('div', {text: `▾ Frame ${p.no}: ${p.len} bytes on wire`}),
      E('div', {}, '▾ Internet Protocol, Src: ', E('b', {text: src(p)}), `, TTL: ${p.ttl}`),
      E('div', {}, `▾ ${p.proto === 'TCP' ? 'Transmission Control' : 'User Datagram'} Protocol, Dst Port: `, E('b', {text: `${p.port} (${SVC[p.port]})`})),
      E('div', {}, '   Flags: ', E('b', {text: p.flag})));
    const bytes = Array.from({length: 32}, () => U.hex(U.rand(256)));
    hex.replaceChildren(E('div', {text: `0000  ${bytes.slice(0, 16).join(' ')}`}), E('div', {text: `0010  ${bytes.slice(16).join(' ')}`}));
  }
  function show() { t = 0; lock = false; render(); st(); }
  function judge(drop) {
    if (lock) return; lock = true;
    const p = queue[i], right = drop !== null && drop === verdict(p);
    if (!right) strikes++;
    p.ok = right; p.dec = `${drop === null ? 'TIMEOUT' : drop ? 'DROPPED' : 'ALLOWED'} ${right ? '✓' : '✗'}`;
    tbody.querySelector('.cur')?.classList.add(right ? 'ok' : 'bad');
    st();
    if (strikes >= maxS) return api.after(350, () => api.fail(drop === null ? 'Packet slipped through unchecked' : `Wrong call on frame ${p.no}`));
    api.after(280, () => { if (++i >= total) api.win('Audit clean'); else show(); });
  }
  const st = () => api.status(`<span>Frame <b>${Math.min(i + 1, total)}/${total}</b></span><span>Errors${U.strikes(strikes, maxS)}</span>`);
  api.key(e => { const k = U.k(e); if (k === 'a' || e.key === 'ArrowLeft') judge(false); else if (k === 'd' || e.key === 'ArrowRight') judge(true); });
  api.loop(dt => { if (lock) return; t += dt * 1000; bar.style.transform = `scaleX(${Math.max(0, 1 - t / per)})`; bar.className = t / per > .7 ? 'crit' : ''; if (t >= per) judge(null); });
  show();
}});
