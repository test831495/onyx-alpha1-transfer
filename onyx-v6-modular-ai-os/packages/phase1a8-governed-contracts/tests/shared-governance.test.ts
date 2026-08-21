import { describe, expect, it } from "vitest";
import { RISK_CLASSES, isActionPermitted, assertNotProhibited, requiresFreshApproval } from "../src/shared/risk-classes";
import {
  PARALLEL_SAFETY_CLASSES,
  assertParallelSafetyClass,
  isUnconditionallyParallelSafe,
  isConditionallyParallelSafe,
  requiresSequentialLock,
} from "../src/shared/parallel-safety";
import {
  EARLY_PARALLEL_LIMIT,
  POST_CONTRACT_FREEZE_LIMIT,
  ALPHA_STABLE_LIMIT,
  STABILIZATION_LIMIT,
  PROMOTION_LANE_LIMIT,
  assertActiveRuntimeLimitFrozen,
} from "../src/shared/lane-roadmap";
import {
  classifyMaterialChange,
  isApprovalInvalidated,
  isApprovalExpired,
  assertFreshApproval,
  extractApprovalScope,
  type ApprovalPolicy,
} from "../src/shared/approval";
import { isCapabilityPermitted, isRiskClassPermitted, defaultDenyAllPermissionProfile } from "../src/shared/permission";
import {
  CONNECTOR_PROVIDERS,
  assertConnectorProvider,
  assertNoMergedIdentity,
  defaultConnectorScope,
  CROSS_ACCOUNT_INFERENCE_PERMITTED,
} from "../src/shared/connector-scope";
import { classifyTokenBudgetStatus, classifyCostBudgetStatus, assertBudgetNotExceeded, defaultTokenBudget } from "../src/shared/budgets";

function basePolicy(overrides: Partial<ApprovalPolicy> = {}): ApprovalPolicy {
  return {
    scopeHash: "hash-1",
    approvalId: "approval-1",
    workflowId: "workflow-1",
    policyVersion: "1.0.0",
    riskClass: "R2",
    approvedActions: ["CREATE_ISSUE"],
    approvedTools: ["github"],
    approvedFiles: ["README.md"],
    approvedBranch: "feature/x",
    approvedTargetEnvironment: "local",
    approvedExternalSystems: [],
    approvedConnectorScopes: [],
    approvedPermissionScopes: [],
    approvedMemoryScopes: [],
    approvedModelRoutingClasses: ["LOCAL_SMALL"],
    approvedTokenBudget: 1000,
    approvedCostBudget: 0,
    taskDependencyIds: [],
    promotionEligible: false,
    approvalReason: "test",
    issuedAt: "2026-08-21T00:00:00.000Z",
    expiresAt: "2026-08-22T00:00:00.000Z",
    consumedState: "UNCONSUMED",
    approverId: "Rahul Kumar",
    evidenceReferences: [],
    ...overrides,
  };
}

describe("risk classes", () => {
  it("defines exactly R0 through R5", () => {
    expect(RISK_CLASSES).toEqual(["R0", "R1", "R2", "R3", "R4", "R5"]);
  });

  it("rejects R5 even when the caller claims a fresh approval", () => {
    expect(isActionPermitted("R5", true)).toBe(false);
    expect(() => assertNotProhibited("R5")).toThrow();
  });

  it("requires a fresh approval for R4 only", () => {
    expect(requiresFreshApproval("R4")).toBe(true);
    expect(requiresFreshApproval("R2")).toBe(false);
    expect(isActionPermitted("R4", false)).toBe(false);
    expect(isActionPermitted("R4", true)).toBe(true);
  });

  it("permits R0 through R3 without a fresh-approval check", () => {
    for (const riskClass of ["R0", "R1", "R2", "R3"] as const) {
      expect(isActionPermitted(riskClass, false)).toBe(true);
    }
  });
});

describe("parallel-safety classes", () => {
  it("declares exactly the 15 approved classes", () => {
    expect(PARALLEL_SAFETY_CLASSES).toHaveLength(15);
  });

  it("rejects unknown classes instead of defaulting to parallel-safe", () => {
    expect(() => assertParallelSafetyClass("NOT_A_REAL_CLASS")).toThrow();
  });

  it("only recognizes the six unconditional read/analysis classes as parallel-safe", () => {
    expect(isUnconditionallyParallelSafe("READ_ONLY_PARALLEL_SAFE")).toBe(true);
    expect(isUnconditionallyParallelSafe("SEQUENTIAL_GITHUB_MUTATION")).toBe(false);
  });

  it("treats context and connector-read classes as conditional, not unconditional", () => {
    expect(isConditionallyParallelSafe("CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL")).toBe(true);
    expect(isUnconditionallyParallelSafe("CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL")).toBe(false);
  });

  it("requires a sequential lock for every SEQUENTIAL_* class and the promotion-only class", () => {
    expect(requiresSequentialLock("SEQUENTIAL_CHECKPOINT_REQUIRED")).toBe(true);
    expect(requiresSequentialLock("PROTECTED_PROMOTION_ONLY")).toBe(true);
    expect(requiresSequentialLock("READ_ONLY_PARALLEL_SAFE")).toBe(false);
  });
});

describe("lane roadmap", () => {
  it("freezes the exact lane-limit constants", () => {
    expect(EARLY_PARALLEL_LIMIT).toBe(4);
    expect(POST_CONTRACT_FREEZE_LIMIT).toBe(6);
    expect(ALPHA_STABLE_LIMIT).toBe(8);
    expect(STABILIZATION_LIMIT).toBe(2);
    expect(PROMOTION_LANE_LIMIT).toBe(1);
  });

  it("rejects any attempt to report an active runtime limit other than 1", () => {
    expect(() => assertActiveRuntimeLimitFrozen(1)).not.toThrow();
    expect(() => assertActiveRuntimeLimitFrozen(4)).toThrow();
  });
});

describe("approval material-change invalidation", () => {
  it("detects a file-scope change", () => {
    const prior = extractApprovalScope(basePolicy());
    const next = extractApprovalScope(basePolicy({ approvedFiles: ["README.md", "other.md"] }));
    expect(classifyMaterialChange(prior, next)).toContain("files");
  });

  it("detects a risk-class change and a promotion-eligibility change independently", () => {
    const prior = extractApprovalScope(basePolicy());
    const next = extractApprovalScope(basePolicy({ riskClass: "R4", promotionEligible: true }));
    const changes = classifyMaterialChange(prior, next);
    expect(changes).toContain("riskClass");
    expect(changes).toContain("promotionEligibility");
  });

  it("reports no material change when the scope is identical", () => {
    const prior = extractApprovalScope(basePolicy());
    const next = extractApprovalScope(basePolicy());
    expect(isApprovalInvalidated(prior, next)).toBe(false);
  });

  it("treats a re-ordered but identical file list as unchanged", () => {
    const prior = extractApprovalScope(basePolicy({ approvedFiles: ["a.md", "b.md"] }));
    const next = extractApprovalScope(basePolicy({ approvedFiles: ["b.md", "a.md"] }));
    expect(isApprovalInvalidated(prior, next)).toBe(false);
  });
});

describe("approval freshness and expiry", () => {
  it("expires an approval past its expiresAt timestamp", () => {
    const policy = basePolicy({ expiresAt: "2026-08-21T00:00:00.000Z" });
    expect(isApprovalExpired(policy, new Date("2026-08-21T00:00:01.000Z"))).toBe(true);
  });

  it("always rejects R5 in assertFreshApproval regardless of consumed/expiry state", () => {
    const policy = basePolicy({ riskClass: "R5", expiresAt: "2099-01-01T00:00:00.000Z" });
    expect(() => assertFreshApproval(policy, new Date("2026-08-21T00:00:00.000Z"), 60000)).toThrow();
  });

  it("rejects a stale R4 approval and accepts a fresh one", () => {
    const stale = basePolicy({ riskClass: "R4", issuedAt: "2026-08-20T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z" });
    expect(() => assertFreshApproval(stale, new Date("2026-08-21T00:00:00.000Z"), 60000)).toThrow();

    const fresh = basePolicy({ riskClass: "R4", issuedAt: "2026-08-21T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z" });
    expect(() => assertFreshApproval(fresh, new Date("2026-08-21T00:00:00.500Z"), 60000)).not.toThrow();
  });
});

describe("per-agent permission profile", () => {
  it("denies every capability by default", () => {
    const profile = defaultDenyAllPermissionProfile("agent-1", "profile-1");
    expect(isCapabilityPermitted(profile, "ANY_CAPABILITY")).toBe(false);
  });

  it("permits only an explicitly allowlisted, non-denylisted capability", () => {
    const profile = defaultDenyAllPermissionProfile("agent-1", "profile-1");
    profile.capabilityAllowlist.push("READ_EVIDENCE");
    expect(isCapabilityPermitted(profile, "READ_EVIDENCE")).toBe(true);
    profile.capabilityDenylist.push("READ_EVIDENCE");
    expect(isCapabilityPermitted(profile, "READ_EVIDENCE")).toBe(false);
  });

  it("bounds risk-class eligibility to the profile limit and never permits R5", () => {
    const profile = defaultDenyAllPermissionProfile("agent-1", "profile-1");
    profile.riskClassLimit = "R2";
    expect(isRiskClassPermitted(profile, "R1")).toBe(true);
    expect(isRiskClassPermitted(profile, "R3")).toBe(false);
    expect(isRiskClassPermitted(profile, "R5")).toBe(false);
  });
});

describe("connector account isolation", () => {
  it("recognizes exactly the seven approved providers", () => {
    expect(CONNECTOR_PROVIDERS).toEqual(["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive", "UNKNOWN"]);
  });

  it("rejects an unknown connector provider", () => {
    expect(() => assertConnectorProvider("Dropbox")).toThrow();
  });

  it("never permits cross-account authority inference", () => {
    expect(CROSS_ACCOUNT_INFERENCE_PERMITTED).toBe(false);
  });

  it("rejects merging account identity across two different providers", () => {
    const outlook = defaultConnectorScope("scope-1", "Outlook", "shared-account");
    const gmail = defaultConnectorScope("scope-2", "Gmail", "shared-account");
    expect(() => assertNoMergedIdentity(outlook, gmail)).toThrow();
  });
});

describe("token and cost budgets", () => {
  it("classifies budget status from consumed and reserved usage", () => {
    const budget = defaultTokenBudget("budget-1", "workflow-1", "runtime-1", 1000);
    expect(classifyTokenBudgetStatus(budget)).toBe("UNDER_BUDGET");
    expect(classifyTokenBudgetStatus({ ...budget, consumedTokens: 999 })).toBe("AT_BUDGET");
    expect(classifyTokenBudgetStatus({ ...budget, consumedTokens: 1000 })).toBe("OVER_BUDGET");
  });

  it("fails safe by rejecting any action once a budget is over its hard limit", () => {
    expect(() => assertBudgetNotExceeded("OVER_BUDGET")).toThrow();
    expect(() => assertBudgetNotExceeded("UNDER_BUDGET")).not.toThrow();
  });

  it("classifies cost-budget status the same way as token-budget status", () => {
    expect(classifyCostBudgetStatus({ actualCost: 5, reservedCost: 0, hardLimit: 10, warningThreshold: 8 })).toBe("UNDER_BUDGET");
    expect(classifyCostBudgetStatus({ actualCost: 10, reservedCost: 0, hardLimit: 10, warningThreshold: 8 })).toBe("OVER_BUDGET");
  });
});
