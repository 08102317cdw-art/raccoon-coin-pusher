// 由 Rapier 接触力事件触发拟音；静置承重、滑动和正在装塔的金币不会持续叮响。
export function createCoinContacts(RAPIER,world,onImpact){
 const queue=new RAPIER.EventQueue(true),owners=new Map(),cooldowns=new Map();let clock=0,events=0,impacts=0;
 function register(coin,collider){coin.collider=collider.handle;owners.set(collider.handle,coin);}
 function unregister(coin){owners.delete(coin.collider);}
 function drain(dt){
  clock+=dt;const loud=[];
  queue.drainContactForceEvents(event=>{
   events++;const a=event.collider1(),b=event.collider2(),ca=owners.get(a),cb=owners.get(b);
   if(!ca&&!cb||ca?.state==='tower'||cb?.state==='tower')return;
   const va=ca?.contactVelocity||world.getCollider(a)?.parent()?.linvel()||{x:0,y:0,z:0},vb=cb?.contactVelocity||world.getCollider(b)?.parent()?.linvel()||{x:0,y:0,z:0};
   const x=va.x-vb.x,y=va.y-vb.y,z=va.z-vb.z;if(x*x+y*y+z*z<.32)return;
   const normal=event.maxForceDirection(),speed=Math.abs(x*normal.x+y*normal.y+z*normal.z);if(speed<.4)return;
   const key=a<b?a+':'+b:b+':'+a;if(clock-(cooldowns.get(key)??-1)<.085)return;cooldowns.set(key,clock);
   const coin=ca||cb,p=coin.body.translation(),strength=Math.min(1,.18+speed*.15+Math.min(.25,event.totalForceMagnitude()*dt*.016));
   loud.push({strength,pan:Math.max(-1,Math.min(1,p.x/5.5)),tray:p.z>4&&p.y<0,coinPair:!!ca&&!!cb,position:{x:p.x,y:Math.max(0,p.y)+.08,z:p.z}});
  });
  loud.sort((a,b)=>b.strength-a.strength);for(const hit of loud.slice(0,3)){impacts++;onImpact(hit);}
  if(cooldowns.size>512)for(const[k,t]of cooldowns)if(clock-t>.2)cooldowns.delete(k);
 }
 return {queue,register,unregister,drain,get stats(){return {engine:'Rapier 3D',events,impacts,tracked:owners.size};}};
}
