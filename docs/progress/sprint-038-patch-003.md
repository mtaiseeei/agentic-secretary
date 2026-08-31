# Sprint 038 Patch 003 Progress — Windows native conversation migration temp

## Candidate

- 開始HEAD: `686feb5bdbf54c5711203f708b617c79e538fdb2`
- 開始時working tree: clean
- Fable補正前candidate commit: `18a41825b5b28d9c8519fab94360619b8a35e87a`
- 製品・回帰candidate commit: `77e38d43b378971571b544c1200088fe5fae6360`
- candidate tree: `7c0519a78f3f8c52597a4b93955e01e668222a6f`
- Windows live確認前candidate: `a75e12c18cc25b72c84efdda07b631536f965ed4`
- inventory補正candidate commit: `4840481c1cebda52d92aa632be2ae3c4ce452adc`
- inventory補正candidate tree: `1fd332e700e22e412eb75552832098b2429c4928`
- 実行環境: macOS `darwin arm64`、Node.js `v22.23.2`
- Windows native: **前candidateだけ部分証拠あり／補正candidateはNOT-RUN**。run `33414883114`は`a75e12c18cc25b72c84efdda07b631536f965ed4`を実行し、Patch 003専用9／9、Patch 002 12／12、製品構文をPASSしたが、HS-016のinventory staleでjob全体はFAILした。`4840481c1cebda52d92aa632be2ae3c4ce452adc`はpushしておらず、Windows nativeを未実行である。
- Generator自己評価であり、EvaluatorのPASS判定ではない。

## Windows run 33414883114とinventory補正

GitHub Actions `Windows recording regression` run `33414883114`／job `99563042214`をread-onlyで照合した。

- exact head: `a75e12c18cc25b72c84efdda07b631536f965ed4`
- environment: Windows Server 2025 `10.0.26100`、Node.js `v22.23.2`
- Node-native syntax: PASS
- Patch 002: `SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0 OS=win32`
- Patch 003: `SPRINT038_PATCH003_PASS=9 FAIL=0 OS=win32 WINDOWS_NATIVE=RUN`
- Patch 003の因果観測: `EEXIST_RETRY_OBSERVED=true`、`TEMP_CREATE_ATTEMPTS=2`、canary hash／mtime不変、owned temp残存0件
- Clarity Patch 004: HS-001〜015 PASS、HS-016だけ`inventory-digest-stale:clarity-harness-scanner`でFAIL。合計15 PASS／1 FAIL、`windowsVerified=false`
- Clarity Patch 005: 直前stepの停止により未実行

run全体はFAILであり、Patch 003／Patch 002の部分証拠を補正candidateのWindows PASSや全workflow PASSへ昇格しない。

`clarity-harness-scanner`が宣言する6 pathを`digestSurface`で再計算した結果、保存値
`13023cb52e570bdcc15953b45137b7e679ae606b11c182f891d54997e5b103d3`に対し、観測値は
`3695fd60161c972e4b62474ffc18d3779aa7a21d521825f851e31d17aec89432`だった。workflow変更後のbytes／modeへ追随していない
coordination inventory設定値だけが原因である。

補正は`plugins/secretary/collaboration-inventory.json`の当該`contentDigest` 1件だけである。paths、role、edition、tests、markers、
delegation、noTouch、case意味、threshold、製品runtime、conversation migration、workflowは変更していない。

このGenerator roundの実装diffは、製品コード0行の**検証コード／coordination inventory設定だけ**である。製品機能を追加・変更せず、
progressを除くtracked差分は上記digest 1行だけとした。

## inventory補正candidateの再検証

### source checkout

| Command | Result |
|---|---|
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS／0 FAIL／4 NOT-RUN、HS-016 PASS、external write／network 0、`windowsVerified=false` |
| `node scripts/sprint-049-inventory.mjs validate` | 20 PASS／0 FAIL、67 cases、markers／digests valid |
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9 PASS／0 FAIL、`WINDOWS_NATIVE=NOT-RUN`、EEXIST retry 2回、canary不変、owned temp残存0 |
| `bash scripts/sprint-038-regression.sh` | base 67／0、Patch 003 9／0、historical classifier 14／0、historical path 3／0 |
| `node scripts/sprint-038-patch-002-windows-test.mjs` | 12 PASS／0 FAIL（darwin。Windows nativeへ昇格しない） |
| `node scripts/sprint-050-patch-005-test.mjs` | 8 PASS／1 FAIL／1 NOT-RUN。SR-009関連回帰はPASS。SR-001だけ、正本Current IDが本PatchのためPatch 005またはTBDを要求する履歴固定assertと不一致 |

Patch 005のSR-001はdigest、Clarity runtime、Secret redaction、関連回帰の失敗ではない。正本stateを変更せず、Git-free一時fixtureの
Current IDだけを`Sprint 050 Patch 005`へ戻した同一製品bytesでは9 PASS／0 FAIL／1 NOT-RUNとなった。これはfixture整合の補助証拠であり、
exact candidateの全suite PASSやWindows PASSとして数えない。

### Git-free archive相当

`4840481c1cebda52d92aa632be2ae3c4ce452adc`の`git archive`を`.git`なしの一時directoryへ展開し、次を確認した。

- Patch 004: 12 PASS／0 FAIL／4 NOT-RUN、HS-016 PASS
- inventory validate: 20 PASS／0 FAIL、67 cases、markers／digests valid
- Patch 003: 9 PASS／0 FAIL、Windows native NOT-RUN
- Sprint 038関連: 67／0、9／0、14／0、3／0
- Patch 002: 12 PASS／0 FAIL（darwin）
- archive release gate: 14 PASS／0 FAIL
- Patch 005 exact archive: sourceと同じ8 PASS／1 FAIL／1 NOT-RUN。Current ID fixtureでは9 PASS／0 FAIL／1 NOT-RUN

### 構文・差分

`node --check`でinventory validator、Patch 004／005 test、conversation migration、Patch 003専用testを確認し、すべてexit 0。
`git diff --check a75e12c18cc25b72c84efdda07b631536f965ed4..4840481c1cebda52d92aa632be2ae3c4ce452adc`もexit 0。
inventory補正commitは1 file、1 insertion／1 deletionで、変更fieldは`clarity-harness-scanner.contentDigest`だけである。

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

補正candidateはWindows nativeで実行していない。run `33414883114`は前headのPatch 003／Patch 002部分証拠であり、
inventory補正後の全workflow PASSではない。次のexternal live gateでは、補正commitを含むexact headを固定して既存workflowを
Windows Server 2025／Node.js 22で再実行する。

```text
node --check plugins/secretary/scripts/lib/conversation-migration.mjs
node scripts/sprint-038-patch-002-windows-test.mjs --require-windows
node scripts/sprint-038-patch-003-conversation-migration-test.mjs --require-windows
node scripts/sprint-050-patch-004-test.mjs --require-windows
node scripts/sprint-050-patch-005-test.mjs --require-windows
```

必須観測は、補正commit `4840481c1cebda52d92aa632be2ae3c4ce452adc`を含む40桁exact head、OS／Node、各stepのexit／集計、
Patch 003の9 case、Patch 002の12 case、Patch 004の16 case、Patch 005の10 case、inventory digest validである。
Patch 005は現在の正本Current IDに依存するSR-001を含むため、再runでの実結果をそのまま記録し、fixture PASSへ置換しない。

## 起動・Evaluator向けシナリオ

- 常駐app／URL／UI変更はない。Test URL: N/A。
- inventory確認: `node scripts/sprint-049-inventory.mjs validate`
- Clarity近傍: `node scripts/sprint-050-patch-004-test.mjs`、`node scripts/sprint-050-patch-005-test.mjs`
- 最小起動: `node scripts/sprint-038-patch-003-conversation-migration-test.mjs`
- POSIX回帰: `bash scripts/sprint-038-regression.sh`
- 近傍保存境界: `node scripts/sprint-038-patch-002-windows-test.mjs`
- Git-free archive相当: 上記のGit-free copyでSprint 038 regressionと`archive-release-gate.mjs --root`を実行する。
- EvaluatorはGenerator自己評価を合否根拠にせず、candidate commitを固定して上記を独立実行する。

## 履歴・境界保護

- 公開済みmigration manifest／asset／template fingerprint、version／manifest／CHANGELOG／edition metadata、過去fixture、過去Sprint contract／progress／feedbackの製品bytesは変更していない。
- private `agentic-secretary-my-vault`、実Yasashii repo、installed plugin／cache、利用者workspaceは変更していない。
- 今回roundのnetworkは既存GitHub Actions runのread-only取得だけ。外部API／service write、push、merge、tag、GitHub Release、Marketplace、install／update、実workspace migrationは0件。
- public独立Evaluator PASS前なので、private版／Yasashii版へ渡すPASS済みSHAや下流対応済みは主張しない。

## 残余リスク

- 補正candidateのWindows native jobはNOT-RUN。前headのPatch 003 9／9を再利用せず、inventory補正後exact headのworkflow再runが残る。
- このinventory補正round時点では、正本Current IDとPatch 005 SR-001の履歴固定条件が不一致だった。後続の「Windows workflow向け履歴検証のライフサイクル補正」で、state／case意味を変えずに解消した。
- CRLFの完全なbyte保持、非UTF-8入力、`MAX_PATH`近傍、Windows固有lock競合、Windows上の`0o600`実効権限は本契約の追加要件にせず、Fable Minorの残余リスクとして保持する。
- 現行実装は既存契約どおり本文をUTF-8として読んでsection置換する。非UTF-8一般化は別scope。
- full master gateには上記の既存baseline 3 suite未達が残る。本Patch対象suiteとGit-free archive相当は0 FAILだが、master全体PASSではない。

## Windows workflow向け履歴検証のライフサイクル補正

### 補正内容

Windows workflow全体を再実行する前に、完了済みSprint 050 Patch 005のSR-001が、正本の`Current ID`を
`sprint-050-patch-005`または最終`TBD`へ固定していた検証基盤の不整合を補正した。製品runtime、workflow、state、spec、
contract、rubric、Case ID／意味／閾値は変更していない。

- actual public sourceでは、fenced code／コメントを除いた構造fieldからcanonical Sprint ID、対応row、status、`Next Planned`を取得し、
  同じIDのcontract／progress／feedbackと4 role bundleを照合する。
- 任意文字列をCurrent IDとして受理せず、canonical Sprint ID形式、row一意性、実行中または完了のHarness status、contract／progress実在を必須にした。
  feedback未記録だけは従来どおり`evaluation-not-yet-recorded`として検査する。
- 将来の別Sprint IDを使うpositiveと、invalid ID、missing row、missing contract／progressのnegativeをSR-001内へ追加した。
- Patch 005固有の`active`／`awaiting-eval`／`done`／最終`TBD`と`last-recorded-completion` fixtureは削除・skipせず、
  対象status集合と最終`done`を明示assertして厳格に残した。
- test自身が`clarity-harness-scanner`の宣言済み6 pathに含まれるため、path／role／case／markerを変えず、
  正規validatorのobserved digestだけを`8ef8bbe1afb50f959afaf9d08572ea3f838095839f9dc5f8929304546b677d3b`へ同期した。

変更fileは`scripts/sprint-050-patch-005-test.mjs`と`plugins/secretary/collaboration-inventory.json`の2件だけ。
candidate commitは`6ca492a745456764c82e90a3f2e96e60d4ad293b`、treeは
`36f3a69bed9f7e0ec18d239c669e365c6062948f`である。

### negative control

補正前のactual current sourceで次を実行し、SR-001だけが期待どおりFAILした。

```text
node scripts/sprint-050-patch-005-test.mjs
FAIL SR-001 tracked Current ID must be target or final TBD
PASS SR-002〜009
NOT-RUN SR-010 requires-windows-native
SPRINT050_PATCH005_PASS=8 FAIL=1 NOT_RUN=1
```

補正後はactual sourceと、candidate commit自身の`.git`なしGit-free archive相当の両方で、SR-001を含む
macOS実行可能9 caseが全件PASSした。将来ID positiveは対応4 roleを取得し、invalid ID／missing row／missing filesの3 negativeは
いずれも検査側で拒否された。

### source checkout結果

| Command | Result |
|---|---|
| `node scripts/sprint-050-patch-005-test.mjs` | 9 PASS／0 FAIL／1 Windows NOT-RUN、external write／network 0 |
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS／0 FAIL／4 Windows NOT-RUN、HS-016 PASS |
| `node scripts/sprint-049-inventory.mjs validate` | 20 PASS／0 FAIL、67 cases、markers／digests valid |
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9 PASS／0 FAIL、Windows native NOT-RUN、EEXIST retry 2、canary不変、owned temp残存0 |
| `bash scripts/sprint-038-regression.sh` | base 67／0、Patch 003 9／0、historical classifier 14／0、historical path 3／0 |
| `node scripts/sprint-038-patch-002-windows-test.mjs` | 12 PASS／0 FAIL（darwin。Windows nativeへ昇格しない） |
| `node --check scripts/sprint-050-patch-005-test.mjs`、`git diff --check` | exit 0 |

### Git-free exact candidate結果

`git archive 6ca492a745456764c82e90a3f2e96e60d4ad293b`を`.git`なしの一時directoryへ展開し、次を確認した。

- Patch 005: 9 PASS／0 FAIL／1 Windows NOT-RUN
- Patch 004: 12 PASS／0 FAIL／4 Windows NOT-RUN
- inventory: 20 PASS／0 FAIL、67 cases、markers／digests valid
- Patch 003: 9 PASS／0 FAIL、Windows native NOT-RUN
- Sprint 038関連: 67／0、9／0、14／0、3／0
- Patch 002: 12 PASS／0 FAIL（darwin）
- archive release gate: 14 PASS／0 FAIL

macOS／Git-free結果はWindows native PASSへ昇格していない。補正candidateのWindows Server 2025／Node 22はNOT-RUNで、
既存PR #11へのpushと因果CIはオーケストレーターの次段階に残す。このGenerator roundのnetwork／external service write、push、
merge、release、tag、Marketplace、install、cache、live apply、実Xmind、private／Yasashii writeは0件である。
