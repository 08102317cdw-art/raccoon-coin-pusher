// 真实刚体验证：地下装塔、机械分段、暂停、跨刷新恢复和动态物理交接。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core'),browserPath=require('./browser-path.cjs');
const output=process.env.QA_DIR||'dist/tower-qa';let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
(async()=>{let browser;const errors=[],evidence={stages:[]};const server=http.createServer((q,r)=>r.writeHead(200,{'Content-Type':'text/html;charset=utf-8'}).end(fs.readFileSync('dist/raccoon-coin-pusher.html')));await new Promise(r=>server.listen(8805,'127.0.0.1',r));fs.mkdirSync(output,{recursive:true});
try{
 browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});await context.addInitScript(()=>localStorage.setItem('whale-holiday-motion','off'));const p=await context.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
 async function boot(){await p.goto('http://127.0.0.1:8805');await p.waitForFunction(()=>window.__game);await p.evaluate(()=>{__game.pause(true);__game.start();});}
 async function clear(){await p.evaluate(()=>{while(__game.coins.length){const c=__game.coins.pop();__game.world.removeRigidBody(c.body);c.mesh?.removeFromParent();}__game.syncCoins();});}
 async function advance(seconds){return p.evaluate(duration=>{for(let remaining=duration;remaining>1e-8;remaining-=.05)__game.update(Math.min(.05,remaining));return __game.tower();},seconds);}
 async function shot(name){await p.evaluate(()=>{window.qaDraw=true;function draw(){if(!qaDraw)return;__game.render();requestAnimationFrame(draw);}draw();});await p.screenshot({path:path.join(output,name+'.png')});await p.evaluate(()=>qaDraw=false);}
 async function state(label){const s=await p.evaluate(()=>({tower:__game.tower(),score:__game.run.score,shots:__game.run.shots,coins:__game.coins.length,poses:__game.coins.map(c=>({p:c.body.translation(),q:c.body.rotation(),state:c.state,kinematic:c.body.isKinematic(),dynamic:c.body.isDynamic()}))}));evidence.stages.push({label,...s});return s;}
 await boot();await clear();const shots=await p.evaluate(()=>__game.run.shots);await p.evaluate(()=>__game.spawnCoinTower(6));
 const initial=await state('底舱装填');check(initial.coins===42&&initial.tower.staged===42,'42 枚奖励金币已成为真实刚体');check(initial.poses.every(c=>c.kinematic&&c.p.y<0),'装塔位于台面下方，不从空中掉落');
 await advance(.4);const open=await state('底阀展开');check(open.tower.phase==='opening'&&open.tower.gate>0&&open.tower.gate<1,'锁销退开后机械叶片逐渐展开');await shot('01-phone-opening');
 await advance(1.25);const rising=await state('旋转升起');check(rising.tower.phase==='rising'&&rising.tower.gate===1,'完全开阀后再升塔');check(rising.tower.angle>.1&&rising.tower.lift>0&&rising.tower.lift<1,'金币塔旋转与升高同步推进');check(rising.poses.some(c=>c.p.y>0)&&rising.poses.some(c=>c.p.y<0),'同一座塔逐层露出台面');check(rising.poses.every(c=>c.kinematic),'成塔前保持运动学支撑');
 await p.evaluate(()=>__game.dropCoin('left'));check(await p.evaluate(()=>__game.run.shots)===shots,'机械演出时阻止投币穿入塔中');await shot('02-phone-rising');
 await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>__game.update(0));await shot('03-desktop-rising');
 await p.locator('#machine-menu').click();const age=await p.evaluate(()=>__game.tower().age);await advance(.5);check(await p.evaluate(a=>__game.tower().age===a,age),'打开设置时机械时钟暂停');await p.locator('#hatch-close').click();
 await p.evaluate(()=>__game.save());const paid=await p.evaluate(()=>({count:__game.coins.length,tickets:__game.run.tickets,age:__game.tower().age}));await boot();const restored=await state('刷新恢复');check(restored.coins===paid.count&&restored.tower.staged===42,'刷新恢复原有金币，不丢失或重复生成');check(Math.abs(restored.tower.age-paid.age)<1e-6&&restored.tower.phase==='rising','刷新从原机械进度继续');
 await advance(2.35);const seated=await state('升塔落座');check(seated.tower.phase==='seating'&&seated.tower.lift===1,'升到终点后先停稳落座');check(seated.poses.every(c=>c.kinematic&&c.p.y>0),'交给物理前全塔已露出台面');await shot('04-desktop-seated');
 await advance(.35);const handoff=await state('交给物理');check(handoff.tower.phase==='closing'&&handoff.tower.staged===0,'落座后收回托盘并关闭底阀');check(handoff.poses.every(c=>c.dynamic&&c.state==='field'),'同一批金币全部交接为动态刚体');
 await p.evaluate(()=>__game.save());await boot();check(await p.evaluate(()=>__game.tower().staged===0&&__game.coins.length===42),'交接后刷新不再重播或重新支付币塔');await advance(.8);check(await p.evaluate(()=>!__game.tower().active&&__game.tower().gate===0),'机械完整归位且恢复投币');
 const before=await p.evaluate(()=>__game.coins.map(c=>c.body.translation()));await p.evaluate(()=>__game.coins[0].body.applyImpulse({x:1.5,y:0,z:1},true));await advance(1.5);const after=await state('实际物理推动');check(after.poses.some((c,i)=>Math.hypot(c.p.x-before[i]?.x,c.p.y-before[i]?.y,c.p.z-before[i]?.z)>.2),'成塔后能被实际物理推动与推倒');check(after.poses.every(c=>Object.values(c.p).every(Number.isFinite)),'物理交接后无无效坐标');
 await clear();await p.evaluate(()=>{__game.run.shots=0;__game.run.phase='settling';__game.run.settle=.01;__game.spawnCoinTower(12);__game.showLottery({id:'tickets'});});
 check(await p.evaluate(()=>__game.coins.length===84&&__game.tower().courses===28),'高塔保留原奖励上限 84 枚');
 check(await p.evaluate(()=>!__game.prizeWheel.active&&__game.prizeWheel.queued===1),'后续轮盘等待机械升塔结束');
 await advance(1.4);check(await p.evaluate(()=>__game.run.active&&__game.tower().active),'普通额度耗尽时也等待成塔后再结算');
 await p.evaluate(()=>{__game.run.score=__game.run.target;__game.finishRound();});check(await p.evaluate(()=>__game.run.phase==='settling'),'不能在升塔中途手动结算');
 await advance(5);check(await p.evaluate(()=>!__game.tower().active&&__game.prizeWheel.active),'底阀归位后接着呈现排队奖励');
 await context.close();
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),rp=await reduced.newPage();rp.on('pageerror',e=>errors.push(e.message));await rp.goto('http://127.0.0.1:8805');await rp.waitForFunction(()=>window.__game);await rp.evaluate(()=>{__game.pause(true);__game.start();while(__game.coins.length){const c=__game.coins.pop();__game.world.removeRigidBody(c.body);c.mesh?.removeFromParent();}__game.spawnCoinTower(6);for(let i=0;i<8;i++)__game.update(.05);});
 check(await rp.evaluate(()=>!__game.tower().active&&__game.coins.length===42&&__game.coins.every(c=>c.body.isDynamic())),'减少动态效果时快速完成同等数量的真实币塔');
 check(await rp.evaluate(()=>__game.coins.every(c=>Math.abs(c.body.rotation().y)<.6)),'减少动态效果不做全塔旋转');await reduced.close();
 check(errors.length===0,'无页面错误：'+errors.join('；'));fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(`通过：${checks} 项机械金币塔断言。截图：${output}`);
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
