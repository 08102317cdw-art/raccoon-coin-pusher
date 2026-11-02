import { VOICE_CLIPS } from './art/voice-clips.js';
// Embedded MP3: works offline, no speech-synthesis voice installation or network.
export function createMascotVoice({onSpeaking=()=>{},onDuck=()=>{}}={}){
 let enabled=true;try{enabled=localStorage.getItem('dafeiyu-voice')!=='off';}catch{}
 const audio=new Audio();audio.preload='auto';audio.volume=.72;
 let lastAt=-10000,lastPriority=0,caption='',captionUntil=0,petIndex=0,played=0,failures=0;
 function end(){onSpeaking(false);onDuck(false);}
 audio.addEventListener('ended',end);audio.addEventListener('error',()=>{failures++;end();});
 function say(kind,{manual=false}={}){
  const key=kind==='pet'?(petIndex++%2?'pet2':'pet'):VOICE_CLIPS[kind]?kind:'idle',clip=VOICE_CLIPS[key];
  const now=performance.now(),priority=manual?3:['reach','big'].includes(key)?2:1;
  caption=clip.text;captionUntil=now+4500;
  if(!enabled||(!manual&&now-lastAt<5500&&priority<=lastPriority)||manual&&now-lastAt<450)return clip.text;
  audio.pause();audio.src=clip.src;audio.currentTime=0;lastAt=now;lastPriority=priority;
  audio.play().then(()=>{played++;onSpeaking(true);onDuck(true);}).catch(()=>{failures++;end();});
  return clip.text;
 }
 return{say,unlock(){audio.load();},setEnabled(value){enabled=!!value;if(!enabled){audio.pause();end();}try{localStorage.setItem('dafeiyu-voice',enabled?'on':'off');}catch{}},get enabled(){return enabled;},get caption(){return performance.now()<captionUntil?caption:'';},get state(){return{enabled,played,failures,speaking:!audio.paused,caption,embeddedClips:Object.keys(VOICE_CLIPS).length};}};
}
