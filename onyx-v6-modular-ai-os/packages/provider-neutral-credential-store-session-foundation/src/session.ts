import type { ServerSessionRecord } from "./session-issuer.js";

export type ServerSessionContext = {
  readonly sessionRef: string;
  readonly canonicalAccountRef: string;
  readonly householdScopeRef?: string;
  readonly accountSwitchGeneration: number;
  readonly authenticationAssurance: string;
  readonly deviceTrust: string;
  readonly roleClass: string;
  readonly policyVersion: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly sessionVersion: number;
};

export type SessionRequest = {
  readonly sessionProof?: string;
  readonly cookieHeader?: string;
  readonly origin?: string;
  readonly expectedOrigin?: string;
};

export type OnyxSessionAuthority = {
  issue(context: Omit<ServerSessionContext, "issuedAt" | "expiresAt">, lifetimeSeconds: number): Promise<string>;
  verify(proof: string): Promise<ServerSessionContext | undefined>;
};

export type SessionValidationResult = {
  readonly context: ServerSessionContext;
  readonly purpose: string;
  readonly capabilityFingerprint: string;
};

type SessionRepositoryLike = {
  get(sessionRef: string): Promise<ServerSessionRecord | undefined>;
};

const cookieProof = (header: string | undefined): string | undefined => {
  const match = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith("onyx_session="));
  return match ? decodeURIComponent(match.slice("onyx_session=".length)) : undefined;
};

export class OnyxServerSessionValidator {
  constructor(private readonly authority: OnyxSessionAuthority, private readonly now: () => number = Date.now, private readonly repository?: SessionRepositoryLike) {}

  async validate(request: SessionRequest, purpose: string, capabilityFingerprint: string, expectedAccount?: string, expectedAccountSwitchGeneration?: number): Promise<SessionValidationResult> {
    const proof = request.sessionProof ?? cookieProof(request.cookieHeader);
    if (!proof) throw new Error("Session required");
    if (request.origin !== undefined && request.origin !== request.expectedOrigin) throw new Error("Origin rejected");
    const context = await this.authority.verify(proof);
    if (!context) throw new Error("Session rejected");
    const stored = await this.repository?.get(context.sessionRef);
    if (this.repository && (!stored || stored.sessionRef !== context.sessionRef)) throw new Error("Session unavailable");
    if (stored && (stored.canonicalAccountRef !== context.canonicalAccountRef || stored.sessionVersion !== context.sessionVersion || stored.accountSwitchGeneration !== context.accountSwitchGeneration || stored.policyVersion !== context.policyVersion)) throw new Error("Session context mismatch");
    if (stored?.revokedAt) throw new Error(stored.revocationReason === "account-switch" ? "Session rejected after account switch" : "Session revoked");
    if (new Date(context.expiresAt).getTime() <= this.now()) throw new Error("Session expired");
    if (expectedAccount !== undefined && context.canonicalAccountRef !== expectedAccount) throw new Error("Account rejected");
    if (expectedAccountSwitchGeneration !== undefined && context.accountSwitchGeneration !== expectedAccountSwitchGeneration) throw new Error("Account switch generation rejected");
    if (!purpose || !capabilityFingerprint) throw new Error("Purpose and capability are required");
    return { context, purpose, capabilityFingerprint };
  }
}