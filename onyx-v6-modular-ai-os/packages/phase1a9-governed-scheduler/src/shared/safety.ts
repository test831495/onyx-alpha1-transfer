export interface SchedulerSafetyProfile {
  mergeAllowed: false; productionDeployAllowed: false; forcePushAllowed: false; branchDeletionAllowed: false;
  secretAccessAllowed: false; permissionChangeAllowed: false; liveConnectorMutationAllowed: false;
  paidActionAllowed: false; liveMemoryMutationAllowed: false; liveModelInvocationAllowed: false;
  schedulerEnabled: false; multipleRuntimeLanesAllowed: false;
}

export const defaultSchedulerSafetyProfile = (): SchedulerSafetyProfile => ({
  mergeAllowed: false, productionDeployAllowed: false, forcePushAllowed: false, branchDeletionAllowed: false,
  secretAccessAllowed: false, permissionChangeAllowed: false, liveConnectorMutationAllowed: false,
  paidActionAllowed: false, liveMemoryMutationAllowed: false, liveModelInvocationAllowed: false,
  schedulerEnabled: false, multipleRuntimeLanesAllowed: false,
});

export function assertSchedulerSafetyProfile(profile: SchedulerSafetyProfile): void {
  if (Object.values(profile).some((value) => value !== false)) throw new Error("Wave 1 safety profile contains an enabled field.");
}