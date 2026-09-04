# Sprint 051 Generator handoff

## 実装結果

Sprint 051の製品実装は完了した。`plugins/secretary/scripts/lib/git-ingest.mjs` に同期／非同期の共通Git取り込みを追加し、Chatwork／Google Chatの6 callsiteをこのhelperへ集約した。検索前は現在branch、Actions後は相関済みの `run.branch` を使う。

- 共通処理: `plugins/secretary/scripts/lib/git-ingest.mjs`
  - rootの物理identity、current／expected branch、remote、fetch targetを順番に確認する。
  - `git fetch <remote> refs/heads/<branch>` と `git pull --ff-only --no-rebase <remote> refs/heads/<branch>` をargv配列・`shell: false` で実行する。
  - upstreamへ依存せず、up-to-date／local-ahead／fast-forwardedと各停止理由を分類する。
  - remote変更pathとdirty pathが重なる場合だけ停止し、非競合のtracked／untracked／staged差分とindexを保持する。
  - NUL区切り、rename／copy旧新path、非ASCII path、fetch/pull間のtarget進行、pull後postconditionを扱う。
  - failure payloadはallowlistだけを返し、remote URL、raw stderr、資格情報、絶対pathを返さない。
- command安全境界: `plugins/secretary/scripts/lib/external-ops.mjs`
  - `spawn`／`spawnSync` に `shell: false` を明示した。
- Actions相関: `plugins/secretary/scripts/lib/actions-run.mjs`
  - run発見を既定60秒、pollを250msから最大2,000msまでの指数backoffへ変更した。
  - CLI > env > default、無効値はdefaultという優先順位と、決定的な `now`／`wait`／runner seamを追加した。
  - dispatch、run-correlation、actions-runを分離し、gh auth／transport／timeout／killをsanitized codeで区別する。API Token候補は確認済みworkflow conclusion failureだけに限定した。
- 6 callsite:
  - `plugins/secretary/skills/chatwork/scripts/wizard-server.mjs` の `runSync` と `discoverRooms`
  - `plugins/secretary/skills/chatwork/scripts/search-flow.mjs`
  - `plugins/secretary/skills/google-chat/scripts/search.mjs`
  - `plugins/secretary/skills/google-chat/scripts/search-flow.mjs`
  - `plugins/secretary/skills/google-chat/scripts/actions-discovery.mjs`
- Chatwork UI: `plugins/secretary/skills/chatwork/assets/wizard/app.js`
  - 指定された `discover-failure`、`settings-result-failure`、`initial-result-failure` だけをstage別表示にした。
  - sanitized run URL、dirty conflict path、分岐／衝突解消後の再試行commandをtechnical detailsへ表示する。Google Chat画面は追加していない。
- Windows外部gate準備: `.github/workflows/windows-recording-regression.yml`
  - 対象製品pathと新テストをpathsへ加え、`windows-2025` で `--require-windows` を実行するstepを追加した。dispatchはしていない。
- 回帰追随:
  - `adapters/neutral-base.json` と `scripts/fixtures/sprint-029/yasashii-copy-baseline.json` は、意図的に変更したChatwork app.jsのdigestだけを更新した。
  - Sprint 014／020／022／024の既存テストは、旧direct pull専用fakeを共通helper commandへ追随させ、stage codeとtoken単位の禁止判定を契約値へ合わせた。

Candidate version `0.12.0` は計画値のままであり、version実ファイルは変更していない。

## verification-size guard

編集前の縮小matrix見積りは、製品コード約550〜700行、検証コード約360〜480行だったため通過した。Cartesian matrixは作らず、helper状態を各1回、6 callsiteをinventory、挙動を代表経路へ限定した。

`git diff --numstat HEAD` と新規fileの `wc -l` による実数は次のとおり。digest metadataは製品、Windows workflowとtest／fixtureは検証へ分類した。

- 製品: `+511 / -107` 行
- 検証: `+326 / -307` 行
- 新規helper: 239行（製品に含む）
- 新規Sprint test: 235行（検証に含む）

検証追加326行は製品追加511行を上回っていない。

## 旧Git回帰の移管

`scripts/sprint-035-patch-002-git-pull-test.mjs` の旧5 callsite × 4状態matrixは、契約の縮小方針に従って次へ移管した。検査の単純削除ではない。

- 更新した旧testの9 assert: helper path、6 callsite件数、direct pull 0件、shell／cmd／bat禁止、新Sprint test green。
- 新Sprint testの38 assert: up-to-date、local-ahead、dirty保持fast-forward、index／Git config保持、明示remote/ref、rename／copy旧新path、非ASCII、diverged、branch mismatch、detached、remote／remote branch欠落、fetch／pull／postcondition失敗、timeout、privacy、race、run相関、backoff、gh分類、branch未確認、UI inventory、禁止token。
- Sprint 024の43 assert: 両search-flowの「現在branchで検索前に取り込み」と「Actions後に相関した `run.branch` で取り込み」、古いrun拒否、代表stage失敗を動的fakeで確認。

## ローカル検証

Node process数は開始前28件、途中でorchestratorが29件と再実測し、40／60件の閾値未満だった。こちらからの `pgrep` はhost権限制約で取得できず、0表示は実測として扱っていない。重いsuiteは直列で実行し、自分が起動したserverは各testが終了処理した。

| Command | Exit | Assertions / result |
|---|---:|---|
| `node scripts/sprint-051-git-ingest-test.mjs` | 0 | 38 pass / 0 fail、darwin。Windowsは未検証 |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | wrapper 9 pass / 0 fail、内包Sprint 051 test 38 pass / 0 fail |
| `node scripts/sprint-013-chatwork-test.mjs` | 0 | 35 pass / 0 fail |
| `node scripts/sprint-014-chatwork-test.mjs` | 1 | 55 pass / 4 fail。Sprint 051関連flowは全green。4件は開始時HEADと同一のREADME／公開guide baseline |
| `node scripts/sprint-019-google-chat-test.mjs` | 1 | 50 pass / 1 fail。失敗は開始時HEADと同一のREADME baseline |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50 pass / 0 fail |
| `node scripts/sprint-022-safety-test.mjs` | 0 | 69 pass / 0 fail |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43 pass / 0 fail |
| `bash scripts/sprint-035-patch-001-regression.sh` | 1 | wrapper 6 pass / 3 fail。開始時HEADと同一のGoogle wizard digest、README、safety digest baseline |
| `node scripts/sprint-020-patch-001-copy-test.mjs` | 0 | 69 pass / 0 fail、inventory 52 |
| `node scripts/sprint-027-copy-test.mjs` | 0 | 66 pass / 0 fail |
| `git diff --check` | 0 | 出力0件 |
| 主要11 JavaScript fileの `node --check` | 0 | syntax error 0件（ほかの変更testは上記実行でparse済み） |

開始時HEADを `/private/tmp` へ一時展開し、同じSprint 014、Sprint 019、Sprint 035 Patch 001 commandを実行した。failure集合は候補と同一だった。

- Sprint 014: HEADも55 pass / 4 fail（同じREADME／guide 4件）。
- Sprint 019: HEADも50 pass / 1 fail（同じREADME 1件）。
- Sprint 035 Patch 001: HEADも6 pass / 3 fail（同じGoogle wizard digest、README、safety digest）。
- よってSprint 051による新規failureは0件。README、公開guide、Google wizard、safety digestは本Sprintで変更していない。

## UI起動とEvaluator確認用URL

- 起動: `node plugins/secretary/skills/chatwork/scripts/wizard-server.mjs --root <private-repository-root> --port 8765`
- URL: `http://127.0.0.1:8765/`
- 実repoのprivate確認とGitHub CLI状態が必要。Generatorは実Chatwork、実GitHub Actionsを呼ばず、既存loopback testとstatic UI inventoryだけを実行した。

Evaluatorの具体的な確認scenario:

1. `discover-failure` でdispatch前のbranch-unconfirmedを表示し、「Actions未開始」と読めること。
2. `settings-result-failure` で相関済みrunのGit取り込みだけを失敗させ、run linkと「GitHub上の取得完了／端末取り込み失敗」を表示すること。
3. `initial-result-failure` で `dirty-conflict` と `diverged` を別々に表示し、root相対pathと「解消後の再試行」commandを確認すること。
4. gh auth／transport／timeout／killではAPI Tokenを案内せず、確認済みworkflow conclusion failureだけでAPI Tokenを候補にすること。
5. 375px相当とdesktop幅で、technical details、長い非ASCII path、keyboard focus、横overflowを確認すること。

## Known issues / pending

- Windows CI external gateは `pending`。同じcandidateの `windows-2025`／`--require-windows` 成功証跡がないため、Windows実機は `unverified` でありSprintをdoneにできない。
- 必須回帰全体は既存baseline failureのため完全greenではない。local commit条件を満たさないためcommitしていない。
- Chatworkの3失敗画面の実browser screenshot／responsive目視はEvaluator担当として未実行。static copy／screen inventoryとloopback server回帰は実行済み。

## External not run

push、PR作成、`workflow_dispatch`、Windows CI、実Chatwork／Google Chat API、OAuth、Repository Secrets、downstream repo、plugin install、release、marketplace／cache更新、version更新、tag作成はすべて未実行。`~/workspace/agentic-harness` へはアクセスしていない。

## Candidate handoff

Candidateは未commitのworking treeとして引き渡す。Plannerの既存dirty spec／stateと `docs/sprints/sprint-051.md` は読み取りだけで、Generatorは変更していない。EvaluatorはまずSprint 051 test 38件と旧Git wrapper 9件を実行し、次に実アプリの3失敗画面を確認する。Windows外部gateはユーザー確認後に別途実行する。

## Retry 1 — Evaluator product finding 3件の修正

EvaluatorのP-01〜P-03だけを修正した。V-01の既存baseline debtと、将来Sprint対象の秘書voice／personality要件には触れていない。

- P-01: `git-ingest.mjs` のremote入力を、URL・userinfo・queryを構成できない検証済みremote名へ限定した。不正値はGit command実行前に `inspect-failed / invalid-remote` となり、failure payloadへ入力remoteを持たない。
- P-02: Chatwork `runSync` の初回／設定変更共有経路で、Actions開始前のsync状態を保持し、Git取り込み後の `sync.json` が `success`、results配列、今回run以後の `attemptedAt`、前回と異なる試行時刻を満たすことをpostconditionにした。欠落・不正・古い結果は `sync-not-current / stage=result-missing` となり、既存の `initial-result-failure`／`settings-result-failure` に渡る。
- P-03: 3失敗画面の `stageFailure` だけが生成する手動commandへ `failure-command` classを付け、`pre-wrap` と `overflow-wrap:anywhere` で長い非ASCII branchもmobile幅内に折り返す。Google Chat DOMは変更していない。
- asset変更に合わせ、宣言済みdigest 2正本と既存IME asset inventoryを最小追随した。

### Retry 1 verification-size guard

編集前見積りは製品 `+15〜25` 行、検証 `+8〜15` 行で、検証追加が製品追加を上回らない見込みだった。実際の候補全体は、`git diff --numstat HEAD` と新規file行数による集計で次のとおり。

- 製品: `+541 / -114` 行（前回 `+511 / -107` からRetry 1は `+30 / -7`）
- 検証: `+337 / -309` 行（前回 `+326 / -307` からRetry 1は `+11 / -2`）
- 検証追加337行は製品追加541行を上回っていない。新規frameworkやCartesian matrixは追加していない。

### Retry 1 ローカル検証

| Command | Exit | Assertions / result |
|---|---:|---|
| `node scripts/sprint-051-git-ingest-test.mjs` | 0 | 42 pass / 0 fail。P-01のURL remote、P-02の欠落／stale/current判定とrunSync wiring、P-03の専用DOM/CSSを追加 |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | wrapper 9 pass / 0 fail、内包Sprint 051は42/0 |
| `node scripts/sprint-013-chatwork-test.mjs` | 0 | 35 pass / 0 fail |
| `node scripts/sprint-014-chatwork-test.mjs` | 1 | 55 pass / 4 fail。前回EvaluatorがHEAD-only cloneで確認した同一README／guide baseline 4件 |
| `node scripts/sprint-019-google-chat-test.mjs` | 1 | 50 pass / 1 fail。同一README baseline 1件 |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50 pass / 0 fail |
| `node scripts/sprint-022-safety-test.mjs` | 0 | 69 pass / 0 fail |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43 pass / 0 fail |
| `bash scripts/sprint-035-patch-001-regression.sh` | 1 | wrapper 6 pass / 3 fail。P-03で追加したCSS assetを既存inventoryへ追随後、前回と同じGoogle wizard digest／README／safety digest baseline 3系統のみ |
| `node scripts/sprint-020-patch-001-copy-test.mjs` | 0 | 69 pass / 0 fail、inventory 52 |
| `node scripts/sprint-027-copy-test.mjs` | 0 | 66 pass / 0 fail |
| 変更・新規JavaScript 16 fileの `node --check` | 0 | syntax error 0件 |
| `git diff --check` | 0 | 出力0件 |

loopback suiteのsandbox内初回実行は `listen EPERM 127.0.0.1` となったため製品failureへ数えず、許可済みの同一commandをsandbox外で再実行した上表の結果を採用した。開始時Node数はorchestrator実測28件。Generator側の `pgrep`／`ps` はhost監視制約で取得できず、0表示は実測へ使っていない。重いcommandは直列で実行し、終了後にnodeのLISTEN残存が0件であることを確認した。

### Retry 1 handoff

- Windows CI external gateは引き続き `pending / unverified`。`--require-windows`、push、`workflow_dispatch` は実行していない。
- V-01は未修正。Sprint 014の4件、Sprint 019の1件、統合Sprint 035 Patch 001の3系統は前回EvaluatorのHEAD-only比較と同じ既存baseline debtである。
- required suiteがnonzeroのためcommitは作成していない。
- P-01〜P-03の修正候補はfresh独立Evaluatorによる増分再評価へ引き渡せる。Evaluatorは、悪性remote payload、Actions成功＋Git成功＋欠落／stale `sync.json` の両operation、375px以下でdetailsを開いた完全commandとdocument横overflowをrunning productで再確認する。

## User-approved V-01 baseline repair

V-01で記録された8 failureを、現行の公開案内と受理済みassetへ合わせて修復した。製品runtime、Sprint 051のGit取り込み契約、将来のvoice／personality範囲は変更していない。

元の8 failureの対応は次のとおり。

1. Sprint 014 `wizard・Skill・README・公開guideの公式URLが一致`: READMEのChatwork公式Token取得、発行方法、組織申請の導線を現行正本へ戻した。
2. Sprint 014 `README・公開guideは2026年7月確認注記を持つ`: READMEへ確認時点と変更可能性の注記を戻した。
3. Sprint 014 `配布面はルーム・自動取得の間隔・実行回数の用語を使用`: READMEの用語と6間隔／30日換算回数を現行正本へ戻した。
4. Sprint 014 `README・公開guideが非公開repoから手動再検索まで一続き`: 非公開repoへの保存、同期して再検索／同期しない／対象ルーム見直しの導線を戻した。
5. Sprint 019 `README高度設定と管理者順序・People API限界`: Google Chatを「少し高度な設定」とし、管理者順序とPeople APIの限界を戻した。
6. 統合Sprint 035 Patch 001 `Patch専用IME／検索回帰`: 受理済みのsafety、Google Chat wizard app、Google Chat clientとcopy baselineのGoogle Chat wizard app、計4 digest entryを現byteへ追随した。
7. 統合Sprint 035 Patch 001 `Google Chat既存回帰`: 上記5と同じREADME不一致を内包していたため、README修復で同時にgreen化した。
8. 統合Sprint 035 Patch 001 `edition境界回帰`: digest不一致の解消後、後段のoverlay検査に潜在していた未宣言inventoryが顕在化した。下記のexact inventory追随でgreen化した。

### Latent overlay inventory

`scripts/sprint-033-test.mjs` と同じ式、つまり `neutralizationCommit` から現在のtracked worktreeまでのpathと、`git ls-files --others --exclude-standard` のuntracked pathを和集合にし、既存`allowedChangedPaths`のexact／既存glob判定を適用して再計算した。

- 再計算時のchanged path: 272件。
- 修復前の`allowedChangedPaths`: 120件。
- 未宣言: 152件。`neutralizationCommit`→`HEAD`ですでに存在した141件と、現在候補で追加された11件に完全一致し、既存pathの消失は0件だった。
- 152件をsort済みのexact pathとして追加した。修復後はallowed 272件／unique 272件／undeclared 0件。
- 新しいglob、absolute path、private／temp pathは0件。`legacyIdentifierAllowlist`は変更していない。
- これは過去Sprint 035〜040と現在Sprint 051を列挙するdevelopment／distribution inventoryであり、runtime codeではない。gitless rootのskip、HEAD基準への変更、assert弱体化は行っていない。

### V-01 repair size classification

現候補全体を、`git diff --numstat HEAD`と新規fileの行数で再集計した。Planner／orchestrator／Evaluatorの正本docsとGenerator handoffはsize guardから除外した。

| 区分 | 追加 | 削除 | 内容 |
|---|---:|---:|---|
| 製品・公開配布面 | 558 | 125 | runtimeと新規helper `+539/-112`、README `+14/-8`、配布digest正本 `+5/-5` |
| 検証 | 338 | 310 | workflow、既存test、copy fixture、新規Sprint 051 test |
| development／distribution inventory | 153 | 1 | `adapters/agentic-overlay.json` のexact inventory 152件追加を含む |

検証追加338行は製品・公開配布面558行を上回らない。今回のV-01修復round自体も、公開案内と配布digestを含むためverification-onlyではない。overlay inventoryはruntimeにもverification codeにも数えず、独立表示した。

### V-01 repair local verification

重いsuiteは直列で実行し、各commandへ10分timeoutを設定した。開始前Node processは27件、終了後24件で、40／60件の閾値を超えず、今回起動した子processの増加はない。sandbox内の統合suite初回だけloopback listenが`EPERM`になったため製品failureへ数えず、同じcommandを許可されたloopback面で再実行した。

| Command | Exit | Assertions / result |
|---|---:|---|
| `node scripts/sprint-014-chatwork-test.mjs` | 0 | 59 pass / 0 fail |
| `node scripts/sprint-019-google-chat-test.mjs` | 0 | 51 pass / 0 fail |
| `bash scripts/sprint-035-patch-001-regression.sh` | 0 | wrapper 9 pass / 0 fail。IME 30/30、Chatwork wrapper 33/33、Google Chat wrapper 12/12、browser expression 6/6、edition 20/20 |
| `node scripts/sprint-051-git-ingest-test.mjs` | 0 | 42 pass / 0 fail、darwin |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | wrapper 9 pass / 0 fail、内包Sprint 051 42/42 |
| `node scripts/sprint-013-chatwork-test.mjs` | 0 | 35 pass / 0 fail |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50 pass / 0 fail |
| `node scripts/sprint-022-safety-test.mjs` | 0 | 69 pass / 0 fail |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43 pass / 0 fail |
| `node scripts/sprint-020-patch-001-copy-test.mjs` | 0 | 69 pass / 0 fail、inventory 52 |
| `node scripts/sprint-027-copy-test.mjs` | 0 | 66 pass / 0 fail |
| 変更・新規JavaScript 16 fileの `node --check` | 0 | syntax error 0件 |
| `git diff --check` | 0 | 出力0件 |

Sprint 051の42件には、P-01の悪性remote遮断、P-02の欠落／古いsync結果と共有`runSync` postcondition、P-03のmobile command折返しが含まれ、すべてgreenを維持した。隠れた製品failureは0件である。

### Remaining gate and evaluator handoff

ローカル必須回帰はすべて0 FAILとなり、fresh独立Evaluatorへ引き渡せる。Windows CI external gateは引き続き `pending / unverified` で、同一candidate commitの `windows-2025`／`--require-windows` 成功証跡はない。push、PR、`workflow_dispatch`、Windows CI、外部API／OAuth／Repository Secret、install、release、version更新は実行していない。ローカルgreenだけでSprintをdoneとはしない。
