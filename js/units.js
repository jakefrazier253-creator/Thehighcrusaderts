'use strict';
// Every kind of soldier and structure: their numbers, and how each one is drawn.

// ---------- Units ----------
const TYPES = {
  knight: { team: 'eng', draw: 'knight', charge: true, name: 'Knight', plural: 'Knights', speed: 44, r: 7, mid: 9, top: 27, hp: 140, dmg: 24, range: 17, cd: 0.9, aggro: 80 },
  maa: { team: 'eng', draw: 'foot', name: 'Man-at-arms', plural: 'Men-at-arms', speed: 26, r: 4, mid: 6, top: 20, hp: 90, dmg: 12, range: 17, cd: 0.8, aggro: 70 },
  bow: { team: 'eng', draw: 'foot', name: 'Longbowman', plural: 'Longbowmen', speed: 29, r: 4, mid: 6, top: 17, hp: 55, dmg: 14, range: 92, cd: 1.5, aggro: 104, shot: 'arrow' },
  gun: { team: 'eng', draw: 'foot', name: 'Blaster man', plural: 'Blaster men', speed: 29, r: 4, mid: 6, top: 17, hp: 55, dmg: 28, range: 108, cd: 1.8, aggro: 116, shot: 'beam' },
  car: { team: 'eng', draw: 'car', name: 'Ground car', plural: 'Ground cars', speed: 18, r: 9, mid: 7, top: 19, hp: 260, dmg: 30, range: 118, cd: 2.0, aggro: 124, shot: 'beam' },
  jair: { team: 'eng', draw: 'jair', name: 'Jair marksman', plural: 'Jair marksmen', speed: 30, r: 4, mid: 8, top: 20, hp: 50, dmg: 40, range: 140, cd: 2.4, aggro: 146, shot: 'beam' },
  rider: { team: 'eng', draw: 'rider', charge: true, name: 'Ashenkogh rider', plural: 'Ashenkogh riders', speed: 52, r: 7, mid: 10, top: 26, hp: 190, dmg: 30, range: 18, cd: 0.9, aggro: 90 },
  cturret: { team: 'eng', draw: 'turret', name: 'Captured turret', plural: 'Captured turrets', speed: 0, r: 8, mid: 6, top: 13, hp: 160, dmg: 20, range: 124, cd: 2.2, aggro: 124, shot: 'beam' },
  station: { team: 'eng', draw: 'station', name: 'Jair tower', plural: 'Jair towers', speed: 0, r: 13, mid: 14, top: 36, hp: 3000, dmg: 0, range: 0, cd: 1, aggro: 0 },
  wers: { team: 'wers', draw: 'wers', name: 'Wersgor', plural: 'Wersgorix', speed: 22, r: 4, mid: 6, top: 16, hp: 70, dmg: 28, range: 108, cd: 1.8, aggro: 1e6, shot: 'beam' },
  wtank: { team: 'wers', draw: 'car', name: 'Ground car', plural: 'Ground cars', speed: 18, r: 9, mid: 7, top: 19, hp: 260, dmg: 30, range: 118, cd: 2.0, aggro: 1e6, shot: 'beam' },
  turret: { team: 'wers', draw: 'turret', name: 'Turret', plural: 'Turrets', speed: 0, r: 8, mid: 6, top: 13, hp: 160, dmg: 20, range: 124, cd: 2.2, aggro: 124, shot: 'beam' },
  huruga: { team: 'wers', draw: 'wers', boss: true, name: 'Huruga', plural: 'Huruga', speed: 20, r: 6, mid: 8, top: 22, hp: 420, dmg: 36, range: 112, cd: 1.4, aggro: 140, shot: 'beam' },
  arsenal: { team: 'wers', draw: 'arsenal', name: 'Arsenal', plural: 'Arsenals', speed: 0, r: 15, mid: 12, top: 30, hp: 400, dmg: 0, range: 0, cd: 1, aggro: 0 }
};
const units = [], shots = [], fx = [], marks = [];
const sel = new Set();
let phase = 'muster', waveTimer = 0, wavesLeft = 0, shownCount = -1;

const tileOf = (u) => idx(clamp(Math.floor(u.x / T), 0, MW - 1), clamp(Math.floor(u.y / T), 0, MH - 1));
const tilePt = (t) => ({ x: (t % MW) * T + 8, y: ((t / MW) | 0) * T + 8 });
function makeUnit(kind, t) {
  const p = tilePt(t), ty = TYPES[kind];
  return { kind, type: ty, team: ty.team, x: p.x, y: p.y, face: ty.team === 'eng' ? 1 : -1, path: null, pi: 0, moving: false,
    anim: Math.random() * 2, hp: ty.hp, aggro: ty.aggro, cool: 0.3 + Math.random() * 0.6, target: null, order: null, repath: 0, run: 0, hurt: 0 };
}
function spawnWave(n) {
  const s = SHIP_RECT;
  const spots = openTilesNear(idx(s.x + (s.w >> 1), s.y + s.h), n);
  for (const t of spots) units.push(makeUnit('wers', t));
}

function drawUnit(ctx, u, s) {
  const x = Math.round(u.x * s) / s, y = Math.round(u.y * s) / s;
  const ty = u.type, eng = u.team === 'eng';
  const step = u.moving ? Math.floor(u.anim * 8) % 2 : 0;
  const bob = u.moving && step ? -1 : 0;
  const fired = u.cool > ty.cd - 0.15 && ty.dmg > 0;
  const px = (col, a, b, w, h) => { ctx.fillStyle = col; ctx.fillRect(a, b, w, h); };
  ctx.save();
  ctx.translate(x, y);
  if (sel.has(u)) {
    const r = ty.r + 3;
    ctx.beginPath(); ctx.ellipse(0, -1, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(226,178,60,0.22)'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#f2c955'; ctx.stroke();
  }
  ctx.save();
  ctx.scale(u.face, 1);
  const d = ty.draw;
  if (d === 'knight') {
    px('rgba(0,0,0,0.28)', -7, -1, 14, 2);
    const a = step ? 3 : 4, b = step ? 4 : 3;
    px('#3a2a1c', -5, -4, 1, a); px('#3a2a1c', -3, -4, 1, b); px('#3a2a1c', 3, -4, 1, a); px('#3a2a1c', 5, -4, 1, b);
    px('#3a2a1c', -8, -8 + bob, 2, 4);
    px('#7a5233', -6, -9 + bob, 12, 5);
    px('#b8392f', -4, -9 + bob, 8, 4); px('#e2b23c', -4, -6 + bob, 8, 1);
    px('#7a5233', 5, -12 + bob, 3, 5); px('#7a5233', 7, -12 + bob, 4, 3); px('#3a2a1c', 6, -13 + bob, 1, 1);
    px('#ece5d2', -2, -14 + bob, 4, 5); px('#b8392f', -1, -13 + bob, 2, 3);
    px('#c9cdd2', -2, -17 + bob, 4, 3); px('#2a2c33', 0, -16 + bob, 2, 1);
    px('#6b5334', 3, -24 + bob, 1, 16); px('#e2b23c', 4, -24 + bob, 4, 2);
  } else if (d === 'rider') {
    // An Ashenkogh: four legs, an upright trunk, and a long spear.
    px('rgba(0,0,0,0.28)', -7, -1, 14, 2);
    const a = step ? 3 : 4, b = step ? 4 : 3;
    px('#4a3418', -5, -4, 1, a); px('#4a3418', -3, -4, 1, b); px('#4a3418', 3, -4, 1, a); px('#4a3418', 5, -4, 1, b);
    px('#4a3418', -8, -8 + bob, 2, 5);
    px('#b07a3c', -6, -9 + bob, 12, 5); px('#8c5e2a', -6, -6 + bob, 12, 1);
    px('#2f6f8f', -3, -9 + bob, 5, 3);
    px('#b07a3c', 3, -16 + bob, 4, 8); px('#e2b23c', 3, -12 + bob, 4, 1);
    px('#c9955a', 3, -19 + bob, 4, 3); px('#2a2c33', 5, -18 + bob, 1, 1);
    px('#f2e3b0', 4, -21 + bob, 2, 2);
    px('#6b5334', 8, -25 + bob, 1, 19); px('#dfe3e6', 8, -27 + bob, 1, 2); px('#2f6f8f', 9, -24 + bob, 4, 2);
  } else if (d === 'turret') {
    px('rgba(0,0,0,0.3)', -8, -1, 16, 3);
    px('#3a4249', -7, -3, 14, 3);
    px('#59626b', -6, -7, 12, 5);
    px('#8f9aa5', -5, -10, 10, 4); px('#b7c3ce', -3, -11, 6, 2);
    px('#3a4249', 4, -9, 8, 2);
    px(eng ? '#e2b23c' : '#ff5a47', -1, -8, 2, 2);
    if (eng) { px('#3d2b1b', -6, -18, 1, 9); px('#b8392f', -5, -18, 5, 3); }
    if (fired) px('#8ff0e0', 12, -10, 2, 4);
  } else if (d === 'car') {
    px('rgba(0,0,0,0.3)', -10, -1, 20, 3);
    px('#23282e', -9, -4, 18, 4);
    for (let i = -8; i < 9; i += 4) px('#3f464f', i, -3, 2, 2);
    px(eng ? '#7d8792' : '#59626b', -9, -10, 18, 6);
    px(eng ? '#b8392f' : '#8ff0e0', -9, -7, 18, 1);
    px('#9aa3b0', -4, -14, 9, 5); px('#c5cfd9', -3, -14, 6, 1);
    px('#3a4249', 4, -13, 10, 2);
    if (eng) { px('#3d2b1b', -6, -22, 1, 9); px('#b8392f', -5, -22, 5, 3); px('#e2b23c', -4, -21, 2, 1); }
    if (fired) px('#8ff0e0', 14, -14, 2, 4);
  } else if (d === 'arsenal') {
    px('rgba(0,0,0,0.3)', -17, -2, 34, 5);
    px('#59626b', -15, -18, 30, 17);
    px('#8f9aa5', -15, -25, 30, 8); px('#b7c3ce', -12, -24, 24, 2);
    for (let i = 0; i < 5; i++) px(i % 2 ? '#23282e' : '#e2b23c', -15 + i * 6, -16, 6, 3);
    px('#1d2a2c', -4, -11, 8, 10);
    px('#3a4249', 0, -31, 1, 6); px('#ff5a47', -1, -33, 3, 3);
  } else if (d === 'station') {
    px('rgba(0,0,0,0.3)', -14, -2, 28, 5);
    px('#b9b39c', -12, -10, 24, 9); px('#8f8a76', -12, -3, 24, 2);
    px('#e9e2f5', -6, -31, 12, 22); px('#c9c0dd', 3, -31, 3, 22);
    px('#7a4fd0', -6, -18, 12, 2);
    px('#3a5fa8', -3, -27, 2, 5); px('#3a5fa8', 1, -27, 2, 5);
    px('#f2a0d0', -8, -35, 16, 4); px('#e9e2f5', -1, -39, 2, 4);
  } else if (d === 'jair') {
    px('rgba(0,0,0,0.28)', -4, -1, 8, 2);
    px('#3b2f55', -2, -4, 1, step ? 3 : 4); px('#3b2f55', 1, -4, 1, u.moving && !step ? 3 : 4);
    px('#e9e2f5', -3, -12 + bob, 6, 8); px('#7a4fd0', -3, -8 + bob, 6, 1);
    px('#9ad0e8', -2, -16 + bob, 4, 4); px('#2a2c33', 1, -15 + bob, 1, 1);
    px('#f2a0d0', -2, -18 + bob, 4, 2);
    px('#c9cdd2', 3, -10 + bob, 8, 1); px('#c9cdd2', 3, -9 + bob, 1, 2);
    if (fired) px('#d9b8ff', 11, -11 + bob, 2, 3);
  } else if (d === 'wers') {
    if (ty.boss) ctx.scale(1.4, 1.4);
    px('rgba(0,0,0,0.28)', -4, -1, 8, 2);
    px('#1e2430', -2, -3, 1, step ? 2 : 3); px('#1e2430', 1, -3, 1, u.moving && !step ? 2 : 3);
    px('#5b7fd1', -5, -4 + bob, 2, 1); px('#5b7fd1', -6, -3 + bob, 1, 1);
    px(ty.boss ? '#5e1f1c' : '#2c3440', -3, -8 + bob, 6, 5); px(ty.boss ? '#e2b23c' : '#8ff0e0', -3, -5 + bob, 6, 1);
    px('#5b7fd1', -2, -11 + bob, 4, 3); px('#7c9be0', 2, -10 + bob, 2, 2);
    px('#ffe27a', 1, -11 + bob, 1, 1);
    px('#5b7fd1', -2, -12 + bob, 1, 1); px('#5b7fd1', 1, -12 + bob, 1, 1);
    if (ty.boss) px('#e2b23c', -2, -13 + bob, 4, 1);
    px('#c9cdd2', 3, -7 + bob, 4, 1); px('#c9cdd2', 3, -6 + bob, 1, 2);
    if (fired) px('#8ff0e0', 7, -8 + bob, 2, 3);
  } else {
    px('rgba(0,0,0,0.28)', -4, -1, 8, 2);
    px('#2b2a28', -2, -3, 1, step ? 2 : 3); px('#2b2a28', 1, -3, 1, u.moving && !step ? 2 : 3);
    if (u.kind === 'maa') {
      px('#8c2f2a', -3, -8 + bob, 6, 5); px('#5e1f1c', -3, -5 + bob, 6, 1);
      px('#e0b48c', -2, -11 + bob, 4, 3);
      px('#c9cdd2', -2, -12 + bob, 4, 2); px('#c9cdd2', 1, -10 + bob, 1, 1);
      px('#e2b23c', 2, -8 + bob, 3, 4); px('#b8392f', 3, -7 + bob, 1, 2);
      px('#6b5334', -4, -15 + bob, 1, 13); px('#dfe3e6', -4, -17 + bob, 1, 2);
    } else if (u.kind === 'gun') {
      px('#d3c596', -3, -8 + bob, 6, 5); px('#8f8460', -3, -5 + bob, 6, 1);
      px('#e0b48c', -2, -11 + bob, 4, 3);
      px('#2f6b3a', -2, -12 + bob, 4, 2); px('#2f6b3a', -3, -11 + bob, 1, 2);
      px('#c9cdd2', 3, -7 + bob, 4, 1); px('#c9cdd2', 3, -6 + bob, 1, 2); px('#8ff0e0', 4, -8 + bob, 1, 1);
      if (fired) px('#8ff0e0', 7, -8 + bob, 2, 3);
    } else {
      px('#7b5a36', -4, -9 + bob, 1, 4);
      px('#d3c596', -3, -8 + bob, 6, 5); px('#8f8460', -3, -5 + bob, 6, 1);
      px('#e0b48c', -2, -11 + bob, 4, 3);
      px('#2f6b3a', -2, -12 + bob, 4, 2); px('#2f6b3a', -3, -11 + bob, 1, 2);
      px('#5a3d22', 4, -13 + bob, 1, 2); px('#5a3d22', 5, -11 + bob, 1, 6); px('#5a3d22', 4, -5 + bob, 1, 2);
      px('#ece5d2', 4, -11 + bob, 1, 6);
    }
  }
  ctx.restore();
  if (u.hurt > 0) px('rgba(255,255,255,0.5)', -ty.r, -ty.top + 3, ty.r * 2, ty.top - 3);
  // Health bar, shown once a soldier is wounded or selected.
  if (u.hp < ty.hp || sel.has(u)) {
    const w = Math.max(10, ty.r * 2), k = clamp(u.hp / ty.hp, 0, 1), by = -ty.top - 4;
    px('#15191b', -w / 2 - 1, by - 1, w + 2, 4);
    px(!eng ? '#e0503c' : k > 0.5 ? '#6fd24f' : k > 0.25 ? '#e2b23c' : '#e0503c', -w / 2, by, Math.max(1, Math.round(w * k)), 2);
  }
  ctx.restore();
}
