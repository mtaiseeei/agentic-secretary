# Sprint 056 Patch 001 評価結果

**判定:** 合格（Retry 1）
**分類:** なし
**評価対象:** Sprint 056 Patch 001 — 0.13.0更新migrationの到達性・管理節更新・中断session回復
**Escalation Recommendation:** none
**Evaluator runtime:** native dispatchでSol/high指定。child host metadataは取得できず、launch-verifiedとはしない。
**評価履歴:** 初回はAC8のB-01／B-02により不合格（implementation-issue）。Retry 1で両件の修正と回帰を独立確認し、合格へ更新した。

## 初回評価（Retry 0、不合格の履歴）

- 判定: 不合格
- 分類: implementation-issue

## 結論

通常candidateの移行、回復、rollbackと指定回帰はすべて成功した。しかし、配布前のrelease guardが
不正なmigration metadataと、別edge間の`operation.id`重複を拒否しないことを隔離Git-free fixtureで再現した。
これはF41とAcceptance Criteria 8が要求する「各manifestの有効性」と「duplicate negativeでFAIL」を満たさない
product findingである。現在candidateのoperation ID集合自体には重複がないが、guardの欠陥を残したままPASSにはできない。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | AC8の必須release／archive negative guardが未達。 |
| C2 構文・整合 | 5/5 | 5 | PASS | 正常candidateのJSON、参照asset、version面は整合し、全必須suiteが実行可能。 |
| C3 機能の実証 | 5/5 | 4 | PASS | 隔離CLI fixtureで8対応版、管理節、空hop、回復、rollbackを実行。 |
| C5 安全・規律 | 5/5 | 5 | PASS | Secret、stale、read-only、symlink、scope、edition、HEAD、partialを副作用なしで拒否。 |
| C6 無回帰 | 5/5 | 5 | PASS | 指定された新規2 suite、既存030、038-patch003、release integrityは0 FAIL。 |
| C10 更新の安全性 | 5/5 | 5 | PASS | dry-runと別確認、冪等性、現状維持、write 0の空hop、workspace／plugin rollbackが成立。 |
| C12 release履歴・現在candidate整合 | 4/5 | 5 | FAIL | version実ファイルと既存履歴は不変だが、current配布前guardが契約上の不正graphをPASSする。 |

## 証跡

- 実行host: `mac.lan`、user `taisei`、Darwin 25.5.0 arm64、Node v26.7.0。Node process数は開始前26、終了時24で、開始上限40／実行中止上限60以下。dev server、browser、watcherは起動していない。
- `node scripts/sprint-056-patch-001-migration-test.mjs`: exit 0、44 PASS / 0 FAIL。
  - 8対応版すべてで`from→0.13.0`のdry-run、明示apply、検証、冪等再実行が成功。
  - content writeは`0.8.0=9`、`0.9.0〜0.10.1=7`、`0.10.2=4`、`0.12.0=0`。
  - `0.10.1`で管理節が現行意味へ更新され、利用者prefix／suffix、CRLF、AGENTS 0640、CLAUDE 0600を保持。
  - customized keep、片側marker、stale plan、Secret、read-only、scope、backup改変、HEAD、edition、managed symlink、partial resumeを理由付きで処理。
  - pending `0.10.1→0.13.0` sessionをfixture上の`0.13.1`へ引き継ぎ、新plan確認後に7 content writesを適用。rollback後はworkspace bytesとplugin 0.10.1 treeを復元。
- `node scripts/sprint-056-patch-001-release-test.mjs`: exit 0、9 PASS / 0 FAIL。checkout／Git-free archive、edge欠落、downgrade/cycle、同一manifest内duplicate、metadata mismatch、asset欠落／root外、空operationsを確認。
- `node scripts/sprint-030-update-config-test.mjs`: exit 0、10 PASS / 0 FAIL。
- `node scripts/sprint-038-patch-003-conversation-migration-test.mjs`: exit 0、9 PASS / 0 FAIL。`WINDOWS_NATIVE=NOT-RUN`。実行hostがmacOSであり、契約どおりWindows verifiedには数えていない。
- `python3 scripts/check-release-integrity.py --root .`: exit 0、release integrity PASS。
- `git diff --check`: exit 0。Claude／Codex manifest、marketplace、canonical／legacy CHANGELOGのversion実ファイル差分は0。旧versionファイル、remote、tag、Release、Marketplace、downstream、installed plugin／cache、実workspaceは操作していない。`.clarity/**`と`CLARITY.md`は内容を読まず、変更していない。
- UIを持たないCLI Patchのため、browser、DOM、screenshotは非適用。

### 独立negative 1: 必須operation metadataの欠落

同じ配布bytesだけをtemporary archiveへ複製し、`plugins/secretary/migrations/0.10.1-to-0.10.2.json`の
先頭operationから必須`marker`を削除してrelease validatorを実行した。

- command: `node --input-type=module --eval '<isolated archive copy; delete operations[0].marker; run check-release-integrity.py>'`
- observed: `MISSING_MARKER exit=0`、`PASS release integrity: manifests and CHANGELOG are consistent`
- expected: manifestがruntimeでは拒否されるため、release validatorも非0でFAILする。
- 対象区分: `product`

### 独立negative 2: 別edge間のoperation ID重複

同じ配布bytesだけをtemporary archiveへ複製し、`0.10.1-to-0.10.2.json`の先頭operation IDを、
前段`0.8.0-to-0.10.1.json`で既に使う`memory-request-v1`へ変更した。

- command: `node --input-type=module --eval '<isolated archive copy; set cross-edge duplicate id; run checkout and archive gates>'`
- observed checkout: exit 0、release integrity PASS。
- observed archive: exit 0、`ARCHIVE_RELEASE_PASS=15 ARCHIVE_RELEASE_FAIL=0`。
- expected: 全経路で一意でないoperation IDをcheckout／archiveの両guardが非0で拒否する。
- 実害の手がかり: `check-release-integrity.py`は`operation_ids`をmanifestごとに作り直す。一方、`update-apply.mjs`は
  `session.migration.appliedOperationIds`を経路全体で共有し、`operations.find(candidate.id === item.id)`でoperationを解決する。
  別edgeの重複は、後続operationの誤skipまたは誤解決を起こし、supported routeをverification failureへ送れる。
- 対象区分: `product`

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---|---|---|
| AC1 | PASS | 8対応版の経路、dry-run、apply、検証、冪等再実行が44-case fixtureで成功。 |
| AC2 | PASS | 0.10.1管理節の現行化、旧矛盾文の除去、利用者bytes／mode／改行保持を確認。 |
| AC3 | PASS | keep／marker／stale／Secret／read-only／scope／edition／symlink等の安全停止を確認。 |
| AC4 | PASS | 0.12.0空hopは管理file bytes／mtime不変、changedPaths 0、content write 0。 |
| AC5 | PASS | 未変更pending sessionは保護commit／backup treeを保持し、新plan確認後に完了・rollback。 |
| AC6 | PASS | partial、backup改変、HEAD、scope、edition不一致はtarget差替え前に拒否。 |
| AC7 | PASS | unsupported版、downgrade／壊れたgraphの停止と既存旧target回帰を確認。 |
| AC8 | **FAIL** | 必須metadata欠落とcross-edge duplicateをcheckout／Git-free archive guardがPASSする。 |
| AC9 | PASS | 既存update／conversation／release回帰は0 product FAIL。 |
| AC10 | PASS | guideは影響、変更0判定、正式公開後の再開、partial rollback、対応外版を順に説明し、0.13.0再配布を案内しない。 |
| AC11 | PASS | version／remote／tag／Release／Marketplace／downstream／cache／実workspace／Clarityへの操作0件。 |

## 不合格の項目

- AC8 / F41 release・archive到達性guard
  - 期待動作: runtimeが必須とするoperation metadataをrelease時に検証し、operation IDをmigration graph全体で一意にする。
  - 実際の動作: `marker`欠落と別edge間ID重複がcheckout／archiveでPASSする。
  - 該当箇所の手がかり: `scripts/check-release-integrity.py`の`validate_migration_graph()`。現在の`operation_ids`は各manifest loop内で初期化され、operation検証は`id`、`path`、`type`、asset境界が中心で、`marker`、replace-sectionの`endMarker`／`templateFingerprint`を必須検証していない。

## バグ一覧

| # | 重要度 | 対象区分 | 内容 | 再現手順 |
|---|---|---|---|---|
| B-01 | Major | product | runtime必須のmigration operation metadata欠落をrelease validatorがPASSする。 | 隔離archiveで`operations[0].marker`を削除し`check-release-integrity.py`を実行。exit 0。 |
| B-02 | Major | product | 別edge間の`operation.id`重複をcheckout／archive gateがPASSする。 | 後段IDを前段の`memory-request-v1`へ変更し両gateを実行。双方exit 0。 |

## Generator への指示

1. `check-release-integrity.py`でoperation metadataをruntime契約と同じ必須条件で検証する。少なくとも非空`marker`、非空`asset`、replace-sectionの非空`oldAsset`／`endMarker`／`templateFingerprint`を拒否対象にする。
2. `operation.id`をmanifest単位ではなくmigration graph全体で一意に検証する。runtimeの全経路checkpoint／lookupとの意味を一致させる。
3. focused release testへ上記2つの隔離negativeを追加し、checkoutとGit-free archiveがともに非0になることを確認する。既存9 caseとmigration／030／038回帰は維持する。

## 改善提案

- なし。上記は着手時点のAC8を満たすための実装修正であり、検証scopeの追加ではない。

## Evaluator 自己レビュー

- 閾値と合否は一致しているか: yes
- 各PASSに証拠があるか: yes
- 未検証項目をPASS扱いしていないか: yes
- FAILの理由は着手時点の契約・rubricに存在する基準か: yes（F41、AC8、C1、C12）
- 要求した証跡は契約・rubricのsafe harbor内か: yes
- 各finding・各バグに対象区分を付けたか: yes
- rubricが厳しすぎる・本CLI Patchに合わない疑いはないか: no
- implementation-issue分類の根拠: 配布validatorの実装が契約済みnegativeを拒否しないproduct defectで、仕様矛盾や検証基盤だけの障害ではない。
- Generatorの自己評価を独立判定として流用していないか: yes
- 実装、test、spec、contract、progress、stateを修正していないか: yes
- `.clarity/**`または`CLARITY.md`を読んだり変更したりしていないか: yes

---

## Retry 1 独立再評価 — 最終判定

**判定:** 合格
**分類:** なし
**Escalation Recommendation:** none
**Evaluator runtime:** native dispatchでSol/high指定。child host metadataは取得できず、launch-verifiedとはしない。

### 結論

初回のproduct finding B-01／B-02は解消された。必須operation metadataの欠落と、別edge間の
`operation.id`重複は、checkout validatorとGit-free archive gateの双方で非0拒否となった。
同じcross-edge duplicateを含む`0.8.0→0.13.0`経路はruntimeでもexit 3となり、workspaceとsessionの
bytesを変えずに停止した。指定された回帰はすべてgreenで、追加findingは0件である。

前回candidateとRetry 1 candidateのSHA-256 mapを比較すると、変更は
`plugins/secretary/scripts/update-apply.mjs`、`scripts/check-release-integrity.py`、
`scripts/sprint-056-patch-001-release-test.mjs`の3ファイルだけで、実ファイルhashも新candidate mapと一致した。
この差分とgreen baselineに基づき、未変更のAC1〜7、AC9〜11は初回証跡を引き継いだ。

### スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 5/5 | 4 | PASS | AC1〜11がすべて成立し、初回未達のAC8も独立negativeで解消を確認。 |
| C2 構文・整合 | 5/5 | 5 | PASS | 正常candidateのrelease integrity、migration graph、参照assetが整合し、全必須suiteが実行可能。 |
| C3 機能の実証 | 5/5 | 4 | PASS | 8対応版のCLI fixture、回復、rollbackに加え、runtime duplicate拒否を実行。 |
| C5 安全・規律 | 5/5 | 5 | PASS | cross-edge duplicateはworkspace／session byte不変で停止し、既存安全negativeも44-case suiteでgreen。 |
| C6 無回帰 | 5/5 | 5 | PASS | 指定6コマンドがすべてexit 0。新規・既存assertにFAILなし。 |
| C10 更新の安全性 | 5/5 | 5 | PASS | 初回のdry-run、冪等性、空hop、回復、rollback証跡を引き継ぎ、runtime拒否時のwrite 0を再確認。 |
| C12 release履歴・現在candidate整合 | 5/5 | 5 | PASS | checkout／Git-free archiveの正常系とB-01／B-02 negativeが成立し、公開・version面への操作0件。 |

### Retry 1 証跡

- 実行host: `mac.lan`、user `taisei`、Darwin arm64、Node v26.7.0。Node process数は開始前20、終了時20。dev server、browser、watcherは起動していない。
- candidate delta: `/private/tmp/secretary-migration-evaluator-candidate.json`と`/private/tmp/secretary-migration-reeval-candidate.json`を比較し、変更は上記3ファイルだけ。実SHA-256は新mapの`b3d0aa1e...`、`8fca77e5...`、`af5374ef...`と一致。
- `node scripts/sprint-056-patch-001-migration-test.mjs`: exit 0、44 PASS / 0 FAIL。
- `node scripts/sprint-056-patch-001-release-test.mjs`: exit 0、13 PASS / 0 FAIL。正常checkout／archiveに加え、B-01とB-02を各検証面で非0拒否。
- `node scripts/sprint-030-update-config-test.mjs`: exit 0、10 PASS / 0 FAIL。
- `node scripts/sprint-038-patch-003-conversation-migration-test.mjs`: exit 0、9 PASS / 0 FAIL。`WINDOWS_NATIVE=NOT-RUN`。実行hostがmacOSのためWindows verifiedには数えていない。
- `python3 scripts/check-release-integrity.py --root .`: exit 0、`PASS release integrity: manifests and CHANGELOG are consistent`。
- `git diff --check`: exit 0。
- 独立B-01 fixture: `0.10.1-to-0.10.2.json`の先頭operationから`marker`を削除。実tag名を持つ隔離checkoutのvalidatorはexit 1、`migration operation field is invalid ... marker`。同じ配布bytesのGit-free archive gateはexit 1、`ARCHIVE_RELEASE_PASS=14 ARCHIVE_RELEASE_FAIL=1`。
- 独立B-02 fixture: 後段operation IDを前段の`memory-request-v1`へ変更。隔離checkoutのvalidatorはexit 1、`migration operation id is invalid or duplicate`。Git-free archive gateはexit 1、`ARCHIVE_RELEASE_PASS=14 ARCHIVE_RELEASE_FAIL=1`。
- 独立runtime B-02 fixture: duplicateを含む`0.8.0→0.13.0`の保護済みsessionで`update-apply.mjs resume`を実行。exit 3、`migrationに許可外または重複した操作があるため停止しました。`。AGENTS、CLAUDE、sessionのbytesはすべて不変。
- UIを持たないCLI Patchのため、browser、DOM、screenshotは非適用。
- 一時fixtureは各実行の`finally`で削除した。remote、push、tag、Release、Marketplace、downstream、install、cache、実workspaceは操作していない。`.clarity/**`と`CLARITY.md`は内容を読まず、変更していない。

### Acceptance Criteria

| AC | 判定 | Retry 1の根拠 |
|---|---|---|
| AC1 | PASS | migration 44/44がgreen。8対応版の経路、dry-run、apply、検証、冪等再実行の初回証跡を引き継ぎ。 |
| AC2 | PASS | 対象bytesはRetry 1で未変更。管理節更新と利用者bytes／mode／改行保持の初回証跡を引き継ぎ。 |
| AC3 | PASS | migration 44/44がgreen。keep／marker／stale／Secret／read-only／scope／edition／symlinkの初回証跡を引き継ぎ。 |
| AC4 | PASS | migration 44/44がgreen。0.12.0空hopのbytes／mtime不変、content write 0を維持。 |
| AC5 | PASS | migration 44/44がgreen。pending session回復、別確認、rollbackの初回証跡を引き継ぎ。 |
| AC6 | PASS | migration 44/44がgreen。partial、backup、HEAD、scope、edition拒否を維持。 |
| AC7 | PASS | migration 44/44とrelease 13/13がgreen。unsupported、downgrade、壊れたgraphの拒否を維持。 |
| AC8 | PASS | 正常checkout／Git-free archiveがPASS。B-01とB-02は両guardで非0拒否し、B-02はruntimeでもwrite 0で拒否。 |
| AC9 | PASS | migration 44/44、release 13/13、030 10/10、038 9/9、release integrityが0 FAIL。 |
| AC10 | PASS | guide bytesはRetry 1で未変更。初回に確認済みの影響、変更0判定、再開、rollback、対応外版の説明を引き継ぎ。 |
| AC11 | PASS | version／remote／tag／Release／Marketplace／downstream／cache／実workspace／Clarityへの操作0件。 |

### Finding／バグ

- Retry 1のproduct finding: 0件。
- Retry 1のverification-infra finding: 0件。
- B-01: 解消。必須metadata欠落をcheckout／archiveで拒否。
- B-02: 解消。cross-edge duplicateをcheckout／archive／runtimeで拒否。

### Evaluator 自己レビュー

- 閾値と合否は一致しているか: yes
- 各PASSに証拠があるか: yes
- 未変更面だけを前回証跡から引き継ぎ、変更面を実diffと実操作で再評価したか: yes
- 未検証項目をPASS扱いしていないか: yes（Windows nativeは明示的にNOT-RUNで、契約上の必須gateではない）
- 合否理由は着手時点の契約・rubricに存在する基準か: yes（F41、AC8、C1、C12）
- 要求した証跡は契約・rubricのsafe harbor内か: yes
- 各finding・各バグに対象区分を付けたか: yes（Retry 1はfinding 0件。初回B-01／B-02はproduct履歴を保持）
- rubricが厳しすぎる・本CLI Patchに合わない疑いはないか: no
- 追加探索や全master／018／external CI／新collectorを合格条件へ加えていないか: yes
- Generatorの自己評価を独立判定として流用していないか: yes
- 実装、test、spec、contract、progress、stateを修正していないか: yes
- `.clarity/**`または`CLARITY.md`を読んだり変更したりしていないか: yes
