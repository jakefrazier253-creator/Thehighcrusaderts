'use strict';
// The council between battles: story pages, the muster roll, spending spoils, and the ally choice.

// ---------- Campaign: the council between battles ----------
const camp = { roster: {}, spoils: 0, allies: { jair: false, ashen: false }, cars: false, note: '' };
const ARMY_CAP = 28;
// The council as it stood when it first opened after the last victory, before anything was bought.
// A defeat can return here so the spoils can be spent differently.
let campBase = null;
function backToCouncil() {
  if (!campBase) return;
  mission = campBase.mission;
  entryRoster = { ...campBase.entry };
  camp.roster = { ...campBase.roster };
  camp.spoils = campBase.spoils;
  camp.note = campBase.note || '';
  phase = 'won';
  endEl.hidden = true;
  showCouncil(campBase.page);
  saveGame(campBase.page);
}
const armySize = () => ARMY_KINDS.reduce((a, k) => a + (camp.roster[k] || 0), 0);
const OFFERS = [
  { id: 'maa', cost: 1, label: 'Recruit a man-at-arms', note: 'A village lad with a spear and a borrowed helm.', buy: () => { camp.roster.maa++; } },
  { id: 'bow', cost: 1, label: 'Recruit a longbowman', note: 'Every yeoman of Ansby can draw a bow.', buy: () => { camp.roster.bow++; } },
  { id: 'knight', cost: 3, label: 'Horse and arm a knight', note: 'Costly, but nothing breaks a line like a charge.', buy: () => { camp.roster.knight++; } },
  { id: 'gun', cost: 2, label: 'Give a longbowman a blaster', note: 'He trades his bow for a captured fire-weapon. Longer reach, harder hit.', can: () => camp.roster.bow > 0, buy: () => { camp.roster.bow--; camp.roster.gun++; } },
  { id: 'car', cost: 4, label: 'Crew a captured ground car', note: 'Slow and very hard to kill, with a gun that answers a turret.', show: () => camp.cars, buy: () => { camp.roster.car++; } },
  { id: 'jair', cost: 2, label: 'Hire a Jair marksman', note: 'Frail, but outshoots everything on the field.', show: () => camp.allies.jair, buy: () => { camp.roster.jair++; } },
  { id: 'rider', cost: 3, label: 'Call an Ashenkogh rider', note: 'Faster than a knight and harder to stop.', show: () => camp.allies.ashen, buy: () => { camp.roster.rider++; } }
];
const march = (n) => () => startMission(n, camp.roster);
const afterAlly = () => {
  if (camp.allies.jair && camp.allies.ashen) startMission(6, camp.roster);
  else startMission(camp.allies.jair ? 5 : 4, camp.roster);
};
const afterAllyLabel = () => (camp.allies.jair && camp.allies.ashen ? 'March on the citadel' : camp.allies.jair ? 'Ride to the Ashenkoghli' : 'Sail to the Jairs');
const STORY = {
  intro: {
    title: 'The ship at Ansby',
    text: [
      'I, Brother Parvus, a poor friar of Ansby, set this down at my lord’s bidding, and beg the reader’s patience for a clerk who was never meant to chronicle wars, still less wars of this kind.',
      'In the year of grace 1345, Sir Roger, Baron de Tourneville, mustered his free companions in our village to follow King Edward into France. There were knights who had pawned their manors for a warhorse, yeomen who could split a willow wand at two hundred paces, and a great many men whose chief skill lay in drinking the baron’s ale. Ansby had not been so crowded, nor so loud, in living memory.',
      'Then, one fair morning, a ship came down out of a clear sky. It was a cylinder of bright metal, longer than our abbey church, and it settled in the east meadow as lightly as a goose upon a pond. Some called it a miracle and some a French trick. A door opened in its side. My lord, who has never in his life waited to be attacked, called for his horse.'
    ],
    next: 'To arms', go: () => { councilEl.hidden = true; },
    alt: 'The tourney (open battle)', altGo: () => showTourney()
  },
  ansby: {
    title: 'After the ambush', camp: true,
    text: [
      'It was over before I had finished my paternoster. The creatures that came down the gangway stood no taller than a boy. They were blue of skin, they had tails, and they carried rods that spat white fire. That was their whole plan of battle, and it was not enough. I think that in their long ages of slaying from afar they had forgotten that an enemy may simply decline to stand still and be slain.',
      'One of the crew we took alive. He gives his name as Branithar and his people as the Wersgorix, and by signs and drawings he has let us know that they came to spy out our Earth as a place to conquer and settle. He seems astonished to find himself the conquered one. I have been set to learn his tongue, God help me, and he mine.',
      'My lord has walked the length of the ship and pronounced it sound. He does not see a marvel. He sees a transport that needs no wind, one that could set his whole company down in France in an afternoon and in the Holy Land the week after. So that no man need leave his family behind, all Ansby is to go aboard: wives, children, cattle, pigs, and the abbey’s one good bell. Branithar has agreed to work the helm. He agreed very quickly.'
    ],
    next: 'Board the ship', go: () => { showCouncil('voyage'); saveGame('voyage'); }
  },
  voyage: {
    title: 'Not France',
    text: [
      'I will be brief about the voyage, for I spent much of it on my knees. We rose from the meadow smoothly enough. Then Branithar did something to the helm that could not be undone, and showed us his teeth, and the Earth dwindled behind us until it was a blue bead, and then a spark, and then nothing I could find.',
      'He had bound the ship to fly home of itself, to a world of his own people’s empire, meaning to deliver a whole English village to his masters as a gift. My lord heard this out through my poor translation. He did not rage. He asked only how many soldiers held the place we were bound for, and what manner of walls it had, and seemed content with the answers.',
      'So we have come down upon a world called Tharixan, under a sky of the wrong color, hard by a Wersgor stronghold named Ganturath. The garrison has watched one of its own ships land and expects a friendly crew. My lord’s counsel was short. They believe we are their comrades, he said, and it would be discourteous to let them go on believing it any longer than it takes to open the doors.'
    ],
    next: 'Storm Ganturath', go: march(1)
  },
  ganturath: {
    title: 'Ganturath taken', camp: true,
    text: [
      'Ganturath is ours, and I am still not certain how. The Wersgorix had engines upon their walls that could have burned Ansby to its foundations from a league away. But such engines are made for fighting other engines. Nobody had told them what to do about a man-at-arms who is already inside the gate and standing on one’s foot.',
      'We have taken more prisoners than we can feed, storehouses of weapons whose use we must guess at, and wagons that go without horses. The yeomen are already quarrelling over the fire-rods. Sir Owain wishes to learn the flying of the small sky-boats. My lord says that first we shall learn to turn the wall-engines about, so that they point outward.',
      'For there are other strongholds on Tharixan, far greater than this one, and by now they know that Ganturath no longer answers. Our scouts report a host upon the west road, with ground cars among it. We are a few hundred English souls, a very long way from home, holding a fort we do not understand. My lord is in excellent spirits. I have asked that the abbey bell be hung where it can be rung quickly.'
    ],
    next: 'Man the walls', go: march(2)
  },
  siege: {
    title: 'The siege broken', camp: true,
    text: [
      'They came three times against the walls, and the third time they brought their iron wagons, and I confess I thought it the end of us. But a gate is a gate on any world. A host that must come through one a few at a time may be met a few at a time, and our men have had a great deal of practice at that in France.',
      'Their governor, one Huruga, sent a herald to ask who we were. My lord received him seated, in his best cloak, and through my mouth informed him that we were a small outlying garrison of the English Empire, which spans three stars and has lately grown bored. I translated this with a straight face. It is, I think, the gravest sin I have committed, and I am not yet sorry for it.',
      'A bluff wants something behind it, however. Red John Hameward has found among the prisoners one who speaks of Stularax, a fortress to the north where the Wersgorix keep their greatest weapons. My lord reasons that whatever is stored there must either be ours or be nobody’s. Sir Owain has asked to lead the raid. He asked very prettily, and my lady was watching.'
    ],
    next: 'Raid Stularax', go: march(3)
  },
  stularax: {
    title: 'Where Stularax stood', camp: true,
    text: [
      'I cannot rightly say what our men did in the arsenal. Red John says a yeoman dropped a thing that ought not to have been dropped. Sir Owain says it was done by design and to his order. What is certain is that the raiders were scarce a league off when a light rose behind them brighter than noon, and that where Stularax stood there is now a lake of glass.',
      'The Wersgorix believe we did it on purpose, with some terrible engine of English make. My lord has not corrected them. Huruga has withdrawn into his citadel and sends no more heralds.',
      'Yet my lord knows, as I do, that we cannot hold a world with a village. He has learned from the prisoners that the Wersgor empire has neighbors who hate it and fear it: the Jairs, a courteous and wary people of traders, and the Ashenkoghli, proud clans who honor nothing so much as a brave fight. Either might be won to our side, and with one of them beside us the other will be easier to persuade. We have one ship. My lord must choose where to take it first.'
    ],
    next: 'Sail to the Jairs', go: march(4),
    alt: 'Ride to the Ashenkoghli', altGo: march(5)
  },
  jair: {
    title: 'The Jairs', camp: true,
    text: [
      'The Jairs received us in a tower of pale stone, with great politeness and no trust whatever. They have lived two hundred years beside the Wersgorix by never giving offense, and they wished to know why they should begin now, for the sake of some hairy strangers with one stolen ship.',
      'The Wersgorix answered that for us. A raiding party fell upon the tower while we sat at table, meaning to burn out the Jairs for receiving us at all. Our men had their weapons with them. It is an English habit the Jairs had thought uncouth until that hour.',
      'When it was done their elders spoke together a long while, in their own tongue, which is like water over stones. Then they asked my lord how many of their marksmen he could use. They shoot from a great way off, they do not care to be struck, and they are worth their weight in silver.'
    ],
    next: afterAllyLabel, go: afterAlly
  },
  ashen: {
    title: 'The Ashenkoghli', camp: true,
    text: [
      'The Ashenkoghli are a people of clans and feuds and long genealogies, and my lord was at home among them inside an hour. They go upon four legs and carry spears, and they think the Wersgorix contemptible, since a Wersgor will not fight a foe he can see.',
      'They would not treat with us until they had watched us fight. So their chieftains sat their hilltops like men at a tourney while we went down against a laager of Wersgor ground cars on the open steppe. I am told they laid wagers. I am told the odds were not flattering to us at the start.',
      'They are flattering now. The clans have sworn to ride with the baron, whom they call by a name that means something like the-short-one-who-does-not-stop. Their riders are swifter than our knights and strike harder, and they have asked only that they be put where the fighting is thickest.'
    ],
    next: afterAllyLabel, go: afterAlly
  },
  finale: {
    title: 'What became of us',
    text: [
      'Huruga yielded his sword to my lord in the inner keep, and with it the world of Tharixan. I have seen my lord take the surrender of French castles with less ceremony. He bade the governor rise, and asked him, through me, what other worlds his emperor held, and how well they were defended.',
      'I must set down plainly that we never found the way home. The charts that might have led us back to Earth were lost through a treachery I have not the heart to write of here. For a season that grieved us more than any battle. Then there was too much to do. There were allies to keep, and worlds to take, and a kingdom to make out of yeomen and Jairs and four-legged lords.',
      'Sir Roger is a king now, and I, God forgive the presumption, an archbishop. The abbey bell hangs in a cathedral whose windows look out upon two moons. Sometimes of an evening I think of the east meadow at Ansby, and the ship coming down upon it as lightly as a goose upon a pond, and I wonder what the creatures aboard supposed they had found. They had found Englishmen. I am sorry for them still.'
    ],
    next: 'Read on', go: () => showCouncil('epilogue'), again: true
  },
  epilogue: {
    title: 'A thousand years on', eyebrow: 'Added in a later hand',
    text: [
      'Here the chronicle of Brother Parvus ends. The copy before you was made many centuries afterward, and its most recent reader was a visitor: the captain of a ship out of Earth, the first to find its way across the gulf that the people of Ansby crossed by accident and could never cross again.',
      'He had expected a great many things in the deep sky. He had not expected to be met by a duke in plate armor who spoke a kind of English, handed him this chronicle and a cup of ale, and asked after the health of the King of England. The captain explained, as gently as he could, that a good deal had changed at home, and that he held his own commission from the Israeli Empire. The duke was overjoyed. He had always been taught that the Holy Land would be set free one day, and it was good to hear the work was in hand.',
      'There is to be a tourney in the visitors\u2019 honor, for that is how this realm has greeted strangers since Sir Roger\u2019s day. The Earthmen are invited to bring their own arms into the lists, and some Wersgor prisoners have been promised their freedom for a good showing. Nobody is to be killed, the heralds say. Nobody has ever quite believed the heralds.'
    ],
    next: 'To the tourney', go: () => showTourney(),
    alt: 'Begin a new campaign', altGo: () => { startMission(0); showCouncil('intro'); }
  }
};
let page = 'intro';
const councilEl = document.getElementById('council');
const cRoster = document.getElementById('c-roster'), cOffers = document.getElementById('c-offers');
const cSpoils = document.getElementById('c-spoils'), cNext = document.getElementById('c-next'), cAgain = document.getElementById('c-again'), cAlt = document.getElementById('c-alt');
function renderCamp() {
  cRoster.textContent = '';
  for (const k of ARMY_KINDS) {
    const n = camp.roster[k];
    if (!n) continue;
    const li = document.createElement('li'), b = document.createElement('b');
    b.textContent = n;
    li.append(b, ' ' + (n === 1 ? TYPES[k].name : TYPES[k].plural));
    cRoster.append(li);
  }
  const noteEl = document.getElementById('c-note');
  noteEl.hidden = !camp.note;
  noteEl.textContent = camp.note || '';
  cSpoils.textContent = camp.spoils + (camp.spoils === 1 ? ' crate' : ' crates') + ' of captured gear' + (armySize() >= ARMY_CAP ? '. The ship can carry no more than ' + ARMY_CAP + ' fighting men.' : '');
  cOffers.textContent = '';
  for (const o of OFFERS) {
    if (o.show && !o.show()) continue;
    const ok = () => camp.spoils >= o.cost && (o.can ? o.can() : armySize() < ARMY_CAP);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'offer'; btn.id = 'offer-' + o.id;
    btn.disabled = !ok();
    const head = document.createElement('span'); head.className = 'offer-head';
    const cost = document.createElement('b'); cost.textContent = o.cost + (o.cost === 1 ? ' crate' : ' crates');
    head.append(o.label, cost);
    const note = document.createElement('span'); note.className = 'offer-note'; note.textContent = o.note;
    btn.append(head, note);
    btn.addEventListener('click', () => { if (!ok()) return; camp.spoils -= o.cost; o.buy(); renderCamp(); saveGame(page); });
    cOffers.append(btn);
  }
}
const label = (v) => (typeof v === 'function' ? v() : v);
function showCouncil(p) {
  page = p;
  const s = STORY[p];
  document.getElementById('c-eyebrow').textContent = s.eyebrow || 'Brother Parvus records';
  document.getElementById('c-title').textContent = s.title;
  const story = document.getElementById('c-story');
  story.textContent = '';
  for (const t of s.text) { const el = document.createElement('p'); el.textContent = t; story.append(el); }
  document.getElementById('c-camp').hidden = !s.camp;
  cAgain.hidden = !(s.camp || s.again);
  cNext.textContent = label(s.next);
  cNext.disabled = !s.go;
  cAlt.hidden = !s.alt;
  cAlt.textContent = s.alt || '';
  if (s.camp) renderCamp();
  councilEl.hidden = false;
  councilEl.scrollTop = 0;
  renderContinue();
  renderSaveNote();
}
cNext.addEventListener('click', () => { const s = STORY[page]; if (s.go) s.go(); });
cAlt.addEventListener('click', () => { const s = STORY[page]; if (s.altGo) s.altGo(); });
cAgain.addEventListener('click', () => startMission(mission));
document.getElementById('c-continue').addEventListener('click', () => { if (offered) resume(offered); });
