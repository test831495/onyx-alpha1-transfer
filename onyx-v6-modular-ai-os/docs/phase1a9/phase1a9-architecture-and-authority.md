# Phase 1A.9 Architecture and Authority

Wave 1 is a contract foundation. Phase 1A.5 owns the authoritative workflow state machine; Phase 1A.6 owns governed runtime authority; Phase 1A.7 owns the validated Automation Center integration boundary; Phase 1A.8 owns governed multi-agent, memory, context, persona, connector, approval, evidence, accessibility, and promotion contracts. Phase 1A.9 references those contracts and owns only operational scheduler references and bounded lane decisions.

Approval remains Rahul or a valid governed approval. Scheduler state is operational state, not M2 user memory or P0 persona memory. Events may reference governed M4 operational-ledger records only where a future wave explicitly permits it. Scheduler ownership grants no workflow, runtime, memory, persona, connector, approval, or promotion authority.

Evidence is a registry boundary in Wave 1, not live evidence emission. Promotion remains a protected single lane. Merge, deployment, force push, branch deletion, secrets, permission changes, live connector mutation, paid actions, live memory mutation, live model invocation, and P0 writes are prohibited.

Non-goals are SchedulerFacade behavior, dispatch, ready-set computation, dependency resolution, leases, heartbeats, locks, checkpoints, cancellation, joins, budgets, recovery, promotion execution, projections, UI, workers, timers, providers, simulations, and a final validator.