import { describe, expect, it } from "vitest";
import {
  ACCEPTANCE_FAMILIES,
  ACCEPTANCE_REGISTRY,
  runCinematicSlice,
  runMultiDeviceRehearsal,
  validateAcceptanceRegistry,
} from "../src/index";

describe("CINEMATIC_UNIVERSAL_PRESENCE_SLICE_2", () => {
  it("covers all states and device projections without authority", () => {
    const result = runCinematicSlice();
    expect(result.states).toHaveLength(8);
    expect(result.devices).toEqual(["DESKTOP", "TV", "MOBILE_OR_TABLET_SIMULATION"]);
    expect(result.noAuthorityEscalation).toBe(true);
    expect(result.flags).toBe("OFF");
  });
});

describe("T2-INTEGRATION-001 multi-device rehearsal", () => {
  const rehearsal = runMultiDeviceRehearsal();

  it("T2-INTEGRATION-001-POS: every rehearsal scenario passes across three adapters", () => {
    expect(rehearsal.devices).toEqual(["DESKTOP", "TV", "MOBILE_OR_TABLET_SIMULATION"]);
    expect(rehearsal.scenarios.length).toBeGreaterThanOrEqual(31);
    const failed = rehearsal.scenarios.filter((scenario) => !scenario.passed).map((scenario) => scenario.name);
    expect(failed).toEqual([]);
    expect(rehearsal.passed).toBe(true);
  });

  it("T2-INTEGRATION-001-NEG: rehearsal escalates no authority and stays deterministic", () => {
    expect(rehearsal.authorityEscalations).toBe(0);
    expect(runMultiDeviceRehearsal()).toEqual(rehearsal);
    for (const required of [
      "offline_snapshot_restore",
      "reconnect_reconciliation",
      "revoked_avatar_version",
      "account_switch_cleanup",
      "privacy_restricted_override",
      "approval_required_override",
      "performance_tier_transition",
      "no_authority_escalation",
      "caption_timing_on_speaking",
      "screen_reader_projection_all_states",
      "desktop_keyboard_focus_path",
      "tv_remote_focus_path",
      "tv_safe_zone_and_ten_foot",
      "mobile_tablet_focus_projection",
      "reduced_motion_hard_ceiling",
      "shared_room_privacy_redaction",
      "approval_required_focus_override",
      "privacy_restricted_focus_override",
      "world_transition_reduced_motion_fallback",
      "color_independent_state_labels",
      "device_projection_accessibility_binding",
      "device_projection_caption_binding",
      "shared_contract_surface_complete",
    ]) {
      expect(rehearsal.scenarios.some((scenario) => scenario.name === required)).toBe(true);
    }
  });
});

describe("corrected accessibility coverage in the cinematic slice", () => {
  const slice = runCinematicSlice();

  it("covers screen reader, captions, focus paths, TV metadata, and redaction", () => {
    expect(slice.accessibility.screenReaderStatesCovered).toBe(8);
    expect(slice.accessibility.captionTimingValid).toBe(true);
    expect(slice.accessibility.keyboardFocusPath).toBeGreaterThan(0);
    expect(slice.accessibility.remoteFocusPath).toBeGreaterThan(0);
    expect(slice.accessibility.tvSafeZone).toBe(true);
    expect(slice.accessibility.tenFootScale).toBeGreaterThanOrEqual(1.5);
    expect(slice.accessibility.reducedMotionCeiling).toBe(true);
    expect(slice.accessibility.sharedRoomRedacted).toBe(true);
    expect(slice.accessibility.colorIndependentLabels).toBe(true);
    expect(slice.accessibility.worldTransitionReducedMotionFallback).toBe(true);
    expect(slice.sharedContractNames).toBe(40);
  });
});

describe("T2-CINEMATIC-SLICE-001 composition", () => {
  const slice = runCinematicSlice();

  it("T2-CINEMATIC-SLICE-001-POS: composes worlds, characters, tiers, and governed assets", () => {
    expect(slice.worlds).toEqual(["OPERATIONS_CENTER", "FUTURE_CITY"]);
    expect(slice.characters).toEqual(["ONYX", "NOVA"]);
    expect(slice.rehearsalPassed).toBe(true);
    expect(slice.assetGovernance).toBe("RUNTIME_CANDIDATE");
    expect(slice.tierPath).toEqual(["PREMIUM_CINEMATIC", "LIGHTWEIGHT", "STATIC_ALIVE_FALLBACK"]);
  });

  it("T2-CINEMATIC-SLICE-001-NEG: no dead UI, no activation, and evidence-backed completion only", () => {
    expect(slice.offlineDeadUi).toBe(false);
    expect(slice.evidenceBackedCompletionOnly).toBe(true);
    expect(slice.runtimeActivation).toBe("NONE");
    expect(slice.flags).toBe("OFF");
    expect(runCinematicSlice()).toEqual(slice);
  });
});

describe("continuous ASSURE acceptance registry", () => {
  it("covers every family with paired positive and negative bindings", () => {
    const validation = validateAcceptanceRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.familiesCovered).toBe(ACCEPTANCE_FAMILIES.length);
    expect(validation.total).toBe(ACCEPTANCE_REGISTRY.length);
  });

  it("has no untested or unowned accepted row", () => {
    for (const entry of ACCEPTANCE_REGISTRY) {
      expect(entry.status).toBe("ACCEPTED");
      expect(entry.blockerDisposition).toBe("NONE");
      expect(entry.positiveTestId).toBe(`${entry.id}-POS`);
      expect(entry.negativeTestId).toBe(`${entry.id}-NEG`);
      expect(entry.implementationBinding.length).toBeGreaterThan(0);
    }
  });
});