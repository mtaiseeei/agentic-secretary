#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/scripts/sprint-039-patch-001-test.mjs"
node --check "$ROOT/plugins/secretary/scripts/lib/safe-git.mjs"
node --check "$ROOT/plugins/secretary/scripts/lib/secretary-rename.mjs"
node --check "$ROOT/plugins/secretary/scripts/secretary-name.mjs"
bash "$ROOT/scripts/sprint-039-regression.sh"
node "$ROOT/scripts/sprint-021-git-safety-test.mjs"
node "$ROOT/scripts/agentic-codex-plugin-test.mjs" --root "$ROOT"
python3 "$ROOT/scripts/check-report-schema.py" --plugin-root "$ROOT/plugins/secretary"
python3 "$ROOT/scripts/check-release-integrity.py" --root "$ROOT"
printf 'PASS=9 FAIL=0\n'
