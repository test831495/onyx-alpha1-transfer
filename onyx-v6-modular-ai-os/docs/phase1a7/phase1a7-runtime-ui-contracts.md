# Phase 1A.7 — Runtime UI Contracts

## Contract identity

- `AUTOMATION_RUNTIME_UI_CONTRACT_VERSION = "1.0.0"`
- `AUTOMATION_RUNTIME_UI_COMPATIBLE_RUNTIME_CONTRACT_VERSION = "1.0.0"`, asserted
  equal to `RUNTIME_CONTRACT_VERSION` from `@onyx/phase1a6-workflow-runtime`
  at module load time.

Phase 1A.7 reuses, and never redefines:

- `WorkflowState` and the 32 frozen `WORKFLOW_STATES` (Phase 1A.5)
- `RuntimeStatus` and the Phase 1A.6 status projector (`projectRuntimeStatus`)
- `RuntimeSnapshot` and `buildRuntimeSnapshot` (Phase 1A.6)
- the Phase 1A.5 approval package fields (read-only display only)

## `AutomationRuntimeProjection`

`buildAutomationRuntimeProjection` combines a Phase 1A.6 `RuntimeSnapshot`
with additive identity, connector, permission, and budget metadata into one
immutable (`Object.freeze`d), deterministic object. It never re-derives
`currentState` or `runtimeStatus`; both are copied verbatim from the
snapshot.

Fields include: `repository`, `scopeHash`, `currentState`, `runtimeStatus`,
`currentCapability`, `completedCapabilities`, `pendingCapabilities`,
`checkpointCount`, `latestCheckpointDigest`, `evidenceCount`,
`latestEvidenceSequence`, `recoveryAvailable`, `reconciliationRequired`,
`pauseAvailable`, `resumeAvailable` (derived only from
`runtimeStatus === "PAUSED"`), `cancelAvailable`, `executionLaneLimit`,
`identity`, `connectors`, `permissions`, `budget`, `modelRoutingClass`,
`voiceMetadataProviderNeutralReady`, the four safety flags (always `false`),
`updatedAt`, and `noLiveWorkflowExecuting` (always `true`).

The builder throws if:

- `identity.initiatingPresenceMode` is not one of `PRESENCE_MODES`
- any `connector.connectorProvider` is not one of `CONNECTOR_PROVIDERS`
- two connectors share the same `connectorProvider:connectorAccountId` key
  (connector-account identities must remain isolated and must never be
  merged)

## Presence modes

`PRESENCE_MODES = ["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"]`.
See [phase1a7-identity-and-persona-boundaries.md](./phase1a7-identity-and-persona-boundaries.md).

## Connector providers

`CONNECTOR_PROVIDERS = ["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive", "UNKNOWN"]`.
See [phase1a7-connector-permission-projection.md](./phase1a7-connector-permission-projection.md).

## Deterministic fixtures

`automationRuntimeFixtures.ts` exports `RUNTIME_FIXTURE_IDS` (22 stable IDs)
and `buildRuntimeFixtures()`, which builds every fixture from a single fixed
clock (`2026-01-01T00:00:00.000Z`) using `buildRuntimeSnapshot` directly. No
fixture ever reads the current clock.

## Acceptance manifest

`apps/command-center/src/phase1a7-acceptance-manifest.json` maps every
`P17-*` ID to its stable exported implementation identifiers, its test
file(s), a validation method (`"vitest"`), and an acceptance status.
