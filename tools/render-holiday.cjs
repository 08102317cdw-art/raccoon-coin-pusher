// 固定时间步逐帧导出，再由 FFmpeg 编码；生成结果不受浏览器实时帧率影响。
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn,spawnSync}=require('node:child_process'),{once}=require('node:events');
const {chromium}=require('playwright-core'),browserPath=require('../tests/browser-path.cjs');
const root=path.resolve(__dirname,'..'),ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
(async()=>{
 const html=`<!doctype html><style>body{margin:0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/":"/node_modules/three/"}}</script><script type="module">import * as THREE from 'three';import{createHolidayFilm}from'/src/holiday-film.js';const film=await createHolidayFilm();const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);window.captureFrame=(seconds,poster=false)=>{film.update(seconds);renderer.render(film.scene,film.camera);return renderer.domElement.toDataURL(poster?'image/webp':'image/png',.9)};window.ready=true;</script>`;
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');if(url.pathname==='/__studio'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,b)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':'application/octet-stream'}).end(b));
 });await new Promise(r=>server.listen(8802,'127.0.0.1',r));let browser,encoder;
 try{
  const available=spawnSync(ffmpeg,['-version'],{windowsHide:true});if(available.status!==0)throw Error('请安装 FFmpeg，或用 FFMPEG_PATH 指向便携版 ffmpeg.exe。');
  browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>console.error(e.message));await page.goto('http://127.0.0.1:8802/__studio');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  const poster=await page.evaluate(()=>captureFrame(0,true));fs.mkdirSync(path.join(root,'media'),{recursive:true});
  const mp4=path.join(root,'media','sunny-drift.mp4');
  encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let error='';encoder.stderr.on('data',v=>error=(error+v).slice(-3000));const finished=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(Error(error||'视频编码失败')));});
  for(let i=0;i<288;i++){
   const png=await page.evaluate(seconds=>captureFrame(seconds),i/24),frame=Buffer.from(png.split(',')[1],'base64');
   if(!encoder.stdin.write(frame))await once(encoder.stdin,'drain');
   if((i+1)%48===0)console.log(`已导出 ${i+1}/288 帧`);
  }
  encoder.stdin.end();await finished;
  const webm=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',mp4,'-an','-c:v','libvpx-vp9','-deadline','good','-cpu-used','4','-crf','36','-b:v','0',path.join(root,'media','sunny-drift.webm')],{windowsHide:true});if(webm.status!==0)throw Error(webm.stderr?.toString()||'WebM 导出失败');
  const video=fs.readFileSync(mp4).toString('base64');fs.writeFileSync(path.join(root,'media','sunny-drift-poster.webp'),Buffer.from(poster.split(',')[1],'base64'));
  fs.writeFileSync(path.join(root,'src','art','holiday-media.js'),'// 原创十二秒静音漂流视频，固定 24 帧，由 tools/render-holiday.cjs 生成。\nexport default '+JSON.stringify({video,poster,mime:'video/mp4'})+';\n');
  console.log(JSON.stringify({视频字节:fs.statSync(mp4).size,帧数:288,时长秒:12}));
 }finally{encoder?.kill();await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
