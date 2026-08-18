# Phase 1A.2B Live Read-Only GitHub Integration

Uses the existing authenticated GitHub CLI session in Codespaces. The adapter invokes only `gh api --method GET` against allowlisted REST paths. All non-GET methods, GraphQL, secrets, merge endpoints, contents writes, deployments, releases, collaborators, and write-shaped endpoints are rejected before command execution.

No credential is printed or stored. Output is sanitized with the Automation Foundation redactor.
