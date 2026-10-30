const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[],errors=[];
 try{
  for(const [name,width,height] of [['reported',944,690],['desktop',1440,900],['mobile',390,844],['small',390,667],['landscape',844,390]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<=760,hasTouch:width<=760});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto('file://'+process.cwd()+'/dist/raccoon-coin-pusher.html');await p.waitForFunction(()=>!!window.__game,{timeout:60000});
   await p.evaluate(()=>{__game.pause(true);__game.start();__game.update(.016);__game.render();});
   const inspect=()=>p.evaluate(()=>{
    const g=__game;g.render();const r=g.layout().viewport,box=id=>document.getElementById(id).getBoundingClientRect();
    const area=q=>Math.max(0,Math.min(r.right,q.right)-Math.max(r.left,q.left))*Math.max(0,Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top));
    const panels=['runbox','resources','btns','dropbtn','round-action'].filter(id=>document.getElementById(id).getClientRects().length);
    return {viewport:r,overlaps:panels.filter(id=>area(box(id))>1),landmarksInside:g.layout().landmarks.every(([x,y])=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom),overflow:document.documentElement.scrollWidth>innerWidth,details:!document.getElementById('score-formula').hidden};
   });
   if(name==='landscape')assert.ok(await p.evaluate(()=>document.getElementById('btns').getBoundingClientRect().bottom<=innerHeight),'landscape controls accessible');
   let layout=await inspect();assert.deepEqual(layout.overlaps,[],name+' HUD overlaps');assert.ok(layout.landmarksInside,name+' machine cropped');assert.ok(!layout.overflow,name+' horizontal overflow');
   await p.screenshot({path:`hud-${name}.png`,timeout:120000,animations:'disabled'});
   if(name==='reported'||name==='mobile'){
    await p.evaluate(()=>{__game.spawn('plush',0,-.8,4.5);__game.update(.016);});
    await p.waitForFunction(()=>!document.getElementById('round-action').hidden);await p.evaluate(()=>{document.getElementById('banner').className='';document.getElementById('floats').replaceChildren();document.getElementById('bubble').classList.remove('show');});
    // ResizeObserver reserves space when the stage-clear button appears.
    await p.waitForFunction(()=>{const a=document.getElementById('app').getBoundingClientRect(),b=document.getElementById('hud-bottom').getBoundingClientRect();return innerWidth>760||a.bottom<=b.top+1;});
    layout=await inspect();assert.deepEqual(layout.overlaps,[],name+' target reached overlaps');
    await p.screenshot({path:`hud-${name}-goal.png`,timeout:120000,animations:'disabled'});
    await p.click('#detail-toggle');await p.waitForFunction(()=>!document.getElementById('score-formula').hidden);
    layout=await inspect();assert.deepEqual(layout.overlaps,[],name+' expanded details overlaps');assert.ok(layout.landmarksInside,name+' expanded crops machine');
    if(name==='mobile')await p.screenshot({path:'hud-mobile-details.png',timeout:120000,animations:'disabled'});
    await p.click('#detail-toggle');
    await p.click('#round-action');assert.equal(await p.evaluate(()=>__game.run.phase),'shop',name+' settlement');
    if(name==='mobile'){await p.locator('#next-round').scrollIntoViewIfNeeded();await p.click('#next-round');assert.equal(await p.evaluate(()=>__game.run.round),2,'mobile shop progression');}
   }
   results.push({name,width,height,layout});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('tests/layout-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,results,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
