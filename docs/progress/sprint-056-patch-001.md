# Sprint 056 Patch 001 — 0.13.0更新migrationの到達性・管理節更新・中断session回復

**ステータス:** 実装完了 - 評価待ち

## 着手時の成功条件

- 公開済み対応版8件から現行版までの有限なversion経路を解決し、dry-run、明示apply、検証、冪等再実行を行える。
- 旧template由来と確認できるAGENTS／CLAUDE管理節だけを順次更新し、利用者bytes、改行、mode、keep／conflictを保持する。
- 内容差分0のhopはversion経路に含めてもcontent write、changedPaths、内容適用件数を増やさない。
- workspace変更0件で止まった`0.13.0`target sessionだけを検証済みの新targetへ引き継ぎ、新planの再確認後にapply／rollbackできる。
- release integrityとGit-free archive gateで全対応版の到達性とmanifest／asset／意味差分を検査する。

## 実装内容

- F30 / F31: `plugins/secretary/migrations/supported.json`を追加し、対応元を`0.8.0`、`0.9.0`、`0.9.1`、`0.9.2`、`0.10.0`、`0.10.1`、`0.10.2`、`0.12.0`へ固定した。`0.9.0→0.9.1→0.9.2→0.10.0→0.10.1→0.10.2→0.12.0→0.13.0`と`0.8.0→0.10.1`のmanifestを追加した。旧target用の既存migration manifestは変更していない。
- F30: `0.10.1→0.10.2`のmemory authorization／pending会話管理節と、`0.10.2→0.12.0`のSecretary Voice／取得済み原本整理／Project Clarity責務節を、旧／新assetに基づく7個の`replace-section` operationとして追加した。`0.8.0`の既知templateは2個の前段operationで同じ経路へ接続する。
- F30: 同一fileに複数operationがあるplanを前operationの予測結果から順次作るようにした。file内の1節でもownership conflictなら、そのfileの予定writeをまとめてkeepへ戻す。markerだけでは適用済みにせず、新section本文、marker総数、最終hashを照合する。
- F30: atomic置換で元file modeとLF／CRLFを保持し、read-only、stale plan、Secretらしい本文、symlink、root外asset、不正scope／selectionをwrite前に拒否する。部分再開ではoperation checkpointと累積したmanaged／ledger／marker rollback所有記録を保持する。
- F31: `contentWriteCount`をoperation単位で記録し、`changedPaths`は実際に内容変更したpathだけへ限定した。`0.12.0→0.13.0`の空hopは台帳version bookkeepingとcontent write 0件を分けて表示する。dry-runへ`versionPath`と、回復時の旧target／新target／回復前write件数を追加した。
- F31: plugin backup復旧fallbackの未定義`gitDir`を修正した。現行系ではsession内の元版backupが欠落した場合に隣接directoryから推測せず停止し、旧target向け既存fallbackだけを維持した。
- F31: `0.13.0`で経路欠落停止した未変更sessionについて、元版、旧target、新plugin版、edition、scope、selection、保護commit／HEAD、managed hash、Git状態、backup版／tree、全経路assetをwrite前に再検証する。合格時だけ旧planを破棄して新plan hashを作り、元backupと保護commitを保持する。部分適用、backup／HEAD／scope／edition不一致はtargetを書き換えない。
- F41: release validatorへgraph、対応版tag、到達性、forward-only、manifest／filename、operation ID、許可path、asset境界、old asset hash、content差分／空operation整合を追加した。archive gateも同じ配布bytesの対応版宣言とvalidatorを実行する。
- F41: `docs/guide/update-0.13.0-migration-recovery.md`に影響、未変更候補の見分け方、正式な修正版公開後の再開、新plan確認、partial時rollback、対応外版、PowerShellを含むplugin root指定例を記載した。公開済み`0.13.0`を修正済みとは記載していない。

## 変更ファイル

- 製品runtime: `plugins/secretary/scripts/update-apply.mjs`、`plugins/secretary/scripts/lib/conversation-migration.mjs`
- migration graph: `plugins/secretary/migrations/supported.json`、`plugins/secretary/migrations/0.8.0-to-0.10.1.json`、`0.9.0-to-0.9.1.json`、`0.9.1-to-0.9.2.json`、`0.9.2-to-0.10.0.json`、`0.10.0-to-0.10.1.json`、`0.10.1-to-0.10.2.json`、`0.10.2-to-0.12.0.json`、`0.12.0-to-0.13.0.json`
- migration assets: `plugins/secretary/migrations/assets/{memory-confirmation,memory-request,conversation-flow,claude-memory,voice-contract,source-clarity,clarity-project,claude-clarity}-v*.md`
- release gate: `scripts/check-release-integrity.py`、`scripts/archive-release-gate.mjs`
- focused regression: `scripts/sprint-056-patch-001-migration-test.mjs`、`scripts/sprint-056-patch-001-release-test.mjs`
- 利用者文書／inventory: `docs/guide/README.md`、`docs/guide/update-0.13.0-migration-recovery.md`、`plugins/secretary/release-inventory.json`
- Generator handoff: `docs/progress/sprint-056-patch-001.md`

## 検証結果

- 開始前Node process数: `pgrep node | wc -l` = 26（40以下）。dev server／Playwrightは起動していない。
- `node --check plugins/secretary/scripts/update-apply.mjs`、`node --check plugins/secretary/scripts/lib/conversation-migration.mjs`、新規focused 2 scriptの構文: exit 0。
- `node scripts/sprint-056-patch-001-migration-test.mjs`: exit 0、44 PASS / 0 FAIL。macOS arm64 / Node 26.7.0。公開tagの実AGENTS／CLAUDE templateを使い、8対応版すべてで経路末尾`0.13.0`、conflict 0、apply後の冪等再実行を確認した。content writeは`0.8.0`=9、`0.9.0`〜`0.10.1`=7、`0.10.2`=4、`0.12.0`=0。`0.10.1` fixtureはCRLF、AGENTS 0640、CLAUDE 0600、利用者prefix／suffixを保持した。
- 同focusedでkeep、marker mismatch、stale plan、Secret、read-only、scope、backup改変、HEAD、edition、managed symlink、partial resume／rollback、unsupported `0.7.0`／`0.11.0`／unknownを副作用0件で拒否した。
- 同focusedの将来版隔離fixtureでは実ファイルversionを変えずにplugin `0.13.1`と`0.13.0→0.13.1`空edgeを生成した。`0.10.1→旧target 0.13.0→新target 0.13.1`を、回復前workspace write 0、同一保護commit、同一backup treeで新planへ移し、7 content write後のrollbackでworkspace bytesとplugin `0.10.1` treeを復元した。部分適用sessionはtarget／session write 0件で拒否した。
- `node scripts/sprint-030-update-config-test.mjs`: exit 0、10 PASS / 0 FAIL。既存session配置、retry、旧target backup fallback、ledger、rollback、symlink拒否を保持した。
- 主担当実行の`node scripts/sprint-038-patch-003-conversation-migration-test.mjs`: exit 0、9 PASS / 0 FAIL。darwin arm64 / Node 26.7.0、temp cleanup成功。この実行後にconversation migration helperの追加変更はない。
- `python3 scripts/check-release-integrity.py --root .`: exit 0、release integrity PASS。manifest、CHANGELOG、MIT、author、`forkedFrom`と全対応版tag／graphを確認した。
- `node scripts/sprint-056-patch-001-release-test.mjs`: exit 0、9 PASS / 0 FAIL。checkoutと、`.git`を含まない同じ作業tree配布bytesのarchiveでPASS。edge欠落、downgrade/cycle、operation重複、filename／metadata不一致、asset欠落、root外asset、意味差分あり＋空operationsを各FAILにした。
- `git diff --check`: exit 0。Claude／Codex manifest、marketplace、両CHANGELOGのversion実ファイル差分0。remote、push、tag、Release、Marketplace、downstream、install、cache、実workspace、`.clarity/**`、`CLARITY.md`の操作0件。
- Windows native: NOT-RUN。このMacにはWindows native実行環境がなく、Windows verifiedとは表示しない。新規focused fixtureはshell script／shell mock／固定separator／実HOMEに依存しない。
- 終了時Node process数: `pgrep node | wc -l` = 28（60以下）。この作業でdev server、browser、watcherを起動しておらず、fixture一時directoryは各scriptの`finally`で削除した。

## 自己評価

| 基準 | スコア(1-5) | コメント |
|---|---:|---|
| 機能完全性 | 5 | 8対応版、管理節更新、空hop、pending recovery、rollback、release/archive negativeを契約範囲で実装した。 |
| 動作安定性 | 5 | focused 44/44、release 9/9、既存030 10/10、既存038-patch003 9/9。部分再開とrollback ownershipも確認した。 |
| デザイン性 | 5 | UI非対象。CLIのversion経路、content件数、回復targetを既存JSON／plain出力へ一貫して追加した。 |
| 独自性 | 5 | UI非対象。公開tagの旧templateから製品所有節だけを段階更新する具体的graph／asset設計を採用した。 |
| エラーハンドリング | 5 | partial、stale、marker、backup、HEAD、scope、edition、Secret、read-only、symlink、graph破損を理由付きで停止する。 |
| 回帰なし | 5 | 指定された既存030と038-patch003、およびrelease/archive既存条件が0 FAIL。旧manifestは書き換えていない。 |

## 技術的な判断

- 公開済み旧manifestを書き換えず、新しいedgeと`contentChanged` metadataを追加した。identity管理節は専用identity migrationの所有範囲なので、`0.9.2→0.10.0`と`0.10.0→0.10.1`のupdate graphでは内容write 0と明記した。
- content変更件数はoperation数、`changedPaths`はunique path数として分けた。同一fileへ複数節を順次適用するため、両者を同じ数にはしない。
- 旧targetが`0.13.0`以上の現行系だけに対応元guardを適用し、既存`0.6.0→0.7.0`等の旧target経路は変更しない。

## 既知の課題

- 修正版の正式versionは本Patch範囲外で未確定。公開済み`0.13.0` bytesは変更せず、将来target recoveryは隔離`0.13.1` fixtureだけで検証した。
- Windows nativeはNOT-RUN。外部CI、全master、`scripts/sprint-018-regression.sh`、実利用者sessionは契約どおり未実行。

## Evaluatorへの引き渡し事項

- 起動方法: dev serverなし。CLI fixtureは`node scripts/sprint-056-patch-001-migration-test.mjs`。
- テスト対象URL: 非適用（UI変更なし）。
- 回帰チェック: `node scripts/sprint-056-patch-001-migration-test.mjs && node scripts/sprint-056-patch-001-release-test.mjs && node scripts/sprint-030-update-config-test.mjs && node scripts/sprint-038-patch-003-conversation-migration-test.mjs`
- release確認: `python3 scripts/check-release-integrity.py --root .`。Git-free archiveはfocused release testが同じ作業tree bytesから隔離生成し、archive gateを実行する。
- 評価シナリオ: 8対応版のroute／content件数、`0.10.1`の旧矛盾文消失とcurrent memory／Clarity節、`0.12.0`のbytes／mtime不変、keep／marker／stale／Secret／read-only／unsafe path／edition、pending `0.13.0`回復の新hash確認、partial拒否、rollbackのworkspace／plugin同時復元、release negativeを確認する。

## Retry 1 — AC8 / B-01・B-02修正

### 修正内容

- B-01: `scripts/check-release-integrity.py`で全operationの非空`marker`／`asset`を必須にし、`replace-section`では非空`oldAsset`／`endMarker`／`templateFingerprint`も必須にした。任意の`oldAssetSha256`は、既存の旧manifest互換を維持しつつ、存在する場合だけ従来どおり実asset hashと照合する。
- B-02: release validatorのoperation ID集合をmanifest単位からmigration graph全体へ移し、別edge間の重複も拒否するようにした。runtimeの`loadMigration()`も選択経路全体でIDを一意検査し、`appliedOperationIds`や`operations.find()`が別edgeの同名operationを誤skip／誤解決する前に停止する。
- focused release回帰へ、必須metadata欠落と別edge間ID重複の2 fixtureを追加した。それぞれcheckout validatorとGit-free archive gateの両方が非0になることを確認する。fixtureは配布対象fileだけを一時directoryへ複製し、終了時に削除する既存方式を維持した。
- 今回は製品runtimeとrelease guardも変更しており、検証コードだけの修正ではない。旧migration manifest、version面、公開物、実workspaceは変更していない。

### Retry 1 検証結果

- 開始前Node process数: `22`（40以下）。dev server／browser／Playwrightは起動していない。
- `node scripts/sprint-056-patch-001-migration-test.mjs`: exit 0、44 PASS / 0 FAIL。
- `node scripts/sprint-056-patch-001-release-test.mjs`: exit 0、13 PASS / 0 FAIL。既存9件に加え、metadata欠落とcross-edge duplicateについてcheckout／Git-free archiveの計4判定が非0拒否を確認した。
- `node scripts/sprint-030-update-config-test.mjs`: exit 0、10 PASS / 0 FAIL。
- `node scripts/sprint-038-patch-003-conversation-migration-test.mjs`: exit 0、9 PASS / 0 FAIL。darwin arm64 / Node 26.7.0、`WINDOWS_NATIVE=NOT-RUN`。
- `python3 scripts/check-release-integrity.py --root .`: exit 0、release integrity PASS。
- `git diff --check`: exit 0。
- 終了時Node process数: `22`（60以下）。この作業でdev server、browser、watcherは起動していない。
- 本Retryの変更file: `plugins/secretary/scripts/update-apply.mjs`、`scripts/check-release-integrity.py`、`scripts/sprint-056-patch-001-release-test.mjs`、本progress。

### Retry 1 自己評価・Evaluatorへの引き渡し

- AC8の独立評価で再現したB-01／B-02へ限定して修正した。Sprint全体の独立合否はEvaluatorの再評価待ち。
- 再評価では、追加した4判定が実際に非0拒否となること、正常checkout／archive、migration 44件、既存030／038回帰が引き続きgreenであることを確認してほしい。
- 回帰チェック: `node scripts/sprint-056-patch-001-migration-test.mjs && node scripts/sprint-056-patch-001-release-test.mjs && node scripts/sprint-030-update-config-test.mjs && node scripts/sprint-038-patch-003-conversation-migration-test.mjs && python3 scripts/check-release-integrity.py --root . && git diff --check`
