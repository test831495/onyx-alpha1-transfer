import { createHash, randomBytes, randomUUID } from "node:crypto";
import { CredentialEncryptionKey, decryptCredential, encryptCredential } from "./crypto.js";

export type PendingOAuthBinding = {
  readonly providerId: string;
  readonly canonicalAccountRef: string;
  readonly sessionRef: string;
  readonly purpose: string;
  readonly capabilityFingerprint: string;
  readonly redirectUriFingerprint: string;
};

export type PendingOAuthTransaction = PendingOAuthBinding & {
  readonly transactionId: string;
  readonly stateDigest: string;
  readonly encryptedPkceVerifier: ReturnType<typeof encryptCredential>;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly consumedAt?: string;
};

const digest = (state: string): string => createHash("sha256").update(state).digest("base64url");

export class InMemoryOAuthPendingStore {
  private readonly transactions = new Map<string, PendingOAuthTransaction>();

  create(binding: PendingOAuthBinding, key: CredentialEncryptionKey, lifetimeMs = 300_000): { transaction: PendingOAuthTransaction; state: string; codeVerifier: string } {
    const state = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(32).toString("base64url");
    const transactionId = randomUUID();
    const createdAt = new Date();
    const transaction: PendingOAuthTransaction = {
      ...binding,
      transactionId,
      stateDigest: digest(state),
      encryptedPkceVerifier: encryptCredential(codeVerifier, { recordId: transactionId, canonicalAccountRef: binding.canonicalAccountRef, providerId: binding.providerId, connectorAccountRef: binding.sessionRef, credentialType: "oauth-pkce-verifier", purpose: binding.purpose, capabilityFingerprint: binding.capabilityFingerprint, recordVersion: 0 }, key),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + lifetimeMs).toISOString(),
    };
    this.transactions.set(transactionId, transaction);
    return { transaction, state, codeVerifier };
  }

  consume(state: string, binding: PendingOAuthBinding, key: CredentialEncryptionKey): string {
    const transaction = [...this.transactions.values()].find((candidate) => candidate.stateDigest === digest(state));
    if (!transaction || transaction.consumedAt || new Date(transaction.expiresAt).getTime() <= Date.now()) throw new Error("OAuth transaction unavailable");
    if (JSON.stringify({ ...transaction, stateDigest: undefined, encryptedPkceVerifier: undefined }) !== JSON.stringify({ ...binding, transactionId: transaction.transactionId, stateDigest: undefined, encryptedPkceVerifier: undefined, createdAt: transaction.createdAt, expiresAt: transaction.expiresAt, consumedAt: undefined })) throw new Error("OAuth transaction binding mismatch");
    const consumed = { ...transaction, consumedAt: new Date().toISOString() };
    this.transactions.set(transaction.transactionId, consumed);
    return decryptCredential(transaction.encryptedPkceVerifier, { recordId: transaction.transactionId, canonicalAccountRef: binding.canonicalAccountRef, providerId: binding.providerId, connectorAccountRef: binding.sessionRef, credentialType: "oauth-pkce-verifier", purpose: binding.purpose, capabilityFingerprint: binding.capabilityFingerprint, recordVersion: 0 }, key);
  }
}