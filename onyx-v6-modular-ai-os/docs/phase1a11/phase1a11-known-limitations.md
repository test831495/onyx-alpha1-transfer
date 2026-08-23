# Phase 1A.11 Known Limitations

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: stakeholders, reviewers, future implementers

## Purpose

This document records the boundary between the validated Wave A contract freeze and future runtime implementation work. It intentionally separates verified contract status from unimplemented runtime features.

## What this means for the user

The user receives a stable definition of what is currently frozen and what remains future work. Nothing here is presented as a running household system or production-ready feature.

## Current state

Current status is contract-defined, focused-tested, and ready for review. Implementation is intentionally deferred.

## Limitation registry

| Limitation | User impact | Security impact | Current mitigation | Owner | Target wave | Reopening trigger |
| --- | --- | --- | --- | --- | --- | --- |
| Wave A is contract-only | No live runtime behavior | Low, because no runtime is activated | Contract freeze and focused validation | Rahul Kumar | Wave B | runtime activation is proposed |
| Household runtime does not exist | No live household operations | Medium | Contract-only model remains in place | Rahul Kumar | future implementation wave | runtime work begins |
| Production authentication does not exist | No live sign-in flow | High | Authentication remains a future service | Rahul Kumar | future implementation wave | auth implementation proposal |
| Persistent sessions do not exist | No live session continuity | High | Server-managed session requirement remains documented | Rahul Kumar | future implementation wave | session service is planned |
| Database persistence does not exist | No real account or memory storage | High | Contract freeze and read-only evidence only | Rahul Kumar | future implementation wave | storage layer is planned |
| Project Journey semantic retrieval does not exist | No live deep history retrieval | High | Authorization and provenance remain contract-defined | Rahul Kumar | future implementation wave | retrieval design is approved |
| Project Journey continuous ingestion does not exist | No live history ingestion | High | Source, provenance, and typed missing-state rules remain defined | Rahul Kumar | future implementation wave | ingestion plan is approved |
| Council runtime does not exist | No live Council coordination | Medium | Council remains advisory-only in contract | Rahul Kumar | future implementation wave | runtime council proposal |
| Break-glass runtime does not exist | No live override path | High | Oversight access remains a future runtime feature | Rahul Kumar | future implementation wave | oversight implementation begins |
| Voice narration does not exist | No live narration or voice output | Low | Voice behavior remains future work | Rahul Kumar | future implementation wave | voice feature begins |
| Technical Information UI does not exist | No live technical disclosure experience | Medium | Disclosure remains policy-controlled and hidden by default | Rahul Kumar | future implementation wave | UI implementation begins |
| Accessibility runtime testing remains future work | No live accessibility verification evidence | Medium | Contract requirements are defined | Rahul Kumar | future implementation wave | QA automation begins |
| Proposed Copilot instructions are not active | No automatic repo behavior change | Low | Draft is kept as documentation only | Rahul Kumar | future repo configuration | automation activation requested |
| COMMAND-CENTER-REGRESSION-01 remains separate and unrepaired | No claim of full product readiness | Medium | It remains explicitly tracked and not hidden | Rahul Kumar | future remediation wave | regression is reopened |
| Existing non-failing bundle-size warning remains separate | No runtime claims beyond current scope | Low | It is explicitly separate from the contract freeze | Rahul Kumar | future review | bundle analysis is reopened |

## Recovery and rollback

The limitation set is itself a protected document. It records unimplemented work without claiming a runtime system. Recovery is limited to preserving the validated contract state and evidence. Rollback decisions should maintain the same contract freeze and not alter the security assertions.

## Failure behavior

When a missing runtime item is treated as implemented, the contract is considered invalid. The correct behavior is to mark it as NOT VERIFIED or deferred rather than claiming a live capability.

## Acceptance references

These limitations correspond to the Wave A freeze, the documented constraints, and the accepted contract boundaries.

## Next safe step

The next safe step is to proceed with future implementation planning only after the contract constraints, acceptance registry, and evidence remain unchanged.
