# Sprint 048 Generator進捗 — public packaging、inventory、fixed handoff準備

- 開始HEAD: `9aaeedf32d7445d00bdaa48c3b0a31e563f306fc`
- Generator: fresh strong tier、Retry 0
- public source candidate: `0.11.0`
- 実装日: 2026-08-28
- 判定範囲: Generator自己検査のみ。EvaluatorのPASS判定を兼ねない。

## 実装したこと

### public packagingとinventory

- Claude／Codex両manifestを`0.11.0`へ揃え、同じ`skills/` treeと`hooks/hooks.json`を明示した。
- Claude marketplaceのcandidate version、17 Skill、Clarity共通Hook、host inventory、release inventoryを実treeへ揃えた。
- Clarity Skillのplugin rootをSKILL実fileから解決する正式契約へ統一し、cwdや未解決placeholderへの依存を除いた。
- `README.md`、公開guide、canonical CHANGELOGへProject Clarity、source candidate段階、Xmind／hostの未検証境界を追加した。
- 過去Sprintで実sourceとずれていたSkill数、version、neutral digest、overlay、response schemaの回帰fixtureを現在の受理済みtreeへ更新した。

`plugins/yasashii-secretary/CHANGELOG.md`はYasashii実装ではなく、既存のlegacy compatibility pathです。release gateがcanonical CHANGELOGとのbyte一致を要求するため同じentryを置きましたが、entry本文は「Agentic先行source candidate」「Yasashii／privateは機能未展開」「fixed handoff後の別Harness待ち」と明記しています。YasashiiのSkill、Hook、manifest、versionは変更していません。

### hostとXmindの正直な状態

- Claude Code Desktop／CLI、Codex App／CLIを別surfaceとし、`status`、`supported`、`verified`、`degraded`、`reason`を分離した。
- 4 surfaceは対応設計であってもcandidate `0.11.0`の実機未検証なので、すべて`verified: false`を維持した。
- Claude Desktop、Codex App、Codex compact後resume SessionStart、Windows native等、Sprint 044から残る実機確認を完了扱いにしていない。
- Xmindはpublic Agentic／Yasashiiが既定OFF、private my-vault候補だけ既定ON。全editionのprovider選択と実検証は未実行である。
- providerはXmind MCPをpriority 1、local nativeをpriority 2にした。local `.xmind`はpreviewと明示承認後だけで、承認なしwriteは0件である。
- 左上緑、右上青、左下黄、右下赤の固定色／配置／意味をrelease inventoryと公開guideへ保持した。

### fixed handoffとpre-write gate

- `adapters/downstream-clarity-handoff.json`にcommon path、adapter seam、excluded path、downstream別protected path、適用順、rollbackを固定した。
- `scripts/sprint-048-handoff.mjs`へtree／common digestとpre-write gateを実装した。
- gateはpublic Evaluator PASS、accepted full SHA、tree digest、file count、common digest、protected digestの一致をすべて要求する。
- positive fixtureでも`writesDownstream: false`を返すだけで、実private／Yasashiiへのwrite機能を持たない。
- protected digest mismatch、excluded漏れ、private／Yasashii path混入、stale SHA、tree mismatch、closed gateをnegative fixtureで拒否した。

accepted SHA／digestはこのGenerator commitより前には確定できず、templateの`acceptedSource`は意図的に`null`、pre-write gateは`closed`である。Generator commit SHAはclean candidateの再現証拠には使うが、正式accepted SHA／digestの固定はSprint 050までの全Evaluator PASS後にOrchestratorが行う。

## 自動検査

### Target Case／registry／Acceptance Criteria

実行command:

```bash
node scripts/sprint-048-test.mjs
```

結果:

```text
SPRINT048_PASS=12 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_PASS=7 CRITICAL_NOT_RUN=0 AC_EXECUTED=6 AC_NOT_RUN=0
```

- exact Target: `PK-001`〜`PK-012`の12件
- inventory negative: missing／extra／staleをすべて検出
- handoff negative: protected／excluded／unsafe path／stale SHA／tree／gateをすべて検出
- target Critical未実行: 0
- Sprint 048 Acceptance Criteria未実行: 0

### strict validator／manifest／release integrity

```bash
node scripts/sprint-048-validator.mjs
# SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4

python3 scripts/check-release-integrity.py
# PASS release integrity: manifests and CHANGELOG are consistent

claude plugin validate plugins/secretary
# Validation passed
```

### Clarity／existing master regression

Sprint 048 target suite内で次を実行した。

```bash
bash scripts/sprint-047-regression.sh
bash scripts/agentic-regression.sh
```

- Sprint 041〜047 Clarity回帰: 0 FAIL
- existing master regression: `AGENTIC_REGRESSION_PASS=15 FAIL=0`
- Sprint 043の外部live `XM-007`は従来どおり`NOT-RUN`。これはSprint 048 Target／Critical／ACの未実行ではなく、未承認の実Xmind MCP確認をoffline PASSへ昇格しないための既知境界である。

## clean checkout／Git-free archive

`scripts/sprint-048-test.mjs`はworking candidateをGit-free treeとclean Git fixtureへ複製し、同一file count／path／mode／bytes digest、`.git`なし、validator、Clarity回帰を確認した。

Generator commit後は、次のread-only candidate gateで実HEADからlocal clean cloneと`git archive`を作る。

```bash
node scripts/sprint-048-candidate-check.mjs
```

このgateは次を同じHEADで確認する。

- source worktree clean
- clean checkoutとGit-free archiveのtree digest／file count／path一致
- archiveに`.git` 0件
- 両treeのvalidator、release integrity、Sprint 041〜047 Clarity回帰0 FAIL
- clean checkoutのexisting master regression 0 FAIL

実Generator commit SHA／tree digest／file countはcommit後のhandoffで報告する。progressへ後書きしてcandidate bytesを変えることはしない。

## 起動／評価handoff

- startup command: なし。plugin source／CLI／validatorのSprintであり常駐appはない。
- test URL: なし。
- main regression: `bash scripts/sprint-048-regression.sh`
- clean/archive evidence: `node scripts/sprint-048-candidate-check.mjs`

Evaluator scenario:

1. clean worktreeからcandidate checkを実行し、出力SHA、tree SHA-256、file count、same bytes、archive Git-freeを記録する。
2. Claude／Codex両manifestとmarketplaceが17 Skill＋共通Hookを同じ物理treeから列挙することを確認する。
3. release／host inventoryを実treeと照合し、missing／extra／stale fixtureが非0終了することを確認する。
4. 4 host surfaceが`verified: false`で、degraded／manual fallbackと混ざらないことを確認する。
5. Xmindのedition default、MCP-first、local明示承認、固定4色／配置を確認する。
6. handoff正例と全negative fixtureを実行し、実downstream treeが変わらないことを確認する。
7. `git diff --check`とrelease integrityを実行する。

## Known issues／未検証

- public `0.11.0`はsource candidateであり、tag、GitHub Release、marketplace publish／refresh、installed cache、new session loaded versionではない。
- private installed `0.10.3`とは別stageであり、source candidate `0.11.0`をprivate installed状態として扱わない。
- Claude Code Desktop／CLI、Codex App／CLIのcandidate実機Hook確認は未実行。特にcompact後resume SessionStartは未完了。
- Windows native、実Xmind MCP、実Xmind App openability、Mac miniは未検証。
- Yasashii／privateへのClarity実装・candidate作成・評価は別Harness待ち。
- accepted SHA／digestは全最終Sprint PASS後のOrchestrator責務。

## 外部／下流副作用

- network: 0
- push／tag／GitHub Release: 0
- marketplace publish／refresh: 0
- installed plugin／cache／new session変更: 0
- private my-vault／Yasashii／Mac mini write: 0
- 実downstream candidate作成／handoff適用: 0
- local `.xmind` write: 0
