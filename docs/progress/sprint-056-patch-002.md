# Sprint 056 Patch 002 — Generator handoff

## 実装

- `plugins/secretary/scripts/update-apply.mjs`: migrationの旧配布text assetをfingerprint照合するときだけCRLFをLFへ正規化する。末尾処理以外の文字は変えず、workspaceの現在hash、planのbefore／after hash、適用後hash、backup tree hashは従来どおりraw bytesで比較する。
- `scripts/check-release-integrity.py`: canonical／legacy CHANGELOGはraw bytesを先に保持してbyte-for-byte比較し、解析用にdecodeした文字列だけCRLFをLFへ正規化する。UTF-8 decode、version順、重複、latest、必須5節、migration到達性の検査は維持した。
- `scripts/sprint-032-update-gate-test.mjs`: staleな`0.12.0`固定期待をmanifestの現行version `0.13.0`との相互整合へ更新した。16 case、公開`0.7.0`履歴比較、same-version／downgradeの副作用0件は維持した。CRLF fixture生成はWindowsですでにCRLFの入力をCRCRLFにしないよう`/\r?\n/`を使う。
- `scripts/sprint-056-patch-001-migration-test.mjs`: CRLF配布assetの正例と、改行以外を変えたassetの拒否を追加した。拒否時はsession、ledger／marker／管理fileを含むworkspace tree、HEADが不変であることを確認する。fixture repositoryだけ`core.autocrlf=false`にし、テストが意図して作ったworkspaceのraw bytesをGit操作後も固定する。製品candidateのcheckout設定には触れていない。
- `scripts/sprint-056-patch-001-release-test.mjs`: Git-free archiveのcanonical／legacy CHANGELOGをともにCRLFにし、raw bytes一致を保ったままrelease／archive gateが通る回帰にした。

## Mac回帰

テスト開始前のNode process数は26（上限40以下）。次の3 commandを順番に実行した。

```text
node scripts/sprint-056-patch-001-migration-test.mjs
SPRINT056_PATCH001_PASS=46 SPRINT056_PATCH001_FAIL=0

node scripts/sprint-056-patch-001-release-test.mjs
SPRINT056_PATCH001_RELEASE_PASS=13 SPRINT056_PATCH001_RELEASE_FAIL=0

node scripts/sprint-032-update-gate-test.mjs
SPRINT032_RELEASE_PASS=16 SPRINT032_RELEASE_FAIL=0
```

追加回帰ではCRLF distribution assetがLF metadata fingerprintへ照合できた。非改行tamperはfingerprint不一致でexit 3となり、session／workspace tree／HEADへのwriteは0件だった。CRLF CHANGELOGのarchive gateはcanonical／legacy raw bytes一致を保ってPASSした。

## Evaluator handoff

- UIはなく、起動URL／browser／screenshotは非適用。上記3 commandが回帰suite兼操作手順である。
- main orchestratorがcandidate `3570511bdc8e93d097b55f7c8924055e9b11605f`を既存branchへ通常pushし、Draft PR #12に因果するWindows run `34505323871`を実行した。Windows Server 2025、`win32 x64`、Node `v22.23.2`、Python `3.12.10`で、migration `46/0`、release/archive `13/0`、Sprint 032 `16/0`、以前のWindows conversation migration `9/0`が成功した。
- 同runの後続Sprint 050 Patch 004は`inventory-digest-stale:update-release`で`15/1`となり、workflow全体は失敗した。今回の製品／focused testの失敗ではなく、Patch 001で追加済みguideに対するinventory contentDigestの追随漏れである。main orchestratorが既存digest算出経路で整合記録だけを更新し、同じWindows workflowを再実行する。製品／focused testは変更しない。
- inventory contentDigestだけをそろえた最終candidate `2897453ac118469d126cd0c3df3f6cec701ee62e`のWindows run `34505741310`では、対象migration `46/0`、release/archive `13/0`、Sprint 032 `16/0`、以前のconversation migration `9/0`が再度成功した。併走したnative `25/0`、Windows path `12/0`、Git ingest `45/0`、Clarity Harness scan `16/0`も成功した。
- workflow後続のsecret regressionは`8/2`で、SR-001はこのprogressが候補commitにまだ含まれないこと、SR-009は本Patch外の既存Clarity concurrent timeout 1件だった。main receipt commitで前者を整合し、後者は本Patchの製品／検査変更範囲外として変更しない。したがってworkflow全体成功とは扱わず、本Patchで固定したWindows対象は0 FAILと記録する。重複して開始された手動run `34505758891`はcancelされ、証拠には使わない。
- Generatorはremote write、commit、push、merge、release、tag、Marketplace、install／cache、private／Yasashii、実利用者workspaceを操作していない。未追跡の実`.clarity/`と`CLARITY.md`にも触れていない。
- 製品コードを含む変更であり、検証コードだけの連続roundではない。version、manifest、CHANGELOG内容、migration metadata、公開済みbytesは変更していない。
