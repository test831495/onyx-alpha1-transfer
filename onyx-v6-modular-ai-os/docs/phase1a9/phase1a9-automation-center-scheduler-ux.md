# Phase 1A.9 Wave 4B: Automation Center Scheduler UX

## Scope and Authority

The Automation Center is a read-only control tower. It projects scheduler decisions from Phase 1A.9 while Phase 1A.5 owns workflow state, Phase 1A.6 owns runtime authority, and Phase 1A.8 owns agent, memory, Council, connector, approval, evidence, and promotion contracts. A displayed status does not create truth, and an eligible action does not execute an operation.

Wave 4B exposes versioned, immutable scheduler projections and operator action eligibility. The projection contains stable IDs, redacted summaries, source references, fixed timestamps supplied by the caller, health, staleness, warnings, blocking decisions, reconciliation references, and contract versions. Conflicting authoritative source classes are reported as reconciliation required. Stale projections expose the last evaluation reference and do not refresh live data.

The frozen representation is explicit: `schedulerEnabled=false`, `activeLaneStage=S0_SINGLE`, `runtimeLaneLimit=1`, `promotionLaneLimit=1`, and `promotionExecutable=false` remains outside the UI as a disabled capability.

## Automation Center Views

The existing Automation Center remains the single top-level command center. The existing `governed-runtime` destination remains stable and reachable. Scheduler projections are shown alongside the existing governed runtime dashboard.

The scheduler overview presents enabled state, active stage, lane and promotion limits, task and ready counts, leases, warnings, staleness, workflow/runtime references, and reconciliation messages. Agent Activity presents lease generations, heartbeat health, clock skew, stale workers, and recovery handoff counts without worker secrets or payloads.

The projection contract also covers task graph and ready-set decisions, lanes and capacity, locks and checkpoints, cancellation and joins, budgets and model-routing boundaries, recovery and reconciliation, promotion and evidence, memory/context boundaries, Council agreement/disagreement, Saved Draft eligibility, and connector provider/account/scope isolation. These are redacted summaries and references only. No content, prompts, responses, memory records, connector payloads, or personal content is rendered.

Validation Center, Evidence Viewer, Context Explorer, Recovery Center, Cost Center, and Settings retain their existing Automation Center ownership. Scheduler details are projections, not replacement authorities.

## Operator Actions

The action eligibility contract permits only `INSPECT`, `OPEN_EVIDENCE`, `OPEN_CONTEXT_REFERENCE`, `OPEN_RECOVERY_DETAILS`, `OPEN_APPROVAL_DETAILS`, `OPEN_COST_DETAILS`, `COPY_REFERENCE`, and `REQUEST_FUTURE_GOVERNED_ACTION`. Every decision includes a read-only marker, governance reference, approval fields, risk classification, denial reasons, accessible label and description, focus target, evidence references, and contract version.

Mutation and execution controls are absent. Scheduler activation, task dispatch, cancellation, retry, resume, reassignment, spend, model invocation, connector calls, memory writes, promotion, Git, deployment, and approval bypass are not handlers in this UI slice. Disabled or unavailable actions must provide a visible and screen-reader-readable reason.

## UI States and Accessibility

Panels have deterministic loading, empty/unknown, stale, blocked, failed-safe, reconciliation-required, unauthorized, redaction-required, and schema-mismatch handling at the projection boundary. Unavailable data is not presented as an empty workflow. Loading uses `aria-busy`; status messages use semantic status/live-region semantics; headings, sections, details/summary, labels, and text values provide screen-reader alternatives to visual status.

Keyboard navigation follows native tab order and native `details`/`summary` interaction. Focusable controls have visible focus styles through the existing application conventions; state errors identify their message rather than requiring color. Status includes text and is never color-only. The panels use responsive auto-fit grids, relative text sizing, wrapping references, and bounded containers to support reflow and high zoom. Touch targets use padded controls. The added components contain no animation, so reduced-motion users receive the same behavior.

Live status and reconciliation messages are polite and reference-only. The stateless panels do not own modal focus restoration; any future modal integration must return focus to its invoking control and move focus to an error summary when appropriate.

## Security and Redaction

Projection types intentionally contain counts, stable references, digests where permitted, classifications, and redacted summaries only. They exclude credentials, headers, keys, secrets, connector content, unrestricted memory, P0 content, prompts, responses, chain-of-thought, hidden reasoning, and unredacted personal content. Safety verification rejects a projection that is enabled, leaves S0, raises either lane limit, exposes a P0 writer path, or grants memory authority.

Council identities remain separate and disagreement remains visible. Saved Draft invalidation and connector attribution/isolation remain references. Budget status never grants permission. Recovery dispositions are recommendations only. Evidence is not persisted or sealed.

## Known Limitations and Non-Goals

These are focused unit and component tests over deterministic fixtures, not full browser testing or production accessibility certification. The repository does not provide a DOM test runner for these existing component tests, so stateless React elements and their semantic properties are inspected directly. Focus restoration for a future modal host remains an integration responsibility.

No scheduler action was executed. No task was dispatched. No memory was accessed. No connector was called. No Council action occurred. No draft was persisted. No promotion was executed. No Git operation was performed. No evidence was persisted. Scheduler remains disabled, `S0_SINGLE` remains active, runtime limit remains one, and promotion limit remains one.
