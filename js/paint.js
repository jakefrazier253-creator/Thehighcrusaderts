'use strict';
// Paints a finished map (terrain, trees, buildings, the ship) once, onto an offscreen canvas.

// ---------- Painting a map once, into an offscreen canvas ----------
const THEMES = {
  earth: {
    grass: ['#4c7a3b', '#527f3e', '#487537'], gspeck: ['#3f6a31', '#5d8c47'], flower: ['#e8d96a', '#e3e0ee'],
    fbase: '#3b6230', fspeck: ['#31552a', '#456f37'], trunk: '#3d2c1b', crown: ['#234f25', '#2f6a2e', '#44883c', '#1b3f1e'],
    road: '#8a6a44', rspeck: ['#7a5c3a', '#9b7a52', '#735635'], redge: '#6b5033',
    water: '#2f6d8f', wave: '#4a8cab', bank: '#5c6b3c', foam: '#6fa6bd', paved: false
  },
  tharixan: {
    grass: ['#5b4a70', '#624f78', '#544468'], gspeck: ['#463a5a', '#77628f'], flower: ['#8ff0e0', '#f2a0d0'],
    fbase: '#43375a', fspeck: ['#392e4c', '#544570'], trunk: '#cdbfe0', crown: ['#1c6570', '#27888c', '#5cc7b4', '#134a55'],
    road: '#707784', rspeck: ['#666d79', '#7c8491', '#5f6672'], redge: '#4f5661',
    water: '#2a8a80', wave: '#63c2b2', bank: '#3a3350', foam: '#8fd8cc', paved: true, glow: true
  },
  boda: {
    grass: ['#2f6f66', '#35786e', '#2a655d'], gspeck: ['#245850', '#4a9488'], flower: ['#f2e3b0', '#f2a0d0'],
    fbase: '#27554e', fspeck: ['#1f4640', '#34695f'], trunk: '#3a2418', crown: ['#8a3f2a', '#b5553a', '#e08a5a', '#5e2a1c'],
    road: '#b9b39c', rspeck: ['#aaa48e', '#c7c1ab', '#9f9983'], redge: '#8f8a76',
    water: '#3a5fa8', wave: '#6f8fd0', bank: '#27554e', foam: '#9fb6e6', paved: true
  },
  steppe: {
    grass: ['#9a8446', '#a48d4c', '#8f7a40'], gspeck: ['#7f6c36', '#b9a260'], flower: ['#f2e3b0', '#d96a3a'],
    fbase: '#7a6838', fspeck: ['#69592f', '#8a7742'], trunk: '#3a2a18', crown: ['#4f5a22', '#6b7630', '#93a04a', '#343c16'],
    road: '#7d6a4a', rspeck: ['#6f5d40', '#8c7856', '#66553a'], redge: '#5c4c33',
    water: '#3f7f9f', wave: '#6fb0cc', bank: '#6b5a30', foam: '#9fd0e0', paved: false
  }
};
function paintMap(themeName) {
  const TH = THEMES[themeName] || THEMES.earth;
  const c = document.createElement('canvas');
  c.width = WW; c.height = WH;
  const g = c.getContext('2d');
  const R = mulberry32(77);
  const px = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const speck = (X, Y, cols, n) => {
    for (let i = 0; i < n; i++) px(cols[(R() * cols.length) | 0], X + ((R() * T) | 0), Y + ((R() * T) | 0), 1, 1);
  };
  const ell = (col, x, y, rx, ry) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const tileAt = (x, y) => (inMap(x, y) ? tiles[idx(x, y)] : -1);
  const wet = (x, y) => { const t = tileAt(x, y); return t === -1 || t === WATER || t === FORD || t === BRIDGE; };
  const roady = (x, y) => { const t = tileAt(x, y); return t === -1 || t === ROAD || t === BRIDGE; };

  const grass = (X, Y, x, y) => {
    px(TH.grass[(vnoise(x / 3 + 40, y / 3) * 3) | 0], X, Y, T, T);
    speck(X, Y, TH.gspeck, 4);
    if (R() < 0.05) px(TH.flower[R() < 0.5 ? 0 : 1], X + 2 + ((R() * 12) | 0), Y + 2 + ((R() * 12) | 0), 1, 1);
  };
  const road = (X, Y, x, y) => {
    px(TH.road, X, Y, T, T); speck(X, Y, TH.rspeck, 7);
    if (TH.paved) { px(TH.redge, X, Y, T, 1); px(TH.redge, X, Y, 1, T); return; }
    if (!roady(x, y - 1)) px(TH.redge, X, Y, T, 1);
    if (!roady(x, y + 1)) px(TH.redge, X, Y + T - 1, T, 1);
    if (!roady(x - 1, y)) px(TH.redge, X, Y, 1, T);
    if (!roady(x + 1, y)) px(TH.redge, X + T - 1, Y, 1, T);
  };

  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = tiles[idx(x, y)], X = x * T, Y = y * T;
    if (t === GRASS) grass(X, Y, x, y);
    else if (t === BLDG) { if (TH.paved) road(X, Y, x, y); else grass(X, Y, x, y); }
    else if (t === FOREST) { px(TH.fbase, X, Y, T, T); speck(X, Y, TH.fspeck, 4); }
    else if (t === SCORCH || t === SHIP) { px('#3d3b2d', X, Y, T, T); speck(X, Y, ['#2b2a22', '#565039', '#4a4634'], 7); }
    else if (t === FIELD) {
      px('#c9a545', X, Y, T, T);
      for (let r = 2; r < T; r += 4) px('#a8862f', X, Y + r, T, 1);
      speck(X, Y, ['#dcbb5c', '#b3913a'], 5);
    }
    else if (t === ROAD) road(X, Y, x, y);
    else if (t === WALL) {
      px('#5d6470', X, Y, T, T);
      px('#9aa3b0', X, Y, T, 3); px('#7d8592', X, Y + 3, T, 5); px('#3f454e', X, Y + T - 3, T, 3);
      px('#4a515c', X + 7, Y + 3, 1, 10);
      if (R() < 0.3) px('#8ff0e0', X + 3 + ((R() * 9) | 0), Y + 9, 2, 1);
    }
    else if (t === WATER || t === FORD) {
      px(t === WATER ? TH.water : '#4f8ea6', X, Y, T, T);
      for (let i = 0; i < 2; i++) px(t === WATER ? TH.wave : '#7fb4c6', X + ((R() * 12) | 0), Y + 1 + ((R() * 14) | 0), 3, 1);
      if (t === FORD) for (let i = 0; i < 3; i++) px('#a3a394', X + 1 + ((R() * 12) | 0), Y + 1 + ((R() * 12) | 0), 2, 2);
      if (!wet(x - 1, y)) { px(TH.bank, X, Y, 2, T); px(TH.foam, X + 2, Y, 1, T); }
      if (!wet(x + 1, y)) { px(TH.bank, X + T - 2, Y, 2, T); px(TH.foam, X + T - 3, Y, 1, T); }
      if (!wet(x, y - 1)) px(TH.bank, X, Y, T, 2);
      if (!wet(x, y + 1)) px(TH.bank, X, Y + T - 2, T, 2);
    }
    else if (t === BRIDGE) {
      px('#7b5a36', X, Y, T, T);
      for (let r = 3; r < T; r += 4) px('#5e4428', X + r, Y, 1, T);
      if (tileAt(x, y - 1) !== BRIDGE) px('#3f2c1a', X, Y, T, 2);
      if (tileAt(x, y + 1) !== BRIDGE) px('#3f2c1a', X, Y + T - 2, T, 2);
    }
  }

  // Trees, drawn north to south so nearer crowns overlap farther ones.
  const C = TH.crown;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (tiles[idx(x, y)] !== FOREST) continue;
    const X = x * T + ((R() * 5) | 0) - 2, Y = y * T + ((R() * 3) | 0) - 2;
    px(TH.trunk, X + 7, Y + 11, 2, 5);
    px(C[0], X + 2, Y + 3, 12, 8); px(C[0], X + 4, Y + 1, 8, 12);
    px(C[1], X + 3, Y + 3, 9, 5); px(C[1], X + 5, Y + 2, 6, 1);
    px(C[2], X + 5, Y + 3, 4, 3);
    px(C[3], X + 9, Y + 10, 4, 2);
    if (TH.glow) { px('#bff7ec', X + 4, Y + 7, 1, 1); px('#bff7ec', X + 10, Y + 5, 1, 1); }
  }

  // Buildings.
  for (const b of BUILDINGS) {
    const X = b.x * T, Y = b.y * T;
    if (b.kind === 'cottage') {
      px('rgba(0,0,0,0.25)', X + 2, Y + 29, 30, 3);
      px('#d8c9a3', X + 2, Y + 14, 28, 16);
      px('#5a4028', X + 2, Y + 14, 1, 16); px('#5a4028', X + 15, Y + 14, 1, 16); px('#5a4028', X + 29, Y + 14, 1, 16);
      px('#5a4028', X + 2, Y + 29, 28, 1);
      px('#4a3320', X + 19, Y + 21, 6, 9);
      px('#2a2c33', X + 6, Y + 19, 5, 4);
      px('#b08d45', X, Y + 4, 32, 12);
      for (let r = 6; r < 16; r += 3) px('#94743a', X, Y + r, 32, 1);
      px('#c9a55a', X + 3, Y + 2, 26, 3);
      px('#7d6230', X, Y + 15, 32, 1);
    } else if (b.kind === 'church') {
      px('rgba(0,0,0,0.25)', X + 4, Y + 61, 42, 3);
      px('#a9a79c', X + 4, Y + 28, 40, 34);
      for (let i = 0; i < 26; i++) px('#96948a', X + 5 + ((R() * 37) | 0), Y + 30 + ((R() * 30) | 0), 2, 1);
      px('#5d5f6a', X + 2, Y + 18, 44, 12);
      for (let r = 20; r < 30; r += 3) px('#4c4e58', X + 2, Y + r, 44, 1);
      px('#b9b7ab', X + 16, Y, 16, 32);
      px('#8f8d83', X + 16, Y + 31, 16, 1);
      px('#2a2c33', X + 22, Y + 9, 4, 9);
      for (let i = 0; i < 4; i++) px('#b9b7ab', X + 16 + i * 4 + (i ? 1 : 0), Y - 3, 3, 3);
      px('#e2b23c', X + 23, Y - 11, 2, 9); px('#e2b23c', X + 20, Y - 8, 8, 2);
      px('#4a3320', X + 20, Y + 48, 8, 14);
      px('#2e4a6b', X + 9, Y + 38, 4, 10); px('#2e4a6b', X + 35, Y + 38, 4, 10);
    } else if (b.kind === 'manor') {
      px('rgba(0,0,0,0.25)', X + 2, Y + 61, 78, 3);
      px('#9c9788', X + 2, Y + 12, 76, 50);
      for (let i = 0; i < 60; i++) px('#8a8577', X + 3 + ((R() * 73) | 0), Y + 14 + ((R() * 46) | 0), 3, 1);
      for (let i = 0; i < 9; i++) px('#9c9788', X + 5 + i * 8, Y + 6, 5, 6);
      px('#aaa596', X, Y + 4, 13, 58); px('#aaa596', X + 67, Y + 4, 13, 58);
      for (let i = 0; i < 3; i++) { px('#aaa596', X + i * 5, Y - 1, 3, 5); px('#aaa596', X + 67 + i * 5, Y - 1, 3, 5); }
      px('#2a2c33', X + 5, Y + 18, 2, 8); px('#2a2c33', X + 73, Y + 18, 2, 8);
      px('#2a2c33', X + 22, Y + 24, 3, 8); px('#2a2c33', X + 55, Y + 24, 3, 8);
      px('#3d2b1b', X + 34, Y + 40, 12, 22); px('#57402a', X + 39, Y + 40, 1, 22);
      px('#3d2b1b', X + 39, Y - 12, 1, 18);
      px('#b8392f', X + 40, Y - 12, 9, 6); px('#e2b23c', X + 43, Y - 10, 3, 2);
    } else if (b.kind === 'dome') {
      const cx = X + 32, cy = Y + 36;
      ell('rgba(0,0,0,0.3)', cx, Y + 58, 31, 6);
      px('#4f5861', X + 3, Y + 38, 58, 20);
      ell('#6a747f', cx, cy, 30, 28);
      ell('#8f9aa5', cx - 1, cy - 3, 28, 24);
      ell('#b7c3ce', cx - 6, cy - 12, 14, 9);
      px('#4f5861', X + 3, Y + 44, 58, 2);
      for (let i = 0; i < 6; i++) { px('#1d2a2c', X + 8 + i * 9, Y + 48, 5, 4); px('#8ff0e0', X + 9 + i * 9, Y + 49, 3, 2); }
      px('#1d2a2c', cx - 5, Y + 52, 10, 10);
      px('#3a4249', cx, Y - 4, 1, 14); px('#ff5a47', cx - 1, Y - 6, 3, 3);
    } else if (b.kind === 'hut') {
      px('rgba(0,0,0,0.28)', X + 2, Y + 29, 46, 3);
      px('#59626b', X + 1, Y + 8, 46, 22);
      px('#8f9aa5', X + 1, Y + 4, 46, 12); px('#b7c3ce', X + 4, Y + 5, 40, 3);
      px('#4f5861', X + 1, Y + 16, 46, 1);
      px('#1d2a2c', X + 20, Y + 19, 8, 11);
      px('#8ff0e0', X + 6, Y + 21, 8, 2); px('#8ff0e0', X + 34, Y + 21, 8, 2);
    }
  }

  // The ship.
  if (SHIP_RECT) {
    const s = SHIP_RECT, cx = (s.x + s.w / 2) * T, cy = (s.y + s.h / 2) * T - 2;
    ell('rgba(0,0,0,0.35)', cx, cy + 19, 62, 8);
    px('#59626b', cx - 7, cy + 12, 14, 18);
    for (let r = 16; r < 30; r += 3) px('#444c54', cx - 7, cy + r, 14, 1);
    g.fillStyle = '#6a747f';
    g.beginPath(); g.moveTo(cx - 50, cy - 6); g.lineTo(cx - 64, cy - 20); g.lineTo(cx - 40, cy - 12); g.fill();
    g.beginPath(); g.moveTo(cx - 50, cy + 6); g.lineTo(cx - 64, cy + 18); g.lineTo(cx - 40, cy + 12); g.fill();
    ell('#6a747f', cx, cy, 62, 19);
    ell('#8f9aa5', cx, cy - 2, 61, 16);
    ell('#b7c3ce', cx + 4, cy - 7, 50, 8);
    px('#4f5861', cx - 56, cy + 1, 112, 2);
    for (let i = 0; i < 7; i++) {
      px('#1d2a2c', cx - 37 + i * 12, cy - 6, 5, 4);
      px('#8ff0e0', cx - 36 + i * 12, cy - 5, 3, 2);
    }
    ell('#3a4249', cx + 55, cy, 5, 6);
    ell('#8ff0e0', cx + 56, cy, 2, 3);
    if (themeName !== 'earth') { px('#b8392f', cx - 20, cy - 26, 9, 6); px('#e2b23c', cx - 17, cy - 24, 3, 2); px('#3d2b1b', cx - 21, cy - 26, 1, 14); }
  }
  return c;
}
