import { whaleMark } from './brand.js?v=4.2.0';
// One machine, one live canvas. The glass is also the shop/inventory aperture.
export function createMobileCabinet(onResize) {
 const by=id=>document.getElementById(id),mq=matchMedia('(max-width:760px), (max-height:480px) and (max-width:1100px)');
 const root=document.createElement('section');root.id='mobile-cabinet';root.setAttribute('aria-label','大肥鱼推币机');
 root.innerHTML=`<header class="machine-crown"><div class="cabinet-wordmark"><span class="maker-symbol" aria-hidden="true">${whaleMark}</span><strong>大肥鱼<span>推币机</span></strong><small>好运海湾 · THE LUCKY WHALE</small></div><div class="crown-right"><span class="cabinet-live">● 营业中</span><button id="machine-menu" type="button" aria-label="打开机台设置" aria-expanded="false" aria-controls="machine-hatch">⚙</button></div></header>
 <section id="machine-upper" aria-label="机台计分屏"><div id="machine-score"></div><div id="machine-energy"></div><span class="meter-hint">轮盘奖励 · 最高 ×5</span></section>
 <section id="machine-window" aria-label="3D 推币台"><span class="glass-corner corner-left" aria-hidden="true"></span><span class="glass-corner corner-right" aria-hidden="true"></span><span class="glass-label" aria-hidden="true">THE LUCKY WHALE · COIN PUSHER</span><div id="combo-signal" role="status" aria-live="polite"></div></section>
 <aside id="machine-right" aria-label="币舱"><div class="module-heading"><span>COIN RESERVE</span><b>普通投币 · 特殊币夹</b></div><div id="machine-wallet"></div><div id="machine-load-slot"></div><div class="cabinet-serial">左右投普通币。<br>点币夹，从摆槽投特殊币。</div></aside>
 <footer id="machine-console"><div class="console-id"><span>THE LUCKY WHALE</span><strong>再推一枚。</strong></div><div id="machine-drop-slot"></div><div id="machine-clear-slot"></div><div class="console-etching"><span id="machine-save-lamp">● 自动保存</span><span>长按连投 · 再点解锁</span></div></footer>
 <div id="wheel-host"></div><div id="machine-fx" aria-hidden="true"></div>
 <div id="machine-hatch" hidden><header><strong>机台设置</strong><button id="hatch-close" aria-label="关闭设置">×</button></header><div id="machine-tool-slot"></div><p>音效 / 音乐 / 玩法 / 重置</p></div>`;
 document.body.append(root);
 for(const [id,target]of [['app','machine-window'],['runbox','machine-score'],['resources','machine-wallet'],['token-controls','machine-load-slot'],['chute-pad','machine-drop-slot'],['round-action','machine-clear-slot'],['btns','machine-tool-slot'],['energy-box','machine-energy'],['lottery','wheel-host']])by(target).append(by(id));
 for(const id of ['run-modal','token-modal','help'])root.append(by(id));
 // The service shutter has one independently scrolling compartment and a fixed lever.
 const card=by('run-modal').querySelector('.run-card'),scroll=document.createElement('div');scroll.className='service-scroll';
 const footer=card.querySelector('.result-footer');while(card.firstChild&&card.firstChild!==footer)scroll.append(card.firstChild);card.prepend(scroll);
 const receipt=document.createElement('details');receipt.className='receipt-roll';
 const receiptLabel=document.createElement('summary');receiptLabel.textContent='本关结算 · 展开明细';receipt.append(receiptLabel);
 const summary=card.querySelector('.result-summary');summary.before(receipt);receipt.append(summary);
 // 航路牌与货架有独立入口，长列表中也能直接跳到免费补给。
 const harborNav=document.createElement('nav');harborNav.className='harbor-nav';harborNav.setAttribute('aria-label','靠港事项');
 harborNav.innerHTML='<button id="harbor-reward-link" type="button">领取航路奖励</button><button id="harbor-supplies-link" type="button">逛货架 · 免费补给</button>';
 scroll.querySelector('#pick-section').before(harborNav);
 for(const [button,target]of [['harbor-reward-link','pick-section'],['harbor-supplies-link','shop-section']])by(button).onclick=()=>{
  const node=by(target),top=scroll.scrollTop+node.getBoundingClientRect().top-scroll.getBoundingClientRect().top-harborNav.offsetHeight-8;
  scroll.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  if(target==='shop-section'&&by('free-pack-badge').textContent.includes('免费'))by('shop-tab-supplies').click();
 };
 let settings=false,wheel=false,shopClosed=false,previousFocus=null;
 function sync(){
  const shop=!by('run-modal').hidden,catalog=!by('token-modal').hidden,help=by('help').classList.contains('show');
  root.classList.toggle('service-open',shop||catalog||help);root.classList.toggle('wheel-active',wheel);
  for(const id of ['machine-console','machine-window','machine-right'])by(id).inert=wheel||shop||catalog||help||settings;
 }
 const observer=new MutationObserver(sync);for(const id of ['run-modal','token-modal','help'])observer.observe(by(id),{attributes:true,attributeFilter:['hidden','class']});
 function close(){settings=false;by('machine-hatch').hidden=true;by('machine-menu').setAttribute('aria-expanded','false');sync();}
 by('machine-menu').onclick=()=>{settings=!settings;by('machine-hatch').hidden=!settings;by('machine-menu').setAttribute('aria-expanded',String(settings));sync();if(settings)by('hatch-close').focus({preventScroll:true});};
 by('hatch-close').onclick=()=>{close();by('machine-menu').focus({preventScroll:true});};
 by('btn-help').addEventListener('click',close);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&settings){close();by('machine-menu').focus();}if(e.key==='Tab'&&settings){const buttons=[...by('machine-hatch').querySelectorAll('button')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}});
 const modelControls=document.createElement('div');modelControls.id='model-controls';by('machine-window').append(modelControls);
 modelControls.append(by('chute-pad'));modelControls.append(by('detail-toggle'));
 const pet=document.createElement('button');pet.id='mascot-pet';pet.type='button';pet.setAttribute('aria-label','摸摸大肥鱼，与吉祥物语音互动');pet.title='摸摸大肥鱼';modelControls.append(pet);
 const voice=document.createElement('button');voice.id='btn-voice';voice.type='button';voice.textContent='语音';voice.setAttribute('aria-label','切换吉祥物语音');by('btns').append(voice);
 by('timing-lamp')?.remove();
 function mount(){
  by('machine-console').prepend(by('machine-load-slot'));
  document.body.classList.add('immersive-machine','diegetic-machine');document.body.classList.toggle('mobile-machine',mq.matches);sync();onResize();
 }
 mq.addEventListener('change',mount);mount();
 const active=new MutationObserver(()=>root.classList.toggle('is-playing',by('hud').classList.contains('show')));active.observe(by('hud'),{attributes:true,attributeFilter:['class']});
 return {get mobile(){return mq.matches;},get shopClosed(){return shopClosed;},isMenuOpen:()=>settings,close,
  setWheelActive(value){wheel=value;if(value)previousFocus=document.activeElement;sync();if(!value&&previousFocus?.isConnected&&!previousFocus.closest('[hidden]')&&!previousFocus.closest('[inert]'))previousFocus.focus({preventScroll:true});},
  returnToCabinet(){shopClosed=true;sync();by('round-action').textContent='拉开补给舱 →';by('round-action').hidden=false;by('round-action').focus({preventScroll:true});},
  openShop(){shopClosed=false;},update(){by('machine-save-lamp').textContent=by('save-status').textContent.includes('无法')?'! 保存失败':'● 已保存';}
 };
}
