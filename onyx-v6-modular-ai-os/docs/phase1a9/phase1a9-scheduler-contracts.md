# Phase 1A.9 Scheduler Contracts

All Phase 1A.9 contract versions are `1.0.0`. Compatibility is bound to Phase 1A.5 workflow `1.0.0`, Phase 1A.6 runtime `1.0.0`, Phase 1A.7 UI integration `1.0.0`, and Phase 1A.8 governed contract groups `1.0.0`.

The disabled Wave 1 configuration defaults to S0_SINGLE, authoring limit 1, stabilization limit 2, and promotion limit 1. Authority, lane-stage decision, schedulable-task reference, scheduler-event, classification, safety, and evidence-artifact contracts are pure references and validators. No execution eligibility state is defined.

Operation class, parallel-safety class, and risk class are independent axes. Phase 1A.8 remains authoritative for parallel-safety values. R4 requires fresh approval; R5 is prohibited. Future components may bind dependency, lease, heartbeat, lock, checkpoint, recovery, budget, promotion, projection, and simulation contracts without moving their execution into this package.