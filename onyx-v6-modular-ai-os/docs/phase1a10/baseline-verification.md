# Phase 1A.10 Baseline Verification

## Repository

- Repository: `test831495/onyx-alpha1-transfer`
- Working tree: clean at verification time.
- Verification scope: local Git repository state and tag provenance only.

## Branch and HEAD

- Current branch: `phase1a10-mainline-stabilization`
- HEAD: `1a8edf54cbb05b338532c7ea3f01c14cfbe44556`
- `main`, `origin/main`, and `origin/HEAD` resolve to the same HEAD commit.

## Tag Verification

| Tag | Tag object | Resolved commit | Result |
| --- | --- | --- | --- |
| `phase1a9-merged-main` | `3f9232aacde98124f0ef010c5ee0b5931d5f6704` | `1a8edf54cbb05b338532c7ea3f01c14cfbe44556` | Verified |
| `onyx-phase1a9-production-checkpoint` | `f4351d9f5bdd4338e7836ee4e0ea8e30de435451` | `1a8edf54cbb05b338532c7ea3f01c14cfbe44556` | Verified |

Both tags are annotated tags and both resolve exactly to HEAD. Each tag is an ancestor of HEAD; because they resolve to the same commit, each is also an ancestor of the other.

## Governance Observations

- This is a repository-state audit and evidence capture only.
- No production configuration, application code, permissions, secrets, scheduler state, or promotion state was changed or activated.
- The production checkpoint tag is treated as provenance evidence, not as authorization to execute production actions.
- Scheduler activation and promotion remain outside this Wave A verification.

## Validation Outcome

**PASS**

The repository was clean, the current branch and HEAD were recorded, both required tags were present and resolved to the exact HEAD commit, and tag ancestry was verified locally. No production or application behavior was exercised.