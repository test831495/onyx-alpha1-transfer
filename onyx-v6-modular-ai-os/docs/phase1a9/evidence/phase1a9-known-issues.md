# Known Issues

## COMMAND-CENTER-REGRESSION-01

The bounded Command Center regression records three `localStorage` failures in `automationIntakePersistence.e91.test.ts` because the Node test environment does not provide `localStorage`, plus one future-capability expectation mismatch in `workspaceController.test.ts`.

Scope is the Command Center test environment and its existing future-capability expectation. No scheduler production contract is changed. Scheduler impact is none; release impact is a separate bounded regression reconciliation requirement. The issue is visible, not suppressed, and must be closed by a future test-environment-only or explicitly bounded task owned by Command Center maintainers.

No additional Critical or High scheduler issue was identified by this local pass.