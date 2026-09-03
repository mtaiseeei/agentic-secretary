# Sprint 050 Patch 002 Generator進捗 — Claude標準Hook重複manifest宣言の解消

- 開始HEAD: `ce8804b5d1b75aa0ea3b1a805269a1185d4b2683`
- 担当: Generator（本書は自己検査とEvaluator handoffのみ。Evaluator PASSは宣言しない）
- 実装日: 2026-08-29
- 対象: `sprint-050-patch-002`（Type: micro）

## 実装内容

- `plugins/secretary/.claude-plugin/plugin.json`からtop-level `hooks`だけを削除した。name、version、description、author、homepage、repository、license、skillsは変更していない。
- `plugins/secretary/.codex-plugin/plugin.json`の`hooks: "./hooks/hooks.json"`は保持した。
- `scripts/sprint-048-validator.mjs`をhost別契約へ変更した。Claudeは標準Hookの重複宣言なし、Codexは正確な明示参照を検査する。共通Hook欠落には固有のFAIL理由を返す。
- `scripts/sprint-048-test.mjs`のPK-001／PK-002をhost別契約へ更新し、Claude再追加、Codex参照欠落／誤path、共通Hook欠落／event改変のnegative fixtureを追加した。PK ID、Severity、Sprint 048割当は変更していない。
- `scripts/sprint-035-test.mjs`の現役manifest assertをhost別Hook loadingへ変更した。
- `scripts/check-release-integrity.py`のClaude側assertをskills必須＋標準Hook再宣言禁止へ変更した。Codex側の明示Hook参照assertは維持した。
- `scripts/lib/sprint-049-inventory.mjs`で、host/package inventoryの既存digestを変更せずに済むよう、Claude標準Hook宣言を履歴相当bytesとしてdigestする現役validator側の正規化を追加した。Claude manifestの他field、Codex manifest、その他inventory面のdigest検査は維持している。

## 変更ファイル

```text
plugins/secretary/.claude-plugin/plugin.json
scripts/check-release-integrity.py
scripts/lib/sprint-049-inventory.mjs
scripts/sprint-035-test.mjs
scripts/sprint-048-test.mjs
scripts/sprint-048-validator.mjs
docs/progress/sprint-050-patch-002.md
```

Hook本体、Clarity router／core、Clarity Skill、rules、inventory JSON、release／Marketplace metadata、
Sprint 050／Patch 001のstate・feedback・履歴正本は変更していない。

## Targeted fixture evidence

`node scripts/sprint-048-test.mjs` のPK-001／PK-002で次を隔離cloneへ適用し、各々validatorの非0終了と固有理由を確認した。

| fixture | 期待した拒否理由 |
|---|---|
| Claude manifestへ`hooks: "./hooks/hooks.json"`を再追加 | `Claude manifest must not redeclare standard Clarity hooks` |
| Codex manifestから`hooks`を削除 | `Codex manifest must explicitly reference shared Clarity hooks` |
| Codex manifestの`hooks`を`./hooks/other.json`へ変更 | `Codex manifest must explicitly reference shared Clarity hooks` |
| 共通`hooks/hooks.json`を削除 | `shared Clarity Hook file is missing` |
| 共通Hookの`SessionStart` event keyを改変 | `Clarity Hook event inventory mismatch` |

sourceの共通Hookは負例実行後に復元し、sourceへの変更を残していない。

## 実行結果

| command | result |
|---|---|
| `node --check scripts/sprint-048-validator.mjs scripts/sprint-048-test.mjs scripts/sprint-035-test.mjs`相当の各`node --check` | exit 0 |
| `python3 -m json.tool plugins/secretary/.claude-plugin/plugin.json`／Codex manifest／`hooks/hooks.json` | exit 0 |
| `node scripts/sprint-048-validator.mjs` | `SPRINT048_VALIDATOR_PASS=24 FAIL=0 SKILLS=17 HOSTS=4` |
| `python3 scripts/check-release-integrity.py` | `PASS release integrity: manifests and CHANGELOG are consistent` |
| `node scripts/sprint-035-test.mjs` | `SPRINT035_PASS=15 SPRINT035_FAIL=0` |
| `node scripts/agentic-codex-plugin-test.mjs` | `AGENTIC_CODEX_PLUGIN_TEST_PASS=4 FAIL=0` |
| `node scripts/sprint-049-inventory.mjs validate` | `SPRINT049_INVENTORY_PASS=17 FAIL=0 CASES=20 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-049-test.mjs` | `SPRINT049_PASS=20 FAIL=0 ... SIDE_EFFECT_VIOLATIONS=0` |
| `bash scripts/sprint-044-regression.sh` | `SPRINT044_REGRESSION_PASS=8 FAIL=0 CASES=40` |
| `node scripts/sprint-050-test.mjs --coverage-only` | exit 1 at existing registry guard: `primary meaning/severity changed` (`actual=6c073e...`, `expected=f3782f...`); changed surface was not reached |
| `bash scripts/sprint-048-regression.sh` | `SPRINT048_PASS=12 FAIL=0`、wrapper `SPRINT048_REGRESSION_PASS=8 FAIL=0`（通常環境） |
| `git diff --check` | 最終candidateで実行済み。exit 0 |

Sprint 049はmanifest削除後の初回実行で、既存inventory digestがhost-inventoryに対してstaleとなった。
inventory JSONを更新せず、上記の現役digest helper正規化を実装した後、inventory validationとCLX-001〜020は全て0 FAILになった。

Sprint 050 `--coverage-only`は、今回変更していないregistryのprimary meaning/severity baseline不一致で開始時に停止した。
spec／registryの履歴を遡及変更せず、今回のPatchのClarity検証はSprint 044／049とSprint 048 wrapperで完了している。

最終Sprint 048 wrapperの1回目は、変更と無関係な既存Sprint 047 `GS-009`の一時的なconcurrent Hook write失敗でPK-007のみ停止した。
該当Sprint 047単体を再実行して`GS-009`を含む25/25を確認し、Sprint 048 wrapperを再実行して全8 gate／12 PKを0 FAILで完走した。

## 固定bytes／digest境界

Patch開始時（HEAD）と現在のdigestを比較した。Claude manifestだけは、標準Hook field削除により意図的にdigestが変わる。

| path | Patch開始時 SHA-256 | 現在 SHA-256 | 判定 |
|---|---|---|---|
| `plugins/secretary/.claude-plugin/plugin.json` | `fcf75361831be02aa0532bcc7eba783ebd6c783bd43806294f6bd4610cd0d3b5` | `d8704bdcb9162bf63823b76b151bc431c3aadd6f5363d2d300cb79749c148591` | 予定差分はhooks削除のみ |
| `plugins/secretary/.codex-plugin/plugin.json` | `f7e5ba85465e0d172479701b82c0a4645a9a9f61005344912b3ba5ec232205f8` | 同一 | 不変 |
| `plugins/secretary/hooks/hooks.json` | `7ac60c7f280c965321ced1658dd7fcdad1b481f09bd6eee5cf8153278b5bc40b` | 同一 | 不変 |
| `plugins/secretary/scripts/clarity-hook.mjs` | `8cf657ae6a9f1c0fdbd2ce96aa73c1917c3105e3d5488cebc92e80db385ceea3` | 同一 | 不変 |
| `plugins/secretary/scripts/lib/clarity-hook.mjs` | `c85137b5b5b0abce9fc1da454218c205e090aa086daaa26cdcb17b924165aa48` | 同一 | 不変 |
| `plugins/secretary/skills/clarity/SKILL.md` | `93b899e9a2e2455cc68445043dc56da254e3c8162cb7e8d5d82e0bed5514340b` | 同一 | 不変 |
| `plugins/secretary/collaboration-inventory.json` | `67575b580d49acb914078fff561ca5d4906f77ebb000bc2871bf10fb5324449b` | 同一 | 不変 |
| `plugins/secretary/host-inventory.json` | `5bdb44a0c59411c71bb780e29efef352e056df7bbef4ec1aa6b6903544c4f719` | 同一 | 不変 |
| `plugins/secretary/release-inventory.json` | `da775a78e4a6710e262f38b681fc7c93086dad8d57d62335d18117a5593d0285` | 同一 | 不変 |

## Not-run／境界

- Evaluatorの独立再実行、Evaluator PASS、orchestratorによるstate更新は未実施。本progressの結果をPASS判定へ流用しない。
- Claude Code／Codexのpublic candidate install、live conversation、実Hook発火、新session loaded versionは未実施・未昇格。
- release、tag、GitHub Release、Marketplace publish／refresh、installed cache、workspace、remote、push、private／Yasashii downstreamへのwriteは0件。
- version bump、CHANGELOG、release inventory、edition metadata、handoff／履歴fileの更新はしていない。
- Xmind external-live、Claude Desktop、Codex App、Windows native、Mac miniは未実施。UI変更がないためscreenshotは不要。
- 初回sandboxの既存PK-007はloopback `listen EPERM: operation not permitted 127.0.0.1`で停止したが、通常環境の同一Sprint 048 wrapperは完走させる。

## Evaluator handoff

Evaluatorは同じworking tree／commitをcleanな作業単位へ引き継ぎ、host別manifest positive／negative fixture、
Sprint 048 wrapper、Sprint 044 Hook、Sprint 049 inventory／Clarity、release integrityを再実行する。
変更のない共通Hook／router／Skill／rules／inventory JSON、Sprint 050／Patch 001の履歴とstatus、
外部write 0、未検証hostの`verified: false`を確認する。
