// Natural-play regression: no onWin(), forced score, teleported coins or ammo refill.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
const out=process.env.QA_DIR;const evidence={method:'固定随机种子、真实 Rapier、每半秒双侧同投，最多 50 次普通额度；仅快进轮盘演出，不修改分数或刚体。',runs:[],errors:[]};
(async()=>{let browser;const srv=http.createServer((q,r)=>fs.readFile('dist/raccoon-coin-pusher.html',(e,d)=>e?r.writeHead(404).end():r.writeHead(200,{'Content-Type':'text/html;charset=utf-8'}).end(d)));await new Promise(r=>srv.listen(8797,'127.0.0.1',r));
try{browser=await chromium.launch({executablePath:require('./browser-path.cjs'),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function boot(seed){const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});const p=await ctx.newPage();p.setDefaultTimeout(120000);p.on('pageerror',e=>evidence.errors.push(e.message));await p.addInitScript(seed=>{Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};},seed);await p.goto('http://127.0.0.1:8797/');await p.waitForFunction(()=>window.__game);await p.evaluate(()=>{__game.pause(true);__game.start();__game.update(0);});return{ctx,p};}
async function shot(p,name){if(!out||process.env.QA_CAPTURE==='0')return;fs.mkdirSync(out,{recursive:true});await p.evaluate(()=>{window.captureGame=true;const f=()=>{if(!captureGame)return;__game.render();window.captureFrame=requestAnimationFrame(f);};f();});await p.screenshot({path:path.join(out,name+'.png'),timeout:120000});await p.evaluate(()=>{captureGame=false;cancelAnimationFrame(captureFrame);});}
async function dismissWheel(p){
 // Wait for the entire automatic reward queue, not a fixed number of frames.
 // Slow software rendering can delay the retract/next-wheel transition.
 const deadline=Date.now()+20000;
 while(await p.evaluate(()=>__game.prizeWheel.active||__game.prizeWheel.queued>0)){
  await p.evaluate(()=>{if(__game.prizeWheel.active)document.querySelector('#lottery-dock')?.click()});
  await p.waitForTimeout(75);if(Date.now()>deadline)throw Error('自然投币回归等待轮盘队列超时');
 }
}

// A zero-input machine must not grant a free win or regenerate shots.
{const {ctx,p}=await boot(487);const idle=await p.evaluate(()=>{for(let i=0;i<1200;i++)__game.update(1/60);return{score:__game.run.score,target:__game.run.target,shots:__game.run.shots};});check(idle.score<idle.target,'静置不能白拿过关');check(idle.shots===50,'静置不返还或增加普通额度');evidence.idle=idle;await ctx.close();}
for(const seed of [487,29,913]){const {ctx,p}=await boot(seed);let firstPayout=null,transferred=false,spent=0;const samples=[];
if(seed===487){await shot(p,'phone-opening');await p.locator('#token-open').click();await shot(p,'phone-inventory');await p.locator('#token-close').click();await p.locator('#machine-menu').click();await shot(p,'phone-settings');await p.locator('#hatch-close').click();}
for(let block=0;block<50;block++){
 const s=await p.evaluate(block=>{const g=__game;let first=null,transfer=false;const before=g.run.shots;
  if(block<25)g.dropCoin('both');
  for(let i=0;i<30;i++){const previous=g.run.score;g.update(1/60);if(g.run.score>previous&&first===null)first=g.time();transfer ||= g.coins.some(c=>c.fromDrop&&c.state==='field'&&c.body.translation().y<.95);}
  return{time:g.time(),first,transfer,spent:before-g.run.shots,score:g.run.score,target:g.run.target,shots:g.run.shots,phase:g.run.phase,lost:g.stats.lost,wheel:g.prizeWheel.active};},block);
 spent+=s.spent;firstPayout??=s.first;transferred ||= s.transfer;samples.push(s);
 if(seed===487&&s.first&&firstPayout===s.first){await p.waitForTimeout(180);await shot(p,'phone-payout');await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(150);await shot(p,'desktop-payout');await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);}
 if(s.wheel)await dismissWheel(p);
 if(!['playing','settling'].includes(s.phase))break;
}
 const last=samples.at(-1);check(spent===50,'自然投币完整消耗 50 次额度 seed '+seed+' actual '+JSON.stringify({spent,last}));check(last.shots===0,'普通额度没有被收益返还 seed '+seed);check(transferred,'侧投硬币经真实物理到达下层 seed '+seed);check(firstPayout!==null&&firstPayout<12,'前 12 秒内出现真实前沿入账 seed '+seed);check(last.score>0,'不调用 onWin 或直接加分也有收益 seed '+seed);check(await p.locator('#push-readout,#timing-lamp').count()===0,'推进回收浮层已完全移除');
 evidence.runs.push({seed,firstPayout,spent,transferred,...last,samples});
 if(seed===487){await shot(p,'phone-result');await p.setViewportSize({width:360,height:640});await p.waitForTimeout(100);await shot(p,'small-phone-result');}
 console.log(`自然投币 seed ${seed}: ${JSON.stringify({firstPayout,score:last.score,target:last.target,spent,phase:last.phase})}`);await ctx.close();}
// A 100 ms update should run six fixed physical ticks, not three slow-motion ticks.
{const {ctx,p}=await boot(487);const d=await p.evaluate(()=>{const a=__game.pushPhase,t=__game.time();__game.update(.1);return{phase:__game.pushPhase-a,time:__game.time()-t};});check(Math.abs(d.phase-.185)<.00001,'10Hz 短帧下物理补齐六步，不被旧的三步上限拖慢');check(Math.abs(d.time-.1)<.00001,'游戏计时与物理补步一致');await ctx.close();}
check(!evidence.errors.length,'无浏览器运行错误');if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'natural-evidence.json'),JSON.stringify(evidence,null,2));}console.log(`PASS: ${checks} 项自然投币爽感回归`);
}finally{if(browser)await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
