import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { floorTexture, stripeTexture, plateTexture, wallTexture, glowSprite, textTexture } from './textures.js?v=4.4.1';
import { buildDafeiyu } from './mascot.js?v=4.4.1';
import { dressCabinet } from './cabinet-details.js?v=4.4.1';
import { loadCabinetModel } from './cabinet-model.js?v=4.4.1';
import { finishCabinet } from './cabinet-finish.js?v=4.4.1';

// Cabinet presentation stays separate from run rules and the simulation loop.
// Factories are invoked at the original initialization points; no timing changes.
export function createCabinetBase({ scene, world, staticBox, HALF_W, FRONT_Z, BACK_Z, GAP_Z, WALL_Z, PUSH_H, PUSH_BACK, PUSH_D, F_PUSH, chrome, orange, brown, darkMat, glass }) {
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
  const backboardGroup=new THREE.Group();scene.add(backboardGroup);
  staticBox(HALF_W, 3.2, 0.15, 0, PUSH_H + 0.035 + 3.2, WALL_Z - 0.15, 0.1);
  const wt = wallTexture();
  meshBox(HALF_W * 2 + 0.3, 7.6, 0.3, new THREE.MeshStandardMaterial({ map: wt, roughness: 0.6, metalness: 0.2 }), 0, PUSH_H + 0.035 + 3.8, WALL_Z - 0.15,0,backboardGroup);
  const SCREEN_W = 6.4, SCREEN_H = 3.6, SCREEN_Y = 5.55;
  // 顶部招牌
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.5), new THREE.MeshBasicMaterial({ map: textTexture('大肥鱼推币机', 1024, 170, { color: '#fff0a8', strokeColor: '#15547d', stroke: 22, font: '900 105px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif' }), transparent: true, toneMapped: false }));
  sign.position.set(0, SCREEN_Y + SCREEN_H / 2 + 1.05, WALL_Z + 0.1); backboardGroup.add(sign);

  dressCabinet(scene,backboardGroup,HALF_W,WALL_Z);
  finishCabinet(scene);

  // ---------- 推板 ----------
  const pusherBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, PUSH_H / 2, PUSH_BACK - PUSH_D / 2));
  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF_W - 0.03, PUSH_H / 2, PUSH_D / 2).setFriction(F_PUSH).setRestitution(0), pusherBody);
  const ptop = plateTexture(); ptop.repeat.set(4, 2.4);
  const pusherMats = [chrome, chrome, new THREE.MeshStandardMaterial({ map: ptop, metalness: 0.65, roughness: 0.4 }), chrome, new THREE.MeshStandardMaterial({ map: stripeTexture('#ff7a18', '#ffc53d', 'PUSH'), metalness: 0.3, roughness: 0.35 }), chrome];
  const pusherMesh = new THREE.Mesh(new THREE.BoxGeometry((HALF_W - 0.03) * 2, PUSH_H, PUSH_D), pusherMats);
  pusherMesh.castShadow = pusherMesh.receiveShadow = true; scene.add(pusherMesh);
  return { meshBox, guards, backboardGroup, SCREEN_W, SCREEN_H, SCREEN_Y, pusherBody, pusherMesh };
}

export async function createCabinetAccents({ scene, staticBox, meshBox, HALF_W, FRONT_Z, WALL_Z, GATE_Y, DROP_Z, TRAY_Y, SCREEN_W, SCREEN_H, SCREEN_Y, chrome, darkMat, coinFaceMat, getEffects }) {
  const tmpM = new THREE.Matrix4();
  // ================== 固定投币槽 + 幸运门 ==================
  const model=await loadCabinetModel(scene);
  const {chuteMat,chuteRig,pendulum}=model;

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
    const { feverT, partyT } = getEffects();
    const fever = feverT > 0, party = partyT > 0;
    ledPos.forEach((p, i) => {
      let on;
      if (party) { ledCol.setHSL((i * 0.03 + t * 1.5) % 1, 1, 0.6); on = (Math.floor(t * 12) + i) % 3 !== 0 ? 1 : 0.15; }
      else if (fever) { ledCol.setHSL((i * 0.05 + t) % 1, 1, 0.6); on = (Math.floor(t * 18) + i) % 2 ? 1 : 0.2; }
      else {
        const ph = p[3] === 2 ? Math.floor(t * 6) : Math.floor(t * 8);
        on = (ph + i) % 4 === 0 ? 1.4 : 0.35;
        if (p[3] === 0) ledCol.set('#ffcf5a'); else if (p[3] === 1) ledCol.set('#b4d6cb'); else ledCol.set('#f1d59b');
      }
      ledCol.multiplyScalar(on * 1.6); leds.setColorAt(i, ledCol);
    });
    leds.instanceColor.needsUpdate = true;
  }

  // 出币托盘
  staticBox(HALF_W, 0.2, 1.3, 0, TRAY_Y - 0.2, FRONT_Z + 1.4);
  staticBox(HALF_W, 0.8, 0.1, 0, TRAY_Y + 0.5, FRONT_Z + 2.75);
  // ================== 吉祥物 ==================
  const mascot = buildDafeiyu(coinFaceMat);
  await mascot.activateLive2D();
  mascot.root.position.set(-HALF_W - 1.55, 2.73, -1.2); mascot.root.scale.setScalar(1.25); mascot.root.rotation.y = 0.55;
  mascot.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(mascot.root);
  return { model, chuteMat, chuteRig, pendulum, ledPos, leds, updateLeds, mascot };
}

export function createCabinetParticles(scene) {
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
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
  return { burst, updateSparkles, confettiBurst, updateConfetti };
}
