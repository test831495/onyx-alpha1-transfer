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

export class OnyxServerSessionValidator {
  constructor(private readonly authority: OnyxSessionAuthority, private readonly now: () => number = Date.now) {}

  async validate(request: SessionRequest, purpose: string, capabilityFingerprint: string, expectedAccount?: string): Promise<SessionValidationResult> {
    if (!request.sessionProof) throw new Error("Session required");
    if (request.origin !== undefined && request.origin !== request.expectedOrigin) throw new Error("Origin rejected");
    const context = await this.authority.verify(request.sessionProof);
    if (!context) throw new Error("Session rejected");
    if (new Date(context.expiresAt).getTime() <= this.now()) throw new Error("Session expired");
    if (expectedAccount !== undefined && context.canonicalAccountRef !== expectedAccount) throw new Error("Account rejected");
    if (!purpose || !capabilityFingerprint) throw new Error("Purpose and capability are required");
    return { context, purpose, capabilityFingerprint };
  }
}