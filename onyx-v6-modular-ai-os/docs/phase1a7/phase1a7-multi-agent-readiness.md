# Phase 1A.7 — Multi-Agent Readiness

## What Phase 1A.7 keeps fixed

1. Execution lane limit stays `1` (`RUNTIME_EXECUTION_LANE_LIMIT`, reused
   verbatim from Phase 1A.6, itself reused verbatim from Phase 1A.5's
   `EXECUTION_LANE_LIMIT`).
2. No scheduler execution, no task leasing, no heartbeat processing, no
   checkpoint compare-and-swap, and no concurrent mutation are added.
3. `activeAgentId`, `assignedAgentIds`, `activeLaneId`, `laneCount`, and
   `promotionLaneActive` are additive, optional-where-appropriate identity
   fields (see
   [phase1a7-identity-and-persona-boundaries.md](./phase1a7-identity-and-persona-boundaries.md)).
   They never change runtime behavior; they only annotate the display.

## Parallel-safe vs. sequential-only

`PARALLEL_SAFE_OPERATIONS` (documentation-only classification):

- dashboard reads
- snapshot reads
- evidence reads
- read-only reconciliation checks
- documentation generation
- test generation
- security analysis

`SEQUENTIAL_ONLY_OPERATIONS` (documentation-only classification, always
routed through the single protected lane):

- runtime mutation
- checkpoint writes
- approval consumption
- capability invocation
- connector action
- reconciliation resolution
- GitHub mutation
- merge
- deployment
- secret or permission changes

## Phase 1A.8 — multi-agent contracts (future, not implemented here)

Phase 1A.8 is expected to freeze, at lane limit one:

- agent identity contract
- capability declaration
- task lease contract and lease expiry
- heartbeat
- abandoned-task recovery
- dependency graph
- concurrency locks
- checkpoint compare-and-swap
- parallel-safe evidence sequencing
- cross-agent cancellation
- join barriers
- result aggregation
- token and cost budgets
- agent permissions
- protected promotion lane

## Phase 1A.9 — bounded scheduler (future, not implemented here)

Phase 1A.9 is expected to introduce the bounded scheduler itself:

- 4 early lanes
- 6 lanes after shared contracts are frozen
- 8 lanes after alpha stability
- 2 stabilization lanes
- 1 protected promotion and mutation lane, always separate and singular

## Fixture coverage

`FUTURE_LANE_PROJECTION` sets `laneCount: 4` and `promotionLaneActive: true`
purely as forward-looking identity metadata, while `executionLaneLimit`
(from the reused `RuntimeSnapshot.laneLimit`) remains `1` in every fixture,
proving that no fixture assumes a single permanent agent owner and that lane
limit one is preserved regardless of future-lane metadata.
