import { describe, expect, it } from "vitest";
import { describeVoiceRuntimeTruth } from "./components/SettingsCenter";
import { describeCoordinatorWakeReadinessResume } from "./voiceSessionCoordinator";
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

  it("does not let coordinator resume copy imply an active wake-word listener", () => {
    expect(describeCoordinatorWakeReadinessResume("speech completion")).toBe(
      "Wake-word readiness remains saved after speech completion. No background listener is active.",
    );
  });

  it("keeps exposed runtime messages free of inactive listener-active claims", () => {
    const exposedMessages = [
      describeVoiceRuntimeTruth({ pushToTalk: true, autoListen: false, wakeWords: true }),
      describeVoiceSupervisorStatus(true, true),
      describeVoiceSupervisorStatus(false, true),
      describeCoordinatorWakeReadinessResume("command completion"),
    ].join("\n");

    expect(exposedMessages).not.toMatch(/wake-word listener (active|resumed)|always listening|background listener active/i);
  });
});