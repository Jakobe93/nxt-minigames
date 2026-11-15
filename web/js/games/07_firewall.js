reg({id: 'firewall', name: 'Firewall Run', desc: 'Steer your payload through the gaps in each firewall layer. Every rule block you clip costs a strike.',
controls: 'A / ← and D / → to switch lanes',
mount(root, api) {
  const Lc = api.ti('lanes', 4, 6), W = 640, H = 410, lw = Math.min(92, Math.floor(540 / Lc)), PW = lw * Lc, X0 = Math.round((W - PW) / 2) - 10;
  const TOP = 44, BOT = 36, FH = H - TOP - BOT, PY = TOP + FH - 44;
  const goal = api.ti('layers', 12, 24), maxS = Math.max(1, api.ti('strikes', 3, 1));
  const speed = api.t('speed', 150, 300), spacing = api.t('spacing', 220, 150);
  let lane = Math.floor(Lc / 2), px = X0 + lane * lw + lw / 2, passed = 0, strikes = 0, scroll = 0, hitFx = 0, last = lane, uptime = 1;
  const press = {l: 0, r: 0}, x = U.canvas(root, W, H), walls = [];
  const maxShift = Math.max(1, Math.min(Lc - 1, Math.floor(spacing / speed * 5)));
  // 4x4 dither tile — the "pixel" rule block from the reference
  const tile = (col, al) => { const c = document.createElement('canvas'); c.width = c.height = 4; const t = c.getContext('2d');
    t.fillStyle = U.a(col, al); t.fillRect(0, 0, 4, 4); t.fillStyle = 'rgba(0,0,0,.3)'; t.fillRect(0, 0, 2, 2); t.fillRect(2, 2, 2, 2); return x.createPattern(c, 'repeat'); };
  const pat = tile(C.red, 1), patDim = tile(C.red, .32);
  function spawn(y) {
    const g = Math.max(0, Math.min(Lc - 1, last + U.rand(maxShift * 2 + 1) - maxShift)); last = g;
    const gaps = new Set([g]); if (api.d <= 4 && Math.random() < .3) gaps.add((g + 1 + U.rand(Lc - 1)) % Lc);
    walls.push({y, gaps, done: false, hit: -1});
  }
  for (let i = 0; i < 4; i++) spawn(TOP - 40 - i * spacing);
  const move = d => { lane = Math.max(0, Math.min(Lc - 1, lane + d)); press[d < 0 ? 'l' : 'r'] = 1; };
  api.key(e => { const k = U.k(e); if (k === 'a' || e.key === 'ArrowLeft') move(-1); if (k === 'd' || e.key === 'ArrowRight') move(1); });
  api.on(x.canvas, 'mousedown', e => move(e.offsetX < px ? -1 : 1));
  const st = () => api.status(`<span>Layers <b>${passed}/${goal}</b></span>`);
  api.loop(dt => {
    const v = speed * (1 + passed * .012); scroll = (scroll + v * dt) % 40; hitFx = Math.max(0, hitFx - dt * 2.5);
    press.l = Math.max(0, press.l - dt * 4); press.r = Math.max(0, press.r - dt * 4);
    uptime += ((1 - strikes / maxS) - uptime) * Math.min(1, dt * 6);
    px += (X0 + lane * lw + lw / 2 - px) * Math.min(1, dt * 18);
    for (const w of walls) {
      const prev = w.y; w.y += v * dt;
      if (!w.done && prev < PY && w.y >= PY) {
        w.done = true;
        if (w.gaps.has(lane)) passed++;
        else {                       // clipped a rule block: strike, packet punches through, layer doesn't count
          strikes++; w.hit = lane; hitFx = 1;
          if (strikes >= maxS) { st(); return api.fail(`Packet dropped at layer ${passed + 1}`); }
        }
        st(); if (passed >= goal) return api.win('Payload delivered');
      }
    }
    while (walls.length && walls[0].y > TOP + FH + 30) walls.shift();
    while (walls.length < 6) spawn(walls[walls.length - 1].y - spacing);
    // ---- draw ----
    const term = THEME === 'terminal', low = strikes >= maxS - 1 && maxS > 1;
    x.clearRect(0, 0, W, H);
    // uptime / integrity bar
    x.font = `700 13px ${C.ff}`; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = C.dim;
    const lab = term ? 'UPTIME' : 'INTEGRITY', lwid = x.measureText(lab).width + 14, rlab = `STRIKES LEFT ${maxS - strikes}`, rwid = x.measureText(rlab).width + 14;
    x.fillText(lab, X0, 16);
    const bx = X0 + lwid, bw = PW - lwid - rwid;
    x.fillStyle = C.raise; x.fillRect(bx, 10, bw, 12);
    x.fillStyle = hitFx > .5 ? C.red : low ? C.amber : C.cyan; x.fillRect(bx + 2, 12, (bw - 4) * uptime, 8);
    x.textAlign = 'right'; x.fillStyle = low || maxS - strikes <= 1 ? C.amber : C.dim; x.fillText(rlab, X0 + PW, 16);
    // playfield
    const sx = hitFx > .6 && !NUI.reduce ? (Math.random() * 2 - 1) * 5 * hitFx : 0;
    x.save(); x.beginPath(); x.rect(X0 - 8, TOP, PW + 16, FH); x.clip(); x.translate(sx, 0);
    x.fillStyle = C.sunk; x.fillRect(X0, TOP, PW, FH);
    if (hitFx) { x.fillStyle = U.a(C.red, .16 * hitFx); x.fillRect(X0, TOP, PW, FH); }
    x.strokeStyle = U.a(C.ink, term ? .1 : .05); x.lineWidth = 1;
    for (let i = 1; i < Lc; i++) { x.beginPath(); x.moveTo(X0 + i * lw + .5, TOP); x.lineTo(X0 + i * lw + .5, TOP + FH); x.stroke(); }
    x.strokeStyle = U.a(C.ink, term ? .35 : .1); x.strokeRect(X0 + .5, TOP + .5, PW - 1, FH - 1);
    for (const w of walls) for (let i = 0; i < Lc; i++) {
      if (w.gaps.has(i)) continue;   // open lanes stay empty
      const s = 30, bx2 = X0 + i * lw + (lw - s) / 2, by = w.y - s / 2;
      if (w.hit === i) { x.strokeStyle = C.amber; x.lineWidth = 2; x.strokeRect(bx2 + 1, by + 1, s - 2, s - 2); x.lineWidth = 1; continue; }
      x.fillStyle = w.done ? patDim : pat; x.fillRect(bx2, by, s, s);
      x.strokeStyle = U.a('#ffffff', .18); x.strokeRect(bx2 + .5, by + .5, s - 1, s - 1);
    }
    const col = hitFx > .2 ? C.amber : C.cyan;
    x.fillStyle = U.a(C.cyan, .12); x.fillRect(px - 2, PY + 13, 4, 26);
    x.shadowColor = col; x.shadowBlur = 14; x.strokeStyle = col; x.lineWidth = 2.5; x.strokeRect(px - 11, PY - 11, 22, 22);
    x.fillStyle = col; x.fillRect(px - 4, PY - 4, 8, 8); x.shadowBlur = 0; x.lineWidth = 1;
    x.restore();
    // progress ticks
    const rx = X0 + PW + 22;
    for (let i = 0; i < goal; i++) { const y = TOP + FH - 6 - i * ((FH - 12) / goal); x.fillStyle = i < passed ? C.cyan : C.raise; x.fillRect(rx, y - 2, 8, 3); }
    // route prompt
    const cy = H - 16; x.textAlign = 'center'; x.fillStyle = C.dim; x.fillText(term ? 'ROUTE PACKET' : 'Route packet', X0 + PW / 2, cy);
    const key = (t, xx, a) => { x.fillStyle = a > 0 ? C.cyan : C.dim; x.globalAlpha = .55 + a * .45; x.fillText(t, xx, cy); x.globalAlpha = 1; };
    key('←  A', X0 + PW / 2 - 104, press.l); key('D  →', X0 + PW / 2 + 104, press.r);
  });
  st();
}});
