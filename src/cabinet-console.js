import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
// Mechanical console controls are real scene meshes. Transparent HTML hit areas
// are projected onto their caps for pointer capture, keyboard access and 44px taps.
export function createCabinetConsole(scene){
 const root=new THREE.Group();root.position.set(0,-1.2,6.4);scene.add(root);
 const enamel=new THREE.MeshStandardMaterial({color:'#1d607a',metalness:.18,roughness:.5});
 const rim=new THREE.MeshStandardMaterial({color:'#edbd64',metalness:.78,roughness:.34});
 const deck=new THREE.Mesh(new RoundedBoxGeometry(12.2,.62,2.1,4,.23),enamel);root.add(deck);deck.receiveShadow=true;deck.castShadow=true;
 const front=new THREE.Mesh(new RoundedBoxGeometry(11.8,.18,2.0,3,.1),rim);front.position.y=-.19;root.add(front);
 const top=new THREE.Mesh(new RoundedBoxGeometry(11.95,.07,1.9,3,.1),new THREE.MeshStandardMaterial({color:'#fff1cf',metalness:.15,roughness:.57}));top.position.y=.34;root.add(top);
 const controls=[];
 const specs=[['exchange-btn',-4.9,.62,'exchange','#ffcf69','兑币'],['chute-left',-2.6,.91,'left','#7bd6e9','左投'],['dropbtn',0,1.06,'both','#ff8e70','双投'],['chute-right',2.6,.91,'right','#7bd6e9','右投'],['shake-btn',4.9,.62,'shake','#fff0c9','摇台']];
 for(const [id,x,r,side,color,label]of specs){
  const mount=new THREE.Group();mount.position.set(x,.36,0);root.add(mount);
  const socket=new THREE.Mesh(new THREE.CylinderGeometry(r+.13,r+.2,.13,48),new THREE.MeshStandardMaterial({color:'#214758',metalness:.7,roughness:.35}));mount.add(socket);
  const bezel=new THREE.Mesh(new THREE.TorusGeometry(r+.02,.075,8,48),rim);bezel.rotation.x=Math.PI/2;bezel.position.y=.09;mount.add(bezel);
  const cap=new THREE.Group();mount.add(cap);cap.position.y=.17;
  const capMat=new THREE.MeshStandardMaterial({color,metalness:.15,roughness:.4,emissive:color,emissiveIntensity:.1});
  const face=new THREE.Mesh(new THREE.CylinderGeometry(r*.89,r*.96,.19,48),capMat);face.castShadow=true;cap.add(face);
  const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');
  g.fillStyle='#133746';g.strokeStyle='#133746';g.lineWidth=11;g.lineCap='round';g.lineJoin='round';
  if(side==='left'||side==='right'||side==='both'){
   const coin=(cx,cy,rr)=>{g.lineWidth=7;g.beginPath();g.arc(cx,cy,rr,0,7);g.stroke();g.lineWidth=4;g.beginPath();g.arc(cx,cy,rr-10,0,7);g.stroke();};
   if(side==='both'){coin(96,87,37);coin(160,87,37);g.lineWidth=10;g.beginPath();g.moveTo(78,144);g.lineTo(128,160);g.lineTo(178,144);g.stroke();}
   else{coin(128,83,39);g.lineWidth=10;const d=side==='left'?1:-1;g.beginPath();g.moveTo(128-d*39,147);g.lineTo(128+d*39,147);g.moveTo(128+d*18,130);g.lineTo(128+d*39,147);g.lineTo(128+d*18,164);g.stroke();}
   g.font='900 64px "Noto Sans SC",sans-serif';g.textAlign='center';g.fillText(label,128,220);
  }else if(side==='exchange'){
   for(const y of[75,103,131]){g.beginPath();g.ellipse(128,y,48,18,0,0,7);g.stroke();}g.font='bold 62px Arial';g.textAlign='center';g.fillText('+8',128,220);
  }else{
   g.lineWidth=16;g.beginPath();g.moveTo(79,139);g.lineTo(79,80);g.quadraticCurveTo(128,41,177,80);g.lineTo(177,139);g.stroke();g.lineWidth=8;g.beginPath();g.moveTo(63,145);g.lineTo(193,145);g.stroke();g.font='900 64px "Noto Sans SC",sans-serif';g.textAlign='center';g.fillText(label,128,220);
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const faceArt=new THREE.Mesh(new THREE.PlaneGeometry(r*1.63,r*1.63),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false}));faceArt.rotation.x=-Math.PI/2;faceArt.position.y=.101;cap.add(faceArt);
  controls.push({id,side,mount,cap,capMat,r,baseColor:color});
 }
 // Captive screws, inset ventilation and a brass seam ground the controls in a body.
 for(const x of[-5.86,5.86])for(const z of[-.75,.75]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.025,12),rim);bolt.position.set(x,.395,z);root.add(bolt);}
 return {root,controls,update(lanes){for(const b of controls){const el=document.getElementById(b.id),lane=lanes[b.side],pressed=lane&&(lane.locked||lane.sources.size)||el.matches(':active');b.cap.position.y+=( (pressed?.07:.17)-b.cap.position.y)*.35;b.capMat.emissiveIntensity=el.disabled?0:pressed?.4:.1;b.capMat.color.set(el.disabled?'#a9c4b7':b.baseColor);}},project(toScreen,rect){
  root.updateWorldMatrix(true,true);
  for(const b of controls){const center=b.mount.localToWorld(new THREE.Vector3(0,.3,0));const p=toScreen(center.x,center.y,center.z),a=b.mount.localToWorld(new THREE.Vector3(-b.r,.3,-b.r)),z=b.mount.localToWorld(new THREE.Vector3(b.r,.3,b.r)),p1=toScreen(a.x,a.y,a.z),p2=toScreen(z.x,z.y,z.z);const width=Math.max(44,Math.abs(p2[0]-p1[0])+8),height=Math.max(44,Math.abs(p2[1]-p1[1])+8);const el=document.getElementById(b.id);el.style.left=(p[0]-rect.left-width/2)+'px';el.style.top=(p[1]-rect.top-height/2)+'px';el.style.width=width+'px';el.style.height=height+'px';}
 }};
}
