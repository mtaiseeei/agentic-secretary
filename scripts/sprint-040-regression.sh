#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/sprint-040-test.mjs
node scripts/sprint-040-inventory-test.mjs
bash scripts/sprint-038-regression.sh
bash scripts/sprint-010-regression.sh
node scripts/sprint-021-git-safety-test.mjs
python3 scripts/check-report-schema.py --plugin-root plugins/secretary
python3 scripts/check-release-integrity.py --root .

printf 'SPRINT040_REGRESSION_PASS=7 SPRINT040_REGRESSION_FAIL=0\n'
