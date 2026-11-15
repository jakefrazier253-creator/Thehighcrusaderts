'use strict';
// Mouse, touch and keyboard: selecting, ordering, panning, zooming, and the buttons.

// ---------- Selection and the muster panel ----------
const chipsEl = document.getElementById('chips'), hintEl = document.getElementById('hint');
const clearBtn = document.getElementById('sel-clear'), allBtn = document.getElementById('sel-all');
hintEl.textContent = coarse ? 'Tap a soldier, then tap the ground to march.' : 'Click a soldier, then click the ground to march.';
function refreshHUD() {
  const counts = {};
  let army = 0;
  for (const u of units) if (u.team === 'eng' && u.type.speed) army++;
  for (const u of sel) counts[u.kind] = (counts[u.kind] || 0) + 1;
  chipsEl.textContent = '';
  const kinds = Object.keys(TYPES).filter((k) => counts[k]);
  hintEl.hidden = kinds.length > 0;
  clearBtn.hidden = kinds.length === 0;
  allBtn.hidden = army === 0 || sel.size === army;
  for (const k of kinds) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.id = 'chip-' + k;
    const n = document.createElement('b'); n.textContent = counts[k];
    b.append(n, counts[k] === 1 ? TYPES[k].name : TYPES[k].plural);
    b.title = 'Keep only the ' + TYPES[k].plural.toLowerCase();
    b.addEventListener('click', () => { for (const u of [...sel]) if (u.kind !== k) sel.delete(u); refreshHUD(); });
    chipsEl.append(b);
  }
}
function unitAt(sx, sy, touch) {
  const tol = touch ? Math.max(24, 9 * cam.zoom) : Math.max(11, 7 * cam.zoom);
  let best = null, bd = tol * tol;
  for (const u of units) {
    const p = toScreen(u.x, u.y - u.type.mid), big = Math.max(0, u.type.r - 8) * cam.zoom;
    const d = Math.max(0, Math.hypot(p.x - sx, p.y - sy) - big) ** 2;
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
let lastTap = { t: 0, x: 0, y: 0, kind: null };
function handleTap(sx, sy, touch, shift) {
  const hit = unitAt(sx, sy, touch), now = performance.now();
  if (hit && hit.team !== 'eng') {
    lastTap.t = 0;
    if (sel.size) orderAttack(hit);
    return;
  }
  if (hit && !hit.type.speed) return;
  if (hit) {
    const dbl = now - lastTap.t < 360 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 28 && lastTap.kind === hit.kind;
    if (dbl) {
      sel.clear();
      for (const u of units) {
        if (u.kind !== hit.kind) continue;
        const p = toScreen(u.x, u.y);
        if (p.x >= 0 && p.y >= 0 && p.x <= cssW && p.y <= cssH) sel.add(u);
      }
    } else if (shift) { if (sel.has(hit)) sel.delete(hit); else sel.add(hit); }
    else { sel.clear(); sel.add(hit); }
    lastTap = { t: now, x: sx, y: sy, kind: hit.kind };
    refreshHUD();
  } else {
    lastTap.t = 0;
    if (sel.size) { const w = toWorld(sx, sy); orderMove(w.x, w.y); }
  }
}
function selectBox(b, add) {
  const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
  const inside = units.filter((u) => {
    if (u.team !== 'eng' || !u.type.speed) return false;
    const p = toScreen(u.x, u.y - u.type.mid);
    return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
  });
  if (!inside.length) return;
  if (!add) sel.clear();
  for (const u of inside) sel.add(u);
  refreshHUD();
}

// ---------- Input: one scheme for mouse and touch ----------
const ptrs = new Map();
let lpTimer = 0, pinch = null, panLast = null;
const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

cv.addEventListener('pointerdown', (e) => {
  const p = local(e), mouse = e.pointerType === 'mouse';
  if (mouse && e.button === 2) {
    const foe = unitAt(p.x, p.y, false);
    if (foe && foe.team !== 'eng') { if (sel.size) orderAttack(foe); }
    else { const w = toWorld(p.x, p.y); orderMove(w.x, w.y); }
    return;
  }
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  ptrs.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, mouse });
  if (mouse && e.button === 1) { e.preventDefault(); mode = 'pan'; panLast = p; return; }
  if (ptrs.size === 1) {
    mode = 'maybe';
    if (!mouse) {
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        if (mode === 'maybe' && ptrs.size === 1) { mode = 'box'; box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; }
      }, 380);
    }
  } else if (ptrs.size === 2) {
    clearTimeout(lpTimer); box = null; mode = 'pinch';
    const [a, b] = [...ptrs.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    pinch = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), z0: cam.zoom, w0: toWorld(mx, my) };
  }
});
cv.addEventListener('pointermove', (e) => {
  const p = local(e), t = ptrs.get(e.pointerId);
  if (e.pointerType === 'mouse') hover = p;
  if (!t) return;
  t.x = p.x; t.y = p.y;
  if (mode === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.zoom = clamp((pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d0, ZMIN, ZMAX);
    cam.x = pinch.w0.x - (mx - cssW / 2) / cam.zoom;
    cam.y = pinch.w0.y - (my - cssH / 2) / cam.zoom;
    clampCam();
  } else if (mode === 'maybe') {
    if (Math.hypot(p.x - t.sx, p.y - t.sy) > (t.mouse ? 6 : 10)) {
      clearTimeout(lpTimer);
      if (t.mouse) { mode = 'box'; box = { x0: t.sx, y0: t.sy, x1: p.x, y1: p.y }; }
      else { mode = 'pan'; panLast = p; }
    }
  } else if (mode === 'box' && box) { box.x1 = p.x; box.y1 = p.y; }
  else if (mode === 'pan' && panLast) {
    cam.x -= (p.x - panLast.x) / cam.zoom; cam.y -= (p.y - panLast.y) / cam.zoom;
    panLast = p; clampCam();
  }
});
function endPointer(e, cancelled) {
  const t = ptrs.get(e.pointerId);
  if (!t) return;
  ptrs.delete(e.pointerId);
  clearTimeout(lpTimer);
  if (mode === 'pinch' || mode === 'wait') { mode = ptrs.size ? 'wait' : null; return; }
  if (mode === 'box') { if (box && !cancelled) selectBox(box, e.shiftKey); box = null; }
  else if (mode === 'maybe' && !cancelled) handleTap(t.x, t.y, !t.mouse, e.shiftKey);
  box = null; panLast = null; mode = null;
}
cv.addEventListener('pointerup', (e) => endPointer(e, false));
cv.addEventListener('pointercancel', (e) => endPointer(e, true));
cv.addEventListener('pointerleave', () => { hover = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = local(e);
  zoomAt(p.x, p.y, cam.zoom * Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

const helpEl = document.getElementById('help');
window.addEventListener('keydown', (e) => {
  if (e.key.startsWith('Arrow')) { keys.add(e.key); e.preventDefault(); }
  else if (e.key === 'Escape') { sel.clear(); refreshHUD(); helpEl.hidden = true; }
  else if (e.key === '+' || e.key === '=') zoomAt(cssW / 2, cssH / 2, cam.zoom * 1.25);
  else if (e.key === '-') zoomAt(cssW / 2, cssH / 2, cam.zoom / 1.25);
});
window.addEventListener('keyup', (e) => keys.delete(e.key));
window.addEventListener('blur', () => keys.clear());

// Small map: press or drag to move the view.
function miniMove(e) {
  const r = mini.getBoundingClientRect();
  cam.x = ((e.clientX - r.left) / r.width) * WW;
  cam.y = ((e.clientY - r.top) / r.height) * WH;
  clampCam();
}
mini.addEventListener('pointerdown', (e) => { try { mini.setPointerCapture(e.pointerId); } catch (err) {} miniMove(e); });
mini.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') miniMove(e); });

// Buttons.
document.getElementById('zoom-in').addEventListener('click', () => zoomAt(cssW / 2, cssH / 2, cam.zoom * 1.3));
document.getElementById('zoom-out').addEventListener('click', () => zoomAt(cssW / 2, cssH / 2, cam.zoom / 1.3));
document.getElementById('help-open').addEventListener('click', () => { helpEl.hidden = !helpEl.hidden; });
document.getElementById('help-close').addEventListener('click', () => { helpEl.hidden = true; });
document.getElementById('again').addEventListener('click', () => startMission(mission));
document.getElementById('back').addEventListener('click', () => (MISSIONS[mission].tourney ? showTourney() : backToCouncil()));
allBtn.addEventListener('click', () => { for (const u of units) if (u.team === 'eng' && u.type.speed) sel.add(u); refreshHUD(); });
clearBtn.addEventListener('click', () => { sel.clear(); refreshHUD(); });
