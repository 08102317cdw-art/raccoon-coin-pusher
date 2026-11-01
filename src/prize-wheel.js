import { LOTTERY } from './stage-rewards.js?v=3.1.0';
import { wheelTarget } from './wheel-math.js?v=3.2.0';
const COLORS = ['#895631', '#285f5d', '#78435a', '#40547e', '#376343', '#80612f'];
const ICONS = [
 '<ellipse cy="4" rx="14" ry="6"/><path d="M-14 4v7c0 8 28 8 28 0V4M-10-4c0 7 24 7 24 0s-24-7-24 0Z"/>',
 '<path d="M-17-10h34v6a6 6 0 0 0 0 12v6h-34V8a6 6 0 0 0 0-12Z"/><path d="M0-8v3m0 5v3m0 5v3"/>',
 '<path d="M-17 10C-27-8-8-24 0-11 8-24 27-8 17 10L0 18Z"/><path d="M0-10v28M-13-9l7 23M13-9 6 14"/>',
 '<path d="M-16-4h32v24h-32Zm-3-9h38v9h-38ZM0-13v33M0-13c-21 0-19-20-7-12Z M0-13c21 0 19-20 7-12Z"/>',
 '<circle r="19"/><path d="m0-12 3 8 9 4-9 3-3 9-3-9-9-3 9-4Z"/>',
 '<path d="M-18 14c0 7 36 7 36 0v-7M-18 7c0 7 36 7 36 0V0M-18 0c0 7 36 7 36 0v-7M-18-7c0 7 36 7 36 0s-36-7-36 0Z"/>'
];
export function createPrizeWheel() {
  const panel = document.getElementById('lottery');
  panel.hidden = false;
  panel.classList.remove('is-docked');
  panel.innerHTML = `<header class="wheel-heading"><div><span class="eyebrow">BONUS MACHINE</span><h3>幸运轮盘</h3></div><button id="lottery-dock" type="button" aria-label="收起幸运轮盘">×</button></header><div class="wheel-mechanism"><i class="wheel-pointer" aria-hidden="true"></i><div id="lottery-wheel" role="img" aria-label="幸运轮盘：金币雨、兑币票、贝壳、海湾礼品、特殊币、币塔。概率不同，每八枚入账金币自动抽奖。"><svg viewBox="0 0 300 300" aria-hidden="true"><defs><radialGradient id="wheel-metal"><stop stop-color="#fff1b3"/><stop offset=".7" stop-color="#c89852"/><stop offset="1" stop-color="#72512e"/></radialGradient></defs><circle cx="150" cy="150" r="149" fill="#151d1b" stroke="#876644" stroke-width="2"/><circle cx="150" cy="150" r="142" fill="url(#wheel-metal)"/><g transform="translate(150 150)"><g id="wheel-rotor">${LOTTERY.map((item, i) => {
      const a = (i * 60 - 120) * Math.PI / 180, b = a + Math.PI / 3;
      return `<g data-sector="${item.id}"><path d="M0 0L${Math.cos(a)*129} ${Math.sin(a)*129}A129 129 0 0 1 ${Math.cos(b)*129} ${Math.sin(b)*129}Z" fill="${COLORS[i]}" stroke="#d7b773" stroke-width="1.5"/><g transform="rotate(${i*60})"><g transform="translate(0 -86)" fill="none" stroke="#ffedc0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[i]}</g><text x="0" y="-46" text-anchor="middle" fill="#fff4d7" font-size="16" font-weight="700">${item.name.replace('海湾','')}</text></g></g>`;
    }).join('')}</g></g><circle cx="150" cy="150" r="31" fill="#182d29" stroke="#dfb774" stroke-width="4"/><text x="150" y="155" text-anchor="middle" fill="#f5db9e" font-family="Georgia" font-size="14" font-weight="bold">LUCK</text>${Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return `<circle cx="${150+136*Math.cos(a)}" cy="${150+136*Math.sin(a)}" r="2.7" fill="#ffe2a4"/>`;}).join('')}</svg></div></div><div class="wheel-readout" role="status" aria-live="polite" aria-atomic="true"><span id="wheel-state">等待能量</span><strong id="wheel-prize">下一份好运，正在路上</strong><p id="lottery-result">每 8 枚入账金币自动抽奖</p></div><p class="wheel-footnote">扇区为奖励分类，非等概率</p>`;
  const rotor = panel.querySelector('#wheel-rotor');
  const state = panel.querySelector('#wheel-state');
  const title = panel.querySelector('#wheel-prize');
  const result = panel.querySelector('#lottery-result');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const queue = []; let rotation = 0, spinning = false, animation = null, generation = 0;
  function next() {
    if (spinning || !queue.length) return;
    const item = queue.shift(), index = LOTTERY.findIndex(x => x.id === item.id);
    if(index < 0) { next(); return; }
    spinning = true; const g = ++generation;
    panel.classList.add('is-spinning'); panel.classList.remove('has-result');
    state.textContent = '好运转动中'; title.textContent = '指针将为你停靠';
    result.textContent = queue.length ? `还有 ${queue.length} 次抽奖排队` : '奖励已经入账，正在揭晓结果';
    const target = wheelTarget(rotation, index);
    const finish = () => {
      if(g !== generation)return;
      rotor.style.transform = `rotate(${target}deg)`; rotation = target;
      panel.classList.remove('is-spinning'); panel.classList.add('has-result');
      state.textContent = '本次获得'; title.textContent = item.name; result.textContent = item.text;
      panel.dataset.winner = item.id; spinning = false;
      setTimeout(next, reduced.matches ? 50 : 900);
    };
    // Animate a wrapper with a stable transform-origin. No random cosmetic stop.
    const duration = reduced.matches ? 50 : 3400;
    animation = rotor.animate([{transform:`rotate(${rotation}deg)`},{transform:`rotate(${target}deg)`}],{duration,easing:'cubic-bezier(.12,.72,.15,1)',fill:'forwards'});
    animation.onfinish = () => { finish(); animation.cancel(); };
  }
  return {
    enqueue(item) { queue.push(item); next(); },
    get spinning(){ return spinning; },
    get rotation(){ return rotation; },
    get queued(){ return queue.length; },
    destroy(){generation++; animation?.cancel();queue.length=0;},
  };
}
