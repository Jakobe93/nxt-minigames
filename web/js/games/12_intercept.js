reg({id: 'intercept', name: 'Intercept', desc: 'Packets rain down the spectrum toward the gateway. Catch every one carrying the target tag and let the rest pass.',
controls: 'Click packets tagged with the target',
mount(root, api) {
  const W = 640, H = 400, need = api.ti('targets', 6, 14), maxS = api.ti('errors', 3, 1), spd = api.t('speed', 90, 200) * .8, every = api.t('spawnSec', 1.0, .48), assist = api.d <= 2;
  const HX = '0123456789ABCDEF', tag = U.hex(16 + U.rand(240)), LANES = 7, GY = H - 34, lw = (W - 60) / LANES;
  const decoy = () => { let s; do s = api.d >= 6 ? (Math.random() < .5 ? tag[1] + tag[0] : (Math.random() < .5 ? tag[0] + U.pick(HX) : U.pick(HX) + tag[1])) : U.hex(U.rand(256)); while (s === tag); return s; };
  const freq = Array.from({length: LANES}, (_, i) => (433.05 + i * .175).toFixed(2));
  const x = U.canvas(root, W, H), ps = [], fx = [];
  // pre-rendered waterfall noise, scrolled every frame
  const nz = document.createElement('canvas'); nz.width = W - 60; nz.height = H; const nc = nz.getContext('2d');
  { const img = nc.createImageData(W - 60, H), d = img.data, hx = parseInt(C.cyan.slice(1), 16), cr = hx >> 16 & 255, cg = hx >> 8 & 255, cb = hx & 255;
    for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W - 60; xx += 3) { const lane = Math.abs(((xx / lw) % 1) - .5), a = (Math.random() * .12 + (lane < .08 ? .1 : 0)) * 255;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3 && xx + dx < W - 60; dx++) { const o = ((y + dy) * (W - 60) + xx + dx) * 4; d[o] = cr; d[o + 1] = cg; d[o + 2] = cb; d[o + 3] = a; } }
    nc.putImageData(img, 0, 0); }
  let got = 0, strikes = 0, clock = .3, sinceT = 0, scroll = 0;
  function spawn() { const isT = Math.random() < .4 || sinceT >= 3; sinceT = isT ? 0 : sinceT + 1; const l = U.rand(LANES);
    ps.push({l, x: 30 + l * lw + lw / 2, y: -20, v: spd * (.8 + Math.random() * .4), ph: Math.random() * TAU, t: isT, s: isT ? tag : decoy()}); }
  const strike = msg => { strikes++; st(); if (strikes >= maxS) api.fail(msg); };
  api.on(x.canvas, 'mousedown', e => {
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; if (Math.abs(e.offsetX - p.x) < 26 && Math.abs(e.offsetY - p.y) < 16) {
      ps.splice(i, 1); fx.push({x: p.x, y: p.y, r: 8, c: p.t ? C.green : C.red});
      if (p.t) { got++; st(); if (got >= need) api.win('Target traffic captured'); } else strike(`Dropped a clean packet (${p.s})`);
      return; } }
  });
  const st = () => api.status(`<span>Target <b style="color:${C.cyan}">${tag}</b></span><span>Caught <b>${got}/${need}</b></span><span>Errors${U.strikes(strikes, maxS)}</span>`);
  api.loop((dt, t) => {
    clock -= dt; if (clock <= 0) { spawn(); clock = every * (.7 + Math.random() * .6); }
    scroll = (scroll + spd * .6 * dt) % H;
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.y += p.v * dt; if (api.d >= 6) p.x = 30 + p.l * lw + lw / 2 + Math.sin(t / 380 + p.ph) * lw * .28;
      if (p.y > GY) { ps.splice(i, 1); if (p.t) { fx.push({x: p.x, y: GY, r: 8, c: C.amber}); strike(`Target ${tag} reached the gateway`); if (!api.alive) return; } } }
    x.clearRect(0, 0, W, H); x.fillStyle = C.sunk; x.fillRect(30, 0, W - 60, H);
    x.drawImage(nz, 30, scroll - H); x.drawImage(nz, 30, scroll);
    x.strokeStyle = U.a(C.ink, .06); for (let i = 1; i < LANES; i++) { x.beginPath(); x.moveTo(30 + i * lw, 0); x.lineTo(30 + i * lw, GY); x.stroke(); }
    // frequency axis + gateway band
    x.fillStyle = C.base; x.fillRect(30, 0, W - 60, 18);
    x.font = `600 10px ${C.ff}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = C.dim;
    freq.forEach((f, i) => x.fillText(f, 30 + i * lw + lw / 2, 9));
    x.fillStyle = U.a(C.red, .14); x.fillRect(30, GY, W - 60, H - GY); x.fillStyle = C.red; x.fillRect(30, GY, W - 60, 2);
    x.fillStyle = U.a(C.red, .85); x.font = `700 11px ${C.ff}`; x.fillText('GATEWAY  ·  ANYTHING PAST THIS LINE IS DELIVERED', W / 2, GY + 17);
    x.font = `700 16px ${C.ff}`;
    for (const p of ps) { x.fillStyle = U.a(C.cyan, .2); x.fillRect(p.x - 1, p.y - 40, 2, 26);
      U.rr(x, p.x - 24, p.y - 13, 48, 26, 4); x.fillStyle = C.raise; x.fill();
      x.lineWidth = 1.5; x.strokeStyle = assist && p.t ? C.cyan : U.a(C.ink, .22); x.stroke();
      x.fillStyle = C.text; x.fillText(p.s, p.x, p.y + 1); }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.r += dt * 90; const a = 1 - f.r / 50; if (a <= 0) { fx.splice(i, 1); continue; }
      x.strokeStyle = U.a(f.c, a); x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, f.r, 0, TAU); x.stroke(); }
    // side rulers
    x.fillStyle = C.dim; x.font = `600 9px ${C.ff}`;
    for (let y = 40; y < GY; y += 60) { x.textAlign = 'right'; x.fillText(`-${((y + scroll) % 400 / 40).toFixed(0)}s`, 26, y); }
  });
  st();
}});
