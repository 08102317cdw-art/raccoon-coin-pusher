const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');
const browserPath = require('./browser-path.cjs');
const output = process.env.QA_DIR || path.join(process.cwd(), 'dist', 'experience-qa');
const saveKey = 'raccoon-pusher-run-v2';
const sizes = [['手机',390,844],['小屏',360,640],['大手机',430,932],['横屏',844,390],['平板',1024,768],['桌面',1440,900]];
let checks = 0;
const errors = [], evidence = {说明:'使用固定台面、人工设置关卡分数验证集成状态；不代表真人平衡通关。'};
const check = (value, label) => { assert.ok(value, label); checks++; };

(async () => {
  let browser;
  const server = http.createServer((request, response) => {
    fs.readFile('dist/raccoon-coin-pusher.html', (error, body) => error
      ? response.writeHead(404).end()
      : response.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(body));
  });
  await new Promise(resolve => server.listen(8794, '127.0.0.1', resolve));
  fs.mkdirSync(output, {recursive:true});
  try {
    browser = await chromium.launch({executablePath:browserPath, headless:true, args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:1, reducedMotion:'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    async function quiet() {
      // 禁用既有刚体的运动，保留真实台面坐标与渲染，避免自然掉币干扰时钟断言。
      await page.evaluate(() => { for (const coin of __game.coins) coin.body.setEnabled(false); });
    }
    async function boot(initial=false) {
      await page.goto('http://127.0.0.1:8794/');
      await page.waitForFunction(() => window.__game && typeof __game.experience === 'function' && typeof __game.time === 'function' && typeof __game.dropSpecialCoin === 'function');
      await page.evaluate(() => __game.pause(true));
      if (initial) {
        await page.locator('#holiday-new').click();
        await page.locator('[data-crew="engineer"]').click();
        await page.locator('[data-difficulty="storm"]').click();
      }
      await page.locator('#start-button').click();
      await quiet();
      await page.evaluate(() => {__game.update(0);__game.render();});
    }
    async function shot(name) {
      // 只持续渲染、不推进物理，避免非保留绘图缓冲在截图合成前被浏览器丢弃。
      await page.evaluate(() => {window.experienceCapture=true;const draw=()=>{if(!experienceCapture)return;__game.render();window.experienceFrame=requestAnimationFrame(draw);};draw();});
      try {await page.screenshot({path:path.join(output,name+'.png'),timeout:60000});}
      finally {await page.evaluate(()=>{window.experienceCapture=false;cancelAnimationFrame(window.experienceFrame);});}
    }
    async function wheelIdle() {
      const deadline=Date.now()+40000;
      while(await page.evaluate(()=>__game.prizeWheel.active||__game.prizeWheel.queued>0||__game.tower().active)){
        // 页面暂停物理供截图，机械升塔仍须推进到归位，才能进入后续商店流程。
        await page.evaluate(()=>{if(__game.tower().active)for(let i=0;i<10;i++)__game.update(.05);});
        if(Date.now()>deadline)throw Error('等待奖励轮与机械金币塔结束超时');
        await page.waitForTimeout(50);
      }
    }
    async function wheelTrace() {
      await page.evaluate(() => {
        window.experienceWheelStates=[];
        document.getElementById('lottery').addEventListener('wheel:state',event=>experienceWheelStates.push(event.detail));
      });
    }
    async function actionBounds(mode) {
      for(const [name,width,height]of sizes) {
        await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.evaluate(()=>__game.update(0));
        for(const selector of mode==='通关'?['#next-round','#continue-endless']:['#next-round']) {
          const area=await page.locator(selector).evaluate(button=>{
            const r=button.getBoundingClientRect();let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
            for(let node=button.parentElement;node;node=node.parentElement){const style=getComputedStyle(node),bounds=node.getBoundingClientRect();if(/hidden|auto|scroll|clip/.test(style.overflowX)){left=Math.max(left,bounds.left);right=Math.min(right,bounds.right);}if(/hidden|auto|scroll|clip/.test(style.overflowY)){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom);}}
            const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
            return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,visibleRatio:Math.max(0,right-left)*Math.max(0,bottom-top)/(r.width*r.height),hit:hit===button||button.contains(hit),disabled:button.disabled};
          });
          evidence.底部操作区 ||= [];evidence.底部操作区.push({mode,name,selector,...area});
          if(area.visibleRatio<.99||!area.hit)await shot('操作区异常-'+mode+'-'+name);
          check(area.width>=44 && area.height>=44 && area.x>=-1 && area.y>=-1 && area.right<=width+1 && area.bottom<=height+1,`${name}${mode}${selector}按钮在屏幕内且触控尺寸足够`);
          check(area.visibleRatio>=.99,`${name}${mode}${selector}没有被父容器裁切`);
          check(area.hit && !area.disabled,`${name}${mode}${selector}中心没有遮挡且可操作`);
          await page.locator(selector).click({trial:true,timeout:5000});check(true,`${name}${mode}${selector}通过真实可点击性检查`);
        }
        if(name==='手机'||name==='桌面')await shot('05-'+mode+'-'+name+'-底部操作区');
      }
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    }

    await boot(true);
    const opening = await page.evaluate(() => ({character:__game.run.character,difficulty:__game.run.difficulty,target:__game.run.target,shots:__game.run.shots,bag:__game.tokens.bag}));
    check(opening.character==='engineer' && opening.difficulty==='storm','船员与难度选择进入真实局内状态');
    check(opening.target===405 && opening.shots===45,'风暴目标405分与45次投币生效');
    check(opening.bag.lightning===3 && opening.bag.battery===2 && opening.bag.bomb===3 && !opening.bag.cat,'工程师获得专属充能爆破起手');
    evidence.开局=opening;await shot('01-工程师风暴开局');console.log('通过：船员与难度选择');

    // 普通入口与特殊币夹分别扣减各自资源，不让已选特殊币替换普通投币。
    await page.evaluate(()=>{__game.tokens.select('lightning');__game.update(0);});
    const inputEvidence=[];
    for(const [selector,cost,label]of [['#chute-left',1,'左入口'],['#chute-right',1,'右入口'],['#dropbtn',2,'双侧同投']]) {
      const before=await page.evaluate(()=>({shots:__game.run.shots,bag:JSON.stringify(__game.tokens.bag),count:__game.coins.length}));
      await page.locator(selector).click();await page.evaluate(()=>__game.update(0));
      const after=await page.evaluate(count=>({shots:__game.run.shots,bag:JSON.stringify(__game.tokens.bag),born:__game.coins.slice(count).map(coin=>coin.kind)}),before.count);
      check(after.shots===before.shots-cost,`${label}消耗${cost}次普通投币`);
      check(after.bag===before.bag,`${label}不消耗任何特殊币库存`);
      check(after.born.length===cost && after.born.every(kind=>kind==='coin'),`${label}实际生成${cost}枚普通金币`);
      inputEvidence.push({label,before,after});
    }
    // 帧循环暂停期间直接按下键鼠，确认输入无需等下一物理帧才生效。
    const immediateEvidence=[];
    const inputSnapshot=()=>page.evaluate(()=>({shots:__game.run.shots,time:__game.time(),bag:JSON.stringify(__game.tokens.bag)}));
    try {
      await page.locator('#app canvas').focus();
      for(const [key,cost]of [['q',1],['e',1],['w',2],['Space',2]]) {
        const before=await inputSnapshot();await page.keyboard.down(key);
        const down=await inputSnapshot();await page.keyboard.up(key);const released=await inputSnapshot();
        check(down.shots===before.shots-cost,`${key}按下立即消耗${cost}次普通投币`);
        check(down.time===before.time,`${key}输入没有依赖物理帧推进`);
        check(down.bag===before.bag,`${key}输入不消耗特殊币库存`);
        check(released.shots===down.shots,`${key}抬起不重复投币`);
        immediateEvidence.push({input:key,before,down,released});
      }
      const rect=await page.locator('#app canvas').boundingBox();
      await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.3);
      for(const [button,cost]of [['left',1],['right',1],['middle',2]]) {
        const before=await inputSnapshot();await page.mouse.down({button});
        const down=await inputSnapshot();await page.mouse.up({button});const released=await inputSnapshot();
        check(down.shots===before.shots-cost,`画布鼠标${button}按下立即消耗${cost}次普通投币`);
        check(down.time===before.time,`画布鼠标${button}输入没有依赖物理帧推进`);
        check(down.bag===before.bag,`画布鼠标${button}不消耗特殊币库存`);
        check(released.shots===down.shots,`画布鼠标${button}抬起不重复投币`);
        immediateEvidence.push({input:button,before,down,released});
      }
    } finally {
      for(const key of ['q','e','w','Space'])await page.keyboard.up(key).catch(()=>{});
      for(const button of ['left','right','middle'])await page.mouse.up({button}).catch(()=>{});
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    }
    evidence.即时输入=immediateEvidence;
    const specialBefore=await page.evaluate(()=>({stock:__game.tokens.bag.lightning,count:__game.coins.length,shots:__game.run.shots}));
    await page.locator('#coin-clip button[aria-label*="闪电币"]').click();await page.evaluate(()=>__game.update(0));
    const specialAfter=await page.evaluate(count=>({stock:__game.tokens.bag.lightning,born:__game.coins.slice(count).map(coin=>coin.kind),shots:__game.run.shots}),specialBefore.count);
    check(specialAfter.stock===specialBefore.stock-1,'点击币夹实际扣减一枚所选特殊币');
    check(specialAfter.born.includes('lightning'),'点击币夹从摆槽生成真实特殊币');
    check(specialAfter.shots===specialBefore.shots,'投放特殊币只消耗库存，不扣普通币余额');
    check((await page.locator('#dropbtn').textContent()).includes('双侧同投'),'双侧操作按钮不再宣称普通中槽');
    const settlingBefore=await page.evaluate(()=>{
      const saved={phase:__game.run.phase,shots:__game.run.shots,settle:__game.run.settle};
      __game.run.shots=0;__game.run.phase='settling';__game.run.settle=15;__game.tokens.select('water');__game.update(0);
      return {saved,stock:__game.tokens.bag.water,count:__game.coins.length};
    });
    check(await page.locator('#chute-left').isDisabled() && await page.locator('#chute-right').isDisabled(),'普通次数用尽后左右普通投币按钮停用');
    await page.locator('#coin-clip button[aria-label*="水滴币"]').click();await page.evaluate(()=>__game.update(0));
    const settlingAfter=await page.evaluate(count=>({stock:__game.tokens.bag.water,shots:__game.run.shots,phase:__game.run.phase,born:__game.coins.slice(count).map(coin=>coin.kind)}),settlingBefore.count);
    check(settlingAfter.stock===settlingBefore.stock-1 && settlingAfter.born.includes('water'),'零普通次数的结算期仍能从币夹投放特殊币');
    check(settlingAfter.shots===0 && settlingAfter.phase==='settling','特殊投放保留零普通余额与结算状态');
    await shot('01b-双入口新机制-零普通币仍可投特殊币');
    await page.evaluate(saved=>{Object.assign(__game.run,saved);__game.update(0);},settlingBefore.saved);
    evidence.投币入口={ordinary:inputEvidence,specialBefore,specialAfter,settlingBefore,settlingAfter};await quiet();await shot('01c-双入口新机制-普通入口与特殊币夹');console.log('通过：双普通入口、双侧同投、独立特殊币夹与零普通次数结算');
    if(process.env.EXPERIENCE_INPUT_ONLY==='1'){
      check(errors.length===0,'输入专项没有页面错误');
      evidence.布局=await page.evaluate(()=>__game.layout());evidence.断言数=checks;evidence.页面错误=errors;
      fs.writeFileSync(path.join(output,'输入专项验证记录.json'),JSON.stringify(evidence,null,2));
      console.log(`通过：${checks}项输入专项断言。`);return;
    }

    await page.emulateMedia({reducedMotion:'no-preference'});
    const synergy = await page.evaluate(() => {
      const before=__game.experience().effects;
      const grow=__game.spawn('seed',-3.5,.3,.2),water=__game.spawn('water',-2.65,.3,.2);
      const fish=__game.spawn('fish',0,.3,1),shrimp=__game.spawn('shrimp',.8,.3,1);
      // 充能对放在独立高度，避免既有金币先耗尽闪电的有限触发次数。
      const lightning=__game.spawn('lightning',3,2.6,1),charged=__game.spawn('coin',3.8,2.6,1);
      for (const coin of [grow,water,fish,shrimp,lightning,charged]) coin.body.setEnabled(false);
      __game.stepTokens(.21);__game.update(.08);__game.render();
      return {before,after:__game.experience().effects,grown:grow.kind,fishBonus:fish.token.bonus,charged:charged.token.charged,active:__game.experience().activeEffects};
    });
    evidence.联动=synergy;
    check(synergy.grown==='tree' && synergy.after.grow>(synergy.before.grow||0),'种子与水滴实际合成摇钱树并发出演出');
    check(synergy.fishBonus>=40 && synergy.after.hunt>(synergy.before.hunt||0),'鱼吃虾实际增加币值并发出捕食演出');
    check(synergy.charged && synergy.after.charge>(synergy.before.charge||0),'闪电实际充能并发出连接演出');
    check(synergy.active>=3,'三类联动具有正在运行的台面效果');
    evidence.联动=synergy;await shot('02-台面联动与统一币面');console.log('通过：种植、捕食、充能实际联动');

    const batchBefore = await page.evaluate(() => {
      const before={batches:__game.experience().batches,score:__game.run.score};
      for (const x of [-.4,.4]) {const coin=__game.spawn('coin',x,.1,4.25);coin.body.setEnabled(false);coin.state='won';__game.onWin(coin);}
      return before;
    });
    await page.waitForFunction(count=>__game.experience().batches===count+1,batchBefore.batches,{polling:10});
    check(await page.evaluate(()=>__game.run.score)>batchBefore.score,'两枚硬币真实增加得分');
    check(await page.locator('.score-batch').count()===1,'同一短窗口合并成一条入账演出');
    check((await page.locator('.score-batch').textContent()).includes('收币 2 枚'),'汇总入账保留准确枚数');
    await shot('03-批量收币');console.log('通过：两次入账合并反馈');

    await page.emulateMedia({reducedMotion:'reduce'});await quiet();await wheelTrace();
    const triggered = await page.evaluate(() => {
      __game.comboWheel.reset();
      for(let i=0;i<8;i++) __game.comboWheel.score(__game.time());
      const early=__game.prizeWheel.active;__game.update(.91);
      return {early,active:__game.prizeWheel.active,states:[...experienceWheelStates]};
    });
    check(!triggered.early && triggered.active,'连续入账结束后才启动奖励轮');
    await wheelIdle();check(!await page.locator('#lottery').isVisible(),'普通轮盘自动收绳并隐藏');
    check((await page.evaluate(()=>experienceWheelStates)).includes('revealed'),'普通轮盘完成真实揭晓');

    await page.emulateMedia({reducedMotion:'no-preference'});
    const unpaid = await page.evaluate(key => {
      const tickets=__game.run.tickets;__game.showLottery({id:'tickets',level:2});__game.save();
      return {tickets,queued:JSON.parse(localStorage.getItem(key)).wheelQueue.filter(item=>item.id==='tickets').length};
    },saveKey);
    check(unpaid.queued===1,'未揭晓奖励进入持久化队列');
    await page.emulateMedia({reducedMotion:'reduce'});await boot();await wheelIdle();
    check(await page.evaluate(()=>__game.run.tickets)===unpaid.tickets+16,'刷新后未开奖奖励只发放一次');
    check(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).wheelQueue.length,saveKey)===0,'已领奖结果从存档待发队列移除');
    await page.evaluate(()=>__game.save());await boot();await wheelIdle();
    check(await page.evaluate(()=>__game.run.tickets)===unpaid.tickets+16,'已领奖再次刷新不重复加票');
    await wheelTrace();await page.evaluate(()=>__game.showLottery({id:'advance',level:2}));await wheelIdle();
    const advanced=await page.evaluate(()=>experienceWheelStates);
    check(advanced.filter(state=>state==='entering').length===2 && advanced.filter(state=>state==='revealed').length===2,'一级进阶实际部署并揭晓二级轮');
    check(!await page.locator('#lottery').isVisible(),'二级轮结束后完全收起');
    evidence.奖励恢复={unpaid,advanced};console.log('通过：轮盘节奏、二级奖励与刷新幂等');

    // 以下设置目标分，仅验证八关状态、商店和结算串联，不把它当作平衡通关。
    for(let round=1;round<=8;round++) {
      check(await page.evaluate(()=>__game.run.round)===round,`进入第${round}关`);
      await page.evaluate(()=>{__game.run.score=__game.run.target;__game.finishRound();__game.update(0);});
      if(round===8)break;
      check(await page.evaluate(()=>__game.run.phase)==='shop',`第${round}关打开补给舱`);
      check(await page.locator('#pick-cards button').count()===3,`第${round}关提供三选一`);
      await page.locator('#pick-cards button').first().click();check(await page.evaluate(()=>__game.run.picked),`第${round}关记录所选航路牌`);
      if(round===1) {
        await page.locator('#harbor-supplies-link').click();
        const cash=await page.evaluate(()=>__game.run.cash);
        await page.locator('.claim-pack:not(:disabled)').first().click();
        check(await page.evaluate(()=>__game.tokens.claimed && __game.run.cash)===cash,'免费补给真实入舱且不扣贝壳');
        await page.locator('#shop-tab-upgrades').click();
        const available=page.locator('.upgrade-card .buy-button:not(:disabled)').first();
        if(await available.count()){await available.click();check(await page.evaluate(()=>__game.run.cash)<cash,'机台改装真实扣款');}
        await shot('04-构筑与补给货架');
        await actionBounds('商店');
      }
      await page.locator('#next-round').click();await quiet();await page.evaluate(()=>__game.update(0));
    }
    check(await page.evaluate(()=>__game.run.phase)==='victory','第八关进入通关状态');
    check(await page.locator('#voyage-report').isVisible(),'展示真实局内航海战报');
    check(await page.locator('#continue-endless').isVisible(),'通关后提供保留构筑的无尽入口');
    const completed=await page.evaluate(()=>__game.experience().journal);
    check(completed.runs===1 && completed.wins===1 && completed.reports.length===1,'一局通关只累计一次历史与胜利');
    check(completed.unlocks.includes('first-clear') && completed.unlocks.includes('storm-clear'),'真实通关条件解锁相应纪念章');
    await shot('05-八关流程战报');
    await actionBounds('通关');
    await page.evaluate(()=>{__game.save();__game.save();__game.update(0);});
    check(await page.evaluate(()=>__game.experience().journal.runs)===1,'重复保存与渲染不重复统计同一局');
    await page.locator('#continue-endless').click();
    check(await page.evaluate(()=>__game.run.endless && __game.run.phase==='shop'),'无尽入口保留构筑并返回补给舱');
    await page.locator('#next-round').click();await quiet();await page.evaluate(()=>{__game.update(0);__game.save();});
    check(await page.evaluate(()=>__game.run.round===9 && __game.run.endless),'真实进入第九关无尽航路');
    const endless=await page.evaluate(()=>({id:__game.run.id,target:__game.run.target,levels:{...__game.run.levels},shots:__game.run.shots}));
    await boot();
    check(await page.evaluate(expected=>__game.run.round===9 && __game.run.endless && __game.run.id===expected.id && __game.run.target===expected.target && __game.run.shots===expected.shots,endless),'无尽第九关刷新恢复同一局进度');
    check(await page.evaluate(()=>__game.experience().journal.runs===1 && __game.experience().journal.wins===1),'无尽续航与刷新不会多算一局');
    evidence.通关=completed;evidence.无尽=endless;console.log('通过：八关状态流程、战报、无尽续航与历史去重');

    for(const [name,width,height]of sizes) {
      await page.setViewportSize({width,height});await page.waitForTimeout(120);await page.evaluate(()=>{__game.update(0);__game.render();});
      const bounds=await page.evaluate(()=>['app','token-open','coin-clip','chute-left','dropbtn','chute-right','exchange-btn','shake-btn'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}));
      for(const item of bounds){check(item.width>0 && item.height>0 && item.x>=-1 && item.y>=-1 && item.right<=width+1 && item.bottom<=height+1,`${name}控件未越界：${item.id}`);if(!['app','coin-clip'].includes(item.id))check(item.width>=44 && item.height>=44,`${name}触控区域至少44像素：${item.id}`);}
      check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),`${name}没有横向溢出`);
      await shot('06-'+name+'-无尽机台');
      await page.locator('#token-open').click();await shot('07-'+name+'-币仓');await page.locator('#token-close').click();
    }
    check(errors.length===0,'所有浏览器场景没有页面运行错误：'+errors.join('；'));
    evidence.断言数=checks;evidence.页面错误=errors;
    fs.writeFileSync(path.join(output,'集成验证记录.json'),JSON.stringify(evidence,null,2));
    console.log(`通过：${checks} 项 v4 体验集成断言。截图目录：${output}`);
    await context.close();
  } catch(error) {
    fs.writeFileSync(path.join(output,'失败记录.json'),JSON.stringify({checks,errors,message:error.message,stack:error.stack,evidence},null,2));
    throw error;
  } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
