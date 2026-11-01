import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Sfx } from './audio.js';
import { coinTextures } from './textures.js?v=3.2.0';
import { buildDafeiyu } from './mascot.js?v=2.4.1';
import { loadCharacterArt, characterSources } from './character-art.js?v=2.1.1';
import { Run, UPGRADES, TARGETS, BASE_POINTS, EXCHANGE_GRANT } from './roguelike.js?v=3.3.0';
import { planInsertion, pusherMovingForward, pendulumOffset, fieldImpulse, shakePower, createLaunchers, engage, disengage, stepLaunchers, releaseLaunchers } from './chutes.js?v=3.1.0';
import { TOKENS, TokenSystem, cleanMeta, isBad, SPECIAL_IDS } from './tokens.js?v=3.1.0';
import { PRIZES, RELICS, spinLottery, rollPicks, applyPick, rerollPicks } from './stage-rewards.js?v=3.3.0';
import { makeTokenMesh } from './token-mesh.js?v=2.2.0';
import { createTokenUI } from './token-ui.js?v=3.3.0';
import { coinArt, upgradeArt, arcadeToast } from './token-art.js?v=2.3.0';
import { createMobileCabinet } from './mobile-cabinet.js?v=3.3.0';
import { createSeasideRoom } from './arcade-room.js?v=3.2.0';
import { createPrizeWheel } from './prize-wheel.js?v=3.3.0';
import { ComboWheel } from './combo-wheel.js?v=3.3.0';
import { createMachineJuice } from './machine-juice.js?v=3.3.0';
import { createCabinetBase, createCabinetAccents, createCabinetParticles } from './cabinet-scene.js?v=3.3.0';

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
const motionReduced = matchMedia('(prefers-reduced-motion: reduce)');
const isTouch = matchMedia('(pointer: coarse)').matches;

// ================== 渲染器 / 场景 ==================
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.6 : 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#071321');
scene.fog = new THREE.Fog('#142936', 32, 80);
const seasideRoom=createSeasideRoom(scene);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.52;

const camera = new THREE.PerspectiveCamera(46, app.clientWidth / app.clientHeight, 0.1, 150);
const CAM_POS = new THREE.Vector3(0, 11.5, 13.7), CAM_TARGET = new THREE.Vector3(0, 0.3, -1.2);
const CAM_DIR = CAM_POS.clone().sub(CAM_TARGET).normalize();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(app.clientWidth, app.clientHeight), 0.42, 0.38, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight('#d4e8ea', '#15232f', 0.65));
const key = new THREE.DirectionalLight('#fff0d6', 2.7);
key.position.set(4, 16, 8); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 10, bottom: -10, near: 1, far: 40 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key);
const pinkL = new THREE.PointLight('#b9cbeb', 2.4, 14, 1.8); pinkL.position.set(-6, 4, 1); scene.add(pinkL);
const cyanL = new THREE.PointLight('#a3d9d1', 3.5, 14, 1.8); cyanL.position.set(6, 4, 1); scene.add(cyanL);
const screenL = new THREE.PointLight('#ffb54a', 5, 9, 1.8); screenL.position.set(0, 5, -4.5); scene.add(screenL);

// ================== 材质 ==================
const ct = coinTextures();
const coinFaceMat = new THREE.MeshStandardMaterial({ map: ct.face, bumpMap: ct.bump, bumpScale: 0.22, metalness: 0.72, roughness: 0.46, color: '#ffffff' });
const coinSideMat = new THREE.MeshStandardMaterial({ map: ct.side, metalness: 0.75, roughness: 0.44 });
const chrome = new THREE.MeshStandardMaterial({ color: '#b4c6c8', metalness: 0.82, roughness: 0.36 });
const orange = new THREE.MeshStandardMaterial({ color: '#28566c', roughness: 0.58, metalness: 0.24 });
const brown = new THREE.MeshStandardMaterial({ color: '#b5cecb', roughness: 0.62 });
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
const { meshBox, guards, backboardGroup, SCREEN_W, SCREEN_H, SCREEN_Y, pusherBody, pusherMesh } = createCabinetBase({
  scene, world, staticBox, HALF_W, FRONT_Z, BACK_Z, GAP_Z, WALL_Z, PUSH_H, PUSH_BACK, PUSH_D, F_PUSH, chrome, orange, brown, darkMat, glass,
});
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
  shell: () => RAPIER.ColliderDesc.ball(0.36).setDensity(4),
  chest: () => RAPIER.ColliderDesc.cuboid(0.34, 0.22, 0.26).setDensity(5),
  plushie: () => RAPIER.ColliderDesc.ball(0.34).setDensity(2),
};
const coins = [];
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

const bigMat = new THREE.MeshStandardMaterial({ map: ct.face, bumpMap: ct.bump, bumpScale: 2, metalness: 1, roughness: 0.2, color: '#ffd77a', emissive: '#6a3a00', emissiveIntensity: 0.5 });
const gemMat = new THREE.MeshPhysicalMaterial({ color: '#36e0ff', metalness: 0.1, roughness: 0.04, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, emissive: '#0a5a8a', emissiveIntensity: 0.6, flatShading: true });
function makePrizeMesh(kind) {
  if (kind === 'shell') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 12), new THREE.MeshStandardMaterial({ color: '#f3d7a4', roughness: 0.42, metalness: 0.2, emissive: '#8a5a22', emissiveIntensity: 0.15 }));
    m.scale.set(1, 0.72, 0.5); m.castShadow = true; return m;
  }
  if (kind === 'chest') {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.5), new THREE.MeshStandardMaterial({ color: '#c9893a', roughness: 0.55 }));
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.54), new THREE.MeshStandardMaterial({ color: '#f0c36a', roughness: 0.4, emissive: '#a56b20', emissiveIntensity: 0.2 }));
    lid.position.y = 0.28; g.add(box, lid); g.children.forEach(c => c.castShadow = true); return g;
  }
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshStandardMaterial({ color: '#7ec8e3', roughness: 0.45, emissive: '#1d6d8a', emissiveIntensity: 0.2 }));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 4), new THREE.MeshStandardMaterial({ color: '#4aa4c4', roughness: 0.5 }));
  tail.rotation.z = Math.PI / 2; tail.position.x = -0.42; g.add(body, tail); return g;
}
function makeSpecialMesh(kind) {
  if (PRIZES[kind]) return makePrizeMesh(kind);
  if (TOKENS[kind]) return makeTokenMesh(kind);
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
  if (coins.length >= MAX_COINS || (!SHAPES[kind] && !TOKENS[kind])) return null;
  const bd = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinearDamping(0.05).setAngularDamping(0.3).setCcdEnabled(!!vel);
  if (q) bd.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  if (vel) bd.setLinvel(vel.x, vel.y, vel.z);
  const body = world.createRigidBody(bd);
  world.createCollider((SHAPES[kind] || SHAPES.coin)().setFriction(F_COIN).setRestitution(0.08), body);
  const c = { p: { x, y, z }, body, kind, state: 'field', t: 0, scale: 1, prevY: y, gated: false, fromDrop: false, pv: { x: 0, y: vel ? vel.y : 0, z: 0 } };
  if (kind !== 'coin') { c.mesh = makeSpecialMesh(kind); scene.add(c.mesh); }
  tokens.meta(c); coins.push(c);
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
      tmpM.compose(tmpV, tmpQ, tmpS); coinMesh.setMatrixAt(n, tmpM); coinMesh.setColorAt(n++, new THREE.Color(c.token?.charged ? '#a5ecff' : c.token?.multiplied ? '#ffb9df' : '#ffffff'));
    } else {
      c.mesh.position.set(p.x, p.y, p.z); c.mesh.quaternion.set(q.x, q.y, q.z, q.w); c.mesh.scale.setScalar(c.scale);
      if(c.mesh.userData.chargeRing)c.mesh.userData.chargeRing.visible=!!c.token?.charged;
      if(c.mesh.userData.multiRing)c.mesh.userData.multiRing.visible=!!c.token?.multiplied;
    }
  }
  coinMesh.count = n; coinMesh.instanceMatrix.needsUpdate = true; if (coinMesh.instanceColor) coinMesh.instanceColor.needsUpdate=true;
}

const { chuteMat, chuteRig, pendulum, ledPos, leds, updateLeds, mascot } = createCabinetAccents({
  scene, staticBox, meshBox, HALF_W, FRONT_Z, WALL_Z, GATE_Y, DROP_Z, TRAY_Y, SCREEN_W, SCREEN_H, SCREEN_Y, chrome, darkMat, coinFaceMat,
  getEffects: () => ({ feverT, partyT }),
});

const { burst, updateSparkles, confettiBurst, updateConfetti } = createCabinetParticles(scene);

// ================== 游戏状态 ==================
const sfx = new Sfx();
const comboWheel = new ComboWheel();
let run = new Run();
let tokens = new TokenSystem();
let tokenUI, mobileCabinet, prizeWheel, juice, restoredWheelQueue = [], tokenAcc=0, tokenNotifyAt=-10;
const tokenRemovals=new Set();
const state = { coins: 50, won: 0, col: { big: 0, gem: 0, plush: 0 }, jackpots: 0 };
let wallT = 0, pushT = 0, feverT = 0, partyT = 0, shake = 0, started = false;
const lanes = createLaunchers();
const recentDrops = [];
let dropStreak = 0, dropStreakAt = -10;
let resultPhase = '', resetting = false; 
const stats = { lost: 0 }; const winTimes = []; let combo = 0, lastWin = -100, showerQueue = [];
const catalogBlocking = () => !!tokenUI?.isOpen() && !$('token-modal').classList.contains('is-docked');
const helpBlocking = () => $('help').classList.contains('show') && !$('help').classList.contains('is-docked');
const inputOpen = () => started && run.phase === 'playing' && !helpBlocking() && !catalogBlocking() && !mobileCabinet?.isMenuOpen() && !prizeWheel?.active && !document.hidden;

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
  action.hidden = !started || (run.active ? (!run.reached && run.phase !== 'settling') : !mobileCabinet?.shopClosed);
  action.disabled = run.active && !run.reached;
  action.textContent = !run.active ? '拉开补给舱 →' : run.reached ? '目标达成 · 结算本关 →' : run.phase === 'settling' ? `等待落币 ${Math.ceil(run.settle)}s` : '达到目标分后可结算';
  const canDrop = inputOpen() && run.shots > 0;
  for (const [id, side] of [['chute-left', 'left'], ['dropbtn', 'middle'], ['chute-right', 'right']]) {
    const button = $(id); if (!button) continue;
    button.disabled = !canDrop;
    button.classList.toggle('is-locked', !!lanes[side]?.locked);
    button.setAttribute('aria-pressed', String(!!lanes[side]?.locked));
  }
  const forward = pusherMovingForward(pushPhase);
  const lamp = $('timing-lamp');
  if (lamp) lamp.textContent = `${forward ? '推板前进 · 左右槽落到两侧' : '推板收回 · 左右槽落到中间'}${run.level('pin') ? ` · 松台销 ${run.inserts % 20}/20` : ''}`;
  const exchange = $('exchange-btn'), shakeBtn = $('shake-btn');
  if (exchange) {
    const live = started && (run.phase === 'playing' || run.phase === 'settling') && !helpBlocking() && !catalogBlocking() && !mobileCabinet?.isMenuOpen() && !prizeWheel?.active;
    exchange.disabled = !live || !run.canExchange();
    exchange.querySelector('span').textContent = `兑币 +${EXCHANGE_GRANT}`;
    exchange.querySelector('small').textContent = run.exchanged >= 2 ? '已兑完' : `票 ${run.tickets}/${run.exchangeCost()} · 余${Math.max(0, 2 - run.exchanged)}`;
  }
  if (shakeBtn) {
    shakeBtn.disabled = !started || !run.active || run.shakes <= 0 || helpBlocking() || catalogBlocking() || mobileCabinet?.isMenuOpen() || prizeWheel?.active;
    shakeBtn.querySelector('small').textContent = run.shakes > 0 ? '本局 1 次' : '已用完';
  }
  tokens.setClipSize(2 + run.level('clip'));
  const clipHost = $('coin-clip');
  if (clipHost) {
    const sig = `${tokens.clipSize}|${tokens.selected}|${tokens.clip.join(',')}`;
    if (clipHost.dataset.sig !== sig) {
      clipHost.dataset.sig = sig; clipHost.replaceChildren();
      for (let i = 0; i < tokens.clipSize; i++) {
        const id = tokens.clip[i];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'clip-slot' + (id && id === tokens.selected ? ' armed' : '');
        button.textContent = id ? (TOKENS[id].glyph || '币') : '空';
        button.setAttribute('aria-label', id ? `币槽 ${TOKENS[id].name}` : '空币槽');
        button.onclick = () => { if (tokens.armClip(i)) { tokenUI?.refresh(true); save(); updateHud(0); } };
        clipHost.append(button);
      }
    }
  }
  const energyCount = $('energy-count');
  if (energyCount) {
    energyCount.textContent = comboWheel.level ? '×'+comboWheel.level : comboWheel.count+'/8';
    const bar = $('energy-bar'); if (bar) bar.style.width = Math.min(100,comboWheel.count/8*100)+'%';
  }
  tokenUI?.refresh(); tokenUI?.shop();mobileCabinet?.update();prizeWheel?.update();
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
  idle: ['看推板再投～', '左槽右槽～', '中间也行！', '饭钱要来啦！'], reach: ['听牌了！！', '来啊来啊！', '大鱼要开饭啦！'], poor: ['票够的话可以兑币！', '试试摇一下台面？'], pet:['在这儿陪你呀！','一起推个满载而归～','摸摸头，一起加油！'],
};
let bubbleT = 0, idleTalk = 6;
function say(kind) {
  const arr = lines[kind], el = $('bubble'); el.textContent = arr[Math.floor(Math.random() * arr.length)];
  el.classList.add('show'); bubbleT = 1.8;
}

// ---------- 结算 ----------
function onWin(c) {
  if (!started || !run.active) return;
  const p=c.p=c.body.translation();
  if (PRIZES[c.kind]) { rewardPrize(c); return; }
  const result=tokens.score(c,coins,specialAdapter);
  if(isBad(c.kind)) {
    const lost=run.penalize(result.penalty);combo=0;comboWheel.reset();
    floatText(`坏币 -${lost} 分`,p.x,.5,FRONT_Z+.2,'lost');
    tokens.log(`${TOKENS[c.kind].name}入账 · -${lost} 分`);sfx.lost(p.x/6);
    $('score-formula').textContent=`${TOKENS[c.kind].name}扣除 ${lost} 分（最低 0 分）`;return;
  }
  state.won += VALUES[c.kind]||0;
  const now = time;
  combo = now - lastWin < 0.7 ? combo + 1 : 0; lastWin = now;
  winTimes.push(now); while (winTimes.length && now - winTimes[0] > 4) winTimes.shift();
  const base=tokens.scoreBase(c,(BASE_POINTS[c.kind]||10)+(c.kind==='coin'?run.level('value')*2:0));
  const scored=run.awardBase(base,combo,feverT>0,tokens.globalFactor(coins));
  $('score-formula').textContent = `${scored.base} 币值 × ${scored.factor.toFixed(2)} = +${scored.points}`;
  if (winTimes.length >= 9 && feverT <= 0) startFever();
  sfx.win(combo,p.x/6);
  burst(p.x,.1,FRONT_Z+.2,c.kind==='coin'?10:30,TOKENS[c.kind]?.color||'#ffd34d',3,3);
  floatText('+'+scored.points+' 分',p.x,.4,FRONT_Z+.3,c.kind==='coin'?(feverT>0?'fever':''):'big');
  bumpCoinHud();
  { const [x,y]=toScreen(p.x,.4,FRONT_Z+.3);juice?.score({x,y,points:scored.points,combo}); }
  if(TOKENS[c.kind]) {sfx.prize();mascot.react('happy',1);}
  else if(c.kind!=='coin'){
    state.col[c.kind]=(state.col[c.kind]||0)+1;sfx.prize();mascot.react('happy',2);say('big');shake=.25;
    banner({big:'🏅 大金币',gem:'💎 宝石',plush:'🐋 大肥鱼立牌'}[c.kind]+`<small>+${scored.points} 分</small>`,'prize',1500);
  }  else if(Math.random()<.05){mascot.react('happy',.8);say('win');}
  const before=comboWheel.level;comboWheel.score(time,1+(run.relics.tide||0));if(comboWheel.level>before)juice?.combo(comboWheel.level);
}
function rewardPrize(c) {
  const spec = PRIZES[c.kind];
  const scored = run.awardBase(spec.points, combo, feverT > 0, tokens.globalFactor(coins));
  if (!scored) return;
  run.tickets = Math.min(9999, run.tickets + spec.tickets);
  run.cash = Math.min(1e9, run.cash + spec.shells);
  if (spec.coin) {
    const ids = SPECIAL_IDS.filter(id => id !== 'tree');
    const id = ids[Math.floor(Math.random() * ids.length)];
    tokens.grant({ [id]: 1 }); tokens.select(id);
  }
  $('score-formula').textContent = `${spec.name} +${scored.points} 分`;
  sfx.prize(); mascot.react('happy', 1.4); say('big'); shake = Math.max(shake, 0.28);
  banner(`${spec.name}入手！<small>+${scored.points} 分</small>`, 'prize', 1600);
  const before=comboWheel.level;comboWheel.score(time,1+(run.relics.tide||0));if(comboWheel.level>before)juice?.combo(comboWheel.level);
}
function presentLottery(level) {
  showLottery({ ...spinLottery(run.random), level });
  save();
}
function awardWheel(item) {
  const level = item.level || 1;
  if(item.coins){shower(Math.min(250,item.coins*level+run.level('lucky')*4));sfx.fanfare(false);save();return;}
  if(item.prizes){for(let i=0;i<Math.min(30,item.prizes*level);i++)spawnTablePrize(null,(run.random()-.5)*6);sfx.fanfare(false);save();return;}
  if (item.id === 'tickets') run.tickets = Math.min(9999, run.tickets + 8 * level);
  else if (item.id === 'shells') run.cash = Math.min(1e9, run.cash + 4 * level);
  else if (item.id === 'prize' && coins.length < 380) spawnTablePrize(null, (Math.random() - 0.5) * 3);
  else if (item.id === 'special') {
    const ids = SPECIAL_IDS.filter(id => id !== 'tree');
    tokens.grant({ [ids[Math.floor(run.random() * ids.length)]]: level });
  } else if (item.towerLayers) {
    spawnCoinTower(item.towerLayers+level-1);
  } else if (coins.length < 360) shower(8 * level + run.level('lucky')*4);
  else run.tickets = Math.min(9999, run.tickets + 6);
  sfx.fanfare(false); save();
}
// A real stacked reward, not a rain effect labelled as a tower. Bounded for phones.
function spawnCoinTower(height=6) {
 const layers=Math.min(12,Math.max(1,height));
 const free=Math.max(0,MAX_COINS-coins.length),limit=Math.min(layers*7,free);
 for(let i=0;i<limit;i++){
  const layer=Math.floor(i/7),ring=i%7,a=ring*Math.PI/3;
  spawn('coin',ring===6?0:Math.cos(a)*1.22,1.6+layer*(COIN_H+.012),ring===6?.6:.6+Math.sin(a)*1.22,randQ(0));
 }
 if(!limit)run.tickets=Math.min(9999,run.tickets+8);
}
function showLottery(item) {
  prizeWheel?.enqueue(item);
}
const PRIZE_ORDER = ['shell', 'plushie', 'chest'];
let prizeCursor = 0;
function spawnTablePrize(kind, x) {
  const id = PRIZES[kind] ? kind : PRIZE_ORDER[prizeCursor++ % PRIZE_ORDER.length];
  const px = Number.isFinite(x) ? x : (Math.random() - 0.5) * 3.2;
  const c = spawn(id, px, 1.45, 1.2, randQ(0.25), V(0, -0.3, 0.15));
  if (c) burst(px, 1.6, 1.2, 14, '#ffe7a8', 1.6, 1.2);
  return c;
}
function spawnRoundPrizes() {
  const count = 1 + (run.relics.net || 0);
  for (let i = 0; i < count; i++) spawnTablePrize(PRIZE_ORDER[(run.round + i) % 3], -1.7 + i * 1.5);
}
// Bridge pure token rules to actual Rapier bodies. Destructions are flushed after
// iteration so a chain reaction cannot corrupt the physical entity array.
const specialAdapter={
 spawn(kind,p,meta){const c=spawn(kind,THREE.MathUtils.clamp(p.x,-4.4,4.4),Math.max(.5,p.y),THREE.MathUtils.clamp(p.z,-5.6,2.8),randQ(.08),V(0,-1,0));if(c&&meta)c.token={...c.token,...cleanMeta(meta),uid:c.token.uid};return c;},
 remove(c){tokenRemovals.add(c);},
 change(c,kind){if(c.mesh)scene.remove(c.mesh);c.kind=kind;c.mesh=makeSpecialMesh(kind);scene.add(c.mesh);},
 shells(delta){run.cash=Math.max(0,Math.min(1e9,run.cash+delta));},
 push(c,v){if(c.state==='field'&&!c.tokenDead)c.body.applyImpulse(v,true);},
 notify(text,p){if(time-tokenNotifyAt<.5)return;tokenNotifyAt=time;floatText(text,p.x,p.y+.7,p.z,'lucky');burst(p.x,p.y+.2,p.z,8,'#92e7ff',1,.8);sfx.gate();}
};
function flushTokens(){for(let i=coins.length-1;i>=0;i--)if(tokenRemovals.has(coins[i]))removeCoin(i);tokenRemovals.clear();}
function stepTokens(dt){coins.forEach(c=>c.p=c.body.translation());tokens.tick(dt,coins,specialAdapter);flushTokens();}

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
// ---------- 投币 ----------

function buzz(ms) { try { navigator.vibrate?.(ms); } catch (e) { /* optional haptic */ } }
function blastField(mode) {
  const power = shakePower(run.level('push'));
  const list = coins.filter(c => c.state === 'field' && !c.slide && !c.body.isKinematic());
  list.forEach((c, i) => { c.body.applyImpulse(fieldImpulse(mode, i, power), true); c.body.wakeUp(); });
  shake = Math.max(shake, mode === 'nuke' ? 0.85 : 0.62);
  sfx.whoosh(); flash(mode === 'nuke' ? '#ffb15a' : '#fff6d2');
  banner(mode === 'nuke' ? '全场轰出！<small>爆破币把硬币推向出币口</small>' : '机台摇晃！<small>台面硬币被抖向前沿</small>', mode === 'nuke' ? 'jp' : 'win', 1400);
  mascot.react('excited', 1.2);
}
function dropCoin(side = 'middle') {
  if (!inputOpen() || coins.length >= MAX_COINS || !run.spendShot()) return false;
  state.coins = run.shots;
  const kind = tokens.consume();
  const now = time;
  const resolved = kind === 'coin' ? (side === 'left' || side === 'right' ? side : 'middle') : 'middle';
  recentDrops.push({ side: resolved, time: now });
  for (let i = recentDrops.length - 1; i >= 0; i--) if (now - recentDrops[i].time > 0.08) recentDrops.splice(i, 1);
  const paired = kind === 'coin' && recentDrops.some(d => d.side === 'left') && recentDrops.some(d => d.side === 'right');
  const swingScale = 1 + (run.relics.swing || 0) * 0.28;
  const plan = planInsertion({ side: resolved, phase: pushPhase, pushMax, special: kind !== 'coin', both: paired, jitter: (Math.random() - 0.5) * 0.08, swing: kind === 'coin' ? null : pendulumOffset(time, swingScale) });
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, Math.random() * 0.4, 0));
  const c = spawn(kind, plan.spawn.x, plan.spawn.y, plan.spawn.z, flat, null);
  if (c) {
    c.fromDrop = true;
    c.slide = { t: 0, dur: plan.duration, from: plan.spawn, to: { ...plan.land }, tier: plan.tier, born: now };
    c.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    c.body.setNextKinematicTranslation(plan.spawn);
    if (paired) for (const coin of coins) if (coin.slide && coin.slide.tier === 1 && now - coin.slide.born < 0.08) coin.slide.to.x = Math.sign(coin.slide.from.x) * 0.18;
  }
  dropStreak = now - dropStreakAt < 0.45 ? dropStreak + 1 : 0; dropStreakAt = now;
  sfx.drop((plan.land.x || 0) / 6, dropStreak);
  buzz(Math.min(28, 10 + dropStreak * 3));
  shake = Math.min(0.18, shake + 0.06);
  burst(plan.spawn.x, plan.spawn.y, plan.spawn.z, 10, kind === 'coin' ? '#ffe08a' : (TOKENS[kind]?.color || '#9fd8ff'), 2.2, 1.4);
  const rig = chuteRig[resolved] || chuteRig.middle; if (rig) rig.scale.y = 0.82;
  if (kind === 'bomb') blastField('nuke');
  if (run.noteInsert()) blastField('shake');
  tokens.afterDrop(run.round, coins, specialAdapter);
  return true;
}
function stepSlides(dt) {
  for (const c of coins) if (c.slide) {
    c.slide.t += dt;
    const u = Math.min(1, c.slide.t / c.slide.dur), e = u * u * (3 - 2 * u);
    const p = { x: c.slide.from.x + (c.slide.to.x - c.slide.from.x) * e, y: c.slide.from.y + (c.slide.to.y - c.slide.from.y) * e, z: c.slide.from.z + (c.slide.to.z - c.slide.from.z) * e };
    c.body.setNextKinematicTranslation(p);
    if (u >= 1) {
      const dx = c.slide.to.x - c.slide.from.x, dz = c.slide.to.z - c.slide.from.z;
      c.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      c.body.setLinvel({ x: dx * 0.35, y: c.slide.tier === 2 ? -0.6 : -0.9, z: Math.max(c.slide.tier === 2 ? 0.35 : 1.1, dz * 0.45) }, true);
      c.body.enableCcd(true);
      c.slide = null;
    }
  }
}

// ================== 存档 ==================
function save() {
  if (resetting) return;
  if (!started && !loaded) return;
  const bodies = coins.filter(c => c.state === 'field').slice(0, MAX_COINS).map(c => {
    const p = c.body.translation(), q = c.body.rotation(), v = c.body.linvel(), a = c.body.angvel();
    return { kind:c.kind, p, q, v, a, fromDrop:c.fromDrop, gated:c.gated, prevY:c.prevY, token:cleanMeta(c.token) };
  });
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version:5, run:run.serialize(), wheelQueue:prizeWheel?.pending||[], tokens:tokens.serialize(), state, bodies, pushPhase, pushMax, time, wallT, pushT, feverT, partyT, showerQueue,  combo, lastWin, winTimes, lost:stats.lost })); }
  catch (e) { $('save-status').textContent = '无法保存：请检查浏览器存储空间'; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d || ![2,3,4,5].includes(d.version) || !Array.isArray(d.bodies) || d.bodies.length > MAX_COINS) return false;
    const restored = new Run(d.run);
    if (d.bodies.some(b => (!SHAPES[b.kind] && !TOKENS[b.kind]) || !['x','y','z'].every(k => Number.isFinite(b.p?.[k])) || !['x','y','z','w'].every(k => Number.isFinite(b.q?.[k])))) return false;
    run = restored; run.energy=0;run.pendingSpin=0;restoredWheelQueue=Array.isArray(d.wheelQueue)?d.wheelQueue:[]; tokens = new TokenSystem(d.tokens);
    state.coins = run.shots; state.won = d.state?.won || 0; state.col = d.state?.col || {big:0,gem:0,plush:0}; state.jackpots = d.state?.jackpots || 0;
    pushPhase = Number.isFinite(d.pushPhase) ? d.pushPhase : pushPhase;
    pushMax = Number.isFinite(d.pushMax) ? d.pushMax : -0.5;
    const front = (PUSH_BACK + pushMax)/2 + (pushMax - PUSH_BACK)/2 * Math.sin(pushPhase);
    pusherBody.setTranslation(V(0, PUSH_H / 2, front - PUSH_D / 2), true);
    for (const b of d.bodies) {
      const c = spawn(b.kind, b.p.x,b.p.y,b.p.z,b.q,b.v);
      if (c) { c.token={...cleanMeta(b.token),uid:c.token.uid}; tokens.uid=Math.max(tokens.uid,c.token.uid); c.fromDrop=!!b.fromDrop; c.gated=!!b.gated; c.prevY=Number.isFinite(b.prevY)?b.prevY:b.p.y; if(b.a) c.body.setAngvel(b.a,true); }
    }
      wallT=Math.max(0,d.wallT||0); pushT=Math.max(0,d.pushT||0); feverT=Math.max(0,d.feverT||0); partyT=Math.max(0,d.partyT||0);
    showerQueue=Array.isArray(d.showerQueue)?d.showerQueue.filter(s=>(SHAPES[s.kind]||TOKENS[s.kind])&&Number.isFinite(s.t)).slice(0,100):[];
    restoredTime=Number.isFinite(d.time)?d.time:0; combo=d.combo||0; lastWin=Number.isFinite(d.lastWin)?d.lastWin:-100; winTimes.push(...(d.winTimes||[])); stats.lost=d.lost||0;
    sfx.fast=feverT>0?1.35:1;
    return true;
  } catch (e) {
    for (let i=coins.length-1;i>=0;i--) removeCoin(i);
    run = new Run(); tokens=new TokenSystem(); return false;
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
  const chips = Object.entries(run.levels).filter(([,n])=>n>0).map(([id,n])=>`${UPGRADES[id].name} Lv.${n}`);
  const relics = Object.entries(run.relics).filter(([,n])=>n>0).map(([id,n])=>`${RELICS[id].name}×${n}`);
  return [...chips, ...relics].join(' · ') || '尚无永久升级';
}
function pickOptions() {
  const names = {};
  for (const id of SPECIAL_IDS) if (id !== 'tree') names[id] = TOKENS[id].name;
  return { coinIds: SPECIAL_IDS.filter(id => id !== 'tree'), upgrades: UPGRADES, names };
}
function renderPicks() {
  const section = $('pick-section'); if (!section) return;
  if ((run.phase === 'shop' || run.phase === 'victory') && !run.picks.length && !run.picked) run.picks = rollPicks(run, pickOptions());
  const show = (run.phase === 'shop' || run.phase === 'victory') && run.picks.length > 0;
  section.hidden = !show;
  if (!show) return;
  const reroll = $('pick-reroll');
  reroll.disabled = !!run.picked || run.pickRerolls <= 0;
  reroll.textContent = run.pickRerolls && !run.picked ? '重抽一次' : '不能重抽';
  const box = $('pick-cards'); box.replaceChildren();
  const rarityName = { common: '常见', uncommon: '少见', rare: '稀有' };
  section.classList.toggle('is-picked',!!run.picked);
  section.querySelector('h3').textContent=run.picked?'装配完成':'本关奖励 · 三选一';
  const visiblePicks=run.picked?run.picks.filter(card=>card.id===run.chosen):run.picks;
  visiblePicks.forEach(card => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pick-card rarity-${card.rarity}${run.chosen === card.id ? ' chosen' : ''}`;
    button.disabled = !!run.picked && run.chosen !== card.id;
    const rarity = document.createElement('small'); rarity.textContent = rarityName[card.rarity] || '航路';
    const title = document.createElement('strong'); title.textContent = card.name;
    const desc = document.createElement('span'); desc.textContent = card.desc;
    const art=document.createElement('div');art.className='pick-art';art.setAttribute('aria-hidden','true');art.innerHTML=card.kind==='coin'?coinArt(card.id,TOKENS[card.id]?.color):upgradeArt(card.id);
    button.append(art, rarity, title, desc);
    button.onclick = () => {
      if (!applyPick(run, card, (id, count) => tokens.grant({ [id]: count }))) return;
      if (card.kind === 'coin') tokens.select(card.id);
      tokens.setClipSize(2 + run.level('clip'));
      sfx.gate(); save(); renderResult(true); arcadeToast(`选定 ${card.name}`);
    };
    box.append(button);
  });
}
function renderResult(force = false) {
  const phase = run.phase;
  if (run.active || !started) { $('run-modal').hidden=true; resultPhase=''; return; }
  if(mobileCabinet?.shopClosed && !force) return;
  mobileCabinet?.openShop();
  $('run-modal').hidden=false;$('run-modal').dataset.phase=phase;
  if (resultPhase===phase && !force) return;
  resultPhase=phase; releaseLaunchers(lanes);
  const shop=phase==='shop', won=phase!=='gameover', r=run.receipt;
  $('result-kicker').textContent = phase==='victory' ? '八关制霸 · RUN COMPLETE' : `第 ${run.round} 关 · ${won?'挑战完成':'本局结束'}`;
  $('result-title').textContent = shop ? '机台补给舱' : won ? '恭喜通关！' : '差一点，再来一局';
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
  if(shop) tokenUI?.shop(true);
  if(shop) for(const id of run.offers) {
    const u=UPGRADES[id], bought=run.bought.includes(id), price=run.price(id), card=document.createElement('article');
    card.className=`upgrade-card ${u.color}${bought?' purchased':''}`;card.dataset.upgrade=id;
    const icon=document.createElement('div'); icon.className='upgrade-icon'; icon.innerHTML=upgradeArt(id);
    const title=document.createElement('h4'); title.textContent=u.name;
    const level=document.createElement('div'); level.className='upgrade-level'; level.textContent=id==='supply'?'一次性 · 下一关生效':`Lv.${run.level(id)} / ${u.max} · 整局生效`;
    const desc=document.createElement('p'); desc.textContent=u.desc;
    const button=document.createElement('button'); button.className='buy-button'; button.disabled=bought||run.cash<price;
    button.textContent=bought?'✓ 已购买':run.cash<price?`贝壳不足 · 需要 ${price}`:`购买 · ${price} 贝壳`;
    button.onclick=()=>{ if(run.buy(id)){sfx.gate();save();renderResult(true);updateHud(0);arcadeToast(`${u.name}改装完成！`);$('shop-tab-upgrades').focus({preventScroll:true});} };
    card.append(icon,title,level,desc,button); cards.append(card);
  }
  renderPicks();
  if(force) return;
  requestAnimationFrame(()=>$('next-round').focus({preventScroll:true}));
}
function finishRound() {
  if(!run.active||!run.reached) return;
  run.finish(); releaseLaunchers(lanes); sfx.levelUp(); confettiBurst(140); save(); renderResult(true); updateHud(0);
}
$('round-action').onclick=()=>{ if(!run.active){mobileCabinet.openShop();renderResult(true);}else finishRound(); };
$('reroll-shop').onclick=()=>{if(run.reroll()){sfx.tick();save();renderResult(true);arcadeToast('新一批宝贝上架啦');$('reroll-shop').focus({preventScroll:true});}};
$('next-round').onclick=()=>{
  if(run.phase==='shop') {
    if(!run.next()) return;
    coins.forEach(c=>c.p=c.body.translation());tokens.startStage(run.round,coins,specialAdapter);flushTokens();
    spawnRoundPrizes();
    // Preserve the physical field; buffs restart each stage.
    wallT=run.level('guard')*6; pushT=0; feverT=0; partyT=0; combo=0; lastWin=-100; winTimes.length=0; sfx.fast=1;
    releaseLaunchers(lanes); resultPhase=''; $('score-formula').textContent='基础分 × 构筑倍率 × 连击 × FEVER';
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
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pointRay(cx, cy) {
  const r = cv.getBoundingClientRect();
  ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
const cv = renderer.domElement;
const keySide = { KeyQ: 'left', KeyW: 'middle', KeyE: 'right' };
function releasePointer(e) {
  const source = 'ptr:' + e.pointerId;
  for (const lane of Object.values(lanes)) disengage(lane, source);
}
cv.tabIndex = 0;
cv.setAttribute('aria-label', '推币机：Q 左槽，W 或空格中槽，E 右槽。鼠标左键、中键、右键对应三槽。轻触大肥鱼互动。');
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  pointRay(e.clientX, e.clientY);
  if (inputOpen() && mascot.hitTest(ray)) { mascot.react('happy', 1.8); say('pet'); sfx.gate(); return; }
  if (e.pointerType === 'touch' || !inputOpen() || e.button > 2) return;
  const side = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
  e.preventDefault();
  engage(lanes[side], 'ptr:' + e.pointerId, { immediate: false });
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers have no capture id */ }
});
addEventListener('pointerup', releasePointer);
addEventListener('pointercancel', releasePointer);
addEventListener('blur', () => releaseLaunchers(lanes));
document.addEventListener('visibilitychange', () => { releaseLaunchers(lanes); clock.getDelta(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('help').classList.contains('show')) { $('help').classList.remove('show'); releaseLaunchers(lanes); cv.focus({ preventScroll: true }); }
  const chuteButtons = [$('chute-left'), $('dropbtn'), $('chute-right')];
  if (e.code === 'Space' && (e.target === document.body || e.target === cv || chuteButtons.includes(e.target))) {
    if (inputOpen() && !e.repeat) engage(lanes.middle, 'key:Space', { immediate: false });
    e.preventDefault();
  }
  if (keySide[e.code] && inputOpen()) {
    if (!e.repeat) engage(lanes[keySide[e.code]], 'key:' + e.code, { immediate: false });
    e.preventDefault();
  }
  if (e.code === 'KeyR' && inputOpen() && !e.repeat) {
    const ids = ['coin', ...Object.keys(tokens.bag).filter(k => tokens.bag[k] > 0)];
    tokens.select(ids[(ids.indexOf(tokens.selected) + 1) % ids.length]);
    releaseLaunchers(lanes); tokenUI.refresh(true); save();
  }
});
addEventListener('keyup', e => {
  if (e.code === 'Space') disengage(lanes.middle, 'key:Space');
  if (keySide[e.code]) disengage(lanes[keySide[e.code]], 'key:' + e.code);
});
function bindChute(id, side) {
  const button = $(id);
  button.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (!inputOpen()) return;
    const result = engage(lanes[side], 'ptr:' + e.pointerId, { immediate: true });
    if (result.fired) dropCoin(side);
    try { button.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers have no capture id */ }
  });
  if (side === 'middle') button.addEventListener('click', e => { if (e.detail === 0) { dropCoin('middle'); updateHud(0); } });
}
bindChute('chute-left', 'left');
bindChute('dropbtn', 'middle');
bindChute('chute-right', 'right');
$('exchange-btn').onclick = () => {
  if (!run.exchange()) return;
  sfx.gate(); bumpCoinHud(); arcadeToast(`兑到 ${EXCHANGE_GRANT} 枚投币`); save(); updateHud(0);
};
$('shake-btn').onclick = () => { if (!run.shake()) return; blastField('shake'); sfx.gate(); save(); updateHud(0); };
function toggleDock(id, label) {
  const panel = $(id); if (!panel) return;
  panel.classList.toggle('is-docked');
  const button = panel.querySelector('[data-dock]');
  if (button) button.textContent = panel.classList.contains('is-docked') ? `展开${label}` : '收起';
}
$('dock-shop').onclick = () => { $('run-modal').hidden=true; mobileCabinet.returnToCabinet(); };
$('dock-help').onclick = () => toggleDock('help', '说明');
$('dock-tokens').onclick = () => $('token-close').click();
// The wheel's own close action is wired after its mechanism is mounted.
$('pick-reroll').onclick = () => { if (rerollPicks(run, pickOptions())) { sfx.tick(); save(); renderResult(true); } };
$('btn-sound').onclick = e => { sfx.setEnabled(!sfx.enabled); e.currentTarget.classList.toggle('off', !sfx.enabled); };
$('btn-music').onclick = e => { sfx.setMusic(!sfx.musicOn); e.currentTarget.classList.toggle('off', !sfx.musicOn); };
$('btn-help').onclick = () => { releaseLaunchers(lanes); $('help').classList.toggle('show'); };
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
mobileCabinet=createMobileCabinet(()=>queueResize());
juice=createMachineJuice($('mobile-cabinet'));
prizeWheel=createPrizeWheel({
  canPresent: () => started && run.active && !helpBlocking() && !catalogBlocking() && !mobileCabinet.isMenuOpen(),
  onActive: active => { releaseLaunchers(lanes); mobileCabinet.setWheelActive(active); },
  onReveal: awardWheel,
  random:()=>run.random(),
  onChange: () => { if(started) save(); },
});
for (const item of restoredWheelQueue) prizeWheel.enqueue(item);
function resize() {
  resizeFrame = 0;
  const narrow=mobileCabinet.mobile;
  backboardGroup.visible=false;
  mascot.root.position.set(-5.1,2.7,1.25);mascot.root.scale.setScalar(narrow?.78:.96);
  CAM_DIR.set(0,narrow?.84:.601,narrow?.543:.799).normalize();
  CAM_TARGET.set(0,narrow?.8:.55,narrow?-.7:-1.0);
  leds.instanceMatrix.needsUpdate=true;ledPos.forEach((p,i)=>{if(p[3]===2)tmpM.makeScale(0,0,0);else tmpM.makeTranslation(p[0],p[1],p[2]);leds.setMatrixAt(i,tmpM);});
  const r=app.getBoundingClientRect(), w=Math.max(1,r.width), h=Math.max(1,r.height);
  camera.aspect=w/h; camera.fov=narrow?49:46;
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const up=new THREE.Vector3(0,CAM_DIR.z,-CAM_DIR.y);
  let distance=10;
  // Separate real cabinet regions avoid fitting imaginary upper-front corners,
  // which would unnecessarily shrink the playfield, especially on phones.
  const regions=[
    [[narrow?-5.2:-5.65,narrow?5.2:5.65],[-.1,2.75],[-6.3,4.25]],
    [[-4.4,4.4],[3.2,4.2],[-5.8,-3.5]],
  ];
  for(const [xs,ys,zs] of regions) for(const x of xs) for(const y of ys) for(const z of zs) {
    const relative=new THREE.Vector3(x,y,z).sub(CAM_TARGET);
    const near=relative.dot(CAM_DIR);
    distance=Math.max(distance,near+Math.abs(relative.dot(up))/tan*1.055,near+Math.abs(x)/(tan*camera.aspect)*1.055);
  }
  CAM_POS.copy(CAM_TARGET).addScaledVector(CAM_DIR,distance+0.35);
  camera.updateProjectionMatrix(); camera.position.copy(CAM_POS); camera.lookAt(CAM_TARGET); camera.updateMatrixWorld();
  renderer.setSize(w,h); composer.setSize(w,h); bloom.setSize(w,h);seasideRoom.resize(w,h,narrow);
  const bannerEl=$('banner');bannerEl.style.left=(r.left+w/2)+'px';bannerEl.style.top=(r.top+h*.4)+'px';bannerEl.style.maxWidth=(w-24)+'px';
  $('floats').style.clipPath=`inset(${r.top}px ${innerWidth-r.right}px ${innerHeight-r.bottom}px ${r.left}px)`;
}
function queueResize(){if(!resizeFrame) resizeFrame=requestAnimationFrame(resize);}
addEventListener('resize',queueResize);
const hudObserver=new ResizeObserver(queueResize);hudObserver.observe($('hud-top'));hudObserver.observe($('hud-bottom'));hudObserver.observe(app);
$('detail-toggle').onclick=()=>{
  const button=$('detail-toggle'), open=button.getAttribute('aria-expanded')!=='true';
  button.setAttribute('aria-expanded',String(open));button.title=open?'收起计分详情':'展开计分详情';$('score-formula').hidden=!open;releaseLaunchers(lanes);resize();
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
  if (!started || !run.active || helpBlocking() || catalogBlocking() || mobileCabinet?.isMenuOpen() || prizeWheel?.active || document.hidden) { updateHud(dt); syncCoins(); const pp=pusherBody.translation(); pusherMesh.position.set(pp.x,pp.y,pp.z); return; }
  time += dt;

  for (const rig of Object.values(chuteRig)) rig.scale.y += (1 - rig.scale.y) * Math.min(1, dt * 12);
  const swingScale = 1 + (run.relics.swing || 0) * 0.28;
  const swingX = pendulumOffset(time, swingScale);
  pendulum.position.x = swingX;
  pendulum.rotation.z = swingX / 9;
  const forward = pusherMovingForward(pushPhase);
  chuteMat.side.emissiveIntensity = forward ? 0.9 : 0.18;
  chuteMat.mid.emissiveIntensity = tokens.selected !== 'coin' ? 1.15 : forward ? 0.22 : 0.85;
  if (inputOpen()) for (const side of stepLaunchers(lanes, dt)) dropCoin(side);
  stepSlides(dt);
  // 奖励计时
  wallT = Math.max(0, wallT - dt); pushT = Math.max(0, pushT - dt); partyT = Math.max(0, partyT - dt);
  if (feverT > 0) { feverT -= dt; if (feverT <= 0) sfx.fast = 1; }
  pushMaxTarget = (pushT > 0 ? 0.6 : -0.5) + run.level('push') * 0.12; pushSpeed = pushT > 0 ? 1.9 : 1.55;
  guards.forEach((g, i) => {
    const target = wallT > 0 ? 0.7 : -1.0; g.y += (target - g.y) * Math.min(1, dt * 5);
    g.mesh.position.y = g.y; { const ty = wallT > 0 ? 0.7 : -20, cur = g.body.translation(); if (Math.abs(cur.y - ty) > 0.01) g.body.setTranslation({ x: cur.x, y: ty, z: cur.z }, true); }
    g.mesh.material.opacity = 0.35 + 0.2 * Math.sin(time * 8) * (wallT < 5 && wallT > 0 ? 2 : 0.5);
  });
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
  tokenAcc+=dt;if(tokenAcc>=.2){stepTokens(Math.min(.5,tokenAcc));tokenAcc=0;}

  // 硬币状态
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i], p = c.p = c.body.translation();
    if(c.tokenDead)continue;
    if (!c.body.isSleeping()) {
      const v = c.body.linvel(), dv = Math.hypot(v.x - c.pv.x, v.y - c.pv.y, v.z - c.pv.z);
      if (dv > 2.6 && p.y > -2.6 && c.state !== 'won') sfx.clink(Math.min(1, dv / 9) * (c.kind === 'coin' ? 1 : 1.3), p.x / 6);
      else if (dv > 2.6 && c.state === 'won' && c.t < 1) sfx.clink(Math.min(0.7, dv / 12), p.x / 6);
      c.pv = v;
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
  flushTokens();syncCoins();

  // 推板网格
  { const pp = pusherBody.translation(); pusherMesh.position.set(pp.x, pp.y, pp.z); }

  // 吉祥物
  mascot.update(dt, time);
  coins.forEach(c => c.mesh && c.mesh.userData.rac && c.mesh.userData.rac.update(dt, time));
  if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) $('bubble').classList.remove('show'); }
  idleTalk -= dt; if (idleTalk < 0) { idleTalk = 10 + Math.random() * 10; if (bubbleT <= 0 && started) say('idle'); }
  {
    const [bx, by] = toScreen(mascot.root.position.x + 0.2, mascot.root.position.y + 2.4*mascot.root.scale.y+.3, mascot.root.position.z);
    const b = $('bubble'), r=app.getBoundingClientRect(); b.style.left = Math.max(r.left+b.offsetWidth/2+8,Math.min(r.right-b.offsetWidth/2-8,bx)) + 'px'; b.style.top = Math.max(r.top+44,by) + 'px';
  }

  const spinLevel = comboWheel.tick(time);
  if (spinLevel) presentLottery(spinLevel);
  updateLeds(time); updateSparkles(dt); updateConfetti(dt);
  if (partyT > 0 && Math.random() < 0.3) burst((Math.random() - 0.5) * 10, 3 + Math.random() * 3, -2 + Math.random() * 4, 6, `hsl(${Math.random() * 360},100%,65%)`, 3, 2);
  pinkL.intensity = motionReduced.matches?3:6 + (partyT > 0 || feverT > 0 ? Math.sin(time * 20) * 5 : Math.sin(time * 2) * 1.5);
  cyanL.intensity = motionReduced.matches?3:6 + (partyT > 0 || feverT > 0 ? Math.cos(time * 20) * 5 : Math.cos(time * 2) * 1.5);

  // 相机：轻微呼吸 + 震动
  shake = Math.max(0, shake - dt * 1.5);
  const sx = motionReduced.matches?0:(Math.random() - 0.5) * shake * 0.6, sy = motionReduced.matches?0:(Math.random() - 0.5) * shake * 0.6;
  camera.position.set(CAM_POS.x + (motionReduced.matches?0:Math.sin(time * 0.3) * 0.15) + sx, CAM_POS.y + (motionReduced.matches?0:Math.sin(time * 0.4) * 0.06) + sy, CAM_POS.z);
  camera.lookAt(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);

  if (run.tick(dt, showerQueue.length > 0 || prizeWheel?.active || comboWheel.level > 0)) { releaseLaunchers(lanes); save(); }
  updateHud(dt);
}
frame();
tokenUI=createTokenUI({kit:()=>tokens,run:()=>run,entities:()=>coins,save,pauseInput:()=>releaseLaunchers(lanes),sfx:()=>sfx.gate(),changed:()=>renderResult(true)});
window.__game = { get prizeWheel(){return prizeWheel;}, showLottery, get tokens(){return tokens;}, stepTokens, tokenCatalog:TOKENS, changeToken:(c,k)=>specialAdapter.change(c,k), nextTokenStage:()=>tokens.startStage(run.round,coins,specialAdapter), theme: () => ({ name: '大肥鱼推币机', pose: mascot.pose }), pause: v => paused = v, stats, comboWheel, leds: () => updateLeds(time), syncCoins, update, render: () => composer.render(), state, coins, world, physicsStep, dropCoin, spawnPrize:(kind,x)=>spawnTablePrize(kind,x), pendulumX:()=>pendulum.position.x, get run(){return run;}, layout:()=>({viewport:app.getBoundingClientRect().toJSON(),mobile:mobileCabinet.mobile,environment:'whale-night-arcade',upper:$('machine-upper').getBoundingClientRect().toJSON(),mascot:(()=>{mascot.portrait.updateWorldMatrix(true,false);const p=mascot.portrait.getWorldPosition(new THREE.Vector3()),s=mascot.portrait.getWorldScale(new THREE.Vector3()),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),pts=[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]].map(([x,y])=>toScreen(...p.clone().addScaledVector(right,x*s.x).addScaledVector(up,y*s.y).toArray()));return {left:Math.min(...pts.map(p=>p[0])),right:Math.max(...pts.map(p=>p[0])),top:Math.min(...pts.map(p=>p[1])),bottom:Math.max(...pts.map(p=>p[1])),scale:mascot.root.scale.x,z:mascot.root.position.z};})(),landmarks:(mobileCabinet.mobile?[[-5,0,4],[5,0,4],[-5,PUSH_H,-6],[5,PUSH_H,-6]]:[[-4.5,9.15,-6.1],[4.5,9.15,-6.1],[-3.5,7.6,-6.1],[3.5,3.6,-6.1],[-5,0,4],[5,0,4],[-5,PUSH_H,-6],[5,PUSH_H,-6]]).map(p=>toScreen(...p))}), save, onWin, spawn, finishRound,  get pushPhase(){return pushPhase;}, set pushPhase(v){pushPhase=v;}, start: () => $('start-button').click() };
