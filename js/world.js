'use strict';
// The world: map constants, the seven battlefields, and pathfinding. No drawing or browser code in here.

// ---------- World constants ----------
const T = 16, MW = 72, MH = 48, WW = MW * T, WH = MH * T, N = MW * MH;
const GRASS = 0, FOREST = 1, WATER = 2, ROAD = 3, BRIDGE = 4, FORD = 5, FIELD = 6, BLDG = 7, SHIP = 8, SCORCH = 9, WALL = 10;
// Movement cost per tile type. 0 means impassable.
const COST = [1, 0, 0, 0.75, 0.75, 2.2, 1.35, 0, 0, 1, 0];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function h2(x, y) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + 1345) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ---------- Maps ----------
const tiles = new Uint8Array(N);
const idx = (x, y) => y * MW + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
let BUILDINGS = [], SHIP_RECT = null, SPAWN = null, FOES = [];

// A landed ship and the ground it scorched coming down.
function placeShip(s) {
  SHIP_RECT = s;
  for (let y = s.y - 2; y < s.y + s.h + 2; y++) for (let x = s.x - 2; x < s.x + s.w + 2; x++) {
    if (!inMap(x, y)) continue;
    const inside = x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
    const corner = (x < s.x - 1 || x > s.x + s.w) && (y < s.y - 1 || y > s.y + s.h);
    if (inside) tiles[idx(x, y)] = SHIP;
    else if (!corner && tiles[idx(x, y)] === GRASS) tiles[idx(x, y)] = SCORCH;
  }
}
function nearRoad(x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!inMap(x + dx, y + dy)) continue;
    const t = tiles[idx(x + dx, y + dy)];
    if (t === ROAD || t === BRIDGE || t === FORD) return true;
  }
  return false;
}
// Woodland on open ground, wherever `clear` does not forbid it.
function growForest(clear, ox, oy) {
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (tiles[idx(x, y)] !== GRASS || clear(x, y) || nearRoad(x, y)) continue;
    if (vnoise(x / 6 + ox, y / 6 + oy) > 0.56) tiles[idx(x, y)] = FOREST;
  }
}
// Close off any pocket of open ground the army could never reach.
function sealPockets() {
  const seen = new Uint8Array(N), q = [idx(SPAWN.x, SPAWN.y)];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % MW, cy = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inMap(nx, ny)) continue;
      const n = idx(nx, ny);
      if (seen[n] || !COST[tiles[n]]) continue;
      seen[n] = 1; q.push(n);
    }
  }
  for (let i = 0; i < N; i++) if (COST[tiles[i]] && !seen[i]) tiles[i] = FOREST;
}
function setBuildings(list) {
  BUILDINGS = list;
  for (const b of list)
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) tiles[idx(x, y)] = BLDG;
}

// Battle one: the village of Ansby and the east meadow.
const riverX = (y) => Math.round(31 + 3.2 * Math.sin(y / 6.5) + 1.6 * Math.sin(y / 2.6 + 1));
const roadY = (x) => Math.round(24 + 1.5 * Math.sin(x / 9));
function buildAnsby() {
  tiles.fill(GRASS);
  SPAWN = { x: 16, y: 24 };
  FOES = [];
  for (let y = 0; y < MH; y++) {
    const cx = riverX(y);
    for (let d = -1; d <= 1; d++) if (inMap(cx + d, y)) tiles[idx(cx + d, y)] = WATER;
  }
  for (let x = 0; x < MW; x++) {
    const y = roadY(x);
    for (let d = 0; d <= 1; d++) {
      const i = idx(x, y + d);
      tiles[i] = tiles[i] === WATER ? BRIDGE : ROAD;
    }
  }
  for (let y = 39; y <= 40; y++)
    for (let x = 0; x < MW; x++) if (tiles[idx(x, y)] === WATER) tiles[idx(x, y)] = FORD;
  for (let y = 11; y < roadY(13); y++) if (tiles[idx(13, y)] === GRASS) tiles[idx(13, y)] = ROAD;
  const field = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (tiles[idx(x, y)] === GRASS) tiles[idx(x, y)] = FIELD;
  };
  field(5, 33, 12, 37); field(15, 33, 23, 36);
  setBuildings([
    { kind: 'manor', x: 11, y: 7, w: 5, h: 4 },
    { kind: 'church', x: 19, y: 19, w: 3, h: 4 },
    { kind: 'cottage', x: 6, y: 21, w: 2, h: 2 },
    { kind: 'cottage', x: 9, y: 21, w: 2, h: 2 },
    { kind: 'cottage', x: 16, y: 21, w: 2, h: 2 },
    { kind: 'cottage', x: 23, y: 21, w: 2, h: 2 },
    { kind: 'cottage', x: 7, y: 29, w: 2, h: 2 },
    { kind: 'cottage', x: 10, y: 29, w: 2, h: 2 },
    { kind: 'cottage', x: 14, y: 29, w: 2, h: 2 },
    { kind: 'cottage', x: 18, y: 29, w: 2, h: 2 },
    { kind: 'cottage', x: 22, y: 29, w: 2, h: 2 }
  ]);
  placeShip({ x: 52, y: 17, w: 8, h: 3 });
  growForest((x, y) => (x >= 3 && x <= 26 && y >= 4 && y <= 41) || (x >= 46 && x <= 66 && y >= 11 && y <= 26), 0, 0);
  sealPockets();
}

// Every battle after Ansby is laid out from a short description.
function lake(cx, cy, rx, ry) {
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) tiles[idx(x, y)] = WATER;
}
function buildWorld(o) {
  tiles.fill(GRASS);
  SPAWN = o.spawn; SHIP_RECT = null;
  for (const l of o.lakes || []) lake(l[0], l[1], l[2], l[3]);
  // A fort is a walled, paved yard. Gates are gaps in the wall.
  for (const f of o.forts || []) {
    for (let y = f.y0; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++)
      tiles[idx(x, y)] = (x === f.x0 || x === f.x1 || y === f.y0 || y === f.y1) ? WALL : ROAD;
    for (const g of f.gates) for (let y = g[1]; y < g[1] + g[3]; y++) for (let x = g[0]; x < g[0] + g[2]; x++) tiles[idx(x, y)] = ROAD;
  }
  for (const r of o.roads || []) for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++)
    if (inMap(x, y) && tiles[idx(x, y)] === GRASS) tiles[idx(x, y)] = ROAD;
  setBuildings(o.buildings || []);
  if (o.ship) placeShip(o.ship);
  growForest(o.clear, o.ox, o.oy);
  sealPockets();
  FOES = o.placed || [];
}
const hold = (kind, aggro, spots) => spots.map((p) => ({ kind, x: p[0], y: p[1], aggro }));
const GANT_FORT = { x0: 46, y0: 14, x1: 66, y1: 34, gates: [[46, 23, 1, 4], [55, 34, 3, 1]] };
const GANT_BLDG = [
  { kind: 'dome', x: 57, y: 22, w: 4, h: 4 }, { kind: 'hut', x: 50, y: 16, w: 3, h: 2 }, { kind: 'hut', x: 60, y: 16, w: 3, h: 2 },
  { kind: 'hut', x: 50, y: 31, w: 3, h: 2 }, { kind: 'hut', x: 61, y: 30, w: 3, h: 2 }
];
const WORLDS = {
  ganturath: {
    spawn: { x: 14, y: 27 }, lakes: [[29, 38, 6, 3.2], [25, 9, 4.5, 2.6]], forts: [GANT_FORT], roads: [[11, 24, 45, 25]],
    buildings: GANT_BLDG, ship: { x: 3, y: 21, w: 8, h: 3 }, ox: 50, oy: 20,
    clear: (x, y) => (x <= 17 && y >= 15 && y <= 31) || (y >= 20 && y <= 29) || (x >= 42 && y >= 10 && y <= 38),
    placed: [
      ...hold('turret', 0, [[48, 21], [48, 28], [56, 31]]),
      ...hold('wers', 112, [[50, 24], [50, 25], [54, 19], [55, 19], [54, 29], [55, 29], [62, 21], [63, 27]])
    ]
  },
  siege: {
    spawn: { x: 53, y: 25 }, lakes: [[29, 38, 6, 3.2], [25, 9, 4.5, 2.6]], forts: [GANT_FORT], roads: [[0, 24, 45, 25], [55, 35, 57, 47]],
    buildings: GANT_BLDG, ox: 50, oy: 20,
    clear: (x, y) => (y >= 20 && y <= 29) || (x >= 42 && y >= 10 && y <= 38),
    placed: hold('cturret', 0, [[48, 21], [48, 28], [53, 31], [59, 31]])
  },
  stularax: {
    spawn: { x: 9, y: 10 }, lakes: [[20, 33, 6, 4], [25, 14, 4, 2.5]],
    forts: [{ x0: 34, y0: 12, x1: 68, y1: 40, gates: [[34, 25, 1, 3], [50, 12, 3, 1], [50, 40, 3, 1]] }],
    roads: [[12, 9, 13, 27], [12, 26, 33, 27]],
    buildings: [{ kind: 'dome', x: 46, y: 24, w: 4, h: 4 }, { kind: 'hut', x: 40, y: 16, w: 3, h: 2 }, { kind: 'hut', x: 40, y: 34, w: 3, h: 2 },
      { kind: 'hut', x: 56, y: 16, w: 3, h: 2 }, { kind: 'hut', x: 56, y: 34, w: 3, h: 2 }],
    ship: { x: 3, y: 4, w: 8, h: 3 }, ox: 10, oy: 70,
    clear: (x, y) => (x <= 18 && y <= 14) || (x >= 31 && y >= 9 && y <= 43),
    placed: [
      { kind: 'arsenal', x: 62, y: 26, goal: true },
      ...hold('turret', 0, [[36, 22], [49, 15], [49, 37]]),
      ...hold('wers', 112, [[38, 25], [38, 27], [44, 20], [44, 32], [58, 24], [58, 28]]),
      ...hold('wtank', 130, [[54, 26]])
    ]
  },
  jair: {
    spawn: { x: 44, y: 27 }, lakes: [[15, 12, 6, 3.5], [60, 41, 7, 3.5], [14, 39, 5, 3]], roads: [[40, 19, 56, 31]],
    buildings: [{ kind: 'hut', x: 43, y: 20, w: 3, h: 2 }, { kind: 'hut', x: 52, y: 29, w: 3, h: 2 }],
    ship: { x: 28, y: 20, w: 8, h: 3 }, ox: 90, oy: 40,
    clear: (x, y) => (x >= 22 && x <= 60 && y >= 14 && y <= 36) || (y >= 23 && y <= 27) || (x >= 46 && x <= 50 && y < 14),
    placed: [{ kind: 'station', x: 49, y: 24, ward: true }]
  },
  ashen: {
    spawn: { x: 9, y: 25 }, lakes: [[30, 10, 7, 3], [34, 39, 6, 3]],
    buildings: [{ kind: 'hut', x: 63, y: 19, w: 3, h: 2 }, { kind: 'hut', x: 63, y: 29, w: 3, h: 2 }],
    ship: { x: 2, y: 19, w: 8, h: 3 }, ox: 130, oy: 10,
    clear: (x, y) => (x <= 15 && y >= 14 && y <= 32) || (x >= 46 && x <= 68 && y >= 14 && y <= 35) || (y >= 22 && y <= 27),
    placed: [
      ...hold('wtank', 135, [[54, 22], [54, 27]]),
      ...hold('wers', 112, [[56, 20], [56, 29], [61, 24], [61, 25]])
    ]
  },
  finale: {
    spawn: { x: 9, y: 26 }, lakes: [[18, 8, 5, 3], [20, 41, 6, 3]],
    forts: [{ x0: 30, y0: 8, x1: 69, y1: 40, gates: [[30, 23, 1, 4], [48, 8, 3, 1], [48, 40, 3, 1]] },
      { x0: 52, y0: 17, x1: 64, y1: 31, gates: [[52, 23, 1, 3]] }],
    roads: [[11, 24, 29, 25]],
    buildings: [{ kind: 'hut', x: 36, y: 12, w: 3, h: 2 }, { kind: 'hut', x: 36, y: 35, w: 3, h: 2 }, { kind: 'hut', x: 43, y: 12, w: 3, h: 2 },
      { kind: 'hut', x: 43, y: 35, w: 3, h: 2 }, { kind: 'hut', x: 58, y: 11, w: 3, h: 2 }, { kind: 'hut', x: 58, y: 36, w: 3, h: 2 },
      { kind: 'dome', x: 58, y: 19, w: 4, h: 4 }],
    ship: { x: 2, y: 20, w: 8, h: 3 }, ox: 170, oy: 90,
    clear: (x, y) => (x <= 15 && y >= 15 && y <= 33) || (x >= 27 && y >= 5 && y <= 43) || (y >= 22 && y <= 27),
    placed: [
      { kind: 'huruga', x: 59, y: 26, goal: true, aggro: 140, leash: 110 },
      ...hold('turret', 0, [[32, 20], [32, 29], [47, 10], [47, 38], [50, 21], [50, 27]]),
      ...hold('wers', 112, [[34, 24], [34, 25], [40, 18], [40, 30], [46, 22], [46, 27], [42, 24], [50, 14], [50, 34], [55, 24], [56, 24], [57, 27], [61, 24], [62, 28]]),
      ...hold('wtank', 130, [[38, 24], [45, 24], [54, 26]])
    ]
  }
};
const MAPS = [buildAnsby, ...['ganturath', 'siege', 'stularax', 'jair', 'ashen', 'finale'].map((k) => () => buildWorld(WORLDS[k]))];
MAPS[0]();

// ---------- Pathfinding (A* on the tile grid) ----------
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];
const gS = new Float32Array(N), fS = new Float32Array(N), cameFrom = new Int32Array(N);
const stamp = new Uint32Array(N), closedAt = new Uint32Array(N);
let curStamp = 0;

function findPath(s, t) {
  if (s === t) return [];
  if (!COST[tiles[t]]) return null;
  curStamp++;
  const heap = [];
  const push = (n) => {
    heap.push(n);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fS[heap[p]] <= fS[heap[i]]) break;
      const tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp; i = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && fS[heap[l]] < fS[heap[m]]) m = l;
        if (r < heap.length && fS[heap[r]] < fS[heap[m]]) m = r;
        if (m === i) break;
        const tmp = heap[m]; heap[m] = heap[i]; heap[i] = tmp; i = m;
      }
    }
    return top;
  };
  const tx = t % MW, ty = (t / MW) | 0;
  const est = (n) => {
    const dx = Math.abs((n % MW) - tx), dy = Math.abs(((n / MW) | 0) - ty);
    return 0.75 * (Math.max(dx, dy) + 0.4142 * Math.min(dx, dy));
  };
  gS[s] = 0; fS[s] = est(s); cameFrom[s] = -1; stamp[s] = curStamp; push(s);
  let found = false;
  while (heap.length) {
    const c = pop();
    if (c === t) { found = true; break; }
    if (closedAt[c] === curStamp) continue;
    closedAt[c] = curStamp;
    const cx = c % MW, cy = (c / MW) | 0;
    for (let i = 0; i < 8; i++) {
      const nx = cx + DX[i], ny = cy + DY[i];
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const n = ny * MW + nx, cost = COST[tiles[n]];
      if (!cost || closedAt[n] === curStamp) continue;
      // No cutting corners past trees or walls.
      if (i >= 4 && (!COST[tiles[cy * MW + nx]] || !COST[tiles[ny * MW + cx]])) continue;
      const ng = gS[c] + cost * (i >= 4 ? 1.4142 : 1);
      if (stamp[n] !== curStamp || ng < gS[n]) {
        stamp[n] = curStamp; gS[n] = ng; fS[n] = ng + est(n); cameFrom[n] = c; push(n);
      }
    }
  }
  if (!found) return null;
  const out = [];
  for (let c = t; c !== s && c !== -1; c = cameFrom[c]) out.push(c);
  return out.reverse();
}

// The nearest `count` open tiles to a starting tile, spreading outward.
function openTilesNear(start, count, skip) {
  const seen = new Uint8Array(N), q = [start], out = [];
  let open = false;
  seen[start] = 1;
  for (let h = 0; h < q.length && out.length < count; h++) {
    const c = q[h], cx = c % MW, cy = (c / MW) | 0;
    if (COST[tiles[c]]) { open = true; if (!skip || !skip.has(c)) out.push(c); }
    for (let i = 0; i < 4; i++) {
      const nx = cx + DX[i], ny = cy + DY[i];
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const n = ny * MW + nx;
      if (seen[n]) continue;
      // Spread through open ground only, once we are standing on open ground.
      if (open && !COST[tiles[n]]) continue;
      seen[n] = 1; q.push(n);
    }
  }
  return out;
}
