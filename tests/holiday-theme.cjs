// 验证菜单真实生命周期、离线视频降级与改版前的手机可玩面积。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright-core'),browserPath=require('./browser-path.cjs');
const baseline=require('./holiday-footprint.json'),dir=process.env.QA_DIR||'dist/holiday-qa';
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
(async()=>{let browser;const server=http.createServer((q,r)=>r.writeHead(200,{'Content-Type':'text/html;charset=utf-8'}).end(fs.readFileSync('dist/raccoon-coin-pusher.html')));await new Promise(r=>server.listen(8803,'127.0.0.1',r));fs.mkdirSync(dir,{recursive:true});const evidence={errors:[],sizes:[]};
try{
 browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1}),p=await ctx.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>evidence.errors.push(e.message));
 async function ready(){await p.waitForFunction(()=>window.__game);await p.evaluate(()=>{__game.pause(true);window.qaDrawing=true;function draw(){if(!qaDrawing)return;__game.render();requestAnimationFrame(draw);}draw();});}
 async function shot(name){await p.screenshot({path:path.join(dir,name+'.png'),timeout:90000});}
 await p.goto('http://127.0.0.1:8803');await ready();
 check(await p.evaluate(()=>__game.holiday().menuOpen&&__game.holiday().menuView==='home'),'首次进入显示完整主菜单');
 await p.waitForFunction(()=>__game.holiday().mode==='video'&&__game.holiday().time>.1);
 const first=await p.evaluate(()=>__game.holiday());await p.waitForFunction(t=>Math.abs(__game.holiday().time-t)>.2,first.time);
 check(first.muted&&first.loop&&first.raftMeshes>0,'静音循环视频与 Blender 木筏均已载入');
 await shot('01-phone-menu');
 await p.locator('#holiday-guide').click();check(await p.locator('.holiday-guide article').count()===3,'玩法说明可访问');await p.keyboard.press('Escape');
 await p.locator('#holiday-settings').click();
 const toggles=p.locator('#holiday-settings-list button');
 for(let i=0;i<3;i++){const state=await toggles.nth(i).getAttribute('aria-pressed');await toggles.nth(i).click();check(await toggles.nth(i).getAttribute('aria-pressed')!==state,'菜单声音设置同步 '+i);await toggles.nth(i).click();}
 await toggles.nth(3).click();check(await p.evaluate(()=>__game.holiday().mode==='poster'&&!__game.holiday().playing&&localStorage.getItem('whale-holiday-motion')==='off'),'关闭动景即暂停解码并保留海景');
 await toggles.nth(3).click();await p.waitForFunction(()=>__game.holiday().playing&&__game.holiday().mode==='video');await p.keyboard.press('Escape');
 await p.locator('#holiday-collection').click();check(await p.locator('#voyage-ledger').isVisible(),'航海手册复用真实收藏');await p.keyboard.press('Escape');
 await p.locator('#start-button').focus();await p.keyboard.press('Tab');check(await p.evaluate(()=>document.activeElement.id==='holiday-new'),'键盘焦点留在主菜单');
 await p.locator('#holiday-new').click();await p.locator('[data-crew="engineer"]').click();await p.locator('[data-difficulty="storm"]').click();await shot('02-voyage');await p.locator('#start-button').click();
 await p.evaluate(()=>{for(const c of __game.coins)c.body.setEnabled(false);__game.update(0);});
 check(await p.evaluate(()=>__game.run.character==='engineer'&&__game.run.difficulty==='storm'),'船员与航路实际应用到新局');
 const playTime=await p.evaluate(()=>__game.holiday().time);await p.waitForFunction(t=>__game.holiday().playing&&Math.abs(__game.holiday().time-t)>.2,playTime);check(true,'关闭主菜单后游戏海景继续播放');
 const run=await p.evaluate(()=>({id:__game.run.id,shots:__game.run.shots,time:__game.time()}));
 await p.locator('#machine-menu').click();await p.locator('#return-holiday-menu').click();await p.evaluate(()=>{__game.update(.2);__game.update(.2);});await p.keyboard.press('q');
 check(await p.evaluate(v=>__game.run.id===v.id&&__game.run.shots===v.shots&&__game.time()===v.time,run),'菜单暂停物理与投币，保留同一局');
 check(await p.evaluate(()=>document.getElementById('machine-window').inert),'主菜单阻止透点到机台');
 await p.locator('#holiday-new').click();check(await p.evaluate(()=>__game.holiday().menuView==='confirm'),'进行中航路需要明确确认才会重开');await p.locator('#holiday-cancel-new').click();
 check(await p.evaluate(v=>!__game.holiday().menuOpen&&__game.run.id===v.id&&__game.run.shots===v.shots,run),'取消重开并继续时不重置局面');
 for(const old of baseline){await p.setViewportSize({width:old.w,height:old.h});await p.waitForTimeout(180);await p.evaluate(()=>__game.update(0));const v=await p.evaluate(()=>({layout:__game.layout(),display:__game.cabinet().bounds}));
  const delta=Math.max(...old.landmarks.flatMap((point,i)=>point.map((value,j)=>Math.abs(value-v.layout.landmarks[i][j]))));
  check(delta<1,`${old.w}×${old.h} 保留改版前的推币区投影`);
  const width=(v.display.right-v.display.left)/(old.display.right-old.display.left);check(width>=.995,`${old.w}×${old.h} 计分屏没有缩小`);
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${old.w}×${old.h} 无页面横向溢出`);
  evidence.sizes.push({width:old.w,height:old.h,maxProjectionDelta:delta,displayWidthRatio:width});await shot(`play-${old.w}x${old.h}`);
 }
 await p.locator('#machine-menu').click();await p.locator('#return-holiday-menu').click();await shot('03-desktop-menu');
 await p.locator('#holiday-new').click();const discovered=await p.evaluate(()=>__game.experience().journal.discovered.length);await Promise.all([p.waitForEvent('load'),p.locator('#holiday-confirm-new').click()]);await ready();
 check(await p.evaluate(()=>__game.holiday().menuView==='voyage'),'确认重开后进入新航路选择');
 check(await p.evaluate(n=>__game.experience().journal.discovered.length>=n,discovered),'重开保留收藏档案');
 await ctx.close();
 const offline=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),op=await offline.newPage();op.on('pageerror',e=>evidence.errors.push(e.message));const requests=[];await offline.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
 await op.goto(pathToFileURL(path.resolve('dist/raccoon-coin-pusher.html')).href);await op.waitForFunction(()=>window.__game);const fallback=await op.evaluate(()=>__game.holiday());
 check(fallback.mode==='poster'&&!fallback.playing&&!fallback.motion,'减少动态效果时静态海景可用');check(requests.length===0,'离线包不请求远程资源');
 await op.locator('#start-button').click();check(await op.evaluate(()=>!__game.holiday().menuOpen),'离线静态模式正常开始游戏');await offline.close();
 const blocked=await browser.newContext({viewport:{width:390,height:844}}),bp=await blocked.newPage();await bp.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new Error('测试自动播放不可用'));};});
 await bp.goto(pathToFileURL(path.resolve('dist/raccoon-coin-pusher.html')).href);await bp.waitForFunction(()=>window.__game);await bp.waitForTimeout(200);check(await bp.evaluate(()=>__game.holiday().mode==='poster'&&!__game.holiday().playing),'自动播放被阻止时显示静态海景');await blocked.close();
 check(evidence.errors.length===0,'没有页面运行错误：'+evidence.errors.join(';'));fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2));console.log(`通过：${checks} 项晴日漂流集成断言。截图：${dir}`);
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
