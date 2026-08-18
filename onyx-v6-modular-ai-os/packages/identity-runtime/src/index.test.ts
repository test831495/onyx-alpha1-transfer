import{describe,expect,it}from"vitest";import{assistantProfiles,assistantStatus,getAssistantProfile,styleAssistantResponse}from"./index";
describe("assistant identity profiles",()=>{
 it("defines NOVA as local and concise",()=>{expect(assistantProfiles.nova.executionBias).toBe("local-first");expect(assistantProfiles.nova.verbosity).toBe("brief");expect(assistantProfiles.nova.voicePersona).toBe("female")});
 it("defines ONYX as cloud and analytical",()=>{expect(assistantProfiles.onyx.executionBias).toBe("cloud-augmented");expect(assistantProfiles.onyx.verbosity).toBe("detailed");expect(assistantProfiles.onyx.voicePersona).toBe("male")});
 it("keeps NOVA response concise",()=>{expect(styleAssistantResponse("nova","Meeting at 4 PM.","calendar")).toBe("Meeting at 4 PM.")});
 it("adds ONYX analytical calendar context",()=>{expect(styleAssistantResponse("onyx","Meeting at 4 PM.","calendar")).toContain("ONYX insight")});
 it("exposes display status",()=>{expect(assistantStatus("nova")).toContain("LOCAL ASSISTANT");expect(getAssistantProfile("onyx").greeting).toBe("ONYX online.")});
});
