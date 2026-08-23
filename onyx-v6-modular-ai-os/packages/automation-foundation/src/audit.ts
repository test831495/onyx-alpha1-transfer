export interface AuditEvent {
  id: string;
  capability: string;
  decision: string;
  timestamp: string;
}

export function createAuditEvent(
  capability: string,
  decision: string
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    capability,
    decision,
    timestamp: new Date().toISOString()
  };
}
