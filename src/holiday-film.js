import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import islandModel from './art/holiday-islands.js';

// 生成循环背景的独立摄影棚。机台与物理世界不参与背景视频录制。
export async function createHolidayFilm(){
 const scene=new THREE.Scene();scene.fog=new THREE.Fog('#c9e9d7',95,230);
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const g=canvas.getContext('2d');
 const sky=g.createLinearGradient(0,0,0,720);sky.addColorStop(0,'#80d0e1');sky.addColorStop(.6,'#d6efdd');sky.addColorStop(1,'#fff0c4');g.fillStyle=sky;g.fillRect(0,0,1280,720);
 const sunlight=g.createRadialGradient(980,110,20,980,110,300);sunlight.addColorStop(0,'#fff9dc');sunlight.addColorStop(.25,'#fff5c9a0');sunlight.addColorStop(1,'#fff5c900');g.fillStyle=sunlight;g.fillRect(0,0,1280,720);
 const skyTexture=new THREE.CanvasTexture(canvas);skyTexture.colorSpace=THREE.SRGBColorSpace;scene.background=skyTexture;
 scene.add(new THREE.HemisphereLight('#fff5d4','#77c6b5',2.25));
 const sun=new THREE.DirectionalLight('#fff1ca',2.8);sun.position.set(-30,55,5);scene.add(sun);
 const bytes=Uint8Array.from(atob(islandModel),x=>x.charCodeAt(0));const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');scene.add(gltf.scene);
 gltf.scene.traverse(o=>{if(o.isMesh){o.material.side=THREE.DoubleSide;o.material.roughness=.9;}});
 const material=new THREE.ShaderMaterial({uniforms:{phase:{value:0},deep:{value:new THREE.Color('#41bfc1')},shallow:{value:new THREE.Color('#80d9bd')}},vertexShader:`
 varying vec2 point;varying float height;uniform float phase;
 void main(){point=position.xy;vec3 p=position;float wave=sin(p.x*.13+p.y*.09+phase)*.12+sin(p.y*.26-phase*2.)*.06;p.z+=wave;height=wave;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec2 point;varying float height;uniform float phase;uniform vec3 deep;uniform vec3 shallow;
 void main(){float ripple=sin(point.x*.7+point.y*.16+phase*2.)*sin(point.y*.36-phase);float light=pow(max(0.,ripple),14.);float path=exp(-pow((point.x+point.y*.18-12.)/21.,2.));vec3 color=mix(deep,shallow,.45+height*1.5);color+=vec3(.21,.23,.13)*light*(.35+path*.8);float fine=pow(max(0.,sin(point.x*1.2+phase)*cos(point.y*.7-phase*2.)),28.);color+=fine*.1;gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:THREE.DoubleSide});
 const water=new THREE.Mesh(new THREE.PlaneGeometry(380,320,96,80),material);water.rotation.x=-Math.PI/2;water.position.set(0,-1.0,-65);scene.add(water);
 const cloudMat=new THREE.MeshStandardMaterial({color:'#fff8e8',roughness:1,flatShading:false}),cloudGeo=new THREE.SphereGeometry(1,12,8),clouds=[];
 for(const [x,y,z,s]of[[-50,24,-99,4],[4,25,-130,4.5],[58,28,-160,5],[-16,36,-180,6]]){
  const group=new THREE.Group();group.position.set(x,y,z);
  for(let i=0;i<5;i++){const m=new THREE.Mesh(cloudGeo,cloudMat);m.position.set((i-2)*1.2,Math.sin(i*1.8)*.45,0);m.scale.set(2,1.05+(i%2)*.35,1);group.add(m);}group.scale.setScalar(s);scene.add(group);clouds.push({group,x});
 }
 const boat=new THREE.Group();boat.position.set(23,-.5,-27);scene.add(boat);
 const hull=new THREE.Mesh(new THREE.SphereGeometry(1,12,6),new THREE.MeshStandardMaterial({color:'#e59964',roughness:.8}));hull.scale.set(2.3,.4,.8);boat.add(hull);
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,4,6),new THREE.MeshStandardMaterial({color:'#f6e7bf'}));mast.position.y=2;boat.add(mast);
 const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,3.8,0,0,.65,0,2.1,.65,0],3));sailGeo.computeVertexNormals();const sail=new THREE.Mesh(sailGeo,new THREE.MeshStandardMaterial({color:'#fff4d5',side:THREE.DoubleSide,roughness:1}));boat.add(sail);
 const birds=[];const birdMat=new THREE.LineBasicMaterial({color:'#f9f8db'});
 for(let i=0;i<4;i++){const group=new THREE.Group(),geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.8,0,0),new THREE.Vector3(0,-.22,0),new THREE.Vector3(.8,0,0)]);group.add(new THREE.Line(geo,birdMat));group.position.set(-16+i*8,13+i%2*3,-38-i*7);scene.add(group);birds.push(group);}
 const camera=new THREE.PerspectiveCamera(43,16/9,.1,280);camera.position.set(0,20,45);camera.lookAt(0,4,-46);
 function update(seconds){const phase=seconds/12*Math.PI*2;material.uniforms.phase.value=phase;clouds.forEach((c,i)=>c.group.position.x=c.x+Math.sin(phase+i*.6)*2.5);boat.position.x=23+Math.sin(phase)*3;boat.position.y=-.5+Math.sin(phase*2)*.12;boat.rotation.z=Math.sin(phase*2)*.025;birds.forEach((b,i)=>{b.position.x=-16+i*8+Math.sin(phase+i)*5;b.position.y=13+i%2*3+Math.sin(phase*3+i)*.5;});}
 update(0);return {scene,camera,update};
}
