const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const file=path.join(__dirname,'dist/raccoon-coin-pusher.html');
if(!fs.existsSync(file)){console.error('请先运行 npm run build 生成游戏。');process.exit(1);}
const port=Number(process.env.COIN_PUSHER_PORT)||8787;
const server=http.createServer((request,response)=>{
  if(request.url!=='/'&&request.url!=='/index.html'){response.writeHead(404).end();return;}
  fs.readFile(file,(error,body)=>{
    if(error){response.writeHead(500).end('游戏文件暂时不可读取');return;}
    response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(body);
  });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用，可通过 COIN_PUSHER_PORT 更换。`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`大肥鱼推币机预览：http://127.0.0.1:${port}`));
