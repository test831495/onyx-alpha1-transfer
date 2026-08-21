#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
pnpm --filter @onyx/phase1a4c-push-bridge exec tsx src/live-push.ts
