import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// 奶油色卡通计分屏仍安装在原机台位置，几何与投影热区保持原尺寸。
export async function createCabinetDisplay(scene){
 const group=new THREE.Group();group.name='漂流俱乐部计分屏';scene.add(group);group.position.set(0,5.45,-6.9);group.rotation.x=-.61;group.scale.set(1.34,1.75,1);
 const W=1200,H=740,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const shell=new THREE.MeshStandardMaterial({color:'#376570',metalness:.12,roughness:.55});
 const trimMat=new THREE.MeshStandardMaterial({color:'#e99980',metalness:.1,roughness:.53});
 const rear=new THREE.Mesh(new RoundedBoxGeometry(9.7,4.5,.35,3,.3),shell);group.add(rear);rear.castShadow=true;
 const trim=new THREE.Mesh(new RoundedBoxGeometry(9.36,4.15,.12,3,.24),trimMat);trim.position.z=.22;group.add(trim);
 const inset=new THREE.Mesh(new RoundedBoxGeometry(9.13,3.96,.1,3,.2),new THREE.MeshStandardMaterial({color:'#365e64',roughness:.58,metalness:.1}));inset.position.z=.3;group.add(inset);
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(8.92,3.9),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));screen.position.z=.363;group.add(screen);
 const edge=new THREE.Mesh(new THREE.BoxGeometry(8.8,.025,.02),new THREE.MeshBasicMaterial({color:'#fff7d9',transparent:true,opacity:.65,toneMapped:false}));edge.position.set(0,1.91,.39);group.add(edge);
 const screwMat=new THREE.MeshStandardMaterial({color:'#e6b766',metalness:.35,roughness:.5});
 for(const x of[-4.65,4.65])for(const y of[-1.98,1.98]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.018,12),screwMat);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.31);group.add(screw);}
 const lamp=new THREE.PointLight('#ffe3a1',1.2,10,2);lamp.position.set(0,4.7,-4.8);scene.add(lamp);
 let signature='',snapshot={};
 const ink='#244b57',soft='#62888a',cream='#fff8e5',mint='#dcefe5',coral='#ed8d79';
 function text(str,x,y,size,color=ink,weight='700',align='left',maxWidth=1100){
  g.save();g.fillStyle=color;g.textAlign=align;g.textBaseline='alphabetic';
  const font=()=>`${weight} ${size}px "Arial Rounded MT Bold","Microsoft YaHei","PingFang SC",sans-serif`;g.font=font();
  while(g.measureText(String(str)).width>maxWidth&&size>20){size-=2;g.font=font();}g.fillText(String(str),x,y);g.restore();
 }
 function rect(x,y,w,h,r,fill,stroke){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=4;g.stroke();}}
 function whale(x,y,s,color='#66b9b0'){
  g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=color;g.strokeStyle=ink;g.lineWidth=3;g.lineJoin='round';
  g.beginPath();g.ellipse(0,0,42,26,0,0,Math.PI*2);g.moveTo(32,-1);g.quadraticCurveTo(52,-30,67,-22);g.quadraticCurveTo(62,-3,39,9);g.fill();g.stroke();
  g.fillStyle='#fff2ce';g.beginPath();g.ellipse(-10,9,23,10,.1,0,7);g.fill();g.strokeStyle=ink;g.lineWidth=3;g.beginPath();g.arc(-22,-4,4,Math.PI,Math.PI*2);g.stroke();g.beginPath();g.arc(-16,3,9,.2,1.4);g.stroke();
  g.strokeStyle='#64b6bd';g.beginPath();g.moveTo(-5,-27);g.quadraticCurveTo(-18,-50,-28,-36);g.moveTo(-5,-27);g.quadraticCurveTo(2,-53,15,-42);g.stroke();g.restore();
 }
 function star(x,y,r,color){g.fillStyle=color;g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,k=i%2?.45:1;g.lineTo(x+Math.cos(a)*r*k,y+Math.sin(a)*r*k);}g.closePath();g.fill();}
 function update(v){
  snapshot={...v};const sig=JSON.stringify(v)+group.scale.y;if(sig===signature)return;signature=sig;
  g.fillStyle=cream;g.fillRect(0,0,W,H);
  // 边缘纸屑与海浪只负责装饰，文字区保持平整高对比。
  for(let i=0;i<16;i++){g.fillStyle=i%2?'#f0d796':'#a6d6c7';g.beginPath();g.arc(24+(i%8)*164,i<8?18:723,4+i%3,0,7);g.fill();}
  rect(28,28,1144,108,30,'#f7b59b');whale(100,88,.75);text('漂流推币俱乐部',175,100,55,ink,'900','left',680);
  rect(906,46,238,69,28,'#fff4d7');text(v.round,1025,94,43,ink,'900','center',205);
  const reached=v.score>=v.target,status=reached?'太棒啦，满载靠岸！':v.phase==='settling'?'等一等，还有金币在路上':'海风正好，好运慢慢堆';
  text(status,600,207,40,reached?'#bc6555':soft,'700','center',1060);
  text('这一船的好运',72,277,49,ink,'900');
  const score=Number(v.score).toLocaleString();text(score,65,433,score.length>8?124:178,reached?'#cf735b':ink,'900','left',670);
  rect(782,245,354,184,32,'#deefec','#a8c9bd');text('靠岸目标',959,302,39,soft,'800','center',300);text(Number(v.target).toLocaleString(),959,394,96,ink,'900','center',300);
  rect(70,465,1060,28,14,'#e6ddc1');const progress=Math.min(1,v.score/Math.max(1,v.target));if(progress)rect(70,465,Math.max(28,1060*progress),28,14,reached?coral:'#69bfa8');
  star(1121,478,17,'#edb95a');
  const values=[['还可以投',v.shots,'#f8dfa0'],['小贝壳',v.cash,'#f9d8c3'],['得分倍率','×'+v.multiplier,'#d8ece6'],['轮盘蓄能',v.energy,'#dbe9f1']];
  values.forEach(([label,value,color],i)=>{const x=58+i*280;rect(x,530,250,120,24,color);text(label,x+125,573,35,ink,'700','center',224);text(value,x+125,632,57,ink,'900','center',225);});
  const caption=v.caption||v.formula||v.latest||'风很轻，好运也会慢慢来。';text(caption,600,708,36,v.caption?'#bc6555':soft,'700','center',1080);
  texture.needsUpdate=true;lamp.color.set(reached?'#ffc983':'#fff0c1');lamp.intensity=reached?1.7:1.1;
 }
 return {group,screen,update,get snapshot(){return snapshot;},corners(){group.updateWorldMatrix(true,true);return[[-4.46,1.95,.37],[4.46,1.95,.37],[4.46,-1.95,.37],[-4.46,-1.95,.37]].map(p=>group.localToWorld(new THREE.Vector3(...p)));},scorePoint(){return group.localToWorld(new THREE.Vector3(-2.8,-.15,.4));},detailPoint(){return group.localToWorld(new THREE.Vector3(1.2,-1.0,.4));}};
}
