#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ -z "${PHASE1A4D_LIVE_CONFIRMATION-}" ]]; then
	printf '%s\n' 'PHASE1A4D_LIVE_CONFIRMATION must be supplied externally.' >&2
	exit 1
fi

pnpm --filter @onyx/phase1a4d-draft-pr-bridge live-draft-pr
