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

`AutomationDashboard.tsx` gains one new stable, additive tab identifier,
`GOVERNED_RUNTIME_TAB_ID` (`"governed-runtime"`, labeled "Governed Runtime"),
rendered via the exported, stateless `GovernedRuntimeTab` component. The
existing `AutomationDashboard` entry point, its original nine tabs, and every
existing panel (approval dialog, evidence viewer, Draft PR review) are
unchanged and remain reachable exactly as before.

### Navigation path (user-reachable)

```
Automation Center                          (opened by the existing "Automation" footer button)
  -> "Governed Runtime" tab                (GOVERNED_RUNTIME_TAB_ID, in the existing tab bar)
    -> GovernedRuntimeTab                  (stateless tab-content component, exported for testing)
      -> AutomationRuntimeDashboard        (the existing, unmodified Phase 1A.7 runtime dashboard)
        -> AutomationRuntimeIdentityPanel
        -> AutomationConnectorScopePanel
        -> AutomationRuntimeBudgetPanel
        -> AutomationRuntimeEvidenceTimeline (when evidence entries are supplied)
        -> AutomationRecoveryPanel           (when a recovery view model is supplied)
        -> AutomationReconciliationPanel
```

A user opens the Automation Center with the existing "Automation" footer
button (unchanged), selects the "Governed Runtime" tab from the existing tab
bar, and immediately sees the mock-only runtime dashboard rendered against a
deterministic fixture (defaulting to `RUNNING_BRANCH_STEP`, selectable via an
in-tab scenario picker that lists every `RUNTIME_FIXTURE_IDS` value,
including `ONYX_INITIATED`, `NOVA_INITIATED`, and `COUNCIL_INITIATED`). No
manual import or source change is required.

`GovernedRuntimeTab` is deliberately stateless (fixture selection is lifted
into `AutomationDashboard`'s existing state) so it can be invoked directly in
tests without a DOM renderer, proving the render chain down to
`AutomationRuntimeDashboard` without relying on human-readable test titles.

The previously orphaned `AutomationGovernedRuntimeLauncher` export and its
unreachable `onyx:open-automation-runtime` event trigger have been removed;
nothing referenced them once the tab was wired in, so no second, unreachable
navigation path remains.

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
