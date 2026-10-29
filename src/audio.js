// 全合成音效：无需任何音频文件
export class Sfx {
  constructor() { this.ctx = null; this.enabled = true; this.musicOn = true; this.clinkTimes = []; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = 0.16; this.music.connect(this.master);
    // 简易混响
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb.buffer = ir;
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.22;
    this.verb.connect(this.verbGain).connect(this.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.startMusic();
  }
  get t() { return this.ctx.currentTime; }
  ok() { return this.ctx && this.enabled; }
  out(pan = 0, verb = 0) {
    const g = this.ctx.createGain();
    let node = g;
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); node = p; }
    node.connect(this.sfx);
    if (verb > 0) { const v = this.ctx.createGain(); v.gain.value = verb; node.connect(v).connect(this.verb); }
    return g;
  }
  tone(type, f0, f1, dur, vol, when = 0, pan = 0, verb = 0, attack = 0.004) {
    const t = this.t + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out(pan, verb)); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol, filterType, freq, when = 0, pan = 0, q = 1, f1) {
    const t = this.t + when, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.out(pan)); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // 金属碰撞声
  clink(intensity = 0.5, pan = 0) {
    if (!this.ok()) return;
    const now = performance.now();
    this.clinkTimes = this.clinkTimes.filter(x => now - x < 100);
    if (this.clinkTimes.length > 4) return;
    this.clinkTimes.push(now);
    const base = 2600 + Math.random() * 1900, v = 0.05 + intensity * 0.16;
    [1, 1.47, 2.09, 2.76].forEach((m, i) => this.tone('sine', base * m, base * m * 0.995, 0.05 + 0.22 * intensity / (i + 1), v / (i + 1.2), 0, pan, 0.15, 0.001));
    this.noise(0.02, v * 0.6, 'highpass', 5000, 0, pan);
  }
  drop(pan = 0) {
    if (!this.ok()) return;
    this.noise(0.06, 0.25, 'lowpass', 1400, 0, pan, 1, 300);
    this.tone('triangle', 520, 260, 0.08, 0.12, 0, pan);
    this.clink(0.4, pan);
  }
  win(combo = 0, pan = 0) {
    if (!this.ok()) return;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const n = scale[Math.min(combo, scale.length - 1)], f = 1046.5 * Math.pow(2, n / 12);
    this.tone('sine', f, f, 0.35, 0.16, 0, pan, 0.5);
    this.tone('sine', f * 2.01, f * 2.01, 0.2, 0.06, 0, pan, 0.5);
    this.tone('square', f / 2, f / 2, 0.06, 0.03, 0, pan);
  }
  lost(pan = 0) { if (!this.ok()) return; this.tone('sine', 260, 120, 0.25, 0.1, 0, pan); }
  gate() {
    if (!this.ok()) return;
    [0, 4, 7, 12, 16].forEach((n, i) => this.tone('square', 880 * Math.pow(2, n / 12), null, 0.12, 0.06, i * 0.04, 0, 0.4));
  }
  tick() { if (!this.ok()) return; this.tone('square', 1200, 900, 0.025, 0.025); }
  reelStop() { if (!this.ok()) return; this.tone('sine', 180, 60, 0.14, 0.3); this.noise(0.04, 0.15, 'bandpass', 2500); }
  reach() {
    if (!this.ok()) return;
    const t = this.t, o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 1.8);
    lfo.frequency.value = 14; lg.gain.value = 0.05; lfo.connect(lg).connect(g.gain);
    g.gain.setValueAtTime(0.06, t); g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
    o.connect(f).connect(g).connect(this.out(0, 0.3)); o.start(t); lfo.start(t); o.stop(t + 2); lfo.stop(t + 2);
    for (let i = 0; i < 18; i++) this.noise(0.05, 0.12 + i * 0.01, 'bandpass', 180, i * 0.1, 0, 2);
  }
  fanfare(big = false) {
    if (!this.ok()) return;
    const seq = big ? [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [7, 0.5], [12, 0.62], [16, 0.74], [19, 0.9]] : [[0, 0], [4, 0.1], [7, 0.2], [12, 0.3]];
    seq.forEach(([n, w]) => {
      const f = 523.25 * Math.pow(2, n / 12);
      this.tone('square', f, null, 0.22, 0.07, w, 0, 0.4);
      this.tone('triangle', f * 2, null, 0.3, 0.07, w, 0, 0.4);
    });
    if (big) {
      [0, 4, 7, 12].forEach(n => this.tone('sawtooth', 261.6 * Math.pow(2, n / 12), null, 1.4, 0.035, 1.05, 0, 0.6, 0.02));
      for (let i = 0; i < 24; i++) this.tone('sine', 2000 + Math.random() * 3000, null, 0.3, 0.04, 1.05 + i * 0.05, Math.random() * 2 - 1, 0.6);
    }
  }
  levelUp() { if (!this.ok()) return; [0, 2, 4, 5, 7, 9, 11, 12].forEach((n, i) => this.tone('triangle', 659 * Math.pow(2, n / 12), null, 0.15, 0.08, i * 0.05, 0, 0.4)); }
  whoosh() { if (!this.ok()) return; this.noise(0.6, 0.25, 'bandpass', 300, 0, 0, 3, 3000); }
  prize() { if (!this.ok()) return; [12, 16, 19, 24, 28].forEach((n, i) => this.tone('sine', 523 * Math.pow(2, n / 12), null, 0.5, 0.08, i * 0.06, 0, 0.7)); }
  button() { if (!this.ok()) return; this.tone('sine', 900, 1300, 0.06, 0.08); }

  // ---------- 背景音乐：轻快的循环 ----------
  startMusic() {
    const ctx = this.ctx, bpm = 116, step = 60 / bpm / 2;
    // 和弦进行 C - Am - F - G
    const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
    const mel = [12, null, 16, 19, 16, null, 14, 12, 9, null, 12, 16, 14, null, 12, 9, 5, null, 9, 12, 14, 12, 9, 5, 7, null, 11, 14, 12, null, null, null];
    this.fast = 1;
    let i = 0, next = ctx.currentTime + 0.1;
    const play = (type, f, t, d, v) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.music); o.start(t); o.stop(t + d + 0.05);
    };
    const sched = () => {
      while (next < ctx.currentTime + 0.25) {
        const bar = Math.floor(i / 8) % 4, s = i % 8, ch = chords[bar], root = 130.81;
        if (this.musicOn) {
          if (s % 2 === 0) play('triangle', root * Math.pow(2, ch[0] / 12) / (s % 4 === 0 ? 2 : 1), next, step * 1.6, 0.5);
          if (s === 2 || s === 6) ch.forEach(n => play('square', root * 2 * Math.pow(2, n / 12), next, step * 0.7, 0.06));
          const m = mel[i % 32]; if (m !== null) play('triangle', root * 2 * Math.pow(2, m / 12), next, step * 1.4, 0.22);
          if (s % 2 === 1) { // 踩镲
            const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
            src.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 8000;
            g.gain.setValueAtTime(0.12, next); g.gain.exponentialRampToValueAtTime(0.0001, next + 0.04);
            src.connect(f).connect(g).connect(this.music); src.start(next, Math.random()); src.stop(next + 0.06);
          }
          if (s === 0 || s === 4) play('sine', 110, next, 0.12, 0.6);
        }
        next += step / this.fast; i++;
      }
    };
    setInterval(sched, 60);
  }
  setMusic(on) { this.musicOn = on; }
  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.value = on ? 0.8 : 0; }
}
