import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// Small manufactured details: no colliders and no changes to the game rules.
export function dressCabinet(scene,backboard,HALF_W,WALL_Z){
 const brass=new THREE.MeshStandardMaterial({color:'#cfb47d',metalness:.78,roughness:.3});
 const enamel=new THREE.MeshStandardMaterial({color:'#18495d',metalness:.4,roughness:.35});
 const steel=new THREE.MeshStandardMaterial({color:'#cee3d7',metalness:.82,roughness:.27});
 const batches=new Map([[scene,new Map()],[backboard,new Map()]]);
 function collect(parent,geo,x,y,z,mat){geo.translate(x,y,z);const list=batches.get(parent);if(!list.has(mat))list.set(mat,[]);list.get(mat).push(geo);}
 const add=(parent,w,h,d,x,y,z,mat)=>collect(parent,new THREE.BoxGeometry(w,h,d),x,y,z,mat);
 const screwGeo=new THREE.CylinderGeometry(.047,.047,.025,12);
 function screw(parent,x,y,z){collect(parent,screwGeo.clone(),x,y,z,steel);add(parent,.055,.007,.009,x,y+.015,z,enamel);}
 for(const s of [-1,1]){
  // Inlaid double rail with a dark service seam and regularly spaced recessed screws.
  const x=s*(HALF_W+1.55);add(scene,.085,.018,14.1,x-s*.44,2.74,-3,brass);add(scene,.028,.018,14.1,x+s*.36,2.74,-3,steel);
  for(let i=0;i<6;i++)screw(scene,x+s*.43,2.75,-9.4+i*2.55);
  add(scene,.055,5.9,.055,x+s*.66,-.6,3.92,brass);
  // Recessed speaker grilles are mounted on the desktop backboard.
  add(backboard,.52,3.7,.07,s*4.39,5.5,WALL_Z+.045,enamel);
  for(let i=0;i<15;i++)add(backboard,.34,.035,.025,s*4.39,3.88+i*.23,WALL_Z+.09,steel);
 }
 // Split escutcheon below the screen, a maker's plate and two brass corner seams.
 add(backboard,7.9,.035,.06,0,3.19,WALL_Z+.05,brass);add(backboard,2.4,.28,.07,0,2.93,WALL_Z+.05,enamel);
 add(backboard,8.2,.035,.06,0,9.03,WALL_Z+.05,brass);
 for(const [parent,mats]of batches)for(const [material,geos]of mats){parent.add(new THREE.Mesh(mergeGeometries(geos),material));for(const geo of geos)geo.dispose();}screwGeo.dispose();
}
