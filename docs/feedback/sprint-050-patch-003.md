# Sprint 050 Patch 003 Retry 1 独立評価 — 複数alias観測guard

- Evaluator: fresh独立Harness Evaluator
- 評価日: 2026-08-30
- Evaluated product/test candidate: `202b40711fc61db772024548bcd6a87a4848deea`
- Retry開始HEAD: `ff8dc313032d06cc1526b29b5c6f9176a8b16838`
- 前回candidate: `6497e09cc3fb5d52f5e282f04439fadcd25ac6b8`
- 評価開始時のorchestration HEAD: `49722aa0d8f356702de9f7b29f1653f5009138c6`
- Type: `regular`
- Verdict: **FAIL**
- Failure Kind: **implementation-issue**
- Escalation Recommendation: **strongを維持**

## 結論

前回Critical product finding F-01は修正されている。同一physical Repo Aをalias 1／alias 2から同一processで観測し、
alias 1だけをRepo Bへ差し替えた独立fixtureでは、重要read／writeの双方が`clarity-root-changed`、
`changed:false`で停止し、旧A／新Bのbytesは不変だった。alias 1だけのcleanup、同一観測tokenの2 lease、
最後のcleanup後のRepo B再利用も成立した。公式Target suiteは通常checkoutとexact candidateのGit-free archiveで
ともにCF 7／AR 14、21/21 PASSだった。

一方、Retry 1で追加されたobservation leaseは、実際のCLI／core／link／projection／Drift／Secretary adapter／Hook入口で
解放されない。各入口は`resolveClarityRoot(...).root`だけを取り、`observationToken`を破棄する。製品コードから
`clearClarityRootObservation()`を呼ぶ箇所は0件である。

このため、公開core `previewInit(alias)`を同一processで正常完了した後、aliasをRepo Bへ差し替え、別requestとして
旧physical Repo Aを直接`previewInit(physicalA)`すると、完了済みrequestのalias観測がguardに残り、
`clarity-root-changed`、`changed:false`で誤停止した。同じfixtureはRetry開始HEAD `ff8dc313...`では成功し、
candidate `202b407...`でのみ失敗する。これは契約B2の「内部opt-inはrequest中」、D1／AC13の全実入口整合、
AR-014、C6／C24に反するcandidate起因のproduct regressionである。

安全側停止なので旧／新RepoへのwriteやGit変更は発生しないが、正常な別requestを恒久的に止める。
C6／C24はゼロ許容であり、1軸でも閾値未達ならFAILのため、Sprint全体を不合格とする。

## Rubric score

| 基準 | Score | 閾値 | 判定 | 独立根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **3/5** | ≥4 | FAIL | 公式21/21に対し、公開coreのrequest lifecycleを直接操作するとAR-014／AC1・5・13が未達 |
| C2 構文・整合 | **5/5** | 5 | PASS | `git diff --check`、`node --check`、inventory 19/19、Patch ID／feature割当がgreen |
| C5 安全・規律 | **5/5** | 5 | PASS | 前回fail-openは解消。差替え時はread／writeとも副作用0でfail-closedし、旧A／新B bytes不変 |
| C6 無回帰 | **4/5** | 5 | FAIL | 同じ公開core fixtureがRetry開始HEADでは成功しcandidateでstale guard誤停止。handed-over suiteは検出しない |
| C20 Attention・Clarity UX | **5/5** | ≥4 | PASS | status／daily／weekly／Portfolioのbounded正本観測、freshness、未確認理由はTarget suiteと近傍回帰で維持 |
| C22 federated link・sync・Drift | **5/5** | 5 | PASS | identity／portable link／Drift locator拒否、Sprint 046 34/34を維持 |
| C24 Clarity安全・統合・public-first | **4/5** | 5 | FAIL | 全入口がtokenを破棄しcleanup不能。完了済みrequestの観測が次requestを誤停止する |

合計は**31/35**。C1、C6、C24が閾値未達である。

## Acceptance Criteria

| AC | 判定 | 独立確認 |
|---:|---|---|
| 1 | **FAIL** | 公式21/21だが、AR-014の公開core request lifecycle反例を再現。独立最終判定は20 PASS／1 FAIL |
| 2 | PASS | status／daily／weekly／Portfolioがfirst file、Repo／Git／Clarity identity、observedAt、revision、freshnessをbounded read |
| 3 | PASS | remote-only／missing／unsafe／unreadable／staleを理由付きで分離し、network／Git write 0 |
| 4 | PASS | Secret／binary／large／symlink本文を読まず、Secret canary露出0 |
| 5 | **FAIL** | 一般`workingRoot`の既定拒否は維持するが、Clarity内部opt-in観測がrequest完了後も残留 |
| 6 | PASS | alias／physicalの未初期化判定と初期化済みidentity一致を確認 |
| 7 | PASS | preview write 0、applyはsynthetic物理Repo内の宣言済み`.clarity/**`だけ |
| 8 | PASS | root自身、内部symlink、broken／file向きancestorを固有errorで拒否し副作用0 |
| 9 | PASS | alias 1／2 interleavingを含め、差替え後の重要read／writeが`clarity-root-changed`、旧／新bytes不変 |
| 10 | PASS | tracked bundle／Event／Evidence／projectionへのfixture absolute path 0 |
| 11 | PASS | Target positive／negative、独立差替えfixtureともGit／tree不変。宣言済みsynthetic apply以外write 0 |
| 12 | PASS | Sprint 041／045／046／047／049／048、inventory、Git-freeは0 product FAIL。Sprint 050既知digest差は別分類 |
| 13 | **FAIL** | 全入口は同じresolverを使うが、handleを保持・cleanupせず、同一processの次requestへstale guardを持ち越す |
| 14 | PASS | inventory 19 surface／41 case、Patch 21 ID、duplicate／missing／extra 0、feature各1 |
| 15 | PASS | Fable reviewを製品PASSやEvaluator証拠へ流用していない |

## Target Case 21件

| ID | 判定 | 観測 |
|---|---|---|
| CF-001 | PASS | alias配下local canonicalをstatusがbounded read |
| CF-002 | PASS | snapshotとcurrent canonical evidenceを分離 |
| CF-003 | PASS | daily／weekly／Portfolioが同じ観測意味を共有 |
| CF-004 | PASS | remote-onlyからnetwork／Git operation 0 |
| CF-005 | PASS | Secret／binary／large／symlink本文0 |
| CF-006 | PASS | missing／unsafe／unreadable／staleをtruthfulに表示 |
| CF-007 | PASS | canonical observation前後のfilesystem／Git不変 |
| AR-001 | PASS | 一般既定拒否、Clarityだけ内部opt-in |
| AR-002 | PASS | alias／physicalの次判定一致 |
| AR-003 | PASS | Repo／Git／Clarity identity一致 |
| AR-004 | PASS | preview read-only、applyは物理`.clarity/**`だけ |
| AR-005 | PASS | root自身symlinkを拒否 |
| AR-006 | PASS | 内部`.clarity` symlinkを追わない |
| AR-007 | PASS | broken ancestorをinspection前に拒否 |
| AR-008 | **PASS** | alias 1／2 interleavingのread／write fail-closed、A／B bytes不変、cleanup／reuse成立 |
| AR-009 | PASS | portable bundleにabsolute local path 0 |
| AR-010 | PASS | dirty／staged／untracked、HEAD、branch、remote保持 |
| AR-011 | PASS | Drift locator symlink拒否、Evidence／Git変更0 |
| AR-012 | PASS | macOS platform alias維持、利用者path hard-code 0 |
| AR-013 | PASS | file向きancestorを固有errorで拒否 |
| AR-014 | **FAIL** | 公開coreの正常完了後に観測を解放できず、別の旧physical root requestをstale guardで誤停止 |

## Findings

### F-01 — 前回の複数alias guard上書きによるfail-openは解消

- 対象区分: **product（解消確認）**
- 前回Severity: Critical
- blocking: なし

独立fixtureでalias 1／2のtokenが別であること、alias 2反復は同一tokenであること、alias 1差替え後の
重要read／writeがともに`clarity-root-changed`／`changed:false`であること、A／B tree digest不変を確認した。
alias 1 cleanup後もalias 2はRepo Aをreadでき、alias 2の2 leaseを順にcleanupした後はRepo Bを新規利用できた。

### F-02 — 実入口がobservation leaseを解放せず、完了済みrequestのstale guardが次requestを誤停止する

- 対象区分: **product**
- Severity: **Critical**（Target AR-014）
- Failure Kind: `implementation-issue`
- 該当: AR-014、AC1／5／13、C1／C6／C24
- candidate因果: **あり**。Retry開始HEADは成功、candidateだけ失敗

再現は次のとおり。

1. synthetic Repo C／Dを作り、ancestor aliasをRepo Cへ向ける。
2. 同一processで公開core `previewInit(aliasC)`を2回正常完了する。
3. aliasだけをRepo Dへ差し替える。
4. 別request相当として旧physical Repo Cを直接`previewInit(physicalC)`する。

期待はRepo Cの通常preview成功だが、candidateは次を返した。

```text
clarity-root-changed
changed:false
Clarity working rootのalias解決先が変わったため、旧・新rootとも変更せず停止しました。
```

Retry開始HEADでは同じfixtureが`STALE_MISSTOP=false`、exit 0だった。candidateでは
`STALE_MISSTOP=true`、exit 1である。`rg`確認では製品入口はresolverの`.root`だけを使い、
`clearClarityRootObservation()`の製品呼出は0件だった。cleanup API自体の動作ではなく、実入口との結線が欠けている。

### V-01 — Target AR-008はhelper cleanupを検査するが、実入口のlifecycle残留を検出しない

- 対象区分: `verification-infra`
- Severity: Major
- 単独の合否影響: なし。F-02 product failureの検出漏れ

Target suiteは`resolveClarityRoot()`のhandleを保持し、明示的に`clearClarityRootObservation(handle)`を呼ぶためgreenになる。
実入口はhandleを返さずcleanupしない。既存AR-014／AC13の入口直接検査へ、同一processで完了request→alias変更→
別physical requestの順を加えれば、新しいcollectorや証拠形式なしで検出できる。

### V-02 — Sprint 050 coverage-only primary digest差はRetry開始HEADとcandidateで同一

- 対象区分: `verification-infra`
- Severity: non-blocking baseline
- candidate因果: なし

Retry開始HEADとcandidateをそれぞれGit-free archiveへ展開し、同じcommandを実行した。双方ともexit 1、
同じstack位置、同じactual／expected digestだった。

```text
node scripts/sprint-050-test.mjs
AssertionError: primary meaning/severity changed
actual   6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8
expected f3782f008a362f4a7d9d38afeb48cda97ced61062e69fd062093132277ccf979
```

Sprint 050全体のPASSには数えず、candidate product failureにも数えない。

### V-03 — sandboxのSprint 048 loopback EPERM

- 対象区分: `verification-infra`
- Severity: environment-only／解消確認済み

sandboxではPK-007配下が`listen EPERM 127.0.0.1`で停止した。同一candidate・同一commandを通常環境で再実行し、
PK 12/12、Critical 7、NOT-RUN 0、exit 0を確認した。製品findingへ数えない。

## 実行証拠

### Target suiteと独立fixture

```text
node scripts/sprint-050-patch-003-test.mjs
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0

# exact candidate 202b407... のGit-free archive
node scripts/sprint-050-patch-003-test.mjs
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0

node /private/tmp/sprint-050-p003-retry1-evaluator.mjs
same-physical-two-observations=true
same-observation-reuses-token=true
changed-alias-read-fail-closed=true
changed-alias-write-fail-closed=true
old-new-bytes-unchanged=true
cleanup-one-keeps-other-live=true
first-reused-token-cleanup-keeps-lease=true
final-cleanup-removes-stale-guard=true
public-core-completed-request-no-stale-misstop=false
EVAL_AR008_PASS=8 FAIL=1 TOTAL=9

node /private/tmp/sprint-050-p003-stale-only.mjs <retry-start-archive>
STALE_MISSTOP=false  # exit 0

node /private/tmp/sprint-050-p003-stale-only.mjs <candidate-archive>
STALE_MISSTOP=true code=clarity-root-changed changed=false  # exit 1
```

fixtureはOS一時directoryのsynthetic Git Repoだけを使い、終了時に削除した。実顧客repo、private／Yasashii、
installed cache、Marketplace、remote、network、外部writeには触れていない。

### 関連回帰

```text
node scripts/sprint-041-test.mjs
SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43

node scripts/sprint-045-test.mjs
SPRINT045_CASE_PASS=35 FAIL=0 TOTAL=35

node scripts/sprint-046-test.mjs
SPRINT046_TEST_PASS=34 FAIL=0 REMOTE_COMMANDS=0 CANARY=UNCHANGED

node scripts/sprint-047-test.mjs
SPRINT047_TEST_PASS=25 FAIL=0 STRESS_CLI=32 STRESS_HOOK=32 EVENT_PARSE=100% EVENT_UNIQUE=100% STATE_REBUILD=100%

node scripts/sprint-049-inventory.mjs validate
SPRINT049_INVENTORY_PASS=19 FAIL=0 CASES=41 MARKERS=VALID DIGESTS=VALID

node scripts/sprint-049-test.mjs
SPRINT049_PASS=20 FAIL=0 CRITICAL_PASS=15 CRITICAL_NOT_RUN=0 AC_EXECUTED=6 AC_NOT_RUN=0 SIDE_EFFECT_VIOLATIONS=0

node scripts/sprint-048-test.mjs  # 通常環境
SPRINT048_PASS=12 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_PASS=7 CRITICAL_NOT_RUN=0 AC_EXECUTED=6 AC_NOT_RUN=0
```

### Candidate、差分、構文、worktree

```text
git diff --name-status ff8dc313...202b407...
M docs/progress/sprint-050-patch-003.md
M plugins/secretary/collaboration-inventory.json
M plugins/secretary/scripts/lib/clarity-root.mjs
M scripts/sprint-050-patch-003-test.mjs

git diff --name-status 202b407...HEAD
M docs/sprints/state.md

git diff --check ff8dc313...202b407...
exit 0

node --check plugins/secretary/scripts/lib/clarity-root.mjs
exit 0
```

candidate後の製品／test差分はなく、Orchestrator所有`docs/sprints/state.md`だけである。評価開始時worktreeはcleanだった。

## 未実施・残余境界

- UI変更がないためbrowser／DOM／screenshotは非該当。
- Driftはread-only locator negativeだけを実行し、resolve／apply／Git commitは実行していない。
- Sprint 050 full suiteは既知coverage digest guardで開始前に停止した。PASS表示していない。
- 実Xmind MCP、Claude Code／Codex live Hook、Windows native、Mac mini対象repo、実顧客repoは未実施。
- private my-vault／Yasashii、installed cache、Marketplace、version、release、push、PR、tag、remoteは未変更。
- 実provider、connector、network、clone／fetch／pull／checkoutは実行していない。
- 本評価はpublic source candidateだけを対象とし、release-ready／installed／loaded／external-liveを意味しない。

## Evaluator自己レビュー

1. Generatorの会話履歴や自己評価を判定根拠へ使わず、正本、exact candidate archive、実物command、独立fixtureを使った。
2. 前回F-01をread／write、bytes、token／lease、cleanup／reuseまで再現し直し、解消を確認した。
3. Target test本文のassertだけでPASSにせず、公開core入口を同一processで直接操作した。
4. F-02は契約済みのrequest中opt-in、AR-014、AC13を検査したもので、新しい合格条件や証拠形式ではない。
5. Retry開始HEADとcandidateへ同一fixtureを実行し、F-02のcandidate因果を分離した。
6. coverage digest差とsandbox EPERMをverification-infraへ分け、製品PASSにもcandidate failureにも誤算入していない。
7. 実顧客・private・Yasashii・installed・Marketplace・remote・network・releaseへのwriteは0件である。
8. spec、contract、state、progress、製品、tests、inventoryは編集せず、本feedbackだけを更新した。

Orchestratorが本feedbackを確認して`docs/sprints/state.md`を更新するまで、進行状態は変更しない。
