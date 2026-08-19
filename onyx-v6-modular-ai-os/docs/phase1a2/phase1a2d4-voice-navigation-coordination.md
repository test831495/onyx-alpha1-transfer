# Phase 1A.2D.4 Voice Session Coordination and Navigation Consolidation

## Scope
- Move global Settings, Automation, and Health utilities into the existing bottom navigation at runtime.
- Preserve the existing React button instances and handlers while removing fixed-position collisions.
- Coordinate wake listening, command microphone sessions, typed commands, and speech playback.
- Treat expected recognition aborts during mode transitions as transition state rather than persistent errors.
- Re-arm wake listening with a bounded delay only when Auto Listen and Wake Words remain enabled.

## Boundaries
- No repository write, GitHub action, merge, deployment, permission change, secret access, or production operation.
- Browser microphone permission remains required.
- Provider configuration remains account/environment specific.
- Existing D.3 implementation and recovery tag remain the rollback baseline.
