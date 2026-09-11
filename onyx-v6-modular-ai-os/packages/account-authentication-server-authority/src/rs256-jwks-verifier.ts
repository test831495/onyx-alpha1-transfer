import { createPublicKey, verify } from "node:crypto";
import type { ServerAuthorityDecision, TokenClaims, TokenVerifier, VerificationDecision, VerifiedProof } from "./contracts";

export interface TrustedJwk { readonly kty: "RSA"; readonly kid: string; readonly n: string; readonly e: string; readonly use?: "sig"; readonly alg?: "RS256"; }
export interface TrustedJwkResolver { resolve(kid: string): TrustedJwk | undefined; }
export interface Rs256VerifierConfiguration { readonly issuer: string; readonly audiences: readonly string[]; readonly requiredScope?: string; readonly resolver: TrustedJwkResolver; readonly clockSkewSeconds: number; readonly maxTokenBytes: number; }
const deny = (code: ServerAuthorityDecision["code"]): VerificationDecision => Object.freeze({ allowed: false, code });
const decode = (value: string): string | undefined => { try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return undefined; } };

export class OidcJwksResolver implements TrustedJwkResolver {
  private readonly cache = new Map<string, TrustedJwk>();
  private lastFetchMs = 0;
  private inFlightFetch?: Promise<void>;

  public constructor(jwks: readonly TrustedJwk[] = [], private readonly jwksUri?: string) {
    for (const key of jwks) {
      if (key.kid) this.cache.set(key.kid, key);
    }
  }

  public resolve(kid: string): TrustedJwk | undefined {
    const existing = this.cache.get(kid);
    if (existing) return existing;
    if (this.jwksUri && Date.now() - this.lastFetchMs > 60000) {
      void this.refresh();
    }
    return undefined;
  }

  public async refresh(): Promise<void> {
    if (!this.jwksUri) return;
    const uri = this.jwksUri;
    if (this.inFlightFetch) return this.inFlightFetch;
    this.inFlightFetch = (async () => {
      try {
        const res = await fetch(uri);
        if (!res.ok) return;
        const data = (await res.json()) as { keys?: TrustedJwk[] };
        if (Array.isArray(data.keys)) {
          for (const key of data.keys) {
            if (key.kid && key.kty === "RSA") {
              this.cache.set(key.kid, key);
            }
          }
        }
        this.lastFetchMs = Date.now();
      } catch {
        // Safe fail-closed handling on network error
      } finally {
        this.inFlightFetch = undefined;
      }
    })();
    return this.inFlightFetch;
  }
}

export class Rs256JwksTokenVerifier implements TokenVerifier {
  private readonly verifier: SyntheticRs256JwksVerifier;
  public constructor(configuration: Rs256VerifierConfiguration) {
    this.verifier = new SyntheticRs256JwksVerifier(configuration);
  }
  public verify(proof: string, nowSeconds: number): VerificationDecision {
    return this.verifier.verify(proof, nowSeconds);
  }
}

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
    
    if (this.configuration.requiredScope) {
      const tokenScopes = typeof claims.scp === "string"
        ? claims.scp.split(" ")
        : Array.isArray(claims.scp)
        ? claims.scp
        : typeof claims.scope === "string"
        ? claims.scope.split(" ")
        : Array.isArray(claims.scope)
        ? claims.scope
        : Array.isArray(claims.roles)
        ? claims.roles
        : [];
      if (!tokenScopes.includes(this.configuration.requiredScope)) return deny("UNAUTHENTICATED");
    }

    const sub = claims.sub ?? (claims as any).oid;
    const sid = claims.sid ?? (claims as any).uti ?? (claims as any).rh ?? sub;
    if (!sub || !sid) return deny("UNAUTHENTICATED");

    const verified: VerifiedProof = Object.freeze({ claims: Object.freeze({ ...claims, sub, sid }), keyId: header.kid });
    return Object.freeze({ allowed: true, code: "AUTHENTICATED", proof: verified });
  }
}