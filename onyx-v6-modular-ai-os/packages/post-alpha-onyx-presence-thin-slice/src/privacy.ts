import { deepFreeze } from "./contracts";

export interface PrivacyInput {
  readonly disposition?: "PRIVATE" | "SHARED_ROOM_SAFE" | "UNKNOWN" | "MISSING" | "MALFORMED" | "CONFLICTING";
  readonly established?: boolean;
  readonly environment?: "TRUSTED_PRIVATE" | "SHARED_ROOM";
  readonly text: string;
}

export function projectPrivacy(input: PrivacyInput) {
  const disposition = input.disposition ?? (input.established === true ? input.environment === "SHARED_ROOM" ? "SHARED_ROOM_SAFE" : "PRIVATE" : "UNKNOWN");
  if (["UNKNOWN", "MISSING", "MALFORMED", "CONFLICTING"].includes(disposition)) return deepFreeze({ mode: "PRIVACY_RESTRICTED" as const, text: "Privacy could not be established.", authorizing: false as const });
  if (disposition === "SHARED_ROOM_SAFE") return deepFreeze({ mode: "SHARED_ROOM_REDACTED" as const, text: "Private detail available on a trusted personal display.", authorizing: false as const });
  return deepFreeze({ mode: "TRUSTED_PRIVATE" as const, text: input.text, authorizing: false as const });
}

export const PRIVACY_SECURITY_BOUNDARY = deepFreeze({
  ownerOnly: true as const,
  denyByDefault: true as const,
  sensitivity: "LOW_OR_SYNTHETIC_ONLY" as const,
  secrets: false as const,
  credentials: false as const,
  accessTokens: false as const,
  rawPrivateMemory: false as const,
  backgroundMicrophone: false as const,
  rawAudioRetention: false as const,
  camera: false as const,
  biometrics: false as const,
  recognition: false as const,
  location: false as const,
  householdData: false as const,
  externalWrites: false as const,
  approvalBypass: false as const,
  derivedAuthority: false as const,
});