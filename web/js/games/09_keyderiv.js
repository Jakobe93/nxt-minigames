reg({id: 'keyderiv', name: 'Key Derivation', desc: 'Set the input bits so the value that comes out of the derivation chain equals the target.',
controls: 'Click bits or press 1–8 · Enter to derive',
mount(root, api) {
  const B = api.d <= 3 ? 4 : 8, mask = (1 << B) - 1, nOps = api.ti('ops', 0, 3), live = api.d <= 6;
  const kinds = B === 4 ? ['XOR', 'ROL'] : ['XOR', 'ROL', 'ADD', 'NOT'];
  const ops = []; for (let k = 0; k < nOps; k++) { let t; do t = U.pick(kinds); while (t === 'NOT' && ops.some(o => o.t === 'NOT'));
    ops.push({t, v: t === 'ROL' ? 1 + U.rand(B - 1) : t === 'NOT' ? 0 : 1 + U.rand(mask)}); }
  const run = v => ops.reduce((x, o) => o.t === 'XOR' ? x ^ o.v : o.t === 'ADD' ? (x + o.v) & mask : o.t === 'NOT' ? ~x & mask : ((x << o.v) | (x >> (B - o.v))) & mask, v);
  let secret; do secret = 1 + U.rand(mask); while (run(0) === run(secret));
  const target = run(secret), W = B === 4 ? 1 : 2;
  const fmt = v => `0x${U.hex(v, W)}`, bin = v => v.toString(2).padStart(B, '0');
  let val = 0, checks = 3;
  const bits = Array.from({length: B}, (_, k) => E('button', {class: 'kd-b', onclick: () => flip(k)}, E('b', {text: '0'}), E('small', {text: 1 << (B - 1 - k)})));
  const inV = E('div', {class: 'kd-v'}), outV = E('div', {class: 'kd-v'}), outBits = E('div', {class: 'kd-bin'});
  const chain = E('div', {class: 'kd-chain'}, E('div', {class: 'kd-node'}, E('span', {text: 'Input'}), inV),
    ops.map(o => [E('i', {class: 'kd-arr'}), E('div', {class: 'kd-op', text: o.t === 'NOT' ? 'NOT' : o.t === 'ROL' ? `ROL ${o.v}` : `${o.t} ${fmt(o.v)}`})]),
    E('i', {class: 'kd-arr'}), E('div', {class: 'kd-node out'}, E('span', {text: 'Output'}), outV, outBits));
  const derive = E('button', {class: 'btn pri', text: 'Derive', onclick: check});
  root.append(E('div', {class: 'kd'},
    E('div', {class: 'kd-tgt'}, E('div', {class: 'lbl', text: 'Target key'}), E('div', {class: 'kd-t', text: fmt(target)}),
      api.d <= 5 && E('div', {class: 'kd-bin', text: bin(target)}), api.d <= 2 && E('div', {class: 'kd-dec', text: `= ${target} decimal`})),
    E('div', {class: 'lbl', text: 'Input bits'}), E('div', {class: 'kd-bits'}, bits), chain,
    !live && E('div', {class: 'kd-foot'}, E('span', {class: 'kd-note', text: 'Output is sealed on this difficulty. Each derive uses one check.'}), derive)));
  function flip(k) { val ^= 1 << (B - 1 - k); paint(); if (live && run(val) === target) api.after(250, () => api.win('Key derived')); }
  function check() {
    const o = run(val); outV.textContent = fmt(o); outBits.textContent = bin(o);
    if (o === target) return api.win('Key derived');
    checks--; U.shake(chain.lastChild); paint(true);
    if (checks <= 0) api.fail(`Derivation mismatch. Input was ${fmt(secret)}`);
  }
  function paint(keepOut) {
    bits.forEach((b, k) => { const on = (val >> (B - 1 - k)) & 1; b.classList.toggle('on', !!on); b.firstChild.textContent = on; });
    inV.textContent = fmt(val);
    if (live) { const o = run(val); outV.textContent = fmt(o); outBits.textContent = bin(o); chain.lastChild.classList.toggle('match', o === target); }
    else if (!keepOut) { outV.textContent = '0x' + '?'.repeat(W); outBits.textContent = '·'.repeat(B); }
    api.status(live ? `<span>${B}-bit key</span>` : `<span>Checks <b>${checks}</b></span>`);
  }
  api.key(e => { const n = +e.key; if (n >= 1 && n <= B) flip(n - 1); else if (e.key === 'Enter' && !live) check(); });
  api.timer(api.ti('time', 40, 75)); paint();
}});
