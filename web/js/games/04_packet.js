reg({id: 'packet', name: 'Packet Audit', desc: 'Inspect each packet against the firewall ruleset and allow or drop it before it times out.',
controls: 'A / ← allow · D / → drop',
mount(root, api) {
  const F = {
    subnet: {label: 'Source', vals: ['10.0', '172.16', '192.168', '45.33'], txt: v => `from ${v}.x.x`},
    port: {label: 'Port', vals: [22, 23, 53, 80, 443, 3389, 8080], txt: v => `on port ${v}`},
    proto: {label: 'Protocol', vals: ['TCP', 'UDP'], txt: v => `${v} traffic`},
    flag: {label: 'Flag', vals: ['SYN', 'ACK', 'RST', 'PSH', 'FIN'], txt: v => `${v} packets`},
  };
  const nR = api.ti('rules', 1, 3), total = api.ti('packets', 8, 16), per = api.ti('packetMs', 5600, 2400), maxS = api.ti('errors', 3, 1);
  const fields = U.shuffle(['port', 'subnet', 'flag', 'proto']).slice(0, nR);
  const rules = fields.map(f => ({f, v: U.pick(F[f].vals)}));
  let exc = null;
  if (api.d >= 8) { const sv = F.subnet.vals.filter(v => !rules.some(r => r.f === 'subnet' && r.v === v)); exc = {f: 'subnet', v: U.pick(sv)}; }
  const hit = p => rules.some(r => p[r.f] === r.v);
  const verdict = p => hit(p) && !(exc && p.subnet === exc.v);
  function gen() {
    const p = {}; for (const k in F) p[k] = U.pick(F[k].vals);
    const want = Math.random() < .5;
    if (want) { const r = U.pick(rules); p[r.f] = r.v; if (exc) while (p.subnet === exc.v) p.subnet = U.pick(F.subnet.vals); if (p[r.f] !== r.v) p[r.f] = r.v; }
    else if (exc && Math.random() < .35) { const r = U.pick(rules.filter(r => r.f !== 'subnet')) || rules[0]; if (r.f !== 'subnet') { p[r.f] = r.v; p.subnet = exc.v; } }
    else for (const r of rules) { let guard = 0; while (p[r.f] === r.v && guard++ < 20) p[r.f] = U.pick(F[r.f].vals); }
    p.oct = `${1 + U.rand(254)}.${1 + U.rand(254)}`; p.id = U.hex(U.rand(65535), 4);
    return p;
  }
  const queue = Array.from({length: total}, gen);
  let i = 0, strikes = 0, t = 0, lock = false;
  const card = E('div', {class: 'pa-card'}), bar = E('i'), log = E('div', {class: 'pa-log'});
  root.append(E('div', {class: 'pa'},
    E('div', {class: 'pa-rules'}, E('div', {class: 'lbl', text: 'Ruleset'}),
      rules.map(r => E('div', {class: 'pa-rule drop'}, E('b', {text: 'Drop'}), ' ' + F[r.f].txt(r.v))),
      exc && E('div', {class: 'pa-rule allow'}, E('b', {text: 'Allow'}), ` anything ${F.subnet.txt(exc.v)}, overriding drops`),
      E('div', {class: 'pa-hint', text: 'Everything else is allowed.'})),
    E('div', {class: 'pa-mid'}, card, E('div', {class: 'pa-bar'}, bar),
      E('div', {class: 'pa-btns'}, E('button', {class: 'btn pa-a', text: 'Allow  A', onclick: () => judge(false)}), E('button', {class: 'btn pa-d', text: 'Drop  D', onclick: () => judge(true)}))),
    E('div', {class: 'pa-side'}, E('div', {class: 'lbl', text: 'Decisions'}), log)));
  function show() {
    const p = queue[i]; t = 0; lock = false;
    card.className = 'pa-card';
    card.replaceChildren(E('div', {class: 'pa-id', text: `PKT ${p.id}`}),
      ...['subnet', 'port', 'proto', 'flag'].map(k => E('div', {class: 'pa-f'}, E('span', {text: F[k].label}), E('b', {text: k === 'subnet' ? `${p.subnet}.${p.oct}` : p[k]}))));
    st();
  }
  function judge(drop) {
    if (lock) return; lock = true;
    const p = queue[i], right = drop !== null && drop === verdict(p);
    if (!right) strikes++;
    card.classList.add(right ? 'ok' : 'bad');
    log.prepend(E('div', {class: 'pa-l ' + (right ? 'ok' : 'bad')}, E('span', {text: p.id}), E('span', {text: drop === null ? 'Timed out' : drop ? 'Dropped' : 'Allowed'})));
    st();
    if (strikes >= maxS) return api.after(350, () => api.fail(drop === null ? 'Packet slipped through unchecked' : `Wrong call on PKT ${p.id}`));
    api.after(320, () => { if (++i >= total) api.win('Audit clean'); else show(); });
  }
  const st = () => api.status(`<span>Packet <b>${Math.min(i + 1, total)}/${total}</b></span><span>Errors${U.strikes(strikes, maxS)}</span>`);
  api.key(e => { const k = e.key.toLowerCase(); if (k === 'a' || e.key === 'ArrowLeft') judge(false); else if (k === 'd' || e.key === 'ArrowRight') judge(true); });
  api.loop(dt => { if (lock) return; t += dt * 1000; bar.style.transform = `scaleX(${Math.max(0, 1 - t / per)})`; bar.className = t / per > .7 ? 'crit' : ''; if (t >= per) judge(null); });
  show();
}});
