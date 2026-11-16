// player.js — the keeper: pointer-lock FPS controls, WASD movement with circle collision
// against the world's solids, sprint, and the player's own health pool.
import * as THREE from 'three';
import { collide } from './world.js';

const EYE = 1.66;
const RADIUS = 0.55;

export function createPlayer(camera, solids, dom) {
  const pos = new THREE.Vector3(0, 0, 16); // feet position; starts south of the crystal
  let yaw = 0; // facing the crystal and the north gate (camera looks down -Z at yaw 0)
  let pitch = 0;
  let hp = 100;
  let maxHp = 100;
  let speed = 6.4;
  const keys = new Set();
  let locked = false;
  let bobT = 0;

  const onKey = (down) => (e) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space'].includes(e.code)) e.preventDefault();
    if (down) keys.add(e.code); else keys.delete(e.code);
  };
  const kd = onKey(true), ku = onKey(false);
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);
  dom.addEventListener('click', () => { if (!locked) dom.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === dom; });
  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    yaw -= e.movementX * 0.0021;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - e.movementY * 0.0021));
  });

  return {
    pos,
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get locked() { return locked; },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    setView(newYaw, newPitch) { yaw = newYaw; pitch = newPitch; },
    lookAt(target) {
      const d = new THREE.Vector3().subVectors(target, pos);
      yaw = Math.atan2(-d.x, -d.z);
      pitch = Math.atan2(d.y - EYE, Math.hypot(d.x, d.z));
    },
    direction(out) { return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize(); },
    eyePosition(out) { return out.set(pos.x, EYE + Math.sin(bobT * 2) * 0.03, pos.z); },
    addMaxHp(n) { maxHp += n; hp = Math.min(maxHp, hp + n); },
    heal(n) { hp = Math.min(maxHp, hp + n); },
    addSpeed(frac) { speed *= 1 + frac; },
    damage(n) { hp -= n; return hp <= 0; },
    reset() {
      pos.set(0, 0, 16); yaw = 0; pitch = 0; maxHp = 100; hp = maxHp; speed = 6.4; keys.clear();
    },
    update(dt) {
      let mx = 0, mz = 0;
      if (keys.has('KeyW')) mz += 1;
      if (keys.has('KeyS')) mz -= 1;
      if (keys.has('KeyA')) mx -= 1;
      if (keys.has('KeyD')) mx += 1;
      const sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 1.45 : 1;
      const len = Math.hypot(mx, mz) || 1;
      const s = speed * sprint * dt / len;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      let nx = pos.x + (mx * cos - mz * sin) * s;
      let nz = pos.z + (-mz * cos - mx * sin) * s;
      [nx, nz] = collide(solids, nx, nz, RADIUS);
      const moving = Math.hypot(nx - pos.x, nz - pos.z) > 0.001;
      pos.x = nx; pos.z = nz;
      if (moving && locked) bobT += dt * (sprint > 1 ? 7.4 : 5.6);
      camera.position.set(pos.x, EYE + Math.sin(bobT * 2) * 0.03, pos.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch, yaw, 0);
      return moving;
    },
  };
}
