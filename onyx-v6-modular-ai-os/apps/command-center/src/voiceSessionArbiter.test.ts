import { describe, expect, it } from "vitest";
import { VoiceSessionArbiter, TtsSttHandoffGate } from "./voiceSessionArbiter";

describe("VoiceSessionArbiter", () => {
  it("routes explicit orbital listen and push-to-talk through one pending owner", () => {
    const arbiter = new VoiceSessionArbiter();

    const orbital = arbiter.requestStart("ORBITAL_LISTEN", "nova");
    const duplicate = arbiter.requestStart("PUSH_TO_TALK", "nova");

    expect(orbital.shouldStartRecognition).toBe(true);
    expect(duplicate.shouldStartRecognition).toBe(false);
    expect(duplicate.generation).toBe(orbital.generation);
    expect(arbiter.snapshot()).toMatchObject({ mode: "ORBITAL_LISTEN", pendingStart: true });
  });

  it("keeps wake-word standby as readiness without starting a recognizer", () => {
    const arbiter = new VoiceSessionArbiter();
    const wake = arbiter.enterWakeWordStandby("onyx");

    expect(wake.shouldStartRecognition).toBe(false);
    expect(arbiter.snapshot()).toMatchObject({ mode: "WAKE_WORD_STANDBY", terminal: true, recognitionInstanceId: null });
  });

  it("does not allow wake-word standby to enter through the recognition start path", () => {
    const arbiter = new VoiceSessionArbiter();

    const decision = arbiter.requestStart("WAKE_WORD_STANDBY" as never, "nova");

    expect(decision.shouldStartRecognition).toBe(false);
    expect(arbiter.snapshot()).toMatchObject({ mode: "WAKE_WORD_STANDBY", terminal: true, recognitionInstanceId: null });
  });

  it("lets explicit orbital listen preempt wake-word readiness", () => {
    const arbiter = new VoiceSessionArbiter();
    arbiter.enterWakeWordStandby("onyx");

    const orbital = arbiter.requestStart("ORBITAL_LISTEN", "onyx");

    expect(orbital.shouldStartRecognition).toBe(true);
    expect(arbiter.snapshot()).toMatchObject({ mode: "ORBITAL_LISTEN", generation: orbital.generation });
  });

  it("keeps unexpected aborted errors visible and recovers to idle", () => {
    const arbiter = new VoiceSessionArbiter();
    const turn = arbiter.requestStart("PUSH_TO_TALK", "nova");
    arbiter.markRecognitionStarted(turn.generation, "recognition-1");

    const abort = arbiter.classifyRecognitionError(turn.generation, "aborted");

    expect(abort).toEqual({ expected: false, userMessage: "VOICE_ABORT_UNEXPECTED", reason: "UNEXPECTED_ABORT" });
    expect(arbiter.snapshot()).toMatchObject({ mode: "IDLE", terminal: true });
  });

  it("prevents an old-generation abort from terminating a newer explicit session", () => {
    const arbiter = new VoiceSessionArbiter();
    const first = arbiter.requestStart("FOLLOW_UP_LISTENING", "nova");
    arbiter.markRecognitionStarted(first.generation, "recognition-1");
    const second = arbiter.requestStart("ORBITAL_LISTEN", "nova");

    const staleAbort = arbiter.classifyRecognitionError(first.generation, "aborted");

    expect(staleAbort).toEqual({ expected: true, userMessage: null, reason: "STALE_GENERATION" });
    expect(arbiter.snapshot()).toMatchObject({ mode: "ORBITAL_LISTEN", generation: second.generation });
  });

  it("keeps idle cancellation terminal and does not create pending abort state", () => {
    const arbiter = new VoiceSessionArbiter();

    const generation = arbiter.cancel("USER_CANCEL");
    const ended = arbiter.markRecognitionEnded(generation);

    expect(ended).toBe(true);
    expect(arbiter.snapshot()).toMatchObject({ mode: "IDLE", terminal: true, cancellationReason: null });
  });
});

describe("TtsSttHandoffGate", () => {
  it("opens follow-up only after speech and the previous recognizer are terminal", () => {
    const gate = new TtsSttHandoffGate();

    gate.expectPreviousRecognitionEnd(3);
    gate.markSpeechComplete();
    expect(gate.canStartFollowUp()).toBe(false);

    gate.markRecognitionTerminal(2);
    expect(gate.canStartFollowUp()).toBe(false);

    gate.markRecognitionTerminal(3);
    expect(gate.canStartFollowUp()).toBe(true);
  });
});