import { randomBytes } from "node:crypto";
import { OnyxServerSessionValidator, type OnyxSessionAuthority, type ServerSessionContext, type SessionRequest, type SessionValidationResult } from "./session.js";
import type { ServerSessionRepository } from "./session-issuer.js";

export type GatewayRequest = SessionRequest & { readonly method: string; readonly csrfToken?: string; readonly contentType?: string; readonly idempotencyKey?: string };
export type GatewayValidation = SessionValidationResult & { readonly sessionVersion: number; readonly accountSwitchGeneration: number };

export class ServerSessionGateway {
  private readonly validator: OnyxServerSessionValidator;
  constructor(private readonly authority: OnyxSessionAuthority, private readonly now: () => number, private readonly repository: ServerSessionRepository) { this.validator = new OnyxServerSessionValidator(authority, now, repository); }
  async issueCsrf(sessionRef: string, lifetimeSeconds = 900): Promise<string> { const token = randomBytes(32).toString("base64url"); await this.repository.issueCsrf(sessionRef, token, new Date(this.now() + lifetimeSeconds * 1000).toISOString()); return token; }
  async revoke(context: ServerSessionContext): Promise<void> { await this.repository.revoke(context.sessionRef, "logout", new Date(this.now()).toISOString()); }
  async validate(request: GatewayRequest, purpose: string, capabilityFingerprint: string, expectedAccount?: string, expectedAccountSwitchGeneration?: number): Promise<GatewayValidation> {
    const result = await this.validator.validate(request, purpose, capabilityFingerprint, expectedAccount, expectedAccountSwitchGeneration);
    if (request.method !== "GET") {
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) throw new Error("Method rejected");
      if (!request.origin || request.origin !== request.expectedOrigin) throw new Error("Origin rejected");
      if (request.contentType !== "application/json") throw new Error("Content type rejected");
      if (!request.idempotencyKey) throw new Error("Idempotency key required");
      if (!request.csrfToken || !await this.repository.consumeCsrf(result.context.sessionRef, request.csrfToken, new Date(this.now()).toISOString())) throw new Error("CSRF rejected");
    }
    return { ...result, sessionVersion: result.context.sessionVersion, accountSwitchGeneration: result.context.accountSwitchGeneration };
  }
}