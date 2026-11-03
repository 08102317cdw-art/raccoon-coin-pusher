// Full upstream terms accompany even a single-file offline distribution.
const fs=require('node:fs');
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
module.exports=()=>'<details id="runtime-licenses"><summary>完整许可文本（离线副本）</summary>'+['THIRD_PARTY_NOTICES.md','licenses/DAFEIYU-LIVE2D.txt','licenses/LIVE2D-CORE-LICENSE.txt','licenses/LIVE2D-FRAMEWORK-LICENSE.txt','licenses/PIXI-MIT.txt','licenses/PIXI-LIVE2D-DISPLAY-MIT.txt'].map(file=>'<details><summary>'+escape(file)+'</summary><pre style="white-space:pre-wrap;max-height:240px;overflow:auto;font:inherit;line-height:1.5">'+escape(fs.readFileSync(file,'utf8'))+'</pre></details>').join('')+'</details>';
