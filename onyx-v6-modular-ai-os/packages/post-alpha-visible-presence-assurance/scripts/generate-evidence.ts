import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ACCEPTANCE_MAPPINGS, REQUIREMENTS } from "../src/requirements.js";
import { adjudicateRequirements } from "../src/requirement-adjudicator.js";
import { DRIFT_BASELINE, EVIDENCE_GRAPH, LANE_HANDOFFS, LANE_MANIFESTS, SYNTHETIC_FIXTURES, TRAIN_MANIFEST, validateAcceptanceRegistry, validateEvidenceGraph, validateLaneManifests, validateSyntheticFixtures, validateTrainManifest } from "../src/index.js";

const root = new URL("../", import.meta.url);
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}` : JSON.stringify(value);
const write = (name: string, value: unknown) => { const text = `${canonical(value)}\n`; const file = new URL(name, root); mkdirSync(new URL(".", file), { recursive: true }); writeFileSync(file, text, "utf8"); writeFileSync(new URL(`${name}.sha256`, root), `${createHash("sha256").update(text).digest("hex")}  ${name.split("/").pop()}\n`, "utf8"); };
export function buildAssuranceValidationResult(input = { acceptanceMappings: ACCEPTANCE_MAPPINGS, trainManifest: TRAIN_MANIFEST, laneManifests: LANE_MANIFESTS, syntheticFixtures: SYNTHETIC_FIXTURES, evidenceGraph: EVIDENCE_GRAPH }) {
	const adjudications = adjudicateRequirements(REQUIREMENTS);
	const validationErrors = [...validateAcceptanceRegistry(input.acceptanceMappings), ...validateTrainManifest(input.trainManifest), ...validateLaneManifests(input.laneManifests), ...validateSyntheticFixtures(input.syntheticFixtures), ...validateEvidenceGraph(input.evidenceGraph)];
	const result = validationErrors.length === 0 ? "PASS" : "FAIL";
	const exitCode = result === "PASS" ? 0 : 1;
	return { schemaVersion: "VP_WAVE1_VALIDATION_V1", requirementCount: REQUIREMENTS.length, acceptanceCount: input.acceptanceMappings.length, adjudicatedAcceptedCount: adjudications.filter((item) => item.classification === "ACCEPTED_CONCRETE").length, validationErrors, flags: "OFF", activation: "NONE", result, exitCode, summary: `${result}: ${validationErrors.length} validation errors`, adjudications } as const;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const validation = buildAssuranceValidationResult();
	write("evidence/requirement-registry.json", { schemaVersion: "VP_REQUIREMENT_REGISTRY_V1", requirements: REQUIREMENTS });
	write("evidence/requirement-adjudication.json", { schemaVersion: "VP_REQUIREMENT_ADJUDICATION_V1", adjudications: validation.adjudications });
	write("evidence/acceptance-registry.json", { schemaVersion: "VP_ACCEPTANCE_REGISTRY_V1", acceptanceMappings: ACCEPTANCE_MAPPINGS });
	write("evidence/train-manifest.json", TRAIN_MANIFEST);
	write("evidence/lane-manifests.json", { schemaVersion: "VP_LANE_MANIFESTS_V1", manifests: LANE_MANIFESTS });
	write("evidence/synthetic-fixtures.json", SYNTHETIC_FIXTURES);
	write("evidence/evidence-graph.json", EVIDENCE_GRAPH);
	write("evidence/drift-baseline.json", DRIFT_BASELINE);
	write("evidence/lane-handoffs.json", { schemaVersion: "VP_LANE_HANDOFFS_V1", handoffs: LANE_HANDOFFS });
	write("validation/validation-results.json", validation);
	console.log(validation.summary);
	process.exitCode = validation.exitCode;
}