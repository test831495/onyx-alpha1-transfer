# Phase 1A.11 Acceptance Registry

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: architecture reviewers, reviewers, security stakeholders

## Purpose

This document defines the acceptance registry for the Phase 1A.11 Wave A contract freeze. The registry is a readable summary of the requirements represented in the validated package and tests. It does not claim runtime implementation.

## What this means for the user

The user gets a stable, traceable set of requirements for household identity, privacy, Council boundaries, history access, Technical Information, accessibility, and documentation quality. There is no production runtime guarantee implied by this registry.

## Current state

Wave A registry state is contract-defined, fixture-defined, and focused-tested. Some items are explicitly deferred. None are marked as integration-tested or production-ready without evidence.

## Acceptance definition table

| ID | Friendly title | Requirement | Contract | Positive test | Negative test | Evidence requirement | Wave A status | Future wave | Rollback relevance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GOV-001 | Single primary owner | Exactly one Primary Owner exists | Primary owner contract | owner identity fixture checks exact canonical owner | duplicate owner attempt denied | contract evidence, fixture evidence | focused-tested | future runtime configuration | high |
| GOV-002 | Owner authority boundary | Owner authority is singular and not self-elevated | household identity model | canonical owner preserved | second owner attempt rejected | contract evidence | focused-tested | runtime auth service | high |
| GOV-003 | Household account separation | Accounts are isolated and not merged | identity and privacy contracts | account separation is preserved | cross-account leakage rejected | contract evidence | focused-tested | runtime identity service | high |
| GOV-004 | Household governance | Governance remains explicit and deny-by-default | permission model | deny-by-default positive flow | stale or missing policy denied | contract evidence | focused-tested | runtime policy enforcement | high |
| SESSION-001 | Session creation contract | Sessions are explicit and time-bound | session contracts | valid session assumptions | invalid session request denied | contract evidence | contract-defined | future runtime auth | medium |
| SESSION-002 | Rotation and recertification | Sessions rotate under policy | session contracts | valid rotation path defined | stale rotation denied | contract evidence | contract-defined | future runtime auth | medium |
| SESSION-003 | Revocation and logout | Revocation immediate and explicit | session contracts | revocation semantics defined | reused session denied | contract evidence | contract-defined | future runtime auth | high |
| SESSION-004 | Expiry and inactivity | Session expiry and inactivity limits are required | session contracts | expiry contract defined | expired session denied | contract evidence | contract-defined | future runtime auth | medium |
| SESSION-005 | Step-up authentication | Sensitive actions require fresh assurance | session contracts | step-up path defined | stale assurance denied | contract evidence | focused-tested | runtime auth service | high |
| SESSION-006 | Account-switch cleanup | Private state is cleared before switching back | session contracts | cleanup requirement validated | prior account leakage denied | fixture-defined | focused-tested | runtime state lifecycle | high |
| PRIV-001 | Memory isolation | Memory is isolated by account and tier | privacy contracts | protected memory boundary defined | cross-account leakage denied | contract evidence | contract-defined | runtime memory service | high |
| PRIV-002 | History isolation | Detailed history is protected | history and privacy contracts | owner-only rule preserved | unauthorized history access denied | fixture-defined | focused-tested | retrieval implementation | high |
| PRIV-003 | Conversation isolation | Conversations remain account-bound | privacy contracts | no cross-account sharing | crossing conversation boundary denied | contract evidence | contract-defined | runtime conversation store | high |
| PRIV-004 | Connector metadata boundary | Connector metadata remains filtered | resource ownership contract | metadata filtering defined | raw connector access denied | contract evidence | contract-defined | connector runtime | high |
| PRIV-005 | Evidence and audit isolation | Evidence remains protected and governed | evidence contract | evidence provenance defined | fabricated evidence rejected | contract evidence | focused-tested | runtime evidence store | high |
| CHAR-001 | ONYX canonical identity | ONYX is a canonical presentation identity | character switching contracts | ONYX baseline preserved | merged identity denied | contract evidence | focused-tested | future presentation service | medium |
| CHAR-002 | NOVA canonical identity | NOVA is a canonical presentation identity | character switching contracts | NOVA baseline preserved | merged identity denied | contract evidence | focused-tested | future presentation service | medium |
| CHAR-003 | Character switching retains authority | Switching presentation does not change authorization | character contracts | switching without privilege change | authorization drift denied | fixture-defined | focused-tested | runtime UI | high |
| CHAR-004 | Alias and profile boundary | Alias use remains profile-bound and safe | character and session contracts | alias behavior defined | profile cross-over denied | contract evidence | contract-defined | future Character Studio | medium |
| COUNCIL-001 | Council participant identity | Participants remain distinct and attributable | Council contracts | contribution attribution defined | anonymized or merged input denied | contract evidence | contract-defined | runtime council service | high |
| COUNCIL-002 | Council advisory scope | Council advice cannot become authorization | Council contracts | advisory value preserved | direct authorization denied | contract evidence | contract-defined | runtime council service | high |
| COUNCIL-003 | Contribution envelopes | Contributions are purpose-bound and expiring | Council contracts | envelope structure defined | invalid contribution blocked | contract evidence | contract-defined | runtime council service | high |
| COUNCIL-004 | Disagreement preservation | Disagreement is preserved and visible | Council contracts | disagreement can be retained | silent dismissal denied | contract evidence | contract-defined | runtime council service | medium |
| COUNCIL-005 | Rahul approval remains required | Sensitive decisions require explicit owner authority | Council and ownership contracts | owner approval rule defined | Council bypass denied | contract evidence | contract-defined | runtime council service | high |
| HIST-001 | History purpose and scope | History has explicit purpose and scope | Project Journey contract | historical context can be defined | scope drift denied | contract evidence | focused-tested | retrieval runtime | high |
| HIST-002 | Owner-only access | Detailed history is restricted to Rahul | Project Journey contract | owner-only access preserved | non-owner detail rejected | fixture-defined | focused-tested | retrieval runtime | high |
| HIST-003 | Basic history for others | Other profiles see curated, basic information only | Project Journey contract | curated summary model defined | raw detail leak denied | contract evidence | contract-defined | retrieval runtime | high |
| HIST-004 | Approved source classes | History uses approved source classes only | Project Journey contract | source class validation defined | unapproved source denied | contract evidence | contract-defined | retrieval runtime | medium |
| HIST-005 | Provenance | History retains provenance and source attribution | evidence contract | provenance chain defined | missing provenance rejected | contract evidence | contract-defined | runtime retrieval | high |
| HIST-006 | Correction records | Corrections remain attributable and explicit | memory lifecycle | correction record defined | silent overwrite denied | contract evidence | contract-defined | memory runtime | high |
| HIST-007 | Supersession | Superseded history is preserved distinctly | memory lifecycle | supersession semantics defined | silent replacement denied | contract evidence | contract-defined | memory runtime | high |
| HIST-008 | Tombstones | Deleted history remains marked and inactive | memory lifecycle | tombstone requirement defined | reactivated record denied | contract evidence | contract-defined | memory runtime | high |
| HIST-009 | Retention and policy | Retention remains governed | memory lifecycle | retention model defined | ungoverned retention denied | contract evidence | contract-defined | retention runtime | medium |
| HIST-010 | Historical time semantics | Original time remains distinct from processing time | HIST-016 contract | time semantics preserved | conflated timestamp denied | contract evidence | focused-tested | retrieval runtime | medium |
| HIST-011 | Original rationale | Original rationale remains distinct | HIST-016 contract | rationale distinction defined | later interpretation not substituted | contract evidence | focused-tested | retrieval runtime | medium |
| HIST-012 | Typed missing values | Missing data must use explicit typed states | HIST-016 contract | not recorded and not verified handled | invented value rejected | fixture-defined | focused-tested | retrieval runtime | high |
| HIST-013 | Evidence over speculation | History may not invent evidence | HIST-016 contract | evidence requirement enforced | invented evidence denied | fixture-defined | focused-tested | retrieval runtime | high |
| HIST-014 | Search and authorization ordering | Authorization precedes search or retrieval | Project Journey contract | retrieval ordering defined | unauthorized search denied | contract evidence | contract-defined | retrieval runtime | high |
| HIST-015 | Derived summary boundaries | Summaries do not replace authoritative sources | memory lifecycle | summary references retained | silent authority swap denied | contract evidence | contract-defined | retrieval runtime | high |
| HIST-016 | HIST-016 structured milestone model | Historical milestones require actor, what, when, why, result and evidence | HIST-016 contract | typed missing values and evidence checks pass | invalid milestone rejected | fixture-defined | focused-tested | retrieval runtime | high |
| BG-001 | Fresh authentication requirement | Owner oversight requires fresh auth | oversight contracts | valid flow defined | stale auth denied | contract evidence | contract-defined | runtime oversight service | high |
| BG-002 | Reason and purpose | Protected access must declare reason and purpose | oversight contracts | reason and purpose required | missing reason denied | contract evidence | contract-defined | runtime oversight service | high |
| BG-003 | Exact scope limitation | Access is exact, narrow, and short-lived | oversight contracts | exact scope defined | broad access denied | contract evidence | contract-defined | runtime oversight service | high |
| BG-004 | Read-only default | Oversight access defaults to read-only | oversight contracts | read-only requirement defined | write grant denied | contract evidence | contract-defined | runtime oversight service | high |
| BG-005 | Audit dependency | Protected access requires auditable evidence | oversight contracts | audit available condition defined | hidden grant denied | contract evidence | contract-defined | runtime oversight service | high |
| BG-006 | Automatic revocation | Grants expire and revoke | oversight contracts | expiry semantics defined | stale grant denied | contract evidence | contract-defined | runtime oversight service | high |
| UX-001 | Friendly labels | Default labels are plain-language and friendly | UX guidance | human-readable labels defined | raw identifiers visible in default view | contract evidence | contract-defined | UI implementation | medium |
| UX-002 | Technical identifier hiding | Raw IDs remain hidden by default | UX guidance | default hiding defined | raw IDs in default screen denied | contract evidence | contract-defined | UI implementation | high |
| UX-003 | Status explanations | User-facing statuses explain what happened and next steps | UX guidance | status language defined | unclear failure allowed | contract evidence | contract-defined | UI implementation | medium |
| UX-004 | Structured and accessible layout | Documents and screens remain clear and accessible | UX/accessibility guidance | structure and readability defined | malformed content blocked | contract evidence | contract-defined | UI and docs implementation | medium |
| UX-005 | Information density | Details remain scannable and not overwhelming | UX guidance | progressive disclosure defined | overloaded layout denied | contract evidence | contract-defined | UI implementation | low |
| UX-006 | Color and text cues | Color is not the only meaning signal | accessibility guidance | icon and text semantics | color-only meaning rejected | contract evidence | contract-defined | UI implementation | low |
| UX-007 | Feedback and response time | User actions receive readable feedback | UX guidance | status and response behavior defined | silent failure denied | contract evidence | contract-defined | UI implementation | medium |
| UX-008 | Help and recovery guidance | Recovery guidance is included | UX guidance | next-step guidance defined | stranded user allowed | contract evidence | contract-defined | UI implementation | medium |
| TECH-001 | Explicit disclosure model | Technical Information is explicitly enabled | Technical Information contract | policy-gated disclosure defined | implicit disclosure denied | contract evidence | contract-defined | UI implementation | high |
| TECH-002 | Role-aware detail | Technical detail is role-aware | Technical Information contract | role-sensitive display defined | cross-role view denied | contract evidence | contract-defined | UI implementation | high |
| TECH-003 | Presentation-only effect | Technical Information does not change authorization | Technical Information contract | authorization preserved | privilege gain denied | contract evidence | focused-tested | UI implementation | high |
| TECH-004 | Secret prohibition | Secret values never display in plain text | Technical Information contract | secret display rejected | secret leak denied | fixture-defined | focused-tested | UI implementation | high |
| TECH-005 | Internal identifiers remain authoritative | Internal identifiers stay canonical in code and evidence | Technical Information contract | canonical names preserved | friendly label confusion denied | contract evidence | contract-defined | UI implementation | medium |
| TECH-006 | Imported data is never executable | Imported content is treated as data | privacy and technical-info policy | imported content is not instruction | code execution risk denied | contract evidence | contract-defined | runtime ingestion | high |
| TECH-007 | Provenance on detailed answer | Detailed answers include source provenance | Project Journey and evidence | provenance requirement defined | hidden source denied | contract evidence | contract-defined | retrieval runtime | medium |
| TECH-008 | Deleted history remains hidden | Deleted or superseded records are not resurrected | memory lifecycle and history | tombstone and supersession rule | replayed deleted content denied | contract evidence | contract-defined | retrieval runtime | high |
| A11Y-001 | Semantic structure | Semantic structure and labels remain available | accessibility requirements | semantic structure defined | malformed semantics denied | contract evidence | contract-defined | runtime UI validation | medium |
| A11Y-002 | Keyboard navigation | Keyboard actions remain supported | accessibility requirements | keyboard-safe flow defined | trap or failure denied | contract evidence | contract-defined | UI QA | medium |
| A11Y-003 | Contrast requirement | Contrast remains safe | accessibility requirements | ratio requirement defined | poor contrast denied | contract evidence | contract-defined | UI QA | medium |
| A11Y-004 | Text scaling | Text remains readable at higher scale | accessibility requirements | scaling requirement defined | clipping or unreadability denied | contract evidence | contract-defined | UI QA | medium |
| A11Y-005 | Error communication | Errors remain actionable and associated | accessibility requirements | accessible error handling defined | silent error denied | contract evidence | contract-defined | UI QA | medium |
| A11Y-006 | Technical Information accessibility | Technical Information surfaces remain keyboard accessible | accessibility requirements | technical panes are accessible by keyboard | inaccessible disclosure denied | contract evidence | contract-defined | UI QA | medium |
| A11Y-007 | Future i18n support | Localization remains feasible | accessibility and design guidance | i18n scaffolding planned | hard-coded assumptions denied | contract evidence | proposed | future product work | low |
| A11Y-008 | Accessibility audit trail | Accessibility verification is recorded and tracked | accessibility requirements | audit trail concept exists | undocumented accessibility denied | contract evidence | contract-defined | UI QA | medium |
| DOC-001 | Documentation structure | Documents use a standard structure | documentation standard | document patterns are defined | orphaned or malformed docs denied | contract evidence | contract-defined | future docs enhancement | low |
| DOC-002 | Plain language | Documents avoid dense or unclear language | documentation standard | readable language defined | jargon without definition denied | contract evidence | contract-defined | future docs enhancement | low |
| DOC-003 | Code examples | Examples remain safe and explicit | documentation standard | examples are marked as pseudo-code or test-based | unsafe examples denied | contract evidence | contract-defined | future docs enhancement | low |
| DOC-004 | Cross-reference quality | Links and references remain traceable | documentation standard | link and reference structure defined | broken references denied | contract evidence | contract-defined | future docs enhancement | low |
| DOC-005 | Version and provenance | Documents record ownership and state | documentation standard | version metadata required | undocumented status denied | contract evidence | contract-defined | future docs enhancement | low |
| DOC-006 | Security guidance | Sensitive details are not exposed in docs | documentation standard | redaction guidance defined | secret leakage denied | contract evidence | contract-defined | future docs enhancement | high |
| DOC-007 | Accessibility in docs | Documents remain accessible and structured | documentation standard | accessible structure defined | malformed docs denied | contract evidence | contract-defined | future docs enhancement | low |
| DOC-008 | Traceability | Requirements remain traceable to acceptance IDs | documentation standard | requirement mapping defined | orphaned requirements denied | contract evidence | contract-defined | future docs enhancement | medium |

## Acceptance totals

- GOV: 4
- SESSION: 6
- PRIV: 5
- CHAR: 4
- COUNCIL: 5
- HIST: 16
- BG: 6
- UX: 8
- TECH: 8
- A11Y: 8
- DOC: 8
- Total: 78

## Implementation notes

This registry is a read-only documentation artifact. It reflects the verified package and tests, not production runtime claims. Any future implementation must keep the same acceptance semantics and must not widen authority or skip evidence requirements.

## Failure behavior

If a requirement cannot be evidenced, it is marked as contract-defined or deferred rather than accepted. A runtime claim without evidence is not allowed.

## Recovery and rollback

Rollback and recovery remain evidence-bound. The acceptance model is never used to hide evidence-gaps or to claim a runtime system that has not been verified.

## Next safe step

The next safe step is review and future implementation planning only after the acceptance registry remains unchanged and all future work preserves the same deny-by-default and evidence rules.
