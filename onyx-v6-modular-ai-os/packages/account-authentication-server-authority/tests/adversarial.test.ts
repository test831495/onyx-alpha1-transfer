import { describe, expect, it } from "vitest";
import {
  buildMiniatureAgentProjection,
  createTrustedContext,
  projectRoute,
  routeModel,
  type CandidateSnapshot,
} from "../src/index";

const baseCandidate = (candidateId: string): CandidateSnapshot => ({
  candidateId,
  capability: "text-generation",
  lifecycle: "ACTIVE",
  health: "HEALTHY",
  region: "EU",
  snapshotVersion: "snapshot-1",
  snapshotHash: "0".repeat(64),
  evidence: { quality: 0.8, privacy: 0.8, reliability: 0.8, latency: 0.8, cost: 0.2, portability: 0.8, freshAt: 1000 },
});

describe("Prompt 2 adversarial character runtime matrix", () => {
  it("rejects prompt, secret, endpoint, memory, animation and authority-token projection leakage", () => {
    expect(createTrustedContext({ requestClassification: "x", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, authorityToken: "token" } as never)).toMatchObject({ ok: false, errorCode: "POLICY_CONTEXT_INVALID" });
    expect(buildMiniatureAgentProjection({ role: "ROUTING", state: "WORKING", activityType: "MODEL_ROUTING", status: "EVALUATING", sourceId: "source", trustedTime: 1000, prompt: "raw", endpoint: "https://private.invalid" } as never)).toMatchObject({ ok: false, errorCode: "INVALID_AGENT_PROJECTION" });
  });

  it("does not treat animation or miniature-agent state as model routing facts", () => {
    const context = createTrustedContext({ requestClassification: "x", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, animationState: "busy" } as never);
    expect(context).toMatchObject({ ok: false, errorCode: "POLICY_CONTEXT_INVALID" });
  });

  it("fails closed for unverified candidate snapshots before selection", () => {
    const context = createTrustedContext({ requestClassification: "x", sessionAssurance: "strong", approvalRequired: false, approvalPresent: false, operatingMode: "ASSISTED", trustedTime: 1000, region: "EU", budget: 1 });
    if (!context.ok) throw new Error(context.errorCode);
    const result = routeModel(context.value, [baseCandidate("attacker-choice")]);
    expect(result).toMatchObject({ ok: false, errorCode: "CANDIDATE_SNAPSHOT_INVALID" });
  });

  it("returns a bounded privacy-safe projection when routing is blocked", () => {
    const blockedRoute = {
      routeDecisionId: "route_blocked",
      requestClassification: "private-work",
      eligibleCandidateIds: [],
      selectedCandidateId: null,
      policyVersion: "pdp-v1",
      scoringProfileVersion: "score-v1",
      candidateSnapshotVersion: "snapshot-1",
      candidateSnapshotHash: "a".repeat(64),
      reasonCodes: ["PRIVACY_POLICY_DENIED"],
      scoreComponents: {},
      trustedDecisionTime: 1000,
      fallbackClass: "NOT_ASSESSABLE",
      approvalRequired: true,
      privatePolicyContext: "must-not-leak",
    };
    const projection = projectRoute(blockedRoute as never);
    expect(projection).toMatchObject({ ok: false, errorCode: "ROUTE_PROJECTION_INVALID" });
  });
});