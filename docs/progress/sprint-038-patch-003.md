# Sprint 038 Patch 003 Progress — Windows native conversation migration temp

## Candidate

- 開始HEAD: `686feb5bdbf54c5711203f708b617c79e538fdb2`
- 開始時working tree: clean
- Fable補正前candidate commit: `18a41825b5b28d9c8519fab94360619b8a35e87a`
- 製品・回帰candidate commit: `77e38d43b378971571b544c1200088fe5fae6360`
- candidate tree: `7c0519a78f3f8c52597a4b93955e01e668222a6f`
- 実行環境: macOS `darwin arm64`、Node.js `v22.23.2`
- Windows native: **NOT-RUN**。ローカルOSが`win32`ではなく、pushしていないため既存Windows Server 2025 workflowも未実行。
- Generator自己評価であり、EvaluatorのPASS判定ではない。

## 実装

### public common core

- `plugins/secretary/scripts/lib/conversation-migration.mjs`
  - `target.split("/")`を廃止し、実行中OSの`basename`／`dirname`でtargetと同じdirectoryのsibling tempを解決する。
  - `openSync(..., "wx", 0o600)`でtempを排他的に作成し、この操作が作成に成功したtempだけをwrite／cleanupする。
  - 初回は現行形式の決定的な排他temp名を`wx`で試し、`EEXIST`のときだけprocess IDとrandom nonceを含む別名へretryする。
  - 開始前から存在する現行candidate temp名を上書き・unlinkせず、実際の作成試行数を結果に返す。
  - tempの完成bytesを`fsyncSync`後にtargetへrenameする。
  - rename前の失敗ではowned tempだけをcleanupし、未変更targetをrollback目的で再書込みしない。
  - rename後の失敗では、元bytesを別の排他的rollback sibling tempへ完成させてからtargetへrenameし、半端な復元writeをtargetへ直接行わない。
  - cleanupまたはrollbackが失敗した場合は`AggregateError`として失敗を表し、migration成功にしない。
  - 明示`rollbackConversationMigration`も同じatomic相当のsibling temp経路へ揃えた。
  - `already-applied`の再実行は`changed: false`、temp作成0回で戻し、targetを再書込みしない。

### 直接回帰と既存gate接続

- `scripts/sprint-038-patch-003-conversation-migration-test.mjs`
  - 修正前のslash限定basename negative。
  - POSIX通常apply、親directory／basename／残存temp、利用者固有の前後bytes。
  - 現行candidate temp完全名のcollision canaryで`openSync(..., "wx")`の`EEXIST`を発生させ、作成試行2回以上、別owned tempでの成功、canaryのhash・mtime・存在保持、owned temp残存0件を因果的に確認する。
  - dry-run、marker片側、旧section複数、ownership不明、stale plan。
  - rename前failure時のtarget mtime不変、owned temp cleanup、失敗後retry。
  - rename後failure時のatomic相当rollback temp、元bytes復元、失敗後retry、成功後の実`already-applied` rerunによるhash・mtime不変とtemp作成0回。
  - 明示rollbackと開始前rollback collision canary。
  - Windows nativeではdrive letter、backslash、空白、日本語の実absolute pathを必須にする`--require-windows`。非Windowsでは対忚caseをFAILに数え、summaryのFAIL 1とexit 1を一致させる。
- `scripts/sprint-038-regression.sh`
  - 専用回帰と構文検査を既存Sprint 038 suiteへ追加した。
- `scripts/sprint-038-test.mjs`
  - 同じcheck内のmanifest期待`0.11.0`と矛盾していたCHANGELOG先頭期待だけを`0.11.0`へ揃えた。test除外・skip・安全期待の緩和はない。
- `.github/workflows/windows-recording-regression.yml`
  - 既存`windows-2025`／Node.js 22 jobへ製品構文検査と
    `node scripts/sprint-038-patch-003-conversation-migration-test.mjs --require-windows`
    を追加した。PR push後に同一candidateをnative Windowsで評価できる。

## 実行結果

### 修正前negative control

修正前HEADの製品fileへ新しい直接回帰だけを載せたGit-free copyで実行した。

```text
node <negative-copy>/scripts/sprint-038-patch-003-conversation-migration-test.mjs
SPRINT038_PATCH003_PASS=4 FAIL=5 OS=darwin WINDOWS_NATIVE=NOT-RUN
PATCH003_NEGATIVE_CONTROL_EXPECTED_FAIL exit=1
```

旧実装は、通常applyのtemp観測、開始前temp collision、rename前target再書込み、rename後atomic復元、明示rollback tempの5点で期待どおりFAILした。

### Fable指摘のnegative control

Fable補正後の専用testだけを前candidate `18a41825b5b28d9c8519fab94360619b8a35e87a`のGit-free copyへ載せた。

```text
node <18a4182-negative-copy>/scripts/sprint-038-patch-003-conversation-migration-test.mjs
SPRINT038_PATCH003_PASS=6 FAIL=3 OS=darwin WINDOWS_NATIVE=NOT-RUN
FABLE_NEGATIVE_18A4182_EXIT=1
```

M1の現行candidate名collisionは`temporaryCreateAttempts > 1`を満たさずFAILし、旧canaryが実際の`EEXIST`を通らないことを検出した。他2 FAILは、新しく固定した初回candidate名とproduct-level `already-applied` no-opが前candidateにないことのnegativeである。

### candidate直接・Sprint 038回帰

```text
node scripts/sprint-038-patch-003-conversation-migration-test.mjs
EEXIST_RETRY_OBSERVED=true TEMP_CREATE_ATTEMPTS=2 CANARY_HASH_UNCHANGED=true CANARY_MTIME_UNCHANGED=true OWNED_TEMP_RESIDUAL=0
SPRINT038_PATCH003_PASS=9 FAIL=0 OS=darwin WINDOWS_NATIVE=NOT-RUN

bash scripts/sprint-038-regression.sh
SPRINT038_PASS=67 SPRINT038_FAIL=0
SPRINT038_PATCH003_PASS=9 FAIL=0 OS=darwin WINDOWS_NATIVE=NOT-RUN
SPRINT038_HISTORICAL_CLASSIFIER_PASS=14 SPRINT038_HISTORICAL_CLASSIFIER_FAIL=0
SPRINT038_HISTORICAL_PATH_PASS=3 SPRINT038_HISTORICAL_PATH_FAIL=0
```

対象wrapper内は合計93 PASS、0 FAIL。専用9 caseは成功、collision、dry-run／ownership、stale、rename前後failure、retry／rerun、明示rollback、native path分岐を含む。

非Windowsで`--require-windows`を実行したnegativeは、`SPRINT038_PATCH003_PASS=8 FAIL=1 OS=darwin WINDOWS_NATIVE=NOT-RUN`、exit 1となり、summaryとprocess exitは一致した。

### 近傍のWindows保存境界・update回帰

```text
node scripts/sprint-038-patch-002-windows-test.mjs
SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0 OS=darwin
```

これはPOSIX上の既存保存境界回帰であり、Windows native PASSには昇格しない。
以下のSprint 025はFable補正前candidateで記録した既知baselineであり、今回の固定safe harbor外のため再実行していない。

```text
bash scripts/sprint-025-regression.sh
SPRINT025_PASS=24 SPRINT025_FAIL=1
```

conversation migrationに関係するdry-run、明示確認後apply、冪等再実行、workspace／plugin rollbackはPASS。FAIL 1件は現行`0.11.0` branchに対し、旧suiteが`0.6.0→0.7.0`診断のcurrent release metadataを固定している既存baseline不一致であり、本Patchでは期待を変更していない。

### master offline（前candidateの既知baseline）

```text
node scripts/master-release-gate.mjs --mode offline --timeout-ms 120000
RELEASE_GATE mode=offline status=fail suites=22 required=22 passed=19 verification-infra=0 failed=3 skipped=0 assertions=376 pass=373 fail=3 infra-fail=0
```

- 本Patchを含む`sprint-038-conversation`、`sprint-038-patch-002-windows-storage`、current release integrityはPASS。
- 既存baselineのSprint 011が1 assertion FAIL。
- 既存Sprint 038 Patch 001が、現行`0.11.0`先頭とClarity hooksに未追随の2 assertions FAIL。
- historical固定commit suiteは設定した120秒でtimeout。無限待ちや再分類は行っていない。
- 上記3 required suiteの未達をmaster全体PASSとは表示しない。本Patch対象suiteの0 FAILと分離する。
- Fable補正candidateでは長時間full masterを再構築せず、専用／Sprint 038関連／Patch 002／Git-free archive相当の固定safe harborを再実行した。

### Git-free archive相当

candidate `77e38d43b378971571b544c1200088fe5fae6360`自身の`git archive`で実行した。

```text
bash <git-free-copy>/scripts/sprint-038-regression.sh
# Sprint 038 base 67、Patch 003 9、classifier 14、path 3: 全件PASS

node <git-free-copy>/scripts/sprint-038-patch-002-windows-test.mjs
SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0 OS=darwin

node <git-free-copy>/scripts/archive-release-gate.mjs --root <git-free-copy>
ARCHIVE_RELEASE_PASS=14 ARCHIVE_RELEASE_FAIL=0
```

一時copyは終了時に削除した。

### 構文・diff

```text
node --check plugins/secretary/scripts/lib/conversation-migration.mjs
node --check scripts/sprint-038-patch-003-conversation-migration-test.mjs
git diff --check
```

すべてexit 0。

## Windows native handoff

Windows nativeはローカルで実行していない。PRへ同一candidateをpushした後、既存workflowの次commandを
Windows Server 2025／Node.js 22で実行する。

```text
node scripts/sprint-038-patch-003-conversation-migration-test.mjs --require-windows
```

必須観測は、40桁candidate SHA `77e38d43b378971571b544c1200088fe5fae6360`、OS／Node、exit、9 caseのPASS／FAIL、drive letter／backslash／空白／日本語target、
targetと同じ親directoryのtemp、開始前collision canary、rename前後rollback、retry／rerun、残存owned temp 0件である。

## 起動・Evaluator向けシナリオ

- 常駐app／URL／UI変更はない。Test URL: N/A。
- 最小起動: `node scripts/sprint-038-patch-003-conversation-migration-test.mjs`
- POSIX回帰: `bash scripts/sprint-038-regression.sh`
- 近傍保存境界: `node scripts/sprint-038-patch-002-windows-test.mjs`
- Git-free archive相当: 上記のGit-free copyでSprint 038 regressionと`archive-release-gate.mjs --root`を実行する。
- EvaluatorはGenerator自己評価を合否根拠にせず、candidate commitを固定して上記を独立実行する。

## 履歴・境界保護

- 公開済みmigration manifest／asset／template fingerprint、version／manifest／CHANGELOG／edition metadata、過去fixture、過去Sprint contract／progress／feedbackの製品bytesは変更していない。
- private `agentic-secretary-my-vault`、実Yasashii repo、installed plugin／cache、利用者workspaceは変更していない。
- network、外部API／service write、push、merge、tag、GitHub Release、Marketplace、install／update、実workspace migrationは0件。
- public独立Evaluator PASS前なので、private版／Yasashii版へ渡すPASS済みSHAや下流対応済みは主張しない。

## 残余リスク

- Windows native jobはNOT-RUN。実際のWindows rename、file lock／共有mode、drive上のfilesystem挙動はworkflow結果待ち。
- CRLFの完全なbyte保持、非UTF-8入力、`MAX_PATH`近傍、Windows固有lock競合、Windows上の`0o600`実効権限は本契約の追加要件にせず、Fable Minorの残余リスクとして保持する。
- 現行実装は既存契約どおり本文をUTF-8として読んでsection置換する。非UTF-8一般化は別scope。
- full master gateには上記の既存baseline 3 suite未達が残る。本Patch対象suiteとGit-free archive相当は0 FAILだが、master全体PASSではない。
