import { describe, expect, it } from "vitest";
import { describeVoiceRuntimeTruth } from "./components/SettingsCenter";
import { describeVoiceSupervisorStatus } from "./voiceRecognitionSupervisor";

describe("settings voice runtime truth", () => {
  it("describes auto listen as bounded follow-up instead of background capture", () => {
    expect(describeVoiceRuntimeTruth({ pushToTalk: false, autoListen: true, wakeWords: false })).toContain(
      "bounded follow-up",
    );
  });

  it("does not claim wake-word listener activity when no governed runtime listener is active", () => {
    expect(describeVoiceRuntimeTruth({ pushToTalk: false, autoListen: true, wakeWords: true })).toBe(
      "Auto Listen is saved for bounded follow-up after eligible replies. Wake-word readiness is saved; no background listener is active.",
    );
  });

  it("does not derive push-to-talk claims from supervisor pause events", () => {
    expect(describeVoiceSupervisorStatus(false, true)).toBe(
      "Voice recognition standby is paused. No background listener is active.",
    );
  });
});