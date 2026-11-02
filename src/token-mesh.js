import * as THREE from 'three';
import { TOKENS, isBad } from './tokens.js?v=4.0.0';
import { paintEmblem } from './token-art.js?v=4.0.0';
const cache=new Map(),geometries=new Map();
const chargeGeo=new THREE.TorusGeometry(.555,.028,6,32),multiGeo=new THREE.TorusGeometry(.485,.023,6,32);
const chargeMat=new THREE.MeshBasicMaterial({color:'#79d5d2',toneMapped:false}),multiMat=new THREE.MeshBasicMaterial({color:'#f3b3df',toneMapped:false});
// 仅改变共享模型的外沿，不增加物理碰撞体或逐帧网格。
function geometryFor(group){
 if(geometries.has(group))return geometries.get(group);
 const geometry=new THREE.CylinderGeometry(.58,.58,.17,48),position=geometry.attributes.position;
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),z=position.getZ(i),r=Math.hypot(x,z);if(r<.1)continue;
  const angle=Math.atan2(z,x),waves=group==='坏币'?8:group==='物理'||group==='充能'?6:group==='种植'||group==='成长'?8:12;
  const depth=group==='坏币'?.055:group==='物理'||group==='充能'?.035:.014;
  const scale=1-depth*(.5+.5*Math.cos(angle*waves));position.setXYZ(i,x*scale,position.getY(i),z*scale);
 }
 geometry.computeVertexNormals();geometries.set(group,geometry);return geometry;
}
function materialsFor(id,d){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const g=canvas.getContext('2d'),bad=isBad(id);
 const rim=g.createLinearGradient(0,0,200,256);rim.addColorStop(0,'#edf1d7');rim.addColorStop(.2,d.color);rim.addColorStop(1,bad?'#4c484b':'#416975');
 g.fillStyle=rim;g.fillRect(0,0,256,256);
 g.strokeStyle=bad?'#d78a72':'#f3e9bc';g.lineWidth=4;g.beginPath();g.arc(128,128,119,0,Math.PI*2);g.stroke();
 const enamel=g.createRadialGradient(104,78,5,128,128,109);enamel.addColorStop(0,bad?'#b4a99d':'#fff6da');enamel.addColorStop(1,bad?'#827f7b':'#cadccf');
 g.fillStyle=enamel;g.beginPath();g.arc(128,128,106,0,Math.PI*2);g.fill();
 g.strokeStyle=bad?'#5b4442':'#3f6670';g.lineWidth=3;g.stroke();
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12;g.strokeStyle=i%3?'#153e4c66':'#fff2c4';g.lineWidth=2;
  g.beginPath();g.moveTo(128+Math.cos(a)*110,128+Math.sin(a)*110);g.lineTo(128+Math.cos(a)*115,128+Math.sin(a)*115);g.stroke();
 }
 g.save();g.translate(42,38);g.scale(2.7,2.7);paintEmblem(g,id,d.color);g.restore();
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 const face=new THREE.MeshStandardMaterial({map:tex,metalness:.18,roughness:.52});
 const side=new THREE.MeshStandardMaterial({color:d.color,metalness:.58,roughness:.4});
 return [side,face,face];
}
export function makeTokenMesh(id){
 const d=TOKENS[id];if(!d)return null;
 if(!cache.has(id))cache.set(id,materialsFor(id,d));
 const mesh=new THREE.Mesh(geometryFor(d.group),cache.get(id));mesh.castShadow=mesh.receiveShadow=true;mesh.userData.tokenId=id;
 const charge=new THREE.Mesh(chargeGeo,chargeMat),multi=new THREE.Mesh(multiGeo,multiMat);
 for(const ring of [charge,multi]){ring.rotation.x=Math.PI/2;ring.position.y=.105;ring.visible=false;mesh.add(ring);}
 mesh.userData.chargeRing=charge;mesh.userData.multiRing=multi;
 return mesh;
}
