import * as THREE from 'three';
// Aspect-aware original arcade pavilion mural. One background texture, no extra draw calls.
export function createSeasideRoom(scene){
 const canvas=document.createElement('canvas'),g=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;scene.background=texture;scene.fog.color.set('#366c7a');let size='';
 function resize(w,h,mobile){const next=[Math.round(w),Math.round(h),mobile].join(':');if(next===size)return;size=next;canvas.width=Math.min(1600,Math.max(640,Math.round(w)));canvas.height=Math.min(1800,Math.round(canvas.width*h/w));const W=canvas.width,H=canvas.height;
 let bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#204f68');bg.addColorStop(.46,'#4e929b');bg.addColorStop(.76,'#3d818a');bg.addColorStop(1,'#244956');g.fillStyle=bg;g.fillRect(0,0,W,H);
 // Pavilion canopy and sunlit sea, deliberately visible around the cabinet.
 g.fillStyle='#153b52';g.fillRect(0,0,W,H*.09);for(let x=0;x<W;x+=W/13){g.fillStyle=(Math.round(x/(W/13))%2)?'#6a9ca0':'#c8d6b4';g.globalAlpha=.3;g.beginPath();g.moveTo(x,0);g.lineTo(x+W/13,0);g.lineTo(x+W/13+16,H*.1);g.lineTo(x-16,H*.1);g.fill();}g.globalAlpha=1;
 const glow=g.createRadialGradient(W*.78,H*.28,0,W*.78,H*.28,W*.55);glow.addColorStop(0,'#d1d9ae6b');glow.addColorStop(1,'#8cb8ae00');g.fillStyle=glow;g.fillRect(0,0,W,H*.8);
 g.fillStyle='#c7cfaa';g.globalAlpha=.28;g.beginPath();g.arc(W*.79,H*.25,Math.min(W,H)*.08,0,Math.PI*2);g.fill();g.globalAlpha=1;
 // Distant harbor silhouettes: terraced headlands and a little lighthouse.
 g.fillStyle='#779f9b';g.beginPath();g.moveTo(0,H*.46);g.bezierCurveTo(W*.12,H*.28,W*.22,H*.44,W*.34,H*.43);g.lineTo(W*.34,H*.55);g.lineTo(0,H*.55);g.fill();
 g.fillStyle='#4c858b';g.beginPath();g.moveTo(W*.68,H*.47);g.bezierCurveTo(W*.8,H*.35,W*.89,H*.4,W,H*.31);g.lineTo(W,H*.55);g.lineTo(W*.68,H*.55);g.fill();
 const lx=W*.88,ly=H*.39,lh=Math.min(H*.12,W*.09);g.fillStyle='#cfcdac';g.beginPath();g.moveTo(lx-7,ly);g.lineTo(lx-4,ly-lh);g.lineTo(lx+4,ly-lh);g.lineTo(lx+7,ly);g.fill();g.fillStyle='#426674';g.fillRect(lx-6,ly-lh-9,12,8);g.fillStyle='#d9bd85';g.beginPath();g.moveTo(lx-9,ly-lh-9);g.lineTo(lx,ly-lh-17);g.lineTo(lx+9,ly-lh-9);g.fill();g.fillStyle='#e6d29a';g.fillRect(lx-3,ly-lh-7,6,4);
 for(let layer=0;layer<4;layer++){const y=H*(.42+layer*.052);g.fillStyle=['#2e6d7a','#387c85','#408b90','#509696'][layer];g.beginPath();g.moveTo(0,H);g.lineTo(0,y);for(let x=0;x<=W+20;x+=15)g.lineTo(x,y+Math.sin(x/W*9+layer*1.7)*H*.019);g.lineTo(W,H);g.fill();}
 g.strokeStyle='#a5cec033';g.lineWidth=2;for(let i=0;i<18;i++){const x=((i*317)%1000)/1000*W,y=H*(.48+(i%5)*.04);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+W*.02,y-5,x+W*.05,y);g.stroke();}
 // Small sailing boats and seabirds establish scale without competing with the coins.
 for(const [bx,by,k]of [[.13,.59,1],[.83,.55,.65]]){const x=bx*W,y=by*H,z=Math.min(W,H)*.045*k;g.fillStyle='#234e62';g.beginPath();g.moveTo(x-z,y);g.lineTo(x+z,y);g.lineTo(x+z*.6,y+z*.2);g.lineTo(x-z*.7,y+z*.2);g.closePath();g.fill();g.strokeStyle='#bdcdb1';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-z*1.8);g.stroke();g.fillStyle='#c3d4b9';g.beginPath();g.moveTo(x-2,y-z*1.7);g.lineTo(x-z*.9,y-z*.1);g.lineTo(x-2,y-z*.1);g.fill();}
 g.strokeStyle='#cbd3b46b';g.lineWidth=1.4;for(let i=0;i<4;i++){const x=W*(.12+i*.21),y=H*(.3+(i%2)*.045);g.beginPath();g.moveTo(x-6,y);g.quadraticCurveTo(x-3,y-4,x,y);g.quadraticCurveTo(x+3,y-4,x+6,y);g.stroke();}
 // Boardwalk in warm blue-green wood; perspective seams lead towards the cabinet.
 const fy=H*.79;bg=g.createLinearGradient(0,fy,0,H);bg.addColorStop(0,'#5b827d');bg.addColorStop(1,'#264f59');g.fillStyle=bg;g.fillRect(0,fy,W,H-fy);g.strokeStyle='#aac2a529';g.lineWidth=2;for(let x=-W;x<W*2;x+=W/8){g.beginPath();g.moveTo(W*.5+(x-W*.5)*.4,fy);g.lineTo(x,H);g.stroke();}for(let i=0;i<5;i++){const y=fy+(H-fy)*Math.pow(i/4,1.5);g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
 // Warm festoon lights, columns, and a little harbor railing.
 g.strokeStyle='#173e4d';g.lineWidth=3;g.beginPath();g.moveTo(0,H*.13);g.quadraticCurveTo(W*.5,H*.25,W,H*.13);g.stroke();for(let i=0;i<15;i++){const t=i/14,x=t*W,y=H*(.13+.24*t*(1-t));g.fillStyle='#edcf89';g.shadowColor='#ffdc8e';g.shadowBlur=12;g.beginPath();g.arc(x,y+7,3.5,0,7);g.fill();}g.shadowBlur=0;
 for(const x of [W*.025,W*.975]){const col=g.createLinearGradient(x-10,0,x+10,0);col.addColorStop(0,'#214d60');col.addColorStop(.5,'#719c99');col.addColorStop(1,'#234e60');g.fillStyle=col;g.fillRect(x-8,H*.09,16,H*.73);}
 g.strokeStyle='#b5ccaf45';g.lineWidth=6;g.beginPath();g.moveTo(0,H*.7);g.lineTo(W,H*.7);g.moveTo(0,H*.76);g.lineTo(W,H*.76);g.stroke();
 // Light edge vignette, never a black void.
 const edge=g.createRadialGradient(W*.5,H*.45,Math.min(W,H)*.2,W*.5,H*.5,Math.max(W,H)*.72);edge.addColorStop(0,'#102c3d00');edge.addColorStop(1,'#12394c80');g.fillStyle=edge;g.fillRect(0,0,W,H);texture.needsUpdate=true;
 }
 return{resize};
}
