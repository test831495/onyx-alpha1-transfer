# Phase 1A.10 Evidence Pack Summary

## Scope

Documentation-only consolidation of the collected Phase 1A.10 Wave A and Wave B evidence. No runtime behavior, application code, production configuration, permissions, or secrets were changed. The scheduler and promotion were not activated.

## Evidence Summary

### Automated Evidence

- Baseline verification: PASS. The repository, branch, HEAD, both required tags, exact tag resolution, and ancestry were verified.
- Fresh-clone install: PASS with the successful command run from `onyx-v6-modular-ai-os/` using `pnpm install --frozen-lockfile`.
- Typecheck: PASS.
- Build: PASS, with a non-failing chunk-size warning.
- Tests: CONDITIONAL PASS, with 323 of 326 tests passing and three failures matching `COMMAND-CENTER-REGRESSION-01`.

### Manual UI Validation (Wave A)

- Character Shell (ONYX/NOVA visible, switching available): PASS.
- Automation Center (Overview, Queue, Approvals, Validation, Evidence, History): PASS.
- Governed Runtime (reachable, scheduler disabled, promotion disabled, lane limit = 1): PASS.
- Browser console (clean): PASS.

### Manual Runtime Validation (Wave A)

- Runtime startup and health: PASS.
- Governed workflow execution through live runtime: PASS.
- Scheduler activation blocked (disabled): PASS.
- Promotion execution blocked (disabled): PASS.

### Manual Recovery Validation (Wave A)

- Fresh clone from GitHub repository: PASS.
- Release tag `phase1a9-merged-main` resolution and validation: PASS.
- Production checkpoint tag `onyx-phase1a9-production-checkpoint` resolution and validation: PASS.
- Frozen install, typecheck, and build consistency verified: PASS.

## Overall Assessment

**CONDITIONAL PASS**

All Phase 1A.10 Wave A and Wave B evidence is collected, verified, and documented. The conditional status is due to the known `COMMAND-CENTER-REGRESSION-01` test-environment failures, which are preserved and unrepaired as required by governance.

See `acceptance-registry.md` for the Phase 1A.10 acceptance checklist and item-level status.