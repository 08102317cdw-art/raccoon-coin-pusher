import * as THREE from 'three';

const mk = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export function drawRaccoonFace(g, cx, cy, s, cols) {
  const { fur = '#8d8f9c', dark = '#2b2d38', white = '#f4f1ea', eye = '#111', nose = '#1a1a1a' } = cols || {};
  g.save(); g.translate(cx, cy); g.scale(s, s);
  // 耳朵
  for (const sx of [-1, 1]) {
    g.fillStyle = dark; g.beginPath(); g.ellipse(sx * 0.62, -0.62, 0.3, 0.34, sx * 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = fur; g.beginPath(); g.ellipse(sx * 0.62, -0.6, 0.18, 0.22, sx * 0.5, 0, Math.PI * 2); g.fill();
  }
  // 头
  g.fillStyle = fur; g.beginPath(); g.ellipse(0, 0, 0.95, 0.8, 0, 0, Math.PI * 2); g.fill();
  // 白色脸颊
  g.fillStyle = white; g.beginPath(); g.ellipse(0, 0.25, 0.75, 0.52, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-0.35, -0.42, 0.22, 0.12, 0.3, 0, Math.PI * 2); g.ellipse(0.35, -0.42, 0.22, 0.12, -0.3, 0, Math.PI * 2); g.fill();
  // 眼罩
  g.fillStyle = dark;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.38, -0.08, 0.36, 0.22, sx * -0.35, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.ellipse(0, -0.02, 0.2, 0.12, 0, 0, Math.PI * 2); g.fill();
  // 眼睛
  for (const sx of [-1, 1]) {
    g.fillStyle = eye; g.beginPath(); g.arc(sx * 0.38, -0.08, 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * 0.38 + 0.04, -0.12, 0.045, 0, Math.PI * 2); g.fill();
  }
  // 鼻子嘴巴
  g.fillStyle = nose; g.beginPath(); g.ellipse(0, 0.2, 0.12, 0.08, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = nose; g.lineWidth = 0.05; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0.26); g.lineTo(0, 0.36); g.arc(-0.1, 0.36, 0.1, 0, Math.PI, false); g.moveTo(0, 0.36); g.arc(0.1, 0.36, 0.1, Math.PI, 0, true); g.stroke();
  g.restore();
}

export function coinTextures() {
  const S = 512;
  const [c, g] = mk(S);
  const grd = g.createRadialGradient(S * 0.4, S * 0.35, S * 0.05, S / 2, S / 2, S / 2);
  grd.addColorStop(0, '#fff1b8'); grd.addColorStop(0.5, '#f7c948'); grd.addColorStop(1, '#c9891a');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#b07510'; g.lineWidth = 26; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 18, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#ffe9a1'; g.lineWidth = 6; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 40, 0, Math.PI * 2); g.stroke();
  // 齿纹圈点
  g.fillStyle = '#d99a22';
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; g.beginPath(); g.arc(S / 2 + Math.cos(a) * (S / 2 - 58), S / 2 + Math.sin(a) * (S / 2 - 58), 5, 0, Math.PI * 2); g.fill(); }
  drawRaccoonFace(g, S / 2, S / 2 + 6, 128, { fur: '#e0a52b', dark: '#9c6510', white: '#ffe7a0', eye: '#7a4c06', nose: '#7a4c06' });
  // bump 贴图
  const [b, bg] = mk(S);
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, S, S);
  bg.strokeStyle = '#ffffff'; bg.lineWidth = 26; bg.beginPath(); bg.arc(S / 2, S / 2, S / 2 - 18, 0, Math.PI * 2); bg.stroke();
  bg.fillStyle = '#5a5a5a'; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; bg.beginPath(); bg.arc(S / 2 + Math.cos(a) * (S / 2 - 58), S / 2 + Math.sin(a) * (S / 2 - 58), 5, 0, Math.PI * 2); bg.fill(); }
  drawRaccoonFace(bg, S / 2, S / 2 + 6, 128, { fur: '#c8c8c8', dark: '#9a9a9a', white: '#e8e8e8', eye: '#555', nose: '#555' });
  // 侧边齿纹
  const [sc, sg] = mk(256, 16);
  for (let x = 0; x < 256; x += 4) { sg.fillStyle = (x / 4) % 2 ? '#f2bf40' : '#a8700f'; sg.fillRect(x, 0, 4, 16); }
  const side = tex(sc); side.wrapS = THREE.RepeatWrapping; side.repeat.set(10, 1);
  return { face: tex(c), bump: tex(b, false), side };
}

export function floorTexture() {
  const S = 1024, [c, g] = mk(S);
  const grd = g.createLinearGradient(0, 0, 0, S); grd.addColorStop(0, '#123a4a'); grd.addColorStop(1, '#0c5566');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  g.globalAlpha = 0.18; g.fillStyle = '#7ff3ff';
  for (let i = 0; i < 26; i++) {
    const x = (i * 197) % S, y = (i * 331) % S, r = 26;
    g.beginPath(); g.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 4; k++) { const a = -Math.PI * 0.85 + k * 0.56; g.beginPath(); g.arc(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, r * 0.38, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 0.25; g.strokeStyle = '#ffd36b'; g.lineWidth = 14;
  for (let y = 120; y < S; y += 260) for (let x = S * 0.2; x < S; x += S * 0.3) { g.beginPath(); g.moveTo(x - 40, y); g.lineTo(x, y + 40); g.lineTo(x + 40, y); g.stroke(); }
  g.globalAlpha = 1;
  return tex(c);
}

export function stripeTexture(a = '#ff8a1f', b = '#ffc23d', label = '') {
  const [c, g] = mk(1024, 128);
  g.fillStyle = a; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = b; for (let x = -128; x < 1024; x += 96) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 48, 128); g.lineTo(x + 176, 0); g.lineTo(x + 128, 0); g.fill(); }
  if (label) {
    g.fillStyle = 'rgba(40,20,0,0.75)'; g.fillRect(360, 18, 304, 92);
    g.font = '900 64px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff3c4'; g.fillText(label, 512, 66);
  }
  return tex(c);
}

export function plateTexture() {
  const S = 512, [c, g] = mk(S);
  g.fillStyle = '#c7ced8'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,70,80'},0.05)`; g.fillRect(0, Math.random() * S, S, 1); }
  g.fillStyle = 'rgba(80,90,110,0.35)';
  for (let y = 32; y < S; y += 64) for (let x = (y / 64 % 2) * 32 + 32; x < S; x += 64) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function wallTexture() {
  const S = 512, [c, g] = mk(S);
  const grd = g.createLinearGradient(0, 0, 0, S); grd.addColorStop(0, '#2a1446'); grd.addColorStop(1, '#3d1b5c');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,200,255,0.07)';
  for (let y = 0; y < S; y += 64) for (let x = (y / 64 % 2) * 32; x < S; x += 64) { g.beginPath(); g.moveTo(x, y + 32); g.lineTo(x + 32, y); g.lineTo(x + 64, y + 32); g.lineTo(x + 32, y + 64); g.fill(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function glowSprite() {
  const [c, g] = mk(128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  // 十字星芒
  g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(62, 4, 4, 120); g.fillRect(4, 62, 120, 4);
  return tex(c);
}

export function textTexture(text, w, h, opts = {}) {
  const [c, g] = mk(w, h);
  g.font = opts.font || `900 ${h * 0.6}px "Arial Black", "Noto Sans SC", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); }
  g.lineWidth = opts.stroke || h * 0.08; g.strokeStyle = opts.strokeColor || '#3a1500'; g.lineJoin = 'round';
  g.strokeText(text, w / 2, h / 2);
  g.fillStyle = opts.color || '#ffe27a'; g.fillText(text, w / 2, h / 2);
  return tex(c);
}

// ---------- 老虎机符号 ----------
export const SYMBOLS = ['raccoon', 'seven', 'coin', 'star', 'bell', 'cherry'];
export function drawSymbol(g, id, cx, cy, s) {
  g.save(); g.translate(cx, cy);
  switch (SYMBOLS[id]) {
    case 'raccoon': drawRaccoonFace(g, 0, 4, s * 0.42); break;
    case 'seven': {
      g.font = `900 ${s * 0.95}px "Arial Black", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = s * 0.12; g.strokeStyle = '#5a0010'; g.lineJoin = 'round'; g.strokeText('7', 0, s * 0.04);
      const gr = g.createLinearGradient(0, -s * 0.4, 0, s * 0.4); gr.addColorStop(0, '#ff7b8a'); gr.addColorStop(1, '#d4001f');
      g.fillStyle = gr; g.fillText('7', 0, s * 0.04); break;
    }
    case 'coin': {
      const gr = g.createRadialGradient(-s * 0.1, -s * 0.12, 2, 0, 0, s * 0.38); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(1, '#d99413');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.36, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#a86a00'; g.lineWidth = s * 0.05; g.stroke();
      g.font = `900 ${s * 0.42}px "Arial Black", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#a86a00'; g.fillText('$', 0, s * 0.02); break;
    }
    case 'star': {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.17 : s * 0.4, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); const gr = g.createLinearGradient(0, -s * 0.4, 0, s * 0.4); gr.addColorStop(0, '#fff27a'); gr.addColorStop(1, '#ffae00');
      g.fillStyle = gr; g.fill(); g.lineWidth = s * 0.045; g.strokeStyle = '#a35f00'; g.lineJoin = 'round'; g.stroke(); break;
    }
    case 'bell': {
      g.fillStyle = '#ffd23a'; g.strokeStyle = '#9b5d00'; g.lineWidth = s * 0.04;
      g.beginPath(); g.moveTo(-s * 0.34, s * 0.2); g.quadraticCurveTo(-s * 0.28, s * 0.1, -s * 0.26, -s * 0.08);
      g.quadraticCurveTo(-s * 0.24, -s * 0.34, 0, -s * 0.34); g.quadraticCurveTo(s * 0.24, -s * 0.34, s * 0.26, -s * 0.08);
      g.quadraticCurveTo(s * 0.28, s * 0.1, s * 0.34, s * 0.2); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, s * 0.26, s * 0.08, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -s * 0.38, s * 0.05, 0, Math.PI * 2); g.fill(); g.stroke(); break;
    }
    case 'cherry': {
      g.strokeStyle = '#2f8a2f'; g.lineWidth = s * 0.05; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-s * 0.16, s * 0.08); g.quadraticCurveTo(-s * 0.05, -s * 0.2, s * 0.12, -s * 0.36); g.moveTo(s * 0.18, s * 0.12); g.quadraticCurveTo(s * 0.14, -s * 0.15, s * 0.12, -s * 0.36); g.stroke();
      g.fillStyle = '#4caf50'; g.beginPath(); g.ellipse(s * 0.24, -s * 0.34, s * 0.14, s * 0.06, -0.4, 0, Math.PI * 2); g.fill();
      for (const [x, y] of [[-s * 0.17, s * 0.18], [s * 0.18, s * 0.22]]) {
        const gr = g.createRadialGradient(x - s * 0.05, y - s * 0.05, 1, x, y, s * 0.16); gr.addColorStop(0, '#ff8a9a'); gr.addColorStop(1, '#c4001c');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, s * 0.16, 0, Math.PI * 2); g.fill();
      }
      break;
    }
  }
  g.restore();
}
