reg({id: 'intercept', name: 'Intercept', desc: 'Packets stream toward the gateway. Catch every one carrying the target tag and let the rest pass.',
controls: 'Click packets tagged with the target',
mount(root, api) {
  const W = 640, H = 380, need = api.ti('targets', 6, 14), maxS = api.ti('errors', 3, 1), spd = api.t('speed', 90, 200), every = api.t('spawnSec', 1.0, .48), assist = api.d <= 2;
  const HX = '0123456789ABCDEF', tag = U.hex(16 + U.rand(240));
  const decoy = () => { let s; do s = api.d >= 6 ? (Math.random() < .5 ? tag[1] + tag[0] : (Math.random() < .5 ? tag[0] + U.pick(HX) : U.pick(HX) + tag[1])) : U.hex(U.rand(256)); while (s === tag); return s; };
  const x = U.canvas(root, W, H); const ps = [], fx = [];
  let got = 0, strikes = 0, clock = .3, sinceT = 0;
  function spawn() { const isT = Math.random() < .4 || sinceT >= 3; sinceT = isT ? 0 : sinceT + 1;
    ps.push({x: -30, y: 40 + Math.random() * (H - 80), v: spd * (.8 + Math.random() * .4), ph: Math.random() * TAU, t: isT, s: isT ? tag : decoy()}); }
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
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.x += p.v * dt; if (api.d >= 6) p.y += Math.sin(t / 400 + p.ph) * 22 * dt;
      if (p.x > W - 40) { ps.splice(i, 1); if (p.t) { fx.push({x: W - 40, y: p.y, r: 8, c: C.amber}); strike(`Target ${tag} reached the gateway`); if (!api.alive) return; } } }
    x.clearRect(0, 0, W, H); x.fillStyle = C.sunk; U.rr(x, 0, 0, W, H, 6); x.fill();
    x.strokeStyle = U.a(C.ink, .04); for (let y = 40; y < H; y += 40) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
    x.fillStyle = U.a(C.red, .12); x.fillRect(W - 40, 0, 40, H); x.fillStyle = C.red; x.fillRect(W - 40, 0, 2, H);
    x.save(); x.translate(W - 16, H / 2); x.rotate(Math.PI / 2); x.font = `700 12px ${C.ff}`; x.textAlign = 'center'; x.fillStyle = U.a(C.red, .8); x.fillText('GATEWAY', 0, 0); x.restore();
    x.font = `700 16px ${C.ff}`; x.textAlign = 'center';
    for (const p of ps) { U.rr(x, p.x - 24, p.y - 13, 48, 26, 5); x.fillStyle = C.raise; x.fill();
      x.lineWidth = 1.5; x.strokeStyle = assist && p.t ? C.cyan : U.a(C.ink, .18); x.stroke();
      x.fillStyle = C.text; x.fillText(p.s, p.x, p.y + 6);
      x.fillStyle = U.a(C.cyan, .25); x.fillRect(p.x - 40, p.y - 1, 14, 2); }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.r += dt * 90; const a = 1 - f.r / 50; if (a <= 0) { fx.splice(i, 1); continue; }
      x.globalAlpha = a; x.strokeStyle = f.c; x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, f.r, 0, TAU); x.stroke(); x.globalAlpha = 1; }
  });
  st();
}});
