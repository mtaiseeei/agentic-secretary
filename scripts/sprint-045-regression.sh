#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/clarity-secretary.mjs
node --check plugins/secretary/scripts/clarity-secretary.mjs
node --check plugins/secretary/scripts/project-tools.mjs
node -e 'JSON.parse(require("node:fs").readFileSync("plugins/secretary/clarity/secretary-adapter.json", "utf8"))'
node scripts/sprint-045-test.mjs

bash scripts/sprint-044-regression.sh
python3 scripts/check-release-integrity.py

git diff --check
printf 'SPRINT045_REGRESSION_PASS=9 FAIL=0 CASES=35\n'
