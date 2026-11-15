'use strict';
// The seven battles: goals, enemy waves, and what counts as winning or losing.

// ---------- Missions ----------
const W = [2, 25], E = [69, 25], NO = [48, 2], SO = [56, 45];
const MISSIONS = [
  { id: 'ansby', theme: 'earth', where: 'Ansby, Lincolnshire, Anno Domini 1345', spoils: 4,
    lostTitle: 'The muster is broken', lostText: 'The fire-weapons were too much. Gather your men and strike all at once next time.', wonLine: 'The ship is taken.' },
  { id: 'ganturath', theme: 'tharixan', where: 'Ganturath, on the world Tharixan', spoils: 6, win: 'all',
    lead: 'Storm Ganturath.', line: (n) => n + (n === 1 ? ' defender holds' : ' defenders hold') + ' the fortress. The turrets outreach your bows.',
    lostTitle: 'The assault fails', lostText: 'The turrets cut your men down in the open. Bring them through a gate together, and silence one turret at a time.', wonLine: 'Ganturath is yours.' },
  { id: 'siege', theme: 'tharixan', where: 'Ganturath, besieged', spoils: 7, win: 'all',
    hint: 'They come by the west road and the south gate, one attack at a time. Keep your men inside the walls, near the captured turrets.',
    waves: [{ t: 6, at: W, list: { wers: 4 } }, { t: 45, at: SO, list: { wers: 4, wtank: 1 } }, { t: 85, at: W, list: { wers: 5, wtank: 1 } },
      { t: 125, at: SO, list: { wers: 4, wtank: 1 } }, { t: 165, at: W, list: { wers: 5, wtank: 1 } }],
    lead: 'Hold Ganturath.', line: (n, more) => (n ? n + (n === 1 ? ' Wersgor is' : ' Wersgorix are') + ' at the walls.' : 'The field is quiet.') + (more ? ' More are coming.' : ' This is the last of them.'),
    lostTitle: 'Ganturath falls', lostText: 'The garrison was overrun. Keep your men inside the walls beside the captured turrets, and move them to whichever gate the next attack is coming to.', wonLine: 'The siege is broken.' },
  { id: 'stularax', theme: 'tharixan', where: 'Stularax, on the world Tharixan', spoils: 8, win: 'goal',
    lead: 'Raid Stularax.', line: () => 'Break in and destroy the arsenal at the heart of the fortress. You need not kill every defender.',
    lostTitle: 'The raid is lost', lostText: 'Too many guns. Pick one gate, go through it together, and make straight for the arsenal.', wonLine: 'Stularax burns.' },
  { id: 'jair', theme: 'boda', where: 'A Jair trading tower', spoils: 7, win: 'all', ward: true, reward: { jair: 3 }, ally: 'jair', rewardNote: 'Three Jair marksmen have joined you, and more can be hired.',
    hint: 'The Wersgorix mean to burn the tower. They will come from the west, the east and the north.',
    waves: [{ t: 6, at: W, list: { wers: 4 } }, { t: 46, at: E, list: { wers: 4, wtank: 1 } }, { t: 86, at: NO, list: { wers: 5, wtank: 1 } },
      { t: 126, at: W, list: { wers: 4, wtank: 1 } }, { t: 166, at: E, list: { wers: 5, wtank: 1 } }],
    lead: 'Guard the Jair tower.', line: (n, more) => (n ? n + ' raiders on the field.' : 'The field is quiet.') + (more ? ' More are coming.' : ' This is the last of them.') + ' If the tower falls, so does the alliance.',
    lostTitle: 'The tower is lost', lostText: 'The Jairs will not ally with those who cannot guard a guest-house. Meet each raid well away from the tower.', wonLine: 'The Jairs are with you.' },
  { id: 'ashen', theme: 'steppe', where: 'The Ashenkogh steppe', spoils: 7, win: 'all', reward: { rider: 3 }, ally: 'ashen', rewardNote: 'Three Ashenkogh riders have joined you, and more can be called.',
    hint: 'The clans are watching from the hills. Break the Wersgor laager and they will ride with you.',
    lead: 'Break the laager.', line: (n) => n + ' of the enemy remain. Their ground cars hit hard, so close with them quickly.',
    lostTitle: 'The clans ride away', lostText: 'The ground cars broke your charge. Draw them out a few at a time, or bring guns that can answer them.', wonLine: 'The Ashenkoghli are with you.' },
  { id: 'finale', theme: 'tharixan', where: 'The governor’s citadel, Tharixan', spoils: 0, win: 'goal',
    hint: 'Governor Huruga waits in the inner keep. Its only gate faces west.',
    lead: 'Take the citadel.', line: () => 'Cut your way to the inner keep and bring down Governor Huruga.',
    lostTitle: 'The citadel holds', lostText: 'Two walls and a great many guns. Take the outer yard a piece at a time before you try the keep.', wonLine: 'Tharixan is yours.' }
];
const ARMY_KINDS = ['knight', 'maa', 'bow', 'gun', 'car', 'jair', 'rider'];
const ANSBY_ROSTER = { knight: 4, maa: 6, bow: 6 };
let mission = 0, entryRoster = { ...ANSBY_ROSTER }, entrySize = 16, clock = 0, waveQ = [];
const goalEl = document.getElementById('goal'), toastEl = document.getElementById('toast'), whereEl = document.getElementById('where');
const endEl = document.getElementById('end'), endTitle = document.getElementById('end-title'), endText = document.getElementById('end-text');
let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 5500);
}
function setGoal(lead, rest) {
  goalEl.textContent = '';
  const b = document.createElement('b'); b.textContent = lead;
  goalEl.append(b, ' ' + rest);
}
function spawnAt(x, y, list) {
  const kinds = [];
  for (const k of Object.keys(list)) for (let i = 0; i < list[k]; i++) kinds.push(k);
  const spots = openTilesNear(idx(x, y), kinds.length);
  kinds.forEach((k, i) => { if (spots[i] !== undefined) units.push(makeUnit(k, spots[i])); });
}
// Start battle n. Pass a roster to enter with it; leave it out to replay with the same men as before.
function startMission(n, roster) {
  const m = MISSIONS[n];
  mission = n;
  if (n === 0) { entryRoster = { ...ANSBY_ROSTER }; camp.spoils = 0; camp.allies = { jair: false, ashen: false }; camp.cars = false; camp.note = ''; campBase = null; }
  else if (roster) entryRoster = { ...roster };
  MAPS[n]();
  repaint(m.theme);
  units.length = 0; shots.length = 0; fx.length = 0; marks.length = 0; sel.clear();
  wavesLeft = 0; shownCount = -1; clock = 0;
  waveQ = (m.waves || []).slice();
  const list = [];
  for (const k of ARMY_KINDS) for (let i = 0; i < (entryRoster[k] || 0); i++) list.push(k);
  entrySize = list.length;
  const spots = openTilesNear(idx(SPAWN.x, SPAWN.y), list.length);
  list.forEach((kind, i) => { if (spots[i] !== undefined) units.push(makeUnit(kind, spots[i])); });
  for (const f of FOES) {
    const u = makeUnit(f.kind, idx(f.x, f.y));
    if (f.aggro) u.aggro = f.aggro;
    if (f.goal) u.goal = true;
    if (f.leash) { u.leash = f.leash; u.hx = u.x; u.hy = u.y; }
    if (f.ward) u.ward = true;
    units.push(u);
  }
  whereEl.textContent = m.where;
  if (n === 0) { phase = 'muster'; setGoal('Muster.', 'A strange ship has landed in the east meadow. March your men to it.'); }
  else phase = 'ambush';
  endEl.hidden = true; toastEl.hidden = true; councilEl.hidden = true;
  if (m.hint) toast(m.hint);
  cam.x = SPAWN.x * T + 40; cam.y = SPAWN.y * T;
  clampCam();
  refreshHUD();
}
function endMission(won, standing) {
  const m = MISSIONS[mission];
  phase = won ? 'won' : 'lost';
  waveQ = [];
  for (const u of units) { u.target = null; u.path = null; u.order = null; }
  if (!won) {
    setGoal('Defeat.', m.lostTitle + '.');
    endTitle.textContent = m.lostTitle;
    endText.textContent = m.lostText;
    document.getElementById('back').hidden = !(campBase && mission > 0);
    endEl.hidden = false;
    return;
  }
  setGoal('Victory.', m.wonLine);
  // Survivors carry over to the council, along with what was captured and any allies won.
  const r = {};
  for (const k of ARMY_KINDS) r[k] = 0;
  for (const u of units) if (u.team === 'eng' && r[u.kind] !== undefined) r[u.kind]++;
  // Half of those who fell were only wounded, and are back in the ranks by the next council.
  let back = 0;
  for (const k of ARMY_KINDS) {
    const n = Math.floor(Math.max(0, (entryRoster[k] || 0) - r[k]) / 2);
    r[k] += n; back += n;
  }
  camp.note = (back ? back + (back === 1 ? ' wounded man is' : ' wounded men are') + ' back on their feet. ' : '') + (m.rewardNote || '');
  for (const k of Object.keys(m.reward || {})) r[k] += m.reward[k];
  camp.roster = r;
  if (m.ally) camp.allies[m.ally] = true;
  if (mission >= 1) camp.cars = true;
  camp.spoils += m.spoils + Math.floor(standing / 4);
  campBase = { page: m.id, mission, entry: { ...entryRoster }, roster: { ...camp.roster }, spoils: camp.spoils, note: camp.note };
  sel.clear(); refreshHUD();
  showCouncil(m.id);
  saveGame(m.id);
}
function runMission(dt) {
  const m = MISSIONS[mission];
  clock += dt;
  while (phase === 'ambush' && waveQ.length && waveQ[0].t <= clock) {
    const w = waveQ.shift();
    spawnAt(w.at[0], w.at[1], w.list);
    toast(w.at === W ? 'Wersgorix on the west road.' : w.at === E ? 'Wersgorix from the east.' : w.at === NO ? 'Wersgorix from the north.' : 'Wersgorix at the south gate.');
  }
  let eng = 0, foe = 0, goalUp = false, wardUp = false;
  for (const u of units) {
    if (u.team === 'eng') { if (u.type.speed) eng++; if (u.ward) wardUp = true; }
    else { foe++; if (u.goal) goalUp = true; }
  }
  if (phase === 'muster') {
    const s = SHIP_RECT, x0 = s.x * T, y0 = s.y * T, x1 = (s.x + s.w) * T, y1 = (s.y + s.h) * T;
    for (const u of units) {
      const dx = u.x - clamp(u.x, x0, x1), dy = u.y - clamp(u.y, y0, y1);
      if (dx * dx + dy * dy < 72 * 72) {
        phase = 'ambush'; spawnWave(4); wavesLeft = 1; waveTimer = 7;
        toast('The hatch opens. Wersgorix!');
        return;
      }
    }
    return;
  }
  if (phase !== 'ambush') return;
  if (wavesLeft > 0) {
    waveTimer -= dt;
    if (waveTimer <= 0) { spawnWave(3); wavesLeft--; foe += 3; toast('More of them come down the ramp.'); }
  }
  const more = waveQ.length > 0 || wavesLeft > 0;
  const key = foe * 2 + (more ? 1 : 0);
  if (key !== shownCount) {
    shownCount = key;
    if (mission === 0) setGoal('Ambush.', foe + (foe === 1 ? ' Wersgor stands' : ' Wersgorix stand') + ' against you. ' + (coarse ? 'Tap' : 'Click') + ' one to attack it.');
    else setGoal(m.lead, m.line(foe, more));
  }
  if (eng === 0 || (m.ward && !wardUp)) endMission(false, 0);
  else if (m.win === 'goal' ? !goalUp : (foe === 0 && !more)) endMission(true, eng);
}
