// Original vector emblems for the arcade UI. No external assets or fonts.
const shapes={
 coin:'<path d="M12 30c2-9 10-13 19-8 8 4 12 1 15-5v13c0 12-13 19-25 12-5-3-8-6-9-12Z" fill="currentColor"/><path d="m46 27 9-4-2 10-7 3M23 22l-1-6 9 5"/><circle cx="20" cy="29" r="1.8" fill="#112e43"/><path d="M30 39q7 2 11-4"/>',
 seed:'<path d="M32 51V28M32 33C13 35 11 21 13 14c14-1 23 6 19 19Zm0-8c-1-15 11-20 21-17 1 14-9 21-21 17Z" fill="currentColor"/><path d="M19 53h27"/>',
 water:'<path d="M32 7C29 17 15 29 15 39a17 17 0 0 0 34 0C49 29 35 17 32 7Z" fill="currentColor"/><path d="M23 38q-1 9 7 10" stroke="#fff6d9"/>',
 tree:'<path d="M29 52V33h7v19M20 53h24"/><path d="M15 34C3 26 14 11 23 16 25 2 43 5 43 18c15-2 18 18 5 21-11 4-23 3-33-5Z" fill="currentColor"/><circle cx="21" cy="28" r="4" fill="#ffe0a0"/><circle cx="40" cy="26" r="4" fill="#ffe0a0"/>',
 fish:'<path d="M10 32c11-21 29-19 38 0-9 19-27 21-38 0Zm38 0 10-10v20Z" fill="currentColor"/><circle cx="22" cy="29" r="2.4" fill="#112e43"/><path d="m29 16 9-6 3 11M30 43l9 9 4-12"/>',
 cat:'<path d="M13 29V11l14 10h10l14-10v21c2 17-10 22-19 22S10 46 13 29Z" fill="currentColor"/><path d="m19 33 5-1m16 1 5-1M28 40h8l-4 5ZM7 40l11 2m28 0 11-2"/><path d="M27 48q5 4 10 0"/>',
 rat:'<path d="M41 43c18 10 19-8 12-9"/><circle cx="17" cy="19" r="10" fill="currentColor"/><circle cx="43" cy="19" r="10" fill="currentColor"/><path d="M15 24c6-7 23-7 29 2l-4 21-10 8-11-8Z" fill="currentColor"/><circle cx="24" cy="33" r="2" fill="#112e43"/><circle cx="37" cy="33" r="2" fill="#112e43"/><path d="m26 44 5 4 5-4"/>',
 hen:'<path d="M18 24C10 4 28 5 27 19c2-20 19-14 12 2 19 3 20 33-5 34C12 57 7 38 18 24Z" fill="currentColor"/><path d="m43 28 13 6-12 4" fill="#ffcb68"/><circle cx="35" cy="29" r="2.5" fill="#112e43"/><path d="M17 36q4 13 15 7"/>',
 egg:'<path d="M32 7C20 7 11 31 13 41c3 19 35 19 38 0C53 31 44 7 32 7Z" fill="currentColor"/><path d="m16 33 9 5 8-7 8 6 8-4"/>',
 rooster:'<path d="M26 23C14 13 23 2 29 15c2-17 16-12 11 1 13-9 18 4 6 11 9 20-8 32-25 24C7 44 10 28 26 23Z" fill="currentColor"/><path d="m43 29 13 6-11 3M17 31 6 20l2 22 8 5"/><circle cx="35" cy="29" r="2" fill="#112e43"/>',
 clover:'<path d="M31 33C3 30 6 7 22 11c7 0 9 8 10 15C37 3 58 9 54 24c-2 6-9 8-17 9 25 4 20 26 5 23-7-1-9-9-10-15-5 21-26 15-24 2 1-6 10-10 23-10Zm1 5 7 20" fill="currentColor"/>',
 multi:'<path d="m18 18 28 28m0-28L18 46" stroke="currentColor" stroke-width="10"/><path d="M10 11h8m28 42h8"/>',
 lightning:'<path d="m36 5-23 31h16l-2 23 25-34H35Z" fill="currentColor"/>',
 battery:'<rect x="15" y="13" width="34" height="43" rx="8" fill="currentColor"/><path d="M25 13V7h14v6M32 23v12m-6-6h12M26 45h12"/>',
 magnet:'<path d="M12 12v24c0 28 40 28 40 0V12H39v24a7 7 0 0 1-14 0V12Z" fill="currentColor"/><path d="M12 24h13m14 0h13" stroke="#fff3cb" stroke-width="5"/>',
 bomb:'<circle cx="29" cy="37" r="19" fill="currentColor"/><path d="m38 20 4-8c2-5 8-4 9 0M49 5l3-4m4 10 5-1M20 30q-5 4-4 10"/><path d="m54 17 3 5"/>',
 echo:'<path d="M20 17C5 27 8 48 25 52M44 17c15 10 12 31-5 35M26 26c-7 5-7 15 0 20m12-20c7 5 7 15 0 20" stroke="currentColor" stroke-width="6"/><circle cx="32" cy="36" r="4" fill="currentColor"/>',
 relic:'<path d="M20 11h24l-3 12 10 10-8 22H21l-8-22 10-10Z" fill="currentColor"/><path d="M20 15h24M24 28h16M24 43h16M32 33v17"/>',
 shrimp:'<path d="M46 22C28 1 7 21 14 38c7 17 33 16 33 2-2-8-13-8-15-2 2-10 17-10 20-1l4 14-13-4" fill="currentColor"/><path d="m15 23 12 5m-14 7 13 1m-7 10 10-5M38 15l10-8m-6 12 14-3"/><circle cx="40" cy="21" r="2" fill="#112e43"/>',
 killer:'<path d="M31 6 51 14v17c0 12-12 23-20 27-8-4-20-15-20-27V14Z" fill="currentColor"/><path d="m22 34 7 7 14-18" stroke="#fff4cd" stroke-width="5"/>',
 rust:'<path d="m32 7 7 9 11-1-1 12 8 7-9 7 1 11-12-1-7 8-7-9-11 1 1-12-8-7 9-7-1-11 12 1Z" fill="currentColor"/><path d="m22 26 6 7m14-7-6 7m-11 9h15"/>',
 thief:'<path d="M12 27 20 10h25l8 17-5 25H17Z" fill="currentColor"/><path d="M12 29c7-11 33-11 41 0l-3 10H15Z" fill="#112e43"/><path d="M21 30h5m13 0h5" stroke="#fff5d6"/><path d="M27 46h10"/>',
 decay:'<path d="M15 9h34l-2 12-7 10c19 11 16 24-8 24S5 42 24 31l-7-10Z" fill="currentColor"/><path d="M15 13h34M17 40h30"/><circle cx="27" cy="44" r="2" fill="#112e43"/><circle cx="38" cy="47" r="3" fill="#112e43"/>',
 shell:'<path d="M12 43C-1 9 65-2 55 43L35 57h-5Z" fill="currentColor"/><path d="m32 51-1-35m-6 32-9-24m23 24 10-27M19 54h26"/>',
 gear:'<path d="m26 5 12 0 3 9 9 1 6 10-6 8 3 9-10 7-9-4-8 9-10-6 1-11-9-6 3-12 11-2Z" fill="currentColor"/><circle cx="32" cy="30" r="10" fill="#fff1cc"/>',
};
export function emblem(id){return `<svg viewBox="0 0 64 64" fill="none" stroke="#183a4d" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[id]||shapes.coin}</svg>`;}
export function coinArt(id,color='#f1c96c',extra=''){return `<span class="coin-art ${extra}" style="--coin:${color}">${emblem(id)}</span>`;}
export function upgradeArt(id){return coinArt(({mult:'multi',value:'coin',reserve:'relic',push:'magnet',guard:'killer',lucky:'clover',fever:'lightning',supply:'shell'})[id]||'gear',({mult:'#e5a0b8',value:'#f6c96d',reserve:'#91d3d7',push:'#e7b77b',guard:'#a4dbc8',lucky:'#b6d794',fever:'#efb2c9',supply:'#e6c68a'})[id]);}
export function arcadeToast(text){const box=document.getElementById('arcade-toast');if(!box)return;box.textContent=text;box.classList.remove('show');void box.offsetWidth;box.classList.add('show');clearTimeout(box._timer);box._timer=setTimeout(()=>box.classList.remove('show'),2200);}
