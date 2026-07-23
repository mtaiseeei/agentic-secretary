# Sprint 037 Patch 001 — 呼び方の設定値を履歴メタデータへ再掲しない

- Type: micro
- Risk: standard（呼び方変更transactionのjournal本文とGit commit subjectだけを狭く変更する）
- 主眼: 確認済みの呼び方を3つの現役正本へ同期しながら、journalとGit commit subjectには変更項目だけを記録し、実際の値を不要に複製しない。
- 依存: `sprint-037` done。Yasashii Sprint 037の独立評価で、共通transactionの値再掲が下流契約と衝突する `spec-issue` が確認された。

## 背景と正本判断

Sprint 037の共通transactionは、既存workspaceの呼び方を `preferences.md`、`AGENTS.md`、
`MEMORY.md` へ原子的に同期し、journalとlocal commitを各1件作る。一方、現在のjournal本文と
commit subjectは確認済み値をそのまま含む。Yasashiiの独立評価では、この値再掲と
固定Agentic candidateとのbyte一致要件が同時には満たせず、下流だけでは直せないと判定された。

安全性をedition差分にせず、Agenticの共通transactionを正本として項目名だけの表現へ揃える。
呼び方そのものは現在値を表示する3正本へだけ反映する。Git commitが3正本の内容を記録することと、
commit subjectへ値を再掲しないことは区別する。

## micro判定

- 変更は同一機能領域の成功時に生成する2つの履歴メタデータへ閉じる。
- 一時Git workspaceで3正本、journal、commit、rollbackを検査する既存回帰がある。
- 候補探索、4経路、保存schema、外部API、remote、下流overlay方式を変更しない。

## 外から見える成果

呼び方を変更すると、秘書が使う3つの現役正本は従来どおり同じ値へ更新される。
活動記録とGitの件名には「呼び方を変更した」という事実だけが残り、実際の名前は重ねて表示されない。

## Scope

### A. 値を再掲しない履歴メタデータ

- journal本文を `設定を変更: 呼び方` に固定する。
- Git commit subjectを `設定を変更（呼び方）` に固定する。
- 両方とも、確認済みの呼び方、他の設定値、値の一部、値から導いた要約・hash・escape表現を含めない。
- journal type `did`、journal event 1件、local commit 1件を維持する。

### B. 3正本とtransactionの維持

- 確認済み値は `secretary/memory/preferences.md`、`secretary/AGENTS.md`、
  `secretary/memory/MEMORY.md` の現役表示へ同じ値を反映する。
- 初回decision、他設定、手書き行、MEMORY索引、open／closed project構成を維持する。
- 空値、path境界、symlink、各file書込み、journal、commitの失敗では、
  3正本、journal、Git HEAD、index、working treeを開始時へrollbackする。
- 成功時だけ所有path限定local commitを作り、pushしない。

### C. 共通coreと下流引き渡し

- `owner-name-transaction.mjs` はedition条件を持たない共通実装とし、Yasashii専用分岐を追加しない。
- Agenticの独立評価とlocal commitまでは実Yasashii repo、installed cache、利用者workspaceを変更しない。
- 一時downstream candidateでは共通scriptをAgentic candidateとbyte-for-byte一致させ、
  同じ非再掲fixtureに合格させる。
- 実Yasashii同期は独立評価PASS済みAgentic完全SHAを固定して行い、同scriptのbyte一致を
  下流Sprintの必須条件にする。本PatchのPASSだけで実Yasashii同期済みとは表示しない。

### D. 決定的な回帰

- `scripts/sprint-037-test.mjs` でjournal本文とcommit subjectの完全一致を検査する。
- 通常のUnicode名に加え、空白、`=`、`:`, 引用符、backtick、`$()`、`${}`、
  Markdown記号等を含む合成値を使う。
- 正規化後の値は3正本へ一致して保存され、journal本文とcommit subjectには
  完全値・入力固有の識別断片・escape値・値由来表現が0件であることを確認する。
- 既存failure injection、初回decision不変、open／closed、push 0件、候補探索を回帰する。

## Non-scope

- オンボーディング4経路、account-name source priority、Unicode case-fold、hostname除外、
  候補表示、保存前確認、探索結果非保存の変更。
- 3正本のpath／schema、初回decisionの内容または役割の変更。
- journal／local commitの廃止、push追加、rollback範囲の縮小。
- 呼び方以外の設定UI・値・例文・確認順の再設計。
- 設定値をhash、伏字、文字数、頭文字へ変換して履歴メタデータへ残すこと。
- Sprint 045のopen／closed project機能。
- 実Yasashii repo、installed cache、利用者workspace、remote、release、外部serviceへのwrite。

## Acceptance Criteria

1. 成功時のjournalはtype `did` の1 eventで、本文が `設定を変更: 呼び方` に完全一致する。
2. 成功時のlocal commitは1件で、subjectが `設定を変更（呼び方）` に完全一致する。
   commit bodyを追加せず、pushは0件である。
3. Unicode、連続空白、`=`、`:`, 引用符、backtick、`$()`、`${}`、Markdown記号を含む
   複数の合成値で、正規化後の値、入力固有の識別断片、escape表現、値由来文字列がjournal本文と
   commit subjectへ0件である。
4. 同じfixtureで正規化後の値は3正本の現役表示にだけ一致して反映され、他設定、手書き行、
   MEMORY索引、open／closed project構成、初回decisionは不変である。
5. 3 fileの各書込み前、journal前、commit前を含むfailure injectionで、
   3正本、journal、HEAD、index、working treeが開始時へ戻り、部分commit／追加eventが0件である。
6. `owner-name-transaction.mjs` にedition別分岐がなく、Agentic製品testと一時downstream candidateが
   同じ非再掲fixtureへ合格する。
7. 一時downstream candidateの `plugins/secretary/scripts/owner-name-transaction.mjs` は
   評価対象Agentic candidateとbyte-for-byte一致し、SHA-256 digestが同一である。
   実Yasashii repoの同期済み主張は、下流独立評価まで行わない。
8. Sprint 037の4経路、候補探索、Unicode case-fold、hostname除外、候補0件、保存前確認、
   3正本transaction、初回decision、個人・環境固有情報scanを回帰させない。
9. Sprint 045保護対象6 fileの差分0件で、transaction fixtureのopen／closed行が保持される。
10. 次の必須回帰が0 FAILである。
    - `node scripts/sprint-037-test.mjs`
    - `bash scripts/sprint-011-regression.sh`
    - `bash scripts/sprint-012-regression.sh`
    - `bash scripts/sprint-022-regression.sh`
    - Patch専用のAgentic↔一時downstream byte一致・同一fixture回帰
    - `git diff --check`
11. Agentic repo以外の実repo、installed cache、利用者workspace、external service、
    remote、releaseへのwriteが0件である。

## 軽量評価

Type: microのため、Evaluatorは次の3項目だけを各5点満点、閾値5で採点する。

1. 機能完全性: 固定journal／commit subject、3正本だけへの値反映、初回decision不変、1 event／1 commit。
2. 動作安定性: metacharacter／Unicode入力、全failure injection、atomic rollback、push 0件。
3. 回帰なし: Sprint 037近傍回帰、Sprint 045保護、一時downstream byte一致、外部write 0件。

1項目でも5未満ならFAIL。常駐UI変更はないためbrowser screenshotは必須にしない。

## Evidence safe harbor

- journal対象行、`git log -1 --format=%s`、commit body、commit件数。
- 合成入力、正規化後値、3正本表示、初回decision／他行／索引／open／closedの前後digest。
- journal／commit subjectの完全一致と、完全値・入力固有の識別断片・escape値・値由来表現の検索結果。
- failure injectionごとの3正本、journal、HEAD、index、working treeの前後snapshot。
- Agenticと一時downstream common scriptのpath、byte length、SHA-256 digest、同一fixture結果。
- 必須回帰のcommand、exit code、PASS／FAIL件数、Sprint 045対象diff、外部write 0件。

上記で十分とし、新しいcollector、統一attestation、外部署名、実Yasashii同期を
Agentic側の追加合格条件にしない。

## 完了条件

- Generatorは共通coreと決定的回帰だけを変更し、`docs/progress/sprint-037-patch-001.md` に
  実装、fixture、rollback、byte一致、回帰、not-runを記録する。
- Evaluatorは別作業単位で再実行し、`docs/feedback/sprint-037-patch-001.md` に
  軽量3項目の合否と証跡を書く。
- Evaluator PASSとオーケストレーターのstate更新前に完了扱いにしない。
- AgenticのPASS・local commit後、Yasashiiはその完全SHAを固定した下流Sprintで同期・独立評価する。
