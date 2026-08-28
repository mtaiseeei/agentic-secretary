# Sprint 049 Generator進捗 — public collaboration surface

- 開始HEAD: `29fa58d4fb8d6b85c62232133836f1decf006183`
- Generator: fresh strong tier、Retry 0
- 実装日: 2026-08-28
- 判定範囲: Generator自己検査のみ。EvaluatorのPASS判定を兼ねない。

## 実装したこと

### natural-language routerと所有境界

- `collaboration-router.mjs`をselection-only routerとして追加した。入力から1つのSkill／routeを返すだけで、file、adapter、command、external callは実行しない。
- Clarity intentは`clarity`へ、Project create／open／closed／complete／reopen／canonicalRepoは`projects`へ振り分ける。daily、weekly、task、memory、build、update、connectorの既存intentをClarityが横取りしない。
- `projects`はlifecycleと`PROJECT.md`内のcanonicalRepoを正本として所有し、ClarityはDecision／Execution／Validation／Attention／Driftだけを所有する。peer Repoのfetch／pull／push／writeは0件である。
- local TODOとdownstream Notion Taskは、現在の依頼でタスク化が明示された場合だけ既存seamへhandoffする。Clarity Itemの作成／閲覧だけではtaskを作らない。

### daily／weekly／memory／build／update／connector

- dailyは予定、TODO、中断点と別の`今日の要確認`を最大3件、weeklyはjournal集計と別のProject Clarity sectionを表示する契約へ揃えた。
- Project Decision／Clarity Eventを一般memoryへ二重保存しない。Clarity Hookへmemory候補の意味判定を入れない。
- buildはClarityをread-only contextとして参照できるが、Harnessのspec／Sprint／state／feedbackとPlanner→Generator→Evaluatorを置換しない。明示した開発依頼なしに起動しない。
- updateはread-only診断と別確認を維持し、Clarity Hook／毎session／暗黙networkから実行しない。
- Chatwork、Google Chat、Google、Microsoft、Notionは各serviceが現在の依頼で明示された場合だけ既存入口を選ぶ。Clarity起点のOAuth、network、external writeは0件である。

### onboarding、rules、inventory、edition

- onboardingとworkspace templatesへProject Clarityを任意機能として追加した。コピーだけではClarity初期化もXmind writeもしない。
- common ruleとAgentic serializerへ、Attentionを最大3件の`結論→理由→根拠→選択`で示し、予定／TODO／journalと混ぜない境界を追加した。
- 17 collaboration surfaceを`collaboration-inventory.json`へ固定した。各surfaceはpath、role、edition、marker、mode込みSHA-256 digest、test、delegation、no-touchを持つ。
- validatorはinventoryと実treeを双方向照合し、surface omission、stale digest、tampered marker、旧contract、非coordination fileのprivate literalをnegative fixtureで拒否する。
- neutral common-core digestとAgentic overlay許可一覧を今回の意図したrule／inventory追加へ追随させた。Yasashii style、private path、実downstream treeは変更していない。
- fixed handoffはcommon path、adapter seam、protected path、edition順を保持し、pre-write gateはclosed、`writesDownstream: false`のままである。
- XmindはAgentic OFF、private ON、Yasashii OFFだけをedition差とした。ON時はMCP-first、local nativeはpreviewと明示承認後だけで、無承認writeは0件。4象限の位置、色、emoji、label、意味文はrelease inventoryとhandoffで同一である。

## 主な変更file

- router: `plugins/secretary/scripts/collaboration-router.mjs`、`plugins/secretary/scripts/lib/collaboration-router.mjs`
- canonical inventory: `plugins/secretary/collaboration-inventory.json`、`plugins/secretary/host-inventory.json`、`plugins/secretary/release-inventory.json`
- adapter／handoff: `plugins/secretary/clarity/secretary-adapter.json`、`adapters/downstream-clarity-handoff.json`、`adapters/agentic-overlay.json`、`adapters/neutral-base.json`
- Skill: secretary、clarity、projects、daily、weekly、memory-care、build、update、onboarding、chatwork、google-chat、connections、setup-google、setup-microsoft、setup-notion
- rules／templates: common-language、conversation-contract、safety、rule-manifest、Agentic style、AGENTS／CLAUDE templates
- test: `scripts/sprint-049-test.mjs`、`scripts/sprint-049-inventory.mjs`、`scripts/lib/sprint-049-inventory.mjs`、`scripts/sprint-049-regression.sh`

## 自動検査

### exact Target Case／registry／Acceptance Criteria

```bash
node scripts/sprint-049-test.mjs
```

```text
SPRINT049_PASS=20 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_PASS=15 CRITICAL_NOT_RUN=0 AC_EXECUTED=6 AC_NOT_RUN=0 SIDE_EFFECT_VIOLATIONS=0
```

- exact Target: `CLX-001`〜`CLX-020`の20件
- primary registry: 250件を維持し、CLX追加0件
- collaboration registry: missing 0、duplicate 0、extra 0
- Critical未実行: 0
- Sprint 049 Acceptance Criteria未実行: 0
- input→selected Skill／route→side effectのbefore／after違反: 0

### inventory／Hook／side effect

```bash
node scripts/sprint-049-inventory.mjs validate
# SPRINT049_INVENTORY_PASS=17 FAIL=0 CASES=20 MARKERS=VALID DIGESTS=VALID
```

- 実tree scanでClarity専用Hook manifest／routerの1組だけを確認した。他Skill専用Hookは0件。
- Clarity Hook内のmemory意味判定、network、connector、Xmind、update callは0件。
- task、memory、build、update、connectorは明示された既存境界だけをrouteし、router自身のfile／adapter／command／external callは0件。
- omission、stale、marker tamper、旧contract、private literalの負fixtureはすべて非0で拒否した。
- 実private my-vault、Yasashii実repo、installed cache、marketplace、Xmind liveへのwriteは0件。

### 直接回帰とrelease gate

```bash
bash scripts/sprint-045-regression.sh
# SPRINT045_REGRESSION_PASS=9 FAIL=0 CASES=35

bash scripts/sprint-048-regression.sh
# SPRINT048_REGRESSION_PASS=8 FAIL=0 TARGETS=12 ... CRITICAL_NOT_RUN=0 AC_NOT_RUN=0

bash scripts/sprint-022-regression.sh
# SPRINT022_PASS=69 SPRINT022_FAIL=0
# SPRINT022_WRAPPER_PASS=8 SPRINT022_WRAPPER_FAIL=0

node scripts/sprint-033-test.mjs
# SPRINT_033_TEST_PASS=20 FAIL=0

node scripts/sprint-048-validator.mjs
# SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4

python3 scripts/check-release-integrity.py
# PASS release integrity: manifests and CHANGELOG are consistent

git diff --check
# exit 0
```

Sprint 045の35件にはprojects、daily、weekly、memory、Chatwork、Google Chat、identity、update、Harness非同梱の関連suiteが含まれる。Sprint 048の12件にはexisting master regression、Git-free archive相当tree、clean checkout相当tree、host／Xmind未検証境界、fixed handoffが含まれる。

### 既存timeout fixtureのintermittent failure

最終の長い統合実行中に、既存Sprint 022の`safe-git timeout後のcommit・push・子孫・副作用0件`が1回だけ`calls=[] pid=0 alive=false effect=false`で失敗した。待ち時間緩和や製品変更はしていない。

因果分離として、Sprint 049 candidateと開始HEAD `29fa58d`のarchiveで同じSprint 022 dynamic suiteを個別実行した。candidateは69/69、開始HEADも69/69 PASSだった。開始HEAD archiveは`.git`を含まないためwrapper末尾の`git diff --check`だけ非対象となった。Sprint 049は`safe-git.mjs`、`external-ops.mjs`、Sprint 022 fixtureを変更していない。したがってこの1回はcandidate固有の製品failureではなく、長いmaster内のtimingに依存する既存verification debtとして記録する。

因果分離後、他の長い回帰を並行させずに最終単一wrapperを1回再実行し、greenを確認した。

```bash
bash scripts/sprint-049-regression.sh
# SPRINT049_REGRESSION_PASS=12 FAIL=0 TARGETS=20 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_NOT_RUN=0 AC_NOT_RUN=0
```

## 起動／評価handoff

- startup command: なし。Skill／router／inventory／CLI testのSprintであり常駐appはない。
- test URL: なし。
- main regression: `bash scripts/sprint-049-regression.sh`

Evaluator scenario:

1. routerの正負fixtureを実行し、Clarity、project lifecycle、daily、weekly、task、memory、build、update、connectorが1つの正しいSkillへ選択されることを確認する。
2. 各fixtureのbefore／after treeとside-effect logを比較し、Clarity Itemの作成／閲覧からtask、memory、Harness、update、connectorの暗黙副作用が0件であることを確認する。
3. project complete／reopen後もClarity IDとEvent履歴が同一で、closed通常探索とcanonicalRepo境界が維持されることを確認する。
4. daily／weekly出力が最大3件で、予定／TODO／journalの正本と別sectionであることを確認する。
5. Hook treeを実scanし、Clarity専用1組以外0、memory意味判定／network／update call 0を確認する。
6. collaboration inventoryを実tree、marker、mode、digest、testと照合し、5種類のnegative fixtureが拒否されることを確認する。
7. public／private／YasashiiのXmind default、MCP-first、local preview＋明示承認、固定4象限semanticをrelease inventoryとhandoffで照合する。実downstreamへは書かない。
8. Sprint 045／048直接回帰、Sprint 022専用回帰、strict validator、release integrity、`git diff --check`を実行する。

## Known issues／未検証

- 実Xmind MCP connected create／read／updateの`XM-007`は外部live未承認のため`NOT-RUN`。offline／synthetic結果をexternal-live PASSへ昇格していない。
- public candidateのClaude Code Desktop／CLI、Codex App／CLI実機、Windows native、Mac miniはSprint 048から引き続き未検証。
- 実private my-vault／Yasashiiへのcopy、Harness、評価、releaseは未実行。fixed handoff gateはclosedのままである。
- tag、GitHub Release、marketplace publish／refresh、installed cache、new session loaded versionは未実行。
- primary 250全件の単独全再実行はSprint 050の責務であり、Sprint 049では変更していない。
- 長いmaster内のSprint 022 timeout fixtureに上記のintermittent verification debtが1回あった。直接suiteと開始HEAD比較はPASSで、製品コードによる緩和はしていない。

## 外部／下流副作用

- network／external connector call: 0
- task／general memory／Harness／updateの暗黙実行: 0
- push／tag／GitHub Release: 0
- marketplace publish／refresh、installed plugin／cache変更: 0
- private my-vault／Yasashii／Mac mini write: 0
- downstream handoff適用: 0
- local／cloud Xmind write: 0
