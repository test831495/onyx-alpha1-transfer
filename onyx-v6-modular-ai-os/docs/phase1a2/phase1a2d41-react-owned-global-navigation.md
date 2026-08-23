# Phase 1A.2D.4.1 React-owned Global Navigation Correction

## Decision
Global Automation, Settings, and Health controls are rendered exactly once by App.tsx. The failed D.4 MutationObserver and appendChild relocation mechanism is removed.

## Behavior
- NOVA modules: Home, Messages, Tasks, News, Workspace.
- ONYX modules: Home, Executive, Finance, News, Workspace, Calendar.
- Shared utilities: Automation, Settings, Health.
- Utility clicks dispatch explicit panel events and never enter intent routing.
- Standalone bootstrap launchers remain mounted but hidden, preserving panel state and avoiding duplicate controls.
- voiceSessionCoordinator remains active because push-to-talk acceptance improved.

## Safety
No merge, deployment, permission, secret, or GitHub mutation is performed.
