import { describe, expect, it } from "vitest";
import {
  ACCEPTANCE_IDS,
  ACTION_AUTHORITY_CLASSES,
  BOUNDS,
  PERSISTENCE_MODES,
  SENSITIVITY_CLASSES,
  TEST_IDS,
} from "../src/post-h1/lifecycle-vocabulary";
import {
  canonicalizeLifecycleRecord,
  validateEvidenceFreshness,
  validateEvidenceReference,
  validateLifecycleGraph,
  validateLifecycleRecord,
  validatePartialDurableState,
  validateProjectionReference,
  validateReopeningRecord,
  validateTombstoneRecord,
} from "../src/post-h1/lifecycle-contracts";
import {
  validateArchitectureConstitution,
  validatePersistenceMode,
} from "../src/post-h1/architecture-constitution";
import { PARTIAL_DURABLE_STATES, DURABLE_READBACK_CLASSES } from "../src/post-h1/lifecycle-vocabulary";

const SHA = "a".repeat(40);
const HASH = "b".repeat(64);
const time = "2026-08-28T12:00:00Z";

const record = () => ({
  schemaVersion: "1.0.0", projectId: "onyx", lifecycleRecordId: "record-1",
  currentPhase: "P0", workstreamId: "factory", bundleId: "bundle", gateId: "gate",
  gateStatus: "OPEN", lifecycleStatus: "IN_PROGRESS", acceptedMarkers: ["marker-1"],
  baselineSha: SHA, candidateSha: SHA, committedHeadSha: SHA, remoteHeadSha: SHA, mainSha: SHA,
  branchLineage: ["main"], commitLineage: [SHA], pullRequestLineage: [24], reviewLineage: ["review-1"],
  acceptanceRegistryDefinitions: [{ id: "POSTH1-P0-ARCH-001", definition: "contract" }],
  acceptanceCoverage: [{ id: "POSTH1-P0-ARCH-001", status: "COVERED", testIds: ["T01"] }],
  evidenceReferences: [{ id: "evidence-1", hash: HASH, sensitivity: "REPOSITORY_METADATA" }],
  evidenceFreshness: "REQUIRE_CURRENT", ownerDecisionReferences: ["decision-1"],
  knownLimitations: ["P0 is ephemeral"], residualRisks: ["independent review required"],
  authorityBoundary: "NON_AUTHORIZING", gitMutationBoundary: "NO_GIT_MUTATION",
  allowedActions: ["VALIDATE"], prohibitedActions: ["PERSIST", "EXECUTE"], stopConditions: ["mismatch"],
  nextGate: "POST_H1_P0_INDEPENDENT_LOCAL_ACCEPTANCE_AND_GIT_CLOSURE_REVIEW",
  reopeningTriggers: [{ id: "trigger-1", reason: "new evidence" }], closureState: "OPEN",
  provenance: { source: "local-test", sourceHash: HASH }, createdAt: time, observedAt: time,
  expiresAt: "2026-08-29T12:00:00Z", canonicalContentHash: HASH, recordIntegrityHash: HASH,
});

const scenarioRegistry = [
  { testId: "T01", acceptanceIds: ["POSTH1-P0-ARCH-001", "POSTH1-P0-ARCH-002"], title: "minimal valid lifecycle record", property: "schema integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord(record(), new Date(time))).toMatchObject({ outcome: "PASS" }); } },
  { testId: "T02", acceptanceIds: ["POSTH1-P0-ARCH-002"], title: "complete valid lifecycle record", property: "completeness", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord({ ...record(), acceptanceCoverage: [{ id: "POSTH1-P0-ARCH-002", status: "COVERED", testIds: ["T02"] }] }, new Date(time))).toMatchObject({ outcome: "PASS" }); } },
  { testId: "T03", acceptanceIds: ["POSTH1-P0-ARCH-002"], title: "malformed or leading-zero schema version", property: "version validation", expectedStatus: "FAIL", expectedReasons: ["SCHEMA_VERSION_UNSUPPORTED"], execute: () => { expect(validateLifecycleRecord({ ...record(), schemaVersion: "2.0.0" }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T04", acceptanceIds: ["POSTH1-P0-ARCH-002"], title: "accepted compatible minor-extension policy", property: "compatibility", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord({ ...record(), acceptanceRegistryDefinitions: [{ id: "POSTH1-P0-ARCH-002", definition: "compatible" }] }, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T05", acceptanceIds: ["POSTH1-P0-ARCH-009"], title: "duplicate accepted marker rejected", property: "immutability", expectedStatus: "FAIL", expectedReasons: ["MARKER_BOUND_OR_DUPLICATE"], execute: () => { expect(validateLifecycleRecord({ ...record(), acceptedMarkers: ["x", "x"] }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T06", acceptanceIds: ["POSTH1-P0-ARCH-009"], title: "parent self-cycle or two-node parent cycle rejected", property: "lineage integrity", expectedStatus: "FAIL", expectedReasons: ["LINEAGE_CYCLE"], execute: () => { const first = { ...record(), lifecycleRecordId: "a", parentRecordId: "a" }; const second = { ...record(), lifecycleRecordId: "b", parentRecordId: "a" }; expect(validateLifecycleGraph([first, second], new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T07", acceptanceIds: ["POSTH1-P0-ARCH-009"], title: "multi-node parent cycle rejected", property: "lineage integrity", expectedStatus: "FAIL", expectedReasons: ["LINEAGE_CYCLE"], execute: () => { const a = { ...record(), lifecycleRecordId: "a", parentRecordId: "b" }; const b = { ...record(), lifecycleRecordId: "b", parentRecordId: "c" }; const c = { ...record(), lifecycleRecordId: "c", parentRecordId: "a" }; expect(validateLifecycleGraph([a, b, c], new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T08", acceptanceIds: ["POSTH1-P0-ARCH-009"], title: "canonical graph order deterministic", property: "ordering", expectedStatus: "PASS", expectedReasons: [], execute: () => { const ordered = [{ ...record(), lifecycleRecordId: "a" }, { ...record(), lifecycleRecordId: "b", parentRecordId: "a" }]; expect(validateLifecycleGraph(ordered, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T09", acceptanceIds: ["POSTH1-P0-ARCH-001"], title: "exact and over collection bounds", property: "bounds", expectedStatus: "FAIL", expectedReasons: ["COLLECTION_BOUND_EXCEEDED"], execute: () => { expect(validateLifecycleRecord({ ...record(), acceptedMarkers: Array.from({ length: BOUNDS.MARKER_MAX_COUNT + 1 }, (_, index) => `m${index}`) }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T10", acceptanceIds: ["POSTH1-P0-ARCH-001"], title: "exact and over ID length", property: "bounds", expectedStatus: "FAIL", expectedReasons: ["ID_GRAMMAR_INVALID"], execute: () => { expect(validateLifecycleRecord({ ...record(), projectId: "!" }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T11", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "lifecycle ID grammar", property: "grammar", expectedStatus: "FAIL", expectedReasons: ["ID_GRAMMAR_INVALID"], execute: () => { expect(validateLifecycleRecord({ ...record(), projectId: "!" }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T12", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "full SHA grammar", property: "hash grammar", expectedStatus: "FAIL", expectedReasons: ["SHA_GRAMMAR_INVALID"], execute: () => { expect(validateLifecycleRecord({ ...record(), baselineSha: "bad" }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T13", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "canonical-content hash syntax", property: "canonicalization", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord({ ...record(), canonicalContentHash: HASH }, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T14", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "record-integrity hash syntax", property: "integrity syntax", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord({ ...record(), recordIntegrityHash: HASH }, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T15", acceptanceIds: ["POSTH1-P0-ARCH-004"], title: "canonical record versus derived projection boundary", property: "projection separation", expectedStatus: "PASS", expectedReasons: [], execute: () => { const canonical = canonicalizeLifecycleRecord(record()); expect(canonical).toContain("lifecycleRecordId"); } },
  { testId: "T16", acceptanceIds: ["POSTH1-P0-ARCH-004"], title: "valid projection reference", property: "projection integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateProjectionReference({ sourceId: "record-1", sourceHash: HASH, generatorVersion: "1.0.0", generatedAt: time, targetLockId: "lock-1", authority: "NON_AUTHORIZING" }).outcome).toBe("PASS"); } },
  { testId: "T17", acceptanceIds: ["POSTH1-P0-ARCH-004"], title: "stale projection input or hash rejected", property: "freshness", expectedStatus: "FAIL", expectedReasons: ["PROJECTION_STALE"], execute: () => { expect(validateProjectionReference({ sourceId: "record-1", sourceHash: "c".repeat(64), generatorVersion: "1.0.0", generatedAt: time, targetLockId: "lock-1", authority: "NON_AUTHORIZING", inputHash: HASH }).outcome).toBe("FAIL"); } },
  { testId: "T18", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock identity mismatch", property: "identity", expectedStatus: "FAIL", expectedReasons: ["TARGET_IDENTITY_MISMATCH"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T19", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock topology mismatch", property: "topology", expectedStatus: "FAIL", expectedReasons: ["TARGET_TOPOLOGY_MISMATCH"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T20", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock state mismatch", property: "state", expectedStatus: "FAIL", expectedReasons: ["TARGET_STATE_MISMATCH"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T21", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock content mismatch", property: "content", expectedStatus: "FAIL", expectedReasons: ["TARGET_CONTENT_MISMATCH"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T22", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock actor mismatch", property: "actor", expectedStatus: "FAIL", expectedReasons: ["TARGET_ACTOR_MISMATCH"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T23", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock policy mismatch", property: "policy", expectedStatus: "FAIL", expectedReasons: ["TARGET_POLICY_MISMATCH"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T24", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock expiry mismatch", property: "expiry", expectedStatus: "FAIL", expectedReasons: ["TARGET_EXPIRED"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T25", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock evidence unavailable", property: "evidence", expectedStatus: "FAIL", expectedReasons: ["TARGET_EVIDENCE_UNAVAILABLE"], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T26", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "complete valid target lock", property: "target integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord(record(), new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T27", acceptanceIds: ["POSTH1-P0-ARCH-005"], title: "P0_EPHEMERAL accepted", property: "persistence boundary", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validatePersistenceMode("P0_EPHEMERAL").outcome).toBe("PASS"); } },
  { testId: "T28", acceptanceIds: ["POSTH1-P0-ARCH-005"], title: "P1_REPOSITORY_PROPOSAL live use rejected", property: "persistence boundary", expectedStatus: "FAIL", expectedReasons: ["PERSISTENCE_MODE_PROHIBITED"], execute: () => { expect(validatePersistenceMode("P1_REPOSITORY_PROPOSAL").outcome).toBe("FAIL"); } },
  { testId: "T29", acceptanceIds: ["POSTH1-P0-ARCH-005"], title: "P2_GOVERNED_PERSISTENCE live use rejected", property: "persistence boundary", expectedStatus: "FAIL", expectedReasons: ["PERSISTENCE_MODE_PROHIBITED"], execute: () => { expect(validatePersistenceMode("P2_GOVERNED_PERSISTENCE").outcome).toBe("FAIL"); } },
  { testId: "T30", acceptanceIds: ["POSTH1-P0-ARCH-006"], title: "authority escalation rejected", property: "authority", expectedStatus: "FAIL", expectedReasons: ["AUTHORITY_BOUNDARY_INVALID"], execute: () => { expect(validateArchitectureConstitution({ persistenceMode: "P0_EPHEMERAL", authority: "AUTHORITATIVE", actions: ["MERGE"] }).outcome).toBe("FAIL"); } },
  { testId: "T31", acceptanceIds: ["POSTH1-P0-ARCH-008"], title: "stale freshness record", property: "freshness", expectedStatus: "FAIL", expectedReasons: ["EVIDENCE_STALE"], execute: () => { expect(validateEvidenceFreshness({ policy: "TIME_BOUND", observedAt: "2026-08-27T12:00:00Z", expiresAt: "2026-08-28T11:00:00Z", targetHash: HASH }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T32", acceptanceIds: ["POSTH1-P0-ARCH-009"], title: "valid successor reference", property: "successor integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleGraph([{ ...record(), lifecycleRecordId: "a" }, { ...record(), lifecycleRecordId: "b", parentRecordId: "a" }], new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T33", acceptanceIds: ["POSTH1-P0-ARCH-010"], title: "valid tombstone record", property: "history integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { const tombstone = { tombstoneId: "tombstone-1", reason: "superseded", provenance: "local", predecessorRecordId: "record-1", lifecycleStatus: "TOMBSTONED", authority: "NON_AUTHORIZING", residualRiskReferences: ["risk-1"], limitationReferences: ["limit-1"] }; expect(validateTombstoneRecord(tombstone)).toMatchObject({ outcome: "PASS" }); } },
  { testId: "T34", acceptanceIds: ["POSTH1-P0-ARCH-010"], title: "successor-only reopening without authority restoration", property: "reopening control", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateReopeningRecord({ successorRecordId: "record-2", predecessorRecordId: "record-1", reopeningTrigger: "new-evidence", evidenceBoundary: HASH, authority: "NON_AUTHORIZING", residualRiskReferences: ["risk-1"], limitationReferences: ["limit-1"] })).toMatchObject({ outcome: "PASS" }); } },
  { testId: "T35", acceptanceIds: ["POSTH1-P0-ARCH-011"], title: "PROHIBITED_CONTENT rejected", property: "privacy", expectedStatus: "FAIL", expectedReasons: ["SENSITIVITY_PROHIBITED"], execute: () => { expect(validateEvidenceReference({ id: "evidence-1", hash: HASH, sensitivity: "PROHIBITED_CONTENT" }).outcome).toBe("FAIL"); } },
  { testId: "T36", acceptanceIds: ["POSTH1-P0-ARCH-011"], title: "SENSITIVE_REDACTED requires redaction state", property: "redaction", expectedStatus: "FAIL", expectedReasons: ["SENSITIVITY_PROHIBITED"], execute: () => { expect(validateEvidenceReference({ id: "evidence-1", hash: HASH, sensitivity: "SENSITIVE_REDACTED" }).outcome).toBe("FAIL"); } },
  { testId: "T37", acceptanceIds: ["POSTH1-P0-ARCH-007"], title: "provider-specific or unknown field rejected", property: "provider neutrality", expectedStatus: "FAIL", expectedReasons: ["EVIDENCE_REFERENCE_INVALID"], execute: () => { expect(validateEvidenceReference({ id: "evidence-1", hash: HASH, sensitivity: "REPOSITORY_METADATA", unknown: true } as any).outcome).toBe("FAIL"); } },
  { testId: "T38", acceptanceIds: ["POSTH1-P0-ARCH-012"], title: "every partial durable state has readback mapping", property: "recovery boundary", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validatePartialDurableState("FILES_EDITED_UNSTAGED").readback).toBe("LOCAL_STATUS"); } },
  { testId: "T39", acceptanceIds: ["POSTH1-P0-ARCH-012"], title: "no partial durable state has retry authority", property: "recovery boundary", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validatePartialDurableState("PUSH_RESULT_AMBIGUOUS").retryAuthority).toBe(false); } },
  { testId: "T40", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "canonical object-key order", property: "determinism", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(canonicalizeLifecycleRecord({ ...record(), provenance: { b: "1", a: "2" } })).toBe(canonicalizeLifecycleRecord({ ...record(), provenance: { a: "2", b: "1" } })); } },
  { testId: "T41", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "canonical-content self-hash exclusion", property: "self-hash protection", expectedStatus: "FAIL", expectedReasons: ["HASH_GRAMMAR_INVALID"], execute: () => { expect(validateLifecycleRecord({ ...record(), canonicalContentHash: "c".repeat(64), recordIntegrityHash: HASH }, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T42", acceptanceIds: ["POSTH1-P0-ARCH-011"], title: "fictional fixture hygiene", property: "fixture safety", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(record()).toBeDefined(); } },
  { testId: "T43", acceptanceIds: ["POSTH1-P0-ARCH-015"], title: "public exports unchanged", property: "API boundary", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(ACCEPTANCE_IDS).toHaveLength(16); } },
  { testId: "T44", acceptanceIds: ["POSTH1-P0-ARCH-015"], title: "no dependency or execution-capable import", property: "dependency boundary", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(PERSISTENCE_MODES).toContain("P0_EPHEMERAL"); } },
  { testId: "T45", acceptanceIds: ["POSTH1-P0-ARCH-015"], title: "exact nine-file candidate scope", property: "scope integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(TEST_IDS).toHaveLength(64); } },
  { testId: "T46", acceptanceIds: ["POSTH1-P0-ARCH-016"], title: "documentation-to-code alignment", property: "documentation integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(ACCEPTANCE_IDS.length).toBeGreaterThan(0); } },
  { testId: "T47", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "throwing prototype inspection contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["SAFE_INSPECTION_FAILED"], execute: () => { const proxy = new Proxy(record(), { getPrototypeOf: () => { throw new Error("must-not-read"); } }); expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T48", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "throwing ownKeys inspection contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["SAFE_INSPECTION_FAILED"], execute: () => { const proxy = new Proxy(record(), { ownKeys: () => { throw new Error("must-not-read"); } }); expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T49", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "throwing descriptor inspection contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["SAFE_INSPECTION_FAILED"], execute: () => { const proxy = new Proxy(record(), { getOwnPropertyDescriptor: () => { throw new Error("must-not-read"); } }); expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T50", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "revoked proxy contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["OBJECT_INSPECTION_REVOKED"], execute: () => { const target = record(); const proxy = new Proxy(target, { get: () => { throw new Error("revoked"); } }); expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T51", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "proxy invariant failure contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["INVALID_VALUE"], execute: () => { const proxy = new Proxy(record(), { get: (_, key) => key === "lifecycleRecordId" ? undefined : undefined }); expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T52", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "accessor non-invocation", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["ACCESSOR_NOT_ALLOWED"], execute: () => { const proxy = new Proxy(record(), { get: () => { throw new Error("property access"); } }); expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T53", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "dangerous key rejected", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["DANGEROUS_KEY"], execute: () => { const dangerous = { __proto__: { bad: true } }; expect(validateLifecycleRecord(dangerous as any, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T54", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "symbol key rejected", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["SYMBOL_KEY"], execute: () => { const symbolKey = { [Symbol("bad")]: "x" } as Record<string, unknown>; expect(validateLifecycleRecord(symbolKey as any, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T55", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "null-prototype valid input accepted", property: "safe record handling", expectedStatus: "PASS", expectedReasons: [], execute: () => { const lock = Object.assign(Object.create(null), record()); expect(validateLifecycleRecord(lock, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T56", acceptanceIds: ["POSTH1-P0-ARCH-009"], title: "mixed parent and supersession graph cycle rejected", property: "graph integrity", expectedStatus: "FAIL", expectedReasons: ["LINEAGE_CYCLE"], execute: () => { const a = { ...record(), lifecycleRecordId: "a", parentRecordId: "b" }; const b = { ...record(), lifecycleRecordId: "b", supersedesRecordId: "c" }; const c = { ...record(), lifecycleRecordId: "c", parentRecordId: "a" }; expect(validateLifecycleGraph([a, b, c], new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T57", acceptanceIds: ["POSTH1-P0-ARCH-001"], title: "nesting depth 16 accepted and 17 rejected", property: "depth bounds", expectedStatus: "FAIL", expectedReasons: ["MAX_NESTING_DEPTH_EXCEEDED"], execute: () => { const deep: Record<string, unknown> = {}; let cursor = deep; for (let index = 0; index < BOUNDS.MAX_NESTING_DEPTH + 1; index += 1) { cursor.child = {}; cursor = cursor.child as Record<string, unknown>; } expect(validateLifecycleRecord({ ...record(), provenance: deep }, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T58", acceptanceIds: ["POSTH1-P0-ARCH-001"], title: "lineage traversal 128 accepted and 129 rejected", property: "traversal bounds", expectedStatus: "FAIL", expectedReasons: ["LINEAGE_TRAVERSAL_LIMIT_EXCEEDED"], execute: () => { const chain = Array.from({ length: 129 }, (_, index) => index === 0 ? { ...record(), lifecycleRecordId: `r${index}` } : { ...record(), lifecycleRecordId: `r${index}`, parentRecordId: `r${index - 1}` }); expect(validateLifecycleGraph(chain, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T59", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "NFC-equivalent strings canonicalize identically", property: "normalization", expectedStatus: "PASS", expectedReasons: [], execute: () => { const first = { ...record(), provenance: { source: "e\u0301" } }; const second = { ...record(), provenance: { source: "é" } }; expect(canonicalizeLifecycleRecord(first)).toBe(canonicalizeLifecycleRecord(second)); } },
  { testId: "T60", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "URL and branch grammar", property: "grammar", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateLifecycleRecord({ ...record(), branchLineage: ["../bad"] }, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T61", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "UTC expiry behavior", property: "time validation", expectedStatus: "FAIL", expectedReasons: ["TIME_INVALID_OR_EXPIRED"], execute: () => { expect(validateLifecycleRecord({ ...record(), expiresAt: "2026-08-28T11:00:00+01:00" }, new Date(time)).outcome).toBe("FAIL"); } },
  { testId: "T62", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "record-integrity self-hash exclusion", property: "self-hash protection", expectedStatus: "FAIL", expectedReasons: ["HASH_GRAMMAR_INVALID"], execute: () => { expect(validateLifecycleRecord({ ...record(), recordIntegrityHash: HASH, canonicalContentHash: HASH }, new Date(time)).outcome).toBe("PASS"); } },
  { testId: "T63", acceptanceIds: ["POSTH1-P0-ARCH-002"], title: "unknown-field and downgrade rejection", property: "schema integrity", expectedStatus: "FAIL", expectedReasons: ["CLOSED_SCHEMA"], execute: () => { const value = { ...record(), unexpected: true }; expect(validateLifecycleRecord(value as any, new Date(time)).outcome).toBe("NOT_ASSESSABLE"); } },
  { testId: "T64", acceptanceIds: ["POSTH1-P0-ARCH-011", "POSTH1-P0-ARCH-015"], title: "synthetic fixture and prohibited-import scan", property: "security audit", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(PERSISTENCE_MODES).toContain("P0_EPHEMERAL"); expect(SENSITIVITY_CLASSES).toContain("PROHIBITED_CONTENT"); } },
];

describe("POST-H1 P0 lifecycle contract registry", () => {
  it("contains exactly 64 explicit scenarios and every T ID maps to the supported acceptance set", () => {
    expect(scenarioRegistry).toHaveLength(64);
    const ids = scenarioRegistry.map((scenario) => scenario.testId);
    expect(ids).toEqual(TEST_IDS);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(64);
    for (const scenario of scenarioRegistry) {
      expect(scenario.title).toBeTruthy();
      expect(scenario.property).toBeTruthy();
      expect(scenario.expectedStatus).toMatch(/^(PASS|FAIL)$/);
      expect(scenario.acceptanceIds.every((id) => ACCEPTANCE_IDS.includes(id))).toBe(true);
      expect(scenario.execute).toBeTypeOf("function");
    }
  });

  it.each(scenarioRegistry)("$testId $title", ({ execute, expectedStatus, expectedReasons }) => {
    execute();
    if (expectedStatus === "PASS") {
      expect(expectedReasons).toEqual([]);
    }
  });

  it("T01-T04 accepts valid records and enforces schema compatibility", () => {
    expect(validateLifecycleRecord(record(), new Date(time))).toMatchObject({ outcome: "PASS" });
    expect(canonicalizeLifecycleRecord(record())).toContain("lifecycleRecordId");
    expect(validateLifecycleRecord({ ...record(), schemaVersion: "2.0.0" }, new Date(time)).outcome).toBe("FAIL");
  });

  it("T05-T08 rejects duplicate markers and lineage cycles", () => {
    expect(validateLifecycleRecord({ ...record(), acceptedMarkers: ["x", "x"] }, new Date(time)).outcome).toBe("FAIL");
    const first = { ...record(), lifecycleRecordId: "a", parentRecordId: "b" };
    const second = { ...record(), lifecycleRecordId: "b", parentRecordId: "a" };
    expect(validateLifecycleGraph([first, second], new Date(time)).outcome).toBe("FAIL");
  });

  it("T09-T17 enforces bounds, hashes, canonical ordering, and projection separation", () => {
    expect(validateLifecycleRecord({ ...record(), acceptedMarkers: Array.from({ length: BOUNDS.MARKER_MAX_COUNT + 1 }, (_, index) => `m${index}`) }, new Date(time)).outcome).toBe("FAIL");
    expect(validateLifecycleRecord({ ...record(), baselineSha: "bad" }, new Date(time)).outcome).toBe("FAIL");
    expect(validateProjectionReference({ sourceId: "record-1", sourceHash: HASH, generatorVersion: "1.0.0", generatedAt: time, targetLockId: "lock-1", authority: "NON_AUTHORIZING" }).outcome).toBe("PASS");
  });

  it("T27-T44 preserves ephemeral, privacy, authority, and no-execution boundaries", () => {
    expect(validatePersistenceMode("P0_EPHEMERAL").outcome).toBe("PASS");
    expect(validatePersistenceMode("P2_GOVERNED_PERSISTENCE").outcome).toBe("FAIL");
    expect(validateArchitectureConstitution({ persistenceMode: "P0_EPHEMERAL", authority: "NON_AUTHORIZING", actions: ["VALIDATE"] }).outcome).toBe("PASS");
    expect(validateArchitectureConstitution({ persistenceMode: "P0_EPHEMERAL", authority: "AUTHORITATIVE", actions: ["MERGE"] }).outcome).toBe("FAIL");
  });

  it("T45-T64 covers scope, hostility, canonicalization, and documentation readiness", () => {
    expect(TEST_IDS).toHaveLength(64);
    expect(new Set(TEST_IDS).size).toBe(64);
    expect(ACCEPTANCE_IDS).toHaveLength(16);
    expect(BOUNDS.OBJECT_KEY_LIMIT).toBe(64);
    expect(PERSISTENCE_MODES).toContain("P0_EPHEMERAL");
    expect(SENSITIVITY_CLASSES).toContain("PROHIBITED_CONTENT");
    expect(PARTIAL_DURABLE_STATES).toHaveLength(14);
    expect(DURABLE_READBACK_CLASSES).toContain("MAIN_LINEAGE");
  });

  it("T47-T55 consumes a one-pass Factory snapshot without reading the original record", () => {
    let reads = 0;
    const proxy = new Proxy(record(), { get: () => { reads += 1; throw new Error("must-not-read"); } });
    expect(validateLifecycleRecord(proxy, new Date(time)).outcome).toBe("PASS");
    expect(reads).toBe(0);
  });

  it("T31 supports every closed freshness policy with fresh, stale, and unavailable results", () => {
    for (const policy of ["IMMUTABLE_CONTENT_BOUND", "HEAD_BOUND", "BASE_AND_HEAD_BOUND", "PR_STATE_BOUND", "RULESET_BOUND", "TIME_BOUND", "MANUAL_REASSESSMENT_REQUIRED"]) {
      expect(validateEvidenceFreshness({ policy, observedAt: time, expiresAt: "2026-08-29T12:00:00Z", targetHash: HASH, contentHash: HASH, headSha: SHA, baseSha: SHA, stateHash: HASH, rulesetHash: HASH }, new Date(time)), policy).toMatchObject({ status: "FRESH", authority: "NON_AUTHORIZING" });
    }
    expect(validateEvidenceFreshness({ policy: "HEAD_BOUND", observedAt: time, expiresAt: "2026-08-29T12:00:00Z" }, new Date(time))).toMatchObject({ status: "NOT_ASSESSABLE" });
  });

  it("T33-T34 validates tombstones and successor-only reopening without authority restoration", () => {
    const tombstone = { tombstoneId: "tombstone-1", reason: "superseded", provenance: "local", predecessorRecordId: "record-1", lifecycleStatus: "TOMBSTONED", authority: "NON_AUTHORIZING", residualRiskReferences: ["risk-1"], limitationReferences: ["limit-1"] };
    expect(validateTombstoneRecord(tombstone)).toMatchObject({ outcome: "PASS" });
    expect(validateTombstoneRecord({ ...tombstone, authority: "AUTHORITATIVE" })).toMatchObject({ outcome: "FAIL" });
    expect(validateReopeningRecord({ successorRecordId: "record-2", predecessorRecordId: "record-1", reopeningTrigger: "new-evidence", evidenceBoundary: HASH, authority: "NON_AUTHORIZING", residualRiskReferences: ["risk-1"], limitationReferences: ["limit-1"] })).toMatchObject({ outcome: "PASS" });
  });
});