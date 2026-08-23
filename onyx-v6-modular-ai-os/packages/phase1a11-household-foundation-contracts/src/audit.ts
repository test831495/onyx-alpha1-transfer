export type AuditOutcome = "success" | "denied" | "failed" | "blocked" | "not_verified";

export interface AuditActor {
  actorId: string;
  accountId: string;
  role: string;
  sessionId?: string;
}

export interface AuditAction {
  action: string;
  purpose: string;
  reason: string;
  requestedAt: string;
  recordedAt: string;
}

export interface AuditTarget {
  targetId: string;
  targetClass: string;
  resourceScope: string[];
}

export interface AuditEvent {
  eventId: string;
  actor: AuditActor;
  action: AuditAction;
  target: AuditTarget;
  outcome: AuditOutcome;
  correlationId: string;
  evidenceReference: string;
  beforeReference?: string;
  afterReference?: string;
  createdAt: string;
}

export interface AuditAvailability {
  serviceAvailable: boolean;
  reason?: string;
}

export interface AuditIntegrityReference {
  referenceId: string;
  digest: string;
  createdAt: string;
}

export interface AuditRetention {
  retentionClass: "owner_only" | "governed" | "internal";
  defaultTTL: string;
}

export interface AuditRedactionDecision {
  redactionRequired: boolean;
  reason: string;
  redactedFields: string[];
}

export interface AuditQueryScope {
  accountId: string;
  permitted: boolean;
  scope: string[];
  ownerOnly: boolean;
}

export function isAuditAvailable(information: AuditAvailability): boolean {
  return information.serviceAvailable === true;
}
