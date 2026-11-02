import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import source from './art/cabinet-glb.js';
export async function loadCabinetModel(scene){
 const bytes=Uint8Array.from(atob(source),c=>c.charCodeAt(0));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
 const root=gltf.scene;root.name='Blender cabinet mechanisms';scene.add(root);
 const mats={};root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])mats[m.name]=m;}});
 root.getObjectByName('LandscapeLCDDock').visible=false;
 const pendulum=root.getObjectByName('SpecialCarriage'),outlet=root.getObjectByName('SpecialCoinOutlet');
 if(!pendulum||!outlet)throw Error('Blender cabinet missing carriage/outlet');
 return {root,pendulum,outlet,chuteRig:{left:root.getObjectByName('Feed_left'),right:root.getObjectByName('Feed_right')},chuteMat:{side:mats['Side indicator'],mid:mats['Special indicator']}};
}
