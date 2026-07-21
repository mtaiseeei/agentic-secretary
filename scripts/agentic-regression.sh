#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

passed=0
run() {
  "$@"
  passed=$((passed + 1))
}

run python3 scripts/check-release-integrity.py
run node scripts/sprint-013-chatwork-test.mjs
run node scripts/sprint-019-google-chat-test.mjs
run node scripts/sprint-021-git-safety-test.mjs
run node scripts/sprint-022-safety-test.mjs
run node scripts/sprint-023-security-test.mjs
run node scripts/sprint-024-data-causality-test.mjs
run node scripts/sprint-027-copy-test.mjs
run node scripts/sprint-033-test.mjs
run node scripts/sprint-032-patch-001-readability-test.mjs
run node scripts/agentic-readability-test.mjs
run node scripts/agentic-host-gate.mjs --mode offline

printf 'AGENTIC_REGRESSION_PASS=%s FAIL=0\n' "$passed"
