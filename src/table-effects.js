import * as THREE from 'three';

// 联动使用真实台面坐标，所有几何和并发数量都有上限。
export function createTableEffects(scene, reduced) {
  const active=[],counts={};
  const ringGeo=new THREE.RingGeometry(.75,1,48),dotGeo=new THREE.SphereGeometry(.11,7,5),leafGeo=new THREE.SphereGeometry(.2,9,6),diskGeo=new THREE.CylinderGeometry(.5,.5,.12,20);
  const palette={grow:'#8de0a2',hunt:'#efb4ac',charge:'#8eeaff',produce:'#ffe3a0',explode:'#ffac6c',purify:'#c5f6dc',tower:'#ffe09b',echo:'#c2b7f4'};
  function emit(event={}) {
    const type=event.type||'produce';counts[type]=(counts[type]||0)+1;if(active.length>=28)return;
    const from=(type==='grow'?event.to:null)||event.from||event.position||{x:0,y:1,z:1},to=event.to||from;
    const origin=new THREE.Vector3(from.x||0,(from.y||0)+.2,from.z||0),target=new THREE.Vector3(to.x||0,(to.y||0)+.2,to.z||0),group=new THREE.Group(),materials=[],geometries=[];
    const color=palette[type]||palette.produce;
    const mat=(c=color,opacity=1)=>{const m=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});materials.push(m);return m;};
    const ring=new THREE.Mesh(ringGeo,mat(color,.8));ring.rotation.x=-Math.PI/2;ring.position.copy(origin);group.add(ring);const parts=[];
    if(!reduced.matches&&type==='charge') {
      const pts=[];for(let i=0;i<=9;i++){const p=origin.clone().lerp(target,i/9);if(i>0&&i<9){p.x+=(i%2?1:-1)*.12;p.y+=.1+Math.random()*.15;}pts.push(p);}
      const geo=new THREE.BufferGeometry().setFromPoints(pts);geometries.push(geo);const m=new THREE.LineBasicMaterial({color,transparent:true,depthWrite:false,toneMapped:false});materials.push(m);group.add(new THREE.Line(geo,m));
    } else if(!reduced.matches&&type==='grow') {
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,1,6),mat('#7fc78d'));geometries.push(stem.geometry);stem.position.copy(origin);stem.position.y+=.4;group.add(stem);parts.push(stem);
      for(let i=0;i<4;i++){const leaf=new THREE.Mesh(leafGeo,mat(i%2?'#b8e994':'#62bc88'));leaf.position.copy(origin).add(new THREE.Vector3((i%2?1:-1)*.25,.45+i*.12,0));leaf.scale.set(1.7,.45,1);group.add(leaf);parts.push(leaf);}
    } else if(!reduced.matches&&(type==='hunt'||type==='echo')) {
      const ghost=new THREE.Mesh(diskGeo,mat(event.color||color));ghost.position.copy(target);group.add(ghost);parts.push(ghost);
    } else if(!reduced.matches) {
      const n=type==='explode'?14:type==='tower'?10:7;for(let i=0;i<n;i++){const dot=new THREE.Mesh(dotGeo,mat(i%2?'#fff3ce':color));dot.userData.angle=i/n*Math.PI*2;group.add(dot);parts.push(dot);}
    }
    scene.add(group);active.push({type,group,ring,parts,origin,target,materials,geometries,age:0,duration:reduced.matches?.22:type==='grow'?1.15:type==='tower'?1.4:type==='charge'?.38:.72});
  }
  function update(dt) {
    for(let i=active.length-1;i>=0;i--){const f=active[i];f.age+=dt;const u=Math.min(1,f.age/f.duration),ease=1-Math.pow(1-u,3);
      f.ring.scale.setScalar(f.type==='explode'?.35+ease*4.8:f.type==='tower'?.4+ease*2.2:.25+ease*1.35);for(const m of f.materials)m.opacity=(1-u)*.9;
      if(f.type==='grow')for(const p of f.parts){p.visible=u>.06;p.scale.y=Math.max(.01,Math.min(p.geometry===leafGeo?.45:1,u*3));}
      else if(f.type==='hunt'||f.type==='echo'){const ghost=f.parts[0];if(ghost){ghost.position.copy(f.target).lerp(f.origin,ease);ghost.position.y+=Math.sin(u*Math.PI)*1.1;ghost.scale.setScalar(1-u*.8);}}
      else for(const p of f.parts){const a=p.userData.angle,r=f.type==='explode'?ease*4:ease*1.3;p.position.copy(f.origin).add(new THREE.Vector3(Math.cos(a)*r,Math.sin(u*Math.PI)*(f.type==='tower'?2.7:.7),Math.sin(a)*r));p.scale.setScalar(1-u*.6);}
      if(u>=1){scene.remove(f.group);f.materials.forEach(m=>m.dispose());f.geometries.forEach(g=>g.dispose());active.splice(i,1);}
    }
  }
  return {emit,update,get active(){return active.length;},get counts(){return {...counts};}};
}
