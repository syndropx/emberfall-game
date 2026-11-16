// weapon.js — the VK-47 Ember Rifle: a box-built viewmodel with a wood handguard and an
// ember sight, its firing cadence and magazine, and the visible language of a shot —
// muzzle flash, tracer, impact sparks — pooled so firing never allocates.
import * as THREE from 'three';

export const WEAPON_STATS = {
  damage: 34,
  headshotMultiplier: 2,
  fireInterval: 0.118,
  magSize: 30,
  reloadTime: 1.35,
  pierce: 0, // extra targets a round passes through, from the Piercing upgrade
};

function box(parent, x, y, z, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function createWeapon(camera, scene) {
  const stats = { ...WEAPON_STATS };
  let ammo = stats.magSize;
  let reloadingUntil = 0;
  let nextShotAt = 0;
  let triggerHeld = false;
  let sway = 0;

  const gun = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x4b545e, roughness: .45, metalness: .65 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: .55, metalness: .55 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: .8 });
  const tan = new THREE.MeshStandardMaterial({ color: 0xb39d72, roughness: .7 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xffa030 });
  box(gun, 0, 0, -0.18, 0.075, 0.11, 0.34, steel); // receiver
  box(gun, 0, -0.045, -0.02, 0.06, 0.13, 0.09, steelDark); // grip
  box(gun, 0.005, -0.085, -0.2, 0.05, 0.16, 0.075, tan).rotation.x = 0.18; // magazine
  box(gun, 0, 0.005, -0.44, 0.055, 0.075, 0.24, wood); // handguard
  box(gun, 0, 0.028, -0.6, 0.026, 0.026, 0.2, steelDark); // barrel
  box(gun, 0, 0.028, -0.71, 0.045, 0.045, 0.05, steelDark); // muzzle brake
  box(gun, 0, -0.01, 0.09, 0.07, 0.09, 0.12, wood); // stock
  box(gun, 0, 0.085, -0.3, 0.02, 0.05, 0.16, steelDark); // rear sight rail
  box(gun, 0, 0.095, -0.47, 0.012, 0.045, 0.012, steelDark); // front post
  const sightDot = box(gun, 0, 0.088, -0.3, 0.014, 0.014, 0.014, ember); // ember sight dot
  gun.position.set(0.23, -0.205, -0.3);
  gun.scale.setScalar(0.88);
  gun.rotation.y = 0.03;
  camera.add(gun);

  // Muzzle flash: a sprite plus a short point light, shown for a few frames per shot.
  const flashTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, '#fff2cc'); grad.addColorStop(.3, 'rgba(255,170,60,.8)'); grad.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false }));
  flash.scale.setScalar(0.001);
  flash.position.set(0, 0.028, -0.76);
  gun.add(flash);
  const flashLight = new THREE.PointLight(0xffa050, 0, 9, 2);
  flashLight.position.set(0, 0.05, -0.7);
  gun.add(flashLight);
  let flashUntil = 0;

  // Tracers: a pool of stretched additive boxes flown from muzzle to impact.
  const tracers = [];
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: .9 }));
    m.visible = false;
    scene.add(m);
    tracers.push({ mesh: m, until: 0 });
  }
  let tracerIdx = 0;

  // Impact sparks: one shared Points cloud with a small ring buffer of bursts.
  const SPARKS = 240;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffb36b, size: .09, transparent: true, opacity: .95 }));
  sparkPts.frustumCulled = false;
  scene.add(sparkPts);
  let sparkIdx = 0;
  let sparkLife = 0;

  const muzzleWorld = new THREE.Vector3();

  return {
    stats,
    get ammo() { return ammo; },
    get reloading() { return performance.now() / 1000 < reloadingUntil; },
    setTrigger(held) { triggerHeld = held; },
    startReload(now) {
      if (ammo < stats.magSize && now >= reloadingUntil) reloadingUntil = now + stats.reloadTime;
    },
    // Returns true when a round actually leaves the barrel this frame.
    tryFire(now) {
      if (!triggerHeld || now < nextShotAt || now < reloadingUntil) return false;
      if (ammo <= 0) { nextShotAt = now + 0.25; return 'empty'; }
      ammo -= 1;
      nextShotAt = now + stats.fireInterval;
      flashUntil = now + 0.045;
      flash.scale.setScalar(0.34 + Math.random() * 0.15);
      flash.material.rotation = Math.random() * Math.PI;
      flashLight.intensity = 26;
      gun.position.z = -0.3 + 0.035; // recoil kick, eased back in update
      sway = Math.min(1, sway + 0.4);
      return true;
    },
    muzzlePosition(out) {
      flash.getWorldPosition(muzzleWorld);
      return out.copy(muzzleWorld);
    },
    showTracer(from, to) {
      const t = tracers[tracerIdx++ % tracers.length];
      const len = from.distanceTo(to);
      t.mesh.position.copy(from).lerp(to, 0.5);
      t.mesh.scale.set(1, 1, len);
      t.mesh.lookAt(to);
      t.mesh.visible = true;
      t.until = performance.now() / 1000 + 0.055;
    },
    burst(point, n = 7, color = 0xffb36b) {
      sparkPts.material.color.setHex(color);
      for (let k = 0; k < n; k++) {
        const i = sparkIdx++ % SPARKS;
        sparkPos[i * 3] = point.x; sparkPos[i * 3 + 1] = point.y; sparkPos[i * 3 + 2] = point.z;
        sparkVel[i * 3] = (Math.random() - .5) * 2.6;
        sparkVel[i * 3 + 1] = Math.random() * 2.4 + .4;
        sparkVel[i * 3 + 2] = (Math.random() - .5) * 2.6;
      }
      sparkLife = 0.45;
    },
    refill() { ammo = stats.magSize; },
    update(dt, now, moving) {
      gun.position.z += (-0.3 - gun.position.z) * Math.min(1, dt * 11);
      gun.position.y = -0.205 + Math.sin(now * (moving ? 7 : 1.6)) * (moving ? 0.008 : 0.003) - sway * 0.01;
      sway = Math.max(0, sway - dt * 5);
      sightDot.material.color.setHex(ammo === 0 ? 0xff4030 : 0xffa030);
      if (now > flashUntil) { flash.scale.setScalar(0.001); flashLight.intensity = 0; }
      for (const t of tracers) if (t.mesh.visible && now > t.until) t.mesh.visible = false;
      if (sparkLife > 0) {
        sparkLife -= dt;
        for (let i = 0; i < SPARKS; i++) {
          sparkPos[i * 3] += sparkVel[i * 3] * dt;
          sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
          sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
          sparkVel[i * 3 + 1] -= 5.5 * dt;
        }
        sparkGeo.attributes.position.needsUpdate = true;
        sparkPts.material.opacity = Math.max(0, sparkLife / 0.45) * 0.95;
      }
      if (reloadingUntil && now >= reloadingUntil) { ammo = stats.magSize; reloadingUntil = 0; }
    },
  };
}
