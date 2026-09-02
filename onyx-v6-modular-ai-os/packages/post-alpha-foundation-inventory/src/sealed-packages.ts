export const SEALED_POST_ALPHA_FOUNDATIONS = Object.freeze([
  {
    name: "@onyx/post-alpha-governance-foundation",
    version: "0.1.0",
    classification: "SEALED_FOUNDATION" as const,
    sealed: true as const,
  },
  {
    name: "@onyx/post-alpha-intelligence-foundation",
    version: "0.1.0",
    classification: "SEALED_FOUNDATION" as const,
    sealed: true as const,
  },
  {
    name: "@onyx/post-alpha-avatar-foundation",
    version: "0.1.0",
    classification: "SEALED_FOUNDATION" as const,
    sealed: true as const,
  },
  {
    name: "@onyx/post-alpha-onyx-presence-thin-slice",
    version: "0.1.0",
    classification: "SEALED_FOUNDATION" as const,
    sealed: true as const,
  },
  {
    name: "@onyx/post-alpha-assurance-foundation",
    version: "0.1.0",
    classification: "SEALED_FOUNDATION" as const,
    sealed: true as const,
  },
]);

export const LEGACY_OWNERSHIP = Object.freeze({
  name: "@onyx/avatar-runtime",
  version: "0.1.0",
  classification: "LEGACY_PROVISIONALLY_RETAINED" as const,
  bridgeDefault: "NO_BRIDGE" as const,
  modification: "UNCHANGED_DURING_BUNDLE_1" as const,
});

export const BASELINE_REPOSITORY_STATE = Object.freeze({
  repository: "test831495/onyx-alpha1-transfer",
  remoteUrl: "https://github.com/test831495/onyx-alpha1-transfer",
  baselineSha: "0eebbc38011ca1559895059a229c0bdbc0462cad",
  branch: "main",
  mergedPr: 34,
  mergedPrTitle: "feat(presence): add ONYX presence thin-slice foundation",
  mergeCommit: "0eebbc38011ca1559895059a229c0bdbc0462cad",
});

export const GOVERNANCE_MARKERS = Object.freeze({
  sealedPredecessor: {
    marker: "POST_ALPHA_ONYX_PRESENCE_THIN_SLICE_MAIN_BRANCH_CLOSURE_VERIFICATION_ACCEPTED",
    classification: "GOVERNANCE_SESSION_EVIDENCE" as const,
  },
  acceptedCorrection: {
    marker: "POST_ALPHA_AVATAR_RUNTIME_FOUNDATION_PACKAGE_BOUNDARY_CORRECTION_AND_RESCOPE_ACCEPTED_IMPLEMENTATION_AUTHORIZATION_REQUIRED",
    classification: "GOVERNANCE_SESSION_EVIDENCE" as const,
  },
  acceptedNormalization: {
    marker: "POST_ALPHA_AVATAR_RUNTIME_FOUNDATION_IMPLEMENTATION_CONTRACT_NORMALIZATION_ACCEPTED_IMPLEMENTATION_PROMPT_REGENERATION_REQUIRED",
    classification: "GOVERNANCE_SESSION_EVIDENCE" as const,
  },
});

export function getFoundationInventory() {
  return Object.freeze({
    sealed: [...SEALED_POST_ALPHA_FOUNDATIONS],
    legacy: LEGACY_OWNERSHIP,
    baseline: BASELINE_REPOSITORY_STATE,
    markers: GOVERNANCE_MARKERS,
  });
}
