// main.js — Emberfall's conductor: renderer and state machine. Title → ten waves of the
// Hollow with an upgrade draft between each → dawn (win) or darkness (lose). It owns the
// crystal's health, the score, the ember purse, the spawn queue and every shot the
// player fires; the modules under src/ each own one part of the game itself.
import * as THREE from 'three';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createWeapon, WEAPON_STATS } from './weapon.js';
import { createHollow, spawnBolt, updateBolts, clearBolts } from './enemies.js';
import { waveComposition, draftUpgrades, UPGRADES, TOTAL_WAVES } from './waves.js';
import { hud } from './hud.js';
import { initAudio, sfx, startAmbient, stopAmbient } from './audio.js';

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.1, 900);
scene.add(camera);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const world = createWorld(scene);
const player = createPlayer(camera, world.solids, renderer.domElement);
const weapon = createWeapon(camera, scene);

const game = {
  mode: 'title', // title | play | upgrade | won | lost
  wave: 0, score: 0, kills: 0, embers: 0, emberMultiplier: 1,
  enemies: [], spawnQueue: [], spawnTimer: 0, spawnInterval: 1.4,
  waveTotal: 0, waveKilled: 0, hpScale: 1, time: 0,
};
const crystal = {
  hp: 500, maxHp: 500,
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); syncCrystal(); },
};
function syncCrystal() {
  hud.setCrystal(crystal.hp / crystal.maxHp);
  world.setCrystalHealth(crystal.hp / crystal.maxHp);
}

const gateIns = world.gates.map((g) => {
  const v = g.clone();
  v.setLength(31);
  v.y = 0;
  return v;
});

// --- combat ---------------------------------------------------------------------------

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _point = new THREE.Vector3();

// How far a round flies before a wall, a solid or the ground stops it.
function rayRange(origin, dir) {
  let range = 160;
  if (dir.y < -0.0001) range = Math.min(range, -origin.y / dir.y);
  for (const s of world.solids) {
    // Slab test against the box, capped at the box's height.
    let tmin = 0, tmax = range, ok = true;
    for (const [o, d, c, half] of [[origin.x, dir.x, s.x, s.w / 2], [origin.z, dir.z, s.z, s.d / 2]]) {
      if (Math.abs(d) < 1e-8) { if (Math.abs(o - c) > half) { ok = false; break; } }
      else {
        let t1 = (c - half - o) / d, t2 = (c + half - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok && tmin > 0) {
      const y = origin.y + dir.y * tmin;
      if (y >= 0 && y <= s.h) range = Math.min(range, tmin);
    }
  }
  return range;
}

function resolveShot() {
  player.eyePosition(_origin);
  player.direction(_dir);
  weapon.muzzlePosition(_muzzle);
  const range = rayRange(_origin, _dir);
  const hits = [];
  for (const e of game.enemies) {
    if (!e.alive || e.riseT < 0.4) continue;
    const hit = e.hitTest(_origin, _dir);
    if (hit && hit.t < range) hits.push({ e, t: hit.t, head: hit.head });
  }
  hits.sort((a, b) => a.t - b.t);
  const pierceThrough = Math.min(hits.length, 1 + weapon.stats.pierce);
  let endT = range;
  if (pierceThrough > 0) {
    for (let i = 0; i < pierceThrough; i++) {
      const { e, t, head } = hits[i];
      endT = t;
      _point.copy(_origin).addScaledVector(_dir, t);
      const dmg = weapon.stats.damage * (head ? weapon.stats.headshotMultiplier : 1);
      e.hp -= dmg;
      if (e.hp <= 0 && e.alive) {
        e.alive = false;
        game.kills += 1;
        game.waveKilled += 1;
        game.score += e.def.score;
        const paid = Math.ceil(e.def.embers * game.emberMultiplier);
        game.embers += paid;
        hud.hitmark(true);
        hud.setScore(game.score, game.embers);
        sfx.kill();
        weapon.burst(_point, 14, 0xff7a30);
        if (e.kind === 'brute') hud.feed(`Brute down — <b>+${paid} embers</b>`);
        scene.remove(e.group);
      } else {
        hud.hitmark(false);
        sfx.hit();
        weapon.burst(_point, 6, 0xffb36b);
      }
    }
  } else {
    _point.copy(_origin).addScaledVector(_dir, range);
    weapon.burst(_point, 3, 0xd8b98f);
  }
  weapon.showTracer(_muzzle, _point);
}

const enemyCtx = {
  get playerPos() { return player.pos; },
  get crystalPos() { return world.crystalPos; },
  get solids() { return world.solids; },
  get enemies() { return game.enemies; },
  get time() { return game.time; },
  shootBolt(e, target) {
    const from = e.group.position.clone();
    from.y += 1.55 * e.def.scale;
    const aim = target === player.pos
      ? new THREE.Vector3(player.pos.x, 1.3, player.pos.z)
      : new THREE.Vector3(0, 2.3, 0);
    spawnBolt(scene, from, aim);
    sfx.bolt();
  },
  onPlayerHit(dmg) {
    if (game.mode !== 'play') return;
    const died = player.damage(dmg);
    hud.setHp(player.hp, player.maxHp);
    hud.flashDamage();
    sfx.playerHurt();
    if (died) endGame(false, 'You fell in the plaza dust.');
  },
  onCrystalHit(dmg) {
    if (game.mode !== 'play') return;
    crystal.hp -= dmg;
    syncCrystal();
    sfx.crystalHurt();
    if (crystal.hp <= 0) endGame(false, 'The crystal shattered.');
    else if (crystal.hp < 150 && !enemyCtx.warned) { enemyCtx.warned = true; hud.feed('⚠ <b>The crystal is failing!</b>'); }
  },
  warned: false,
};

// --- wave flow ------------------------------------------------------------------------

function startWave(n) {
  game.wave = n;
  const comp = waveComposition(n);
  game.spawnQueue = comp.list;
  game.spawnInterval = comp.interval;
  game.hpScale = comp.hpScale;
  game.waveTotal = comp.total;
  game.waveKilled = 0;
  game.spawnTimer = 1.2;
  enemyCtx.warned = false;
  hud.setWave(n, TOTAL_WAVES);
  hud.setWaveProgress(0);
  hud.banner(`WAVE ${n}`, n === 1 ? 'The Hollow come through the gates. Hold the crystal.' : n === TOTAL_WAVES ? 'The last wave. Dawn is close.' : 'They return, angrier.', 2400);
  sfx.horn();
}

function waveCleared() {
  const bonus = 20 + game.wave * 5;
  game.embers += bonus;
  game.score += 250;
  hud.setScore(game.score, game.embers);
  if (game.wave >= TOTAL_WAVES) { endGame(true); return; }
  game.mode = 'upgrade';
  sfx.cleared();
  document.exitPointerLock?.();
  hud.showUpgrades(game.wave, draftUpgrades(3), game.embers, (u) => {
    game.embers -= u.cost;
    u.apply({ player, weapon, crystal, game });
    hud.setScore(game.score, game.embers);
    hud.setHp(player.hp, player.maxHp);
    hud.setAmmo(weapon.ammo, weapon.stats.magSize, false);
    sfx.upgrade();
    hud.hideUpgrades();
    game.mode = 'play';
    startWave(game.wave + 1);
    hud.banner(`WAVE ${game.wave}`, 'Click the plaza to take your post again.', 1600);
  });
}

function endGame(won, why = '') {
  game.mode = won ? 'won' : 'lost';
  stopAmbient();
  if (won) { game.score += Math.round(crystal.hp); sfx.victory(); }
  else sfx.defeat();
  document.exitPointerLock?.();
  hud.showEnd(won, { score: game.score, kills: game.kills, wave: game.wave });
  if (!won && why) hud.feed(why);
}

function resetGame() {
  for (const e of game.enemies) scene.remove(e.group);
  game.enemies = [];
  clearBolts(scene);
  Object.assign(game, { wave: 0, score: 0, kills: 0, embers: 0, emberMultiplier: 1, spawnQueue: [], waveTotal: 0, waveKilled: 0 });
  crystal.hp = crystal.maxHp;
  Object.assign(weapon.stats, { ...WEAPON_STATS });
  weapon.refill();
  player.reset();
  syncCrystal();
  hud.setScore(0, 0);
  hud.setHp(player.hp, player.maxHp);
  hud.setAmmo(weapon.ammo, weapon.stats.magSize, false);
}

// --- input ----------------------------------------------------------------------------

renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 0 && player.locked) weapon.setTrigger(true); });
addEventListener('mouseup', (e) => { if (e.button === 0) weapon.setTrigger(false); });
addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && game.mode === 'play') { weapon.startReload(performance.now() / 1000); sfx.reload(); }
});
document.getElementById('start-btn').addEventListener('click', () => {
  initAudio();
  startAmbient();
  hud.hideScreens();
  hud.showGame();
  resetGame();
  game.mode = 'play';
  startWave(1);
  renderer.domElement.requestPointerLock();
});
document.getElementById('restart-btn').addEventListener('click', () => {
  initAudio();
  startAmbient();
  hud.hideScreens();
  hud.showGame();
  resetGame();
  game.mode = 'play';
  startWave(1);
  renderer.domElement.requestPointerLock();
});

// --- screenshot poses -------------------------------------------------------------------

function poseShot(name) {
  hud.hideScreens();
  camera.rotation.order = 'YXZ';
  if (name === 'title') {
    hud.showTitle();
    return; // the loop orbits the camera behind the title
  }
  hud.showGame();
  if (name === 'cover') {
    // Wave 3, mid-fight: the keeper south-east of the crystal, Hollow closing in, a
    // round already on its way to the brute and a soldier's bolt answering.
    player.pos.set(14.5, 0, 12.5);
    player.setView(Math.PI * 0.25, -0.02);
    const spots = [['brute', -4.5, -6], ['soldier', -1.5, -9.5], ['husk', 2.5, -5.5], ['husk', -7, -1], ['husk', 4.5, 3], ['soldier', 8, -5.5]];
    for (const [kind, x, z] of spots) {
      const e = createHollow(scene, kind, new THREE.Vector3(x, 0, z), 1.1);
      e.riseT = 1; e.group.position.y = 0;
      e.group.rotation.y = Math.atan2(-x, -z);
      game.enemies.push(e);
    }
    spawnBolt(scene, new THREE.Vector3(-1.5, 1.6, -9.5), new THREE.Vector3(-0.8, 2.2, -5));
    // The frozen shot: a tracer stretched from the muzzle and the flash that made it,
    // parented to the camera so they sit exactly on the aim line.
    const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 13), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: .85 }));
    tracer.position.set(0.23, -0.17, -7.2);
    camera.add(tracer);
    const flashSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, '#fff2cc'); gr.addColorStop(.3, 'rgba(255,170,60,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false }));
    flashSpr.scale.setScalar(0.55);
    flashSpr.position.set(0.23, -0.17, -0.85);
    camera.add(flashSpr);
    game.wave = 3;
    hud.setWave(3, TOTAL_WAVES);
    crystal.hp = 390; syncCrystal();
    hud.setWaveProgress(0.45);
    hud.setScore(1250, 64);
    hud.setHp(82, 100);
    hud.setAmmo(24, 30, false);
    hud.feed('Brute down — <b>+25 embers</b>');
  } else if (name === 'upgrade') {
    player.pos.set(7, 0, 13);
    player.setView(0.49, 0.02);
    game.wave = 4;
    hud.setWave(4, TOTAL_WAVES);
    crystal.hp = 430; syncCrystal();
    hud.setScore(2980, 118);
    hud.setHp(76, 100);
    hud.setAmmo(30, 30, false);
    hud.showUpgrades(4, [UPGRADES[0], UPGRADES[3], UPGRADES[4]], 118, () => {});
  } else if (name === 'end') {
    player.pos.set(6, 0, 12);
    player.setView(0.46, 0.03);
    crystal.hp = 265; syncCrystal();
    hud.setWave(10, TOTAL_WAVES);
    hud.setWaveProgress(1);
    hud.setScore(8450, 96);
    hud.setHp(64, 100);
    hud.setAmmo(17, 30, false);
    hud.showEnd(true, { score: 8450, kills: 212, wave: 10 });
  }
}

// --- the loop ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let frames = 0;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  game.time += dt;
  const now = performance.now() / 1000;

  if (shotMode === 'title' || (!shotMode && game.mode === 'title')) {
    const a = game.time * 0.07;
    camera.position.set(Math.cos(a) * 27, 9.5, Math.sin(a) * 27);
    camera.lookAt(0, 2.4, 0);
  } else if (game.mode === 'play' || shotMode) {
    const moving = player.update(dt);
    if (game.mode === 'play' && !shotMode) {
      const fired = weapon.tryFire(now);
      if (fired === true) { sfx.shot(); resolveShot(); }
      else if (fired === 'empty') sfx.empty();
      if (weapon.ammo === 0) weapon.startReload(now);
      // Spawning.
      if (game.spawnQueue.length) {
        game.spawnTimer -= dt;
        if (game.spawnTimer <= 0) {
          game.spawnTimer = game.spawnInterval * (0.75 + Math.random() * 0.5);
          const kind = game.spawnQueue.shift();
          const gate = gateIns[Math.floor(Math.random() * gateIns.length)];
          game.enemies.push(createHollow(scene, kind, gate.clone(), game.hpScale));
        }
      }
      // The Hollow act.
      for (const e of game.enemies) if (e.alive) e.update(dt, enemyCtx);
      game.enemies = game.enemies.filter((e) => e.alive);
      updateBolts(scene, dt, enemyCtx);
      hud.setWaveProgress(game.waveTotal ? (game.waveKilled + (game.waveTotal - game.spawnQueue.length - game.enemies.length)) / game.waveTotal : 0);
      hud.setAmmo(weapon.ammo, weapon.stats.magSize, weapon.reloading);
      if (!game.spawnQueue.length && game.enemies.length === 0) waveCleared();
    }
    weapon.update(dt, now, moving);
  }
  world.update(dt, game.time);
  renderer.render(scene, camera);
  if (shotMode && ++frames === 3) window.__shotReady = true;
}

if (shotMode) poseShot(shotMode);
tick();
