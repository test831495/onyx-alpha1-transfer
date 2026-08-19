# Phase 1A.3 E.8A ONYX Automation Center UI Integration

## Goal
Replace the demonstration Automation Center with a React-owned, read-only control surface driven by an E.5-compatible DashboardSnapshot.

## Delivered tabs
Overview, Queue, Approvals, Validation, Evidence, Draft PRs, and History.

## Data boundary
The first UI adapter loads an E.5-shaped snapshot from local storage with a validated seed for Issue #5 and Draft PR #6. A typed `onyx:automation-snapshot` browser event can replace the snapshot without changing the UI contract. Persistent backend and governed write actions are deferred to E.8B.

## Governance
The UI exposes no merge or production control. Sensitive approval actions are informational in E.8A and explicitly defer to E.8B. The Draft PR link opens read-only context in a new tab. Existing E.1-E.7 policies remain authoritative.

## Visual acceptance required
Fresh load, NOVA-to-ONYX switching, single Automation entry, all seven tabs, responsive desktop/tablet layout, Draft PR link, and read-only governance state must be manually verified before release promotion.