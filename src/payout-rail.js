import * as THREE from 'three';
// A physical-looking collector light. It only reacts to an actual scored body.
export function createPayoutRail(scene, z, halfWidth) {
  const mat = new THREE.MeshStandardMaterial({color:'#d8a84f',emissive:'#eaa83a',emissiveIntensity:.18,metalness:.55,roughness:.3});
  const rail = new THREE.Mesh(new THREE.BoxGeometry(halfWidth*2,.07,.1),mat);
  rail.position.set(0,-.06,z+.045);scene.add(rail);
  const light = new THREE.PointLight('#ffbf54',0,5,2);light.position.set(0,.35,z+.55);scene.add(light);
  let glow=0;
  return { collect(){glow=1;}, update(dt,reduced){glow=Math.max(0,glow-dt*2.4);mat.emissiveIntensity=.18+glow*(reduced?.3:1.5);light.intensity=reduced?0:glow*6;} };
}
