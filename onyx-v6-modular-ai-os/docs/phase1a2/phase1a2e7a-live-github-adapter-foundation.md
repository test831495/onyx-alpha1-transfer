# Phase 1A.2E.7A Repository-Scoped Live GitHub Adapter Foundation

Defines repository-scoped read and write adapter contracts, repository identity checks, authenticated login checks, exact Rahul approval gates, isolated branch rules, Draft PR idempotency, redacted audit records, and a strict argv command allowlist. Validation uses mock adapters and DRY_RUN mode only. No concrete Octokit, fetch, child-process, gh, or git execution adapter is included.

E.7B may add a separately approved repository-scoped implementation for one dedicated issue, one isolated automation branch, one documentation-only change, and one Draft PR. Merge, main/integration writes, production deployment, secrets, permissions, branch protection, force operations, and destructive operations remain prohibited.