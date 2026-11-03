import * as PIXI from 'pixi.js';
import { Live2DModel, Cubism4ModelSettings, MotionPriority, MotionPreloadStrategy, config } from 'pixi-live2d-display/cubism4';
import assets from './art/live2d-assets.js';
// Real Cubism MOC3 model. Everything is embedded; no webcam, face tracking service,
// external model host or application key is involved.
config.logLevel=3;
async function unpack(){
 const urls={};let source;
 for(const [name,item]of Object.entries(assets)){
  const bytes=Uint8Array.from(atob(item.gzip),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const data=await new Response(stream).arrayBuffer();
  if(name==='c_0120.model3.json')source=JSON.parse(new TextDecoder().decode(data));
  urls[name]=URL.createObjectURL(new Blob([data],{type:item.mime}));
 }
 source.url='https://embedded.invalid/whale/c_0120.model3.json';
 source.FileReferences.Motions={Touch:source.FileReferences.Motions.Touch};
 source.FileReferences.Expressions=source.FileReferences.Expressions.filter(e=>e.File in urls);
 delete source.FileReferences.DisplayInfo;
 const settings=new Cubism4ModelSettings(source);settings.resolveURL=file=>urls[file]||file;
 return {settings,urls};
}
export async function createLive2DMascot(){
 if(!globalThis.Live2DCubismCore)throw Error('Cubism Core is not available');
 const {settings,urls}=await unpack(),W=256,H=320;
 const app=new PIXI.Application({width:W,height:H,resolution:1,backgroundAlpha:0,antialias:false,preserveDrawingBuffer:true,autoStart:false,sharedTicker:false});app.stop();
 Live2DModel.registerTicker(PIXI.Ticker);
 const model=await Live2DModel.from(settings,{autoUpdate:false,autoInteract:false,motionPreload:MotionPreloadStrategy.NONE});
 model.anchor.set(.5,.5);model.scale.set(Math.min((W-16)/model.width,(H-16)/model.height));model.position.set(W/2,H/2);app.stage.addChild(model);
 const internal=model.internalModel,core=internal.coreModel;
 let gazeX=0,gazeY=0,targetX=0,targetY=0,mouth=0,happy=0,clock=0,elapsed=0,frames=0,blink=1,lastTouch=-10,blinkCount=0,lastBlink=1,applied={headAngle:0,eyeOpen:1,mouthOpen:0};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 internal.on('beforeModelUpdate',()=>{
  const phase=clock%4.1;blink=phase<.16?Math.abs(phase-.08)/.08:1;
  if(lastBlink>.5&&blink<=.5)blinkCount++;lastBlink=blink;
  core.setParameterValueById('ParamEyeLOpen',blink);core.setParameterValueById('ParamEyeROpen',blink);
  core.setParameterValueById('ParamEyeBallX',gazeX*.8);core.setParameterValueById('ParamEyeBallY',gazeY*.65);
  core.setParameterValueById('ParamAngleX',reduced?0:gazeX*12+Math.sin(clock*.7)*2);
  core.setParameterValueById('ParamAngleY',reduced?0:gazeY*9);
  core.setParameterValueById('ParamAngleZ',reduced?0:Math.sin(clock*1.2)*2+happy*3);
  core.setParameterValueById('ParamMouthOpenY',Math.max(0,Math.min(1,mouth)));
  core.setParameterValueById('ParamMouthForm',happy>.1?.8:.15);
  core.setParameterValueById('ParamBreath',reduced?.5:.5+Math.sin(clock*2.1)*.45);
  // Cubism restores its motion baseline after model.update(); capture the actual
  // values here, immediately before vertex deformation, not after that restore.
  applied={headAngle:core.getParameterValueById('ParamAngleX'),eyeOpen:core.getParameterValueById('ParamEyeLOpen'),mouthOpen:core.getParameterValueById('ParamMouthOpenY')};
 });
 // The authoring canvas has spare transparent margins. Fit visible artwork once,
 // keeping the model's actual meshes and rig intact rather than cropping the face.
 model.update(16);app.renderer.render(app.stage);
 const pixels=app.renderer.extract.pixels(),b={x:W,y:H,r:0,b:0};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pixels[(y*W+x)*4+3]>16){b.x=Math.min(b.x,x);b.y=Math.min(b.y,y);b.r=Math.max(b.r,x);b.b=Math.max(b.b,y);}
 if(b.r>b.x&&b.b>b.y){const factor=Math.min((W-12)/(b.r-b.x+1),(H-12)/(b.b-b.y+1),2.5);model.scale.set(model.scale.x*factor);model.position.set(W/2+(W/2-(b.x+b.r)/2)*factor,H/2+(H/2-(b.y+b.b)/2)*factor);}
 app.renderer.render(app.stage);
 const finalPixels=app.renderer.extract.pixels(),visible={left:W,top:H,right:0,bottom:0};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(finalPixels[(y*W+x)*4+3]>16){visible.left=Math.min(visible.left,x);visible.top=Math.min(visible.top,y);visible.right=Math.max(visible.right,x+1);visible.bottom=Math.max(visible.bottom,y+1);}
 const artBounds={left:Math.max(0,(visible.left-3)/W),top:Math.max(0,(visible.top-3)/H),right:Math.min(1,(visible.right+3)/W),bottom:Math.min(1,(visible.bottom+3)/H)};
 return {canvas:app.view,kind:'Live2D Cubism MOC3',update(dt,input={}){
  mouth=input.mouth||0;happy=input.happy?1:Math.max(0,happy-dt*.8);elapsed+=dt;clock+=dt;
  if(elapsed<1/24&&frames>0)return false;
  const step=Math.min(.08,elapsed);elapsed=0;gazeX+=(targetX-gazeX)*Math.min(1,step*6);gazeY+=(targetY-gazeY)*Math.min(1,step*6);
  model.update(step*1000);app.renderer.render(app.stage);frames++;return true;
 },look(x,y){targetX=Math.max(-1,Math.min(1,x));targetY=Math.max(-1,Math.min(1,y));},pet(){happy=1;if(!reduced&&clock-lastTouch>.7){lastTouch=clock;model.motion('Touch',0,MotionPriority.FORCE).catch(()=>{});}},
 get state(){let meshSignature=2166136261;for(const vertices of core._model.drawables.vertexPositions)for(const value of vertices)meshSignature=Math.imul(meshSignature^Math.round(value*100000),16777619);return{meshSignature:meshSignature>>>0,kind:'Live2D Cubism MOC3',frames,blink,blinkCount,mouth,gazeX,gazeY,drawableCount:core._model.drawables.count,parameterCount:core._model.parameters.count,renderSize:[W,H],atlasMaxEdge:1024,artBounds,...applied,reducedMotion:reduced};},
 destroy(){model.destroy({children:true,texture:true,baseTexture:true});app.destroy(true);Object.values(urls).forEach(URL.revokeObjectURL);}};
}
