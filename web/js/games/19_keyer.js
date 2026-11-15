reg({id: 'keyer', name: 'Keyer', theme: 'telegraph', desc: 'Key the Morse message in time: tap for dots, hold for dashes. Your keyed trace is drawn under the tape.',
controls: 'Hold Space or click to key · release on the end of each mark',
mount(root, api) {
  const MORSE = {A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', R: '.-.', S: '...', T: '-', U: '..-', X: '-..-', Y: '-.--', Z: '--..'};
  const WORDS = ['SOS', 'KEY', 'ROOT', 'OPEN', 'SYNC', 'PORT', 'SUDO', 'HACK', 'LINK', 'NODE', 'EXEC', 'ZERO', 'GHOST', 'PROXY', 'ACCESS', 'BREACH', 'DECODE'];
  const len = api.ti('letters', 3, 5), pool = WORDS.filter(w => w.length === len), word = U.pick(pool.length ? pool : WORDS);
  const unit = api.t('unit', .3, .2), maxM = api.ti('misses', 5, 3);
  const R = Rhythm.create(api, {bpm: 60 / (unit * 2)}); R.windows(api.t('perfect', .075, .05), api.t('good', .16, .11));
  const endWin = api.t('releaseWin', .22, .14);
  // ---- tape: marks on a unit grid (dot = 1, dash = 3, gap 1 inside a letter, 3 between letters) ----
  const marks = [], letters = []; let u = 0;
  [...word].forEach((ch, li) => { const code = MORSE[ch] || '.', start = u;
    [...code].forEach((sym, si) => { const d = sym === '-' ? 3 : 1; marks.push({t: u * unit, dur: d * unit, sym, li, st: null}); u += d + (si < code.length - 1 ? 1 : 0); });
    letters.push({ch, code, t0: start * unit, t1: u * unit, st: null}); u += 3; });
  const END = marks[marks.length - 1].t + marks[marks.length - 1].dur + .8;
  let misses = 0, streak = 0, done = 0, keyDown = false, keyT = 0, cur = null; const trace = [], pops = [];
  const W = 640, H = 400, KX = 150, spd = api.t('tapeSpeed', 170, 260), TY = 214;
  const x = U.canvas(root, W, H);
  const pop = (txt, col) => pops.push({txt, col, a: 1});
  function hit(j) { streak++; done++; pop(j === 'perfect' ? 'PERFECT' : 'GOOD', j === 'perfect' ? C.green : C.cyan); if (streak % 8 === 0 && misses > 0) { misses--; pop('REPAIRED', C.amber); } st(); }
  function miss(m, why) { if (m) m.st = 'miss'; misses++; streak = 0; pop(why, C.red); st(); if (misses >= maxM) api.fail('Transmission garbled'); }
  function press() {
    if (keyDown || !api.alive) return; keyDown = true; const now = R.time(); keyT = now; R.toneOn(720);
    const m = marks.find(k => k.st === null);
    if (m && Math.abs(now - m.t) <= R.good) { m.st = 'keying'; m.j = R.judge(now - m.t); cur = m; return; }
    cur = null; if (m && api.d >= 4 && now > -R.beat) miss(null, 'STRAY KEY');
  }
  function release() {
    if (!keyDown) return; keyDown = false; R.toneOff(); const now = R.time(); trace.push([keyT, now]);
    if (!cur || cur.st !== 'keying') return; const m = cur; cur = null; const dt = now - (m.t + m.dur);
    if (Math.abs(dt) <= endWin) { const j2 = Math.abs(dt) <= endWin / 2 ? 'perfect' : 'good'; m.st = m.j === 'perfect' && j2 === 'perfect' ? 'perfect' : 'good'; hit(m.st); }
    else miss(m, dt < 0 ? (m.sym === '-' ? 'TOO SHORT' : 'CLIPPED') : 'TOO LONG');
  }
  api.on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } });
  api.on(window, 'keyup', e => { if (e.code === 'Space') release(); });
  api.on(x.canvas, 'mousedown', press); api.on(window, 'mouseup', release);
  const st = () => api.status(`<span>Marks <b>${done}/${marks.length}</b></span><span>Misses${U.strikes(misses, maxM)}</span>`);
  api.loop(dt => {
    const now = R.time();
    for (const m of marks) {
      if (m.st === null && now > m.t + R.good) { miss(m, 'MISSED'); if (!api.alive) return; }
      if (m.st === 'keying' && now > m.t + m.dur + endWin) { cur = null; miss(m, 'TOO LONG'); if (!api.alive) return; }
    }
    letters.forEach(L => { if (L.st) return; const ms = marks.filter(m => m.li === letters.indexOf(L)); if (ms.every(m => m.st && m.st !== 'keying')) { L.st = ms.every(m => m.st !== 'miss') ? 'ok' : 'bad'; L.at = now; R.hat(now + .02, .35); } });
    if (now > END) return api.win(`Message sent: ${word}`);
    pops.forEach(p => p.a -= dt * 1.5);
    // ---- draw ----
    x.clearRect(0, 0, W, H);
    // message readout
    const cw = 64, mx0 = W / 2 - letters.length * cw / 2;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    letters.forEach((L, i) => { const cx = mx0 + i * cw + cw / 2, active = now >= L.t0 - unit && now <= L.t1 + unit && !L.st;
      x.fillStyle = active ? U.a(C.cyan, .12) : C.panel; x.fillRect(cx - cw / 2 + 4, 14, cw - 8, 70);
      x.strokeStyle = L.st === 'ok' ? C.green : L.st === 'bad' ? C.red : active ? C.cyan : U.a(C.ink, .12); x.lineWidth = 1.5; x.strokeRect(cx - cw / 2 + 4, 14, cw - 8, 70);
      x.fillStyle = L.st === 'ok' ? C.green : L.st === 'bad' ? C.red : C.text; x.font = `700 28px ${C.ff}`; x.fillText(L.ch, cx, 40);
      x.fillStyle = C.dim; x.font = `700 15px ${C.ff}`; x.fillText(L.code.replace(/\./g, '•').replace(/-/g, '—'), cx, 68); });
    // tape
    const paper = THEME === 'telegraph', INK = '#2b1d12';
    x.fillStyle = paper ? '#e6d7b8' : C.sunk; x.fillRect(0, TY - 58, W, 150);
    if (paper) { x.fillStyle = 'rgba(80,50,20,.08)'; for (let k = 0; k < 150; k += 6) x.fillRect(0, TY - 58 + k, W, 1); }
    for (let b = Math.ceil((now - KX / spd) / R.beat); b * R.beat < now + (W - KX) / spd; b++) { const bx = KX + (b * R.beat - now) * spd;
      x.fillStyle = paper ? `rgba(60,35,15,${b % 4 === 0 ? .18 : .08})` : U.a(C.ink, b % 4 === 0 ? .1 : .04); x.fillRect(bx, TY - 58, 1, 150); }
    letters.forEach(L => { const lx = KX + ((L.t0 + L.t1) / 2 - now) * spd; if (lx < -30 || lx > W + 30) return;
      x.fillStyle = L.st === 'ok' ? (paper ? '#4d7a1f' : C.green) : L.st === 'bad' ? C.red : paper ? INK : C.dim; x.font = `700 13px ${C.ff}`; x.fillText(L.ch, lx, TY - 42); });
    x.fillStyle = paper ? INK : C.dim; x.font = `700 10px ${C.ff}`; x.textAlign = 'left'; x.fillText('TAPE', 8, TY - 20); x.fillText('YOU', 8, TY + 44);
    for (const m of marks) { const mx = KX + (m.t - now) * spd, w = m.dur * spd; if (mx > W || mx + w < 0) continue;
      const col = m.st === 'miss' ? C.red : m.st && m.st !== 'keying' ? (paper ? '#4d7a1f' : C.green) : m.st === 'keying' ? (paper ? '#8a5a1c' : C.cyan) : paper ? INK : C.amber;
      x.fillStyle = U.a(col, m.st && m.st !== 'keying' ? .35 : .85); x.fillRect(mx, TY - 14, w, 22); }
    // player trace
    const segs = keyDown ? [...trace, [keyT, now]] : trace;
    x.fillStyle = paper ? '#8a5a1c' : C.cyan; for (const [a, b] of segs) { const sx = KX + (a - now) * spd, ex = KX + (b - now) * spd; if (ex < 0) continue; x.fillRect(sx, TY + 36, Math.max(2, ex - sx), 12); }
    x.fillStyle = U.a(C.ink, .08); x.fillRect(0, TY + 42, W, 1);
    // key line + lamp
    const pulse = R.pulse(); x.fillStyle = U.a(C.cyan, .35 + pulse * .5); x.shadowColor = C.cyan; x.shadowBlur = 8 + pulse * 10; x.fillRect(KX - 1, TY - 58, 3, 150); x.shadowBlur = 0;
    x.fillStyle = keyDown ? C.cyan : C.raise; x.shadowColor = C.cyan; x.shadowBlur = keyDown ? 24 : 0; x.beginPath(); x.arc(KX, TY + 118, 16, 0, TAU); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = U.a(C.cyan, .5); x.lineWidth = 2; x.stroke();
    x.textAlign = 'center'; x.fillStyle = C.dim; x.font = `700 11px ${C.ff}`; x.fillText('KEY · SPACE', KX, TY + 148);
    // brass key
    x.fillStyle = keyDown ? C.amber : U.a(C.amber, .5); x.save(); x.translate(KX + 150, TY + 118); x.rotate(keyDown ? .05 : -.06);
    x.fillRect(-90, -4, 180, 8); x.beginPath(); x.arc(90, 0, 14, 0, TAU); x.fill(); x.restore();
    x.fillStyle = C.mute; x.fillRect(KX + 80, TY + 128, 30, 12);
    x.font = `700 13px ${C.ff}`; x.textAlign = 'left';
    pops.forEach(p => { if (p.a > 0) { x.globalAlpha = Math.min(1, p.a); x.fillStyle = p.col; x.fillText(p.txt, KX + 14, TY + 72 - (1 - p.a) * 8); x.globalAlpha = 1; } });
    if (now < 0) { x.textAlign = 'center'; x.fillStyle = C.text; x.font = `700 40px ${C.ff}`; x.fillText(Math.ceil(-now / R.beat), W / 2 + 60, TY - 2); }
    // teletype: received text prints out, a character per completed letter
    const TX = W - 214, TYy = TY + 96; x.fillStyle = '#efe6d2'; x.fillRect(TX, TYy, 204, 44); x.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 44; k += 4) x.fillRect(TX, TYy + k, 204, 1);
    x.fillStyle = '#1b1410'; x.font = `700 10px ${C.ff}`; x.textAlign = 'left'; x.fillText('RX ▸ TELETYPE', TX + 8, TYy + 10);
    x.font = `700 20px 'JetBrains Mono', monospace`; let tx2 = TX + 10;
    letters.forEach(L => { if (!L.st) return; const k = Math.min(1, (now - L.at) / .12); x.globalAlpha = k; x.fillStyle = L.st === 'ok' ? '#1b1410' : '#b3261e'; x.fillText(L.st === 'ok' ? L.ch : '#', tx2, TYy + 30); x.globalAlpha = 1; tx2 += 18; });
    if (Math.floor(now * 2) % 2) { x.fillStyle = '#1b1410'; x.fillRect(tx2, TYy + 22, 10, 16); }
    x.textAlign = 'right'; x.fillStyle = C.dim; x.font = `600 11px ${C.ff}`; x.fillText(`${Math.round(unit * 1000)}ms UNIT · DOT = 1 · DASH = 3`, W - 8, H - 10);
  });
  st();
}});
