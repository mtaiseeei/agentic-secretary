#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"

node --check plugins/secretary/scripts/lib/clarity-core.mjs
node --check plugins/secretary/scripts/clarity.mjs
node -e 'const fs=require("node:fs"); for (const path of fs.readdirSync("plugins/secretary/clarity/schemas")) JSON.parse(fs.readFileSync(`plugins/secretary/clarity/schemas/${path}`, "utf8"));'
node scripts/sprint-042-test.mjs

printf 'SPRINT042_REGRESSION_PASS=4 FAIL=0 CASES=35\n'
