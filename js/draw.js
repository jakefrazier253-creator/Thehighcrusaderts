'use strict';
// Draws one frame: map, effects, units, selection box, and the small map.

// ---------- Drawing ----------
let box = null;
function draw() {
  const s = dpr * cam.zoom;
  const ox = Math.round(cv.width / 2 - cam.x * s), oy = Math.round(cv.height / 2 - cam.y * s);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b1012';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapC, 0, 0);

  for (const f of fx) if (f.k === 'fall') {
    ctx.fillStyle = (f.foe ? 'rgba(52,72,150,' : 'rgba(120,28,24,') + (0.7 * (1 - f.age / f.life)).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (phase === 'muster') {
    const sx = (SHIP_RECT.x + SHIP_RECT.w / 2) * T, sy = SHIP_RECT.y * T - 16 + (reduceMotion ? 0 : Math.sin(time * 4) * 2);
    ctx.fillStyle = '#f2c955';
    ctx.beginPath(); ctx.moveTo(sx - 6, sy - 8); ctx.lineTo(sx + 6, sy - 8); ctx.lineTo(sx, sy); ctx.fill();
  }
  for (const m of marks) {
    const k = m.age / 0.7, r = 3 + (reduceMotion ? 6 : 10 * k);
    ctx.strokeStyle = (m.foe ? 'rgba(240,90,70,' : 'rgba(242,201,85,') + (1 - k).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  }
  units.sort((a, b) => a.y - b.y);
  for (const u of units) drawUnit(ctx, u, s);

  ctx.lineCap = 'round';
  for (const a of shots) {
    ctx.strokeStyle = '#ece5d2'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - (a.dx || 0) * 6, a.y - (a.dy || 0) * 6); ctx.stroke();
  }
  for (const f of fx) {
    const k = 1 - f.age / f.life;
    if (f.k === 'beam') {
      ctx.strokeStyle = 'rgba(143,240,224,' + (0.4 * k).toFixed(3) + ')'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,255,250,' + k.toFixed(3) + ')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke();
    } else if (f.k === 'clash') {
      const r = f.big ? 7 : 4;
      ctx.strokeStyle = (f.big ? 'rgba(242,201,85,' : 'rgba(255,255,255,') + k.toFixed(3) + ')'; ctx.lineWidth = f.big ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(f.x - r, f.y - r); ctx.lineTo(f.x + r, f.y + r);
      ctx.moveTo(f.x + r, f.y - r); ctx.lineTo(f.x - r, f.y + r);
      ctx.stroke();
    }
  }

  if (box) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = Math.min(box.x0, box.x1), y = Math.min(box.y0, box.y1), w = Math.abs(box.x1 - box.x0), h = Math.abs(box.y1 - box.y0);
    ctx.fillStyle = 'rgba(226,178,60,0.14)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#f2c955'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    if (w < 6 && h < 6) { ctx.beginPath(); ctx.arc(box.x0, box.y0, 20, 0, Math.PI * 2); ctx.stroke(); }
  }

  // Small map.
  const kx = mini.width / WW, ky = mini.height / WH;
  mctx.drawImage(miniBase, 0, 0);
  if (phase === 'muster' && Math.floor(time * 2) % 2 === 0) {
    mctx.fillStyle = '#f2c955';
    mctx.fillRect((SHIP_RECT.x + SHIP_RECT.w / 2) * T * kx - 3, (SHIP_RECT.y + 1.5) * T * ky - 3, 6, 6);
  }
  for (const u of units) {
    mctx.fillStyle = u.team === 'wers' ? '#ff5a47' : sel.has(u) ? '#ffffff' : '#e2b23c';
    mctx.fillRect(u.x * kx - 2, u.y * ky - 3, 4, 4);
  }
  const hw = cssW / cam.zoom / 2, hh = cssH / cam.zoom / 2;
  mctx.strokeStyle = '#ece5d2'; mctx.lineWidth = 2;
  mctx.strokeRect((cam.x - hw) * kx, (cam.y - hh) * ky, hw * 2 * kx, hh * 2 * ky);
}
