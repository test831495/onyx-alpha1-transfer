export interface GovernedSafetyFlags {
  mergeAllowed: false;
  productionDeployAllowed: false;
  forcePushAllowed: false;
  branchDeletionAllowed: false;
  secretAccessAllowed: false;
  permissionChangeAllowed: false;
  liveConnectorMutationAllowed: false;
  paidActionAllowed: false;
}

export function defaultGovernedSafetyFlags(): GovernedSafetyFlags {
  return {
    mergeAllowed: false,
    productionDeployAllowed: false,
    forcePushAllowed: false,
    branchDeletionAllowed: false,
    secretAccessAllowed: false,
    permissionChangeAllowed: false,
    liveConnectorMutationAllowed: false,
    paidActionAllowed: false,
  };
}

/** Substrings that must never appear in Phase 1A.8 source: no arbitrary command, shell, or live-write surface. */
export const PROHIBITED_CAPABILITY_SURFACES = [
  "child_process",
  "execSync",
  "execFileSync",
  "spawnSync",
  "octokit",
  "shellExec",
  "execShell",
  "runCommand(",
  "executeCommand(",
] as const;

export function assertNoProhibitedSurface(sourceText: string, fileLabel: string): void {
  for (const surface of PROHIBITED_CAPABILITY_SURFACES) {
    if (sourceText.includes(surface)) {
      throw new Error(`Prohibited surface "${surface}" found in ${fileLabel}.`);
    }
  }
}
