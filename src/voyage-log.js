// 独立于局内存档的航海记录；重新开局不会删除图鉴、纪念章和历史战报。
const integer = (value, max = 1e15) => Number.isSafeInteger(value) && value >= 0 ? Math.min(max, value) : 0;
const tokenIds = new Set(['coin','big','gem','plush','shell','chest','plushie','seed','water','tree','fish','cat','rat','hen','egg','rooster','clover','multi','lightning','battery','magnet','bomb','echo','relic','shrimp','killer','rust','thief','decay']);
const milestones = Object.freeze([
  {id:'first-voyage',name:'初次出航',desc:'完成第一局航路。'},
  {id:'first-clear',name:'满载归航',desc:'首次通过全部八关。'},
  {id:'storm-clear',name:'风暴船长',desc:'在风暴航路通过全部八关。'},
  {id:'collector',name:'海湾收藏家',desc:'在台面上发现 12 种不同的币或礼品。'},
  {id:'endless-ten',name:'远航者',desc:'在无尽航路到达第 10 关。'},
  {id:'chain-master',name:'连击大师',desc:'一局中打出至少 16 枚连续入账。'},
]);
const statsKeys = ['banked','bestCombo','bestAward','exchanges','shakes','inserted'];
const synergyKeys = ['grows','hunts','charges','produced','explosions'];
function cleanReport(value) {
  if (!value || typeof value.id !== 'string' || !/^[a-z0-9-]{4,80}$/i.test(value.id)) return null;
  if (!Number.isInteger(value.round) || value.round < 1 || value.round > 1e9) return null;
  const endless = value.endless === true;
  if (!['gameover','victory'].includes(value.phase) && !(endless && value.phase === 'shop' && value.round >= 8)) return null;
  if (value.phase === 'victory' && (endless || value.round !== 8)) return null;
  const stats = {}, synergies = {}, levels = {};
  for (const key of statsKeys) stats[key] = integer(value.stats?.[key]);
  for (const key of synergyKeys) synergies[key] = integer(value.synergies?.[key]);
  for (const [key, level] of Object.entries(value.levels || {})) if (/^[a-z]{1,24}$/.test(key)) levels[key] = integer(level, 64);
  return {
    id:value.id,character:['gardener','keeper','engineer'].includes(value.character)?value.character:'classic',
    difficulty:['calm','standard','storm'].includes(value.difficulty)?value.difficulty:'standard',endless,
    round:integer(value.round,1e9),phase:value.phase,won:value.phase==='victory'||endless,
    total:integer(value.total),score:integer(value.score),elapsed:integer(value.elapsed,1e7),stats,synergies,levels,
    recordedAt:integer(value.recordedAt),
  };
}
export class VoyageLog {
  constructor(saved = {}) {
    saved = saved && typeof saved === 'object' ? saved : {};
    this.version = 1;
    this.runs = integer(saved.runs, 1e9); this.wins = Math.min(this.runs, integer(saved.wins, 1e9));
    this.bestTotal = integer(saved.bestTotal); this.bestRound = integer(saved.bestRound, 1e9);
    this.discovered = [...new Set((Array.isArray(saved.discovered)?saved.discovered:[]).filter(id=>tokenIds.has(id)))];
    this.unlocks = [...new Set((Array.isArray(saved.unlocks)?saved.unlocks:[]).filter(id=>milestones.some(item=>item.id===id)))];
    const reports = (Array.isArray(saved.reports)?saved.reports:[]).map(cleanReport).filter(Boolean);
    this.reports = reports.filter((report,index)=>reports.findIndex(item=>item.id===report.id)===index).slice(0,12);
    this.refreshUnlocks();
  }
  discover(ids) {
    let added = 0;
    for (const id of Array.isArray(ids)?ids:[ids]) if (tokenIds.has(id) && !this.discovered.includes(id)) {this.discovered.push(id);added++;}
    this.refreshUnlocks();
    return added;
  }
  record(summary) {
    const report = cleanReport(summary); if (!report) return false;
    const previous = this.reports.find(item=>item.id===report.id);
    if (previous && JSON.stringify({...previous,recordedAt:0}) === JSON.stringify({...report,recordedAt:0})) return false;
    if (!previous) {this.runs++; if (report.won) this.wins++;}
    else if (!previous.won && report.won) this.wins++;
    report.recordedAt = Date.now();
    this.reports = [report,...this.reports.filter(item=>item.id!==report.id)].slice(0,12);
    this.bestTotal = Math.max(this.bestTotal, report.total); this.bestRound = Math.max(this.bestRound, report.round);
    this.refreshUnlocks();
    return true;
  }
  refreshUnlocks() {
    const earn = (id, condition) => {if(condition&&!this.unlocks.includes(id))this.unlocks.push(id);};
    earn('first-voyage',this.runs>0); earn('first-clear',this.wins>0);
    earn('storm-clear',this.reports.some(report=>report.won&&report.difficulty==='storm'));
    earn('collector',this.discovered.length>=12);
    earn('endless-ten',this.reports.some(report=>report.endless&&report.round>=10));
    earn('chain-master',this.reports.some(report=>report.stats.bestCombo>=16));
  }
  get milestones() {return milestones.map(item=>({...item,earned:this.unlocks.includes(item.id)}));}
  serialize() {
    return {version:this.version,runs:this.runs,wins:this.wins,bestTotal:this.bestTotal,bestRound:this.bestRound,
      discovered:[...this.discovered],unlocks:[...this.unlocks],reports:JSON.parse(JSON.stringify(this.reports))};
  }
}
