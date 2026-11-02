const fs=require('node:fs');
const map={imports:{three:'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js','three/':'https://cdn.jsdelivr.net/npm/three@0.170.0/','@dimforge/rapier3d-compat':'https://esm.sh/@dimforge/rapier3d-compat@0.14.0?target=es2022'}};
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const html=fs.readFileSync('src/index.html','utf8').replace('<!--ARCADE_STYLE-->',`<link rel="stylesheet" href="./src/arcade-ui.css?v=${encodeURIComponent(version)}">`).replace('<!--MOBILE_STYLE-->',`<link rel="stylesheet" href="./src/mobile-cabinet.css?v=${encodeURIComponent(version)}">`).replace('<!--POCKET_STYLE-->',`<link rel="stylesheet" href="./src/mobile-stage.css?v=${encodeURIComponent(version)}">`).replace('</head>',`<script type="importmap">${JSON.stringify(map)}</script>\n</head>`).replace('/*BUNDLE*/',`import "./src/main.js?v=${encodeURIComponent(version)}";`);
const extraStyles=['game-feel.css','voyage-ui.css','feel-pass.css','diegetic.css'].filter(file=>fs.existsSync('src/'+file)).map(file=>`<link rel="stylesheet" href="./src/${file}?v=${encodeURIComponent(version)}">`).join('\n');
fs.writeFileSync('index.html',html.replace('</head>',extraStyles+'\n</head>'));fs.writeFileSync('.nojekyll','');
console.log('Static entry ready:',Buffer.byteLength(html),'bytes');
