# Role and Permission Catalog

- Version: 1.0.0
- Date: 2026-08-23
- Owner: Rahul Kumar
- Status: Phase 1A.11 Wave A Contract Freeze
- Implementation status: Contract-only, runtime disabled
- Intended audience: architects, designers, reviewers, policy stakeholders

## Purpose

This catalog defines the household role model and the deny-by-default decision pattern for Phase 1A.11. It is a contract description only and does not claim runtime enforcement.

## What this means for the user

The user sees consistent access boundaries without unexpected privilege changes. A role may grant access only when the account, resource, purpose, session assurance, policy version, and audit conditions all match.

## Current state

The current state is a validated contract model for household roles and permissions. It is not a live role engine.

## Wave A contract state

Allowed role concepts in the contract are:

- Primary Owner
- Household Administrator
- Family Member
- Supervised Member
- Guest
- Device or Service Identity

Access is granted by explicit policy and not by assumptions, client state, or memory state.

## Key decisions

- Deny-by-default remains the core rule.
- Role and permission are distinct concepts.
- Access requires valid account, role, session freshness, policy version, and purpose.
- Character identity never substitutes for authorization.
- Council agreement never creates permissions.

## Normal user experience

Ordinary users see friendly labels and controlled access. They do not see a raw policy matrix or internal authorization logic in normal presentation.

## Technical Information behavior

Technical Information exposure is only allowed when policy, account, role, and resource conditions are satisfied. It never creates customer-visible permissions or reveals credentials.

## Privacy and security boundaries

Permissions are bound to an account and resource. Shared resources require explicit grant and purpose limitation. Household membership does not grant access to owner history or private metadata.

## Validation approach

The contract is validated through focused tests that check deny-by-default behavior, stale policy rejection, missing session assurance rejection, and owner-only access rules.

## Failure behavior

If any required condition is absent, the request is denied. The user sees safe refusal and preserved work. Recovery requires explicit policy review and valid evidence, not silent fallback.

## Recovery and rollback

Rollback is policy-only. It must preserve the existing evidence trail and avoid broadening authorization. It does not rewrite protected history or silently restore deleted memory.

## Known limitations

- no live role engine exists
- no runtime permission enforcement exists
- no production account model exists
- no live audit service exists

## Representative scenarios

Permitted example: Rahul, as the Primary Owner, accesses owner-only historical detail under valid session assurance and policy state.

Denied example: a guest or non-owner account attempts to retrieve owner-only Project Journey detail or connector metadata.

## Acceptance references

This catalog aligns with the accepted roles, permissions, and deny-by-default requirements in the Phase 1A.11 registry.

## Next safe step

Future implementation should map these contracts to a server-managed authorization service only after the policy and acceptance model remain unchanged.
