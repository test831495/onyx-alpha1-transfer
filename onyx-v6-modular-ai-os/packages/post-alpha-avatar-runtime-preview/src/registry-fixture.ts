import {
  CANONICAL_CHARACTERS,
  AvatarLifecycleState,
  AvatarClassification,
} from "@onyx/post-alpha-avatar-foundation";

export interface AvatarRegistryFixture {
  id: string;
  character: "ONYX" | "NOVA";
  lifecycle: AvatarLifecycleState;
  classification: AvatarClassification;
  canonicalIntegrityHash: string;
  variantIntegrityHash: string;
  registeredAt: string;
}

export interface RegistryResolverOptions {
  character: "ONYX" | "NOVA";
}

export const INELIGIBLE_LIFECYCLE_REASONS = Object.freeze({
  DRAFT: "LIFECYCLE_DRAFT_NOT_ELIGIBLE",
  REGISTERED: "LIFECYCLE_REGISTERED_NOT_ELIGIBLE",
  ACCEPTED: "LIFECYCLE_ACCEPTED_NOT_ELIGIBLE",
  SUPERSEDED: "LIFECYCLE_SUPERSEDED_NOT_ELIGIBLE",
  REVOKED: "LIFECYCLE_REVOKED_NOT_ELIGIBLE",
  REJECTED: "LIFECYCLE_REJECTED_NOT_ELIGIBLE",
  ROLLED_BACK: "LIFECYCLE_ROLLED_BACK_NOT_ELIGIBLE",
} as const);

export function getLifecycleEligibilityReason(
  lifecycle: AvatarLifecycleState
): string | null {
  return lifecycle === "ACTIVE"
    ? null
    : INELIGIBLE_LIFECYCLE_REASONS[lifecycle];
}

export function createAvatarRegistryFixture(
  id: string,
  character: "ONYX" | "NOVA",
  lifecycle: AvatarLifecycleState = "REGISTERED",
  classification: AvatarClassification = "CANONICAL"
): AvatarRegistryFixture {
  // Validate character is in sealed CANONICAL_CHARACTERS
  if (!Object.keys(CANONICAL_CHARACTERS).includes(character)) {
    throw new Error(`Invalid character: ${character}`);
  }

  const fixture: AvatarRegistryFixture = {
    id,
    character,
    lifecycle,
    classification,
    canonicalIntegrityHash: `canonical-${id}-${character}`,
    variantIntegrityHash: `canonical-${id}-${character}`, // Must match canonical
    registeredAt: new Date().toISOString(),
  };

  return fixture;
}

export function validateRegistryFixture(fixture: AvatarRegistryFixture): boolean {
  // Validate integrity hash equivalence (sealed rule from PA-AVATAR)
  if (fixture.canonicalIntegrityHash !== fixture.variantIntegrityHash) {
    throw new Error(
      `Integrity hash mismatch in fixture ${fixture.id}: canonical !== variant`
    );
  }

  // Validate character is in sealed CANONICAL_CHARACTERS
  if (!Object.keys(CANONICAL_CHARACTERS).includes(fixture.character)) {
    throw new Error(`Invalid character in fixture: ${fixture.character}`);
  }

  return true;
}

export function resolveRegistryFixture(
  fixture: AvatarRegistryFixture,
  options: RegistryResolverOptions
): AvatarRegistryFixture | null {
  // Character binding is explicit and sealed
  if (fixture.character !== options.character) {
    return null;
  }

  if (getLifecycleEligibilityReason(fixture.lifecycle) !== null) {
    return null;
  }

  return fixture;
}
