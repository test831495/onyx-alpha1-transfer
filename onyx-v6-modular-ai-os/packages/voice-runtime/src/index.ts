export type VoiceEngine="system"|"azure"|"elevenlabs";
export type VoiceDetail="brief"|"standard"|"detailed";
export type AssistantVoice="nova"|"onyx";
export type VoicePersona="female"|"male"|"neutral";

export interface VoicePreferences {
  enabled:boolean;
  engine:VoiceEngine;
  persona:VoicePersona;
  systemVoice?:string;
  azureVoice?:string;
  elevenLabsVoice?:string;
  language:string;
  rate:number;
  pitch:number;
  volume:number;
  detail:VoiceDetail;
  privacy:"private"|"standard"|"full";
}
export interface VoiceStatus { engine:VoiceEngine; ready:boolean; diagnostic:string; }

const legacyKey="onyx.voice.preferences";
const profileKey=(assistant:AssistantVoice)=>`onyx.voice.preferences.${assistant}`;

export const defaultVoicePreferencesByAssistant:Record<AssistantVoice,VoicePreferences>={
  nova:{enabled:true,engine:"system",persona:"female",azureVoice:"en-IN-NeerjaNeural",language:"en-IN",rate:1,pitch:1.05,volume:.9,detail:"brief",privacy:"standard"},
  onyx:{enabled:true,engine:"system",persona:"male",azureVoice:"en-IN-PrabhatNeural",language:"en-IN",rate:.98,pitch:.92,volume:.9,detail:"brief",privacy:"standard"},
};
export const defaultVoicePreferences=defaultVoicePreferencesByAssistant.nova;

const storageAvailable=()=>typeof localStorage!=="undefined";
export const loadVoicePreferences=(assistant:AssistantVoice="nova"):VoicePreferences=>{
  const base=defaultVoicePreferencesByAssistant[assistant];
  if(!storageAvailable())return base;
  try{
    const saved=localStorage.getItem(profileKey(assistant));
    if(saved)return{...base,...JSON.parse(saved)};
    if(assistant==="nova"){
      const legacy=localStorage.getItem(legacyKey);
      if(legacy){const migrated={...base,...JSON.parse(legacy),persona:"female" as const};localStorage.setItem(profileKey("nova"),JSON.stringify(migrated));return migrated;}
    }
    return base;
  }catch{return base;}
};
export const saveVoicePreferences=(assistantOrPreferences:AssistantVoice|VoicePreferences,maybePreferences?:VoicePreferences)=>{
  if(!storageAvailable())return;
  const assistant:AssistantVoice=typeof assistantOrPreferences==="string"?assistantOrPreferences:"nova";
  const preferences=typeof assistantOrPreferences==="string"?maybePreferences:assistantOrPreferences;
  if(preferences)localStorage.setItem(profileKey(assistant),JSON.stringify(preferences));
};

export const availableSystemVoices=()=>typeof speechSynthesis==="undefined"?[]:speechSynthesis.getVoices();
const femaleHints=/female|woman|zira|samantha|victoria|karen|moira|tessa|veena|heera|neerja|aria|jenny|sonia|natasha|ava|susan/i;
const maleHints=/male|man|david|mark|daniel|alex|rishi|prabhat|guy|ryan|george|thomas/i;
export const selectSystemVoice=(p:VoicePreferences):SpeechSynthesisVoice|null=>{
  const voices=availableSystemVoices();
  const exact=voices.find(v=>v.name===p.systemVoice);if(exact)return exact;
  const sameLanguage=voices.filter(v=>v.lang.toLowerCase()===p.language.toLowerCase()||v.lang.toLowerCase().startsWith((p.language.split("-")[0] ?? p.language).toLowerCase()));
  const hint=p.persona==="female"?femaleHints:p.persona==="male"?maleHints:null;
  return (hint?sameLanguage.find(v=>hint.test(v.name)):undefined)??sameLanguage.find(v=>v.default)??sameLanguage[0]??voices.find(v=>v.default)??voices[0]??null;
};

export class VoiceManager {
  private audio?:HTMLAudioElement;
  stop(){if(typeof speechSynthesis!=="undefined")speechSynthesis.cancel();this.audio?.pause();this.audio=undefined;}
  pause(){if(this.audio)this.audio.pause();else speechSynthesis?.pause();}
  resume(){if(this.audio)void this.audio.play();else speechSynthesis?.resume();}
  async status(engine:VoiceEngine):Promise<VoiceStatus>{
    if(engine==="system")return{engine,ready:typeof speechSynthesis!=="undefined",diagnostic:typeof speechSynthesis!=="undefined"?"System voice ready.":"System voice unavailable."};
    try{const r=await fetch(`/.netlify/functions/voice-status?provider=${engine}`);const j=await r.json();return{engine,ready:Boolean(j.ready),diagnostic:j.diagnostic??"Voice provider unavailable."};}
    catch{return{engine,ready:false,diagnostic:"Voice backend unavailable."};}
  }
  private speakSystem(text:string,p:VoicePreferences){if(typeof speechSynthesis==="undefined")return false;this.stop();const u=new SpeechSynthesisUtterance(text);u.lang=p.language;u.rate=p.rate;u.pitch=p.pitch;u.volume=p.volume;u.voice=selectSystemVoice(p);speechSynthesis.speak(u);return true;}
  async speak(text:string,p:VoicePreferences):Promise<{engine:VoiceEngine;fallback:boolean;message?:string}>{
    if(!p.enabled)return{engine:p.engine,fallback:false};
    if(p.engine==="system"){this.speakSystem(text,p);return{engine:"system",fallback:false};}
    try{const s=await this.status(p.engine);if(!s.ready)throw new Error(s.diagnostic);const r=await fetch("/.netlify/functions/voice-synthesize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider:p.engine,text,voiceId:p.engine==="azure"?p.azureVoice:p.elevenLabsVoice,language:p.language})});if(!r.ok)throw new Error("Premium voice synthesis failed.");this.stop();this.audio=new Audio(URL.createObjectURL(await r.blob()));await this.audio.play();return{engine:p.engine,fallback:false};}
    catch{this.speakSystem(text,p);return{engine:"system",fallback:true,message:"VOICE CONNECTION NOT ACTIVE · USING SYSTEM VOICE"};}
  }
}
