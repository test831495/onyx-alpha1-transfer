import { describe, expect, it } from "vitest";
import {
  canModeRestorationReviveReadiness,
  createReadinessAuthorizationStatement,
  createReadinessScopeHash,
  determineAssessmentFreshness,
  determineReadinessExpiration,
  getReadinessExpirationHours,
  isReadinessScopeValid,
  isReadinessValid,
  listReadinessInvalidationTriggers,
} from "../src/index.js";
import { changeInvalidatesReadiness } from "../src/idea-versioning.js";
import { FIXTURES } from "../src/fixtures.js";

describe("Idea readiness policy", () => {
  it("material_changes_invalidate_readiness", () => {
    expect(changeInvalidatesReadiness("users")).toBe(true);
  });

  it("readiness_expires", () => {
    const freshness = determineReadinessExpiration(
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-20T00:00:00.000Z"),
      "moderate",
    );
    expect(freshness.freshness).toBe("INVALIDATED");
  });

  it("readiness_does_not_authorize_execution", () => {
    const statement = createReadinessAuthorizationStatement();
    expect(statement).toContain("does not authorize");
    expect(statement).toContain("deployment");
  });

  it("readiness_short_lived", () => {
    expect(getReadinessExpirationHours("low")).toBe(336);
    expect(getReadinessExpirationHours("moderate")).toBe(168);
    expect(getReadinessExpirationHours("high")).toBe(72);
  });

  it("stale_readiness_denies", () => {
    const readiness = FIXTURES.readiness();
    const valid = isReadinessValid(readiness, {
      ideaIdMatches: true,
      ideaVersionMatches: true,
      preflightValid: true,
      repositoryCommitMatches: true,
      branchMatches: true,
      phaseStable: true,
      architectureVersionCompatible: true,
      policyVersionCompatible: true,
      dependenciesStable: true,
      securityStatusClean: true,
      acceptanceRequirementsStable: true,
      validUntilNotReached: false,
      noMaterialChangesSinceReadiness: true,
      ownerAuthorityHeld: true,
    });
    expect(valid).toBe(false);
  });

  it("material_change_invalidates", () => {
    expect(changeInvalidatesReadiness("permissions")).toBe(true);
  });

  it("security_finding_invalidates", () => {
    const freshness = determineAssessmentFreshness(
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-02T00:00:00.000Z"),
      "high",
      false,
      true,
    );
    expect(freshness.freshness).toBe("INVALIDATED");
  });

  it("mode_restoration_cannot_revive", () => {
    expect(canModeRestorationReviveReadiness("STALE")).toBe(false);
    expect(canModeRestorationReviveReadiness("INVALIDATED")).toBe(false);
  });

  it("readiness_advisory_only", () => {
    expect(createReadinessAuthorizationStatement()).toContain("advisory");
  });

  it("scope_hash_validation", () => {
    const readiness = FIXTURES.readiness();
    const hash = createReadinessScopeHash(
      readiness.ideaId,
      readiness.ideaVersion,
      readiness.repositoryCommit,
      readiness.branch,
      readiness.phaseWave,
      readiness.policyVersion,
    );
    const candidate = {
      ...readiness,
      canonicalScopeHash: hash,
    };
    expect(
      isReadinessScopeValid(
        candidate,
        readiness.ideaId,
        readiness.ideaVersion,
        readiness.repositoryCommit,
        readiness.branch,
        readiness.phaseWave,
        readiness.policyVersion,
      ),
    ).toBe(true);
  });

  it("invalidation_triggers", () => {
    const triggers = listReadinessInvalidationTriggers();
    expect(triggers).toContain("material_change");
    expect(triggers).toContain("security_finding");
  });
});
