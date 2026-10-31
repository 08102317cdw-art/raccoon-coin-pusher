// Theme regression: real licensed images decode; mobile overlay stays transparent;
// credits can expand without closing the help dialog; existing run save key remains.
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let checks=0; const check=(v,msg)=>{assert.ok(v,msg);checks++;}; const errors=[];
 try{
  for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:name==='mobile',hasTouch:name==='mobile'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto('file://'+process.cwd()+'/dist/raccoon-coin-pusher.html');await p.waitForFunction(()=>!!window.__game,null,{timeout:120000});await p.evaluate(()=>__game.pause(true));
   check((await p.title()).includes('大肥鱼推币机'),name+' new title');
   check(await p.evaluate(()=>Array.from(document.querySelectorAll('[data-character]')).every(im=>im.complete&&im.naturalWidth>0)),name+' embedded art decoded');
   await p.screenshot({path:`theme-${name}-start.png`,animations:'disabled',timeout:120000});
   await p.click('#start-button');await p.waitForTimeout(150);await p.evaluate(()=>{__game.update(.016);__game.render();});
   if(name==='mobile')check(await p.evaluate(()=>getComputedStyle(document.getElementById('hud')).backgroundImage==='none'&&getComputedStyle(document.getElementById('hud')).backgroundColor==='rgba(0, 0, 0, 0)'), 'mobile HUD wrapper transparent');
   check(await p.evaluate(()=>!document.getElementById('hud').innerText.includes('浣熊')),name+' no stale visible branding');
   await p.screenshot({path:`theme-${name}-play.png`,animations:'disabled',timeout:120000});
   if(name==='mobile')await p.click('#machine-menu');await p.click('#btn-help');await p.locator('#art-credits summary').scrollIntoViewIfNeeded();await p.click('#art-credits summary');
   check(await p.locator('#art-credits').getAttribute('open')!==null,name+' credits expanded');
   check(await p.locator('#help').evaluate(e=>e.classList.contains('show')),name+' credits do not close help');
   check((await p.locator('#art-credits').innerText()).includes('CrossPet'),name+' attribution visible');
   await p.locator('#art-credits').scrollIntoViewIfNeeded();await p.screenshot({path:`theme-${name}-credits.png`,animations:'disabled',timeout:120000});
   await p.keyboard.press('Escape');await p.evaluate(()=>{__game.spawn('plush',0,-.8,4.5);__game.update(.016);__game.onSlot({id:'jackpot'});__game.update(.016);});
   check(await p.evaluate(()=>__game.run.reached),name+' themed collectible still scores');
   check(await p.evaluate(()=>__game.theme().pose==='eat'),name+' jackpot rice-bowl expression');
   await ctx.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks,errors}));
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
