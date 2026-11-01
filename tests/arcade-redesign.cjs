// Offline integration + visual regression matrix for the v3.2 cabinet.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
const out=process.env.QA_DIR||'/data/reference';fs.mkdirSync(out,{recursive:true});
(async()=>{let browser,checks=0;const errors=[];const check=(v,msg)=>{assert.ok(v,msg);checks++};
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname;const p=path.resolve(process.cwd(),'.'+(rel==='/'?'/dist/raccoon-coin-pusher.html':rel));if(!p.startsWith(process.cwd()+'/'))return res.writeHead(403).end();fs.readFile(p,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(data);})});
try{await new Promise(r=>server.listen(8792,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',deviceScaleFactor:1});const p=await ctx.newPage();p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));
async function load(){await p.goto('http://127.0.0.1:8792/');await p.waitForFunction(()=>!!window.__game,null,{polling:100,timeout:120000});await p.evaluate(()=>{__game.pause(true);__game.start();__game.update(.016);__game.render()});await p.waitForTimeout(80);}
async function shot(name){await p.waitForTimeout(100);await p.evaluate(()=>__game.render());await p.screenshot({path:path.join(out,name+'.png'),timeout:120000,animations:'disabled'});}
await load();console.log('Loaded desktop');
check(await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return new Set(ids).size===ids.length}),'unique IDs');
check(await p.locator('#app canvas').count()===1,'one physics viewport');check(await p.locator('#machine-live-slot canvas').count()===1,'one live slot');
await shot('qa-desktop-play');
const shots=await p.evaluate(()=>__game.run.shots);await p.evaluate(()=>__game.dropCoin('middle'));check(await p.evaluate(()=>__game.run.shots)===shots-1,'middle chute spends once');
await p.evaluate(()=>document.getElementById('token-open').click());check(await p.locator('#token-modal').isVisible(),'inventory opens');const b=await p.evaluate(()=>__game.run.shots);await p.evaluate(()=>__game.dropCoin('left'));check(await p.evaluate(()=>__game.run.shots)===b,'inventory blocks drops');await shot('qa-desktop-inventory');await p.evaluate(()=>document.getElementById('token-close').click());
// Every displayed prize is tested, plus multiple prizes arriving in one frame.
await p.evaluate(()=>{for(const id of ['shower','tickets','shells','prize','special','tower'])__game.showLottery({id,name:id,text:'测试奖励'});});await p.waitForFunction(()=>!__game.prizeWheel.spinning&&__game.prizeWheel.queued===0,null,{polling:50,timeout:10000});
check(await p.evaluate(()=>document.getElementById('lottery').dataset.winner)==='tower','queue keeps every result');const rotation=await p.evaluate(()=>__game.prizeWheel.rotation);check(((Math.round(-rotation/60)%6)+6)%6===5,'pointer lands on actual tower sector');await shot('qa-desktop-wheel');
await p.evaluate(()=>{__game.spawn('gem',0,-.5,4.5);__game.spawn('big',0,-.5,4.5);__game.update(.016)});check(await p.evaluate(()=>__game.run.reached),'physical prizes reach target');await p.evaluate(()=>document.getElementById('round-action').click());check(await p.evaluate(()=>__game.run.phase)==='shop','round clear opens shop');await shot('qa-desktop-shop');
const count=await p.locator('#pick-cards button').count();check(count===3,'three draft choices');await p.locator('#pick-cards button').first().evaluate(b=>b.click());check(await p.evaluate(()=>__game.run.picked),'draft choice is recorded');
const oldcash=await p.evaluate(()=>__game.run.cash);const purch=p.locator('.upgrade-card button:not(:disabled)').first();await purch.evaluate(b=>b.click());check(await p.evaluate(()=>__game.run.cash)<oldcash,'shop purchase deducts shells');
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(150);await shot('qa-mobile-shop');await p.locator('#next-round').evaluate(b=>b.click());await p.evaluate(()=>{__game.update(.016);__game.render()});check(await p.evaluate(()=>__game.run.round)===2,'next stage retains progression');
for(const [name,width,height] of [['mobile',390,844],['small',360,640],['landscape',844,390],['tablet',1024,768]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(120);await p.evaluate(()=>{__game.update(.016);__game.render()});
 const bounds=await p.evaluate(()=>{const ids=['app','runbox','chute-left','dropbtn','chute-right','exchange-btn','shake-btn','token-open','coin-clip','energy-box'];return ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();let clip=false;for(let a=document.getElementById(id).parentElement;a&&a!==document.body;a=a.parentElement){const css=getComputedStyle(a);if(/hidden|auto|scroll/.test(css.overflowX+' '+css.overflowY)){const b=a.getBoundingClientRect();if(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2)clip=true;}}return {id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height,clip}})});
 for(const r of bounds)check(!r.clip&&r.w>0&&r.h>0&&r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,`${name} ${r.id} in viewport: ${JSON.stringify(r)}`);
 check(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'no horizontal page scroll '+name);
 await shot('qa-'+name+'-play');
 if(name==='mobile'){
  await p.locator('#wheel-toggle').evaluate(b=>b.click());check(await p.evaluate(()=>document.getElementById('mobile-cabinet').classList.contains('wheel-open')),'mobile wheel opens');const n=await p.evaluate(()=>__game.run.shots);await p.evaluate(()=>__game.dropCoin('middle'));check(await p.evaluate(()=>__game.run.shots)===n,'wheel blocks underlying controls');await shot('qa-mobile-wheel');await p.keyboard.press('Escape');check(!await p.evaluate(()=>document.getElementById('machine-console').inert),'escape restores controls');
  await p.locator('#token-open').evaluate(b=>b.click());await shot('qa-mobile-inventory');await p.locator('#token-close').evaluate(b=>b.click());
 }
}
await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(120);check(await p.locator('#app canvas').count()===1&&await p.locator('#machine-live-slot canvas').count()===1,'responsive reparenting never duplicates canvases');
await p.locator('#machine-menu').evaluate(b=>b.click());check(await p.locator('#machine-hatch').isVisible(),'settings opens');await shot('qa-desktop-settings');await p.keyboard.press('Escape');check(!await p.locator('#machine-hatch').isVisible(),'escape closes settings');
await p.evaluate(()=>__game.save());const before=await p.evaluate(()=>({round:__game.run.round,cash:__game.run.cash,shots:__game.run.shots}));await load();check(await p.evaluate(x=>__game.run.round===x.round&&__game.run.cash===x.cash&&__game.run.shots===x.shots,before),'save reload retains round, shells and shots');check(errors.length===0,'no browser exceptions: '+errors.join(';'));
console.log(`PASS: ${checks} arcade redesign integration assertions; screenshots in ${out}`);await ctx.close();
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.close();}})();
