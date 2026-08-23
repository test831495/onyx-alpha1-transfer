# Phase 1A.8 Deterministic Simulation

This document describes the Wave 4A deterministic in-memory simulation layer for the governed contracts package.

## Scope

The simulation layer deliberately does not execute the scheduler, dispatch tasks, invoke live model providers, touch GitHub, mutate connectors, write memory stores, or affect runtime permissions. It only evaluates the stable contract data, fixed fixtures, and deterministic evidence lineage required to prove that Track A and Track B contracts remain separable and governable under a stable identifier model.

## Simulation invariants

- The active runtime lane limit remains one.
- Promotion remains a one-lane, R4-triggered gate.
- Safety flags remain false throughout the simulation.
- No scenario is allowed to call live actions, write memory, approve itself, or create a real approval.
- The simulation clock advances only through explicit deterministic operations.
- Scenario IDs and fixture IDs are fixed and reproducible across repeated runs.
- Scenario registry entries are closed and stable; duplicates and unknown IDs are rejected.

## Evidence model

The simulation evidence summary stores only deterministic references and digests. It omits secrets, credentials, private P0 content, chain-of-thought, and any unredacted sensitive material. The digest is generated from a stable JSON serialization of the summary fields.

## Execution model

A simulation run creates a fixed start ISO timestamp, a stable run identifier, and a deterministic evidence digest. Every scenario is evaluated as data-only contract logic. A result is recorded as PASS, BLOCKED, or RECONCILIATION_REQUIRED. The result is intentionally non-authoritative and never mutates production state.

## Required scenario groups

The registry covers the required Track A, Track B, UX, and shared governance scenarios, including fail-safe, accessibility, council, and compatibility cases.

## Verification

The simulation test suite is contract-focused and deterministic. It asserts stable identifiers, deterministic digest derivation, scenario registry uniqueness, rejection of prohibited live-action claims, and preserved invariants under repeated execution.
