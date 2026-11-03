import * as THREE from 'three';
import { drawWhale } from './textures.js?v=5.0.0';
// Engraved side decks: maritime enamel, pinstripes, milled fasteners and makers' marks.
// These are decorative meshes only. Nothing changes the Rapier collision surfaces.
export function finishCabinet(scene) {
 const c=document.createElement('canvas');c.width=256;c.height=1536;const g=c.getContext('2d');
 const bg=g.createLinearGradient(0,0,256,0);bg.addColorStop(0,'#c86652');bg.addColorStop(.13,'#fff1ca');bg.addColorStop(.25,'#f59475');bg.addColorStop(.75,'#f59475');bg.addColorStop(.9,'#fff1ca');bg.addColorStop(1,'#f7c19b');g.fillStyle=bg;g.fillRect(0,0,256,1536);
 g.fillStyle='#f7a387';g.beginPath();g.roundRect(32,20,192,1496,35);g.fill();
 for(const x of [38,48,208,218]){g.strokeStyle=x===48||x===208?'#f8d2a4':'#f7d28e';g.lineWidth=2;g.beginPath();g.moveTo(x,48);g.lineTo(x,1488);g.stroke();}
 for(let y=60;y<1480;y+=52){g.strokeStyle='#b9604655';g.lineWidth=2;g.beginPath();g.moveTo(66,y+12);g.bezierCurveTo(95,y-16,163,y+40,190,y+12);g.stroke();}
 for(const y of [190,760,1330]){g.fillStyle='#fff1cf';g.beginPath();g.arc(128,y,62,0,7);g.fill();g.strokeStyle='#e6b362';g.lineWidth=3;g.stroke();for(let i=0;i<16;i++){const a=i*Math.PI/8;g.beginPath();g.moveTo(128+Math.cos(a)*53,y+Math.sin(a)*53);g.lineTo(128+Math.cos(a)*58,y+Math.sin(a)*58);g.stroke();}drawWhale(g,128,y,34,'#ffd692','#284d58');}
 g.save();g.translate(128,475);g.rotate(-Math.PI/2);g.textAlign='center';g.fillStyle='#713e37';g.font='bold 14px Arial';g.fillText('W H A L E  A R C A D E',0,0);g.restore();
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
 const mat=new THREE.MeshStandardMaterial({map,roughness:.57,metalness:.25});
 for(const s of [-1,1]){const top=new THREE.Mesh(new THREE.PlaneGeometry(1.26,14.2),mat);top.rotation.x=-Math.PI/2;top.position.set(s*6.55,2.744,-3);top.receiveShadow=true;scene.add(top);}
 // The rear facade continues into the real playfield, hiding the empty stage.
 const wall=document.createElement('canvas');wall.width=1536;wall.height=1024;const w=wall.getContext('2d');
 const blue=w.createLinearGradient(0,0,0,1024);blue.addColorStop(0,'#2c8a9b');blue.addColorStop(.6,'#216a82');blue.addColorStop(1,'#194c68');w.fillStyle=blue;w.fillRect(0,0,1536,1024);
 // Scalloped tidal marquetry, not a flat recolour. The central chute is kept clear.
 for(const side of [-1,1]){w.save();w.translate(side<0?0:1536,0);w.scale(side<0?1:-1,1);
 w.fillStyle='#ffd399';w.beginPath();w.moveTo(0,0);w.lineTo(280,0);w.bezierCurveTo(110,270,360,400,190,610);w.bezierCurveTo(40,810,310,870,210,1024);w.lineTo(0,1024);w.closePath();w.fill();
 w.strokeStyle='#f4906c';w.lineWidth=7;w.beginPath();w.moveTo(270,0);w.bezierCurveTo(100,270,350,400,180,610);w.bezierCurveTo(30,810,300,870,200,1024);w.stroke();
 w.strokeStyle='#cc795b';w.lineWidth=2;for(let y=30;y<1024;y+=36){w.beginPath();w.arc(45,y,19,Math.PI,0);w.stroke();}
 w.restore();}
 w.strokeStyle='#a6c1ae25';w.lineWidth=2;for(let y=380;y<1024;y+=58){w.beginPath();for(let x=280;x<1256;x+=10)w.lineTo(x,y+Math.sin(x/78)*14);w.stroke();}
 w.save();w.translate(768,650);w.strokeStyle='#c8c6a24d';w.lineWidth=3;for(const r of [172,184,198]){w.beginPath();w.arc(0,0,r,0,7);w.stroke();}for(let i=0;i<32;i++){w.rotate(Math.PI/16);w.beginPath();w.moveTo(0,-187);w.lineTo(0,-198);w.stroke();}w.restore();drawWhale(w,768,650,104,'#b3c9b35c','#1b4356');
 w.fillStyle='#ffe0ad';w.textAlign='center';w.font='18px Georgia';w.fillText('T H E   L U C K Y   W H A L E',768,912);
 const wallTex=new THREE.CanvasTexture(wall);wallTex.colorSpace=THREE.SRGBColorSpace;wallTex.anisotropy=8;
 const rear=new THREE.Mesh(new THREE.PlaneGeometry(13.0,3.0),new THREE.MeshStandardMaterial({map:wallTex,roughness:.75,metalness:.15}));rear.position.set(0,1.8,-6.6);rear.receiveShadow=true;scene.add(rear);
 const brass=new THREE.MeshStandardMaterial({color:'#c9af75',metalness:.68,roughness:.4});
 for(const s of [-1,1])for(let z=-8.8;z<4;z+=2.4){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.04,12),brass);bolt.position.set(s*6.08,2.77,z);scene.add(bolt);}
}
