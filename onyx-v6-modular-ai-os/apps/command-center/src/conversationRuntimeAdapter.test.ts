import { describe, expect, it, vi } from "vitest";
import { buildWorkspaceConversationProjection, createConversationRuntimeAdapter, selectConversationSpeaker } from "./conversationRuntimeAdapter";

const input = (rawText: string, overrides: Partial<Parameters<ReturnType<typeof createConversationRuntimeAdapter>>[0]> = {}) => ({
  source: "TEXT" as const,
  rawText,
  sessionId: "session-1",
  turnId: `turn-${rawText.slice(0, 4)}`,
  utteranceGeneration: 1,
  ...overrides,
});

describe("live conversation runtime adapter", () => {
  it.each([
    ["What does ONYX recommend?", "ONYX"],
    ["Ask ONYX", "ONYX"],
    ["What does NOVA think?", "NOVA"],
    ["Ask NOVA", "NOVA"],
  ] as const)("routes explicit speaker request: %s", (rawText, expected) => {
    expect(selectConversationSpeaker(rawText, "ADVICE_REQUEST").speaker).toBe(expected);
  });

  it("honors manual speaker overrides and preserves a previous speaker for follow-ups", () => {
    expect(selectConversationSpeaker("anything", "REFLECTION", "ONYX")).toMatchObject({ speaker: "ONYX", manualOverrideApplied: true });
    expect(selectConversationSpeaker("anything", "REFLECTION", "NOVA")).toMatchObject({ speaker: "NOVA", manualOverrideApplied: true });
    expect(selectConversationSpeaker("Tell me more", "FOLLOW_UP", undefined, "ONYX")).toMatchObject({ speaker: "ONYX", previousSpeakerPreserved: true });
  });

  it("keeps Council eligible instead of silently selecting NOVA", () => {
    expect(selectConversationSpeaker("What do both of you recommend?", "COUNCIL_REQUEST")).toMatchObject({ speaker: "COUNCIL", selectionReason: "COUNCIL_ELIGIBILITY" });
  });

  it("preserves the selected ONYX speaker when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "rate_limit" } }), { status: 429 })));
    const result = await createConversationRuntimeAdapter()(input("What does ONYX recommend?", { requestedSpeaker: "ONYX" }));
    expect(result.speaker).toBe("ONYX");
    expect(result.generationMode).toBe("DETERMINISTIC_FALLBACK");
    expect(result.providerRequestSucceeded).toBe(false);
    expect(result.fallbackReason).toBe("MODEL_PROVIDER_UNAVAILABLE");
    vi.unstubAllGlobals();
  });

  it("projects only safe Workspace provider facts", () => {
    const projection = buildWorkspaceConversationProjection({
      activeProvider: "microsoft",
      updatedAt: 123,
      providers: [{ provider: "microsoft", label: "Microsoft Workspace", state: "connected", diagnostic: "connected", capabilities: [{ id: "profile", label: "Profile", enabled: true }] }],
    });
    expect(projection).toEqual({ providerFacts: ["Microsoft Workspace: connected."], sourceReferences: ["WORKSPACE_SNAPSHOT"], freshness: "CURRENT" });
  });

  it("sends distinct bounded typed utterances to the model", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(String(init.body));
      return new Response(JSON.stringify({ requestId: "turn-I ha", adapterId: "openai-conversation-server", modelReferenceSafe: "configured", text: "A response.", language: "ENGLISH", finishReason: "STOP", generationReceiptVersion: "B5F-1" }), { status: 200 });
    }));
    const adapter = createConversationRuntimeAdapter();
    await adapter(input("I have had a difficult day today."));
    await adapter(input("Explain black holes simply.", { turnId: "turn-Expl", utteranceGeneration: 2 }));
    const first = JSON.parse(requests[0] ?? "{}");
    const second = JSON.parse(requests[1] ?? "{}");
    expect(first.userText).toBe("I have had a difficult day today.");
    expect(second.userText).toBe("Explain black holes simply.");
    expect(requests[0]).not.toBe(requests[1]);
    expect(requests[0]).not.toContain("sk-");
    vi.unstubAllGlobals();
  });

  it("uses the same bounded userText field for finalized voice transcripts", async () => {
    let requestBody = "";
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      requestBody = String(init.body);
      return new Response(JSON.stringify({ requestId: "voice", adapterId: "openai-conversation-server", modelReferenceSafe: "configured", text: "A response.", language: "ENGLISH", finishReason: "STOP", generationReceiptVersion: "B5F-1" }), { status: 200 });
    }));
    await createConversationRuntimeAdapter()(input("Voice transcript here.", { source: "VOICE", turnId: "voice", utteranceGeneration: 1 }));
    expect(JSON.parse(requestBody).userText).toBe("Voice transcript here.");
    vi.unstubAllGlobals();
  });

  it("does not send empty userText and deterministically bounds oversized text", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(String(init.body));
      return new Response(JSON.stringify({ requestId: "turn-xxxx", adapterId: "openai-conversation-server", modelReferenceSafe: "configured", text: "A response.", language: "ENGLISH", finishReason: "STOP", generationReceiptVersion: "B5F-1" }), { status: 200 });
    }));
    await createConversationRuntimeAdapter()(input("   "));
    await createConversationRuntimeAdapter()(input("x".repeat(2100), { turnId: "turn-xxxx" }));
    expect(requests).toHaveLength(1);
    expect(JSON.parse(requests[0] ?? "{}").userText).toHaveLength(2000);
    vi.unstubAllGlobals();
  });

  it("routes ordinary reflection without a registered-intent failure", async () => {
    const result = await createConversationRuntimeAdapter()(input("I have had a long day."));
    expect(result.purpose).toBe("REFLECTION");
    expect(result.registeredIntentFailureAvoided).toBe(true);
    expect(result.envelopeStatus).toBe("VALID");
    expect(result.characterValidationStatus).toBe("VALID");
    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.text).not.toMatch(/not recognized|not supported|unknown command|registered intent|open an application/i);
    expect(result.executionAuthorized).toBe(false);
  });

  it("plans advice for ONYX without navigation", async () => {
    const result = await createConversationRuntimeAdapter()(input("Help me decide what to focus on tomorrow.", { requestedSpeaker: "ONYX" }));
    expect(result.purpose).toBe("ADVICE_REQUEST");
    expect(result.speaker).toBe("ONYX");
    expect(result.responseMode).toBe("RECOMMENDATION");
    expect(result.actionProposalStatus).toBe("NONE");
    expect(result.text).not.toMatch(/not recognized|not supported|unknown command/i);
  });

  it("keeps correction and Council non-authorizing", async () => {
    const adapter = createConversationRuntimeAdapter();
    const correction = await adapter(input("No, I meant Microsoft, not Google."));
    const council = await adapter(input("What do both of you recommend?", { turnId: "council", utteranceGeneration: 2 }));
    expect(correction.purpose).toBe("CORRECTION");
    expect(council.purpose).toBe("COUNCIL_REQUEST");
    expect(council.speaker).toBe("COUNCIL");
    expect(council.executionAuthorized).toBe(false);
    expect(council.text.trim().length).toBeGreaterThan(0);
  });

  it("creates a governed action proposal without executing it", async () => {
    const result = await createConversationRuntimeAdapter()(input("Delete duplicate files."));
    expect(result.purpose).toBe("ACTION_REQUEST");
    expect(result.actionProposalStatus).toBe("CLARIFICATION_REQUIRED");
    expect(result.executionAuthorized).toBe(false);
  });

  it("keeps voice and text semantic outcomes equivalent", async () => {
    const adapter = createConversationRuntimeAdapter();
    const text = await adapter(input("Imagine a calmer Operations Center."));
    const voice = await adapter(input("Imagine a calmer Operations Center.", { source: "VOICE", turnId: "voice", utteranceGeneration: 2 }));
    expect(voice.purpose).toBe(text.purpose);
    expect(voice.speaker).toBe(text.speaker);
    expect(voice.truthPolicy).toBe(text.truthPolicy);
    expect(voice.executionAuthorized).toBe(text.executionAuthorized);
  });

  it("propagates detected language to the model request without hard-coding English", async () => {
    let requestBody = "";
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      requestBody = String(init.body);
      return new Response(JSON.stringify({ requestId: "hindi", adapterId: "openai-conversation-server", modelReferenceSafe: "configured", text: "A response.", language: "HINDI", finishReason: "STOP", generationReceiptVersion: "B5F-1" }), { status: 200 });
    }));
    await createConversationRuntimeAdapter()(input("Hindi mein baat karo.", { turnId: "hindi", utteranceGeneration: 1 }));
    expect(JSON.parse(requestBody).language).toBe("HINDI");
    vi.unstubAllGlobals();
  });
});
