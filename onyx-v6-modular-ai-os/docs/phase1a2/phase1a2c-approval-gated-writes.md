# Phase 1A.2C Approval-Gated GitHub Writes

Enabled mutations: issue create, isolated branch create, Draft PR create, PR comment. Every write requires execute=true, valid unexpired scope-bound approval, allowed operation, and idempotency key. Dry preview remains the default. Merge, protected direct writes, deletion, secrets, permissions, releases, deployments, and repository settings remain prohibited.
