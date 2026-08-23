# Phase 1A.8 Wave 3D: Saved Draft Lifecycle Contracts

Saved Draft contracts remain contract-only and deterministic-test-only. They never create persistent draft storage, never write to a database, and never execute workflow steps.

The lifecycle model preserves a single drafting lineage per workflow objective. A draft is not approval, not execution authority, and not a workflow checkpoint. A resumed draft that remains same-scope updates the existing lifecycle state without creating a second unrelated draft ID. A material scope change creates a new draft version in the same draft lineage, invalidates the previous approval, and preserves version history.

Version history is append-only. Each draft version holds a stable parent reference for versions after 1. Version numbers are monotonic and immutably recorded. Supersession preserves prior versions and does not delete historical audit records. A deleted draft cannot be resumed, and a superseded version cannot become the current version.

Scope comparison is deterministic and compares objective, files, actions, tools, branch, target environment, external systems, connector provider/account, permission scope, memory-access scope, model-routing class, token/cost budgets, dependency set, risk class, promotion eligibility, and policy-pinned agent identity. A risk-class increase, branch change, target-environment change, connector-account change, memory or permission scope change, or promotion eligibility change are material and require invalidation of prior approvals. Minor edits remain governed and may update only the current version when policy permits.

Deletion and export boundaries remain explicit. Draft deletion requires permission, scope validation, a valid audit reference, evidence, non-production status, and no active governed execution dependency. Draft export requires permission, redaction, provenance, and version history inclusion. No export exposes secrets, connector credentials, private P0 content, chain-of-thought, or unauthorized private user content.
