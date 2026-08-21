# Phase 1A.7 — Automation Center Agent-Ready Dashboard

## Objective

Phase 1A.7 integrates the mock-only Phase 1A.6 governed workflow runtime into
the existing Automation Center. It exposes governed runtime lifecycle,
approval (read-only), checkpoints, evidence, recovery, reconciliation,
identity attribution, connector scope, permission boundaries, and
cost/security projections, while preserving future ONYX-only, NOVA-only, and
ONYX plus NOVA council operation.

Phase 1A.7 does not add live workflow execution or multi-agent scheduling. It
never calls GitHub, Git, a connector API, a paid API, a child process, or any
command/shell interface.

Phase 1A.7 does not fork or duplicate:

- the Phase 1A.5 workflow contract (`WORKFLOW_CONTRACT_VERSION`, the 32
  `WORKFLOW_STATES`, the ordered `CAPABILITIES` sequence, the approval
  package)
- the Phase 1A.6 runtime contract (`RUNTIME_CONTRACT_VERSION`,
  `RuntimeSnapshot`, the status projector, the runtime host, the recovery
  host, the reconciliation handoff)

## Package layout

```
apps/command-center/src/
  automationRuntimeContracts.ts        Phase 1A.7 UI integration contract
  automationRuntimeProjection.ts       AutomationRuntimeProjection builder
  automationRuntimeController.ts       injected, mock-only runtime controller
  automationRuntimeFixtures.ts         deterministic fixture scenarios
  phase1a7-acceptance-manifest.json    P17-* requirement -> implementation/test mapping
  components/
    AutomationRuntimeDashboard.tsx        top-level runtime dashboard
    AutomationRecoveryPanel.tsx           recovery projection panel
    AutomationReconciliationPanel.tsx     reconciliation projection panel
    AutomationRuntimeEvidenceTimeline.tsx evidence timeline panel
    AutomationRuntimeIdentityPanel.tsx    identity attribution panel
    AutomationConnectorScopePanel.tsx     connector scope and permission panel
    AutomationRuntimeBudgetPanel.tsx      budget and model-routing panel
```

`AutomationDashboard.tsx` gains one additive export,
`AutomationGovernedRuntimeLauncher`, which renders the new dashboard in its
own overlay (opened by the `onyx:open-automation-runtime` window event,
mirroring the existing `onyx:open-automation` pattern). The existing
`AutomationDashboard` export, its tabs, and every existing panel are
unchanged.

## Contract binding

`AUTOMATION_RUNTIME_UI_CONTRACT_VERSION` is `"1.0.0"` and is bound at module
load time to `RUNTIME_CONTRACT_VERSION` (also `"1.0.0"`) exported by
`@onyx/phase1a6-workflow-runtime`. If the two ever diverge, the module throws
immediately on import. See
[phase1a7-runtime-ui-contracts.md](./phase1a7-runtime-ui-contracts.md).

## Dashboard behavior

1. Extends the existing Automation Center; never replaces it.
2. Shows mock or local-simulation runtime only, and states clearly that no
   live GitHub workflow is executing.
3. Shows workflow lifecycle and ordered capability progress (completed and
   pending), checkpoint and evidence counts, approval state (read-only),
   identity attribution, connector scope and permissions (no connector
   content), budget and model-routing projections (no paid execution), all
   safety flags, and the current execution lane limit of one.
4. Exposes pause, resume, cancel, and recover controls through an injected
   `AutomationRuntimeController`, guarded per
   [phase1a7-recovery-reconciliation-ux.md](./phase1a7-recovery-reconciliation-ux.md).

## Safety

`mergeAllowed`, `productionDeployAllowed`, `forcePushAllowed`, and
`branchDeletionAllowed` are always `false` in every projection, fixture, and
controller snapshot. The controller and every component are free of any
`child_process`, shell, command, connector-action, or paid-API surface.

## Acceptance IDs

`P17-CONTRACT`, `P17-PROJECTION`, `P17-DASHBOARD`, `P17-CONTROLLER`,
`P17-IDENTITY`, `P17-APPROVAL`, `P17-RECOVERY`, `P17-RECONCILIATION`,
`P17-EVIDENCE`, `P17-CONNECTOR`, `P17-BUDGET`, `P17-MULTIAGENT`,
`P17-SECURITY`. See `apps/command-center/src/phase1a7-acceptance-manifest.json`
for the full requirement-to-implementation mapping.
