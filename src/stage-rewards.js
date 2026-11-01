// Pure rewards: pendulum is handled in chutes.js. This module covers the
// energy wheel, table prizes, and the post-round 1-of-3 draft.
export const ENERGY_GOAL = 8;
export const PRIZES = Object.freeze({
  shell: { name: '海贝', points: 40, tickets: 6, shells: 3 },
  chest: { name: '宝箱', points: 80, tickets: 8, shells: 0, coin: true },
  plushie: { name: '小鲸玩偶', points: 120, tickets: 4, shells: 2 },
});
export const RELICS = Object.freeze({
  tide: { name: '潮汐芯', desc: '之后每枚入账额外 +1 能量。', max: 3, rarity: 'uncommon' },
  net: { name: '礼品网', desc: '之后每关开场多放 1 件海湾礼品。', max: 3, rarity: 'uncommon' },
  purse: { name: '票夹', desc: '之后每枚入账额外 +1 兑币票。', max: 3, rarity: 'common' },
  swing: { name: '宽摆', desc: '摆槽摆幅加大，特殊币更吃出手时机。', max: 2, rarity: 'rare' },
});
export const LOTTERY = Object.freeze([
  { id: 'shower', name: '金币雨', weight: 34, rarity: 'common', text: '8 枚金币落向台面' },
  { id: 'tickets', name: '兑币票', weight: 24, rarity: 'common', text: '兑币票 +8' },
  { id: 'shells', name: '贝壳', weight: 18, rarity: 'common', text: '贝壳 +4' },
  { id: 'prize', name: '海湾礼品', weight: 14, rarity: 'uncommon', text: '台面多一件可被推下的礼品' },
  { id: 'special', name: '特殊币', weight: 8, rarity: 'rare', text: '币槽收入 1 枚特殊币' },
  { id: 'tower', name: '币塔', weight: 2, rarity: 'rare', text: '金币雨 ×10，并落下宝箱' },
]);

const rarityOf = (random) => {
  const roll = random();
  return roll < 0.62 ? 'common' : roll < 0.9 ? 'uncommon' : 'rare';
};

export function spinLottery(random = Math.random) {
  const total = LOTTERY.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;
  for (const item of LOTTERY) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return LOTTERY[0];
}

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
