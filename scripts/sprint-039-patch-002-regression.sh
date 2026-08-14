#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run() {
  local label="$1"
  shift
  printf '== %s ==\n' "$label"
  "$@"
}

run "Sprint 039 Patch 002 identity migration" node scripts/sprint-039-patch-002-test.mjs
run "Sprint 039 Patch 001 rename checkpoint" bash scripts/sprint-039-patch-001-regression.sh
run "safe Git and secret scan" node scripts/sprint-021-git-safety-test.mjs
run "formal Codex plugin" node scripts/agentic-codex-plugin-test.mjs --root .
run "report schema" python3 scripts/check-report-schema.py --plugin-root plugins/secretary
run "release integrity" python3 scripts/check-release-integrity.py --root .

printf 'SPRINT039_PATCH002_REGRESSION_PASS=6 FAIL=0\n'
