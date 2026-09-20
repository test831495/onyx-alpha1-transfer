import { describe, expect, it } from "vitest";
import {
  canonicalizeMicrosoftCapabilities,
  capabilitySetImpliesGeneralWriteAuthority,
  fingerprintForMicrosoftCapabilities,
  isMicrosoftSyntheticCapability,
  isMicrosoftWriteCapability,
  MICROSOFT_CAPABILITIES,
  scopeFingerprintForMicrosoftCapabilities,
} from "./capabilities";

describe("Microsoft capability model", () => {
  it("rejects an empty capability set", () => {
    expect(() => canonicalizeMicrosoftCapabilities([])).toThrow();
  });

  it("removes duplicates deterministically", () => {
    expect(canonicalizeMicrosoftCapabilities(["MAIL_READ", "MAIL_READ", "PROFILE_READ"])).toEqual(["MAIL_READ", "PROFILE_READ"]);
  });

  it("rejects unknown capabilities", () => {
    expect(() => canonicalizeMicrosoftCapabilities(["UNKNOWN_CAPABILITY"])).toThrow();
  });

  it("produces deterministic ordering independent of input order", () => {
    const forward = canonicalizeMicrosoftCapabilities(["SHAREPOINT_READ", "CALENDAR_READ", "MAIL_READ"]);
    const reversed = canonicalizeMicrosoftCapabilities(["MAIL_READ", "CALENDAR_READ", "SHAREPOINT_READ"]);
    expect(forward).toEqual(reversed);
  });

  it("produces a deterministic fingerprint independent of input order and duplicates", () => {
    const a = fingerprintForMicrosoftCapabilities(["MAIL_READ", "CALENDAR_READ"]);
    const b = fingerprintForMicrosoftCapabilities(["CALENDAR_READ", "MAIL_READ", "CALENDAR_READ"]);
    expect(a).toBe(b);
    expect(a).not.toMatch(/token|secret|Bearer/i);
  });

  it("keeps read and write capabilities as fully separate identifiers", () => {
    expect(isMicrosoftWriteCapability("FILES_WRITE_APPROVAL_REQUIRED")).toBe(true);
    expect(isMicrosoftWriteCapability("FILES_READ")).toBe(false);
    expect(isMicrosoftSyntheticCapability("FILES_SYNTHETIC_WRITE_VALIDATION")).toBe(true);
    expect(isMicrosoftSyntheticCapability("FILES_READ")).toBe(false);
  });

  it("does not let Files.ReadWrite scope possession create write approval", () => {
    const scopeFingerprint = scopeFingerprintForMicrosoftCapabilities(["FILES_READ"]);
    expect(scopeFingerprint).toContain("Files.ReadWrite");
    expect(capabilitySetImpliesGeneralWriteAuthority(["FILES_READ"])).toBe(false);
  });

  it("does not let synthetic write-validation capability create general write capability", () => {
    expect(capabilitySetImpliesGeneralWriteAuthority(["FILES_SYNTHETIC_WRITE_VALIDATION"])).toBe(false);
    expect(capabilitySetImpliesGeneralWriteAuthority(MICROSOFT_CAPABILITIES)).toBe(false);
  });
});
