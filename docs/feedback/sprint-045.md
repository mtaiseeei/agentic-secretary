# Sprint 045 Retry 1 評価結果

**判定:** 不合格
**分類:** `implementation-issue`
**評価対象:** Sprint 045 — generic Secretary-local、daily／weekly／Portfolio
**Generator candidate:** `e5b1225d416f1fcd8c1bc236dfafd4ee08586f58`
**評価開始HEAD:** `e7f1825b0863144793d964cfd1c0c48880376643`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`とGenerator所有の`docs/progress/sprint-045.md`）
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**Escalation Recommendation:** none（同じSprintのGeneratorで修正可能）

## 結論

前回Major product finding F-01〜F-04は、Generator runnerを使わない匿名Secretary fixtureと実製品CLIで再評価し、すべて解消を確認した。

- Decisionの`clarity-finalize`後partialと`decision-write`後partialは、初回stderr JSONの`changed: true`、`completed`、`pending`、`nextAction`が実filesystemの副作用と一致した。同じfailure injectionのretryは`changed: false`で、通常retry後もDecision本文、pending Event、confirmed Eventは各1件だった。
- canonical StateにAttention 6件とAttention外Item 1件を作り、表示top 3外のItemをlocal TODO seamへ、Attention外Itemをdownstream seamへ明示routeできた。unknown IDと暗黙routeはwrite 0だった。
- complete前、closed後、reopen後でClarity Project ID、`project.json` bytes、Event bytesを保持した。`projectRef: PROJECT.md`はProject folder基準で実在し、closed／reopenはhealthy、意図的な旧open参照は`local-reference-stale`だった。
- Portfolio／dailyのJSONとplainは、表示された上位3件について「結論→理由→短いEvidence→choices」を保持した。plainは3,000 bytes未満、connector read 0、全Item本文非同梱、closed非同梱だった。

公式runnerもTarget 35/35、registry missing／duplicate／extra 0で、F-01〜F-04を製品CLI、multi-Item、link health、JSON／plain UXで直接捕捉する回帰へ更新されている。前回V-01は`RESOLVED`である。

ただし、同じ独立fixtureで新しいproduct defectを再現した。1つのopen Project内にactive Attentionを6件作ると、canonical statusは`activeCount: 6`、`top.length: 3`、`otherCount: 3`である。一方、Portfolioとmorning dailyは`activeCount: 3`、`top/items: 3`、`otherCount: 0`、daily conclusion「今日確認したい項目は3件です」と返した。

表示サイズはboundedだが、4〜6件目を「その他3件」として畳まず、存在しないように誤集計する。F67、UIのProject Clarity中核表示、C20の「最大3件程度・残りは件数へ畳む」と、実状態に一致する応答を満たさない。Acceptance Criteria 4、C1／C4／C7／C20／C24が閾値未達であるため、Sprint 045 Retry 1は不合格とする。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | 前回4 findingは解消したが、1 Project内の4件目以降のAttentionをPortfolio／dailyが件数へ畳めず、AC4が未達 |
| C2 構文・整合 | 5/5 | 5 | PASS | Node構文、adapter JSON、registry 35 unique、report-schema 22面、strict validator、diff checkが成立 |
| C3 機能の実証 | 4/5 | 4 | PASS | Decision partial、全Item route、lifecycle、JSON／plain主要導線は実CLIで成立。集約件数の欠陥はC20／C24へ計上 |
| C4 非エンジニア体験 | 3/5 | 4 | FAIL | 実際はAttention 6件なのに「3件・その他0件」と表示し、利用者が未表示3件の存在を判断できない |
| C5 安全・規律 | 5/5 | 5 | PASS | preview／暗黙route／unknownはwrite 0、Decision本文非複製、task自動write 0、private／external write 0 |
| C6 無回帰 | 5/5 | 5 | PASS | 公式045、041〜044、projects／daily／weekly／memory／chat／identity／update／release integrityが0 FAIL。旧014／018は既存debtとして条件付き証跡再利用 |
| C7 やさしさ | 3/5 | 4 | FAIL | 表示された各項目の構造は自然だが、隠れたAttention件数を0とするため選択に必要な全体像が欠ける |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | canonical Stateは6件を正しく保持し、Decision本文非複製、Project ID／Event履歴、041〜043のState回帰も成立 |
| C20 Attention・Clarity UX | 3/5 | 4 | FAIL | 上位3件の結論→理由→根拠→選択は成立するが、残り3件を`otherCount`へ畳まず消失させる |
| C24 Clarity安全・統合・public-first | 4/5 | 5 | FAIL | task委譲、lifecycle、public-first、安全境界は成立するが、daily／Portfolio統合がcanonical activeCountを正しく集約しない |

C8〜C18、C21〜C23はSprint 045の新規採点対象外である。Sprint 043の`XM-007` real Xmind MCP external-liveは契約どおりconditional NOT-RUNで、Sprint 045のPASS／FAILへ代用していない。Sprint 044の`done-by-user-decision`残件も再採点していない。

## Acceptance Criteria

| AC | 判定 | 実行証拠 |
|---|---|---|
| 1. Target 35件、Acceptance Criteria未実行0、private live非偽装 | **FAIL** | Target 35/35とregistry差分0は成立したが、AC4にproduct未達。private liveは未実行と分離 |
| 2. projectsがlifecycle／canonicalRepoを所有し、Clarityが二重実装しない | PASS | complete／reopenは`project-tools.mjs`だけで実行し、Clarity Project ID／bytesを保持。staleをhealthyと誤表示しない |
| 3. PJ Decisionは既存seamへ1回、一般memory／Clarityへ本文重複0 | PASS | success、両partial、failure retry、通常retryでPROJECT本文1、pending 1、confirmed 1、一般memory 0、Event本文0 |
| 4. daily／weekly／Portfolioは独立・bounded、closed／全本文／connector自動読込0 | **FAIL** | top 3、Evidence／choices、closed／本文／connector 0は成立。ただし同一Projectの残り3 Attentionを`otherCount: 0`と誤集計 |
| 5. Item作成でtask 0、明示時だけ既存確認境界へ進む | PASS | top外local、Attention外downstreamを明示route。暗黙／unknownはwrite 0、TODO／Event bytes不変 |
| 6. projects／daily／weekly／memory／chat／identity／update／Harness回帰0 FAIL | PASS | 公式045と個別直接suiteはすべてexit 0 |
| 7. public sourceにprivate実装0、downstream adapter契約 | PASS | candidate product差分はpublicの3 scriptと回帰だけ。private実装／literal／live実行なし |
| 8. SL-006をSecretary-local＋lifecycle＋partialで再評価 | PASS | 製品CLI stderr JSONとfilesystemを両partial／retryで比較し、前回F-01を解消 |

## Target Case 35件／registry

registry JSONを独立parseし、次の正確な35 ID、unique 35、missing 0、duplicate 0、extra 0を確認した。

- `SL-001`〜`SL-012`
- `PF-001`〜`PF-008`、`PF-010`〜`PF-012`
- `RG-001`〜`RG-012`

`bash scripts/sprint-045-regression.sh`はexit 0で、`SPRINT045_CASE_PASS=35 FAIL=0 TOTAL=35`、`SPRINT045_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`だった。独立fixtureでは前回F-01〜F-04の直接面は4/4 RESOLVEDだが、case IDの個別期待を越えてC20横断基準を検査した結果、新規F-05を検出した。

## 実行証跡

### 1. 公式Sprint 045ゲート

`bash scripts/sprint-045-regression.sh` → **exit 0**。

- `SPRINT045_CASE_PASS=35 FAIL=0 TOTAL=35`
- `SPRINT045_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`
- `SPRINT044_CASE_PASS=40 FAIL=0 TOTAL=40`
- `SPRINT043_CASE_PASS=29 FAIL=0 NOT_RUN=1 TOTAL=30`
- `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`
- `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`
- `PASS release integrity: manifests and CHANGELOG are consistent`
- `SPRINT045_REGRESSION_PASS=9 FAIL=0 CASES=35`

`XM-007`はreal Xmind MCP external-live未承認のconditional NOT-RUNで、他証拠からverifiedへ昇格していない。

### 2. 独立CLI／filesystem fixture

fixture rootは`/var/folders/k1/582ptqfx73l_t0glc9q1hck40000gn/T/s045-r1-independent-o2ccc3`。plugin同梱templateから匿名Secretaryを作り、製品の`project-tools.mjs`と`clarity-secretary.mjs`を実行した。検証後にfixtureを削除した。実private workspace、installed cache、connectorは使っていない。

#### Decision partial／retry

`clarity-finalize`後partial:

- 初回exit 4、`changed: true`、`completed: ["project-decision"]`、`pending: ["clarity-confirmation"]`、具体的`nextAction`あり。
- 実filesystemはDecision本文1、pending Event 1、confirmed Event 0、一般memory本文0、Clarity Event本文0。
- 同じfailure injection retryは`changed: false`。通常retry後はDecision本文1、pending 1、confirmed 1で重複0。

`decision-write`後partial:

- 初回exit 4、`changed: true`、`completed: ["clarity-pending"]`、`pending: ["project-decision", "clarity-confirmation"]`、具体的`nextAction`あり。
- 実filesystemはDecision本文0、pending Event 1、confirmed Event 0、一般memory本文0、Clarity Event本文0。
- 同じfailure injection retryは`changed: false`。通常retry後はDecision本文1、pending 1、confirmed 1で重複0。

#### 全Item task route

- canonical State: active Attention 6、表示top 3、その他3、Attention外idea 1。
- top外Item IDの明示local route: `route=project-tools:add-todo`、`taskWrites=0`。
- Attention外Item IDの明示downstream route: `route=downstream-task-adapter`、`taskWrites=0`。
- 暗黙route: `status=not-routed`、`taskWrites=0`。
- unknown ID: exit 3、`code=item-missing`、`changed=false`。
- 全操作前後で`inbox/todo.md`とClarity Event bytesは同一。

#### lifecycle／projectRef／link health

- Clarity Project ID: `cp_c9a1d0469153ba5e9dad`。
- `project.json` SHA-256: `769d454a6be254e8df5d9eba51589d39426d9986534dc86abf85da792ecd98fd`。
- `events.jsonl` SHA-256: `aa8f8be9daa655bd02076ded184f830e23bd025792af87ea705b1c3e1b678f3b`。
- complete前、closed後、reopen後で上記ID／bytesは同一。
- `projectRef=PROJECT.md`、`referenceBase=secretary-project-root`。closed／reopenで実fileが存在し`local-reference-healthy`。
- 旧`projects/open/.../PROJECT.md`を注入すると`local-reference-stale`で、healthy誤表示なし。

#### Portfolio／dailyの表示と新規反例

canonical status:

```json
{"activeCount":6,"topCount":3,"otherCount":3}
```

Portfolio:

```json
{"activeCount":3,"topCount":3,"otherCount":0,"plainBytes":728}
```

morning daily:

```json
{"conclusion":"今日確認したい項目は3件です","topCount":3,"otherCount":0,"plainBytes":763}
```

各表示Itemは`conclusion`、`reasonLabels`、Evidence 1〜3件、choices 1〜3件を持ち、plain内の順序も結論→理由→根拠→選択だった。出力はboundedだが、4〜6件目の存在と件数が消えている。

### 3. 既存Skill直接回帰

| Surface | Command | 結果 |
|---|---|---|
| projects | `bash scripts/sprint-015-regression.sh` | exit 0、68 PASS／0 FAIL |
| daily | `bash scripts/sprint-010-regression.sh` | exit 0、56 PASS／0 FAIL |
| weekly | `bash scripts/sprint-012-regression.sh` | exit 0、38 PASS／0 FAIL |
| memory authorization | `node scripts/sprint-040-test.mjs` | exit 0、15 PASS／0 FAIL |
| Chatwork／Google Chat causality | `node scripts/sprint-024-data-causality-test.mjs` | exit 0、43 PASS／0 FAIL |
| Google Chat | `bash scripts/sprint-020-regression.sh` | exit 0、main 50／50、adversarial 16／16、wrapper 16／16 |
| identity／rename | `bash scripts/sprint-039-regression.sh` | exit 0、69 PASS／0 FAIL＋wrapper 7／7 |
| update config | `node scripts/sprint-030-update-config-test.mjs` | exit 0、10 PASS／0 FAIL |
| update gate | `node scripts/sprint-032-update-gate-test.mjs` | exit 0、15 PASS／0 FAIL |
| Harness境界 | Sprint 045 `RG-012` | Secretary bundle内agents／Harness runtime／`.harness` 0、外部参照維持 |

追加整合:

- `python3 scripts/check-report-schema.py --plugin-root plugins/secretary` → `PASS=1 FAIL=0`、22 surface、conflict 0。
- `claude plugin validate plugins/secretary --strict` → exit 0、`Validation passed`。
- 変更3製品scriptの`node --check` → exit 0。
- `git diff --check f3c33dc..e5b1225` → exit 0。

### 4. 旧Sprint 014／018 baseline debtの証跡再利用

評価開始worktreeがcleanで、引き渡された045回帰と関連suiteがgreenであることを確認した。前回評価時点`f3c33dc`からcandidate`e5b1225`までの製品／test差分は、Clarityの3 scriptと`scripts/sprint-045-test.mjs`だけで、旧014／018、README、Chatwork wizard／runtime、update runtimeに変更はない。

そのため増分再評価原則に従い、前回のcandidate／開始baseline同条件比較を再利用した。

- 旧014: candidate／baselineとも`PASS=38 FAIL=3`で内容・順序同一。loopback bindのhost capabilityとREADME／guide既存debt。今回candidate因果なし。
- 旧018: candidate／baselineとも同じ5 assert FAIL後に同じ`FileNotFoundError`。現行update CLI前提との既存verification-infra debt。今回candidate因果なし。

これらをgreenとは表示せず、Sprint 045変更面の現行projects／daily／weekly／chat／update surfaceを直接greenで確認した。

## Finding／バグ一覧

| ID | 重要度 | 対象区分 | 状態／内容 | 影響／route |
|---|---|---|---|---|
| F-01 | Major | product | **RESOLVED** — Decision両partialのstderr JSONが実副作用と一致し、retry重複0 | `SL-006`、AC8 |
| F-02 | Major | product | **RESOLVED** — canonical全Itemからtop外／Attention外を明示route可能 | `SL-007`、`RG-002`、AC5 |
| F-03 | Major | product | **RESOLVED** — folder基準`projectRef`、closed／reopen healthy、staleはstale表示 | `SL-011`、AC2 |
| F-04 | Major | product | **RESOLVED** — Portfolio／dailyの表示ItemにEvidence／choicesを保持 | C4／C7／C20の前回指摘 |
| V-01 | Major | verification-infra | **RESOLVED** — 公式runnerが製品CLI、両partial、multi-Item route、link health、JSON／plainを直接検査 | 前回4反例を回帰で捕捉 |
| F-05 | Major | product | **OPEN** — 同一Project内のAttention 4件目以降をPortfolio／dailyのglobal集計が落とし、6件を3件・その他0件と誤表示 | AC4、C1／C4／C7／C20／C24。Generatorへ |
| V-02 | Minor | verification-infra | **OPEN** — 公式PF-012は8 Project×1 Itemだけでbounded sizeを検査し、1 Project×6 AttentionのactiveCount／otherCount整合を検査しない | F-05修正と同じ既存基準の回帰へ追加 |
| H-014 | Existing | host capability | 前回証跡再利用。sandbox loopback `EPERM` | candidate非因果 |
| V-014 | Existing | product／verification-infra debt | 前回証跡再利用。README／guide 2 assert | candidate非因果、別Patch候補 |
| V-018 | Existing | verification-infra | 前回証跡再利用。旧runnerと現行update CLI前提不一致 | candidate非因果 |

F-05はverification-infra単独ではなく、製品CLIのJSON／plainがcanonical Stateと異なるproduct defectである。仕様矛盾、無許可external gate、検証形式不足ではなく、同Sprint実装で修正できるため`implementation-issue`とする。

## Generatorへの修正指示

1. Portfolioのglobal aggregationで、各Projectの`attention.top`だけを足し合わせてactive総数を作らない。canonical各Projectの`activeCount`／`otherCount`を失わず、全Project横断の上位3件と残件数を正しく算出する。
2. daily morningのconclusionと`otherCount`をPortfolioの正しいglobal countへ揃える。1 Projectに4件以上、複数Projectに4件以上、source failure混在でも、表示topは最大3件のまま残件数を正直に示す。
3. 既存F-01〜F-04回帰を維持し、`1 Project × active Attention 6`の製品CLI JSON／plain反例をPF-012または同じ着手時点caseへ追加する。全Item本文、closed／legacy、connector readを引き続き含めない。
4. 旧014／018、Sprint 044 user-accepted live残件、Sprint 046以降を今回修正へ混ぜない。

## UI／スクリーンショット

本Sprintの新規製品面は常駐serverやbrowser UIを持たないCLI／JSON／Markdown Skillである。レスポンシブ、DOM、視覚品質を採点していないため、実URL／ブラウザ操作／スクリーンショットは非該当。実CLI stdout／stderr、JSON、filesystem bytes、digestを証拠にした。

## 外部副作用

- private実repo／my-vault／実利用者workspace read/write: **0回**
- connector／Xmind／Harness online・live: **0回**
- network／外部remote／外部task write: **0件**
- Mac mini／installed cache／marketplace metadata: **0変更**
- push／tag／release: **0件**
- 回帰suiteが作るpushはOS temporary directory内のlocal bare remoteだけ。外部送信ではない。
- 評価中の永続書込みは本feedbackだけ。独立fixtureはOS temporary directoryに限定し、検証後に削除した。

## Evaluator自己レビュー

- Generatorの自己評価を合否根拠として流用せず、実製品CLIと別の匿名fixtureを操作したか: yes
- 前回candidateとの差分を実Gitで確認し、変更面の証跡を取り直したか: yes
- Targetの正確な35 ID、missing／duplicate／extraを独立parseしたか: yes
- Decision両partialのstderr JSONとfilesystemを比較し、failure retry／通常retryの重複を数えたか: yes
- 5件以上のItemでtop外、Attention外、unknown、暗黙、local／downstreamを分けたか: yes
- complete／closed／reopenのProject ID、Clarity bytes、projectRef実在、stale healthを操作したか: yes
- Portfolio／dailyのJSONとplainで結論→理由→根拠→選択、bounded size、禁止読込を確認したか: yes
- 公式35/35をそのまま製品PASSへ流用せず、同一Project内6 Attentionの反例を探したか: yes
- F-05をproduct、V-02をverification-infraとして分離し、V-02単独でFAILにしていないか: yes
- 旧014／018の証跡再利用条件としてclean worktree、green suite、実diff非関連を確認したか: yes
- private／cache／marketplace／network／release／Sprint 046以降へ触れていないか: yes
- spec、contract、state、code、test、progressを編集していないか: yes
- 契約外のcollector／attestation／Evidence formatを合否条件に追加していないか: yes
- UI非該当理由を明記したか: yes
- 最終分類根拠: F-01〜F-04／V-01は解消したが、F-05によりcanonical active Attentionの残件がdaily／Portfolioから消え、AC4、C1／C4／C7／C20／C24が未達。同Sprintの集約実装修正で解消可能なため`implementation-issue`。
