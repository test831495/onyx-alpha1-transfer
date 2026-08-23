import { describe, expect, it } from "vitest";
import {
  formatTechnicalIdentifier,
  getCapabilityDisplayName,
  getCheckpointDisplayName,
  getGenericReferenceLabel,
  getLaneStageDisplayName,
  getScopeDisplayName,
  getSourceDisplayName,
  getWorkflowStateDisplayName,
} from "./presentationLabels";

describe("presentation labels", () => {
  it("friendly labels match the user-facing requirement", () => {
    expect(getSourceDisplayName("E5_DASHBOARD_SERVICE")).toBe("Automation Center");
    expect(getWorkflowStateDisplayName("RUNNING_BRANCH_STEP")).toBe("Creating Work Branch");
    expect(getCapabilityDisplayName("CREATE_ISOLATED_BRANCH")).toBe("Create a Safe Work Branch");
    expect(getLaneStageDisplayName("S0_SINGLE")).toBe("Single-Task Safety Mode");
    expect(getWorkflowStateDisplayName("DETERMINISTIC_SUCCESS")).toBe("Validated Successfully");
    expect(getWorkflowStateDisplayName("NOT_APPLICABLE")).toBe("Not Required");
  });

  it("unknown enum values format safely and keep canonical values separate", () => {
    expect(getCapabilityDisplayName("UNKNOWN_CUSTOM_STATE")).toBe("Unknown Custom State");
    expect(formatTechnicalIdentifier("UNKNOWN_CUSTOM_STATE")).toBe("UNKNOWN_CUSTOM_STATE");
  });

  it("reference labels render friendly text while preserving technical identifiers in details", () => {
    expect(getCheckpointDisplayName("p17-fixture-checkpoint-2")).toBe("Checkpoint 2");
    expect(getScopeDisplayName("p17-fixture-scope-hash")).toBe("Validated Work Scope");
    expect(getGenericReferenceLabel("wf-p17-fixture-0000000000000000")).toBe("Current Governed Workflow");
    expect(getGenericReferenceLabel("p16rt-fixture-default")).toBe("Current Runtime");
    expect(getGenericReferenceLabel("p16sess-fixture-default")).toBe("Current Runtime Session");
  });
});
