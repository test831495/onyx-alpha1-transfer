import{describe,expect,it,vi}from"vitest";import{VoiceManager,defaultVoicePreferences,defaultVoicePreferencesByAssistant}from"./index";
describe("assistant voice profiles",()=>{
 it("keeps safe system fallback",()=>{expect(defaultVoicePreferences.engine).toBe("system");expect(defaultVoicePreferences.enabled).toBe(true)});
 it("gives NOVA a female profile",()=>{expect(defaultVoicePreferencesByAssistant.nova.persona).toBe("female");expect(defaultVoicePreferencesByAssistant.nova.azureVoice).toBe("en-IN-NeerjaNeural")});
 it("gives ONYX a male profile",()=>{expect(defaultVoicePreferencesByAssistant.onyx.persona).toBe("male");expect(defaultVoicePreferencesByAssistant.onyx.azureVoice).toBe("en-IN-PrabhatNeural")});
 it("keeps profiles independent",()=>{expect(defaultVoicePreferencesByAssistant.nova).not.toBe(defaultVoicePreferencesByAssistant.onyx);expect(defaultVoicePreferencesByAssistant.nova.pitch).not.toBe(defaultVoicePreferencesByAssistant.onyx.pitch)});
});

describe("VoiceManager TTS completion",()=>{
 it("resolves system speech only after the utterance reaches a terminal event",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[]),speak:vi.fn()});
  const manager=new VoiceManager();
  let resolved=false;
  const pending=manager.speak("hello",defaultVoicePreferences).then(()=>{resolved=true});
  await Promise.resolve();
  expect(resolved).toBe(false);
    utterance?.onend?.({} as SpeechSynthesisEvent);
  await pending;
  expect(resolved).toBe(true);
  vi.unstubAllGlobals();
 });

 it("rejects instead of hanging when system speech fails to start",async()=>{
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[]),speak:vi.fn(()=>{throw new Error("blocked")})});
  const manager=new VoiceManager();
  await expect(manager.speak("hello",defaultVoicePreferences)).rejects.toThrow("blocked");
  vi.unstubAllGlobals();
 });

 it("rejects when system speech reaches an error terminal event",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[]),speak:vi.fn()});
  const manager=new VoiceManager();
  const pending=expect(manager.speak("hello",defaultVoicePreferences)).rejects.toThrow("System voice synthesis failed.");
  await Promise.resolve();
  utterance?.onerror?.({} as SpeechSynthesisErrorEvent);
  await pending;
  vi.unstubAllGlobals();
 });
});
