reg({id: 'echo', name: 'Echo', theme: 'sampler', desc: 'The relay plays a rhythm on its pads. Wait for your cue, then echo it back on the same pads in the same rhythm.',
controls: 'A S D (Space) or click the pads · echo after the count-in',
mount(root, api) {
  const P = api.d <= 3 ? 3 : 4, KEYS = ['a', 's', 'd', ' '].slice(0, P), LABEL = ['A', 'S', 'D', 'SPACE'], rounds = api.ti('rounds', 3, 4), base = api.ti('length', 3, 4), maxS = api.ti('strikes', 3, 2);
  const R = Rhythm.create(api, {bpm: api.t('bpm', 88, 112), drums: false}); R.windows(api.t('perfect', .085, .055), api.t('good', .18, .13));
  const e8 = R.beat / 2, bar = R.beat * 4, FREQ = [392, 494, 587, 740], hideRelay = api.d >= 9;
  function pattern(n) {
    const pool = api.d <= 3 ? [0, 2, 4, 6, 8, 10, 12, 14] : [...Array(16).keys()].filter(s => api.d >= 7 || s % 2 === 0 || Math.random() < .35);
    const slots = [0, ...U.shuffle(pool.filter(s => s > 0)).slice(0, Math.min(n, pool.length) - 1)].sort((a, b) => a - b);
    let last = -1, rep = 0; return slots.map(s => { let p; do p = U.rand(P); while (p === last && rep >= 1); rep = p === last ? rep + 1 : 0; last = p; return {s, p}; });
  }
  let round = 0, strikes = 0, pat = pattern(base), rs = 0, hits = [], errs = 0, phase = 'listen', evalT = 0; const lit = Array(P).fill(0), pops = [];
  function schedule() {
    const resp = rs + 3 * bar; evalT = resp + pat[pat.length - 1].s * e8 + R.good + .35;
    pat.forEach(n => R.blip(FREQ[n.p], .2, 'triangle', .45, rs + n.s * e8));
    for (let b = 0; b < 4; b++) R.blip(b ? 990 : 1320, .05, 'square', .22, rs + 2 * bar + b * R.beat);
    hits = pat.map(n => ({...n, t: resp + n.s * e8, st: null})); errs = 0; pat.mine = [];
  }
  schedule();
  function press(k) {
    const now = R.time(); lit[k] = 1; R.blip(FREQ[k], .16, 'triangle', .4);
    if (phase !== 'echo') return;
    const cand = hits.filter(h => !h.st && Math.abs(now - h.t) <= R.good).sort((a, b) => Math.abs(now - a.t) - Math.abs(now - b.t))[0];
    const slotF = (now - (rs + 3 * bar)) / e8;
    if (cand && cand.p === k) { cand.st = R.judge(now - cand.t); pat.mine.push({f: slotF, p: k, ok: true}); pops.push({txt: cand.st === 'perfect' ? 'PERFECT' : 'GOOD', col: cand.st === 'perfect' ? C.green : C.cyan, a: 1}); }
    else { errs++; pat.mine.push({f: slotF, p: k, ok: false}); pops.push({txt: cand ? 'WRONG PAD' : 'OFF-BEAT', col: C.red, a: 1}); }
  }
  const x = U.canvas(root, 640, 400);
  const PW = 100, PG = 18, PX = (640 - (P * PW + (P - 1) * PG)) / 2, PY = 84;
  api.on(window, 'keydown', e => { const k = KEYS.indexOf(U.k(e)); if (k < 0) return; e.preventDefault(); if (e.repeat || !api.alive) return; press(k); });
  api.on(x.canvas, 'mousedown', e => { for (let k = 0; k < P; k++) { const px = PX + k * (PW + PG); if (e.offsetX >= px && e.offsetX <= px + PW && e.offsetY >= PY && e.offsetY <= PY + PW) press(k); } });
  const st = () => api.status(`<span>Round <b>${Math.min(round + 1, rounds)}/${rounds}</b></span><span>Strikes${U.strikes(strikes, maxS)}</span>`);
  api.loop(dt => {
    const now = R.time();
    phase = now < rs + 2 * bar ? 'listen' : now < rs + 3 * bar - R.good ? 'ready' : 'echo';
    if (phase === 'listen') pat.forEach(n => { const t = rs + n.s * e8; if (now >= t && now < t + .06) lit[n.p] = 1; });
    if (now >= evalT) {
      const missed = hits.filter(h => !h.st).length, ok = !missed && !errs;
      if (ok) { round++; if (round >= rounds) return api.win('Relay echoed back clean'); pat = pattern(base + round); pops.push({txt: 'ROUND CLEAR', col: C.green, a: 1.5}); }
      else { strikes++; st(); if (strikes >= maxS) return api.fail(missed ? `Missed ${missed} beat${missed > 1 ? 's' : ''} of the echo` : 'Echo out of sync'); pops.push({txt: 'REPLAY', col: C.amber, a: 1.5}); }
      rs = Math.ceil((now + R.beat) / bar) * bar; schedule(); st();
    }
    lit.forEach((v, i) => lit[i] = Math.max(0, v - dt * 4)); pops.forEach(p => p.a -= dt * 1.4);
    // ---- draw ----
    x.clearRect(0, 0, 640, 400);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const beatIn = Math.floor((now - (rs + 2 * bar)) / R.beat);
    const banner = now < 0 ? 'STAND BY' : phase === 'listen' ? 'LISTEN' : phase === 'ready' ? `READY · ${4 - Math.max(0, beatIn)}` : 'ECHO';
    x.fillStyle = '#0f1a14'; U.rr(x, 170, 6, 300, 54, 6); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke();
    x.fillStyle = 'rgba(160,255,190,.05)'; x.fillRect(176, 12, 288, 42);
    x.textAlign = 'left'; x.font = `700 10px 'JetBrains Mono', monospace`; x.fillStyle = '#7dffae';
    x.fillText(`PTN ${String(round + 1).padStart(2, '0')}  ${Math.round(R.bpm)}BPM  ${P}PAD`, 184, 20);
    if (phase === 'echo' && Math.floor(now * 3) % 2) { x.fillStyle = '#ff4f79'; x.beginPath(); x.arc(452, 20, 4, 0, TAU); x.fill(); x.fillStyle = '#7dffae'; x.textAlign = 'right'; x.fillText('REC', 444, 20); }
    x.textAlign = 'center'; x.fillStyle = phase === 'echo' ? '#7dffae' : phase === 'ready' ? '#ffd166' : '#c8ffe0'; x.font = `700 20px 'JetBrains Mono', monospace`; x.fillText(banner, 320, 40);
    x.fillStyle = C.dim; x.font = `600 11px ${C.ff}`; x.fillText(phase === 'echo' ? (hideRelay ? 'from memory — the relay track is hidden' : 'tap it back in time') : phase === 'ready' ? 'your turn after the count' : `pattern of ${pat.length}`, 320, 70);
    const cols = [C.cyan, C.amber, C.green, C.red];
    for (let k = 0; k < P; k++) { const px = PX + k * (PW + PG), l = lit[k];
      const rubber = THEME === 'sampler';
      if (rubber) { const g = x.createLinearGradient(0, PY, 0, PY + PW); g.addColorStop(0, U.a(cols[k], .32 + l * .6)); g.addColorStop(1, U.a(cols[k], .14 + l * .5));
        x.shadowColor = cols[k]; x.shadowBlur = l * 26; U.rr(x, px, PY, PW, PW, 14); x.fillStyle = g; x.fill(); x.shadowBlur = 0;
        x.strokeStyle = U.a('#ffffff', .12); x.lineWidth = 1; U.rr(x, px + 1, PY + 1, PW - 2, PW - 2, 13); x.stroke(); }
      else { x.fillStyle = C.panel; x.fillRect(px, PY, PW, PW); if (l) { x.fillStyle = U.a(cols[k], .15 + l * .5); x.fillRect(px, PY, PW, PW); }
      x.strokeStyle = U.a(cols[k], .45 + l * .55); x.lineWidth = 2; x.shadowColor = cols[k]; x.shadowBlur = l * 22; x.strokeRect(px + 1, PY + 1, PW - 2, PW - 2); x.shadowBlur = 0; }
      x.fillStyle = U.a(cols[k], .25); for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) x.fillRect(px + 30 + gx * 18, PY + 26 + gy * 14, 8, 4);
      x.fillStyle = l > .3 ? C.base : C.text; x.font = `700 ${LABEL[k].length > 1 ? 13 : 18}px ${C.ff}`; x.fillText(LABEL[k], px + PW / 2, PY + PW - 20); }
    // timeline: relay row + your row over 16 eighth slots
    const TX = 88, TW = 500, sw = TW / 16, row = (y, label) => { x.textAlign = 'right'; x.fillStyle = C.dim; x.font = `700 10px ${C.ff}`; x.fillText(label, TX - 10, y);
      for (let s = 0; s < 16; s++) { x.fillStyle = U.a(C.ink, s % 4 === 0 ? .14 : .06); x.fillRect(TX + s * sw, y - 12, 1, 24); } x.fillStyle = U.a(C.ink, .08); x.fillRect(TX, y, TW, 1); };
    row(254, 'RELAY'); row(302, 'YOU');
    const tick = (s, p, y, col, a = 1) => { x.globalAlpha = a; x.fillStyle = col; x.fillRect(TX + s * sw + 2, y - 9, Math.max(6, sw - 8), 18); x.globalAlpha = 1; };
    const showRelay = phase !== 'echo' || !hideRelay;
    pat.forEach(n => { const played = phase !== 'listen' || now >= rs + n.s * e8; if (showRelay && played) tick(n.s, n.p, 254, cols[n.p], phase === 'echo' ? .35 : .85); });
    (pat.mine || []).forEach(m => { if (m.f >= -.5 && m.f < 16.5) tick(Math.max(0, m.f), m.p, 302, m.ok ? cols[m.p] : C.red); });
    const head = phase === 'listen' ? (now - rs) / e8 : phase === 'echo' ? (now - (rs + 3 * bar)) / e8 : -1;
    if (head >= 0 && head <= 16) { x.fillStyle = C.text; x.fillRect(TX + head * sw, phase === 'listen' ? 236 : 284, 2, 36); }
    x.textAlign = 'center'; x.font = `700 14px ${C.ff}`;
    pops.forEach(p => { if (p.a > 0) { x.globalAlpha = Math.min(1, p.a); x.fillStyle = p.col; x.fillText(p.txt, 320, 346 - (1 - Math.min(1, p.a)) * 8); x.globalAlpha = 1; } });
    for (let i = 0; i < rounds; i++) { x.fillStyle = i < round ? C.green : i === round ? C.cyan : C.raise; x.fillRect(320 - rounds * 11 + i * 22, 374, 16, 5); }
  });
  st();
}});
