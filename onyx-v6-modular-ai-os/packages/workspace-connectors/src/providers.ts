import type { WorkspaceProviderSnapshot } from "@onyx/workspace-contracts";

export const googleDisconnectedProviderSnapshot = (): WorkspaceProviderSnapshot => ({
	provider: "google",
	label: "Google",
	state: "disconnected",
	diagnostic: "Google is not connected. Connect Google to check read-only Calendar, Gmail, and Drive access.",
	capabilities: [
		{ id: "profile", label: "Google profile", enabled: false },
		{ id: "mail", label: "Gmail", enabled: false },
		{ id: "calendar", label: "Google Calendar", enabled: false },
		{ id: "files", label: "Google Drive", enabled: false },
	],
});

export const plannedProviderSnapshots = (): WorkspaceProviderSnapshot[] => [
 googleDisconnectedProviderSnapshot(),
 { provider:"yahoo", label:"Yahoo", state:"unconfigured", diagnostic:"Yahoo Mail connection is planned for the email intelligence release.", capabilities:[{id:"profile",label:"Yahoo profile",enabled:false,plannedRelease:"Alpha 3.1.2"},{id:"mail",label:"Yahoo Mail",enabled:false,plannedRelease:"Alpha 3.1.2"}] },
];
