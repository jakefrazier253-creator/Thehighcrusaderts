'use strict';
// Saving and resuming progress (on this device, and to the Claude account when run as a Claude artifact).

// ---------- Saving ----------
// Progress is kept in two places: this browser, and (when signed in) the player's own private
// space in the artifact's store, so a campaign started on the laptop can be continued on the phone.
const SAVE_KEY = 'high-crusade-save-v1';
let cloudDoc = null, saveBusy = false, saveDirty = false, latestSave = null, offered = null, savedLocal = false;
function cleanRoster(r) {
  const out = {};
  for (const k of ARMY_KINDS) out[k] = clamp(Math.floor(Number(r && r[k]) || 0), 0, 40);
  return out;
}
function validSave(s) {
  return !!s && s.v === 1 && typeof s.page === 'string' && !!STORY[s.page] && s.page !== 'intro' &&
    Number.isInteger(s.mission) && s.mission >= 0 && s.mission < MISSIONS.length && typeof s.roster === 'object' && typeof s.entry === 'object' &&
    typeof s.spoils === 'number' && typeof s.at === 'number';
}
function readLocal() {
  try { const t = localStorage.getItem(SAVE_KEY); const s = t ? JSON.parse(t) : null; return validSave(s) ? s : null; }
  catch (e) { return null; }
}
async function pushCloud() {
  if (!cloudDoc || !latestSave) return;
  if (saveBusy) { saveDirty = true; return; }
  saveBusy = true;
  try { await cloudDoc.set(latestSave); } catch (e) { cloudDoc = null; }
  saveBusy = false;
  renderSaveNote();
  if (saveDirty) { saveDirty = false; pushCloud(); }
}
function saveGame(pageName) {
  latestSave = { v: 1, page: pageName, mission, roster: cleanRoster(camp.roster), entry: cleanRoster(entryRoster), spoils: camp.spoils, allies: { ...camp.allies }, cars: camp.cars, base: campBase ? { ...campBase } : null, at: Date.now() };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(latestSave)); savedLocal = true; } catch (e) { savedLocal = false; }
  pushCloud();
  renderSaveNote();
}
function resume(s) {
  startMission(s.mission, cleanRoster(s.entry));
  phase = 'won';
  camp.roster = cleanRoster(s.roster);
  camp.spoils = clamp(Math.floor(s.spoils), 0, 99);
  camp.allies = { jair: !!(s.allies && s.allies.jair), ashen: !!(s.allies && s.allies.ashen) };
  camp.cars = !!s.cars;
  camp.note = '';
  const b = s.base;
  campBase = b && STORY[b.page] && STORY[b.page].camp && Number.isInteger(b.mission) && b.mission >= 0 && b.mission < MISSIONS.length
    ? { page: b.page, mission: b.mission, entry: cleanRoster(b.entry), roster: cleanRoster(b.roster), spoils: clamp(Math.floor(Number(b.spoils) || 0), 0, 99), note: '' }
    : null;
  latestSave = s;
  showCouncil(s.page);
}
function renderSaveNote() {
  const el = document.getElementById('c-save');
  el.hidden = !latestSave || page === 'intro';
  el.textContent = cloudDoc ? 'Progress is saved to your account, so you can carry on from another device.'
    : savedLocal ? 'Progress is saved on this device.' : 'Progress could not be saved here.';
}
function renderContinue() {
  const btn = document.getElementById('c-continue');
  btn.hidden = !(page === 'intro' && offered);
  if (btn.hidden) return;
  let men = 0;
  for (const k of ARMY_KINDS) men += cleanRoster(offered.roster)[k];
  btn.textContent = 'Continue: ' + STORY[offered.page].title + ' (' + men + ' men)';
}
offered = readLocal();
(async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const ref = db.doc('data/users/' + uid + '/campaign');
    const snap = await ref.get();
    cloudDoc = ref;
    const s = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null;
    if (latestSave) pushCloud();
    else if (validSave(s) && (!offered || s.at > offered.at)) { offered = s; renderContinue(); }
    else if (offered) { latestSave = offered; await pushCloud(); latestSave = null; }
    renderSaveNote();
  } catch (e) {}
})();
