import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "@netlify/database";
import { withDatabaseTransaction } from "./database.js";
import type { OnyxSessionAuthority, ServerSessionContext } from "./session.js";

export type ServerSessionRecord = ServerSessionContext & {
  readonly revokedAt?: string;
  readonly revocationReason?: "logout" | "account-switch" | "expired";
};

export interface ServerSessionRepository {
  create(record: ServerSessionRecord): Promise<void>;
  get(sessionRef: string): Promise<ServerSessionRecord | undefined>;
  revoke(sessionRef: string, reason?: ServerSessionRecord["revocationReason"], revokedAt?: string): Promise<void>;
  invalidateAccountSwitch(canonicalAccountRef: string, generation: number, changedAt?: string): Promise<void>;
  currentAccountSwitchGeneration(canonicalAccountRef: string): Promise<number>;
  issueCsrf(sessionRef: string, token: string, expiresAt: string): Promise<void>;
  consumeCsrf(sessionRef: string, token: string, now: string): Promise<boolean>;
}

export class InMemoryServerSessionRepository implements ServerSessionRepository {
  private readonly records = new Map<string, ServerSessionRecord>();
  private readonly generations = new Map<string, number>();
  private readonly csrf = new Map<string, { token: string; expiresAt: string }>();

  async create(record: ServerSessionRecord): Promise<void> {
    if (this.records.has(record.sessionRef)) throw new Error("Session already exists");
    this.records.set(record.sessionRef, record);
    this.generations.set(record.canonicalAccountRef, Math.max(this.generations.get(record.canonicalAccountRef) ?? 0, record.accountSwitchGeneration));
  }

  async get(sessionRef: string): Promise<ServerSessionRecord | undefined> { return this.records.get(sessionRef); }

  async revoke(sessionRef: string, reason: ServerSessionRecord["revocationReason"] = "logout", revokedAt = new Date().toISOString()): Promise<void> {
    const record = this.records.get(sessionRef);
    if (record) this.records.set(sessionRef, { ...record, revokedAt, revocationReason: reason });
  }

  async invalidateAccountSwitch(canonicalAccountRef: string, generation: number, changedAt = new Date().toISOString()): Promise<void> {
    const current = this.generations.get(canonicalAccountRef) ?? 0;
    if (generation <= current) throw new Error("Account switch generation conflict");
    this.generations.set(canonicalAccountRef, generation);
    for (const [sessionRef, record] of this.records) {
      if (record.canonicalAccountRef === canonicalAccountRef && record.accountSwitchGeneration < generation && !record.revokedAt) {
        this.records.set(sessionRef, { ...record, revokedAt: changedAt, revocationReason: "account-switch" });
      }
    }
  }

  async currentAccountSwitchGeneration(canonicalAccountRef: string): Promise<number> { return this.generations.get(canonicalAccountRef) ?? 0; }
  async issueCsrf(sessionRef: string, token: string, expiresAt: string): Promise<void> { this.csrf.set(sessionRef, { token, expiresAt }); }
  async consumeCsrf(sessionRef: string, token: string, now: string): Promise<boolean> {
    const entry = this.csrf.get(sessionRef);
    if (!entry || entry.token !== token || entry.expiresAt <= now) return false;
    this.csrf.delete(sessionRef);
    return true;
  }
}

type Row = Record<string, unknown>;
const recordFromRow = (row: Row): ServerSessionRecord => ({
  sessionRef: String(row.session_ref),
  canonicalAccountRef: String(row.canonical_account_ref),
  ...(row.household_scope_ref ? { householdScopeRef: String(row.household_scope_ref) } : {}),
  accountSwitchGeneration: Number(row.account_switch_generation),
  authenticationAssurance: String(row.authentication_assurance),
  deviceTrust: String(row.device_trust),
  roleClass: String(row.role_class),
  policyVersion: String(row.policy_version),
  issuedAt: String(row.issued_at),
  expiresAt: String(row.expires_at),
  sessionVersion: Number(row.session_version),
  ...(row.revoked_at ? { revokedAt: String(row.revoked_at) } : {}),
  ...(row.revocation_reason ? { revocationReason: String(row.revocation_reason) as ServerSessionRecord["revocationReason"] } : {}),
});

export class SqlServerSessionRepository implements ServerSessionRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async create(record: ServerSessionRecord): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      await query(`INSERT INTO server_sessions
        (session_ref, canonical_account_ref, household_scope_ref, account_switch_generation,
         authentication_assurance, device_trust, role_class, policy_version, issued_at,
         expires_at, session_version)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [record.sessionRef, record.canonicalAccountRef, record.householdScopeRef ?? null, record.accountSwitchGeneration, record.authenticationAssurance, record.deviceTrust, record.roleClass, record.policyVersion, record.issuedAt, record.expiresAt, record.sessionVersion]);
    });
  }

  async get(sessionRef: string): Promise<ServerSessionRecord | undefined> {
    const result = await this.database.sql`SELECT * FROM server_sessions WHERE session_ref = ${sessionRef}`;
    const row = (result as { rows?: Row[] }).rows?.[0];
    return row ? recordFromRow(row) : undefined;
  }

  async revoke(sessionRef: string, reason = "logout", revokedAt = new Date().toISOString()): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      await query("UPDATE server_sessions SET revoked_at = $1, revocation_reason = $2 WHERE session_ref = $3", [revokedAt, reason, sessionRef]);
    });
  }

  async invalidateAccountSwitch(canonicalAccountRef: string, generation: number, changedAt = new Date().toISOString()): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      const currentResult = await query("SELECT generation FROM session_account_switch_generations WHERE canonical_account_ref = $1 FOR UPDATE", [canonicalAccountRef]);
      const currentRow = (currentResult as { rows?: Row[] }).rows?.[0];
      if (currentRow && Number(currentRow.generation) >= generation) throw new Error("Account switch generation conflict");
      await query("INSERT INTO session_account_switch_generations (canonical_account_ref, generation, updated_at) VALUES ($1,$2,$3) ON CONFLICT (canonical_account_ref) DO UPDATE SET generation = EXCLUDED.generation, updated_at = EXCLUDED.updated_at WHERE session_account_switch_generations.generation < EXCLUDED.generation", [canonicalAccountRef, generation, changedAt]);
      await query("UPDATE server_sessions SET revoked_at = $1, revocation_reason = 'account-switch' WHERE canonical_account_ref = $2 AND account_switch_generation < $3 AND revoked_at IS NULL", [changedAt, canonicalAccountRef, generation]);
    });
  }

  async currentAccountSwitchGeneration(canonicalAccountRef: string): Promise<number> {
    const result = await this.database.sql`SELECT generation FROM session_account_switch_generations WHERE canonical_account_ref = ${canonicalAccountRef}`;
    const row = (result as { rows?: Row[] }).rows?.[0];
    return row ? Number(row.generation) : 0;
  }

  async issueCsrf(sessionRef: string, token: string, expiresAt: string): Promise<void> {
    await this.database.sql`INSERT INTO session_csrf_tokens (session_ref, token_digest, expires_at) VALUES (${sessionRef}, ${token}, ${expiresAt}) ON CONFLICT (session_ref) DO UPDATE SET token_digest = EXCLUDED.token_digest, expires_at = EXCLUDED.expires_at`;
  }

  async consumeCsrf(sessionRef: string, token: string, now: string): Promise<boolean> {
    const result = await this.database.sql`DELETE FROM session_csrf_tokens WHERE session_ref = ${sessionRef} AND token_digest = ${token} AND expires_at > ${now} RETURNING session_ref`;
    return Boolean((result as { rows?: Row[] }).rows?.length);
  }
}

export type OnyxAuthenticationResult = {
  readonly authenticated: boolean;
  readonly canonicalAccountRef: string;
  readonly householdScopeRef?: string;
  readonly accountSwitchGeneration: number;
  readonly authenticationAssurance: string;
  readonly deviceTrust: string;
  readonly roleClass: string;
  readonly policyVersion: string;
};

export type IssuedServerSession = { readonly proof: string; readonly cookie: string; readonly context: ServerSessionContext };

export function serializeSessionCookie(proof: string, lifetimeSeconds: number, production: boolean): string {
  return `onyx_session=${encodeURIComponent(proof)}; Max-Age=${lifetimeSeconds}; Path=/; HttpOnly; SameSite=Lax${production ? "; Secure" : ""}`;
}

export function clearSessionCookie(production: boolean): string {
  return `onyx_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${production ? "; Secure" : ""}`;
}

export class OnyxServerSessionIssuer {
  constructor(private readonly authority: OnyxSessionAuthority, private readonly repository: ServerSessionRepository, private readonly now: () => number = Date.now) {}

  async issue(authentication: OnyxAuthenticationResult, lifetimeSeconds = 900, production = true): Promise<IssuedServerSession> {
    if (!authentication.authenticated) throw new Error("ONYX authentication required");
    if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds < 1 || lifetimeSeconds > 3600) throw new Error("Session lifetime is invalid");
    const issuedAt = new Date(this.now()).toISOString();
    const context: ServerSessionContext = {
      sessionRef: randomUUID(),
      canonicalAccountRef: authentication.canonicalAccountRef,
      ...(authentication.householdScopeRef ? { householdScopeRef: authentication.householdScopeRef } : {}),
      accountSwitchGeneration: authentication.accountSwitchGeneration,
      authenticationAssurance: authentication.authenticationAssurance,
      deviceTrust: authentication.deviceTrust,
      roleClass: authentication.roleClass,
      policyVersion: authentication.policyVersion,
      issuedAt,
      expiresAt: new Date(this.now() + lifetimeSeconds * 1000).toISOString(),
      sessionVersion: 0,
    };
    const currentGeneration = await this.repository.currentAccountSwitchGeneration(authentication.canonicalAccountRef);
    if (authentication.accountSwitchGeneration < currentGeneration) throw new Error("Stale account switch generation");
    await this.repository.create(context);
    const proof = await this.authority.issue(context, lifetimeSeconds);
    return { proof, context, cookie: serializeSessionCookie(proof, lifetimeSeconds, production) };
  }

  async revoke(sessionRef: string): Promise<string> {
    await this.repository.revoke(sessionRef, "logout", new Date(this.now()).toISOString());
    return clearSessionCookie(true);
  }

  async switchAccount(canonicalAccountRef: string, generation: number): Promise<void> {
    await this.repository.invalidateAccountSwitch(canonicalAccountRef, generation, new Date(this.now()).toISOString());
  }
}