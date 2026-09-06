# Sprint 049 評価結果

## Retry 1 再評価（最新判定）

**判定:** 合格

**分類:** PASS（新規product findingなし）

**評価対象:** Sprint 049 Retry 1 — 初回F-01／V-01修正

**Generator candidate:** `8a3b9be3836446fd8746769ce76afaeee5a68748`

**修正開始HEAD:** `ab3ab29f1fa62203184ab135564601cd6d482f4f`

**評価開始HEAD:** `9839ef5440b40b1e219aeba99dd3b32b2095b19b`（parentはcandidate。candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）

**評価開始branch:** `codex/sprint-041-project-clarity`

**評価開始時worktree:** clean

**Escalation Recommendation:** none

### 結論

初回F-01の8反例はexact再実行で8/8、Generator fixtureとは別の独立25件は25/25、正負ペアを広げた補助確認は38/38で、すべて期待Skill／routeへ一致した。全routeはselection-onlyで、`performed=false`、file／adapter／command／external side effectは0件だった。

公式TargetはCLX-001〜020の20/20、Critical 15/15、Acceptance Criteria 6/6、inventory 17/17である。C15／C18／C21／C24はすべて必須閾値5/5へ到達した。通常環境の同一wrapper、Sprint 022専用、Sprint 033、Sprint 048 validator、release integrity、`git diff --check`もgreenである。

初回F-01は解消済み、V-01は既存CLX-001／007／008／018へ恒久回帰として取り込まれた。新規product findingはないためSprint 049 Retry 1を合格とする。

### 初回F-01と独立routing再評価

初回にFAILした8入力を同じ文字列で再実行した。

```text
INITIAL_F01_COUNTEREXAMPLE_PASS=8 FAIL=0 TOTAL=8
```

| 入力 | 期待／観測 |
|---|---|
| `今日のProject Clarityの要確認をまとめて` | `daily / daily-existing-entry` |
| `今週のProject Clarityを振り返って` | `weekly / weekly-existing-entry` |
| `DecisionとExecutionの状態を見せて` | `clarity / clarity-manual-entry` |
| `Validationが失敗している項目を見せて` | `clarity / clarity-manual-entry` |
| `Driftを確認して` | `clarity / clarity-manual-entry` |
| `Chatwork連携のClarity Itemを見せて` | `clarity / clarity-manual-entry` |
| `Google Chat連携のクラリティを確認して` | `clarity / clarity-manual-entry` |
| `Googleカレンダー連携について今、人間が考える必要があることを見せて` | `clarity / clarity-manual-entry` |

独立25件は、上記8件にdaily／weekly単独、日英Decision／Execution／Validation／Attention／Drift、Chatwork／Google Chat／Calendar／Drive／Gmail／Microsoft／Notionの明示操作、Projects create／canonicalRepoを加えて実行した。

```text
INDEPENDENT_ROUTER_PASS=25 FAIL=0 TOTAL=25
```

さらに、Projects complete／reopen、`Project Clarityを作って`、`Clarity付きプロジェクトを完了にして`、task／memory／build／updateの現在操作優先、Notion／Outlook／Gmailが文脈だけのClarity閲覧を含めた補助matrixを実行した。

```text
INDEPENDENT_ROUTER_PASS=38 FAIL=0 TOTAL=38
```

全route種別のselection-only確認結果。

```text
ROUTES=ask-current-request,chatwork-explicit-entry,clarity-manual-entry,clarity-reference-no-duplicate-memory,connections-read-only-diagnosis,daily-existing-entry,downstream-notion-task-handoff,google-chat-explicit-entry,google-explicit-entry,harness-entry,local-todo-handoff,microsoft-explicit-entry,notion-connection-explicit-entry,project-lifecycle,secretary-general,update-read-only-diagnosis,weekly-existing-entry
SELECTION_ONLY_CASES=19 SIDE_EFFECT_VIOLATIONS=0
```

Clarity閲覧からconnector／task／general memory／build／update／network／file／external writeは発生していない。明示操作のfixtureでもrouterは実処理を行わず既存入口を選ぶだけで、side effect 0を維持した。

### 修正の恒久化とcandidate差分

`ab3ab29f..8a3b9be3`の変更は次の4ファイルだけで、169 insertions／25 deletionsだった。

- `plugins/secretary/scripts/lib/collaboration-router.mjs`
- `scripts/sprint-049-test.mjs`
- `plugins/secretary/collaboration-inventory.json`
- `docs/progress/sprint-049.md`

F-01の8反例、日英5状態、connector正負、daily／weekly混合、task／memory／build／update、Projects境界は既存CLX-001／007／008／018へ追加されている。Target IDはCLX-001〜020、primary registryは250、CLX registryは20のままで、caseの割当・意味は変更されていない。新collector、別schema、許容緩和はない。

inventory変更は実router bytesに対応する`secretary-router`のmode込みdigestだけで、validatorが実treeとの一致を確認した。

```text
SPRINT049_INVENTORY_PASS=17 FAIL=0 CASES=20 MARKERS=VALID DIGESTS=VALID
secretary-router=418de15de96d0f6bdb1761fb7e38ceed7c0efffa5877a2cc902e3f14f0ae7279
```

### スコア

| 基準 | スコア | 閾値 | 判定 | 独立根拠 |
|---|---:|---:|---|---|
| C15 会話authorization・意味保存 | 5/5 | **5** | PASS | 初回8反例8/8、独立25/25、補助38/38。現在操作優先とサービス名だけのClarity文脈を分離し、全route side effect 0 |
| C18 明示memory authorization・内容冪等性 | 5/5 | **5** | PASS | Clarity Decisionの明示memoryは既存Decision参照route、一般memory二重保存0。Sprint 045／master回帰green |
| C21 Clarity Hook・host parity | 5/5 | **5** | PASS | Hook manifest 1件、既存5 event、全command Clarity専用。Hook内memory意味判定／network／connector／Xmind／update 0。未検証hostをverifiedへ昇格していない |
| C24 Clarity安全・統合・public-first | 5/5 | **5** | PASS | CLX 20/20、inventory 17/17、既存Skill回帰green、handoff closed、downstream／release／cache／external write 0 |

### Acceptance Criteria

| AC | 判定 | 証拠 |
|---|---|---|
| 1. CLX-001〜020、Critical／AC未実行0 | PASS | CLX 20/20、registry missing／duplicate／extra 0、Critical 15/15、AC executed 6／not-run 0 |
| 2. Projects lifecycleとClarity state ownership | PASS | create／complete／reopen／canonicalRepoはprojects、Clarity initと5状態はclarity。ID／Event保持、peer Repo操作0 |
| 3. daily／weekly／Portfolio boundedかつ正本非混在 | PASS | 混合自然文がdaily／weeklyへ到達し、出力は最大3件、connectorReads 0、予定／TODO／journalと別section |
| 4. task／memory／build／update／connectorは明示入口だけ | PASS | 現在操作優先の正例と、サービス名が文脈だけのClarity閲覧負例が全件一致。router side effect 0 |
| 5. Clarity専用Hook以外0、Hook内禁止処理0 | PASS | `plugins/secretary/hooks/hooks.json` 1件、全command `clarity-hook.mjs`、禁止処理0 |
| 6. 17面inventory、Xmind edition／provider／visual、handoff | PASS | inventory 17/17、Agentic OFF／private ON／Yasashii OFF、MCP priority 1、local priority 2＋preview／承認、固定4象限一致、gate closed |

### Target Case 20件

| ID | 判定 | Retry 1観測 |
|---|---|---|
| CLX-001 | PASS | 初回F-01反例と日英5状態、現在用件優先を含むnatural-language routingが一致 |
| CLX-002 | PASS | Project作成の確認前tree不変、確認後もClarity無断初期化0 |
| CLX-003 | PASS | bounded summary、PROJECT本文不変 |
| CLX-004 | PASS | complete後もClarity ID／Event保持、closed通常探索除外 |
| CLX-005 | PASS | reopen後もClarity ID／Event保持、再作成0 |
| CLX-006 | PASS | canonicalRepoはprojects正本、peer Repo fetch／pull／push／write 0 |
| CLX-007 | PASS | `今日のProject Clarityの要確認`はdaily、最大3、connectorReads 0 |
| CLX-008 | PASS | `今週のProject Clarityを振り返って`はweekly、journalと別section |
| CLX-009 | PASS | Notion taskは暗黙write 0、明示時だけfixed downstream handoff |
| CLX-010 | PASS | local TODOは暗黙write 0、明示時だけ既存seam |
| CLX-011 | PASS | Project Decision／Clarity Eventの一般memory重複0、Hook意味判定0 |
| CLX-012 | PASS | buildはread-only context、Harness正本／3 role非置換 |
| CLX-013 | PASS | updateはread-only診断入口、Hook／毎session／暗黙network実行0 |
| CLX-014 | PASS | onboarding／templatesはClarity optional、edition Xmind default一致 |
| CLX-015 | PASS | Attention最大3、結論→理由→根拠→選択、推定／未検証保持 |
| CLX-016 | PASS | supported／verified／degraded／manual fallbackをhost別に分離 |
| CLX-017 | PASS | common／protected／excluded path分離、acceptedSource null、downstream write 0 |
| CLX-018 | PASS | connector明示操作は既存入口、サービス名が文脈だけのClarity閲覧はclarity、全件side effect 0 |
| CLX-019 | PASS | Hook manifest 1件、Clarity専用commandだけ、禁止処理0 |
| CLX-020 | PASS | 17 surface、path／mode／marker／digest／test／delegation／no-touch一致、負例拒否 |

### inventory／Hook／Xmind／handoff

- collaboration inventoryは17 surface、CLX coverage 20、marker／mode／digest／testと実treeが一致した。omission、stale digest、tampered marker、旧contract、private literalの負例は公式fixture内で拒否された。
- `plugins/secretary`配下の`hooks.json`は`plugins/secretary/hooks/hooks.json`の1件。SessionStart／PostToolUse／PreCompact／Stop／SessionEndの既存5 eventを持ち、全commandはClarity routerである。Hook manifest／CLI／libraryのmemory意味判定、network、connector、Xmind、update callは0件だった。
- Xmind defaultはAgentic OFF、private my-vault ON、Yasashii OFF。ON時priorityはXmind MCP 1、local native 2。localはpreview／明示承認必須、`writeWithoutApproval: false`である。
- release inventoryとhandoffのvisualは、左上緑`#16A34A`、右上青`#2563EB`、左下黄`#D97706`、右下赤`#DC2626`の位置／emoji／label／意味文と軸が一致した。
- handoffは`acceptedSource: null`、`publicationStatus: pending-public-evaluator-pass`、pre-write gate `closed`、`writesDownstream: false`。private／Yasashii protected pathとcommon pathを分離し、Harness正本を置換していない。

### 回帰証拠

```text
bash scripts/sprint-049-regression.sh
  sandbox: PK-007で listen EPERM 127.0.0.1（環境制約。製品failureではない）
  通常環境: SPRINT049_REGRESSION_PASS=12 FAIL=0 TARGETS=20
  SPRINT048_PASS=12 FAIL=0
  SPRINT048_REGRESSION_PASS=8 FAIL=0

bash scripts/sprint-022-regression.sh
  SPRINT022_PASS=69 FAIL=0
  SPRINT022_WRAPPER_PASS=8 FAIL=0

node scripts/sprint-033-test.mjs
  SPRINT_033_TEST_PASS=20 FAIL=0

node scripts/sprint-048-validator.mjs
  SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4

python3 scripts/check-release-integrity.py
  PASS release integrity

git diff --check
git diff --check ab3ab29f..8a3b9be3
  exit 0
```

sandbox wrapperはCLX 20/20、Sprint 045 35/35、Clarity各Sprintまでgreenの後、Sprint 048 PK-007内の既存master regressionがloopback待受禁止で停止した。同一checkout・同一wrapperを通常環境で再実行するとPK-007を含めexit 0で完走した。テスト条件や製品timeoutは変更していないため、これは`verification-infra`の環境制約でありproduct findingではない。

Sprint 022専用は単独実行で69/69・wrapper 8/8だった。Retry 1 candidate diffに`safe-git.mjs`、`external-ops.mjs`、Sprint 022 fixtureの変更はなく、初回V-02の既存timing debtをcandidate固有failureへ昇格しない。

### Candidate SHA／worktree

- candidate `8a3b9be3836446fd8746769ce76afaeee5a68748`。
- 評価開始HEAD `9839ef5440b40b1e219aeba99dd3b32b2095b19b`のparentはcandidateで、`candidate..HEAD`の差分は`docs/sprints/state.md`だけだった。
- 評価開始時`git status --short --branch`はbranch表示だけでworktree clean。
- Evaluatorは製品、tests、spec、contract、progress、stateを変更していない。本Retryで編集するのは本feedbackだけである。

### Finding

- **新規product finding:** なし。
- **F-01（product／Major／implementation-issue）:** Retry 1で解消。exact 8/8、独立25/25、CLX恒久回帰green。
- **V-01（verification-infra／Minor）:** 解消。既存CLX-001／007／008／018へ混合intentとconnector正負を追加済み。
- **V-02（verification-infra／Minor、既存）:** Sprint 022の長い統合内timing debtは残るが、専用69/69と最終wrapperはgreen。単独で合否へ影響させない。
- **V-R1-01（verification-infra／Minor、環境）:** sandbox loopback `listen EPERM`。同一wrapperの通常環境exit 0で製品と分離済み。単独で合否へ影響させない。

### ブラウザ／スクリーンショット

Sprint 049の対象はSkill／CLI／selection-only router／inventory／Hook／handoffで、常駐UI、DOM、responsive、視覚品質の採点対象はない。契約safe harborどおりcommand、JSON、route、side-effect log、digest、tree scanで評価したため、Browserとスクリーンショットは非該当。

### 残余リスク／未検証境界

- 実Xmind MCP connected create／read／updateと実Xmind App openabilityは未承認・未検証。offline／isolated fakeをexternal-live PASSへ昇格していない。
- Claude Code Desktop／CLI、Codex App／CLIのcandidate `0.11.0`実機、Windows native、Mac miniは未検証。host inventoryの`verified: false`を維持する。
- 実private my-vault／Yasashiiへのcopy、Harness、独立評価、release、fixed handoff適用は未実行。gateはclosed、downstream write 0である。
- push、tag、GitHub Release、marketplace publish／refresh、installed plugin／cache、new session loaded versionは未実行。
- primary 250全件、CLX 20、XV 4、E2E 4の同一candidate全再実行はSprint 050の責務であり、Retry 1の追加合格条件にしていない。
- Sprint 022の既存timing debtは残る。専用suiteと最終wrapperはgreenで、Sprint 049 candidate固有product failureの証拠はない。

### 懐疑的self-review

1. Generatorの自己申告をVerdictに使わず、初回8反例と独立25件をrouterへ直接入力した。
2. fixture追加だけでなく、実router diff、全route sideEffect、inventory digest、candidate差分を別々に確認した。
3. connector正例とサービス名が文脈だけのClarity負例を対にし、task／memory／build／updateとProjects lifecycleも現在操作優先で確認した。
4. sandbox EPERMをproduct failureにもoffline PASSにもせず、同一wrapperの通常環境exit 0で因果分離した。
5. external-live、実host、Windows、private／Yasashii、release／cacheをverifiedへ昇格していない。
6. primary 250全再実行をSprint 049の新しい合格条件へ拡大していない。

以上より、Sprint 049 Retry 1は合格である。Orchestratorが本feedbackを確認し、`docs/sprints/state.md`を更新するまで進行状態は変更しない。

---

## 初回評価（履歴・変更せず保持）

**判定:** 不合格

**分類:** `implementation-issue`

**評価対象:** Sprint 049 — Clarity-aware collaboration surface完成

**Generator candidate:** `0a1ce5d24963dc8284c8748c29b49be49aa9eeb9`

**評価開始HEAD:** `b785ab508f8a32424f50bd1288ade5d2ff1bc2b8`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）

**評価開始branch:** `codex/sprint-041-project-clarity`

**評価開始時worktree:** clean

**Escalation Recommendation:** none

## 結論

引き渡されたsuite、17面inventory、Hook、Xmind／handoff、side-effect境界、Sprint 022 timeoutの因果分離はgreenだった。一方、Generator fixtureとは別の25件の自然文routing fixtureで、8件の再現可能な誤選択を確認した。

- `Chatwork連携のClarity Itemを見せて`はClarity閲覧なのに`chatwork`を選ぶ。
- `Google Chat連携のクラリティを確認して`は`google-chat`を選ぶ。
- `Googleカレンダー連携について今、人間が考える必要があることを見せて`は`setup-google`を選ぶ。
- `今日のProject Clarityの要確認をまとめて`は`daily`ではなく`projects`を選ぶ。
- `今週のProject Clarityを振り返って`は`weekly`ではなく`clarity`を選ぶ。
- `DecisionとExecutionの状態を見せて`、`Validationが失敗している項目を見せて`、`Driftを確認して`は`clarity`ではなく一般`secretary`へ落ちる。

router自体のside-effect logは全件0で、誤選択時にもその場でfile／network／external writeは発生しなかった。しかしselection-only routerの出力は段階ロード先として使われる。サービス名を文脈として含むだけのClarity閲覧をconnectorへの明示依頼と扱い、daily／weekly統合用件を別Skillへ送るため、現在用件と所有責務が一意になっていない。

最終のTarget判定は`CLX-001`、`CLX-007`、`CLX-008`、`CLX-018`がFAIL、残り16件がPASSである。Criticalは13/15 PASS、2 FAIL。Acceptance Criteriaは6件すべて実行し、3 PASS／3 FAILとなった。C15とC24が必須5/5へ届かないためSprint全体を不合格とする。

## Finding

### F-01 — natural-language routerが名詞一致を現在操作より優先し、Clarity／daily／weekly／connectorの責務を誤選択する

- **対象区分:** `product`
- **重大度:** Major
- **差し戻し分類:** `implementation-issue`
- **該当:** CLX-001、CLX-007、CLX-008、CLX-018、AC1、AC3、AC4、C15、C24
- **実装箇所:** `plugins/secretary/scripts/lib/collaboration-router.mjs:24-80`

原因は、connectorをサービス名だけで最優先判定し、その後も`PROJECT_LIFECYCLE`、`CLARITY`、`DAILY`、`WEEKLY`を単語一致の順で判定していることにある。

```text
FAIL expected=daily observed=projects route=project-lifecycle input=今日のProject Clarityの要確認をまとめて
FAIL expected=weekly observed=clarity route=clarity-manual-entry input=今週のProject Clarityを振り返って
FAIL expected=clarity observed=secretary route=secretary-general input=DecisionとExecutionの状態を見せて
FAIL expected=clarity observed=secretary route=secretary-general input=Validationが失敗している項目を見せて
FAIL expected=clarity observed=secretary route=secretary-general input=Driftを確認して
FAIL expected=clarity observed=chatwork route=chatwork-explicit-entry input=Chatwork連携のClarity Itemを見せて
FAIL expected=clarity observed=google-chat route=google-chat-explicit-entry input=Google Chat連携のクラリティを確認して
FAIL expected=clarity observed=setup-google route=google-explicit-entry input=Googleカレンダー連携について今、人間が考える必要があることを見せて
INDEPENDENT_ROUTER_PASS=17 FAIL=8 TOTAL=25
```

期待根拠は次のとおり。

- `features.md` F73はProjectsが作成／完了／再開／`canonicalRepo`、ClarityがDecision／Execution／Validation／Attention／Driftを所有すると定める。
- F74と`ui.md`は、todayのClarity Attentionをdailyの独立`今日の要確認`、週次Clarity集計をweeklyのjournal集計と別sectionとして扱う。
- CLX-001は現在の別用件をClarityが横取りしないこと、CLX-018はClarityからconnectorを暗黙実行しないことを求める。
- `secretary/SKILL.md`自身も、router結果の`selectedSkill`を段階ロード先に使い、予定／TODO／journalはdaily／weekly、外部サービスは各connector、Clarityは5状態を所有すると記載する。

修正範囲は既存routerの意図判定と既存Sprint 049 router fixtureに限定できる。サービス名の存在ではなく現在の操作（検索／接続／設定等）をconnector選択条件にし、daily／weeklyの期間・集計intentをClarity名より優先し、Decision／Execution／Validation／Attention／Driftの自然文をClarityへ一意に選ぶ必要がある。routerは引き続きselection-only、副作用0でなければならない。

### V-01 — 公式router fixtureが混合意図を含まず、F-01を20/20 PASSとして見逃す

- **対象区分:** `verification-infra`
- **重大度:** Minor
- **単独の合否影響:** なし。F-01のproduct failureを隠す検出漏れとして記録する。

`scripts/sprint-049-test.mjs`は次の組合せを分離して検査している。

- CLX-001は単独Clarity、単独projects、単独daily、memory、update、buildだけ。
- CLX-007／008は`clarity-secretary.mjs`を直接呼び、natural-language routerを通らない。
- CLX-018は単独`Clarity Itemを見せて`と、単独`Chatworkで探して`等だけで、サービス名がClarityの文脈として現れる負例がない。

そのため公式結果は`SPRINT049_PASS=20 FAIL=0`だが、独立混合fixtureは8 FAILとなった。新しいcollectorや別schemaは不要で、既存case内へ上記混合文を追加すれば検出できる。

### V-02 — 長い統合実行中のSprint 022 timeoutは既存timing依存で、candidate固有product failureではない

- **対象区分:** `verification-infra`
- **重大度:** Minor（既存・intermittent）
- **単独の合否影響:** なし。最終handoff suiteはgreen。

Generatorが長い統合実行で一度観測した`safe-git timeout後のcommit・push・子孫・副作用0件`の失敗について、Evaluatorは同じdynamic suiteをcandidateと開始HEAD archiveで別々に再実行した。

| 対象 | 結果 |
|---|---|
| candidate `0a1ce5d…` | `SPRINT022_PASS=69 FAIL=0`、wrapper `8/0` |
| 開始HEAD `29fa58d…` Git archive | `SPRINT022_PASS=69 FAIL=0` |
| 最終handoff wrapper | `SPRINT049_REGRESSION_PASS=12 FAIL=0` |

Sprint 049 candidate diffに`safe-git.mjs`、`external-ops.mjs`、`sprint-022-safety-test.mjs`は含まれない。開始HEAD比較、変更範囲、専用再実行、最終wrapper greenが揃うため、candidate固有product failureへ誤分類しない。

## スコア

Sprint契約が完了条件に指定するC15／C18／C21／C24を採点した。

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C15 会話authorization・意味保存 | 4/5 | **5** | FAIL | mixed Clarity閲覧をconnector明示依頼へ誤分類し、現在用件を横取りする。router実行自体の副作用は0 |
| C18 明示memory authorization・内容冪等性 | 5/5 | **5** | PASS | Clarity Decisionのmemory routeは参照のみ、一般memory重複0。Sprint 045／既存memory回帰green |
| C21 Clarity Hook・host parity | 5/5 | **5** | PASS | 実treeのHook manifestは1つ、既存5 eventを維持。全commandはClarity routerで、memory意味判定／network／connector／Xmind／update call 0。未検証hostをverifiedへ昇格していない |
| C24 Clarity安全・統合・public-first | 4/5 | **5** | FAIL | 17面inventory、handoff、回帰はgreenだが、daily／weekly／connectorのnatural-language協働責務がF-01で崩れる |

C15とC24はゼロ許容で5/5必須のため、他の得点で相殺しない。

## Acceptance Criteria

| AC | 判定 | 独立証拠 |
|---|---|---|
| 1. CLX-001〜020、Critical／AC未実行0 | FAIL | exact registry 20、missing／duplicate／extra 0、全件実行。ただし最終16 PASS／4 FAIL、Critical 13/15 |
| 2. Projects lifecycleとClarity state ownership | PASS | create／complete／reopen／canonicalRepoはprojects、Decision等はClarity。ID／Event保持、peer Repo write／fetch／push 0 |
| 3. daily／weekly／Portfolio boundedかつ正本非混在 | FAIL | 直接CLIはbounded・read-onlyでgreenだが、Clarityを含むdaily／weekly自然文が各Skillへ到達しない |
| 4. task／memory／build／update／connectorは明示入口だけ | FAIL | task／memory／build／update単独fixtureはgreen。サービス名がClarity閲覧の文脈にあるだけでconnectorを明示選択する反例3件 |
| 5. Clarity専用Hook以外0、Hook内禁止処理0 | PASS | `plugins/secretary/hooks/hooks.json` 1件、既存5 event、全command `clarity-hook.mjs`、禁止pattern 0 |
| 6. 17面inventory、Xmind edition／provider／visual、handoff | PASS | inventory 17/17、case coverage 20、5負例拒否。Agentic OFF／private ON／Yasashii OFF、MCP priority 1、local priority 2＋preview／承認、固定4象限一致、gate closed |

ACは6件すべて実行、未実行0、3 PASS／3 FAIL。

## Target Case 20件

| ID | 判定 | 観測 |
|---|---|---|
| CLX-001 | FAIL | Clarity単独正例は通るが、Decision／Execution／Validation／Driftの自然文とdaily／weekly／connector混合文を一意選択できない |
| CLX-002 | PASS | Project作成確認前tree不変、確認後もClarity無断初期化0 |
| CLX-003 | PASS | mode／Attention／link healthのbounded summary、PROJECT本文不変 |
| CLX-004 | PASS | complete後もClarity ID／Event保持、closed通常Portfolio除外 |
| CLX-005 | PASS | reopen後もClarity ID／Event保持、再作成0 |
| CLX-006 | PASS | `canonicalRepo`はprojects正本、peer Repo tree不変、fetch／pull／push 0 |
| CLX-007 | FAIL | direct daily outputは最大3・connectorReads 0だが、`今日のProject Clarityの要確認`がdailyでなくprojectsへroute |
| CLX-008 | FAIL | direct weekly outputはjournalと別sectionだが、`今週のProject Clarityを振り返って`がweeklyでなくclarityへroute |
| CLX-009 | PASS | 暗黙Notion task write 0、明示時もfixed downstream handoff、実private write 0 |
| CLX-010 | PASS | 暗黙local TODO write 0、明示時だけ既存seamへ委譲 |
| CLX-011 | PASS | PJ Decision／Clarity Eventを一般memoryへ複製せず、Hook意味判定0 |
| CLX-012 | PASS | buildはread-only Clarity contextのみ、Harness正本／3 role非置換 |
| CLX-013 | PASS | updateはread-only診断入口、Hook／毎session／暗黙network実行0 |
| CLX-014 | PASS | onboarding／templatesはClarity任意、Agentic Xmind既定OFFを説明 |
| CLX-015 | PASS | Attention最大3、結論→理由→根拠→選択、推定／未検証を保持 |
| CLX-016 | PASS | supported／verified／degraded／manual fallbackをhost別に分離 |
| CLX-017 | PASS | common／protected／excluded pathを分離、acceptedSource null、downstream write 0 |
| CLX-018 | FAIL | Clarity単独は副作用0だが、サービス名を含むClarity閲覧3件をconnector明示入口へ誤選択 |
| CLX-019 | PASS | Hook manifest 1件、Clarity専用commandだけ、禁止処理0 |
| CLX-020 | PASS | 17 surface、path／mode／marker／digest／test／delegation／no-touch一致、負例5/5拒否 |

## side-effect／snapshot証拠

Evaluator独立temporary Secretary fixtureでProject作成とClarity初期化を完了した後、次を実行した。

```text
collaboration-router "Clarity Itemを見せて" --json
project-tools.mjs show <fixture> 独立評価案件
clarity-secretary.mjs daily <fixture> --mode morning --json
```

結果。

```text
BEFORE=04b497d5d64d298c80c84ed80b65b385b3d41b2bd9b55e27deda875d3bce5b38
AFTER=04b497d5d64d298c80c84ed80b65b385b3d41b2bd9b55e27deda875d3bce5b38
TREE_UNCHANGED=true
router sideEffect={performed:false,fileWrites:0,adapterCalls:0,commandCalls:0,externalCalls:0}
daily connectorReads=0
```

公式fixtureでもClarity作成／閲覧からtask、general memory、Harness、update、connector、network、external writeは0だった。F-01はrouterの選択結果の欠陥であり、評価中に実connectorや外部writeが発生した欠陥ではない。

## inventory／Hook／Xmind／handoff

### collaboration inventory

- surface 17、CLX coverage 20、path／mode／bytes digest一致、marker一致。
- actual collaboration marker fileを実tree scanし、inventory各surfaceのpath unionと照合した。
- 各surfaceにrole、edition、delegation、no-touch、testsが存在する。
- 独立負例はomission、stale digest、tampered marker、旧`topic-save=confirm-first`、private literal `vault/10_sources`を5/5拒否した。

### Hook tree

- `plugins/secretary`配下の`hooks.json`は`plugins/secretary/hooks/hooks.json`の1件だけ。
- eventは既存のSessionStart／PostToolUse／PreCompact／Stop／SessionEndの5件。Sprint 049はcollaboration markerを追加しただけで、既存Hook countを仕様変更として扱っていない。
- 全commandは`scripts/clarity-hook.mjs`。
- Hook manifest／CLI／library内のmemory意味判定、network、connector、Xmind、update callは0件。

### Xmind

| Edition | default |
|---|---|
| Agentic | OFF |
| private my-vault | ON |
| Yasashii | OFF |

- ON時priorityはXmind MCP 1、local native 2。
- localはpreview必須、明示承認必須、`writeWithoutApproval: false`。
- release inventoryとhandoffのvisualはbyte-equivalent JSONで、左上緑`#16A34A`、右上青`#2563EB`、左下黄`#D97706`、右下赤`#DC2626`の位置／emoji／label／意味文と軸が一致した。
- 実MCP／実Xmind Appは未実行で、isolated fake／offlineをexternal-live verifiedへ昇格していない。

### handoff／release境界

- `acceptedSource: null`、`publicationStatus: pending-public-evaluator-pass`、pre-write gate `closed`、`writesDownstream: false`。
- private／Yasashii protected pathとcommon pathを分離。
- candidate diffに実private／Yasashii実装、release、cache、installed stateの変更0。
- Harness正本置換、update自動実行、connector自動実行、push／tag／Release／publishは評価中も0。

## 回帰証拠

主な実行commandと結果。

```text
bash scripts/sprint-049-regression.sh
  SPRINT049_REGRESSION_PASS=12 FAIL=0
  Target runner自己集計 20/20、registry差分0、Critical 15/15、AC 6/6

bash scripts/sprint-022-regression.sh
  SPRINT022_PASS=69 FAIL=0
  SPRINT022_WRAPPER_PASS=8 FAIL=0

git archive 29fa58d… | <temporary archiveでSprint 022 dynamic suite>
  SPRINT022_PASS=69 FAIL=0

node scripts/sprint-033-test.mjs
  SPRINT_033_TEST_PASS=20 FAIL=0

node scripts/sprint-048-validator.mjs
  SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4

python3 scripts/check-release-integrity.py
  PASS release integrity

git diff --check
git diff --check 29fa58d…..0a1ce5d…
  exit 0
```

最初のsandbox内wrapperだけ、Sprint 048内のexisting master regressionが`127.0.0.1 listen EPERM`で停止した。同一checkoutを通常環境で再実行するとPK-007、Sprint 048、最終Sprint 049 wrapperまでexit 0だった。これは評価sandboxのloopback待受制限で、product findingではない。

## Candidate diffとworktree

- `29fa58d4…..0a1ce5d2…`は37 files、1,068 insertions、4 deletions。
- 評価開始時HEADは`b785ab5…`で、candidateとの差分はOrchestrator所有`docs/sprints/state.md`だけ。
- 評価開始時worktreeはclean。
- Evaluatorは製品コード、tests、spec、contract、progress、stateを変更していない。編集対象は本feedbackだけ。

## ブラウザ／スクリーンショット

Sprint 049の新規面はSkill／CLI／router／inventory／Hook／handoffで、常駐UI、DOM、responsive、視覚品質の採点対象はない。契約safe harborどおりcommand、JSON、route、before／after snapshot、digest、tree scanで評価したため、Browserとスクリーンショットは非該当。

## 残余リスク／未検証境界

- 実Xmind MCP connected create／read／updateと実Xmind App openabilityは未承認・未検証。offline／isolated fakeをexternal-live PASSにしていない。
- Claude Code Desktop／CLI、Codex App／CLIのcandidate `0.11.0`実機、Windows native、Mac miniは未検証。host inventoryは`verified: false`を維持する。
- 実private my-vault／Yasashiiへのcopy、Harness、独立評価、releaseは未実行。実downstream repoへアクセス・writeしていない。
- push、tag、GitHub Release、marketplace publish／refresh、installed cache、new session loaded versionは未実行。
- fixed handoff gateはclosed、accepted SHA未固定、downstream write 0。
- primary 250全件、CLX 20、XV 4、E2E 4の同一candidate全再実行はSprint 050責務であり、本Sprintの新しいPASS条件にしていない。
- Sprint 022の長い統合内timing debtはV-02として残る。専用suiteと最終wrapperはgreenだが、intermittent性自体は解消していない。

## 懐疑的self-review

1. Generatorの20/20自己集計をVerdictに使わず、routerへ25件の独立自然文を直接入力した。
2. 単独intentだけでなく、Clarity＋daily、Clarity＋weekly、Clarity＋connector文脈、英語のDecision／Execution／Validation／Driftを混ぜた。
3. 誤routeでもrouter自身の副作用0であることと、選択結果が誤っていることを分けた。副作用を捏造してFAILにしていない。
4. daily／weeklyのdirect CLI機能がgreenであることと、自然会話から所有Skillへ到達できないことを分けた。
5. inventoryは公式validatorだけでなく、実tree marker scanと5種類の独立負例を確認した。
6. Hookの既存5 eventを「追加Hook 5件」と誤認せず、manifest 1組・全command Clarity専用として数えた。
7. Sprint 022の単発timeoutを開始HEADとcandidateの専用suite、変更範囲、最終wrapperで因果分離した。
8. external-live、実host、Windows、private／Yasashii、release／cacheをoffline PASSへ昇格していない。

以上より、Sprint 049は`implementation-issue`としてGeneratorへ差し戻す。
