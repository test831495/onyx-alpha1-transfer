import { inspectRecordSnapshot } from "../factory-constitution";

export const P3_BOUNDS = Object.freeze({
  MAX_DEPTH: 10,
  MAX_OBJECT_KEYS: 64,
  MAX_COLLECTION_ITEMS: 64,
  MAX_EVIDENCE_REFERENCES: 64,
  MAX_REASONS: 32,
  MAX_BLOCKERS: 32,
  MAX_WARNINGS: 32,
  MAX_HUMAN_ACTIONS: 16,
  MAX_OWNER_DECISIONS: 16,
  MAX_REOPENING_TRIGGERS: 32,
  MAX_PR_BODY_LENGTH: 4096,
  MAX_REPORT_SECTION_LENGTH: 1024,
  MAX_STRING_LENGTH: 1024,
  MAX_PROVENANCE_ENTRIES: 32,
} as const);

export const P3_PROJECTION_PURPOSES = Object.freeze(["POST_H1_P3_GOVERNANCE_REPORT", "POST_H1_P3_PR_BODY_PROPOSAL"] as const);
export type P3ProjectionPurpose = (typeof P3_PROJECTION_PURPOSES)[number];
export type P3ProjectionDisposition = "PROJECTED" | "NOT_ASSESSABLE";
export type P3InputValidationResult = Readonly<{ outcome: "PASS" | "NOT_ASSESSABLE"; authority: "NON_AUTHORIZING"; reasons: readonly string[] }>;
export type P3GovernanceAutomationInput = Readonly<{
  evaluationEpochMilliseconds: number;
  purpose: P3ProjectionPurpose;
  lifecycleRegistry: unknown;
  reconciliationInput: unknown;
  evidenceReferences: readonly unknown[];
  provenance: readonly unknown[];
}>;

const INPUT_KEYS = ["evaluationEpochMilliseconds", "purpose", "lifecycleRegistry", "reconciliationInput", "evidenceReferences", "provenance"] as const;
const result = (outcome: P3InputValidationResult["outcome"], reasons: readonly string[]): P3InputValidationResult => Object.freeze({ outcome, authority: "NON_AUTHORIZING", reasons: Object.freeze([...reasons].sort()) });

const withinBounds = (value: unknown, depth = 0): boolean => {
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= P3_BOUNDS.MAX_STRING_LENGTH;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || depth > P3_BOUNDS.MAX_DEPTH) return false;
  if (Array.isArray(value)) return value.length <= P3_BOUNDS.MAX_COLLECTION_ITEMS && value.every((entry) => withinBounds(entry, depth + 1));
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length <= P3_BOUNDS.MAX_OBJECT_KEYS && keys.every((key) => withinBounds((value as Record<string, unknown>)[key], depth + 1));
};

const uniqueEvidenceIds = (references: readonly unknown[]): boolean => {
  const ids = references.map((reference) => {
    const inspected = inspectRecordSnapshot(reference);
    return inspected.valid && typeof inspected.snapshot.id === "string" ? inspected.snapshot.id : "";
  });
  return ids.every(Boolean) && new Set(ids).size === ids.length;
};

export const validateP3GovernanceAutomationInput = (input: unknown): P3InputValidationResult => {
  const inspected = inspectRecordSnapshot(input, INPUT_KEYS);
  if (!inspected.valid) return result("NOT_ASSESSABLE", ["P3_INPUT_UNVERIFIABLE"]);
  const value = inspected.snapshot as unknown as Record<string, unknown>;
  if (!withinBounds(value)) return result("NOT_ASSESSABLE", ["P3_INPUT_BOUND_EXCEEDED"]);
  if (typeof value.evaluationEpochMilliseconds !== "number" || !Number.isFinite(value.evaluationEpochMilliseconds) || value.evaluationEpochMilliseconds < 0) return result("NOT_ASSESSABLE", ["P3_EVALUATION_EPOCH_INVALID"]);
  if (!P3_PROJECTION_PURPOSES.includes(value.purpose as P3ProjectionPurpose)) return result("NOT_ASSESSABLE", ["P3_PURPOSE_INVALID"]);
  if (!Array.isArray(value.evidenceReferences) || value.evidenceReferences.length > P3_BOUNDS.MAX_EVIDENCE_REFERENCES || !uniqueEvidenceIds(value.evidenceReferences)) return result("NOT_ASSESSABLE", ["P3_EVIDENCE_INVALID"]);
  if (!Array.isArray(value.provenance) || value.provenance.length > P3_BOUNDS.MAX_PROVENANCE_ENTRIES) return result("NOT_ASSESSABLE", ["P3_PROVENANCE_INVALID"]);
  return result("PASS", []);
};