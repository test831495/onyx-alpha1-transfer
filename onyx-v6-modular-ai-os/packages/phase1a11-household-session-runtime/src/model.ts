import type { AccountId, HouseholdId, HouseholdIdentityContext, MembershipId, PermissionCatalogVersion, PolicyVersion, RoleId, RoleVersion } from "@onyx/phase1a11-household-identity-runtime";

export type SessionId = `session_${string}`;
export type SessionFamilyId = `session-family_${string}`;
export type SessionRevision = number;
export type DeviceContextId = `device-context_${string}`;
export type AuthenticationEventReference = `auth-event_${string}`;
export type SessionStatus = "pending" | "active" | "elevated" | "rotation-required" | "revoked" | "expired-by-inactivity" | "expired-by-absolute-limit" | "replaced" | "invalid";
export type SessionReason = "logout" | "owner-requested-revocation" | "account-suspension" | "membership-suspension" | "role-invalidation" | "policy-invalidation" | "permission-catalog-invalidation" | "potential-compromise" | "account-switch" | "audit-integrity-failure" | "administrative-security-action";
export type AuthenticationAssurance = "low" | "standard" | "strong" | "unknown";
export type AuthenticationMethodClass = "local-verified" | "federated-verified" | "step-up-verified";
export type DeviceClassification = "private" | "trusted-shared" | "untrusted-shared" | "kiosk-like" | "unknown";
export type RevocationScope = "single-session" | "session-family" | "account-device" | "account-household";
export type SessionIdentityKind = "human" | "device" | "service" | "character";

export interface VerifiedAuthenticationFact { accountId: AccountId; eventTime: string; assurance: AuthenticationAssurance; methodClass: AuthenticationMethodClass; verifierReference: string; eventReference: AuthenticationEventReference; verificationResult: "verified" | "unverified"; sessionCreationPermitted: boolean; }
export interface SessionBinding { accountId: AccountId; householdId: HouseholdId; membershipId: MembershipId; roleId: RoleId; deviceContextId: DeviceContextId; authenticationEventReference: AuthenticationEventReference; }
export interface SessionVersionBinding { roleVersion: RoleVersion; policyVersion: PolicyVersion; permissionCatalogVersion: PermissionCatalogVersion; }
export interface SessionPermissionBinding { permissionCatalogVersion: PermissionCatalogVersion; roleId: RoleId; roleVersion: RoleVersion; membershipId: MembershipId; }
export interface SessionTiming { createdAt: string; lastActivityAt: string; inactivityDeadline: string; absoluteDeadline: string; rotationAt: string; }
export interface StepUpGrant { requiredAssurance: AuthenticationAssurance; currentAssurance: AuthenticationAssurance; protectedOperation: string; createdAt: string; expiresAt: string; purpose: string; resourceScope: string; accountId: AccountId; sessionId: SessionId; auditRequired: boolean; }
export interface SessionAuditRequirement { required: boolean; purpose: string; }
export interface SessionRecord { sessionId: SessionId; familyId: SessionFamilyId; revision: SessionRevision; binding: SessionBinding; authenticationAssurance: AuthenticationAssurance; versions: SessionVersionBinding; permissionBinding: SessionPermissionBinding; timing: SessionTiming; revocationTime?: string; revocationActorAccountId?: AccountId; revocationReason?: SessionReason; revocationPurpose?: string; revocationScope?: RevocationScope; replacementReference?: SessionId; replacementTime?: string; status: SessionStatus; stepUp?: StepUpGrant; sharedDevice: DeviceClassification; audit: SessionAuditRequirement; provenanceReference: string; }
export interface SessionEvaluationInput { session: SessionRecord; identity: HouseholdIdentityContext; currentTime: string; expectedVersions: SessionVersionBinding; deviceClassification: DeviceClassification; operation?: string; requiredAssurance?: AuthenticationAssurance; auditAvailable: boolean; }
export interface SessionEvaluationResult { allowed: boolean; status: SessionStatus; decisionCode: string; title: string; explanation: string; workPreserved: boolean; safeNextAction: string; technicalReason: string; rotationRequired: boolean; reauthenticationRequired: boolean; stepUpRequired: boolean; accountSwitchRequired: boolean; auditRequired: boolean; versionReferences: SessionVersionBinding; }
export interface SessionCreationInput { identity: HouseholdIdentityContext; authentication: VerifiedAuthenticationFact; policy: ConcurrentSessionPolicy; currentTime: string; deviceContextId?: DeviceContextId; versions: SessionVersionBinding; auditAvailable: boolean; provenanceReference: string; }
export interface SessionCreationResult { created: boolean; session?: SessionRecord; decisionCode: string; friendlyMessage: string; technicalReason: string; }
export interface SessionRotationRequest { session: SessionRecord; currentTime: string; trigger: "scheduled" | "step-up" | "account-switch" | "role-version-change" | "policy-version-change" | "permission-catalog-version-change" | "security-event" | "sensitive-transition"; expectedVersions?: SessionVersionBinding; deviceClassification?: DeviceClassification; auditAvailable?: boolean; }
export interface SessionRotationResult { rotated: boolean; oldSession: SessionRecord; newSession?: SessionRecord; decisionCode: string; technicalReason: string; }
export interface SessionRevocationRequest { session: SessionRecord; currentTime: string; reason?: SessionReason; actorAccountId: AccountId; targetAccountId: AccountId; targetHouseholdId: HouseholdId; targetSessionId?: SessionId; targetFamilyId?: SessionFamilyId; targetDeviceContextId?: DeviceContextId; scope?: RevocationScope; purpose: string; auditAvailable: boolean; }
export interface SessionRevocationResult { revoked: boolean; session: SessionRecord; decisionCode: string; technicalReason: string; }
export interface CleanupManifest { privateAccountContext: boolean; projectJourneyResults: boolean; connectorContext: boolean; conversationContext: boolean; memoryContext: boolean; technicalInformationDetails: boolean; accountBoundCharacterPreferences: boolean; generatedDocumentProjections: boolean; retrievedEvidenceProjections: boolean; pendingCharacterAgentGatewayRequestContext: boolean; pendingContributionEnvelopeContext: boolean; }
export interface AccountSwitchRequest { session: SessionRecord; targetIdentity: HouseholdIdentityContext; targetAuthentication: VerifiedAuthenticationFact; currentTime: string; policy: ConcurrentSessionPolicy; auditAvailable: boolean; }
export interface AccountSwitchResult { switched: boolean; priorSession: SessionRecord; targetSession?: SessionRecord; cleanupManifest: CleanupManifest; decisionCode: string; technicalReason: string; }
export interface ConcurrentSessionReference { sessionId: SessionId; accountId: AccountId; householdId: HouseholdId; deviceContextId: DeviceContextId; status: SessionStatus; createdAt: string; roleId: RoleId; identityKind: SessionIdentityKind; replacementEligible: boolean; }
export interface ConcurrentSessionEvaluation { allowed: boolean; decisionCode: string; replaceSessionId?: SessionId; technicalReason: string; }
export interface ConcurrentSessionPolicy { inactivityTimeoutMs: number; absoluteTimeoutMs: number; rotationIntervalMs: number; elevatedAssuranceTimeoutMs: number; allowedAssuranceLevels: AuthenticationAssurance[]; sharedDeviceRestrictions: { classification: DeviceClassification; shorterInactivityMs?: number; durableSessionAllowed: boolean; ownerHistoryNarrationAllowed: boolean; technicalInformationAllowed: boolean; }; concurrentSessionLimit: number; concurrentSessionScope: "account" | "device"; protectedOperationAssurance: AuthenticationAssurance; auditRequired: boolean; policyVersion: PolicyVersion; }

	export function validateSessionChronology(session: SessionRecord, operationTime: string, operation: "rotation" | "revocation" = "rotation"): { valid: boolean; technicalReason: string } {
	const values = [session.timing.createdAt, session.timing.lastActivityAt, session.timing.inactivityDeadline, session.timing.absoluteDeadline, session.timing.rotationAt, operationTime, session.revocationTime, session.replacementTime];
	const parsedValues = values.map((value) => value === undefined ? undefined : new Date(value).getTime());
	const [created, lastActivity, inactivity, absolute, rotation, current, revocation, replacement] = parsedValues;
	if (created === undefined || Number.isNaN(created)) return { valid: false, technicalReason: "INVALID_SESSION_CREATION_TIME" };
	if (lastActivity === undefined || Number.isNaN(lastActivity)) return { valid: false, technicalReason: "INVALID_LAST_ACTIVITY_TIME" };
	if (inactivity === undefined || Number.isNaN(inactivity)) return { valid: false, technicalReason: "INVALID_INACTIVITY_DEADLINE" };
	if (absolute === undefined || Number.isNaN(absolute)) return { valid: false, technicalReason: "INVALID_ABSOLUTE_DEADLINE" };
	if (rotation === undefined || Number.isNaN(rotation)) return { valid: false, technicalReason: "INVALID_ROTATION_TIME" };
		  if (current === undefined || Number.isNaN(current)) return { valid: false, technicalReason: operation === "rotation" ? "INVALID_ROTATION_TIME" : "INVALID_REVOCATION_TIME" };
		  if (current < created) return { valid: false, technicalReason: operation === "revocation" ? "REVOCATION_BEFORE_SESSION_CREATION" : "INVALID_SESSION_CREATION_TIME" };
	if (revocation !== undefined && Number.isNaN(revocation)) return { valid: false, technicalReason: "INVALID_REVOCATION_TIME" };
	if (replacement !== undefined && Number.isNaN(replacement)) return { valid: false, technicalReason: "INVALID_SESSION_CHRONOLOGY" };
	if (created > current) return { valid: false, technicalReason: "INVALID_SESSION_CREATION_TIME" };
	if (lastActivity < created) return { valid: false, technicalReason: "LAST_ACTIVITY_BEFORE_CREATION" };
	if (lastActivity > current) return { valid: false, technicalReason: "LAST_ACTIVITY_AFTER_CURRENT_TIME" };
	if (inactivity < created) return { valid: false, technicalReason: "INVALID_INACTIVITY_DEADLINE" };
	if (absolute < created) return { valid: false, technicalReason: "INVALID_ABSOLUTE_DEADLINE" };
	if (rotation < created || rotation < lastActivity) return { valid: false, technicalReason: "INVALID_ROTATION_TIME" };
	if (inactivity > absolute) return { valid: false, technicalReason: "INVALID_SESSION_CHRONOLOGY" };
	if (revocation !== undefined && revocation < created) return { valid: false, technicalReason: "REVOCATION_BEFORE_SESSION_CREATION" };
	if (replacement !== undefined && replacement < created) return { valid: false, technicalReason: "INVALID_SESSION_CHRONOLOGY" };
	return { valid: true, technicalReason: "SESSION_CHRONOLOGY_VALID" };
}
