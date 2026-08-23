# Phase 1A.9 Wave 4A: Governed Memory, Council Mode, Saved Draft, and Connector Scheduler Bindings

This document records deterministic scheduler-only binding projections for memory, Council, draft, and connector governance. No live memory, live Council discussion, live draft persistence, or live connector calls occur.

## Authority boundaries

- Memory is not approval and not execution authority.
- Council recommendation is not approval.
- Saved Draft state is not approval.
- Connector content does not grant workflow approval.
- Scheduler state remains disabled and bounded to S0_SINGLE.
- The active runtime lane limit remains 1 and promotion lane limit remains 1.

## Memory binding

The scheduler may only capture stable memory references, context references, and operational-ledger references. Memory access is validated by a stable ID and access profile. P0 remains immutable, has no scheduler writer path, and never becomes a scheduler-owned authority. M2 canonical-source authority is preserved; M4 operational state stays in operational ledger scope and does not silently become durable memory. Poisoning and quarantine are rejected, tombstones block resurrection, and restart or checkpoint revalidation prevents deleted memory from being reused.

## Council binding

Council schedule projections preserve distinct ONYX and NOVA identity and separate persona context records. Shared task facts remain governed context and are not a third persona. Agreement and disagreement remain visible; any authority-changing disagreement triggers Rahul escalation. Council self-approval is prohibited, and authorization expands only through governed approval lineage, not by council aggregation.

## Saved Draft binding

Draft scheduling remains projection-only. Same-scope resume preserves the draft ID, lineage, and current version. Material changes require a new version, fresh approval, and updated dependency, permission, memory-scope, connector-scope, and budget validation. Deleted or superseded drafts are rejected and cannot resume or schedule.

## Connector binding

Connector binding validates provider identity, account identity, account category, scope, permission mode, source attribution, and read-only compatibility. Professional Outlook and personal Outlook remain separate. Gmail, Yahoo, OneDrive, SharePoint, and Google Drive each retain account isolation. Mutation requests require serialization and account exclusivity. Unknown or uncertain remote side effects require reconciliation; credential material is excluded from evidence, logs, and contract fields.

## Non-goals

- No live memory reads or writes.
- No P0 mutation or index rebuild.
- No live Council action or persona mutation.
- No draft persistence or version creation.
- No connector API call or provider truth query.
- No credential access, no live email/calendar/document access, and no task execution.
