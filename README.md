# Emberfall — Hold the Plaza

A golden-hour wave-defense FPS for make.fun's **best-game-01** bounty, written in plain
JavaScript with three.js vendored under `game/vendor/`. No build step, no network: serve
the `game/` folder statically and open `index.html`.

**The game.** At dusk the Hollow pour through the four gates of a desert plaza to drink
the last Ember Crystal dry. You are its keeper: ten waves of husks, soldiers and brutes,
an ember purse filled by every kill, and a draft of three upgrades between waves.
Clear wave 10 and dawn breaks. Let the crystal — or yourself — fall, and the light goes out.

**Controls.** WASD move · mouse aim · click fire · R reload · Shift sprint.

**Layout.** `main.ts` is the hand-in program (copies `game/` + `screenshots/` to the
output and writes the dossier). Inside `game/src/`, one file per job: `world.js` builds
the plaza and its collision table, `player.js` is the keeper's movement and health,
`weapon.js` the rifle and its shot effects, `enemies.js` the Hollow and their bolts,
`waves.js` the ten waves and the upgrade pool, `hud.js` everything the player reads,
`audio.js` the synthesized sound, and `main.js` conducts them all.

**Develop.** `node serve.ts --port 8090`, then open http://localhost:8090. Screenshot
poses for the dossier live at `?shot=cover|title|upgrade|end`.
