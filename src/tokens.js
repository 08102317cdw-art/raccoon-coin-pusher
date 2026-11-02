// Original implementation and balancing inspired by the coin-synergy genre.
// Pure rules: no renderer/physics dependency. Effects use a small adapter interface.
const def=(name,glyph,color,base,group,desc,cost=4)=>({name,glyph,color,base,group,desc,cost});
export const TOKENS=Object.freeze({
 seed:def('种子币','芽','#79bd72',15,'种植','接触水滴币：消耗水滴，自己长成摇钱树。'),
 water:def('水滴币','水','#5acde6',10,'种植','接触种子即可浇水；也能给已充能币传导一次充能。'),
 tree:def('摇钱树币','树','#48ac86',70,'种植','每 8 秒掉一枚普通金币，每关最多 6 枚；由种子成长，不直接出售。'),
 fish:def('鱼鱼币','鱼','#6aa4eb',35,'捕食','接触虾米，吃掉后自身基础分 +40（最多 4 次）；入账时掉落 2 枚水滴币。'),
 cat:def('猫猫币','猫','#d69cd7',40,'捕食','追猎附近鱼鱼 / 鼠鼠币：每只自身基础分 +60、贝壳 +1；每关最多 4 次。'),
 rat:def('鼠鼠币','鼠','#b3a1ce',15,'捕食','接触普通币时吃掉它，自身基础分 +10；每关最多 4 枚。小心猫猫！'),
 hen:def('母鸡币','鸡','#f1be77',35,'孵化','留在台面进入下一关，产出 2 枚蛋蛋币；被公鸡触碰还可额外产 1 枚。'),
 egg:def('蛋蛋币','卵','#e9e3bb',15,'孵化','台面保留到下一关时孵化为母鸡，可继续产蛋。'),
 rooster:def('公鸡币','鸣','#e69775',40,'孵化','接触母鸡使其额外产蛋，每只母鸡每关最多触发 1 次。'),
 clover:def('幸运草币','幸','#7bd4a4',20,'增幅','在台面时，全局倍率额外 +0.05；最多计入 5 枚。入账后加成消失。'),
 multi:def('倍率币','×','#e4a0d0',30,'增幅','触碰好币使其币值 ×1.5；每枚目标仅接受一次，不反复叠乘。'),
 lightning:def('闪电币','雷','#e9d66c',25,'充能','触碰好币使其充能，币值额外 ×1.25；最多释放 6 次。'),
 battery:def('蓄电池币','电','#97ccdc',30,'充能','吸收附近币的充能，每次自身基础分 +20；最多 6 次。'),
 magnet:def('磁铁币','磁','#bd9bdf',30,'物理','每秒轻拉附近好币向自己聚拢；不吸坏币，可帮种植与充能接触。'),
 bomb:def('爆破币','爆','#e3a07b',40,'物理','投入时把全场硬币轰向前沿；从前沿入账时再炸开周围币，并可引爆附近爆破币。'),
 echo:def('回响币','回','#91c6e3',25,'增幅','入账时复制上一个入账的非回响特殊好币；没有记录则复制普通币。复制品不返还投币额度。'),
 relic:def('遗迹币','古','#d8c487',30,'成长','在台面上跨过每一关，自身基础分永久 +20，最多累积 +140。'),
 shrimp:def('虾米币','虾','#ecb6b2',20,'捕食','鱼鱼的食物。与鱼鱼接触会被吃掉，让鱼鱼基础分 +40。'),
 killer:def('杀手币','斩','#99dce1',30,'净化','自动清除 2.3 范围内坏币，每枚贝壳 +1；累计 6 次后自己消耗。'),
 rust:def('锈蚀坏币','锈','#c57c60',0,'坏币','留在台面时全局倍率 -10%，最多叠 3 枚；入账扣 40 分，不会扣成负数。',0),
 thief:def('盗壳坏币','盗','#b090b4',0,'坏币','每 6 秒偷 1 贝壳，每关最多 3 次；入账扣 60 分。',0),
 decay:def('腐蚀坏币','蚀','#a4bb6a',0,'坏币','接触普通币每 6 秒腐蚀 1 枚，每关最多 3 次；入账扣 80 分。',0),
});
export const SPECIAL_IDS=Object.freeze(Object.keys(TOKENS).filter(k=>TOKENS[k].group!=='坏币'));
export const BAD_IDS=Object.freeze(['rust','thief','decay']);
export const isBad=k=>BAD_IDS.includes(k);
const starter={seed:2,water:3,fish:1,cat:1,rat:2,hen:1,egg:1,rooster:1,clover:1,multi:1,lightning:1,battery:1,magnet:1,bomb:1,echo:1,relic:1,shrimp:2,killer:2};
export const CREW=Object.freeze({
 gardener:{name:'潮汐园丁',group:'种植',pack:'garden',color:'#8bc793',desc:'让海湾长出一座金币花园。',passive:'摇钱树每 6 秒产币，每关最多 8 枚；跨关补给种子与水滴。',starter:{seed:3,water:4,clover:1,magnet:1,killer:2},key:['seed','water'],upgrade:'irrigation'},
 keeper:{name:'湾区饲育员',group:'捕食',pack:'food',color:'#e8bc85',desc:'把小虾养成一枚值得收割的大币。',passive:'猫额外继承猎物 50% 的成长币值；跨关补给虾米与鱼鱼。',starter:{shrimp:4,fish:3,cat:2,rat:2,killer:2},key:['shrimp','fish','cat'],upgrade:'predator'},
 engineer:{name:'浪涌技师',group:'充能',pack:'power',color:'#99d6e5',desc:'布下电网，再用爆破收割整个台面。',passive:'充能币值 ×1.5，爆破连锁半径更大；跨关补给闪电与水滴。',starter:{lightning:3,water:3,battery:2,bomb:3,magnet:1,killer:2},key:['lightning','water','battery','bomb'],upgrade:'capacitor'},
});
export const PACKS=Object.freeze({
 garden:{name:'种植补给',items:{seed:1,water:2},cost:4},
 food:{name:'食物链补给',items:{shrimp:2,fish:1,cat:1},cost:5},
 hunt:{name:'猫鼠补给',items:{cat:1,rat:2},cost:4},
 hatch:{name:'孵化补给',items:{hen:1,egg:2,rooster:1},cost:5},
 power:{name:'充能补给',items:{lightning:1,battery:1,water:1},cost:5},
 boost:{name:'增幅补给',items:{clover:1,multi:1,echo:1},cost:6},
 force:{name:'物理补给',items:{magnet:1,bomb:2},cost:5},
 growth:{name:'成长补给',items:{relic:2,multi:1},cost:5},
 clean:{name:'净化补给',items:{killer:2,water:1},cost:4},
});
const n=(v,max=999999)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function cleanMeta(m={}) {
 return {uid:n(m.uid),age:Number.isFinite(m.age)?Math.max(0,Math.min(1e5,m.age)):0,bonus:n(m.bonus,1e8),kills:n(m.kills,6),hunts:n(m.hunts,4),eaten:n(m.eaten,4),emits:n(m.emits,12),absorbed:n(m.absorbed,12),produced:n(m.produced,12),steals:n(m.steals,3),corroded:n(m.corroded,3),multiplied:!!m.multiplied,charged:!!m.charged,conducted:!!m.conducted,roosterRound:n(m.roosterRound,1e9),pulse:Number.isFinite(m.pulse)?Math.max(0,Math.min(60,m.pulse)):0,generation:n(m.generation,1)};
}
const field=e=>e.state==='field'&&!e.tokenDead&&e.p.y>=-.25&&e.p.y<=3.05&&Math.abs(e.p.x)<=5.25&&e.p.z<=4.15;
const dist=(a,b)=>Math.hypot(a.p.x-b.p.x,a.p.z-b.p.z,(a.p.y-b.p.y)*1.5);
const good=e=>!isBad(e.kind);
const effect=(type,source,target=source,extra={})=>({type,sourceId:source.token?.uid,targetId:target.token?.uid,sourceKind:source.kind,targetKind:target.kind,from:{...source.p},to:{...target.p},...extra});
export class TokenSystem {
 constructor(saved,options={}) {
  this.character=CREW[options.character]?options.character:'classic';this.levels={};this.pressure=1;
  this.stats={grows:0,hunts:0,charges:0,produced:0,explosions:0};this.discovered=[];
  this.bag={...(CREW[this.character]?.starter||starter)};this.selected='coin';this.uid=0;this.roundStamp=1;this.dropCount=0;this.lastGood='coin';this.claimed=false;this.packBought=[];this.shopStamp=0;this.shopOffers=[];this.eventLog=[];
  this.clip=CREW[this.character]?.key.slice(0,2)||[];this.clipSize=2;
  if(saved&&typeof saved==='object') {
   this.character=CREW[saved.character]?saved.character:'classic';
   for(const key of Object.keys(this.stats))this.stats[key]=n(saved.stats?.[key],1e9);
   this.discovered=(Array.isArray(saved.discovered)?saved.discovered:[]).filter(id=>id==='coin'||TOKENS[id]);
   this.bag={};for(const id of SPECIAL_IDS)if(id!=='tree')this.bag[id]=n(saved.bag?.[id],99);
   this.selected=saved.selected==='coin'||this.bag[saved.selected]>0?saved.selected:'coin';
   this.uid=n(saved.uid);this.roundStamp=n(saved.roundStamp,1e9)||1;this.dropCount=n(saved.dropCount,1000);this.lastGood=SPECIAL_IDS.includes(saved.lastGood)&&!['echo','tree','killer'].includes(saved.lastGood)?saved.lastGood:'coin';
   this.claimed=!!saved.claimed;this.shopStamp=n(saved.shopStamp,1e9);this.shopOffers=(saved.shopOffers||[]).filter(k=>PACKS[k]).slice(0,3);this.packBought=(saved.packBought||[]).filter(k=>PACKS[k]);
   this.clipSize=Math.min(4,Math.max(2,n(saved.clipSize,4)||2));
   this.clip=(Array.isArray(saved.clip)?saved.clip:[]).filter(id=>SPECIAL_IDS.includes(id)&&id!=='tree'&&this.bag[id]>0).slice(0,this.clipSize);
   if(!this.clip.length&&this.selected!=='coin')this.clip=[this.selected];
  }
 }
 configure(run){
  if(!run)return;this.character=CREW[run.character]?run.character:'classic';
  for(const id of ['irrigation','predator','capacitor'])this.levels[id]=n(run.level?.(id)??run.levels?.[id],3);
  this.pressure=Number.isFinite(run.pressure)?Math.max(.5,Math.min(2,run.pressure)):1;
 }
 buildInfo(){
  const crew=CREW[this.character];
  if(!crew)return {name:'海湾自由构筑',group:'自由',passive:'自由组合各种特殊币。',missing:[],hint:'种子遇水可长树；鱼吃虾、猫吃鱼；水滴可连接充能。',pack:''};
  const missing=crew.key.filter(id=>!(this.bag[id]>0)).map(id=>TOKENS[id].name);
  return {name:crew.name,group:crew.group,passive:crew.passive,missing,hint:missing.length?`优先补齐：${missing.join('、')}`:`${crew.group}组件已备齐，寻找${{gardener:'回流水渠',keeper:'食物链',engineer:'浪涌线圈'}[this.character]}。`,pack:crew.pack};
 }
 recommendPack(id){
  const crew=CREW[this.character],pack=PACKS[id];if(!pack)return '';
  if(crew?.pack===id)return `本航路补给 · ${this.buildInfo().hint}`;
  const missing=Object.keys(pack.items).filter(k=>!(this.bag[k]>0)&&crew?.key.includes(k));
  return missing.length?`补齐 ${missing.map(k=>TOKENS[k].name).join('、')}`:'';
 }
 get remaining(){return Object.values(this.bag).reduce((a,b)=>a+b,0);}
 select(id){if(id!=='coin'&&!(this.bag[id]>0))return false;this.selected=id;if(id!=='coin'&&!this.clip.includes(id)){if(this.clip.length<this.clipSize)this.clip.push(id);else this.clip[this.clip.length-1]=id;}return true;}
 armClip(index){const id=this.clip[index];if(!id)return false;return this.select(id);}
 setClipSize(size){this.clipSize=Math.max(2,Math.min(4,size|0));this.clip=this.clip.filter(id=>this.bag[id]>0).slice(0,this.clipSize);}
 consume(){let id=this.selected;if(id!=='coin'&&!(this.bag[id]>0))id='coin';if(id!=='coin'){this.bag[id]--;if(!this.bag[id]){this.selected='coin';this.clip=this.clip.filter(k=>k!==id);}}this.dropCount++;return id;}
 grant(items){for(const [k,v]of Object.entries(items))if(SPECIAL_IDS.includes(k)&&k!=='tree')this.bag[k]=Math.min(99,(this.bag[k]||0)+n(v,20));}
 prepareShop(round){if(this.shopStamp===round)return;const ids=Object.keys(PACKS).filter(k=>k!=='clean'),offset=(round-1)*2%ids.length;this.shopOffers=[ids[offset],ids[(offset+1)%ids.length],'clean'];const preferred=CREW[this.character]?.pack;if(preferred&&!this.shopOffers.includes(preferred))this.shopOffers[0]=preferred;this.shopStamp=round;this.claimed=false;this.packBought=[];}
 buyPack(id,run){if(run.phase!=='shop'||!this.shopOffers.includes(id)||this.packBought.includes(id)||run.cash<PACKS[id].cost)return false;run.cash-=PACKS[id].cost;this.grant(PACKS[id].items);this.packBought.push(id);return true;}
 claimPack(id,run){if(run.phase!=='shop'||this.claimed||!this.shopOffers.includes(id))return false;this.grant(PACKS[id].items);this.claimed=true;return true;}
 meta(e){if(!e.token)e.token=cleanMeta();if(!e.token.uid)e.token.uid=++this.uid;else this.uid=Math.max(this.uid,e.token.uid);if(!this.discovered.includes(e.kind))this.discovered.push(e.kind);return e.token;}
 log(text){this.eventLog.unshift(text);this.eventLog.length=Math.min(5,this.eventLog.length);}
 emit(a,text,source,type='info',target=source,extra={}){this.log(text);const key={grow:'grows',hunt:'hunts',charge:'charges',produce:'produced',explode:'explosions'}[type];if(key)this.stats[key]++;a.notify(text,source.p,effect(type,source,target,extra));}
 globalFactor(entities){let clover=0,rust=0;for(const e of entities)if(field(e)){if(e.kind==='clover')clover++;if(e.kind==='rust')rust++;}return (1+Math.min(5,clover)*.05)*(1-Math.min(3,rust)*.1);}
 value(e){const m=this.meta(e),base=TOKENS[e.kind]?.base||0;return Math.round((base+m.bonus)*(m.multiplied?1.5:1)*(m.charged?(this.character==='engineer'?1.5:1.25):1));}
 scoreBase(e,plainBase){const m=this.meta(e);return Math.round(((TOKENS[e.kind]?.base??plainBase)+m.bonus)*(m.multiplied?1.5:1)*(m.charged?(this.character==='engineer'?1.5:1.25):1));}
 // Adapter: spawn(kind, p, meta?), remove(entity), change(entity,kind), shells(delta),
 // push(entity,vector), notify(text,p). Bounded triggers prevent runaway breeding.
 tick(dt,entities,a){
  const active=entities.filter(field),positive=active.filter(good),bad=active.filter(e=>isBad(e.kind));
  for(const e of active){const m=this.meta(e);m.age+=dt;m.pulse+=dt;}
  const alive=e=>!e.tokenDead&&e.state==='field';
  const remove=e=>{if(!alive(e))return;e.tokenDead=true;a.remove(e);};
  const say=(s,e,type='info',target=e,extra={})=>this.emit(a,s,e,type,target,extra);
  // Purification has priority: a killed bad coin cannot steal or corrode this tick.
  for(const k of positive.filter(e=>e.kind==='killer')){
   const m=this.meta(k);
   for(const b of bad)if(alive(k)&&alive(b)&&m.kills<6&&dist(k,b)<2.3){remove(b);m.kills++;a.shells(1);say('杀手净化 · 贝壳 +1',k);}
   if(m.kills>=6){say('杀手币完成 6 次净化',k);remove(k);}
  }
  for(const e of active){if(!alive(e))continue;const m=this.meta(e);
   const near=(radius,filter)=>active.filter(t=>t!==e&&alive(t)&&dist(e,t)<radius&&filter(t));
   const touch=filter=>near(1.28,t=>Math.abs(t.p.y-e.p.y)<.65&&filter(t));
   if(e.kind==='seed'){
    const water=touch(t=>t.kind==='water')[0];if(water){remove(water);a.change(e,'tree');m.age=0;m.pulse=0;say('种子 + 水滴 → 摇钱树',water,'grow',e,{result:'tree'});}
   }else if(e.kind==='tree'&&m.pulse>=Math.max(3,(this.character==='gardener'?6:8)-(this.levels.irrigation||0))&&m.produced<(this.character==='gardener'?8:6)){
    const born=a.spawn('coin',{...e.p,y:e.p.y+1});if(born===null)continue;
    m.pulse=0;m.produced++;say('摇钱树掉落金币',e,'produce',born||e);
    if(this.levels.irrigation&&m.produced%3===0){const water=a.spawn('water',{x:e.p.x+.65,y:e.p.y+1,z:e.p.z});say('回流水渠 · 产出水滴',e,'produce',water||e,{result:'water'});}
   }else if(e.kind==='fish'&&m.eaten<4){const food=touch(t=>t.kind==='shrimp')[0];if(food){remove(food);m.eaten++;m.bonus+=40;say('鱼吃虾 · 币值 +40',e,'hunt',food,{bonus:40});}
   }else if(e.kind==='cat'&&m.hunts<4&&m.pulse>=.8){const prey=near(2.1,t=>t.kind==='rat'||t.kind==='fish')[0];if(prey){
    const inherited=Math.round(this.meta(prey).bonus*Math.min(1,(this.character==='keeper'?.5:0)+(this.levels.predator||0)*.25));
    remove(prey);m.hunts++;m.bonus=Math.min(1e8,m.bonus+60+inherited);m.pulse=0;a.shells(1);say(`猫猫捕食 · +${60+inherited} 币值 / +1 贝壳`,e,'hunt',prey,{bonus:60+inherited});
    if(this.levels.predator===3)a.spawn('shrimp',{...e.p,y:e.p.y+1});
   }
   }else if(e.kind==='rat'&&m.eaten<4&&m.pulse>=1){const prey=touch(t=>t.kind==='coin')[0];if(prey){remove(prey);m.eaten++;m.bonus+=10;m.pulse=0;say('鼠鼠藏币 · 币值 +10',e);}
   }else if(e.kind==='rooster'){
    for(const h of touch(t=>t.kind==='hen')){const hm=this.meta(h);if(hm.roosterRound!==this.roundStamp){hm.roosterRound=this.roundStamp;const egg=a.spawn('egg',{...h.p,y:h.p.y+1});say('公鸡唤醒 · 额外产蛋',h,'produce',egg||h,{result:'egg'});}}
   }else if(e.kind==='multi'){
    for(const t of touch(t=>good(t)&&t.kind!=='multi')){const tm=this.meta(t);if(!tm.multiplied){tm.multiplied=true;say('倍率印记 · 币值 ×1.5',t);}}
   }else if(e.kind==='lightning'&&m.emits<6+Math.min(3,this.levels.capacitor||0)){
    let last=e;const budget=6+Math.min(3,this.levels.capacitor||0);
    for(const t of touch(t=>good(t)&&t.kind!=='lightning'&&t.kind!=='battery')){const tm=this.meta(t);if(!tm.charged&&m.emits<budget){tm.charged=true;m.emits++;last=t;say(`闪电充能 · 币值 ×${this.character==='engineer'?'1.5':'1.25'}`,e,'charge',t);}}
    if(last!==e)for(let i=0;i<(this.levels.capacitor||0)&&m.emits<budget;i++){
     const target=positive.find(t=>t!==e&&t!==last&&alive(t)&&!this.meta(t).charged&&!['lightning','battery'].includes(t.kind)&&dist(last,t)<1.65);
     if(!target)break;this.meta(target).charged=true;m.emits++;say('浪涌跳电',last,'charge',target);last=target;
    }
   }else if(e.kind==='water'&&!m.conducted){
    const source=touch(t=>this.meta(t).charged)[0];if(source){const target=touch(t=>good(t)&&!this.meta(t).charged&&t!==source)[0];if(target){this.meta(target).charged=true;m.conducted=true;say('水滴传导充能',source,'charge',target,{via:{...e.p}});}}
   }else if(e.kind==='battery'&&m.absorbed<6){
    for(const t of near(1.9,t=>good(t)&&this.meta(t).charged)){if(m.absorbed>=6)break;this.meta(t).charged=false;m.absorbed++;m.bonus+=20;say('电池蓄能 · 币值 +20',t,'charge',e,{absorb:true});}
   }else if(e.kind==='magnet'&&m.pulse>=1){m.pulse=0;for(const t of near(2.8,good)){const dx=e.p.x-t.p.x,dz=e.p.z-t.p.z,d=Math.max(.4,Math.hypot(dx,dz));a.push(t,{x:dx/d*.11,y:0,z:dz/d*.11});}
   }else if(e.kind==='thief'&&m.pulse>=6&&m.steals<3){m.pulse=0;m.steals++;a.shells(-1);say('盗壳坏币 · 偷走最多 1 贝壳',e);
   }else if(e.kind==='decay'&&m.pulse>=6&&m.corroded<3){const prey=touch(t=>t.kind==='coin')[0];if(prey){remove(prey);m.corroded++;m.pulse=0;say('腐蚀坏币吞掉普通币',e);}}
  }
 }
 startStage(round,entities,a){
  if(round<=this.roundStamp)return false;this.roundStamp=round;this.dropCount=0;
  this.grant({killer:1});
  const supply={gardener:{seed:1,water:2},keeper:{shrimp:2,fish:1},engineer:{lightning:1,water:1}}[this.character];
  if(supply)this.grant(supply);
  const active=entities.filter(field); // snapshot prevents newborn eggs hatching in the same transition
  for(const e of active){const m=this.meta(e);m.hunts=0;m.eaten=0;m.produced=0;m.steals=0;m.corroded=0;m.pulse=0;
   if(e.kind==='egg'){a.change(e,'hen');this.emit(a,'蛋蛋跨关孵化为母鸡',e,'grow',e,{result:'hen'});}
   else if(e.kind==='hen'){for(let i=0;i<2;i++){const egg=a.spawn('egg',{x:e.p.x+(i? .35:-.35),y:e.p.y+1,z:e.p.z});this.emit(a,'母鸡跨关产蛋',e,'produce',egg||e,{result:'egg'});}}
   else if(e.kind==='relic'){m.bonus=Math.min(140,m.bonus+20);this.log('遗迹跨关成长 +20');}
  }
  // Stage 2: 1; then 2,2,3,3,4,4 bad coins. No debt or score-halving traps.
  for(let i=0;i<Math.min(4,Math.ceil(round/2*this.pressure),Math.max(0,8-active.filter(e=>isBad(e.kind)).length));i++)a.spawn(BAD_IDS[(round+i)%3],{x:(i%2?1:-1)*(1.4+i*.6),y:2.8,z:-3.6});
  a.notify(`第 ${round} 关 · 坏币入侵 / 杀手补给 +1`,{x:0,y:3,z:-2});return true;
 }
 afterDrop(round,entities,a){const interval=Math.round(12/this.pressure);if(round<2||this.dropCount%interval!==0||entities.filter(e=>field(e)&&isBad(e.kind)).length>=8)return false;const wave=Math.floor(this.dropCount/interval),kind=BAD_IDS[(round+wave)%3];a.spawn(kind,{x:(wave%3-1)*2,y:3,z:-4.2});a.notify('坏币入侵 · 用杀手币净化',{x:0,y:3,z:-3});return true;}
 score(e,entities,a){
  const m=this.meta(e);
  if(isBad(e.kind))return {penalty:{rust:40,thief:60,decay:80}[e.kind]};
  if(e.kind==='fish')for(let i=0;i<2;i++){const water=a.spawn('water',{x:e.p.x+(i?.5:-.5),y:3,z:-4.2});if(water)this.emit(a,'鱼鱼入账 · 回流水滴',e,'produce',water,{result:'water'});}
  if(e.kind==='echo'){const copy=a.spawn(this.lastGood,{x:e.p.x,y:3,z:-4.2},{generation:1});if(copy)this.emit(a,'回响复制',e,'produce',copy,{result:this.lastGood});}
  if(e.kind==='bomb')this.explode(e,entities,a);
  if(SPECIAL_IDS.includes(e.kind)&&!['echo','tree','killer'].includes(e.kind)&&!m.generation)this.lastGood=e.kind;
  return {base:this.value(e)};
 }
 explode(origin,entities,a){
  const queue=[origin],seen=new Set([origin]);let count=0;
  while(queue.length&&count++<16){const e=queue.shift();this.emit(a,'爆破连锁 · 推向前沿',e,'explode',e,{chain:count});
   for(const t of entities.filter(field))if(t!==e&&!t.tokenDead&&dist(e,t)<(this.character==='engineer'?4.2:3.6)){
    if(this.levels.capacitor&&this.meta(t).charged){this.meta(t).charged=false;this.meta(origin).bonus=Math.min(1e8,this.meta(origin).bonus+15*this.levels.capacitor);this.emit(a,'爆破收割充能',t,'charge',origin,{absorb:true});}
    const dx=t.p.x-e.p.x;a.push(t,{x:dx*.22,y:.35,z:.85});if(t.kind==='bomb'&&!seen.has(t)&&seen.size<16){seen.add(t);queue.push(t);t.tokenDead=true;a.remove(t);}
   }
  }
 }
 serialize(){return {character:this.character,stats:{...this.stats},discovered:[...this.discovered],bag:this.bag,selected:this.selected,uid:this.uid,roundStamp:this.roundStamp,dropCount:this.dropCount,lastGood:this.lastGood,claimed:this.claimed,shopStamp:this.shopStamp,shopOffers:this.shopOffers,packBought:this.packBought,clip:this.clip,clipSize:this.clipSize};}
}
