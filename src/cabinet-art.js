// Original marine marquetry and enamel artwork. Cached by its callers, not redrawn per frame.
export function paintCabinetPanel(g,W,H){
 const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#1b4f64');bg.addColorStop(.45,'#2e7080');bg.addColorStop(1,'#123e56');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.lineWidth=1;for(let y=1;y<H;y+=4){g.strokeStyle=y%12?'#c5e6d203':'#c5e6d209';g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
 g.strokeStyle='#cae1cd22';g.lineWidth=1;for(let y=25;y<H;y+=38)for(let x=(y/38%2)*19;x<W;x+=38){g.beginPath();g.arc(x,y,15,Math.PI,0);g.stroke();g.beginPath();g.arc(x,y-5,10,Math.PI,0);g.stroke();}
 // Double brass inlay, clipped corners and a little maker's hallmark.
 for(const [m,c]of [[18,'#e6c67f'],[27,'#95c4b0']]){g.strokeStyle=c;g.lineWidth=m===18?2:1;g.beginPath();g.moveTo(m+22,m);g.lineTo(W-m-22,m);g.lineTo(W-m,m+22);g.lineTo(W-m,H-m-22);g.lineTo(W-m-22,H-m);g.lineTo(m+22,H-m);g.lineTo(m,H-m-22);g.lineTo(m,m+22);g.closePath();g.stroke();}
 for(const s of [-1,1]){g.save();g.translate(s<0?65:W-65,H*.36);g.scale(s<0?1:-1,1);g.strokeStyle='#c3d7b650';g.lineWidth=2;for(let j=0;j<3;j++){g.beginPath();g.moveTo(0,0);g.bezierCurveTo(90,-80,125,90,26,128+j*15);g.bezierCurveTo(-5,144+j*15,30,166+j*15,53,145+j*15);g.stroke();}g.restore();}
 g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c5d8bc';g.font=`${Math.round(W*.012)}px Georgia`;g.fillText('W H A L E   B A Y   ·   A R C A D E   W O R K S',W/2,H-43);
 for(const [x,y]of [[37,37],[W-37,37],[37,H-37],[W-37,H-37]]){g.fillStyle='#122f41';g.beginPath();g.arc(x,y,7,0,7);g.fill();g.fillStyle='#e5d39b';g.beginPath();g.arc(x-1,y-1,4,0,7);g.fill();g.strokeStyle='#507271';g.beginPath();g.moveTo(x-3,y);g.lineTo(x+2,y-2);g.stroke();}
}
export function makeSlotBackdrop(W,H){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#133b50');bg.addColorStop(.5,'#20586a');bg.addColorStop(1,'#0d2e41');g.fillStyle=bg;g.fillRect(0,0,W,H);
 const halo=g.createRadialGradient(W/2,H*.35,20,W/2,H*.35,W*.6);halo.addColorStop(0,'#8dbbaa24');halo.addColorStop(1,'#8dbbaa00');g.fillStyle=halo;g.fillRect(0,0,W,H);
 // Quiet guilloche and wave bands, instead of the old spinning starburst.
 g.strokeStyle='#bad6bf13';g.lineWidth=1;for(let y=0;y<H;y+=22){g.beginPath();for(let x=0;x<=W;x+=8)g.lineTo(x,y+Math.sin(x/37+y/13)*5);g.stroke();}
 g.strokeStyle='#d6c08c';g.lineWidth=2;g.strokeRect(20,16,W-40,H-32);g.strokeStyle='#a7c5ad55';g.strokeRect(28,24,W-56,H-48);
 for(const x of [46,W-46]){g.fillStyle='#d6c08c';g.beginPath();g.moveTo(x,37);g.lineTo(x+7,49);g.lineTo(x,61);g.lineTo(x-7,49);g.closePath();g.fill();}
 g.textAlign='center';g.textBaseline='middle';g.fillStyle='#accbbf';g.font='500 15px Arial';g.fillText('W H A L E  B A Y   /   L U C K Y  M A C H I N E   N o . 0 1 9',W/2,34);
 g.font='bold 43px Georgia';g.shadowColor='#071e2b';g.shadowBlur=0;g.shadowOffsetY=3;g.fillStyle='#ffe1a0';g.fillText('LUCKY  TIDE',W/2,76);g.shadowOffsetY=0;
 for(const s of [-1,1]){g.save();g.translate(W/2+s*255,76);g.scale(s,1);g.strokeStyle='#d6c08c';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(110,0);g.moveTo(16,-6);g.lineTo(90,-6);g.moveTo(16,6);g.lineTo(90,6);g.stroke();g.restore();}
 g.fillStyle='#a1c1b7';g.font='15px Arial';g.fillText('CATCH A LITTLE LUCK · 把好运带回海湾',W/2,H-28);return c;
}
