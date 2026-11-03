import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import source from './art/minted-coin.js';

// Blender 网格共享实例绘制，反射棚只供金属使用，不改变机台和海景照明。
export async function createMintedCoin(renderer){
 const bytes=Uint8Array.from(atob(source.glb),v=>v.charCodeAt(0)),gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');gltf.scene.updateMatrixWorld(true);
 const studio=new THREE.Scene();studio.background=new THREE.Color('#59616b');
 const add=(w,h,color,intensity,p)=>{const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide,toneMapped:false}),m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(...p);m.lookAt(0,0,0);studio.add(m);};
 add(7,4,'#ffffff',3.0,[-3.2,4.2,1]);add(2.4,7,'#dcefff',2.3,[4,2,-2]);add(8,1.3,'#fff3d9',2.0,[0,3.7,-5]);add(9,7,'#111820',1,[0,-3,0]);
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(studio,.035,.1,35),env=target.texture;pmrem.dispose();studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 const geometries=[],materials=[],goldMaterials=[];
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld),name=o.material.name,edge=name.includes('边'),engraved=name.includes('刻');
  geometries.push(geometry);materials.push(new THREE.MeshStandardMaterial({name:'压铸银币 · '+name,color:engraved?'#969fa9':edge?'#e6edf3':'#bdc9d3',metalness:1,roughness:engraved?.33:edge?.20:.29,envMap:env,envMapIntensity:.95}));
  goldMaterials.push(new THREE.MeshStandardMaterial({name:'压铸大奖金 · '+name,color:engraved?'#b47a2f':edge?'#f3d892':'#dfb86c',metalness:1,roughness:edge?.20:.29,envMap:env,envMapIntensity:1}));
 });
 const geometry=mergeGeometries(geometries,true);geometries.forEach(g=>g.dispose());geometry.computeBoundingBox();
 return {geometry,materials,goldMaterials,face:materials[0],env,diagnostics:{source:'Blender 压铸鲸鱼银币',triangles:geometry.index.count/3,drawCalls:geometry.groups.length,bounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()}}};
}
