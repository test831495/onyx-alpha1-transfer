import { createHmac } from "node:crypto";
import type { TokenClaims } from "./contracts";

const base64url = (value: string) => Buffer.from(value).toString("base64url");
export const SYNTHETIC_ISSUER = "https://synthetic.identity.invalid/tenant";
export const SYNTHETIC_AUDIENCE = "onyx-command-center";
export const SYNTHETIC_KEYS = Object.freeze({ current: "synthetic-current-key", rotated: "synthetic-rotated-key" });
export const syntheticClaims = (overrides: Partial<TokenClaims> = {}): TokenClaims => ({ sub: "synthetic-account-a", sid: "synthetic-session-a", sv: 1, dv: "synthetic-device-a", rv: 0, assurance: "standard", iss: SYNTHETIC_ISSUER, aud: SYNTHETIC_AUDIENCE, iat: 1_700_000_000, exp: 1_700_003_600, nbf: 1_699_999_990, ...overrides });
export function signSyntheticToken(claims: TokenClaims = syntheticClaims(), keyId = "current", algorithm = "HS256", signingKey: string = SYNTHETIC_KEYS.current): string {
  const encodedHeader = base64url(JSON.stringify({ alg: algorithm, kid: keyId })); const encodedClaims = base64url(JSON.stringify(claims)); const signature = createHmac("sha256", signingKey).update(`${encodedHeader}.${encodedClaims}`).digest("base64url"); return `${encodedHeader}.${encodedClaims}.${signature}`;
}