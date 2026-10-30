const fs=require('node:fs');
const map={imports:{three:'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js','three/':'https://cdn.jsdelivr.net/npm/three@0.170.0/','@dimforge/rapier3d-compat':'https://esm.sh/@dimforge/rapier3d-compat@0.14.0?target=es2022'}};
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const html=fs.readFileSync('src/index.html','utf8').replace('</head>',`<script type="importmap">${JSON.stringify(map)}</script>\n</head>`).replace('/*BUNDLE*/',`import "./src/main.js?v=${encodeURIComponent(version)}";`);
fs.writeFileSync('index.html',html);fs.writeFileSync('.nojekyll','');
console.log('Static entry ready:',Buffer.byteLength(html),'bytes');
