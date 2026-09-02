import { describe, expect, it } from "vitest";
import { ACCEPTANCE_REGISTRY, EVIDENCE_GRAPH, LANE_MANIFESTS, SYNTHETIC_FIXTURES, TRAIN_MANIFEST } from "../src/index.js";
import { buildAssuranceValidationResult } from "../scripts/generate-evidence.js";

describe("assurance evidence generator", () => {
  it("derives failed validation evidence from the complete validation error collection", () => {
    const result = buildAssuranceValidationResult({
      acceptanceMappings: ACCEPTANCE_REGISTRY,
      trainManifest: { ...TRAIN_MANIFEST, sharedContractCount: 34 } as unknown as typeof TRAIN_MANIFEST,
      laneManifests: LANE_MANIFESTS,
      syntheticFixtures: SYNTHETIC_FIXTURES,
      evidenceGraph: EVIDENCE_GRAPH,
    });
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.result).toBe("FAIL");
    expect(result.exitCode).not.toBe(0);
    expect(result.summary).toContain("FAIL");
  });

  it("keeps successful validation payload, summary, and exit code aligned", () => {
    const result = buildAssuranceValidationResult();
    expect(result).toMatchObject({ result: "PASS", exitCode: 0, validationErrors: [] });
    expect(result.summary).toBe("PASS: 0 validation errors");
  });
});