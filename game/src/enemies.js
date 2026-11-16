// enemies.js — the Hollow: three kinds of ember-wraith that pour through the gates and
// make for the crystal. Husks rush it, Soldiers stop and shoot, Brutes walk through
// everything. Each is built from boxes around a glowing core; the same core is the
// weak point the player's rounds are tested against.
import * as THREE from 'three';
import { collide } from './world.js';

export const HOLLOW_TYPES = {
  husk: { hp: 40, speed: 4.7, radius: 0.5, scale: 0.92, crystalDamage: 6, playerDamage: 8, attackTime: 0.9, embers: 6, score: 50, ranged: 0 },
  soldier: { hp: 90, speed: 3.1, radius: 0.55, scale: 1.0, crystalDamage: 5, playerDamage: 7, attackTime: 2.2, embers: 10, score: 100, ranged: 15 },
  brute: { hp: 380, speed: 1.75, radius: 0.95, scale: 1.62, crystalDamage: 22, playerDamage: 18, attackTime: 1.5, embers: 25, score: 300, ranged: 0 },
};

const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3548, roughness: .92, emissive: 0x140a10 });
const clothMat = new THREE.MeshStandardMaterial({ color: 0x5d3244, roughness: .95 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: .9 });
const coreMat = new THREE.MeshBasicMaterial({ color: 0xff7a20 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });

function box(parent, x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function buildBody(kind) {
  const g = new THREE.Group();
  const s = HOLLOW_TYPES[kind].scale;
  if (kind === 'husk') {
    const torso = box(g, 0, 1.02, 0.06, 0.62, 0.78, 0.36, bodyMat); torso.rotation.x = 0.38; // hunched forward
    box(g, 0, 1.32, 0.3, 0.34, 0.34, 0.36, boneMat); // skull, low and forward
    box(g, -0.42, 0.78, 0.16, 0.13, 0.85, 0.13, bodyMat).rotation.x = 0.25; // long arms
    box(g, 0.42, 0.78, 0.16, 0.13, 0.85, 0.13, bodyMat).rotation.x = 0.25;
    box(g, -0.17, 0.32, 0, 0.16, 0.64, 0.18, clothMat);
    box(g, 0.17, 0.32, 0, 0.16, 0.64, 0.18, clothMat);
  } else if (kind === 'soldier') {
    box(g, 0, 1.06, 0, 0.68, 0.86, 0.38, bodyMat);
    box(g, 0, 1.68, 0, 0.36, 0.38, 0.38, boneMat);
    box(g, -0.45, 1.34, 0, 0.2, 0.24, 0.42, clothMat); // shoulder pads
    box(g, 0.45, 1.34, 0, 0.2, 0.24, 0.42, clothMat);
    box(g, -0.44, 0.82, 0.02, 0.14, 0.8, 0.14, bodyMat);
    box(g, 0.44, 0.82, 0.02, 0.14, 0.8, 0.14, bodyMat);
    box(g, 0.3, 1.12, 0.34, 0.09, 0.09, 0.62, boneMat); // ember lance, held forward
    box(g, -0.18, 0.33, 0, 0.17, 0.66, 0.19, clothMat);
    box(g, 0.18, 0.33, 0, 0.17, 0.66, 0.19, clothMat);
  } else {
    box(g, 0, 1.12, 0, 1.24, 1.1, 0.62, bodyMat); // brute: a wall of a torso
    box(g, 0, 1.92, 0, 0.46, 0.44, 0.46, boneMat);
    box(g, -0.3, 2.2, 0, 0.09, 0.42, 0.09, boneMat).rotation.z = 0.5; // horns
    box(g, 0.3, 2.2, 0, 0.09, 0.42, 0.09, boneMat).rotation.z = -0.5;
    box(g, -0.78, 0.95, 0, 0.24, 1.15, 0.24, bodyMat);
    box(g, 0.78, 0.95, 0, 0.24, 1.15, 0.24, bodyMat);
    box(g, -0.3, 0.36, 0, 0.26, 0.72, 0.28, clothMat);
    box(g, 0.3, 0.36, 0, 0.26, 0.72, 0.28, clothMat);
  }
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(kind === 'brute' ? 0.3 : 0.19), coreMat);
  core.position.set(0, kind === 'husk' ? 1.08 : 1.14, 0.24);
  g.add(core);
  for (const sx of [-0.08, 0.08]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.02), eyeMat);
    eye.position.set(sx * (kind === 'brute' ? 1.6 : 1), kind === 'husk' ? 1.36 : kind === 'brute' ? 1.98 : 1.74, kind === 'husk' ? 0.49 : 0.2);
    g.add(eye);
  }
  g.scale.setScalar(s);
  g.userData.core = core;
  return g;
}

const _v = new THREE.Vector3();

export function createHollow(scene, kind, at, hpScale = 1) {
  const def = HOLLOW_TYPES[kind];
  const group = buildBody(kind);
  group.position.copy(at);
  group.position.y = -2.2; // rises out of the plaza stones
  scene.add(group);
  const hp = Math.round(def.hp * hpScale);
  return {
    kind, def, group, hp, maxHp: hp, alive: true,
    radius: def.radius, speed: def.speed * (0.92 + Math.random() * 0.16),
    attackCd: 0.6 + Math.random() * 0.6, riseT: 0, wobble: Math.random() * 9,
    // Ray test against body and head spheres; returns {t, head} or null.
    hitTest(origin, dir) {
      const s = def.scale;
      let best = null;
      for (const [cy, r, head] of [[1.02 * s, 0.66 * s, false], [(kind === 'brute' ? 1.95 : kind === 'husk' ? 1.34 : 1.7) * s, 0.36 * s, true]]) {
        _v.set(group.position.x, group.position.y + cy, group.position.z).sub(origin);
        const t = _v.dot(dir);
        if (t < 0.5) continue;
        const d2 = _v.lengthSq() - t * t;
        if (d2 < r * r) {
          const th = t - Math.sqrt(r * r - d2);
          if (!best || th < best.t) best = { t: th, head };
        }
      }
      return best;
    },
    update(dt, ctx) {
      if (this.riseT < 1) {
        this.riseT = Math.min(1, this.riseT + dt / 0.85);
        group.position.y = -2.2 + this.riseT * 2.2;
        return;
      }
      const p = group.position;
      // Choose a victim: the keeper, if close; otherwise the crystal.
      const toPlayer = Math.hypot(ctx.playerPos.x - p.x, ctx.playerPos.z - p.z);
      const huntPlayer = toPlayer < 10.5;
      const target = huntPlayer ? ctx.playerPos : ctx.crystalPos;
      const dx = target.x - p.x, dz = target.z - p.z;
      const dist = Math.hypot(dx, dz) || 1;
      const range = huntPlayer ? (def.ranged ? 13 : 2.1) : (def.ranged ? 16 : def.scale * 3.4 + 2.6);
      this.attackCd -= dt;
      let mx = 0, mz = 0;
      if (def.ranged && !huntPlayer && dist < range + 3 && dist > range - 4) {
        // Soldiers hold their firing line: strafe slowly, shoot on cooldown.
        mx = -dz / dist * 0.35; mz = dx / dist * 0.35;
        if (this.attackCd <= 0) { this.attackCd = def.attackTime * (0.9 + Math.random() * 0.3); ctx.shootBolt(this, target); }
      } else if (dist > range) {
        mx = dx / dist; mz = dz / dist;
      } else if (this.attackCd <= 0) {
        this.attackCd = def.attackTime;
        if (huntPlayer) ctx.onPlayerHit(def.playerDamage, this);
        else ctx.onCrystalHit(def.crystalDamage, this);
        group.position.y = 0.12; // a little lunge, settled in the next frames
      }
      // Separation: don't stack inside a brother Hollow.
      for (const other of ctx.enemies) {
        if (other === this || !other.alive) continue;
        const ox = p.x - other.group.position.x, oz = p.z - other.group.position.z;
        const od = Math.hypot(ox, oz);
        const min = this.radius + other.radius + 0.15;
        if (od > 0.001 && od < min) { mx += (ox / od) * 0.7; mz += (oz / od) * 0.7; }
      }
      const ml = Math.hypot(mx, mz);
      if (ml > 0.01) {
        const step = this.speed * dt / Math.max(1, ml);
        let nx = p.x + mx * step, nz = p.z + mz * step;
        [nx, nz] = collide(ctx.solids, nx, nz, this.radius);
        p.x = nx; p.z = nz;
        group.rotation.y = Math.atan2(mx, mz);
      }
      group.position.y = Math.max(0, group.position.y - dt * 0.5);
      group.rotation.z = Math.sin(ctx.time * 6 + this.wobble) * 0.03;
      group.userData.core.rotation.y = ctx.time * 2.4 + this.wobble;
    },
  };
}

// Ember bolts: the soldiers' ranged attack, flown as small glowing spheres.
const bolts = [];
export function spawnBolt(scene, from, targetPos) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff8a30 }));
  m.position.copy(from);
  scene.add(m);
  const dir = new THREE.Vector3().subVectors(targetPos, from);
  dir.y += 0.4;
  dir.normalize().multiplyScalar(17);
  bolts.push({ mesh: m, vel: dir, life: 3 });
}
export function updateBolts(scene, dt, ctx) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.vel, dt);
    const p = b.mesh.position;
    let dead = b.life <= 0 || p.y < 0;
    if (!dead && Math.hypot(p.x - ctx.playerPos.x, p.z - ctx.playerPos.z) < 0.85 && p.y < 2.2) { ctx.onPlayerHit(7, null); dead = true; }
    if (!dead && Math.hypot(p.x - ctx.crystalPos.x, p.z - ctx.crystalPos.z) < 3.6 && p.y < 3.4) { ctx.onCrystalHit(5, null); dead = true; }
    if (dead) { scene.remove(b.mesh); bolts.splice(i, 1); }
  }
}
export function clearBolts(scene) {
  for (const b of bolts) scene.remove(b.mesh);
  bolts.length = 0;
}
