import * as THREE from 'three';
// Responsive metalwork joins the fixed collector to the lowered control deck.
// Presentation only: no scaled coin field, altered colliders or floating controls.
export function createCabinetExtension(scene){
 const root=new THREE.Group();root.name='Adaptive cabinet apron';scene.add(root);
 const enamel=new THREE.MeshStandardMaterial({color:'#163c50',metalness:.52,roughness:.41});
 const trim=new THREE.MeshStandardMaterial({color:'#b3a17a',metalness:.72,roughness:.31});
 const edge=new THREE.MeshStandardMaterial({color:'#406779',metalness:.7,roughness:.35});
 const panel=new THREE.Mesh(new THREE.BufferGeometry(),enamel);panel.castShadow=panel.receiveShadow=true;root.add(panel);
 const links=[];
 function beam(material,r=.065){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,10),material);root.add(m);links.push(m);return m;}
 const left=beam(edge,.1),right=beam(edge,.1),seam=beam(trim,.045),posts=[beam(edge,.09),beam(edge,.09)];
 function span(m,a,b){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);m.position.copy(start).add(end).multiplyScalar(.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
 function update(deck,screen,amount,landscape){
  root.visible=amount>.02&&!landscape;if(!root.visible)return;
  const y=deck.position.y+.26,z=deck.position.z-.98;
  const p=[[-5.12,-2.7,5.4],[5.12,-2.7,5.4],[-5.88,y,z],[5.88,y,z]];
  const vertices=[...p[0],...p[2],...p[1],...p[1],...p[2],...p[3]];
  panel.geometry.dispose();panel.geometry=new THREE.BufferGeometry();panel.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));panel.geometry.computeVertexNormals();panel.material.side=THREE.DoubleSide;
  span(left,p[0],p[2]);span(right,p[1],p[3]);
  const t=.2,at=x=>[x,-2.7+(y+2.7)*t,5.4+(z-5.4)*t];span(seam,at(-5.27),at(5.27));
  screen.updateWorldMatrix(true,true);
  for(let i=0;i<2;i++){const s=i?1:-1,q=screen.localToWorld(new THREE.Vector3(s*4.72,-2.12,-.13));span(posts[i],[s*5.72,2.8,-5.9],q.toArray());}
 }
 return {root,update};
}
