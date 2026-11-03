// Real Cubism parameters/meshes, offline file loading and responsive geometry.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const dir='dist/live2d-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{let browser;const evidence={};try{
 browser=await chromium.launch({executablePath:require('./browser-path.cjs'),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference'}),p=await ctx.newPage(),errors=[],remote=[];
 p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});
 await p.goto(pathToFileURL(path.resolve('dist/raccoon-coin-pusher.html')).href);await p.waitForFunction(()=>window.__game);await p.evaluate(()=>__game.pause(true));await p.locator('#start-button').click();await p.waitForTimeout(80);
 let rig=await p.evaluate(()=>__game.cabinet().rig);check(rig.kind==='Live2D Cubism MOC3','loads real MOC3 from a local file');check(rig.drawableCount===269&&rig.parameterCount===247,'actual authoring mesh and parameter counts');check(!rig.reducedMotion,'normal animation mode');
 async function step(n){return p.evaluate(n=>{for(let i=0;i<n;i++)__game.update(1/24);return __game.cabinet().rig},n)}
 const samples=await p.evaluate(()=>{const out=[];for(let i=0;i<110;i++){__game.update(1/24);out.push(__game.cabinet().rig)}return out});
 fs.writeFileSync(path.join(dir,'parameter-samples.json'),JSON.stringify(samples));
 check(Math.min(...samples.map(s=>s.eyeOpen))<.6&&Math.max(...samples.map(s=>s.eyeOpen))>.9,'real Cubism eye parameter closes and opens');
 check(new Set(samples.map(s=>s.meshSignature)).size>2,'actual model vertex positions deform, not only a whole-image transform');
 await p.mouse.move(350,210);await step(20);const right=await p.evaluate(()=>__game.cabinet().rig);check(right.gazeX>.4&&right.headAngle>4,'pointer drives positive eye gaze and actual head parameter');
 await p.mouse.move(30,220);await step(20);const left=await p.evaluate(()=>__game.cabinet().rig);check(left.gazeX<-.4&&left.headAngle< -4,'gaze and head follow opposite pointer direction');
 await p.waitForTimeout(500);const shots=await p.evaluate(()=>__game.run.shots);await p.locator('#mascot-pet').click();await p.waitForTimeout(80);
 const mouths=[];for(let i=0;i<24;i++){await p.waitForTimeout(45);mouths.push((await step(1)).mouthOpen)}
 check(Math.max(...mouths)>.05&&Math.max(...mouths)-Math.min(...mouths)>.03,'embedded voice amplitude drives real Cubism mouth parameter');check(await p.evaluate(()=>__game.run.shots)===shots,'Live2D pet action consumes no ordinary coin');
 async function shot(name,clip){await p.evaluate(()=>{window.qaDraw=true;const draw=()=>{if(!qaDraw)return;__game.render();window.qaFrame=requestAnimationFrame(draw)};draw()});await p.screenshot({path:path.join(dir,name+'.png'),...(clip?{clip}:{}),timeout:120000});await p.evaluate(()=>{qaDraw=false;cancelAnimationFrame(qaFrame)})}
 await shot('01-phone-live2d');
 const mb=await p.evaluate(()=>__game.layout().mascot);await shot('02-mascot-open',{x:Math.max(0,Math.floor(mb.left)-6),y:Math.max(0,Math.floor(mb.top)-6),width:Math.ceil(mb.right-mb.left)+12,height:Math.ceil(mb.bottom-mb.top)+12});
 // Capture a different real-parameter pose without moving the whole portrait.
 await p.mouse.move(350,310);await step(18);await shot('03-mascot-follow',{x:Math.max(0,Math.floor(mb.left)-6),y:Math.max(0,Math.floor(mb.top)-6),width:Math.ceil(mb.right-mb.left)+12,height:Math.ceil(mb.bottom-mb.top)+12});
 await p.locator('#machine-menu').click();await p.locator('#btn-voice').click();check((await step(2)).mouthOpen===0,'muting voice closes the actual mouth parameter');await p.locator('#hatch-close').click();
 const layouts=[];
 for(const[w,h,name]of[[390,844,'phone'],[360,640,'small'],[430,932,'large'],[844,390,'landscape'],[1024,768,'tablet'],[1440,900,'desktop']]){
  await p.setViewportSize({width:w,height:h});await p.waitForTimeout(180);await step(1);
  const d=await p.evaluate(()=>{const r=document.getElementById('app').getBoundingClientRect(),ids=['exchange-btn','chute-left','dropbtn','chute-right','shake-btn'],buttons=ids.map(id=>{const b=document.getElementById(id).getBoundingClientRect();return{id,left:b.left,right:b.right,top:b.top,bottom:b.bottom}});return{app:r.toJSON(),lcd:__game.cabinet().bounds,mascot:__game.layout().mascot,art:__game.cabinet().rig.artBounds,buttons}});
  // Ignore transparent authoring-canvas margins: only opaque art can obscure a key.
  const quad=d.mascot,a=d.art;d.mascot={left:quad.left+(quad.right-quad.left)*a.left,right:quad.left+(quad.right-quad.left)*a.right,top:quad.top+(quad.bottom-quad.top)*a.top,bottom:quad.top+(quad.bottom-quad.top)*a.bottom};
  fs.writeFileSync(path.join(dir,'layout-last.json'),JSON.stringify({name,...d},null,2));
  if(name==='phone'||name==='large'){check(d.lcd.top-d.app.top<50,'rear LCD uses top space '+name);check(d.app.bottom-Math.max(...d.buttons.map(b=>b.bottom))<50,'lowered console uses bottom space '+name)}
  for(const b of d.buttons)check(!(d.mascot.left<b.right&&d.mascot.right>b.left&&d.mascot.top<b.bottom&&d.mascot.bottom>b.top),'mascot does not obscure '+name+' '+b.id);
  check(d.mascot.left>=0&&d.mascot.right<=w&&d.mascot.top>=0&&d.mascot.bottom<=h,'complete mascot fits viewport '+name);
  layouts.push({name,...d});await shot('04-'+name);
 }
 check(!errors.length,'no runtime errors '+errors.join(';'));check(!remote.length,'actual file:// game has no remote requests');
 evidence.normal={rig,samples,left,right,mouths,layouts,errors,remote};await ctx.close();
 // Accessibility and explicit failure path in independent contexts.
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(pathToFileURL(path.resolve('dist/raccoon-coin-pusher.html')).href);await rp.waitForFunction(()=>window.__game);await rp.evaluate(()=>{__game.pause(true);__game.start();for(let i=0;i<30;i++)__game.update(1/24)});const rr=await rp.evaluate(()=>__game.cabinet().rig);check(rr.reducedMotion&&rr.headAngle===0,'reduced-motion mode holds actual head parameter');evidence.reduced=rr;await reduced.close();
 const core=fs.readFileSync('src/vendor/live2dcubismcore.min.js','utf8').replace(/<\/script/gi,'<\\/script'),html=fs.readFileSync('dist/raccoon-coin-pusher.html','utf8'),without=html.replace('<script>'+core+'</script>','');check(without.length<html.length,'failure fixture removes Cubism Core only');fs.writeFileSync(path.join(dir,'fallback.html'),without);
 const fc=await browser.newContext({viewport:{width:390,height:844}}),fp=await fc.newPage();await fp.goto(pathToFileURL(path.resolve(dir,'fallback.html')).href);await fp.waitForFunction(()=>window.__game);const fr=await fp.evaluate(()=>__game.cabinet().rig);check(fr.kind==='static fallback'&&fr.error.includes('Core'),'missing Core gives explicit static fallback without blocking game');evidence.fallback=fr;await fc.close();
 fs.unlinkSync(path.join(dir,'fallback.html'));evidence.checks=checks;fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));console.log('PASS: '+checks+' Live2D, voice and full-height layout assertions');
}finally{await browser?.close()}})().catch(e=>{console.error(e);process.exitCode=1});
