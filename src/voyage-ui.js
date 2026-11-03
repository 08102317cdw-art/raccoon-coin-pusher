import { coinArt } from './token-art.js?v=4.3.0';
import { TOKENS } from './tokens.js?v=4.3.0';

// 航路选择、收藏与战报共用真实局内数据，不重建物理画布。
export function createVoyageUI({crew,difficulties,journal,resume,getRun,getTokens,onEndless}) {
 const $=id=>document.getElementById(id),start=$('start');
 let character='gardener',difficulty='standard';
 const setup=document.createElement('section');setup.id='voyage-setup';setup.setAttribute('aria-label','选择新航路');
 setup.innerHTML=`<div class="voyage-heading"><span>选择你的船员</span><small>三条航路 · 不同起手与专属改装</small></div><div id="crew-options" role="group" aria-label="船员"></div><div id="crew-brief" aria-live="polite"></div><fieldset id="difficulty-options"><legend>航路难度</legend></fieldset><p id="difficulty-brief"></p><p id="voyage-history"></p>`;
 $('start-button').before(setup);
 const crewHost=$('crew-options'),difficultyHost=$('difficulty-options');
 function paint(){
  for(const b of crewHost.children){const chosen=b.dataset.crew===character;b.setAttribute('aria-pressed',String(chosen));}
  for(const b of difficultyHost.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.difficulty===difficulty));
  const c=crew[character];
  $('crew-brief').innerHTML=`<div class="crew-pool">${Object.keys(c.starter).filter(id=>id!=='killer').slice(0,5).map(id=>coinArt(id,TOKENS[id].color)).join('')}<span>${c.group}供给优先</span></div><strong>${c.desc}</strong><p>${c.passive}</p>`;
  $('difficulty-brief').textContent=difficulties[difficulty].desc;
 }
 for(const [id,c]of Object.entries(crew)){
  const b=document.createElement('button');b.type='button';b.dataset.crew=id;b.className='crew-option';
  b.innerHTML=coinArt(c.key[0],c.color)+`<strong>${c.name}</strong><span>${c.group}航路</span>`;
  b.onclick=()=>{character=id;paint();};crewHost.append(b);
 }
 for(const [id,d]of Object.entries(difficulties)){
  const b=document.createElement('button');b.type='button';b.dataset.difficulty=id;b.textContent=d.name;
  b.onclick=()=>{difficulty=id;paint();};difficultyHost.append(b);
 }
 const history=()=>{const j=journal();$('voyage-history').textContent=j.runs?`航海记录：${j.runs} 局 · ${j.wins} 次通关 · 发现 ${j.discovered.length} 种币`:'第一次出航？推荐园丁与平静海湾，先让种子遇见水。';};
 if(resume){setup.hidden=true;const note=document.createElement('p');note.className='resume-note';note.textContent=`已保留第 ${getRun().round} 关进度 · ${crew[getRun().character]?.name||'海湾自由构筑'}`;$('start-button').before(note);$('start-button').textContent='继续这次航行 →';}
 else $('start-button').textContent='开启航路 →';
 paint();history();
 const report=document.createElement('section');report.id='voyage-report';report.hidden=true;
 const service=$('run-modal').querySelector('.service-scroll');service.querySelector('.receipt-roll').after(report);
 const endless=document.createElement('button');endless.id='continue-endless';endless.type='button';endless.className='primary-action';endless.textContent='保留构筑 · 驶向无尽海域 →';endless.hidden=true;
 endless.onclick=onEndless;$('next-round').before(endless);
 const ledger=document.createElement('details');ledger.id='voyage-ledger';ledger.innerHTML='<summary>航海手册 · 收藏与纪念章</summary><div class="ledger-content"></div>';
 start.append(ledger);
 function ledgerPaint(){
  const j=journal(),box=ledger.querySelector('.ledger-content');
  box.innerHTML=`<p>已发现 ${j.discovered.length} 种币与礼品 · 最远第 ${j.bestRound} 关</p><div class="ledger-coins">${j.discovered.map(id=>`<span title="${TOKENS[id]?.name||({coin:'金币',big:'大金币',gem:'宝石',plush:'立牌',shell:'海贝',chest:'宝箱',plushie:'玩偶'})[id]}">${coinArt(id,TOKENS[id]?.color)}</span>`).join('')}</div><div class="voyage-medals">${j.milestones.map(m=>`<span class="${m.earned?'earned':''}" title="${m.desc}">${m.earned?'◆':'◇'} ${m.name}<small>${m.desc}</small></span>`).join('')}</div>`;
 }
 ledger.addEventListener('toggle',()=>{if(ledger.open)ledgerPaint();});
 let signature='';
 function update(force=false){
  const r=getRun(),j=journal(),terminal=['victory','gameover'].includes(r.phase);endless.hidden=r.phase!=='victory';
  report.hidden=!terminal;if(!terminal)return;
  const sig=r.id+':'+r.phase+':'+r.total+':'+r.round+':'+j.unlocks.length;if(sig===signature&&!force)return;signature=sig;
  const s=r.summary(getTokens().stats),minutes=Math.floor(s.elapsed/60),seconds=s.elapsed%60,events=Object.values(s.synergies).reduce((sum,n)=>sum+n,0);
  report.innerHTML=`<div class="voyage-heading"><strong>本次航海战报</strong><span>${crew[r.character]?.name||'海湾自由构筑'} · ${difficulties[r.difficulty].name}</span></div><dl><div><dt>累计得分</dt><dd>${r.total.toLocaleString()}</dd></div><div><dt>最高连击</dt><dd>${s.stats.bestCombo}</dd></div><div><dt>联动次数</dt><dd>${events}</dd></div><div><dt>航行时间</dt><dd>${minutes}:${String(seconds).padStart(2,'0')}</dd></div></dl><p>发现 ${j.discovered.length} 种币 · 纪念章 ${j.unlocks.length}/${j.milestones.length} · 最远第 ${j.bestRound} 关</p><div class="voyage-medals">${j.milestones.filter(m=>m.earned).map(m=>`<span class="earned">◆ ${m.name}</span>`).join('')}</div>`;
 }
 return {get options(){return {character,difficulty};},update,refresh:()=>{history();ledgerPaint();}};
}
