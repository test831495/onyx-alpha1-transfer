import { describe, expect, it } from "vitest";
import {
  assessEvidenceFreshness,
  normalizeAcceptanceFacts,
  normalizeCheckFacts,
  normalizeCollectedEnvelope,
  normalizePullRequestFacts,
  normalizeRepositoryFacts,
  normalizeReviewFacts,
  normalizeReviewThreadFacts,
  sha256,
} from "../src/post-h1/p2-evidence-normalization";
import {
  P2_ACCEPTANCE_IDS,
  P2_ACCEPTANCE_REGISTRY,
  validateP2AcceptanceCoverage,
} from "../src/post-h1/p2-acceptance-registry";

describe("Post-H1 P2 Bundle A Evidence Normalization & Contracts", () => {
  it("POSTH1-P2-COLLECT-001: normalizes raw evidence envelopes and calculates SHA-256 payload hash", () => {
    const raw = {
      source: {
        provider: "github",
        collectorId: "collector-01",
        version: "1.0.0",
        capturedAtEpochMilliseconds: 1772300000000,
      },
      rawFactType: "pull_request",
      rawPayload: '{"prNumber": 27, "title": "P1 Verification Engine"}',
    };

    const normalized = normalizeCollectedEnvelope(raw);
    expect(normalized.source.provider).toBe("github");
    expect(normalized.source.collectorId).toBe("collector-01");
    expect(normalized.rawFactType).toBe("pull_request");
    expect(normalized.payloadHash).toBe(sha256(raw.rawPayload));
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.source)).toBe(true);
  });

  it("POSTH1-P2-COLLECT-002: extracts provider-neutral pull request facts", () => {
    const rawRepo = {
      owner: "test831495",
      repository: "onyx-alpha1-transfer",
      defaultBranch: "main",
      currentHeadSha: "b4ea365eed6a4e71faabb9579004bb56567f2a46",
      isClean: true,
    };
    const normalizedRepo = normalizeRepositoryFacts(rawRepo);
    expect(normalizedRepo.owner).toBe("test831495");
    expect(normalizedRepo.currentHeadSha).toBe("b4ea365eed6a4e71faabb9579004bb56567f2a46");

    const rawPR = {
      prNumber: 27,
      state: "OPEN",
      headSha: "b4ea365eed6a4e71faabb9579004bb56567f2a46",
      baseBranch: "main",
      isDraft: false,
      title: "feat(factory): P1 verification engine",
    };
    const normalizedPR = normalizePullRequestFacts(rawPR);
    expect(normalizedPR.prNumber).toBe(27);
    expect(normalizedPR.state).toBe("OPEN");
    expect(normalizedPR.isDraft).toBe(false);
  });

  it("POSTH1-P2-COLLECT-003: normalizes review facts and thread states to closed schema", () => {
    const rawReview = {
      totalReviews: 2,
      approvedCount: 2,
      changesRequestedCount: 0,
      reviewState: "APPROVED",
    };
    const normalizedReview = normalizeReviewFacts(rawReview);
    expect(normalizedReview.reviewState).toBe("APPROVED");
    expect(normalizedReview.approvedCount).toBe(2);

    const rawThreads = {
      totalThreads: 3,
      resolvedThreads: 3,
      unresolvedThreads: 0,
      canResolveAll: true,
    };
    const normalizedThreads = normalizeReviewThreadFacts(rawThreads);
    expect(normalizedThreads.resolvedThreads).toBe(3);
    expect(normalizedThreads.unresolvedThreads).toBe(0);
  });

  it("POSTH1-P2-COLLECT-004: maps check status facts to SUCCESS, FAILURE, or PENDING", () => {
    const rawChecksSuccess = {
      totalChecks: 5,
      passedChecks: 5,
      failedChecks: 0,
      pendingChecks: 0,
      overallStatus: "SUCCESS",
    };
    const normalizedSuccess = normalizeCheckFacts(rawChecksSuccess);
    expect(normalizedSuccess.overallStatus).toBe("SUCCESS");

    const rawChecksFailure = {
      totalChecks: 5,
      passedChecks: 4,
      failedChecks: 1,
      pendingChecks: 0,
      overallStatus: "FAILURE",
    };
    const normalizedFailure = normalizeCheckFacts(rawChecksFailure);
    expect(normalizedFailure.overallStatus).toBe("FAILURE");
  });

  it("POSTH1-P2-COLLECT-005: validates acceptance coverage completeness", () => {
    const coverage = validateP2AcceptanceCoverage(P2_ACCEPTANCE_IDS);
    expect(coverage.coverageComplete).toBe(true);
    expect(coverage.missingIds).toHaveLength(0);

    const partialCoverage = validateP2AcceptanceCoverage(["POSTH1-P2-COLLECT-001"]);
    expect(partialCoverage.coverageComplete).toBe(false);
    expect(partialCoverage.missingIds.length).toBe(23);

    const normalizedAcceptance = normalizeAcceptanceFacts({
      totalRequiredIds: 24,
      validatedIds: 24,
      missingIds: [],
      coverageComplete: true,
    });
    expect(normalizedAcceptance.coverageComplete).toBe(true);
  });

  it("POSTH1-P2-COLLECT-006: evaluates evidence freshness with explicit supplied timestamp", () => {
    const freshnessValid = assessEvidenceFreshness(1772300000000, 86400000);
    expect(freshnessValid.isFresh).toBe(true);
    expect(freshnessValid.observedAtEpochMilliseconds).toBe(1772300000000);

    const freshnessInvalid = assessEvidenceFreshness(0, 86400000);
    expect(freshnessInvalid.isFresh).toBe(false);
  });

  it("POSTH1-P2-SAFE-001: verifies acceptance registry contains exactly 24 IDs across 4 families", () => {
    expect(P2_ACCEPTANCE_IDS).toHaveLength(24);
    expect(P2_ACCEPTANCE_REGISTRY).toHaveLength(24);
  });

  it("POSTH1-P2-SAFE-002: verifies pure-core normalization has zero side effects", () => {
    const initialRaw = {
      source: {
        provider: "github",
        collectorId: "col-1",
        version: "1.0",
        capturedAtEpochMilliseconds: 1000,
      },
      rawFactType: "pr",
      rawPayload: "test",
    };
    const result1 = normalizeCollectedEnvelope(initialRaw);
    const result2 = normalizeCollectedEnvelope(initialRaw);
    expect(result1).toEqual(result2);
  });

  it("POSTH1-P2-SAFE-004: protects against null prototypes, throwing proxies, and hostile getters", () => {
    // Null prototype
    const nullProtoObj = Object.create(null);
    nullProtoObj.owner = "test831495";
    nullProtoObj.repository = "onyx-alpha1-transfer";
    nullProtoObj.defaultBranch = "main";
    nullProtoObj.currentHeadSha = "b4ea365eed6a4e71faabb9579004bb56567f2a46";
    nullProtoObj.isClean = true;

    const normNullProto = normalizeRepositoryFacts(nullProtoObj);
    expect(normNullProto.owner).toBe("test831495");

    // Throwing getter proxy
    const throwingProxy = new Proxy(
      {},
      {
        get() {
          throw new Error("HOSTILE_GETTER_EXPLOIT");
        },
        ownKeys() {
          throw new Error("HOSTILE_OWNKEYS_EXPLOIT");
        },
      }
    );
    expect(() => normalizeCollectedEnvelope(throwingProxy)).toThrow("INVALID_ENVELOPE_INPUT");

    // Closed schema rejection for non-object
    expect(() => normalizeRepositoryFacts(12345)).toThrow("INVALID_REPOSITORY_FACTS");
  });
});
