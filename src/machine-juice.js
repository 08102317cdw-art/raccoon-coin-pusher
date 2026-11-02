// Bounded DOM effects. No endless timers, no strobe or forced motion.
export function createMachineJuice(root) {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),host=root.querySelector('#machine-fx');let live=0,lastPulse=0;
 const pulse=(el,keyframes,ms=260)=>{if(!el||reduced.matches)return;el.animate(keyframes,{duration:ms,easing:'ease-out'});};
 function score({x,y,points,combo=0}){
  const score=root.querySelector('#round-score');
  if(performance.now()-lastPulse>100){pulse(score,[{transform:'scale(1.13)',color:'#fff6c8'},{transform:'scale(1)',color:'#f2ecd7'}]);lastPulse=performance.now();}
  if(reduced.matches||live>=10)return;
  const r=root.getBoundingClientRect(),dest=score.getBoundingClientRect(),coin=document.createElement('i');coin.className='score-spark';coin.textContent=combo>=8?'✦':'◒';host.append(coin);live++;
  coin.style.left=(x-r.left)+'px';coin.style.top=(y-r.top)+'px';
  const a=coin.animate([{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{transform:'translate(-50%,-50%) scale(1.2)',opacity:1,offset:.12},{transform:`translate(${dest.left+dest.width/2-x}px,${dest.top+dest.height/2-y}px) scale(.35)`,opacity:0}],{duration:620,easing:'cubic-bezier(.2,.6,.4,1)'});
  a.onfinish=()=>{coin.remove();live--;};
 }
 function combo(level){const el=root.querySelector('#combo-signal');el.textContent=`连击蓄能 ×${level}`;el.classList.add('lit');pulse(el,[{transform:'translate(-50%,12px) scale(.8)',opacity:0},{transform:'translate(-50%,0) scale(1)',opacity:1}],350);setTimeout(()=>el.classList.remove('lit'),950);}
 root.addEventListener('wheel:reward',()=>{if(reduced.matches)return;pulse(root.querySelector('#machine-window'),[{filter:'brightness(1.18)'},{filter:'brightness(1)'}],400);for(let i=0;i<6;i++){const r=root.querySelector('#machine-window').getBoundingClientRect();score({x:r.left+r.width*(.25+i*.1),y:r.top+r.height*.55,points:0});}});
 root.addEventListener('pointerdown',e=>{const b=e.target.closest('#chute-row button');if(b&&!b.disabled)pulse(b,[{filter:'brightness(1.25)'},{filter:'brightness(1)'}],220);});
 return {score,combo,pulse};
}
