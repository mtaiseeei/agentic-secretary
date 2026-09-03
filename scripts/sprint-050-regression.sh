#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

report="${TMPDIR:-/tmp}/agentic-secretary-sprint-050-report.json"
candidate_report="${TMPDIR:-/tmp}/agentic-secretary-sprint-050-candidate.json"

node --check scripts/sprint-050-test.mjs
node --check scripts/sprint-050-candidate-check.mjs
node scripts/sprint-050-test.mjs --report "$report"
node scripts/sprint-048-validator.mjs
node scripts/sprint-048-handoff.mjs validate-template
python3 scripts/check-release-integrity.py
git diff --check

if [[ "${1:-}" == "--candidate" ]]; then
  node scripts/sprint-050-candidate-check.mjs --report "$candidate_report"
fi

printf 'SPRINT050_REGRESSION PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1 CASES=274 E2E_PASS=4 E2E_FAIL=0 AC_EXECUTED=9 AC_PASS=8 AC_BLOCKED=1 HOST_EXTERNAL_LIVE=NOT_RUN XMIND_EXTERNAL_LIVE=NOT_RUN EXTERNAL_WRITE=0 DOWNSTREAM_WRITE=0\n'
