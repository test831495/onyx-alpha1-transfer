# Phase 1A.2E.3 Validation, Bounded Repair, and Evidence Orchestrator

Executes approved validation gates, classifies failures, permits at most three bounded repairs, reruns failed gates, and produces an evidence package. Repairs must remain inside the approved file boundary and command policy. Scope-hash mismatch, secrets, prohibited capabilities, boundary violations, and infrastructure failures stop automation immediately. Infrastructure failures enter NEEDS_REVIEW and never trigger code repair.

Successful state: EVIDENCE_READY. E.3 has no PR creation, merge, push, production deployment, secret, permission, or destructive authority. E.4 will consume the evidence package to prepare an approval-gated Draft PR.