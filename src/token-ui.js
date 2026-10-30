import { TOKENS, SPECIAL_IDS, BAD_IDS, PACKS } from './tokens.js?v=2.2.0';
const el=id=>document.getElementById(id);
export function createTokenUI({kit,run,entities,save,pauseInput,sfx,changed}) {
 let tab='bag',signature='',shopSignature='';
 const modal=el('token-modal');
 const close=()=>{modal.hidden=true;pauseInput();document.querySelector('#app canvas')?.focus({preventScroll:true});};
 const button=(text,fn,cls='')=>{const b=document.createElement('button');b.textContent=text;b.className=cls;b.onclick=fn;return b;};
 function paint(){
  const t=kit(),r=run(),cards=el('token-cards');cards.replaceChildren();
  el('token-tab-bag').setAttribute('aria-selected',tab==='bag');el('token-tab-atlas').setAttribute('aria-selected',tab==='atlas');
  el('token-title').textContent=tab==='bag'?'选择下一枚投出的币':'代币图鉴与联动';
  el('token-subtitle').textContent=tab==='bag'?'特殊币替换本次普通投币，仍消耗 1 次额度；用完自动切回普通币。':'邻近联动只在台面触发；漏出两侧的代币不会入账。数值为大肥鱼版。';
  if(tab==='bag'){
   const normal=document.createElement('article');normal.className='token-card';normal.innerHTML='<span class="token-glyph">鲸</span><h3>普通金币</h3><p>基础 10 分。不限币仓数量，但每次仍消耗投币额度。</p>';
   normal.append(button(t.selected==='coin'?'✓ 当前选择':'选择普通币',()=>{t.select('coin');save();close();refresh(true);},'token-select'));cards.append(normal);
  }
  for(const id of [...SPECIAL_IDS,...(tab==='atlas'?BAD_IDS:[])]){
   const d=TOKENS[id],count=t.bag[id]||0,card=document.createElement('article');card.className='token-card'+(d.group==='坏币'?' bad':'');
   const glyph=document.createElement('span');glyph.className='token-glyph';glyph.textContent=d.glyph;glyph.style.color=d.color;
   const title=document.createElement('h3');title.textContent=d.name;
   const group=document.createElement('small');group.textContent=`${d.group} · ${d.base} 基础分${tab==='bag'?` · 库存 ${count}`:''}`;
   const desc=document.createElement('p');desc.textContent=d.desc;
   card.append(glyph,title,group,desc);
   if(tab==='bag'){const b=button(t.selected===id?'✓ 当前选择':count>0?`选择 · 剩 ${count}`:id==='tree'?'由种子 + 水滴生成':'暂无库存 · 关间补给',()=>{if(t.select(id)){save();close();refresh(true);}},'token-select');b.disabled=count===0;card.append(b);}
   cards.append(card);
  }
  const log=el('token-event-log');log.textContent=t.eventLog.length?t.eventLog.join(' / '):'搭配提示：种子 + 水滴 → 摇钱树；虾米 → 鱼鱼 → 猫猫；闪电 → 充能 → 电池；母鸡 + 公鸡 → 蛋。';
 }
 function refresh(force=false){
  const t=kit(),r=run(),field=entities().filter(e=>e.state==='field'&&!e.tokenDead),bad=field.filter(e=>BAD_IDS.includes(e.kind)).length;
  const next=JSON.stringify([t.selected,t.remaining,bad,t.globalFactor(field).toFixed(2),r.shots,t.eventLog[0]]);
  if(!force&&next===signature)return;signature=next;
  el('token-open').textContent=`${TOKENS[t.selected]?.glyph||'鲸'} ${TOKENS[t.selected]?.name||'普通金币'} · ${t.selected==='coin'?'∞':t.bag[t.selected]} · 选择`;
  el('token-open').setAttribute('aria-label',`打开代币仓，当前${TOKENS[t.selected]?.name||'普通金币'}`);
  el('token-field-status').textContent=`台面坏币 ${bad} · 环境 ×${t.globalFactor(field).toFixed(2)}`;
  el('token-latest').textContent=t.eventLog[0]||'首批代币已放入币仓 · 点此选择';
  if(!modal.hidden)paint();
 }
 el('token-open').onclick=()=>{pauseInput();tab='bag';modal.hidden=false;paint();el('token-close').focus();};
 el('token-close').onclick=close;
 el('token-tab-bag').onclick=()=>{tab='bag';paint();};el('token-tab-atlas').onclick=()=>{tab='atlas';paint();};
 modal.onclick=e=>{if(e.target===modal)close();};
 modal.addEventListener('keydown',e=>{
  if(e.key==='Escape'){close();e.stopPropagation();}
  if(e.key==='Tab'){const ns=[...modal.querySelectorAll('button:not(:disabled)')].filter(n=>n.getClientRects().length),first=ns[0],last=ns.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 });
 function shop(force=false){
  const t=kit(),r=run();if(r.phase!=='shop')return;t.prepareShop(r.round);
  const sig=JSON.stringify([r.round,r.cash,t.packBought,t.claimed,t.remaining]);if(!force&&sig===shopSignature)return;shopSignature=sig;
  el('token-shop-note').textContent=`本关可免费领取 1 份补给，再用贝壳购买；币仓共 ${t.remaining} 枚。${t.claimed?'免费补给已领取。':''}`;
  const list=el('token-shop-cards');list.replaceChildren();
  for(const id of t.shopOffers){const pack=PACKS[id],card=document.createElement('article');card.className='token-pack';const title=document.createElement('h4');title.textContent=pack.name;const desc=document.createElement('p');desc.textContent=Object.entries(pack.items).map(([k,n])=>`${TOKENS[k].name} ×${n}`).join(' · ');const actions=document.createElement('div');
   const claim=button(t.claimed?'已领免费补给':'免费领取',()=>{if(t.claimPack(id,r)){sfx();save();changed?.();shop(true);refresh(true);}});claim.disabled=t.claimed;
   const buy=button(t.packBought.includes(id)?'✓ 已购买':`购买 · ${pack.cost} 贝壳`,()=>{if(t.buyPack(id,r)){sfx();save();changed?.();shop(true);refresh(true);document.getElementById('shop-wallet').textContent=r.cash;}});buy.disabled=t.packBought.includes(id)||r.cash<pack.cost;
   actions.append(claim,buy);card.append(title,desc,actions);list.append(card);
  }
 }
 return {refresh,shop,close,isOpen:()=>!modal.hidden};
}
