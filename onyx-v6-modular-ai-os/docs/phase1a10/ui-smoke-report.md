# Phase 1A.10 UI Smoke Report

## Assessment

**VERIFIED**

Manual UI smoke validation was executed against the live application interface on the approved baseline commit.

## Automated Evidence

- `pnpm -r build`: PASS.
- The full workspace test run passed 323 of 326 tests. The three failures are the documented `COMMAND-CENTER-REGRESSION-01` test-environment failures.

## Manual UI Validation Results

### Character Shell

- ONYX visible and switchable: **PASS**
- NOVA visible and switchable: **PASS**
- Character switching available: **PASS**

### Automation Center

- Overview tab: **PASS**
- Queue tab: **PASS**
- Approvals tab: **PASS**
- Validation tab: **PASS**
- Evidence tab: **PASS**
- History tab: **PASS**

### Governed Runtime

- Governed Runtime accessible and reachable: **PASS**
- Scheduler disabled: **PASS**
- Promotion disabled: **PASS**
- Runtime lane limit confirmed as 1: **PASS**

### Browser Environment

- Browser console clean (no errors, warnings, or deprecations): **PASS**

## Summary

All manual UI smoke items passed validation. The application interface is functional, navigation flows correctly, and all automated safeguards (scheduler disabled, promotion disabled, lane limit = 1) are confirmed active in the UI.
