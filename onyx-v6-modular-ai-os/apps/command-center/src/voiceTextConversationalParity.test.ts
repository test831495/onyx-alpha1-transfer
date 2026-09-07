import { describe, expect, it } from "vitest";
import { parseVoice, FinalRecognitionGuard } from "./useVoiceRouter";
import { parseConversationalRequest } from "./conversationIntentGrammar";
import { buildConversationPlan } from "./conversationPlan";

/**
 * Proves, using the real production functions (no reimplementation, no mocked
 * grammar/plan), that a final browser voice transcript produces the same
 * conversational-intent classification as the equivalent typed text once it
 * reaches the shared dispatch entry point's `parseConversationalRequest` call.
 */
const PHRASES = [
  "What is tomorrow's date?",
  "Open calendar and tell me tomorrow's date.",
  "And what about Monday?",
  "Read my agenda.",
];

describe("voice/text conversational dispatch parity", () => {
  for (const raw of PHRASES) {
    it(`classifies "${raw}" identically for text and final voice input`, () => {
      // Text path: GlassCommandBar -> dispatch(command) -> runConversationalPlan(clean).
      const textEnvelope = parseConversationalRequest(raw.trim());

      // Voice path: recognition.onresult -> FinalRecognitionGuard -> parseVoice(heard)
      // -> commandRef.current(parsed.command, parsed.mode) -> dispatch (same function).
      const guard = new FinalRecognitionGuard();
      expect(guard.shouldProcess(true, true)).toBe(true);
      const parsed = parseVoice(raw);
      const voiceEnvelope = parseConversationalRequest(parsed.command || raw);

      expect(parsed.mode).toBeNull();
      expect(voiceEnvelope).toEqual(textEnvelope);

      const nonPlanKinds = ["CALENDAR_LOCAL_FACT", "CALENDAR_PROVIDER_LIMITATION", "CANCEL"];
      if (!nonPlanKinds.includes(textEnvelope.kind)) {
        const textPlan = buildConversationPlan("parity-plan", textEnvelope);
        const voicePlan = buildConversationPlan("parity-plan", voiceEnvelope);
        expect(Boolean(voicePlan)).toBe(Boolean(textPlan));
      }
    });
  }

  it("the assistant mode argument voice adds is never consumed by the conversational grammar", () => {
    // parseVoice extracts a wake word into `mode` and strips it from `command`; the grammar only
    // ever sees `command`, so classification must be identical whether or not a mode was matched.
    const withMode = parseVoice("hey onyx what is tomorrow's date");
    const withoutMode = parseVoice("what is tomorrow's date");

    expect(withMode.mode).toBe("onyx");
    expect(withoutMode.mode).toBeNull();
    expect(parseConversationalRequest(withMode.command)).toEqual(parseConversationalRequest(withoutMode.command));
  });
});
