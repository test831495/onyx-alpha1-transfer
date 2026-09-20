export const MICROSOFT_READ_CAPABILITIES = [
  "PROFILE_READ",
  "MAIL_READ",
  "CALENDAR_READ",
  "FILES_READ",
  "SHAREPOINT_READ",
] as const;
export type MicrosoftReadCapability = (typeof MICROSOFT_READ_CAPABILITIES)[number];

export const MICROSOFT_WRITE_CAPABILITIES = ["FILES_WRITE_APPROVAL_REQUIRED"] as const;
export type MicrosoftWriteCapability = (typeof MICROSOFT_WRITE_CAPABILITIES)[number];

export const MICROSOFT_SYNTHETIC_CAPABILITIES = ["FILES_SYNTHETIC_WRITE_VALIDATION"] as const;
export type MicrosoftSyntheticCapability = (typeof MICROSOFT_SYNTHETIC_CAPABILITIES)[number];

export const MICROSOFT_CAPABILITIES = [
  ...MICROSOFT_READ_CAPABILITIES,
  ...MICROSOFT_WRITE_CAPABILITIES,
  ...MICROSOFT_SYNTHETIC_CAPABILITIES,
] as const;
export type MicrosoftCapability = (typeof MICROSOFT_CAPABILITIES)[number];

// Files.ReadWrite is the only Graph scope currently consented for OneDrive/SharePoint;
// possessing it grants read eligibility only. Write execution additionally requires an
// explicit approval fact evaluated by write-governance.ts, never scope possession alone.
export const MICROSOFT_CAPABILITY_SCOPE_MAP: Readonly<Record<MicrosoftCapability, readonly string[]>> = Object.freeze({
  PROFILE_READ: Object.freeze(["User.Read"]),
  MAIL_READ: Object.freeze(["Mail.ReadBasic"]),
  CALENDAR_READ: Object.freeze(["Calendars.Read"]),
  FILES_READ: Object.freeze(["Files.ReadWrite"]),
  SHAREPOINT_READ: Object.freeze(["Files.ReadWrite"]),
  FILES_WRITE_APPROVAL_REQUIRED: Object.freeze(["Files.ReadWrite"]),
  FILES_SYNTHETIC_WRITE_VALIDATION: Object.freeze(["Files.ReadWrite"]),
});

export function canonicalizeMicrosoftCapabilities(capabilities: readonly string[]): readonly MicrosoftCapability[] {
  const normalized = new Set<string>();
  for (const capability of capabilities) {
    if (!MICROSOFT_CAPABILITIES.includes(capability as MicrosoftCapability)) throw new Error("Microsoft capability request rejected.");
    normalized.add(capability);
  }
  if (normalized.size === 0) throw new Error("Microsoft capability set is empty.");
  return Object.freeze([...normalized].sort((left, right) => left.localeCompare(right))) as readonly MicrosoftCapability[];
}

export function fingerprintForMicrosoftCapabilities(capabilities: readonly string[]): string {
  return canonicalizeMicrosoftCapabilities(capabilities).join("|");
}

export function scopeFingerprintForMicrosoftCapabilities(capabilities: readonly string[]): string {
  const canonical = canonicalizeMicrosoftCapabilities(capabilities);
  const scopes = new Set<string>();
  for (const capability of canonical) {
    for (const scope of MICROSOFT_CAPABILITY_SCOPE_MAP[capability]) scopes.add(scope);
  }
  return [...scopes].sort((left, right) => left.localeCompare(right)).join("|");
}

export function isMicrosoftWriteCapability(capability: string): capability is MicrosoftWriteCapability {
  return (MICROSOFT_WRITE_CAPABILITIES as readonly string[]).includes(capability);
}

export function isMicrosoftSyntheticCapability(capability: string): capability is MicrosoftSyntheticCapability {
  return (MICROSOFT_SYNTHETIC_CAPABILITIES as readonly string[]).includes(capability);
}

// Read capability presence never authorizes write; and synthetic-write-validation capability
// is a distinct, non-executing capability that never widens general write authority.
export function capabilitySetImpliesGeneralWriteAuthority(capabilities: readonly string[]): boolean {
  return false;
}
