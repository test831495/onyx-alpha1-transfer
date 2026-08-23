// Re-export Phase 1A.8 deterministic identifier factory
export { makeId } from "@onyx/phase1a8-governed-contracts/shared";

export type SchedulerIdentifierKind =
  | "schedulerConfigId" | "schedulerRequestId" | "schedulerRunId" | "schedulerEventId"
  | "schedulerStageDecisionId" | "schedulerTaskReferenceId" | "readySetDecisionId"
  | "laneReservationId" | "schedulerEvidenceArtifactId" | "schedulerEvidenceManifestId"
  | "schedulerAcceptanceRecordId" | "schedulerTestRecordId" | "schedulerFailureRecordId"
  | "schedulerProjectionId" | "promotionCandidateId" | "promotionDecisionId"
  | "promotionFailureDecisionId" | "evidenceArtifactRegistrationId" | "evidenceEventId"
  | "evidencePackageId" | "evidenceManifestId";

export function makeSchedulerIdentifier(kind: SchedulerIdentifierKind, stableParts: readonly string[]): string {
  if (stableParts.some((part) => !/^[A-Za-z0-9._:-]+$/.test(part))) throw new Error("Identifier parts must be stable references.");
  return `1a9:${kind}:${stableParts.join(":")}`;
}

export function assertSchedulerIdentifier(kind: SchedulerIdentifierKind, value: string): void {
  if (!value.startsWith(`1a9:${kind}:`) || value.length <= kind.length + 6) throw new Error(`Invalid ${kind}.`);
}