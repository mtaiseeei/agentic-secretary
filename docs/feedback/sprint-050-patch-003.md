# Sprint 050 Patch 003 Retry 2 独立評価 — request lifecycleとroot観測解放

- Evaluator: fresh独立Harness Evaluator
- 評価日: 2026-08-30
- Evaluated product/test candidate: `51329fc05ea0e9e66f64aa5c3bf2ee2db168ed58`
- Retry 2開始HEAD: `19d9231e29327378c5d46bdc0ccf7fc5a7d54943`
- 前回candidate: `202b40711fc61db772024548bcd6a87a4848deea`
- 評価開始時のorchestration HEAD: `1e9052f2c15d59f914a663ece901b4a31fed052b`
- Type: `regular`
- Verdict: **PASS**
- Failure Kind: **none**
- Escalation Recommendation: **none**

## 結論

Retry 1のblocking product finding F-02は解消した。exact candidateのGit-free treeを使った独立fixtureで、公開core
`previewInit(aliasC)`を同一processで2回正常完了した後にaliasをRepo Dへ差し替えても、別requestの
`previewInit(physicalC)`はstale guardへ誤停止せず成功した。`applyInit(aliasC)`が`no-candidates`でthrowした失敗requestでも、
alias差替え後の`previewInit(physicalC)`は成功した。正常・例外の両方でRepo C／Dのtree bytesとGit snapshotは不変だった。

cleanupを早く行いすぎてrequest中の安全guardを弱めてもいない。request scope内でaliasをRepo Bへ差し替えると、
重要read／writeは双方とも`clarity-root-changed`、`changed:false`で停止し、旧Repo A／新Repo BのbytesとGitは不変だった。
physical rootへのnested resolveは同じobservation tokenへdedupeし、scope終了後は旧physical Repoを新requestで再利用できた。

前回解消したF-01も独立再確認した。alias 1／2は別token、alias 2反復は同じtokenの2 leaseとなり、alias 1差替え後の
read／writeはfail-closedした。alias 1だけをcleanupするとalias 2は継続利用でき、alias 2の1 leaseだけを解放した後の
差替えは残るleaseが検出し、最後のlease解放後はRepo Bを新規利用できた。

CLI／core／link／projection／Drift／Secretary adapter／Hookは既存AR-014の実入口を操作した。独立fixtureではcore preview、
link identity、projection build、Drift locator negative、canonical Repo observation、Hook root inspection、CLI statusをalias経由で
実行し、その後の旧physical Repo requestが成功した。Target suiteも同じmatrixとerror区別を直接実行しており、文字列存在だけを
PASS根拠にしていない。

Target suiteは通常checkoutとexact candidateのGit-free archiveでともにCF 7／AR 14、21/21 PASSだった。
Sprint 041／045／046／047／049とinventoryはすべて0 FAILである。Sprint 048 directはsandboxの既知`listen EPERM`、
通常環境ではPK-001〜006後の既存master regressionが長時間無出力となったため中断した。このwrapper自体を新しいpass条件へ
拡大せず、Retry 1でgreenだった未変更面の証跡、Retry 2の実git diff、変更面を覆うdirect suiteで増分評価した。
Sprint 050の既知primary digest差はRetry開始HEADとcandidateで同じdigest・stack・exit 1であり、製品PASSにもcandidate failureにも
数えていない。

全Acceptance CriteriaとC1／C2／C5／C6／C20／C22／C24が閾値を満たし、blocking findingは0件である。

## Rubric score

| 基準 | Score | 閾値 | 判定 | 独立根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **5/5** | ≥4 | PASS | Target 21/21、AC 1〜15 PASS。F-02正常／例外lifecycleと全実入口を直接再現 |
| C2 構文・整合 | **5/5** | 5 | PASS | 変更対象11 `.mjs`の`node --check`、`git diff --check`、inventory 19/19がgreen |
| C5 安全・規律 | **5/5** | 5 | PASS | request中のread／writeはfail-closed、`changed:false`。旧／新Repo bytes・Git不変、network／external write 0 |
| C6 無回帰 | **5/5** | 5 | PASS | 041 43/43、045 35/35、046 34/34、047 25/25、049 20/20、Target／Git-free 21/21。未変更master面は増分原則で前回証跡を継承 |
| C20 Attention・Clarity UX | **5/5** | ≥4 | PASS | CF 7件とSecretary rollup回帰でbounded正本観測、freshness、未確認理由を維持 |
| C22 federated link・sync・Drift | **5/5** | 5 | PASS | link実入口、Drift negative、LK-007、Sprint 046 34/34。cross-root write／remote command 0 |
| C24 Clarity安全・統合・public-first | **5/5** | 5 | PASS | request scope、root containment、全入口matrix、inventory、Git-free、public-only境界が成立 |

合計は**35/35**。閾値未達はない。

## Acceptance Criteria

| AC | 判定 | 独立確認 |
|---:|---|---|
| 1 | PASS | CF-001〜007／AR-001〜014が通常checkout・Git-freeとも21/21、Critical未実行0 |
| 2 | PASS | status／daily／weekly／Portfolioがfirst file、Repo／Git／Clarity identity、observedAt、revision、freshnessをbounded read |
| 3 | PASS | remote-only／missing／unsafe／unreadable／staleを理由付きで分離し、network／Git write 0 |
| 4 | PASS | Secret／binary／large／symlink本文を読まず、Secret canary露出0 |
| 5 | PASS | 一般`workingRoot`は既定拒否、Clarity内部opt-inはrequest中だけ保持し正常／例外終了で解放 |
| 6 | PASS | alias／physicalの未初期化判定と初期化済みidentity一致 |
| 7 | PASS | preview write 0、synthetic applyは物理Repo内の宣言済み`.clarity/**`だけ |
| 8 | PASS | root自身、内部symlink、broken／file向きancestorを固有errorで拒否し副作用0 |
| 9 | PASS | request中のalias差替えをread／write直前に検出。旧／新Repo bytes・Git不変 |
| 10 | PASS | tracked bundle／Event／Evidence／projectionへのfixture absolute path 0 |
| 11 | PASS | positive／negative fixtureのtree／Git不変。宣言済みsynthetic apply以外write 0 |
| 12 | PASS | ST-008、LK-007、CLX-006、GS、041／045／046／047／049、Target／Git-freeが0 product FAIL。既存master未変更面は前回証跡を増分継承 |
| 13 | PASS | CLI／core／link／projection／Drift／Secretary adapter／Hookの実入口がrequest lifecycleと同じphysical policyへ結線 |
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
| AR-008 | PASS | alias 1／2、token／lease、request中read／write fail-closed、cleanup／reuse成立 |
| AR-009 | PASS | link bundleにabsolute local path 0 |
| AR-010 | PASS | dirty／staged／untracked、HEAD、branch、remote保持 |
| AR-011 | PASS | Drift locator symlink拒否、Evidence／Git変更0 |
| AR-012 | PASS | macOS platform alias維持、利用者path hard-code 0 |
| AR-013 | PASS | file向きancestorを固有errorで拒否 |
| AR-014 | PASS | 正常／例外request cleanupと全実入口matrixが同じlifecycle／physical policyを使用 |

## Findings

### F-02 — 完了requestのstale guard残留は解消

- 対象区分: **product（解消確認）**
- 前回Severity: Critical
- blocking: なし
- candidate因果: **あり**

同一独立fixtureはRetry開始HEAD `19d9231...`で、2回の`previewInit(aliasC)`後にaliasをDへ差し替えると
`previewInit(physicalC)`が`clarity-root-changed`で失敗した。candidate `51329fc...`では正常request、
`no-candidates`例外requestの双方で後続physical requestが成功した。tree／Git snapshotは前後不変である。

### F-01 — 複数alias観測guardのfail-open解消を維持

- 対象区分: **product（解消維持）**
- 前回Severity: Critical
- blocking: なし

alias 1／2の別token、同一aliasのtoken dedupeと2 lease、差替え後のread／write fail-closed、1 leaseだけ残る時のguard、
最後のcleanup後のRepo B再利用まで独立確認した。cleanup追加による安全性低下はない。

### V-01 — lifecycle回帰は既存AR-014へ結線済み

- 対象区分: `verification-infra（解消確認）`
- blocking: なし

Target AR-014は公開coreの正常反復、alias retarget、別physical request、例外request後のcleanupを実行する。
独立fixtureはさらに実入口matrixとrequest中guardを別経路で確認した。新case、collector、証拠形式は追加していない。

### V-02 — Sprint 050 coverage-only primary digest差は非因果baseline

- 対象区分: `verification-infra`
- Severity: non-blocking baseline
- candidate因果: なし

Retry開始HEADとcandidateを別々のGit-free archiveへ展開し、同じcommandを実行した。双方ともexit 1、同じstack、
actual `6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8`、
expected `f3782f008a362f4a7d9d38afeb48cda97ced61062e69fd062093132277ccf979`だった。
Sprint 050全体のPASSにも本candidateのFAILにも数えない。

### V-03 — Sprint 048 master wrapperの環境制約／長時間化

- 対象区分: `verification-infra`
- Severity: non-blocking
- candidate因果: なし

sandboxではPK-007のloopbackが`listen EPERM 127.0.0.1`で停止した。通常環境ではPK-001〜006 PASS後、
既存master regressionが90秒以上無出力のため中断した。Retry 2のdiffはClarity lifecycle、Target test、inventory digest、progressだけで、
未変更master面はRetry 1のgreen証跡を継承した。変更面はTarget、041／045／046／047／049、inventory、独立fixtureで直接greenである。
長時間wrapperの完走自体を新しい合格条件にしていない。

## 実行証拠

### Target suiteとexact Git-free candidate

```text
node scripts/sprint-050-patch-003-test.mjs
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0

# git archive 51329fc... を展開した .git なしtree
node scripts/sprint-050-patch-003-test.mjs
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0
```

### 独立fixture

```text
node /private/tmp/s050p003-evaluator-independent.mjs
PASS F02-success-request-cleanup
PASS F02-throw-request-cleanup
PASS F01-multi-alias-token-lease-cleanup-reuse
PASS request-scope-keeps-guard-until-finally
PASS actual-entrypoint-matrix-cleans-success-and-error
INDEPENDENT_PASS=5 FAIL=0 TOTAL=5

S050_SOURCE=<Retry開始HEAD 19d9231... Git-free tree> node /private/tmp/s050p003-evaluator-independent.mjs
exit 1: F02-success-request-cleanupの後続previewInit(physicalC)がclarity-root-changed
```

fixtureはOS一時directoryのsynthetic Git Repoだけを使い、正常・例外request、read／write negative、CLI／core／link／projection／
Drift／Secretary adapter／Hookを操作した。実顧客repo、private／Yasashii、installed cache、Marketplace、remote、network、外部writeには触れていない。

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
```

### Candidate、構文、digest因果、worktree

```text
git diff --name-status 19d9231...51329fc...
M docs/progress/sprint-050-patch-003.md
M plugins/secretary/collaboration-inventory.json
M plugins/secretary/scripts/clarity-hook.mjs
M plugins/secretary/scripts/clarity-secretary.mjs
M plugins/secretary/scripts/clarity.mjs
M plugins/secretary/scripts/lib/clarity-core.mjs
M plugins/secretary/scripts/lib/clarity-drift.mjs
M plugins/secretary/scripts/lib/clarity-hook.mjs
M plugins/secretary/scripts/lib/clarity-link.mjs
M plugins/secretary/scripts/lib/clarity-projection.mjs
M plugins/secretary/scripts/lib/clarity-root.mjs
M plugins/secretary/scripts/lib/clarity-secretary.mjs
M scripts/sprint-050-patch-003-test.mjs

git diff --name-status 51329fc...HEAD
M docs/sprints/state.md

node --check <Retry 2変更対象11 .mjs>
全11件 exit 0
git diff --check 19d9231...51329fc...
exit 0
git diff --check 51329fc...HEAD
exit 0
node scripts/sprint-050-test.mjs --coverage-only
19d9231...／51329fc...とも同一digest差、exit 1
```

candidate後の製品／test差分はなく、Orchestrator所有`docs/sprints/state.md`だけである。feedback更新前のworktreeはcleanだった。

## 未実施・残余境界

- UI変更がないためbrowser／DOM／screenshotは非該当。
- Sprint 048 direct／master wrapperはV-03のとおり完走していない。製品PASSと表示せず、変更面direct suiteと未変更面の前回証跡へ分離した。
- Sprint 050 full suiteは既知coverage digest guardで開始前に停止した。PASS表示していない。
- Driftはread-only locator negativeだけを実行し、resolve／apply／Git commitは実行していない。
- 実Xmind MCP、Claude Code／Codex live Hook、Windows native、Mac mini対象repo、実顧客repoは未実施。
- private my-vault／Yasashii、installed cache、Marketplace、version、release、push、PR、tag、remoteは未変更。
- 実provider、connector、network、clone／fetch／pull／checkoutは実行していない。
- 本評価はpublic source candidateだけを対象とし、release-ready／installed／loaded／external-liveを意味しない。

## Evaluator自己レビュー

1. Generatorの会話履歴や自己評価を判定根拠へ使わず、正本、exact candidate archive、実command、独立fixtureを使った。
2. F-02を正常反復と例外終了の両方で再現し、次requestの成功とRepo C／D bytes・Git不変を確認した。
3. request中のguardをread／write双方、`changed:false`、旧／新Repo不変で確認し、cleanupの早期化を見逃していない。
4. F-01を別token、同一token dedupe、2 lease、段階cleanup、reuseまで独立確認した。
5. 全入口は実operationで確認し、共有helperや文字列存在だけでAR-014／AC13をPASSにしていない。
6. Sprint 048長時間wrapperを新しいpass条件にせず、実git diffと増分原則で変更面／未変更面を分離した。
7. Sprint 050 digest差とSprint 048環境／長時間化を`verification-infra`へ分け、製品PASSにもcandidate failureにも誤算入していない。
8. 全findingを`product`／`verification-infra`へ分類し、blocking finding 0、各PASSにcommand／fixture証拠がある。
9. 新しい基準、case、collector、証拠形式、外部live条件を追加していない。
10. spec、contract、state、progress、製品、tests、inventoryを編集せず、本feedbackだけを更新した。

Orchestratorが本feedbackを確認して`docs/sprints/state.md`を更新するまで、進行状態は変更しない。
