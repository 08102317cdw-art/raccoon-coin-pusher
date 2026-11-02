const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const load=file=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(file)).toString('base64'));
 const {VoyageLog}=await load('src/voyage-log.js');const {Run}=await load('src/roguelike.js');
 let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
 const log=new VoyageLog(),run=new Run(null,Math.random,{character:'gardener',difficulty:'storm'});
 check(!log.record(run.summary())&&log.runs===0,'普通未结算对局不计入历史');
 check(log.discover(['seed','water','seed','tree','not-a-token'])===3&&log.discovered.length===3,'发现图鉴去重并拒绝未知物件');
 run.score=run.target;run.finish();
 check(!log.record(run.summary())&&log.runs===0,'普通关间商店不误计新局');
 while(run.phase==='shop'){run.next();run.score=run.target;run.finish();}
 run.stats.bestCombo=18;
 check(log.record(run.summary({grows:4}))&&log.runs===1&&log.wins===1,'八关终局写入独立战报');
 check(!log.record(run.summary({grows:4}))&&log.runs===1,'重复结算和重新打开战报不累加局数');
 check(log.unlocks.includes('first-clear')&&log.unlocks.includes('storm-clear')&&log.unlocks.includes('chain-master'),'通关难度与连击解锁纪念章');
 run.continueEndless();run.next();run.score=run.target;run.finish();
 check(log.record(run.summary({grows:6}))&&log.runs===1&&log.wins===1&&log.bestRound===9,'同局继续无尽更新战报且不重复记胜');
 run.next();run.score=run.target;run.finish();log.record(run.summary({grows:9}));
 check(log.unlocks.includes('endless-ten')&&log.reports[0].round===10,'无尽远航记录与纪念章');
 log.discover(['coin','big','gem','plush','shell','chest','plushie','fish','cat']);
 check(log.unlocks.includes('collector')&&log.milestones.find(item=>item.id==='collector').earned,'图鉴累计解锁收藏纪念章');
 const restored=new VoyageLog(log.serialize());
 check(JSON.stringify(restored.serialize())===JSON.stringify(log.serialize()),'独立档案读写往返不丢失');
 for(let i=0;i<14;i++){const other=new Run();other.id='other-voyage-'+i;other.finish();restored.record(other.summary());}
 check(restored.runs===15&&restored.reports.length===12&&restored.wins===1,'最近战报有界且长期累计不因截断减少');
 check(new VoyageLog(null).runs===0&&new VoyageLog({reports:[{},null],discovered:['unknown']}).reports.length===0,'损坏档案安全回退');
 check(!new VoyageLog().record({id:'bad',phase:'victory'}),'无效局标识不可写入');
 console.log(`PASS: ${checks} 航海档案断言`);
})().catch(error=>{console.error(error);process.exitCode=1;});
