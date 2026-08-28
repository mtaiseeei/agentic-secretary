# Sprint 045: generic Secretary-local、daily／weekly／Portfolio

**ステータス:** Generator実装・自動回帰完了、Evaluator独立評価待ち

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

## 変更箇所

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

registryは`docs/spec/clarity-acceptance.md`のJSONを直接parseし、missing 0、duplicate 0、extra 0である。`SL-006`はSprint 041 core fixtureの結果を流用せず、generic Secretary-localの作成・Clarity初期化・Decision・partial retry・complete／reopen責務を同じfixtureで評価した。

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
3. generic Secretary-localでDecisionを確定し、`PROJECT.md`のDecision本文1件、一般memory 0件、Clarity Event本文0件、`decision.confirmed` Event 1件を確認する。同じ操作のretryと、`clarity-finalize`／`decision-write`の両partialからのretryでも重複0を確認する。
4. Projectをcompleteしてclosedへ移し、Clarity ID／Event bytesを比較する。reopen後も同じID／履歴で、Clarity directoryを再作成していないことを確認する。
5. 複数open、closed、legacy、Attention Critical／0件、破損sourceを混ぜ、Portfolioがopenだけ、Critical理由付き最大3件、全Item本文なし、connector read 0、未確認範囲分離になることを確認する。
6. morning出力で`今日の要確認`が独立section、最大3件であること、evening／weeklyが規定区分を分離し、閲覧前後でTODO bytesが同一であることを確認する。
7. Clarity Itemの暗黙task routeが0-write、明示routeも既存確認境界へのhandoffだけでTODO／外部task write 0であることを確認する。
8. public Clarity sourceとadapterをscanし、private保護literal／実装が0、fixed handoff markerがあることを確認する。
9. `bash scripts/sprint-045-regression.sh`で35 targetとSprint 041〜044直接回帰を再実行する。

## Known issues／正直な未検証

- Sprint 045の自動targetと直接回帰に製品FAILはない。ただしGeneratorの自己評価はEvaluator判定ではない。
- 実private repo／workspace、private source tree、downstream task adapter、connector live、Xmind live、Mac mini、installed plugin/cache、marketplace、push、tag、releaseは実行・変更していない。public実装のPASSをprivate適用済み、installed version更新済み、external-live verifiedとは表示しない。
- Sprint 043から継続する`XM-007`実Xmind MCP external-liveは未承認NOT-RUNのまま。本Sprintのfixtureやadapterで置き換えていない。
- runner設計中に旧Sprint 014 wrapperを診断実行したところ、sandbox loopback `EPERM`と既知README assertionで停止した。Sprint 045が変更したdaily／Project surfaceはSprint 010／015の直接suiteでgreenであり、旧wrapperの失敗を隠して統合PASSへ数えていない。
- 旧Sprint 018 runnerは現在のupdate CLI／temp fixture前提と一致しないため、そのまま統合根拠にしなかった。現行update config／gateと製品script構文を直接実行し、いずれも0 FAILだった。
- linked sync、reciprocal link、semantic Drift comparator、private adaptation、Yasashii適用、packaging／releaseはSprint 046以降または別Harnessの責務であり、本Sprintでは先行実装していない。

## 外部副作用

- private repo／実利用者workspace read/write: **0回**
- connector／Xmind／Harness online・live: **0回**
- network／external write／task write: **0件**
- Mac mini／installed cache／marketplace metadata: **0変更**
- push／tag／release: **0件**
- 書込みは本repoのGenerator所有差分と、テスト終了時に削除するOS temporary fixtureだけ。
