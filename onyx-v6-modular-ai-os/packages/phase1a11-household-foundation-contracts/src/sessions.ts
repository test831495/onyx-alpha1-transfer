export type SessionAssurance = "current" | "stale" | "revoked" | "expired" | "not_verified";

export interface SessionContext {
  sessionId: string;
  accountId: string;
  householdId: string;
  role: string;
  roleVersion: string;
  policyVersion: string;
  assurance: SessionAssurance;
  deviceId?: string;
  createdAt: string;
  expiresAt?: string;
  inactivityExpiresAt?: string;
  absoluteExpiry?: string;
}

export interface AccountSwitchTransition {
  previousAccount: string;
  targetAccount: string;
  hasClearedPrivateState: boolean;
  hasClearedConversationHistory: boolean;
  hasClearedMemoryContext: boolean;
  hasClearedConnectorContext: boolean;
  hasClearedCache: boolean;
}

export function accountSwitchRequiresPrivateCleanup(input: AccountSwitchTransition): boolean {
  return (
    input.hasClearedPrivateState &&
    input.hasClearedConversationHistory &&
    input.hasClearedMemoryContext &&
    input.hasClearedConnectorContext &&
    input.hasClearedCache
  );
}
