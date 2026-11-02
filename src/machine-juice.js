// 收币按短窗口汇总，普通收益与大奖使用不同演出，DOM 特效数量有界。
export function createMachineJuice(root,{onBatch=()=>{}}={}) {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),host=root.querySelector('#machine-fx');
 let live=0,pending=null,timer=null,batches=0;
 const aperture=root.querySelector('#machine-window');
 const stroke=document.createElement('div');stroke.id='push-readout';stroke.setAttribute('aria-hidden','true');
 stroke.innerHTML='<span class="stroke-dot"></span><span class="stroke-copy">推板推进</span><span class="stroke-track"><i></i></span>';aperture.append(stroke);
 const haul=document.createElement('div');haul.id='haul-readout';haul.setAttribute('aria-hidden','true');aperture.append(haul);
 let haulCount=0,haulAt=-10000,haulTimer;
 const pulse=(el,keyframes,ms=260)=>{if(!el||reduced.matches)return;el.animate(keyframes,{duration:ms,easing:'ease-out'});};
 function flight(x,y,dest,big=false){
  if(reduced.matches||live>=14)return;
  const r=root.getBoundingClientRect(),coin=document.createElement('i');coin.className='score-spark'+(big?' is-large':'');coin.textContent=big?'✦':'◒';host.append(coin);live++;
  coin.style.left=(x-r.left)+'px';coin.style.top=(y-r.top)+'px';
  const a=coin.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-50%) scale(1.25)',opacity:1,offset:.12},{transform:`translate(${dest.left+dest.width/2-x}px,${dest.top+dest.height/2-y}px) scale(.3)`,opacity:0}],{duration:big?670:490,easing:'cubic-bezier(.2,.6,.4,1)'});
  a.onfinish=()=>{coin.remove();live--;};
 }
 function flush(){
  clearTimeout(timer);timer=null;if(!pending)return;const b=pending;pending=null;batches++;
  const score=root.querySelector('#round-score'),dest=score.getBoundingClientRect(),tier=b.points>=350?3:b.count>=5||b.points>=100?2:1;
  pulse(score,[{transform:`scale(${tier===3?1.24:1.12})`,color:'#fff6c8'},{transform:'scale(1)',color:'#f2ecd7'}],tier===3?420:240);
  const r=root.getBoundingClientRect(),label=document.createElement('div');label.className='score-batch tier-'+tier;
  label.innerHTML=`<small>${b.count>1?'收币 '+b.count+' 枚':b.special?'特别入账':'金币入账'}</small><strong>+${b.points.toLocaleString()}</strong>`;
  label.style.left=Math.max(65,Math.min(r.width-65,b.x-r.left))+'px';label.style.top=Math.max(80,Math.min(r.height-165,b.y-r.top))+'px';
  if(host.childElementCount<24){host.append(label);const a=label.animate(reduced.matches?[{opacity:1},{opacity:0}]:[{transform:'translate(-50%,12px) scale(.8)',opacity:0},{transform:'translate(-50%,0) scale(1.05)',opacity:1,offset:.15},{transform:'translate(-50%,-32px) scale(1)',opacity:0}],{duration:tier===3?1300:950,easing:'ease-out'});a.onfinish=()=>label.remove();}
  const now=performance.now();haulCount=now-haulAt<1200?haulCount+b.count:b.count;haulAt=now;
  haul.innerHTML=`<span>${haulCount>=5?'哗啦！连落':'前沿收币'}</span><strong>${haulCount}<small> 枚</small></strong>`;
  haul.classList.add('show');clearTimeout(haulTimer);haulTimer=setTimeout(()=>haul.classList.remove('show'),1500);
  for(let i=0;i<Math.min(5,b.count);i++)flight(b.x+(i-2)*13,b.y,dest,tier>1);onBatch({...b,tier});
 }
 function score({x,y,points=0,combo=0,special=false}){
  if(points<=0)return;if(!pending)pending={x,y,points:0,count:0,combo:0,special:false};
  pending.points+=points;pending.count++;pending.combo=Math.max(pending.combo,combo);pending.special ||= special;pending.x=x;pending.y=y;
  if(pending.count>=12)flush();else if(!timer)timer=setTimeout(flush,160);
 }
 function combo(level){const el=root.querySelector('#combo-signal');el.textContent=`奖励轮蓄能 ×${level}`;el.classList.add('lit');pulse(el,[{transform:'translate(-50%,12px) scale(.8)',opacity:0},{transform:'translate(-50%,0) scale(1)',opacity:1}],350);setTimeout(()=>el.classList.remove('lit'),950);}
 function event(text,type='grow'){const log=root.querySelector('#machine-event');if(!log)return;log.dataset.type=type;log.textContent=text;log.classList.add('show');clearTimeout(log._timer);log._timer=setTimeout(()=>log.classList.remove('show'),1800);}
 root.addEventListener('wheel:reward',()=>{if(!reduced.matches)pulse(root.querySelector('#machine-window'),[{filter:'brightness(1.16)'},{filter:'brightness(1)'}],360);});
 root.addEventListener('pointerdown',e=>{const b=e.target.closest('#chute-row button');if(b&&!b.disabled)pulse(b,[{filter:'brightness(1.2)'},{filter:'brightness(1)'}],140);});
 function timing({forward,progress,phase}) {
  stroke.dataset.forward=String(forward);stroke.querySelector('.stroke-copy').textContent=phase==='settling'?'等待落币':forward?'推进 · 挤压币堆':'收回 · 上层落币';
  stroke.querySelector('i').style.transform=`scaleX(${Math.max(.03,progress)})`;
 }
 return {score,combo,pulse,event,flush,timing,get batches(){return batches;},get pending(){return pending?.points||0;}};
}
