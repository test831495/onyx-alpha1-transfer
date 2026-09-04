import { createPublicKey, verify } from "node:crypto";
import type { ServerAuthorityDecision, TokenClaims, VerificationDecision, VerifiedProof } from "./contracts";

export interface TrustedJwk { readonly kty: "RSA"; readonly kid: string; readonly n: string; readonly e: string; readonly use?: "sig"; readonly alg?: "RS256"; }
export interface TrustedJwkResolver { resolve(kid: string): TrustedJwk | undefined; }
export interface Rs256VerifierConfiguration { readonly issuer: string; readonly audiences: readonly string[]; readonly resolver: TrustedJwkResolver; readonly clockSkewSeconds: number; readonly maxTokenBytes: number; }
const deny = (code: ServerAuthorityDecision["code"]): VerificationDecision => Object.freeze({ allowed: false, code });
const decode = (value: string): string | undefined => { try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return undefined; } };

export class SyntheticRs256JwksVerifier {
  public constructor(private readonly configuration: Rs256VerifierConfiguration) {}
  public verify(proof: string, nowSeconds: number): VerificationDecision {
    if (!Number.isFinite(nowSeconds) || proof.length === 0 || Buffer.byteLength(proof) > this.configuration.maxTokenBytes) return deny("TOKEN_MALFORMED");
    const parts = proof.split("."); if (parts.length !== 3) return deny("TOKEN_MALFORMED");
    const [encodedHeader, encodedClaims, encodedSignature] = parts as [string, string, string];
    if (encodedHeader.length > 2048 || encodedClaims.length > 8192 || encodedSignature.length > 2048) return deny("TOKEN_MALFORMED");
    const headerText = decode(encodedHeader); const claimsText = decode(encodedClaims); if (!headerText || !claimsText) return deny("TOKEN_MALFORMED");
    let header: { alg?: string; kid?: string }; let claims: TokenClaims;
    try { header = JSON.parse(headerText) as { alg?: string; kid?: string }; claims = JSON.parse(claimsText) as TokenClaims; } catch { return deny("TOKEN_MALFORMED"); }
    if (header.alg !== "RS256" || !header.kid || header.kid.length > 96) return deny("TOKEN_MALFORMED");
    const jwk = this.configuration.resolver.resolve(header.kid); if (!jwk) return deny("TOKEN_SIGNATURE_INVALID");
    if (jwk.kty !== "RSA" || jwk.alg !== "RS256" || jwk.use !== "sig" || !jwk.n || !jwk.e) return deny("TOKEN_SIGNATURE_INVALID");
    try { if (!verify("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedClaims}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(encodedSignature, "base64url"))) return deny("TOKEN_SIGNATURE_INVALID"); } catch { return deny("TOKEN_SIGNATURE_INVALID"); }
    if (claims.iss !== this.configuration.issuer) return deny("TOKEN_ISSUER_INVALID");
    const audiences = typeof claims.aud === "string" ? [claims.aud] : claims.aud;
    if (!audiences?.some((audience) => this.configuration.audiences.includes(audience))) return deny("TOKEN_AUDIENCE_INVALID");
    if (typeof claims.exp !== "number" || nowSeconds - this.configuration.clockSkewSeconds >= claims.exp) return deny("TOKEN_EXPIRED");
    if (typeof claims.nbf === "number" && nowSeconds + this.configuration.clockSkewSeconds < claims.nbf) return deny("TOKEN_NOT_YET_VALID");
    if (!claims.sub || !claims.sid || !claims.dv || typeof claims.sv !== "number" || typeof claims.rv !== "number" || !claims.assurance) return deny("UNAUTHENTICATED");
    const verified: VerifiedProof = Object.freeze({ claims: Object.freeze({ ...claims }), keyId: header.kid });
    return Object.freeze({ allowed: true, code: "AUTHENTICATED", proof: verified });
  }
}