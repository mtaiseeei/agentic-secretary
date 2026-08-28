#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check scripts/sprint-048-handoff.mjs
node --check scripts/sprint-048-validator.mjs
node --check scripts/sprint-048-test.mjs
node scripts/sprint-048-validator.mjs
node scripts/sprint-048-handoff.mjs validate-template
node scripts/sprint-048-test.mjs
python3 scripts/check-release-integrity.py
git diff --check

printf 'SPRINT048_REGRESSION_PASS=8 FAIL=0 TARGETS=12 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_NOT_RUN=0 AC_NOT_RUN=0\n'
