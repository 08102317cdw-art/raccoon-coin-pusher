// Pure run rules: no DOM, rendering or physics dependencies.
export const TARGETS = Object.freeze([300, 650, 1100, 1750, 2600, 3700, 5100, 6800]);
export const BASE_POINTS = Object.freeze({ coin: 10, big: 100, gem: 200, plush: 300 });
export const UPGRADES = Object.freeze({
  mult: { name: '倍率芯片', icon: '×', desc: '所有得分的基础倍率 +0.25', cost: 8, step: 4, max: 8, color: 'pink' },
  value: { name: '金币抛光', icon: '✦', desc: '普通金币基础分 +2', cost: 8, step: 4, max: 8, color: 'gold' },
  reserve: { name: '扩容币仓', icon: '▤', desc: '之后每关的投币额度 +8', cost: 10, step: 5, max: 5, color: 'cyan' },
  push: { name: '推板改装', icon: '→', desc: '永久增加推板行程 0.12', cost: 10, step: 5, max: 5, color: 'gold' },
  guard: { name: '开局护墙', icon: '◇', desc: '每关开局护墙 +6 秒', cost: 8, step: 4, max: 5, color: 'cyan' },
  lucky: { name: '幸运门扩展', icon: '♧', desc: 'LUCKY 门有效宽度 +0.20', cost: 10, step: 5, max: 4, color: 'pink' },
  fever: { name: '狂热电池', icon: 'ϟ', desc: '每次 FEVER 持续时间 +3 秒', cost: 8, step: 4, max: 4, color: 'pink' },
  supply: { name: '应急币袋', icon: '+', desc: '仅下一关额外获得 12 次投币', cost: 5, step: 0, max: 1, color: 'gold' },
});
const safeInt = (n, fallback = 0, max = 1e9) => Number.isSafeInteger(n) && n >= 0 && n <= max ? n : fallback;
export class Run {
  constructor(saved, random = Math.random) {
    this.random = random;
    this.round = 1; this.phase = 'playing'; this.score = 0; this.total = 0;
    this.shots = 50; this.cash = 0; this.levels = {}; this.offers = []; this.bought = [];
    this.rerolls = 0; this.pendingShots = 0; this.settle = 0; this.receipt = null;
    if (saved) this.restore(saved);
  }
  get target() { return TARGETS[this.round - 1]; }
  get multiplier() { return 1 + this.level('mult') * 0.25; }
  get reached() { return this.score >= this.target; }
  get active() { return this.phase === 'playing' || this.phase === 'settling'; }
  level(id) { return this.levels[id] || 0; }
  price(id) { const u = UPGRADES[id]; return u ? u.cost + u.step * this.level(id) : Infinity; }
  spendShot() {
    if (this.phase !== 'playing' || this.shots <= 0) return false;
    this.shots--;
    if (!this.shots) { this.phase = 'settling'; this.settle = 15; }
    return true;
  }
  award(kind, combo = 0, fever = false) {
    if (!this.active || !(kind in BASE_POINTS)) return null;
    const base = BASE_POINTS[kind] + (kind === 'coin' ? this.level('value') * 2 : 0);
    const chain = 1 + Math.min(5, Math.max(0, combo)) * 0.1;
    const factor = this.multiplier * chain * (fever ? 2 : 1);
    const points = Math.round(base * factor);
    this.score += points; this.total += points;
    return { base, factor, points };
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
    this.phase = !won ? 'gameover' : this.round === TARGETS.length ? 'victory' : 'shop';
    this.settle = 0; this.rerolls = 0; this.bought = [];
    if (this.phase === 'shop') this.rollOffers();
    return true;
  }
  rollOffers() {
    const pool = Object.keys(UPGRADES).filter(id => id === 'supply' ? this.pendingShots === 0 : this.level(id) < UPGRADES[id].max);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.offers = pool.slice(0, 3);
    if (this.round === 1 && this.rerolls === 0 && this.level('mult') < UPGRADES.mult.max && !this.offers.includes('mult')) this.offers[0] = 'mult';
    this.bought = [];
  }
  buy(id) {
    if (this.phase !== 'shop' || !this.offers.includes(id) || this.bought.includes(id)) return false;
    if ((id === 'supply' ? this.pendingShots > 0 : this.level(id) >= UPGRADES[id].max) || this.cash < this.price(id)) return false;
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
    this.shots = 50 + this.level('reserve') * 8 + this.pendingShots;
    this.pendingShots = 0; this.offers = []; this.bought = []; this.receipt = null; this.settle = 0;
    return true;
  }
  serialize() {
    const { random, ...data } = this;
    return JSON.parse(JSON.stringify(data));
  }
  restore(d) {
    if (!d || !['playing', 'settling', 'shop', 'gameover', 'victory'].includes(d.phase)) throw Error('Invalid run phase');
    if (!Number.isInteger(d.round) || d.round < 1 || d.round > TARGETS.length) throw Error('Invalid round');
    if (['shop', 'victory'].includes(d.phase) && (!d.receipt?.won || d.score < TARGETS[d.round - 1])) throw Error('Invalid result');
    if (d.phase === 'shop' && d.round === TARGETS.length || d.phase === 'victory' && d.round !== TARGETS.length) throw Error('Invalid final round');
    this.round = d.round; this.phase = d.phase;
    for (const key of ['score', 'total', 'shots', 'cash', 'pendingShots', 'rerolls']) this[key] = safeInt(d[key]);
    this.shots = Math.min(this.shots, 102); this.pendingShots = Math.min(this.pendingShots, 12); this.rerolls = Math.min(this.rerolls, 1);
    this.settle = Number.isFinite(d.settle) ? Math.max(0, Math.min(15, d.settle)) : 15;
    for (const id of Object.keys(UPGRADES)) if (id !== 'supply') { const n=safeInt(d.levels?.[id], 0, UPGRADES[id].max); if(n>0) this.levels[id]=n; }
    this.offers = [...new Set((Array.isArray(d.offers) ? d.offers : []).filter(id => id in UPGRADES))].slice(0, 3);
    this.bought = (Array.isArray(d.bought) ? d.bought : []).filter(id => this.offers.includes(id));
    this.receipt = d.receipt && typeof d.receipt === 'object' ? d.receipt : null;
    if (this.phase === 'playing' && !this.shots) { this.phase = 'settling'; this.settle = 15; }
  }
}
