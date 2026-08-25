#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

YASASHII_SOURCE="${SPRINT040_YASASHII_SOURCE:-$ROOT/../yasashii-secretary}"
PRIVATE_SOURCE="${SPRINT040_PRIVATE_SOURCE:-$ROOT/../agentic-secretary-my-vault}"
CANDIDATE_PARENT="$(mktemp -d "${TMPDIR:-/tmp}/sprint-040-candidates.XXXXXX")"
CANDIDATES="$CANDIDATE_PARENT/candidates"
trap 'rm -rf "$CANDIDATE_PARENT"' EXIT

yasashii_head_before="$(git -C "$YASASHII_SOURCE" rev-parse HEAD)"
yasashii_status_before="$(git -C "$YASASHII_SOURCE" status --short)"
private_head_before="$(git -C "$PRIVATE_SOURCE" rev-parse HEAD)"
private_status_before="$(git -C "$PRIVATE_SOURCE" status --short)"

node scripts/sprint-040-candidate-build.mjs \
  --public-root "$ROOT" \
  --yasashii-source "$YASASHII_SOURCE" \
  --private-source "$PRIVATE_SOURCE" \
  --output "$CANDIDATES"
node scripts/sprint-040-inventory-test.mjs --candidate-report "$CANDIDATES/candidate-report.json"

for edition in agentic yasashii private-my-vault; do
  bash "$CANDIDATES/$edition/scripts/sprint-040-candidate-suite.sh" "$edition"
done

test "$(git -C "$YASASHII_SOURCE" rev-parse HEAD)" = "$yasashii_head_before"
test "$(git -C "$YASASHII_SOURCE" status --short)" = "$yasashii_status_before"
test "$(git -C "$PRIVATE_SOURCE" rev-parse HEAD)" = "$private_head_before"
test "$(git -C "$PRIVATE_SOURCE" status --short)" = "$private_status_before"

node -e 'const r=require(process.argv[1]); for (const x of r.candidates) console.log(`SPRINT040_FINAL_${x.id.toUpperCase().replaceAll("-","_")}_CANDIDATE=${x.candidate.sha256}`)' "$CANDIDATES/candidate-report.json"

printf 'SPRINT040_REGRESSION_PASS=3_EDITIONS SPRINT040_REGRESSION_FAIL=0\n'
