import * as THREE from 'three';

// 金币先作为真实运动学刚体在底舱中装好；旋升结束后才交给动态物理。
export function createCoinTowerLift({scene,RAPIER,coins,spawn,coinHeight,reduced,onPhase,onChange,onComplete}){
 const center={x:0,z:.65},pitch=coinHeight+.012,perCourse=3,ringRadius=.72;
 const root=new THREE.Group();root.name='金币塔机械底阀';root.position.set(center.x,0,center.z);scene.add(root);
 const enamel=new THREE.MeshStandardMaterial({color:'#4c8e8d',roughness:.58,metalness:.25});
 const cream=new THREE.MeshStandardMaterial({color:'#e5e6ce',roughness:.6,metalness:.15});
 const brass=new THREE.MeshStandardMaterial({color:'#d9b36f',roughness:.42,metalness:.5});
 const dark=new THREE.MeshStandardMaterial({color:'#183f49',roughness:.9});
 const light=new THREE.MeshStandardMaterial({color:'#ed9b78',emissive:'#d8794d',emissiveIntensity:.15,roughness:.48});
 function cylinder(radius,height,material,y){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,64),material);mesh.position.y=y;root.add(mesh);mesh.receiveShadow=true;return mesh;}
 // 极薄安装圈与闭合叶片平齐于台面，不改变原有物理底板。
 const well=cylinder(1.53,.015,dark,-.005);
 const flange=new THREE.Mesh(new THREE.TorusGeometry(1.66,.10,8,64),enamel);flange.rotation.x=Math.PI/2;flange.scale.z=.25;flange.position.y=.025;root.add(flange);
 const seam=new THREE.Mesh(new THREE.TorusGeometry(1.77,.025,6,64),brass);seam.rotation.x=Math.PI/2;seam.position.y=.025;root.add(seam);
 const boltGeo=new THREE.CylinderGeometry(.043,.043,.025,8),bolts=new THREE.InstancedMesh(boltGeo,brass,12),matrix=new THREE.Matrix4();
 for(let i=0;i<12;i++){const a=i*Math.PI/6;matrix.makeTranslation(Math.cos(a)*1.66,.056,Math.sin(a)*1.66);bolts.setMatrixAt(i,matrix);}root.add(bolts);
 const blades=[],locks=[];
 const shape=new THREE.Shape();shape.moveTo(-1.45,0);for(let j=0;j<=12;j++){const a=-Math.PI/6+j*Math.PI/36;shape.lineTo(Math.cos(a)*1.51-1.45,Math.sin(a)*1.51);}shape.closePath();
 const bladeGeo=new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.006,bevelSize:.008,bevelSegments:1,steps:1});
 for(let i=0;i<6;i++){
  const carrier=new THREE.Group();carrier.rotation.y=i*Math.PI/3;root.add(carrier);
  const hinge=new THREE.Group();hinge.position.set(1.45,-.002,0);carrier.add(hinge);
  const leaf=new THREE.Mesh(bladeGeo,i%2?enamel:cream);leaf.rotation.x=-Math.PI/2;hinge.add(leaf);leaf.receiveShadow=true;blades.push(hinge);
  const lock=new THREE.Mesh(new THREE.BoxGeometry(.24,.055,.095),brass);lock.position.set(1.5,.045,0);carrier.add(lock);locks.push(lock);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),light);lamp.scale.y=.45;lamp.position.set(1.84,.045,0);carrier.add(lamp);
  const tooth=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,.10),brass);tooth.position.set(1.82,.025,0);carrier.add(tooth);
 }
 const platform=cylinder(1.38,.08,brass,-1);platform.castShadow=true;
 const plate=cylinder(1.25,.012,enamel,-1);plate.castShadow=true;
 let jobs=[],serial=0,lastPhase='idle',last={phase:'idle',gate:0,lift:0,angle:0,base:-1};
 const smooth=x=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
 function timing(job){const speed=reduced.matches?.06:1;return {unlock:.22*speed,open:.56*speed,rise:(2.65+Math.ceil(job.count/perCourse)*.035)*speed,seat:.26*speed,close:.62*speed};}
 function frame(job){
  const t=timing(job),a=job.age,opening=t.unlock+t.open,riseEnd=opening+t.rise,releaseAt=riseEnd+t.seat,total=releaseAt+t.close;
  const phase=a<t.unlock?'unlocking':a<opening?'opening':a<riseEnd?'rising':a<releaseAt?'seating':a<total?'closing':'complete';
  const lift=smooth((a-opening)/t.rise),gate=a<opening?smooth((a-t.unlock)/t.open):a<releaseAt?1:1-smooth((a-releaseAt)/t.close);
  const angle=reduced.matches?0:Math.PI*2*1.25*lift,courses=Math.ceil(job.count/perCourse),height=(courses-1)*pitch+coinHeight;
  const base=coinHeight/2+.025-(height+.22)*(1-lift);
  return {phase,gate,lift,angle,base,release:a>=releaseAt,done:a>=total,total,progress:Math.min(1,a/total),courses};
 }
 function pose(slot,f){const course=Math.floor(slot/perCourse),yaw=f.angle+(course%2)*Math.PI/3,a=slot%perCourse*Math.PI*2/3+yaw;return {p:{x:center.x+Math.cos(a)*ringRadius,y:f.base+course*pitch,z:center.z+Math.sin(a)*ringRadius},q:{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}};}
 function paint(f){
  last=f;const unlocked=f.phase==='unlocking'?smooth(jobs[0]?.age/Math.max(.001,timing(jobs[0]).unlock)):f.phase==='idle'?0:f.phase==='closing'?f.gate:1;
  blades.forEach(hinge=>{hinge.rotation.y=-f.gate*1.38;hinge.position.x=1.45+f.gate*.24;});
  locks.forEach(lock=>lock.position.x=1.5+unlocked*.28);
  const retract=f.phase==='closing'?(1-f.gate)*.8:0;platform.position.y=f.base-coinHeight/2-.04-retract;plate.position.y=platform.position.y+.047;platform.rotation.y=plate.rotation.y=f.angle;
  light.emissiveIntensity=f.phase==='idle'?.05:.3+f.lift*.35;well.visible=true;
 }
 function release(job,f){
  for(const c of job.members){const v=pose(c.lift.slot,f);c.body.setTranslation(v.p,true);c.body.setRotation(v.q,true);c.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);c.body.setLinvel({x:0,y:0,z:0},true);c.body.setAngvel({x:0,y:0,z:0},true);c.body.enableCcd(true);c.ccd=true;c.state='field';c.prevY=v.p.y;c.pv={x:0,y:0,z:0};delete c.lift;}
  job.released=true;job.members=[];onChange?.();
 }
 function transition(phase,job){if(phase===lastPhase)return;lastPhase=phase;if(phase!=='idle'&&phase!=='complete')onPhase?.(phase,timing(job).rise);}
 function begin(count){
  if(!count)return 0;
  const job={id:++serial,age:0,count,released:false,members:[]},f=frame({count,age:0});
  for(let i=0;i<count;i++){const v=pose(i,f),c=spawn('coin',v.p.x,v.p.y,v.p.z,v.q);if(!c)break;c.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);c.state='tower';c.lift={batch:job.id,slot:i};job.members.push(c);}
  job.count=job.members.length;if(!job.count)return 0;jobs.push(job);if(jobs.length===1){paint(frame(job));}return job.count;
 }
 function step(dt){
  const job=jobs[0];if(!job)return;
  job.age+=dt;const f=frame(job);transition(f.phase,job);paint(f);
  if(!job.released){for(const c of job.members){const v=pose(c.lift.slot,f);c.body.setNextKinematicTranslation(v.p);c.body.setNextKinematicRotation(v.q);}if(f.release)release(job,f);}
  if(f.done){jobs.shift();onComplete?.(job.count);lastPhase='idle';paint({phase:'idle',gate:0,lift:0,angle:0,base:-1});onChange?.();}
 }
 function serialize(){return {serial,jobs:jobs.map(({id,age,count,released})=>({id,age,count,released}))};}
 function restore(data){
  jobs=[];serial=Number.isSafeInteger(data?.serial)?Math.max(0,data.serial):0;
  for(const raw of Array.isArray(data?.jobs)?data.jobs.slice(0,8):[]){
   if(!Number.isSafeInteger(raw.id)||!Number.isFinite(raw.age)||raw.age<0||!Number.isInteger(raw.count)||raw.count<1||raw.count>84)continue;
   const job={id:raw.id,age:raw.age,count:raw.count,released:raw.released===true,members:coins.filter(c=>c.lift?.batch===raw.id)};
   if(!job.released&&!job.members.length)continue;
   if(!job.released){job.count=job.members.length;for(const c of job.members){c.state='tower';c.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);}}
   jobs.push(job);serial=Math.max(serial,job.id);
  }
  // 中断或旧存档缺少完整演出记录时，将已经支付的金币安放到安全终点。
  const active=new Set(jobs.filter(j=>!j.released).map(j=>j.id));
  for(const c of coins)if(c.lift&&!active.has(c.lift.batch)){const v=pose(c.lift.slot,{base:coinHeight/2+.025,angle:0});c.body.setTranslation(v.p,true);c.body.setRotation(v.q,true);c.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);c.state='field';c.prevY=v.p.y;delete c.lift;}
  if(jobs.length){paint(frame(jobs[0]));lastPhase=frame(jobs[0]).phase;}else paint({phase:'idle',gate:0,lift:0,angle:0,base:-1});
 }
 paint({phase:'idle',gate:0,lift:0,angle:0,base:-1});
 return {begin,step,serialize,restore,get active(){return jobs.length>0;},get caption(){const f=last;if(!jobs.length)return '';return {unlocking:'底阀解锁 · 小惊喜就要来了',opening:'机械叶片展开 · 准备升塔',rising:`金币塔旋升 · ${Math.min(f.courses,Math.ceil(f.lift*f.courses))} / ${f.courses} 层`,seating:'金币塔就位 · 托盘锁定',closing:'底阀归位 · 接下来，推倒它！'}[f.phase]||'';},get snapshot(){const job=jobs[0];return {active:jobs.length>0,phase:job?last.phase:'idle',age:job?.age||0,gate:last.gate,lift:last.lift,angle:last.angle,base:last.base,count:job?.count||0,courses:job?Math.ceil(job.count/perCourse):0,queued:jobs.length,staged:coins.filter(c=>c.state==='tower').length,position:{...center}};}};
}
