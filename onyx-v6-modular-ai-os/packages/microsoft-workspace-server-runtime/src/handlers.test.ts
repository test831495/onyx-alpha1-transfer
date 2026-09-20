import { describe, expect, it } from "vitest";
import { fingerprintForMicrosoftCapabilities, MICROSOFT_READ_CAPABILITIES } from "./capabilities";
import { disconnectMicrosoftAccount, projectMicrosoftReadCapabilityStatus, projectMicrosoftStatus, resolveMicrosoftCredentialBinding, type MicrosoftRawCredentialRecord } from "./handlers";
import type { MicrosoftServerRuntime } from "./index";

const fullFingerprint = fingerprintForMicrosoftCapabilities(MICROSOFT_READ_CAPABILITIES);

const activeRuntime = (records: Record<string, Record<string, unknown>>, options: { credentialOperationsEnabled?: boolean; deleted?: string[] } = {}) => {
  const deleted = options.deleted ?? [];
  return {
    policy: { credentialOperationsEnabled: options.credentialOperationsEnabled ?? true },
    credentialStore: {
      findActive: async (binding: Record<string, unknown>) => {
        const record = records[String(binding.capabilityFingerprint)];
        if (!record || deleted.includes(record.recordId as string)) return undefined;
        const intendedConnectorAccountRef = (record.connectorAccountRef as string | undefined) ?? "microsoft-account:account-1:tenant-1";
        if (binding.connectorAccountRef !== intendedConnectorAccountRef) return undefined;
        return { ...binding, ...record };
      },
      create: async () => undefined,
      delete: async (recordId: string) => { deleted.push(recordId); },
    },
  } as unknown as MicrosoftServerRuntime;
};

describe("Microsoft canonical credential binding resolver", () => {
  it("resolves a full read grant for every individual capability", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full-record", state: "ACTIVE" } });
    for (const capability of MICROSOFT_READ_CAPABILITIES) {
      expect(await resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-1", capability)).toBeDefined();
    }
  });

  it("denies an account mismatch", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "r1", state: "ACTIVE", canonicalAccountRef: "account-2" } });
    expect(await resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-1", "MAIL_READ")).toBeUndefined();
  });

  it("denies a tenant mismatch (embedded in the connector account reference)", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "r1", state: "ACTIVE" } });
    // Bound under tenant-1; requesting under a different tenant must not resolve.
    expect(await resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-2", "MAIL_READ")).toBeUndefined();
  });

  it("denies a session-scoped mismatch surfaced as a storage lookup miss", async () => {
    const runtime = activeRuntime({});
    expect(await resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-1", "MAIL_READ")).toBeUndefined();
  });

  it("denies a malformed record", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "r1", state: "ACTIVE", providerId: "other" } });
    expect(await resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-1", "MAIL_READ")).toBeUndefined();
  });

  it("fails closed on storage failure without leaking the underlying error detail", async () => {
    const runtime = { policy: { credentialOperationsEnabled: true }, credentialStore: { findActive: async () => { throw new Error("storage unavailable: connection string contains secret=abc123"); } } } as unknown as MicrosoftServerRuntime;
    await expect(resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-1", "MAIL_READ")).rejects.toThrow("Microsoft credential storage is unavailable.");
  });

  it("never leaks a credential secret value in the resolved binding", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full-record", state: "ACTIVE" } });
    const resolved = await resolveMicrosoftCredentialBinding(runtime, "account-1", "tenant-1", "MAIL_READ");
    expect(resolved).not.toHaveProperty("record.encryptedPayload.plaintext");
    expect(JSON.stringify(resolved)).not.toMatch(/refresh-token-value|client-secret-value|Bearer\s/i);
  });
});

describe("Microsoft status projection", () => {
  const eligibleInput = (runtime: MicrosoftServerRuntime) => ({
    runtime,
    account: "account-1",
    tenantId: "tenant-1",
    accountKind: "ORGANIZATIONAL" as const,
    tenantEligibility: "ELIGIBLE" as const,
  });

  it("reports zero grants", async () => {
    const runtime = activeRuntime({});
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.status).toBe("NOT_CONNECTED");
    expect(status.writeCapability).toBe("NOT_GRANTED");
  });

  it("reports mail-only as connected-partial", async () => {
    const fingerprint = fingerprintForMicrosoftCapabilities(["MAIL_READ"]);
    const runtime = activeRuntime({ [fingerprint]: { recordId: "r1", state: "ACTIVE" } });
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.status).toBe("CONNECTED_PARTIAL");
    expect(status.capabilities.MAIL_READ).toBe("CONNECTED");
    expect(status.capabilities.CALENDAR_READ).toBe("NOT_GRANTED");
  });

  it("reports calendar-only as connected-partial", async () => {
    const fingerprint = fingerprintForMicrosoftCapabilities(["CALENDAR_READ"]);
    const runtime = activeRuntime({ [fingerprint]: { recordId: "r1", state: "ACTIVE" } });
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.capabilities.CALENDAR_READ).toBe("CONNECTED");
  });

  it("reports files-read-only as connected-partial", async () => {
    const fingerprint = fingerprintForMicrosoftCapabilities(["FILES_READ"]);
    const runtime = activeRuntime({ [fingerprint]: { recordId: "r1", state: "ACTIVE" } });
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.capabilities.FILES_READ).toBe("CONNECTED");
  });

  it("reports a full read set as connected", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full", state: "ACTIVE" } });
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.status).toBe("CONNECTED");
    expect(Object.values(status.capabilities).every((state) => state === "CONNECTED")).toBe(true);
  });

  it("reports configuration unavailable when credential operations are disabled", async () => {
    const runtime = activeRuntime({}, { credentialOperationsEnabled: false });
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.status).toBe("CONFIGURATION_UNAVAILABLE");
  });

  it("reports tenant-policy-blocked when the tenant is unknown or missing", async () => {
    const runtime = activeRuntime({});
    const state = await projectMicrosoftReadCapabilityStatus({ runtime, account: "account-1", tenantId: "tenant-1", accountKind: "ORGANIZATIONAL", tenantEligibility: "TENANT_UNKNOWN" }, "MAIL_READ");
    expect(state).toBe("POLICY_BLOCKED");
  });

  it("distinguishes expired, refresh-required, and revoked credentials via the raw lookup", async () => {
    const runtime = activeRuntime({});
    const rawRecordFor = (state: string, expired = false): MicrosoftRawCredentialRecord => ({
      recordId: "r1",
      canonicalAccountRef: "account-1",
      providerId: "microsoft",
      connectorAccountRef: "microsoft-account:account-1:tenant-1",
      credentialType: "oauth-refresh-token",
      purpose: "microsoft-workspace-connector-v1",
      capabilityFingerprint: fingerprintForMicrosoftCapabilities(["MAIL_READ"]),
      encryptedPayload: {} as never,
      encryptionKeyVersion: "v1",
      recordVersion: 0,
      state: state as never,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      expired,
    });
    const expiredLookup = { findAny: async () => rawRecordFor("ACTIVE", true) };
    expect(await projectMicrosoftReadCapabilityStatus({ runtime, rawLookup: expiredLookup, account: "account-1", tenantId: "tenant-1", accountKind: "ORGANIZATIONAL", tenantEligibility: "ELIGIBLE" }, "MAIL_READ")).toBe("EXPIRED");
    const refreshRequiredLookup = { findAny: async () => rawRecordFor("REAUTHENTICATION_REQUIRED") };
    expect(await projectMicrosoftReadCapabilityStatus({ runtime, rawLookup: refreshRequiredLookup, account: "account-1", tenantId: "tenant-1", accountKind: "ORGANIZATIONAL", tenantEligibility: "ELIGIBLE" }, "MAIL_READ")).toBe("REFRESH_REQUIRED");
    const revokedLookup = { findAny: async () => rawRecordFor("REVOKED") };
    expect(await projectMicrosoftReadCapabilityStatus({ runtime, rawLookup: revokedLookup, account: "account-1", tenantId: "tenant-1", accountKind: "ORGANIZATIONAL", tenantEligibility: "ELIGIBLE" }, "MAIL_READ")).toBe("REVOKED");
  });

  it("restricts SharePoint for a personal account regardless of Files.ReadWrite grant", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full", state: "ACTIVE" } });
    const state = await projectMicrosoftReadCapabilityStatus({ runtime, account: "account-1", tenantId: "tenant-1", accountKind: "PERSONAL", tenantEligibility: "ELIGIBLE" }, "SHAREPOINT_READ");
    expect(state).toBe("UNSUPPORTED_ACCOUNT_TYPE");
  });

  it("never reports write availability from Files.ReadWrite scope possession alone", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full", state: "ACTIVE" } });
    const status = await projectMicrosoftStatus(eligibleInput(runtime));
    expect(status.writeCapability).toBe("NOT_GRANTED");
  });
});

describe("Microsoft disconnect foundation", () => {
  it("tombstones only the current account and tenant binding", async () => {
    const deleted: string[] = [];
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full-record", state: "ACTIVE" } }, { deleted });
    const result = await disconnectMicrosoftAccount(runtime, "account-1", "tenant-1");
    expect(result.status).toBe("DISCONNECTED");
    expect(result.tombstoned).toEqual(["full-record"]);
    expect(deleted).toEqual(["full-record"]);
  });

  it("denies a disconnect scoped to the wrong account", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full-record", state: "ACTIVE", canonicalAccountRef: "account-2" } });
    const result = await disconnectMicrosoftAccount(runtime, "account-1", "tenant-1");
    expect(result.tombstoned).toEqual([]);
  });

  it("denies a disconnect scoped to the wrong tenant", async () => {
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full-record", state: "ACTIVE" } });
    const result = await disconnectMicrosoftAccount(runtime, "account-1", "tenant-2");
    expect(result.tombstoned).toEqual([]);
  });

  it("remains idempotent across repeated calls", async () => {
    const deleted: string[] = [];
    const runtime = activeRuntime({ [fullFingerprint]: { recordId: "full-record", state: "ACTIVE" } }, { deleted });
    await disconnectMicrosoftAccount(runtime, "account-1", "tenant-1");
    const second = await disconnectMicrosoftAccount(runtime, "account-1", "tenant-1");
    expect(second.status).toBe("DISCONNECTED");
    expect(second.tombstoned).toEqual([]);
  });

  it("sanitizes a raw storage error thrown by credentialStore.delete instead of propagating it", async () => {
    const runtime = {
      policy: { credentialOperationsEnabled: true },
      credentialStore: {
        findActive: async (binding: Record<string, unknown>) => ({ ...binding, recordId: "full-record", state: "ACTIVE" }),
        delete: async () => { throw new Error("connection string password=hunter2 unreachable"); },
      },
    } as unknown as MicrosoftServerRuntime;
    await expect(disconnectMicrosoftAccount(runtime, "account-1", "tenant-1")).rejects.toThrow("Microsoft credential storage is unavailable.");
  });
});
