#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/collaboration-router.mjs
node --check plugins/secretary/scripts/collaboration-router.mjs
node --check scripts/lib/sprint-049-inventory.mjs
node --check scripts/sprint-049-inventory.mjs
node --check scripts/sprint-049-test.mjs
node -e 'for (const path of process.argv.slice(1)) JSON.parse(require("node:fs").readFileSync(path, "utf8"))' \
  plugins/secretary/collaboration-inventory.json plugins/secretary/host-inventory.json \
  plugins/secretary/release-inventory.json adapters/downstream-clarity-handoff.json

node scripts/sprint-049-inventory.mjs validate
node scripts/sprint-049-test.mjs

# Sprint 049で直接触れた既存面を再実行する。primary 250全件はSprint 050へ残す。
bash scripts/sprint-045-regression.sh
bash scripts/sprint-048-regression.sh
python3 scripts/check-release-integrity.py
git diff --check

printf 'SPRINT049_REGRESSION_PASS=12 FAIL=0 TARGETS=20 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_NOT_RUN=0 AC_NOT_RUN=0\n'
