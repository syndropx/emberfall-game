# emberfall-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/syndropx/emberfall-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/syndropx/emberfall-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Emberfall — Hold the Plaza.** A golden-hour wave-defense FPS, written in plain
JavaScript with three.js vendored under `game/vendor/`. No build step, no network:
serve the `game/` folder statically and open `index.html`.

At dusk the Hollow pour through the four gates of a desert plaza to drink the last
Ember Crystal dry. You are its keeper: ten waves of husks, soldiers and brutes, an
ember purse filled by every kill, and a draft of three upgrades between waves.
Clear wave 10 and dawn breaks. Let the crystal — or yourself — fall, and the light goes out.

**Controls.** WASD move · mouse aim · click fire · R reload · Shift sprint.

**Layout.** `main.ts` is the hand-in program (copies `game/` + `screenshots/` to the
output and writes the dossier). Inside `game/src/`, one file per job: `world.js` builds
the plaza and its collision table, `player.js` is the keeper's movement and health,
`weapon.js` the rifle and its shot effects, `enemies.js` the Hollow and their bolts,
`waves.js` the ten waves and the upgrade pool, `hud.js` everything the player reads,
`audio.js` the synthesized sound, and `main.js` conducts them all.

## Run it

```sh
node serve.ts --port 8090
# then open http://localhost:8090 — screenshot poses live at ?shot=cover|title|upgrade|end
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=a9ryr2w4&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
