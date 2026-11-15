reg({id: 'keyderiv', name: 'Key Derivation', desc: 'Set the DIP switches so the key that comes out of the derivation chain matches the target.',
controls: 'Click switches or press 1–8 · Enter to derive',
mount(root, api) {
  const B = api.d <= 3 ? 4 : 8, mask = (1 << B) - 1, nOps = api.ti('ops', 0, 3), live = api.d <= 6;
  const kinds = B === 4 ? ['XOR', 'ROL'] : ['XOR', 'ROL', 'ADD', 'NOT'];
  const ops = []; for (let k = 0; k < nOps; k++) { let t; do t = U.pick(kinds); while (t === 'NOT' && ops.some(o => o.t === 'NOT'));
    ops.push({t, v: t === 'ROL' ? 1 + U.rand(B - 1) : t === 'NOT' ? 0 : 1 + U.rand(mask)}); }
  const run = v => ops.reduce((x, o) => o.t === 'XOR' ? x ^ o.v : o.t === 'ADD' ? (x + o.v) & mask : o.t === 'NOT' ? ~x & mask : ((x << o.v) | (x >> (B - o.v))) & mask, v);
  let secret; do secret = 1 + U.rand(mask); while (run(0) === run(secret));
  const target = run(secret), W = B === 4 ? 1 : 2, fmt = v => `0x${U.hex(v, W)}`;
  let val = 0, checks = 3;
  // seven-segment hex digits
  const SEG = {0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', A: 'abcefg', B: 'cdefg', C: 'adef', D: 'bcdeg', E: 'adefg', F: 'aefg', '-': 'g'};
  const P = {a: 'M6 2h20l-3 4H9z', b: 'M27 3v19l-4-3V7z', c: 'M27 26v19l-4-4V29z', d: 'M6 46h20l-3-4H9z', e: 'M5 26v19l4-4V29z', f: 'M5 3v19l4-3V7z', g: 'M7 24l3-2h12l3 2-3 2H10z'};
  const seven = (str, cls) => E('div', {class: 'sg ' + (cls || '')}, [...str].map(ch => { const s = S('svg', {viewBox: '0 0 32 48'});
    for (const k in P) s.append(S('path', {d: P[k], class: (SEG[ch] || '').includes(k) ? 'on' : ''})); return s; }));
  const disp = (label, str, cls) => E('div', {class: 'kd2-disp ' + (cls || '')}, E('span', {text: label}), seven(str, cls));
  const sw = Array.from({length: B}, (_, k) => E('button', {class: 'dip-s', onclick: () => flip(k)}, E('i'), E('small', {text: k + 1})));
  const inBox = E('div'), outBox = E('div');
  const derive = E('button', {class: 'btn pri', text: 'Derive', onclick: check});
  root.append(E('div', {class: 'kd2'},
    E('div', {class: 'kd2-top'},
      E('div', {class: 'dip'}, E('div', {class: 'dip-h'}, E('span', {text: 'ON'}), E('span', {text: `SW1 · ${B}-BIT`})), E('div', {class: 'dip-row'}, sw),
        E('div', {class: 'dip-w'}, Array.from({length: B}, (_, k) => E('span', {text: 1 << (B - 1 - k)})))),
      disp('Target', U.hex(target, W), 'tgt')),
    E('div', {class: 'kd2-chain'}, inBox,
      ops.map(o => [E('i', {class: 'kd2-wire'}), E('div', {class: 'ic'}, E('i', {class: 'ic-pins'}), E('b', {text: o.t === 'NOT' ? 'NOT' : o.t === 'ROL' ? `ROL ${o.v}` : `${o.t} ${U.hex(o.v, W)}`}), E('small', {text: `U${10 + U.rand(80)}`}), E('i', {class: 'ic-pins'}))]),
      E('i', {class: 'kd2-wire'}), outBox),
    !live && E('div', {class: 'kd-foot'}, E('span', {class: 'kd-note', text: `Output is sealed on this difficulty. ${checks} derive checks.`}), derive)));
  function flip(k) { val ^= 1 << (B - 1 - k); paint(); if (live && run(val) === target) api.after(250, () => api.win('Key derived')); }
  function check() {
    const o = run(val); outBox.replaceChildren(disp('Output', U.hex(o, W), o === target ? 'match' : 'bad'));
    if (o === target) return api.win('Key derived');
    checks--; U.shake(outBox); api.status(`<span>Checks <b>${checks}</b></span>`);
    if (checks <= 0) api.fail(`Derivation mismatch. Input was ${fmt(secret)}`);
  }
  function paint() {
    sw.forEach((b, k) => b.classList.toggle('on', !!((val >> (B - 1 - k)) & 1)));
    inBox.replaceChildren(disp('Input', U.hex(val, W)));
    if (live) { const o = run(val); outBox.replaceChildren(disp('Output', U.hex(o, W), o === target ? 'match' : '')); }
    else outBox.replaceChildren(disp('Output', '-'.repeat(W)));
    api.status(live ? `<span>${B}-bit key</span>` : `<span>Checks <b>${checks}</b></span>`);
  }
  api.key(e => { const n = +e.key; if (n >= 1 && n <= B) flip(n - 1); else if (e.key === 'Enter' && !live) check(); });
  api.timer(api.ti('time', 40, 75)); paint();
}});
