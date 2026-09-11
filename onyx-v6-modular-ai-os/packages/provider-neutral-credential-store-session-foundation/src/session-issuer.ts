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
  revoke(sessionRef: string, reason?: ServerSessionRecord["revocationReason"]): Promise<void>;
  invalidateAccountSwitch(canonicalAccountRef: string, generation: number): Promise<void>;
}

export class InMemoryServerSessionRepository implements ServerSessionRepository {
  private readonly records = new Map<string, ServerSessionRecord>();

  async create(record: ServerSessionRecord): Promise<void> {
    if (this.records.has(record.sessionRef)) throw new Error("Session already exists");
    this.records.set(record.sessionRef, record);
  }

  async get(sessionRef: string): Promise<ServerSessionRecord | undefined> { return this.records.get(sessionRef); }

  async revoke(sessionRef: string, reason: ServerSessionRecord["revocationReason"] = "logout"): Promise<void> {
    const record = this.records.get(sessionRef);
    if (record) this.records.set(sessionRef, { ...record, revokedAt: new Date().toISOString(), revocationReason: reason });
  }

  async invalidateAccountSwitch(canonicalAccountRef: string, generation: number): Promise<void> {
    for (const [sessionRef, record] of this.records) {
      if (record.canonicalAccountRef === canonicalAccountRef && record.accountSwitchGeneration < generation && !record.revokedAt) {
        this.records.set(sessionRef, { ...record, revokedAt: new Date().toISOString(), revocationReason: "account-switch" });
      }
    }
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

  async revoke(sessionRef: string): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      await query("UPDATE server_sessions SET revoked_at = $1 WHERE session_ref = $2", [new Date().toISOString(), sessionRef]);
    });
  }

  async invalidateAccountSwitch(canonicalAccountRef: string, generation: number): Promise<void> {
    await withDatabaseTransaction(this.database, async (query) => {
      await query("UPDATE server_sessions SET revoked_at = $1 WHERE canonical_account_ref = $2 AND account_switch_generation < $3 AND revoked_at IS NULL", [new Date().toISOString(), canonicalAccountRef, generation]);
    });
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
    await this.repository.create(context);
    const proof = await this.authority.issue(context, lifetimeSeconds);
    return { proof, context, cookie: serializeSessionCookie(proof, lifetimeSeconds, production) };
  }

  async revoke(sessionRef: string): Promise<string> {
    await this.repository.revoke(sessionRef, "logout");
    return clearSessionCookie(true);
  }

  async switchAccount(canonicalAccountRef: string, generation: number): Promise<void> {
    await this.repository.invalidateAccountSwitch(canonicalAccountRef, generation);
  }
}