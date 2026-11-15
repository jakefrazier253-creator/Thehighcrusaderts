'use strict';
// The tourney: an open battle you set up yourself. Choose the opponent, the kind of fight,
// the ground, the odds, and the company you bring. Nothing here touches the campaign.

// ---------- Tourney ----------
const TOURNEY = MISSIONS.length;
const T_KEY = 'high-crusade-tourney-v1';
const T_BUDGET = 40, T_CAP = 28;
const T_COST = { maa: 1, bow: 1, gun: 3, knight: 3, jair: 3, rider: 4, car: 5, sknight: 5 };
const T_NOTE = {
  maa: 'Cheap and steady.', bow: 'Cheap, shoots from a distance.', gun: 'Longer reach, harder hit.', knight: 'A charge hits twice as hard.',
  jair: 'Frail, outshoots everything.', rider: 'Faster and tougher than a knight.', car: 'Slow, armored, big gun.', sknight: 'The realm’s finest. Fast, armored, terrible in a charge.'
};
const T_FOES = {
  wers: { label: 'The Wersgorix', name: 'Wersgorix', inf: 'wers', alt: 'wshield', tank: 'wtank', gun: 'turret', flag: 'wbanner' },
  earth: { label: 'The Earth expedition', name: 'Earthmen', inf: 'rifle', alt: 'drone', tank: 'hover', gun: 'egun', flag: 'ebanner' }
};
const T_MODES = {
  field: { label: 'Open field', note: 'Both companies take the field at once. Last one standing wins.' },
  attack: { label: 'Storm the fort', note: 'They hold a walled fort. Bring down their standard to win.' },
  defend: { label: 'Hold the pavilion', note: 'They come in five companies. Keep the royal pavilion standing.' }
};
const T_GROUNDS = { earth: 'England', tharixan: 'Tharixan', boda: 'The Jair world', steppe: 'The steppe' };
const T_LEVELS = { easy: { label: 'Squire', k: 0.7 }, normal: { label: 'Knight', k: 1 }, hard: { label: 'Baron', k: 1.5 } };
const T_DEFAULT = { foe: 'wers', mode: 'field', ground: 'tharixan', level: 'normal', army: { knight: 3, maa: 8, bow: 4, gun: 3, car: 2 } };
// Enemy numbers at "Knight" odds. Each wave of a defence is one entry.
const T_FORCE = {
  field: { inf: 6, alt: 2, tank: 1 },
  attack: { inf: 6, alt: 2, tank: 1, gun: 3 },
  defend: [{ inf: 3 }, { inf: 4, alt: 1 }, { inf: 4, alt: 1, tank: 1 }, { inf: 4, alt: 2, tank: 1 }, { inf: 5, alt: 2, tank: 1 }]
};
const T_LAYOUT = {
  field: {
    spawn: { x: 12, y: 25 }, lakes: [[36, 8, 6, 3], [38, 41, 7, 3.2]], ox: 210, oy: 30,
    clear: (x, y) => y >= 14 && y <= 35
  },
  attack: {
    spawn: { x: 14, y: 25 }, lakes: [[29, 38, 6, 3.2], [25, 9, 4.5, 2.6]], forts: [GANT_FORT], roads: [[11, 24, 45, 25]], buildings: GANT_BLDG, ox: 50, oy: 20,
    clear: (x, y) => (x <= 17 && y >= 15 && y <= 31) || (y >= 20 && y <= 29) || (x >= 42 && y >= 10 && y <= 38)
  },
  defend: {
    spawn: { x: 45, y: 27 }, lakes: [[15, 12, 6, 3.5], [60, 41, 7, 3.5], [14, 39, 5, 3]], roads: [[40, 19, 56, 31]], ox: 90, oy: 40,
    clear: (x, y) => (x >= 22 && x <= 60 && y >= 14 && y <= 36) || (y >= 23 && y <= 27) || (x >= 46 && x <= 50 && y < 14)
  }
};
let tcfg = JSON.parse(JSON.stringify(T_DEFAULT));

const tScale = (n) => (n > 0 ? Math.max(1, Math.round(n * T_LEVELS[tcfg.level].k)) : 0);
function tList(force) {
  const F = T_FOES[tcfg.foe], out = {};
  for (const role of ['inf', 'alt', 'tank']) if (force[role]) out[F[role]] = tScale(force[role]);
  return out;
}
// Lay out the chosen ground and put the opposing company on it.
function tourneyMap() {
  const F = T_FOES[tcfg.foe];
  buildWorld(T_LAYOUT[tcfg.mode]);
  const placed = [];
  // Big machines are parked two tiles apart so they do not sit on top of each other.
  const put = (kind, n, cx, cy, extra) => {
    const taken = new Set(placed.map((p) => idx(p.x, p.y)));
    const wide = TYPES[kind].r > 8;
    let spots = openTilesNear(idx(cx, cy), wide ? n * 8 + 8 : n, taken);
    if (wide) spots = spots.filter((t) => (t % MW) % 2 === 0 && ((t / MW) | 0) % 2 === 0);
    for (const t of spots.slice(0, n)) placed.push({ kind, x: t % MW, y: (t / MW) | 0, ...extra });
  };
  if (tcfg.mode === 'field') {
    const f = T_FORCE.field;
    put(F.tank, tScale(f.tank), 58, 25); put(F.inf, tScale(f.inf), 61, 25); put(F.alt, tScale(f.alt), 56, 21);
  } else if (tcfg.mode === 'attack') {
    const f = T_FORCE.attack, guns = [[48, 21], [48, 28], [56, 31], [61, 22], [53, 18], [61, 28]];
    placed.push({ kind: F.flag, x: 63, y: 24, goal: true });
    for (const g of guns.slice(0, tScale(f.gun))) placed.push({ kind: F.gun, x: g[0], y: g[1] });
    const inf = tScale(f.inf), half = Math.ceil(inf / 2);
    put(F.inf, half, 51, 24, { aggro: 112 }); put(F.inf, inf - half, 61, 26, { aggro: 112 });
    put(F.alt, tScale(f.alt), 55, 20, { aggro: 112 }); put(F.tank, tScale(f.tank), 54, 27, { aggro: 130 });
  } else {
    placed.push({ kind: 'pavilion', x: 49, y: 24, ward: true });
  }
  FOES = placed;
}
function tourneyMission() {
  const F = T_FOES[tcfg.foe], mode = tcfg.mode;
  const m = { id: 'tourney', tourney: true, theme: tcfg.ground, where: 'The lists, ' + T_GROUNDS[tcfg.ground], spoils: 0, foes: F.name, win: mode === 'attack' ? 'goal' : 'all' };
  if (mode === 'field') {
    m.hint = 'Both companies take the field at once. They are coming straight for you.';
    m.lead = 'Win the field.';
    m.line = (n) => n + (n === 1 ? ' opponent still stands.' : ' opponents still stand.');
  } else if (mode === 'attack') {
    m.hint = 'Their standard flies in the middle of the fort. The gates face west and south.';
    m.lead = 'Take their standard.';
    m.line = () => 'Break into the fort and bring down the standard. You need not beat every defender.';
  } else {
    const from = [W, E, NO, W, E];
    m.ward = true;
    m.waves = T_FORCE.defend.map((f, i) => ({ t: 6 + i * 40, at: from[i], list: tList(f) }));
    m.hint = 'They will come from the west, the east and the north, one company at a time.';
    m.lead = 'Hold the pavilion.';
    m.line = (n, more) => (n ? n + (n === 1 ? ' opponent' : ' opponents') + ' on the field.' : 'The field is quiet.') + (more ? ' More are coming.' : ' This is the last of them.');
  }
  return m;
}
const tArmyCost = () => Object.keys(T_COST).reduce((a, k) => a + (tcfg.army[k] || 0) * T_COST[k], 0);
const tArmySize = () => Object.keys(T_COST).reduce((a, k) => a + (tcfg.army[k] || 0), 0);
function setTourney(cfg) {
  const c = cfg || {}, army = {};
  for (const k of Object.keys(T_COST)) army[k] = clamp(Math.floor(Number(c.army && c.army[k]) || 0), 0, T_CAP);
  tcfg = {
    foe: T_FOES[c.foe] ? c.foe : T_DEFAULT.foe, mode: T_MODES[c.mode] ? c.mode : T_DEFAULT.mode,
    ground: T_GROUNDS[c.ground] ? c.ground : T_DEFAULT.ground, level: T_LEVELS[c.level] ? c.level : T_DEFAULT.level, army
  };
  // A stored company that no longer fits the purse is replaced by the standard one.
  if (tArmyCost() > T_BUDGET || tArmySize() > T_CAP) tcfg.army = { ...T_DEFAULT.army };
  MISSIONS[TOURNEY] = tourneyMission();
}
MAPS[TOURNEY] = tourneyMap;
function startTourney() {
  if (!tArmySize()) return;
  MISSIONS[TOURNEY] = tourneyMission();
  try { localStorage.setItem(T_KEY, JSON.stringify(tcfg)); } catch (e) {}
  listsEl.hidden = true;
  startMission(TOURNEY, tcfg.army);
}
function tourneyEnd(won, standing) {
  setGoal(won ? 'Victory.' : 'Defeat.', won ? 'The day is yours.' : 'The day goes to your opponents.');
  endTitle.textContent = won ? 'The day is yours' : 'Unhorsed';
  endText.textContent = won
    ? 'The heralds award you the field. ' + standing + ' of ' + entrySize + ' of your company are still on their feet, and the losers are asking for ale.'
    : 'The day goes to your opponents. They are being very gracious about it, which is hard to bear.';
  document.getElementById('again').textContent = 'Fight again';
  const back = document.getElementById('back');
  back.textContent = 'Change the setup'; back.hidden = false;
  endEl.hidden = false;
}

// ---------- The setup screen ----------
const listsEl = document.getElementById('lists');
function tSeg(hostId, options, key, labelOf) {
  const host = document.getElementById(hostId);
  host.textContent = '';
  for (const id of Object.keys(options)) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = hostId + '-' + id;
    b.className = 'seg-btn' + (tcfg[key] === id ? ' on' : '');
    b.setAttribute('aria-pressed', tcfg[key] === id ? 'true' : 'false');
    b.textContent = labelOf(options[id]);
    b.addEventListener('click', () => { tcfg[key] = id; renderLists(); });
    host.append(b);
  }
}
function renderLists() {
  tSeg('t-foe', T_FOES, 'foe', (o) => o.label);
  tSeg('t-mode', T_MODES, 'mode', (o) => o.label);
  tSeg('t-ground', T_GROUNDS, 'ground', (o) => o);
  tSeg('t-level', T_LEVELS, 'level', (o) => o.label);
  document.getElementById('t-mode-note').textContent = T_MODES[tcfg.mode].note;
  const left = T_BUDGET - tArmyCost(), size = tArmySize();
  document.getElementById('t-purse').textContent = left + (left === 1 ? ' mark' : ' marks') + ' left of ' + T_BUDGET + '. ' + size + ' of ' + T_CAP + ' places filled.';
  const host = document.getElementById('t-army');
  host.textContent = '';
  for (const k of Object.keys(T_COST)) {
    const n = tcfg.army[k] || 0, row = document.createElement('div');
    row.className = 'pick';
    const name = document.createElement('span'); name.className = 'pick-name';
    const cost = document.createElement('b'); cost.textContent = T_COST[k] + (T_COST[k] === 1 ? ' mark' : ' marks');
    const note = document.createElement('span'); note.className = 'offer-note'; note.textContent = T_NOTE[k];
    name.append(TYPES[k].name + ' ', cost, note);
    const minus = document.createElement('button'), plus = document.createElement('button'), count = document.createElement('span');
    minus.type = plus.type = 'button';
    minus.id = 't-minus-' + k; plus.id = 't-plus-' + k;
    minus.textContent = '−'; plus.textContent = '+';
    minus.setAttribute('aria-label', 'One fewer ' + TYPES[k].name); plus.setAttribute('aria-label', 'One more ' + TYPES[k].name);
    minus.disabled = n === 0; plus.disabled = left < T_COST[k] || size >= T_CAP;
    count.className = 'pick-n'; count.textContent = n;
    minus.addEventListener('click', () => { if (tcfg.army[k] > 0) { tcfg.army[k]--; renderLists(); } });
    plus.addEventListener('click', () => { if (T_BUDGET - tArmyCost() >= T_COST[k] && tArmySize() < T_CAP) { tcfg.army[k] = (tcfg.army[k] || 0) + 1; renderLists(); } });
    row.append(name, minus, count, plus);
    host.append(row);
  }
  document.getElementById('t-start').disabled = size === 0;
}
function showTourney() {
  phase = 'idle';
  councilEl.hidden = true; endEl.hidden = true; toastEl.hidden = true;
  document.getElementById('quit').hidden = true;
  renderLists();
  listsEl.hidden = false;
  listsEl.scrollTop = 0;
}
function leaveTourney() {
  listsEl.hidden = true;
  if (latestSave) offered = latestSave;
  startMission(0);
  showCouncil('intro');
}
document.getElementById('t-start').addEventListener('click', startTourney);
document.getElementById('t-clear').addEventListener('click', () => { for (const k of Object.keys(T_COST)) tcfg.army[k] = 0; renderLists(); });
document.getElementById('t-leave').addEventListener('click', leaveTourney);
document.getElementById('quit').addEventListener('click', showTourney);
{
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(T_KEY)); } catch (e) {}
  setTourney(stored || T_DEFAULT);
}
