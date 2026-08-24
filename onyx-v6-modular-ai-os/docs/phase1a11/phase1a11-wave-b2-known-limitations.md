# Phase 1A.11 Wave B2 Known Limitations

**Version:** 0.1.0
**Date:** 2026-08-23
**Owner:** Rahul
**Status:** Local foundation; review required
**Audience:** Rahul and reviewers

## Limitations

This runtime is a deterministic local projection. It does not authenticate users, generate production secrets, issue cookies or bearer tokens, persist sessions, use a database or Redis, call connectors, retrieve Project Journey history, run Council or break-glass flows, render UI, or deploy.

Concurrent-session handling is policy projection only and has no persistent registry. Account and device scope, typed references, status, ordering, and replacement eligibility are supplied local inputs and are not a session registry. Device classification is supplied input and is not fingerprinting. Rotation uses deterministic fixture identifiers and cannot be treated as production secret generation. Friendly fields omit raw session identifiers, while technical result codes remain available to permitted callers.

Chronology validation and revocation scope validation fail closed before lifecycle mutation. Permission binding remains referential to current Wave B1 versions and membership identity; it is not a permission snapshot or authorization source. Character Agent Gateway support is limited to account-bound prerequisites and cleanup projection fields. No gateway runtime, approval authority, or execution authority exists here.

Exact expiry boundaries are deterministic and deny at the deadline. Session creation requires a verified input fact but never verifies credentials. No NIST or OWASP certification is claimed.

## Recovery and rollback

Verify identity and reauthenticate through a later runtime. Rollback removes only the B2 package, its four documents, and lockfile importer; Wave A, Wave B1, and the B1 checkpoint remain.
