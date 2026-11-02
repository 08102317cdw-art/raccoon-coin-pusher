// v4.2 presentation contract. Tests real meshes/coordinates, not screenshot labels.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const{chromium}=require('playwright-core');let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const dir=process.env.QA_DIR||'dist/cabinet-qa';fs.mkdirSync(dir,{recursive:true});
(async()=>{let browser;const srv=http.createServer((q,r)=>r.writeHead(200,{'Content-Type':'text/html;charset=utf-8'}).end(fs.readFileSync('dist/raccoon-coin-pusher.html')));await new Promise(r=>srv.listen(8798,'127.0.0.1',r));
try{
 const glb=fs.readFileSync('models/whale-cabinet.glb'),json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
 for(const name of ['SpecialFeedGantry','SpecialCarriage','SpecialCoinOutlet','Feed_left','Feed_right','FrontCoinCollector'])check(json.nodes.some(n=>n.name===name),'Blender GLB contains '+name);
 check(json.meshes.length<=40&&glb.length<1e6,'offline model draw calls and weight bounded');
 browser=await chromium.launch({executablePath:require('./browser-path.cjs'),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'}),p=await ctx.newPage();const errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8798'))remote.push(r.url())});
 async function boot(){await p.goto('http://127.0.0.1:8798');await p.waitForFunction(()=>window.__game);await p.evaluate(()=>__game.pause(true));await p.locator('#start-button').click();await p.evaluate(()=>{__game.update(0);__game.render()})}
 async function shot(name){await p.evaluate(()=>{window.qaDraw=true;const draw=()=>{if(!qaDraw)return;__game.render();window.qaFrame=requestAnimationFrame(draw)};draw()});await p.screenshot({path:path.join(dir,name+'.png'),timeout:120000});await p.evaluate(()=>{qaDraw=false;cancelAnimationFrame(qaFrame)})}
 await boot();await p.waitForFunction(()=>__game.cabinet().voice.played===1);
 check(await p.locator('#push-readout,#timing-lamp').count()===0,'no push/retract overlay or duplicate timing hint');
 const s=await p.evaluate(()=>__game.cabinet());check(s.display.score===0&&s.display.target===300&&s.display.shots===50,'LCD reads live initial run');
 await p.evaluate(()=>{__game.run.score=127;__game.run.cash=12;__game.run.shots=34;__game.update(0)});
 const live=await p.evaluate(()=>__game.cabinet().display);check(live.score===127&&live.cash===12&&live.shots===34,'LCD follows live run state, not a baked image');
 await p.locator('#detail-toggle').click();await p.evaluate(()=>__game.update(0));check(await p.evaluate(()=>__game.cabinet().display.formula.length>0),'physical LCD multiplier hotspot opens score detail');await p.locator('#detail-toggle').click();
 const before=await p.evaluate(()=>({shots:__game.run.shots,pet:__game.cabinet().petCount,played:__game.cabinet().voice.played}));await p.waitForTimeout(500);await p.locator('#mascot-pet').click();await p.evaluate(()=>__game.update(.01));await p.waitForFunction(n=>__game.cabinet().voice.played>n,before.played);
 check(await p.evaluate(x=>__game.run.shots===x.shots&&__game.cabinet().petCount===x.pet+1,before),'pet is real, consumes no ordinary coin');check(await p.evaluate(()=>__game.theme().pose==='happy'),'pet changes mascot expression');await shot('01-phone-pet');
 // Existing targets remain semantic controls, grounded to the projected real caps.
 for(const[w,h,name]of[[390,844,'phone'],[360,640,'small'],[430,932,'large'],[844,390,'landscape'],[1024,768,'tablet'],[1440,900,'desktop']]){
  await p.setViewportSize({width:w,height:h});await p.waitForTimeout(150);await p.evaluate(()=>{__game.update(0);__game.render()});
  const bounds=await p.evaluate(()=>{const ids=['exchange-btn','chute-left','dropbtn','chute-right','shake-btn'];return ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,bg:getComputedStyle(e).backgroundColor}})});
  for(const r of bounds)check(r.w>=44&&r.h>=44&&r.x>=0&&r.y>=0&&r.right<=w&&r.bottom<=h,`${name} ${r.id} 44px target fits`);
  for(let i=0;i<bounds.length-1;i++)check(bounds[i].right<=bounds[i+1].x+2,`${name} independent model hit areas do not overlap`);
  const lcd=await p.evaluate(()=>__game.cabinet().bounds);check(lcd.left>=0&&lcd.right<=w&&lcd.top>=0&&lcd.bottom<=h,'real LCD in viewport '+name);
  if(['phone','small','landscape','desktop'].includes(name))await shot('02-'+name+'-cabinet');
 }
 // Real special-coin spawn must line up with the Blender nozzle at any swing range.
 for(const time of[.2,1.2,2.4]){
  const result=await p.evaluate(t=>{__game.run.relics.swing=1;__game.update(t);const a=__game.cabinet().outlet;__game.dropSpecialCoin(0);const c=__game.coins.at(-1);return{outlet:a,spawn:c.body.translation()};},time);
  check(Math.abs(result.outlet[0]-result.spawn.x)<.001&&Math.abs(result.outlet[1]-result.spawn.y)<.001&&Math.abs(result.outlet[2]-result.spawn.z)<.001,'special physics spawn matches actual moving nozzle '+time);
 }
 await p.locator('#machine-menu').click();await p.locator('#btn-voice').click();check(await p.evaluate(()=>!__game.cabinet().voice.enabled),'independent voice mute');
 for(const[w,h,name]of[[390,844,'phone'],[360,640,'small'],[430,932,'large'],[844,390,'landscape'],[1024,768,'tablet'],[1440,900,'desktop']]){
  await p.setViewportSize({width:w,height:h});await p.waitForTimeout(150);await p.evaluate(()=>{__game.update(0);__game.render()});
  const bounds=await p.evaluate(()=>{const panel=document.getElementById('machine-hatch').getBoundingClientRect();return [...document.querySelectorAll('#machine-hatch #btns button')].map(el=>{const r=el.getBoundingClientRect();return{id:el.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,panel:{left:panel.left,right:panel.right,top:panel.top,bottom:panel.bottom}}})});
  for(const r of bounds)check(r.width>=44&&r.height>=44&&r.left>=r.panel.left&&r.right<=r.panel.right&&r.top>=r.panel.top&&r.bottom<=r.panel.bottom&&r.left>=0&&r.right<=w,`${name} settings ${r.id} fits inside hatch and viewport`);
  if(name==='phone'||name==='desktop')await shot('03-'+name+'-settings');
 }
 await p.locator('#hatch-close').click();
 await boot();check(await p.evaluate(()=>!__game.cabinet().voice.enabled&&document.getElementById('btn-voice').classList.contains('off')),'voice mute survives reload with correct button state');
 const voice=JSON.parse(fs.readFileSync('src/art/voice-clips.js','utf8').split('export const VOICE_CLIPS=')[1].replace(/;\s*$/,''));
 const decoded=await p.evaluate(async clips=>{const a=new AudioContext(),out=[];for(const[k,c]of Object.entries(clips)){const bytes=await(await fetch(c.src)).arrayBuffer();const d=await a.decodeAudioData(bytes);out.push({key:k,duration:d.duration,frames:d.length})}await a.close();return out},voice);
 for(const d of decoded)check(d.duration>.4&&d.duration<8&&d.frames>10000,'offline Mandarin audio decodes '+d.key);
 check(!errors.length,'no browser runtime errors '+errors.join(';'));check(!remote.length,'offline game requires no remote model, TTS or image requests');
 fs.writeFileSync(path.join(dir,'presentation-evidence.json'),JSON.stringify({checks,live,decoded,errors,remote,modelBytes:glb.length},null,2));console.log('PASS: '+checks+' diegetic cabinet assertions');await ctx.close();
}finally{await browser?.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
