# Sprint 050 fresh独立Evaluator feedback

## Verdict

**判定:** 不合格 — `verification-scope-issue`

**対象区分:** `verification-infra`。新規product findingは0件。

**Generator candidate:** `5f08d454c05576fcff8ab32c10c00887b4c15a96`

**評価checkout:** `/tmp/sprint-050-eval.NMDuz8/candidate`（clean detached HEAD）

**開始時のOrchestrator HEAD:** `e7d83ab4a687040eacc66815c8c16cfe49305001`

**Escalation Recommendation:** none

### 結論

exact candidateのsource、別detached checkout、Git-free archiveで、primary 250、CLX 20、XV 4、E2E-001〜004、existing master、strict validator、release integrity、fixed handoffを実行した。registryは274 IDすべてuniqueで、missing／extra／group duplicate 0、初回Sprint割当と意味／Severityの変更0。実runnerは273 PASS、0 FAIL、未承認の実Xmind MCP `XM-007`だけconditional NOT-RUNで、Critical 124/124、High 127 PASS＋1 NOT-RUN、Medium 22/22だった。E2Eは4/4で、cross-root write、Hook loop、task自動作成、Decision誤確定は0件だった。

新規product findingはない。ただしSprint契約AC3とrubric C21が要求する、candidateを実hostへinstallしたClaude Code／Codex別のlive conversation／Hook発火は両方未実行である。candidate Hook commandへのsynthetic payloadとCLI versionは確認できたが、liveへ昇格していない。AC3はBLOCKED、C21は4/5で必須5/5未達、完成度C1も3/5となるため、Sprint全体をPASSにしない。

ユーザーは完成後に自分で実機テストする意向を明示済みだが、これは現在candidateに対する実host証拠ではなく、Evaluatorが合格条件を変更する根拠にもならない。`done-by-user-decision`はOrchestratorだけが、記録済み残余をユーザーが明示受容した場合に判断する。本feedbackはその遷移を行わない。

## Candidate identity／digest

独立実装したsorted path＋mode＋bytes計算を、candidate source、別clean detached checkout、Git-free archiveへ実行した。

| 対象 | full SHA | files | full tree SHA-256 | common files | common SHA-256 | `.git` |
|---|---|---:|---|---:|---|---:|
| source | `5f08d454c05576fcff8ab32c10c00887b4c15a96` | 828 | `1fbffe636565355b875dcde35ff05d26cd7e15f00710c1c88a563866749037c5` | 44 | `4aa6e8d4b21aa9e0020cfaa6edefd5ff0e6640fd2e8f937db00478190142f849` | checkout metadataのみ |
| independent detached checkout | 同上 | 828 | 同上 | 44 | 同上 | checkout metadataのみ |
| Git-free archive | 同上 | 828 | 同上 | 44 | 同上 | 0 |

3 treeのpath集合、mode、bytes、file count、common path digestは完全一致した。candidate check自身の出力も`CHECKOUT_MATCH=1 ARCHIVE_MATCH=1 ARCHIVE_GIT=0`だった。candidate checkoutは評価終了時もcleanで、HEADはexact SHAのままである。

## Registry／case coverage

registry Markdownの再掲IDではなく、`clarity-acceptance-registry` JSONだけを独立読込した。

| group | 件数 | unique | 初回割当 | PASS | conditional NOT-RUN | FAIL |
|---|---:|---:|---|---:|---:|---:|
| primary | 250 | 250 | Sprint 041=43、042=35、043=26、044=40、045=35、046=34、047=25、048=12 | 249 | 1 | 0 |
| CLX | 20 | 20 | Sprint 049=20 | 20 | 0 | 0 |
| XV | 4 | 4 | Sprint 043=4 | 4 | 0 | 0 |
| 合計 | 274 | 274 | group間duplicate 0 | 273 | 1 | 0 |

candidateと開始commit `327431ba0b79843643c56c1eb1addc154da9f4b7`の`docs/spec/clarity-acceptance.md`／`clarity-acceptance-cases.md`はdiff 0。case rowとの突合でmissing semantic row 0、SeverityはCritical 124、High 128、Medium 22だった。

machine-readable reportの実行結果は274件、unique 274、missing 0、extra 0、duplicate 0。各runnerはexit 0で、実際に報告したcase数は順に43／35／30（primary 26＋XV 4）／40／35／34／25／12／20だった。別suite内の補助assert数をcase数へ加えていない。

唯一のNOT-RUNは`XM-007`（High）。実Xmind external-liveの個別承認がないためで、isolated fakeをreal verifiedへ昇格していない。

## Main command evidence

### 正式wrapper

```text
bash scripts/sprint-050-regression.sh --candidate
```

- sandbox: exit 1。PK-007内のloopbackが`listen EPERM 127.0.0.1`で停止した。
- 通常環境: 同じcheckout、同じcommand、同じtimeout／assert／条件でexit 0。
- 最終集計: `PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1 CASES=274 E2E_PASS=4 E2E_FAIL=0 AC_EXECUTED=9 AC_PASS=8 AC_BLOCKED=1`。
- `SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4`。
- release integrity: PASS。
- handoff template: `publicationStatus=pending-public-evaluator-pass`、gate `closed`、`writesDownstream=false`。

最初のEvaluator cloneではGitが`origin`をローカルsource pathへ置換したため、通常環境のPK-007がSprint 033 canonical remote assertionで正しく停止した。元repoと同じcanonical origin URLを隔離checkout metadataへ復元し、source bytes、HEAD、working treeを変えずに同じwrapperを再実行した。これはcandidate不具合ではなくEvaluator checkout準備の問題である。

### Host live gate

```text
node scripts/agentic-live-host-gate.mjs --host claude-code-cli
node scripts/agentic-live-host-gate.mjs --host codex-cli
```

両方ともexit 2、`status=external-live-gate-unavailable`、`execution.result=incomplete`、`conversation.result=incomplete`、`installed=false`。candidateのhost inventoryはClaude Code Desktop／CLI、Codex App／CLIの全surfaceで`verified=false`を維持している。

CLI executableはClaude Code `2.1.231`、Codex CLI `0.147.0`を確認したが、version表示はcandidate install、live conversation、Hook発火の証拠ではない。Claude／Codex形式synthetic payloadによる共通Hook commandのSessionStart、PostToolUse、Stop、`stop_hook_active`負例はPASSしたが、liveへ昇格していない。

## Negative fixtures／fail-closed監査

すべて`/tmp`のtamper cloneだけを変更し、candidate sourceは変更していない。各負例でwrapperはexit 1となり、末尾の固定`SPRINT050_REGRESSION ... PASS=273` summaryへ到達しなかった。

| 負例 | 観測 |
|---|---|
| ST-001のExpectedを意味変更 | `primary meaning/severity changed`で即時拒否 |
| registry内ST-015をST-014へ置換 | `primary duplicate`、unique 249/250で拒否 |
| Sprint 041 runnerがST-001をST-002として重複出力 | `sprint-041 duplicate case output`で拒否。missing／duplicateを固定summaryで隠せない |
| Sprint 041 runnerをexit 7へ変更 | `scripts/sprint-041-test.mjs`の非0 exitを拒否 |
| clone originをlocal pathのまま実行 | existing Sprint 033のcanonical remote assertionで拒否 |

runnerは、各過去runnerのexit 0、対象IDのexact集合、runner出力IDの重複、PASS／FAIL／NOT-RUNを別々に検査している。最終summaryは固定文字列だが、先行assertまたはwrapper内commandが1つでも失敗すると`set -euo pipefail`で到達不能であり、固定summaryだけで成功できない。

## E2E evidence

formal wrapperの4 E2Eとは別に、Evaluator専用temp cloneでcleanupだけを抑止した補助runを行い、生成artifactを読んだ。製品処理とassertはformal candidateと同じで、補助runはartifact inspectionだけに使用した。

### E2E-001 — Standalone→Linked／Portfolio

- init preview前後tree一致、apply後にRepo由来Itemを生成。
- 4象限、Markdown／Mermaidを生成。Project IDはlink、sync、Xmind proposal apply後も不変。
- Claude／Codex別synthetic Hook commandでSessionStart、PostToolUse、Stop、2回目Stopを実行しloop 0。
- generic Secretary-localとprepare→accept→finalize、双方pull syncを実行。各processは自rootだけを更新しcross-root write 0。
- daily `今日の要確認`とPortfolioを確認。TODO bytes不変、task write 0、Decision誤確定0。
- public Xmind default OFF、隔離fixtureのみON。capable MCP priority 1=`mcp-selected`、切断=`fallback-approval-required`＋local write 0、reject=`stopped`＋write 0、approval digest一致後だけtemp `.xmind` create／update。
- Xmind editはproposal、未承認canonical差分0、承認後だけEventへ反映。
- HEAD、branch、remote、Secret相当、peer rootは不変。

### E2E-002 — 匿名CRM導入PJ

- 合成5 area×3 Item、4象限＋`将来アイデア`を生成。実顧客、提供PDF、提供Xmind、private pathを使用していない。
- `.xmind` readbackは`clarity-matrix-sheet`と`clarity-structure-sheet`の2 Sheetを持ち、全5 areaとItemを保持。
- Item遷移後、matrix branchは🟢から🟡へ移り、Project構造badgeも`暫定実装・要再確認`へ同期。
- tracked canonical evidenceにtemp absolute path、`my-vault`、実顧客／提供物literal 0。

### E2E-003 — Driftキラー

- `docs/decision.md`のemail-firstと`src/lookup.js`のcustomer_id-firstを両Evidenceとして比較。
- `decision_implementation_drift`、Critical、rank 1、Evidence 2件を確認。
- 実装をemail-firstへ変更後`aligned`へ解消。historyに`drift`と`aligned`の両方を保持。

### E2E-004 — Morning Brief

- Secretary-local 29 PJ: 未決定実装済み2、決定済み未実行1、Drift 1、idea 5、正常20。
- 判断対象4、表示3＋その他1、最優先Critical Drift。
- idea／正常詳細、Item body、connector readは0。

## Fixed visual／provider evidence

### MCP adapter request

production `createXmindMcpAdapter`へisolated transportを渡し、create／read／updateの3 operationを実行した。全requestは`contract=agentic-secretary.xmind.v1`、必須Sheet 2件、次のvisualを持った。responseは`verified=false`、`verification=isolated-fake-boundary`のままである。

| position | quadrant | 表示 | 意味 | color |
|---|---|---|---|---|
| 左上 | q2 | 🟢 定着・検証 | 安定している | `#16A34A` |
| 右上 | q1 | 🔵 実行待ち | あとは進めるだけ | `#2563EB` |
| 左下 | q3 | 🟡 暫定実装・要再確認 | 注意して確認する | `#D97706` |
| 右下 | q4 | 🔴 設計・意思決定 | 人間の判断が必要 | `#DC2626` |

### 承認済みtemp local `.xmind`

archive readbackではmatrix root labelsが`上軸: 決まっている`／`下軸: まだ決まっていない`。4 branchのtitle、位置label、`svg:fill`は上表とexact一致し、各Itemにもstable ID、emoji、label、意味文、同色styleがある。Project構造Sheetも存在する。E2E-002の最終matrix item数は緑1、青2、黄10、赤3で、状態遷移後のbranch移動を反映している。

### Mermaid raw

raw `.mmd`はq1右上青、q2左上緑、q3左下黄、q4右下赤、4 hex、emoji、label、意味文、`y-axis まだ決まっていない --> 決まっている`を保持した。renderer画像／SVGとXmind App screenshotは生成されていない。実Xmind MCP／Appも未承認・未実行であるため、rubric safe harborどおりC23は5へ上げず4/5とする。

## Existing regression／integration

- existing masterは`AGENTIC_REGRESSION_PASS=15 FAIL=0`をPK-007で確認。Sprint 013、019、021、022、023、024、027、033、Codex plugin、readability、offline host gate、Sprint 039、Sprint 047を実行した。
- Clarity runnerはSprint 041〜049をすべてexit 0で実行。Standalone、Secretary-local、Linked、Portfolioの4 modeをE2Eで再確認した。
- Sprint 049のF-01恒久回帰をCLX-001／007／008／018内で実行。さらに初回8反例をproduction routerへ直接再入力し、daily、weekly、Clarity日英状態、サービス名が文脈だけのClarity閲覧が8/8期待route、全side effect 0だった。
- 2 Repo canary、path traversal／absolute path、symlink、dirty／staged／unstaged／untracked、Secret、schema、lock／retry、Hook concurrencyの既存Clarity regressionは0 FAIL。

## Handoff／副作用境界

fixed handoffは次を維持している。

- `acceptedSource: null`
- `publicationStatus: pending-public-evaluator-pass`
- `preWriteGate.status: closed`
- `writesDownstream: false`
- downstream order: `agentic-secretary-my-vault` → `yasashii-secretary`
- common 44 path、excluded path、private／Yasashii protected path、5 adapter seam、file-scoped rollbackがvalidatorと独立digestで再現

public common pathにprivate／Yasashii固有pathはなく、inventory負例はprivate literal、omission、stale digest、旧契約を拒否した。private my-vault、Yasashii実repo、installed plugin／cache、Mac mini、release／tag／push／marketplace、外部connector、実Xmind cloud／user fileへのwriteは0件である。

## Acceptance Criteria

| AC | 判定 | 独立証拠 |
|---|---|---|
| AC1 registry 250／20／4、意味・割当・Severity、Critical／High | PASS | 274 unique、missing／extra／duplicate 0、意味／割当diff 0、Critical 124/124、High 127＋XM-007 NR、Medium 22/22 |
| AC2 E2E-001〜004、安全副作用0 | PASS | 4/4、cross-root／Hook loop／task write／Decision誤確定0 |
| AC3 Claude Code／Codex別live | **BLOCKED** | 両gate exit 2、incomplete、installed false。syntheticをliveへ昇格していない |
| AC4 Xmind OFF／ON、MCP-first、approval gate | PASS | OFF、ON隔離fixture、priority 1 MCP、failure／reject／cancel／approval前write 0、承認後tempだけwrite |
| AC5 fixed visual | PASS（safe harbor） | adapter request、local `.xmind` readback、Mermaid rawでexact一致。real screenshotなしのためC23=4 |
| AC6 master／Clarity／checkout／archive／validator／Secret | PASS | formal wrapper exit 0、candidate parity、archive `.git` 0 |
| AC7 public source／fixed handoff | PASS | common 44 digest再現、protected／excluded／adapter／rollback検証、固有実装混入0 |
| AC8 external／downstream write 0 | PASS | push／tag／release／cache／Mac mini／downstream／connector／user Xmind write 0 |
| AC9 stage分離とtruthful status | PASS | source／adapter PASS、Xmind live NOT-RUN verified false、host live incomplete、release／cache／loaded／downstream未実行を分離 |

AC実行9、PASS 8、BLOCKED 1、未実行AC 0。

## Rubric scores

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **3/5** | ≥4 | FAIL | 必須AC3の両host liveが未完了。product欠陥ではなくverification scope不足 |
| C3 機能の実証 | 4/5 | ≥4 | PASS | 274 case、4 E2E、実artifact、failure injection。実host liveだけC21へ分離 |
| C5 安全・規律 | 5/5 | 5 | PASS | path／Secret／dirty／cross-root／external write違反0 |
| C6 無回帰 | 5/5 | 5 | PASS | Clarity全runner、existing master、validator、release integrityが0 FAIL |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | Event／Evidence／State、rebuild、4象限、4 mode、immutable Project ID |
| C20 Attention・Clarity UX | 5/5 | ≥4 | PASS | 判断4、表示3＋1、結論→理由→根拠→選択、Drift最優先、idea／正常詳細0 |
| C21 Clarity Hook・host parity | **4/5** | 5 | FAIL | offline/syntheticの共通Hook・loop・degraded表示は成立。両host live未実行 |
| C22 federated link・sync・Drift | 5/5 | 5 | PASS | reciprocal link、pull-only sync、authority、cross-root write 0、両Evidence Driftと履歴 |
| C23 projection・Xmind | 4/5 | ≥4 | PASS | fixed visual、MCP-first、approval local、fake verified false。real MCP／App screenshotはtruthful NOT-RUN |
| C24 Clarity安全・統合・public-first | 5/5 | 5 | PASS | inventory／関連Skill／router F-01／handoff／回帰0 FAIL、downstream／release／cache write 0 |

ゼロ許容C21が5/5へ届かないため、他軸で相殺しない。

## Findings

### V-01 — 両hostのcandidate live証拠が未完了

- **対象区分:** `verification-infra`
- **重大度:** Major
- **分類:** `verification-scope-issue`
- **影響:** AC3、C21、C1を満たせずSprintをPASSにできない。
- **観測:** Claude Code／Codexともinstalled false、conversation／execution incomplete。synthetic Hook payloadとCLI versionだけ。
- **必要な証拠:** exact candidateを各hostへ読み込んだ実sessionで、Skill選択、SessionStart、PostToolUse、Stop、loop負例、manual fallbackをhost別に記録する。1hostの結果を他hostへ流用しない。
- **product修正:** なし。現時点でGeneratorへimplementation-issueとして戻す根拠はない。

### V-02 — sandbox loopback EPERM

- **対象区分:** `verification-infra`
- **重大度:** Minor、環境依存
- sandboxではPK-007が`listen EPERM 127.0.0.1`。通常環境の同一command exit 0でcandidate不具合と分離した。合否を追加で下げない。

### V-03 — local cloneのorigin置換

- **対象区分:** `verification-infra`
- **重大度:** Minor、Evaluator setup
- local cloneがoriginをsource pathへ変え、既存remote identity回帰がfail-closedした。canonical metadata復元後に同一candidateがgreen。製品findingではない。

### Product finding

新規findingなし。implementation-issue／spec-issueなし。

## Residual／未検証境界

- Claude Code／Codex candidate actual install、live conversation、実Hook発火: **BLOCKED。今回の唯一の合否blocker**。
- 実Xmind MCP connected create／read／update、実Xmind App openability、renderer／Xmind screenshot: 未承認NOT-RUN、verified false。rubric safe harborによりC23は4/5でPASS。
- Claude Code Desktop、Codex App、Windows native、Mac mini: 未検証。
- private my-vault／Yasashii実repo、実顧客fixture、提供PDF／Xmind、downstream candidate: 別Harness待ち。
- release、tag、push、marketplace、installed cache、new session loaded version: 未実行。

## Evaluator self-review

1. Generator summaryをVerdictへ使わず、exact candidateを別checkoutで実行し、report、runner実装、生成artifact、provider requestを別々に監査した。
2. 274 IDをregistry JSONから独立再計算し、runner内部assert数をcase countへ加えていないことを確認した。
3. 固定summaryの存在だけを信用せず、意味変更、割当重複、runner ID重複／欠落、runner非0の負例でfail-closedを確認した。
4. sandbox EPERMとclone origin差をproduct failureへ混ぜず、同じcandidateの通常環境結果で切り分けた。
5. isolated fake、synthetic host payload、CLI versionをexternal-live／host-liveへ昇格していない。
6. screenshotがないC23を5へ過大評価していない。
7. ユーザーの後日実機テスト意向を現在のEvaluator evidenceや`done-by-user-decision`へ変換していない。

