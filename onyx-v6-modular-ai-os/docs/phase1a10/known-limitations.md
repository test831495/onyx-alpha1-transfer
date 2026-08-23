# Phase 1A.10 Known Limitations

## Documented Regression

`COMMAND-CENTER-REGRESSION-01` remains applicable. The full workspace test run recorded three failures in `apps/command-center/src/automationIntakePersistence.e91.test.ts`, all caused by `ReferenceError: localStorage is not defined` in the Node test environment. The issue is documented in `docs/phase1a9/evidence/phase1a9-known-issues.md` and was not repaired.

## Validation Limitations

- UI smoke execution: NOT VERIFIED.
- Runtime smoke execution: NOT VERIFIED.
- Recovery rehearsal: NOT VERIFIED.
- The full test gate is not clean: 323 of 326 tests passed; the three failures match the known regression above.
- The build emits a non-failing warning for a JavaScript chunk larger than 500 kB after minification.
- The first install attempt from the outer Git root failed with `ERR_PNPM_NO_PKG_MANIFEST`; the frozen install passed when rerun from the correct workspace root.

No new Critical or High scheduler issue was identified by the referenced Phase 1A.9 local pass. This statement does not verify the unexecuted Phase 1A.10 smoke or recovery activities.
