# Train B Capability Foundation

This package defines a provider-neutral capability foundation for Train B. It intentionally does not select adapters, connectors, providers, credentials, or runtime execution paths. Instead it provides immutable registry, graph, query-planning, and conflict contracts that remain deterministic and fail closed.

## Scope

- Capability Registry
- Capability Graph
- Unified Query Contracts
- Conflict Contracts

## Non-goals

- no provider adapters
- no OAuth/OIDC
- no connector registry
- no runtime execution
- no persistence or network calls
- no LLM usage
- no authorizing decision engine
