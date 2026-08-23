# Phase 1A.9 Wave 3B: Budget and Model Routing

Wave 3B adds deterministic, provider-neutral scheduler projections for time, tokens, model class, API calls, money, attempts, evidence storage, and lane capacity. `BudgetGovernor` validates supplied numeric measures and returns warnings, hard stops, reconciliation requirements, and projection-only reservation, consumption, and release results.

The routing boundary reuses Phase 1A.8 model classes, routing profiles, privacy and residency requirements, permission, memory, connector, approval, and evidence references. Local-first and cache-first behavior are requirements or projections only. No cache, model, connector, API, spending, persistence, retry, checkpoint, or recovery operation occurs.

All budget values retain explicit identifiers and units. Negative, non-finite, fractional integral counts, invalid thresholds, and hard-limit overages are rejected. Hard stops are never downgraded. Fallback selection is deterministic and cannot bypass privacy, permissions, approval, or any hard budget.
