import { randomBytes } from "node:crypto";
import { OnyxServerSessionValidator, type OnyxSessionAuthority, type ServerSessionContext, type SessionRequest, type SessionValidationResult } from "./session.js";

export type GatewayRequest = SessionRequest & { readonly method: string; readonly csrfToken?: string };
export type GatewayValidation = SessionValidationResult & { readonly sessionVersion: number; readonly accountSwitchGeneration: number };

export class ServerSessionGateway {
  private readonly validator: OnyxServerSessionValidator;
  private readonly revoked = new Map<string, number>();
  private readonly csrf = new Map<string, string>();
  constructor(private readonly authority: OnyxSessionAuthority, private readonly now: () => number = Date.now) { this.validator = new OnyxServerSessionValidator(authority, now); }
  issueCsrf(sessionRef: string): string { const token = randomBytes(32).toString("base64url"); this.csrf.set(sessionRef, token); return token; }
  revoke(context: ServerSessionContext): void { this.revoked.set(context.sessionRef, context.sessionVersion); }
  async validate(request: GatewayRequest, purpose: string, capabilityFingerprint: string, expectedAccount?: string): Promise<GatewayValidation> {
    const result = await this.validator.validate(request, purpose, capabilityFingerprint, expectedAccount);
    const revokedVersion = this.revoked.get(result.context.sessionRef);
    if (revokedVersion !== undefined && result.context.sessionVersion <= revokedVersion) throw new Error("Session revoked");
    if (request.method !== "GET") {
      if (!request.origin || request.origin !== request.expectedOrigin) throw new Error("Origin rejected");
      if (!request.csrfToken || this.csrf.get(result.context.sessionRef) !== request.csrfToken) throw new Error("CSRF rejected");
      this.csrf.delete(result.context.sessionRef);
    }
    return { ...result, sessionVersion: result.context.sessionVersion, accountSwitchGeneration: result.context.accountSwitchGeneration };
  }
}