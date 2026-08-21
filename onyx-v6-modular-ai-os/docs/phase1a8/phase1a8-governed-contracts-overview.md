# Phase 1A.8 — Governed Contracts Overview

Package: `@onyx/phase1a8-governed-contracts` (`packages/phase1a8-governed-contracts/`).
This document covers **Wave 1 of 4** bounded implementation passes.

## Objective

A contract-only, deterministic-simulation-only layer for governed multi-agent
coordination (Track A) and tiered memory / context orchestration (Track B),
required before Phase 1A.9 implements the bounded scheduler and Automation
Center V2. No scheduler, no live GitHub/connector/paid/memory-write action,
and no merge/deploy/secret/permission change exists anywhere in this package.

## Wave boundary

Wave 1 delivers only `src/shared/*` — the cross-cutting contracts both
tracks depend on. `src/track-a/*`, `src/track-b/*`, `src/ux/*`, and
`src/local-simulation/*` do not exist yet and are implemented in later waves.

## Track separation invariant

Track A and Track B will connect only through stable string identifiers,
never a combined runtime-state object. `shared/*` provides the versions,
risk classes, parallel-safety classes, lane roadmap, approval and
material-change logic, permission profile, connector scope, budgets, and
safety flags that both tracks reference by ID in later waves.

## Contract versions frozen in Wave 1

| Constant | Value |
|---|---|
| `AGENT_COORDINATION_CONTRACT_VERSION` | `1.0.0` |
| `APPROVAL_RISK_CONTRACT_VERSION` | `1.0.0` |
| `AGENT_PERMISSION_CONTRACT_VERSION` | `1.0.0` |
| `CONNECTOR_SCOPE_CONTRACT_VERSION` | `1.0.0` |
| `BUDGET_CONTRACT_VERSION` | `1.0.0` |
| `MEMORY_CONTRACT_VERSION` | `1.0.0` |
| `CONTEXT_CONTRACT_VERSION` | `1.0.0` |
| `PERSONA_PROTECTION_CONTRACT_VERSION` | `1.0.0` |
| `COUNCIL_MODE_CONTRACT_VERSION` | `1.0.0` |
| `SAVED_DRAFT_CONTRACT_VERSION` | `1.0.0` |
| `AUTOMATION_CENTER_V2_CONTRACT_VERSION` | `1.0.0` |
| `ACCESSIBILITY_GATE_CONTRACT_VERSION` | `1.0.0` |
| `COMPATIBLE_WORKFLOW_CONTRACT_VERSION` | `1.0.0` (bound to Phase 1A.5) |
| `COMPATIBLE_RUNTIME_CONTRACT_VERSION` | `1.0.0` (bound to Phase 1A.6) |
| `COMPATIBLE_UI_CONTRACT_VERSION` | `1.0.0` (pinned against Phase 1A.7) |
| `ACTIVE_PHASE1A8_RUNTIME_LIMIT` | `1` (reused by reference from Phase 1A.6) |

## Three independent axes

`operationClass` (arrives with Track A's future capability-declaration
module), `parallelSafetyClass` (`shared/parallel-safety.ts`, frozen here),
and `riskClass` (`shared/risk-classes.ts`, frozen here) are, and remain,
three separate axes. No module in this package merges them.

## Semantic corrections recorded for later Track B waves

1. M2 is governed retained user and project memory.
2. M2 is not automatically authoritative over its canonical source.
3. Canonical repository, connector, and external source records remain
   authoritative for sourced information.
4. Explicit user-authored memory may be canonical for the user's stated
   preference or instruction, subject to correction, supersession, deletion,
   permissions, policy, and audit.
5. Generated inference, recommendation, hypothesis, and summary records must
   remain labeled, derived, and non-canonical.

These are recorded now so the Track B wave implements memory tiers
consistently with them; no memory-tier code exists yet in Wave 1.

## Security posture

No scheduler, no Track A task execution, no Track B memory implementation,
no multiple runtime lanes, no child-process/eval/shell/command surface, no
live GitHub/connector/paid/merge/deploy/secret/permission actions. Verified
in `tests/security-boundaries.test.ts`, which scans this package's own
shared-module source for prohibited substrings and asserts the dependency
list contains only the two governed predecessor packages.

## Acceptance status

All 29 `P18-*` IDs are present in `acceptance-manifest.json` and are all
`"pending"` in Wave 1 — none are marked `"accepted"` yet, since the
validator script and the full per-track documentation set arrive in later
waves.
