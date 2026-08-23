# Multi-Character Foundation Contract

## Responsibilities

- **Conversation Director**: owns the interaction plan, selects presence and coordination modes, frames the question, and decides when the response is complete.
- **Character Session Router**: binds a turn to the active character version, visibility mode, permissions, and session context.
- **Perspective Assignment**: gives each character a distinct, attributable question or role and prevents duplicate or conflicting authority.
- **Voice Floor Manager**: controls turn-taking, interruption, handoff, and user-facing attribution.
- **Consensus Engine**: records agreement, disagreement, evidence, confidence, and unresolved decisions; it cannot grant authorization.

## Invariants

- **One speaker at a time**: only the character holding the voice floor may emit user-facing speech. Other characters remain queued or internal until handed the floor.
- **One tool action at a time**: only one external or state-mutating tool action may be in flight for a session. A subsequent action waits for result, evidence, and policy re-check.

## Routing contract

A session turn contains the requested mode, character identities, perspective assignments, context references, tool intent, and completion state. The Router validates identity and permissions; the Director assigns work; the Voice Floor Manager serializes output; the Consensus Engine records the result. Any ambiguity pauses the turn.

Characters may disagree, abstain, or request human review. The final response preserves attribution where perspectives materially differ. Shared memory is read according to its permissions and is never treated as approval.

## Failure handling

On simultaneous output, identity mismatch, tool collision, stale context, or policy conflict, stop the affected turn, return the floor to the Director, preserve the event trace, and invalidate pending tool approval when scope has changed. Recovery resumes only after a fresh routing and policy check.

<!-- architecture-hardening-v1 -->

## Coordination evidence

Every council session records:

- Discussion ID
- Conversation ID
- Presence mode
- Discussion mode
- Primary character
- Secondary character
- Perspective assignments
- Shared evidence references
- Material claims
- Areas of agreement
- Areas of disagreement
- Tool requests
- Tool owner
- Joint recommendation
- Required Rahul decision
- Turn count
- Token and cost usage
- Completion reason

## Loop and cost controls

The Conversation Director enforces:

- Maximum autonomous turn count
- Maximum elapsed time
- Maximum token budget
- Maximum model-call budget
- Maximum tool-request count
- Duplicate-response suppression
- User interruption priority

Default autonomous character-to-character turns are limited to two.

Extended debate requires explicit Rahul instruction.

## Factual consistency rule

ONYX and NOVA receive the same authoritative facts, permission state, approval state, and execution result.

Characters may differ in interpretation, prioritization, recommendation, and presentation.

A factual disagreement triggers evidence resolution before consensus generation.

## Council acceptance criteria

- Both characters remain distinguishable.
- The second contribution adds material value.
- No uncontrolled conversation loop occurs.
- No overlapping speech occurs.
- No duplicate tool execution occurs.
- Disagreement is evidence-based or priority-based.
- Consensus identifies unresolved decisions.
- Rahul remains the final authority.
