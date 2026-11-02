// Pure run rules: no DOM, rendering or physics dependencies.
export const TARGETS = Object.freeze([300, 650, 1100, 1750, 2600, 3700, 5100, 6800]);
export const BASE_POINTS = Object.freeze({ coin: 10, big: 100, gem: 200, plush: 300 });
export const DIFFICULTIES = Object.freeze({
  calm: { name: '平静海湾', desc: '目标分降低，额外 10 次投币，适合熟悉联动。', target: .8, shots: 10, pressure: .75 },
  standard: { name: '标准航路', desc: '原有八关目标与投币额度。', target: 1, shots: 0, pressure: 1 },
  storm: { name: '风暴航路', desc: '目标分提高 35%，少 5 次投币，坏币更频繁。', target: 1.35, shots: -5, pressure: 1.4 },
});
export const UPGRADES = Object.freeze({
  mult: { name: '倍率芯片', icon: '×', desc: '所有得分的基础倍率 +0.25', cost: 8, step: 4, max: 8, color: 'pink' },
  value: { name: '金币抛光', icon: '✦', desc: '普通金币基础分 +2', cost: 8, step: 4, max: 8, color: 'gold' },
  reserve: { name: '扩容币仓', icon: '▤', desc: '之后每关的投币额度 +8', cost: 10, step: 5, max: 5, color: 'cyan' },
  push: { name: '推板改装', icon: '→', desc: '永久增加推板行程 0.12', cost: 10, step: 5, max: 5, color: 'gold' },
  guard: { name: '开局护墙', icon: '◇', desc: '每关开局护墙 +6 秒', cost: 8, step: 4, max: 5, color: 'cyan' },
  lucky: { name: '轮盘加码', icon: '♧', desc: '金币雨每级额外落下 4 枚金币', cost: 10, step: 5, max: 4, color: 'pink' },
  fever: { name: '狂热电池', icon: 'ϟ', desc: '每次 FEVER 持续时间 +3 秒', cost: 8, step: 4, max: 4, color: 'pink' },
  supply: { name: '应急币袋', icon: '+', desc: '仅下一关额外获得 12 次投币', cost: 5, step: 0, max: 1, color: 'gold' },
  pin: { name: '松台销', icon: '⌁', desc: '每投入 20 枚，机台自动摇晃一次，不消耗本局仅有的一次手动摇台。已有推板改装时，摇动和全场轰击更有力。', cost: 8, step: 0, max: 1, color: 'cyan' },
  clip: { name: '币槽扩容', icon: '▣', desc: '特殊币槽 +1。币槽里的币从摆槽射出，时机决定落点。', cost: 8, step: 4, max: 2, color: 'cyan' },
  irrigation: { name: '回流水渠', icon: '♧', desc: '树每产出 3 枚金币回流 1 枚水滴；每级产币间隔缩短 1 秒。', cost: 8, step: 4, max: 3, color: 'cyan' },
  predator: { name: '食物链', icon: '↗', desc: '猫捕食时继承猎物额外币值，每级 25%；满级捕食后补出 1 枚虾米。', cost: 8, step: 4, max: 3, color: 'gold' },
  capacitor: { name: '浪涌线圈', icon: 'ϟ', desc: '闪电向远处邻币追加跳电，每级 1 次；爆破收割附近充能，每枚增加 15 币值。', cost: 8, step: 4, max: 3, color: 'pink' },
});
export const EXCHANGE_GRANT = 8;
export const EXCHANGE_LIMIT = 2;
export const EXCHANGE_COSTS = Object.freeze([12, 18]);
const safeInt = (n, fallback = 0, max = 1e15) => Number.isSafeInteger(n) && n >= 0 && n <= max ? n : fallback;
export class Run {
  constructor(saved, random = Math.random, options = {}) {
    this.random = random;
    this.id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    this.character = ['gardener', 'keeper', 'engineer'].includes(options.character) ? options.character : 'classic';
    this.difficulty = DIFFICULTIES[options.difficulty] ? options.difficulty : 'standard';
    this.endless = false;
    this.elapsed = 0;
    this.stats = { banked: 0, bestCombo: 0, bestAward: 0, exchanges: 0, shakes: 0, inserted: 0 };
    this.round = 1; this.phase = 'playing'; this.score = 0; this.total = 0;
    this.shots = 50 + DIFFICULTIES[this.difficulty].shots; this.cash = 0; this.levels = {}; this.offers = []; this.bought = [];
    this.rerolls = 0; this.pendingShots = 0; this.settle = 0; this.receipt = null;
    this.tickets = 0; this.exchanged = 0; this.shakes = 1; this.inserts = 0;
    this.energy = 0; this.pendingSpin = 0;
    this.relics = { tide: 0, net: 0, purse: 0, swing: 0 };
    this.picks = []; this.pickRerolls = 1; this.picked = false; this.chosen = '';
    if (saved) this.restore(saved);
  }
  targetForRound(round) {
    const base = TARGETS[round - 1] ?? TARGETS.at(-1) * Math.pow(1.18, Math.max(0, round - TARGETS.length));
    return Math.min(9e14, Math.round(base * DIFFICULTIES[this.difficulty].target));
  }
  get target() { return this.targetForRound(this.round); }
  get nextShots() { return Math.min(180, 50 + DIFFICULTIES[this.difficulty].shots + this.level('reserve') * 8 + this.pendingShots); }
  get pressure() { return DIFFICULTIES[this.difficulty].pressure; }
  get multiplier() { return 1 + this.level('mult') * 0.25; }
  get reached() { return this.score >= this.target; }
  get active() { return this.phase === 'playing' || this.phase === 'settling'; }
  level(id) { return this.levels[id] || 0; }
  upgradeMax(id) {
    const base = UPGRADES[id]?.max || 0;
    return this.endless && ['mult', 'value', 'reserve', 'lucky'].includes(id) ? Math.min(64, base + 1 + Math.floor(Math.max(0, this.round - 8) / 2)) : base;
  }
  noteTime(dt) { if (this.active && Number.isFinite(dt) && dt > 0) this.elapsed = Math.min(1e7, this.elapsed + Math.min(1, dt)); }
  price(id) { const u = UPGRADES[id]; return u ? u.cost + u.step * this.level(id) : Infinity; }
  spendShot() {
    if (this.phase !== 'playing' || this.shots <= 0) return false;
    this.shots--;
    if (!this.shots) { this.phase = 'settling'; this.settle = 15; }
    return true;
  }
  exchangeCost() { return EXCHANGE_COSTS[Math.min(this.exchanged, EXCHANGE_COSTS.length - 1)]; }
  canExchange() {
    return (this.phase === 'playing' || this.phase === 'settling') && this.exchanged < EXCHANGE_LIMIT && this.tickets >= this.exchangeCost();
  }
  exchange() {
    if (!this.canExchange()) return false;
    this.tickets -= this.exchangeCost();
    this.exchanged++;
    this.stats.exchanges++;
    this.shots = Math.min(180, this.shots + EXCHANGE_GRANT);
    if (this.phase === 'settling') { this.phase = 'playing'; this.settle = 0; }
    return true;
  }
  shake() {
    if (!this.active || this.shakes <= 0) return false;
    this.shakes--;
    this.stats.shakes++;
    return true;
  }
  noteInsert() {
    this.inserts++;
    this.stats.inserted++;
    return this.level('pin') > 0 && this.inserts % 20 === 0;
  }
  award(kind, combo = 0, fever = false) {
    if (!this.active || !(kind in BASE_POINTS)) return null;
    const base = BASE_POINTS[kind] + (kind === 'coin' ? this.level('value') * 2 : 0);
    return this.awardBase(base, combo, fever);
  }
  awardBase(base, combo = 0, fever = false, environment = 1) {
    if (!this.active || !Number.isFinite(base) || base < 0 || !Number.isFinite(environment)) return null;
    combo = Number.isFinite(combo) ? Math.max(0, Math.floor(combo)) : 0;
    base = Math.min(1e12, Math.round(base));
    const chain = 1 + Math.min(5, Math.max(0, combo)) * 0.1;
    const factor = this.multiplier * chain * (fever ? 2 : 1) * Math.max(.1, Math.min(4, environment));
    const points = Math.round(base * factor);
    this.score = Math.min(1e15, this.score + points); this.total = Math.min(1e15, this.total + points);
    this.tickets = Math.min(9999, this.tickets + 1 + (this.relics?.purse || 0));
    this.stats.banked++;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, Math.max(0, Math.floor(combo)) + 1);
    this.stats.bestAward = Math.max(this.stats.bestAward, points);
    // Wheel energy belongs to a continuous combo, not cumulative banked coins.
    return { base, factor, points };
  }
  penalize(amount) {
    if (!this.active || !Number.isFinite(amount) || amount <= 0) return 0;
    const lost = Math.min(this.score, Math.round(amount));
    this.score -= lost; this.total = Math.max(0, this.total - lost); return lost;
  }
  tick(dt, pending = false) {
    if (this.phase !== 'settling') return false;
    this.settle = Math.max(pending ? 3 : 0, this.settle - Math.max(0, dt));
    if (this.settle <= 0) return this.finish();
    return false;
  }
  finish() {
    if (!this.active) return false;
    const won = this.reached;
    const base = won ? 8 + this.round * 2 : 0;
    const thrift = won ? Math.min(6, Math.floor(this.shots / 5)) : 0;
    const over = won ? Math.min(4, Math.floor(Math.max(0, this.score / this.target - 1) * 4)) : 0;
    const reward = base + thrift + over;
    this.receipt = { won, round: this.round, score: this.score, target: this.target, base, thrift, over, reward, remaining: this.shots };
    this.cash += reward;
    this.phase = !won ? 'gameover' : !this.endless && this.round === TARGETS.length ? 'victory' : 'shop';
    this.settle = 0; this.rerolls = 0; this.bought = [];
    this.picks = []; this.pickRerolls = 1; this.picked = false; this.chosen = '';
    if (this.phase === 'shop') this.rollOffers();
    return true;
  }
  rollOffers() {
    const pool = Object.keys(UPGRADES).filter(id => id === 'supply' ? this.pendingShots === 0 : this.level(id) < this.upgradeMax(id));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.offers = pool.slice(0, 3);
    if (this.round === 1 && this.rerolls === 0 && this.level('mult') < UPGRADES.mult.max && !this.offers.includes('mult')) this.offers[0] = 'mult';
    const signature = { gardener: 'irrigation', keeper: 'predator', engineer: 'capacitor' }[this.character];
    if (signature && this.level(signature) < UPGRADES[signature].max && !this.offers.includes(signature)) this.offers[this.offers.length - 1] = signature;
    this.bought = [];
  }
  buy(id) {
    if (this.phase !== 'shop' || !this.offers.includes(id) || this.bought.includes(id)) return false;
    if ((id === 'supply' ? this.pendingShots > 0 : this.level(id) >= this.upgradeMax(id)) || this.cash < this.price(id)) return false;
    this.cash -= this.price(id);
    if (id === 'supply') this.pendingShots = 12; else this.levels[id] = this.level(id) + 1;
    this.bought.push(id); return true;
  }
  reroll() {
    if (this.phase !== 'shop' || this.cash < 3 || this.rerolls >= 1) return false;
    this.cash -= 3; this.rerolls++; this.rollOffers(); return true;
  }
  next() {
    if (this.phase !== 'shop') return false;
    this.round++; this.score = 0; this.phase = 'playing';
    this.shots = this.nextShots;
    this.pendingShots = 0; this.offers = []; this.bought = []; this.receipt = null; this.settle = 0;
    this.exchanged = 0; this.inserts = 0;
    this.picks = []; this.pickRerolls = 1; this.picked = false; this.chosen = '';
    return true;
  }
  continueEndless() {
    if (this.phase !== 'victory') return false;
    this.endless = true; this.phase = 'shop'; this.rerolls = 0; this.bought = [];
    this.picks = []; this.picked = false; this.chosen = ''; this.pickRerolls = 1;
    this.rollOffers();
    return true;
  }
  summary(synergies = {}) {
    return { id: this.id, character: this.character, difficulty: this.difficulty, endless: this.endless,
      round: this.round, phase: this.phase, won: this.phase === 'victory' || this.endless,
      total: this.total, score: this.score, elapsed: Math.round(this.elapsed),
      stats: { ...this.stats }, levels: { ...this.levels }, synergies: { ...synergies } };
  }
  serialize() {
    const { random, ...data } = this;
    return JSON.parse(JSON.stringify(data));
  }
  restore(d) {
    if (!d || !['playing', 'settling', 'shop', 'gameover', 'victory'].includes(d.phase)) throw Error('Invalid run phase');
    this.character = ['gardener', 'keeper', 'engineer'].includes(d.character) ? d.character : 'classic';
    this.difficulty = DIFFICULTIES[d.difficulty] ? d.difficulty : 'standard';
    this.endless = d.endless === true;
    if (!Number.isInteger(d.round) || d.round < 1 || d.round > (this.endless ? 1e9 : TARGETS.length)) throw Error('Invalid round');
    if (['shop', 'victory'].includes(d.phase) && (!d.receipt?.won || d.score < this.targetForRound(d.round))) throw Error('Invalid result');
    if (!this.endless && d.phase === 'shop' && d.round === TARGETS.length || d.phase === 'victory' && (d.round !== TARGETS.length || this.endless)) throw Error('Invalid final round');
    if (typeof d.id === 'string' && /^[a-z0-9-]{4,80}$/i.test(d.id)) this.id = d.id;
    this.elapsed = Number.isFinite(d.elapsed) ? Math.max(0, Math.min(1e7, d.elapsed)) : 0;
    for (const key of Object.keys(this.stats)) this.stats[key] = safeInt(d.stats?.[key]);
    this.round = d.round; this.phase = d.phase;
    for (const key of ['score', 'total', 'shots', 'cash', 'pendingShots', 'rerolls']) this[key] = safeInt(d[key]);
    this.shots = Math.min(this.shots, 180); this.pendingShots = Math.min(this.pendingShots, 12); this.rerolls = Math.min(this.rerolls, 1);
    this.tickets = safeInt(d.tickets, 0, 9999);
    this.exchanged = Math.min(EXCHANGE_LIMIT, safeInt(d.exchanged, 0, EXCHANGE_LIMIT));
    this.inserts = safeInt(d.inserts, 0, 100000);
    this.shakes = Object.prototype.hasOwnProperty.call(d, 'shakes') ? Math.min(1, safeInt(d.shakes, 0, 1)) : 1;
    this.energy = Math.min(8, safeInt(d.energy, 0, 8));
    this.pendingSpin = Math.min(4, safeInt(d.pendingSpin, 0, 4));
    this.relics = { tide: 0, net: 0, purse: 0, swing: 0 };
    if (d.relics && typeof d.relics === 'object') for (const id of Object.keys(this.relics)) this.relics[id] = safeInt(d.relics[id], 0, 3);
    this.picks = Array.isArray(d.picks) ? d.picks.filter(card => card && typeof card.id === 'string' && typeof card.kind === 'string').slice(0, 3) : [];
    this.pickRerolls = d.pickRerolls === undefined ? 1 : Math.min(1, safeInt(d.pickRerolls, 0, 1));
    this.picked = !!d.picked;
    this.chosen = typeof d.chosen === 'string' ? d.chosen : '';
    this.settle = Number.isFinite(d.settle) ? Math.max(0, Math.min(15, d.settle)) : 15;
    for (const id of Object.keys(UPGRADES)) if (id !== 'supply') { const n=safeInt(d.levels?.[id], 0, this.upgradeMax(id)); if(n>0) this.levels[id]=n; }
    this.offers = [...new Set((Array.isArray(d.offers) ? d.offers : []).filter(id => id in UPGRADES))].slice(0, 3);
    this.bought = (Array.isArray(d.bought) ? d.bought : []).filter(id => this.offers.includes(id));
    this.receipt = d.receipt && typeof d.receipt === 'object' ? d.receipt : null;
    if (this.phase === 'playing' && !this.shots) { this.phase = 'settling'; this.settle = 15; }
  }
}
