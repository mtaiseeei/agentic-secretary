# Sprint 050 Patch 001 fresh独立Evaluator feedback

Verdict: FAIL
Evaluated commit: 9e5d9e64d4b82eb11c1a0ffec9c8e5414b33fdbd

- **対象区分:** `product`
- **失敗分類:** `implementation-issue`
- **Escalation Recommendation:** none
- **評価checkout:** 現在HEADには対象実装後のOrchestrator state commitだけが追加されているため、製品差分は指定commit `9e5d9e64...` を親commit `9d37585a...` と比較した。accepted product sourceは別のclean detached checkout `/tmp/agentic-s050-accepted.DMySSB/repo` で再計算した。

## 結論

既存製品の回帰は維持されている。Patch専用suiteは66/66、Sprint 049 inventoryは20/20、Sprint 048 public packagingは12/12、wrapperは8/8、validatorは23/23、release integrityもPASSした。Sprint 050 product registryも273 PASS／0 FAIL／1 conditional NOT-RUN、E2E 4/4で、accepted product sourceのtree 828件／common 44件は固定digestと一致した。

ただし、本Patchが追加したgovernance gateには2つのfail-open、つまり拒否すべき入力をreadyとして通す欠陥がある。

1. governance feedbackにFAILとPASSが併存する、評価対象commitが複数ある、またはcode fence内だけにPASS表記がある曖昧入力を、すべて`ready`として受理した。
2. Sprint 049 product projectionから除外した新governance JSONへ未知のPASS alias／`evaluatorPass=true`相当fieldを追加しても、Sprint 049、標準`validate-template`、user-decision validation、実ready生成が全て成功した。

この2件は、単一で明確なPatch Evaluator PASSだけを根拠にするAC6・AC7・C25と、新governance bytesをPatch gateが全て守るC24の要件に反する。C25は5/5必須かつゼロ許容なので、他のgreen回帰では相殺できない。

## 評価対象差分

指定commitの変更は次の5fileだった。

- `adapters/downstream-clarity-handoff.json`
- `scripts/sprint-048-handoff.mjs`
- `scripts/lib/sprint-049-inventory.mjs`
- `scripts/sprint-050-patch-001-test.mjs`
- `docs/progress/sprint-050-patch-001.md`

`plugins/secretary/**`、`docs/feedback/sprint-050.md`、`docs/spec/**`、`docs/sprints/**`の製品／正本bytesは対象Generator commitで変更されていない。既存`evaluatePreWriteGate`とCLI `prewrite`のpublic-evaluator-pass正例／負例は、差分と実回帰の両方で不変を確認した。

## 正式回帰とidentity証拠

### Patch targeted suite

```text
node scripts/sprint-050-patch-001-test.mjs
SPRINT050_PATCH001_PASS=66 FAIL=0 POSITIVE=6 NEGATIVE=58 INTEGRITY=2
READY_ARTIFACT_TRACKED=0 DOWNSTREAM_WRITE=0 EXTERNAL_WRITE=0
```

既存66件は全てgreenだが、後述の複数Verdict、複数commit、code fence内PASS、未知governance fieldの負例を含んでいない。

### Sprint 049 inventory／validator／標準template

```text
node scripts/sprint-049-test.mjs
SPRINT049_PASS=20 FAIL=0 ... SIDE_EFFECT_VIOLATIONS=0

node scripts/sprint-048-validator.mjs
SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4

node scripts/sprint-048-handoff.mjs validate-template
publicationStatus=pending-public-evaluator-pass
preWriteGate=closed
writesDownstream=false
```

### Sprint 048 public-evaluator-pass回帰

sandboxではPK-007のloopback待受だけが`listen EPERM 127.0.0.1`で停止した。同一checkout・同一commandを通常環境で再実行して切り分けた。

```text
bash scripts/sprint-048-regression.sh
SPRINT048_PASS=12 FAIL=0
SPRINT048_REGRESSION_PASS=8 FAIL=0 TARGETS=12
release integrity: PASS
```

PK-012の既存public-evaluator-pass正例／負例もPASSしており、user-decision statusや`evaluatorPass=false`を既存PASS aliasにはしていない。

### Sprint 050 product registry／E2E

通常環境で次を実行した。

```text
node scripts/sprint-050-test.mjs --report /tmp/agentic-secretary-sprint-050-patch-001-evaluator-product-report.json
SPRINT050_REGISTRY primary=250 collaboration=20 visual=4 unique=274 missing=0 extra=0 duplicate=0 semantic_changed=0 assignment_changed=0
SPRINT050_COVERAGE PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1 TOTAL=274 CRITICAL=124/124 HIGH_PASS=127 HIGH_NOT_RUN=1
SPRINT050_E2E PASS=4 FAIL=0 CROSS_ROOT_WRITE=0 HOOK_LOOP=0 TASK_AUTO_CREATE=0 DECISION_FALSE_CONFIRM=0
```

唯一のconditional NOT-RUNは既存どおり`XM-007`。実Xmind MCPをverifiedへ昇格せず、Claude Code／Codex host liveも`external-live-gate-unavailable`のまま分離されている。

### Accepted product source

accepted SHAをclean detached checkoutにし、そこから別checkoutとGit-free archiveを作る既存candidate checkerを実行した。

```text
SHA=5f08d454c05576fcff8ab32c10c00887b4c15a96
TREE=1fbffe636565355b875dcde35ff05d26cd7e15f00710c1c88a563866749037c5
FILES=828
COMMON=4aa6e8d4b21aa9e0020cfaa6edefd5ff0e6640fd2e8f937db00478190142f849
COMMON_FILES=44
CHECKOUT_MATCH=1 ARCHIVE_MATCH=1 ARCHIVE_GIT=0
```

accepted product sourceとPatch governance sourceは別identityのまま。origin feedbackもcommit `8483d863...` と現在pathの両方でSHA-256 `fcaed413963cfcee2ea6303c1293a8c376b197a4998b5e3a682154eeca1b9cdd`に一致した。

## 独立敵対試験

### P-01: 曖昧なgovernance feedbackがreadyになる

**対象区分:** `product`

**重大度:** Critical

**分類:** `implementation-issue`

`parseGovernanceFeedback`は本文全体からPASS相当行を1件見つけ、評価対象commitも最初に一致した1件だけを返す。PASS／FAILの全候補数、矛盾、code fence、評価対象commitの一意性を確認していない。

実`buildUserDecisionReadyManifest`へ、exact accepted candidate、clean governance checkout、正しいorigin feedback、authorization、protected snapshotと共に次の3fixtureを渡した。

| fixture | 攻撃入力 | 期待 | 観測 |
|---|---|---|---|
| `MULTI_VERDICT` | FAIL行とPASS行を同じfeedbackに配置 | reject | `READY/public-user-decision-risk-accepted` |
| `MULTI_COMMIT` | 正しいSHAの後に別SHAの評価対象行を配置 | reject | `READY/public-user-decision-risk-accepted` |
| `CODE_FENCE_PASS` | 本文はFAIL、code fence内だけPASS表記 | reject | `READY/public-user-decision-risk-accepted` |

PASS行が1つあるだけで、同じfeedback内の非PASS／曖昧性を隠してreadyにできる。feedback digestは攻撃本文そのものへ正しく束縛しており、digest照合ではこの意味上の曖昧性を止められない。

### P-02: inventoryから除外した新governance bytesがstrict gateで守られない

**対象区分:** `product`

**重大度:** Major

**分類:** `implementation-issue`

`productSurfaceBytes`は`downstreamRepositories`と`userDecisionPreWriteGate`の文字列範囲をSprint 049 digestから丸ごと除外する。既存product projectionを正確に再現する目的自体は成立し、現行bytesではSprint 049 digestが従来値と一致した。

しかし、除外した全bytesをPatch側でstrictに検査していない。隔離cloneの`userDecisionPreWriteGate`へ未知fieldとしてPASS aliasと`evaluatorPass=true`相当値を追加したところ、次が全て成功した。

```text
Sprint 049 inventory: 20/20 PASS
standard validate-template: valid / gate closed
validateUserDecisionTemplate: accepted
buildUserDecisionReadyManifest: EXTRA_GOVERNANCE_READY=ready HIDDEN_EVALUATOR_PASS=true
```

既知fieldは個別に照合しているが、許可field集合の外側を拒否していない。そのため、Sprint 049が意図的に見ないgovernance bytesを任意に増やしても、Patch gateとready manifestが受理する。これは「新governance欄の全bytesをPatch gateで守る」「aliasを拒否する」というC24／C25のfail-closed境界を満たさない。

## Acceptance Criteria

| AC | 判定 | 独立証拠 |
|---|---|---|
| AC1 既存public-evaluator-pass不変 | PASS | PK-012を含むSprint 048 12/12、wrapper 8/8。既存関数・入力・失敗条件の変更なし |
| AC2 truthful user-decision status／residual保持 | PASS | canonical正例では専用status、`evaluatorPass=false`、AC3／C21、XM-007、別phase残余を保持 |
| AC3 accepted source固定／再計算 | PASS | SHA／tree 828／common 44がclean checkout・archiveで一致 |
| AC4 origin feedback固定 | PASS | commit／path／digest／元Verdict／残余の既知field差替えを拒否 |
| AC5 authorization束縛 | PASS | ID、日付、原文、文脈、scope、candidate、feedback、残余、順序の既知field負例を拒否 |
| AC6 変更・撤回・governance非PASSでstale | **FAIL** | FAILとPASSが併存するfeedback、code fence内PASSだけのfeedbackがreadyになった |
| AC7 governanceSourceと独立Evaluator PASS一致 | **FAIL** | 複数評価対象commitを持つ曖昧feedbackをreadyとして受理。単一の明確な評価対象へ束縛できていない |
| AC8 path／protected／Xmind edition／rollback不変 | PASS | common／excluded／protected／adapter／Xmind／rollbackの既知差替えを拒否 |
| AC9 targeted／public／product regression | **FAIL** | 提供suiteはgreenだが、契約上rejectすべき独立governance負例4系統が実readyへ到達 |
| AC10 downstream／external／release／host／Xmind write 0 | PASS | source・両downstreamのHEAD／status前後不変、remote／tag不変、実外部操作なし |
| AC11 ready判定はpure、実適用は別Harness | PASS | 実行結果はJSON／stdoutだけで、private／Yasashiiへのwrite 0 |

合計: **PASS 8／FAIL 3**。1件でも必須ACが未達ならSprintは不合格。

## Rubric scores

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **3/5** | ≥4 | FAIL | 必須AC6・AC7・AC9未達 |
| C2 構文・整合 | **4/5** | 5 | FAIL | governance JSONをclosed schemaとして扱わず未知fieldを受理 |
| C5 安全・規律 | 5/5 | 5 | PASS | source／downstream／external write 0、accepted sourceとgovernance sourceの既知identity分離は維持 |
| C6 無回帰 | **4/5** | 5 | FAIL | 既存suiteはgreenだが、必須fail-closed挙動に独立再現可能な新規失敗あり |
| C24 Clarity安全・統合・public-first | **4/5** | 5 | FAIL | 非PASS／曖昧governanceと未管理governance bytesからready生成が可能 |
| C25 user-decision handoff governance | **3/5** | 5 | FAIL | 単一PASS・単一commitの束縛と全governance bytes保護が成立しない |

ゼロ許容違反は2根本原因、攻撃fixtureは4系統。C2、C6、C24、C25は必須5/5に届かない。

## 副作用snapshot

評価開始時と敵対fixture実行後で、public sourceはHEAD `ebe7af9e19159e2da0da192b4debf85eb8a270ba`、canonical origin、remote refs、tagsが不変だった。feedback作成前のsource worktreeはclean。downstreamは次のHEAD／clean状態を維持した。

- private my-vault: `a50e591170aa6c445ac69caf9ece982305072727`
- Yasashii: `c6cfb40a6026c5447a8ec4729f517adb4cc51031`

敵対fixture、accepted checkout、reportは全て`/tmp`内。release、tag、push、marketplace、installed cache、new session、実host、実Xmind MCP、実downstreamへのwriteは0件。tracked ready artifactも0件で、tracked templateはclosedのままである。

## Verification-infra finding

### V-01: sandbox loopback EPERM

- **対象区分:** `verification-infra`
- **重大度:** Minor、環境依存
- sandboxのSprint 048 PK-007だけが`listen EPERM 127.0.0.1`で停止した。
- 通常環境の同一checkout・同一commandは12/12、wrapper 8/8でPASSしたため、product failureには数えていない。

## 残余／次回再評価の焦点

product修正後は、少なくとも次を同じtargeted suiteへ恒久回帰として追加する必要がある。

1. PASS／FAIL相当行が複数または矛盾するfeedbackをrejectする。
2. 評価対象commit行が0件、複数、矛盾するfeedbackをrejectする。
3. code fence、引用、本文例示のPASS表記をcanonical verdictとして採用しない。
4. Sprint 049 projectionから除外する全governance JSONをstrict schemaまたは同等の完全な許可集合で検査し、未知field／extra keyをrejectする。
5. 標準`validate-template`、user-decision build、`prewrite-user-decision`の全入口で同じfail-closed結果を確認する。

Sprint 050から引き継いだAC3／C21の実host live未実施、`XM-007`、Claude Code Desktop、Codex App、Windows native、Mac mini、実downstream適用、release／tag／push／marketplace／installed cache／new sessionは、今回もPASS／verified／許可済みへ昇格していない。

## Evaluator self-review

1. Generator自己評価をVerdictへ流用せず、指定commit差分、実CLI、accepted source checkout、独立敵対fixtureから判定した。
2. green suiteとproduct fail-openを分離し、sandbox EPERMは通常環境で切り分けた。
3. fake Xmind、synthetic host、ユーザー判断statusをlive／PASSへ昇格していない。
4. 実downstream write、実host、実Xmind、release操作、追加collectorを新合格条件にしていない。
5. findingはproductとverification-infraを分け、FAIL主因をproductの実ready誤受理だけに限定した。
