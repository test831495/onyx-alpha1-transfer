import { describe, expect, it } from "vitest";
import {
  buildDevicePresenceProjection,
  buildOperationsCenterSnapshot,
  buildWorldTransitionProjection,
  projectAccessibilityForState,
  projectAgentHealth,
  projectAgentPresence,
  projectApprovalPrivacy,
  projectForTenFootTv,
  projectTask,
} from "../src/index";

describe("evidence-safe Operations Center projections", () => {
  it("never projects completion beyond evidence", () => {
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 0.4, freshnessMs: 10 })).toMatchObject({ status: "IN_PROGRESS", progress: 0.4 });
  });
  it("uses UNKNOWN for stale data and privacy overrides", () => {
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 10000 })).toMatchObject({ status: "UNKNOWN" });
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, privacyRestricted: true })).toMatchObject({ status: "PRIVACY_RESTRICTED" });
  });
});

describe("T2-OPERATIONS-CENTER-001 evidence-bound task status", () => {
  it("T2-OPERATIONS-CENTER-001-POS: completes only when evidence supports it", () => {
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 0 })).toMatchObject({ status: "COMPLETE", progress: 1, confidence: "VERIFIED" });
    expect(projectTask({ id: "t", requestedProgress: 0.5, evidenceProgress: 0.9, freshnessMs: 5 })).toMatchObject({ status: "IN_PROGRESS", progress: 0.5 });
  });

  it("T2-OPERATIONS-CENTER-001-NEG: false completion, malformed input, and overrides fail closed", () => {
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 0.99, freshnessMs: 1 }).status).not.toBe("COMPLETE");
    expect(projectTask(null)).toMatchObject({ status: "UNKNOWN", evidenceBacked: false });
    expect(projectTask({ id: "", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1 }).status).toBe("UNKNOWN");
    expect(projectTask({ id: "t", requestedProgress: 2, evidenceProgress: 1, freshnessMs: 1 }).status).toBe("UNKNOWN");
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, approvalRequired: true }).status).toBe("APPROVAL_REQUIRED");
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, failed: true }).status).toBe("FAILED");
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, recovering: true }).status).toBe("RECOVERING");
  });

  it("privacy hides progress entirely rather than dimming it", () => {
    expect(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, privacyRestricted: true }).progress).toBe(0);
  });
});

describe("T2-OPERATIONS-CENTER-002 bounded snapshots", () => {
  it("T2-OPERATIONS-CENTER-002-POS: bounds collections and counts active work", () => {
    const snapshot = buildOperationsCenterSnapshot(
      [
        { id: "a", requestedProgress: 1, evidenceProgress: 0.5, freshnessMs: 1 },
        { id: "b", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1 },
      ],
      { cursor: 3 },
    );
    expect(snapshot).toMatchObject({ cursor: 3, bounded: true, activeCount: 1, summaryOnly: false });
  });

  it("T2-OPERATIONS-CENTER-002-NEG: shared-room mode emits no per-task detail and over-bound input is flagged", () => {
    const shared = buildOperationsCenterSnapshot([{ id: "a", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1 }], { cursor: 1, sharedRoom: true });
    expect(shared.tasks).toEqual([]);
    expect(shared.summaryOnly).toBe(true);

    const many = Array.from({ length: 100 }, (_, index) => ({ id: `t${index}`, requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1 }));
    const bounded = buildOperationsCenterSnapshot(many, { cursor: 1 });
    expect(bounded.bounded).toBe(false);
    expect(bounded.tasks.length).toBeLessThanOrEqual(64);
  });
});

describe("T2-ACCESSIBILITY-001 and T2-TV-001", () => {
  it("T2-ACCESSIBILITY-001-POS: reduced motion yields a static-but-alive class and no authority", () => {
    expect(projectAgentPresence({ agentId: "a", state: "SPEAKING" })).toMatchObject({ animationClass: "LIVELY", grantsAuthority: false });
    expect(projectAgentPresence({ agentId: "a", state: "SPEAKING", reducedMotion: true }).animationClass).toBe("STATIC_ALIVE");
  });

  it("T2-ACCESSIBILITY-001-NEG: unknown states fall back without granting authority", () => {
    expect(projectAgentPresence({ agentId: "a", state: "DANCING" })).toMatchObject({ state: "IDLE", grantsAuthority: false });
    expect(projectAgentPresence(null).grantsAuthority).toBe(false);
    expect(projectAgentHealth(90_000, false).status).toBe("UNKNOWN");
    expect(projectAgentHealth(1, true).status).toBe("DEGRADED");
  });

  it("T2-TV-001-POS: TV projection is color independent and safe-zone aware", () => {
    const tv = projectForTenFootTv(projectTask({ id: "t", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1 }));
    expect(tv).toMatchObject({ safeZone: true, colorIndependentLabel: "COMPLETE" });
    expect(tv.minimumScale).toBeGreaterThan(1);
  });
});

describe("T2-ACCESSIBILITY-004 device and world projection binding", () => {
  const targets = ["root", "panel"] as const;

  it("T2-ACCESSIBILITY-004-POS: screen-reader projection exists for all eight semantic states", () => {
    for (const state of ["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"] as const) {
      const a = projectAccessibilityForState({ character: "ONYX", state, deviceClass: "desktop", targets, sourceVersion: 1, freshnessMs: 1 });
      expect(a.screenReaderLabel.length).toBeGreaterThan(0);
      expect(a.colorIndependentStateLabel).toBe(state);
      expect(a.keyboardFocusOrder.length).toBeGreaterThan(0);
      expect(a.focusVisible).toBe(true);
    }
  });

  it("T2-ACCESSIBILITY-004-POS: TV projection uses remote focus, safe zone, and 10-foot scale", () => {
    const tv = projectAccessibilityForState({ character: "NOVA", state: "SPEAKING", deviceClass: "tv", targets, sourceVersion: 1, freshnessMs: 1 });
    expect(tv.readabilityClass).toBe("TEN_FOOT");
    expect(tv.tvSafeZone).toBe(true);
    expect(tv.minimumScale).toBeGreaterThanOrEqual(1.5);
    expect(tv.remoteFocusOrder.length).toBeGreaterThan(0);
  });

  it("T2-ACCESSIBILITY-004-NEG: device projection binds accessibility and caption references without authority", () => {
    const device = buildDevicePresenceProjection({
      deviceId: "tv-1",
      deviceClass: "tv",
      character: "ONYX",
      state: "SPEAKING",
      avatarId: "v1",
      avatarVersion: 2,
      targets,
      sourceVersion: 1,
      freshnessMs: 1,
      utteranceId: "u1",
    });
    expect(device.avatarId).toBe("v1");
    expect(device.avatarVersion).toBe(2);
    expect(device.accessibility.screenReaderLabel.length).toBeGreaterThan(0);
    expect(device.captionRef).toBe("u1");
    expect(device.grantsAuthority).toBe(false);
    expect(Object.isFrozen(device)).toBe(true);
  });

  it("world transition falls back deterministically under reduced motion", () => {
    const normal = buildWorldTransitionProjection({ from: "OPERATIONS_CENTER", to: "FUTURE_CITY", progress: 0.5, reducedMotion: false });
    expect(normal).toMatchObject({ phase: "IN_PROGRESS", from: "OPERATIONS_CENTER", to: "FUTURE_CITY" });
    const reduced = buildWorldTransitionProjection({ from: "OPERATIONS_CENTER", to: "FUTURE_CITY", progress: 0.5, reducedMotion: true });
    expect(reduced.phase).toBe("INSTANT_FALLBACK");
    expect(reduced.progress).toBe(1);
    expect(buildWorldTransitionProjection({ from: "OPERATIONS_CENTER", to: "MARS" as never, progress: 0.5, reducedMotion: false }).phase).toBe("UNKNOWN");
  });

  it("approval and privacy override precedence is explicit", () => {
    expect(projectApprovalPrivacy({ approvalRequired: true, privacyRestricted: true }).effective).toBe("PRIVACY_RESTRICTED");
    expect(projectApprovalPrivacy({ approvalRequired: true, privacyRestricted: false }).effective).toBe("APPROVAL_REQUIRED");
    expect(projectApprovalPrivacy({ approvalRequired: false, privacyRestricted: false }).effective).toBe("NONE");
    expect(projectApprovalPrivacy({ approvalRequired: true, privacyRestricted: true }).grantsAuthority).toBe(false);
  });

  it("shared-room device projection redacts private description", () => {
    const shared = buildDevicePresenceProjection({
      deviceId: "tv-1",
      deviceClass: "tv",
      character: "ONYX",
      state: "PRIVACY_RESTRICTED",
      avatarId: "v1",
      avatarVersion: 1,
      targets,
      sourceVersion: 1,
      freshnessMs: 1,
      sharedRoom: true,
    });
    expect(shared.accessibility.sharedRoomPrivacyMode).toBe(true);
    expect(shared.accessibility.screenReaderDescription).toBe("");
    expect(shared.accessibility.colorIndependentStateLabel).toBe("PRIVACY_RESTRICTED");
  });
});