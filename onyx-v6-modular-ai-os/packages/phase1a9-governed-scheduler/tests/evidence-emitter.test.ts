import { describe, expect, it } from "vitest";
import { EvidenceEmitter, type SchedulerEvidenceEvent, type EvidenceArtifactRegistration } from "../src";

const event = (overrides: Partial<SchedulerEvidenceEvent> = {}): SchedulerEvidenceEvent => ({
  evidenceEventId: "event-001",
  schedulerRunId: "run-001",
  workflowId: "workflow-001",
  runtimeId: "runtime-001",
  runtimeSessionId: "session-001",
  taskId: "task-001",
  agentId: "agent-001",
  promotionCandidateId: "promo-candidate-001",
  eventType: "EVIDENCE_EVENT_REGISTERED",
  logicalSequence: 1,
  causalParentEventIds: [],
  artifactIds: ["artifact-001"],
  decisionReferenceIds: ["decision-001"],
  approvalId: "approval-001",
  permissionDecisionId: "permission-001",
  memoryDecisionId: "memory-001",
  connectorDecisionId: "connector-001",
  contextDecisionId: "context-001",
  checkpointDigest: "sha256:cp-001",
  scopeHash: "scope-hash-001",
  redactionStatus: "REDACTION_NOT_REQUIRED",
  permissionStatus: "AUTHORIZED",
  provenanceStatus: "VALID",
  integrityStatus: "VALID",
  recordedAt: "2026-08-21T00:00:00.000Z",
  contractVersion: "1.0.0",
  ...overrides,
});

const artifact = (): EvidenceArtifactRegistration => ({
  evidenceArtifactRegistrationId: "reg-001",
  artifactId: "artifact-001",
  artifactClass: "VALIDATION",
  fileName: "validation.json",
  format: "json",
  schemaVersion: "1.0.0",
  producerComponent: "phase1a9-governed-scheduler",
  producerDecisionId: "decision-001",
  workflowId: "workflow-001",
  taskId: "task-001",
  promotionCandidateId: "promo-candidate-001",
  contentDigest: "sha256:artifact-001",
  hashAlgorithm: "SHA-256",
  sizeBytes: 128,
  provenanceReferenceIds: ["prov-001"],
  sourceReferenceIds: ["source-001"],
  permissionDecisionIds: ["permission-001"],
  redactionDecisionIds: ["redaction-001"],
  retentionPolicyId: "retention-001",
  createdAt: "2026-08-21T00:00:00.000Z",
  contractVersion: "1.0.0",
  decision: "REGISTERED_AS_PROJECTION",
});

describe("EvidenceEmitter", () => {
  it("validates unique event sequences and causal ordering", () => {
    const parent = event({ evidenceEventId: "event-parent", logicalSequence: 1, causalParentEventIds: [] });
    const child = event({ evidenceEventId: "event-child", logicalSequence: 2, causalParentEventIds: ["event-parent"] });
    const result = EvidenceEmitter.validateSequence([parent, child]);
    expect(result.valid).toBe(true);
    expect(result.denialReasons).toEqual([]);
  });

  it("rejects unknown and cyclic parents", () => {
    const badParent = event({ evidenceEventId: "event-bad", logicalSequence: 2, causalParentEventIds: ["missing-parent"] });
    const cycles = [
      event({ evidenceEventId: "cycle-a", logicalSequence: 1, causalParentEventIds: ["cycle-b"] }),
      event({ evidenceEventId: "cycle-b", logicalSequence: 2, causalParentEventIds: ["cycle-a"] }),
    ];
    expect(EvidenceEmitter.validateSequence([badParent]).valid).toBe(false);
    expect(EvidenceEmitter.validateSequence(cycles).valid).toBe(false);
  });

  it("registers an artifact only when metadata is complete and valid", () => {
    const registration = EvidenceEmitter.registerArtifact(artifact());
    expect(registration.decision).toBe("REGISTERED_AS_PROJECTION");

    const missingDigest = { ...artifact(), contentDigest: "" };
    expect(EvidenceEmitter.registerArtifact(missingDigest).decision).toBe("DENIED_MISSING_DIGEST");
  });

  it("marks incomplete mandatory evidence as blocked", () => {
    const result = EvidenceEmitter.evaluatePackage({
      evidencePackageId: "pkg-001",
      schedulerRunId: "run-001",
      workflowId: "workflow-001",
      promotionCandidateId: "promo-candidate-001",
      mandatoryEvidenceClasses: ["REQUEST", "APPROVAL", "VALIDATION", "SECURITY"],
      artifactIdsByClass: { REQUEST: ["artifact-001"], APPROVAL: [], VALIDATION: ["artifact-002"], SECURITY: ["artifact-003"] },
      missingEvidenceClasses: ["APPROVAL"],
      invalidEvidenceArtifactIds: [],
      conflictingEvidenceArtifactIds: [],
      unredactedEvidenceArtifactIds: [],
      unauthorizedEvidenceArtifactIds: [],
      provenanceInvalidArtifactIds: [],
      retentionInvalidArtifactIds: [],
      sequenceValid: true,
      causalGraphValid: true,
      completenessStatus: "INCOMPLETE",
      sealingEligible: false,
      promotionEligible: false,
      evidenceArtifactIds: ["artifact-001", "artifact-002", "artifact-003"],
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });
    expect(result.completenessStatus).toBe("INCOMPLETE");
    expect(result.promotionEligible).toBe(false);
  });

  it("creates a deterministic manifest digest input", () => {
    const manifest = EvidenceEmitter.evaluateManifest({
      evidenceManifestId: "manifest-001",
      evidencePackageId: "pkg-001",
      workflowId: "workflow-001",
      promotionCandidateId: "promo-candidate-001",
      artifactEntries: [{ evidenceClass: "VALIDATION", artifactId: "artifact-001" }],
      eventEntries: [{ evidenceClass: "VALIDATION", eventId: "event-001", logicalSequence: 1 }],
      artifactCount: 1,
      eventCount: 1,
      manifestDigest: "manifest-digest-001",
      hashAlgorithm: "SHA-256",
      contractVersions: ["1.0.0"],
      producerComponents: ["phase1a9-governed-scheduler"],
      requiredClassCoverage: ["VALIDATION"],
      missingClassCoverage: [],
      invalidArtifactIds: [],
      conflictingArtifactIds: [],
      provenanceStatus: "VALID",
      permissionStatus: "AUTHORIZED",
      redactionStatus: "REDACTION_NOT_REQUIRED",
      retentionStatus: "VALID",
      sequenceStatus: "VALID",
      completenessStatus: "COMPLETE",
      manifestEligibleForSealing: false,
      promotionUseEligible: false,
      evidenceArtifactIds: ["artifact-001"],
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });
    expect(manifest.artifactEntries?.[0]?.artifactId).toBe("artifact-001");
    expect(manifest.eventEntries?.[0]?.eventId).toBe("event-001");
  });
});
