#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

export PHASE1A4D_LIVE_CONFIRMATION="APPROVE_PHASE1A4D_SINGLE_DRAFT_PR"

node --experimental-strip-types packages/phase1a4d-draft-pr-bridge/src/live-draft-pr.ts
