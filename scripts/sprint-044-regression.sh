#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/clarity-hook.mjs
node --check plugins/secretary/scripts/clarity-hook.mjs
node --check plugins/secretary/scripts/lib/clarity-core.mjs
node --check plugins/secretary/scripts/clarity.mjs
python3 -m json.tool plugins/secretary/hooks/hooks.json >/dev/null
python3 -m json.tool plugins/secretary/host-inventory.json >/dev/null
node scripts/sprint-044-test.mjs
bash scripts/sprint-043-regression.sh

printf 'SPRINT044_REGRESSION_PASS=8 FAIL=0 CASES=40\n'
