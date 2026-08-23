# Phase 1A.8 Accessibility Release Gates

The accessibility gate contracts define the release-blocking conditions for Automation Center V2 screens. These contracts are intentionally deterministic and do not execute a browser scan or launch live UI.

## Mandatory gate set

- KEYBOARD_NAVIGATION
- SCREEN_READER_SEMANTICS
- FOCUS_MANAGEMENT
- RESPONSIVE_REFLOW
- WCAG_AA_CONTRAST
- REDUCED_MOTION
- CLEAR_ERROR_IDENTIFICATION
- STATUS_ANNOUNCEMENTS
- ACCESSIBLE_APPROVAL_RISK
- ACCESSIBLE_RECOVERY_CONTROLS

## Release rules

- FAIL blocks release.
- NOT_EVALUATED blocks release for mandatory gates.
- BLOCKED blocks release.
- REQUIRES_REMEDIATION blocks release.
- NOT_APPLICABLE requires an explicit justification.
- Release is allowed only after all mandatory screens and gates are present and evaluated.
- Approval risk and recovery controls are required to be accessible before release recommendation.

## Contract-only enforcement

The contract enforces the release decision structure and is used for acceptance testing. It does not implement live accessibility scanning or UI rendering.
