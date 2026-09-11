import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "@netlify/database";
import { decryptCredential, encryptCredential, type CredentialEncryptionKey } from "./crypto.js";
import { withDatabaseTransaction } from "./database.js";
import type { CredentialBinding, CredentialRecord, CredentialState } from "./store.js";

type Row = Record<string, unknown>;
type Query = (text: string, values?: readonly unknown[]) => Promise<unknown>;

const rowOf = (result: unknown): Row | undefined => {
  const rows = (result as { rows?: Row[] }).rows;
  return rows?.[0];
};

const recordFromRow = (row: Row): CredentialRecord => ({
  recordId: String(row.record_id),
  canonicalAccountRef: String(row.canonical_account_ref),
  providerId: String(row.provider_id),
  connectorAccountRef: String(row.connector_account_ref),
  credentialType: String(row.credential_type),
  purpose: String(row.purpose),
  capabilityFingerprint: String(row.capability_fingerprint),
  encryptedPayload: row.encrypted_payload as CredentialRecord["encryptedPayload"],
  encryptionKeyVersion: String(row.encryption_key_version),
  recordVersion: Number(row.record_version),
  state: String(row.state) as CredentialState,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  ...(row.revoked_at ? { revokedAt: String(row.revoked_at) } : {}),
  ...(row.deleted_at ? { deletedAt: String(row.deleted_at) } : {}),
});

export class SqlCredentialStore {
  constructor(private readonly database: DatabaseConnection, private readonly key: CredentialEncryptionKey) {}

  async create(binding: CredentialBinding, plaintext: string): Promise<CredentialRecord> {
    return withDatabaseTransaction(this.database, async (query) => {
      const recordId = randomUUID();
      const now = new Date().toISOString();
      const encryptedPayload = encryptCredential(plaintext, { ...binding, recordId, recordVersion: 0 }, this.key);
      const result = await query(`INSERT INTO credential_records
        (record_id, canonical_account_ref, provider_id, connector_account_ref, credential_type, purpose, capability_fingerprint,
         encrypted_payload, encryption_envelope_version, encryption_key_version, record_version, state,
         provider_authorization_version, created_at, updated_at, policy_version, provenance_ref)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,'ACTIVE',$11,$12,$12,$13,$14)
        RETURNING *`, [recordId, binding.canonicalAccountRef, binding.providerId, binding.connectorAccountRef, binding.credentialType, binding.purpose, binding.capabilityFingerprint, JSON.stringify(encryptedPayload), encryptedPayload.envelopeVersion, this.key.version, "initial", now, "policy-1", "credential-store"]);
      const row = rowOf(result);
      if (!row) throw new Error("Credential insert returned no record");
      return recordFromRow(row);
    });
  }

  async read(recordId: string, binding: CredentialBinding): Promise<string> {
    return withDatabaseTransaction(this.database, async (query) => {
      const result = await query("SELECT * FROM credential_records WHERE record_id = $1 AND canonical_account_ref = $2 AND provider_id = $3 AND connector_account_ref = $4 AND credential_type = $5 AND purpose = $6 AND capability_fingerprint = $7", [recordId, binding.canonicalAccountRef, binding.providerId, binding.connectorAccountRef, binding.credentialType, binding.purpose, binding.capabilityFingerprint]);
      const row = rowOf(result);
      if (!row) throw new Error("Credential not found");
      const record = recordFromRow(row);
      if (record.state !== "ACTIVE") throw new Error("Credential is not active");
      return decryptCredential(record.encryptedPayload, { ...binding, recordId, recordVersion: record.recordVersion }, this.key);
    });
  }

  async findActive(binding: CredentialBinding): Promise<CredentialRecord | undefined> {
    const result = await this.database.sql`SELECT * FROM credential_records WHERE canonical_account_ref = ${binding.canonicalAccountRef} AND provider_id = ${binding.providerId} AND connector_account_ref = ${binding.connectorAccountRef} AND credential_type = ${binding.credentialType} AND purpose = ${binding.purpose} AND capability_fingerprint = ${binding.capabilityFingerprint} AND state IN ('ACTIVE','ROTATING') LIMIT 1`;
    const row = rowOf(result);
    return row ? recordFromRow(row) : undefined;
  }

  async replace(recordId: string, binding: CredentialBinding, expectedVersion: number, plaintext: string): Promise<CredentialRecord> {
    return withDatabaseTransaction(this.database, async (query) => {
      const result = await query("SELECT * FROM credential_records WHERE record_id = $1 FOR UPDATE", [recordId]);
      const row = rowOf(result);
      if (!row) throw new Error("Credential not found");
      const current = recordFromRow(row);
      if (current.canonicalAccountRef !== binding.canonicalAccountRef || current.providerId !== binding.providerId || current.connectorAccountRef !== binding.connectorAccountRef || current.credentialType !== binding.credentialType || current.purpose !== binding.purpose || current.capabilityFingerprint !== binding.capabilityFingerprint) throw new Error("Credential binding mismatch");
      if (current.recordVersion !== expectedVersion) throw new Error("Credential version conflict");
      const nextVersion = expectedVersion + 1;
      const encryptedPayload = encryptCredential(plaintext, { ...binding, recordId, recordVersion: nextVersion }, this.key);
      const updated = await query("UPDATE credential_records SET encrypted_payload = $1, encryption_key_version = $2, record_version = $3, updated_at = $4 WHERE record_id = $5 AND record_version = $6 AND state IN ('ACTIVE','ROTATING') RETURNING *", [JSON.stringify(encryptedPayload), this.key.version, nextVersion, new Date().toISOString(), recordId, expectedVersion]);
      const updatedRow = rowOf(updated);
      if (!updatedRow) throw new Error("Credential version conflict");
      return recordFromRow(updatedRow);
    });
  }

  async revoke(recordId: string, binding: CredentialBinding): Promise<void> { await this.transition(recordId, binding, "REVOKED", "revoked_at"); }
  async delete(recordId: string, binding: CredentialBinding): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      const now = new Date().toISOString();
      await query("UPDATE credential_records SET state = 'DELETED', encrypted_payload = '{}'::jsonb, deleted_at = $1, updated_at = $1 WHERE record_id = $2 AND canonical_account_ref = $3 AND provider_id = $4 AND connector_account_ref = $5 AND credential_type = $6 AND purpose = $7", [now, recordId, binding.canonicalAccountRef, binding.providerId, binding.connectorAccountRef, binding.credentialType, binding.purpose]);
      await query("INSERT INTO credential_tombstones (tombstone_id, record_id, canonical_account_ref, provider_id, purpose, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (record_id) DO NOTHING", [randomUUID(), recordId, binding.canonicalAccountRef, binding.providerId, binding.purpose, now]);
    });
  }

  private async transition(recordId: string, binding: CredentialBinding, state: "REVOKED", timestampColumn: "revoked_at"): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      const now = new Date().toISOString();
      await query(`UPDATE credential_records SET state = $1, ${timestampColumn} = $2, updated_at = $2 WHERE record_id = $3 AND canonical_account_ref = $4 AND provider_id = $5 AND connector_account_ref = $6 AND credential_type = $7 AND purpose = $8`, [state, now, recordId, binding.canonicalAccountRef, binding.providerId, binding.connectorAccountRef, binding.credentialType, binding.purpose]);
      await query("INSERT INTO credential_tombstones (tombstone_id, record_id, canonical_account_ref, provider_id, purpose, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (record_id) DO NOTHING", [randomUUID(), recordId, binding.canonicalAccountRef, binding.providerId, binding.purpose, now]);
    });
  }
}