# Sprint 056 Patch 002 評価結果

**判定:** 合格  
**分類:** なし  
**評価candidate:** `2897453ac118469d126cd0c3df3f6cec701ee62e` (`codex/fix-update-migration-windows`)  
**評価範囲:** `Type: micro` のため C1／C3／C6。C2／C5／C12の既存ゼロ許容境界はAcceptance Criteriaとして維持確認した。  
**Escalation Recommendation:** none

## 結論

WindowsのCRLF checkoutでも、旧配布assetの改行だけが異なる場合はLF時と同じmigrationとして照合できた。
改行以外の本文改ざんはfingerprint不一致で更新開始前にexit 3となり、session、workspace tree、Git HEADを
変更しなかった。workspace側のraw hash比較は変更されておらず、全対応版で利用者の前後bytes、改行、file mode、
keep／conflict、空hopのcontent write 0を維持した。

release validatorは解析用文字列だけCRLFをLFへ揃え、canonical／legacy CHANGELOGのraw byte一致を先に維持している。
LF checkoutとCRLF Git-free archiveが通り、raw byte不一致、invalid UTF-8、重複、逆順、manifestとのlatest不一致、
必須節欠落は独立fixtureでも非0拒否となった。Macの契約3 commandと、Windows run `34505741310`の同じ対象は
すべて0 FAILである。未解消のpatch対象product findingは0件。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 5/5 | 4 | PASS | AC1〜8を実物で確認。必須Mac／Windows gate、CRLF正例、安全negative、現行0.13.0整合が成立。 |
| C3 機能の実証 | 5/5 | 4 | PASS | 対応8版のdry-run→apply→検証→冪等再実行、CRLF asset、改ざん拒否、release parser正負例をCLI fixtureで実行。 |
| C6 無回帰 | 5/5 | 5 | PASS | 契約で固定された3 suiteはMacとWindowsで46/0、13/0、16/0。旧Windows helperも9/0。 |

## 証跡

### Candidateと差分

- local HEAD: `2897453ac118469d126cd0c3df3f6cec701ee62e`。
- `f62c881..2897453`の製品変更は、`update-apply.mjs`の配布asset fingerprint用CRLF正規化と、
  `check-release-integrity.py`の解析用CHANGELOG正規化。workspaceのraw byte hash、canonical／legacy raw byte比較は維持。
- focused migration／release fixtureとSprint 032の現行version期待を更新。case削除、SKIP化、閾値緩和はない。
- `collaboration-inventory.json`の5つの`contentDigest`は、Patch 001 guideとWindows workflowの既存bytesに追随する
  current record同期だけ。最終WindowsのHS-016を含むHS 16/0で整合を確認。
- `git diff --check f62c881..HEAD`: exit 0。version、manifest、CHANGELOG内容、migration metadataの変更は0。

### Mac独立実行

実行hostは`mac.lan`、user `taisei`、Darwin 25.5.0 arm64、home `/Users/taisei`、Node v26.7.0、
Python 3.14.6。各テスト直前のNode process数は0で、上限40以下。3 commandは順番に実行した。

- `node scripts/sprint-056-patch-001-migration-test.mjs`: exit 0、
  `SPRINT056_PATCH001_PASS=46 SPRINT056_PATCH001_FAIL=0`。
  - `0.8.0`、`0.9.0`、`0.9.1`、`0.9.2`、`0.10.0`、`0.10.1`、`0.10.2`、`0.12.0`から
    `0.13.0`までのdry-run、apply、検証、冪等再実行が成功。
  - CRLF distribution assetはLF fingerprintへ照合。非改行tamperはfingerprint理由でexit 3となり、
    session bytes、workspace tree hash、HEADが不変。
  - user bytes／mode、keep／conflict、stale plan、Secret、read-only、scope、backup、HEAD、edition、symlink、
    partial resume／rollbackを維持。`0.12.0`空hopはcontent write 0。
- `node scripts/sprint-056-patch-001-release-test.mjs`: exit 0、
  `SPRINT056_PATCH001_RELEASE_PASS=13 SPRINT056_PATCH001_RELEASE_FAIL=0`。
  checkoutとCRLF Git-free archiveが成功し、edge、operation metadata／ID、asset、graphの既存negativeはすべて拒否。
- `node scripts/sprint-032-update-gate-test.mjs`: exit 0、
  `SPRINT032_RELEASE_PASS=16 SPRINT032_RELEASE_FAIL=0`。
  marketplace／plugin／CHANGELOG／ledgerは現行`0.13.0`で一致し、公開`0.7.0`履歴、same-version／downgradeの副作用0を維持。

### 独立CHANGELOG fixture

exact HEADを`git archive`で一時領域へ展開し、canonical／legacyを同じように変更して
`python3 scripts/check-release-integrity.py --root <fixture>`を実行した。一時fixtureは終了時に削除した。

| Case | Exit | 観測 |
|---|---:|---|
| canonical／legacyをともにCRLF化 | 0 | `PASS release integrity: manifests and CHANGELOG are consistent` |
| canonicalだけraw byteを変更 | 1 | `legacy CHANGELOG differs byte-for-byte` |
| 両方へinvalid UTF-8 byte追加 | 1 | `release surface unreadable` |
| 0.13.0 heading重複 | 1 | `duplicate release headings` |
| 先頭versionを0.11.5へ変更 | 1 | `releases are not newest-first`、`latest ... differs` |
| 先頭versionを0.13.1へ変更 | 1 | `latest CHANGELOG release differs from manifest version` |
| 0.13.0の必須「対象者」節を欠落 | 1 | `requires one heading: 対象者` |

### Windows native

- GitHub Actions run `34505741310`、対象job `102967366791` (`windows-update-migration`)。
- PR merge ref `168b7329e8a009de10f2d5b0274f554913a4dfa1`はログ上で
  `Merge 2897453ac118469d126cd0c3df3f6cec701ee62e ...`とcandidate headを固定。
- Microsoft Windows Server 2025、`win32 x64`、Node v22.23.2、Python 3.12.10、`PYTHONUTF8=1`。
- migration `46/0`、release／archive `13/0`、旧Windows conversation migration helper `9/0`。
- 同runの既存`windows-native` job `102967366588`でSprint 032 `16/0`。
- 初回`f62c881`のrun `34503854806`で再現したCRLF fingerprint／heading失敗と、古い0.12.0期待3件は解消。
- 中間candidate `3570511bdc8e93d097b55f7c8924055e9b11605f`のrun `34505323871`では対象3 suiteは既に
  46/0、13/0、16/0だった。後続HS-016のstale digestだけを既存算出方法で同期した最終candidateではHS 16/0。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---|---|---|
| AC1 | PASS | LF／CRLF asset照合と8対応版のdry-run→apply→検証→冪等再実行がMac／Windowsで46/0。 |
| AC2 | PASS | 非改行tamperはexit 3、session／workspace tree／HEAD write 0。既存metadata／marker／graph negativeも拒否。 |
| AC3 | PASS | 利用者bytes／mode、元改行、keep／conflict、空hop content write 0を46-caseで確認。 |
| AC4 | PASS | LF checkoutとCRLF archiveがPASS。raw mismatch、UTF-8、duplicate、order、latest、required section negativeを拒否。 |
| AC5 | PASS | Sprint 032は現行0.13.0相互整合を検査して16/0。公開0.7.0履歴とsame／downgrade副作用0を維持。 |
| AC6 | PASS | MacとWindowsの必須3 commandが46/0、13/0、16/0。Windows環境とUTF-8 modeを記録。 |
| AC7 | PASS | 差分はfingerprint、parser、focused fixture、032期待、既存record同期、Harness記録に限定。version／metadata内容は不変。 |
| AC8 | PASS | 許可された既存branch push／PR CI以外にrelease、tag、merge、Marketplace、install、cache、downstream、実workspace操作なし。Evaluatorからのexternal writeなし。 |

## Finding／バグ

- patch対象のproduct finding: 0件。
- patch対象のverification-infra finding: 0件。

run `34505741310`全体の結論は、契約外の後続Clarity suite 2件によりfailureだった。合否から隠さず、次のように切り分ける。

1. `SR-001`は、CI candidateにまだreceipt用`docs/progress/sprint-056-patch-002.md`が含まれないことを検出した。
   対象区分は`verification-infra`。現在の評価receipt commitで解消する記録結線であり、対象3 suiteの製品挙動ではない。
2. `SR-009`内の既存`GS-009`は、今回未変更のClarity 64 writer負荷テストでround 1は64/64、round 2のHook 1件だけが
   safeCode `timeout`となった。対象区分は`verification-infra`。本micro契約は全master／Clarity負荷suiteを要求せず、
   update fingerprint、release parser、Sprint 032の変更面との因果はないため採点外とした。成功するまでの再実行や閾値緩和はしていない。

## Evaluator自己レビュー

- micro採点をC1／C3／C6に限定し、各閾値と合否を一致させた: yes
- Generatorの自己評価ではなく、Mac実行、独立negative、最終Windowsログから判定した: yes
- 契約のsafe harborを満たし、全master、新collector、追加artifactを合格条件にしていない: yes
- 初回／中間Windows失敗を削除せず、最終candidateでの解消と区別した: yes
- 未検証項目をPASS扱いしていない: yes。UIはないためbrowser／DOM／screenshotは非適用。
- 各観測findingに対象区分を付け、patch対象外の後続suite失敗を明記した: yes
- 実装、test、spec、contract、progress、stateを修正していない: yes
- 未追跡の実`.clarity/**`と`CLARITY.md`を読まず、変更していない: yes
