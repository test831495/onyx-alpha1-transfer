import type { CredentialBinding, CredentialRecord } from "@onyx/provider-neutral-credential-store-session-foundation";
import { canonicalizeMicrosoftCapabilities, fingerprintForMicrosoftCapabilities, MICROSOFT_READ_CAPABILITIES, type MicrosoftReadCapability } from "./capabilities.js";
import {
  projectMicrosoftSharePointPolicy,
  type MicrosoftAccountKind,
  type MicrosoftTenantEligibility,
} from "./tenant-policy.js";
import { MICROSOFT_PROVIDER_ID, MICROSOFT_PURPOSE, type MicrosoftServerRuntime } from "./index.js";

export const MICROSOFT_STATUS_STATES = [
  "CONNECTED",
  "CONNECTED_PARTIAL",
  "NOT_CONNECTED",
  "NOT_GRANTED",
  "CONFIGURATION_UNAVAILABLE",
  "EXPIRED",
  "REFRESH_REQUIRED",
  "REVOKED",
  "ACCOUNT_MISMATCH",
  "TENANT_MISMATCH",
  "POLICY_BLOCKED",
  "UNSUPPORTED_ACCOUNT_TYPE",
  "ERROR_SAFE",
] as const;
export type MicrosoftStatusState = (typeof MICROSOFT_STATUS_STATES)[number];

// A raw lookup distinct from findActive lets status truthfully report expired/refresh-required/
// revoked states without ever widening the strict ACTIVE/ROTATING gate used for execution.
export type MicrosoftRawCredentialRecord = CredentialRecord & { readonly expired?: boolean };
export interface MicrosoftStatusCredentialLookup {
  findAny?(binding: CredentialBinding): Promise<MicrosoftRawCredentialRecord | undefined>;
}

function connectorAccountRef(account: string, tenantId: string): string {
  return `microsoft-account:${account}:${tenantId}`;
}

function binding(account: string, tenantId: string, capabilityFingerprint: string): CredentialBinding {
  return { canonicalAccountRef: account, providerId: MICROSOFT_PROVIDER_ID, connectorAccountRef: connectorAccountRef(account, tenantId), credentialType: "oauth-refresh-token", purpose: MICROSOFT_PURPOSE, capabilityFingerprint };
}

const microsoftReadCapabilityFingerprints = (() => {
  const fingerprints = new Set<string>();
  for (let mask = 1; mask < 1 << MICROSOFT_READ_CAPABILITIES.length; mask += 1) {
    const subset = canonicalizeMicrosoftCapabilities(MICROSOFT_READ_CAPABILITIES.filter((_, index) => (mask & (1 << index)) !== 0));
    fingerprints.add(fingerprintForMicrosoftCapabilities(subset));
  }
  return Object.freeze([...fingerprints].sort((left, right) => right.split("|").length - left.split("|").length || left.localeCompare(right)));
})();

function matchingMicrosoftCapabilityFingerprints(requiredCapability: MicrosoftReadCapability): readonly string[] {
  return microsoftReadCapabilityFingerprints.filter((fingerprint) => fingerprint.split("|").includes(requiredCapability));
}

function bindingMatchesRecord(record: CredentialRecord, candidateBinding: CredentialBinding, account: string, capabilityFingerprint: string): boolean {
  return record.canonicalAccountRef === account
    && record.providerId === MICROSOFT_PROVIDER_ID
    && record.connectorAccountRef === candidateBinding.connectorAccountRef
    && record.credentialType === candidateBinding.credentialType
    && record.purpose === MICROSOFT_PURPOSE
    && record.capabilityFingerprint === capabilityFingerprint;
}

// Canonical resolver: the only path execution handlers may use. Retries across canonical
// candidate fingerprints, but only ever accepts an ACTIVE/ROTATING record whose full binding
// matches exactly - expired, revoked, malformed, or cross-account/tenant records are denied.
export async function resolveMicrosoftCredentialBinding(runtime: MicrosoftServerRuntime, account: string, tenantId: string, requiredCapability: MicrosoftReadCapability): Promise<{ binding: CredentialBinding; record: CredentialRecord } | undefined> {
  if (!(MICROSOFT_READ_CAPABILITIES as readonly string[]).includes(requiredCapability)) return undefined;
  for (const capabilityFingerprint of matchingMicrosoftCapabilityFingerprints(requiredCapability)) {
    const candidateBinding = binding(account, tenantId, capabilityFingerprint);
    let record: CredentialRecord | undefined;
    try {
      record = await runtime.credentialStore.findActive(candidateBinding);
    } catch {
      throw new Error("Microsoft credential storage is unavailable.");
    }
    if (!record || !(record.state === "ACTIVE" || record.state === "ROTATING")) continue;
    if (!bindingMatchesRecord(record, candidateBinding, account, capabilityFingerprint)) continue;
    return { binding: candidateBinding, record };
  }
  return undefined;
}

export type MicrosoftCapabilityStatusProjectionInput = {
  readonly runtime: MicrosoftServerRuntime;
  readonly rawLookup?: MicrosoftStatusCredentialLookup;
  readonly account: string;
  readonly tenantId: string;
  readonly accountKind: MicrosoftAccountKind;
  readonly tenantEligibility: MicrosoftTenantEligibility;
};

export async function projectMicrosoftReadCapabilityStatus(input: MicrosoftCapabilityStatusProjectionInput, capability: MicrosoftReadCapability): Promise<MicrosoftStatusState> {
  if (capability === "SHAREPOINT_READ") {
    const sharePointPolicy = projectMicrosoftSharePointPolicy(input.accountKind, input.tenantEligibility);
    if (sharePointPolicy === "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT") return "UNSUPPORTED_ACCOUNT_TYPE";
    if (sharePointPolicy === "SHAREPOINT_POLICY_BLOCKED") return input.tenantEligibility === "TENANT_MISMATCH" ? "TENANT_MISMATCH" : "POLICY_BLOCKED";
  } else {
    if (input.tenantEligibility === "TENANT_MISMATCH") return "TENANT_MISMATCH";
    if (input.tenantEligibility === "TENANT_UNKNOWN" || input.tenantEligibility === "TENANT_REQUIRED_MISSING") return "POLICY_BLOCKED";
  }

  const rawLookup = input.rawLookup;
  if (rawLookup?.findAny) {
    for (const capabilityFingerprint of matchingMicrosoftCapabilityFingerprints(capability)) {
      const candidateBinding = binding(input.account, input.tenantId, capabilityFingerprint);
      let record: MicrosoftRawCredentialRecord | undefined;
      try {
        record = await rawLookup.findAny(candidateBinding);
      } catch {
        return "ERROR_SAFE";
      }
      if (!record || !bindingMatchesRecord(record, candidateBinding, input.account, capabilityFingerprint)) continue;
      if (record.state === "REVOKED" || record.state === "DELETED") return "REVOKED";
      if (record.state === "REAUTHENTICATION_REQUIRED") return "REFRESH_REQUIRED";
      if (record.state === "QUARANTINED") return "POLICY_BLOCKED";
      if (record.expired) return "EXPIRED";
      if (record.state === "ACTIVE" || record.state === "ROTATING") return "CONNECTED";
    }
    return "NOT_GRANTED";
  }

  try {
    const resolved = await resolveMicrosoftCredentialBinding(input.runtime, input.account, input.tenantId, capability);
    return resolved ? "CONNECTED" : "NOT_GRANTED";
  } catch {
    return "ERROR_SAFE";
  }
}

export type MicrosoftStatusProjection = {
  readonly status: "CONNECTED" | "CONNECTED_PARTIAL" | "NOT_CONNECTED" | "ERROR_SAFE" | "CONFIGURATION_UNAVAILABLE";
  readonly capabilities: Readonly<Record<MicrosoftReadCapability, MicrosoftStatusState>>;
  readonly writeCapability: "NOT_GRANTED";
};

// Files.ReadWrite scope possession never surfaces write availability here: write status is
// always NOT_GRANTED from this projection until a separate approval-aware caller supplies one.
export async function projectMicrosoftStatus(input: MicrosoftCapabilityStatusProjectionInput): Promise<MicrosoftStatusProjection> {
  if (!input.runtime.policy.credentialOperationsEnabled) {
    const unavailable = Object.fromEntries(MICROSOFT_READ_CAPABILITIES.map((capability) => [capability, "CONFIGURATION_UNAVAILABLE" as const])) as Record<MicrosoftReadCapability, MicrosoftStatusState>;
    return { status: "CONFIGURATION_UNAVAILABLE", capabilities: unavailable, writeCapability: "NOT_GRANTED" };
  }
  const entries = await Promise.all(MICROSOFT_READ_CAPABILITIES.map(async (capability) => [capability, await projectMicrosoftReadCapabilityStatus(input, capability)] as const));
  const capabilities = Object.fromEntries(entries) as Record<MicrosoftReadCapability, MicrosoftStatusState>;
  const connectedCount = entries.filter(([, state]) => state === "CONNECTED").length;
  const status = connectedCount === 0 ? "NOT_CONNECTED" : connectedCount === MICROSOFT_READ_CAPABILITIES.length ? "CONNECTED" : "CONNECTED_PARTIAL";
  return { status, capabilities, writeCapability: "NOT_GRANTED" };
}

export type MicrosoftDisconnectResult = {
  readonly status: "DISCONNECTED";
  readonly tombstoned: readonly string[];
};

// Disconnect targets only the exact canonical account+tenant binding; it never reaches into
// another account's or tenant's credential records, and repeated calls remain idempotent.
export async function disconnectMicrosoftAccount(runtime: MicrosoftServerRuntime, account: string, tenantId: string): Promise<MicrosoftDisconnectResult> {
  const tombstoned = new Set<string>();
  for (const capability of MICROSOFT_READ_CAPABILITIES) {
    const resolved = await resolveMicrosoftCredentialBinding(runtime, account, tenantId, capability);
    if (resolved && !tombstoned.has(resolved.record.recordId)) {
      await runtime.credentialStore.delete(resolved.record.recordId, resolved.binding);
      tombstoned.add(resolved.record.recordId);
    }
  }
  return { status: "DISCONNECTED", tombstoned: Object.freeze([...tombstoned]) };
}
