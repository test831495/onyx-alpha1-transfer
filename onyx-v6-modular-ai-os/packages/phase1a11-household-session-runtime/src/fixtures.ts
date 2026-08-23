import { accounts, identities } from "@onyx/phase1a11-household-identity-runtime";
import { SESSION_POLICY } from "./policy";
import type { SessionCreationInput, SessionEvaluationInput, SessionVersionBinding, VerifiedAuthenticationFact } from "./model";
export const sessionVersions: SessionVersionBinding = { roleVersion: "role-1", policyVersion: "policy-1", permissionCatalogVersion: "permission-catalog-1" };
export const verifiedAuthentication: VerifiedAuthenticationFact = { accountId: identities.rahul.account.accountId, eventTime: "2026-08-23T12:00:00.000Z", assurance: "strong", methodClass: "local-verified", verifierReference: "verifier_fixture", eventReference: "auth-event_fixture_001", verificationResult: "verified", sessionCreationPermitted: true };
export const sessionCreationInput: SessionCreationInput = { identity: identities.rahul, authentication: verifiedAuthentication, policy: SESSION_POLICY, currentTime: "2026-08-23T12:00:00.000Z", deviceContextId: "device-context_fixture_001", versions: sessionVersions, auditAvailable: true, provenanceReference: "fixture-provenance" };
export { accounts, identities, SESSION_POLICY };
