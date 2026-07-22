#!/usr/bin/env bash

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0
check() {
  local label="$1"
  shift
  if "$@"; then PASS=$((PASS + 1)); printf 'PASS %s\n' "$label"
  else FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$label" >&2
  fi
}

check "Patch専用IME／検索回帰" node "$ROOT/scripts/sprint-035-patch-001-ime-test.mjs"
check "共有wizard構文" node --check "$ROOT/plugins/secretary/skills/chatwork/assets/wizard/common.js"
check "Chatwork wizard構文" node --check "$ROOT/plugins/secretary/skills/chatwork/assets/wizard/app.js"
check "Google Chat wizard構文" node --check "$ROOT/plugins/secretary/skills/google-chat/assets/wizard/app.js"
check "Chatwork既存回帰" bash "$ROOT/scripts/sprint-013-regression.sh"
check "Google Chat既存回帰" bash "$ROOT/scripts/sprint-019-regression.sh"
check "共通wizard browser式回帰" node "$ROOT/scripts/sprint-027-browser-expression-test.mjs"
check "edition境界回帰" node "$ROOT/scripts/sprint-033-test.mjs"
check "差分整形" git -C "$ROOT" diff --check

printf 'SPRINT035_PATCH001_REGRESSION_PASS=%s SPRINT035_PATCH001_REGRESSION_FAIL=%s\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
