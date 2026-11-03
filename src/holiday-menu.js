import { whaleMark } from './brand.js?v=4.4.1';

// 主菜单复用航路选择和收藏数据；返回菜单只暂停输入，不重置正在进行的游戏。
export function createHolidayMenu({hasSaved,getRun,onHome,onNew,onRefresh,setting}){
 const $=id=>document.getElementById(id),root=$('start'),start=$('start-button'),setup=$('voyage-setup'),ledger=$('voyage-ledger');
 const begin=start.onclick;let view='home';
 const shell=document.createElement('div');shell.className='holiday-menu-shell';
 shell.innerHTML=`<section class="holiday-welcome"><span class="holiday-ticket">晴日漂流俱乐部 · SUNNY WHALE</span><div class="holiday-mascot-sign" aria-hidden="true">${whaleMark}<i>♪</i></div><h1>大肥鱼<span>漂流推币机</span></h1><p>乘着海风，装满一船小好运。</p><span class="holiday-weather"><i></i> 今日海况：阳光正好</span></section><section class="holiday-menu-card"><header><span id="holiday-page-kicker">登筏之前</span><h2 id="holiday-page-title">今天，漂一会儿。</h2><button id="holiday-menu-back" type="button" hidden aria-label="返回主菜单">‹ 返回</button></header><section data-menu-page="home"><p id="holiday-resume-note"></p><nav class="holiday-menu-links" aria-label="主菜单"><button id="holiday-new" type="button"><b>✦</b><span>选择船员与航路<small>三种构筑，三种小冒险</small></span><i>›</i></button><button id="holiday-collection" type="button"><b>◇</b><span>航海手册<small>收藏与纪念章</small></span><i>›</i></button><button id="holiday-guide" type="button"><b>?</b><span>怎么玩<small>先让第一枚金币滑下来</small></span><i>›</i></button><button id="holiday-settings" type="button"><b>☼</b><span>声音与动景<small>按喜欢的节奏漂流</small></span><i>›</i></button></nav></section><section data-menu-page="voyage" hidden></section><section data-menu-page="collection" hidden></section><section data-menu-page="guide" class="holiday-guide" hidden><article><b>01</b><div><h3>左右投，慢慢推</h3><p>点击左投、右投，或按 Q / E。双投从两侧各来一枚，消耗两次普通投币。</p></div></article><article><b>02</b><div><h3>小币夹，大惊喜</h3><p>打开币舱装夹，再点击币面从摆槽投下特殊币。种子遇水会长树，鱼吃虾会变贵。</p></div></article><article><b>03</b><div><h3>满载靠岸，再出发</h3><p>金币从前沿掉落才入账。达到目标后靠港补给；八关完成，还能驶向无尽海域。</p></div></article><p class="holiday-keyboard">键盘：Q / E 左右投 · W / 空格双投 · R 选特殊币 · F 投放</p></section><section data-menu-page="settings" hidden><div id="holiday-settings-list"></div><p class="holiday-menu-note">静音动景不会覆盖游戏音效；减少动态效果时使用静态海景。</p></section><section data-menu-page="confirm" hidden><div class="holiday-confirm"><h3>换一条新的航路？</h3><p>当前航行会结束。已发现的收藏、纪念章和历史战报会保留。</p><button id="holiday-confirm-new" type="button">准备好了，重新出航</button><button id="holiday-cancel-new" type="button">继续这次漂流</button></div></section><footer id="holiday-menu-actions"></footer><span class="holiday-card-stamp" aria-hidden="true">GOOD LUCK<br>ON BOARD</span></section>`;
 shell.querySelector('[data-menu-page="voyage"]').append(setup);
 shell.querySelector('[data-menu-page="collection"]').append(ledger);ledger.open=true;
 shell.querySelector('#holiday-menu-actions').append(start);root.replaceChildren(shell);root.classList.add('holiday-menu');root.setAttribute('aria-label','漂流推币机主菜单');
 setting.mountMenuBackdrop(root);
 const titles={home:['登筏之前','今天，漂一会儿。'],voyage:['准备出航','选一位好搭档'],collection:['航海手册','把小惊喜收好'],guide:['第一次上筏','推一枚，就会了'],settings:['悠闲一点','听喜欢的声音'],confirm:['新的冒险','换一条航路']};
 function navigate(next){view=next;for(const page of root.querySelectorAll('[data-menu-page]'))page.hidden=page.dataset.menuPage!==next;setup.hidden=next!=='voyage';$('holiday-menu-actions').hidden=!['home','voyage'].includes(next);$('holiday-menu-back').hidden=next==='home';$('holiday-page-kicker').textContent=titles[next][0];$('holiday-page-title').textContent=titles[next][1];start.textContent=hasSaved()?'继续漂流 →':next==='voyage'?'准备好了，出发！':'马上出发 →';$('holiday-resume-note').textContent=hasSaved()?`木筏已停在第 ${getRun().round} 关，继续刚才的好运吧。`:'小鲸鱼已经等在木筏上了。';if(next==='collection'){onRefresh();ledger.dispatchEvent(new Event('toggle'));}if(next==='settings')settingsPaint();(next==='home'?$('holiday-new'):$('holiday-menu-back')).focus({preventScroll:true});}
 function close(){root.classList.add('hide');root.inert=true;}
 function open(){onHome();root.classList.remove('hide');root.inert=false;navigate('home');start.focus({preventScroll:true});}
 start.onclick=()=>{close();begin();};
 $('holiday-menu-back').onclick=()=>navigate('home');
 $('holiday-new').onclick=()=>navigate(hasSaved()?'confirm':'voyage');
 $('holiday-collection').onclick=()=>navigate('collection');$('holiday-guide').onclick=()=>navigate('guide');$('holiday-settings').onclick=()=>navigate('settings');
 $('holiday-confirm-new').onclick=onNew;$('holiday-cancel-new').onclick=()=>{close();begin();};
 function settingsPaint(focusIndex=-1){
  const list=$('holiday-settings-list');list.replaceChildren();
  for(const [id,label]of[['btn-sound','金币与机台音效'],['btn-music','背景音乐'],['btn-voice','小鲸鱼语音']]){
   const index=list.children.length,button=document.createElement('button');button.type='button';const enabled=!$(id).classList.contains('off');button.setAttribute('aria-pressed',String(enabled));button.innerHTML=`<span>${label}</span><b>${enabled?'开':'关'}</b>`;button.onclick=()=>{$(id).click();settingsPaint(index);};list.append(button);
  }
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(setting.motion));button.innerHTML=`<span>晴日漂流动景</span><b>${setting.motion?'开':'静态'}</b>`;button.onclick=()=>{setting.setMotion(!setting.motion);settingsPaint(3);};list.append(button);if(focusIndex>=0)list.children[focusIndex]?.focus({preventScroll:true});
 }
 const returnButton=document.createElement('button');returnButton.id='return-holiday-menu';returnButton.type='button';returnButton.textContent='⌂ 返回漂流主菜单';returnButton.onclick=open;$('machine-hatch').append(returnButton);
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&view!=='home'){e.preventDefault();navigate('home');start.focus({preventScroll:true});}
  if(e.key==='Tab'){
   const buttons=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length&&!b.closest('[hidden]'));
   const target=e.shiftKey?buttons.at(-1):buttons[0];
   if((e.shiftKey&&document.activeElement===buttons[0])||(!e.shiftKey&&document.activeElement===buttons.at(-1))||!root.contains(document.activeElement)){e.preventDefault();target?.focus();}
  }
 });
 let requested='home';try{requested=sessionStorage.getItem('whale-next-view')||'home';sessionStorage.removeItem('whale-next-view');}catch{}navigate(requested==='voyage'?'voyage':'home');
 return {open,close,navigate,isOpen:()=>!root.classList.contains('hide'),get view(){return view;}};
}
