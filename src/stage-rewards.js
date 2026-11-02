// Pure rewards: pendulum is handled in chutes.js. This module covers the
// energy wheel, table prizes, and the post-round 1-of-3 draft.
export const ENERGY_GOAL = 8;
export const PRIZES = Object.freeze({
  shell: { name: '海贝', points: 40, tickets: 6, shells: 3 },
  chest: { name: '宝箱', points: 80, tickets: 8, shells: 0, coin: true },
  plushie: { name: '小鲸玩偶', points: 120, tickets: 4, shells: 2 },
});
export const RELICS = Object.freeze({
  tide: { name: '潮汐芯', desc: '之后每枚连续入账额外 +1 连击蓄能。', max: 3, rarity: 'uncommon' },
  net: { name: '礼品网', desc: '之后每关开场多放 1 件海湾礼品。', max: 3, rarity: 'uncommon' },
  purse: { name: '票夹', desc: '之后每枚入账额外 +1 兑币票。', max: 3, rarity: 'common' },
  swing: { name: '宽摆', desc: '摆槽摆幅加大，特殊币更吃出手时机。', max: 2, rarity: 'rare' },
});
// Broad original flow is verified: combo end -> base wheel -> optional bonus wheel.
// Amounts and weights below are this build's tuning, not reverse-engineered values.
export const LOTTERY = Object.freeze([
 {id:'shower',name:'金币 16',weight:36,coins:16,icon:0,text:'金币落向台面'},
 {id:'coins50',name:'金币 50',weight:16,coins:50,icon:0,text:'金币落向台面'},
 {id:'prize',name:'礼品球',weight:30,prizes:1,icon:3,text:'礼品落向台面'},
 {id:'advance',name:'奖励轮',weight:18,advance:true,icon:4,text:'收绳后进入二级奖励轮'},
]);
export const BONUS_LOTTERY = Object.freeze([
 {id:'tower',name:'金币塔',weight:40,towerLayers:6,icon:5,text:'真实堆叠金币塔'},
 {id:'prizebundle',name:'礼品 ×3',weight:40,prizes:3,icon:3,text:'礼品落向台面'},
 {id:'tall_tower',name:'高金币塔',weight:8,towerLayers:10,icon:5,text:'更高的堆叠金币塔'},
 {id:'prizeburst',name:'礼品 ×6',weight:12,prizes:6,icon:3,text:'礼品落向台面'},
]);
const LEGACY_LOTTERY = [
 {id:'tickets',name:'兑币票',icon:1,text:'兑币票 +8'},
 {id:'shells',name:'贝壳',icon:2,text:'贝壳 +4'},
 {id:'special',name:'特殊币',icon:4,text:'币槽收入特殊币'},
];
export function normalizeWheelItem(item) {
 if(!item||typeof item!=='object')return null;
 const spec=[...LOTTERY,...BONUS_LOTTERY,...LEGACY_LOTTERY].find(x=>x.id===item.id);
 return spec?{...spec,level:Math.max(1,Math.min(5,Math.trunc(Number(item.level)||1)))}:null;
}
export function wheelItemsFor(item) {
 if(BONUS_LOTTERY.some(x=>x.id===item.id))return BONUS_LOTTERY;
 if(LEGACY_LOTTERY.some(x=>x.id===item.id))return [...LEGACY_LOTTERY,LOTTERY[0]];
 return LOTTERY;
}
export function wheelRewardText(item) {
 const n=item.level||1;
 if(item.coins)return `${item.coins*n} 枚金币落向台面`;
 if(item.prizes)return `${item.prizes*n} 件可推动的礼品落向台面`;
 if(item.towerLayers)return `一座 ${Math.min(12,item.towerLayers+n-1)*7} 枚的堆叠金币塔`;
 return item.text;
}

const rarityOf = (random) => {
  const roll = random();
  return roll < 0.62 ? 'common' : roll < 0.9 ? 'uncommon' : 'rare';
};

function weighted(items,random) {
 let cursor=random()*items.reduce((n,x)=>n+x.weight,0);
 for(const item of items){cursor-=item.weight;if(cursor<=0)return item;}
 return items[0];
}
export function spinLottery(random=Math.random){return weighted(LOTTERY,random);}
export function spinBonusLottery(random=Math.random){return weighted(BONUS_LOTTERY,random);}

export function rollPicks(run, options = {}) {
  const random = options.random || run.random || Math.random;
  const coinIds = (options.coinIds || ['seed', 'cat', 'clover', 'bomb', 'killer']).filter(Boolean);
  const upgrades = options.upgrades || {};
  const upgradeIds = (options.upgradeIds || Object.keys(upgrades)).filter(id => {
    const spec = upgrades[id];
    return spec && id !== 'supply' && (run.level?.(id) || 0) < spec.max;
  });
  const relicIds = Object.keys(RELICS).filter(id => (run.relics?.[id] || 0) < RELICS[id].max);
  const used = new Set();
  const cards = [];
  for (let i = 0; i < 3; i++) {
    const rarity = rarityOf(random);
    const kindRoll = random();
    let card = null;
    if (kindRoll < 0.34 && upgradeIds.length) card = takeUpgrade(upgradeIds, upgrades, rarity, used);
    else if (kindRoll < 0.67 && coinIds.length) card = takeCoin(coinIds, rarity, random, used, options.names || {});
    else if (relicIds.length) card = takeRelic(relicIds, used);
    if (!card) card = takeCoin(coinIds, 'common', random, used, options.names || {}) || takeRelic(relicIds, used) || takeUpgrade(upgradeIds, upgrades, 'common', used);
    if (card) cards.push(card);
  }
  while (cards.length < 3 && coinIds.length) {
    const extra = takeCoin(coinIds, 'common', random, used, options.names || {});
    if (!extra) break;
    cards.push(extra);
  }
  return cards;
}

function takeUpgrade(ids, upgrades, rarity, used) {
  const id = ids.find(key => !used.has('upgrade:' + key));
  if (!id) return null;
  used.add('upgrade:' + id);
  const spec = upgrades[id];
  return { kind: 'upgrade', id, name: spec.name, desc: spec.desc, rarity, max: spec.max };
}
function takeCoin(ids, rarity, random, used, names) {
  const open = ids.filter(id => !used.has('coin:' + id));
  if (!open.length) return null;
  const id = open[Math.floor(random() * open.length) % open.length];
  used.add('coin:' + id);
  const count = rarity === 'rare' ? 2 : 1;
  return { kind: 'coin', id, name: names[id] || id, desc: `收入币仓 ${count} 枚，可装进币槽。`, rarity, count };
}
function takeRelic(ids, used) {
  const id = ids.find(key => !used.has('relic:' + key));
  if (!id) return null;
  used.add('relic:' + id);
  return { kind: 'relic', id, name: RELICS[id].name, desc: RELICS[id].desc, rarity: RELICS[id].rarity, max: RELICS[id].max };
}

export function applyPick(run, card, grant) {
  if (!card || run.picked) return false;
  if (card.kind === 'upgrade') {
    const max = card.max ?? 8;
    if ((run.level?.(card.id) || run.levels?.[card.id] || 0) >= max) return false;
    run.levels[card.id] = (run.levels[card.id] || 0) + 1;
  } else if (card.kind === 'coin') {
    if (typeof grant === 'function') grant(card.id, card.count || 1);
  } else if (card.kind === 'relic' && RELICS[card.id]) {
    run.relics[card.id] = Math.min(RELICS[card.id].max, (run.relics[card.id] || 0) + 1);
  } else return false;
  run.picked = true;
  run.chosen = card.id;
  return true;
}

export function rerollPicks(run, options) {
  if (run.picked || run.pickRerolls <= 0) return false;
  run.pickRerolls--;
  run.picks = rollPicks(run, options);
  return true;
}
