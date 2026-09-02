import { describe, expect, it } from "vitest";
import {
  DRIFT_BASELINE,
  EVIDENCE_GRAPH,
  LANE_HANDOFFS,
  LANE_MANIFESTS,
  SYNTHETIC_FIXTURES,
  TRAIN_MANIFEST,
  validateDrift,
  validateEvidenceGraph,
  validateLaneManifests,
  validateSyntheticFixtures,
  validateTrainManifest,
} from "../src/index.js";

describe("Wave 1 continuation", () => {
  it("contains complete metadata-only synthetic fixture dimensions", () => {
    expect(validateSyntheticFixtures(SYNTHETIC_FIXTURES)).toEqual([]);
    expect(SYNTHETIC_FIXTURES.characters).toEqual(["ONYX", "NOVA"]);
    expect(SYNTHETIC_FIXTURES.semanticStates).toHaveLength(8);
    expect(SYNTHETIC_FIXTURES.privacyStates).toHaveLength(6);
  });

  it("finalizes non-authorizing train, lane, evidence, drift, and handoff artifacts", () => {
    expect(validateTrainManifest(TRAIN_MANIFEST)).toEqual([]);
    expect(validateLaneManifests(LANE_MANIFESTS)).toEqual([]);
    expect(validateEvidenceGraph(EVIDENCE_GRAPH)).toEqual([]);
    expect(DRIFT_BASELINE.categories).toHaveLength(15);
    expect(LANE_HANDOFFS).toHaveLength(5);
  });

  it("blocks invalid drift fixtures without repairing them", () => {
    expect(validateDrift("PRIVACY_DRIFT", false)).toBe("INTEGRATION_BLOCKED");
    expect(validateDrift("UNKNOWN", true)).toBe("INTEGRATION_BLOCKED");
  });
});