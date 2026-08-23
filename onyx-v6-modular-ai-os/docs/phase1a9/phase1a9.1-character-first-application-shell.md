# Phase 1A.9.1 Character-First Application Shell Foundation

## Scope and boundary

This slice implements a presentation-only shell foundation for the Command Center. It does not change application business logic, workflow state, scheduler state, approval state, memory state, connector state, recruitment or governance logic, or any runtime authority.

The shell layer is intentionally limited to:

- visual layout
- presentation state
- app ownership in the UI
- focus/minimize/close behavior for the shell chrome
- character-first home rendering
- footer navigation and launcher affordance
- deterministic shell intents
- accessibility and reduced-motion support for the shell

No governed action is executed by closing a shell window. Closing a panel is a UI-only act.

## Shell state

The shell keeps a deterministic presentation state equivalent to:

- presenceMode
- launcherMode
- openAppIds
- minimizedAppIds
- focusedAppId
- technicalDetailsVisible
- reducedMotion

The initial home state is:

- HOME_MINIMAL

In HOME_MINIMAL, the shell renders only:

- fixed header
- character presence
- compact launcher affordance
- fixed footer application strip
- chat input
- send control
- microphone control

No application panel opens automatically on launch.

## Presentation modes

The shell uses explicit presentation modes to keep the character-first model stable:

- HOME_MINIMAL: character visible with no app cards unless selected by explicit user action.
- CARD_OVERVIEW: character remains central while one or more equal-sized floating cards surround it.
- DETAIL_FOCUSED: one app expands into a detail surface only after an explicit Open Details / Expand action.

Ordinary footer or launcher actions do not hide the character or open a full-page app view. They keep the shell in CARD_OVERVIEW and preserve the current character composition.

## Card overview contract

Normal application openings use the CARD_OVERVIEW mode:

- the selected ONYX or NOVA presence remains visible and central
- equal-sized floating cards sit around the character in deterministic positions
- the card header shows the app title, compact icon, minimize control, close control, and selection state
- the card body uses compact summary content rather than full app bodies
- the shell keeps header and footer visible at all times
- app cards appear as a balanced static composition instead of a single full-screen replacement

The card layout uses a fixed set of stable positions: LEFT_TOP, LEFT_MIDDLE, LEFT_BOTTOM, RIGHT_TOP, RIGHT_MIDDLE, RIGHT_BOTTOM. If more than six apps are open, the shell shows the first six and an overflow indicator instead of auto-expanding the scene.

## Detail-focused contract

An app enters DETAIL_FOCUSED only through an explicit action such as Open Details, Expand, or a matching intent. Automation and Workspace may support deeper detail mode; other apps remain in compact card presentation unless the user intentionally expands them.

Once in DETAIL_FOCUSED:

- the selected app occupies the detail surface
- a visible Back to Character View action or Close action appears
- Escape closes the detail surface and restores the previous card layout
- the character view is restored when the user exits details

This preserves the user’s prior card layout and does not reset identity or remount the character composition.

## Shell intents

The presentation contract uses a provider-neutral shell intent model:

- OPEN_APP
- CLOSE_APP
- MINIMIZE_APP
- FOCUS_APP
- CLOSE_ALL_APPS
- SHOW_APP_LAUNCHER
- HIDE_APP_LAUNCHER
- RETURN_HOME
- SET_PRESENCE_MODE

These intents are deterministic and are scoped to presentation behavior only. They do not call any runtime, scheduler, approval, connector, workflow or memory system.

## Presence modes

Supported shell presence modes remain:

- ONYX_ONLY
- NOVA_ONLY
- ONYX_AND_NOVA

The default character presentation follows the currently selected mode. The selection is presentation-only and does not merge ONYX and NOVA identity or persona state.

## Application registry

A centralized registry keeps the existing stable app IDs and presentation surfaces for:

- Home
- Messages
- Tasks
- News
- Workspace
- Automation
- Settings
- Health

Registry entries include:

- appId
- friendlyLabel
- accessibleLabel
- existing component or route reference
- launcher order
- icon reference when already available
- supportsMinimize
- supportsClose

This slice preserves the canonical identifiers and existing app functionality while mounting them inside the shell window container when explicitly opened.

## App window shell

Each app is rendered inside a reusable AppWindowShell container with:

- app title
- minimize control
- close control
- app body
- accessible labeling for the shell window and controls

The window remains within the viewport, does not obscure the fixed header or footer, and preserves the body’s internal scroll behavior.

## Footer behavior

The existing footer remains fixed and visible in all shell states. It keeps the app strip alongside chat input and microphone controls.

User interaction routes through the same shell intent dispatcher so footer click, launcher click, keyboard activation, chat command, and supported voice command all converge onto the same presentation contract.

## Chat and voice intent boundary

The shell supports bounded UI intent routing for a small set of known commands such as:

- Open Automation
- Show Tasks
- Open News
- Show Workspace
- Open Health
- Close Automation
- Hide Tasks
- Minimize News
- Return Home
- Close all panels
- Show only ONYX
- Show only NOVA
- Show ONYX and NOVA

This slice does not add unrestricted natural-language execution or undocumented voice actions. Voice commands are only supported where the existing pipeline provides a validated shell intent.

## Responsive modes and accessibility

This slice supports:

- wide desktop layout
- compact desktop or tablet layout
- narrow/micro layout
- reduced motion mode

All launcher items remain keyboard accessible, have visible focus states, and use semantic button labeling. Escape closes the foreground application only. Focus restoration follows the shell’s deterministic order to avoid trapping focus inside the wrong surface.

## Visual effects

This slice uses subtle shell-safe effects only:

- soft aura around the character
- soft glow around a focused launcher item
- subtle depth on app windows
- static light trails if they do not animate

No continuous motion, orbit animation, aura trails, parallax, or GPU-heavy effects are introduced here.

## Known limitations

This slice intentionally does not implement:

- full orbit animation
- animated circular launcher movement
- wake words
- Auto Listen
- scheduler execution
- workflow execution
- governance execution
- localStorage persistence
- new dependencies

## Deferred orbit work

The full animated orbit and advanced aura motion are intentionally deferred to a later slice. This document marks that work as future state and keeps this slice stable and bounded.

## Compliance summary

This shell implementation is intentionally presentation-only and does not rewrite application functionality or alter governed work. It preserves the frozen scheduler configuration and does not introduce execution handlers, scheduler controls, or automatic runtime actions.
