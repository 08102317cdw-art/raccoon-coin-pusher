import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import artwork from './art/lcd-art.js';
import { drawWhaleSeal } from './brand.js';
// The score is an emissive texture on a real rear-mounted LCD, not a HUD card.
export async function createCabinetDisplay(scene){
 const group=new THREE.Group();scene.add(group);group.position.set(0,5.45,-6.9);group.rotation.x=-.61;group.scale.set(1.34,1.75,1);
 const img=new Image();img.src=artwork;await img.decode();
 const W=1200,H=740,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const metal=new THREE.MeshStandardMaterial({color:'#274e65',metalness:.72,roughness:.32});
 const brass=new THREE.MeshStandardMaterial({color:'#c2a56b',metalness:.76,roughness:.3});
 const rear=new THREE.Mesh(new RoundedBoxGeometry(9.7,4.5,.35,3,.3),metal);group.add(rear);rear.castShadow=true;
 const trim=new THREE.Mesh(new RoundedBoxGeometry(9.36,4.15,.12,3,.24),brass);trim.position.z=.22;group.add(trim);
 const inset=new THREE.Mesh(new RoundedBoxGeometry(9.13,3.96,.1,3,.2),new THREE.MeshStandardMaterial({color:'#071b2a',roughness:.28,metalness:.35}));inset.position.z=.3;group.add(inset);
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(8.92,3.9),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));screen.position.z=.363;group.add(screen);
 // Protective glass glints are thin perimeter pieces, never a haze over digits.
 const edgeMat=new THREE.MeshBasicMaterial({color:'#9df5df',transparent:true,opacity:.38,toneMapped:false});
 const edge=new THREE.Mesh(new THREE.BoxGeometry(8.8,.025,.02),edgeMat);edge.position.set(0,1.91,.39);group.add(edge);
 const screwMat=new THREE.MeshStandardMaterial({color:'#c7bea0',metalness:.8,roughness:.3});
 for(const x of[-4.65,4.65])for(const y of[-1.98,1.98]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.018,12),screwMat);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.31);group.add(screw);}
 const lamp=new THREE.PointLight('#61dfc5',5,12,2);lamp.position.set(0,4.7,-4.8);scene.add(lamp);
 let signature='',snapshot={};
 const text=(str,x,y,size,color='#dcfff0',weight='600',align='left')=>{const wide=group.scale.y<1.4;g.save();g.translate(x,y);g.scale(wide?.66:1,1);g.fillStyle=color;g.font=`${weight} ${size*(wide?1.12:1)}px "Noto Sans SC","Microsoft YaHei",Arial,sans-serif`;g.textAlign=align;g.fillText(String(str),0,0);g.restore();};
 const rect=(x,y,w,h,r,fill)=>{g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();};
 function update(v){
  snapshot={...v};const sig=JSON.stringify(v)+group.scale.y;if(sig===signature)return;signature=sig;
  g.clearRect(0,0,W,H);g.drawImage(img,0,0,W,H);
  const shade=g.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#052c3f44');shade.addColorStop(1,'#031a2d99');g.fillStyle=shade;g.fillRect(0,0,W,H);
  drawWhaleSeal(g,50,24,100);text('大肥鱼',170,96,65,'#ffe1a2','900');
  text(v.round,1134,93,52,'#ddfff0','700','right');
  g.strokeStyle='#9debd344';g.lineWidth=2;g.beginPath();g.moveTo(60,130);g.lineTo(1140,130);g.stroke();
  const reached=v.score>=v.target;
  text(reached?'目标达成！':v.phase==='settling'?'等待最后落币':'好运海湾 · 当前航路',600,201,60,reached?'#ffdd7e':'#a7f5dd','700','center');
  text('当前分数',70,286,60,'#b8e8dc');
  const score=Number(v.score).toLocaleString(),size=score.length>8?110:158;
  text(score,70,438,size,'#fff0c0','900');
  text('目标',1130,286,60,'#b8e8dc','500','right');text(Number(v.target).toLocaleString(),1130,425,108,'#b7ffe4','800','right');
  rect(70,470,1060,20,9,'#031d2dbb');const progress=Math.min(1,v.score/Math.max(1,v.target));if(progress)rect(70,470,1060*progress,20,9,reached?'#ffdc7b':'#72e3be');
  const values=[['可投',v.shots],['贝壳',v.cash],['倍率','×'+v.multiplier],['连击',v.energy]];
  values.forEach(([label,value],i)=>{const x=70+i*282;text(label,x,558,60,'#9bd5cf','500');text(value,x,630,65,i===0?'#ffe4a4':'#d3fff1','800');});
  const caption=v.caption||(v.formula?v.formula:v.latest||'让好运慢慢堆起来。');
  text(caption.length>18?caption.slice(0,17)+'…':caption,600,713,58,v.caption?'#ffe3a7':'#91cbc7','500','center');
  texture.needsUpdate=true;lamp.color.set(reached?'#ffd17c':'#61dfc5');lamp.intensity=reached?6:4;
 }
 return {group,screen,update,get snapshot(){return snapshot;},corners(){group.updateWorldMatrix(true,true);return[[-4.46,1.95,.37],[4.46,1.95,.37],[4.46,-1.95,.37],[-4.46,-1.95,.37]].map(p=>group.localToWorld(new THREE.Vector3(...p)));},scorePoint(){return group.localToWorld(new THREE.Vector3(-2.8,-.15,.4));},detailPoint(){return group.localToWorld(new THREE.Vector3(1.2,-1.0,.4));}};
}
