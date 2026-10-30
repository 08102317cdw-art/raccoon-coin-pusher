const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let passed=0;const errors=[];const ok=(x,m)=>{assert.ok(x,m);passed++;};
 try{
 for(const [name,width,height]of [['desktop',1440,900],['mobile',390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:name==='mobile',hasTouch:name==='mobile'});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+process.cwd()+'/dist/raccoon-coin-pusher.html');await p.waitForFunction(()=>!!window.__game,{timeout:60000});await p.evaluate(()=>{__game.pause(true);__game.start();__game.update(.016);});await p.waitForTimeout(150);await p.evaluate(()=>__game.render());
  const overlap=await p.evaluate(()=>{const r=__game.layout().viewport,q=document.getElementById('token-controls').getBoundingClientRect();return Math.max(0,Math.min(r.right,q.right)-Math.max(r.left,q.left))*Math.max(0,Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top));});ok(overlap===0,name+' token chooser outside gameplay');
  await p.screenshot({path:`tokens-${name}-play.png`,timeout:120000,animations:'disabled'});
  await p.click('#token-open');ok(await p.locator('#token-cards .token-card').count()===20,name+' inventory contains normal + 19 special');
  const before=await p.evaluate(()=>__game.coins[0].body.translation().x);await p.evaluate(()=>__game.update(1));ok(await p.evaluate(()=>__game.coins[0].body.translation().x)===before,name+' inventory pauses world');
  await p.screenshot({path:`tokens-${name}-bag.png`,timeout:120000,animations:'disabled'});
  await p.click('#token-tab-atlas');ok(await p.locator('#token-cards .token-card').count()===22,name+' atlas lists 19 special + 3 bad');
  await p.locator('.token-card.bad').last().scrollIntoViewIfNeeded();ok(await p.locator('#token-close').isVisible(),name+' sticky close accessible at end of atlas');
  await p.screenshot({path:`tokens-${name}-bad-atlas.png`,timeout:120000,animations:'disabled'});
  await p.click('#token-close');await p.click('#token-open');await p.locator('.token-card').filter({has:p.locator('h3',{hasText:'种子币',exact:true})}).locator('button').click();
  const drop=await p.evaluate(()=>{const g=__game,n=g.tokens.bag.seed,shots=g.run.shots;g.dropCoin();return {spent:shots-g.run.shots,stock:n-g.tokens.bag.seed,physical:g.coins.at(-1).kind};});ok(drop.spent===1&&drop.stock===1&&drop.physical==='seed',name+' selected special drops real body and spends both resources');
  const synergy=await p.evaluate(()=>{const g=__game,s=g.spawn('seed',-2,2.6,0),w=g.spawn('water',-1.2,2.6,0);g.stepTokens(.2);const k=g.spawn('killer',3,2.6,-1),bad=g.spawn('thief',3.7,2.6,-1),cash=g.run.cash;g.stepTokens(.2);g.syncCoins();g.render();return {tree:s.kind,waterGone:!g.coins.includes(w),badGone:!g.coins.includes(bad),kills:k.token.kills,cash:g.run.cash-cash};});
  ok(synergy.tree==='tree'&&synergy.waterGone,name+' physical seed+water transforms rendered token');ok(synergy.badGone&&synergy.kills===1&&synergy.cash===1,name+' killer removes actual bad body and awards shell');
  const base=await p.evaluate(()=>{const g=__game,c=g.spawn('relic',0,-.8,4.5);c.token.bonus=20;c.token.multiplied=true;g.update(.016);g.save();return {score:g.run.score,uid:c.token.uid};});ok(base.score>=75,name+' upgraded special physically scores');
  await p.reload();await p.waitForFunction(()=>!!window.__game,{timeout:60000});await p.evaluate(()=>{__game.pause(true);__game.start();__game.update(.016);});
  ok(await p.evaluate(()=>__game.coins.some(c=>c.kind==='killer'&&c.token.kills===1)&&__game.coins.some(c=>c.kind==='tree')),name+' save restores transformed tokens and used killer charge');
  await p.evaluate(()=>{__game.spawn('plush',0,-.8,4.5);__game.update(.016);__game.finishRound();});ok(await p.evaluate(()=>__game.run.phase==='shop'),name+' tokens integrate with round/shop');
  const free=p.locator('.token-pack').first().getByRole('button',{name:'免费领取',exact:true});const bagBefore=await p.evaluate(()=>__game.tokens.remaining);await free.scrollIntoViewIfNeeded();await free.click();ok(await p.evaluate(()=>__game.tokens.claimed&&__game.tokens.remaining)>bagBefore,name+' free pack claimed once');
  await p.screenshot({path:`tokens-${name}-shop.png`,timeout:120000,animations:'disabled'});
  await p.reload();await p.waitForFunction(()=>!!window.__game,{timeout:60000});await p.evaluate(()=>{__game.pause(true);__game.start();__game.update(.016);});ok(await p.evaluate(()=>__game.tokens.claimed),name+' claim persists after reload');
  const old=await p.evaluate(()=>({shots:__game.run.shots,killer:__game.tokens.bag.killer,ids:__game.coins.map(c=>c.token.uid)}));
  await p.locator('#next-round').scrollIntoViewIfNeeded();await p.click('#next-round');ok(await p.evaluate(()=>__game.run.round===2&&__game.tokens.bag.killer>0&&__game.coins.some(c=>['rust','thief','decay'].includes(c.kind))),name+' next stage introduces bad coins and killer supply');
  await p.evaluate(()=>{__game.syncCoins();__game.render();});await p.screenshot({path:`tokens-${name}-field.png`,timeout:120000,animations:'disabled'});
  ok(await p.evaluate(v=>__game.tokens.bag.killer===v+1,old.killer),name+' killer supply exactly once');
  // A real v2 save (no token field) upgrades without losing run score/currency.
  const legacy=await p.evaluate(()=>{__game.save();const d=JSON.parse(localStorage.getItem('raccoon-pusher-run-v2'));d.version=2;delete d.tokens;d.bodies=d.bodies.filter(c=>!__game.tokenCatalog[c.kind]);d.run.score=123;return JSON.stringify(d);});
  await p.addInitScript(data=>localStorage.setItem('raccoon-pusher-run-v2',data),legacy);
  await p.reload();await p.waitForFunction(()=>!!window.__game,{timeout:60000});await p.evaluate(()=>__game.pause(true));ok(await p.evaluate(()=>__game.run.score===123&&__game.tokens.bag.seed===2),name+' v2 save migrates with starter bag');
  const penalty=await p.evaluate(()=>{__game.start();const n=__game.run.score,c=__game.spawn('rust',0,-.8,4.5);c.state='won';__game.onWin(c);return n-__game.run.score;});ok(penalty===40,name+' bad coin physically routed through penalty, not positive score');
  await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
