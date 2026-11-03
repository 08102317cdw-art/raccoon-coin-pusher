"""裁剪用户授权 GamesVibe 积分生成的银币音效，保留原始文件与处理记录。"""
from pathlib import Path
import os,subprocess,array,math,json,base64,wave,hashlib
ROOT=Path(__file__).resolve().parents[1];FF=os.environ.get('FFMPEG_PATH','ffmpeg')
output=ROOT/'audio'/'generated';samples={};sources=[];rate=32000

def pack(file,key,start,duration,highpass=1000):
 source=output/file
 raw=subprocess.check_output([FF,'-v','error','-i',str(source),'-af',f'highpass=f={highpass},equalizer=f=6500:t=q:w=1.1:g=2,lowpass=f=14000','-ac','1','-ar',str(rate),'-f','s16le','pipe:1'])
 pcm=array.array('h');pcm.frombytes(raw);pcm=pcm[int(start*rate):int((start+duration)*rate)]
 peak=max(abs(v)for v in pcm)or 1
 # 短入场只去除数码跳变，保留金属瞬态；落点裁剪末尾使用缓出。
 for i in range(len(pcm)):
  fade=min(1,i/(rate*.0007),(len(pcm)-i)/(rate*.025));pcm[i]=int(pcm[i]/peak*25000*fade)
 with wave.open(str(output/(key+'.wav')),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(pcm.tobytes())
 samples[key]=base64.b64encode(pcm.tobytes()).decode();sources.append({'file':file,'key':key,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'start':start,'duration':len(pcm)/rate})
pack('silver-single-v1.mp3','impact0',0,.28)
for i,(start,length)in enumerate([(0,.19),(.25,.22),(.54,.18),(1.045,.16)],1):pack('silver-cascade-v1.mp3',f'impact{i}',start,length)
pack('silver-single-v1.mp3','insert',0,.13,800)
pack('silver-cascade-v1.mp3','scatter',0,1.48)
pack('silver-cascade-v1.mp3','bank',.25,.78)
(ROOT/'src'/'art'/'coin-audio.js').write_text('// GamesVibe / ElevenLabs 生成银币音效；来源与裁剪见 audio/generated/SOURCE.json。\nexport default '+json.dumps({'rate':rate,'samples':samples},separators=(',',':'))+';\n',encoding='utf-8')
generation=[{'file':'silver-single-v1.mp3','durationSeconds':1.2,'promptInfluence':.65,'cost':4,'description':'单枚银币敲击另一枚币沿，清脆明亮，短余响，干净近距离录音感，无空罐、低沉撞击、音乐、人声或环境混响。'},{'file':'silver-cascade-v1.mp3','durationSeconds':1.8,'promptInfluence':.65,'cost':4,'description':'多枚小银币落在币堆与金属收币盘，连续清晰的明亮叮响，短促衰减，无罐响、重低音或配乐。'}]
(output/'SOURCE.json').write_text(json.dumps({'platform':'GamesVibe / VibeHub','provider':'ElevenLabs','model':'eleven_text_to_sound_v2','date':'2026-11-03','source':'https://gamesvibe.app/credits','method':'用户授权现有积分，通过官方 CLI 生成；原始音频保留于本目录。','creditsSpent':8,'balanceAfter':352,'samples':sources,'generation':generation},ensure_ascii=False,indent=2),encoding='utf-8')
demo=array.array('h',[0])*int(rate*4.2)
for key,t,vol in[('impact0',.2,.7),('impact2',.9,.55),('impact4',1.03,.65),('insert',1.7,.5),('bank',2.3,.68)]:
 data=array.array('h');data.frombytes(base64.b64decode(samples[key]));offset=int(t*rate)
 for i,v in enumerate(data):
  if offset+i<len(demo):demo[offset+i]=max(-32767,min(32767,int(demo[offset+i]+v*vol)))
with wave.open(str(output/'游戏混音试听.wav'),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(demo.tobytes())
print('已打包 AI 银币采样',len(samples),'个；PCM 字节',sum(len(base64.b64decode(v))for v in samples.values()))
