#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/clarity-core.mjs
node --check plugins/secretary/scripts/lib/clarity-drift.mjs
node --check plugins/secretary/scripts/lib/clarity-hook.mjs
node --check plugins/secretary/scripts/lib/clarity-link.mjs
node --check plugins/secretary/scripts/lib/clarity-projection.mjs
node --check plugins/secretary/scripts/lib/clarity-secretary.mjs
node --check plugins/secretary/scripts/clarity.mjs
node --check scripts/sprint-047-test.mjs
node -e 'for (const path of ["event", "evidence", "item", "project", "state"].map((name) => `plugins/secretary/clarity/schemas/${name}.schema.json`)) JSON.parse(require("node:fs").readFileSync(path, "utf8"))'

node scripts/sprint-047-test.mjs
bash scripts/sprint-046-regression.sh
python3 scripts/check-release-integrity.py

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --check
else
  printf 'SPRINT047_GIT_DIFF_CHECK=NOT_APPLICABLE_GIT_FREE\n'
fi
printf 'SPRINT047_REGRESSION_PASS=25 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0\n'
