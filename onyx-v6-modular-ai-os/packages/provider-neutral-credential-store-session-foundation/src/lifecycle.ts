import { PrivacySafeAuditSink } from "./audit.js";
import type { CredentialBinding, InMemoryCredentialStore } from "./store.js";

export class CredentialLifecycleService {
  constructor(private readonly store: InMemoryCredentialStore, private readonly audit: PrivacySafeAuditSink) {}
  disconnect(recordId: string, binding: CredentialBinding): void {
    this.store.revoke(recordId, binding);
    this.store.delete(recordId, binding);
    this.audit.record({ event: "CREDENTIAL_RECORD_DELETED", recordId, canonicalAccountRef: binding.canonicalAccountRef, providerId: binding.providerId, purpose: binding.purpose });
  }
}