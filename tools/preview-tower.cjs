// 直接触发真实游戏中的升塔流程，逐帧录制可复核的动画预览。
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {spawn,spawnSync}=require('node:child_process'),{once}=require('node:events'),{chromium}=require('playwright-core');
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',dir=path.resolve('dist/tower-qa');
(async()=>{let browser,encoder;fs.mkdirSync(dir,{recursive:true});
try{
 if(spawnSync(ffmpeg,['-version'],{windowsHide:true}).status!==0)throw Error('请设置 FFMPEG_PATH 为 FFmpeg 可执行文件路径。');
 browser=await chromium.launch({executablePath:require('../tests/browser-path.cjs'),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});p.setDefaultTimeout(90000);p.on('pageerror',e=>console.error(e.message));
 await p.addInitScript(()=>{localStorage.setItem('whale-holiday-motion','off');let seed=43;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};});
 await p.goto(pathToFileURL(path.resolve('dist/raccoon-coin-pusher.html')).href);await p.waitForFunction(()=>window.__game);await p.evaluate(()=>{__game.pause(true);__game.start();window.qaDraw=true;function draw(){if(!qaDraw)return;__game.render();requestAnimationFrame(draw);}draw();});
 const file=path.join(dir,'机械金币塔.mp4');encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',file],{windowsHide:true,stdio:['pipe','ignore','pipe']});
 let message='';encoder.stderr.on('data',v=>message=(message+v).slice(-2500));const finished=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(Error(message)));});
 const stages=[];let previous='';
 for(let i=0;i<168;i++){
  const tower=await p.evaluate(frame=>{if(frame===12)__game.spawnCoinTower(6);__game.update(1/24);return __game.tower();},i);
  const png=await p.screenshot({type:'png'});if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
  if(tower.phase!==previous){stages.push({frame:i,...tower});fs.writeFileSync(path.join(dir,`实机-${tower.phase}.png`),png);previous=tower.phase;}
  if((i+1)%48===0)console.log(`已录制 ${i+1}/168 帧`);
 }
 encoder.stdin.end();await finished;
 const closeup=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',file,'-vf','crop=480:360:400:300,scale=960:720:flags=lanczos','-an','-c:v','libx264','-crf','23','-movflags','+faststart',path.join(dir,'机械金币塔-特写.mp4')],{windowsHide:true});if(closeup.status!==0)throw Error(closeup.stderr?.toString()||'特写导出失败');
 fs.writeFileSync(path.join(dir,'实机演出阶段.json'),JSON.stringify(stages,null,2));console.log('机械升塔预览已生成：'+file);
}finally{encoder?.kill();await browser?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
