import * as THREE from 'three';

// 参考 Jeff FX 的分层时序、脱离式射线、错峰圆环与分段电弧，针对 Three.js 台面重写。
// 粒子采用共享实例缓冲；普通碰撞不占联动槽位，也不创建球形塑料网格。
export function createTableEffects(scene,reduced){
 const active=[],particles=[],free=[],counts={},CAP=900,LIMIT=22;
 const palette={grow:'#60eead',hunt:'#ff947b',charge:'#50cfff',produce:'#ffda73',explode:'#ff9c4b',purify:'#b8ffe5',tower:'#ffdf87',echo:'#b7a4ff'};
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),out=t=>1-Math.pow(1-clamp(t),3),expo=t=>1-Math.pow(2,-10*clamp(t));
 const point=p=>new THREE.Vector3(Number(p?.x)||0,(Number(p?.y)||0)+.16,Number(p?.z)||0);
 const quad=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();geometry.index=quad.index;geometry.setAttribute('position',quad.attributes.position);geometry.setAttribute('uv',quad.attributes.uv);
 const specs={aCenter:3,aSize:2,aColor:3,aAxis:3,aAlpha:1,aKind:1},attrs={};for(const[name,size]of Object.entries(specs)){attrs[name]=new THREE.InstancedBufferAttribute(new Float32Array(CAP*size),size).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,attrs[name]);}geometry.instanceCount=0;
 const particleMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,vertexShader:`
  attribute vec3 aCenter,aColor,aAxis;attribute vec2 aSize;attribute float aAlpha,aKind;
  varying vec2 vUv;varying vec3 vColor;varying float vAlpha,vKind;
  void main(){vUv=uv;vColor=aColor;vAlpha=aAlpha;vKind=aKind;vec3 axis=(viewMatrix*vec4(aAxis,0.0)).xyz;float angle=length(axis.xy)>.001?atan(axis.y,axis.x):0.0;float co=cos(angle),si=sin(angle);vec2 p=position.xy*aSize;p=mat2(co,si,-si,co)*p;vec4 view=viewMatrix*vec4(aCenter,1.0);view.xy+=p;gl_Position=projectionMatrix*view;}`,
  fragmentShader:`varying vec2 vUv;varying vec3 vColor;varying float vAlpha,vKind;
  void main(){vec2 p=vUv*2.0-1.0;float r=length(p),a;if(vKind<.5){a=exp(-abs(p.y)*6.0)*pow(max(0.0,1.0-abs(p.x)),.6);}else if(vKind<1.5){a=exp(-r*r*5.0)*(1.0-smoothstep(.4,1.0,r));}else{float star=min(abs(p.x)*.23+abs(p.y),abs(p.x)+abs(p.y)*.23);a=pow(max(0.0,1.0-star*3.2),2.0);}a*=vAlpha;if(a<.008)discard;gl_FragColor=vec4(mix(vColor,vec3(1.0),a*.25),a);}`});
 const particleMesh=new THREE.Mesh(geometry,particleMat);particleMesh.name='台面能量与金属星屑实例池';particleMesh.frustumCulled=false;particleMesh.renderOrder=5;scene.add(particleMesh);
 const plane=new THREE.PlaneGeometry(2,2);
 const ringShader=`varying vec2 vUv;uniform vec3 color;uniform float alpha,width,turn,segmented;
 void main(){vec2 p=vUv*2.0-1.0;float r=length(p),d=abs(r-.84);float a=1.0-smoothstep(width,width+.008,d);a+=exp(-d*48.0)*.08;float angle=atan(p.y,p.x)+turn;a*=mix(1.0,smoothstep(-.3,.1,sin(angle*8.0)),segmented);a*=alpha;if(a<.008)discard;gl_FragColor=vec4(mix(color,vec3(1.0),a*.16),a);}`;
 const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
 function spawn(origin,color,options={}){if(particles.length>=CAP)return;const p=free.pop()||{};Object.assign(p,{origin:origin.clone(),color,age:-(options.delay||0),life:options.life||.35,v:options.v||new THREE.Vector3(),size:options.size||.1,kind:options.kind??2,gravity:options.gravity??-3,drag:options.drag??2.8,axis:options.axis||new THREE.Vector3(1,0,0),ray:options.ray||0,rotation:Math.random()*6.28,alpha:options.alpha??1});particles.push(p);}
 function shower(origin,color,n,speed=2.4,delay=0){if(reduced.matches)n=Math.min(4,n);for(let i=0;i<n;i++){const angle=Math.random()*Math.PI*2,s=speed*(.35+Math.random()*.65),v=new THREE.Vector3(Math.cos(angle)*s,.5+Math.random()*speed,Math.sin(angle)*s);spawn(origin,color,{v,delay:delay+Math.random()*.035,life:.25+Math.random()*.45,size:.06+Math.random()*.11,kind:i%3?0:2,axis:v});}}
 function burst(origin,color,n,radius,delay=0){if(reduced.matches)return;for(let i=0;i<n;i++){const angle=(i+Math.random()*.5)*Math.PI*2/n,d=new THREE.Vector3(Math.cos(angle),.08+Math.random()*.28,Math.sin(angle)).normalize();spawn(origin,i%3?color:new THREE.Color('#fff4d9'),{delay,life:.25+Math.random()*.22,kind:0,size:.028,axis:d,ray:radius*(i%2?.55:1),gravity:0});}}
 function ring(f,origin,color,max,delay=0,life=.65,segmented=false){if(reduced.matches){delay=0;life=.35;max=Math.min(max,1);}const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,toneMapped:false,vertexShader:vertex,fragmentShader:ringShader,uniforms:{color:{value:new THREE.Color(color)},alpha:{value:0},width:{value:.06},turn:{value:0},segmented:{value:segmented?1:0}}}),mesh=new THREE.Mesh(plane,material);mesh.position.copy(origin);mesh.position.y+=.025;mesh.rotation.x=-Math.PI/2;mesh.visible=false;f.group.add(mesh);f.rings.push({mesh,material,max,delay,life,segmented});}
 const ribbonFragment=`varying vec2 vUv;uniform vec3 color;uniform float alpha,head,tail;void main(){float d=abs(vUv.y*2.0-1.0);float core=exp(-d*18.0),halo=exp(-d*3.0)*.24;float gate=smoothstep(tail-.05,tail+.03,vUv.x)*(1.0-smoothstep(head-.04,head+.025,vUv.x));float a=(core+halo)*alpha*gate;if(a<.005)discard;gl_FragColor=vec4(mix(color,vec3(1.0),core*.88),a);}`;
 function ribbon(f,points,color,width=.1){const pos=[],uv=[],idx=[];for(let i=0;i<points.length;i++){const d=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]);const side=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width);if(side.lengthSq()<.00001)side.set(width,0,0);for(const sign of[-1,1]){const p=points[i].clone().addScaledVector(side,sign);pos.push(...p.toArray());uv.push(i/(points.length-1),sign<0?0:1);}if(i){const a=(i-1)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,vertexShader:vertex,fragmentShader:ribbonFragment,uniforms:{color:{value:color},alpha:{value:1},head:{value:0},tail:{value:0}}});const mesh=new THREE.Mesh(geo,mat);f.group.add(mesh);f.ribbons.push({mesh,mat,geo});return mesh;
 }
 function curve(a,b,height=.7){const pts=[];for(let i=0;i<=20;i++){const u=i/20,p=a.clone().lerp(b,u);p.y+=Math.sin(u*Math.PI)*height;pts.push(p);}return pts;}
 function lightning(a,b){let points=[a,b];for(let level=0;level<4;level++){const next=[];for(let i=1;i<points.length;i++){const left=points[i-1],right=points[i],mid=left.clone().lerp(right,.5),span=left.distanceTo(right);mid.x+=(Math.random()-.5)*span*.65;mid.z+=(Math.random()-.5)*span*.65;mid.y+=Math.random()*span*.24;next.push(left,mid);}next.push(b);points=next;}return points;}
 function clearRibbons(f){for(const r of f.ribbons){f.group.remove(r.mesh);r.geo.dispose();r.mat.dispose();}f.ribbons.length=0;}
 function bolt(f){clearRibbons(f);const route=[f.origin,...f.via,f.target];for(let i=1;i<route.length;i++){const pts=lightning(route[i-1],route[i]);ribbon(f,pts,f.color,.13);const branchAt=pts[7],end=branchAt.clone().add(new THREE.Vector3((Math.random()-.5)*.9,.15,(Math.random()-.5)*.9));ribbon(f,lightning(branchAt,end),f.color,.055);}f.flash++;}
 function emit(event={}){
  const type=event.type||'produce';counts[type]=(counts[type]||0)+1;const origin=point(event.from||event.position),target=event.to?point(event.to):origin.clone();
  if(type==='impact'){if(!reduced.matches)for(let i=0;i<2;i++)spawn(origin,new THREE.Color('#e1efff'),{v:new THREE.Vector3((Math.random()-.5)*.6,.7+Math.random()*.6,(Math.random()-.5)*.6),life:.09+Math.random()*.09,size:.07+(event.strength||.3)*.08,kind:2,alpha:.5});return;}
  if(active.length>=LIMIT)return;const color=new THREE.Color(palette[type]||palette.produce),f={type,origin,target,color,via:(Array.isArray(event.via)?event.via:event.via?[event.via]:[]).map(point),group:new THREE.Group(),rings:[],ribbons:[],age:0,flash:0,duration:reduced.matches?.4:type==='grow'?1.2:type==='tower'?1.5:type==='explode'?1.15:.9};f.group.name='联动 · '+type;scene.add(f.group);active.push(f);
  if(type==='charge'){
   ring(f,target,color,1.15,.08,.5,true);if(!reduced.matches)bolt(f);shower(target,color,14,2.6,.08);burst(target,color,10,1.8,.04);
  }else if(type==='grow'){
   if(!reduced.matches)ribbon(f,curve(origin,target,.8),new THREE.Color('#8eeeff'),.1);ring(f,target,color,1.25,.33,.75);ring(f,target,'#e5ffb4',.88,.45,.65,true);shower(target,color,24,1.5,.35);
   if(!reduced.matches)for(let i=0;i<7;i++){const a=i/7*Math.PI*2,top=target.clone().add(new THREE.Vector3(Math.cos(a)*.45,1.2+Math.random()*.3,Math.sin(a)*.45));ribbon(f,curve(target,top,.22),color,.06);}
  }else if(type==='hunt'){
   if(!reduced.matches){ribbon(f,curve(target,origin,.65),color,.15);ribbon(f,curve(target.clone().add(new THREE.Vector3(.15,0,.15)),origin,.8),new THREE.Color('#ffe7c1'),.045);}ring(f,origin,color,.9,.3,.5);burst(origin,color,14,1.4,.32);shower(origin,color,12,1.8,.35);
  }else if(type==='explode'){
   ring(f,origin,'#fff2c7',3.7,.04,.45);ring(f,origin,color,4.6,.13,.72);ring(f,origin,'#ffca6b',2.8,.21,.65,true);burst(origin,color,26,4.2,.04);shower(origin,color,45,5,.07);spawn(origin,new THREE.Color('#fff3c1'),{kind:1,size:reduced.matches?.3:1.7,life:reduced.matches?.2:.15,gravity:0,alpha:reduced.matches?.25:.8});
  }else if(type==='tower'){
   ring(f,origin,color,1.5,0,.8,true);ring(f,origin,'#fff3bf',2,.2,.85);shower(origin,color,32,2.2,.15);if(!reduced.matches)for(let i=0;i<6;i++){const a=i/6*Math.PI*2,start=origin.clone().add(new THREE.Vector3(Math.cos(a),0,Math.sin(a))),end=start.clone().add(new THREE.Vector3(-Math.sin(a)*.5,2.7,Math.cos(a)*.5));ribbon(f,curve(start,end,.1),color,.07);}
  }else{
   ring(f,target,color,type==='purify'?1.8:1.2,0,.75,true);ring(f,target,'#fff5d1',type==='echo'?1.8:.85,.13,.6);shower(target,color,type==='purify'?22:15,2);burst(target,color,10,1.6);
  }
 }
 function update(dt){
  dt=Math.max(0,Math.min(.1,dt));
  for(let i=active.length-1;i>=0;i--){const f=active[i];f.age+=dt;
   for(const r of f.rings){const u=(f.age-r.delay)/r.life;r.mesh.visible=u>=0&&u<1;if(!r.mesh.visible)continue;const t=clamp(u),radius=.18+(r.max-.18)*out(t);r.mesh.scale.setScalar(radius);r.material.uniforms.width.value=.018*(1-t)+.004;r.material.uniforms.alpha.value=(1-clamp((t-.5)/.5))*(reduced.matches?.4:.85);r.material.uniforms.turn.value=t*(r.segmented?1.1:0);}
   if(f.type==='charge'&&!reduced.matches&&f.age<.36&&Math.floor(f.age/.09)>=f.flash)bolt(f);
   for(let j=0;j<f.ribbons.length;j++){const r=f.ribbons[j],u=f.age/f.duration;r.mat.uniforms.head.value=f.type==='charge'?clamp(f.age/.06):clamp((f.age-(f.type==='grow'&&j>0?.33:0))/.35);r.mat.uniforms.tail.value=f.type==='hunt'?clamp((f.age-.15)/.42):f.type==='grow'&&j===0?clamp((f.age-.16)/.3):0;r.mat.uniforms.alpha.value=f.type==='charge'?(f.age<.36?.9:.9*(1-clamp((f.age-.36)/.18))):Math.min(1,(1-u)*1.8);}
   if(f.age>=f.duration){scene.remove(f.group);clearRibbons(f);for(const r of f.rings)r.material.dispose();active.splice(i,1);}
  }
  let n=0;for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){free.push(p);particles[i]=particles[particles.length-1];particles.pop();continue;}if(p.age<0)continue;const t=p.age/p.life,fade=Math.pow(1-t,1.5),v=p.v,k=(1-Math.exp(-p.drag*p.age))/p.drag;let x=p.origin.x+v.x*k,y=p.origin.y+v.y*k+p.gravity*p.age*p.age*.5,z=p.origin.z+v.z*k,sx=p.kind===0?p.size*3:p.size,sy=p.size;
   if(p.ray){const head=.12+p.ray*expo(t),tail=.12+(head-.12)*out(t*.95),mid=(head+tail)*.5;x=p.origin.x+p.axis.x*mid;y=p.origin.y+p.axis.y*mid;z=p.origin.z+p.axis.z*mid;sx=Math.max(.01,head-tail);sy=p.size*(1-t*.8);}else if(p.kind===0)sx=p.size*(2+v.length()*.4)*(1-t*.5);
   attrs.aCenter.setXYZ(n,x,y,z);attrs.aColor.setXYZ(n,p.color.r,p.color.g,p.color.b);attrs.aSize.setXY(n,sx,sy);attrs.aAxis.setXYZ(n,p.axis.x,p.axis.y,p.axis.z);attrs.aAlpha.setX(n,fade*p.alpha);attrs.aKind.setX(n,p.kind);n++;
  }
  geometry.instanceCount=n;particleMesh.visible=n>0;for(const attr of Object.values(attrs))attr.needsUpdate=true;
 }
 return {emit,update,get active(){return active.length;},get counts(){return {...counts};},get metrics(){return {events:active.length,particles:particles.length,particleLimit:CAP,eventLimit:LIMIT};}};
}
