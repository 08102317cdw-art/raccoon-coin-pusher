import * as THREE from 'three';

// 弧肩船舱是真实挤出几何；沿用安装坐标与取景包络，手机台面保持大小。
export async function createCabinetDisplay(scene){
 const group=new THREE.Group();group.name='鲸鱼号嘉年华驾驶舱';scene.add(group);group.position.set(0,5.45,-6.9);group.rotation.x=-.61;group.scale.set(1.34,1.75,1);
 const W=1200,H=740,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 function outline(w,h){const s=new THREE.Shape();s.moveTo(-w,-h*.65);s.quadraticCurveTo(-w,-h,-w*.8,-h);s.lineTo(w*.8,-h);s.quadraticCurveTo(w,-h,w,-h*.65);s.lineTo(w,h*.36);s.bezierCurveTo(w,h*.82,w*.79,h*.94,w*.59,h*.94);s.quadraticCurveTo(0,h*1.08,-w*.59,h*.94);s.bezierCurveTo(-w*.79,h*.94,-w,h*.82,-w,h*.36);s.closePath();return s;}
 function plate(w,h,z,depth,color,metalness=.15){const m=new THREE.Mesh(new THREE.ExtrudeGeometry(outline(w,h),{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.045,bevelThickness:.04,curveSegments:16}),new THREE.MeshStandardMaterial({color,metalness,roughness:.4}));m.position.z=z;m.castShadow=true;group.add(m);return m;}
 plate(4.85,2.20,-.15,.34,'#173e57');plate(4.68,2.08,.22,.09,'#f4795f');plate(4.53,1.97,.34,.05,'#fff0c6');
 const screenGeometry=new THREE.ShapeGeometry(outline(4.46,1.91),24),uv=screenGeometry.attributes.uv,pos=screenGeometry.attributes.position;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+4.46)/8.92,(pos.getY(i)+1.95)/3.9);
 const screen=new THREE.Mesh(screenGeometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));screen.position.z=.449;group.add(screen);
 // 两侧的珊瑚鳍与舷窗螺帽打破大矩形轮廓。
 const fin=new THREE.Shape();fin.moveTo(0,-.5);fin.bezierCurveTo(.5,-.38,.62,.18,.48,.72);fin.quadraticCurveTo(.17,.26,0,.2);fin.closePath();
 for(const side of[-1,1]){const m=new THREE.Mesh(new THREE.ExtrudeGeometry(fin,{depth:.12,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:3}),new THREE.MeshStandardMaterial({color:'#f5b83f',metalness:.28,roughness:.37}));m.position.set(side*4.68,.3,.1);m.scale.x=side;group.add(m);
  for(const y of[-1.6,.9]){const cap=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),new THREE.MeshStandardMaterial({color:'#fff0c6',metalness:.65,roughness:.27}));cap.position.set(side*4.63,y,.4);cap.scale.z=.42;group.add(cap);}}
 const lamp=new THREE.PointLight('#ffe1a0',1.1,10,2);lamp.position.set(0,4.7,-4.8);scene.add(lamp);
 let signature='',snapshot={};const ink='#173e57',muted='#a7d7df',cream='#fff1cb',coral='#ff9277';
 function text(str,x,y,size,color=cream,weight='800',align='left',maxWidth=1100){g.save();g.fillStyle=color;g.textAlign=align;g.textBaseline='alphabetic';const font=()=>`${weight} ${size}px "Arial Rounded MT Bold","Microsoft YaHei","PingFang SC",sans-serif`;g.font=font();while(g.measureText(String(str)).width>maxWidth&&size>20){size-=2;g.font=font();}g.fillText(String(str),x,y);g.restore();}
 function rect(x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
 function circle(x,y,r,fill,stroke,width=4){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
 function whale(x,y){g.save();g.translate(x,y);g.fillStyle=cream;g.beginPath();g.moveTo(-40,-4);g.bezierCurveTo(-42,-38,19,-42,27,-7);g.quadraticCurveTo(42,-4,46,-27);g.quadraticCurveTo(54,-13,46,-3);g.quadraticCurveTo(67,-10,64,-26);g.bezierCurveTo(89,5,35,37,-7,27);g.quadraticCurveTo(-35,24,-40,-4);g.fill();circle(-21,-5,3,ink);g.strokeStyle=ink;g.lineWidth=3;g.beginPath();g.arc(-20,1,10,.1,1.6);g.stroke();g.strokeStyle=cream;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(-4,-39);g.quadraticCurveTo(-12,-61,-23,-51);g.moveTo(-4,-39);g.quadraticCurveTo(7,-62,16,-49);g.stroke();g.restore();}
 function star(x,y,r,color){g.fillStyle=color;g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,k=i%2?.25:1;g.lineTo(x+Math.cos(a)*r*k,y+Math.sin(a)*r*k);}g.closePath();g.fill();}
 function update(v){snapshot={...v};const sig=JSON.stringify(v)+group.scale.y;if(sig===signature)return;signature=sig;
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#125166');bg.addColorStop(1,'#13374e');g.fillStyle=bg;g.fillRect(0,0,W,H);
  // 标题区使用小徽章与纯色留白；不在数字、状态和标签后方叠加纹样。
  circle(144,94,50,'#ee896d');g.save();g.translate(141,99);g.scale(.62,.62);whale(0,0);g.restore();
  text('大肥鱼推币机',228,100,53,cream,'900','left',760);text('好 运 开 船 · 快 乐 靠 岸',231,145,26,muted,'700','left',790);
  const reached=v.score>=v.target;const status=reached?'满载靠岸！':v.phase==='settling'?'还有好运在路上…':'叮！今天也要满载而归';
  text(status,79,207,37,reached?'#ffd77e':muted,'700','left',700);text(v.round,1108,207,37,cream,'800','right',310);
  text('本船收获',82,270,32,muted,'800');const score=Number(v.score).toLocaleString();text(score,73,426,score.length>8?118:175,reached?'#ffd77e':'#ffffff','900','left',668);
  g.save();g.translate(946,337);g.rotate(.045);rect(-166,-105,332,206,22,'#ffdc7e');for(const y of[-105,101])circle(0,y,10,'#19485c');g.strokeStyle='#b58742';g.lineWidth=2;g.setLineDash([7,7]);g.beginPath();g.moveTo(-140,-34);g.lineTo(140,-34);g.stroke();g.setLineDash([]);text('靠 岸 目 标',0,-55,32,ink,'800','center',287);text(Number(v.target).toLocaleString(),0,57,91,ink,'900','center',294);g.restore();
  rect(82,457,1036,22,11,'#0b2f43');const progress=Math.min(1,v.score/Math.max(1,v.target));if(progress)rect(82,457,Math.max(22,1036*progress),22,11,reached?'#ffcc69':'#55d5c0');star(1113,467,14,'#ffdf93');
  const values=[['可投次数',v.shots,'#80d9e6'],['小贝壳',v.cash,'#ffc3a0'],['得分倍率','×'+v.multiplier,'#96e3bf'],['轮盘蓄能',v.energy,'#ffda79']];
  values.forEach(([label,value,color],i)=>{const x=170+i*286;circle(x,574,69,'#0b2f43',color,5);g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.arc(x,574,60,-2.7,.5);g.stroke();text(value,x,591,52,cream,'900','center',112);text(label,x,680,31,color,'800','center',248);});
  const caption=v.caption||v.formula||v.latest||'海风正好，好运开船';text(caption,600,716,24,v.caption?coral:muted,'700','center',984);
  texture.needsUpdate=true;lamp.color.set(reached?'#ffcb7e':'#fff0c1');lamp.intensity=reached?1.5:1.1;
 }
 return {group,screen,update,get snapshot(){return snapshot;},corners(){group.updateWorldMatrix(true,true);return[[-4.46,1.95,.37],[4.46,1.95,.37],[4.46,-1.95,.37],[-4.46,-1.95,.37]].map(p=>group.localToWorld(new THREE.Vector3(...p)));},scorePoint(){return group.localToWorld(new THREE.Vector3(-2.8,-.15,.4));},detailPoint(){return group.localToWorld(new THREE.Vector3(1.2,-1.0,.4));}};
}
