'use strict';
// One step of the simulation: movement, arrows in flight, removing the fallen, moving the view.

// ---------- Simulation ----------
const keys = new Set();
let hover = null, mode = null, time = 0;
function update(dt) {
  time += dt;
  const live = phase === 'muster' || phase === 'ambush';
  if (live) for (const u of units) if (u.hp > 0) think(u, dt);
  for (const u of units) {
    if (u.path && u.pi < u.path.length) {
      const p = u.path[u.pi], dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy);
      const stepLen = (u.type.speed / (COST[tiles[tileOf(u)]] || 1)) * dt;
      if (d <= stepLen) {
        u.x = p.x; u.y = p.y; u.pi++; u.run += d;
        if (u.pi >= u.path.length) { u.path = null; if (u.order === 'move') u.order = null; }
      } else {
        u.x += (dx / d) * stepLen; u.y += (dy / d) * stepLen; u.run += stepLen;
        if (Math.abs(dx) > 0.4) u.face = dx > 0 ? 1 : -1;
      }
      u.moving = true; u.anim += dt;
    } else { u.moving = false; u.run = 0; }
  }
  // Men on the move or in a fight give each other a little room.
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    const a = units[i], b = units[j];
    const am = (a.moving || !!a.target) && a.type.speed > 0, bm = (b.moving || !!b.target) && b.type.speed > 0;
    if (!am && !bm) continue;
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 8) continue;
    if (d < 0.01) { dx = Math.cos(i * 2.4); dy = Math.sin(i * 2.4); d = 1; }
    // Capped below marching speed so nobody can be held in place, and turned a little so men slide past each other.
    const push = Math.min((8 - d) * 4, 13) * dt;
    const rx = (dx / d) * 0.83 - (dy / d) * 0.56, ry = (dx / d) * 0.56 + (dy / d) * 0.83;
    for (const [u, on, sgn] of [[a, am, -1], [b, bm, 1]]) {
      if (!on) continue;
      const nx = u.x + rx * push * sgn, ny = u.y + ry * push * sgn;
      const tx = Math.floor(nx / T), ty = Math.floor(ny / T);
      if (inMap(tx, ty) && COST[tiles[idx(tx, ty)]]) { u.x = nx; u.y = ny; }
    }
  }
  // Arrows in flight.
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.t.hp <= 0) { shots.splice(i, 1); continue; }
    const tx = s.t.x, ty = s.t.y - s.t.type.mid, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy), stepLen = 240 * dt;
    if (d <= stepLen) { hit(s.t, s.dmg, s.src); shots.splice(i, 1); }
    else { s.x += (dx / d) * stepLen; s.y += (dy / d) * stepLen; s.dx = dx / d; s.dy = dy / d; }
  }
  // Clear the fallen from the field.
  let lost = false;
  for (let i = units.length - 1; i >= 0; i--) if (units[i].hp <= 0) {
    if (sel.delete(units[i])) lost = true;
    if (units[i].team === 'eng') lost = true;
    units.splice(i, 1);
  }
  if (lost) refreshHUD();
  for (let i = marks.length - 1; i >= 0; i--) { marks[i].age += dt; if (marks[i].age > 0.7) marks.splice(i, 1); }
  for (let i = fx.length - 1; i >= 0; i--) { fx[i].age += dt; if (fx[i].age > fx[i].life) fx.splice(i, 1); }

  // Moving the view: arrow keys, and the screen edges for a mouse.
  let vx = 0, vy = 0;
  if (keys.has('ArrowLeft')) vx -= 1;
  if (keys.has('ArrowRight')) vx += 1;
  if (keys.has('ArrowUp')) vy -= 1;
  if (keys.has('ArrowDown')) vy += 1;
  if (hover && mode === null) {
    const m = 14;
    if (hover.x < m) vx -= 1; else if (hover.x > cssW - m) vx += 1;
    if (hover.y < m) vy -= 1; else if (hover.y > cssH - m) vy += 1;
  }
  if (vx || vy) { cam.x += (vx * 520 * dt) / cam.zoom; cam.y += (vy * 520 * dt) / cam.zoom; clampCam(); }
  if (live) runMission(dt);
}
