# Sprint 051 — Chatwork／Google Chatの安全なGit取り込み

- Type: standard
- Risk: high（利用者のdirty working tree、index、現在branchを扱い、誤分類は履歴欠落または誤案内につながる）
- Candidate version: `0.12.0`（version実ファイル更新、配布、releaseは本Sprint外）
- 主眼: Chatwork／Google ChatのGitHub Actions成功後の結果を、upstreamに依存せず対象branchから安全に取り込み、Actions側と端末側の失敗を正しく分ける。
- 依存: sprint-040-patch-001 done。Sprint 013／014／019／020／020-patch-001／022／024／035-patch-001／035-patch-002で確立した同期、timeout、run相関、wizard copy、dirty差分保護を回帰させない。
- ID境界: `sprint-041`〜`sprint-050` は別branchのProject Clarity系譜で予約済み。本Sprint IDとcandidate `0.12.0` は案ではなく、2026-09-04の§16／現行引き継ぎでユーザー確認済み。

## 背景と確定済み判断

製品の6 callsiteはremote名・branch名なしの `git pull --ff-only --no-rebase` を使うため、初回publish後などupstream未設定のbranchで `There is no tracking information for the current branch` により停止する。Actionsが更新した対象は相関結果の `run.branch` であり、`main` の固定値やupstreamではない。

ユーザー判断は次で確定済みであり、再質問しない。

- dirty worktreeはremote変更pathとdirty pathが重なる場合だけ `dirty-conflict` で停止し、非競合差分は保持して取り込む。
- ChatworkとGoogle Chatの6 callsiteを同じ小さなGit取り込み機能へ集約する。
- Actions run発見timeoutは既定60秒とし、指数backoffを使う。
- 新しいSprint専用テストをWindows CIの `windows-2025` でも `--require-windows` 付きで実行する。ただしpush／`workflow_dispatch` はこの契約による事前許可ではなく、ユーザー確認後のexternal gateとする。
- Candidate versionはユーザー確認済みの `0.12.0`。ただしversion実ファイル更新は本Sprintに含めない。

## 外から見える成果

1. Chatwork／Google Chatの設定・検索は、upstreamが未設定でも今回のActions runのbranchから最新結果を取り込める。
2. ローカルに非競合のtracked／untracked／staged差分があっても、その内容とindexを保持したままfast-forwardできる。
3. 分岐、dirty衝突、branch切替、detached HEAD、remote欠落、fetch失敗、timeoutは、安全に停止して原因と回復方法を区別する。
4. GitHub上の取得は成功し端末への取り込みだけ失敗した場合、API TokenやActions設定の失敗と誤案内しない。
5. 5秒を超えて見つかる正しいActions runを既定60秒内で追跡し、古い成功runを流用しない。

## Scope

### A. 共通Git取り込み契約

小さな共通機能を正確に `plugins/secretary/scripts/lib/git-ingest.mjs` に設ける。同期／非同期の内部構成はGenerator裁量だが、入力概念は `{ root, remote: "origin", branch, git, timeoutMs }`、`branch` 省略時は現在branchとする。外部commandは全OSでargv配列かつ `shell: false` で起動する。`shell: true`、shell文字列連結、`.cmd`／`.bat` shimは回避策としても禁止する。

各段で失敗したら以降を実行せず、次の順序を守る。

1. 入力rootと `git rev-parse --show-toplevel` の両方をresolve／normalizeし、存在するpathはsymlink解決後の物理pathへ揃える。Windowsのseparatorとfilesystemのcase挙動を考慮して同じ実体locationか比較し、不一致なら `ingest-root-mismatch`。error／log／証跡へ両方の絶対pathを出さない。
2. `git symbolic-ref --quiet --short HEAD` の終了0はbranch、終了1は期待されたdetached predicateとして `detached-head`。それ以外の非ゼロ、空でない不正出力、parse不能は `inspect-failed` とし、detachedへ誤分類しない。
3. 現在branchと期待branchが違えば `branch-mismatch`。両方のbranch名を含める。
4. `git remote get-url <remote>` が失敗すれば `remote-missing`。成功してもremote URLは返却・log・証跡へ出さない。
5. `git fetch <remote> refs/heads/<branch>` が失敗すれば、時間切れは `timeout`、それ以外は `fetch-failed`。remote branch欠落は新codeを増やさず、sanitized reason `branch-missing` にできる。raw stderr、資格情報、URLのuserinfo／queryは返さない。
6. HEADと `FETCH_HEAD^{commit}` が同一なら `up-to-date`。pullは行わない。
7. `git merge-base --is-ancestor HEAD FETCH_HEAD^{commit}` と逆向きの祖先関係を調べる。終了1は「祖先ではない」という期待されたpredicate、その他の非ゼロは `inspect-failed` とする。`FETCH_HEAD^{commit}` がHEADの祖先なら `local-ahead` として成功し、両方向とも祖先でなければ `diverged`。
8. `git diff --name-only -z HEAD FETCH_HEAD^{commit}` と `git status --porcelain=v1 -z --untracked-files=all` をNUL区切りのままparseし、pathが重なれば `dirty-conflict`。rename／copyは旧path・新pathの両方、非ASCII pathも欠落なく比較する。pullは行わず、root相対の競合pathだけを返す。
9. fetchで検査したcommitを記録してから `git pull --ff-only --no-rebase <remote> refs/heads/<branch>` を最終防衛として実行する。非ゼロなら `fast-forward-failed`。
10. 事後にHEADとpull後の `FETCH_HEAD^{commit}` を再取得し、一致を必須とする。fetchとpullの間にremote branchが進み対象commitが変わった場合は、その事実を成功結果・証跡で区別し、最初に検査したcommitを取り込んだと報告しない。一致すれば `fast-forwarded`、一致しなければ `fast-forward-failed` とする。

branch指定pullと事前fetchの間には競合窓がある。merge／rebase／reset等の禁止操作なしに事前commitへ厳密pinする保証は作らず、上記の「pullが実際にfetchしたcommitと事後HEADが一致し、事前対象との差を隠さない」を安全な観測可能postconditionとする。

成功結果は `{ status: up-to-date | fast-forwarded | local-ahead, remote, branch, before, after }` と同等の意味を持ち、対象が競合窓で進んだ場合はその事実を区別できる。失敗payloadはallowlist方式で、`code`、`stage: "git-ingest"`、remoteの名前だけ、`branch`、branch不一致時の `expectedBranch`、定型化した `reason`、root相対の `conflictPaths` だけを持つ。full remote URL、raw stderr、URLのuserinfo／query、資格情報、絶対pathは返却・log・証跡へ出さない。`ingest-root-mismatch` は比較したpathをどちらも持たない。

製品はmerge、rebase、stash、reset、restore、commit、force push、`git config` の書込み、`--set-upstream`、`-u`を行わない。ここで禁止するrebaseはrebase操作とGit設定書換えであり、許可されたpullの `--no-rebase` はこの禁止に含めない。token単位の禁止assertはargvの完全tokenで判定し、`--untracked-files=all` 内の文字列を禁止token `-u` と誤判定しない。

### B. 6 callsiteへの適用

次の全経路を共通契約へ置換し、未分類の直接pullを残さない。

1. `plugins/secretary/skills/chatwork/scripts/wizard-server.mjs` の `runSync`。
2. 同ファイルの `discoverRooms`。
3. `plugins/secretary/skills/chatwork/scripts/search-flow.mjs`。
4. `plugins/secretary/skills/google-chat/scripts/search.mjs`。
5. `plugins/secretary/skills/google-chat/scripts/search-flow.mjs`。
6. `plugins/secretary/skills/google-chat/scripts/actions-discovery.mjs`。

wizardと同期後の取り込みは `run.branch`、検索前の取り込みは現在branchを使う。Google Chatの同期検索をasync化するか同期版の同等機能を用いるかはGenerator裁量だが、分類codeと安全境界は同一にする。`actions-discovery.mjs` は `watchError` とGit取り込み失敗を別stageで返す。

### C. stageとChatwork wizardの回復案内

- Chatwork wizardのdispatch／discovery結果は `stage: dispatch | run-correlation | actions-run | git-ingest | result-missing` とstage固有の `code` を持つ。run確定後の表示用summary `run: { id, branch, url }` はsanitized error detailとは分離し、run URLは現在repoから `https://github.com/<owner>/<repo>/actions/runs/<id>` として組み立てる。Git取り込みのfailure payload自体はScope Aのallowlistを越えて広げない。
- dispatch前に対象branchを確定できない `branch-unconfirmed` は `stage: "dispatch"` とし、Actionsは「未開始」と伝える。`run-correlation` へ誤分類しない。
- `actions-run` でも、GitHubが返したworkflow conclusionの失敗を確認できた場合だけAPI Token確認を回復候補に含める。`gh` のtransport／認証失敗、timeout、killは同じ `actions-run` の中で相互に異なるsanitized code／文言にし、workflow conclusion失敗やGit取り込み失敗と混同しない。GitHub APIへのdispatch失敗、run相関失敗、`git-ingest`、結果欠落もそれぞれのstageに保つ。
- `git-ingest` 失敗では「取得はGitHub上で完了しています（run <id>）。この端末への取り込みだけ失敗しました: <理由の日本語>」の意味と、既存の再取得または手動回復を示す。`diverged` は手動解消が必要、`dirty-conflict` は該当pathを示す。
- Chatworkの `plugins/secretary/skills/chatwork/assets/wizard/app.js` にある `discover-failure`、`settings-result-failure`、`initial-result-failure` だけをstage別の見出し・本文にする。管理者向けdetailsにはrun URLを置き、`diverged`／`dirty-conflict` の手動command `git pull --ff-only --no-rebase origin refs/heads/<branch>` は、表示された分岐またはdirty衝突を利用者が解消した後に行う「再試行」と明記する。現在の状態へ直ちに効く修復commandとは案内しない。Google ChatはScope Bの指定3 callsiteへの共通機能適用とstage／code分類だけを対象とし、この3失敗画面の新設は求めない。
- wizard copyはedition共通であり、copy overlayへ追加しない。既存の1画面1判断、主説明とtechnical detail、accessibilityを維持する。

### D. Actions run発見timeout

- run発見timeoutの優先順位は、有効なCLI `--run-discovery-timeout-ms` > 有効な `YASASHII_RUN_DISCOVERY_TIMEOUT_MS` > 60,000ms既定とする。CLIを持たないwizard経路は環境変数 > 60,000ms既定とする。非数、非有限、0以下などの無効値は60,000msへ安全にfallbackし、呼び出し側に残る5,000ms既定を廃止する。
- pollは有効なCLI override > 有効な環境変数 > 250ms／2,000ms既定の順で解決し、250msから指数backoffして `YASASHII_RUN_POLL_MAX_MS` の既定2,000msを上限にする。無効値は各既定へfallbackする。時刻取得とwaitを注入できる決定的seamで、deadline、増加順、上限を検査する。実時間に依存する厳密な呼出回数は要求しない。
- baseline ID、`createdAt`、`displayTitle` による古い成功run非流用を維持する。
- Git取り込みcommandのtimeoutは、有効なhelper入力 `timeoutMs` > 有効な `YASASHII_CLI_TIMEOUT_MS` > 60,000ms既定とし、無効値は60,000msへfallbackする。この60秒はroot確認、`symbolic-ref`、remote確認、fetch、`rev-parse`、`merge-base`、diff、status、pull、事後確認の全Git commandへ適用する。既に60秒のwizard／一部検索pullは維持し、現在30秒のGoogle Chat検索／Actions経路を含む6 callsiteを60秒へ統一する。`gh run watch` の5分などGit取り込み以外のtimeoutは変更しない。

### E. Windows CIと回帰

- 新しい `scripts/sprint-051-git-ingest-test.mjs` 相当のSprint専用テストは、隔離bare remote＋cloneと実 `git.exe` を使い、安全な引数trace（例: `GIT_TRACE`）でGit argvを検査する。fake `gh`／hangは、Node 22から `shell: false` で直接起動できる有界なfakeまたはspawn seamを使う。`git.cmd`／`.bat` shim、`shell: true`、shell文字列連結をWindows fixtureの逃げ道にしない。
- `.github/workflows/windows-recording-regression.yml` の `paths` とstepsへ新テストを追加し、`windows-2025` で `--require-windows` を実行する。pathsには少なくとも `plugins/secretary/scripts/lib/actions-run.mjs`、`plugins/secretary/scripts/lib/git-ingest.mjs`、`plugins/secretary/skills/chatwork/scripts/wizard-server.mjs`、`plugins/secretary/skills/chatwork/scripts/search-flow.mjs`、`plugins/secretary/skills/chatwork/assets/wizard/app.js`、`plugins/secretary/skills/google-chat/scripts/search.mjs`、`plugins/secretary/skills/google-chat/scripts/search-flow.mjs`、`plugins/secretary/skills/google-chat/scripts/actions-discovery.mjs`、Sprint専用test、更新するSprint 035 Patch 002 testを含め、製品code変更だけでもCIを起動する。
- helper／module APIではGit状態・error分類を各1回網羅する。6 callsiteはwiring／inventoryを全件確認し、挙動fixtureは「現在branchで検索前に成功」「Actions後に `run.branch` で成功」「代表1件の失敗とstage」へ縮める。Chatworkの3画面UIは別に検査する。同じ全状態を6 callsiteへ掛け合わせるCartesian matrixは作らない。
- ローカル実装・評価証跡とWindows CI外部gateを分ける。push／`workflow_dispatch` はユーザー確認後だけ実行でき、事前許可されたものと扱わない。承認またはrun証跡が得られなければ `external-live-gate-unavailable` または `pending` と記録し、製品実装失敗へ誤分類せず、Sprintをdoneにしない。ユーザーが明示的に別判断を受け入れない限り、最終PASSには同じcandidate commitの `windows-2025`／`--require-windows` 成功証跡が必要である。Windows実機は `unverified` と明記する。
- `scripts/sprint-035-patch-002-git-pull-test.mjs` の旧「5 callsiteが同じpull引数」というassertは削除放置せず、共通機能と6 callsite経由の契約を検査するassertへ更新する。copy変更に伴うcopy inventoryの期待値更新は許可するが、既存assertの削除や判定の弱体化は許可しない。

## Non-scope

- 初回publishの `git push -u origin <sha>:refs/heads/<branch>` がupstreamを設定しない問題。`pushOwnedCommit` の修正は後続micro patchとする。
- Git取り込みだけを再実行する `/api/ingest` 等の新endpoint。
- Chatwork workflow、schedule、Repository Secret導線、API、OAuth scope、履歴schema、room／space選択、wizard step構成の再設計。
- `pull.rebase`、`pull.ff`、branch upstream等のrepo／global／system Git設定の書換え。
- merge、rebase、stash、reset、restore、commit、force pull／push、dirty差分の自動cleanup。
- 実Chatwork／Google Chat API、OAuth、Repository Secret、実利用者workspace、remote push、PR作成、downstream展開、plugin install、version実ファイル更新、tag、GitHub Release、marketplace更新。
- 新しいverification framework、統一collector、attestation、approval manifest、外部署名。
- 旧0.10.1 rubricに残るC12の整理。C12は本Sprintへ適用せず、`docs/spec/rubric.md` のmaintenanceもこのPlanner correctionには含めない。
- 起動時に観測された `unknown field 'collaborationMarker', expected 'description' or 'hooks' at line 3 column 23` のhooks parser警告。これはRelated but independentなClarity PR #11系の観測であり、本Sprintでは修正しない。

## Acceptance Criteria

1. **6 callsite完全性（C1/C6）**: 上記6経路が正確なhelper pathを使い、未分類の製品直接pullが0件であることをinventory／wiringで全件確認する。代表挙動として、検索前の現在branch成功、Actions後の `run.branch` 成功、失敗1件のstage伝播を確認する。同じ全状態を各callsiteへ掛け合わせない。
2. **helper分類（C3/C5）**: helper／module APIでroot不一致、branch切替、detached HEAD、remote欠落、remote branch欠落、fetch失敗、timeout、up-to-date、local-ahead、diverged、dirty衝突、pull失敗、事後不一致を各1回検査し、Scope Aのcodeと停止位置になる。`symbolic-ref`／`merge-base` の期待された終了1と予期しないinspect errorを区別する。
3. **同一rootとprivacy（C3/C5）**: separator、Windows case挙動、symlinkを含め、同じ物理locationだけを同一rootとして認識する。failure payloadはallowlist外のfull remote URL、raw stderr、userinfo／query、資格情報、絶対pathを持たず、`ingest-root-mismatch` は両pathを持たない。
4. **upstream非依存とref限定（C3/C5）**: upstreamなし／ありのfixtureで `refs/heads/<branch>` をfetch／pullし、`FETCH_HEAD^{commit}` を比較する。同名tagを選ばず、`git config` 前後snapshotが一致する。
5. **非競合dirtyのfast-forward（C3/C5/C6）**: remoteを先行させ、非競合のtracked／untracked／staged差分があっても `fast-forwarded`。HEADはpull後の `FETCH_HEAD^{commit}` と一致し、差分内容とindexを保持する。fetch／pull間にremoteが進んだfixtureでは事前対象との差を隠さず、最初のcommitを取り込んだと誤報しない。
6. **dirty衝突だけ停止（C3/C5）**: NUL区切りのdiff／porcelainを使い、rename／copyの旧新両pathと非ASCII pathを含む交差だけを `dirty-conflict` としてroot相対pathで返す。非競合dirtyでは停止せず、衝突時はHEAD、dirty内容、indexが前後一致し、pull 0件である。
7. **分岐と最終防衛（C3/C5）**: divergedは `diverged`、pullまたは事後postconditionの失敗は `fast-forward-failed`。履歴書換え、merge commit、local差分喪失は0件で、禁止された操作による厳密pinやrollbackを追加しない。
8. **timeoutとprocess終了（C3/C4）**: Git取り込みcommandはhelper入力 > env > 60秒、run発見はCLI > env > 60秒の優先順位で、無効値は60秒へfallbackする。hangは `timeout` となり、後続操作と残processが0件。Git取り込み以外の既存timeoutは変えない。
9. **禁止Git／shell操作（C5/C6）**: argv traceで `config` write、`merge`、rebase操作、`stash`、`reset`、`restore`、`commit`、`--force`、`--set-upstream`、完全token `-u` が0件。`--no-rebase` と `--untracked-files=all` を禁止操作へ誤分類しない。全OSでargv配列＋`shell: false` とし、`.cmd`／`.bat` shimを使わない。
10. **run発見（C3/C5）**: 今回runを5秒より後に返すfixtureが60秒既定で成功し、1秒CLI overrideでは `run-correlation-unconfirmed`。決定的な時刻／wait seamで指数backoffの増加順、2,000ms上限、deadlineを検査し、fragileな実時間の厳密call回数は要求しない。baseline ID、`createdAt`、`displayTitle` に合わない古い成功runを採用しない。
11. **stage分類（C3/C4/C8）**: pre-dispatchの `branch-unconfirmed` は `dispatch`／未開始である。dispatch、run相関、workflow実行、Git取り込み、結果欠落を `dispatch`、`run-correlation`、`actions-run`、`git-ingest`、`result-missing` に保ち、`gh` transport／認証／timeout／killには相互に異なるsanitized code／文言を持たせる。API Token確認を案内できるのは確認済みworkflow conclusion失敗だけである。
12. **Chatwork wizard UI（C4/C8）**: Chatworkの `discover-failure`、`settings-result-failure`、`initial-result-failure` だけをrunning UIで操作し、stage別見出し、次の行動、details、run URL、再試行と明記した手動command、`diverged`、root相対の `dirty-conflict` pathを確認する。desktop／mobile、keyboard、focus、accessible name、秘密値非露出を回帰させない。Google Chatは指定3 callsiteのhelper／stage／codeだけを検査し、同名3画面を新設しない。
13. **Windows互換fixture（C6）**: 実 `git.exe` と安全な引数trace、Node 22互換の有界なfake／spawn seamを使うSprint専用テストがWindowsで動く。`shell: true` と `.cmd`／`.bat` shimを使わず、`--require-windows` なしでWindows検査をskip扱いにし、指定時はWindowsでなければ失敗する。
14. **回帰とcopy inventory（C6）**: Sprint専用test、更新したSprint 035 Patch 002 test、指定の既存回帰、copy test、`git diff --check` が0 FAIL。変更copyに必要なinventory期待値更新は許可するが、既存assertの削除や弱体化で合格させない。
15. **ローカル版・外部境界（C2/C5/C11）**: wizard copyはedition共通のまま、version実ファイル、downstream、実API／OAuth／Secret、push、PR、install、releaseの変更・実行0件。Secret、実本文、利用者端末のabsolute pathをcommit／fixture／証跡へ入れない。candidate `0.12.0` とSprint 051はユーザー確認済みのplanning boundaryとして記録する。
16. **Windows CI外部gate（C5/C6/C11）**: ユーザー確認後に、同じcandidate commitの `windows-2025` でSprint専用testを `--require-windows` 実行し0 FAILのrun URLを記録する。承認または証跡が得られなければ `external-live-gate-unavailable`／`pending` とし、製品実装失敗にせずSprintをdoneにしない。ユーザーが明示的に別判断を受け入れない限り、この証跡なしの最終PASSを認めない。

## 必須回帰

- `node scripts/sprint-051-git-ingest-test.mjs`
- `node scripts/sprint-035-patch-002-git-pull-test.mjs`
- `node scripts/sprint-013-chatwork-test.mjs`
- `node scripts/sprint-014-chatwork-test.mjs`
- `node scripts/sprint-019-google-chat-test.mjs`
- `node scripts/sprint-020-google-chat-test.mjs`
- `node scripts/sprint-022-safety-test.mjs`
- `node scripts/sprint-024-data-causality-test.mjs`
- `bash scripts/sprint-035-patch-001-regression.sh`
- `node scripts/sprint-020-patch-001-copy-test.mjs`
- `node scripts/sprint-027-copy-test.mjs`
- `git diff --check`

ここまでをローカル実装・評価の必須回帰とする。`.github/workflows/windows-recording-regression.yml` の `windows-2025`／`--require-windows` runは、ユーザー確認後にだけ実行する別のexternal gateである。

既存テスト拡張と新しいSprint専用テストを証跡のsafe harborとする。新しいverification frameworkは作らない。Generatorは製品実装に着手する前に、追加するverification codeと製品変更の規模を見積もる。verification codeが製品変更を超えそうなら、その理由、見積り、上記の縮小matrixを使う案を記録して停止する。「2倍までは許容する」等へ閾値を緩和せず、Generatorが独断で検証基盤を増やさない。

## Evidence safe harbor

- candidate commit、変更path、6 callsite inventory、各経路のremote／branch、実際のGit引数。
- 隔離bare remote＋clone fixtureの作成・実行command、終了コード、assert数、helper APIで各状態を1回確認したHEAD／branch graph、dirty内容・index・Git設定の前後snapshot。
- run発見の5秒超遅延、1秒timeout、指数backoff、古いrun非流用について、決定的な時刻／wait seamから得たdeadline、増加順、上限。実時間の厳密call回数は証跡要件にしない。
- Chatworkの3画面に対するstage別running UI操作、URL／DOM状態、desktop／mobile screenshot。Google Chatは3 callsiteのhelper／stage／code結果を記録し、新しい同名画面の証跡を求めない。Secret、実room／space名、本文、ローカル絶対pathを含めない。
- ローカル必須回帰ごとのcommand、exit、assert数。Windows external gateはユーザー確認後のCI run URL、workflow、runner、candidate commit、`--require-windows`、結果とし、実機は `unverified` とする。
- 外部API、OAuth、Repository Secret、remote push、PR、downstream、install、releaseの `not-run` 集計。

上記で十分とし、統一attestation、collector、追加証跡schema、外部署名を合格条件にしない。

## 評価シナリオ

1. helper APIの隔離repoで、Git状態・error分類を各1回発生させる。非競合dirtyだけfast-forwardし、dirty衝突、diverged、branch切替、detached HEAD、remote欠落、fetch失敗、timeoutは所定位置で停止する。
2. 6 callsiteのinventory／wiringを全件確認したうえで、現在branchによる検索前成功、`run.branch` によるActions後成功、代表1件の失敗／stage伝播だけを動的に確認する。
3. fake `gh` と決定的な時刻／wait seamで5秒より後の正しいrun、古い成功run、今回の失敗runを並べ、60秒既定、1秒override、指数backoff、失敗優先を確認する。
4. Chatworkの3失敗画面だけでActions側と端末側の見出し・案内を比較し、Git取り込み失敗や`gh` transport／認証／timeout／killからAPI Token案内が消えていることを確認する。Google Chatは3 callsiteの分類だけを確認する。
5. ローカル必須回帰を実行する。別途ユーザー確認を得られた場合だけWindows CIを実行し、CI成功をWindows実機確認へ読み替えていないことを確認する。

## External gate

本Sprintのローカル実装・自動評価はsyntheticな隔離repoとlocal browserで完結する。Windows CIだけはexternal live gateであり、pushまたは `workflow_dispatch` の対象、副作用、rollback、cleanupを示してユーザーの明示確認を得た後に実行する。この契約は実行を事前許可しない。

確認またはWindows run証跡が得られない間は `external-live-gate-unavailable`／`pending` と記録する。これは製品実装failureではないが、Sprintをdoneにする根拠にもならない。ユーザーが証跡要件を明示的に別判断で受け入れない限り、Evaluatorの最終PASSには同一candidate commitの `windows-2025`／`--require-windows` 成功が必要である。

実Chatwork／Google Chat API、OAuth、Repository Secret、remote push、PR作成、downstream展開、plugin install、version実ファイル更新、tag、GitHub Release、marketplace更新は引き続き行わない。必要になった場合は別の明示確認を得る。

## 範囲外の観測

Mac miniのCodex CLI 0.153.2起動時、installed plugin `agentic-secretary 0.10.3+codex.20260903131641` の `hooks/hooks.json` に対して `unknown field 'collaborationMarker', expected 'description' or 'hooks' at line 3 column 23` が表示された。Clarity PR #11系のRelated but independentな問題として記録し、本Sprintの実装・受入・評価対象へ含めない。

## 参照

- `docs/spec/features.md` F23／F24／F26／F32／F34／F82
- `docs/spec/constraints.md` §2
- `docs/spec/domain.md` Chatwork／Google Chat共通のGit取り込み
- `docs/spec/ui.md` Chatwork／Google Chat共通の文章設計
- `docs/spec/rubric.md` C1／C2／C3／C4／C5／C6／C8／C11
- `docs/sprints/sprint-035-patch-002.md`
