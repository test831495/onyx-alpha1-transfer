import { randomBytes } from "node:crypto";
import { OnyxServerSessionValidator, type OnyxSessionAuthority, type ServerSessionContext, type SessionRequest, type SessionValidationResult } from "./session.js";
import type { ServerSessionRepository } from "./session-issuer.js";

export type GatewayRequest = SessionRequest & { readonly method: string; readonly csrfToken?: string; readonly contentType?: string; readonly idempotencyKey?: string };
export type GatewayValidation = SessionValidationResult & { readonly sessionVersion: number; readonly accountSwitchGeneration: number };

export class ServerSessionGateway {
  private readonly validator: OnyxServerSessionValidator;
  private readonly revoked = new Map<string, number>();
  private readonly csrf = new Map<string, string>();
  constructor(private readonly authority: OnyxSessionAuthority, private readonly now: () => number = Date.now, repository?: Pick<ServerSessionRepository, "get">) { this.validator = new OnyxServerSessionValidator(authority, now, repository); }
  issueCsrf(sessionRef: string): string { const token = randomBytes(32).toString("base64url"); this.csrf.set(sessionRef, token); return token; }
  revoke(context: ServerSessionContext): void { this.revoked.set(context.sessionRef, context.sessionVersion); }
  async validate(request: GatewayRequest, purpose: string, capabilityFingerprint: string, expectedAccount?: string, expectedAccountSwitchGeneration?: number): Promise<GatewayValidation> {
    const result = await this.validator.validate(request, purpose, capabilityFingerprint, expectedAccount, expectedAccountSwitchGeneration);
    const revokedVersion = this.revoked.get(result.context.sessionRef);
    if (revokedVersion !== undefined && result.context.sessionVersion <= revokedVersion) throw new Error("Session revoked");
    if (request.method !== "GET") {
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) throw new Error("Method rejected");
      if (!request.origin || request.origin !== request.expectedOrigin) throw new Error("Origin rejected");
      if (request.contentType !== "application/json") throw new Error("Content type rejected");
      if (!request.idempotencyKey) throw new Error("Idempotency key required");
      if (!request.csrfToken || this.csrf.get(result.context.sessionRef) !== request.csrfToken) throw new Error("CSRF rejected");
      this.csrf.delete(result.context.sessionRef);
    }
    return { ...result, sessionVersion: result.context.sessionVersion, accountSwitchGeneration: result.context.accountSwitchGeneration };
  }
}