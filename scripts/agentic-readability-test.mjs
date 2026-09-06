#!/usr/bin/env node
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  lineKinds,
  loadConversationContract,
  parseBlocks,
  usesFixedThreeSchema,
  validateScenario,
} from "./lib/sprint-032-patch-001-conversation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contract = loadConversationContract(root);
let pass = 0;

function check(label, callback) {
  callback();
  pass += 1;
  process.stdout.write(`PASS ${label}\n`);
}

function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

const responses = {
  "short-answer": "はい。`agentic-secretary` のoffline検査は構造だけを確認し、hostのlive PASSには昇格させません。",
  "complex-question": [
    "結論として、offline検査とlive検査は別のgateです。offline検査はadapterと共通coreの構造を確認します。",
    "live検査ではhostごとに次を確認します。",
    "- 実際の導入とrules／skillsの読込",
    "- 実会話、wizard、workspace境界、secret非露出",
    "- host固有回帰とofficial validator（存在する場合）",
    "1 hostのPASSは他hostへ流用しません。",
  ].join("\n\n"),
  "completion-report": "host result schemaを厳格化し、`node scripts/sprint-033-test.mjs` は0 FAILでした。\n\n4 hostはlive未実行のため `external-live-gate-unavailable` のままです。",
  "status-report": "Retry 1のlocal修正を実装中で、releaseと可読性の単独検査はPASSです。\n\nfull regressionとarchive gateを続けます。",
  diagnosis: [
    "`node scripts/agentic-host-gate.mjs --mode offline` が入力を拒否しました。原因候補は次の2つです。",
    "- `runner` がhost adapterと一致していない",
    "  - error: `host codex-cli runner mismatch`",
    "  - 対応: `adapters/codex-cli/adapter.json` のrunnerを使います",
    "- sanitized evidenceが不足している",
    "  - error: `sanitized must be true`",
    "  - 対応: secret値を除いたcheck別evidenceを記録します",
  ].join("\n"),
  "developer-handoff": [
    "再現条件と観測結果は次のとおりです。",
    "- 再現command: `node scripts/agentic-host-gate.mjs --mode offline --evidence <path>`",
    "- 関連path: `scripts/lib/agentic-hosts.mjs`",
    "- 観測error: `PASS is forbidden outside an approved live runner`",
    "- evidence: exit status 1、verified host 0件",
    "残課題は、個別承認後に対象hostでlive driverを実行することです。",
  ].join("\n\n"),
  "partial-failure": [
    "12 checksのうち10件はPASS、2件は未完了です。",
    "- PASS: distribution formatとlocal regressionを含む10件",
    "- 未完了: fresh install、wizardの実host表示",
    "  - 理由: host導入の個別承認がありません",
    "- 影響: このhostを対応済みへ昇格できません",
    "次の操作は、対象hostとcleanupを示して個別承認を得ることです。",
  ].join("\n\n"),
};

check("active edition style and copy resolve to agentic", () => {
  assert.equal(contract.styleKey, "agentic-style");
  assert.equal(contract.styleRule.copy, "copy/agentic.json");
  assert.deepEqual(contract.labels, ["やったこと", "結果", "次に何が起きるか"]);
});

check("all Agentic user-facing copy is Japanese while formal names remain", () => {
  const values = strings(contract.copy);
  assert(values.every((value) => /[ぁ-んァ-ヶ一-龠]/.test(value)), "every user-facing copy value must contain Japanese explanation");
  const serialized = JSON.stringify(contract.copy);
  for (const term of ["UNVERIFIED", "command", "path", "error", "evidence"]) assert(serialized.includes(term), `missing formal term: ${term}`);
  assert.equal(contract.copy.surfaces.conversation.decisionConfirmation, undefined);
  assert.equal(contract.copy.surfaces.conversation.explicitMemory, "明示された内容をmemoryへ1回保存し、内部分類と保存先を結果で示す");
});

for (const kind of Object.keys(responses)) {
  check(`Agentic ${kind} response satisfies the active Markdown contract`, () => {
    assert.deepEqual(validateScenario(kind, responses[kind], contract).problems, []);
  });
}

check("completion and status reports do not restore the legacy fixed schema", () => {
  for (const kind of ["completion-report", "status-report"]) {
    assert.equal(usesFixedThreeSchema(responses[kind], contract.labels), false);
    assert.equal(lineKinds(responses[kind]).includes("bullet"), false);
  }
});

check("general, diagnosis, handoff, and partial failure preserve readable Markdown", () => {
  assert(parseBlocks(responses["complex-question"]).length >= 3);
  assert(lineKinds(responses.diagnosis).includes("nested"));
  assert(lineKinds(responses["developer-handoff"]).filter((kind) => kind === "bullet").length >= 4);
  assert(parseBlocks(responses["partial-failure"]).length >= 3);
});

check("negative Agentic conversations are rejected", () => {
  const collapsed = "offline検査は構造を確認します。live検査はhostを確認します。1 hostのPASSは流用しません。未検証なら対応済みにしません。";
  assert.equal(validateScenario("complex-question", collapsed, contract).ok, false);
  assert.equal(validateScenario("completion-report", "- schemaを修正しました\n- testはPASSです\n- live gateは未実施です", contract).ok, false);
  assert.equal(validateScenario("developer-handoff", "commandとpathとerrorを確認してください。", contract).ok, false);
});

process.stdout.write(`AGENTIC_READABILITY_PASS=${pass} FAIL=0\n`);
