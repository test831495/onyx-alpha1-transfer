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
export const SYSTEM_VOICE_READINESS_TIMEOUT_MS=2000;
export const waitForSystemVoiceInventory=(timeoutMs=SYSTEM_VOICE_READINESS_TIMEOUT_MS):Promise<SpeechSynthesisVoice[]>=>{
  const synthesis=typeof speechSynthesis==="undefined"?null:speechSynthesis;
  if(!synthesis)return Promise.resolve([]);
  const initial=synthesis.getVoices();
  if(initial.length>0)return Promise.resolve(initial);
  return new Promise(resolve=>{
    let settled=false;
    const finish=()=>{if(settled)return;settled=true;synthesis.removeEventListener("voiceschanged",finish);globalThis.clearTimeout(timer);resolve(synthesis.getVoices())};
    const timer=globalThis.setTimeout(finish,timeoutMs);
    synthesis.addEventListener("voiceschanged",finish,{once:true});
  });
};
const femaleHints=/female|woman|zira|samantha|victoria|karen|moira|tessa|veena|heera|neerja|aria|jenny|sonia|natasha|ava|susan/i;
const maleHints=/male|man|david|mark|daniel|alex|rishi|prabhat|guy|ryan|george|thomas/i;
export const selectSystemVoice=(p:VoicePreferences):SpeechSynthesisVoice|null=>{
  const voices=availableSystemVoices();
  const exact=voices.find(v=>v.name===p.systemVoice);if(exact)return exact;
  const sameLanguage=voices.filter(v=>v.lang.toLowerCase()===p.language.toLowerCase()||v.lang.toLowerCase().startsWith((p.language.split("-")[0] ?? p.language).toLowerCase()));
  const hint=p.persona==="female"?femaleHints:p.persona==="male"?maleHints:null;
  return (hint?sameLanguage.find(v=>hint.test(v.name)):undefined)??null;
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
  private async speakSystem(text:string,p:VoicePreferences){if(typeof speechSynthesis==="undefined")return false;this.stop();await waitForSystemVoiceInventory();const selectedVoice=selectSystemVoice(p);if(!selectedVoice)return false;return new Promise<boolean>((resolve,reject)=>{const u=new SpeechSynthesisUtterance(text);let done=false;const finish=(ok:boolean,error?:unknown)=>{if(done)return;done=true;if(ok)resolve(true);else reject(error instanceof Error?error:new Error("System voice synthesis failed."));};u.lang=p.language;u.rate=p.rate;u.pitch=p.pitch;u.volume=p.volume;u.voice=selectedVoice;u.onend=()=>finish(true);u.onerror=(event)=>finish(false,event);try{speechSynthesis.speak(u)}catch(error){finish(false,error)}});}
  async speak(text:string,p:VoicePreferences):Promise<{engine:VoiceEngine;fallback:boolean;message?:string}>{
    if(!p.enabled)return{engine:p.engine,fallback:false};
    if(p.engine==="system"){const spoken=await this.speakSystem(text,p);return{engine:"system",fallback:!spoken,message:spoken?undefined:"SYSTEM CHARACTER VOICE UNAVAILABLE · TEXT PRESERVED"};}
    try{const s=await this.status(p.engine);if(!s.ready)throw new Error(s.diagnostic);const r=await fetch("/.netlify/functions/voice-synthesize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider:p.engine,text,voiceId:p.engine==="azure"?p.azureVoice:p.elevenLabsVoice,language:p.language})});if(!r.ok)throw new Error("Premium voice synthesis failed.");this.stop();this.audio=new Audio(URL.createObjectURL(await r.blob()));await this.audio.play();return{engine:p.engine,fallback:false};}
    catch{try{await this.speakSystem(text,p);}catch{}return{engine:"system",fallback:true,message:"VOICE CONNECTION NOT ACTIVE · USING SYSTEM VOICE"};}
  }
}

export type C1ModelCandidate = Readonly<{ id:string; kind:"MODEL"|"STT"|"TTS"|"WAKE_WORD"; provider:string; enabled:boolean; quality:number; privacy:number; reliability:number; latencyMs:number; costScore:number; expiresAt:string; }>;
export type C1ModelRouteDecision = Readonly<{ ok:true; value:{ selectedId:string; provider:string; receipt:{ provider:string; quality:number; latencyMs:number; reason:string; }; } } | { ok:false; error:string; }>;
export function createModelRegistry(candidates: readonly C1ModelCandidate[]) {
  const frozenCandidates=Object.freeze(candidates.map((candidate)=>Object.freeze({...candidate})));
  const ids=new Set<string>();
  for(const candidate of frozenCandidates){if(ids.has(candidate.id))throw new Error("DUPLICATE_ADAPTER_ID");ids.add(candidate.id);}
  const index=new Map(frozenCandidates.map((candidate)=>[candidate.id,candidate] as const));
  return Object.freeze({candidates:frozenCandidates,byId:Object.freeze({get:(id:string)=>index.get(id)})});
}
export function createModelRouter({ policyVersion, now }: { policyVersion: string; now: string }) {
  const t = new Date(now).getTime();
  return {
    route(input: { requestId: string; language: string; privacyMode: "private" | "standard" | "full"; budgetMs: number }, registry: { candidates: readonly C1ModelCandidate[] }) {
      const eligible = registry.candidates.filter((candidate) => candidate.enabled && Number(new Date(candidate.expiresAt).getTime()) > t && candidate.kind === "MODEL");
      if (eligible.length === 0) return { ok: false, error: "NO_ELIGIBLE_MODEL_PROVIDER" } satisfies C1ModelRouteDecision;
      const ranked = [...eligible].sort((left, right) => {
        const scoreLeft = left.quality * 0.45 + left.privacy * 0.25 + left.reliability * 0.2 + left.costScore * 0.1 - left.latencyMs / 10000;
        const scoreRight = right.quality * 0.45 + right.privacy * 0.25 + right.reliability * 0.2 + right.costScore * 0.1 - right.latencyMs / 10000;
        return scoreRight - scoreLeft;
      });
      const winner = ranked[0]!;
      return { ok: true, value: { selectedId: winner.id, provider: winner.provider, receipt: { provider: winner.provider, quality: winner.quality, latencyMs: winner.latencyMs, reason: `policy=${policyVersion};privacy=${input.privacyMode};request=${input.requestId}` } } } satisfies C1ModelRouteDecision;
    }
  };
}
export type SyntheticVoiceSessionState = "IDLE" | "LISTENING" | "INTERRUPTED" | "OFFLINE";
export function createSyntheticVoiceSession({ language }: { language: string }) {
  let state: SyntheticVoiceSessionState = "IDLE";
  return {
    get language() { return language; },
    get state() { return state; },
    startListening() { state = "LISTENING"; return state; },
    interrupt() { state = "INTERRUPTED"; return state; },
    reconnect() { state = "LISTENING"; return state; },
    cancel() { state = "OFFLINE"; return state; },
  };
}
export const DEFAULT_CHARACTER_BIBLE = Object.freeze({
  identity: "ONYX/NOVA",
  languages: ["English", "Hindi", "Hinglish"],
  modes: ["concise", "executive", "natural"],
  providerNeutral: true,
  policyBound: true,
} as const);
export const GOLDEN_CONVERSATIONS = Object.freeze([
  { language: "English", prompt: "Hey Onyx, what changed today?", expected: "Provide a concise evidence-grounded summary." },
  { language: "Hindi", prompt: "नमस्ते, आज क्या बदला है?", expected: "Provide a concise evidence-grounded summary in Hindi." },
  { language: "Hinglish", prompt: "Hey Onyx, kya update hai today?", expected: "Provide a concise evidence-grounded summary in Hinglish." },
] as const);
