const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const load=f=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(f)).toString('base64'));
const {ComboWheel,COMBO_THRESHOLDS}=await load('src/combo-wheel.js');const rewards=await load('src/stage-rewards.js');let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++};
const c=new ComboWheel();
for(let i=0;i<20;i++){c.score(i);check(c.tick(i+.91)===0,'isolated scores do not bank a spin');}
for(const [level,threshold]of COMBO_THRESHOLDS.entries()){
 c.reset();for(let i=0;i<threshold;i++)c.score(i*.05);
 check(c.level===level+1,'threshold tier '+threshold);check(c.tick(c.last+.89)===0,'not before chain ends');
 check(c.tick(c.last+.91)===level+1,'one end-of-chain spin');check(c.tick(1000)===0,'no duplicate');
}
c.score(0,1000);check(c.level===5,'caps at x5');c.reset();check(c.level===0&&c.count===0,'reset breaks chain');
for(const bad of [null,{}, {id:'unknown'}])check(rewards.normalizeWheelItem(bad)===null,'reject unknown queued rewards');
check(rewards.normalizeWheelItem({id:'tower',level:900}).level===5,'clamp queued multiplier');
check(rewards.normalizeWheelItem({id:'tower',level:-1}).level===1,'positive queued multiplier');
check(rewards.LOTTERY.length===4&&rewards.BONUS_LOTTERY.length===4,'four-sector base and bonus wheels');
check(rewards.LOTTERY.some(x=>x.advance),'base wheel can advance');
for(let i=0;i<100;i++)check(rewards.BONUS_LOTTERY.includes(rewards.spinBonusLottery(()=>i/100)),'bonus stays in second wheel');
console.log(`PASS: ${checks} combo/wheel queue assertions`);
})().catch(e=>{console.error(e);process.exit(1)});
