// 真实 Rapier 验证：落币有接触反馈，静置和运动学升塔不制造连续碰撞音。
const assert=require('node:assert/strict'),fs=require('node:fs');
let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++;};
(async()=>{
 const R=require('@dimforge/rapier3d-compat');await R.init();
 const {createCoinContacts}=await import('data:text/javascript;base64,'+fs.readFileSync('src/coin-contacts.js').toString('base64'));
 const w=new R.World({x:0,y:-30,z:0});w.numSolverIterations=8;
 const floor=w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0,-.5,0));w.createCollider(R.ColliderDesc.cuboid(5,.5,5).setRestitution(.08),floor);
 const hits=[],contacts=createCoinContacts(R,w,h=>hits.push(h)),coins=[];
 function coin(x,y,state='field'){const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,y,0).setLinearDamping(.05).setAngularDamping(.22));const col=w.createCollider(R.ColliderDesc.roundCylinder(.055,.56,.02).setDensity(10).setFriction(.31).setRestitution(.12).setRestitutionCombineRule(R.CoefficientCombineRule.Min).setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(50),body);const c={body,state};coins.push(c);contacts.register(c,col);return c;}
 function step(n){for(let i=0;i<n;i++){for(const c of coins)c.contactVelocity=c.body.linvel();w.step(contacts.queue);contacts.drain(1/60);}}
 const a=coin(1.5,2.8);step(180);check(hits.length>0,'真实落币产生金属撞击事件');check(hits.every(h=>h.strength>0&&h.strength<=1&&Number.isFinite(h.pan)),'撞击强度与声像有效');check(hits.some(h=>h.pan>0),'右侧落币具有右侧声像');
 const settled=hits.length;step(360);check(hits.length===settled,'落定后不把持续承重当作新碰撞');
 const b=coin(-1.5,3,'tower');b.body.setBodyType(R.RigidBodyType.KinematicPositionBased,true);for(let i=0;i<60;i++){b.body.setNextKinematicTranslation({x:-1.5,y:.1+i*.01,z:0});step(1);}check(hits.length===settled,'运动学装塔不产生假碰撞音');
 contacts.unregister(b);coins.splice(coins.indexOf(b),1);w.removeRigidBody(b.body);contacts.unregister(a);coins.splice(coins.indexOf(a),1);w.removeRigidBody(a.body);check(contacts.stats.tracked===0,'删除刚体同时清除追踪引用');contacts.queue.free();w.free();
 const THREE=require('three'),esbuild=require('esbuild');esbuild.buildSync({entryPoints:['src/table-effects.js'],outfile:'.tools/table-effects-test.cjs',bundle:true,platform:'node',external:['three'],logLevel:'silent'});const {createTableEffects}=require('../.tools/table-effects-test.cjs');const scene=new THREE.Scene(),reduced={matches:false},fx=createTableEffects(scene,reduced),from={x:0,y:.2,z:0},to={x:1,y:.3,z:1};
 for(const type of ['grow','hunt','charge','explode','produce','tower','purify','echo'])fx.emit({type,from,to,via:{x:.3,y:.4,z:.2}});fx.update(.05);check(fx.active===8,'八种联动均可独立运行');
 let finite=true;scene.traverse(o=>{const p=o.geometry?.attributes.position;if(p)for(const v of p.array)finite&&=Number.isFinite(v);});check(finite,'联动几何没有无效坐标');
 for(let i=0;i<200;i++)fx.emit({type:'explode',from});check(fx.active===fx.metrics.eventLimit&&fx.metrics.particles<=fx.metrics.particleLimit,'高并发联动与粒子有明确上限');
 const before=fx.active;for(let i=0;i<300;i++)fx.emit({type:'impact',from});check(fx.active===before,'普通撞击不会挤占联动演出槽');for(let i=0;i<60;i++)fx.update(.05);check(fx.active===0&&fx.metrics.particles===0&&scene.children.length===1,'演出结束回收材质与几何，只保留共享实例池');
 reduced.matches=true;fx.emit({type:'charge',from,to});fx.emit({type:'explode',from});let ribbons=0;scene.traverse(o=>{if(o.material?.uniforms?.head)ribbons++;});check(ribbons===0,'减少动态效果时关闭电弧闪烁和长轨迹');for(let i=0;i<40;i++)fx.update(.05);check(fx.active===0&&fx.metrics.particles===0,'减少动态模式也能完整回收');
 console.log(`通过：${checks} 项真实碰撞与特效生命周期断言`);
})().catch(e=>{console.error(e);process.exitCode=1;});
