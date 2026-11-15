reg({id: 'cipher', name: 'Cipher Lock', desc: 'Crack the door code. Green: right digit, right slot. Amber: in the code, wrong slot. Dim: not in the code.',
controls: 'Digits to enter · * clears · # submits',
mount(root, api) {
  // In play the server makes and keeps the code (server/sessions.lua guess); the viewer plays locally.
  const sv = api.server && api.server.cipher;
  const len = sv ? sv.length : api.ti('length', 4, 6), tries = sv ? sv.tries : api.ti('tries', 8, 5), dupes = api.d >= 6;
  const pool = U.shuffle([...'0123456789']);
  const code = sv ? null : dupes ? Array.from({length: len}, () => U.pick([...'0123456789'])) : pool.slice(0, len);
  let cur = [], used = 0, busy = false;
  const lcd = E('div', {class: 'ck-lcd'}, Array.from({length: len}, () => E('span')));
  const led = E('i', {class: 'ck-led'});
  const keys = {};
  const pad = E('div', {class: 'ck-pad'}, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => {
    const b = E('button', {class: 'ck-k' + (k === '*' || k === '#' ? ' fn' : ''), onclick: () => press(k)},
      E('b', {text: k}), E('small', {text: k === '*' ? 'CLR' : k === '#' ? 'ENT' : ' '}));
    keys[k] = b; return b; }));
  const log = E('div', {class: 'ck-log'}, Array.from({length: tries}, () => E('div', {class: 'ck-row'}, Array.from({length: len}, () => E('span')))));
  root.append(E('div', {class: 'ck'},
    E('div', {class: 'ck-unit'},
      E('div', {class: 'ck-top'}, E('span', {text: 'NXT SECURE · M-40'}), led),
      lcd, pad, E('div', {class: 'ck-grille'})),
    E('div', {class: 'ck-side'}, E('div', {class: 'lbl', text: 'Attempt log'}), log,
      E('div', {class: 'ck-legend'}, E('span', {class: 'hit', text: 'right slot'}), E('span', {class: 'near', text: 'wrong slot'}), E('span', {class: 'miss', text: 'not in code'})))));
  function press(k) {
    const b = keys[k]; b.classList.remove('down'); void b.offsetWidth; b.classList.add('down');
    if (k === '*') cur = []; else if (k === '#') return submit(); else if (cur.length < len) cur.push(k);
    draw();
  }
  function score(g) {
    const res = Array(len).fill('miss'), left = {};
    code.forEach((c, i) => { if (g[i] === c) res[i] = 'hit'; else left[c] = (left[c] || 0) + 1; });
    g.forEach((c, i) => { if (res[i] !== 'hit' && left[c] > 0) { res[i] = 'near'; left[c]--; } });
    return res;
  }
  async function submit() {
    if (busy) return;
    if (cur.length < len) { U.shake(lcd); led.className = 'ck-led err'; api.after(300, () => led.className = 'ck-led'); return; }
    let res, reveal = code && code.join('');
    if (sv) {
      busy = true; const r = await api.remote('cipherGuess', {guess: cur.join('')}); busy = false;
      if (!api.alive) return;
      if (!r || !Array.isArray(r.res)) return api.fail('Keypad stopped responding');
      res = r.res; reveal = r.code || '';
    } else res = score(cur);
    const row = log.children[used];
    [...row.children].forEach((s, i) => { s.textContent = cur[i]; s.style.animationDelay = `${i * 70}ms`; s.className = 'flip ' + res[i]; });
    used++;
    if (res.every(r => r === 'hit')) { led.className = 'ck-led ok'; lcd.classList.add('ok'); return api.after(450, () => api.win('Door unlocked')); }
    led.className = 'ck-led err'; api.after(350, () => led.className = 'ck-led');
    if (used >= tries) return api.after(450, () => api.fail(reveal ? `Lockout. Code was ${reveal}` : 'Lockout'));
    cur = []; draw();
  }
  function draw() {
    [...lcd.children].forEach((s, i) => { s.textContent = cur[i] ?? '_'; s.classList.toggle('on', i === cur.length); });
    api.status(`<span>Tries left <b>${tries - used}</b></span>`);
  }
  api.key(e => { if (busy) return; if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') { cur.pop(); draw(); } else if (e.key === 'Delete' || e.key === '*') press('*'); else if (e.key === 'Enter' || e.key === '#') press('#'); });
  api.timer(api.ti('time', 120, 90)); draw();
}});
