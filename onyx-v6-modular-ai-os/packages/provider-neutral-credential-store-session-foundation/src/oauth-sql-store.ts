import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DatabaseConnection } from "@netlify/database";
import { decryptCredential, encryptCredential, type CredentialEncryptionKey } from "./crypto.js";
import { withDatabaseTransaction } from "./database.js";
import type { PendingOAuthBinding, PendingOAuthTransaction } from "./oauth.js";

type Row = Record<string, unknown>;
type Query = (text: string, values?: readonly unknown[]) => Promise<unknown>;

const digest = (state: string): string => createHash("sha256").update(state).digest("base64url");
const first = (result: unknown): Row | undefined => (result as { rows?: Row[] }).rows?.[0];

const transactionFromRow = (row: Row): PendingOAuthTransaction => ({
  transactionId: String(row.transaction_id),
  stateDigest: String(row.protected_state_digest),
  encryptedPkceVerifier: row.encrypted_pkce_verifier as PendingOAuthTransaction["encryptedPkceVerifier"],
  providerId: String(row.provider_id),
  canonicalAccountRef: String(row.canonical_account_ref),
  sessionRef: String(row.session_ref),
  purpose: String(row.purpose),
  capabilityFingerprint: String(row.capability_fingerprint),
  redirectUriFingerprint: String(row.redirect_uri_fingerprint),
  createdAt: String(row.created_at),
  expiresAt: String(row.expires_at),
  ...(row.consumed_at ? { consumedAt: String(row.consumed_at) } : {}),
});

export class SqlOAuthPendingStore {
  constructor(private readonly database: DatabaseConnection, private readonly key: CredentialEncryptionKey, private readonly now: () => number = Date.now) {}

  async create(binding: PendingOAuthBinding, lifetimeMs = 300_000): Promise<{ transaction: PendingOAuthTransaction; state: string; codeVerifier: string }> {
    return withDatabaseTransaction(this.database, async (query) => {
      const state = randomBytes(32).toString("base64url");
      const codeVerifier = randomBytes(32).toString("base64url");
      const transactionId = randomUUID();
      const createdAt = new Date(this.now());
      const transaction: PendingOAuthTransaction = {
        ...binding,
        transactionId,
        stateDigest: digest(state),
        encryptedPkceVerifier: encryptCredential(codeVerifier, {
          recordId: transactionId,
          canonicalAccountRef: binding.canonicalAccountRef,
          providerId: binding.providerId,
          connectorAccountRef: binding.sessionRef,
          credentialType: "oauth-pkce-verifier",
          purpose: binding.purpose,
          capabilityFingerprint: binding.capabilityFingerprint,
          recordVersion: 0,
        }, this.key),
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(this.now() + lifetimeMs).toISOString(),
      };
      await query(`INSERT INTO oauth_pending_transactions
        (transaction_id, protected_state_digest, encrypted_pkce_verifier, provider_id,
         canonical_account_ref, session_ref, purpose, capability_fingerprint,
         redirect_uri_fingerprint, created_at, expires_at, version, tombstone_state)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,'PENDING')`, [
        transactionId, transaction.stateDigest, JSON.stringify(transaction.encryptedPkceVerifier),
        binding.providerId, binding.canonicalAccountRef, binding.sessionRef, binding.purpose,
        binding.capabilityFingerprint, binding.redirectUriFingerprint, transaction.createdAt, transaction.expiresAt,
      ]);
      return { transaction, state, codeVerifier };
    });
  }

  async createOrReplay(binding: PendingOAuthBinding, idempotencyKey: string, authorizationUrl: (state: string, codeVerifier: string) => string, lifetimeMs = 300_000): Promise<{ transaction: PendingOAuthTransaction; state: string; codeVerifier: string; authorizationUrl: string; replayed: boolean }> {
    if (!idempotencyKey || idempotencyKey.length > 256) throw new Error("Idempotency key rejected");
    return withDatabaseTransaction(this.database, async (query) => {
      const keyDigest = digest(idempotencyKey);
      const existingResult = await query("SELECT * FROM oauth_idempotency_receipts WHERE idempotency_key_digest = $1 FOR UPDATE", [keyDigest]);
      const existing = first(existingResult);
      if (existing) {
        if (String(existing.provider_id) !== binding.providerId || String(existing.canonical_account_ref) !== binding.canonicalAccountRef || String(existing.session_ref) !== binding.sessionRef || String(existing.purpose) !== binding.purpose || String(existing.capability_fingerprint) !== binding.capabilityFingerprint || String(existing.redirect_uri_fingerprint) !== binding.redirectUriFingerprint || String(existing.state) !== "ACTIVE" || new Date(String(existing.expires_at)).getTime() <= this.now()) throw new Error("Idempotency binding rejected");
        const receiptId = String(existing.receipt_id);
        const encrypted = existing.encrypted_authorization_url as ReturnType<typeof encryptCredential>;
        const replayedUrl = decryptCredential(encrypted, { recordId: receiptId, canonicalAccountRef: binding.canonicalAccountRef, providerId: binding.providerId, connectorAccountRef: binding.sessionRef, credentialType: "oauth-idempotency-result", purpose: binding.purpose, capabilityFingerprint: binding.capabilityFingerprint, recordVersion: 0 }, this.key);
        const pendingResult = await query("SELECT * FROM oauth_pending_transactions WHERE transaction_id = $1 FOR UPDATE", [String(existing.transaction_id)]);
        const pending = first(pendingResult);
        if (!pending || String(pending.tombstone_state) !== "PENDING") throw new Error("OAuth transaction unavailable");
        const transaction = transactionFromRow(pending);
        return { transaction, state: "", codeVerifier: "", authorizationUrl: replayedUrl, replayed: true };
      }
      const state = randomBytes(32).toString("base64url");
      const codeVerifier = randomBytes(32).toString("base64url");
      const transactionId = randomUUID();
      const receiptId = randomUUID();
      const createdAt = new Date(this.now());
      const transaction: PendingOAuthTransaction = {
        ...binding, transactionId, stateDigest: digest(state),
        encryptedPkceVerifier: encryptCredential(codeVerifier, { recordId: transactionId, canonicalAccountRef: binding.canonicalAccountRef, providerId: binding.providerId, connectorAccountRef: binding.sessionRef, credentialType: "oauth-pkce-verifier", purpose: binding.purpose, capabilityFingerprint: binding.capabilityFingerprint, recordVersion: 0 }, this.key),
        createdAt: createdAt.toISOString(), expiresAt: new Date(this.now() + lifetimeMs).toISOString(),
      };
      const safeUrl = authorizationUrl(state, codeVerifier);
      const encryptedUrl = encryptCredential(safeUrl, { recordId: receiptId, canonicalAccountRef: binding.canonicalAccountRef, providerId: binding.providerId, connectorAccountRef: binding.sessionRef, credentialType: "oauth-idempotency-result", purpose: binding.purpose, capabilityFingerprint: binding.capabilityFingerprint, recordVersion: 0 }, this.key);
      await query(`INSERT INTO oauth_pending_transactions (transaction_id, protected_state_digest, encrypted_pkce_verifier, provider_id, canonical_account_ref, session_ref, purpose, capability_fingerprint, redirect_uri_fingerprint, created_at, expires_at, version, tombstone_state) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,'PENDING')`, [transactionId, transaction.stateDigest, JSON.stringify(transaction.encryptedPkceVerifier), binding.providerId, binding.canonicalAccountRef, binding.sessionRef, binding.purpose, binding.capabilityFingerprint, binding.redirectUriFingerprint, transaction.createdAt, transaction.expiresAt]);
      const inserted = await query(`INSERT INTO oauth_idempotency_receipts (receipt_id, idempotency_key_digest, provider_id, canonical_account_ref, session_ref, purpose, capability_fingerprint, redirect_uri_fingerprint, transaction_id, encrypted_authorization_url, created_at, expires_at, state) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ACTIVE') ON CONFLICT (idempotency_key_digest) DO NOTHING RETURNING receipt_id`, [receiptId, keyDigest, binding.providerId, binding.canonicalAccountRef, binding.sessionRef, binding.purpose, binding.capabilityFingerprint, binding.redirectUriFingerprint, transactionId, JSON.stringify(encryptedUrl), transaction.createdAt, transaction.expiresAt]);
      if (!first(inserted)) throw new Error("Concurrent idempotency initiation rejected; retry with the same key");
      return { transaction, state, codeVerifier, authorizationUrl: safeUrl, replayed: false };
    });
  }

  async consume(state: string, binding: PendingOAuthBinding): Promise<string> {
    return withDatabaseTransaction(this.database, async (query: Query) => {
      const result = await query("SELECT * FROM oauth_pending_transactions WHERE protected_state_digest = $1 FOR UPDATE", [digest(state)]);
      const row = first(result);
      if (!row) throw new Error("OAuth transaction unavailable");
      const transaction = transactionFromRow(row);
      const now = this.now();
      if (transaction.consumedAt || new Date(transaction.expiresAt).getTime() <= now || String(row.tombstone_state) !== "PENDING") {
        throw new Error("OAuth transaction unavailable");
      }
      if (transaction.providerId !== binding.providerId || transaction.canonicalAccountRef !== binding.canonicalAccountRef || transaction.sessionRef !== binding.sessionRef || transaction.purpose !== binding.purpose || transaction.capabilityFingerprint !== binding.capabilityFingerprint || transaction.redirectUriFingerprint !== binding.redirectUriFingerprint) {
        throw new Error("OAuth transaction binding mismatch");
      }
      const verifier = decryptCredential(transaction.encryptedPkceVerifier, {
        recordId: transaction.transactionId,
        canonicalAccountRef: binding.canonicalAccountRef,
        providerId: binding.providerId,
        connectorAccountRef: binding.sessionRef,
        credentialType: "oauth-pkce-verifier",
        purpose: binding.purpose,
        capabilityFingerprint: binding.capabilityFingerprint,
        recordVersion: 0,
      }, this.key);
      const consumedAt = new Date(now).toISOString();
      const consumed = await query("UPDATE oauth_pending_transactions SET consumed_at = $1, version = version + 1, tombstone_state = 'CONSUMED' WHERE transaction_id = $2 AND version = $3 AND tombstone_state = 'PENDING' RETURNING transaction_id", [consumedAt, transaction.transactionId, Number(row.version)]);
      if (!first(consumed)) throw new Error("OAuth transaction replay rejected");
      await query("UPDATE oauth_idempotency_receipts SET state = 'CONSUMED' WHERE transaction_id = $1 AND state = 'ACTIVE'", [transaction.transactionId]);
      return verifier;
    });
  }

  async expireExpired(): Promise<number> {
    const result = await this.database.sql`UPDATE oauth_pending_transactions SET tombstone_state = 'EXPIRED', version = version + 1 WHERE expires_at <= ${new Date(this.now()).toISOString()} AND tombstone_state = 'PENDING' RETURNING transaction_id`;
    await this.database.sql`UPDATE oauth_idempotency_receipts SET state = 'EXPIRED' WHERE expires_at <= ${new Date(this.now()).toISOString()} AND state = 'ACTIVE'`;
    return ((result as { rows?: unknown[] }).rows ?? []).length;
  }
}