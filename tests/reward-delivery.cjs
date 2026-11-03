const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');
const browserPath = require('./browser-path.cjs');

// 固定台面并手动推进模拟时钟，只验证奖励守恒与存档幂等，不代表平衡试玩。
const saveKey = 'raccoon-pusher-run-v2';
const artifact = path.join(__dirname, '..', 'dist', 'raccoon-coin-pusher.html');
const html = fs.readFileSync(artifact);
const errors = [];
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };

(async () => {
  let browser, context, page;
  const server = http.createServer((request, response) => {
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    response.end(html);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(8795, '127.0.0.1', resolve);
  });
  try {
    browser = await chromium.launch({executablePath: browserPath, headless: true,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});

    async function freshContext() {
      await context?.close();
      context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
      page = await context.newPage();
      page.setDefaultTimeout(60000);
      page.on('pageerror', error => errors.push(error.message));
      await boot();
      const initial = await page.evaluate(() => __game.coins.map(coin => ({
        uid: coin.token.uid, kind: coin.kind, state: coin.state, y: coin.body.translation().y,
      })));
      check(initial.every(coin => coin.y >= -.4),
        '初始预热台面没有已经越过入账高度的实体：' + JSON.stringify(initial.filter(coin => coin.y < -.4)));
    }
    async function boot() {
      await page.goto('http://127.0.0.1:8795/');
      await page.waitForFunction(() => window.__game && typeof __game.experience === 'function' && typeof __game.time === 'function');
      await page.evaluate(() => {
        __game.pause(true);
        // 刷新会恢复动态刚体，所以每次恢复后都在开始与推进前重新固定。
        for (const coin of __game.coins) if(coin.state==='field')coin.body.setBodyType(1, true);
        __game.start();
      });
    }
    async function fill(count) {
      return page.evaluate(target => {
        while (__game.coins.length < target) {
          const i = __game.coins.length;
          const coin = __game.spawn('coin', -4 + (i % 9), .25, -2 + Math.floor(i / 9) % 5);
          if (!coin) throw new Error('台面尚有空位时补币失败');
          coin.body.setBodyType(1, true);
        }
        for (const coin of __game.coins) coin.body.setBodyType(1, true);
        return {coins: __game.coins.length, fixed: __game.coins.every(coin => coin.body.bodyType() === 1),
          tickets: __game.run.tickets, score: __game.run.score, shots: __game.run.shots, time: __game.time()};
      }, count);
    }
    async function snapshot() {
      return page.evaluate(key => ({coins: __game.coins.length, tickets: __game.run.tickets,
        score: __game.run.score, shots: __game.run.shots, time: __game.time(),
        banked: __game.run.stats.banked,
        coinStates: __game.coins.map(coin => ({uid: coin.token.uid, kind: coin.kind, state: coin.state, y: coin.body.translation().y})),
        pending: __game.experience().pendingDeliveries, wheel: __game.prizeWheel.state,
        saved: JSON.parse(localStorage.getItem(key))}), saveKey);
    }
    async function advance(seconds) {
      await page.evaluate(duration => {
        const frames = Math.round(duration / .05);
        for (let i = 0; i < frames; i++) {
          __game.update(.05);
          // 固定已交付金币，不阻止底阀中的运动学装塔；物理推动由专门集成测试覆盖。
          for(const coin of __game.coins)if(coin.state==='field')coin.body.setBodyType(1,true);
        }
        __game.save();
      }, seconds);
      return snapshot();
    }
    async function reveal() {
      await page.waitForFunction(() => __game.prizeWheel.state === 'revealed', null, {polling: 10, timeout: 20000});
    }

    await freshContext();
    const full = await fill(420);
    check(full.coins === 420 && full.fixed, '满台场景真实存在420个固定刚体');
    const unpaid = await page.evaluate(key => {
      __game.showLottery({id: 'coins50', level: 5});
      // 暂停这一次浏览器动画，在真实未揭晓阶段保存；刷新后按减少动态效果正常开奖。
      for (const animation of document.getElementById('lottery').getAnimations({subtree: true})) animation.pause();
      __game.save();
      return {pending: __game.experience().pendingDeliveries, saved: JSON.parse(localStorage.getItem(key))};
    }, saveKey);
    check(unpaid.pending === 0 && unpaid.saved.wheelQueue.length === 1, '未揭晓金币雨只保存轮盘承诺，尚未生成待发金币');
    await boot();
    await reveal();
    const revealed = await snapshot();
    check(revealed.pending === 250 && revealed.saved.showerQueue.length === 250, '刷新后金币50乘5揭晓为完整250枚待发队列');
    check(revealed.coins === 420 && revealed.tickets === full.tickets, '满台揭晓时尚未偷生成金币或提前加票');
    check(revealed.saved.wheelQueue.length === 0, '已揭晓奖励从轮盘待发存档移除');
    await page.evaluate(() => __game.save());
    await boot();
    const restored = await snapshot();
    check(restored.pending === 250 && restored.saved.showerQueue.length === 250, '已揭晓250枚保存刷新后不被旧版100枚截断');
    check(restored.tickets === full.tickets && restored.saved.wheelQueue.length === 0, '刷新已揭晓队列不重复发放一次金币雨');

    const partlyConverted = await advance(6.2);
    const partialTickets = partlyConverted.tickets - full.tickets;
    check(partialTickets > 0 && partlyConverted.pending > 0, '满台等待六秒后开始折票，错峰尚未到期的金币继续排队');
    check(partialTickets + partlyConverted.pending === 250, '部分折票时已得票数与待发金币合计始终为250');
    check(partlyConverted.coins === 420 && partlyConverted.score === full.score && partlyConverted.shots === full.shots,
      '固定台面模拟不会靠自然掉币、得分或投币消耗改变守恒基线');
    check(partlyConverted.saved.showerQueue.length === partlyConverted.pending, '部分折兑后的剩余队列完整写入存档');
    await boot();
    const partialReload = await snapshot();
    check(partialReload.pending === partlyConverted.pending && partialReload.tickets === partlyConverted.tickets,
      '部分折兑刷新后保留准确的剩余数量与已得票数：' + JSON.stringify({
        before: {pending: partlyConverted.pending, tickets: partlyConverted.tickets, time: partlyConverted.time},
        after: {pending: partialReload.pending, tickets: partialReload.tickets, time: partialReload.time}
      }));
    const fullyConverted = await advance(7);
    check(fullyConverted.pending === 0 && fullyConverted.tickets - full.tickets === 250, '满台金币雨最终完整折为250票且没有待发残留');
    check(fullyConverted.coins === 420, '折票没有越过420物体上限');
    await boot();
    const noDoubleRain = await advance(1);
    check(noDoubleRain.pending === 0 && noDoubleRain.tickets === fullyConverted.tickets, '全部折兑后刷新与继续模拟均不重复发奖');
    console.log('通过：250枚金币雨的未揭晓恢复、完整队列恢复、满台折票与刷新幂等');

    await freshContext();
    const towerStart = await fill(410);
    const towerBefore = await page.evaluate(() => ({uids: __game.coins.map(coin => coin.token.uid), effects: __game.experience().effects.tower || 0}));
    await page.evaluate(() => __game.showLottery({id: 'tower', level: 1}));
    await reveal();
    const towerResult = await page.evaluate(before => {
      const old = new Set(before.uids), generated = __game.coins.filter(coin => !old.has(coin.token.uid));
      for (const coin of __game.coins) if(coin.state==='field')coin.body.setBodyType(1, true);
      __game.save();
      return {coins: __game.coins.length, generated: generated.length, allCoins: generated.every(coin => coin.kind === 'coin'),
        tickets: __game.run.tickets, pending: __game.experience().pendingDeliveries,
        towerEffects: __game.experience().effects.tower || 0};
    }, towerBefore);
    check(towerResult.coins === 420 && towerResult.generated === 10 && towerResult.allCoins, '剩10空位时42枚币塔实际生成10枚硬币');
    check(towerResult.tickets - towerStart.tickets === 32, '币塔无法容纳的32枚逐枚折为兑币票');
    check(towerResult.pending === 0 && towerResult.towerEffects > towerBefore.effects, '币塔产生真实演出且没有额外待发副本');
    check(towerResult.generated + towerResult.tickets - towerStart.tickets === 42, '币塔的实体金币与折票总计守恒为42枚');
    await boot();
    const restoredTower = await snapshot();
    check(restoredTower.coins === 420 && restoredTower.tickets === towerResult.tickets && restoredTower.pending === 0,
      '币塔保存刷新后保留10枚实体与32票，不重新支付');
    check(restoredTower.saved.wheelQueue.length === 0, '已揭晓币塔不会留在轮盘恢复队列');
    const noDoubleTower = await advance(6.2);
    check(noDoubleTower.coins === 420 && noDoubleTower.tickets === towerResult.tickets && noDoubleTower.pending === 0,
      '币塔恢复后继续推进也不会重复支付：' + JSON.stringify({
        before: {coins: restoredTower.coins, tickets: restoredTower.tickets, pending: restoredTower.pending,
          score: restoredTower.score, banked: restoredTower.banked,
          suspects: restoredTower.coinStates.filter(coin => coin.y < -.35 || coin.state !== 'field')},
        after: {coins: noDoubleTower.coins, tickets: noDoubleTower.tickets, pending: noDoubleTower.pending,
          score: noDoubleTower.score, banked: noDoubleTower.banked,
          suspects: noDoubleTower.coinStates.filter(coin => coin.y < -.35 || coin.state !== 'field')},
        removed: restoredTower.coinStates.filter(coin => !noDoubleTower.coinStates.some(after => after.uid === coin.uid)),
      }));
    check(errors.length === 0, '无浏览器页面错误：' + errors.join('；'));
    console.log(`PASS: ${checks} 项奖励守恒与存档幂等断言`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await context?.close();
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode = 1;});
