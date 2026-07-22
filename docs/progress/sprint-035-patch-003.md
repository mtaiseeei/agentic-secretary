# Sprint 035 Patch 003 — Generator Progress

## 実装結果

- 設定済みGoogle Chat wizardを開くと、保存済み一覧を最新候補として即表示せず、GitHub Actions経由の最新SPACE確認を開始するようにした。
- Google Chat APIの全pageをたどり、`spaceType=SPACE` だけを採用する。DM、group DM、type不明、ID欠落、重複IDを候補から除外する。
- 取得結果を `complete`／`partial`／`failed` に分け、既知候補とmemory上でmergeする。既存選択・既知候補・追加fieldを保持し、新規SPACEは未選択で追加する。
- discoveryは専用correlation IDで今回のActions runとresultを対応づける。resultにはcorrelation、status、generatedAt、SPACEのname／displayName／spaceTypeだけを残す。
- failure、timeout、古い／別correlation resultでは既知一覧を保持し、再試行は新しいcorrelationを発行する。
- discoveryだけでは設定、履歴、自動取得、通常sync stateを変更しない。通常syncと3時間scheduleは従来のまま。

## 変更path

- `plugins/secretary/skills/google-chat/assets/wizard/app.js`
- `plugins/secretary/skills/google-chat/scripts/client.mjs`
- `plugins/secretary/skills/google-chat/scripts/config-transaction.mjs`
- `plugins/secretary/skills/google-chat/scripts/schedule.mjs`
- `plugins/secretary/skills/google-chat/scripts/wizard-server.mjs`
- `plugins/secretary/skills/google-chat/scripts/actions-discovery.mjs`
- `plugins/secretary/skills/google-chat/scripts/discovery.mjs`
- `scripts/sprint-035-patch-003-discovery-test.mjs`
- `docs/progress/sprint-035-patch-003.md`

## Patch専用回帰

実行: `node scripts/sprint-035-patch-003-discovery-test.mjs`

- exit 0、`SPRINT035_PATCH003_PASS=32 SPRINT035_PATCH003_FAIL=0`
- 1／3 page、DM・重複・ID欠落除外、page途中失敗、先頭page失敗、token循環をsynthetic APIで確認した。
- complete／partial／failedの設定済みentryをlocal wizardで実行し、既存選択保持、新規未選択、保存前差分0、再試行copyを確認した。
- 実API、OAuth、Repository Secret、GitHub Actionsは実行していない。

## 既存回帰

| command | exit | 結果 |
|---|---:|---|
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50 PASS / 0 FAIL |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | 148 PASS / 0 FAIL |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43 PASS / 0 FAIL |
| `node scripts/sprint-019-google-chat-test.mjs` | 1 | 製品挙動50 PASS後、既存README期待1 FAIL |
| `bash scripts/sprint-035-patch-001-regression.sh` | 1 | Patch 001が固定する旧 `app.js` digest 1 FAIL。後続の共有構文・Chatwork・Google Chat挙動は継続PASS |
| `git diff --check` | 0 | PASS |

## 既知の問題

- Sprint 019の1件は既存READMEの高度設定／管理者順序の期待差で、本Patchの製品diffとは非因果。
- Sprint 035 Patch 001 wrapperの1件は、今回意図的に更新した `app.js` を旧digestへ固定する過去baseline。製品挙動の失敗ではないが、既存wrapper全greenは未達としてEvaluatorへ渡す。
- 実Actionsのtimeout／cancel／stale runは実行せず、既存のrun相関回帰とsynthetic resultで確認した。

## 外部操作と安全記録

- 実Google Chat API、OAuth、Repository Secret、GitHub Actions: `not-run`
- external remote write、commit、push、release: `not-run`
- Secret値、access／refresh token、認可code、message本文をresult／logへ保存していない。
- Orchestrator所有の `docs/sprints/state.md` とPlanner契約は変更していない。

## Evaluator handoff

- Patch専用32件を先に実行する。complete／partial／failedで設定済みentryの表示と、保存前config差分0を確認する。
- UI評価ではlocal synthetic fixtureを使い、最新候補確認中、partial／failedの非断定copy、再試行導線をbrowserで確認する。
- Actions/APIのlive確認はユーザー承認なしに行わない。今回のcandidateはcommitしていない。

## Retry 1 — failed再試行のUI状態保持

- 再現: failed画面で検索語を`今回`、caretを2/2、既知の未選択SPACEを追加選択して2件にした後、最新候補を再試行すると、検索語以外のcaret／focus／未保存選択が失われた。
- 修正: `discoverConfiguredSpaces()`が再試行ごとに`state.selected`を保存済みconfigから作り直す処理を削除した。保存済み選択による初期化はbootstrap時だけ行い、その後のcomplete／partial／failedでは編集中のSetを保持する。
- loading画面へ移る直前に検索欄またはcheckboxのfocus key、`selectionStart`、`selectionEnd`、方向を一時snapshotし、結果画面の描画直後だけ復元する。戻る／終了、再認証、設定破棄の経路へはsnapshotを持ち越さない。
- Patch専用回帰へ独立Evaluatorの操作を追加した。complete／partial／failedの各結果で、query=`今回`、caret=2/2、activeElement=検索欄、保存済み1件＋未保存変更1件=選択2件を検査する。

### Retry 1 検証結果

| command | exit | 結果 |
|---|---:|---|
| `node scripts/sprint-035-patch-003-discovery-test.mjs` | 0 | 45 PASS / 0 FAIL |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50 PASS / 0 FAIL |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | 148 PASS / 0 FAIL |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43 PASS / 0 FAIL |
| `bash scripts/sprint-035-patch-001-regression.sh` | 1 | 今回更新した`app.js`の旧digest／edition inventoryのみ非因果FAIL。共有構文、Chatwork、Google Chat実動作はPASS |

- 実Browserのfailed fixtureで、再試行後もquery=`今回`、caret=2/2、activeElement=検索欄、選択中2件を確認した。desktop／390px相当mobileとも横overflow 0、console error 0。正確な200%表示はRetry 1では`not-run`。
- 実OAuth、実Google Chat API、Repository Secret、GitHub Actions、remote writeは全て`not-run`。

### Retry 1 Evaluator handoff

- failed画面で検索語`今回`、caret=2/2、既知未選択を追加checkして選択中2件にし、「最新候補をもう一度確認する」を実行する。結果後のquery、caret、activeElement、選択数を確認する。
- 同じ操作をcomplete／partial／failedで行い、戻る／終了や明示的な設定破棄では編集中snapshotが永続化されないことを確認する。
- AgenticのPatch専用45件、Yasashiiの同回帰、private専用回帰を先に実行する。live操作は引き続きユーザー承認なしに行わない。
