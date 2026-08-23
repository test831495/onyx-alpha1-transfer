import{describe,expect,it}from"vitest";import{defaultVoicePreferences,defaultVoicePreferencesByAssistant}from"./index";
describe("assistant voice profiles",()=>{
 it("keeps safe system fallback",()=>{expect(defaultVoicePreferences.engine).toBe("system");expect(defaultVoicePreferences.enabled).toBe(true)});
 it("gives NOVA a female profile",()=>{expect(defaultVoicePreferencesByAssistant.nova.persona).toBe("female");expect(defaultVoicePreferencesByAssistant.nova.azureVoice).toBe("en-IN-NeerjaNeural")});
 it("gives ONYX a male profile",()=>{expect(defaultVoicePreferencesByAssistant.onyx.persona).toBe("male");expect(defaultVoicePreferencesByAssistant.onyx.azureVoice).toBe("en-IN-PrabhatNeural")});
 it("keeps profiles independent",()=>{expect(defaultVoicePreferencesByAssistant.nova).not.toBe(defaultVoicePreferencesByAssistant.onyx);expect(defaultVoicePreferencesByAssistant.nova.pitch).not.toBe(defaultVoicePreferencesByAssistant.onyx.pitch)});
});
