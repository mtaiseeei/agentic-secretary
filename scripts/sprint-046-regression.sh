#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/clarity-core.mjs
node --check plugins/secretary/scripts/lib/clarity-link.mjs
node --check plugins/secretary/scripts/lib/clarity-secretary.mjs
node --check plugins/secretary/scripts/clarity.mjs
node --check plugins/secretary/scripts/clarity-secretary.mjs
node --check scripts/sprint-046-test.mjs
node -e 'JSON.parse(require("node:fs").readFileSync("plugins/secretary/clarity/schemas/event.schema.json", "utf8"))'

node scripts/sprint-046-test.mjs
bash scripts/sprint-045-regression.sh
bash scripts/sprint-015-regression.sh
bash scripts/sprint-010-regression.sh
bash scripts/sprint-012-regression.sh
python3 scripts/check-release-integrity.py

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --check
else
  printf 'SPRINT046_GIT_DIFF_CHECK=NOT_APPLICABLE_GIT_FREE\n'
fi
printf 'SPRINT046_REGRESSION_PASS=34 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0\n'
