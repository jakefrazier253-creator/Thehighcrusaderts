# The High Crusade

A small real-time strategy game for the browser, based on Poul Anderson's 1960 novel *The High Crusade*. Medieval English soldiers capture an alien scout ship and end up at war with an interstellar empire.

This is a personal fan project. The story text is original narration written for the game. It follows the events of the novel but does not reproduce its text.

## Play

Open `index.html` in a browser, or use the GitHub Pages link for this repository once Pages is turned on.

It works with a mouse or with touch.

| Action | Mouse | Touch |
|---|---|---|
| Select a soldier | Click | Tap |
| Select a group | Drag a box | Press and hold, then drag |
| Select all of one kind in view | Double click | Double tap |
| March | Click or right click the ground | Tap the ground |
| Attack | Click or right click an enemy | Tap an enemy |
| Move the view | Arrow keys, screen edges, small map | Drag |
| Zoom | Scroll wheel | Pinch |

## The campaign

Seven battles, linked by Brother Parvus's chronicle and a council screen where survivors carry over and captured gear is spent on troops.

1. Ansby: the ambush at the ship
2. Ganturath: storm the fortress
3. The siege: hold Ganturath against waves
4. Stularax: raid the arsenal
5. The Jairs and the Ashenkoghli, in the order you choose (each wins a different ally)
6. (the other ally)
7. The citadel: bring down Governor Huruga

## How the code is laid out

There is no build step and no game engine. All art is drawn by code.

| File | What it holds |
|---|---|
| `index.html` | The page: buttons, panels, and the list of scripts in load order |
| `css/style.css` | Colors, fonts, layout |
| `js/world.js` | Map constants, the seven battlefields, pathfinding |
| `js/paint.js` | Paints terrain, trees, buildings and ships |
| `js/units.js` | Every troop type: its numbers and how it is drawn |
| `js/view.js` | Camera: pan, zoom, screen size |
| `js/combat.js` | Orders and combat |
| `js/missions.js` | The battles: goals, waves, winning and losing |
| `js/sim.js` | One step of the simulation |
| `js/draw.js` | Draws one frame |
| `js/input.js` | Mouse, touch, keyboard, buttons |
| `js/campaign.js` | Story pages, council, purchases, ally choice |
| `js/save.js` | Saving and resuming |
| `js/main.js` | Starts the game |

The scripts share one set of names and must load in the order listed in `index.html`.

## Tools

- `node tools/smoke_test.js` loads the game without a browser, plays a few seconds of every battle and opens every council page. It cannot see the screen. It only proves nothing crashes.
- `python3 tools/build_artifact.py` glues the files into the single-file form used by the Claude artifact.

## Saving

Progress is saved in the browser on the device you play on. The Claude artifact version also saves to the Claude account, which this standalone version cannot do.
