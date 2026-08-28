# Sprint 045 評価結果

**判定:** 不合格
**分類:** `implementation-issue`
**評価対象:** Sprint 045 — generic Secretary-local、daily／weekly／Portfolio
**Generator candidate:** `f3c33dcd3815b85332b0eed4091aa7d6618d2bec`
**評価開始HEAD:** `6bd1f2b8a72af39900c3bc60f88ccf63bb3d8d16`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**Escalation Recommendation:** none（同じSprintのGeneratorで修正可能）

## 結論

引き渡された `bash scripts/sprint-045-regression.sh` はexit 0で、runner上はTarget 35/35、registry missing／duplicate／extra 0、Sprint 041〜044直接回帰、release integrityがgreenだった。projects、daily、weekly、memory、Chatwork／Google Chat、identity、update、Harness境界の直接suiteもすべてexit 0である。

しかし、Generator runnerを使わない匿名Secretary-local fixtureで新しい製品CLIを操作すると、4件のproduct defectを再現した。

1. Decisionの保存後partial／保存前partialで、実際にはそれぞれProject DecisionまたはClarity pending Eventが保存済みなのに、CLIは両方を`changed: false`と返す。coreが持つ`completed`／`pending`詳細も落としており、利用者と呼出し元が部分成功状態を正しく判断できない。
2. 明示タスク化は全Clarity Itemではなく、bounded表示用の上位3件だけを検索する。5 Item中4件目を明示指定すると`item-missing`で止まり、既存TODO／downstream確認境界へ委譲できない。
3. Project complete後もClarity ID／Event bytesは保たれるが、canonical `secretaryLink.projectRef`は`projects/open/.../PROJECT.md`のまま存在しなくなる。それでもclosed statusは`local-reference-healthy`と誤表示する。
4. daily／Portfolioはcore Attentionにある短いEvidenceと選択肢を意図的に削除し、実表示は項目名と理由だけになる。C20の「結論→理由→根拠→選択」を満たさない。

このため、独立の意味評価ではTarget 35件のうち`SL-006`、`SL-007`、`SL-011`、`RG-002`がFAILで、31 PASS／4 FAILである。Acceptance Criteria 1、2、5、8と、C1／C3／C4／C7／C20／C24が閾値未達になる。1基準でも未達なら不合格というrubricに従い、Sprint 045を`implementation-issue`としてGeneratorへ差し戻す。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | Targetの独立意味評価が31/35。AC1／2／5／8にproduct未達あり |
| C2 構文・整合 | 5/5 | 5 | PASS | Node構文、adapter JSON、registry 35 unique、report-schema 22面、strict validator、diff checkが成立 |
| C3 機能の実証 | 3/5 | 4 | FAIL | 主要導線の多くは動作するが、全Itemの明示タスク委譲とcomplete中の参照整合が成立しない |
| C4 非エンジニア体験 | 3/5 | 4 | FAIL | partialの副作用状態が`changed:false`と矛盾し、daily／Portfolioに根拠・選択がない |
| C5 安全・規律 | 5/5 | 5 | PASS | preview write 0、PROJECT本文非埋込、task自動write 0、symlink外部write 0、private／external write 0 |
| C6 無回帰 | 5/5 | 5 | PASS | 現行関連suiteとSprint 041〜044直接回帰が0 FAIL。旧014／018はcandidateとbaselineで同じ既存debt |
| C7 やさしさ | 3/5 | 4 | FAIL | boundedと日本語は成立するが、判断に必要なEvidence／選択とpartial状態が欠ける |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | Event／Evidence／State、Decision本文非複製、ID／Event履歴、rebuild系の041〜043直接回帰は成立 |
| C20 Attention・Clarity UX | 3/5 | 4 | FAIL | bounded上位3件は成立するが、daily／PortfolioがEvidence／choicesを削除し、closed link healthも事実と不一致 |
| C24 Clarity安全・統合・public-first | 4/5 | 5 | FAIL | public-first、private literal非混入、既存Skill回帰は成立するが、task委譲、lifecycle参照、partial retry報告にproduct違反 |

C8〜C18、C21〜C23はSprint 045の新規採点対象外である。Sprint 044の`done-by-user-decision`残件は再採点せず、045差分による新しいHook／host回帰がないことだけ直接suiteで確認した。

## Target Case 35件

registry JSONを直接parseし、次の正確な35 ID、unique 35、missing 0、duplicate 0、extra 0を確認した。

- `SL-001`〜`SL-012`
- `PF-001`〜`PF-008`、`PF-010`〜`PF-012`
- `RG-001`〜`RG-012`

| Case群 | Runner結果 | 独立意味評価 | FAIL |
|---|---:|---:|---|
| Secretary-local | 12/12 PASS | 9 PASS／3 FAIL | `SL-006`、`SL-007`、`SL-011` |
| daily／weekly／Portfolio | 11/11 PASS | 11/11 PASS | なし。C20横断基準は別途FAIL |
| 既存機能回帰 | 12/12 PASS | 11 PASS／1 FAIL | `RG-002` |
| 合計 | 35/35 PASS | **31 PASS／4 FAIL** | 4件 |

runner上の35/35は実行済み証拠として保持するが、独立fixtureで反例があるためEvaluator判定へそのまま流用しない。

## Acceptance Criteria

| AC | 判定 | 実行証拠 |
|---|---|---|
| 1. Target 35件、Acceptance Criteria未実行0、private live非偽装 | **FAIL** | 全35 IDは実行したが、独立意味評価31/35。private liveは未実行と明記 |
| 2. projectsがlifecycle／canonicalRepoを所有し、Clarityが二重実装しない | **FAIL** | 所有分離と既存complete／reopen操作は維持。ただしcomplete中にcanonical projectRefがstaleとなり、healthyを誤表示 |
| 3. PJ Decisionは既存seamへ1回、一般memory／Clarityへ本文重複0 | PASS | success／retry／両partialともPROJECT本文1、一般memory 0、Clarity Event本文0 |
| 4. daily／weekly／Portfolioは独立・bounded、closed／全本文／connector自動読込0 | PASS | morning上位3＋otherCount、open-only、`closedIncluded:false`、`connectorReads:0`、`itemBodiesIncluded:false` |
| 5. Item作成でtask 0、明示時だけ既存確認境界へ進む | **FAIL** | 上位3件はwrite 0でhandoffするが、4件目以降の明示Itemは`item-missing`で既存境界へ進めない |
| 6. projects／daily／weekly／memory／chat／identity／update／Harness回帰0 FAIL | PASS | 現行直接suiteは全てexit 0 |
| 7. public sourceにprivate実装0、downstream adapter契約 | PASS | 045新規product差分に保護literal 0、fixed handoff markerとauthorityあり。private適用済みとは表示しない |
| 8. SL-006をSecretary-local＋lifecycle＋partialで再評価 | **FAIL** | dataとretryは成立するが、新製品CLIが両partialを`changed:false`と誤報し、completed／pending詳細を落とす |

## 実行証跡

### 1. 引き渡しbaseline

`bash scripts/sprint-045-regression.sh` → **exit 0**。

- `SPRINT045_CASE_PASS=35 FAIL=0 TOTAL=35`
- `SPRINT045_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`
- `SPRINT044_CASE_PASS=40 FAIL=0 TOTAL=40`
- `SPRINT043_CASE_PASS=29 FAIL=0 NOT_RUN=1 TOTAL=30`。`XM-007`実Xmind MCPだけは従来どおりconditional NOT-RUNであり、045 PASSへ代用していない。
- `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`
- `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`
- `PASS release integrity: manifests and CHANGELOG are consistent`
- `SPRINT045_REGRESSION_PASS=9 FAIL=0 CASES=35`

`python3 scripts/check-report-schema.py --plugin-root plugins/secretary` → **exit 0**。

- `SCHEMA_OK owner=active-edition-style entrypoint=rules/plain-language.md surfaces=22 conflicts=0 states=5`
- `PASS=1 FAIL=0`

`claude plugin validate plugins/secretary --strict` → **exit 0**、`Validation passed`。

`git diff --check 9ca4c98..f3c33dc` → **exit 0**。

### 2. 独立Secretary-local fixture

fixture rootは`/private/tmp/s045-independent.FYW2Hd`。plugin同梱templateから匿名Secretaryを作り、製品の`project-tools.mjs`と`clarity-secretary.mjs`だけでProjectを作成・操作した。実private workspace、my-vault、installed cacheは使っていない。

#### resolver、preview、初期化

- open／legacy／closedへ同名`統合案件`を置いた。
- `clarity-secretary init ... 統合案件 --json` → exit 0、`status=preview`、`selected=open`、`conflict.reason=open-preferred`。
- preview前後に`clarity`／`.clarity`作成0。file digest一覧は不変。
- `--apply --json` → exit 0、`mode=secretary-local`、Clarityは`projects/open/統合案件/clarity`内だけ。Secretary root直下`.clarity`は0。
- apply前後の3 Project `PROJECT.md` SHA-256はそれぞれ同一。全Item本文の埋込み0。
- legacy applyはrunnerでexit 3／tree不変、closedは通常statusでexit 3、`--closed`明示時だけ参照可能。

#### Decision success／retry／partial

通常Decision:

```text
node plugins/secretary/scripts/clarity-secretary.mjs decide \
  /private/tmp/s045-independent.FYW2Hd 統合案件 \
  --decision '料金は月額制にする' --current '料金を確定' --next '案内を更新' --json
```

- 初回exit 0、`status=saved`、`D-001`。retry exit 0、`status=unchanged`。
- Decision本文は`PROJECT.md`に1件だけ。`memory/MEMORY.md`に0件、Clarity `events.jsonl`本文に0件。
- Clarity Eventは`decision.pending` 1件、`decision.confirmed` 1件。

Project Decision保存後partial:

```text
CLARITY_DECISION_FAIL_AT=clarity-finalize node \
  plugins/secretary/scripts/clarity-secretary.mjs decide \
  /private/tmp/s045-independent.FYW2Hd partial後 \
  --decision '対象地域は関西にする' --current '地域確認' --next '候補抽出' --json
```

- exit 4、messageは「Decision正本は更新済み」だがJSONは`changed:false`。
- 実filesystemでは`PROJECT.md`にD-001と本文が1件、Clarityはpending 1／confirmed 0。
- retryはexit 0、confirmed 1。本文、Event、memoryの重複0。

Project Decision保存前partial:

```text
CLARITY_DECISION_FAIL_AT=decision-write node \
  plugins/secretary/scripts/clarity-secretary.mjs decide \
  /private/tmp/s045-independent.FYW2Hd partial前 \
  --decision '公開日は10月1日にする' --current '日付確認' --next '告知準備' --json
```

- exit 4、messageは「Clarityには確認待ちを記録済み」だがJSONは`changed:false`。
- 実filesystemではProject Decision 0、Clarity pending 1／confirmed 0。
- retryはexit 0、Project本文1、pending 1、confirmed 1、一般memory／Clarity Event本文0。

coreの`clarity.mjs`は`error.details.changed`、`nextAction`、`details.completed`／`pending`を返すが、新adapter CLIのcatchは`changed:false`を固定してdetailsを捨てるため、candidate起因である。

#### lifecycleとlink health

- `partial後`のcomplete前にClarity `project.json`／`events.jsonl`をhashし、complete→closed→reopenを実行。
- reopen後も両hashは完全一致。Clarity Project ID、Decision Event、完了記録を保持し、Clarity directory再作成0。
- 同名closedが既にある`統合案件`のcompleteはexit 3で停止し、open／closed双方を保持。
- 一方、別の`完了リンク`をcompleteしてclosed状態を調べると、`project.json.secretaryLink.projectRef`は`projects/open/完了リンク/PROJECT.md`のままで`refExists=false`、実Projectは`projects/closed/完了リンク/PROJECT.md`に存在した。
- `clarity-secretary status ... 完了リンク --closed --json`は、この状態を`linkHealth=local-reference-healthy`と表示した。

#### daily／weekly／Portfolio、source failure

- 4 Attentionのmorningは`items.length=3`、`otherCount=1`。sectionは独立した`今日の要確認`。
- Portfolio／morning／evening／weeklyは`connectorReads=0`、`itemBodiesIncluded=false`。Portfolioは`closedIncluded=false`でlegacy／closedを含まない。
- eveningは`decisions`／`execution`／`candidates`／`drift`／`carriedAttention`、weeklyはAttention増減／解消Attention／解消Drift／lag／longRunningを別fieldで返した。
- `タスク境界`の`events.jsonl`を意図的に壊すと、Portfolioは他の正常Projectを継続表示し、`unverifiedSources=[{project:'タスク境界', reason:'jsonl-invalid'}]`を分離した。
- 同じ破損状態でも`project-tools show`はexit 0でProject本体を表示した。
- ただし正常なAttentionのcore statusにはEvidence 1件とchoices 3件があるのに、Portfolio／morning JSONでは両fieldがなく、plain outputも`Project: Item（理由）`だけだった。

#### task routing

- 初期1 Itemでは、暗黙routeは`not-routed`、明示localは`project-tools:add-todo`、明示downstreamは`downstream-task-adapter`を返した。いずれも`taskWrites=0`、PROJECT／inbox／Event hash不変。
- 別fixtureに`item.discovered`を4件追加し、active Attention 5件、top 3、other 2を作った。
- top外の`ci_44444444444444444444`を`task-route --explicit --target local-todo`へ渡すとexit 3、`item-missing`。Itemはcanonical Stateに実在するが、adapterは`attention.top`だけを検索していた。
- よってbounded表示は成立する一方、明示タスク化の対象までbounded top 3へ狭めている。

#### path／symlink、private literal

- Projectの`clarity`をroot外temporary directoryへ向くsymlinkにしてapplyするとexit 3。外部canary以外の作成・変更0。
- 045新規product差分を`05/02`、`10_sources`、`Notion`、`TaskDB`、property／relation、my-vault、private rootでscanし、新規追加literal／実装0。
- `secretary-adapter.json`はgeneric open path、lifecycle／Decision／task authority、`fixed-handoff-required`、`implementationIncluded:false`、`protectedValuesIncluded:false`を保持。

### 3. 既存Skill直接回帰

| Surface | Command | 結果 |
|---|---|---|
| projects | `bash scripts/sprint-015-regression.sh` | exit 0、68 PASS／0 FAIL |
| daily | `bash scripts/sprint-010-regression.sh` | exit 0、56 PASS／0 FAIL |
| weekly | `bash scripts/sprint-012-regression.sh` | exit 0、38 PASS／0 FAIL |
| memory authorization | `node scripts/sprint-040-test.mjs` | exit 0、15 PASS／0 FAIL |
| Chatwork／Google Chat causality | `node scripts/sprint-024-data-causality-test.mjs` | exit 0、43 PASS／0 FAIL |
| Google Chat | `bash scripts/sprint-020-regression.sh` | exit 0、wrapper 16／16、adversarial 16／16、主要suite 50／50 |
| identity／rename | `bash scripts/sprint-039-regression.sh` | exit 0、69 PASS／0 FAIL＋wrapper 7／7 |
| update config | `node scripts/sprint-030-update-config-test.mjs` | exit 0、10 PASS／0 FAIL |
| update gate | `node scripts/sprint-032-update-gate-test.mjs` | exit 0、15 PASS／0 FAIL |
| Harness境界 | Sprint 045 `RG-012` | Secretary bundle内agents／Harness runtime／`.harness` 0、edition外部参照維持 |

### 4. 旧Sprint 014／018 baseline分類

#### 旧Sprint 014 wrapper

`bash scripts/sprint-014-regression.sh`をcandidateと開始baseline `9ca4c98`のGit-free archiveで同条件実行した。

- candidate: exit 1、`PASS=38 FAIL=3`
- baseline: exit 1、`PASS=38 FAIL=3`
- 両方の失敗内容と順序は同一。

分類:

| Finding | 区分 | Candidate因果 | 扱い |
|---|---|---|---|
| synthetic fixtureの`listen EPERM 127.0.0.1` | host capability | なし | sandboxがloopback bindを許可しない。製品FAILへ推定しない |
| README／guide 2 assert | 既存product debt＋旧verification-infra debt | なし | baseline同一。Sprint 045変更面ではなく、現行Chatwork causality／product scriptを直接回帰 |

このwrapperをgreenとは表示しない。ただしSprint 045差分にREADME、guide、Chatwork wizard／runtimeの変更はなく、現行直接surfaceは43/43および関連構文checkでgreenであるため、C6のcandidate回帰には数えない。

#### 旧Sprint 018 runner

`bash scripts/sprint-018-regression.sh`をcandidateと同じbaseline archiveで実行した。

- candidate／baselineともexit 1。
- どちらも冒頭で同じ5 assertがFAILし、mock `claude.log`が作られないため同じ`FileNotFoundError`で停止。
- 現行`update-apply.mjs`／version／session契約に対して旧runnerの前提が一致しない`verification-infra` debtで、Sprint 045因果はない。
- 現行surfaceの直接回帰はupdate config 10/10、update gate 15/15、update product scriptのNode構文checkがgreen。

## Finding／バグ一覧

| ID | 重要度 | 対象区分 | 内容 | 影響／route |
|---|---|---|---|---|
| F-01 | Major | product | `clarity-secretary` CLIが両Decision partialの実副作用を`changed:false`と誤報し、`completed`／`pending`を落とす | `SL-006`、AC8、C4／C20／C24。Generatorへ |
| F-02 | Major | product | `routeClarityTask`がcanonical全Itemでなく`attention.top`だけを検索し、4件目以降／非Attention Itemを明示委譲できない | `SL-007`、`RG-002`、AC5、C3／C24。Generatorへ |
| F-03 | Major | product | complete中にcanonical `projectRef`がstaleとなるがclosed statusは`local-reference-healthy` | `SL-011`、AC2、C3／C20／C24。Generatorへ |
| F-04 | Major | product | Portfolio／dailyがAttentionからEvidence／choicesを削除し、結論→理由→根拠→選択を満たさない | C4／C7／C20。Generatorへ |
| V-01 | Major | verification-infra | Sprint 045 runnerがpartialをlibrary直呼びし、Item 1件、ID／Eventだけを検査するため、F-01〜F-04のCLI／multi-Item／link／UX反例を検出しない | product修正と同じSprintで着手時点caseを保護する回帰へ追加 |
| H-014 | Existing | host capability | 旧014 loopback bindがsandbox `EPERM` | baseline同一。045 Generatorへ差し戻さない |
| V-014 | Existing | product／verification-infra debt | 旧README／guide assert 2件 | baseline同一。別Patch候補、045へ混ぜない |
| V-018 | Existing | verification-infra | 旧018 runnerが現行update CLI前提と不一致 | baseline同一。現行直接surfaceで評価 |

CriticalなSecret漏洩、外部write、private混入、既存Skill回帰は0件。F-01〜F-04はすべてcandidateで追加された製品面にあり、host capabilityや旧debtではない。

## Generatorへの修正指示

1. `clarity-secretary.mjs`のerror serializerをcore CLIと同じ意味に揃え、partial時は実副作用に合う`changed`、`completed`、`pending`、`nextAction`を返す。success／保存後partial／保存前partial／retryをすべて新CLI経由で回帰化する。
2. task routeはbounded表示の`attention.top`ではなくcanonical State全ItemからIDを解決する。表示は最大3件のまま、明示選択済みItemの委譲能力を狭めない。top外、非Attention、unknown ID、暗黙依頼、local／downstream明示を分ける。
3. complete／reopenのprojects所有権を維持したまま、Secretary-localのProject参照をProject folder移動に耐える形にする。closed中の実参照存在とlink healthを検査し、存在しない参照をhealthyにしない。
4. daily／Portfolioのbounded projectionに短いEvidenceと選択肢を残し、plain outputも結論→理由→根拠→選択を辿れるようにする。全Item本文は引き続き含めない。
5. F-01〜F-04だけを同じSprintの回帰へ追加し、旧014／018の既存debtやSprint 044のuser-accepted live残件を混ぜない。

## UI／スクリーンショット

本Sprintの新規製品面は常駐serverやbrowser UIを持たないCLI／JSON／Markdown Skillである。レスポンシブや視覚品質を採点していないため、スクリーンショットは非該当。実CLI stdout／stderr、JSON、tree、digest、Project表示を証拠にした。

## 外部副作用

- private実repo／my-vault／実利用者workspace read/write: **0回**
- connector／Xmind／Harness online・live: **0回**
- network／外部remote／外部task write: **0件**
- Mac mini／installed cache／marketplace metadata: **0変更**
- push／tag／release: **0件**
- 回帰suiteが作るpushはOS temporary directory内のlocal bare remoteだけ。外部送信ではない。
- 評価中の永続書込みは本feedbackだけ。製品fixtureとbaseline archiveはOS temporary directoryに限定した。

## Evaluator 自己レビュー

- Generatorの自己評価を合否根拠として流用せず、実CLIと別の匿名fixtureを操作したか: yes
- Targetの正確な35 ID、missing／duplicate／extraを確認したか: yes
- official runner 35/35に反例がある場合、独立意味評価を優先したか: yes
- SL-006をSprint 041 core fixtureだけで代用せず、Secretary-local＋projects lifecycle＋新CLIで再評価したか: yes
- success／retry／Project保存後partial／保存前partialの実filesystemと出力を比較したか: yes
- Decision本文1、一般memory／Clarity Event本文0を確認したか: yes
- open／legacy／closed、preview、complete／reopen、source failure、bounded rollup、task write 0を実操作したか: yes
- public private-literal非混入とfixed handoffを確認し、private対応済みへ昇格していないか: yes
- Sprint 044の`done-by-user-decision`残件を再採点していないか: yes
- 旧014／018をcandidateと開始baselineで同条件比較し、product／verification-infra／host capabilityを分けたか: yes
- 1基準未達をverification-infraだけとして都合よく除外していないか: yes
- 各findingにproduct／verification-infra／host capability区分を付けたか: yes
- 要求した証拠はcontract／rubricのsafe harbor内か: yes
- UIを採点していないためscreenshot非該当を記録したか: yes
- private、cache、marketplace、network、release、後続Sprint 046〜050へread/writeしていないか: yes
- spec、contract、state、code、test、progressを編集していないか: yes
- 最終分類根拠: product defect F-01〜F-04によりTarget 31/35、AC1／2／5／8、C1／C3／C4／C7／C20／C24が未達。仕様矛盾や無許可external gateではなく、同Sprintの実装修正で解消できるため`implementation-issue`。
