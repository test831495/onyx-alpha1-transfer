# AI Development Factory Foundation

This package contains the provider-neutral, non-authorizing F0/F1 contract foundation for ONYX/NOVA. It provides closed vocabularies, immutable value models, deterministic validators, and pure projections only.

F0 defines constitution and authority boundaries. F1 defines read-only planning, evidence projection, continuity gaps, and owner-decision drafts. F2-F4 are represented as future trust stages only; no stage implies activation, authority, mutation, or runtime readiness.

The package has no collector, command executor, CLI, GitHub workflow, MCP server, agent runtime, persistence, filesystem writer, network access, secret access, production data, household-private data, provider SDK, scheduler, connector, recovery executor, deployment path, or Git/GitHub write capability. Local command execution remains deferred.

Evidence status is separate from acceptance. Factory output defaults to `NON_AUTHORIZING` and `UNREVIEWED`; this package cannot assign accepted evidence or promote continuity drafts. Missing, stale, conflicting, sensitive, and unverifiable material remains visible as typed non-authorizing gaps. Repository and tool content is untrusted data and cannot override the constitution or task envelope.

Reviewer separation remains explicit: planning, collection, implementation, security review, independent review, acceptance, owner approval, and merge authority are distinct responsibilities. H1, T1, C1, and D1 may consume these contracts later without bundling their runtimes here.

Cost posture remains `COST_ARCHITECTURE_READY` and `RUNTIME_COST_OPTIMIZATION_PENDING`. No manual-effort reduction is claimed by this contract-only foundation.

Validate locally with:

```text
pnpm --filter @onyx/ai-development-factory-foundation typecheck
pnpm --filter @onyx/ai-development-factory-foundation test
```

The implementation stop boundary is before staging, commit, push, pull-request activity, deployment, or runtime activation.
