# Phase 1A.9.1 Test Evidence

## Allowed Replay Set

Run only the following local checks from the repository root:

```text
pnpm --filter @onyx/command-center build
pnpm --dir apps/command-center exec tsc --noEmit
pnpm --dir apps/command-center exec vitest run src/workspaceLayout.test.tsx src/cardGeometry.test.ts src/characterIsolation.test.ts src/phase1a91Integration.test.tsx src/shellFoundation.focused.test.tsx src/overflowPagination.test.ts
pnpm --dir apps/command-center exec vitest run src/schedulerProjectionAdapter.test.ts src/components/SchedulerOverviewPanel.test.tsx src/components/SchedulerAgentActivityPanel.test.tsx src/components/SchedulerAccessibility.test.tsx
bash scripts/validate-phase1a3e10.sh
pnpm --filter @onyx/phase1a9-governed-scheduler typecheck
pnpm --filter @onyx/phase1a9-governed-scheduler test
pnpm --dir packages/phase1a9-governed-scheduler exec vitest run tests/phase1a9-validator.test.ts tests/acceptance-audit.test.ts tests/local-simulation.test.ts tests/fault-injection.test.ts
bash scripts/validate-phase1a9.sh
git diff --check
```

## Recorded Baseline Evidence

- Command Center build: PASS
- Command Center typecheck: PASS
- Focused shell/layout tests: PASS, 123 tests including 24 overflow tests
- Wave 4B exact tests: PASS, 62 tests across 4 files
- E.10 validation: PASS
- Scheduler typecheck: PASS
- Scheduler suite: PASS, 31 files and 325 tests
- Validator replay: PASS, 69 tests across the focused validator/simulation set
- Whitespace check: PASS

The root `pnpm test` suite is not a closure gate because `COMMAND-CENTER-REGRESSION-01` remains separately classified.
