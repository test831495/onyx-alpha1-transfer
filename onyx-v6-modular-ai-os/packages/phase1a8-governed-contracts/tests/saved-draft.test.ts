import { describe, expect, it } from "vitest";
import {
  assertApprovalInvalidatedAfterMaterialDraftChange,
  assertDeletionBoundary,
  assertDraftExportPermitted,
  assertDraftLifecycleTransition,
  assertDraftResumeAllowed,
  assertDraftSupersession,
  assertValidDraftVersion,
  classifyDraftScopeChange,
  createDraftVersion,
  createSavedDraftLifecycle,
  evaluateDraftResumeAndUpdate,
  materialDraftScope,
  sameScopeDraftUpdate,
} from "../src/track-b/saved-draft";

describe("Wave 3D Saved Draft lifecycle contracts", () => {
  it("enforces lifecycle transitions and version history", () => {
    const draft = createSavedDraftLifecycle({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      supervisingUserId: "user-7",
      objective: "ship fix",
      scopeHash: "scope-v1",
      status: "DRAFT",
      evidenceReferences: ["ev-1"],
    });

    expect(() => assertDraftLifecycleTransition("DRAFT", "SAVED")).not.toThrow();
    expect(() => assertDraftLifecycleTransition("DRAFT", "APPROVED" as any)).toThrow();
    expect(() => assertDraftLifecycleTransition("DELETED", "RESUMED")).toThrow();

    const version1 = createDraftVersion({
      draftId: draft.draftId,
      versionNumber: 1,
      objectiveDigest: "obj-1",
      planDigest: "plan-1",
      contentDigest: "content-1",
      scopeHash: "scope-v1",
      createdBy: "user-7",
      approvalId: "approval-1",
      approvalValid: true,
      evidenceReferences: ["ev-1"],
    });
    const version2 = createDraftVersion({
      draftId: draft.draftId,
      versionNumber: 2,
      parentVersionId: version1.draftVersionId,
      objectiveDigest: "obj-2",
      planDigest: "plan-2",
      contentDigest: "content-2",
      scopeHash: "scope-v2",
      createdBy: "user-7",
      approvalId: "approval-2",
      approvalValid: true,
      evidenceReferences: ["ev-2"],
    });
    expect(version1.versionNumber).toBeLessThan(version2.versionNumber);
    expect(() => assertValidDraftVersion({ ...version1, versionNumber: 0, parentVersionId: undefined })).toThrow();
  });

  it("detects no-change, minor, and material draft scope changes deterministically", () => {
    const base = {
      objective: "ship fix",
      files: ["src/app.ts"],
      actions: ["edit"],
      tools: ["typescript"],
      branch: "feature/alpha",
      targetEnvironment: "dev",
      externalSystems: ["github"],
      connectorProvider: "Outlook",
      connectorAccount: "acct-1",
      permissionScope: ["repo:read"],
      memoryAccessScope: ["task"],
      modelRoutingClass: "LOCAL",
      tokenBudget: 100,
      costBudget: 5,
      taskDependencySet: ["t-1"],
      riskClass: "R2",
      promotionEligibility: true,
      policyPinnedAgentIdentity: "onyx-agent",
    };

    expect(classifyDraftScopeChange(base, base)).toBe("NO_CHANGE");
    expect(classifyDraftScopeChange({ ...base, objective: "ship fix plus docs" }, base)).toBe("MINOR_EDIT");
    expect(classifyDraftScopeChange({ ...base, branch: "feature/beta" }, base)).toBe("MATERIAL_SCOPE_CHANGE");
    expect(classifyDraftScopeChange({ ...base, connectorAccount: "acct-2" }, base)).toBe("MATERIAL_SCOPE_CHANGE");
    expect(classifyDraftScopeChange({ ...base, targetEnvironment: "prod" }, base)).toBe("MATERIAL_SCOPE_CHANGE");
    expect(classifyDraftScopeChange({ ...base, riskClass: "R3" }, base)).toBe("MATERIAL_SCOPE_CHANGE");
  });

  it("supports same-scope updates and material-change versioning without creating a second draft", () => {
    const draft = createSavedDraftLifecycle({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      supervisingUserId: "user-7",
      objective: "ship fix",
      scopeHash: "scope-v1",
      status: "RESUMED",
      evidenceReferences: ["ev-1"],
    });
    const version1 = createDraftVersion({
      draftId: draft.draftId,
      versionNumber: 1,
      objectiveDigest: "obj-1",
      planDigest: "plan-1",
      contentDigest: "content-1",
      scopeHash: draft.scopeHash,
      createdBy: "user-7",
      approvalId: "approval-1",
      approvalValid: true,
      evidenceReferences: ["ev-1"],
    });

    const sameScope = sameScopeDraftUpdate({
      draft,
      currentVersion: version1,
      expectedVersionNumber: 1,
      nextScopeHash: draft.scopeHash,
      nextObjective: "ship fix",
      nextEvidenceReferences: ["ev-1"],
    });
    expect(sameScope.updatesCurrentDraft).toBe(true);
    expect(sameScope.draftId).toBe(draft.draftId);

    const material = materialDraftScope({
      draft,
      currentVersion: version1,
      nextScopeHash: "scope-v2",
      nextObjective: "ship fix for release",
      nextEvidenceReferences: ["ev-2"],
    });
    expect(material.createsNewVersion).toBe(true);
    expect(material.draftId).toBe(draft.draftId);
    expect(material.nextVersionNumber).toBeGreaterThan(version1.versionNumber);

    expect(() => assertApprovalInvalidatedAfterMaterialDraftChange(version1, {
      scopeHash: "scope-v2",
      branch: "feature/beta",
      targetEnvironment: "prod",
      externalSystems: ["github", "discord"],
      connectorAccount: "acct-2",
      permissionScope: ["repo:write"],
      memoryAccessScope: ["session"],
      modelRoutingClass: "REMOTE",
      tokenBudget: 500,
      costBudget: 50,
      taskDependencySet: ["t-1", "t-2"],
      riskClass: "R3",
      promotionEligibility: false,
      policyPinnedAgentIdentity: "nova-agent",
    } as any)).not.toThrow();
  });

  it("keeps supersession and deletion/export boundaries explicit and safe", () => {
    const draft = createSavedDraftLifecycle({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      supervisingUserId: "user-7",
      objective: "ship fix",
      scopeHash: "scope-v1",
      status: "SUPERSEDED",
      evidenceReferences: ["ev-1"],
    });
    const priorVersion = createDraftVersion({
      draftId: draft.draftId,
      versionNumber: 1,
      objectiveDigest: "obj-1",
      planDigest: "plan-1",
      contentDigest: "content-1",
      scopeHash: "scope-v1",
      createdBy: "user-7",
      approvalId: "approval-1",
      approvalValid: true,
      evidenceReferences: ["ev-1"],
    });
    const replacementVersion = createDraftVersion({
      draftId: draft.draftId,
      versionNumber: 2,
      parentVersionId: priorVersion.draftVersionId,
      objectiveDigest: "obj-2",
      planDigest: "plan-2",
      contentDigest: "content-2",
      scopeHash: "scope-v2",
      createdBy: "user-7",
      approvalId: "approval-2",
      approvalValid: true,
      evidenceReferences: ["ev-2"],
    });

    expect(() => assertDraftSupersession({
      supersessionId: "sup-1",
      draftId: draft.draftId,
      priorVersionId: priorVersion.draftVersionId,
      replacementVersionId: replacementVersion.draftVersionId,
      reason: "material scope change",
      scopeChangeClassification: "MATERIAL_SCOPE_CHANGE",
      authorizedBy: "user-7",
      effectiveAt: "2026-01-02T00:00:00.000Z",
      status: "APPLIED",
      evidenceReferences: ["ev-1", "ev-2"],
      contractVersion: "1.0.0",
    })).not.toThrow();

    expect(() => assertDeletionBoundary({
      requestedBy: "user-7",
      permission: true,
      scopeValidated: true,
      auditReference: "audit-1",
      evidenceReference: "ev-1",
      nonProduction: true,
      activeGovernedExecutionDependency: false,
    })).not.toThrow();
    expect(() => assertDeletionBoundary({
      requestedBy: "user-7",
      permission: false,
      scopeValidated: true,
      auditReference: "audit-1",
      evidenceReference: "ev-1",
      nonProduction: true,
      activeGovernedExecutionDependency: false,
    })).toThrow();

    expect(() => assertDraftExportPermitted({
      permission: true,
      redactionDecision: "REDACTED",
      provenanceReferences: ["prov-1"],
      versionHistoryPolicy: "INCLUDE",
      content: "safe summary",
    })).not.toThrow();
    expect(() => assertDraftExportPermitted({
      permission: true,
      redactionDecision: "REDACTED",
      provenanceReferences: ["prov-1"],
      versionHistoryPolicy: "INCLUDE",
      content: "secret: password",
    })).toThrow();
  });

  it("resumes only eligible drafts and ensures the E.9.2 gap is closed by contract", () => {
    const draft = createSavedDraftLifecycle({
      workflowId: "wf-1",
      runtimeId: "rt-1",
      supervisingUserId: "user-7",
      objective: "ship fix",
      scopeHash: "scope-v1",
      status: "SAVED",
      evidenceReferences: ["ev-1"],
    });
    const version1 = createDraftVersion({
      draftId: draft.draftId,
      versionNumber: 1,
      objectiveDigest: "obj-1",
      planDigest: "plan-1",
      contentDigest: "content-1",
      scopeHash: "scope-v1",
      createdBy: "user-7",
      approvalId: "approval-1",
      approvalValid: true,
      evidenceReferences: ["ev-1"],
    });

    expect(() => assertDraftResumeAllowed({
      draft,
      versionChainValid: true,
      permissionsValid: true,
      scopeAccessible: true,
      provenanceValid: true,
      notDeleted: true,
      notSuperseded: true,
    })).not.toThrow();

    expect(() => assertDraftResumeAllowed({
      draft: { ...draft, status: "DELETED" },
      versionChainValid: true,
      permissionsValid: true,
      scopeAccessible: true,
      provenanceValid: true,
      notDeleted: false,
      notSuperseded: true,
    })).toThrow();

    const decision = evaluateDraftResumeAndUpdate({
      draft,
      currentVersion: version1,
      expectedVersionNumber: 1,
      nextScopeHash: "scope-v1",
      nextObjective: "ship fix",
      nextEvidenceReferences: ["ev-1"],
      approvalStatus: "VALID",
      scopeComparison: "NO_CHANGE",
    });
    expect(decision.action).toBe("UPDATE_CURRENT_VERSION");
    expect(decision.draftId).toBe(draft.draftId);
  });
});
