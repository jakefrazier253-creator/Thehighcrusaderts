'use strict';
// Orders (march, attack) and combat (who targets whom, damage, chasing).

// ---------- Orders ----------
function orderMove(wx, wy) {
  if (!sel.size) return;
  const tx = clamp(Math.floor(wx / T), 0, MW - 1), ty = clamp(Math.floor(wy / T), 0, MH - 1);
  const group = [...sel];
  // Do not send anyone to a spot where somebody outside the group is already standing.
  const taken = new Set();
  for (const u of units) if (!sel.has(u)) taken.add(tileOf(u));
  const slots = openTilesNear(idx(tx, ty), group.length, taken);
  if (!slots.length) return;
  const free = new Set(group);
  for (const slot of slots) {
    const g = tilePt(slot);
    let best = null, bd = Infinity;
    for (const u of free) { const d = (u.x - g.x) ** 2 + (u.y - g.y) ** 2; if (d < bd) { bd = d; best = u; } }
    if (!best) break;
    free.delete(best);
    const path = findPath(tileOf(best), slot);
    if (path === null) continue;
    best.path = path.map(tilePt);
    if (!best.path.length) best.path.push(g);
    best.pi = 0; best.target = null; best.order = 'move'; best.post = null;
  }
  const m = tilePt(slots[0]);
  marks.push({ x: m.x, y: m.y, age: 0, foe: false });
}
function orderAttack(t) {
  for (const u of sel) { u.target = t; u.order = 'attack'; u.repath = 0; u.path = null; u.post = null; }
  marks.push({ x: t.x, y: t.y, age: 0, foe: true });
}

// ---------- Combat ----------
// Remember where one of your men was standing before he went off to fight on his own initiative.
function keepPost(u) { if (u.team === 'eng' && u.type.speed && u.post == null) u.post = tileOf(u); }
function hit(t, dmg, src) {
  if (t.hp <= 0) return;
  t.hp -= dmg; t.hurt = 0.12;
  // Your men stand together: when one is hit, idle comrades close by go for the attacker.
  if (t.team === 'eng' && src && src.hp > 0) for (const o of units) {
    if (o === t || o.team !== 'eng' || o.hp <= 0 || o.target || o.order === 'move' || !o.type.dmg || !o.type.speed) continue;
    if ((o.x - t.x) ** 2 + (o.y - t.y) ** 2 < 130 * 130) { keepPost(o); o.target = src; o.order = 'auto'; o.repath = 0; }
  }
  if (t.hp <= 0) { fx.push({ k: 'fall', x: t.x, y: t.y, foe: t.team === 'wers', age: 0, life: 3 }); return; }
  // A soldier who is shot at while standing idle answers back.
  if (!t.target && t.type.dmg && t.order !== 'move' && src && src.hp > 0) { keepPost(t); t.target = src; t.order = 'auto'; }
}
function strike(u, t) {
  u.cool = u.type.cd;
  if (u.type.shot === 'arrow') shots.push({ x: u.x, y: u.y - 8, t, dmg: u.type.dmg, src: u });
  else if (u.type.shot === 'beam') {
    fx.push({ k: 'beam', x0: u.x + u.face * 6, y0: u.y - 7, x1: t.x, y1: t.y - t.type.mid, age: 0, life: 0.14 });
    hit(t, u.type.dmg, u);
  } else {
    // A knight who strikes at the end of a run hits twice as hard.
    const charge = !!u.type.charge && u.run > 40;
    fx.push({ k: 'clash', x: t.x, y: t.y - t.type.mid, age: 0, life: 0.16, big: charge });
    hit(t, u.type.dmg * (charge ? 2 : 1), u);
    u.run = 0;
  }
}
function chase(u) {
  const p = findPath(tileOf(u), tileOf(u.target));
  if (p === null) return false;
  u.path = p.length ? p.map(tilePt) : [{ x: u.target.x, y: u.target.y }];
  u.pi = 0;
  return true;
}
function think(u, dt) {
  u.cool = Math.max(0, u.cool - dt);
  u.hurt = Math.max(0, u.hurt - dt);
  if (!u.type.dmg) return;
  if (u.target && u.target.hp <= 0) { u.target = null; u.path = null; u.order = null; }
  if (!u.target && u.order !== 'move') {
    let best = null, bd = u.aggro * u.aggro;
    for (const o of units) {
      if (o.team === u.team || o.hp <= 0) continue;
      const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    if (best) { keepPost(u); u.target = best; u.order = 'auto'; u.repath = 0; }
  }
  if (!u.target) {
    // A soldier who left his place to answer an attack walks back to it once the fight is over.
    if (u.post != null && u.order !== 'move' && !u.path) {
      const p = tileOf(u) === u.post ? null : findPath(tileOf(u), u.post);
      if (p && p.length) { u.path = p.map(tilePt); u.pi = 0; u.order = 'return'; }
      else { u.post = null; u.order = null; }
    }
    return;
  }
  const dx = u.target.x - u.x, d = Math.hypot(dx, u.target.y - u.y);
  if (d <= u.type.range) {
    u.path = null;
    if (Math.abs(dx) > 0.4) u.face = dx > 0 ? 1 : -1;
    if (u.cool <= 0) strike(u, u.target);
  } else if (!u.type.speed) { u.target = null; u.order = null; }
  else if (u.leash && Math.hypot(u.x - u.hx, u.y - u.hy) > u.leash) {
    // Some defenders will not be drawn far from their post: they break off and walk back.
    const p = findPath(tileOf(u), idx(Math.floor(u.hx / T), Math.floor(u.hy / T)));
    u.target = null; u.pi = 0;
    u.path = p && p.length ? p.map(tilePt) : null;
    u.order = u.path ? 'move' : null;
  }
  else {
    u.repath -= dt;
    if (u.repath <= 0 || !u.path) {
      u.repath = 0.5;
      if (!chase(u)) { u.target = null; u.order = null; }
    }
  }
}
