import { describe, expect, it } from "vitest";
import * as packageExports from "../src/index.js";

describe("Idea package export surface", () => {
  it("exports_model_contracts", () => {
    expect(packageExports.createIdeaId).toBeTypeOf("function");
    expect(packageExports.IdeaDisposition).toBeDefined();
    expect(packageExports.IdeaLifecycleState).toBeDefined();
    expect(packageExports.IdeaFreshness).toBeDefined();
    expect(packageExports.IdeaDeletionState).toBeDefined();
  });

  it("exports_disposition_lifecycle_and_freshness_modules", () => {
    expect(packageExports.getDispositionDetail).toBeTypeOf("function");
    expect(packageExports.isTransitionAllowed).toBeTypeOf("function");
    expect(packageExports.determineAssessmentFreshness).toBeTypeOf("function");
  });

  it("exports_assessment_preflight_readiness_and_deletion_modules", () => {
    expect(packageExports.isValidAssessment).toBeTypeOf("function");
    expect(packageExports.determinePreflightResult).toBeTypeOf("function");
    expect(packageExports.isReadinessValid).toBeTypeOf("function");
    expect(packageExports.canPermanentlyDelete).toBeTypeOf("function");
  });

  it("exports_audit_acceptance_labels_and_authorization_modules", () => {
    expect(packageExports.auditAvailabilityRequired).toBeTypeOf("function");
    expect(packageExports.getAcceptanceEntry).toBeTypeOf("function");
    expect(packageExports.getLifecycleLabel).toBeTypeOf("function");
    expect(packageExports.evaluateIdeaAuthorization).toBeTypeOf("function");
  });

  it("exports_acceptance_validator_contracts", () => {
    expect(packageExports.validateIdeaAcceptanceRegistry).toBeTypeOf("function");
    expect(packageExports.IDEA_ACCEPTANCE_TEST_MANIFEST).toBeDefined();
  });
});
