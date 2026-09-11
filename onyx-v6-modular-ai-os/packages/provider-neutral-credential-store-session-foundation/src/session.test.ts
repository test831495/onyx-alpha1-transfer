import { describe, expect, it } from "vitest";
import { OnyxServerSessionValidator, ServerSessionContext } from "./session.js";

const context: ServerSessionContext = { sessionRef: "session-1", canonicalAccountRef: "account-1", accountSwitchGeneration: 1, authenticationAssurance: "strong", deviceTrust: "trusted", roleClass: "member", policyVersion: "policy-1", issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z", sessionVersion: 1 };

describe("ONYX server session validation", () => {
  it("delegates proof verification to ONYX and rejects missing, expired, or wrong-account sessions", async () => {
    const authority = { issue: async () => "proof", verify: async (proof: string) => proof === "proof" ? context : undefined };
    const validator = new OnyxServerSessionValidator(authority, () => Date.parse("2026-06-01T00:00:00.000Z"));
    await expect(validator.validate({ sessionProof: "proof" }, "calendar.connect", "cap-1", "account-1")).resolves.toMatchObject({ context });
    await expect(validator.validate({}, "calendar.connect", "cap-1")).rejects.toThrow("Session required");
    await expect(validator.validate({ sessionProof: "proof" }, "calendar.connect", "cap-1", "account-2")).rejects.toThrow("Account rejected");
    await expect(validator.validate({ sessionProof: "other" }, "calendar.connect", "cap-1")).rejects.toThrow("Session rejected");
  });
});