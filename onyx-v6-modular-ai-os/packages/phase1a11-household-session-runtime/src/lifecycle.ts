import { validateIdentity, CURRENT_PERMISSION_CATALOG_VERSION, CURRENT_ROLE_VERSION, type AccountId, type HouseholdIdentityContext } from "@onyx/phase1a11-household-identity-runtime";
import { validateSessionPolicy } from "./policy";
import type { AccountSwitchRequest, AccountSwitchResult, CleanupManifest, ConcurrentSessionEvaluation, ConcurrentSessionPolicy, ConcurrentSessionReference, SessionCreationInput, SessionCreationResult, SessionRecord, SessionRevocationRequest, SessionRevocationResult, SessionRotationRequest, SessionRotationResult } from "./model";

const parsed = (value: string): number => new Date(value).getTime();
const invalidTime = (value: string): boolean => Number.isNaN(parsed(value));
const assuranceRank = (value: string): number => ({ low: 1, standard: 2, strong: 3 }[value] ?? 0);
const failure = (code: string, message: string): SessionCreationResult => ({ created: false, decisionCode: code, friendlyMessage: message, technicalReason: code });
function validCommon(input: SessionCreationInput): string | undefined {
  const time = parsed(input.currentTime);
  if (Number.isNaN(time)) return "INVALID_SESSION_TIME";
  const identity = validateIdentity(input.identity, input.currentTime);
  if (!identity.valid) return identity.technicalReason;
  const policy = validateSessionPolicy(input.policy, input.versions.policyVersion);
  if (!policy.valid) return policy.technicalReason;
  if (!input.deviceContextId) return "MISSING_DEVICE_CONTEXT";
  if (input.authentication.verificationResult !== "verified") return "AUTHENTICATION_UNVERIFIED";
  if (!input.authentication.sessionCreationPermitted) return "SESSION_CREATION_NOT_PERMITTED";
  if (input.authentication.accountId !== input.identity.account.accountId) return "ACCOUNT_BINDING_MISMATCH";
  if (invalidTime(input.authentication.eventTime) || parsed(input.authentication.eventTime) > time) return "INVALID_AUTHENTICATION_EVENT_TIME";
  if (input.authentication.assurance === "unknown" || input.versions.roleVersion !== CURRENT_ROLE_VERSION || input.versions.permissionCatalogVersion !== CURRENT_PERMISSION_CATALOG_VERSION) return "STALE_SESSION_VERSION";
  if (!input.policy.allowedAssuranceLevels.includes(input.authentication.assurance)) return "UNSUPPORTED_ASSURANCE";
  if (input.policy.auditRequired && !input.auditAvailable) return "AUDIT_UNAVAILABLE";
  return undefined;
}
export function createSession(input: SessionCreationInput): SessionCreationResult {
  const problem = validCommon(input);
  if (problem) return failure(problem, problem === "AUDIT_UNAVAILABLE" ? "This protected action is temporarily unavailable." : "This session cannot be verified.");
  const now = parsed(input.currentTime);
  const absolute = new Date(now + input.policy.absoluteTimeoutMs).toISOString();
  const inactivity = new Date(now + (input.policy.sharedDeviceRestrictions.classification === "trusted-shared" ? (input.policy.sharedDeviceRestrictions.shorterInactivityMs ?? input.policy.inactivityTimeoutMs) : input.policy.inactivityTimeoutMs)).toISOString();
  const session: SessionRecord = { sessionId: "session_fixture_001", familyId: "session-family_fixture_001", revision: 1, binding: { accountId: input.identity.account.accountId, householdId: input.identity.householdId, membershipId: input.identity.membership.membershipId, roleId: input.identity.membership.roleId, deviceContextId: input.deviceContextId!, authenticationEventReference: input.authentication.eventReference }, authenticationAssurance: input.authentication.assurance, versions: input.versions, timing: { createdAt: input.currentTime, lastActivityAt: input.currentTime, inactivityDeadline: inactivity, absoluteDeadline: absolute, rotationAt: new Date(now + input.policy.rotationIntervalMs).toISOString() }, status: "active", sharedDevice: input.policy.sharedDeviceRestrictions.classification, audit: { required: input.policy.auditRequired, purpose: "session-lifecycle", }, provenanceReference: input.provenanceReference };
  return { created: true, session, decisionCode: "SESSION_CREATED", friendlyMessage: "Session active", technicalReason: "SESSION_CREATED" };
}
export function rotateSession(request: SessionRotationRequest): SessionRotationResult {
  const { session } = request;
  if (invalidTime(request.currentTime) || (request.auditAvailable === false && session.audit.required)) return { rotated: false, oldSession: session, decisionCode: request.auditAvailable === false ? "AUDIT_UNAVAILABLE" : "INVALID_SESSION_TIME", technicalReason: request.auditAvailable === false ? "AUDIT_UNAVAILABLE" : "INVALID_SESSION_TIME" };
  if (["revoked", "replaced", "expired-by-inactivity", "expired-by-absolute-limit", "invalid"].includes(session.status)) return { rotated: false, oldSession: session, decisionCode: "SESSION_NOT_ROTATABLE", technicalReason: "SESSION_NOT_ROTATABLE" };
  const base = parsed(session.timing.createdAt);
  const now = parsed(request.currentTime);
  const timing = [session.timing.lastActivityAt, session.timing.inactivityDeadline, session.timing.absoluteDeadline, session.timing.rotationAt].map(parsed);
  const [lastActivity, inactivityDeadline, absoluteDeadline] = timing as [number, number, number, number];
  if (Number.isNaN(base) || timing.some(Number.isNaN) || now < base || now >= inactivityDeadline || now >= absoluteDeadline || (request.expectedVersions && JSON.stringify(session.versions) !== JSON.stringify(request.expectedVersions)) || (request.deviceClassification && request.deviceClassification !== session.sharedDevice)) return { rotated: false, oldSession: session, decisionCode: now >= inactivityDeadline ? "SESSION_EXPIRED_INACTIVITY" : now >= absoluteDeadline ? "SESSION_EXPIRED_ABSOLUTE" : "SESSION_NOT_ROTATABLE", technicalReason: now >= inactivityDeadline ? "SESSION_EXPIRED_INACTIVITY" : now >= absoluteDeadline ? "SESSION_EXPIRED_ABSOLUTE" : "SESSION_NOT_ROTATABLE" };
  const nextId = `session_fixture_revision_${session.revision + 1}` as SessionRecord["sessionId"];
  const oldSession = { ...session, status: "replaced" as const, replacementReference: nextId };
  const newSession: SessionRecord = { ...session, sessionId: nextId, revision: session.revision + 1, status: "active", replacementReference: undefined, timing: { ...session.timing, lastActivityAt: request.currentTime, rotationAt: request.currentTime } };
  return { rotated: true, oldSession, newSession, decisionCode: "SESSION_ROTATED", technicalReason: "SESSION_ROTATED" };
}
export function revokeSession(request: SessionRevocationRequest): SessionRevocationResult {
  if (!request.reason) return { revoked: false, session: request.session, decisionCode: "REVOCATION_REASON_REQUIRED", technicalReason: "REVOCATION_REASON_REQUIRED" };
  if (invalidTime(request.currentTime) || parsed(request.currentTime) < parsed(request.session.timing.createdAt)) return { revoked: false, session: request.session, decisionCode: "INVALID_SESSION_TIME", technicalReason: "INVALID_SESSION_TIME" };
  if (request.session.binding.accountId !== request.actorAccountId) return { revoked: false, session: request.session, decisionCode: "CROSS_ACCOUNT_REVOCATION_DENIED", technicalReason: "CROSS_ACCOUNT_REVOCATION_DENIED" };
  if (request.session.binding.roleId === "DEVICE_SERVICE_IDENTITY") return { revoked: false, session: request.session, decisionCode: "DEVICE_REVOCATION_DENIED", technicalReason: "DEVICE_REVOCATION_DENIED" };
  if (request.session.audit.required && !request.auditAvailable) return { revoked: false, session: request.session, decisionCode: "AUDIT_UNAVAILABLE", technicalReason: "AUDIT_UNAVAILABLE" };
  return { revoked: true, session: { ...request.session, status: "revoked", revocationTime: request.currentTime, revocationActorAccountId: request.actorAccountId, revocationReason: request.reason, revocationPurpose: request.purpose, revocationFamilyWide: request.familyWide === true }, decisionCode: "SESSION_REVOKED", technicalReason: "SESSION_REVOKED" };
}
const cleanup: CleanupManifest = { privateAccountContext: true, projectJourneyResults: true, connectorContext: true, conversationContext: true, memoryContext: true, technicalInformationDetails: true, accountBoundCharacterPreferences: true, generatedDocumentProjections: true, retrievedEvidenceProjections: true, pendingCharacterAgentGatewayRequestContext: true, pendingContributionEnvelopeContext: true };

export function evaluateConcurrentSessions(policy: ConcurrentSessionPolicy, accountId: AccountId, activeSessions: ConcurrentSessionReference[], candidateDeviceClassification: SessionRecord["sharedDevice"]): ConcurrentSessionEvaluation {
  if (!Number.isInteger(policy.concurrentSessionLimit) || policy.concurrentSessionLimit < 1 || candidateDeviceClassification === "unknown") return { allowed: false, decisionCode: "CONCURRENCY_UNCERTAIN", technicalReason: "CONCURRENCY_UNCERTAIN" };
  if (activeSessions.some((reference) => reference.accountId !== accountId)) return { allowed: false, decisionCode: "CROSS_ACCOUNT_CONCURRENCY_DENIED", technicalReason: "CROSS_ACCOUNT_CONCURRENCY_DENIED" };
  return activeSessions.length < policy.concurrentSessionLimit ? { allowed: true, decisionCode: "CONCURRENT_SESSION_ALLOWED", technicalReason: "CONCURRENT_SESSION_ALLOWED" } : { allowed: false, decisionCode: "CONCURRENT_SESSION_LIMIT_REACHED", replaceSessionId: activeSessions[0]!.sessionId, technicalReason: "CONCURRENT_SESSION_LIMIT_REACHED" };
}
export function switchAccount(request: AccountSwitchRequest): AccountSwitchResult {
  const auth = request.targetAuthentication;
  const identity = validateIdentity(request.targetIdentity, request.currentTime);
  if (!identity.valid) return { switched: false, priorSession: request.session, cleanupManifest: cleanup, decisionCode: identity.technicalReason, technicalReason: identity.technicalReason };
  if (auth.verificationResult !== "verified" || !auth.sessionCreationPermitted || auth.accountId !== request.targetIdentity.account.accountId) return { switched: false, priorSession: request.session, cleanupManifest: cleanup, decisionCode: "TARGET_AUTHENTICATION_REQUIRED", technicalReason: "TARGET_AUTHENTICATION_REQUIRED" };
  const revoked = revokeSession({ session: request.session, currentTime: request.currentTime, reason: "account-switch", actorAccountId: request.session.binding.accountId, purpose: "account-switch", auditAvailable: request.auditAvailable });
  if (!revoked.revoked) return { switched: false, priorSession: request.session, cleanupManifest: cleanup, decisionCode: revoked.decisionCode, technicalReason: revoked.technicalReason };
  const created = createSession({ identity: request.targetIdentity, authentication: auth, policy: request.policy, currentTime: request.currentTime, deviceContextId: request.session.binding.deviceContextId, versions: request.session.versions, auditAvailable: request.auditAvailable, provenanceReference: "account-switch-projection" });
  return { switched: created.created, priorSession: { ...revoked.session, status: "replaced" }, targetSession: created.session, cleanupManifest: cleanup, decisionCode: created.created ? "ACCOUNT_SWITCHED" : created.decisionCode, technicalReason: created.technicalReason };
}
export type { AccountId, HouseholdIdentityContext };
