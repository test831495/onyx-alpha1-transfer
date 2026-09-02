import { describe, expect, it } from "vitest";
import {
  ACCEPTANCE_REGISTRY,
  EVIDENCE_GRAPH,
  LANE_MANIFESTS,
  TRAIN_MANIFEST,
  validateAcceptanceRegistry,
  validateEvidenceGraph,
  validateLaneManifests,
  validateTrainManifest,
} from "../src/index.js";

describe("visible presence Wave 1 assurance", () => {
  it("validates the locked train and exactly five provisioned lanes", () => {
    expect(validateTrainManifest(TRAIN_MANIFEST)).toEqual([]);
    expect(LANE_MANIFESTS).toHaveLength(5);
    expect(validateLaneManifests(LANE_MANIFESTS)).toEqual([]);
  });

  it("validates 190 justified acceptance records and evidence graph", () => {
    expect(ACCEPTANCE_REGISTRY).toHaveLength(190);
    expect(validateAcceptanceRegistry(ACCEPTANCE_REGISTRY)).toEqual([]);
    expect(validateEvidenceGraph(EVIDENCE_GRAPH)).toEqual([]);
  });
});