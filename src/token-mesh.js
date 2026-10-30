import * as THREE from 'three';
import { TOKENS, isBad } from './tokens.js?v=2.2.0';
const cache=new Map();
const geometry=new THREE.CylinderGeometry(.58,.58,.16,32);
const chargeGeo=new THREE.TorusGeometry(.565,.025,6,32),multiGeo=new THREE.TorusGeometry(.49,.022,6,32);
const chargeMat=new THREE.MeshBasicMaterial({color:'#7ceaff',toneMapped:false}),multiMat=new THREE.MeshBasicMaterial({color:'#ffb3e4',toneMapped:false});
// Medallions use high-contrast glyphs as icons, not copied game art.
export function makeTokenMesh(id){
 const d=TOKENS[id];if(!d)return null;
 if(!cache.has(id)){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const gr=g.createRadialGradient(94,80,12,128,128,128);gr.addColorStop(0,isBad(id)?'#473e4d':'#e2f0f2');gr.addColorStop(1,isBad(id)?'#18151d':d.color);g.fillStyle=gr;g.fillRect(0,0,256,256);
  g.strokeStyle=d.color;g.lineWidth=12;g.beginPath();g.arc(128,128,115,0,Math.PI*2);g.stroke();
  g.strokeStyle=isBad(id)?'#e6a9a0':'#38536a';g.lineWidth=3;g.beginPath();g.arc(128,128,99,0,Math.PI*2);g.stroke();
  g.fillStyle=isBad(id)?'#ffd1c4':'#10263c';g.font='900 112px "Noto Sans SC", "Microsoft YaHei", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(d.glyph,128,126);
  g.font='700 20px Arial';g.fillText(isBad(id)?'BAD':d.group==='净化'?'CLEAN':'SPECIAL',128,205);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const face=new THREE.MeshStandardMaterial({map:tex,metalness:.55,roughness:.34});
  const side=new THREE.MeshStandardMaterial({color:d.color,metalness:.65,roughness:.3});cache.set(id,[side,face,face]);
 }
 const mesh=new THREE.Mesh(geometry,cache.get(id));mesh.castShadow=mesh.receiveShadow=true;
 const charge=new THREE.Mesh(chargeGeo,chargeMat),multi=new THREE.Mesh(multiGeo,multiMat);
 for(const ring of [charge,multi]){ring.rotation.x=Math.PI/2;ring.position.y=.095;ring.visible=false;mesh.add(ring);}
 mesh.userData.chargeRing=charge;mesh.userData.multiRing=multi;
 return mesh;
}
