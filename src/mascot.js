import * as THREE from 'three';

export function buildRaccoon(coinMat) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const M = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const fur = M('#9496a3'), dark = M('#2e3040'), white = M('#f3efe6'), shiny = M('#0d0d12', 0.15, { metalness: 0.2 }), pink = M('#e89aa6');
  const S = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = body) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = true; parent.add(o); return o;
  };
  // 身体
  S(0.55, fur, 0, 0.6, 0, 1, 1.1, 0.9);
  S(0.38, white, 0, 0.55, 0.22, 1, 1.1, 0.7);
  // 腿
  S(0.2, dark, -0.28, 0.12, 0.15, 1, 0.7, 1.3); S(0.2, dark, 0.28, 0.12, 0.15, 1, 0.7, 1.3);
  // 头
  const head = new THREE.Group(); head.position.set(0, 1.35, 0); body.add(head);
  S(0.52, fur, 0, 0, 0, 1.08, 0.92, 0.95, head);
  S(0.25, white, 0, -0.12, 0.36, 1.25, 0.8, 0.9, head);
  for (const sx of [-1, 1]) {
    const mask = S(0.2, dark, sx * 0.2, 0.06, 0.36, 1.25, 0.75, 0.6, head); mask.rotation.z = sx * -0.35;
    S(0.1, white, sx * 0.23, 0.24, 0.38, 1.4, 0.6, 0.6, head);
    const ear = S(0.17, dark, sx * 0.36, 0.42, -0.02, 1, 1.15, 0.55, head); ear.rotation.z = sx * -0.4;
    S(0.1, pink, sx * 0.35, 0.42, 0.06, 1, 1.1, 0.4, head).rotation.z = sx * -0.4;
    S(0.18, white, sx * 0.36, -0.1, 0.28, 1, 0.8, 0.8, head);
  }
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * 0.2, 0.06, 0.46); head.add(e);
    S(0.075, shiny, 0, 0, 0, 1, 1, 0.7, e);
    S(0.025, M('#ffffff', 0.2, { emissive: '#ffffff', emissiveIntensity: 0.6 }), 0.025, 0.03, 0.05, 1, 1, 1, e);
    eyes.push(e);
  }
  S(0.07, shiny, 0, -0.03, 0.6, 1.3, 0.9, 1, head);
  const mouth = S(0.05, M('#5a2a32'), 0, -0.2, 0.55, 1.4, 0.6, 0.5, head);
  // 手臂
  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.45, 0.88, 0.05); body.add(pivot);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.38, 6, 12), dark); arm.position.set(0, -0.22, 0.12); arm.rotation.x = -0.6; arm.castShadow = true;
    pivot.add(arm); pivot.rotation.z = sx * 0.25; arms.push(pivot);
  }
  // 抱着的硬币
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 40), coinMat);
  coin.rotation.x = Math.PI / 2; coin.position.set(0, 0.6, 0.48); coin.castShadow = true; body.add(coin);
  // 尾巴
  const tail = new THREE.Group(); tail.position.set(0, 0.35, -0.45); body.add(tail);
  let parent = tail;
  const segs = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.set(0, i ? 0.17 : 0, i ? -0.03 : 0); parent.add(g);
    S(0.17 - i * 0.008, i % 2 ? dark : fur, 0, 0, 0, 1, 1.1, 1, g);
    g.rotation.x = -0.28; segs.push(g); parent = g;
  }
  return {
    root, body, head, eyes, arms, tail, segs, coin, mouth,
    mood: 'idle', moodT: 0, blinkT: 2,
    react(m, dur = 1.2) { this.mood = m; this.moodT = dur; },
    update(dt, t) {
      this.moodT -= dt; if (this.moodT <= 0) this.mood = 'idle';
      this.blinkT -= dt;
      const blink = this.blinkT < 0.12 ? 0.1 : 1; if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
      this.eyes.forEach(e => e.scale.y = blink);
      let jump = 0, armUp = 0, spin = 0, nod = Math.sin(t * 2) * 0.05;
      if (this.mood === 'happy') { jump = Math.abs(Math.sin(t * 12)) * 0.25; armUp = 2.4; }
      if (this.mood === 'jackpot') { jump = Math.abs(Math.sin(t * 9)) * 0.55; armUp = 2.8 + Math.sin(t * 20) * 0.3; spin = t * 6; }
      if (this.mood === 'sad') { nod = 0.35; }
      if (this.mood === 'excited') { armUp = 1.2 + Math.sin(t * 18) * 0.5; jump = Math.abs(Math.sin(t * 16)) * 0.1; }
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, jump + Math.sin(t * 3) * 0.02, 0.4);
      this.body.rotation.y = spin ? spin : THREE.MathUtils.lerp(this.body.rotation.y % (Math.PI * 2), Math.sin(t * 0.7) * 0.15, 0.1);
      this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, nod, 0.1);
      this.head.rotation.z = Math.sin(t * 1.3) * 0.08;
      this.arms.forEach((a, i) => { const s = i ? 1 : -1; a.rotation.x = THREE.MathUtils.lerp(a.rotation.x, -armUp, 0.2); a.rotation.z = s * (0.25 + armUp * 0.1); });
      this.coin.visible = armUp < 1;
      this.mouth.scale.y = this.mood === 'idle' ? 0.6 : 1.4;
      this.segs.forEach((g, i) => { g.rotation.z = Math.sin(t * 3 - i * 0.6) * 0.12 * (this.mood === 'idle' ? 1 : 2.5); });
    }
  };
}
