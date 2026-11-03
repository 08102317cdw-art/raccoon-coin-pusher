import metalAudio from './art/coin-audio.js';
// AI 生成的金属拟音与环境音乐均可离线播放，碰撞音按强度与位置混合。
export class Sfx {
  constructor() { this.ctx = null; this.enabled = true; this.musicOn = true; this.clinkTimes = []; this.buffers={};this.voices=new Set();this.sampleCount=0;this.lastImpact=-1000;this.musicBase=.055; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = this.musicBase; this.music.connect(this.master);
    // 简易混响
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb.buffer = ir;
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.055;
    this.verb.connect(this.verbGain).connect(this.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    for(const [name,data]of Object.entries(metalAudio.samples)){
      const bytes=Uint8Array.from(atob(data),v=>v.charCodeAt(0)),view=new DataView(bytes.buffer),buffer=ctx.createBuffer(1,bytes.length/2,metalAudio.rate),channel=buffer.getChannelData(0);
      for(let i=0;i<channel.length;i++)channel[i]=view.getInt16(i*2,true)/32768;this.buffers[name]=buffer;
    }
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
  // 每次接触有不同的金属短音，限制并发并保留清晰的瞬态。
  sample(name,volume=.4,pan=0,when=0,rate=1){
    if(!this.ok()||!this.buffers[name]||this.voices.size>=18)return false;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers[name];source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain).connect(this.out(pan,.02));
    this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start(this.t+when);this.sampleCount++;return true;
  }
  impact({strength=.5,pan=0,tray=false}={}){
    const now=performance.now();if(now-this.lastImpact<32)return false;this.lastImpact=now;
    return this.sample('impact'+Math.floor(Math.random()*5),.12+strength*.25,pan,0,(tray?.92:1.05)+Math.random()*.13);
  }
  clink(intensity=.5,pan=0){return this.impact({strength:intensity,pan});}
  drop(pan=0){this.sample('insert',.38,pan,0,1.05+Math.random()*.06);}
  win(combo=0,pan=0){this.sample('impact'+combo%5,.28,pan,0,1.05+Math.min(8,combo)*.015);}
  lost(pan=0){this.sample('impact3',.13,pan,0,.9);}
  gate(){this.sample('insert',.3,0,0,.95);}
  tick(){this.sample('insert',.08,0,0,1.35);}
  tower(phase){
    if(phase==='unlocking'||phase==='seating')this.sample('insert',.38,0,0,.85);
    else if(phase==='rising')this.sample('scatter',.12,0,0,.72);
    else this.sample('insert',.18,0,0,.92);
  }
  reelStop(){this.sample('impact2',.25,0,0,.9);}
  reach(){this.sample('bank',.4);this.sample('impact0',.2,0,.14,1.3);}
  fanfare(big=false){this.sample(big?'scatter':'bank',big?.45:.3);for(let i=0;i<(big?5:2);i++)this.sample('impact'+i%5,.13,0,.12+i*.065,1.1+i*.05);}
  levelUp(){this.sample('bank',.28);this.sample('impact1',.16,0,.13,1.2);}
  whoosh(){if(this.ok())this.noise(.2,.08,'bandpass',700,0,0,1,1700);}
  prize(){this.sample('bank',.32);this.sample('impact4',.18,0,.12,1.25);}
  button(){this.sample('insert',.13,0,0,1.12);}

  // 联动各有声音身份；同类触发限频，避免密集构筑挤满音频节点。
  synergy(type, pan = 0) {
    if (!this.ok()) return;
    this.eventTimes ||= {};
    const now = performance.now();
    if (now - (this.eventTimes[type] || -1000) < 110) return;
    this.eventTimes[type] = now;
    if (type === 'grow') {
      this.sample('impact0',.16,pan,0,1.1);this.sample('impact2',.12,pan,.15,1.25);
    } else if (type === 'hunt') {
      this.noise(.055,.14,'bandpass',750,0,pan,2,1700);
      this.sample('impact3',.21,pan,.07,1.05);
    } else if (type === 'charge') {
      this.noise(.035,.065,'highpass',6500,0,pan);this.noise(.025,.04,'bandpass',9000,.07,pan,1.5);this.sample('impact4',.13,pan,.08,1.25);
    } else if (type === 'explode') {
      this.noise(.35,.28,'lowpass',1100,0,pan,1,100);
      this.tone('sine',105,32,.42,.26,0,pan,.1);
      this.duckMusic(.4);
    } else if (type === 'purify') {
      this.sample('impact0',.17,pan,0,1.35);this.sample('impact1',.1,pan,.13,1.4);
    } else this.clink(.6,pan);
  }
  bank({count=1,tier=1}){
    this.sample(count>=3?'bank':'impact'+Math.floor(Math.random()*5),tier===3?.45:tier===2?.33:.23,0,0,.98+Math.random()*.06);
    if(tier>=2)this.sample('impact2',.14,0,.07,1.2);if(tier===3)this.duckMusic(.5);
  }
  duckMusic(amount=.6,seconds=.3) {
    if(!this.music)return;
    const t=this.t,g=this.music.gain;
    g.cancelScheduledValues(t);g.setTargetAtTime(this.musicBase*(1-amount),t,.025);g.setTargetAtTime(this.musicBase,t+seconds,.16);
  }

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
          if (s === 2 || s === 6) ch.forEach(n => play('sine', root * 2 * Math.pow(2, n / 12), next, step * 0.7, 0.06));
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
  setEnabled(on) { this.enabled = on; if (this.sfx) this.sfx.gain.value = on ? .9 : 0; }
}
