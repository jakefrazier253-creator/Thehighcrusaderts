'use strict';
// The camera: screen size, pan, zoom, and converting between screen and map positions.

// ---------- View ----------
const cv = document.getElementById('view'), ctx = cv.getContext('2d');
const mini = document.getElementById('mini'), mctx = mini.getContext('2d');
const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let mapC = null;
const miniBase = document.createElement('canvas');
miniBase.width = mini.width; miniBase.height = mini.height;
function repaint(theme) {
  mapC = paintMap(theme);
  miniBase.getContext('2d').drawImage(mapC, 0, 0, mini.width, mini.height);
}

let cssW = 1, cssH = 1, dpr = 1;
const cam = { x: SPAWN.x * T + 40, y: SPAWN.y * T, zoom: coarse ? 2.25 : 2.75 };
const ZMIN = 0.8, ZMAX = 5;
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function clampCam() {
  const hw = cssW / cam.zoom / 2, hh = cssH / cam.zoom / 2, m = 48;
  cam.x = WW + 2 * m > 2 * hw ? clamp(cam.x, hw - m, WW - hw + m) : WW / 2;
  cam.y = WH + 2 * m > 2 * hh ? clamp(cam.y, hh - m, WH - hh + m) : WH / 2;
}
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  cssW = Math.max(1, cv.clientWidth); cssH = Math.max(1, cv.clientHeight);
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  clampCam();
}
const toWorld = (sx, sy) => ({ x: cam.x + (sx - cssW / 2) / cam.zoom, y: cam.y + (sy - cssH / 2) / cam.zoom });
const toScreen = (wx, wy) => ({ x: (wx - cam.x) * cam.zoom + cssW / 2, y: (wy - cam.y) * cam.zoom + cssH / 2 });
function zoomAt(sx, sy, z) {
  const w = toWorld(sx, sy);
  cam.zoom = clamp(z, ZMIN, ZMAX);
  cam.x = w.x - (sx - cssW / 2) / cam.zoom;
  cam.y = w.y - (sy - cssH / 2) / cam.zoom;
  clampCam();
}
