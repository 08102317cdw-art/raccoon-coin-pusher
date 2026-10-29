import * as THREE from 'three';
import { drawSymbol, SYMBOLS } from './textures.js';

// 结果表：权重 / 名称
export const OUTCOMES = [
  { id: 'jackpot', sym: 0, w: 1.5, label: 'JACKPOT!!' },
  { id: 'seven', sym: 1, w: 4, label: '777 金币雨' },
  { id: 'coin', sym: 2, w: 10, label: '金币 ×10' },
  { id: 'wall', sym: 3, w: 7, label: '护墙升起' },
  { id: 'bell', sym: 4, w: 7, label: '奖品掉落' },
  { id: 'push', sym: 5, w: 8, label: '超级推板' },
  { id: 'miss', sym: -1, w: 62, label: '' },
];

export class Slot {
  constructor(sfx, onResult) {
    this.sfx = sfx; this.onResult = onResult;
    this.W = 1024; this.H = 576;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H;
    this.g = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace;
    this.reels = [0, 1, 2].map(() => {
      const strip = []; for (let k = 0; k < 3; k++) for (let s = 0; s < SYMBOLS.length; s++) strip.push(s);
      for (let i = strip.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [strip[i], strip[j]] = [strip[j], strip[i]]; }
      return { strip, pos: Math.random() * strip.length, speed: 0, state: 'idle', from: 0, to: 0, t: 0 };
    });
    this.queue = 0; this.spinning = false; this.t = 0; this.msg = ''; this.msgT = 0; this.reach = false; this.flash = 0;
    this.status = []; this.lastTick = 0;
  }
  add() { if (this.queue < 5) { this.queue++; return true; } return false; }
  roll() {
    const tot = OUTCOMES.reduce((a, o) => a + o.w, 0); let r = Math.random() * tot;
    for (const o of OUTCOMES) { r -= o.w; if (r <= 0) return o; } return OUTCOMES[OUTCOMES.length - 1];
  }
  start() {
    this.queue--; this.spinning = true; this.t = 0; this.reach = false;
    const o = this.outcome = this.roll();
    if (o.sym >= 0) this.result = [o.sym, o.sym, o.sym];
    else {
      const a = Math.floor(Math.random() * 6); let b = Math.floor(Math.random() * 6), c = Math.floor(Math.random() * 6);
      if (Math.random() < 0.35) b = a;  // 假“听牌”
      while (a === b && b === c) c = (c + 1) % 6;
      this.result = [a, b, c];
    }
    this.willReach = this.result[0] === this.result[1];
    this.reels.forEach(r => { r.state = 'spin'; r.speed = 0; });
    this.stopAt = [0.9, 1.3, this.willReach ? 3.4 : 1.7];
  }
  stopReel(i) {
    const r = this.reels[i], L = r.strip.length; let target = Math.ceil(r.pos) + 3;
    while (r.strip[((target % L) + L) % L] !== this.result[i]) target++;
    r.state = 'stopping'; r.from = r.pos; r.to = target; r.t = 0; r.dur = i === 2 && this.willReach ? 0.9 : 0.45;
  }
  update(dt) {
    this.t += dt; this.flash += dt;
    if (!this.spinning && this.queue > 0 && this.msgT <= 0) this.start();
    if (this.spinning) {
      this.reels.forEach((r, i) => {
        if (r.state === 'spin') {
          const max = i === 2 && this.reach ? 9 : 26;
          r.speed = Math.min(max, r.speed + dt * 80); if (this.reach && i === 2) r.speed = THREE.MathUtils.lerp(r.speed, max, 0.1);
          r.pos += r.speed * dt;
          if (this.t >= this.stopAt[i]) this.stopReel(i);
        } else if (r.state === 'stopping') {
          r.t += dt / r.dur; const k = Math.min(1, r.t), e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
          r.pos = r.from + (r.to - r.from) * e;
          if (k >= 1) {
            r.state = 'idle'; r.pos = r.to; this.sfx.reelStop();
            if (i === 1 && this.willReach) { this.reach = true; this.sfx.reach(); this.onResult({ id: 'reach' }); }
          }
        }
      });
      if (Math.floor(this.t * 14) !== this.lastTick && this.reels.some(r => r.state === 'spin')) { this.lastTick = Math.floor(this.t * 14); this.sfx.tick(); }
      if (this.reels.every(r => r.state === 'idle') && this.t > 0.5) {
        this.spinning = false; this.reach = false;
        const o = this.outcome;
        this.msg = o.id === 'miss' ? '再来一次！' : o.label; this.msgT = o.id === 'miss' ? 0.6 : 1.6; this.win = o.id !== 'miss';
        this.onResult(o);
      }
    }
    if (this.msgT > 0) this.msgT -= dt;
    this.draw();
  }
  draw() {
    const g = this.g, W = this.W, H = this.H;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3a0d5e'); bg.addColorStop(1, '#14052a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 光线
    g.save(); g.translate(W / 2, H * 0.55); g.rotate(this.t * 0.3);
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.fillStyle = i % 2 ? 'rgba(255,180,255,0.05)' : 'rgba(120,220,255,0.05)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(900, -120); g.lineTo(900, 120); g.fill(); }
    g.restore();
    // 标题
    g.font = '900 64px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#5a1a00'; g.strokeText('LUCKY SLOT', W / 2, 58);
    const tg = g.createLinearGradient(0, 30, 0, 90); tg.addColorStop(0, '#fff7b0'); tg.addColorStop(1, '#ff9d00');
    g.fillStyle = tg; g.fillText('LUCKY SLOT', W / 2, 58);
    // 转轮
    const rw = 250, rh = 300, gap = 24, x0 = W / 2 - (rw * 3 + gap * 2) / 2, y0 = 110, cell = 130;
    const winGlow = this.msgT > 0 && this.win ? (Math.sin(this.flash * 20) > 0) : false;
    this.reels.forEach((r, i) => {
      const x = x0 + i * (rw + gap);
      g.save();
      g.fillStyle = '#ffd34d'; roundRect(g, x - 10, y0 - 10, rw + 20, rh + 20, 26); g.fill();
      const inner = g.createLinearGradient(0, y0, 0, y0 + rh); inner.addColorStop(0, '#bdbdbd'); inner.addColorStop(0.2, '#ffffff'); inner.addColorStop(0.8, '#ffffff'); inner.addColorStop(1, '#bdbdbd');
      g.fillStyle = inner; roundRect(g, x, y0, rw, rh, 18); g.fill(); g.clip();
      const L = r.strip.length, base = Math.floor(r.pos), frac = r.pos - base, blur = r.state === 'spin' && r.speed > 15;
      for (let k = -2; k <= 2; k++) {
        const idx = (((base - k) % L) + L) % L, cy = y0 + rh / 2 + (k + frac) * cell;
        if (blur) { g.globalAlpha = 0.35; drawSymbol(g, r.strip[idx], x + rw / 2, cy - 22, 150); drawSymbol(g, r.strip[idx], x + rw / 2, cy + 22, 150); g.globalAlpha = 1; }
        else drawSymbol(g, r.strip[idx], x + rw / 2, cy, 150);
      }
      const sh = g.createLinearGradient(0, y0, 0, y0 + rh); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(0.25, 'rgba(0,0,0,0)'); sh.addColorStop(0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
      g.fillStyle = sh; g.fillRect(x, y0, rw, rh);
      if (this.reach && i === 2) { g.fillStyle = `rgba(255,40,80,${0.25 + 0.2 * Math.sin(this.flash * 25)})`; g.fillRect(x, y0, rw, rh); }
      if (winGlow) { g.fillStyle = 'rgba(255,230,80,0.35)'; g.fillRect(x, y0, rw, rh); }
      g.restore();
    });
    // 中奖线
    g.strokeStyle = this.reach ? '#ff2d55' : 'rgba(255,60,90,0.8)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x0 - 24, y0 + rh / 2); g.lineTo(x0 + rw * 3 + gap * 2 + 24, y0 + rh / 2); g.stroke();
    // 保留灯
    for (let i = 0; i < 5; i++) {
      const cx = W / 2 - 120 + i * 60, cy = 452, on = i < this.queue;
      g.fillStyle = on ? '#3dffb0' : '#3a2a50'; g.beginPath(); g.arc(cx, cy, 17, 0, Math.PI * 2); g.fill();
      if (on) { g.fillStyle = 'rgba(160,255,220,0.8)'; g.beginPath(); g.arc(cx - 5, cy - 5, 6, 0, Math.PI * 2); g.fill(); }
    }
    g.font = 'bold 26px "Noto Sans SC", sans-serif'; g.fillStyle = '#d8c3ff'; g.fillText('保留', W / 2 - 200, 453);
    // 状态
    g.font = 'bold 30px "Arial Black", "Noto Sans SC", sans-serif';
    this.status.forEach((s, i) => { g.fillStyle = s.color; g.fillText(s.text, W / 2 + (i - (this.status.length - 1) / 2) * 300, 515); });
    if (this.reach) bigText(g, 'REACH!', W / 2, y0 + rh / 2, 120, '#ff2d55', Math.sin(this.flash * 18) > -0.3);
    else if (this.msgT > 0 && this.msg) bigText(g, this.msg, W / 2, y0 + rh / 2, this.win ? 100 : 80, this.win ? '#ffe14d' : '#9be7ff', true);
    this.texture.needsUpdate = true;
  }
}

function bigText(g, t, x, y, size, color, show) {
  if (!show) return;
  g.font = `900 ${size}px "Arial Black", "Noto Sans SC", sans-serif`;
  while (g.measureText(t).width > 940) { size *= 0.9; g.font = `900 ${size}px "Arial Black", "Noto Sans SC", sans-serif`; }
  g.lineWidth = size * 0.18; g.strokeStyle = '#2a0030'; g.lineJoin = 'round'; g.strokeText(t, x, y);
  g.fillStyle = color; g.fillText(t, x, y);
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
