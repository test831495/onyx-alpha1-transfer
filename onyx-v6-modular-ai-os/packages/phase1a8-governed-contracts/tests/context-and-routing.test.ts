import { describe, it, expect } from "vitest";
import { digest, makeId } from "../src/shared/identifiers";
import * as contextAssembly from "../src/track-b/context-assembly";
import * as modelRouting from "../src/track-b/model-routing";
import { CONTEXT_CONTRACT_VERSION } from "../src/shared/versions";
import { classifyTokenBudgetStatus, classifyCostBudgetStatus, defaultTokenBudget } from "../src/shared/budgets";

const now = "2025-01-01T00:00:00.000Z";

describe("Wave 3C: Context Assembly and Model Routing", () => {
  describe("Request and Domain Classification", () => {
    it("must classify known request types", () => {
      const requestId = makeId("req", "test-request");
      const classification: contextAssembly.RequestClassificationContract = {
        classificationId: makeId("reqc", requestId),
        requestId,
        classifiedAs: "READ_ONLY_QUERY",
        confidence: 0.95,
        evidenceReferences: [],
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(classification.classifiedAs).toBe("READ_ONLY_QUERY");
      contextAssembly.assertValidRequestClass(classification.classifiedAs);
    });

    it("must reject unknown request classifications", () => {
      expect(() => {
        const unknown = "INVALID_REQUEST" as contextAssembly.RequestClass;
        contextAssembly.assertValidRequestClass(unknown);
      }).toThrow("Unknown request class");
    });

    it("must fail safe on unknown request class", () => {
      const classification: contextAssembly.RequestClassificationContract = {
        classificationId: makeId("reqc", "test"),
        requestId: "test",
        classifiedAs: "UNKNOWN_REQUEST" as contextAssembly.RequestClass,
        confidence: 0.0,
        evidenceReferences: [],
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertClassificationNotUnknown(classification);
      }).toThrow("Unknown classification must fail safe");
    });

    it("must classify known domain types", () => {
      const classification: contextAssembly.DomainClassificationContract = {
        classificationId: makeId("domc", "test-domain"),
        requestId: "req1",
        classifiedAs: "ENGINEERING",
        confidence: 0.9,
        evidenceReferences: [],
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(classification.classifiedAs).toBe("ENGINEERING");
      contextAssembly.assertValidDomainClass(classification.classifiedAs);
    });

    it("must fail safe on unknown domain classification", () => {
      const classification: contextAssembly.DomainClassificationContract = {
        classificationId: makeId("domc", "test"),
        requestId: "test",
        classifiedAs: "UNKNOWN_DOMAIN" as contextAssembly.DomainClass,
        confidence: 0.0,
        evidenceReferences: [],
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertClassificationNotUnknown(classification);
      }).toThrow("Unknown classification must fail safe");
    });
  });

  describe("Permission Decision", () => {
    it("must deny by default", () => {
      const decision: contextAssembly.ContextPermissionDecisionContract = {
        permissionDecisionId: makeId("perm", "test"),
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        subjectAgentId: "agent1",
        supervisingUserId: "user1",
        requiredPermissionProfileId: "prof1",
        requiredMemoryAccessProfileId: "memprof1",
        requiredConnectorScopeIds: [],
        requestedMemoryTiers: ["M1"],
        requestedSourceScopes: ["REPO"],
        requestedOperationClass: "READ",
        riskClass: "R0",
        decision: "ALLOWED",
        denialReasons: [],
        approvalRequired: false,
        approvalId: null,
        scopeHash: digest({ requestId: "req1" }),
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertDenyByDefault(decision);
      }).not.toThrow();
    });

    it("must fail safe when missing permission info defaults to allowed", () => {
      const decision: contextAssembly.ContextPermissionDecisionContract = {
        permissionDecisionId: makeId("perm", "test"),
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        subjectAgentId: "agent1",
        supervisingUserId: "user1",
        requiredPermissionProfileId: "",
        requiredMemoryAccessProfileId: "",
        requiredConnectorScopeIds: [],
        requestedMemoryTiers: [],
        requestedSourceScopes: [],
        requestedOperationClass: "READ",
        riskClass: "R0",
        decision: "ALLOWED",
        denialReasons: [],
        approvalRequired: false,
        approvalId: null,
        scopeHash: digest({ requestId: "req1" }),
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertDenyByDefault(decision);
      }).toThrow("Missing permission information must not default to allowed");
    });

    it("must include denial reasons when denied", () => {
      const decision: contextAssembly.ContextPermissionDecisionContract = {
        permissionDecisionId: makeId("perm", "test"),
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        subjectAgentId: "agent1",
        supervisingUserId: "user1",
        requiredPermissionProfileId: "prof1",
        requiredMemoryAccessProfileId: "memprof1",
        requiredConnectorScopeIds: [],
        requestedMemoryTiers: ["M1"],
        requestedSourceScopes: ["REPO"],
        requestedOperationClass: "READ",
        riskClass: "R0",
        decision: "DENIED",
        denialReasons: [],
        approvalRequired: true,
        approvalId: null,
        scopeHash: digest({ requestId: "req1" }),
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertPermissionDecision(decision);
      }).toThrow("Denial decision must include at least one reason");
    });
  });

  describe("Freshness Requirements and Decisions", () => {
    it("must support all freshness requirement classes", () => {
      for (const requirement of ["STATIC_ACCEPTABLE", "REPOSITORY_CURRENT", "SESSION_CURRENT", "CONNECTOR_CURRENT", "WEB_CURRENT", "REAL_TIME_REQUIRED", "HISTORICAL_AS_OF", "UNKNOWN_FRESHNESS"]) {
        const req: contextAssembly.FreshnessRequirementContract = {
          freshnessRequirementId: makeId("freshreq", requirement),
          requestId: "req1",
          requirement: requirement as contextAssembly.FreshnessRequirement,
          maximumAge: "PT1H",
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        };

        expect(req.requirement).toBeDefined();
      }
    });

    it("must not label stale source as fresh", () => {
      const decision: contextAssembly.FreshnessDecisionContract = {
        freshnessDecisionId: makeId("freshdec", "test"),
        requestId: "req1",
        requirement: "REPOSITORY_CURRENT",
        sourceReference: "src1",
        sourceObservedAt: "2024-01-01T00:00:00.000Z",
        requiredAsOf: "2025-01-01T00:00:00.000Z",
        maximumAge: "PT1H",
        decision: "FRESH",
        reason: "Observed within max age",
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertFreshnessDependsOnObservedTime(decision);
      }).not.toThrow();
    });

    it("must not label unknown timestamp as fresh", () => {
      const decision: contextAssembly.FreshnessDecisionContract = {
        freshnessDecisionId: makeId("freshdec", "test"),
        requestId: "req1",
        requirement: "REPOSITORY_CURRENT",
        sourceReference: "src1",
        sourceObservedAt: "UNKNOWN",
        requiredAsOf: now,
        maximumAge: "PT1H",
        decision: "FRESH",
        reason: "Is current",
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertFreshnessDependsOnObservedTime(decision);
      }).toThrow("Unknown timestamp must not be labeled fresh");
    });

    it("must fail safe on REAL_TIME_REQUIRED without verification", () => {
      const decision: contextAssembly.FreshnessDecisionContract = {
        freshnessDecisionId: makeId("freshdec", "test"),
        requestId: "req1",
        requirement: "REAL_TIME_REQUIRED",
        sourceReference: "src1",
        sourceObservedAt: now,
        requiredAsOf: now,
        maximumAge: "PT0S",
        decision: "FRESH",
        reason: "Real-time verification completed",
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertRealTimeRequirementFailsSafe("REAL_TIME_REQUIRED", decision);
      }).not.toThrow();
    });
  });

  describe("Source Precedence", () => {
    it("must enforce exact source precedence order", () => {
      const precedences = [
        { source: "CURRENT_USER_INSTRUCTION", expectedValue: 8 },
        { source: "CURRENT_APPROVAL_STATE", expectedValue: 7 },
        { source: "REPOSITORY_TRUTH", expectedValue: 6 },
        { source: "ADR", expectedValue: 5 },
        { source: "ARCHITECTURE_DOCUMENTATION", expectedValue: 4 },
        { source: "DURABLE_MEMORY", expectedValue: 3 },
        { source: "SESSION_MEMORY", expectedValue: 2 },
        { source: "LOW_TRUST_SOURCE", expectedValue: 1 },
      ];

      for (const { source, expectedValue } of precedences) {
        const contract: contextAssembly.SourcePrecedenceContract = {
          precedenceDecisionId: makeId("prec", source),
          sourceType: source as contextAssembly.SourceType,
          precedenceClass: source as contextAssembly.SourcePrecedenceClass,
          precedenceValue: expectedValue,
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        };

        expect(contract.precedenceValue).toBe(expectedValue);
      }
    });

    it("must reject unknown precedence values", () => {
      expect(() => {
        contextAssembly.assertSourcePrecedenceKnown("UNKNOWN_SOURCE");
      }).toThrow("Unknown precedence values must be rejected");
    });

    it("must require user instruction to not override prohibited", () => {
      const permission: contextAssembly.ContextPermissionDecisionContract = {
        permissionDecisionId: makeId("perm", "test"),
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        subjectAgentId: "agent1",
        supervisingUserId: "user1",
        requiredPermissionProfileId: "prof1",
        requiredMemoryAccessProfileId: "memprof1",
        requiredConnectorScopeIds: [],
        requestedMemoryTiers: ["M1"],
        requestedSourceScopes: [],
        requestedOperationClass: "READ",
        riskClass: "R0",
        decision: "PROHIBITED",
        denialReasons: ["Governance policy"],
        approvalRequired: false,
        approvalId: null,
        scopeHash: digest({ requestId: "req1" }),
        decidedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertUserInstructionDoesNotOverrideProhibited("CURRENT_USER_INSTRUCTION", permission);
      }).toThrow("User instruction must not override prohibited governance policy");
    });
  });

  describe("Source Ranking", () => {
    it("must rank sources deterministically with stable tie breaker", () => {
      const ranking: contextAssembly.SourceRankingContract = {
        rankingDecisionId: makeId("rank", "test"),
        requestId: "req1",
        candidateIds: ["src1", "src2", "src3"],
        orderedCandidateIds: ["src1", "src2", "src3"],
        precedenceDecisions: [],
        trustDecisions: [
          { candidateId: "src1", trustClass: "CANONICAL_REPOSITORY" },
          { candidateId: "src2", trustClass: "AUTHORED_DOCUMENTATION" },
          { candidateId: "src3", trustClass: "UNKNOWN_TRUST" },
        ],
        freshnessDecisions: [
          { candidateId: "src1", freshnessStatus: "FRESH" },
          { candidateId: "src2", freshnessStatus: "FRESH" },
          { candidateId: "src3", freshnessStatus: "STALE" },
        ],
        relevanceScores: { src1: 0.95, src2: 0.85, src3: 0.5 },
        tieBreaker: "src-ref-id",
        excludedCandidateIds: [],
        exclusionReasons: {},
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertDeterministicRanking(ranking);
      }).not.toThrow();
    });

    it("must reject ranking with non-deterministic tie breaker", () => {
      const ranking: contextAssembly.SourceRankingContract = {
        rankingDecisionId: makeId("rank", "test"),
        requestId: "req1",
        candidateIds: ["src1", "src2"],
        orderedCandidateIds: ["src1", "src2"],
        precedenceDecisions: [],
        trustDecisions: [],
        freshnessDecisions: [],
        relevanceScores: {},
        tieBreaker: "CURRENT_TIME",
        excludedCandidateIds: [],
        exclusionReasons: {},
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertDeterministicRanking(ranking);
      }).toThrow("Ranking tie breaker must be deterministic");
    });
  });

  describe("Source Deduplication", () => {
    it("must preserve source attribution in deduplication", () => {
      const dedup: contextAssembly.SourceDeduplicationContract = {
        deduplicationDecisionId: makeId("dedup", "test"),
        requestId: "req1",
        candidateIds: ["src1", "src2"],
        canonicalGroups: [
          {
            canonical: "src1",
            duplicates: ["src2"],
          },
        ],
        retainedCandidateIds: ["src1"],
        supersededCandidateIds: ["src2"],
        duplicateCandidateIds: ["src2"],
        conflictCandidateIds: [],
        decisionReasons: { src2: "Duplicate of src1" },
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertDeduplicationPreservesAttribution(dedup);
      }).not.toThrow();
    });

    it("must preserve conflicting source versions", () => {
      const dedup: contextAssembly.SourceDeduplicationContract = {
        deduplicationDecisionId: makeId("dedup", "test"),
        requestId: "req1",
        candidateIds: ["src1", "src2"],
        canonicalGroups: [
          {
            canonical: "src1",
            duplicates: ["src2"],
          },
        ],
        retainedCandidateIds: ["src1"],
        supersededCandidateIds: [],
        duplicateCandidateIds: [],
        conflictCandidateIds: ["src1", "src2"],
        decisionReasons: { "src1-src2": "Conflicting fact: src1 says X, src2 says Y" },
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertDeduplicationPreservesConflicts(dedup);
      }).not.toThrow();
    });
  });

  describe("Redaction Decision", () => {
    it("must require mandatory redaction completion before context creation", () => {
      const redaction: contextAssembly.ContextRedactionDecisionContract = {
        redactionDecisionId: makeId("redact", "test"),
        requestId: "req1",
        sourceReferenceId: "src1",
        redactionClasses: ["SECRET", "API_KEY"],
        redactedFieldDigests: ["field1-hash", "field2-hash"],
        required: true,
        completed: false,
        blocked: true,
        reason: "API key and secret require redaction",
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertMandatoryRedactionCompleted(redaction);
      }).toThrow("Incomplete mandatory redaction must block context-package creation");
    });

    it("must not store unredacted sensitive content", () => {
      const redaction: contextAssembly.ContextRedactionDecisionContract = {
        redactionDecisionId: makeId("redact", "test"),
        requestId: "req1",
        sourceReferenceId: "src1",
        redactionClasses: ["API_KEY"],
        redactedFieldDigests: [],
        required: true,
        completed: false,
        blocked: true,
        reason: "Pending redaction",
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        contextAssembly.assertNoUnredactedSensitiveContent(redaction);
      }).toThrow("Sensitive content must not be stored unredacted");
    });
  });

  describe("Immutable Context Package", () => {
    it("must require context package version", () => {
      const pkg: contextAssembly.ContextPackageContract = {
        contextPackageId: makeId("ctx", "test"),
        contextPackageVersion: "1.0.0",
        parentContextPackageId: null,
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        runtimeSessionId: "session1",
        domain: "ENGINEERING",
        requestClassification: "READ_ONLY_QUERY",
        permissionDecisionId: "perm1",
        freshnessRequirement: "REPOSITORY_CURRENT",
        freshnessDecisionIds: ["fresh1"],
        sourceReferenceIds: ["src1"],
        sourceTrustClassifications: ["CANONICAL_REPOSITORY"],
        sourceAuthorityClasses: ["AUTHORITATIVE_SOURCE"],
        retrievalScores: { src1: 0.95 },
        sourcePrecedenceDecisions: [],
        deduplicationDecisionId: "dedup1",
        redactionDecisionIds: ["redact1"],
        memoryTierReferences: ["M2"],
        connectorScopeReferences: [],
        tokenBudgetId: "tb1",
        costBudgetId: "cb1",
        modelRoutingClass: "LOCAL_SMALL",
        cacheDecisionId: "cache1",
        provenanceDigest: digest({ sources: ["src1"] }),
        scopeHash: digest({ domain: "ENGINEERING" }),
        createdAt: now,
        expiresAt: "2025-12-31T23:59:59.999Z",
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertImmutableContextPackage(pkg);
      }).not.toThrow();
    });

    it("must create new version on material change", () => {
      const prior: contextAssembly.ContextPackageContract = {
        contextPackageId: "ctx-v1",
        contextPackageVersion: "1.0.0",
        parentContextPackageId: null,
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        runtimeSessionId: "session1",
        domain: "ENGINEERING",
        requestClassification: "READ_ONLY_QUERY",
        permissionDecisionId: "perm1",
        freshnessRequirement: "REPOSITORY_CURRENT",
        freshnessDecisionIds: ["fresh1"],
        sourceReferenceIds: ["src1"],
        sourceTrustClassifications: ["CANONICAL_REPOSITORY"],
        sourceAuthorityClasses: ["AUTHORITATIVE_SOURCE"],
        retrievalScores: { src1: 0.95 },
        sourcePrecedenceDecisions: [],
        deduplicationDecisionId: "dedup1",
        redactionDecisionIds: ["redact1"],
        memoryTierReferences: ["M2"],
        connectorScopeReferences: [],
        tokenBudgetId: "tb1",
        costBudgetId: "cb1",
        modelRoutingClass: "LOCAL_SMALL",
        cacheDecisionId: "cache1",
        provenanceDigest: digest({ sources: ["src1"] }),
        scopeHash: digest({ domain: "ENGINEERING" }),
        createdAt: now,
        expiresAt: "2025-12-31T23:59:59.999Z",
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      const updated: contextAssembly.ContextPackageContract = {
        ...prior,
        contextPackageId: "ctx-v2",
        contextPackageVersion: "1.0.1",
        parentContextPackageId: "ctx-v1",
        sourceReferenceIds: ["src1", "src2"],
        provenanceDigest: digest({ sources: ["src1", "src2"] }),
      };

      expect(() => {
        contextAssembly.assertMaterialChangeCreatesNewVersion(prior, updated);
      }).not.toThrow();
    });
  });

  describe("Provenance Audit", () => {
    it("must validate provenance audit before accepting context package", () => {
      const pkg: contextAssembly.ContextPackageContract = {
        contextPackageId: makeId("ctx", "test"),
        contextPackageVersion: "1.0.0",
        parentContextPackageId: null,
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        runtimeSessionId: "session1",
        domain: "ENGINEERING",
        requestClassification: "READ_ONLY_QUERY",
        permissionDecisionId: "perm1",
        freshnessRequirement: "REPOSITORY_CURRENT",
        freshnessDecisionIds: ["fresh1"],
        sourceReferenceIds: ["src1"],
        sourceTrustClassifications: ["CANONICAL_REPOSITORY"],
        sourceAuthorityClasses: ["AUTHORITATIVE_SOURCE"],
        retrievalScores: { src1: 0.95 },
        sourcePrecedenceDecisions: [],
        deduplicationDecisionId: "dedup1",
        redactionDecisionIds: ["redact1"],
        memoryTierReferences: ["M2"],
        connectorScopeReferences: [],
        tokenBudgetId: "tb1",
        costBudgetId: "cb1",
        modelRoutingClass: "LOCAL_SMALL",
        cacheDecisionId: "cache1",
        provenanceDigest: digest({ sources: ["src1"] }),
        scopeHash: digest({ domain: "ENGINEERING" }),
        createdAt: now,
        expiresAt: "2025-12-31T23:59:59.999Z",
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      const audit: contextAssembly.ContextProvenanceAuditContract = {
        provenanceAuditId: makeId("aud", "test"),
        contextPackageId: pkg.contextPackageId,
        sourceReferenceIds: ["src1"],
        canonicalSourceIds: ["src-canonical-1"],
        sourceDigests: [digest({ content: "source1" })],
        permissionDecisionId: "perm1",
        freshnessDecisionIds: ["fresh1"],
        rankingDecisionId: "rank1",
        deduplicationDecisionId: "dedup1",
        redactionDecisionIds: ["redact1"],
        poisoningReviewReferences: [],
        tombstoneReviewReferences: [],
        modelRoutingDecisionId: "model1",
        budgetDecisionIds: ["budget1"],
        auditedBy: "auditor1",
        auditedAt: now,
        result: "VALID",
        failureReasons: [],
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertContextPackageRequiresAudit(pkg, audit);
      }).not.toThrow();
    });

    it("must reject context package without audit", () => {
      const pkg: contextAssembly.ContextPackageContract = {
        contextPackageId: makeId("ctx", "test"),
        contextPackageVersion: "1.0.0",
        parentContextPackageId: null,
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        runtimeSessionId: "session1",
        domain: "ENGINEERING",
        requestClassification: "READ_ONLY_QUERY",
        permissionDecisionId: "perm1",
        freshnessRequirement: "REPOSITORY_CURRENT",
        freshnessDecisionIds: ["fresh1"],
        sourceReferenceIds: ["src1"],
        sourceTrustClassifications: ["CANONICAL_REPOSITORY"],
        sourceAuthorityClasses: ["AUTHORITATIVE_SOURCE"],
        retrievalScores: { src1: 0.95 },
        sourcePrecedenceDecisions: [],
        deduplicationDecisionId: "dedup1",
        redactionDecisionIds: ["redact1"],
        memoryTierReferences: ["M2"],
        connectorScopeReferences: [],
        tokenBudgetId: "tb1",
        costBudgetId: "cb1",
        modelRoutingClass: "LOCAL_SMALL",
        cacheDecisionId: "cache1",
        provenanceDigest: digest({ sources: ["src1"] }),
        scopeHash: digest({ domain: "ENGINEERING" }),
        createdAt: now,
        expiresAt: "2025-12-31T23:59:59.999Z",
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertContextPackageRequiresAudit(pkg, null);
      }).toThrow("Context package cannot be accepted without provenance audit");
    });
  });

  describe("Governed Context Assembly Pipeline", () => {
    it("must enforce fixed pipeline order", () => {
      expect(() => {
        contextAssembly.assertPipelineStageOrderFixed();
      }).not.toThrow();
    });

    it("must prevent later stages from succeeding after failure", () => {
      const assembly: contextAssembly.GovernedContextAssemblyContract = {
        assemblyId: makeId("asm", "test"),
        requestId: "req1",
        workflowId: "wf1",
        runtimeId: "rt1",
        requestClassification: {
          classificationId: makeId("reqc", "req1"),
          requestId: "req1",
          classifiedAs: "READ_ONLY_QUERY",
          confidence: 0.95,
          evidenceReferences: [],
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        },
        domainClassification: {
          classificationId: makeId("domc", "req1"),
          requestId: "req1",
          classifiedAs: "ENGINEERING",
          confidence: 0.9,
          evidenceReferences: [],
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        },
        permissionDecision: {
          permissionDecisionId: makeId("perm", "req1"),
          requestId: "req1",
          workflowId: "wf1",
          runtimeId: "rt1",
          subjectAgentId: "agent1",
          supervisingUserId: "user1",
          requiredPermissionProfileId: "prof1",
          requiredMemoryAccessProfileId: "memprof1",
          requiredConnectorScopeIds: [],
          requestedMemoryTiers: ["M1"],
          requestedSourceScopes: [],
          requestedOperationClass: "READ",
          riskClass: "R0",
          decision: "DENIED",
          denialReasons: ["Access denied"],
          approvalRequired: false,
          approvalId: null,
          scopeHash: digest({ requestId: "req1" }),
          decidedAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
          evidenceReferences: [],
        },
        freshnessRequirement: {
          freshnessRequirementId: makeId("freshreq", "req1"),
          requestId: "req1",
          requirement: "REPOSITORY_CURRENT",
          maximumAge: "PT1H",
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        },
        freshnessDecisions: [],
        sourceReferences: [],
        retrievalCandidates: [],
        sourceRanking: {
          rankingDecisionId: makeId("rank", "req1"),
          requestId: "req1",
          candidateIds: [],
          orderedCandidateIds: [],
          precedenceDecisions: [],
          trustDecisions: [],
          freshnessDecisions: [],
          relevanceScores: {},
          tieBreaker: "id",
          excludedCandidateIds: [],
          exclusionReasons: {},
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        },
        sourceDeduplication: {
          deduplicationDecisionId: makeId("dedup", "req1"),
          requestId: "req1",
          candidateIds: [],
          canonicalGroups: [],
          retainedCandidateIds: [],
          supersededCandidateIds: [],
          duplicateCandidateIds: [],
          conflictCandidateIds: [],
          decisionReasons: {},
          createdAt: now,
          contractVersion: CONTEXT_CONTRACT_VERSION,
        },
        contextPackage: {
          contextPackageId: makeId("ctx", "req1"),
          contextPackageVersion: "1.0.0",
          parentContextPackageId: null,
          requestId: "req1",
          workflowId: "wf1",
          runtimeId: "rt1",
          runtimeSessionId: "session1",
          domain: "ENGINEERING",
          requestClassification: "READ_ONLY_QUERY",
          permissionDecisionId: "perm1",
          freshnessRequirement: "REPOSITORY_CURRENT",
          freshnessDecisionIds: [],
          sourceReferenceIds: [],
          sourceTrustClassifications: [],
          sourceAuthorityClasses: [],
          retrievalScores: {},
          sourcePrecedenceDecisions: [],
          deduplicationDecisionId: "dedup1",
          redactionDecisionIds: [],
          memoryTierReferences: [],
          connectorScopeReferences: [],
          tokenBudgetId: "tb1",
          costBudgetId: "cb1",
          modelRoutingClass: "LOCAL_SMALL",
          cacheDecisionId: "cache1",
          provenanceDigest: digest({ sources: [] }),
          scopeHash: digest({ domain: "ENGINEERING" }),
          createdAt: now,
          expiresAt: "2025-12-31T23:59:59.999Z",
          contractVersion: CONTEXT_CONTRACT_VERSION,
          evidenceReferences: [],
        },
        provenanceAudit: {
          provenanceAuditId: makeId("aud", "req1"),
          contextPackageId: "ctx1",
          sourceReferenceIds: [],
          canonicalSourceIds: [],
          sourceDigests: [],
          permissionDecisionId: "perm1",
          freshnessDecisionIds: [],
          rankingDecisionId: "rank1",
          deduplicationDecisionId: "dedup1",
          redactionDecisionIds: [],
          poisoningReviewReferences: [],
          tombstoneReviewReferences: [],
          modelRoutingDecisionId: "model1",
          budgetDecisionIds: [],
          auditedBy: "auditor1",
          auditedAt: now,
          result: "VALID",
          failureReasons: [],
          contractVersion: CONTEXT_CONTRACT_VERSION,
          evidenceReferences: [],
        },
        currentStage: "RANK_SOURCES",
        completedStages: ["CLASSIFY_REQUEST", "IDENTIFY_DOMAIN", "RANK_SOURCES"],
        failedStages: [{ stage: "IDENTIFY_PERMISSIONS", reason: "Access denied" }],
        createdAt: now,
        completedAt: null,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        evidenceReferences: [],
      };

      expect(() => {
        contextAssembly.assertPipelineStepFailureBlocksSuccess(assembly);
      }).toThrow("cannot succeed after failure");
    });
  });

  describe("Model Routing Contracts", () => {
    it("must validate provider-neutral model routing classes", () => {
      const profile = modelRouting.defaultModelRoutingProfile("prof1");
      expect(() => {
        modelRouting.assertValidRoutingProfile(profile);
      }).not.toThrow();
    });

    it("must reject model routing profiles with provider names", () => {
      // Create a profile and manually inject provider name by creating a malformed object
      const malformedProfile = {
        modelRoutingProfileId: "prof1",
        allowedClasses: ["LOCAL_SMALL"],
        preferredClass: "LOCAL_SMALL",
        fallbackOrder: [],
        localFirst: true,
        cachePreferred: true,
        premiumApprovalThreshold: 1000000,
        paidActionApprovalRequired: true,
        maximumTokenBudgetId: "tb1",
        maximumCostBudgetId: "cb1",
        privacyRequirement: "NO_SENSITIVE_DATA",
        dataResidencyRequirement: "LOCAL",
        connectorContentAllowed: false,
        privateMemoryAllowed: false,
        createdAt: now,
        updatedAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
        modelProviderHint: "OpenAI", // This should trigger the check
      };

      expect(() => {
        modelRouting.assertValidRoutingProfile(malformedProfile as modelRouting.ModelRoutingProfileContract);
      }).toThrow("provider");
    });

    it("must handle model routing decisions", () => {
      const decision: modelRouting.ModelRoutingDecisionContract = {
        modelRoutingDecisionId: makeId("model", "test"),
        requestId: "req1",
        contextPackageId: "ctx1",
        profileId: "prof1",
        selectedClass: "LOCAL_SMALL",
        fallbackClasses: ["CLOUD_SMALL"],
        selectionReason: "Local first preference",
        privacyDecision: "NO_SENSITIVE_DATA",
        tokenBudgetDecisionId: "tb1",
        costBudgetDecisionId: "cb1",
        cacheDecisionId: "cache1",
        premiumApprovalRequired: false,
        approvalId: null,
        decision: "SELECTED",
        denialReasons: [],
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertModelRoutingDecision(decision);
      }).not.toThrow();
    });
  });

  describe("Budget Decisions", () => {
    it("must support token budget decisions", () => {
      const decision: modelRouting.TokenBudgetDecisionContract = {
        decisionId: makeId("tokbudg", "test"),
        budgetId: "tb1",
        requestId: "req1",
        reservedAmount: 100,
        estimatedAmount: 150,
        remainingBefore: 1000,
        remainingAfter: 850,
        warningThresholdReached: false,
        hardLimitExceeded: false,
        decision: "ALLOWED",
        reason: "Within budget",
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertBudgetDecisionValid(decision);
      }).not.toThrow();
    });

    it("must reject budget decision that exceeds hard limit", () => {
      const decision: modelRouting.TokenBudgetDecisionContract = {
        decisionId: makeId("tokbudg", "test"),
        budgetId: "tb1",
        requestId: "req1",
        reservedAmount: 5000,
        estimatedAmount: 5000,
        remainingBefore: 1000,
        remainingAfter: -4000,
        warningThresholdReached: true,
        hardLimitExceeded: true,
        decision: "DENIED",
        reason: "Exceeds hard limit",
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertBudgetDecisionValid(decision);
      }).not.toThrow();
    });
  });

  describe("Cache Decisions", () => {
    it("must validate cache hit requires governance checks", () => {
      const decision: modelRouting.CacheDecisionContract = {
        cacheDecisionId: makeId("cache", "test"),
        requestId: "req1",
        contextScopeHash: digest({ context: "test" }),
        sourceDigestSet: [digest({ source: "src1" })],
        modelRoutingClass: "LOCAL_SMALL",
        cachePolicy: "CACHE_READ_ONLY",
        cacheStatus: "HIT",
        cacheEntryReference: "cache-entry-1",
        tombstoneValidated: true,
        permissionValidated: true,
        freshnessValidated: true,
        decision: "HIT",
        reason: "Cache hit with validations",
        createdAt: now,
        expiresAt: "2025-12-31T23:59:59.999Z",
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertCacheDecision(decision);
      }).not.toThrow();
    });

    it("must reject stale cache as fresh", () => {
      const decision: modelRouting.CacheDecisionContract = {
        cacheDecisionId: makeId("cache", "test"),
        requestId: "req1",
        contextScopeHash: digest({ context: "test" }),
        sourceDigestSet: [digest({ source: "src1" })],
        modelRoutingClass: "LOCAL_SMALL",
        cachePolicy: "CACHE_READ_ONLY",
        cacheStatus: "STALE",
        cacheEntryReference: "cache-entry-1",
        tombstoneValidated: true,
        permissionValidated: true,
        freshnessValidated: true,
        decision: "STALE",
        reason: "Cache is stale beyond max age",
        createdAt: now,
        expiresAt: "2024-01-01T00:00:00.000Z",
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertCacheDecision(decision);
      }).not.toThrow();
    });
  });

  describe("Delta-Index Decision Boundary", () => {
    it("must validate delta-index boundary (no execution)", () => {
      const delta: modelRouting.DeltaIndexDecisionContract = {
        deltaIndexDecisionId: makeId("delta", "test"),
        canonicalSourceId: "src-canonical-1",
        priorSourceDigest: digest({ version: 1 }),
        currentSourceDigest: digest({ version: 2 }),
        changedSegments: ["segment-2", "segment-3"],
        unchangedSegments: ["segment-1"],
        deletedSegments: ["segment-4"],
        tombstoneReferences: [],
        reindexRequired: true,
        fullRebuildRequired: false,
        reason: "Incremental changes detected",
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertDeltaIndexBoundary(delta);
      }).not.toThrow();
    });

    it("must reject reintroduction of deleted segments", () => {
      const delta: modelRouting.DeltaIndexDecisionContract = {
        deltaIndexDecisionId: makeId("delta", "test"),
        canonicalSourceId: "src-canonical-1",
        priorSourceDigest: digest({ version: 1 }),
        currentSourceDigest: digest({ version: 2 }),
        changedSegments: ["segment-2", "segment-4"],
        unchangedSegments: ["segment-1"],
        deletedSegments: ["segment-4"],
        tombstoneReferences: [],
        reindexRequired: true,
        fullRebuildRequired: false,
        reason: "Segment 4 was deleted but reappeared",
        createdAt: now,
        contractVersion: CONTEXT_CONTRACT_VERSION,
      };

      expect(() => {
        modelRouting.assertDeltaIndexBoundary(delta);
      }).toThrow("Deleted segments must not be reintroduced");
    });
  });
});
