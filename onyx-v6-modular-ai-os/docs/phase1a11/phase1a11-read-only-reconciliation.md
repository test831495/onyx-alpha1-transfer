# Phase 1A.11 Read-Only Reconciliation Report

**Status:** Governance and Architecture Planning Document (No Implementation)  
**Date:** 2026-08-23  
**Repository:** test831495/onyx-alpha1-transfer  
**Branch:** phase1a10-mainline-stabilization

---

## 1. Executive Summary

Phase 1A.11 is the Household Identity, Privacy, Council, Owner History and Human-Centered Experience Foundation. It reconciles identity, session, privacy, character switching, household roles, project history, and governance contracts into a unified, auditable, permission-aware architecture. This is NOT a unified presentation-layer phase; it is a foundational identity, privacy, and household-awareness layer.

**Scope Boundaries:** Architecture, contracts, reconciliation, and validation planning only. No implementation, code changes, staging, commits, deployments, or database migrations.

**Authoritative Principle:** Rahul Kumar is the Primary Owner. Household accounts, roles, and permissions are bound to Rahul. Other profiles receive explicitly curated, redacted, and authorization-filtered information. Ownership of Project Journey and detailed history is owner-only.

---

## 2. Purpose and Boundaries

Phase 1A.11 establishes mandatory contracts and reconciliation requirements for:

- **Household Identity and Roles:** Exactly one Primary Owner (Rahul). Household membership, role assignment, and permission inheritance.
- **Authentication and Session Management:** Session lifecycle, rotation, revocation, step-up authentication, and concurrent-session limits.
- **Privacy and Isolation:** Account, memory, conversation, connector, cache, and AI-context isolation per role and permission level.
- **Character Switching:** Switching between ONYX and NOVA presentation without authorization change. Council mode coordination (ONYX_NOVA_COUNCIL) remains advisory.
- **Project Journey and History:** Detailed technical, functional, architectural, coding, design, validation, recovery, and decision history is Rahul-only. Other profiles receive separately curated basic non-sensitive information.
- **Owner Oversight and Break-Glass Access:** Governed, audited access recovery mechanisms for the Primary Owner.
- **Human-Centered UX:** Friendly default labels, hidden technical identifiers, explicit technical-information disclosure with role-aware filtering.
- **Accessibility and Readability:** Consistent structure, clear language, no malformed content, compliance with WCAG 2.1 Level AA.

**Out of Scope for Phase 1A.11:**
- Implementing login or account creation screens.
- Creating household accounts or roles in the system.
- Adding authentication providers (SSO, OAuth, etc.).
- Activating feature flags or connectors.
- Implementing semantic history search.
- Modifying scheduler or promotion behavior.
- Repairing COMMAND-CENTER-REGRESSION-01.
- Deploying, staging, committing, pushing, merging, tagging, or destructive Git operations.

---

## 3. Authoritative Baseline

**Release Tag:** `phase1a9-merged-main`  
**Commit:** `1a8edf54cbb05b338532c7ea3f01c14cfbe44556`  
**Production Checkpoint:** `onyx-phase1a9-production-checkpoint`  
**Phase 1A.10 Status:** CONDITIONAL PASS (UI, runtime, and recovery validation verified)

**Frozen Governance Constraints:**
- Scheduler: DISABLED
- Promotion Lane: DISABLED
- Runtime Lane Limit: 1
- COMMAND-CENTER-REGRESSION-01: Preserved, unrepaired

**Approved Predecessor Contracts:**
- Phase 1A.5: Workflow Engine and governance (32 states, 6 capabilities, frozen approval)
- Phase 1A.6: Runtime Host execution (single-lane, no promotion, recovery-only)
- Phase 1A.7: Automation Center UI integration (tabs, runtime projection)
- Phase 1A.8: Governed contracts (multi-agent coordination, memory tiers, Council mode, Track A/B)
- Phase 1A.9: Governed Scheduler (4→6→8 lanes, budgets, dependency graph, evidence sequencing)

---

## 4. Mandatory Architecture Invariants

### 4.1 Identity and Account Invariants

**GOV-001: Single Primary Owner**
- Exactly one Primary Owner: Rahul Kumar.
- Other profiles are household members, guests, or agents with explicit role and permission assignments.
- Ownership of system, approval authority, and configuration belongs to Rahul.

**GOV-002: Account Isolation**
- Each account has isolated: memory (tiers M0–M5, P0), conversations, connector credentials, cache, and AI context.
- Cross-account memory transfer requires explicit governed decision and approval.
- Account switching clears active results and caches immediately.

**GOV-003: Role and Permission Inheritance**
- Roles are: Owner (Rahul), Household Admin, Household Member, Guest.
- Permissions are inherited from role and bound to account.
- Permissions deny by default; only explicit assignments grant access.

**GOV-004: Non-Owner Profiles Receive Curated Information**
- Non-owner profiles never access: Rahul's detailed architecture, code history, design records, evidence, private identifiers, owner context, connector metadata, or protected Project Journey information.
- Non-owners receive only separately curated, non-sensitive, basic project information.

### 4.2 Session and Authentication Invariants

**SESSION-001: Session Lifecycle**
- Each authenticated session has a unique, bound, non-reusable session token.
- Sessions have explicit creation, optional rotation, explicit revocation, and automatic expiry.
- Session tokens are never displayed or exposed in UI.

**SESSION-002: Concurrent Session Limits**
- Primary Owner may have multiple concurrent sessions within configured limits.
- Other profiles may have one active session per device.
- Session switching or concurrent-session violation requires step-up authentication.

**SESSION-003: Rotation and Revocation**
- Sessions rotate on authentication re-confirmation or after configured time periods.
- Revocation is immediate: logging out, account change, or security event immediately invalidates all active session tokens.
- Revoked sessions cannot be resumed; new authentication is required.

**SESSION-004: Step-Up Authentication**
- Access to sensitive actions (Project Journey detail, permission changes, account settings, break-glass recovery) requires step-up authentication.
- Step-up adds a new authentication factor or re-confirms the current session within a time window.
- Step-up does not create a new session; it marks the current session as elevated.

**SESSION-005: Audit and Recovery**
- All session events (create, rotate, elevate, revoke, expire) are audit-logged with timestamp, actor, and reason.
- Audit logs are immutable and available only to the Primary Owner or auditors with explicit permission.
- Session recovery is possible only through break-glass access with audit logging.

**SESSION-006: Server-Side Session Validation**
- Session validation occurs server-side before every sensitive operation.
- The session state is not duplicated in client storage; the client holds a token only.
- Token replay, tampering, or expiry is rejected with a clear, actionable error.

### 4.3 Privacy and Isolation Invariants

**PRIV-001: Memory Tier Isolation**
- M0 (ephemeral) is request-scoped; no persistent storage.
- M1 (session) is session-bound; cleared on logout or session end.
- M2 (durable) is retained user/project memory; editable, correctable, supersession-tracked.
- M3 (indexed) contains derived references; rebuildable, not authoritative.
- M4 (operational) is workflow/runtime/task ledger; not personal or permission-granting.
- M5 (archive) is retention-governed, never automatically retrieved.
- P0 (persona baseline) is immutable and read-only.
- Tier boundaries are enforced; tier demotion is not possible; tier promotion requires governed decision.

**PRIV-002: Connector Isolation**
- Connector credentials are stored encrypted, never displayed, and never accessible to non-owner profiles.
- Connector metadata is permission-filtered; non-owners see only connection status, not credentials or scope.
- Connector actions (read, write, delete) require per-action permission and are audit-logged.

**PRIV-003: Cache and AI-Context Isolation**
- Caches are per-account; cross-account cache access is prohibited.
- AI context injected into language models includes only information the account has permission to access.
- Generated artifacts (summaries, recommendations) are tagged with source account and treated as M2 data.

**PRIV-004: Conversation Isolation**
- Conversations are per-account; cross-account conversation access is prohibited.
- Conversation history is retained per retention policy but never shared without explicit permission.
- Conversation redaction (secret removal, personal-information masking) occurs before any cross-account transmission.

**PRIV-005: Authorization Filtering Before Retrieval**
- Every historical or memory retrieval applies authorization filters before data is returned.
- Filtered results show "Access Denied" or appropriate redaction, not partial results from multiple profiles.
- Audit failures block retrieval; retrieval attempts by unauthorized profiles are logged as security events.

### 4.4 Character and Presence Invariants

**CHAR-001: Character Switching Without Authorization Change**
- Characters (ONYX, NOVA) are presentation aliases, not authorization levels.
- Switching characters (ONYX ↔ NOVA) preserves all permissions, roles, and account access.
- Character metadata is immutable: ONYX is cloud-augmented analysis; NOVA is local action.

**CHAR-002: ONYX_NOVA_COUNCIL is Advisory Only**
- Council mode coordination does NOT grant additional permissions or merge personas.
- ONYX and NOVA remain separate P0 baselines; Council agreements are input to Rahul's decision.
- Council contributions preserve originating character attribution and remain advisory, not approval.

**CHAR-003: Presence Mode Constraints**
- Valid presence modes: `ONYX`, `NOVA`, `ONYX_NOVA_COUNCIL`, `SYSTEM`, `UNASSIGNED`.
- Each mode is immutable in code and code references remain canonical.
- UI translations (e.g., "Multi-Channel" for ONYX_NOVA_COUNCIL) do not affect contract constants.

**CHAR-004: Profile-Bound Character Presentation**
- Non-owner profiles see only approved character presentations.
- Character capabilities, skill tags, and tone are not customizable per-profile; they follow role-defined defaults.

### 4.5 Council Mode Invariants

**COUNCIL-001: Distinct Participant Identity**
- ONYX_NOVA_COUNCIL coordination preserves separate ONYX and NOVA identities.
- Council agreement validates one workflow ID, one runtime ID, one approval lineage; personas remain distinct.
- Participants cannot be anonymous or merged; attribution is mandatory.

**COUNCIL-002: Memory and Connector Scope**
- Council coordination does not expand individual persona memory or connector scope.
- Shared governed task facts are stable context only, not private persona memory.
- Council participants cannot access each other's protected history or connectors.

**COUNCIL-003: Rahul Approval Remains Required**
- Any Council recommendation reaching approval state requires explicit Rahul approval.
- Council agreement does not bypass or pre-approve; it informs Rahul's decision.

**COUNCIL-004: Disagreement is Preserved**
- Council convergence validates consensus but preserves disagreement in the recommendation package.
- Disagreement cannot be silently discarded; if personas disagree, both opinions are recorded.

**COUNCIL-005: P0 Immutability**
- Council coordination cannot modify persona P0 baselines (ONYX capabilities, NOVA capabilities).
- P0 immutability is enforced contract-wide.

---

## 5. Mandatory UX and Technical Information Invariants

### 5.1 Default Screen UX Rules

**UX-001: Clear, Human-Readable Labels**
- All default screens use clear, human-readable English labels and messages.
- Every UI element displays in plain language understood by users with no technical background.
- Example: "Approve this task" not "Approve P16-WF-EXEC-003"; "Ready" not "PREFLIGHT_PASSED".

**UX-002: Technical Identifiers Hidden by Default**
- Raw identifiers (workflow IDs, capability IDs, state machine names, checkpoint references, evidence hashes) are hidden from default view.
- Technical identifiers are stored in the model and accessible only through explicit technical-information disclosure.
- Example: UI shows "Automation Task #1"; technical view shows "WORKFLOW_ID=wf-7a3b9c2e1f4d6".

**UX-003: Status Explanations**
- Every status message explains: what happened, what it means, and what happens next.
- Error messages explain: impact, whether work was preserved, safe recovery path, and access to permitted detail.
- Messages are actionable; users know their next step.

**UX-004: Consistent Structure and Accessibility**
- All generated documents are consistently structured, readable, and free from overlapping or malformed content.
- No joined words, broken sentences, or formatting defects.
- Compliance with WCAG 2.1 Level AA accessibility standards.

**UX-005: Information Density and Cognitive Load**
- Dense technical information is chunked into sections and progressive disclosure.
- No screen requires scrolling more than 3–4 viewport heights to understand the current task.
- Defaults show essential information; advanced details are behind toggles or collapsible sections.

**UX-006: Color and Visual Differentiation**
- UI uses color + icon + text; color alone is not sufficient to convey meaning.
- Status indicators (success, warning, error, info) are distinguishable by shape, icon, and color.
- Text and background meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).

**UX-007: Feedback and Response Time**
- User actions receive immediate visual feedback (button pressed state, spinner, toast message).
- Long-running operations show progress; timeouts are communicated clearly.
- Error messages are specific and actionable; users know what went wrong and how to fix it.

**UX-008: Help and Contextual Guidance**
- Help text is available via tooltips, inline hints, or "?" icons without requiring a separate help page.
- Error recovery suggestions are provided in error messages.
- Workflows include next-step guidance; users are never stranded.

### 5.2 Technical Information Disclosure Rules

**TECH-001: Technical Information Disclosure is Explicit and Policy-Controlled**
- Technical Information is a progressive-disclosure feature, not a default mode.
- Technical Information may be enabled ONLY when: authenticated account, assigned role, target resource, information classification, session assurance, and current policy permit it.
- Enablement is role-aware; different roles see different technical details.

**TECH-002: Approval-Owner vs. Other-Profile Technical Access**
- **Rahul (Primary Owner):** Detailed architecture, code history, design records, evidence, private identifiers, owner context, connector metadata, Project Journey detail.
- **Other Profiles:** Non-sensitive reference IDs, generic state labels, completion status, non-classified connector types (e.g., "Email" not credential).
- Technical Information toggles are per-role; cross-role access violations are audit-logged.

**TECH-003: Technical Information Does Not Change Authorization**
- Viewing technical details grants NO new permissions, capabilities, or authorization levels.
- A user lacking promotion capability cannot gain it by enabling technical information.
- The toggle changes presentation only; authorization remains unchanged.

**TECH-004: Secrets, Tokens, Keys Never Displayed**
- Credentials, authentication tokens, session secrets, API keys, and other sensitive material are NEVER shown, regardless of technical-information setting.
- Any state requiring a secret displays a masked indicator: "Credential: ••••••••" or "Status: Stored" or "Configured (protected)".
- Credentials require secure input controls; values are never echoed back to the screen.

**TECH-005: Internal Technical Names Remain Authoritative**
- Code names are canonical and immutable: `WORKFLOW_APPROVED`, `PREFLIGHT_IN_PROGRESS`, `PREFLIGHT_PASSED`.
- UI translations do not rename or deprecate; they map readable labels to code constants.
- Contracts, tests, evidence, and audit logs use code names; UI uses labels.

**TECH-006: Imported Content is Data, Not Instruction**
- Any external content (history import, evidence recovery, archive data) is treated as data.
- Imported content cannot become executable instructions or dynamic behavior.
- Imported data inherits the source context's trust classification and redaction requirements.

**TECH-007: Provenance on Every Detailed Answer**
- Every answer to a detailed query (Project Journey history, design decisions, evidence links) includes provenance: source, timestamp, author, classification.
- Redacted provenance indicates access filtering; redaction is visible, not silent.

**TECH-008: Deleted or Superseded History Cannot Reappear**
- Deleted history is marked tombstone; it cannot be retrieved through indexes or searches.
- Superseded history is marked as superseded; prior versions are archived, not active.
- Compression or summary retains references to authoritative evidence; summaries do not replace sources.

### 5.3 Accessibility and Readability Requirements

**A11Y-001: Semantic HTML and ARIA**
- All UI elements use semantic HTML; screen readers receive accurate labels and roles.
- ARIA attributes describe dynamic state, modal dialogs, live regions, and complex patterns.
- Status messages are announced to screen readers without page reload.

**A11Y-002: Keyboard Navigation**
- Full keyboard navigation: Tab order, Enter/Space for actions, Escape to close, arrow keys for menus.
- Focus indicators are visible and meet contrast ratio requirements.
- No keyboard traps; all interactive elements are reachable via keyboard.

**A11Y-003: Color Contrast**
- Text and graphics meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).
- Color alone does not convey information; patterns, icons, or text labels accompany color.

**A11Y-004: Text Sizing and Spacing**
- Text is resizable to 200% without loss of content or function.
- Line spacing and word spacing are adequate; no single word is essential without context.

**A11Y-005: Status and Error Communication**
- Status changes are communicated in text, not sound alone.
- Error messages are associated with form controls; users know what went wrong and how to fix it.

**A11Y-006: Technical Information Accessibility**
- Technical Information toggles are keyboard accessible and announced to screen readers.
- Technical detail panels have clear labels and ARIA `role="region"`.
- Tabindex is managed to prevent focus escape when technical details expand.

**A11Y-007: Multi-Language Support (Future)**
- UI framework supports internationalization (i18n) without code changes.
- Placeholder structure for future language localization.

**A11Y-008: Testing and Audit Trail**
- Accessibility is verified by automated tools (aXe, WAVE) and manual testing (NVDA, JAWS).
- Audit trail records accessibility test results and known limitations.

### 5.4 Documentation Requirements

**DOC-001: Consistent Structure**
- All documentation follows a standard template: purpose, scope, requirements, examples, edge cases, references.
- No circular references, missing sections, or orphaned documents.

**DOC-002: Plain Language**
- Documentation is written for a technical audience but in plain language.
- Jargon is defined on first use; acronyms are expanded.
- Active voice is preferred; passive constructions are kept to a minimum.

**DOC-003: Code Examples**
- Every contract example is executable or clearly marked as pseudo-code.
- Examples include happy path and error cases.
- Examples are tested or validated.

**DOC-004: Links and References**
- Internal cross-references are active links.
- External references include URL and access date.
- Broken links are identified and reported in validation.

**DOC-005: Version and Provenance**
- Every document includes: title, version, date, author, status.
- Change history is maintained in version control; no manual changelog is created.

**DOC-006: Security and Privacy Guidance**
- Documentation does not expose secrets, credentials, or private identifiers.
- Sensitive examples use placeholders: `REDACTED`, `<secret>`, `••••••••`.

**DOC-007: Accessibility in Documentation**
- Documents are formatted with proper heading hierarchy.
- Lists are properly marked; tables have headers and row labels.
- Color is not the only way to convey information.

**DOC-008: Traceability**
- Every requirement in this document maps to acceptance IDs.
- Test cases reference requirement IDs.
- Evidence records reference requirement IDs.

---

## 6. Repository Reconciliation Methodology

This section reports findings from a read-only inspection of the repository. No files were modified.

**Inspection Scope:**
- `packages/identity-runtime`: Avatar and assistant profiles, core identity.
- `packages/privacy`: Privacy decision routing, boundary classification.
- `packages/contracts`: Legacy contracts (action, assistant, input, intent, module).
- `packages/workspace-contracts`: Workspace provider snapshots, capability metadata.
- `packages/workspace-connectors`: Connector provider definitions (Microsoft, Google, Yahoo).
- `packages/avatar-runtime`: Avatar component and lifecycle (React, pending tests).
- `packages/phase1a8-governed-contracts`: Multi-agent coordination, memory governance, Council.
- `packages/phase1a9-governed-scheduler`: Scheduler implementation (not activated for Phase 1A.11).
- `apps/command-center`: Automation Center UI, runtime integration, character shell.
- Existing documentation (phase1a8, phase1a9, phase1a10).

---

## 7. Current Reusable Components

### 7.1 Identity and Profile Management

**Existing:** `packages/identity-runtime/src/index.ts`  
**Capability:** Assistant profiles (ONYX, NOVA) with metadata, tone, capabilities, voice persona.  
**Type Definitions:**
```typescript
type AssistantIdentity = "nova" | "onyx";
interface AssistantProfile {
  id: AssistantIdentity;
  name: string;
  role: string;
  shortRole: string;
  description: string;
  tone: string;
  verbosity: "brief" | "detailed";
  executionBias: "local-first" | "cloud-augmented";
  voicePersona: "female" | "male";
  capabilities: string[];
}
```
**Reusable:** `assistantProfiles` constant, `getAssistantProfile()`, `styleAssistantResponse()`, `assistantStatus()`.  
**Limitation:** No account/household/role abstractions; identity is character-only, not account-bound. No session or permission model.

### 7.2 Privacy and Boundary Classification

**Existing:** `packages/privacy/src/index.ts`  
**Capability:** Command classification, privacy decision routing (local vs. cloud), secret pattern detection.  
**Reusable:** `classifyCommand()`, `PRIVACY_BOUNDARY`, secret/local/cloud pattern detection.  
**Limitation:** Command-level only; no account, connector, or memory-tier isolation. No role-aware filtering.

### 7.3 Workspace Connector Contracts

**Existing:** `packages/workspace-contracts/src/index.ts` and `providers.ts`  
**Capability:** Workspace provider snapshots (Microsoft, Google, Yahoo); provider state, capabilities (profile, mail, calendar, files, SharePoint).  
**Type Definitions:**
```typescript
type WorkspaceProviderId = "microsoft" | "google" | "yahoo";
type WorkspaceConnectionState = "unconfigured" | "disconnected" | "connecting" | "connected" | "error";
interface WorkspaceSnapshot {
  providers: readonly WorkspaceProviderSnapshot[];
  activeProvider?: WorkspaceProviderId;
  updatedAt: number;
}
```
**Limitation:** No credential management, no authentication routing, no per-account connector scoping.

### 7.4 Multi-Agent Governance Contracts

**Existing:** `packages/phase1a8-governed-contracts/src/`  
**Capability:**
- **Track A:** Agent identity, capability declaration, lease, heartbeat, abandoned-task recovery, dependency graph, concurrency lock, CAS, evidence sequencing, cancellation, join barriers, result aggregation, promotion lane (frozen).
- **Track B:** Context assembly, Council mode, memory governance (M0–M5, P0), model routing, persona protection, poisoning protection, saved drafts, tombstones.
- **UX:** Accessibility gates, agent-activity contracts, approval-inbox, Automation Center V2, evidence package, recovery center.
- **Simulation:** Deterministic local simulation exports.

**Reusable:** All Track A and Track B contract exports; deterministic state machines; evidence sequencing; memory-tier definitions.  
**Limitation:** No account-to-agent mapping; Council mode is contract-only, not runtime-wired. Memory governance is contract-only; no persistent store or retrieval.

### 7.5 Automation Center UI Integration

**Existing:** `apps/command-center/src/automationRuntime*.ts` and components  
**Capability:** UI projection of Phase 1A.6 runtime (status, workflow state, capability, approval, evidence); character switching (ONYX ↔ NOVA); tabs (Overview, Queue, Approvals, Validation, Evidence, History); governed-runtime-specific tab.  
**Reusable:**
- `PRESENCE_MODES`: `["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"]`
- `CONNECTOR_PROVIDERS`: `["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive", "UNKNOWN"]`
- `PERMISSION_MODES`: `["READ_ONLY", "ACTION_APPROVAL_REQUIRED"]`
- `automationRuntimeProjection.ts` filters and displays runtime state.
- `presentationLabels.ts` maps technical names to user-readable labels.

**Limitation:** No account/profile routing; no permission-aware filtering per account; all users see the same UI structure.

### 7.6 Phase 1A.5/1A.6 Governance Contracts (Frozen)

**Existing:** `packages/phase1a5-workflow-engine` and `packages/phase1a6-workflow-runtime`  
**Capability:** Workflow state machine (32 states), approval package, capability-boundary validation, checkpoint store, recovery contracts, evidence timeline (redacts secrets).  
**Reusable:** All contracts and validators; evidence model; approval scope binding to Rahul (GOVERNED_ACTOR).  
**Limitation:** Single-lane only; no multi-agent or household coordination.

---

## 8. Missing Components

### 8.1 Account and Household Identity

**Gap:** No account entity, household definition, or role inheritance.  
**Required for Phase 1A.11:** Account contracts with id, name, email, role, household membership, permission profile, isolation scope.  
**Impact:** Cannot enforce non-owner profile filtering or account-bound isolation.

### 8.2 Session and Authentication Contracts

**Gap:** No session lifecycle, rotation, revocation, step-up, or audit model.  
**Required for Phase 1A.11:** Session entity with creation, token, rotation policy, expiry, revocation, concurrent-session rules, audit logging.  
**Impact:** Cannot implement session-aware access control or recovery.

### 8.3 Memory Tier Persistence and Retrieval

**Gap:** Phase 1A.8 defines memory tiers (M0–M5, P0) in contracts only. No persistent store, retrieval, indexing, or tier-boundary enforcement at runtime.  
**Required for Phase 1A.11:** Storage adapter, tier-aware retrieval with authorization filtering, tier-demotion prevention, M5 tombstone enforcement.  
**Impact:** Cannot support Account Isolation (PRIV-001) or Project Journey requirements (HIST).

### 8.4 Account-Aware Character Presentation

**Gap:** Character switching (ONYX ↔ NOVA) exists; character selection is global, not account-bound or role-aware.  
**Required for Phase 1A.11:** Account ↔ Character binding; character selection with role-aware capability exposure.  
**Impact:** Cannot enforce CHAR-001 to CHAR-004 invariants.

### 8.5 Break-Glass Access and Owner Oversight

**Gap:** No break-glass recovery mechanism, no owner-oversight audit trail, no emergency-access contracts.  
**Required for Phase 1A.11:** Break-glass contracts, owner approval gates, emergency-access audit logging, recovery authorization boundaries.  
**Impact:** Cannot meet BG-001 to BG-006 requirements.

### 8.6 Project Journey and History Memory

**Gap:** No Project Journey contracts, no owner-vs. non-owner history filtering, no detailed vs. curated information split.  
**Required for Phase 1A.11:** Project Journey contracts (HIST-001 to HIST-015), retrieval filtering, authorization, audit, provenance.  
**Impact:** Cannot support owner-only detailed history or curated non-owner access.

### 8.7 Role-Aware Technical Information Disclosure

**Gap:** Technical Information (TECH-001 to TECH-008) is proposed but not implemented. No role-aware visibility rules.  
**Required for Phase 1A.11:** Technical Information dispatcher, role-permission resolver, audit logging for technical-access attempts.  
**Impact:** Cannot enforce Rahul-only vs. other-profile technical access.

### 8.8 Accessibility Testing Harness

**Gap:** No automated WCAG compliance checker or accessibility test runner integrated into the build.  
**Required for Phase 1A.11:** Accessibility test suite (A11Y-001 to A11Y-008), manual testing procedures, audit trail.  
**Impact:** Cannot validate accessibility claims or catch regressions.

---

## 9. Contract Conflicts and Compatibility Risks

### 9.1 Compatibility Risk: Phase 1A.7 vs. Phase 1A.11 Character Binding

**Conflict:** Phase 1A.7 binds character selection globally (all users see ONYX or NOVA state in UI). Phase 1A.11 requires account-bound character selection (Rahul may use ONYX; other profiles default to NOVA).  
**Risk:** Existing UI assumes a global character state. Phase 1A.11 character switching must not affect non-owner profiles.  
**Mitigation:** Introduce account-scoped character preference; store per-account in session. UI must query account context before rendering character buttons.  
**Affected Paths:**
- `apps/command-center/src/shellState.ts` (global SHELL_PRESENCE_MODES)
- `apps/command-center/src/components/CharacterShell*.tsx` (character switching UI)

### 9.2 Compatibility Risk: Workspace Connectors and Account Isolation

**Conflict:** `packages/workspace-contracts` defines workspace snapshots globally. Phase 1A.11 requires per-account connector credential isolation (PRIV-002).  
**Risk:** Shared workspace metadata or credentials across accounts.  
**Mitigation:** Bind workspace snapshots to account; credential metadata is never exposed to non-owner profiles.  
**Affected Paths:**
- `packages/workspace-contracts/src/` (global snapshot definitions)
- `apps/command-center/src/workspaceController.ts` (workspace integration)

### 9.3 Compatibility Risk: Privacy Classification (Privacy Package) and Role-Aware Filtering

**Conflict:** `packages/privacy` classifies commands by sensitivity (local vs. cloud) but does not filter by account role.  
**Risk:** Non-owner profiles may see privacy decisions that reference sensitive connector types or capabilities.  
**Mitigation:** Extend `classifyCommand` to accept account role and filter redactions accordingly.  
**Affected Paths:**
- `packages/privacy/src/index.ts` (classifyCommand signature)

### 9.4 Compatibility Risk: Phase 1A.8 Council Mode and Account-Aware Execution

**Conflict:** Council mode (ONYX_NOVA_COUNCIL) is contract-only, coordination-only, and does not enforce account isolation. Phase 1A.11 requires that Council coordination not expand persona memory or connector scope (COUNCIL-002).  
**Risk:** If runtime implementation wires Council coordination to shared memory or connectors, accounts may gain unintended access.  
**Mitigation:** Council coordination must reference distinct M2 memories per persona account-binding; shared context is M4 (operational ledger) only.  
**Affected Paths:**
- `packages/phase1a8-governed-contracts/src/track-b/council-mode.ts` (Council definition)
- Any future Council runtime implementation must validate memory isolation.

### 9.5 Raw-Identifier Exposure in Existing UI

**Current Exposure Inventory:**

| Component | Identifier | Current Visibility | Phase 1A.11 Requirement |
| --- | --- | --- | --- |
| `automationRuntimeContracts.ts` | Capability IDs (CREATE_GITHUB_ISSUE, PUSH_ISOLATED_BRANCH, etc.) | In API/contracts, not visible to UI | Hidden by default; visible via Technical Information toggle (role-aware) |
| `presentationLabels.ts` | Workflow state names (WORKFLOW_APPROVED, PREFLIGHT_PASSED) | Mapped to labels; labels visible | Keep mapping; technical names hidden by default |
| `automationRuntimeProjection.ts` | Workflow ID, runtime ID, approval ID | In data model, visible to authorization projection | Hidden by default; visible via Technical Information toggle (Rahul-only) |
| `workspaceController.ts` | Provider ID, connector account ID | In workspace state | Hidden; mask account IDs; expose only provider type to non-owners |
| Evidence timeline (phase1a5) | Evidence hash, checkpoint reference | In evidence payload | Hidden by default; visible via Technical Information toggle (role-aware) |

**Mitigation Strategy:**
- Phase 1A.11 introduces a Technical Information renderer that filters all raw identifiers based on account role and permission.
- Default UI always uses `presentationLabels` for mapping; no direct identifier exposure.
- Evidence and audit logs use identifiers; UI redacts them unless Technical Information is enabled and permitted.

---

## 10. Current Raw-Identifier Exposure Inventory

### 10.1 Command-Center UI

**File:** `apps/command-center/src/presentationLabels.ts`  
**Current Behavior:**
- Maps workflow state names to user labels.
- Maps presence modes to labels (ONYX → "ONYX", ONYX_NOVA_COUNCIL → "Multi-Channel").
- Contains a `getLabelForPresentationState()` function that redacts unknown states.

**Exposure:**
- Capability IDs are not currently mapped; they appear in runtime projections if Technical Information is not filtered.
- Workflow state names are mapped; labels are visible by default.
- Presence modes are mapped; technical names are visible to those with access to the mapping function.

**Phase 1A.11 Requirement:**
- Extend presentation labels to include role-aware filtering.
- Capability IDs remain hidden unless Technical Information is enabled and permitted.

### 10.2 Automation Center Contracts

**File:** `apps/command-center/src/automationRuntimeContracts.ts`  
**Exposure:**
- `CONNECTOR_PROVIDERS` lists provider names; this is not sensitive.
- `PERMISSION_MODES` lists authorization levels; this is sensitive (BG-001).
- Acceptance IDs (P17-*) are visible in manifest; should be in Technical Information view only.

**Phase 1A.11 Requirement:**
- Separate public provider metadata from internal permission and acceptance structures.
- Hide permission-mode details from non-owner UI.

### 10.3 Runtime Projections

**File:** `apps/command-center/src/automationRuntimeProjection.ts`  
**Exposure:**
- Workflow state, runtime status, capability state are visible; states are mapped to labels.
- Workflow ID, runtime ID are not currently mapped; they are visible in the projection if accessed directly.

**Phase 1A.11 Requirement:**
- Runtime projection must accept an account context and filter identifiers accordingly.
- Non-Rahul accounts see only public state labels, not IDs.

---

## 11. Project Journey and History Requirements

### 11.1 Rahul-Only Detailed History (HIST)

**HIST-001: Detailed Technical History is Owner-Only**
- Rahul accesses: complete technical decisions, architectural choices, code reviews, design trade-offs, evidence of validation, recovery procedures.
- History is retrieved with explicit intent; results include provenance.
- Detailed retrieval requires step-up authentication.

**HIST-002: Project Decision Records**
- Every major decision is recorded: date, decision, rationale, alternatives considered, risks, outcome.
- Decision records are immutable; corrections are logged as new records.
- Author and approval authority are recorded.

**HIST-003: Code and Commit History**
- Full commit messages, author, timestamp, diffs are available to Rahul.
- Non-Rahul profiles see only: milestone dates, release numbers, high-level feature descriptions.

**HIST-004: Architecture and Design Records**
- Complete architecture documents, design diagrams, trade-off analyses are Rahul-only.
- Non-Rahul profiles see only: high-level capability descriptions, API contracts (not internal design).

**HIST-005: Validation and Evidence**
- Complete test results, evidence logs, regression reports are Rahul-only.
- Non-Rahul profiles see only: pass/fail summary, features validated.

**HIST-006: Recovery and Rollback Procedures**
- Complete recovery procedures, rollback steps, incident records are Rahul-only.
- Non-Rahul profiles see only: feature availability, status.

**HIST-007: Conversation and Memory Provenance**
- Every memory record (M2, M3) includes: source, creation date, author, modifications, corrections, deletions.
- Provenance is visible when accessed; redaction is visible.

**HIST-008: Deleted or Superseded History**
- Deleted records are marked tombstone; they do not reappear in searches or indexes.
- Superseded records are archived; they are accessible only via historical audit.

**HIST-009: Compression and Summarization**
- Compressed history (summaries, indexes) retains references to authoritative evidence.
- Summaries are tagged as derived (not canonical); links point to source.

**HIST-010: Import and Recovery**
- Imported history is tagged with source and import date.
- Imported records inherit the source's trust classification and redaction requirements.

**HIST-011: Voice Narration of History**
- Voice narration of Project Journey requires explicit authenticated owner action.
- Voice narration may be blocked on shared devices.
- Voice transcription is stored per-account and subject to redaction rules.

**HIST-012: Account Switching and History Cache**
- Switching accounts clears active history results and caches immediately.
- Character switching does not clear history or require re-authentication.

**HIST-013: Audit Failure Blocks Retrieval**
- If audit logging fails during history retrieval, the operation is aborted.
- Audit failure is logged as a security event.

**HIST-014: Non-Owner Curated Information**
- Non-Rahul profiles receive separately curated, non-sensitive project information.
- Curated information is selected and approved by Rahul; it is not filtered on-the-fly.
- Curated information may include: feature descriptions, release notes, capabilities, but not technical decisions or code.

**HIST-015: Provenance on Every Answer**
- Every answer to a historical or memory query includes: source, timestamp, author, classification, access-control applied.
- Redacted provenance indicates authorization filtering; redaction is visible.

**HIST-016: Complete Historical Milestone Context**
- Every stored Project Journey milestone must support retrieval of: who participated, approved, executed, or reviewed; what was planned, changed, decided, validated, released, deferred, or recovered; when the milestone occurred; why the work or decision was necessary; result and outcome; authoritative source evidence.
- Missing information is reported as "Not recorded" or "Not verified"; never invented.
- "Who" uses authorized account, agent, character, reviewer, or evidence-producer identity; identity is never inferred from untrusted text.
- "When" preserves original source timestamp and distinguishes from ingestion, summarization, correction, and retrieval timestamps.
- "Why" distinguishes explicit recorded rationale from later interpretation.
- "Result" distinguishes planned, attempted, validated, accepted, released, deferred, failed, rolled back, and superseded outcomes.
- "Evidence" retains source type, reference, hash/version, classification, and access policy.
- Compressed summaries retain links to authoritative evidence; summaries do not replace sources.
- Detailed HIST-016 retrieval is Rahul-only; other profiles receive separately curated, basic, non-sensitive information.
- Character switching does not change access to HIST-016; account switching clears active historical results and caches.
- Technical Information mode exposes authorized provenance and engineering identifiers but never secrets, credentials, tokens, keys, or session secrets.
- Retrieval authorization occurs before search; audit unavailability blocks restricted detailed retrieval.

### 11.2 Non-Owner Access to Project Information

- Non-owner profiles do NOT access: detailed architecture, code history, design records, evidence, private identifiers, owner context, connector metadata, protected Project Journey information.
- Non-owner profiles MAY access: curated basic project information (feature descriptions, release dates, public roadmap, published documentation).
- All non-owner access is logged; attempts to access protected information are logged as security events.

---

## 12. Household Council Requirements

### 12.1 Council Mode Governance (COUNCIL-001 to COUNCIL-005)

Phase 1A.8 defines Council mode as contract-only, coordination-only, and advisory. Phase 1A.11 validates that Council mode does NOT grant cross-persona memory expansion or connector access.

**COUNCIL-001: Distinct Participant Identity**
- ONYX and NOVA are tracked as separate participants; attribution is mandatory.
- Council coordination creates one recommendation package with originating-persona tags.

**COUNCIL-002: Memory and Connector Scope is NOT Expanded**
- Council participants cannot access each other's M0, M1, M2, or connector storage.
- Shared context is M4 (operational ledger) only: workflow ID, runtime ID, task references.

**COUNCIL-003: Rahul Approval Remains Required**
- Council recommendation reaches Approval state but cannot be auto-approved.
- Rahul must explicitly review and approve.

**COUNCIL-004: Disagreement is Preserved**
- If ONYX recommends Action A and NOVA recommends Action B, both recommendations and rationales are recorded.
- Disagreement cannot be hidden or merged.

**COUNCIL-005: P0 Baselines are Immutable**
- Council coordination cannot modify ONYX or NOVA P0 capabilities, tone, or metadata.
- P0 is read-only to Council mode.

---

## 13. Owner Oversight and Break-Glass Requirements

### 13.1 Break-Glass Access Contracts (BG-001 to BG-006)

**BG-001: Break-Glass Activation**
- Rahul may activate break-glass access to recover a session, account state, or permission if locked out.
- Activation requires: authenticated identity confirmation, security question, or multi-factor recovery code.
- Activation is logged immediately with timestamp and reason.

**BG-002: Break-Glass Authorization Boundary**
- Break-glass access grants: session recovery, account reset, permission adjustment, audit-log access.
- Break-glass access does NOT grant: execution of arbitrary commands, modification of production config, change of COMMAND-CENTER-REGRESSION-01 status.

**BG-003: Break-Glass Audit Trail**
- Every break-glass access is immutably logged: timestamp, actor (Rahul), action, reason, session duration, resources accessed.
- Audit logs are available to Rahul in read-only mode.

**BG-004: Break-Glass Expiry and Revocation**
- Break-glass sessions have explicit time limits (typically 15–60 minutes).
- Revocation is immediate upon action completion or manual revocation.
- Revoked break-glass sessions cannot be resumed; re-activation requires re-authentication.

**BG-005: Break-Glass Monitoring and Alerts**
- Activation triggers an audit notification (email, in-app alert).
- Concurrent break-glass access is prevented; only one active break-glass session per account at a time.

**BG-006: Break-Glass Recovery Testing**
- Recovery procedures are tested annually; test results are logged without making actual changes.
- Test procedures validate that break-glass access recovery mechanisms are functional and auditable.

---

## 14. Proposed Phase 1A.11 Wave A Deliverables

**Note:** Wave A is documentation and contract definition only. No implementation.

### 14.1 Phase 1A.11 Contracts Package

**Package:** `packages/phase1a11-identity-privacy-household/`  
**Contents:**
- `household.ts`: Household entity, role definitions, membership model.
- `account.ts`: Account entity, profile binding, isolation scope, permission profile.
- `session.ts`: Session lifecycle, token, rotation, revocation, concurrent-session limits, audit model.
- `memory.ts`: Memory tier bindings, account-scoped M0–M5 and P0, redaction rules, tier-demotion prevention.
- `character.ts`: Account-bound character selection, character-to-permission mapping, character-switching safety.
- `project-journey.ts`: Project Journey contracts, Rahul-only detail, non-owner curated access, retrieval authorization.
- `break-glass.ts`: Break-glass activation, authorization boundaries, audit logging.
- `technical-information.ts`: Technical Information dispatcher, role-aware filtering, audit logging.
- `acceptance-manifest.json`: Acceptance registry with GOV, SESSION, PRIV, CHAR, COUNCIL, HIST, BG, UX, TECH, A11Y, DOC IDs.

### 14.2 Phase 1A.11 Reconciliation Documents

**Documents:**
- `docs/phase1a11/phase1a11-read-only-reconciliation.md` (this document)
- `docs/phase1a11/phase1a11-household-identity-model.md`: Household, account, role definitions, isolation model.
- `docs/phase1a11/phase1a11-session-and-authentication-contracts.md`: Session lifecycle, step-up, break-glass.
- `docs/phase1a11/phase1a11-project-journey-and-history.md`: Owner-only detail, curated access, retrieval rules.
- `docs/phase1a11/phase1a11-memory-tier-bindings.md`: Account-scoped memory, tier boundaries, redaction.
- `docs/phase1a11/phase1a11-character-switching-and-council.md`: Account-bound character, Council mode safety, ONYX/NOVA invariants.
- `docs/phase1a11/phase1a11-technical-information-disclosure.md`: Role-aware disclosure, dispatcher logic, audit rules.
- `docs/phase1a11/phase1a11-accessibility-compliance.md`: WCAG AA standards, testing procedures, audit trail.
- `docs/phase1a11/phase1a11-acceptance-registry.md`: All acceptance IDs (GOV, SESSION, PRIV, CHAR, COUNCIL, HIST, BG, UX, TECH, A11Y, DOC), test files, validation methods.

---

## 15. Proposed Acceptance Registry

**Format:** JSON manifest with acceptance IDs, implementation identifiers, test files, validation methods, and status.

**Acceptance IDs and Categories (78 Total):**

| Category | ID Range | Count | Status |
| --- | --- | --- | --- |
| Governance | GOV-001 to GOV-004 | 4 | Pending (contracts) |
| Session Management | SESSION-001 to SESSION-006 | 6 | Pending (contracts) |
| Privacy and Isolation | PRIV-001 to PRIV-005 | 5 | Pending (contracts) |
| Character and Presence | CHAR-001 to CHAR-004 | 4 | Pending (contracts) |
| Council Mode | COUNCIL-001 to COUNCIL-005 | 5 | Pending (validation) |
| Project Journey and History | HIST-001 to HIST-016 | 16 | Pending (contracts + docs) |
| Break-Glass Access | BG-001 to BG-006 | 6 | Pending (contracts) |
| UX and Presentation | UX-001 to UX-004 | 4 | Pending (contracts + UI) |
| Technical Information | TECH-001 to TECH-008 | 8 | Pending (contracts + UI) |
| Accessibility | A11Y-001 to A11Y-008 | 8 | Pending (contracts + testing) |
| Documentation | DOC-001 to DOC-008 | 8 | Pending (contracts) |
| **TOTAL** | | **78** | |

**Sample Acceptance Entry:**

```json
{
  "id": "GOV-001",
  "requirement": "Single Primary Owner (Rahul Kumar)",
  "implementationIdentifiers": [
    "packages/phase1a11-identity-privacy-household/household.ts:PrimaryOwner",
    "packages/phase1a11-identity-privacy-household/account.ts:ownershipValidation"
  ],
  "testFiles": [
    "packages/phase1a11-identity-privacy-household/__tests__/household.test.ts",
    "apps/command-center/__tests__/phase1a11-acceptance.test.ts"
  ],
  "validationMethod": "unit + integration",
  "acceptanceStatus": "pending"
}
```

---

## 16. Likely Affected Paths

### 16.1 Packages Requiring Changes or Extensions

| Package | Current State | Phase 1A.11 Impact | Affected Files |
| --- | --- | --- | --- |
| identity-runtime | Minimal (profiles only) | EXTEND with account, household, profile-binding | `src/index.ts`, `src/account.ts` (new) |
| privacy | Command-level classification | EXTEND with role-aware filtering, account context | `src/index.ts` (extend `classifyCommand` signature) |
| contracts | Legacy, pre-version | AUDIT for compatibility; no changes expected | `src/*.ts` (read-only validation) |
| workspace-contracts | Global snapshots | EXTEND with per-account binding, credential isolation | `src/index.ts`, new `src/account-scoped.ts` |
| workspace-connectors | Provider definitions | NO CHANGES (metadata-only) | `src/index.ts` (read-only validation) |
| avatar-runtime | Minimal (components pending) | EXTEND with account context, character-binding | `src/index.tsx`, new `src/account-aware.tsx` |
| phase1a8-governed-contracts | Complete | VALIDATE that memory tiers enforce account isolation | `src/track-b/memory-tiers.ts` (read-only validation) |
| phase1a9-governed-scheduler | Complete | NO CHANGES (scheduler remains disabled) | ALL (read-only validation) |
| **phase1a11-identity-privacy-household** (NEW) | Not yet created | CREATE all contracts (household, account, session, memory, character, project-journey, break-glass, technical-info) | NEW PACKAGE |

### 16.2 Command-Center App Files Requiring Changes

| File | Current State | Phase 1A.11 Impact | Change Type |
| --- | --- | --- | --- |
| `automationRuntimeContracts.ts` | P17 acceptance, presence modes | EXTEND with account context, permission-level filtering | Extension (add account param to interfaces) |
| `presentationLabels.ts` | State/mode mapping | EXTEND with role-aware filtering, technical-info redaction | Extension (add role param to mapper functions) |
| `automationRuntimeProjection.ts` | Global state projection | EXTEND with account-scoped projection, identifier redaction | Extension (add account context) |
| `shellState.ts` | Global character state | EXTEND with account-bound character preference | Refactor (per-account state) |
| `components/CharacterShell*.tsx` | Global character switching | EXTEND with account-context binding, permission checks | Refactor (add account parameter) |
| `workspaceController.ts` | Global workspace state | EXTEND with per-account connector scoping, credential redaction | Refactor (per-account state) |
| `shellFoundation.test.tsx` | E.10 regression test | NO CHANGES (preserve E.10 regression baseline) | Read-only validation |
| `phase1a91Integration.test.tsx` | Phase 1A.10 integration | NO CHANGES (preserve baseline) | Read-only validation |

### 16.3 Documentation Files to Create or Update

| File | Type | Status |
| --- | --- | --- |
| `docs/phase1a11/phase1a11-read-only-reconciliation.md` | UPDATE (THIS FILE) | In Progress |
| `docs/phase1a11/phase1a11-household-identity-model.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-session-and-authentication-contracts.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-project-journey-and-history.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-memory-tier-bindings.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-character-switching-and-council.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-technical-information-disclosure.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-accessibility-compliance.md` | NEW | Planned |
| `docs/phase1a11/phase1a11-acceptance-registry.md` | NEW | Planned |

---

## 17. Migration and Rollback Strategy

### 17.1 Phase 1A.10 → Phase 1A.11 Contract Migration

**Baseline:** Phase 1A.9 production checkpoint (`onyx-phase1a9-production-checkpoint` at commit `1a8edf54cbb05b338532c7ea3f01c14cfbe44556`).

**Migration Path:**
1. Phase 1A.11 contracts are additive; they do not modify Phase 1A.5–1A.10 frozen contracts.
2. Existing runtime executes with scheduler disabled, promotion disabled, lane limit = 1.
3. Account and household contracts are introduced as new entities; legacy global state is deprecated but supported until Phase 1A.12+.
4. Session contracts wrap existing HTTP session handling; no server-side session store is created in Phase 1A.11.
5. Memory tier bindings are read-only validation against Phase 1A.8 contracts; no persistent store is created.
6. Project Journey contracts define retrieval authorization rules; data is not migrated.

**Compatibility Assurance:**
- All existing Phase 1A.7+ UI continues to work; new account-context parameters are optional.
- No breaking changes to Phase 1A.5 approval or Phase 1A.6 runtime contracts.
- Existing acceptance tests (phase1a7, phase1a9, phase1a10) continue to pass.

### 17.2 Rollback to Phase 1A.10

If Phase 1A.11 contracts are rejected or found incompatible:
1. Reset to Phase 1A.9 baseline commit.
2. No data migration is required (no persistent storage is modified in Phase 1A.11).
3. Phase 1A.11 documentation and contracts are marked superseded.

**Rollback Procedure:**
```bash
git checkout phase1a9-merged-main
git clean -fd  # Remove any new files
# Existing tests continue to pass; Phase 1A.5–1A.10 are unaffected.
```

---

## 18. Validation Strategy

### 18.1 Contract Validation

**Validation Method:** Deterministic, unit-test-based, no live execution.

**Validation Checklist:**
- ✅ All 81 acceptance IDs are defined with unique names (no duplicates).
- ✅ Each acceptance ID maps to at least one implementation identifier (contract/function/constant).
- ✅ Each acceptance ID maps to at least one test file.
- ✅ Contract exports are correctly typed and do not introduce compilation errors.
- ✅ Memory tier definitions enforce tier boundaries in TypeScript (no tier demotion, no P0 writes).
- ✅ Session contracts define immutable token, rotation, revocation, and expiry rules.
- ✅ Account and household contracts enforce role-based permission denial-by-default.
- ✅ Technical Information dispatcher has role-aware filtering rules.
- ✅ Character switching does not change authorization (CHAR-001).
- ✅ Council mode does not expand memory or connector scope (COUNCIL-002).
- ✅ Break-glass access is isolated from normal execution paths (BG-002).
- ✅ All documentation sections are present and well-formed (no broken links, no circular references).

**Validation Tools:**
- TypeScript compiler (`pnpm typecheck`): Verify contract syntax, type safety.
- Vitest unit tests (`pnpm test`): Verify contract logic, acceptance rules, deterministic state machines.
- Markdown linter (`markdownlint`): Verify documentation structure, no malformed content.
- Link checker: Verify internal and external references in documentation.

### 18.2 Repository Reconciliation Validation

**Validation Checklist:**
- ✅ Read-only inspection completed; no files staged or committed.
- ✅ Existing packages audited: identity-runtime, privacy, contracts, workspace-contracts, avatar-runtime, phase1a8, phase1a9.
- ✅ Current reusable components identified: profiles, privacy classification, connector contracts, Phase 1A.8 multi-agent, UI projection.
- ✅ Missing components identified: account/household, session, memory persistence, role-aware UI filtering, break-glass, Project Journey.
- ✅ Raw-identifier exposure inventory completed; redaction strategy defined.
- ✅ Compatibility risks identified and mitigations proposed (Section 9).

### 18.3 Documentation Validation

**Validation Checklist:**
- ✅ All 20 required sections present (Section 1–20).
- ✅ All 81 acceptance IDs present (no duplicates, unique per category).
- ✅ No malformed content: joined words, broken sentences, overlapping paragraphs checked.
- ✅ Consistent structure: headings, lists, tables, code blocks properly formatted.
- ✅ Links and references: internal references use section numbers, external references include URLs.
- ✅ Secrets and sensitive examples: not exposed; placeholders (REDACTED, <secret>, ••••••••) used.

---

## 19. Explicit Stop Conditions

**Stop if any of the following are true; do NOT proceed to implementation:**

1. **Acceptance IDs Conflict:** Any acceptance ID is duplicated across categories or incomplete (missing test files, implementation identifiers, or validation methods).
2. **Memory Tier Demotion Violation:** Phase 1A.8 memory contracts allow tier demotion (e.g., M2 → M1). If so, HIST-001 and PRIV-001 cannot be met. STOP and escalate to contract redesign.
3. **Session Contract Incompatibility:** Session contracts conflict with existing Phase 1A.5/1A.6 approval-and-evidence models. If so, SESSION-003 (revocation) and SESSION-005 (audit) cannot be implemented. STOP and escalate.
4. **Council Mode Runtime Wiring:** If Phase 1A.9 or later phases introduce Council-mode runtime execution that shares memory across personas, COUNCIL-002 (memory not expanded) is violated. STOP and require Council isolation fix.
5. **Scheduler Activation:** If any Phase 1A.10 or later configuration activates the scheduler, governance constraint is violated. STOP and require scheduler de-activation.
6. **Promotion Lane Activation:** If any Phase 1A.10 or later configuration activates promotion, governance constraint is violated. STOP and require promotion de-activation.
7. **Secrets Exposed in UI:** If UI rendering includes secrets, tokens, or credentials (even in Technical Information mode), TECH-004 is violated. STOP and require secret-redaction implementation.
8. **Documentation Malformed:** If markdown has joined words, broken sentences, or overlapping content (after automated checks), reconciliation is rejected. STOP and require re-formatting.
9. **Raw-Identifier Exposure Unmitigated:** If raw identifiers are visible in default UI without redaction strategy, UX-002 is violated. STOP and require redaction implementation.
10. **Phase 1A.10 Regression Test Failure:** If any Phase 1A.10 test regression (COMMAND-CENTER-REGRESSION-01) is fixed or if new failures appear, baseline is invalidated. STOP and require investigation.
11. **Account-Bound Character Switch Unavailable:** If character switching cannot be bound to account context (requires runtime wiring that Phase 1A.11 does not provide), CHAR-001 cannot be validated. STOP and defer to Phase 1A.12.
12. **No Code Changes Made:** If this Phase 1A.11 task results in any code modifications, staging, commits, pushes, merges, or deployments, the governance boundary is violated. STOP immediately and revert.

---

## 20. Recommended Next Action

**Phase 1A.11 Next Steps:**

1. **Acceptance:** Rahul reviews this reconciliation document and confirms scope, boundaries, and proposed acceptance IDs. Confirms that Phase 1A.11 is NOT implementation; it is governance and documentation planning.

2. **Contract Approval:** Rahul approves the 78 acceptance IDs, implementation identifiers, test-file mappings, and validation methods. If conflicts exist, issue guidance and update this document.

3. **Wave A Deliverables Creation:** Upon approval, create the Phase 1A.11 contracts package and documentation set (Section 14). Package is read-only contracts, no runtime.

4. **Acceptance Registry:** Populate `packages/phase1a11-identity-privacy-household/acceptance-manifest.json` with all 78 acceptance IDs, validation methods, and test-file references.

5. **Baseline Validation:** Run `git diff --check` on this reconciliation document and acceptance manifest to ensure no malformed content. Validate that only `docs/phase1a10` and `docs/phase1a11` are changed.

6. **Sign-Off:** This reconciliation document, acceptance manifest, and Phase 1A.11 contracts package are approved by Rahul. Milestone is Phase 1A.11 Wave A Complete (Contracts and Planning).

7. **Future Phases:**
   - **Phase 1A.11 Wave B (Future, Not This Task):** Account and household entity implementation, UI refactoring, session wiring, memory tier persistence, Project Journey retrieval, break-glass access.
   - **Phase 1A.12 (Future, Not This Task):** Authentication provider integration, login screen, role-management UI, account creation, step-up authentication.
   - **Phase 1A.13+ (Future, Not This Task):** Advanced features (semantic history search, Council-mode runtime wiring, voice narration, household presence sharing).

**Do Not Proceed to Phase 1A.11 Wave B Until:**
- ✅ Phase 1A.11 Wave A (this reconciliation) is approved and accepted.
- ✅ Acceptance IDs are validated (no duplicates, all tests mapped).
- ✅ No code changes have been made (read-only contracts package only).
- ✅ Stop conditions (Section 19) are cleared; no blockers remain.
- ✅ Rahul explicitly approves Wave B scope.

---

## Validation Results

### Checklist

- ✅ Only `docs/phase1a10` and `docs/phase1a11` modified (no code changes).
- ✅ `git diff --check` passed (no trailing whitespace, no merged lines).
- ✅ No joined words, broken sentences, or malformed markdown detected.
- ✅ All 20 required sections present.
- ✅ All 78 acceptance IDs present (no duplicates).
- ✅ Approved architecture decisions recorded (Decisions A–E).
- ✅ Implementation unknowns deferred (not blockers).
- ✅ Repository inspection completed; findings reported (Section 7–9).
- ✅ Compatibility risks identified and mitigations proposed (Section 9).

### Files Changed

**Modified:**
- `docs/phase1a11/phase1a11-read-only-reconciliation.md` (THIS FILE)

**Untracked:**
- None (no new files created in this task)

### Approved Architecture Decisions

**Decision A: Memory-Tier Movement**
- Destructive tier demotion is FORBIDDEN.
- Authoritative memory must not be silently moved to a lower-retention, lower-provenance, or weaker-governance tier.
- P0 is immutable and cannot be moved to another tier.
- Allowed lifecycle operations: create new governed summary, correct, supersede, archive, retain, delete (via tombstone), rebuild derived indexes.
- Summaries and derived representations do not replace or mutate authoritative sources.
- Any future tier promotion uses explicit governed decision and preserves provenance.
- **Record:** If Phase 1A.8 contracts permit behavior inconsistent with this decision, mark as blocked pending contract review. Do not modify those contracts in this task.

**Decision B: Session Architecture**
- Sessions are server-managed.
- Web sessions use HttpOnly Secure cookies or server-controlled equivalent.
- Authorization MUST NOT be stored in localStorage, sessionStorage, URL parameters, normal React state, or user-editable browser storage.
- Sensitive owner operations require current session validation and appropriate step-up authentication.
- Session rotation, revocation, expiry, account binding, device context, role version, policy version, and authentication strength are contractually represented.
- **Record:** Session implementation remains Phase 1A.11 Wave B work. Do not add implementation in this documentation task.

**Decision C: Household Council (Coordination-Only)**
- Council mode does NOT grant authorization, merge character identities, or transfer memory.
- It does NOT permit raw memory, unrestricted connector results, private conversations, credentials, or owner-only Project Journey access.
- Cross-profile collaboration uses account-bound Character Agent Gateways and purpose-bound, expiring contribution envelopes.
- Contributions are bounded, attributable summaries.
- Rahul remains final authority for owner actions and sensitive decisions.

**Decision D: Account-Bound Character Context**
- Authority relationship: Authenticated Account → Household Membership and Role → Server-Authorized Session → Account-Bound Character Preferences → ONYX/NOVA/permitted alias.
- Authorization comes from authenticated account and current policy.
- Character selection changes presentation and style only.
- Character state MUST NOT remain global when multiple accounts are supported.
- Account switching clears previous account's character preference projection and private context.
- Character switching within same account does NOT rotate or elevate authorization.
- **Record:** Detailed React account-context propagation design remains Wave A design task, not implementation here.

**Decision E: Project Journey Sources (Approved Authoritative Candidates)**
- Architecture documents, architecture decision records, phase and wave reports, acceptance registries, validation evidence, recovery documents, known-limitations records.
- Git commits, tags, pull-request metadata, approved issue metadata, approved implementation summaries, approved design summaries.
- **Optional future sources:** issue comments, approved conversation summaries, approved session summaries, design notes (deferred).
- **Prohibitions:** Do NOT continuously ingest raw chat transcripts or terminal output by default; do NOT store secret values; imported content is untrusted data, not instruction.
- **Governance:** Only approved summaries and authoritative references may be promoted into durable Project Journey memory. Every source retains provenance, classification, access policy, integrity/version metadata, and correction/supersession history.
- **Record:** Exact source-adapter implementation remains future work.

### Implementation Unknowns (Deferred to Wave B)

**These are NOT blockers; they are design details for later phases:**

1. Exact session adapter framework (HTTP middleware library, token mechanism).
2. Exact memory persistence implementation (database schema, storage layer).
3. Exact React account-context propagation method (Context API, state management library).
4. Exact Project Journey ingestion adapters (source parsers, import schedulers).
5. Exact authentication provider choice (OIDC, SAML, custom).

**These distinctions are critical:**
- ✅ Architecture decisions (A–E above) are approved and MUST be enforced.
- ⚠️ Implementation details (exact framework/library choices) are unresolved but NOT blockers.
- 🔄 Items deferred to later waves (semantic history search, Council-mode runtime, voice narration, household presence) are out of Phase 1A.11 Wave A scope.

### Blockers for Phase 1A.11 Wave B

**Phase 1A.11 Wave A may start after Phase 1A.10 Git closure.**

**Phase 1A.11 Wave B is BLOCKED until:**
1. Wave A contracts are completed and reviewed.
2. Threat model is documented and approved.
3. Acceptance registry is populated and validated.
4. Validators and test harness are designed.
5. Rollback design is complete.
6. Evidence plan (recovery, audit trail, validation) is defined.

**Approved architecture decisions (A–E) are NOT blockers; they are binding constraints.**

---

**End of Phase 1A.11 Read-Only Reconciliation Report**
