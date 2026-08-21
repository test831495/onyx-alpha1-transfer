# Phase 1A.8 Automation Center V2 UX Contracts

This documentation defines the contract-only UX layer for the governed Automation Center V2. The scope remains read-only and deterministic: no React screen rendering, no live actions, and no runtime execution. The contract focuses on identity, registry, projections, and release gating.

## Screen registry invariants

- Screen IDs are fixed to the allowed set: DASHBOARD, INTAKE, PLANS, APPROVALS, WORKFLOWS, AGENT_ACTIVITY, VALIDATION_CENTER, EVIDENCE_VIEWER, CONTEXT_EXPLORER, RECOVERY_CENTER, COST_CENTER, SETTINGS.
- Each screen has a unique route ID and deterministic display order.
- A screen projection is not action authority and never grants approval, recovery, or mutation permission.
- All screens must declare mandatory accessibility gates.
- Approval and Recovery screens must include their specialized accessibility gates.

## Governance invariants

- No screen contract may hide risk, approval expiry, recovery requirements, connector-account attribution, permission boundaries, or approval expiry.
- The Dashboard contract must display lane limit one and all frozen false safety flags.
- Approval and recovery contracts expose scope, cost, external system, connector account, rollback, and recovery requirements.
- Evidence is mandatory; workflow completion cannot be represented without a valid evidence package.
- Cross-screen correlation stores references only and never embeds credentials or sensitive content.
