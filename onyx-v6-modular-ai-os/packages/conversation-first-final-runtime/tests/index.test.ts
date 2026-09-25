import { describe, expect, it } from "vitest";
import { ConversationDispatcher, GOLDEN_CONVERSATIONS, VoiceSessionController, emotionalBoundary, evaluateCharacterDrift, languageParity, planCouncil } from "../src/index";

const base = (overrides: Partial<Parameters<ConversationDispatcher["dispatch"]>[0]> = {}) => ({ source: "TEXT" as const, rawText: "I have had a long day.", sessionId: "s", turnId: "t", utteranceGeneration: 1, purpose: "REFLECTION" as const, truthPolicy: "NO_EXTERNAL_TRUTH_REQUIRED" as const, ...overrides });

describe("B5D unified dispatch", () => {
  it("keeps voice and text semantic outcomes equivalent", () => {
    const dispatcher = new ConversationDispatcher();
    const text = dispatcher.dispatch(base());
    const voice = dispatcher.dispatch(base({ source: "VOICE", rawText: "I have had a long day.", turnId: "voice" }));
    expect(voice.purpose).toBe(text.purpose); expect(voice.speaker).toBe(text.speaker); expect(voice.truthPolicy).toBe(text.truthPolicy); expect(voice.receipt).toEqual(text.receipt);
  });
  it("preserves commands as proposals without execution", () => {
    const result = new ConversationDispatcher().dispatch(base({ rawText: "Open Workspace", purpose: "NAVIGATION_REQUEST", actionTarget: "workspace" }));
    expect(result.responseMode).toBe("ACTION_PROPOSAL"); expect(result.actionProposal).toBeNull(); expect(result.receipt.executionAuthorized).toBe(false);
  });
  it("degrades unavailable operational truth naturally", () => expect(new ConversationDispatcher().dispatch(base({ purpose: "INFORMATION_REQUEST", truthPolicy: "NOT_ASSESSABLE", rawText: "What meetings do I have tomorrow?" })).responseMode).toBe("SAFE_LIMITATION"));
});

describe("B5D voice lifecycle", () => {
  it("rejects stale starts and cancels stale completion", () => {
    const voice = new VoiceSessionController();
    expect(voice.start("s", "t", 2, "NOVA", "clock")).not.toBeNull();
    expect(voice.start("s", "old", 1, "NOVA", "old-clock")).toBeNull();
    expect(voice.end("s", "old", 1, "NOVA", "old-clock", null)).toBeNull();
    expect(voice.interrupt("s", "new", 3, "NOVA", "new-clock")?.interruptedTurnId).toBe("t");
  });
  it("resumes only an interrupted response", () => { const voice = new VoiceSessionController(); expect(voice.resume("s", "r", 2, "NOVA", "clock")).toBeNull(); voice.start("s", "t", 1, "NOVA", "clock"); voice.interrupt("s", "i", 2, "NOVA", "clock"); expect(voice.resume("s", "r", 3, "NOVA", "clock")?.resumedTurnId).toBe("t"); });
});

describe("B5E Council, language, emotion, offline", () => {
  it("activates Council only for explicit or material requests", () => { expect(planCouncil({ routine: true, consequential: true, facts: [] }).eligible).toBe(false); const council = planCouncil({ explicitRequest: true, facts: ["supplied fact"] }); expect(council.eligible).toBe(true); expect(council.authorityGranted).toBe(false); expect(council.synthesis).toContain("authority"); });
  it("preserves language and identifiers", () => { expect(languageParity("Mujhe Track B ka plan batao", "Track B").language).toBe("HINGLISH"); expect(languageParity("मुझे योजना बताओ", "योजना").language).toBe("HINDI"); });
  it("enforces emotional boundaries", () => { expect(emotionalBoundary("I am really frustrated with this.").allowed).toBe(true); expect(emotionalBoundary("I feel your pain. Rely on me.").allowed).toBe(false); });
  it("preserves identity in offline mode", () => { const result = new ConversationDispatcher().dispatch(base({ purpose: "INFORMATION_REQUEST", truthPolicy: "NOT_ASSESSABLE", offline: true, localCapabilityAvailable: false })); expect(result.text).toContain("operating locally"); expect(result.speaker).toBe("NOVA"); });
});

describe("B5F Golden Conversations and drift", () => {
  it("contains all required golden families with evidence", () => { expect(GOLDEN_CONVERSATIONS).toHaveLength(20); expect(GOLDEN_CONVERSATIONS.every((record) => record.acceptanceStatus === "ACCEPTED" && record.evidenceReferences.length > 0)).toBe(true); });
  it("rejects drift and passes differentiated bounded text", () => { expect(evaluateCharacterDrift({ character: "ONYX", text: "I feel your pain." }).status).toBe("FAIL"); expect(evaluateCharacterDrift({ character: "NOVA", text: "One practical next step is enough." }).status).toBe("PASS"); expect(evaluateCharacterDrift({ character: "ONYX", text: "same", comparisonText: "same" }).status).toBe("FAIL"); });
});