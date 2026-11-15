// Loads the game's scripts the way a browser would (one after another, sharing globals),
// with a stand-in for the page, then plays a few frames of every battle and opens every
// council page. It cannot see the screen. It only proves nothing crashes.
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const noop = () => {};
const handlers = {};
function el(id) {
  const base = { id, hidden: false, disabled: false, textContent: '', className: '', width: 300, height: 150, clientWidth: 800, clientHeight: 450, scrollTop: 0, title: '',
    addEventListener(type, fn) { (handlers[id + ':' + type] = handlers[id + ':' + type] || []).push(fn); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 450 }),
    getContext: () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : noop), set: (t, p, v) => { t[p] = v; return true; } }),
    append: noop, setPointerCapture: noop };
  return base;
}
const els = {};
const document = { getElementById: (id) => (els[id] = els[id] || el(id)), createElement: (tag) => el('new-' + tag) };
let raf = null;
const store = {};
const sandbox = { document, console, Math, Date, JSON, Number, Object, Array, Set, Map, Promise, Uint8Array, Uint32Array, Int32Array, Float32Array, Infinity, isNaN,
  performance: { now: () => 0 }, requestAnimationFrame: (f) => { raf = f; }, setTimeout: () => 0, clearTimeout: noop,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
sandbox.window = sandbox;
sandbox.matchMedia = () => ({ matches: false });
sandbox.addEventListener = noop;
sandbox.devicePixelRatio = 2;
vm.createContext(sandbox);
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...index.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
for (const f of order) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
const run = (code) => vm.runInContext(code, sandbox);
let ts = 0;
const frames = (n) => { for (let i = 0; i < n; i++) { ts += 33; raf(ts); } };
frames(5);
run(`for (const p of Object.keys(STORY)) { camp.roster = cleanRoster({ knight: 2, maa: 3, bow: 2, gun: 1, car: 1, jair: 1, rider: 1 }); camp.spoils = 9; camp.cars = true; camp.allies = { jair: true, ashen: true }; showCouncil(p); }`);
for (let n = 0; n < run('MISSIONS.length'); n++) {
  run(`startMission(${n}, { knight: 2, maa: 3, bow: 2, gun: 2, car: 1, jair: 1, rider: 1 }); for (const u of units) if (u.team === 'eng' && u.type.speed) sel.add(u); refreshHUD();`);
  run(`{ const f = units.find((u) => u.team === 'wers'); if (f) orderAttack(f); else if (SHIP_RECT) orderMove(SHIP_RECT.x * 16 + 64, (SHIP_RECT.y + 4) * 16); else orderMove(SPAWN.x * 16 + 48, SPAWN.y * 16); }`);
  frames(900);
  console.log(run('MISSIONS[mission].id').padEnd(10), 'phase', run('phase'), 'units', run('units.length'));
}
for (const key of ['again:click', 'back:click', 'sel-all:click', 'sel-clear:click', 'zoom-in:click', 'help-open:click']) for (const h of handlers[key] || []) h({});
frames(5);
console.log('smoke test passed:', order.length, 'scripts loaded');
