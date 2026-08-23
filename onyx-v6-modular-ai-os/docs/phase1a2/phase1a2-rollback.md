# Phase 1A.2 Rollback Guide

## Sprint 1 scope

Sprint 1 adds only:

- packages/automation-foundation
- docs/phase1a2

Sprint 1 does not include live GitHub API writes, pull request merges, production deployments, permission changes, or secret operations.

## Rollback before commit

If Sprint 1 must be removed before it is committed, remove only the Sprint 1 directories:

    rm -rf packages/automation-foundation
    rm -rf docs/phase1a2

Do not run git clean -fd or git reset --hard. The parent repository contains recovery checkpoints and backup directories that must not be deleted.

## Rollback after commit

After Sprint 1 is committed, use Git revert rather than rewriting history.

First identify the actual Sprint 1 commit:

    git log --oneline -5

Then revert using the real commit SHA:

    git revert ACTUAL_COMMIT_SHA

Do not type angle-bracket placeholders literally.

## Post-rollback validation

Run the Configuration Runtime, Voice Runtime, Identity Runtime, Workspace Connector, Calendar Intelligence, Provider Health, Command Center typecheck, and Command Center build validations.

## Production impact

Sprint 1 has no production deployment capability.

Sprint 1 must not merge pull requests, push directly to protected branches, deploy Netlify production, access secrets, modify permissions, delete branches, or create releases.

## Recovery evidence

Retain the Git commit SHA, test output, build output, changed-file manifest, rollback result, known issues, and Rahul approval record.
