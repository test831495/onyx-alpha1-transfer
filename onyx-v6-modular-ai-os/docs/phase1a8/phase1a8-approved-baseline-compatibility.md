# Phase 1A.8 — Approved Baseline Compatibility

## Approved baseline names and versions (as asserted by the governing prompts)

- ONYX/NOVA Architecture and Operations Bible v3.0
- GitHub Agent Playbook Pack v1.0
- Memory Architecture Specification v1.0
- Automation Center V2 UX Blueprint v1.0
- Parallel Acceleration Pack v1.0
- Connector Architecture and Integration Contracts v1.0
- Voice and Presence Architecture v1.0
- Character Bible v1.0
- Character Asset Factory Blueprint v1.0

## Provenance and approval context

None of the nine documents above are committed anywhere in this repository
(verified by an exhaustive, keyword-broadened search of the full workspace
during the Phase 1A.8 design-freeze pass). This document records
**compatibility requirements**, not a reconstruction of those documents'
full contents. Per Rahul's explicit instruction, the approved prompts (the
Phase 1A.8 design-freeze prompt and the Phase 1A.8 implementation prompts)
and the cross-session architecture decisions already committed in this
repository (the Phase 1A.5 / Phase 1A.6 / Phase 1A.7 contracts and
`docs/phase1a7/*`) currently **are** the compatibility baseline, until Rahul
supplies the missing source documents or overrides a specific requirement.

## Consumed invariants, mapped to authoritative source

| Invariant | Authoritative source |
|---|---|
| 32 workflow states, reused by reference | `@onyx/phase1a5-workflow-engine` (committed code) |
| Runtime contract version 1.0.0, execution lane limit 1 | `@onyx/phase1a6-workflow-runtime` (committed code) |
| UI contract version 1.0.0, presence modes, connector providers, budget statuses | `apps/command-center/src/automationRuntimeContracts.ts` (committed code) |
| Agent identity / lease / heartbeat / dependency-graph / lock / CAS / evidence / cancellation / join / aggregation contract shapes | `docs/phase1a7/phase1a7-multi-agent-readiness.md` and `phase1a7-identity-and-persona-boundaries.md` (committed docs), plus the Phase 1A.8 design-freeze report (approved prompt) |
| Tiered memory (M0-M5, P0), context assembly, poisoning protection, Council Mode, Saved Draft, Automation Center V2, accessibility gates | the Phase 1A.8 design-freeze report (approved prompt) only — no committed predecessor document exists |

## Authoritative source rules

Canonical repository code and committed docs outrank the prompt wherever
both exist and could conflict. Where only the prompt defines a requirement
(all of Track B, most UX/accessibility contracts), the prompt is
authoritative until superseded by a committed document or an explicit
Rahul override. This mirrors the frozen Context Assembly source-precedence
order intended for Track B: current user instruction, current approval
state, repository truth, ADRs, architecture documentation, durable memory,
session memory, low-trust sources.

## Compatibility obligations

- Bind to, never fork, `WORKFLOW_CONTRACT_VERSION` / `WORKFLOW_STATES`
  (Phase 1A.5) and `RUNTIME_CONTRACT_VERSION` (Phase 1A.6) — enforced at
  import time in `src/shared/versions.ts` with a throw on any mismatch.
- Pin `COMPATIBLE_UI_CONTRACT_VERSION = "1.0.0"` against
  `AUTOMATION_RUNTIME_UI_CONTRACT_VERSION` in `apps/command-center`,
  verified by a source-text assertion in `tests/compatibility.test.ts`
  (the UI contract lives in an app rather than a workspace package, so a
  reverse app-to-package dependency is not used).
- `ACTIVE_PHASE1A8_RUNTIME_LIMIT` is reused by reference from
  `RUNTIME_EXECUTION_LANE_LIMIT` and must equal `1` throughout Phase 1A.8.

## Explicit exclusions

No scheduler, no parallel task dispatch, no multiple active runtime lanes,
no concurrent remote mutation, no live GitHub/connector/paid-model/durable-
memory-write actions, no merge, no production deployment, no Netlify
update, no secret/permission/branch-protection change, no child-process or
arbitrary command/shell interface.

## Wave 1 scope note

This document itself, and the compatibility bindings above, are the only
baseline-compatibility material Wave 1 implements. Track B's memory,
context, persona, Council Mode, and Saved Draft baseline mappings will be
extended in the Track B wave without modifying the bindings recorded here.
