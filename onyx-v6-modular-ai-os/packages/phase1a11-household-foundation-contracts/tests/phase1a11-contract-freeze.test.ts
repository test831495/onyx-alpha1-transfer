import { describe, expect, it } from "vitest";
import {
  accountSwitchRequiresPrivateCleanup,
  buildAcceptanceRegistry,
  canAccessDetailedJourney,
  denyByDefaultPermissionDecision,
  ensureUniqueAcceptanceIds,
  isCharacterSwitchAuthorizationSafe,
  isPrimaryOwnerBound,
  validateHIST016Context,
  validateNoSecretDisplay,
} from "../src/index";

describe("Phase 1A.11 household foundation freeze", () => {
  it("contains exactly one canonical Primary Owner and preserves the owner-only rule", () => {
    expect(isPrimaryOwnerBound("rahul")).toBe(true);
    expect(isPrimaryOwnerBound("other-user")).toBe(false);
  });

  it("denies by default when a permission, policy, or session requirement is missing", () => {
    const decision = denyByDefaultPermissionDecision({
      authenticated: true,
      accountId: "rahul",
      role: "primary_owner",
      permission: undefined,
      policyVersion: "1.0.0",
      sessionAssurance: "current",
      target: "journey-detail",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason.toLowerCase()).toContain("deny");
  });

  it("rejects stale policy and missing session assurance independently", () => {
    expect(
      denyByDefaultPermissionDecision({
        authenticated: true,
        accountId: "rahul",
        role: "primary_owner",
        permission: "owner_history_read",
        policyVersion: "0.9.0",
        sessionAssurance: "current",
      }).allowed,
    ).toBe(false);

    expect(
      denyByDefaultPermissionDecision({
        authenticated: true,
        accountId: "rahul",
        role: "primary_owner",
        permission: "owner_history_read",
        policyVersion: "1.0.0",
        sessionAssurance: "stale",
      }).allowed,
    ).toBe(false);
  });

  it("does not allow character switching to alter authorization", () => {
    const result = isCharacterSwitchAuthorizationSafe({
      fromAccount: "rahul",
      toAccount: "rahul",
      fromRole: "primary_owner",
      toRole: "primary_owner",
      fromSessionAssurance: "current",
      toSessionAssurance: "current",
      fromPermission: "owner_history_read",
      toPermission: "owner_history_read",
      toCharacter: "NOVA",
    });

    expect(result).toBe(true);
  });

  it("requires account switching cleanup before returning to a previous account", () => {
    const result = accountSwitchRequiresPrivateCleanup({
      previousAccount: "rahul",
      targetAccount: "family-member",
      hasClearedPrivateState: true,
      hasClearedConversationHistory: true,
      hasClearedMemoryContext: true,
      hasClearedConnectorContext: true,
      hasClearedCache: true,
    });

    expect(result).toBe(true);
  });

  it("blocks detailed Project Journey access without Rahul owner authorization", () => {
    const result = canAccessDetailedJourney({
      authenticatedAccountId: "family-user",
      role: "standard_family_member",
      ownerHistoryPermission: false,
      sessionValid: true,
      policyCurrent: true,
      hasExplicitIntent: true,
      targetClassification: "detailed",
      auditAvailable: true,
    });

    expect(result).toBe(false);
  });

  it("requires HIST-016 contextual fields and missing-value behavior", () => {
    const validation = validateHIST016Context({
      participant: "Rahul",
      approver: "Rahul",
      executor: "Rahul",
      evidenceProducer: "not_recorded",
      plannedWork: "Phase 1A.11 contract freeze",
      changedWork: "contract definitions",
      rationale: "governance",
      sourceEventTime: "2026-08-23T00:00:00Z",
      recordingTime: "not_recorded",
      ingestionTime: "not_recorded",
      validation: "not_verified",
      result: "accepted",
      evidenceStatus: "not_verified",
    });

    expect(validation.ok, validation.errors.join("; ")).toBe(true);
  });

  it("rejects HIST-016 records that omit a typed missing-value state or invent evidence", () => {
    const missingStateValidation = validateHIST016Context({
      participant: "Rahul",
      approver: "Rahul",
      executor: "Rahul",
      plannedWork: "",
      changedWork: "contract definitions",
      rationale: "governance",
      sourceEventTime: "2026-08-23T00:00:00Z",
      result: "accepted",
      sourceReference: "token_secret_123",
    });

    expect(missingStateValidation.ok).toBe(false);
    expect(missingStateValidation.errors.some((error) => error.toLowerCase().includes("secret"))).toBe(true);
  });

  it("prohibits secrets from display fields", () => {
    const result = validateNoSecretDisplay({
      label: "Primary Owner",
      technicalInfo: "owner scope redacted",
      secretValue: "token_abc123",
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("secret");
  });

  it("keeps the acceptance registry unique and contract-only for Wave A", () => {
    const registry = buildAcceptanceRegistry();
    const ids = registry.map((entry) => entry.id);
    expect(ensureUniqueAcceptanceIds(ids)).toBe(true);
    expect(ids.length).toBe(78);
    expect(registry.some((entry) => entry.status === "accepted")).toBe(false);
  });
});
