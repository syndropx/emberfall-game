// world.js — the plaza at golden hour: ground, walls, gates, cover, sky and the Ember
// Crystal itself. One solids table (axis-aligned boxes) drives both the meshes the player
// sees and the collision the player and the Hollow move against, so what you see is
// exactly what blocks you.
import * as THREE from 'three';

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const texStone = canvasTexture(256, (g, s) => {
  g.fillStyle = '#77573d'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 100 + ((x * 7 + y * 13) % 5) * 9;
    g.fillStyle = `rgb(${v + 22},${v - 6},${v - 42})`;
    g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    g.fillStyle = 'rgba(60,35,18,.35)';
    g.fillRect(x * 64 + 2, y * 64 + 52, 60, 4);
  }
  g.strokeStyle = 'rgba(46,28,14,.8)'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, s); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(s, i * 64); g.stroke(); }
});
texStone.repeat.set(14, 14);

const texSand = canvasTexture(256, (g, s) => {
  g.fillStyle = '#c49a62'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${140 + Math.random() * 60 | 0},${100 + Math.random() * 40 | 0},50,${Math.random() * .25})`;
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
});
texSand.repeat.set(22, 22);

const texWood = canvasTexture(128, (g, s) => {
  g.fillStyle = '#7a5230'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 6; y++) {
    g.fillStyle = `rgba(52,32,14,${.25 + (y % 2) * .12})`;
    g.fillRect(0, y * 22, s, 3);
    g.fillStyle = 'rgba(255,220,160,.08)';
    g.fillRect(0, y * 22 + 4, s, 2);
  }
  g.strokeStyle = '#4a2f16'; g.lineWidth = 6; g.strokeRect(0, 0, s, s);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(s, s); g.moveTo(s, 0); g.lineTo(0, s); g.lineWidth = 4; g.stroke();
});

const texMural = canvasTexture(256, (g, s) => {
  g.fillStyle = '#5d4433'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#3f2d20'; g.fillRect(8, 8, s - 16, s - 16);
  const cx = s / 2, cy = s / 2;
  g.strokeStyle = '#ff9a3c'; g.lineWidth = 7;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    g.lineTo(cx + Math.cos(a) * 66, cy + Math.sin(a) * 66);
    g.stroke();
  }
  g.beginPath(); g.arc(cx, cy, 36, 0, Math.PI * 2); g.fillStyle = '#ffc46b'; g.fill();
  g.beginPath(); g.arc(cx, cy, 36, 0, Math.PI * 2); g.strokeStyle = '#e05a1e'; g.lineWidth = 4; g.stroke();
  g.fillStyle = 'rgba(255,220,170,.14)'; g.fillRect(0, s - 34, s, 34);
});

const texBags = canvasTexture(128, (g, s) => {
  g.fillStyle = '#6d5a35'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) {
    g.fillStyle = `rgb(${118 + (x + y) % 3 * 8},${100 + (x + y) % 3 * 6},58)`;
    g.beginPath(); g.ellipse(x * 64 + 32, y * 32 + 17, 30, 14, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,30,10,.5)'; g.lineWidth = 2; g.stroke();
  }
});

const texSky = canvasTexture(512, (g, s) => {
  const grad = g.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, '#2c2140');
  grad.addColorStop(.38, '#6e3455');
  grad.addColorStop(.62, '#c65a35');
  grad.addColorStop(.8, '#ff9a3c');
  grad.addColorStop(1, '#ffc46b');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
});
texSky.wrapS = texSky.wrapT = THREE.ClampToEdgeWrapping;

const MAT = {
  stone: new THREE.MeshStandardMaterial({ map: texStone, roughness: .95 }),
  sand: new THREE.MeshStandardMaterial({ map: texSand, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ map: texWood, roughness: .85 }),
  bags: new THREE.MeshStandardMaterial({ map: texBags, roughness: 1 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x8f6c4c, roughness: .95 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x6e5138, roughness: .95 }),
  mural: new THREE.MeshStandardMaterial({ map: texMural, roughness: .9 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x7a3b2e, roughness: .9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 1 }),
};

// solids: {x, z, w, d, h} — centre, footprint, height. Meshes and collision share these.
export const COVER = [
  // crate stacks and sandbag lines around the plaza quadrants
  { x: 14, z: -13, w: 3.4, d: 3.4, h: 3.1, mat: 'wood' }, { x: -15, z: 12, w: 3.4, d: 3.4, h: 3.1, mat: 'wood' },
  { x: 16, z: 15, w: 3.2, d: 3.2, h: 2.2, mat: 'wood' }, { x: -13, z: -16, w: 3.2, d: 3.2, h: 2.2, mat: 'wood' },
  { x: 9, z: 4, w: 5.4, d: 1.1, h: 1.15, mat: 'bags' }, { x: -9, z: -4, w: 5.4, d: 1.1, h: 1.15, mat: 'bags' },
  { x: 4, z: -10, w: 1.1, d: 5.4, h: 1.15, mat: 'bags' }, { x: -4, z: 10, w: 1.1, d: 5.4, h: 1.15, mat: 'bags' },
  { x: 24, z: 2, w: 2.6, d: 2.6, h: 2.6, mat: 'wood' }, { x: -24, z: -2, w: 2.6, d: 2.6, h: 2.6, mat: 'wood' },
  { x: 2, z: 24, w: 2.6, d: 2.6, h: 2.6, mat: 'wood' }, { x: -2, z: -24, w: 2.6, d: 2.6, h: 2.6, mat: 'wood' },
  // pillars of the ruined arcade
  { x: 20, z: -20, w: 1.6, d: 1.6, h: 5.4, mat: 'wall' }, { x: -20, z: 20, w: 1.6, d: 1.6, h: 5.4, mat: 'wall' },
  { x: 20, z: 20, w: 1.6, d: 1.6, h: 5.4, mat: 'wall' }, { x: -20, z: -20, w: 1.6, d: 1.6, h: 5.4, mat: 'wall' },
];

const WALL_T = 1.6, WALL_H = 6.5, HALF = 34; // the plaza is 68 x 68, gates centred on each side
export const BOUNDS = HALF;

function box(scene, x, y, z, w, h, d, mat, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  return m;
}

export function createWorld(scene) {
  scene.fog = new THREE.FogExp2(0x5a3038, 0.0038);

  // Sky dome and the low sun.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), new THREE.MeshBasicMaterial({ map: texSky, side: THREE.BackSide, fog: false }));
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffb36b, 3.1);
  sun.position.set(-120, 62, -48);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x7a4a6e, 0x4a2f1a, 0.6));
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffd9a0'), color: 0xffc98a, transparent: true, opacity: .95, fog: false, depthWrite: false }));
  sunSprite.position.set(-330, 150, -132);
  sunSprite.scale.setScalar(190);
  scene.add(sunSprite);

  // Ground: plaza stone inside, open desert beyond the walls.
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 8, HALF * 2 + 8), MAT.stone);
  plaza.rotation.x = -Math.PI / 2; plaza.receiveShadow = true;
  scene.add(plaza);
  const desert = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), MAT.sand);
  desert.rotation.x = -Math.PI / 2; desert.position.y = -0.06; desert.receiveShadow = true;
  scene.add(desert);

  // The ember rune circle around the dais.
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 7.3, 48), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: .5, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
  scene.add(ring);

  // Perimeter walls with a gate gap (7 wide) centred on each side; murals face inward.
  const solids = [];
  const wallSeg = (x, z, w, d) => { box(scene, x, WALL_H / 2, z, w, WALL_H, d, MAT.wall); solids.push({ x, z, w, d, h: WALL_H }); };
  const segLen = (HALF * 2 - 7) / 2;
  for (const s of [-1, 1]) {
    // north & south walls (along x), gate at x=0
    wallSeg(s * (3.5 + segLen / 2), -HALF, segLen, WALL_T);
    wallSeg(s * (3.5 + segLen / 2), HALF, segLen, WALL_T);
    // east & west walls (along z), gate at z=0
    wallSeg(-HALF, s * (3.5 + segLen / 2), WALL_T, segLen);
    wallSeg(HALF, s * (3.5 + segLen / 2), WALL_T, segLen);
    // gate posts
    box(scene, s * 3.9, 3.4, -HALF, 0.9, 6.8, 2.2, MAT.wallDark); box(scene, s * 3.9, 3.4, HALF, 0.9, 6.8, 2.2, MAT.wallDark);
    box(scene, -HALF, 3.4, s * 3.9, 2.2, 6.8, 0.9, MAT.wallDark); box(scene, HALF, 3.4, s * 3.9, 2.2, 6.8, 0.9, MAT.wallDark);
    solids.push({ x: s * 3.9, z: -HALF, w: 0.9, d: 2.2, h: 6.8 }, { x: s * 3.9, z: HALF, w: 0.9, d: 2.2, h: 6.8 });
    solids.push({ x: -HALF, z: s * 3.9, w: 2.2, d: 0.9, h: 6.8 }, { x: HALF, z: s * 3.9, w: 2.2, d: 0.9, h: 6.8 });
  }
  // Murals on the inner faces.
  for (const [x, z, ry] of [[-14, -HALF + WALL_T / 2 + 0.06, 0], [14, HALF - WALL_T / 2 - 0.06, Math.PI], [-HALF + WALL_T / 2 + 0.06, 14, Math.PI / 2], [HALF - WALL_T / 2 - 0.06, -14, -Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), MAT.mural);
    m.position.set(x, 3.4, z); m.rotation.y = ry;
    scene.add(m);
  }
  // Terracotta roofline caps along the walls.
  for (const s of [-1, 1]) {
    box(scene, 0, WALL_H + 0.3, s * HALF, HALF * 2, 0.6, WALL_T + 0.7, MAT.roof);
    box(scene, s * HALF, WALL_H + 0.3, 0, WALL_T + 0.7, 0.6, HALF * 2, MAT.roof);
  }

  // Cover pieces.
  for (const c of COVER) {
    box(scene, c.x, c.h / 2, c.z, c.w, c.h, c.d, MAT[c.mat]);
    solids.push({ x: c.x, z: c.z, w: c.w, d: c.d, h: c.h });
  }

  // Lamp posts with warm glows, lit early against the dusk.
  const lampGlow = glowTexture('#ffb36b');
  for (const [x, z] of [[11, -11], [-11, 11], [11, 11], [-11, -11], [26, -26], [-26, 26]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.6, 6), MAT.dark);
    pole.position.set(x, 2.3, z); pole.castShadow = true;
    scene.add(pole);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlow, color: 0xffc98a, transparent: true, opacity: .85, depthWrite: false }));
    spr.position.set(x, 4.75, z); spr.scale.setScalar(3.4);
    scene.add(spr);
    const pt = new THREE.PointLight(0xffa050, 12, 17, 1.8);
    pt.position.set(x, 4.6, z);
    scene.add(pt);
  }

  // Town skyline and dunes on the horizon, minaret silhouettes against the sunset.
  const silMat = new THREE.MeshBasicMaterial({ color: 0x4a2c3a, fog: true });
  const silMat2 = new THREE.MeshBasicMaterial({ color: 0x5d3644, fog: true });
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
    const dist = 120 + rnd() * 70;
    const w = 14 + rnd() * 22, h = 8 + rnd() * 20;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), rnd() > .5 ? silMat : silMat2);
    m.position.set(Math.cos(a) * dist, h / 2 - 1, Math.sin(a) * dist);
    m.rotation.y = rnd() * Math.PI;
    scene.add(m);
  }
  for (const [x, z] of [[105, -70], [-95, 88]]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 34, 8), silMat);
    tower.position.set(x, 16, z); scene.add(tower);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 10, 8), silMat2);
    dome.position.set(x, 34.5, z); scene.add(dome);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 7, 6), silMat);
    spire.position.set(x, 41, z); scene.add(spire);
  }

  // The dais and the Ember Crystal.
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.4, 0.7, 24), MAT.wallDark);
  dais.position.y = 0.35; dais.receiveShadow = true; dais.castShadow = true;
  scene.add(dais);
  solids.push({ x: 0, z: 0, w: 8.6, d: 8.6, h: 0.7 });
  const crystal = new THREE.Group();
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.55),
    new THREE.MeshStandardMaterial({ color: 0xff8a30, emissive: 0xff6a00, emissiveIntensity: 1.6, roughness: .25, metalness: .1 }),
  );
  gem.scale.y = 1.5;
  crystal.add(gem);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
  core.scale.y = 1.5;
  crystal.add(core);
  crystal.position.set(0, 2.6, 0);
  scene.add(crystal);
  const crystalLight = new THREE.PointLight(0xff8a30, 60, 30, 1.6);
  crystalLight.position.set(0, 3, 0);
  scene.add(crystalLight);
  const crystalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ff9a3c'), color: 0xffa050, transparent: true, opacity: .55, depthWrite: false }));
  crystalGlow.scale.setScalar(11);
  crystalGlow.position.copy(crystal.position);
  scene.add(crystalGlow);

  // Drifting ember motes over the plaza.
  const moteCount = 130;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (Math.random() - .5) * 90;
    motePos[i * 3 + 1] = Math.random() * 9 + .4;
    motePos[i * 3 + 2] = (Math.random() - .5) * 90;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xffb36b, size: .16, transparent: true, opacity: .8 }));
  scene.add(motes);

  const gates = [new THREE.Vector3(0, 0, -HALF - 3), new THREE.Vector3(0, 0, HALF + 3), new THREE.Vector3(-HALF - 3, 0, 0), new THREE.Vector3(HALF + 3, 0, 0)];

  return {
    solids,
    gates,
    crystalPos: new THREE.Vector3(0, 0, 0),
    setCrystalHealth(frac) {
      gem.material.emissiveIntensity = 0.35 + frac * 1.4;
      crystalLight.intensity = 12 + frac * 52;
      crystalGlow.material.opacity = 0.14 + frac * 0.45;
    },
    update(dt, t) {
      crystal.rotation.y = t * 0.35;
      crystal.position.y = 2.6 + Math.sin(t * 1.3) * 0.16;
      crystalGlow.position.y = crystal.position.y;
      ring.material.opacity = 0.38 + Math.sin(t * 2.1) * 0.14;
      const p = moteGeo.attributes.position.array;
      for (let i = 0; i < moteCount; i++) {
        p[i * 3 + 1] += dt * (0.25 + (i % 5) * 0.07);
        p[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.35;
        if (p[i * 3 + 1] > 10) p[i * 3 + 1] = 0.3;
      }
      moteGeo.attributes.position.needsUpdate = true;
    },
  };
}

function glowTexture(inner) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, 'rgba(255,150,60,.45)');
  grad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Circle-vs-solids collision: push (x, z) out of every box it overlaps, and clamp to the
// plaza bounds (gates are gaps in the walls, but the playable field stays inside).
export function collide(solids, x, z, r) {
  for (const s of solids) {
    const dx = x - s.x, dz = z - s.z;
    const px = s.w / 2 + r - Math.abs(dx), pz = s.d / 2 + r - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) x = s.x + (dx > 0 ? s.w / 2 + r : -s.w / 2 - r);
      else z = s.z + (dz > 0 ? s.d / 2 + r : -s.d / 2 - r);
    }
  }
  const lim = BOUNDS - r - 0.4;
  return [Math.max(-lim, Math.min(lim, x)), Math.max(-lim, Math.min(lim, z))];
}
