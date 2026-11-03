import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import raftModel from './art/holiday-raft.js';
import media from './art/holiday-media.js';

// 静音循环视频与前景木筏分层：背景不参与机台相机拟合，也不创建碰撞体。
export async function createHolidaySetting(scene){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let enabled=true;try{enabled=localStorage.getItem('whale-holiday-motion')!=='off';}catch{}
 const poster=new THREE.TextureLoader().load(media.poster);poster.colorSpace=THREE.SRGBColorSpace;
 scene.background=poster;scene.fog=new THREE.Fog('#d0e7d1',80,180);
 document.documentElement.style.setProperty('--arcade-room',`url("${media.poster}")`);
 const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='auto';video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
 const bytes=Uint8Array.from(atob(media.video),v=>v.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:media.mime}));video.src=url;
 const videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;videoTexture.minFilter=THREE.LinearFilter;
 const raftBytes=Uint8Array.from(atob(raftModel),v=>v.charCodeAt(0));
 const gltf=await new GLTFLoader().parseAsync(raftBytes.buffer,'');const raft=gltf.scene;raft.name='Blender 晴日漂流木筏';scene.add(raft);raft.position.y=-4.85;
 let meshCount=0;raft.traverse(o=>{if(o.isMesh){meshCount++;o.receiveShadow=true;o.castShadow=false;for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.side=THREE.DoubleSide;}});
 let width=1,height=1,failed=false,revision=0;
 function crop(texture){const frame=width/Math.max(1,height),source=16/9;if(frame<source){texture.repeat.set(frame/source,1);texture.offset.set((1-frame/source)/2,0);}else{texture.repeat.set(1,source/frame);texture.offset.set(0,(1-source/frame)/2);}}
 function apply(){
  const current=++revision;
  const moving=enabled&&!reduced.matches&&!document.hidden&&!failed;
  video.classList.toggle('is-still',!moving);
  if(moving){video.play().then(()=>{if(current!==revision)return;scene.background=videoTexture;crop(videoTexture);video.classList.remove('is-still');}).catch(()=>{if(current!==revision)return;scene.background=poster;video.classList.add('is-still');});}
  else{video.pause();scene.background=poster;}
 }
 video.addEventListener('loadeddata',apply);video.addEventListener('error',()=>{failed=true;apply();});
 document.addEventListener('visibilitychange',apply);reduced.addEventListener('change',apply);
 document.addEventListener('pointerdown',()=>{if(video.paused&&enabled&&!reduced.matches)apply();},{once:true});
 apply();
 return {
  mountMenuBackdrop(root){video.id='holiday-menu-backdrop';video.poster=media.poster;root.prepend(video);},
  resize(w,h,mobile,options={}){width=w;height=h;crop(poster);crop(videoTexture);raft.scale.x=options.widePhone?2.15:1;raft.position.y=Math.min(-4.85,(options.deckY??-1.2)-.6);},
  setMotion(value){enabled=!!value;try{localStorage.setItem('whale-holiday-motion',enabled?'on':'off');}catch{}apply();},
  get motion(){return enabled&&!reduced.matches;},
  get diagnostics(){return {theme:'sunny-drift',mode:scene.background===videoTexture?'video':'poster',motion:enabled&&!reduced.matches,playing:!video.paused,time:video.currentTime,readyState:video.readyState,loop:video.loop,muted:video.muted,failed,raftMeshes:meshCount,raftY:raft.position.y};},
  dispose(){video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);poster.dispose();videoTexture.dispose();}
 };
}
