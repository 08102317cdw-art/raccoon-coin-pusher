import { LOTTERY, normalizeWheelItem, wheelItemsFor, wheelRewardText, spinBonusLottery } from './stage-rewards.js?v=3.3.0';
import { wheelTarget } from './wheel-math.js?v=3.2.0';
const COLORS = ['#90bbc8','#729fae','#e4ca7c','#839fbd','#aac9c0','#c88b77'];
const ICONS = [
 '<ellipse cy="4" rx="14" ry="6"/><path d="M-14 4v7c0 8 28 8 28 0V4M-10-4c0 7 24 7 24 0s-24-7-24 0Z"/>',
 '<path d="M-17-10h34v6a6 6 0 0 0 0 12v6h-34V8a6 6 0 0 0 0-12Z"/><path d="M0-8v3m0 5v3m0 5v3"/>',
 '<path d="M-17 10C-27-8-8-24 0-11 8-24 27-8 17 10L0 18Z"/><path d="M0-10v28M-13-9l7 23M13-9 6 14"/>',
 '<path d="M-16-4h32v24h-32Zm-3-9h38v9h-38ZM0-13v33M0-13c-21 0-19-20-7-12Z M0-13c21 0 19-20 7-12Z"/>',
 '<circle r="19"/><path d="m0-12 3 8 9 4-9 3-3 9-3-9-9-3 9-4Z"/>',
 '<path d="M-18 14c0 7 36 7 36 0v-7M-18 7c0 7 36 7 36 0V0M-18 0c0 7 36 7 36 0v-7M-18-7c0 7 36 7 36 0s-36-7-36 0Z"/>'
];
export function createPrizeWheel({canPresent=()=>true,onActive=()=>{},onReveal=()=>{},onChange=()=>{},random=Math.random}={}) {
 const panel=document.getElementById('lottery');panel.hidden=true;panel.className='hanging-wheel';panel.dataset.state='idle';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','吊绳奖励轮盘，奖励权重不同，非等概率');
 panel.innerHTML=`<div class="wheel-reel" aria-hidden="true"><i></i></div><div class="wheel-cord" aria-hidden="true"></div><div class="wheel-suspension"><div class="wheel-neck" aria-hidden="true"></div><div class="wheel-mechanism"><i class="wheel-pointer" aria-hidden="true"></i><div id="lottery-wheel" role="img" aria-label="奖励轮盘，固定指针指示实际奖励"><svg viewBox="0 0 300 300" aria-hidden="true"><defs><linearGradient id="wheel-enamel" x2=".7" y2="1"><stop stop-color="#e6f0dc"/><stop offset=".4" stop-color="#a4ced2"/><stop offset="1" stop-color="#487c91"/></linearGradient></defs><circle cx="150" cy="150" r="147" fill="url(#wheel-enamel)" stroke="#233f4c" stroke-width="4"/><circle cx="150" cy="150" r="136" fill="#f5ead1"/><g transform="translate(150 150)"><g id="wheel-rotor"></g></g><circle cx="150" cy="150" r="25" fill="#214b5b" stroke="#e7ce8e" stroke-width="4"/><text x="150" y="155" text-anchor="middle" fill="#f5e7b1" font-size="13" font-weight="bold">LUCK</text></svg></div></div><div class="wheel-readout" role="status" aria-live="polite" aria-atomic="true"><span id="wheel-state">连击奖励</span><strong id="wheel-prize">好运降临</strong><p id="lottery-result"></p></div><button id="lottery-dock" type="button">快进开奖</button><p class="wheel-footnote">奖励权重不同 · 非等概率</p></div>`;
 const rotor=panel.querySelector('#wheel-rotor'),assembly=panel.querySelector('.wheel-suspension'),cord=panel.querySelector('.wheel-cord'),button=panel.querySelector('#lottery-dock');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),queue=[];let current=null,rotation=0,state='idle',generation=0,timer=null,motion=null,alive=true,paid=false,skipRequested=false;
 const stateText=panel.querySelector('#wheel-state'),title=panel.querySelector('#wheel-prize'),result=panel.querySelector('#lottery-result');
 function setState(value){state=value;panel.dataset.state=value;panel.dispatchEvent(new CustomEvent('wheel:state',{detail:value}));}
 function later(fn,ms){clearTimeout(timer);timer=setTimeout(fn,ms);}
 function animate(el,frames,options,done){motion?.cancel();const g=generation;const a=el.animate(frames,{...options,duration:reduced.matches?1:options.duration});motion=a;a.onfinish=()=>{if(!alive||g!==generation)return;done?.();};return a;}
 function configure(item){
  const items=wheelItemsFor(item),step=360/items.length;
  rotor.innerHTML=items.map((x,i)=>{
   const a=(i*step-90-step/2)*Math.PI/180,b=a+step*Math.PI/180;
   return `<g data-sector="${x.id}"><path d="M0 0L${Math.cos(a)*129} ${Math.sin(a)*129}A129 129 0 0 1 ${Math.cos(b)*129} ${Math.sin(b)*129}Z" fill="${COLORS[i]}" stroke="#e9e5c9" stroke-width="2"/><g transform="rotate(${i*step})"><g transform="translate(0 -85)" fill="none" stroke="#183b4d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICONS[x.icon||0]}</g><text x="0" y="-48" text-anchor="middle" fill="#143243" font-size="16" font-weight="800">${x.name}</text></g></g>`;
  }).join('');
  rotation=0;rotor.style.transform='rotate(0deg)';
  panel.dataset.tier=items===LOTTERY?'base':'bonus';
 }
 function next(){
  if(!alive||state!=='idle'||!queue.length||!canPresent())return;
  current=queue.shift();configure(current);paid=false;skipRequested=false;generation++;panel.hidden=false;panel.classList.remove('has-result');delete panel.dataset.winner;
  setState('entering');onActive(true);onChange();stateText.textContent=`${panel.dataset.tier==='bonus'?'二级奖励轮':'连击奖励'} ×${current.level||1}`;title.textContent='好运降临';result.textContent='绳轮就位，准备开奖';button.textContent='快进开奖';button.focus({preventScroll:true});
  cord.animate([{transform:'scaleY(0)'},{transform:'scaleY(1.12)',offset:.65},{transform:'scaleY(1)'}],{duration:reduced.matches?1:680,easing:'ease-out',fill:'forwards'});
  animate(assembly,[{transform:'translateY(-520px) rotate(-9deg)'},{transform:'translateY(16px) rotate(4deg)',offset:.64},{transform:'translateY(-5px) rotate(-2deg)',offset:.83},{transform:'translateY(0) rotate(0)'}],{duration:720,easing:'cubic-bezier(.2,.7,.25,1)',fill:'forwards'},spin);
 }
 function spin(){
  setState('spinning');title.textContent='转动好运';result.textContent=queue.length?`另有 ${queue.length} 次奖励等待`:'等待指针停靠';
  const items=wheelItemsFor(current),i=items.findIndex(x=>x.id===current.id),target=wheelTarget(rotation,Math.max(0,i),items.length);
  animate(rotor,[{transform:`rotate(${rotation}deg)`},{transform:`rotate(${target}deg)`}],{duration:2600,easing:'cubic-bezier(.12,.68,.12,1)',fill:'forwards'},()=>{rotation=target;reveal();});
  if(skipRequested)motion?.finish();
 }
 function reveal(){
  if(paid||!current)return;paid=true;setState('revealed');rotor.style.transform=`rotate(${rotation}deg)`;
  panel.classList.add('has-result');panel.dataset.winner=current.id;stateText.textContent='本次获得';title.textContent=current.name;result.textContent=wheelRewardText(current);button.textContent='收绳继续';
  if(current.advance)queue.unshift({...spinBonusLottery(random),level:current.level});else onReveal(current);onChange();panel.dispatchEvent(new CustomEvent('wheel:reward',{bubbles:true,detail:current}));
  later(retract,reduced.matches?850:1450);
 }
 function retract(){
  if(state==='idle'||state==='retracting')return;clearTimeout(timer);setState('retracting');button.disabled=true;
  cord.animate([{transform:'scaleY(1)'},{transform:'scaleY(0)'}],{duration:reduced.matches?1:450,easing:'ease-in',fill:'forwards'});
  animate(assembly,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(14px) rotate(-3deg)',offset:.15},{transform:'translateY(-540px) rotate(5deg)'}],{duration:520,easing:'cubic-bezier(.5,0,.8,.3)',fill:'forwards'},()=>{
   panel.hidden=true;cord.getAnimations().forEach(a=>a.cancel());motion?.cancel();current=null;button.disabled=false;setState('idle');onActive(false);onChange();next();
  });
 }
 function skip(){if(state==='revealed'){retract();return;}if(state==='entering'){skipRequested=true;motion?.finish();}if(state==='spinning'){motion?.finish();}}
 button.onclick=skip;panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();skip();}if(e.key==='Tab'){e.preventDefault();button.focus();}});
 const onMotionChange=()=>{if(reduced.matches&&motion?.playState==='running')motion.finish();};reduced.addEventListener('change',onMotionChange);
 return {enqueue(item){const normalized=normalizeWheelItem(item);if(!normalized)return;queue.push(normalized);onChange();next();},update:next,
  get active(){return state!=='idle';},get state(){return state;},get spinning(){return ['entering','spinning'].includes(state);},get rotation(){return rotation;},get queued(){return queue.length;},get pending(){return [...(current&&!paid?[current]:[]),...queue].map(x=>({...x}));},
  destroy(){alive=false;generation++;clearTimeout(timer);motion?.cancel();cord.getAnimations().forEach(a=>a.cancel());queue.length=0;panel.hidden=true;onActive(false);reduced.removeEventListener('change',onMotionChange);}
 };
}
