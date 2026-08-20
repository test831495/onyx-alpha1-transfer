# PER.2 Presence Mode Contracts

Presence modes determine who may speak and how characters coordinate. A mode changes presentation and routing, never identity constitutions, permissions, or approval requirements.

## Character visibility modes

- `ONYX_ONLY`: only ONYX may present a user-facing response or initiate an approved ONYX action.
- `NOVA_ONLY`: only NOVA may present a local response or local-first action.
- `ONYX_AND_NOVA`: both may participate, subject to the Conversation Director and Voice Floor Manager.

## Coordination modes

- **Collaborative mode**: characters contribute complementary perspectives toward one shared response; the Director assigns roles and merges outputs.
- **Review mode**: one character presents a proposal and the other checks correctness, policy, privacy, and evidence.
- **Challenge mode**: the challenger actively tests assumptions and identifies failure cases; challenge does not authorize an action.
- **Debate mode**: characters present bounded, attributable positions with a stated question, evidence, and stopping condition.
- **Consensus mode**: characters identify agreement, unresolved disagreement, and the smallest decision that can be safely made. Consensus never replaces human approval.

## Contract rules

Each interaction has a selected visibility mode, coordination mode, active character versions, speaker order, and response owner. The system must label perspective changes and preserve attribution. A character may abstain when its constitutional boundary or evidence threshold is not met.

Tool calls remain subject to the same identity and approval rules as single-character conversations. In `ONYX_AND_NOVA`, shared context does not imply shared authority: NOVA cannot authorize ONYX, and ONYX cannot disclose NOVA-private context without permission.

## Failure and rollback

If routing is ambiguous, the Director pauses and requests clarification or selects the least-privileged safe mode. If a mode switch causes identity, privacy, or attribution drift, restore the prior mode, preserve the transcript, and mark any pending action invalid.

<!-- architecture-hardening-v1 -->

## Routing precedence

Character routing uses this precedence:

1. Explicit Rahul instruction
2. Explicit named-character invocation
3. Active council-session ownership
4. Active single-character session
5. Approved task-routing policy
6. Non-binding system recommendation

Automatic routing cannot override an explicit Rahul selection.

## Presence transition contract

Every presence transition records:

- Previous mode
- Requested mode
- Requesting actor
- Active conversation ID
- Handoff package
- Pending tool action
- Pending approval state
- Transition timestamp
- Transition result

Switching presence must not duplicate pending actions or lose approval state.

## Presence acceptance criteria

- ONYX_ONLY can be selected directly.
- NOVA_ONLY can be selected directly.
- ONYX_AND_NOVA can be selected directly.
- Either character can join or leave a session.
- The conversation retains verified context.
- Only one character speaks at a time.
- Rahul can interrupt immediately.
- The secondary character adds material value or remains silent.
- Presence changes do not change permissions.
- Character consensus does not create approval.
