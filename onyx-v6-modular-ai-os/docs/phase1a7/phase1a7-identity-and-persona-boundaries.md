# Phase 1A.7 — Identity and Persona Boundaries

## Runtime identity projection

`RuntimeIdentityProjection` fields: `runtimeId`, `runtimeSessionId`,
`workflowId`, `supervisingUserId`, `initiatingCharacterId` (optional),
`initiatingPresenceMode`, `activeAgentId` (optional), `assignedAgentIds`
(optional), `activeLaneId` (optional), `laneCount`, `promotionLaneActive`,
and `sharedTaskReferences` (optional).

Only `runtimeId`, `runtimeSessionId`, and `workflowId` are required identity
fields. Every character, agent, and lane field is additive and optional
where appropriate, matching the frozen invariant that Phase 1A.7 must not
assume one permanent agent owns the workflow.

## No authority from identity

Character, agent, and lane identity fields are attribution metadata only.
They are never combined with, and never substitute for, the Phase 1A.5
approval package. Rahul Kumar's approval (`GOVERNED_ACTOR`) remains the sole
authority for any governed action; nothing in `RuntimeIdentityProjection`
carries an "approved" or "authorized" field of its own.

`AutomationRuntimeIdentityPanel` renders identity fields read-only and
includes an explicit statement that character, agent, and lane identity
grant no approval authority.

## Persona separation

Presence modes are `ONYX`, `NOVA`, `ONYX_NOVA_COUNCIL`, `SYSTEM`, and
`UNASSIGNED`. The projection builder rejects any other value. No
ONYX-specific or NOVA-specific personality state, personality memory, or
character-private memory is ever read or projected by this dashboard — the
runtime identity projection only carries attribution fields (character ID,
presence mode, agent ID), never memory content.

## Shared task references

A `SharedTaskReference` (`taskId`, `permissionGranted`, `redactedSummary`) may
only ever be displayed if `permissionGranted` is `true`.
`redactSharedTaskReferences` drops every reference that lacks an explicit,
checked permission grant before the projection is built and frozen, so a
denied reference can never reach the identity panel.

## Fixtures

`ONYX_INITIATED`, `NOVA_INITIATED`, `COUNCIL_INITIATED`, and
`UNASSIGNED_AGENT` fixtures exercise every allowed presence mode.
`COUNCIL_INITIATED` also exercises multi-agent assignment
(`assignedAgentIds`) and shared-task-reference redaction (one granted, one
denied reference; only the granted one is ever projected).
`FUTURE_LANE_PROJECTION` proves that `laneCount` and `promotionLaneActive`
are additive fields that never change the actual `executionLaneLimit` of one.
