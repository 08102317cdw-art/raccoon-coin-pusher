import * as THREE from 'three';
import { characterImages } from './character-art.js?v=2.1.1';

// Licensed, illustrated acrylic standee — not an unofficial approximation of the art.
// Textures are shared between the cabinet mascot and collectible mini-standees.
const maps = {};
function artMap(name) {
  if (!maps[name]) {
    const t = new THREE.Texture(characterImages[name]); t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true; maps[name] = t;
  }
  return maps[name];
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function buildDafeiyu() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const material = new THREE.SpriteMaterial({ map: artMap('idle'), transparent: true, depthWrite: false, toneMapped: false });
  const portrait = new THREE.Sprite(material); portrait.position.y = 1.2;
  portrait.scale.set(2.4 * characterImages.idle.width / characterImages.idle.height, 2.4, 1); body.add(portrait);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.68,.76,.1,48),new THREE.MeshStandardMaterial({color:'#b6e9f6',metalness:.5,roughness:.24}));
  pedestal.position.y = -.03; root.add(pedestal);
  return {
    root, body, portrait, mood: 'idle', moodT: 0, pose: 'idle',
    react(m, dur = 1.2) { this.mood = m; this.moodT = dur; },
    update(dt, t) {
      this.moodT -= dt; if (this.moodT <= 0) this.mood = 'idle';
      const pose = this.mood === 'jackpot' ? 'eat' : ['happy','excited'].includes(this.mood) ? 'happy' : 'idle';
      if (pose !== this.pose) {
        this.pose = pose; material.map = artMap(pose);
        portrait.scale.x = 2.4 * characterImages[pose].width / characterImages[pose].height;
      }
      body.position.y = reducedMotion ? 0 : Math.sin(t * 2.4) * .035 + (this.mood === 'happy' || this.mood === 'jackpot' ? Math.abs(Math.sin(t * 7)) * .16 : 0);
      material.rotation = reducedMotion ? 0 : Math.sin(t * 1.7) * .025;
    }
  };
}
