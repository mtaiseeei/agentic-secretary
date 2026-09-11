# Sprint 057 — 0.13.1 public release source candidate

**ステータス:** Phase A実装完了 - 独立評価待ち

## 実装内容

- Claude／Codex manifest、Claude marketplace、正本／互換CHANGELOG、release／host inventory、READMEと利用者ガイドを`0.13.1`へそろえた。公開状態は`source-candidate-unverified`のまま維持し、tag／Release／marketplace／installed cache／loaded sessionを未完了としている。
- `plugins/secretary/migrations/0.13.0-to-0.13.1.json`を内容差分のないforward edgeとして追加した。`supported.json`は既存8版に公開済み`0.13.0`を加え、`currentFamilyMinimum`は`0.13.0`のまま保持した。
- release integrityとGit-free archive gateを、9対応元から`0.13.1`へ到達できるcurrent contractへ更新した。forward-only、graph破損、asset／metadata不一致、operation ID重複、既存tagの検査は維持した。
- focused migrationは既存の8版→`0.13.0`全caseを残し、9版→`0.13.1`の有限・決定的経路、apply後の冪等性、`0.13.0→0.13.1`の本文bytes／mtime／`changedPaths`／content write 0を追加した。旧target `0.13.0`で停止した`0.10.1` sessionの回復は、隔離生成した将来edgeではなく実配布edgeを使う。
- 同focused runnerへ任意の`--plugin-root`を追加した。履歴templateはrunnerのsource Gitから取得し、runtime、migration、edition、現行templateは指定した展開済みartifactから使えるため、公開後EvaluatorがGit-free artifactの実コードを操作できる。
- `adapters/downstream-clarity-handoff.json`とそのvalidation pinを`0.13.1`へ更新した。過去のaccepted source／評価／利用者判断の固定記録は変更していない。
- 変更したrelease、host、handoff面に因果するcollaboration inventory 6 digestだけを再計算した。他14 surfaceのdigest、既存edge／asset、過去fixture、0.13.0 test caseは変更していない。

## 変更ファイル

- version／release metadata: `.claude-plugin/marketplace.json`、`plugins/secretary/.claude-plugin/plugin.json`、`plugins/secretary/.codex-plugin/plugin.json`、`plugins/secretary/{CHANGELOG.md,release-inventory.json,host-inventory.json,collaboration-inventory.json}`、`plugins/yasashii-secretary/CHANGELOG.md`
- migration／gate: `plugins/secretary/migrations/{supported.json,0.13.0-to-0.13.1.json}`、`scripts/{check-release-integrity.py,archive-release-gate.mjs,sprint-056-patch-001-migration-test.mjs}`
- handoff pin: `adapters/downstream-clarity-handoff.json`、`scripts/sprint-048-handoff.mjs`
- current guide: `README.md`、`docs/guide/{README.md,getting-started.md,project-clarity.md,update-0.13.1.md,update-0.13.0-migration-recovery.md}`
- Generator handoff: `docs/progress/sprint-057.md`

## Mac検証

- dispatch時のNode process数は主担当計測で28（40以下）。実行直前の再取得はmacOSの`sysmon request failed`で値を取得できなかったため0件とは解釈していない。dev server、browser、Playwright、watcherは起動せず、必須commandを順番に実行した。
- `node scripts/sprint-056-patch-001-migration-test.mjs`: exit 0、`SPRINT056_PATCH001_PASS=65 SPRINT056_PATCH001_FAIL=0`。既存8版→0.13.0 case、9版→0.13.1の決定的経路、0.13.0空hop、0.10.1旧target回復、partial／backup／HEAD／scope／edition／tamper保護を含む。
- `node scripts/sprint-056-patch-001-release-test.mjs`: exit 0、`SPRINT056_PATCH001_RELEASE_PASS=13 SPRINT056_PATCH001_RELEASE_FAIL=0`。正常checkout／Git-free copyと既存negative caseを確認した。
- `node scripts/sprint-032-update-gate-test.mjs`: exit 0、`SPRINT032_RELEASE_PASS=16 SPRINT032_RELEASE_FAIL=0`。current `0.13.1` manifest／CHANGELOG、onboarding、same-version副作用0、downgrade拒否、公開0.7.0履歴不変を確認した。
- `node scripts/sprint-038-patch-003-conversation-migration-test.mjs`: exit 0、`SPRINT038_PATCH003_PASS=9 FAIL=0`。darwin arm64 / Node v26.7.0。Windows nativeは`NOT-RUN`であり、Windows PASSへ流用しない。
- `python3 scripts/check-release-integrity.py --root .`: exit 0、release integrity PASS。
- `node scripts/sprint-049-inventory.mjs validate`: exit 0、20 surface／67 case、digest／marker VALID。
- Git metadataを含まない一時plugin copyを`--plugin-root`へ指定したfocused migration: exit 0、65 PASS / 0 FAIL。履歴templateはsource Git、runtime／migration／現行templateはcopyから読み、終了後に一時directoryを削除した。
- JSON parse、Node syntax、Python compile、canonical／legacy CHANGELOG byte一致はPASS。Python compileが作った`__pycache__`は削除済み。
- exact candidateのGit-free `git archive`とarchive gateはcandidate commit後に実行する。Windows Node 22／Python UTF-8 modeはremote workflowの実結果を別記録とし、Mac結果や過去runを代用しない。

## 自己評価

| 基準 | スコア(1-5) | コメント |
|---|---:|---|
| 機能完全性 | 5 | 版面、9版到達、空hop、旧target回復、current inventory／guide／handoff pinをPhase A契約内で実装した。 |
| 動作安定性 | 5 | focused 65/65、release 13/13、032 16/16、038 9/9、integrity／inventoryが0 FAIL。 |
| デザイン性 | 5 | UI非対象。既存の配布metadataとガイド構造を維持し、currentと履歴を区別した。 |
| 独自性 | 5 | UI非対象。source Gitの履歴fixtureとGit-free artifact runtimeを分ける小さい既存runner拡張で公開後検証を可能にした。 |
| エラーハンドリング | 5 | downgrade、unsupported、graph破損、partial、backup、HEAD、scope、edition、symlink、asset改変の拒否を維持した。 |
| 回帰なし | 5 | 0.13.0の全focused case、公開履歴、raw backup／hash境界を残し、直接因果する既存suiteだけを実行した。 |

## 技術的な判断

- `currentFamilyMinimum`はruntimeの現行family guardであり、新しいpatch versionではないため`0.13.0`を維持した。公開済み`0.13.0`は`supportedFrom`へ明示してcurrent graphの検証対象に加えた。
- `0.13.0→0.13.1`では台帳のversion bookkeepingは行うが、workspace管理本文は変更しない。これを本文bytes、mtime、`changedPaths`、`contentWriteCount`で分けて検査した。
- 0.13.0向け既存guideとtestを履歴として残し、0.13.1向けcurrent guideとtestを追加した。旧release bytesや固定評価記録は書き換えていない。

## 既知の課題

- Windows native update job、remote main、tag、Release、asset、実Release artifactは未検証。主担当とfresh EvaluatorがPhase A／Bを分けて確認する。
- public source candidate以外のprivate／Yasashii source、installed cache、実workspace、`.clarity/**`／`CLARITY.md`は操作していない。

## Evaluatorへの引き渡し事項

- UI／URL／screenshotは非適用。上記6 commandを基本回帰として実行する。
- source focused回帰: `node scripts/sprint-056-patch-001-migration-test.mjs && node scripts/sprint-056-patch-001-release-test.mjs && node scripts/sprint-032-update-gate-test.mjs && node scripts/sprint-038-patch-003-conversation-migration-test.mjs && python3 scripts/check-release-integrity.py --root . && node scripts/sprint-049-inventory.mjs validate`
- Git-free artifact: `node <source>/scripts/sprint-056-patch-001-migration-test.mjs --plugin-root <artifact>/plugins/secretary`。runner自体の`git show`はsource履歴、CLIと配布物はartifactを使う。
- Phase Aではexact candidate SHA／tree、Mac結果、因果するWindows update job、Git-free archiveのfile inventory／digestを確認する。Phase A PASS前にmain／tag／Releaseへ進めない。
- Phase Bでは別のfresh Evaluatorがremote main、`v0.13.1` tag、Release metadata、ダウンロードした実artifactのbytesと代表migrationをread-onlyで確認する。

## Phase A candidate／Windows receipt（candidate後の未commit記録）

- 固定candidate: full SHA `05fcfa31ce5e76639cd1f4f492c1f26f2308c26d`、Git tree `53a3561c3f5eee68f556df6413aef1f48da6d11c`。worktree cleanで固定後、主担当が同じSHAを既存PR #12 headへ通常pushした。amend前の`75e7503`は使用していない。
- exact `git archive` tar: `/private/tmp/secretary-057-exact-archive.Ow8cVq/candidate-final.tar`、SHA-256 `1b1295a268fba20f994b5a6eb90ee90c37902eb2a9ad44a1ffe1ccfe34419eb8`、tar entry 1070。展開rootのarchive gateは15 PASS / 0 FAIL、release integrity PASS、`.git`なし、canonical／legacy CHANGELOG byte一致。
- exact archiveのplugin treeは、`--plugin-root`で65 PASS / 0 FAILを実行したamend前archiveのplugin treeと`diff -qr`差分0。amend差分はOrchestrator所有`docs/sprints/state.md`末尾の余分な空行1件だけで、製品／test bytesは同一。
- Windows workflow run `34557176699`はexact head SHAが上記candidateと一致。Sprint 057専用job `windows-update-migration` / job `103132195821`は2026-09-11T03:06:28Z開始、03:08:37Z終了、SUCCESS。
- 専用jobではsetup-node、setup-python、native Windows runtime確認、`Supported update migrations and pending recovery`、`Release and archive migration guards`、`Previous Windows conversation migration regression`の全stepがSUCCESS。workflow定義どおりNode 22／Python UTF-8 modeを使う。ログ本文はworkflow全体進行中のため取得待ちで、Macの件数や過去runをWindows件数へ流用していない。
- 同runの別job `windows-native` / job `103132195975`では`Existing update gate regression (Sprint 032)`、Windows path／rollback、Git ingest、conversation migration、Clarity Harness scanまでSUCCESSを確認した。後続Clarity検査を実行中であり、workflow全体はこのreceipt時点で`in_progress`。専用jobのSUCCESSとworkflow全体の最終結果を分けて扱う。
- このreceiptはcandidate固定後のため未commitで引き渡す。candidateの再commit／再pushは行わず、fresh Phase A Evaluatorがexact source、archive、Windows結果を独立判定する。
