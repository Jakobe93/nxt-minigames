reg({id: 'cipher', name: 'Cipher Lock', desc: 'Guess the key — every wrong try reveals how many letters matched.',
controls: 'Type or click symbols · Backspace deletes · Enter submits',
mount(root, api) {
  const len = api.ti('length', 3, 5), A = 'ACEHKMPRX'.slice(0, api.ti('symbols', 5, 8)), tries = api.ti('tries', 16, 12);
  const key = Array.from({length: len}, () => U.pick(A));
  let cur = [], used = 0;
  const slots = E('div', {class: 'cl-slots'}, Array.from({length: len}, () => E('div', {class: 'cl-slot'})));
  const hist = E('div', {class: 'cl-hist'}, E('div', {class: 'cl-empty', text: 'No attempts yet. Each submit tells you how many symbols are in the right position.'}));
  const pad = E('div', {class: 'cl-pad'}, [...A].map(c => E('button', {class: 'cl-key', text: c, onclick: () => add(c)})));
  root.append(E('div', {class: 'cl'},
    E('div', {class: 'cl-l'}, E('div', {class: 'lbl', text: 'Key'}), slots, pad,
      E('div', {class: 'cl-fns'}, E('button', {class: 'btn', text: 'Delete', onclick: del}), E('button', {class: 'btn pri', text: 'Submit', onclick: submit}))),
    E('div', {class: 'cl-r'}, E('div', {class: 'lbl', text: 'Attempts'}), hist)));
  function add(c) { if (cur.length < len) { cur.push(c); draw(); } }
  function del() { cur.pop(); draw(); }
  function submit() {
    if (cur.length < len) return U.shake(slots);
    used++;
    const m = cur.filter((c, i) => c === key[i]).length;
    hist.querySelector('.cl-empty')?.remove();
    hist.prepend(E('div', {class: 'cl-row' + (m === len ? ' win' : '')},
      E('span', {class: 'cl-n', text: String(used).padStart(2, '0')}),
      E('span', {class: 'cl-g', text: cur.join(' ')}),
      E('span', {class: 'cl-m'}, Array.from({length: len}, (_, i) => E('i', {class: i < m ? 'on' : ''}))),
      E('span', {class: 'cl-c', text: `${m}/${len}`})));
    if (m === len) return api.win('Key accepted');
    if (used >= tries) return api.fail(`Out of attempts. Key was ${key.join('')}`);
    cur = []; draw();
  }
  function draw() {
    [...slots.children].forEach((s, i) => { s.textContent = cur[i] || ''; s.classList.toggle('on', i === cur.length); });
    api.status(`<span>Tries left <b>${tries - used}</b></span>`);
  }
  api.key(e => { const k = e.key.toUpperCase();
    if (k.length === 1 && A.includes(k)) add(k); else if (e.key === 'Backspace') del(); else if (e.key === 'Enter') submit(); });
  api.timer(api.ti('time', 150, 100)); draw();
}});
