import { validateIdentity, CURRENT_PERMISSION_CATALOG_VERSION, CURRENT_ROLE_VERSION, type AccountId, type HouseholdIdentityContext } from "@onyx/phase1a11-household-identity-runtime";
import { SESSION_POLICY, validateSessionPolicy } from "./policy";
import { validateSessionChronology, type AccountSwitchRequest, type AccountSwitchResult, type CleanupManifest, type ConcurrentSessionEvaluation, type ConcurrentSessionPolicy, type ConcurrentSessionReference, type SessionCreationInput, type SessionCreationResult, type SessionRecord, type SessionRevocationRequest, type SessionRevocationResult, type SessionRotationRequest, type SessionRotationResult } from "./model";

const parsed = (value: string): number => new Date(value).getTime();
const invalidTime = (value: string): boolean => Number.isNaN(parsed(value));
const assuranceRank = (value: string): number => ({ low: 1, standard: 2, strong: 3 }[value] ?? 0);
const determinant = (value: string | undefined): string => (value ?? "deterministic").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 48) || "deterministic";
const stableSessionId = (sessionSeed: string, accountId: string, householdId: string, eventReference: string, createdAt: string, revision: number) => `session_${determinant(sessionSeed)}_${determinant(accountId)}_${determinant(householdId)}_${determinant(eventReference)}_${determinant(createdAt)}_${revision}` as SessionRecord["sessionId"];
const stableFamilyId = (familySeed: string, eventReference: string) => `session-family_${determinant(familySeed || eventReference)}_${determinant(eventReference)}` as SessionRecord["familyId"];
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
  const familySeed = input.familySeed ?? input.authentication.eventReference;
  const createdAt = input.currentTime;
  const sessionId = stableSessionId(input.provenanceReference, input.identity.account.accountId, input.identity.householdId, input.authentication.eventReference, createdAt, 1);
  const familyId = stableFamilyId(familySeed, input.authentication.eventReference);
  const session: SessionRecord = { sessionId, familyId, revision: 1, binding: { accountId: input.identity.account.accountId, householdId: input.identity.householdId, membershipId: input.identity.membership.membershipId, roleId: input.identity.membership.roleId, deviceContextId: input.deviceContextId!, authenticationEventReference: input.authentication.eventReference }, authenticationAssurance: input.authentication.assurance, versions: input.versions, permissionBinding: { permissionCatalogVersion: input.versions.permissionCatalogVersion, roleId: input.identity.membership.roleId, roleVersion: input.versions.roleVersion, membershipId: input.identity.membership.membershipId }, timing: { createdAt, lastActivityAt: createdAt, inactivityDeadline: inactivity, absoluteDeadline: absolute, rotationAt: new Date(now + input.policy.rotationIntervalMs).toISOString() }, status: "active", sharedDevice: input.policy.sharedDeviceRestrictions.classification, audit: { required: input.policy.auditRequired, purpose: "session-lifecycle" }, provenanceReference: input.provenanceReference };
  return { created: true, session, decisionCode: "SESSION_CREATED", friendlyMessage: "Session active", technicalReason: "SESSION_CREATED" };
}
export function rotateSession(request: SessionRotationRequest): SessionRotationResult {
  const { session } = request;
  if (invalidTime(request.currentTime) || (request.auditAvailable === false && session.audit.required)) return { rotated: false, oldSession: session, decisionCode: request.auditAvailable === false ? "AUDIT_UNAVAILABLE" : "INVALID_SESSION_TIME", technicalReason: request.auditAvailable === false ? "AUDIT_UNAVAILABLE" : "INVALID_SESSION_TIME" };
  if (["revoked", "replaced", "expired-by-inactivity", "expired-by-absolute-limit", "invalid"].includes(session.status)) return { rotated: false, oldSession: session, decisionCode: "SESSION_NOT_ROTATABLE", technicalReason: "SESSION_NOT_ROTATABLE" };
  const chronology = validateSessionChronology(session, request.currentTime, "rotation");
  if (!chronology.valid) return { rotated: false, oldSession: session, decisionCode: chronology.technicalReason, technicalReason: chronology.technicalReason };
  const base = parsed(session.timing.createdAt);
  const now = parsed(request.currentTime);
  const timing = [session.timing.lastActivityAt, session.timing.inactivityDeadline, session.timing.absoluteDeadline, session.timing.rotationAt].map(parsed);
  const [lastActivity, inactivityDeadline, absoluteDeadline] = timing as [number, number, number, number];
  if (Number.isNaN(base) || timing.some(Number.isNaN) || now < base || now >= inactivityDeadline || now >= absoluteDeadline || (request.expectedVersions && JSON.stringify(session.versions) !== JSON.stringify(request.expectedVersions)) || (request.deviceClassification && request.deviceClassification !== session.sharedDevice)) return { rotated: false, oldSession: session, decisionCode: now >= inactivityDeadline ? "SESSION_EXPIRED_INACTIVITY" : now >= absoluteDeadline ? "SESSION_EXPIRED_ABSOLUTE" : "SESSION_NOT_ROTATABLE", technicalReason: now >= inactivityDeadline ? "SESSION_EXPIRED_INACTIVITY" : now >= absoluteDeadline ? "SESSION_EXPIRED_ABSOLUTE" : "SESSION_NOT_ROTATABLE" };
  const policy = request.policy ?? { ...SESSION_POLICY, rotationIntervalMs: Math.max(SESSION_POLICY.rotationIntervalMs, 1) };
  const nextRotation = new Date(now + policy.rotationIntervalMs).toISOString();
  const nextId = stableSessionId(request.rotationSeed ?? session.sessionId, session.binding.accountId, session.familyId, `${session.binding.authenticationEventReference}-${session.revision + 1}`, nextRotation, session.revision + 1);
  const oldSession = { ...session, status: "replaced" as const, replacementReference: nextId, replacementTime: request.currentTime };
  const newSession: SessionRecord = { ...session, sessionId: nextId, familyId: session.familyId, revision: session.revision + 1, status: "active", replacementReference: undefined, timing: { ...session.timing, lastActivityAt: request.currentTime, rotationAt: nextRotation } };
  if (request.currentTime >= session.timing.rotationAt) {
    if (request.currentTime === session.timing.rotationAt) {
      return { rotated: true, oldSession, newSession, decisionCode: "SESSION_ROTATED", technicalReason: "SESSION_ROTATED" };
    }
  }
  return { rotated: true, oldSession, newSession, decisionCode: "SESSION_ROTATED", technicalReason: "SESSION_ROTATED" };
}

export function revokeSession(request: SessionRevocationRequest): SessionRevocationResult {
  if (!request.reason) return { revoked: false, session: request.session, decisionCode: "REVOCATION_REASON_REQUIRED", technicalReason: "REVOCATION_REASON_REQUIRED" };
  const chronology = validateSessionChronology(request.session, request.currentTime, "revocation");
  if (!chronology.valid) return { revoked: false, session: request.session, decisionCode: chronology.technicalReason, technicalReason: chronology.technicalReason };
  if (!request.scope) return { revoked: false, session: request.session, decisionCode: "REVOCATION_SCOPE_REQUIRED", technicalReason: "REVOCATION_SCOPE_REQUIRED" };
    if (!["single-session", "session-family", "account-device", "account-household"].includes(request.scope)) return { revoked: false, session: request.session, decisionCode: "REVOCATION_SCOPE_MISMATCH", technicalReason: "REVOCATION_SCOPE_MISMATCH" };
  if (!request.targetAccountId || request.targetAccountId !== request.session.binding.accountId || request.actorAccountId !== request.session.binding.accountId) return { revoked: false, session: request.session, decisionCode: "CROSS_ACCOUNT_REVOCATION_DENIED", technicalReason: "CROSS_ACCOUNT_REVOCATION_DENIED" };
    if (request.targetHouseholdId !== request.session.binding.householdId) return { revoked: false, session: request.session, decisionCode: "CROSS_HOUSEHOLD_REVOCATION_DENIED", technicalReason: "CROSS_HOUSEHOLD_REVOCATION_DENIED" };
  if ((request.scope === "single-session" && request.targetSessionId !== request.session.sessionId) || (request.scope === "session-family" && request.targetFamilyId !== request.session.familyId) || (request.scope === "account-device" && request.targetDeviceContextId !== request.session.binding.deviceContextId) || (request.scope === "account-household" && request.targetAccountId !== request.session.binding.accountId)) return { revoked: false, session: request.session, decisionCode: "REVOCATION_SCOPE_MISMATCH", technicalReason: "REVOCATION_SCOPE_MISMATCH" };
  if (request.session.binding.roleId === "DEVICE_SERVICE_IDENTITY" || request.actorAccountId !== request.session.binding.accountId) return { revoked: false, session: request.session, decisionCode: "DEVICE_REVOCATION_DENIED", technicalReason: "DEVICE_REVOCATION_DENIED" };
  if (request.session.audit.required && !request.auditAvailable) return { revoked: false, session: request.session, decisionCode: "AUDIT_UNAVAILABLE", technicalReason: "AUDIT_UNAVAILABLE" };
  return { revoked: true, session: { ...request.session, status: "revoked", revocationTime: request.currentTime, revocationActorAccountId: request.actorAccountId, revocationReason: request.reason, revocationPurpose: request.purpose, revocationScope: request.scope }, decisionCode: "SESSION_REVOKED", technicalReason: "SESSION_REVOKED" };
}
const cleanup: CleanupManifest = { privateAccountContext: true, projectJourneyResults: true, connectorContext: true, conversationContext: true, memoryContext: true, technicalInformationDetails: true, accountBoundCharacterPreferences: true, generatedDocumentProjections: true, retrievedEvidenceProjections: true, pendingCharacterAgentGatewayRequestContext: true, pendingContributionEnvelopeContext: true };

export function evaluateConcurrentSessions(policy: ConcurrentSessionPolicy, accountId: AccountId, householdId: string, activeSessions: ConcurrentSessionReference[], candidateDeviceContextId: string, candidateRoleId: string, candidateIdentityKind: ConcurrentSessionReference["identityKind"]): ConcurrentSessionEvaluation {
  const validStatuses = ["active"];
  const validRoles = ["PRIMARY_OWNER", "HOUSEHOLD_ADMINISTRATOR", "STANDARD_FAMILY_MEMBER", "SUPERVISED_MEMBER", "GUEST", "DEVICE_SERVICE_IDENTITY"];
  const validKinds = ["human", "device", "service", "character"];
  const candidateFailure = (decisionCode: string, explanation: string): ConcurrentSessionEvaluation => ({ allowed: false, decisionCode, technicalReason: decisionCode, title: "Session cannot be verified", explanation, safeNextAction: "Verify your account and device, then try again." });
  if (!/^account_[A-Za-z0-9_-]+$/.test(accountId)) return candidateFailure("INVALID_CANDIDATE_ACCOUNT_ID", "The account scope could not be verified.");
  if (!/^household_[A-Za-z0-9_-]+$/.test(householdId)) return candidateFailure("INVALID_CANDIDATE_HOUSEHOLD_ID", "The household scope could not be verified.");
  if (!Number.isInteger(policy.concurrentSessionLimit) || policy.concurrentSessionLimit < 1 || !candidateDeviceContextId.startsWith("device-context_") || !candidateRoleId || !validRoles.includes(candidateRoleId) || !validKinds.includes(candidateIdentityKind)) return candidateFailure("CONCURRENCY_UNCERTAIN", "The session scope could not be verified.");
  const seen = new Set<string>();
  for (const reference of activeSessions) {
    if (!/^session_[A-Za-z0-9_-]+$/.test(reference.sessionId) || !/^account_[A-Za-z0-9_-]+$/.test(reference.accountId) || !/^household_[A-Za-z0-9_-]+$/.test(reference.householdId) || !/^device-context_[A-Za-z0-9_-]+$/.test(reference.deviceContextId) || !Number.isFinite(parsed(reference.createdAt)) || !validStatuses.includes(reference.status) || !validRoles.includes(reference.roleId) || !validKinds.includes(reference.identityKind) || typeof reference.replacementEligible !== "boolean" || seen.has(reference.sessionId)) return { allowed: false, decisionCode: "CONCURRENCY_UNCERTAIN", technicalReason: "CONCURRENCY_UNCERTAIN" };
    seen.add(reference.sessionId);
    if (reference.accountId !== accountId) return { allowed: false, decisionCode: "CROSS_ACCOUNT_CONCURRENCY_DENIED", technicalReason: "CROSS_ACCOUNT_CONCURRENCY_DENIED" };
    if (reference.householdId !== householdId) return { allowed: false, decisionCode: "CROSS_HOUSEHOLD_CONCURRENCY_DENIED", technicalReason: "CROSS_HOUSEHOLD_CONCURRENCY_DENIED" };
    if (reference.status !== "active") return { allowed: false, decisionCode: "CONCURRENCY_UNCERTAIN", technicalReason: "CONCURRENCY_UNCERTAIN" };
  }
  const scopedSessions = policy.concurrentSessionScope === "device" ? activeSessions.filter((reference) => reference.deviceContextId === candidateDeviceContextId) : activeSessions;
  const eligible = scopedSessions.filter((reference) => reference.replacementEligible && !(candidateIdentityKind !== "human" && reference.identityKind === "human") && !(candidateRoleId !== "PRIMARY_OWNER" && reference.roleId === "PRIMARY_OWNER"));
  if (scopedSessions.length < policy.concurrentSessionLimit) return { allowed: true, decisionCode: "CONCURRENT_SESSION_ALLOWED", technicalReason: "CONCURRENT_SESSION_ALLOWED" };
  if (eligible.length === 0) return { allowed: false, decisionCode: "CONCURRENT_SESSION_LIMIT_REACHED", technicalReason: "CONCURRENT_SESSION_LIMIT_REACHED" };
  return { allowed: false, decisionCode: "CONCURRENT_SESSION_REPLACEMENT_REQUIRED", replaceSessionId: eligible[0]!.sessionId, technicalReason: "CONCURRENT_SESSION_REPLACEMENT_REQUIRED" };
}
export function switchAccount(request: AccountSwitchRequest): AccountSwitchResult {
  const auth = request.targetAuthentication;
  const identity = validateIdentity(request.targetIdentity, request.currentTime);
  if (!identity.valid) return { switched: false, priorSession: request.session, cleanupManifest: cleanup, decisionCode: identity.technicalReason, technicalReason: identity.technicalReason };
  if (auth.verificationResult !== "verified" || !auth.sessionCreationPermitted || auth.accountId !== request.targetIdentity.account.accountId) return { switched: false, priorSession: request.session, cleanupManifest: cleanup, decisionCode: "TARGET_AUTHENTICATION_REQUIRED", technicalReason: "TARGET_AUTHENTICATION_REQUIRED" };
  const revoked = revokeSession({ session: request.session, currentTime: request.currentTime, reason: "account-switch", actorAccountId: request.session.binding.accountId, targetAccountId: request.session.binding.accountId, targetHouseholdId: request.session.binding.householdId, targetSessionId: request.session.sessionId, scope: "single-session", purpose: "account-switch", auditAvailable: request.auditAvailable });
  if (!revoked.revoked) return { switched: false, priorSession: request.session, cleanupManifest: cleanup, decisionCode: revoked.decisionCode, technicalReason: revoked.technicalReason };
  const created = createSession({ identity: request.targetIdentity, authentication: auth, policy: request.policy, currentTime: request.currentTime, deviceContextId: request.session.binding.deviceContextId, versions: request.session.versions, auditAvailable: request.auditAvailable, provenanceReference: "account-switch-projection" });
  return { switched: created.created, priorSession: { ...revoked.session, status: "replaced" }, targetSession: created.session, cleanupManifest: cleanup, decisionCode: created.created ? "ACCOUNT_SWITCHED" : created.decisionCode, technicalReason: created.technicalReason };
}
export type { AccountId, HouseholdIdentityContext };
