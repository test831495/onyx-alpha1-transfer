import { describe, expect, it } from "vitest";
import { createSyntheticModelAdapter, FIXTURES, INPUT_BOUNDARY, orchestratePresence, PRESENCE_RUNTIME_FLAG } from "../src/index";

describe("ONYX-only bounded orchestration", () => {
  it("PPT-030 ONYX role", () => {
    expect(orchestratePresence(FIXTURES.orchestrationInput)).toMatchObject({ mode: "ONYX_ONLY", role: "ONYX", authorizing: false });
    // The non-restricted path is only exercised when the fixture states trusted privacy explicitly.
    expect(FIXTURES.orchestrationInput.privacy).toMatchObject({ disposition: "PRIVATE" });
    const trusted = orchestratePresence(FIXTURES.orchestrationInput);
    expect(trusted.privacyProjection.mode).toBe("TRUSTED_PRIVATE");
    expect(trusted).toMatchObject({ modelResponses: 1, memoryProjections: 1, toolCalls: 1, responseSuppressed: false, speechSuppressed: false });
    expect(orchestratePresence(FIXTURES.sharedRoomOrchestrationInput).privacyProjection.mode).toBe("SHARED_ROOM_REDACTED");
    expect(orchestratePresence(FIXTURES.restrictedOrchestrationInput)).toMatchObject({ modelResponses: 0, memoryProjections: 0, toolCalls: 0, responseSuppressed: true });
  });

  it("PPT-031 NOVA inactive", () => {
    expect(orchestratePresence(FIXTURES.orchestrationInput).novaRuntime).toBe(false);
  });

  it("PPT-032 Rahul sole authority", () => {
    expect(orchestratePresence(FIXTURES.orchestrationInput)).toMatchObject({ owner: "rahul-kumar", approval: "NOT_INFERRED" });
  });

  it("PPT-033 model adapter deterministic", () => {
    const adapter = createSyntheticModelAdapter("Project status is locally assessable.");
    expect(adapter.respond(FIXTURES.modelRequest)).toEqual(adapter.respond(FIXTURES.modelRequest));
    expect(adapter.respond(FIXTURES.modelRequest).usage.outputCharacters).toBeLessThanOrEqual(80);
  });

  it("PPT-034 model cancellation", () => {
    expect(createSyntheticModelAdapter("response").respond({ ...FIXTURES.modelRequest, cancelled: true })).toMatchObject({ status: "CANCELLED", text: null });
  });

  it("PPT-035 no model/tool authorization", () => {
    const result = orchestratePresence(FIXTURES.orchestrationInput);
    expect(result.authorizing).toBe(false);
    expect(result.toolProjection?.authorizing).toBe(false);
    const unavailable = orchestratePresence({ ...FIXTURES.orchestrationInput, tool: { projectId: "onyx", cancelled: false, available: false } });
    expect(unavailable.toolProjection?.status).toBe("NOT_ASSESSABLE");
    expect(unavailable.model).toMatchObject({ status: "NOT_ASSESSABLE", text: null });
    expect(unavailable.modelResponses).toBe(0);
    expect(unavailable.responseSuppressed).toBe(true);
  });

  it("PPT-036 no network/provider dependency", () => {
    expect(createSyntheticModelAdapter("response")).toMatchObject({ provider: "SYNTHETIC_LOCAL", networkAccess: false });
  });

  it("PPT-037 no credentials/secrets", () => {
    expect(JSON.stringify(orchestratePresence(FIXTURES.orchestrationInput))).not.toMatch(/credential|accessToken|apiKey|password/i);
    const cancelled = orchestratePresence({ ...FIXTURES.orchestrationInput, request: { ...FIXTURES.modelRequest, cancelled: true }, tool: { projectId: "onyx", cancelled: false, available: true } });
    expect(cancelled).toMatchObject({ modelResponses: 0, toolCalls: 0, memoryProjections: 0, responseSuppressed: true, presentationSuppressed: true, speechSuppressed: true });
    expect(cancelled.model.text).toBeNull();
    expect(cancelled.toolProjection).toBeNull();
  });

  it("PPT-038 text input baseline", () => {
    expect(INPUT_BOUNDARY.baseline).toBe("TEXT_INPUT_REQUIRED");
  });

  it("PPT-039 synthetic push-to-talk contract only", () => {
    expect(INPUT_BOUNDARY.pushToTalk).toMatchObject({ mode: "PUSH_TO_TALK_SYNTHETIC_ONLY", transcriptFixtureOnly: true, microphoneCapture: false, rawAudioRetention: false });
    expect(PRESENCE_RUNTIME_FLAG.state).toBe("OFF");
  });
});