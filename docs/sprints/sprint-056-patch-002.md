# Sprint 056 Patch 002 — Windows CRLF checkoutでの更新migration・release gate互換

- Type: micro
- Risk: high（更新migrationの改ざん検知、利用者workspace保護、配布前release gateに触れるため）
- Base Sprint: `sprint-056`
- 依存: `sprint-056-patch-001` done
- 対象機能: F30、F31、F41
- 関連rubric: micro評価のC1、C3、C6。C2／C5／C12の既存ゼロ許容境界も受け入れ条件として維持する。

## 背景とmicro判定

Patch 001候補`f62c881`はMacの独立評価を通過したが、同じ候補のWindows native run `34503854806`では、
GitのCRLF checkoutにより旧migration assetの改行だけが変わり、配布metadataのfingerprintと一致せず対応版の更新が停止した。
同じrunでrelease validatorもCRLFのCHANGELOG見出しを認識できなかった。Sprint 032回帰の3件は製品不具合ではなく、
現行`0.13.0`に対して`0.12.0`を固定した古い期待値だった。

本Patchは既存のupdate／release検証1機能面に閉じ、既存自動回帰で保護できるためmicroとする。新しいmigration、
version、配布内容、更新フローは追加しない。

## 外から見える成果

- Gitが配布text assetをLFまたはCRLFでcheckoutしても、改行以外が同じ正規assetなら同じmigrationとして安全に実行できる。
- 改行以外の改ざん、利用者編集、所有不明な節は従来どおり拒否し、workspaceの利用者bytesとfile modeを保護する。
- checkoutとGit-free archiveのrelease gateは、canonical／legacy CHANGELOGのbyte一致を保ったままLF／CRLFの見出しを同じ意味で検証する。
- Sprint 032回帰は現行配布version同士の整合を検査し、旧公開履歴と安全assertを残したままWindowsで通る。

## Scope

1. 旧migration assetのfingerprint照合は、textのLF／CRLF差だけを同一内容として扱う。末尾空白以外の文字、節内容、marker、
   順序など意味のある差分は同一扱いしない。metadata自体の不正や改ざんも拒否する。
2. 改行差の吸収は配布assetの照合に限定する。利用者workspace全体を改行変換せず、既存の前後bytes、対象外block、
   file mode、keep／conflict、stale plan、Secret、symlink／junction、root外path、edition境界を維持する。
3. release validatorはLF／CRLFのrelease見出しを解析できるようにし、canonical／legacy CHANGELOGのraw byte一致、
   UTF-8、重複、順序、latest version、必須節、migration到達性の検査を維持する。
4. Sprint 032 fixtureのcurrent marketplace／plugin、CHANGELOG latest、ledger installed versionは、現行配布metadataの
   相互整合を検査する。`0.12.0`固定値だけを現行期待として残さず、assert、case、既存の公開`0.7.0`履歴保護を削らない。
5. Patch 001のfocused fixtureにLF／CRLF配布assetの正例と、改行以外を変えた負例を追加する。新しいfixture frameworkや
   collectorは作らない。

## Acceptance Criteria

1. 同じ旧asset内容のLF版とCRLF版は同じ期待fingerprintに照合でき、Patch 001で保証した全対応版の
   dry-run→apply→検証→冪等再実行がMacとWindows nativeで0 FAILとなる。
2. 旧assetの本文、marker、順序またはmetadata fingerprintを改ざんした負例は更新開始前に拒否され、plan成功、ledger、
   marker、管理対象file、Gitへの新しいwriteが0件である。
3. CRLF fixtureでも管理対象fileの利用者固有の前後bytes、対象外block、元の改行とfile modeを保持し、
   keep／conflictおよび内容差分のないhopのbytes／mtime／content write 0を維持する。
4. `scripts/check-release-integrity.py`とGit-free archive gateはLF／CRLF双方の正規CHANGELOGでPASSし、canonical／legacyの
   raw bytes不一致、invalid UTF-8、重複／逆順／manifestとlatest不一致、必須節欠落の既存negativeを拒否する。
5. `scripts/sprint-032-update-gate-test.mjs`は現行`0.13.0`のmarketplace／plugin／CHANGELOG／ledger整合を検査して
   `16 PASS / 0 FAIL`となる。既存case、assert、公開`0.7.0`の履歴bytes、same-version／downgradeの副作用0件を維持する。
6. Macで下記3 commandが0 FAILとなり、同じ3 testを実行する既存Windows workflowがexact candidateで0 FAILとなる。
   Windowsは`win32 x64`、Node 22、Python UTF-8 modeを記録し、SKIPやthreshold緩和でPASSにしない。
7. 変更はupdate fingerprint、release validator、該当focused／Sprint 032 fixture、必要最小の既存Windows workflow接続、
   Harness記録に限定される。version／manifest／CHANGELOG内容／migration metadata／公開済みtag・artifactを変更しない。
8. 実`.clarity/**`、`CLARITY.md`、実利用者workspace、installed plugin／cache、private／Yasashii、release／tag／Marketplace、
   mergeへの変更・操作が0件である。

## 禁止する解き方

- fingerprint照合を削除する、全差分を改行差として受理する、または改ざんnegativeを弱める。
- 利用者workspaceのbytesを一律LF／CRLFへ変換する、利用者編集を既知templateとして扱う。
- canonical／legacy CHANGELOGのraw byte一致、release heading、version順、必須節のassertを削る。
- Sprint 032のcase／assert／PASS数を減らす、失敗をSKIP／optional化する、現行versionの相互整合を検査しない固定値へ置き換える。
- 新しいversion、migration、release artifact、collector、fixture frameworkを追加する。

## Verification scope（着手時に固定）

Mac baseline／必須回帰:

```bash
node scripts/sprint-056-patch-001-migration-test.mjs
node scripts/sprint-056-patch-001-release-test.mjs
node scripts/sprint-032-update-gate-test.mjs
```

Windows nativeは既存`.github/workflows/windows-recording-regression.yml`で同じ3 testを同一candidateから実行する。
Patch 001 migrationの全対応版、release／archive正負例、Sprint 032の16件を必須対象とする。UI差分はなく、
browser／DOM／screenshotは非適用。全master、別workflow、実workspace、downstreamは要求しない。

### Evidence safe harbor

- candidate 40桁SHA、workflow／run／job ID、OS／architecture、Node／Python、実行command、exit、PASS／FAIL。
- LF／CRLF正例の照合結果、改行以外の改ざんnegativeの拒否理由、workspace／Git write 0、利用者bytes／mode保持の要約。
- Patch 001 migration全対応版0 FAIL、release test summary、archive summary、Sprint 032 `16/0`。
- canonical／legacy raw byte一致、公開／source／installed状態の分離、external writeの対象と結果。

上記で十分とする。追加artifact、screenshot、統一schema／attestation、全master、実顧客workspace、downstream、
release／installを合格条件にしない。

## External live gate

ユーザーが許可したexternal writeは、既存branch `codex/fix-update-migration-windows`の`origin`への通常pushと、
Draft PR #12のexact candidateに因果する既存Windows CIだけである。force push、別branch／remote、merge、release、tag、
Marketplace、install／cache、downstream writeへ拡張しない。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更file、Mac 3 command、LF／CRLF正例、改ざん拒否、workspace保護、
Windows exact candidate run、外部操作を記録する。fresh独立Evaluatorは同一candidateでC1、C3、C6をmicro評価し、
全Acceptance Criteria、既存ゼロ許容境界、product finding 0、必須回帰0 FAILの場合だけPASSとする。
