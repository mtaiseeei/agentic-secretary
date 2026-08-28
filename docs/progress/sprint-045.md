# Sprint 045: generic Secretary-local、daily／weekly／Portfolio

**ステータス:** Retry 2 Generator修正・自動回帰完了、Evaluator独立再評価待ち

## Retry 2（F-05／V-02）

- 開始HEADは`bb181ba3e2a8b4e4cd88c87799b9599efc00608d`。Retry 1 EvaluatorのF-05だけを製品修正し、同じ既存基準のV-02をPF-012へ回帰化した。
- Portfolioの横断集約は、各Projectの表示用`attention.top`件数ではなくcanonical `activeCount`を総数へ加算する。横断上位3件の候補と並びは従来どおり各Projectのbounded `top`から決め、`otherCount`はcanonical総数から実際の表示件数を引いて返す。
- 1つのopen Projectにactive Attention 6件がある場合、Portfolioとmorning dailyのJSONは`activeCount: 6`／表示3件／`otherCount: 3`となる。Portfolio plainは`Attention 6件`と`その他 3件`、daily plainは`今日確認したい項目は6件です`と`その他 3件`を表示する。
- PF-012は製品CLIの`status`／`portfolio`／`daily`をJSONとplainで直接実行し、canonical 6／3／3、Portfolio 6／3／3、daily 6／3／3をassertする。8 Project × 1件も同じcaseで維持し、横断順序は`案件0`、`案件1`、`案件2`、総数8、残件5、全Item本文0、connector read 0を検査する。
- Retry 1で解消したF-01〜F-04のDecision両partial、canonical全Item task route、move-safe `projectRef`／link health、Evidence／choicesの直接回帰は変更せず、公式35/35で再実行した。closed／legacy除外、source failure分離、open-only、Sprint 046以降の非先行も維持した。
- 公式35 ID、registryの順序・件数、report surface 22件は変更していない。

### Retry 2の変更ファイル

- `plugins/secretary/scripts/lib/clarity-secretary.mjs`
- `plugins/secretary/scripts/clarity-secretary.mjs`
- `scripts/sprint-045-test.mjs`
- `docs/progress/sprint-045.md`

## Retry 1（F-01〜F-04）

- F-01: `clarity-secretary decide`のerror serializerが`ClarityError.details`を保持するようにした。保存前／保存後partialは、その呼出しで起きた副作用に合わせた`changed`と、`completed`、`pending`、`nextAction`をJSONへ返す。success、同一Decision retry、両partial、partial後retryをすべて製品CLI経由で検査する。
- F-02: 明示task routeのItem ID解決を、表示用`attention.top`ではなくEvent／Evidenceから再構築したcanonical State全Itemへ変更した。Portfolio／dailyの表示上限3件は維持しつつ、4件目以降とAttention外Itemも既存local TODO／downstream確認境界へ委譲できる。unknown IDと暗黙依頼は引き続きwrite 0で分離する。
- F-03: Secretary-localの`projectRef`をSecretary root相対のopen pathから、Project folder基準の`PROJECT.md`参照へ変更した。projectsがcomplete／reopenとcanonicalRepoを所有する境界、Clarity ID、Event bytesは維持したまま、同じ参照がopen／closed移動へ追随する。statusは実参照を検査し、古いstale pathを`local-reference-healthy`と表示しない。
- F-04: Portfolio／dailyのbounded上位3件へ、短い`conclusion`、理由、Evidence最大3件、choices最大3件を残した。plain出力も「結論→理由→根拠→選択」を辿れる。`itemBodiesIncluded: false`、open-only、connector read 0は維持した。
- 公式35 IDとregistry順序・件数は変更していない。Retry 1の製品差分は上記4 findingだけで、Sprint 046以降のlinked sync／reciprocal link等は先行実装していない。

### Retry 1の変更ファイル

- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `plugins/secretary/scripts/lib/clarity-secretary.mjs`
- `plugins/secretary/scripts/clarity-secretary.mjs`
- `scripts/sprint-045-test.mjs`
- `docs/progress/sprint-045.md`

## 実装結果

- generic Secretaryの`projects/open/<project>/clarity/`へ`secretary-local` modeのClarityを追加するpreview／apply CLIを実装した。Clarity canonicalはPJ folder内だけに置き、初期化時の`PROJECT.md`は変更しない。
- 既存project resolverと同じ優先順位を使い、openを優先し、legacyはread-only、closedは明示指定時だけ参照する。Portfolio／daily／weeklyの横断集計は`projects/open/`だけを対象にし、legacyとclosedを含めない。
- Project lifecycleの作成、open／closed、complete／reopen、`canonicalRepo`は既存`project-tools.mjs`の所有を維持した。ClarityはProject folder全体と一緒に移動するため、完了・再開時もClarity IDとEvent履歴を作り直さない。
- Project表示へmode、Attention、link health、詳細pointerだけを追加した。Clarity sourceが読めない場合も、Project本体の表示は継続する。全Item本文を`PROJECT.md`へ埋め込まない。
- Project固有Decisionは既存`decideGenericProject`から`project-tools:add-decision`へ1回だけ委譲する。成功retryと、Project Decision保存後／保存前の両partialをgeneric Secretary-local配置で再評価し、Decision本文が`PROJECT.md`に1件、一般memoryとClarity Eventに0件となることを確認した。
- Clarity Itemの生成・閲覧ではTODO／外部taskを書かない。明示的なタスク化だけ、既存の確認境界を示す`project-tools:add-todo`またはdownstream fixed handoffへ委譲し、このadapter自身はwriteしない。
- daily morningへ予定・TODO・中断点から独立した`今日の要確認`を最大3件で追加した。eveningはDecision、実装観測、候補、Drift、持越しAttentionを分離し、weeklyはAttention増減、解消済みAttention、解消Drift、長期滞留を分けた。
- Portfolioはopen ProjectのAttention中心の最小projectionだけを返す。closed、legacy、全Item本文、外部connectorを自動読込せず、source failureは取得済みProjectと未確認範囲を分ける。
- public adapterはgeneric path pattern、lifecycle／Decision／task authority、downstream fixed handoffだけを定義した。private固有resolver、source path、property／relation、task実装は含めていない。
- 新しいClarity Skillを正式な利用者向け応答surfaceへ登録し、既存plain-language serializerを参照させた。これに合わせてreport-schema inventoryを21面から22面へ更新した。

## 変更箇所（Sprint 045累積）

- `plugins/secretary/scripts/lib/clarity-secretary.mjs`
- `plugins/secretary/scripts/clarity-secretary.mjs`
- `plugins/secretary/clarity/secretary-adapter.json`
- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `plugins/secretary/scripts/project-tools.mjs`
- `plugins/secretary/skills/clarity/SKILL.md`
- `plugins/secretary/skills/projects/SKILL.md`
- `plugins/secretary/skills/daily/SKILL.md`
- `plugins/secretary/skills/weekly/SKILL.md`
- `scripts/check-report-schema.py`
- `scripts/sprint-039-test.mjs`
- `scripts/sprint-045-test.mjs`
- `scripts/sprint-045-regression.sh`
- `docs/progress/sprint-045.md`

spec、Sprint契約、state、feedback、release metadata、private downstream、installed cache、marketplace metadataは変更していない。

## 35 case coverage

| Case群 | 対象 | PASS | FAIL |
|---|---:|---:|---:|
| Secretary-local | SL-001〜012 | 12 | 0 |
| daily／weekly／Portfolio | PF-001〜008、PF-010〜012 | 11 | 0 |
| 既存機能回帰 | RG-001〜012 | 12 | 0 |
| 合計 | registryの正確な35 ID | 35 | 0 |

registryは`docs/spec/clarity-acceptance.md`のJSONを直接parseし、missing 0、duplicate 0、extra 0である。`SL-006`はSprint 041 core fixtureの結果を流用せず、generic Secretary-localの作成・Clarity初期化・Decision・partial retry・complete／reopen責務を同じfixtureで評価した。Retry 1では両partialをlibrary直呼びせず、新しい製品CLIのstderr JSONと実filesystemを比較する。

Retry 2のPF-012はlibrary返値だけに依存せず、製品CLIのJSON／plainを直接parse・assertする。1 Project × active Attention 6件と8 Project × 1件の双方でcanonical総数、表示上限、残件数を検査し、公式case IDは増減していない。

## 自動検証

### Sprint 045統合ゲート

```bash
bash scripts/sprint-045-regression.sh
```

- exit 0、`SPRINT045_REGRESSION_PASS=9 FAIL=0 CASES=35`。
- Sprint 045 target: `PASS=35 FAIL=0 TOTAL=35`、registry missing／duplicate／extra 0。
- Sprint 044: `PASS=40 FAIL=0 TOTAL=40`。
- Sprint 043: fixture対象29 PASS／0 FAIL。既存`XM-007`実Xmind MCP external-live 1件だけは、Sprint 043の契約どおりNOT-RUNであり、public PASSへ代用していない。
- Sprint 042: 35/35 PASS。
- Sprint 041: 43/43 PASS。
- release integrity: PASS。
- `claude plugin validate plugins/secretary --strict`: `Validation passed`。
- `node --check`、adapter JSON parse、`git diff --check`: exit 0。
- `python3 scripts/check-report-schema.py --plugin-root plugins/secretary`: `PASS=1 FAIL=0`、22 surface、conflict 0。
- PF-012実CLI: canonical 6／top 3／other 3、Portfolio JSON・plain 6／3／3、daily JSON・plain 6／3／3。8 Project横断は総数8／表示3／other 5でstable orderingを確認した。

### 関連Skill直接回帰

Sprint 045 target runner内と個別commandで、次を実行した。

```bash
bash scripts/sprint-015-regression.sh
bash scripts/sprint-010-regression.sh
bash scripts/sprint-012-regression.sh
node scripts/sprint-040-test.mjs
node scripts/sprint-024-data-causality-test.mjs
bash scripts/sprint-020-regression.sh
bash scripts/sprint-039-regression.sh
node scripts/sprint-030-update-config-test.mjs
node scripts/sprint-032-update-gate-test.mjs
```

- projects: 68 PASS／0 FAIL。
- daily: 56 PASS／0 FAIL。
- weekly: 38 PASS／0 FAIL。
- memory authorization: 15 PASS／0 FAIL。
- Chatwork／Google Chat causality: 43 PASS／0 FAIL。Chatwork product script 3本も`node --check`成功。
- Google Chat: adversarial 16 PASS／0 FAIL、wrapper 16 PASS／0 FAIL。
- identity／rename: 69 PASS／0 FAIL、wrapper 7 PASS／0 FAIL。
- update config: 10 PASS／0 FAIL。update gate: 15 PASS／0 FAIL。update product script 3本も`node --check`成功。
- Harness connectionはRG-012でeditionの外部Harness参照を維持しつつ、Secretary bundle内にHarness agents／runtime／`.harness`が入っていないことをtreeで確認した。online／installed Harnessは触っていない。

## 起動・fixture

常駐server／test URLはない。CLI製品であり、テストは`$TMPDIR/agentic-s045-*`へ匿名Secretary fixtureを作り、終了時に削除する。実workspaceや実connectorは使用しない。

```bash
# read-only preview
node plugins/secretary/scripts/clarity-secretary.mjs init <secretary-root> <project> --json

# 対象確認後だけgeneric open Projectへ適用
node plugins/secretary/scripts/clarity-secretary.mjs init <secretary-root> <project> --apply --json

# 短いProject表示、open-only Portfolio
node plugins/secretary/scripts/project-tools.mjs show <secretary-root> <project>
node plugins/secretary/scripts/clarity-secretary.mjs portfolio <secretary-root> --json

# morning／evening／weekly
node plugins/secretary/scripts/clarity-secretary.mjs daily <secretary-root> --mode morning --json
node plugins/secretary/scripts/clarity-secretary.mjs daily <secretary-root> --mode evening --json
node plugins/secretary/scripts/clarity-secretary.mjs weekly <secretary-root> --json

# 確認済みProject Decisionを既存seamへ委譲
node plugins/secretary/scripts/clarity-secretary.mjs decide <secretary-root> <project> \
  --decision "<確認済み判断>" --current "<現在状況>" --next "<次の入口>" --json
```

## Evaluator向け具体scenario

1. 匿名Secretary fixtureへopen／legacy／closedを同名・別名で作り、previewがwrite 0、open優先＋conflict報告、legacy apply拒否、closed未明示0探索、closed明示時だけ指定PJを返すことを確認する。
2. open ProjectへClarityを適用し、`PROJECT.md`のbefore／after bytesが同一、Clarity rootがPJ内だけ、modeが`secretary-local`であることを確認する。
3. generic Secretary-localでDecisionを確定し、`PROJECT.md`のDecision本文1件、一般memory 0件、Clarity Event本文0件、`decision.confirmed` Event 1件を確認する。製品CLIで同じ操作のretryと、`clarity-finalize`／`decision-write`の両partialを起こし、`changed`、`completed`、`pending`、`nextAction`と実filesystemが一致すること、retryで重複0となることを確認する。
4. Projectをcompleteしてclosedへ移し、Clarity ID／Event bytesとProject folder基準`projectRef`を比較する。closed statusの実参照が存在してhealthyであること、stale参照はhealthyにならないこと、reopen後も同じID／履歴／参照でClarity directoryを再作成していないことを確認する。
5. 1つのopen Projectへactive Attentionを6件作り、製品CLIの`status --json`が6／3／3、`portfolio --json`とplainが総数6／表示3／残件3、`daily --mode morning --json`とplainも6／3／3を返すことを確認する。8 Projectでは総数8、上位`案件0`〜`案件2`、残件5を確認する。
6. 複数open、closed、legacy、Attention Critical／0件、破損sourceを混ぜ、Portfolioがopenだけ、Critical理由付き最大3件、短いEvidence／choicesあり、全Item本文なし、connector read 0、未確認範囲分離になることをJSON／plainの両方で確認する。
7. morning出力で`今日の要確認`が独立section、最大3件であること、evening／weeklyが規定区分を分離し、閲覧前後でTODO bytesが同一であることを確認する。
8. 5件以上のClarity Itemを作り、top外、Attention外、unknown IDを分ける。暗黙task routeは0-write、top外localとAttention外downstreamの明示routeは既存確認境界へのhandoffだけでTODO／外部task write 0であることを製品CLIから確認する。
9. public Clarity sourceとadapterをscanし、private保護literal／実装が0、fixed handoff markerがあることを確認する。
10. `bash scripts/sprint-045-regression.sh`で35 targetとSprint 041〜044直接回帰を再実行する。

## Known issues／正直な未検証

- Sprint 045の自動targetと直接回帰に製品FAILはない。ただしGeneratorの自己評価はEvaluator判定ではない。
- 実private repo／workspace、private source tree、downstream task adapter、connector live、Xmind live、Mac mini、installed plugin/cache、marketplace、push、tag、releaseは実行・変更していない。public実装のPASSをprivate適用済み、installed version更新済み、external-live verifiedとは表示しない。
- Sprint 043から継続する`XM-007`実Xmind MCP external-liveは未承認NOT-RUNのまま。本Sprintのfixtureやadapterで置き換えていない。
- 旧Sprint 014 wrapperのsandbox loopback `EPERM`と既知README assertionは、Evaluatorが開始baselineとcandidateで同一と確認済みのbaseline debtである。Retry 2はREADME／Chatwork runtimeを変更していないため再実行せず、変更面のSprint 010／015直接suiteをgreenで確認した。旧失敗を統合PASSへ数えていない。
- 旧Sprint 018 runnerの現行update CLI／temp fixtureとの前提不一致も、Evaluatorが開始baselineとcandidateで同一と確認済みのverification-infra debtである。Retry 2はupdate面を変更していないため再実行せず、現行update config／gateと製品script構文を直接実行し、いずれも0 FAILだった。
- linked sync、reciprocal link、semantic Drift comparator、private adaptation、Yasashii適用、packaging／releaseはSprint 046以降または別Harnessの責務であり、本Sprintでは先行実装していない。

## 外部副作用

- private repo／実利用者workspace read/write: **0回**
- connector／Xmind／Harness online・live: **0回**
- network／external write／task write: **0件**
- Mac mini／installed cache／marketplace metadata: **0変更**
- push／tag／release: **0件**
- 書込みは本repoのGenerator所有差分と、テスト終了時に削除するOS temporary fixtureだけ。
