import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Sfx } from './audio.js';
import { coinTextures, floorTexture, stripeTexture, plateTexture, wallTexture, glowSprite, textTexture } from './textures.js?v=2.1.1';
import { buildDafeiyu } from './mascot.js?v=2.1.1';
import { loadCharacterArt, characterSources } from './character-art.js?v=2.1.1';
import { Slot } from './slot.js?v=2.1.1';
import { Run, UPGRADES, TARGETS } from './roguelike.js';

await loadCharacterArt();
for (const img of document.querySelectorAll('[data-character]')) img.src = characterSources[img.dataset.character];

// ================== 常量 ==================
const HALF_W = 5, FRONT_Z = 4, BACK_Z = -10, WALL_Z = -6.2;
const PUSH_H = 1.2, PUSH_D = 6, PUSH_BACK = -3.0;   // 推板前沿最靠后位置
const COIN_R = 0.58, COIN_H = 0.15;
const GAP_Z = -0.6;                // 侧墙在此结束，之后两侧为漏币口
const DROP_Y = 3.3, DROP_Z = -4.75, GATE_Y = 2.35;
const TRAY_Y = -2.8, MAX_COINS = 420;
const SAVE_KEY = 'raccoon-pusher-run-v2'; // v1 arcade save is intentionally untouched
const isTouch = matchMedia('(pointer: coarse)').matches;

// ================== 渲染器 / 场景 ==================
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.6 : 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#071321');
scene.fog = new THREE.Fog('#071321', 28, 60);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.65;

const camera = new THREE.PerspectiveCamera(46, app.clientWidth / app.clientHeight, 0.1, 150);
const CAM_POS = new THREE.Vector3(0, 12.6, 15.4), CAM_TARGET = new THREE.Vector3(0, 2.0, -1.2);
const CAM_DIR = CAM_POS.clone().sub(CAM_TARGET).normalize();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(app.clientWidth, app.clientHeight), 0.42, 0.38, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight('#c8eaff', '#0d2035', 0.35));
const key = new THREE.DirectionalLight('#fff1dd', 2.0);
key.position.set(4, 16, 8); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 10, bottom: -10, near: 1, far: 40 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key);
const pinkL = new THREE.PointLight('#ff4fd8', 6, 14, 1.8); pinkL.position.set(-6, 4, 1); scene.add(pinkL);
const cyanL = new THREE.PointLight('#3fe6ff', 6, 14, 1.8); cyanL.position.set(6, 4, 1); scene.add(cyanL);
const screenL = new THREE.PointLight('#ffb54a', 5, 9, 1.8); screenL.position.set(0, 5, -4.5); scene.add(screenL);

// ================== 材质 ==================
const ct = coinTextures();
const coinFaceMat = new THREE.MeshStandardMaterial({ map: ct.face, bumpMap: ct.bump, bumpScale: 1.6, metalness: 1, roughness: 0.3, color: '#ffffff' });
const coinSideMat = new THREE.MeshStandardMaterial({ map: ct.side, metalness: 1, roughness: 0.35 });
const chrome = new THREE.MeshStandardMaterial({ color: '#dfe6ef', metalness: 1, roughness: 0.18 });
const orange = new THREE.MeshStandardMaterial({ color: '#347fb3', roughness: 0.5, metalness: 0.15 });
const brown = new THREE.MeshStandardMaterial({ color: '#c5e5ee', roughness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: '#10263c', roughness: 0.9 });
const glass = new THREE.MeshPhysicalMaterial({ color: '#bff6ff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });

// ================== 物理世界 ==================
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -24, z: 0 });
world.timestep = 1 / 60;
world.integrationParameters.numSolverIterations = 4;
const F_FLOOR = 0.2, F_COIN = 0.32, F_PUSH = 0.55;
function staticBox(hx, hy, hz, x, y, z, fr = F_FLOOR) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(fr).setRestitution(0.1), body);
  return body;
}
function meshBox(w, h, d, mat, x, y, z, rounded = 0, parent = scene) {
  const geo = rounded ? new RoundedBoxGeometry(w, h, d, 3, rounded) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}

// ---------- 场地 ----------
const fieldLen = FRONT_Z - BACK_Z;
staticBox(HALF_W, 0.5, fieldLen / 2, 0, -0.5, (FRONT_Z + BACK_Z) / 2);
const ftex = floorTexture(); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(1, 1.3);
const floorMat = new THREE.MeshStandardMaterial({ map: ftex, metalness: 0.55, roughness: 0.32 });
meshBox(HALF_W * 2, 0.5, fieldLen, floorMat, 0, -0.25, (FRONT_Z + BACK_Z) / 2);
// 前沿镀铬边
const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, HALF_W * 2, 16), chrome);
lip.rotation.z = Math.PI / 2; lip.position.set(0, -0.02, FRONT_Z); scene.add(lip);
// 侧墙（亚克力）
for (const s of [-1, 1]) {
  const len = GAP_Z - BACK_Z;
  staticBox(0.1, 1.6, len / 2, s * (HALF_W + 0.1), 1.6, (GAP_Z + BACK_Z) / 2);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.6), glass); g.rotation.y = Math.PI / 2; g.position.set(s * (HALF_W + 0.02), 1.3, (GAP_Z + BACK_Z) / 2); scene.add(g);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 12), chrome); rail.rotation.x = Math.PI / 2; rail.position.set(s * (HALF_W + 0.05), 2.6, (GAP_Z + BACK_Z) / 2); scene.add(rail);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12), chrome); post.position.set(s * (HALF_W + 0.05), 1.3, GAP_Z); scene.add(post);
  // 外侧机柜立柱
  meshBox(1.3, 7.5, 14.6, orange, s * (HALF_W + 1.55), -0.95, -3.0, 0.25);
  meshBox(1.34, 0.25, 14.64, brown, s * (HALF_W + 1.55), 2.6, -3.0, 0.1);
  // 漏币槽（黑洞）
  meshBox(0.8, 0.1, FRONT_Z - BACK_Z + 0.6, darkMat, s * (HALF_W + 0.5), -3.0, (FRONT_Z + BACK_Z) / 2);
}
// 漏币槽外墙（物理）
for (const s of [-1, 1]) staticBox(0.1, 3, 8, s * (HALF_W + 0.95), 0, -2);

// 侧挡板（奖励：护墙）
const guards = [-1, 1].map(s => {
  const len = FRONT_Z - GAP_Z;
  const body = staticBox(0.1, 0.7, len / 2, s * (HALF_W + 0.1), -20, (FRONT_Z + GAP_Z) / 2);
  const mesh = meshBox(0.16, 1.4, len, new THREE.MeshStandardMaterial({ color: '#5ff7ff', emissive: '#18c8ff', emissiveIntensity: 1.6, transparent: true, opacity: 0.55, roughness: 0.2 }), s * (HALF_W + 0.1), -1, (FRONT_Z + GAP_Z) / 2, 0.06);
  mesh.castShadow = false;
  return { body, mesh, y: -1 };
});

// ---------- 后墙 + 老虎机屏幕 ----------
staticBox(HALF_W, 3.2, 0.15, 0, PUSH_H + 0.035 + 3.2, WALL_Z - 0.15, 0.1);
const wt = wallTexture(); wt.repeat.set(3, 2.4);
meshBox(HALF_W * 2 + 0.3, 7.6, 0.3, new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6, metalness: 0.2 }), 0, PUSH_H + 0.035 + 3.8, WALL_Z - 0.15);
const slotSfx = new Sfx();
const slot = new Slot(slotSfx, o => onSlot(o));
const SCREEN_W = 6.4, SCREEN_H = 3.6, SCREEN_Y = 5.55;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), new THREE.MeshBasicMaterial({ map: slot.texture, toneMapped: false }));
screen.position.set(0, SCREEN_Y, WALL_Z + 0.02); scene.add(screen);
screen.material.color.setScalar(0.92);
const frameMat = new THREE.MeshStandardMaterial({ color: '#ffc93c', metalness: 0.9, roughness: 0.25 });
meshBox(SCREEN_W + 0.5, 0.25, 0.25, frameMat, 0, SCREEN_Y + SCREEN_H / 2 + 0.12, WALL_Z + 0.05, 0.1);
meshBox(SCREEN_W + 0.5, 0.25, 0.25, frameMat, 0, SCREEN_Y - SCREEN_H / 2 - 0.12, WALL_Z + 0.05, 0.1);
meshBox(0.25, SCREEN_H + 0.5, 0.25, frameMat, -SCREEN_W / 2 - 0.12, SCREEN_Y, WALL_Z + 0.05, 0.1);
meshBox(0.25, SCREEN_H + 0.5, 0.25, frameMat, SCREEN_W / 2 + 0.12, SCREEN_Y, WALL_Z + 0.05, 0.1);
// 顶部招牌
const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.5), new THREE.MeshBasicMaterial({ map: textTexture('大肥鱼推币机', 1024, 170, { color: '#fff0a8', strokeColor: '#15547d', stroke: 22, font: '900 105px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' }), transparent: true, toneMapped: false }));
sign.position.set(0, SCREEN_Y + SCREEN_H / 2 + 1.05, WALL_Z + 0.1); scene.add(sign);

// ---------- 推板 ----------
const pusherBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, PUSH_H / 2, PUSH_BACK - PUSH_D / 2));
world.createCollider(RAPIER.ColliderDesc.cuboid(HALF_W - 0.03, PUSH_H / 2, PUSH_D / 2).setFriction(F_PUSH).setRestitution(0), pusherBody);
const ptop = plateTexture(); ptop.repeat.set(4, 2.4);
const pusherMats = [chrome, chrome, new THREE.MeshStandardMaterial({ map: ptop, metalness: 0.85, roughness: 0.28 }), chrome, new THREE.MeshStandardMaterial({ map: stripeTexture('#ff7a18', '#ffc53d', 'PUSH'), metalness: 0.3, roughness: 0.35 }), chrome];
const pusherMesh = new THREE.Mesh(new THREE.BoxGeometry((HALF_W - 0.03) * 2, PUSH_H, PUSH_D), pusherMats);
pusherMesh.castShadow = pusherMesh.receiveShadow = true; scene.add(pusherMesh);
let pushPhase = -Math.PI / 2, pushMax = -0.5, pushMaxTarget = -0.5, pushSpeed = 1.55;
function physicsStep() {
  const dt = world.timestep;
  pushMax += (pushMaxTarget - pushMax) * 0.01;
  pushPhase += dt * pushSpeed;
  const mid = (PUSH_BACK + pushMax) / 2, amp = (pushMax - PUSH_BACK) / 2;
  pusherBody.setNextKinematicTranslation({ x: 0, y: PUSH_H / 2, z: mid + amp * Math.sin(pushPhase) - PUSH_D / 2 });
  for (const c of coins) { const v = c.body.linvel(); if (v.y < -9) c.body.setLinvel({ x: v.x, y: -9, z: v.z }, true); }
  world.step();
}
let acc = 0;
function stepWorld(dt) { acc += dt; let n = 0; while (acc >= world.timestep && n < 3) { physicsStep(); acc -= world.timestep; n++; } if (n === 3) acc = 0; }

// ================== 硬币系统 ==================
const coinGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 40, 1);
const coinMesh = new THREE.InstancedMesh(coinGeo, [coinSideMat, coinFaceMat, coinFaceMat], MAX_COINS);
coinMesh.castShadow = coinMesh.receiveShadow = true; coinMesh.count = 0; coinMesh.frustumCulled = false;
coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(coinMesh);
const SHAPES = {
  coin: () => RAPIER.ColliderDesc.roundCylinder(COIN_H / 2 - 0.02, COIN_R - 0.02, 0.02).setDensity(10),
  big: () => RAPIER.ColliderDesc.roundCylinder(0.08, 0.83, 0.02).setDensity(6),
  gem: () => RAPIER.ColliderDesc.cylinder(0.3, 0.4).setDensity(4),
  plush: () => RAPIER.ColliderDesc.cuboid(0.42, 0.5, 0.36).setDensity(1.5),
};
const coins = [];
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

const bigMat = new THREE.MeshStandardMaterial({ map: ct.face, bumpMap: ct.bump, bumpScale: 2, metalness: 1, roughness: 0.2, color: '#ffd77a', emissive: '#6a3a00', emissiveIntensity: 0.5 });
const gemMat = new THREE.MeshPhysicalMaterial({ color: '#36e0ff', metalness: 0.1, roughness: 0.04, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, emissive: '#0a5a8a', emissiveIntensity: 0.6, flatShading: true });
function makeSpecialMesh(kind) {
  if (kind === 'big') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 48), [coinSideMat, bigMat, bigMat]); m.castShadow = true; return m; }
  if (kind === 'gem') {
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 6), gemMat); g.add(a);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.22, 6), gemMat); t.position.y = 0.26; g.add(t);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.22, 6), gemMat); b.rotation.x = Math.PI; b.position.y = -0.26; g.add(b);
    g.children.forEach(c => c.castShadow = true); return g;
  }
  const r = buildDafeiyu(coinFaceMat); r.root.scale.setScalar(0.48); r.root.position.y = -0.5;
  const g = new THREE.Group(); g.add(r.root); g.userData.rac = r; return g;
}
const VALUES = { coin: 1, big: 10, gem: 20, plush: 30 };

function spawn(kind, x, y, z, q, vel) {
  if (coins.length >= MAX_COINS) return null;
  const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinearDamping(0.05).setAngularDamping(0.3).setCcdEnabled(!!vel);
  if (q) bd.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  if (vel) bd.setLinvel(vel.x, vel.y, vel.z);
  const body = world.createRigidBody(bd);
  world.createCollider(SHAPES[kind]().setFriction(F_COIN).setRestitution(0.08), body);
  const c = { p: { x, y, z }, body, kind, state: 'field', t: 0, scale: 1, prevY: y, gated: false, fromDrop: false, pv: { x: 0, y: vel ? vel.y : 0, z: 0 } };
  if (kind !== 'coin') { c.mesh = makeSpecialMesh(kind); scene.add(c.mesh); }
  coins.push(c);
  return c;
}
function removeCoin(i) {
  const c = coins[i]; world.removeRigidBody(c.body);
  if (c.mesh) scene.remove(c.mesh);
  coins[i] = coins[coins.length - 1]; coins.pop();
}
const randQ = (tilt = 0.12) => new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * tilt, Math.random() * 6.28, (Math.random() - 0.5) * tilt));
const V = (x, y, z) => ({ x, y, z });

function syncCoins() {
  let n = 0;
  for (const c of coins) {
    const p = c.p = c.body.translation(), q = c.body.rotation();
    if (c.kind === 'coin') {
      tmpV.set(p.x, p.y, p.z); tmpQ.set(q.x, q.y, q.z, q.w); tmpS.setScalar(c.scale);
      tmpM.compose(tmpV, tmpQ, tmpS); coinMesh.setMatrixAt(n++, tmpM);
    } else {
      c.mesh.position.set(p.x, p.y, p.z); c.mesh.quaternion.set(q.x, q.y, q.z, q.w); c.mesh.scale.setScalar(c.scale);
    }
  }
  coinMesh.count = n; coinMesh.instanceMatrix.needsUpdate = true;
}

// ================== 投币器 + 幸运门 ==================
const dropper = new THREE.Group(); scene.add(dropper);
meshBox(1.0, 0.5, 0.7, orange, 0, 0.15, 0, 0.12, dropper);
meshBox(0.7, 0.2, 0.25, darkMat, 0, -0.12, 0, 0.05, dropper);
const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, HALF_W * 2, 12), chrome); rail.rotation.z = Math.PI / 2; rail.position.set(0, DROP_Y + 0.4, DROP_Z - 0.2); scene.add(rail);
dropper.position.set(0, DROP_Y, DROP_Z);
const laserMat = new THREE.MeshBasicMaterial({ color: '#ff3d6e', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, DROP_Y - PUSH_H, 6), laserMat);
laser.position.y = -(DROP_Y - PUSH_H) / 2; dropper.add(laser);
const laserDot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), laserMat); laserDot.rotation.x = -Math.PI / 2; laserDot.position.y = -(DROP_Y - PUSH_H) + 0.02; dropper.add(laserDot);

const gate = new THREE.Group(); scene.add(gate);
const GATE_HW = 0.62;
const gatePath = new THREE.CatmullRomCurve3([[-GATE_HW, 0, -0.5], [GATE_HW, 0, -0.5], [GATE_HW, 0, 0.5], [-GATE_HW, 0, 0.5]].map(a => new THREE.Vector3(...a)), true, 'catmullrom', 0.05);
const gateMat = new THREE.MeshStandardMaterial({ color: '#7dff9a', emissive: '#22ff77', emissiveIntensity: 2.2, roughness: 0.3 });
gate.add(new THREE.Mesh(new THREE.TubeGeometry(gatePath, 64, 0.06, 10, true), gateMat));
const gateLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: textTexture('LUCKY', 256, 64, { color: '#b6ffcb', strokeColor: '#0a4020', stroke: 8 }), transparent: true, toneMapped: false, depthWrite: false }));
gateLabel.position.set(0, 0.32, -0.5); gate.add(gateLabel);
const gateArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), chrome); gateArm.rotation.x = Math.PI / 2; gateArm.position.set(0, 0, -0.95); gate.add(gateArm);
const gateRail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, HALF_W * 2, 12), chrome); gateRail.rotation.z = Math.PI / 2; gateRail.position.set(0, GATE_Y, WALL_Z + 0.08); scene.add(gateRail);
gate.position.set(0, GATE_Y, DROP_Z);

// ================== LED 灯泡 ==================
const ledPos = [];
for (const s of [-1, 1]) for (let z = -9.4; z <= 4.3; z += 0.5) ledPos.push([s * (HALF_W + 1.55), 2.78, z, 0]);
for (let x = -HALF_W + 0.2; x <= HALF_W; x += 0.45) ledPos.push([x, -0.16, FRONT_Z + 0.09, 1]);
{
  const fx = SCREEN_W / 2 + 0.12, fy = SCREEN_H / 2 + 0.12;
  for (let x = -fx; x <= fx + 0.01; x += 0.42) { ledPos.push([x, SCREEN_Y + fy, WALL_Z + 0.2, 2]); ledPos.push([x, SCREEN_Y - fy, WALL_Z + 0.2, 2]); }
  for (let y = -fy + 0.42; y < fy; y += 0.42) { ledPos.push([-fx, SCREEN_Y + y, WALL_Z + 0.2, 2]); ledPos.push([fx, SCREEN_Y + y, WALL_Z + 0.2, 2]); }
}
const leds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), ledPos.length);
ledPos.forEach((p, i) => { tmpM.makeTranslation(p[0], p[1], p[2]); leds.setMatrixAt(i, tmpM); leds.setColorAt(i, new THREE.Color(1, 1, 1)); });
scene.add(leds);
const ledCol = new THREE.Color();
function updateLeds(t) {
  const fever = feverT > 0, party = partyT > 0;
  ledPos.forEach((p, i) => {
    let on;
    if (party) { ledCol.setHSL((i * 0.03 + t * 1.5) % 1, 1, 0.6); on = (Math.floor(t * 12) + i) % 3 !== 0 ? 1 : 0.15; }
    else if (fever) { ledCol.setHSL((i * 0.05 + t) % 1, 1, 0.6); on = (Math.floor(t * 18) + i) % 2 ? 1 : 0.2; }
    else {
      const ph = p[3] === 2 ? Math.floor(t * 6) : Math.floor(t * 8);
      on = (ph + i) % 4 === 0 ? 1.4 : 0.35;
      if (p[3] === 0) ledCol.set('#ffcf5a'); else if (p[3] === 1) ledCol.set('#ff5fd2'); else ledCol.set(i % 2 ? '#7cf3ff' : '#ffe86b');
    }
    ledCol.multiplyScalar(on * 1.6); leds.setColorAt(i, ledCol);
  });
  leds.instanceColor.needsUpdate = true;
}

// 出币托盘
staticBox(HALF_W, 0.2, 1.3, 0, TRAY_Y - 0.2, FRONT_Z + 1.4);
staticBox(HALF_W, 0.8, 0.1, 0, TRAY_Y + 0.5, FRONT_Z + 2.75);
meshBox(HALF_W * 2 + 0.3, 0.4, 2.8, new THREE.MeshStandardMaterial({ color: '#2a1440', metalness: 0.6, roughness: 0.3 }), 0, TRAY_Y - 0.2, FRONT_Z + 1.4);
const trayFront = meshBox(HALF_W * 2 + 2.4, 1.8, 0.3, new THREE.MeshStandardMaterial({ map: stripeTexture('#4389b5', '#d3eef5', 'WIN!'), roughness: 0.4, metalness: 0.2 }), 0, TRAY_Y + 0.1, FRONT_Z + 2.9, 0.1);
meshBox(HALF_W * 2 + 2.4, 3, 0.3, darkMat, 0, TRAY_Y - 2.4, FRONT_Z + 2.9);
meshBox(HALF_W * 2 + 0.2, 2.6, 0.2, darkMat, 0, -1.6, FRONT_Z + 0.05);

// ================== 吉祥物 ==================
const mascot = buildDafeiyu(coinFaceMat);
mascot.root.position.set(-HALF_W - 1.55, 2.73, -1.2); mascot.root.scale.setScalar(1.25); mascot.root.rotation.y = 0.55;
mascot.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
scene.add(mascot.root);

// ================== 粒子 ==================
const SP_N = 900;
const spGeo = new THREE.BufferGeometry();
const spPos = new Float32Array(SP_N * 3), spCol = new Float32Array(SP_N * 3), sp = [];
for (let i = 0; i < SP_N; i++) { sp.push({ life: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1 }); spPos[i * 3 + 1] = -100; }
spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ size: 0.32, map: glowSprite(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
sparkles.frustumCulled = false; scene.add(sparkles);
let spIdx = 0;
function burst(x, y, z, n = 14, color = '#ffd34d', speed = 4, up = 4) {
  const c = new THREE.Color(color);
  for (let k = 0; k < n; k++) {
    const p = sp[spIdx], i = spIdx; spIdx = (spIdx + 1) % SP_N;
    p.life = 0.6 + Math.random() * 0.6; p.max = p.life;
    const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
    p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = up * (0.4 + Math.random());
    spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z;
    const h = c.clone().offsetHSL((Math.random() - 0.5) * 0.08, 0, Math.random() * 0.2); p.r = h.r * 2; p.g = h.g * 2; p.b = h.b * 2;
  }
}
function updateSparkles(dt) {
  for (let i = 0; i < SP_N; i++) {
    const p = sp[i]; if (p.life <= 0) continue;
    p.life -= dt; p.vy -= 9 * dt;
    spPos[i * 3] += p.vx * dt; spPos[i * 3 + 1] += p.vy * dt; spPos[i * 3 + 2] += p.vz * dt;
    const k = Math.max(0, p.life / p.max);
    spCol[i * 3] = p.r * k; spCol[i * 3 + 1] = p.g * k; spCol[i * 3 + 2] = p.b * k;
    if (p.life <= 0) spPos[i * 3 + 1] = -100;
  }
  spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true;
}
// 彩带
const CF_N = 360, cf = [];
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.28), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CF_N);
confetti.frustumCulled = false; scene.add(confetti);
for (let i = 0; i < CF_N; i++) { cf.push({ life: 0, p: new THREE.Vector3(0, -100, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }); confetti.setColorAt(i, new THREE.Color().setHSL(i / CF_N * 7 % 1, 0.9, 0.6)); }
let cfIdx = 0;
function confettiBurst(n = 200) {
  for (let k = 0; k < n; k++) {
    const c = cf[cfIdx]; cfIdx = (cfIdx + 1) % CF_N;
    c.life = 3 + Math.random() * 2; c.p.set((Math.random() - 0.5) * 12, 9 + Math.random() * 3, -2 + (Math.random() - 0.5) * 8);
    c.v.set((Math.random() - 0.5) * 3, -1 - Math.random() * 2, (Math.random() - 0.5) * 2);
    c.w.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
  }
}
function updateConfetti(dt) {
  for (let i = 0; i < CF_N; i++) {
    const c = cf[i];
    if (c.life > 0) {
      c.life -= dt; c.v.y = Math.max(-2.2, c.v.y - 3 * dt); c.p.addScaledVector(c.v, dt); c.p.x += Math.sin(c.life * 3 + i) * dt;
      c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
      if (c.life <= 0) c.p.y = -100;
    }
    tmpQ.setFromEuler(c.r); tmpM.compose(c.p, tmpQ, tmpS.setScalar(1)); confetti.setMatrixAt(i, tmpM);
  }
  confetti.instanceMatrix.needsUpdate = true;
}

// ================== 游戏状态 ==================
const sfx = slotSfx;
let run = new Run();
const state = { coins: 50, won: 0, col: { big: 0, gem: 0, plush: 0 }, jackpots: 0 };
let wallT = 0, pushT = 0, feverT = 0, partyT = 0, shake = 0, started = false;
let resultPhase = '', resetting = false; 
const stats = { lost: 0 }; const winTimes = []; let combo = 0, lastWin = -100, showerQueue = [];
const inputOpen = () => started && run.phase === 'playing' && !$('help').classList.contains('show') && !document.hidden;

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const hud = { coins: $('coins'), won: $('won') };
function updateHud(dt) {
  state.coins = run.shots;
  hud.coins.textContent = run.shots;
  hud.won.textContent = run.total.toLocaleString();
  $('round-number').textContent = `${run.round} / 8`;
  $('round-score').textContent = run.score.toLocaleString();
  $('round-target').textContent = run.target.toLocaleString();
  $('scorebar').style.width = `${Math.min(100, run.score / run.target * 100)}%`;
  $('scorebar').parentElement.setAttribute('aria-valuenow', Math.min(100, Math.round(run.score / run.target * 100)));
  $('base-mult').textContent = `×${run.multiplier.toFixed(2)}`;
  $('cash').textContent = run.cash;
  $('round-status').textContent = run.phase === 'settling' ? `落币结算 ${Math.ceil(run.settle)}s` : run.reached ? '目标达成' : '限量投币挑战';
  const action = $('round-action');
  action.hidden = !run.active || !started || (!run.reached && run.phase !== 'settling');
  action.disabled = !run.reached;
  action.textContent = run.reached ? '目标达成 · 结算本关 →' : run.phase === 'settling' ? `等待落币 ${Math.ceil(run.settle)}s` : '达到目标分后可结算';
  $('dropbtn').disabled = !inputOpen() || run.shots <= 0;
  renderResult();
}
function bumpCoinHud() { const el = $('coinbox'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
const projV = new THREE.Vector3();
function toScreen(x, y, z) { const r=app.getBoundingClientRect(); projV.set(x, y, z).project(camera); return [r.left+(projV.x + 1) / 2 * r.width, r.top+(1 - projV.y) / 2 * r.height]; }
function floatText(text, x, y, z, cls = '') {
  const [sx, sy] = toScreen(x, y, z), el = document.createElement('div');
  el.className = 'float ' + cls; el.textContent = text; el.style.left = sx + 'px'; el.style.top = sy + 'px';
  $('floats').appendChild(el); setTimeout(() => el.remove(), 1300);
}
let bannerTimer;
function banner(text, cls = '', dur = 1800) {
  const el = $('banner'); el.className = ''; el.innerHTML = text; void el.offsetWidth; el.className = 'show ' + cls;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => el.className = '', dur);
}
function flash(color = '#fff') { const el = $('flash'); el.style.background = color; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
const lines = {
  win: ['好耶！', '叮叮叮~', '再来再来！', '发财啦！'], big: ['大奖！！', '开饭开饭！', '哇哦哦哦！'], miss: ['可惜~', '差一点！', '下次一定！'],
  idle: ['投币投币～', '瞄准幸运门！', '咕噜咕噜～', '饭钱要来啦！'], reach: ['听牌了！！', '来啊来啊！', '大鱼要开饭啦！'], poor: ['投币用尽，等硬币落下吧！'],
};
let bubbleT = 0, idleTalk = 6;
function say(kind) {
  const arr = lines[kind], el = $('bubble'); el.textContent = arr[Math.floor(Math.random() * arr.length)];
  el.classList.add('show'); bubbleT = 1.8;
}

// ---------- 结算 ----------
function onWin(c) {
  if (!started || !run.active) return;
  const p = c.body.translation(), val = VALUES[c.kind];
  state.won += val;
  const now = time;
  combo = now - lastWin < 0.7 ? combo + 1 : 0; lastWin = now;
  winTimes.push(now); while (winTimes.length && now - winTimes[0] > 4) winTimes.shift();
  const scored = run.award(c.kind, combo, feverT > 0);
  $('score-formula').textContent = `${scored.base} 基础分 × ${scored.factor.toFixed(2)} = +${scored.points}`;
  if (winTimes.length >= 9 && feverT <= 0) startFever();
  sfx.win(combo, p.x / 6);
  burst(p.x, 0.1, FRONT_Z + 0.2, c.kind === 'coin' ? 10 : 50, c.kind === 'gem' ? '#4fe8ff' : '#ffd34d', c.kind === 'coin' ? 2.5 : 5, 3);
  floatText('+' + scored.points + ' 分', p.x, 0.4, FRONT_Z + 0.3, c.kind === 'coin' ? (feverT > 0 ? 'fever' : '') : 'big');
  bumpCoinHud();
  if (c.kind !== 'coin') {
    state.col[c.kind]++; sfx.prize(); mascot.react('happy', 2); say('big'); shake = 0.25;
    banner({ big: '🏅 大金币', gem: '💎 宝石', plush: '🐋 大肥鱼立牌' }[c.kind] + `<small>+${scored.points} 分</small>`, 'prize', 1500);
  } else if (Math.random() < 0.05) { mascot.react('happy', 0.8); say('win'); }
}
function startFever() {
  feverT = 12 + run.level('fever') * 3; sfx.fast = 1.35; banner(`FEVER!!<small>${feverT} 秒内得分翻倍</small>`, 'fever'); flash('#ff4fd8'); mascot.react('excited', 2);
}
function dropPrize(kind) {
  const x = (Math.random() - 0.5) * 6;
  spawn(kind, x, DROP_Y, DROP_Z + 0.3, randQ(0.3), V(0, -2, 0));
  burst(x, DROP_Y, DROP_Z, 30, '#ffffff', 2, 2);
}
function shower(n, kind = 'coin', delay = 0.05) {
  for (let i = 0; i < n; i++) showerQueue.push({ t: i * delay, kind });
}
function onSlot(o) {
  if (!run.active) return;
  switch (o.id) {
    case 'reach': mascot.react('excited', 2.5); say('reach'); break;
    case 'miss': if (Math.random() < 0.4) say('miss'); break;
    case 'jackpot':
      state.jackpots++; sfx.fanfare(true); partyT = 6; shake = 0.8; flash('#ffe14d'); confettiBurst(360);
      banner('JACKPOT!!!<small>大肥鱼开饭啦 · 金币雨 ×40</small>', 'jp', 3500); mascot.react('jackpot', 5); say('big');
      shower(40, 'coin', 0.06); showerQueue.push({ t: 0.8, kind: 'plush', prize: true }, { t: 1.4, kind: 'gem', prize: true }); showerQueue.sort((a,b) => a.t-b.t); break;
    case 'seven':
      sfx.fanfare(true); partyT = 3; shake = 0.4; flash('#ff6a7a'); confettiBurst(160);
      banner('777 金币雨！<small>×20</small>', 'jp', 2500); mascot.react('jackpot', 3); shower(20); break;
    case 'coin': sfx.fanfare(false); banner('金币 ×10', 'win'); mascot.react('happy', 1.5); shower(10, 'coin', 0.09); say('win'); break;
    case 'wall': sfx.fanfare(false); sfx.whoosh(); wallT = 30; banner('护墙升起！<small>两侧不再漏币 · 30 秒</small>', 'win'); mascot.react('happy', 1.5); break;
    case 'bell': sfx.fanfare(false); banner('奖品掉落！', 'win'); dropPrize(Math.random() < 0.35 ? 'gem' : 'big'); mascot.react('happy', 1.5); break;
    case 'push': sfx.fanfare(false); sfx.whoosh(); pushT = 18; banner('超级推板！<small>推程加长 · 18 秒</small>', 'win'); mascot.react('excited', 1.5); break;
  }
}

// ---------- 投币 ----------
let aimX = 0, holding = false, dropCd = 0;
function dropCoin() {
  if (!inputOpen() || coins.length >= MAX_COINS || !run.spendShot()) return;
  state.coins = run.shots;
  const x = dropper.position.x + (Math.random() - 0.5) * 0.04;
  const c = spawn('coin', x, DROP_Y - 0.3, DROP_Z + (Math.random() - 0.5) * 0.06, randQ(0.1), V(0, -3, 0));
  if (c) c.fromDrop = true;
  sfx.drop(x / 6);
  dropper.scale.y = 0.8;
}

// ================== 存档 ==================
function save() {
  if (resetting) return;
  if (!started && !loaded) return;
  const bodies = coins.filter(c => c.state === 'field').slice(0, MAX_COINS).map(c => {
    const p = c.body.translation(), q = c.body.rotation(), v = c.body.linvel(), a = c.body.angvel();
    return { kind:c.kind, p, q, v, a, fromDrop:c.fromDrop, gated:c.gated, prevY:c.prevY };
  });
  const slotState = {};
  for (const key of ['reels','queue','spinning','t','msg','msgT','reach','flash','lastTick','outcome','result','willReach','stopAt','win']) if (slot[key] !== undefined) slotState[key] = slot[key];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version:2, run:run.serialize(), state, bodies, pushPhase, pushMax, time, wallT, pushT, feverT, partyT, showerQueue, slotState, combo, lastWin, winTimes, lost:stats.lost })); }
  catch (e) { $('save-status').textContent = '无法保存：请检查浏览器存储空间'; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d || d.version !== 2 || !Array.isArray(d.bodies) || d.bodies.length > MAX_COINS) return false;
    const restored = new Run(d.run);
    if (d.bodies.some(b => !SHAPES[b.kind] || !['x','y','z'].every(k => Number.isFinite(b.p?.[k])) || !['x','y','z','w'].every(k => Number.isFinite(b.q?.[k])))) return false;
    run = restored;
    state.coins = run.shots; state.won = d.state?.won || 0; state.col = d.state?.col || {big:0,gem:0,plush:0}; state.jackpots = d.state?.jackpots || 0;
    pushPhase = Number.isFinite(d.pushPhase) ? d.pushPhase : pushPhase;
    pushMax = Number.isFinite(d.pushMax) ? d.pushMax : -0.5;
    const front = (PUSH_BACK + pushMax)/2 + (pushMax - PUSH_BACK)/2 * Math.sin(pushPhase);
    pusherBody.setTranslation(V(0, PUSH_H / 2, front - PUSH_D / 2), true);
    for (const b of d.bodies) {
      const c = spawn(b.kind, b.p.x,b.p.y,b.p.z,b.q,b.v);
      if (c) { c.fromDrop=!!b.fromDrop; c.gated=!!b.gated; c.prevY=Number.isFinite(b.prevY)?b.prevY:b.p.y; if(b.a) c.body.setAngvel(b.a,true); }
    }
    for (const key of ['reels','queue','spinning','t','msg','msgT','reach','flash','lastTick','outcome','result','willReach','stopAt','win']) if (d.slotState?.[key] !== undefined) slot[key]=d.slotState[key];
    wallT=Math.max(0,d.wallT||0); pushT=Math.max(0,d.pushT||0); feverT=Math.max(0,d.feverT||0); partyT=Math.max(0,d.partyT||0);
    showerQueue=Array.isArray(d.showerQueue)?d.showerQueue.filter(s=>SHAPES[s.kind]&&Number.isFinite(s.t)).slice(0,100):[];
    restoredTime=Number.isFinite(d.time)?d.time:0; combo=d.combo||0; lastWin=Number.isFinite(d.lastWin)?d.lastWin:-100; winTimes.push(...(d.winTimes||[])); stats.lost=d.lost||0;
    sfx.fast=feverT>0?1.35:1;
    return true;
  } catch (e) {
    for (let i=coins.length-1;i>=0;i--) removeCoin(i);
    run = new Run(); return false;
  }
}
function initialFill() {
  for (let layer = 0; layer < 2; layer++) {
    for (let r = 0; r < 6; r++) for (let k = 0; k < 8; k++) {
      if (layer === 1 && Math.random() < 0.45) continue;
      const x = -4.15 + k * 1.19 + (r % 2) * 0.3 + (Math.random() - 0.5) * 0.06, z = -2.4 + r * 1.06 + (Math.random() - 0.5) * 0.06;
      if (Math.abs(x) > 4.4) continue;
      spawn('coin', x, COIN_H / 2 + 0.01 + layer * 0.18, z, randQ(0.02));
    }
    for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) {
      if (layer === 1 && Math.random() < 0.5) continue;
      spawn('coin', -4.15 + k * 1.19 + (r % 2) * 0.3, PUSH_H + COIN_H / 2 + 0.01 + layer * 0.18, -5.58 + r * 1.12, randQ(0.02));
    }
  }
  spawn('big', 1.2, 0.5, 2.3, randQ(0.02)); spawn('gem', -2.0, 0.8, 1.2, randQ(0.02));
}
let restoredTime = 0;
const loaded = load();
if (!loaded) initialFill();
// 预热：让堆叠稳定
if (!loaded) for (let i = 0; i < 150; i++) physicsStep();
// 预热期间可能掉落的币不计入
if (!loaded) for (let i = coins.length - 1; i >= 0; i--) if (coins[i].body.translation().y < -0.5) removeCoin(i);

// ================== 关卡结算 / 商店 ==================
function buildSummary() {
  return Object.entries(run.levels).filter(([,n])=>n>0).map(([id,n])=>`${UPGRADES[id].name} Lv.${n}`).join(' · ') || '尚无永久升级';
}
function renderResult(force = false) {
  const phase = run.phase;
  if (run.active || !started) { $('run-modal').hidden=true; resultPhase=''; return; }
  $('run-modal').hidden=false;
  if (resultPhase===phase && !force) return;
  resultPhase=phase; holding=false;
  const shop=phase==='shop', won=phase!=='gameover', r=run.receipt;
  $('result-kicker').textContent = phase==='victory' ? '八关制霸 · RUN COMPLETE' : `第 ${run.round} 关 · ${won?'挑战完成':'本局结束'}`;
  $('result-title').textContent = shop ? '大肥鱼补给站' : won ? '恭喜通关！' : '差一点，再来一局';
  $('result-score').textContent = run.score.toLocaleString();
  $('result-target').textContent = `目标 ${run.target.toLocaleString()} · 本局累计 ${run.total.toLocaleString()} 分`;
  $('result-rewards').textContent = won && r ? `通关 +${r.base}　节币 +${r.thrift}　超额 +${r.over}　＝ 贝壳 +${r.reward}` : '投币额度已用尽。落币结算后仍未达到目标。';
  $('shop-section').hidden=!shop;
  $('shop-wallet').textContent=run.cash;
  $('build-list').textContent=buildSummary();
  $('next-round').textContent=shop?`进入第 ${run.round+1} 关 →`:'再开一局 →';
  $('next-preview').textContent=shop?`下关目标 ${TARGETS[run.round].toLocaleString()} 分 · ${50+run.level('reserve')*8+run.pendingShots} 次投币 · 台面保留`:'重开将重置本局构筑与贝壳；旧版存档不受影响';
  $('reroll-shop').disabled=run.cash<3||run.rerolls>=1;
  $('reroll-shop').textContent=run.rerolls?'本次已刷新':'刷新货架 · 3 贝壳';
  const cards=$('shop-cards'); cards.replaceChildren();
  if(shop) for(const id of run.offers) {
    const u=UPGRADES[id], bought=run.bought.includes(id), price=run.price(id), card=document.createElement('article');
    card.className=`upgrade-card ${u.color}${bought?' purchased':''}`;
    const icon=document.createElement('div'); icon.className='upgrade-icon'; icon.textContent=u.icon;
    const title=document.createElement('h4'); title.textContent=u.name;
    const level=document.createElement('div'); level.className='upgrade-level'; level.textContent=id==='supply'?'一次性 · 下一关生效':`Lv.${run.level(id)} / ${u.max} · 整局生效`;
    const desc=document.createElement('p'); desc.textContent=u.desc;
    const button=document.createElement('button'); button.className='buy-button'; button.disabled=bought||run.cash<price;
    button.textContent=bought?'✓ 已购买':run.cash<price?`贝壳不足 · 需要 ${price}`:`购买 · ${price} 贝壳`;
    button.onclick=()=>{ if(run.buy(id)){sfx.gate();save();renderResult(true);updateHud(0);} };
    card.append(icon,title,level,desc,button); cards.append(card);
  }
  if(force) return;
  requestAnimationFrame(()=>$('next-round').focus({preventScroll:true}));
}
function finishRound() {
  if(!run.active||!run.reached) return;
  run.finish(); holding=false; sfx.levelUp(); confettiBurst(140); save(); renderResult(true); updateHud(0);
}
$('round-action').onclick=finishRound;
$('reroll-shop').onclick=()=>{if(run.reroll()){sfx.tick();save();renderResult(true);}};
$('next-round').onclick=()=>{
  if(run.phase==='shop') {
    if(!run.next()) return;
    // Preserve the physical field and outstanding slot rewards; buffs restart each stage.
    wallT=run.level('guard')*6; pushT=0; feverT=0; partyT=0; combo=0; lastWin=-100; winTimes.length=0; sfx.fast=1;
    holding=false; resultPhase=''; $('score-formula').textContent='基础分 × 构筑倍率 × 连击 × FEVER';
    $('run-modal').hidden=true; state.coins=run.shots; sfx.levelUp(); cv.focus({preventScroll:true});
    banner(`第 ${run.round} 关<small>目标 ${run.target.toLocaleString()} 分 · ${run.shots} 次投币</small>`,'lv',2000);
    save(); updateHud(0);
  } else { resetting=true; localStorage.removeItem(SAVE_KEY); location.reload(); }
};
// Focus stays inside the active dialog; Space on buttons never spends a coin.
$('run-modal').addEventListener('keydown',e=>{
  if(e.key!=='Tab') return;
  const nodes=[...$('run-modal').querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length);
  const first=nodes[0],last=nodes.at(-1);
  if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}
  else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}
});

// ================== 输入 ==================
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DROP_Z), hit = new THREE.Vector3();
function aimFrom(cx, cy) {
  const r=cv.getBoundingClientRect();
  ndc.set((cx-r.left) / r.width * 2 - 1, -(cy-r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
  if (ray.ray.intersectPlane(aimPlane, hit)) aimX = THREE.MathUtils.clamp(hit.x, -4.3, 4.3);
}
const cv = renderer.domElement;
cv.tabIndex=0; cv.setAttribute('aria-label','推币机投币区域：空格投币，左右方向键瞄准');
cv.addEventListener('pointermove', e => aimFrom(e.clientX, e.clientY));
cv.addEventListener('pointerdown', e => { aimFrom(e.clientX, e.clientY); holding = true; dropCd = 0; cv.setPointerCapture(e.pointerId); });
addEventListener('pointerup', () => holding = false);
addEventListener('pointercancel', () => holding = false);
addEventListener('blur', () => holding = false);
document.addEventListener('visibilitychange', () => { holding=false; clock.getDelta(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('help').classList.contains('show')) { $('help').classList.remove('show'); holding=false; cv.focus({preventScroll:true}); }
  if (e.code === 'Space' && (e.target === document.body || e.target === cv || e.target === dropBtn)) { holding = inputOpen(); e.preventDefault(); }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') aimX = Math.max(-4.3, aimX - 0.4);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') aimX = Math.min(4.3, aimX + 0.4);
});
addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });
const dropBtn = $('dropbtn');
dropBtn.addEventListener('pointerdown', e => { e.preventDefault(); holding = true; dropCd = 0; });
dropBtn.addEventListener('pointerup', () => holding = false);
dropBtn.addEventListener('pointerleave', () => holding = false);
$('btn-sound').onclick = e => { sfx.setEnabled(!sfx.enabled); e.currentTarget.classList.toggle('off', !sfx.enabled); };
$('btn-music').onclick = e => { sfx.setMusic(!sfx.musicOn); e.currentTarget.classList.toggle('off', !sfx.musicOn); };
$('btn-help').onclick = () => { holding=false; $('help').classList.toggle('show'); };
$('art-credits').addEventListener('click', e => e.stopPropagation());
$('help').onclick = () => { $('help').classList.remove('show'); cv.focus({preventScroll:true}); };
$('btn-reset').onclick = () => { if (confirm('重置存档并重新开始？')) { resetting=true; localStorage.removeItem(SAVE_KEY); location.reload(); } };
$('start-button').onclick = () => {
  sfx.init(); started = true; $('start').classList.add('hide'); $('start').inert=true; $('hud').classList.add('show'); cv.focus({preventScroll:true});
  mascot.react('happy', 1.5); say('idle'); sfx.levelUp();
  if (loaded) $('save-status').textContent = '已恢复本局进度';
  renderResult(); save();
};

// Fit the complete playable cabinet to the actual canvas, not the browser window.
// This also keeps aiming and projected reward text correct after HUD reflow.
let resizeFrame = 0;
function resize() {
  resizeFrame = 0;
  const narrow = matchMedia('(max-width:760px)').matches;
  if(narrow) {
    document.documentElement.style.setProperty('--top-reserve', Math.ceil($('hud-top').getBoundingClientRect().height)+'px');
    document.documentElement.style.setProperty('--bottom-reserve', Math.ceil($('hud-bottom').getBoundingClientRect().height)+'px');
  }
  const r=app.getBoundingClientRect(), w=Math.max(1,r.width), h=Math.max(1,r.height);
  camera.aspect=w/h; camera.fov=46;
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const up=new THREE.Vector3(0,CAM_DIR.z,-CAM_DIR.y);
  let distance=20;
  // Separate real cabinet regions avoid fitting imaginary upper-front corners,
  // which would unnecessarily shrink the playfield, especially on phones.
  const regions=[
    [[-5.3,5.3],[1.2,9.5],[-6.6,-5.9]], // backboard, sign and slot screen
    [[-7.3,7.3],[-2.8,2.9],[-10,4.6]],  // cabinet rails
    [[-6.3,6.3],[-3.3,-0.1],[4.0,7.1]], // payout tray (not decorative plinth)
    [[-7.7,-5.1],[2.5,5.8],[-2.2,0.3]], // Dafeiyu standee
  ];
  for(const [xs,ys,zs] of regions) for(const x of xs) for(const y of ys) for(const z of zs) {
    const relative=new THREE.Vector3(x,y,z).sub(CAM_TARGET);
    const near=relative.dot(CAM_DIR);
    distance=Math.max(distance,near+Math.abs(relative.dot(up))/tan*1.055,near+Math.abs(x)/(tan*camera.aspect)*1.055);
  }
  CAM_POS.copy(CAM_TARGET).addScaledVector(CAM_DIR,distance+0.35);
  camera.updateProjectionMatrix(); camera.position.copy(CAM_POS); camera.lookAt(CAM_TARGET); camera.updateMatrixWorld();
  renderer.setSize(w,h); composer.setSize(w,h); bloom.setSize(w,h);
  const bannerEl=$('banner');bannerEl.style.left=(r.left+w/2)+'px';bannerEl.style.top=(r.top+h*.4)+'px';bannerEl.style.maxWidth=(w-24)+'px';
  $('floats').style.clipPath=`inset(${r.top}px ${innerWidth-r.right}px ${innerHeight-r.bottom}px ${r.left}px)`;
}
function queueResize(){if(!resizeFrame) resizeFrame=requestAnimationFrame(resize);}
addEventListener('resize',queueResize);
const hudObserver=new ResizeObserver(queueResize);hudObserver.observe($('hud-top'));hudObserver.observe($('hud-bottom'));
$('detail-toggle').onclick=()=>{
  const button=$('detail-toggle'), open=button.getAttribute('aria-expanded')!=='true';
  button.setAttribute('aria-expanded',String(open));button.title=open?'收起计分详情':'展开计分详情';$('score-formula').hidden=!open;holding=false;resize();
};
resize();
addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
setInterval(save, 5000);

// ================== 主循环 ==================
const clock = new THREE.Clock(); let time = restoredTime;
let paused = false;
function frame() {
  requestAnimationFrame(frame);
  if (paused) return;
  update(Math.min(clock.getDelta(), 1 / 20));
  composer.render();
}
function update(dt) {
  if (!started || !run.active || $('help').classList.contains('show') || document.hidden) { updateHud(dt); slot.draw(); syncCoins(); const pp=pusherBody.translation(); pusherMesh.position.set(pp.x,pp.y,pp.z); return; }
  time += dt;

  // 投币器跟随
  dropper.position.x += (aimX - dropper.position.x) * Math.min(1, dt * 14);
  dropper.scale.y += (1 - dropper.scale.y) * Math.min(1, dt * 12);
  dropCd -= dt;
  if (holding && dropCd <= 0) { dropCoin(); dropCd = feverT > 0 ? 0.14 : 0.2; }
  // 幸运门
  gate.position.x = Math.sin(time * 1.05) * 3.3 + Math.sin(time * 2.3) * 0.5;
  const gateHalfWidth = GATE_HW + run.level('lucky') * 0.1;
  gate.scale.x = gateHalfWidth / GATE_HW;
  const aligned = Math.abs(dropper.position.x - gate.position.x) < gateHalfWidth - 0.25;
  laserMat.color.set(aligned ? '#3dff8a' : '#ff3d6e');
  gateMat.emissiveIntensity = 1.6 + Math.sin(time * 6) * 0.6 + (gate.userData.hitT > 0 ? 4 : 0);
  gate.userData.hitT = (gate.userData.hitT || 0) - dt;

  // 奖励计时
  wallT = Math.max(0, wallT - dt); pushT = Math.max(0, pushT - dt); partyT = Math.max(0, partyT - dt);
  if (feverT > 0) { feverT -= dt; if (feverT <= 0) sfx.fast = 1; }
  pushMaxTarget = (pushT > 0 ? 0.6 : -0.5) + run.level('push') * 0.12; pushSpeed = pushT > 0 ? 1.9 : 1.55;
  guards.forEach((g, i) => {
    const target = wallT > 0 ? 0.7 : -1.0; g.y += (target - g.y) * Math.min(1, dt * 5);
    g.mesh.position.y = g.y; { const ty = wallT > 0 ? 0.7 : -20, cur = g.body.translation(); if (Math.abs(cur.y - ty) > 0.01) g.body.setTranslation({ x: cur.x, y: ty, z: cur.z }, true); }
    g.mesh.material.opacity = 0.35 + 0.2 * Math.sin(time * 8) * (wallT < 5 && wallT > 0 ? 2 : 0.5);
  });
  slot.status = [];
  if (wallT > 0) slot.status.push({ text: `护墙 ${Math.ceil(wallT)}s`, color: '#7cf3ff' });
  if (pushT > 0) slot.status.push({ text: `超级推板 ${Math.ceil(pushT)}s`, color: '#ffb34d' });
  if (feverT > 0) slot.status.push({ text: `FEVER ${Math.ceil(feverT)}s`, color: '#ff6ad5' });

  // 金币雨
  if (showerQueue.length) {
    showerQueue.forEach(s => s.t -= dt);
    while (showerQueue.length && showerQueue[0].t <= 0) {
      const s = showerQueue.shift();
      if (s.prize) { dropPrize(s.kind); continue; }
      const x = (Math.random() - 0.5) * 8.2, z = 0.2 + Math.random() * 3;
      const c = spawn(s.kind, x, 6 + Math.random(), z, randQ(0.6), V(0, -4, 0));
      if (c) burst(x, 6, z, 4, '#ffe680', 1, 0.5);
    }
  }
  // No regenerating or returned ammo: the limited shot budget is a run rule.

  // 物理
  stepWorld(dt);

  // 硬币状态
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i], p = c.p = c.body.translation();
    if (!c.body.isSleeping()) {
      const v = c.body.linvel(), dv = Math.hypot(v.x - c.pv.x, v.y - c.pv.y, v.z - c.pv.z);
      if (dv > 2.6 && p.y > -2.6 && c.state !== 'won') sfx.clink(Math.min(1, dv / 9) * (c.kind === 'coin' ? 1 : 1.3), p.x / 6);
      else if (dv > 2.6 && c.state === 'won' && c.t < 1) sfx.clink(Math.min(0.7, dv / 12), p.x / 6);
      c.pv = v;
    }
    if (c.fromDrop && !c.gated && c.prevY > GATE_Y && p.y <= GATE_Y) {
      c.gated = true;
      if (Math.abs(p.x - gate.position.x) < gateHalfWidth - 0.12) {
        gate.userData.hitT = 0.4; sfx.gate(); burst(p.x, GATE_Y, DROP_Z, 24, '#5bff95', 3, 2);
        if (slot.add()) floatText('LUCKY!', p.x, GATE_Y + 0.6, DROP_Z, 'lucky'); else floatText('保留已满', p.x, GATE_Y + 0.6, DROP_Z, 'lucky');
      }
    }
    c.prevY = p.y;
    if (c.ccd !== false && p.y < 1.9 && c.state === 'field') { c.ccd = false; c.body.enableCcd(false); }
    if (c.state === 'field' && p.y < -0.4) {
      if (p.z > FRONT_Z - 0.1 && Math.abs(p.x) < HALF_W + 0.3) { c.state = 'won'; onWin(c); }
      else { c.state = 'lost'; stats.lost++; sfx.lost(p.x / 6); if (c.kind !== 'coin') floatText('漏掉了…', p.x, 0, p.z, 'lost'); }
    }
    if (c.state === 'won') { c.t += dt; if (c.t > 1.6) c.scale -= dt * 4; }
    if (c.state === 'lost' && p.y < -3) c.scale = 0;
    if (c.scale <= 0 || p.y < -12) removeCoin(i);
  }
  syncCoins();

  // 推板网格
  { const pp = pusherBody.translation(); pusherMesh.position.set(pp.x, pp.y, pp.z); }

  // 吉祥物
  mascot.update(dt, time);
  coins.forEach(c => c.mesh && c.mesh.userData.rac && c.mesh.userData.rac.update(dt, time));
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.remove('show'); }
  idleTalk -= dt; if (idleTalk < 0) { idleTalk = 10 + Math.random() * 10; if (bubbleT <= 0 && started) say('idle'); }
  {
    const [bx, by] = toScreen(mascot.root.position.x + 0.2, mascot.root.position.y + 3.0, mascot.root.position.z);
    const b = $('bubble'), r=app.getBoundingClientRect(); b.style.left = Math.max(r.left+b.offsetWidth/2+8,Math.min(r.right-b.offsetWidth/2-8,bx)) + 'px'; b.style.top = Math.max(r.top+44,by) + 'px';
  }

  slot.update(dt);
  updateLeds(time); updateSparkles(dt); updateConfetti(dt);
  if (partyT > 0 && Math.random() < 0.3) burst((Math.random() - 0.5) * 10, 3 + Math.random() * 3, -2 + Math.random() * 4, 6, `hsl(${Math.random() * 360},100%,65%)`, 3, 2);
  pinkL.intensity = 6 + (partyT > 0 || feverT > 0 ? Math.sin(time * 20) * 5 : Math.sin(time * 2) * 1.5);
  cyanL.intensity = 6 + (partyT > 0 || feverT > 0 ? Math.cos(time * 20) * 5 : Math.cos(time * 2) * 1.5);

  // 相机：轻微呼吸 + 震动
  shake = Math.max(0, shake - dt * 1.5);
  const sx = (Math.random() - 0.5) * shake * 0.6, sy = (Math.random() - 0.5) * shake * 0.6;
  camera.position.set(CAM_POS.x + Math.sin(time * 0.3) * 0.25 + aimX * 0.06 + sx, CAM_POS.y + Math.sin(time * 0.4) * 0.1 + sy, CAM_POS.z);
  camera.lookAt(CAM_TARGET.x + aimX * 0.03, CAM_TARGET.y, CAM_TARGET.z);

  if (run.tick(dt, slot.spinning || slot.queue > 0 || showerQueue.length > 0 || slot.msgT > 0)) { holding=false; save(); }
  updateHud(dt);
}
frame();
window.__game = { theme: () => ({ name: '大肥鱼推币机', pose: mascot.pose }), pause: v => paused = v, stats, slotUpdate: dt => slot.update(dt), leds: () => updateLeds(time), syncCoins, update, render: () => composer.render(), state, coins, world, physicsStep, slot, onSlot, dropCoin, get run(){return run;}, layout:()=>({viewport:app.getBoundingClientRect().toJSON(),landmarks:[[-4.5,9.15,-6.1],[4.5,9.15,-6.1],[-3.5,7.6,-6.1],[3.5,3.6,-6.1],[-5,0,4],[5,0,4],[-5,PUSH_H,-6],[5,PUSH_H,-6]].map(p=>toScreen(...p))}), save, onWin, spawn, finishRound, get aimX() { return aimX; }, set aimX(v) { aimX = v; }, start: () => $('start-button').click() };
