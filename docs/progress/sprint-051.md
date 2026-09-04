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

## Retry 2 — Windows real Git root identity修正

外部Windows gateのGitHub Actions run `33899718779` は、Node-native syntaxと既存Windows回帰を通過後、`Git ingest and Actions correlation regression` の最初の実Git up-to-date fixtureで `ingest-root-mismatch` になった。失敗位置は `git-ingest.mjs` の同期root比較、Nodeはv22.23.2、runnerは `windows-2025` だった。絶対pathをerror／test出力へ追加せず診断した。

### 原因

root比較は入力rootと `git rev-parse --show-toplevel` を旧 `fs.realpathSync` へ通した後、slashとcaseだけを揃えていた。Windowsでは同じ実体でも、Node側のpathとGit for Windows側のpathが、短縮名、mapped drive／UNC、DOS device prefix等の別表記になることがある。旧実装はこの別名を同じ最終DOS pathへ必ず収束させないため、最初の実Git fixtureを別rootと誤判定した。

非同期側には同じ境界内の別不具合もあった。callback APIの `node:fs` `realpath` をPromiseとして `await` していたため、呼出時例外をcatchし、実在pathでも常に文字列 `resolve` へfallbackしていた。これはsymlinkを含む物理root契約を非同期callsiteで満たしていなかった。

### 最小修正

- 同期root解決を `realpathSync.native` に変更し、Windows APIが返す最終pathへ両入力を揃えた。
- 非同期root解決を `node:fs/promises` の `realpath` に変更し、実在pathの物理解決を実際にawaitするようにした。
- Windows文字列比較は `path.win32.resolve` を使い、`\\?\<drive>` と `\\?\UNC\<server>\<share>` の2つの既知namespace表記だけを通常のdrive／UNC形式へ揃えた。任意のdevice pathやPOSIX風pathを広く受理する変換は追加していない。
- root比較のskip、Windows限定無効化、relative fallback、別repo許容、error payloadへの絶対path追加は行っていない。既存のdirty衝突判定、branch／remote／fetch順序、Git argvも変更していない。

### 決定的な回帰保護

Sprint 051専用testは次を追加・強化した。

- Windowsのcase／separatorに加え、driveとUNCの限定device prefix同値、および別drive非同値を検査する。
- 最初の隔離bare remote＋cloneを実 `git` で同期・非同期の両経路から実行する。Windows runnerでは今回失敗した `os.tmpdir()` 配下のNode rootと実 `git.exe` の `--show-toplevel` 表記差を同じfixtureで再検査する。
- 実在する別clone rootをGit出力として返すfixtureで、同期・非同期とも `ingest-root-mismatch`、絶対path非露出を維持する。
- 既存の非競合dirty fast-forward、dirty衝突pull 0件、分岐、privacy、禁止Git操作、6 callsite wiringを削除・skipせず維持する。

Retry 2差分は製品helper `+13/-4`、Sprint test `+13/-3`。検証追加が製品追加を上回らず、新frameworkやCartesian matrixも追加していない。

### Retry 2 ローカル検証

テスト前の `pgrep node | wc -l` はこのchild権限では `sysmond service not found`／`Cannot get process list` となり実測不能だった。orchestrator側も同じ制限だったため、直近EvaluatorのNode 25件、inventory Generator完了時24件という40未満の記録を開始根拠にした。全commandは直列実行し、60秒以上の無出力やhangはなかった。loopback suiteのsandbox内初回だけ `listen EPERM 127.0.0.1` となったため製品failureへ数えず、同一commandを許可済みloopback面で再実行した。

| Command | Exit | Assertions / result |
|---|---:|---|
| `node scripts/sprint-051-git-ingest-test.mjs` | 0 | 43 pass / 0 fail、darwin。native root、async実Git、sync/async別repo拒否を含む |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | wrapper 9/9、内包Sprint 051 43/43 |
| `node scripts/sprint-013-chatwork-test.mjs` | 0 | 35/35 |
| `node scripts/sprint-014-chatwork-test.mjs` | 0 | 59/59 |
| `node scripts/sprint-019-google-chat-test.mjs` | 0 | 51/51 |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50/50 |
| `node scripts/sprint-022-safety-test.mjs` | 0 | 69/69 |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43/43 |
| `bash scripts/sprint-035-patch-001-regression.sh` | 0 | wrapper 9/9、内包各suiteも0 fail |
| `node scripts/sprint-020-patch-001-copy-test.mjs` | 0 | 69/69、inventory 52 |
| `node scripts/sprint-027-copy-test.mjs` | 0 | 66/66 |
| candidate差分のJavaScript 16 fileの `node --check` | 0 | syntax error 0件 |
| `git diff --check` と `git diff --check HEAD^` | 0 | 出力0件 |

全test processは終了し、Generatorが起動したserver／watcher／実行sessionは残していない。

### Windows再実行とhandoff

修正前candidate commitは `feb1c45fa4359229e2c048adfed474cffe9c6aca`。Retry 2差分は未commitで、commitは作成していない。Windowsで再実行すべきcommandは次である。

```text
node scripts/sprint-051-git-ingest-test.mjs --require-windows
```

同じRetry 2 candidate commitを `windows-2025` へ置き、上記commandが43/43、既存 `Windows path, rollback, retry, and boundary regression` がgreenになることを外部gateで確認する。今回はpush、PR、`workflow_dispatch`、Windows CI再実行、downstream、plugin install、release、version実ファイル変更を行っていないため、Windows修正結果は引き続き `pending / unverified`。新しいrun URLと同一commitの0 FAILが得られるまでSprintをdoneとはしない。

## User-approved limited cycle — F1/F4完了、F2/F3はsize guardで停止

Claude Code Fable 5.1 highが確認したF1／F4だけを先に修正し、直接のfake-gh回帰を実物のCLI出力へ合わせた。その時点の追加行を計測した結果、verification追加が製品追加を1行上回ったため、契約のverification-size guardとオーケストレーター指示に従い、F2／F3の旧Git fixture復元へは進んでいない。

### 原因とF1／F4の変更

- `watchCorrelatedWorkflow` は `gh run watch --exit-status` 非0後、`gh run view --json status,conclusion` が正常なcompleted failureを返すと、`--log-failed`を読まずreasonなしの`workflow-conclusion-failure`をthrowしていた。旧fake `gh` がJSON要求にも非JSON logを返したため、JSON parse fallbackだけで細分類が偶然成立していた。
- `actions-run.mjs` はcompleted failureを確認した場合だけ `--log-failed` を1回取得し、workflow本文を `failureReason` だけへ渡す。公開errorは`code`、`stage`、`conclusion`、sanitized `reason`、既存のcorrelated run summaryだけで、raw log／stdout／stderr／絶対path／URL／secretを保持しない。
- GitHub CLIのauth／transport／timeout／kill分類には、`watch`とJSON `view`そのもののcode／stderrだけを使う。workflow log内の`403`／`forbidden`等はGitHub CLI auth判定へ混ぜない。conclusion未確定時は`--log-failed`を取得しない。
- Chatwork／Google Chatの`search-flow.mjs`にあった重複`--log-failed`取得を削除した。Chatworkはsanitized reasonをgeneric `workflow-conclusion-failure`より先に判定し、Google Chatは既存のreauthorization／admin／scope／audience／API／rate／network status導線へ戻る。
- Sprint 014／020のfake `gh` は、`--json`なら実物同様のstatus／conclusion JSON、`--log-failed`ならサービス別fixture logを返す。両サービスでJSON view 1回、failed log 1回と、分類後にpullへ進まないことを既存assert内で確認する。
- run correlation、branch、remote、FETCH_HEAD、Git取り込み、result-missing、UI、Windows root修正は変更していない。Voice、script簡素化、process最適化、timeout契約変更も対象外のままである。

### 行数分類と停止理由

`git diff --numstat HEAD`をF1／F4対象pathだけで計測した。

| 区分 | 追加 | 削除 | 内訳 |
|---|---:|---:|---|
| 製品 | 47 | 43 | `actions-run.mjs` 44/20、Chatwork search-flow 2/12、Google Chat search-flow 1/11 |
| 既存fake-ghの現実化 | 30 | 5 | Sprint 014 test 19/4、Sprint 020 test 11/1 |
| F1／F4の直接回帰 | 18 | 2 | Sprint 051 test |
| verification合計 | 48 | 7 | 既存fake現実化30行＋直接回帰18行 |
| F2／F3 | 0 | 0 | size guard発火前に未実装で停止 |

verification追加48行が製品追加47行を1行上回る。形式的な行圧縮、assert削除、旧fixtureの大量復元で閾値を迂回せず、この限定cycleをここで停止する。F2／F3の隔離`HOME`／`XDG_CONFIG_HOME`／`GIT_CONFIG_NOSYSTEM`、local／global `pull.rebase=true`・`pull.ff=false`、dirty-conflict／diverged／root-mismatchのHEAD・status・index不変と段階別後続操作0は未実装の残件である。

### Targeted verification

開始前Node数はオーケストレーター実測13件で40未満。重いcommandは直列実行した。

| Command | Exit | Result |
|---|---:|---|
| 変更6 JavaScript fileの `node --check` | 0 | syntax error 0件 |
| `node scripts/sprint-051-git-ingest-test.mjs` | 0 | 44/44、JSON conclusion後のlog 1回、raw非保持、workflow logによるgh auth汚染0、未確定時log 0を含む |
| `node scripts/sprint-014-chatwork-test.mjs` | 0 | 59/59。sandbox内初回はloopback `listen EPERM`のため中断し、許可済みloopback面で同一commandを再実行してgreen |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50/50。reauthorization、admin、scope、audience、API、permission、rate、networkが実gh同様のJSON→log各1回で到達 |

size guard発火後のため、旧wrapper、Sprint 013／019／022／024、統合、copy、全syntax、全suiteはこのcycleで再実行していない。F1／F4対象の3 suite以外をgreenとは申告しない。

### Windows再実行条件とexternal境界

Windows run `33902137773` は開始HEAD `b7c2adbb5c588429daa1b475dec9eb2b9604cf1d` のSprint 051 43/43、既存Windows 12/12を示すが、今回の未commit F1／F4 byteの証跡ではない。F2／F3の扱いをユーザーが決め、candidateを固定した後、別の明示許可を得て同一commitをpushし、`windows-2025`で `node scripts/sprint-051-git-ingest-test.mjs --require-windows` を再実行する必要がある。

このcycleではcommit、push、PR、`workflow_dispatch`、Windows CI、downstream、plugin install、release、version実ファイル変更、実API／OAuth／Repository Secret操作を行っていない。自分のserver／watcherは起動しておらず、loopbackを使った既存suiteの子processは終了している。`docs/sprints/state.md`、spec、contract、feedbackは変更していない。

## User-approved F2/F3 safety regression completion

ユーザーが、FableレビューのF2／F3を必要最小限で追加し、検証追加行が製品追加行を上回ることを明示承認したため、直前cycleで停止していた安全回帰を既存の実Git fixture内へ追加した。今回roundは製品変更0行のverification-onlyであり、旧308行matrix、新framework、広いCartesian matrixは復元・追加していない。

### F2 — 利用者Git設定からの独立

- Sprint 051の全実Git fixtureを、temp配下の `HOME`／`XDG_CONFIG_HOME`、`GIT_CONFIG_NOSYSTEM=1`、`LC_ALL=C` で実行する。
- 隔離global configとfast-forward候補のlocal configの両方へ `pull.rebase=true`／`pull.ff=false` を設定し、対象branchのupstreamは未設定にする。
- 取り込み前後でlocal／globalの2設定、local config全体、upstream未設定が不変であることを確認する。その相反する既定下でも、製品argvの `pull --ff-only --no-rebase origin refs/heads/main` が1回だけ実行され、fast-forwardが成功する。

### F3 — 失敗時のrepository不変と停止段階

- `dirty-conflict`: 実行前後のHEAD、`git status --porcelain=v1 -z`、`git ls-files --stage -z` が同一。fetch 1回、pull 0回で、rename旧pathと非ASCII pathの競合をNUL-safeに返す。
- `diverged`: 同じ3点snapshotが同一。fetch 1回と祖先判定後に停止し、diff／status／pullは各0回であることをcommand traceで確認する。
- `ingest-root-mismatch`: 同じ3点snapshotが同一。同期／非同期の両経路とも最初の `rev-parse --show-toplevel` 1回だけで停止し、symbolic-ref／remote／fetch／pullへ進まない。両error payloadへfixtureの絶対pathを含めない。

### 行数分類

`git diff --numstat HEAD` と直前handoffの記録を照合した。

| 区分 | 追加 | 削除 | 内容 |
|---|---:|---:|---|
| 今回の製品 | 0 | 0 | 製品codeは変更していない |
| F2／F3直接回帰 | 42 | 6 | Sprint 051 test。着手前 `+18/-2` から現在 `+60/-8` への増分 |
| F1 fixture追随 | 2 | 1 | Sprint 024 fake-ghを実物同様のJSON view／failed log分岐へ修正 |
| 今回verification合計 | 44 | 7 | 承認済みのverification-only例外 |
| candidate製品合計 | 47 | 43 | 直前cycleのF1／F4製品差分を保持 |
| candidate検証合計 | 92 | 14 | Sprint 014 `19/4`、020 `11/1`、024 `2/1`、051 `60/8` |

candidate全体では検証追加92行が製品追加47行を45行上回る。これは今回ユーザーが明示承認したsize例外である。意味のあるassertの削除、不自然な1行圧縮、製品code変更による比率調整は行っていない。

### ローカル検証

開始前Node数はオーケストレーター実測15件で40未満。Generator権限からの `pgrep node` と代替 `ps` は `sysmond service not found`／`operation not permitted` で実測不能だったため、0件とは扱っていない。全commandを直列実行し、loopback serverを使うSprint 013のsandbox内初回だけ `listen EPERM 127.0.0.1` となった。同一commandを許可済みloopback面で再実行してgreenとし、製品failureとは分けた。

| Command | Exit | Assertions / result |
|---|---:|---|
| `node scripts/sprint-051-git-ingest-test.mjs` | 0 | 45/45。F2／F3と既存F1／F4を含む |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 0 | wrapper 9/9、内包Sprint 051 45/45 |
| `node scripts/sprint-013-chatwork-test.mjs` | 0 | 35/35。sandbox初回EPERM後、許可面で再実行 |
| `node scripts/sprint-014-chatwork-test.mjs` | 0 | 59/59 |
| `node scripts/sprint-019-google-chat-test.mjs` | 0 | 51/51 |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50/50 |
| `node scripts/sprint-022-safety-test.mjs` | 0 | 69/69 |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 初回41/43で旧fake-ghのJSON未対応を検出。fixtureだけ最小追随後43/43 |
| `bash scripts/sprint-035-patch-001-regression.sh` | 0 | 全wrapper／内包suite 0 fail |
| `node scripts/sprint-020-patch-001-copy-test.mjs` | 0 | 69/69、inventory 52 |
| `node scripts/sprint-027-copy-test.mjs` | 0 | 66/66 |
| candidate変更JavaScript 7 fileの `node --check` | 0 | syntax error 0件 |
| `git diff --check` | 0 | 出力0件 |

Sprint 024の初回2 failureは、旧fake `gh run view` が `--json` にも非JSON log本文を返すverification fixture不整合だった。実物同様に `--json` はstatus／conclusion JSON、`--log-failed` はサービス別failed logを返す2分岐へだけ直し、既存の古い成功run拒否・network分類・秘密値非表示assertは削除していない。

### Handoff

ローカルmandatory suiteは0 FAIL。今回、commit、push、PR、`workflow_dispatch`、Windows CI、downstream、plugin install、release、version実ファイル変更、実API／OAuth／Repository Secret操作は行っていない。F1／F4 product差分を含む現在の未commit candidateについて、同一commitのWindows `--require-windows` 証跡は引き続き `pending / unverified` であり、外部gateなしにSprintをdoneとはしない。
