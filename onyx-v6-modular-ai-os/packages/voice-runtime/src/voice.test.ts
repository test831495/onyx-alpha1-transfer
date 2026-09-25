import{describe,expect,it,vi}from"vitest";import{DEFAULT_CHARACTER_BIBLE,GOLDEN_CONVERSATIONS,VoiceManager,createModelRegistry,createModelRouter,createSyntheticVoiceSession,defaultVoicePreferences,defaultVoicePreferencesByAssistant,normalizeTextForSpeech,selectSystemVoice}from"./index";
describe("speech text normalization",()=>{
 it("removes common Markdown while preserving meaning",()=>{
  expect(normalizeTextForSpeech("How about a quick **tomato chickpea curry with rice**?")).toBe("How about a quick tomato chickpea curry with rice?");
  expect(normalizeTextForSpeech("Try __vegetable soup__ with *warm bread*. ")).toBe("Try vegetable soup with warm bread.");
  expect(normalizeTextForSpeech("[Read the recipe](https://example.com) and ![tomato photo](https://example.com/a.png)")).toBe("Read the recipe and tomato photo");
  expect(normalizeTextForSpeech("# Heading\n- first item\n2. second item\n> quoted text\n---")).toBe("Heading first item second item quoted text");
  expect(normalizeTextForSpeech("Use `inline code` and ```\nconst x = 1;\n```.")).toBe("Use inline code and const x = 1;.");
 });
 it("preserves meaningful literal symbols and decodes safe entities",()=>{
  expect(normalizeTextForSpeech("2 * 3 = 6; file_name.txt; 10:30; &amp; &quot;ok&quot;.")).toBe("2 * 3 = 6; file_name.txt; 10:30; & \"ok\".");
  expect(normalizeTextForSpeech("2 * 3 * 4 = 24")).toBe("2 * 3 * 4 = 24");
 });
 it("returns empty text for formatting-only content",()=>{expect(normalizeTextForSpeech("*** --- ``` ```")).toBe("");});
});
describe("assistant voice profiles",()=>{
 it("keeps neural profiles with browser fallback available",()=>{expect(defaultVoicePreferences.engine).toBe("azure");expect(defaultVoicePreferences.enabled).toBe(true)});
 it("gives NOVA a female profile",()=>{expect(defaultVoicePreferencesByAssistant.nova.persona).toBe("female");expect(defaultVoicePreferencesByAssistant.nova.azureVoice).toBe("en-IN-NeerjaNeural")});
 it("gives ONYX a male profile",()=>{expect(defaultVoicePreferencesByAssistant.onyx.persona).toBe("male");expect(defaultVoicePreferencesByAssistant.onyx.azureVoice).toBe("en-IN-PrabhatNeural")});
 it("assigns distinct explicit character voice profiles",()=>{expect(defaultVoicePreferencesByAssistant.nova.voiceProfileId).toBe("NOVA_AZURE_EN_IN_NEERJA");expect(defaultVoicePreferencesByAssistant.onyx.voiceProfileId).toBe("ONYX_AZURE_EN_IN_PRABHAT");expect(defaultVoicePreferencesByAssistant.nova.voiceProfileId).not.toBe(defaultVoicePreferencesByAssistant.onyx.voiceProfileId)});
 it("keeps profiles independent",()=>{expect(defaultVoicePreferencesByAssistant.nova).not.toBe(defaultVoicePreferencesByAssistant.onyx);expect(defaultVoicePreferencesByAssistant.nova.pitch).not.toBe(defaultVoicePreferencesByAssistant.onyx.pitch)});
  it("does not leak a global speech synthesis stub between tests",()=>{
    vi.stubGlobal("speechSynthesis",{getVoices:()=>[
      {name:"Default Male",lang:"en-IN",default:true},
    ]});

    expect(selectSystemVoice({
      ...defaultVoicePreferencesByAssistant.nova,
      systemVoice: undefined,
    })?.name).toBe("Default Male");
    vi.unstubAllGlobals();
  });
});

describe("VoiceManager TTS completion",()=>{
 it("prefers a configured healthy neural adapter before browser speech",async()=>{
  let audio: {onended?:()=>void;onerror?:()=>void;play:()=>Promise<void>}|undefined;
  let synthRequestBody="";
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{if(!url.includes("voice-status"))synthRequestBody=String(init?.body);return url.includes("voice-status")?new Response(JSON.stringify({ready:true}),{status:200}):new Response(new Blob(["audio"]),{status:200})}));
  vi.stubGlobal("Audio",class{onended?:()=>void;onerror?:()=>void;constructor(public source:string){audio=this as unknown as typeof audio;}play=async()=>undefined;pause=()=>undefined;});
  const manager=new VoiceManager();
  const pending=manager.speak("How about **warm soup**?",{...defaultVoicePreferencesByAssistant.onyx,engine:"azure"});
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(audio).toBeDefined();
  audio?.onended?.();
  const result=await pending;
  expect(result.engine).toBe("azure");
  expect(result.fallback).toBe(false);
  expect(synthRequestBody).toContain('"text":"How about warm soup?"');
  expect(synthRequestBody).not.toContain("**");
  expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes("voice-status"))).toBe(true);
  vi.unstubAllGlobals();
 });
 it("normalizes browser fallback text and skips empty speech without invoking providers",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  const speak=vi.fn();
  vi.stubGlobal("fetch",vi.fn(async()=>{throw new Error("offline")}));
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[{name:"Female Test Voice",lang:"en-US",default:true}]),speak});
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  const manager=new VoiceManager();
  const skipped=await manager.speak("*** ---",{...defaultVoicePreferences,engine:"system"});
  expect(skipped.skipped).toBe(true);
  expect(speak).not.toHaveBeenCalled();
  const pending=manager.speak("Try **warm bread**.",{...defaultVoicePreferences,engine:"system"});
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(utterance?.text).toBe("Try warm bread.");
  utterance?.onend?.({} as SpeechSynthesisEvent);
  await pending;
  expect(speak).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
 });
 it("resolves system speech only after the utterance reaches a terminal event",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[{name:"Female Test Voice",lang:"en-US",default:true}]),speak:vi.fn()});
  const manager=new VoiceManager();
  let resolved=false;
  const pending=manager.speak("hello",{...defaultVoicePreferences,engine:"system"}).then(()=>{resolved=true});
  await new Promise(resolve=>setTimeout(resolve,0));
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
  await expect(manager.speak("hello",{...defaultVoicePreferences,engine:"system"})).rejects.toThrow("blocked");
  vi.unstubAllGlobals();
 });

 it("rejects when system speech reaches an error terminal event",async()=>{
  let utterance:SpeechSynthesisUtterance|undefined;
  vi.stubGlobal("SpeechSynthesisUtterance",class{onend:((event:unknown)=>void)|null=null;onerror:((event:unknown)=>void)|null=null;lang="";rate=1;pitch=1;volume=1;voice=null;constructor(public text:string){utterance=this as unknown as SpeechSynthesisUtterance;}});
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),getVoices:vi.fn(()=>[{name:"Female Test Voice",lang:"en-US",default:true}]),speak:vi.fn()});
  const manager=new VoiceManager();
  const pending=expect(manager.speak("hello",{...defaultVoicePreferences,engine:"system"})).rejects.toThrow("System voice synthesis failed.");
  await new Promise(resolve=>setTimeout(resolve,0));
  utterance?.onerror?.({} as SpeechSynthesisErrorEvent);
  await pending;
  vi.unstubAllGlobals();
 });
});

describe("C1 provider-neutral adapters and deterministic routing",()=>{
 it("keeps the package-root registry immutable without exposing its mutable index",()=>{
   const source=[
     {id:"registry-first", kind:"MODEL" as const, provider:"synthetic-local", enabled:false, quality:0.9, privacy:0.9, reliability:0.9, latencyMs:100, costScore:0.9, expiresAt:"2099-01-01T00:00:00Z"},
     {id:"registry-second", kind:"MODEL" as const, provider:"synthetic-local", enabled:false, quality:0.8, privacy:0.8, reliability:0.8, latencyMs:200, costScore:0.8, expiresAt:"2099-01-01T00:00:00Z"},
   ];
   const registry=createModelRegistry(source);
   source.pop();
   expect(registry.candidates).toHaveLength(2);
   expect(Object.isFrozen(registry)).toBe(true);
   expect(Object.isFrozen(registry.candidates)).toBe(true);
   expect(()=>{(registry.candidates as unknown as Array<unknown>).push(source[0]);}).toThrow();
   expect(()=>{(registry.candidates as unknown as Array<unknown>)[0]=source[0];}).toThrow();
   expect(registry.byId.get("registry-first")?.id).toBe("registry-first");
   expect("set" in registry.byId).toBe(false);
   expect(registry.candidates.every(candidate=>candidate.enabled===false)).toBe(true);
 });

 it("rejects duplicate candidate IDs before lookup construction without exposing caller input",()=>{
   const first={id:"caller-controlled-id", kind:"MODEL" as const, provider:"synthetic-local", enabled:false, quality:0.9, privacy:0.9, reliability:0.9, latencyMs:100, costScore:0.9, expiresAt:"2099-01-01T00:00:00Z"};
   const duplicate={...first,quality:0.1};
   const third={...first,id:"unique-id"};
   const ordered=[first,duplicate,third];
   const reversed=[third,duplicate,first];
  expect(createModelRegistry([first,third]).byId.get("caller-controlled-id")).toMatchObject({id:"caller-controlled-id",quality:0.9});
   for(const candidates of [ordered,reversed,[first,third,duplicate]]){
     expect(()=>createModelRegistry(candidates)).toThrow("DUPLICATE_ADAPTER_ID");
     try{createModelRegistry(candidates);}catch(error){expect(String(error)).not.toContain("caller-controlled-id");}
   }
   expect(ordered).toEqual([first,duplicate,third]);
   expect(createModelRegistry([]).candidates).toEqual([]);
 });

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
