#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/clarity-core.mjs
node --check plugins/secretary/scripts/lib/clarity-projection.mjs
node --check plugins/secretary/scripts/clarity.mjs
node scripts/sprint-043-test.mjs
bash scripts/sprint-042-regression.sh
bash scripts/sprint-041-regression.sh

printf 'SPRINT043_REGRESSION_PASS=6 FAIL=0 CASES=30 EXTERNAL_LIVE_NOT_RUN=1\n'
