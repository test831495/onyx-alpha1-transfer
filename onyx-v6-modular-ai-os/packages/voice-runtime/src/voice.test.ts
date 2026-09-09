import{describe,expect,it,vi}from"vitest";import{DEFAULT_CHARACTER_BIBLE,GOLDEN_CONVERSATIONS,VoiceManager,createModelRegistry,createModelRouter,createSyntheticVoiceSession,defaultVoicePreferences,defaultVoicePreferencesByAssistant,selectSystemVoice}from"./index";
describe("assistant voice profiles",()=>{
 it("keeps safe system fallback",()=>{expect(defaultVoicePreferences.engine).toBe("system");expect(defaultVoicePreferences.enabled).toBe(true)});
 it("gives NOVA a female profile",()=>{expect(defaultVoicePreferencesByAssistant.nova.persona).toBe("female");expect(defaultVoicePreferencesByAssistant.nova.azureVoice).toBe("en-IN-NeerjaNeural")});
 it("gives ONYX a male profile",()=>{expect(defaultVoicePreferencesByAssistant.onyx.persona).toBe("male");expect(defaultVoicePreferencesByAssistant.onyx.azureVoice).toBe("en-IN-PrabhatNeural")});
 it("keeps profiles independent",()=>{expect(defaultVoicePreferencesByAssistant.nova).not.toBe(defaultVoicePreferencesByAssistant.onyx);expect(defaultVoicePreferencesByAssistant.nova.pitch).not.toBe(defaultVoicePreferencesByAssistant.onyx.pitch)});
  it("does not leak a global speech synthesis stub between tests",()=>{
    vi.stubGlobal("speechSynthesis",{getVoices:()=>[
      {name:"Default Male",lang:"en-IN",default:true},
    ]});

    expect(selectSystemVoice({
      ...defaultVoicePreferencesByAssistant.nova,
      systemVoice: undefined,
    })).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("VoiceManager TTS completion",()=>{
 it("resolves system speech only after the utterance reaches a terminal event",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[{name:"Female Test Voice",lang:"en-US",default:true}]),speak:vi.fn()});
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
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[{name:"Female Test Voice",lang:"en-US",default:true}]),speak:vi.fn(()=>{throw new Error("blocked")})});
  const manager=new VoiceManager();
  await expect(manager.speak("hello",defaultVoicePreferences)).rejects.toThrow("blocked");
  vi.unstubAllGlobals();
 });

 it("rejects when system speech reaches an error terminal event",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[{name:"Female Test Voice",lang:"en-US",default:true}]),speak:vi.fn()});
  const manager=new VoiceManager();
  const pending=expect(manager.speak("hello",defaultVoicePreferences)).rejects.toThrow("System voice synthesis failed.");
  await Promise.resolve();
  utterance?.onerror?.({} as SpeechSynthesisErrorEvent);
  await pending;
  vi.unstubAllGlobals();
 });
});

describe("C1 provider-neutral adapters and deterministic routing",()=>{
 it("keeps a synthetic local model route eligible and deterministic",()=>{
   const registry=createModelRegistry([
     {id:"local-synthetic", kind:"MODEL", provider:"synthetic-local", enabled:true, quality:0.94, privacy:0.96, reliability:0.92, latencyMs:160, costScore:0.92, expiresAt:"2099-01-01T00:00:00Z"},
     {id:"local-legacy", kind:"MODEL", provider:"synthetic-local", enabled:true, quality:0.8, privacy:0.9, reliability:0.85, latencyMs:280, costScore:0.7, expiresAt:"2099-01-01T00:00:00Z"}
   ]);
   const route=createModelRouter({ policyVersion:"c1-v1", now:"2026-09-08T00:00:00.000Z" }).route({
     requestId:"req-1",
     language:"en",
     privacyMode:"private",
     budgetMs:6000
   }, registry);
   if(!route.ok){throw new Error(route.error);}
   expect(route.ok).toBe(true);
   expect(route.value.selectedId).toBe("local-synthetic");
   expect(route.value.receipt.provider).toBe("synthetic-local");
 });

 it("keeps the voice session synthetic, cancellable and interruption-safe",()=>{
   const session=createSyntheticVoiceSession({ language:"en-IN" });
   expect(session.state).toBe("IDLE");
   session.startListening();
   expect(session.state).toBe("LISTENING");
   session.interrupt();
   expect(session.state).toBe("INTERRUPTED");
   session.reconnect();
   expect(session.state).toBe("LISTENING");
   session.cancel();
   expect(session.state).toBe("OFFLINE");
 });

 it("preserves the canonical ONYX/NOVA character bible and multilingual golden corpus",()=>{
   expect(DEFAULT_CHARACTER_BIBLE.identity).toBe("ONYX/NOVA");
   expect(DEFAULT_CHARACTER_BIBLE.languages).toEqual(expect.arrayContaining(["English","Hindi","Hinglish"]));
   expect(GOLDEN_CONVERSATIONS.length).toBeGreaterThan(0);
   expect(GOLDEN_CONVERSATIONS[0]?.language).toBe("English");
 });
});
