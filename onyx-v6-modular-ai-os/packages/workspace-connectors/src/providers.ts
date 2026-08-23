import type { WorkspaceProviderSnapshot } from "@onyx/workspace-contracts";
export const plannedProviderSnapshots = (): WorkspaceProviderSnapshot[] => [
 { provider:"google", label:"Google", state:"unconfigured", diagnostic:"Google connection is planned after Microsoft foundation acceptance.", capabilities:[{id:"profile",label:"Google profile",enabled:false,plannedRelease:"Alpha 3.1.2"},{id:"mail",label:"Gmail",enabled:false,plannedRelease:"Alpha 3.1.2"},{id:"calendar",label:"Google Calendar",enabled:false,plannedRelease:"Alpha 3.1.1"},{id:"files",label:"Google Drive",enabled:false,plannedRelease:"Future"}] },
 { provider:"yahoo", label:"Yahoo", state:"unconfigured", diagnostic:"Yahoo Mail connection is planned for the email intelligence release.", capabilities:[{id:"profile",label:"Yahoo profile",enabled:false,plannedRelease:"Alpha 3.1.2"},{id:"mail",label:"Yahoo Mail",enabled:false,plannedRelease:"Alpha 3.1.2"}] },
];
