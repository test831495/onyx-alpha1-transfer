# Phase 1A.10 Fresh Clone Validation

## Scope

Wave B repository-local dependency and validation checks. No application or production changes were made, and no scheduler or promotion action was activated.

## Results

- Install: **PASS**. `pnpm install --frozen-lockfile` completed from the workspace root using pnpm `10.15.0`; all 34 workspace projects were resolved with the lockfile unchanged. An initial invocation from the Git root failed with `ERR_PNPM_NO_PKG_MANIFEST`; the command was then run from the correct workspace root, `onyx-v6-modular-ai-os/`.
- Typecheck: **PASS**. `pnpm -r typecheck` passed across all 33 projects with a typecheck script.
- Build: **PASS**. `pnpm -r build` completed successfully. Vite emitted a non-failing warning that the main JavaScript chunk exceeds 500 kB after minification.
- Tests: **CONDITIONAL PASS**. `pnpm -r test` completed all package suites successfully, but the Command Center suite reported 34 files with 3 failures and 323 passing tests out of 326.

## Failures Observed

The failing tests are:

- `apps/command-center/src/automationIntakePersistence.e91.test.ts`
  - `saves and reloads active draft`
  - `deduplicates same scope and deletes safely`
  - `retains no-execution governance`

All three fail with `ReferenceError: localStorage is not defined` because the Node test environment does not provide `localStorage`.

## Known Regressions

These failures match the documented `COMMAND-CENTER-REGRESSION-01` in `docs/phase1a9/evidence/phase1a9-known-issues.md`. The issue is classified as a Command Center test-environment regression and is documented only in this Wave B audit. No code or test-environment repair was attempted.

The documented future-capability expectation mismatch in `workspaceController.test.ts` did not appear in this run.

## Pass/Fail Assessment

**CONDITIONAL PASS**

Dependency installation, typecheck, and build passed. The full test gate is not clean because of three failures, but all observed failures match the previously documented `COMMAND-CENTER-REGRESSION-01`. No new regression was identified, and no application, architecture, production configuration, scheduler, or promotion change was made.