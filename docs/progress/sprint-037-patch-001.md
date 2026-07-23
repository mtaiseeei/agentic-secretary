# Sprint 037 Patch 001 — 呼び方を履歴メタデータへ再掲しない

**ステータス:** Generator実装・因果範囲の自己検証完了。fresh独立Evaluator待ち

## 実装結果

共通の `plugins/secretary/scripts/owner-name-transaction.mjs` で、呼び方変更時に作る
履歴メタデータを次の固定文へ変更した。

- journal type: `did`
- journal本文: `設定を変更: 呼び方`
- Git commit subject: `設定を変更（呼び方）`
- Git commit body: なし

確認済みの呼び方は従来どおり、次の3正本の現役表示へ同じ値で保存する。

- `secretary/memory/preferences.md`
- `secretary/AGENTS.md`
- `secretary/memory/MEMORY.md`

journal本文とcommit subjectは入力値を参照せず、固定literalだけを渡す。
値の一部、hash、伏字、escape表現等を作る処理も追加していない。
edition条件分岐はなく、Agentic／Yasashiiで同じcommon scriptを使う。

## 決定的な回帰

`scripts/sprint-037-test.mjs` のtransaction回帰を次のように強化した。

- 通常のUnicode名と、連続空白、`=`、`:`, 引用符、backtick、`$()`、`${}`、
  Markdown記号を含む合成値を使用。
- 正規化後の値が3正本へ一致して保存されることを確認。
- journal eventが `- 09:30 [did] 設定を変更: 呼び方` に完全一致することを確認。
- commit subjectが `設定を変更（呼び方）` に完全一致し、bodyが空であることを確認。
- 完全値と入力固有の識別断片がjournal／subject／bodyへ0件であることを確認。
- `before-write-1/2/3`、`before-journal`、`before-commit` の5失敗点で、
  3正本、journal、HEAD、index、working treeが開始時へ戻ることを確認。

Patch専用の `scripts/sprint-037-patch-001-test.mjs` を追加した。
一時領域へだけdownstream candidateを作り、Agentic candidateのcommon scriptをbyte単位で複製して、
byte列とSHA-256の一致、edition分岐0件、Agentic／一時downstream双方の同一非再掲fixtureを検査する。

```text
path: plugins/secretary/scripts/owner-name-transaction.mjs
bytes: 6626
SHA-256: f79242124e4cc13152774f0434b504fc5e97f316304e088884b8bbc7b65d8d24
```

## 変更file

- 共通transaction: `plugins/secretary/scripts/owner-name-transaction.mjs`
- Sprint 037回帰: `scripts/sprint-037-test.mjs`
- Patch専用回帰: `scripts/sprint-037-patch-001-test.mjs`
- Generator handoff: `docs/progress/sprint-037-patch-001.md`

Planner所有のspec／Sprint契約、Orchestrator所有のstate、Evaluator所有のfeedbackは編集していない。
着手時から存在した未commitのPlanner／Orchestrator差分を保持した。

## 自動テスト結果

| コマンド | 結果 |
|---|---:|
| `node scripts/sprint-037-test.mjs` | 14 PASS / 0 FAIL。scan 279 files、unexpected 0、負fixture 3/3 |
| `node scripts/sprint-037-patch-001-test.mjs` | 5 PASS / 0 FAIL。Agentic／一時downstream byte・SHA一致 |
| `bash scripts/sprint-011-regression.sh` | 68 PASS / 0 FAIL |
| `bash scripts/sprint-012-regression.sh` | 38 PASS / 0 FAIL |
| `bash scripts/sprint-022-regression.sh` | 単独再実行で69 PASS / 0 FAIL、wrapper 8 PASS / 0 FAIL |
| `git diff --check` | PASS |
| Sprint 045保護対象6 fileへの `git diff HEAD` | 0 files |

Sprint 022は最初に3 suiteを並行実行した際、timeout fixture
`safe-git timeout後のcommit・push・子孫・副作用0件` が `calls=[]` で1件だけ失敗した。
同suiteを直後に単独再実行すると69/69、wrapper 8/8で合格した。
対象実装とテストには本Patchの差分がなく、非決定的な初回結果も隠さず記録する。

## 維持した境界

- 初回の4経路、候補source順、Unicode case-fold、hostname除外、候補0件、
  保存前確認、探索結果非保存は変更していない。
- 初回decision、他設定、手書き行、MEMORY索引、open／closed project行を維持した。
- 成功時のjournal 1 event、local commit 1件、push 0件を維持した。
- 5失敗点で3正本、journal、HEAD、index、working treeのrollbackを確認した。
- Sprint 045保護対象6 fileは変更していない。

## Not Run / 外部write

- 実 `yasashii-secretary` repo、installed cache、利用者workspaceへの同期: not-run
- remote fetch／push、PR、release、plugin install／update: not-run
- external service、OAuth、Repository Secret、GitHub Actions: not-run
- browser／screenshot: 常駐UI変更がないためnot-run
- 開始HEADから既知redの広いmaster／release suite: 契約の因果範囲外のためnot-run

実repo外で作ったのはOS一時領域内の合成workspaceと一時downstream candidateだけで、
各test終了時に削除した。Agentic repo以外、cache、remote、external serviceへのwriteは0件。

## Evaluator確認シナリオ

1. Agenticと独立に作る一時downstream candidateでcommon scriptのbyte数とSHA-256を照合する。
2. 通常Unicode名とmetacharacterを含む合成名で、3正本の現役表示だけに正規化値が保存されることを確認する。
3. journal type／本文／event件数、commit subject／body／件数を完全一致で確認し、
   完全値、入力固有断片、escape値、値由来表現が0件であることを確認する。
4. 5失敗点で3正本、journal、HEAD、index、working treeが開始snapshotへ戻ることを確認する。
5. Sprint 037、011、012、022とSprint 045保護範囲を増分再評価する。

Generator実装と因果範囲の自己検証は完了した。Sprint完了判定と実Yasashii同期は、
fresh独立EvaluatorとOrchestrator、および下流Sprintへ委ねる。
