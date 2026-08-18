import{availableSystemVoices,type AssistantVoice,type VoicePreferences,type VoiceEngine,type VoicePersona}from"@onyx/voice-runtime";
export function VoiceSettingsPanel({assistant,value,onChange,onTest,status}:{assistant:AssistantVoice;value:VoicePreferences;onChange:(v:VoicePreferences)=>void;onTest:()=>void;status:string}){
 const set=<K extends keyof VoicePreferences>(k:K,v:VoicePreferences[K])=>onChange({...value,[k]:v});
 return <section className="glass-surface" style={{margin:"1rem",padding:"1rem",borderRadius:"1.25rem",display:"grid",gap:".7rem"}}>
  <h2>{assistant.toUpperCase()} Voice Profile</h2>
  <label>Persona <select value={value.persona} onChange={e=>set("persona",e.target.value as VoicePersona)}><option value="female">Female</option><option value="male">Male</option><option value="neutral">Neutral</option></select></label>
  <label>Engine <select value={value.engine} onChange={e=>set("engine",e.target.value as VoiceEngine)}><option value="system">System / Local Voice</option><option value="azure">Azure AI Speech</option><option value="elevenlabs">ElevenLabs</option></select></label>
  {value.engine==="system"&&<label>System voice <select value={value.systemVoice??""} onChange={e=>set("systemVoice",e.target.value)}><option value="">Automatic {value.persona} voice</option>{availableSystemVoices().map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} ({v.lang}){v.default?" · Default":""}</option>)}</select></label>}
  {value.engine==="azure"&&<label>Azure voice <input value={value.azureVoice??""} onChange={e=>set("azureVoice",e.target.value)} placeholder={assistant==="nova"?"en-IN-NeerjaNeural":"en-IN-PrabhatNeural"}/></label>}
  {value.engine==="elevenlabs"&&<label>ElevenLabs voice ID <input value={value.elevenLabsVoice??""} onChange={e=>set("elevenLabsVoice",e.target.value)} placeholder={`${assistant.toUpperCase()} voice ID`}/></label>}
  <label>Language <input value={value.language} onChange={e=>set("language",e.target.value)}/></label>
  <label>Rate <input type="range" min="0.6" max="1.4" step="0.05" value={value.rate} onChange={e=>set("rate",Number(e.target.value))}/><span>{value.rate.toFixed(2)}</span></label>
  <label>Pitch <input type="range" min="0.5" max="1.5" step="0.05" value={value.pitch} onChange={e=>set("pitch",Number(e.target.value))}/><span>{value.pitch.toFixed(2)}</span></label>
  <label>Volume <input type="range" min="0" max="1" step="0.05" value={value.volume} onChange={e=>set("volume",Number(e.target.value))}/><span>{value.volume.toFixed(2)}</span></label>
  <label>Detail <select value={value.detail} onChange={e=>set("detail",e.target.value as VoicePreferences["detail"])}><option value="brief">Brief</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></label>
  <button onClick={onTest}>Test {assistant.toUpperCase()} voice</button><small style={{overflowWrap:"anywhere"}}>{status}</small>
 </section>;
}
