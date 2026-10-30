import { TOKENS, SPECIAL_IDS, BAD_IDS, PACKS } from './tokens.js?v=2.2.0';
import { coinArt, arcadeToast } from './token-art.js?v=2.3.0';
const el=id=>document.getElementById(id);
const NORMAL={name:'普通金币',base:10,group:'基础',color:'#efc46a',desc:'鲸鱼纹的幸运金币。币仓不限量，每投一枚仍消耗 1 次关卡额度。'};
const routes={coin:['coin','multi','coin'],seed:['seed','water','tree'],water:['seed','water','tree'],tree:['seed','water','tree'],fish:['shrimp','fish','cat'],shrimp:['shrimp','fish','cat'],cat:['rat','cat','shell'],rat:['coin','rat','cat'],hen:['hen','rooster','egg'],rooster:['hen','rooster','egg'],egg:['egg','hen','egg'],clover:['clover','coin','multi'],multi:['multi','coin','multi'],lightning:['lightning','water','battery'],battery:['lightning','battery','relic'],magnet:['magnet','seed','water'],bomb:['bomb','bomb','coin'],echo:['fish','echo','fish'],relic:['relic','relic','relic'],killer:['rust','killer','shell'],rust:['rust','killer','shell'],thief:['thief','killer','shell'],decay:['decay','killer','shell']};
const hints={种植:'让种子与水滴在台面相遇。',捕食:'沿着食物链，把小币喂成高分币。',孵化:'把蛋留到下一关，开启鸡生蛋循环。',充能:'先充能，再传导，或让电池吸收。',增幅:'用印记或台面加成强化你的币。',物理:'吸拢或助推，让好币靠近出币口。',成长:'留在台面跨关，积攒更高币值。',净化:'坏币来袭时，把杀手币放到附近。',坏币:'危险代币！投放杀手币清除它。',基础:'搭配倍率币，让普通币也能高分入账。'};
export function createTokenUI({kit,run,entities,save,pauseInput,sfx,changed}) {
 let tab='bag',category='全部',preview='seed',signature='',shopSignature='',shopTab='upgrades',shopRound=0;
 const modal=el('token-modal');
 const close=()=>{modal.hidden=true;pauseInput();el('token-open').focus({preventScroll:true});};
 const button=(text,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;return b;};
 const def=id=>TOKENS[id]||NORMAL;
 function paintPreview(){
  const t=kit(),d=def(preview),count=t.bag[preview]||0;
  el('token-preview').dataset.kind=preview;el('preview-art').innerHTML=coinArt(preview,d.color,'hero-coin');
  el('preview-group').textContent=d.group+' / '+(d.group==='坏币'?'DANGER':'SPECIAL COIN');
  el('preview-name').textContent=d.name;el('preview-points').textContent=d.base;el('preview-desc').textContent=d.desc;
  el('preview-tip').textContent=hints[d.group];
  el('preview-route').innerHTML=(routes[preview]||routes.coin).map((id,i)=>`${i?'<span class="route-arrow" aria-hidden="true">→</span>':''}<span class="route-node">${coinArt(id,def(id).color)}<small>${id==='shell'?'贝壳':def(id).name.replace('币','')}</small></span>`).join('');
  el('preview-stock').textContent=tab==='atlas'?(BAD_IDS.includes(preview)?'危险 · 不可装填':'图鉴预览 · 不消耗代币'):`币仓存量 ${preview==='coin'?'∞':count} 枚`;
  const b=el('token-equip');b.hidden=tab==='atlas';b.disabled=preview!=='coin'&&count===0;
  b.textContent=preview==='tree'?'需要种子 + 水滴合成':b.disabled?'库存不足 · 去港口补给':`装填${d.name} →`;
  el('preview-atlas-note').hidden=tab!=='atlas';
 }
 function paint(){
  const t=kit(),cards=el('token-cards');const focused=document.activeElement?.dataset?.preview;
  el('token-tab-bag').setAttribute('aria-selected',tab==='bag');el('token-tab-atlas').setAttribute('aria-selected',tab==='atlas');
  el('token-title').textContent=tab==='bag'?'鲸鱼的百宝舱':'航海代币图鉴';
  el('token-subtitle').textContent=tab==='bag'?'挑一枚幸运，投进下一场冒险。':'收集灵感，把台面变成你的连锁乐园。';
  el('bag-total').textContent=tab==='bag'?`${t.remaining} 枚珍藏`:'22 种奇遇';
  const groups=['全部',...new Set(SPECIAL_IDS.map(id=>TOKENS[id].group)),...(tab==='atlas'?['坏币']:[])];
  const filters=el('token-filters');filters.replaceChildren();
  for(const name of groups){const b=button(name,()=>{category=name;paint();el('token-filters').querySelector(`[data-group="${name}"]`)?.focus({preventScroll:true});},'group-chip');b.dataset.group=name;b.setAttribute('aria-pressed',category===name);filters.append(b);}
  const ids=[...(tab==='bag'?['coin']:[]),...SPECIAL_IDS,...(tab==='atlas'?BAD_IDS:[])].filter(id=>category==='全部'||def(id).group===category);
  if(!ids.includes(preview))preview=ids[0]||'coin';
  cards.replaceChildren();
  ids.forEach((id,i)=>{const d=def(id),count=t.bag[id]||0,card=document.createElement('article');card.className='token-card'+(d.group==='坏币'?' bad':'')+(preview===id?' inspected':'')+(t.selected===id?' loaded':'');card.dataset.kind=id;card.style.setProperty('--i',i);card.style.setProperty('--accent',d.color);
   const b=button('',()=>{preview=id;sfx();paint();cards.querySelector(`[data-preview="${id}"]`)?.focus({preventScroll:true});},'token-peek');b.dataset.preview=id;b.setAttribute('aria-label',`查看${d.name}${tab==='bag'?`，库存 ${id==='coin'?'无限':count}`:''}`);b.setAttribute('aria-pressed',preview===id);
   b.innerHTML=`<span class="coin-stock">${tab==='atlas'?d.group:id==='coin'?'∞':id==='tree'?'合成':'×'+count}</span>${coinArt(id,d.color)}<h3>${d.name}</h3><small>${d.base} 基础分</small>${t.selected===id&&tab==='bag'?'<span class="loaded-marker">已装填</span>':''}`;card.append(b);cards.append(card);
  });
  paintPreview();el('token-event-log').textContent=t.eventLog[0]||'选中代币查看联动 · 装填后回到机台投币';
  if(focused)cards.querySelector(`[data-preview="${focused}"]`)?.focus({preventScroll:true});
 }
 el('token-equip').onclick=()=>{if(kit().select(preview)){sfx();save();close();refresh(true);arcadeToast(`${def(preview).name}已装填 · 瞄准后投币！`);}};
 function refresh(force=false){
  const t=kit(),r=run(),field=entities().filter(e=>e.state==='field'&&!e.tokenDead),bad=field.filter(e=>BAD_IDS.includes(e.kind)).length;
  const next=JSON.stringify([t.selected,t.remaining,bad,t.globalFactor(field).toFixed(2),r.shots,t.eventLog[0]]);
  if(!force&&next===signature)return;signature=next;
  const d=def(t.selected);el('token-open').innerHTML=`${coinArt(t.selected,d.color)}<span><small>下一枚 · 点击换币</small><b>${d.name}</b></span><span class="load-count">${t.selected==='coin'?'∞':'×'+t.bag[t.selected]}</span><span aria-hidden="true">›</span>`;
  el('token-open').setAttribute('aria-label',`打开代币仓，当前${d.name}`);
  el('token-field-status').textContent=`坏币 ${bad} · 环境 ×${t.globalFactor(field).toFixed(2)}`;el('token-field-status').classList.toggle('danger',bad>0);
  el('token-latest').textContent=t.eventLog[0]||'种子遇见水滴，会发生什么？';
  if(!modal.hidden)paint();
 }
 el('token-open').onclick=()=>{pauseInput();tab='bag';category='全部';preview=kit().selected==='coin'?'seed':kit().selected;modal.hidden=false;paint();el('token-close').focus();};
 el('token-close').onclick=close;
 for(const name of ['bag','atlas'])el('token-tab-'+name).onclick=()=>{tab=name;category='全部';paint();};
 modal.onclick=e=>{if(e.target===modal)close();};
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'){close();e.stopPropagation();}if(e.key==='Tab'){const ns=[...modal.querySelectorAll('button:not(:disabled)')].filter(n=>n.getClientRects().length),first=ns[0],last=ns.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 function switchShop(name,focus=false){shopTab=name;el('shop-cards').hidden=name!=='upgrades';el('shop-tools').hidden=name!=='upgrades';el('token-shop').hidden=name!=='supplies';for(const n of ['upgrades','supplies'])el('shop-tab-'+n).setAttribute('aria-selected',name===n);if(focus)el('shop-tab-'+name).focus({preventScroll:true});}
 for(const name of ['upgrades','supplies'])el('shop-tab-'+name).onclick=()=>{sfx();switchShop(name);};
 function shop(force=false){
  const t=kit(),r=run();if(r.phase!=='shop')return;t.prepareShop(r.round);
  if(shopRound!==r.round){shopRound=r.round;shopTab='upgrades';}switchShop(shopTab);
  const sig=JSON.stringify([r.round,r.cash,t.packBought,t.claimed,t.remaining]);if(!force&&sig===shopSignature)return;shopSignature=sig;
  el('free-pack-badge').textContent=t.claimed?'已领取':'免费 ×1';el('token-shop-note').textContent=t.claimed?'补给已送入百宝舱。想多备一点？也可以用贝壳购买。':'靠港礼物：任选 1 包免费带走，还可另购每包各一份。';
  const list=el('token-shop-cards');list.replaceChildren();
  for(const id of t.shopOffers){const pack=PACKS[id],claimed=t.claimed,bought=t.packBought.includes(id),card=document.createElement('article');card.className='token-pack'+(bought?' purchased':'');card.dataset.pack=id;
   const art=document.createElement('div');art.className='pack-art';art.innerHTML=Object.keys(pack.items).map((k,i)=>coinArt(k,def(k).color,`pack-coin coin-${i}`)).join('')+'<span class="pack-ribbon">鲸鱼邮局 · SEA MAIL</span>';
   const title=document.createElement('h4');title.textContent=pack.name;const desc=document.createElement('p');desc.textContent=Object.entries(pack.items).map(([k,n])=>`${TOKENS[k].name} ×${n}`).join(' · ');const actions=document.createElement('div');actions.className='pack-actions';
   const transact=(free)=>{const ok=free?t.claimPack(id,r):t.buyPack(id,r);if(!ok)return;sfx();save();changed?.();shop(true);refresh(true);el('shop-wallet').textContent=r.cash;arcadeToast(`${pack.name}已入舱！`);const target=list.querySelector(`[data-pack="${id}"]`);target?.classList.add('just-delivered');const focus=list.querySelector(`[data-pack="${id}"] button:not(:disabled)`)||el('shop-tab-supplies');focus.focus({preventScroll:true});};
   const claim=button(claimed?'已领免费补给':'免费领取',()=>transact(true),'claim-pack');claim.disabled=claimed;
   const buy=button(bought?'✓ 已购买':`购买 · ${pack.cost} 贝壳`,()=>transact(false),'buy-pack');buy.disabled=bought||r.cash<pack.cost;
   actions.append(claim,buy);card.append(art,title,desc,actions);list.append(card);
  }
 }
 return {refresh,shop,close,isOpen:()=>!modal.hidden};
}
