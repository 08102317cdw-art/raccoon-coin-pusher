// Integration test with the built offline entry: controlled physical win events exercise
// progression deterministically, in addition to actual keyboard/pointer drop tests.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename=path.resolve(process.cwd(),'.'+(rel==='/'?'/dist/raccoon-coin-pusher.html':rel));
  if(!filename.startsWith(process.cwd()+'/'))return res.writeHead(403).end();
  fs.readFile(filename,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});
 });
 let browser;const errors=[];let checks=0;
 const check=(v,msg)=>{assert.ok(v,msg);checks++;};
 try{
  await new Promise(r=>server.listen(8789,'127.0.0.1',r));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();page.setDefaultNavigationTimeout(120000);page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8789/'); await page.waitForFunction(()=>!!window.__game,null,{timeout:120000});await page.evaluate(()=>__game.pause(true));
  await page.screenshot({timeout:120000,animations:'disabled',path:'qa-desktop-start.png'});
  await page.click('#start-button');await page.evaluate(()=>{__game.update(.016);__game.render();});
  await page.evaluate(()=>__game.pause(true));
  check(await page.evaluate(()=>__game.run.shots===50),'fresh 50 shots');
  await page.screenshot({timeout:120000,animations:'disabled',path:'qa-desktop-play.png'});
  await page.keyboard.press('Space');await page.evaluate(()=>__game.update(.21));await page.keyboard.up('Space'); // a full press releases immediately; pointer tested below
  await page.mouse.move(700,600);await page.mouse.down();await page.evaluate(()=>__game.update(.21));await page.mouse.up();
  check(await page.evaluate(()=>__game.run.shots===49),'pointer spends exactly one');
  await page.click('#btn-help');const before=await page.evaluate(()=>__game.run.shots);
  await page.evaluate(()=>{__game.dropCoin();__game.update(1);});check(await page.evaluate(()=>__game.run.shots)===before,'help blocks input');
  await page.screenshot({timeout:120000,animations:'disabled',path:'qa-desktop-help.png'});await page.click('#help');
  // A real gem body crossing the front award path, not a direct score assignment.
  const scoring=await page.evaluate(()=>{
    const g=__game; const c=g.spawn('gem',0,-.5,4.5); g.update(.016);
    return {score:g.run.score,shots:g.run.shots,gems:g.state.col.gem};
  });check(scoring.score>=200&&scoring.gems===1&&scoring.shots===49,'physical gem awards at least 200 points without ammo refund: '+JSON.stringify(scoring));
  await page.evaluate(()=>{const g=__game;g.spawn('big',0,-.5,4.5);g.update(.016);});
  check(await page.evaluate(()=>__game.run.reached),'target reached');
  await page.click('#round-action');check(await page.evaluate(()=>__game.run.phase==='shop'),'clear opens shop');
  await page.screenshot({timeout:120000,animations:'disabled',path:'qa-desktop-shop.png'});
  const shopFrozen=await page.evaluate(()=>{const p=__game.coins[0].body.translation();__game.update(1);return p.x===__game.coins[0].body.translation().x;});check(shopFrozen,'physics freezes in shop');
  const chips=await page.evaluate(()=>({cash:__game.run.cash,offers:__game.run.offers}));
  const mult=page.locator('.upgrade-card').filter({has:page.locator('h4',{hasText:'倍率芯片'})});
  await mult.locator('button').click();check(await page.evaluate(()=>__game.run.multiplier===1.25),'UI purchase applies multiplier');
  const saved=await page.evaluate(()=>{__game.save();return __game.run.serialize();});
  await page.reload();await page.waitForFunction(()=>!!window.__game,null,{timeout:120000});await page.evaluate(()=>__game.pause(true));await page.click('#start-button');await page.evaluate(()=>__game.pause(true));
  check(await page.evaluate(()=>__game.run.phase==='shop'&&__game.run.multiplier===1.25),'reload restores shop and purchased upgrades');
  check(await page.evaluate(()=>__game.run.cash)===saved.cash,'reload does not duplicate reward');
  const fieldIds=await page.evaluate(()=>__game.coins.map(c=>c.token.uid));
  await page.click('#next-round');
  check(await page.evaluate(()=>__game.run.round===2&&__game.run.shots===50&&__game.run.score===0),'next round resets budget and score');
  check(await page.evaluate(ids=>ids.every(id=>__game.coins.some(c=>c.token.uid===id)),fieldIds),'next round retains all original physical field bodies');
  // Keyboard: held key spends during update, shop buttons do not.
  await page.locator('body').click({position:{x:20,y:850}});await page.keyboard.down('Space');await page.evaluate(()=>__game.update(.21));await page.keyboard.up('Space');
  check(await page.evaluate(()=>__game.run.shots===49),'space keyboard drop');
  const settle=await page.evaluate(()=>{
    const g=__game;g.run.shots=1;g.run.score=0;g.dropCoin();g.slot.queue=0;g.slot.spinning=false;g.slot.msgT=0;
    for(let i=g.coins.length-1;i>=0;i--) {g.coins[i].body.setTranslation({x:8,y:-5,z:0},true);}
    for(let i=0;i<320;i++)g.update(.05);
    return g.run.phase;
  });check(settle==='gameover','empty unsuccessful budget reaches game over');
  await page.screenshot({timeout:120000,animations:'disabled',path:'qa-desktop-failure.png'});
  await page.click('#next-round');await page.waitForFunction(()=>!!window.__game,null,{timeout:120000});await page.evaluate(()=>__game.pause(true));await page.click('#start-button');await page.evaluate(()=>__game.pause(true));
  check(await page.evaluate(()=>__game.run.round===1&&__game.run.multiplier===1&&__game.run.shots===50),'restart resets run: '+await page.evaluate(()=>JSON.stringify(__game.run.serialize())));
  // End-to-end eight rounds via deterministic physical prize events.
  for(let i=1;i<=8;i++) {
    await page.evaluate(()=>{const g=__game; for(let n=0;!g.run.reached&&n<50;n++){const c=g.spawn('plush',0,-.8,4.5);if(!c)throw Error('test field full');g.update(.001);c.body.setTranslation({x:0,y:-100,z:0},true);}if(!g.run.reached)throw Error('controlled score did not reach target: '+JSON.stringify(g.run.serialize())); });
    await page.click('#round-action');
    check(await page.evaluate(()=>__game.run.phase)===(i===8?'victory':'shop'),'round '+i+' clear');
    if(i<8)await page.click('#next-round');
  }
  await page.screenshot({timeout:120000,animations:'disabled',path:'qa-desktop-victory.png'});
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const mp=await mobile.newPage();mp.setDefaultNavigationTimeout(120000);mp.setDefaultTimeout(120000);mp.on('pageerror',e=>errors.push(e.message));
  await mp.goto('http://127.0.0.1:8789/');await mp.waitForFunction(()=>!!window.__game,null,{timeout:120000});await mp.evaluate(()=>__game.pause(true));
  await mp.screenshot({timeout:120000,animations:'disabled',path:'qa-mobile-start.png'});await mp.click('#start-button');await mp.evaluate(()=>__game.pause(true));await mp.evaluate(()=>{__game.update(.016);__game.render();});
  await mp.screenshot({timeout:120000,animations:'disabled',path:'qa-mobile-play.png'});
  await mp.locator('#dropbtn').dispatchEvent('pointerdown');await mp.evaluate(()=>__game.update(.05));await mp.locator('#dropbtn').dispatchEvent('pointerup');
  check(await mp.evaluate(()=>__game.run.shots===49),'mobile drop button');
  await mp.evaluate(()=>{const c=__game.spawn('plush',0,-.5,4.5);__game.update(.016);});await mp.click('#round-action');
  await mp.screenshot({timeout:120000,animations:'disabled',path:'qa-mobile-shop.png'});
  check(await mp.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'no mobile document horizontal overflow');
  check(await mp.evaluate(()=>[...document.querySelectorAll('.upgrade-card')].every(e=>e.scrollWidth<=e.clientWidth)),'cards no horizontal overflow');
  await mp.locator('#next-round').scrollIntoViewIfNeeded();await mp.screenshot({timeout:120000,animations:'disabled',path:'qa-mobile-shop-bottom.png'});await mp.click('#next-round');
  check(await mp.evaluate(()=>__game.run.round===2),'mobile shop next button reachable');
  check(errors.length===0,'zero browser errors: '+errors.join('; '));
  console.log(JSON.stringify({passed:checks,errors,shop:chips},null,2));
 }finally{if(errors.length)console.log('Browser errors:',JSON.stringify(errors));if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
