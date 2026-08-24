# Phase 1A.11 Wave B3 Idea Acceptance Registry

Title: Phase 1A.11 Wave B3 Idea Acceptance Registry
Version: wave-b3-1.2
Date: 2026-08-24
Owner: Rahul
Status: Local deterministic acceptance registry and validator
Intended audience: Rahul and implementation reviewers

## Purpose

Document all Idea Wave B3 acceptance IDs, statuses, test mappings, and evidence mappings without over-claiming deferred behavior.

## What this means for the user

Every accepted requirement has explicit contract/policy/test evidence, and deferred UI/runtime items remain honestly marked as deferred or not implemented.

## Friendly presentation

The registry uses stable IDs and clear status labels so reviewers can trace each requirement to evidence quickly.

## Technical Information behavior

Technical mapping details are review artifacts and never authorization.

## ID families and totals

- IDEA-001 through IDEA-020: 20
- IDEA-UX-001 through IDEA-UX-020: 20
- IDEA-LIFE-001 through IDEA-LIFE-010: 10
- IDEA-PRE-001 through IDEA-PRE-015: 15
- Total: 65

## Allowed statuses

- CONTRACT_DEFINED
- POLICY_VALIDATED
- DETERMINISTICALLY_TESTED
- RUNTIME_DEFERRED
- UI_DEFERRED
- NOT_IMPLEMENTED

## Implemented contracts

- deterministic registry structure and category counts
- deterministic validator for exact IDs, uniqueness, status validity, mapping integrity, evidence presence, and deferral preservation
- explicit test-manifest mapping for deterministic-policy and deterministic-tested entries

## Security and privacy

Acceptance entries are evidentiary and cannot grant authority. Registry logic does not authorize Git, deployment, connectors, permissions, secrets, budgets, cloud actions, or external actions.

## Honest deferrals and non-implemented scope

Current wave does not implement:

- visual Idea Review Center
- attachment ingestion runtime
- voice processing runtime
- autonomous Product Manager runtime
- specialist-agent runtime
- Council runtime
- Character Agent Gateway runtime
- automatic roadmap updates
- code generation from Ideas
- Git automation
- deployment automation
- connector action runtime
- budget elevation runtime
- cloud mutation runtime

## Actual validation command and result

- pnpm --dir packages/phase1a11-idea-governance-foundation test: PASS (includes registry validator tests)

## Failure behavior

Validation fails on missing IDs, unexpected IDs, duplicate IDs, unsupported statuses, missing required mappings, missing evidence mappings, unknown test files/assertions, or deferred-status drift.

## Recovery and rollback

Correct the failing acceptance entries or test manifest and rerun focused package tests.

## Limitations

This registry validates local deterministic evidence only; it is not production runtime activation.

## Acceptance references

All 65 IDs in the four families above.

## Next safe step

Rahul reviews the registry mappings and evidence before including Wave B3 closure evidence.
