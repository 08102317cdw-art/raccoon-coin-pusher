// One responsive cabinet: controls and canvases are mounted exactly once.
// Phones reflow the same DOM, never a screenshot or duplicate game instance.
export function createMobileCabinet(slotCanvas, onResize) {
  const by = id => document.getElementById(id), mq = matchMedia('(max-width:760px), (max-height:480px) and (max-width:1100px)');
  const root = document.createElement('section'); root.id = 'mobile-cabinet';
  root.setAttribute('aria-label', '大肥鱼复古街机');
  root.innerHTML = `<header class="machine-crown"><div class="cabinet-wordmark"><span class="maker-symbol" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 25c0-8 11-13 20-7l4 2c5-2 4-9 11-10-1 11-5 20-16 23C16 36 7 32 7 25Z" fill="currentColor"/><path d="M12 29c5 3 11 4 17 0M19 17c-4-8-7-4-7-4m7 4c0-9 7-10 7-5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="23" r="1.5" fill="#16384b"/></svg></span><strong>大肥鱼<span>推币俱乐部</span></strong><small>THE LUCKY WHALE<br>COIN PUSHER · No. 019</small></div><div class="crown-right"><span class="cabinet-live"><i></i> 营业中</span><button id="machine-menu" type="button" aria-label="打开机台设置" aria-expanded="false" aria-controls="machine-hatch">设置</button></div></header>
    <aside id="machine-left" aria-label="幸运轮盘与能量"><div class="rail-kicker">一枚硬币 · 一点好运</div><div id="wheel-host"></div><div id="machine-energy"></div><div class="cabinet-plaque"><span>GOOD THINGS<br>COME IN WAVES.</span><p>把幸运，推向前沿。</p></div></aside>
    <section id="machine-upper" aria-label="机台计分屏"><div id="machine-score"></div><button id="wheel-toggle" type="button" aria-expanded="false" aria-controls="lottery">幸运轮盘 <span>↗</span></button></section>
    <section id="machine-window" aria-label="3D 推币台"><span class="glass-corner corner-left" aria-hidden="true"></span><span class="glass-corner corner-right" aria-hidden="true"></span><span class="glass-label" aria-hidden="true">PUSH YOUR LUCK</span></section>
    <aside id="machine-right" aria-label="币舱与幸运门"><section class="lucky-module"><div class="module-heading"><span>LUCKY GATE</span><b>幸运门</b></div><div class="machine-screen-frame"><div id="machine-live-slot" aria-label="实时老虎机"></div></div><div class="machine-slot-status"><span id="machine-slot-message">穿过幸运门，点亮转轮</span><span id="machine-slot-queue" aria-label="待抽次数">○ ○ ○ ○ ○</span></div></section><div id="machine-wallet"></div><div id="machine-load-slot"></div><div class="cabinet-serial">INSERT COIN. MAKE WAVES.<br><span>WHALE ARCADE WORKS / 2026</span></div></aside>
    <footer id="machine-console"><div class="console-id"><span>限量投币 · 连锁构筑</span><strong>再推一枚。</strong><small>LET THE GOOD TIMES ROLL</small></div><div id="machine-drop-slot"></div><div id="machine-clear-slot"></div><div class="console-etching"><span id="machine-save-lamp">● 自动保存</span><span>长按锁定 · 再点解除</span></div></footer>
    <div id="machine-hatch" hidden><header><strong>机台设置</strong><button id="hatch-close" aria-label="关闭设置">×</button></header><div id="machine-tool-slot"></div><p>音效 / 音乐 / 玩法 / 重置</p></div>`;
  document.body.append(root);
  for (const [id, target] of [['app','machine-window'],['runbox','machine-score'],['resources','machine-wallet'],['token-controls','machine-load-slot'],['chute-pad','machine-drop-slot'],['round-action','machine-clear-slot'],['btns','machine-tool-slot'],['energy-box','machine-energy'],['lottery','wheel-host']]) by(target).append(by(id));
  by('machine-live-slot').append(slotCanvas);
  let open = false;
  const close = () => { open = false; by('machine-hatch').hidden = true; by('machine-menu').setAttribute('aria-expanded','false'); };
  by('machine-menu').onclick = () => {open = !open;by('machine-hatch').hidden = !open;by('machine-menu').setAttribute('aria-expanded',String(open)); if(open)by('btn-sound').focus({preventScroll:true});};
  by('hatch-close').onclick = () => {close();by('machine-menu').focus({preventScroll:true});};
  document.addEventListener('pointerdown', e => { if(mq.matches&&root.classList.contains('wheel-open')&&!by('machine-left').contains(e.target)&&!by('wheel-toggle').contains(e.target)){toggleWheel(false);e.preventDefault();e.stopPropagation();return;} if(open && !by('machine-hatch').contains(e.target) && !by('machine-menu').contains(e.target)){close();e.preventDefault();e.stopPropagation();}},true);
  root.addEventListener('keydown', e => {if(e.key==='Tab'&&mq.matches&&root.classList.contains('wheel-open')){e.preventDefault();by('lottery-dock').focus();return;}if(e.key==='Escape'){if(open){close();by('machine-menu').focus({preventScroll:true});}if(root.classList.contains('wheel-open'))toggleWheel(false);}});
  by('btn-help').addEventListener('click',close);
  function toggleWheel(force) { const active = force ?? !root.classList.contains('wheel-open');root.classList.toggle('wheel-open',active);for(const id of ['machine-upper','machine-window','machine-right','machine-console'])by(id).inert=active&&mq.matches;by('machine-left').setAttribute('role',active&&mq.matches?'dialog':'complementary');if(active&&mq.matches)by('machine-left').setAttribute('aria-modal','true');else by('machine-left').removeAttribute('aria-modal');by('wheel-toggle').setAttribute('aria-expanded',String(active));if(active)by('lottery-dock').focus({preventScroll:true});else by('wheel-toggle').focus({preventScroll:true}); }
  by('wheel-toggle').onclick = () => toggleWheel();
  function mount(){
    root.classList.remove('wheel-open');by('wheel-toggle').setAttribute('aria-expanded','false');for(const id of ['machine-upper','machine-window','machine-right','machine-console'])by(id).inert=false;by('machine-left').removeAttribute('aria-modal');
    for(const id of ['machine-wallet','machine-load-slot']){ if(mq.matches)by('machine-console').insertBefore(by(id),by('machine-drop-slot'));else by('machine-right').insertBefore(by(id),by('machine-right').querySelector('.cabinet-serial')); }
    if(mq.matches)by('machine-upper').append(by('machine-energy'));else by('machine-left').insertBefore(by('machine-energy'),by('machine-left').querySelector('.cabinet-plaque'));
    document.body.classList.add('immersive-machine');document.body.classList.toggle('mobile-machine',mq.matches);onResize();}
  mq.addEventListener('change',mount);mount();
  const active = new MutationObserver(()=>root.classList.toggle('is-playing',by('hud').classList.contains('show')));active.observe(by('hud'),{attributes:true,attributeFilter:['class']});
  let sig = '';
  function update(slot){const next=[slot.queue,slot.spinning,slot.reach,slot.msgT>0?slot.msg:'',by('save-status').textContent].join('|');if(next===sig)return;sig=next;
    by('machine-slot-message').textContent=slot.reach?'听牌 · 等待最后一轮':slot.spinning?'幸运转轮转动中':slot.msgT>0&&slot.msg?slot.msg:'穿过幸运门，点亮转轮';
    by('machine-slot-queue').textContent=Array.from({length:5},(_,i)=>i<slot.queue?'●':'○').join(' ');by('machine-slot-queue').setAttribute('aria-label',`待抽 ${slot.queue} 次`);root.classList.toggle('slot-spinning',slot.spinning);root.classList.toggle('slot-reach',slot.reach);by('machine-save-lamp').textContent=by('save-status').textContent.includes('无法')?'! 保存失败':'● 自动保存';
  }
  return { get mobile(){return mq.matches;}, isMenuOpen:()=>open||(mq.matches&&root.classList.contains('wheel-open')),close,update,toggleWheel };
}
