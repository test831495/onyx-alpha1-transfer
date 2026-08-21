# Recovery And Rollback

Every capability writes an append-only, hash-chained before/after checkpoint. Recovery verifies repository, workflow version, scope hash, digest, and chain order before using the last completed checkpoint. A completed capability is never automatically repeated.

Rollback is policy-only in Phase 1A.5. It records compensating-action recommendations and evidence; it never deletes GitHub resources, force-pushes, merges, deploys, or changes permissions.
