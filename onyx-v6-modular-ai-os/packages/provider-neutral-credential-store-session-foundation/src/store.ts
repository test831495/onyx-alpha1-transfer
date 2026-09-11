import { randomUUID } from "node:crypto";
import { CredentialAad, CredentialEnvelope, CredentialEncryptionKey, decryptCredential, encryptCredential } from "./crypto.js";

export const CREDENTIAL_STATES = ["ACTIVE", "ROTATING", "REVOKED", "DELETED", "REAUTHENTICATION_REQUIRED", "QUARANTINED"] as const;
export type CredentialState = (typeof CREDENTIAL_STATES)[number];

export type CredentialBinding = Omit<CredentialAad, "recordId" | "recordVersion">;
export type CredentialRecord = CredentialBinding & {
  readonly recordId: string;
  readonly encryptedPayload: CredentialEnvelope;
  readonly encryptionKeyVersion: string;
  readonly recordVersion: number;
  readonly state: CredentialState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revokedAt?: string;
  readonly deletedAt?: string;
};

export type CredentialAuditEvent = {
  readonly event: "CREDENTIAL_RECORD_CREATED" | "CREDENTIAL_RECORD_REPLACED" | "CREDENTIAL_RECORD_REVOKED" | "CREDENTIAL_RECORD_DELETED" | "CREDENTIAL_VERSION_CONFLICT";
  readonly recordId: string;
  readonly canonicalAccountRef: string;
  readonly providerId: string;
  readonly purpose: string;
  readonly at: string;
};

const activeKey = (binding: CredentialBinding): string => [binding.canonicalAccountRef, binding.providerId, binding.connectorAccountRef, binding.credentialType, binding.purpose].join("\u001f");

export class InMemoryCredentialStore {
  private readonly records = new Map<string, CredentialRecord>();
  private readonly active = new Map<string, string>();
  private readonly auditEvents: CredentialAuditEvent[] = [];

  create(binding: CredentialBinding, plaintext: string, key: CredentialEncryptionKey): CredentialRecord {
    if (this.active.has(activeKey(binding))) throw new Error("Active credential already exists");
    const now = new Date().toISOString();
    const recordId = randomUUID();
    const record: CredentialRecord = {
      ...binding,
      recordId,
      encryptedPayload: encryptCredential(plaintext, { ...binding, recordId, recordVersion: 0 }, key),
      encryptionKeyVersion: key.version,
      recordVersion: 0,
      state: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(recordId, record);
    this.active.set(activeKey(binding), recordId);
    this.audit("CREDENTIAL_RECORD_CREATED", record);
    return record;
  }

  read(recordId: string, binding: CredentialBinding, key: CredentialEncryptionKey): string {
    const record = this.require(recordId);
    this.assertBinding(record, binding);
    if (record.state !== "ACTIVE") throw new Error("Credential is not active");
    return decryptCredential(record.encryptedPayload, { ...binding, recordId, recordVersion: record.recordVersion }, key);
  }

  replace(recordId: string, binding: CredentialBinding, expectedVersion: number, plaintext: string, key: CredentialEncryptionKey): CredentialRecord {
    const record = this.require(recordId);
    this.assertBinding(record, binding);
    if (record.recordVersion !== expectedVersion) {
      this.audit("CREDENTIAL_VERSION_CONFLICT", record);
      throw new Error("Credential version conflict");
    }
    if (record.state !== "ACTIVE" && record.state !== "ROTATING") throw new Error("Credential is not replaceable");
    const nextVersion = record.recordVersion + 1;
    const updated: CredentialRecord = { ...record, encryptedPayload: encryptCredential(plaintext, { ...binding, recordId, recordVersion: nextVersion }, key), encryptionKeyVersion: key.version, recordVersion: nextVersion, updatedAt: new Date().toISOString() };
    this.records.set(recordId, updated);
    this.audit("CREDENTIAL_RECORD_REPLACED", updated);
    return updated;
  }

  revoke(recordId: string, binding: CredentialBinding): CredentialRecord {
    const record = this.require(recordId);
    this.assertBinding(record, binding);
    if (record.state === "REVOKED" || record.state === "DELETED") return record;
    const updated = { ...record, state: "REVOKED" as const, revokedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.records.set(recordId, updated);
    this.active.delete(activeKey(binding));
    this.audit("CREDENTIAL_RECORD_REVOKED", updated);
    return updated;
  }

  delete(recordId: string, binding: CredentialBinding): CredentialRecord {
    const record = this.require(recordId);
    this.assertBinding(record, binding);
    if (record.state === "DELETED") return record;
    const updated = { ...record, state: "DELETED" as const, encryptedPayload: { ...record.encryptedPayload, ciphertext: "", nonce: "", tag: "" }, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.records.set(recordId, updated);
    this.active.delete(activeKey(binding));
    this.audit("CREDENTIAL_RECORD_DELETED", updated);
    return updated;
  }

  getAuditEvents(): readonly CredentialAuditEvent[] { return this.auditEvents; }

  private require(recordId: string): CredentialRecord { const record = this.records.get(recordId); if (!record) throw new Error("Credential not found"); return record; }
  private assertBinding(record: CredentialRecord, binding: CredentialBinding): void { if (activeKey(record) !== activeKey(binding) || record.capabilityFingerprint !== binding.capabilityFingerprint) throw new Error("Credential binding mismatch"); }
  private audit(event: CredentialAuditEvent["event"], record: CredentialRecord): void { this.auditEvents.push({ event, recordId: record.recordId, canonicalAccountRef: record.canonicalAccountRef, providerId: record.providerId, purpose: record.purpose, at: new Date().toISOString() }); }
}