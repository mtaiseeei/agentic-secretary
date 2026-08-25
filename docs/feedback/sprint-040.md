# Sprint 040 Evaluation — 明示memory authorizationと3版の内容冪等性

## 判定

**FAIL**

- Failure classification: `implementation-issue`
- Product findings: **3**
- Verification-infra findings: **1**
- Escalation Recommendation: `none`

提供された回帰suiteはclean checkoutと同一bytesのGit-free archiveで全て成功し、
checkpoint failure後のcommit-only retryも実file／実Git fixtureで成立した。一方、着手時に固定された
AC10、AC12、AC15、AC16などを満たさない製品上の欠落がある。特に、memory外へのscope変更が確認なしで
`saved`になる、meaning tupleと実保存本文の整合が保証されない、Yasashii／privateの隔離source candidateと
edition別offline suiteが存在しない、の3点である。

inventory testは実下流sourceではなく公開candidateの内容を3 edition分として読むため、Yasashii／privateに
現行markerがない状態でもPASSする。これは`verification-infra` findingだが、上記3件は製品または必須成果そのものの
問題なので、最終failure kindは`implementation-issue`とする。

## 評価対象とcandidate識別

- Evaluated docs-state HEAD: `592ae5b668bd232d286c869f60e0f84597ecb189`
- Generator product commit: `3b67284c62308e33df19e34086920743e0d3450d`
- Sprint開始commit: `5b48b7ba0784aa9b9d6552aed5162fafbc831c99`
- product commitからdocs-state HEADまでの差分: `docs/sprints/state.md`だけ。製品bytesは同一。
- Branch: `codex/sprint-040-memory-authorization`
- Clean checkout: `/tmp/sprint-040-evaluator.kpWSBw/clean`。product commitへdetached checkoutし、開始時statusはclean。
- Git-free archive: `/tmp/sprint-040-evaluator.kpWSBw/archive`。product commitの`git archive`から展開し、`.git`なし。
- UI／URL: なし。Skill、Node.js library／CLI、実file／Git fixtureを評価対象とし、browser／screenshotは不要。

handoffにある次の値は、edition、base HEAD、**公開candidate側の共通surface digest**、実下流repoの保護digestを
組み合わせた宣言IDであり、Yasashii／privateの実source candidate SHAではない。

- agentic declared candidate ID: `7b82cbe616cf304877e4b0acdeeebd9ff1476dcfd7c59f11a000d489d6aedd31`
- Yasashii declared handoff ID: `72b48383ad821907a48862a35ea6a42438363768a2808ce9d6caa60f5a383cd2`
- private declared handoff ID: `04a5d68946db83351f85d2e6a8b91ef1ea4d40059b594c2093f62ecaa06c495a`

公開版の隔離candidate PASSを、下流2版へ実装済み／受入済みとは扱っていない。

## 実行commandと結果

| Command / surface | Exit | PASS／FAILと観測 |
|---|---:|---|
| clean checkout `bash scripts/sprint-040-regression.sh` | 0 | Sprint 040 9/9、inventory 6/6、Sprint 038 67/67、historical classifier 14/14、historical path 3/3、Sprint 010 56/56、Git／Secret safety 71/71、report schema 1/1、release integrity PASS、wrapper 7/7。 |
| Git-free archive `bash scripts/sprint-040-regression.sh` | 0 | clean checkoutと同じ集計で0 FAIL。archive自身に`.git`なし。 |
| clean checkout `node scripts/sprint-040-test.mjs` | 0 | `SPRINT040_PASS=9 SPRINT040_FAIL=0`。 |
| clean checkout `node scripts/sprint-040-inventory-test.mjs` | 0 | `SPRINT040_INVENTORY_PASS=6 SPRINT040_INVENTORY_FAIL=0`。ただし後述V-01により3版内容の証拠としては無効。 |
| 独立scope fixture `executeConversation(...)` | 0 | Secret／delete／external／bulkは`question, sideEffectCount=0`。`scopeChange:true, destination:TODO`と`destination:Notion TaskDB`はどちらも`explicit, saved, sideEffectCount=1`、snapshot `writes:0→1`。 |
| 独立meaning fixture `memory-tools.mjs save-memory ...` | 0 | `source=田中, certainty=hearsay`のtupleへ表示本文`開始は9月`を渡すと保存1／journal 1。topicには表示本文とopaque hashだけが残り、情報源・確実性を復元できない。 |
| 独立empty-tuple fixture、1回目`{}`＋`内容A`、2回目`{}`＋`内容B` | 0／0 | 1回目は保存1、2回目は`already-saved`で全副作用0。異なる本文を同一内容と誤判定。 |
| 下流2repo `rev-parse HEAD`、`status --short`、保護path `shasum -a 256` | 0 | HEAD／status／digestはhandoff開始値のまま。両repoの対象sourceで現行marker 3種は0件。 |

## 実file／Git fixtureで確認した主要挙動

提供されたSprint 040製品testのfixtureを読み、次をclean checkoutとarchiveで実行した。

1. request hedgeは`ambiguous`、伝聞・推量・訂正を含む明示依頼は`explicit`となる。
2. 引用、現在依頼でない仮定、取消、過去照会はwrite要求にならない。
3. pendingは1件に束縛され、同一anchorの了承は実行、別話題後は失効、修正付き了承は修正版を同turn実行する。
4. decisionの表記違い／別turn retryはmemory、journal、commit追加0。情報源・確実性が異なる通常tupleは別eventになる。
5. topic訂正は旧行を保持して新eventを追記し、同じ訂正retryは追加0。
6. checkpoint commitを故意に失敗すると`partial, memory=1, journal=1, commit=0`。既存stageのbinary diffは不変。
7. 続くretryは`memory=0, journal=0, commit=1`でHEADだけ進み、再retryは`0/0/0`。これは実Git repoで確認した。
8. Secretとpath traversalは保存前に拒否され、既存の削除／destructive／external／bulk／所有path限定Git suiteも0 FAIL。

ただし、test内容を敵対的に読むと、scope変更case、tupleと表示本文の不一致、各edition固有candidate rootをassertしていない。
そのため提供suiteのgreenは以下のfindingを否定しない。

## Findings

### P-01 `product` — memory外へのscope変更が確認なしで保存扱いになる

`plugins/secretary/scripts/lib/conversation-contract.mjs:8-10`の明示判定は、
`explicitMemoryRequest && target`だけで成立し、destinationを`memory`へ限定しない。
`requiresConfirmation`も同file `24-27`でdestructive、external、bulk、Secretだけを扱い、
`scopeChange`またはmemory外destinationを見ない。実行分岐 `120-147`はその結果を`response=saved`、
`sideEffectCount=1`へ進める。

独立fixtureの観測:

| Case | 期待 | 観測 |
|---|---|---|
| `scopeChange:true, destination:"TODO"` | 確認前副作用0 | `explicit / saved / 1`、snapshot `writes:0→1` |
| `destination:"Notion TaskDB"` | memory authorizationを流用せず、既存の別確認 | `explicit / saved / 1`、snapshot `writes:0→1` |

Secret、delete、external、bulkの負例は同fixtureで`question / 0`だったため、安全分類全体の崩壊ではなく、
着手時に明記されたscope変更境界の欠落である。AC10、C5、C15、C18に抵触する。

### P-02 `product` — meaning tupleと実保存本文の整合がなく、意味欠落と誤dedupeを受理する

`plugins/secretary/skills/memory-care/scripts/memory-tools.mjs:156-180`はmeaningを任意のJSON objectとして受理し、
必須field、destination、表示本文との整合を検査しない。content keyは同file `115-121`でmeaningだけから作る一方、
実topic本文は`217-220`で独立した`display`を保存する。

実file fixtureでは、tupleに`source:"田中", certainty:"hearsay"`を与えても、表示本文を`開始は9月`とすると
topic fileに残るのは`- 開始は9月`とopaqueな`memory-content-key`だけだった。journalにもtopic名だけが残り、
情報源と確実性は利用者が読める形でも機械的に復元できる形でも保存されない。

さらに空object `{}`が有効なtupleとして受理されるため、`内容A`の保存後に同じ空tupleで`内容B`を保存すると、
2回目は`already-saved`となりfile／journal追加0だった。内容の違いではなく欠落tupleのhashで誤dedupeしている。
AC3、AC8、C15、C18に抵触する。

### P-03 `product` — Yasashii／privateの隔離source candidateとedition別offline suiteがない

candidate treeには公開版の共通source、inventory、宣言的handoff、公開版上で動くtestだけがある。
Yasashii／private用の同一bytes隔離candidate root、各版専用fixture、各版のmaster相当offline回帰は存在しない。
wrapperも公開candidateのscriptを一度実行するだけである。

実下流repoはread-onlyの開始状態にあり、次の現行markerは両repoで0件だった。

- `explicit-memory-request=run-once`
- `content-uncertainty=preserve`
- `retry-after-checkpoint-failure=commit-only`

実下流へまだ適用しないこと自体はNon-scopeに沿う。ただし、その代替として契約が許した「同一bytesの隔離candidate」と
edition別offline suiteもないため、公開版の結果をYasashii／privateへ昇格できない。AC12、AC15、AC16、C13、C18に抵触する。

### V-01 `verification-infra` — inventory testが公開rootを3 editionの実内容として読む

`scripts/sprint-040-inventory-test.mjs:51-68`は、edition HEADと保護digestだけを`edition.sourceRoot`から読むが、
marker検査対象bodyは`60`行目で常に`join(root, item.path)`、つまり公開candidate rootから読む。
そのため、現行markerが0件のYasashii／private実sourceでも両editionのmarker検査がPASSする。

追加の偽PASS余地:

- Git-free archiveでは`42-44`行目がtracked pathをinventory自身の宣言から作るため、tracked性を独立に証明しない。
- handoffのagentic `sourceRoot`は絶対pathの実workspaceであり、clean clone／archive実行でもHEAD検査だけは隔離candidateでなく実workspaceへ向く。
- markerはinventory全体のglobal配列で、各entryに対応づけられていない。実際にmarker 3種が存在するのは17 surface中、rules contract、memory-care Skill、runtime classifierの3 surfaceだけだが、16 surfaceを結合するためedition検査がPASSする。

これは検証基盤のfindingであり、単独では製品FAILへ昇格しない。ただしP-03を覆い隠しており、AC11の
「各entryのmarkerが実内容と一致」とAC12の実source検査を証明できない。

## 下流repoのread-only snapshot

### Yasashii

- Root: `/Users/taisei/workspace/yasashii-secretary`
- HEAD: `3c472dd9a2b5299f27741ae2c418094486b7d035`
- `git status --short`: 出力0
- `README.md`: `35361391ad9a74c9403f8a2cc20616b5e3aa0635d76a067c1022fb35b794b527`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `694c582a5200901a4669741956017aedcc242056620d051e9e621d0423d8de76`
- `plugins/secretary/edition.json`: `663c14cc51b92a936a1dbaf34d5ab4f7ded65f20d57ad0ed645dfd3e8d9bf7b7`
- `plugins/secretary/rules/styles/yasashii.md`: `50c9df0ff79fb43d5e051eb0c42070e31393b210a7fb78076c6e7e6996b1699c`

### private my-vault

- Root: `/Users/taisei/workspace/agentic-secretary-my-vault`
- HEAD: `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`
- `git status --short`: 出力0
- `README.md`: `08046efc3648633b0e80f182c254755bb4e1a5e086607e1674abef22783ff293`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `58755995d733d454daad0da28ab98b83c0829f5f1c1ebfe6f0516d30bf78ef1f`
- `plugins/secretary/edition.json`: `29d70da3b1b9c6c48716488919a9de35a38c4087853363563f385eb07dacf7b9`
- `plugins/secretary/skills/notion-tasks/SKILL.md`: `8c40b2007c952b88a38165ef308dc723098ddca9e31cec3ec503d723a84c4527`
- `plugins/secretary/skills/vault-search/SKILL.md`: `54d0e7094a03497ceaeda5a48d753124763982f80bf1e60494034cb7faceca88`

開始値と終了値は一致し、protected digestの変化は0。下流2repoへwrite、commit、checkout、branch、remote変更は行っていない。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | 明示低リスクのdecision／topic保存を実file fixtureで各1件、再質問0として確認。 |
| 2 | PASS | request hedgeは質問前0、伝聞／推量の明示保存は1件となる提供fixtureを確認。 |
| 3 | **FAIL** | P-02。meaning tupleとdisplayが独立で、情報源・確実性の欠落を受理する。 |
| 4 | PASS | 引用、非現在仮定、取消、過去照会はwrite要求0。既存削除2段階suiteもPASS。 |
| 5 | PASS | pending 1件、別話題失効、修正付き了承の同turn実行を確認。 |
| 6 | PASS | topic旧eventを保持し訂正eventを追記。同じ訂正retryは追加0。 |
| 7 | PASS | 通常の完全tupleでは表記違い、別turn、別operation相当retryが全追加0。 |
| 8 | **FAIL** | P-02。空tupleを受理し、異なる表示内容A／Bを同じ内容として誤dedupeする。 |
| 9 | PASS | 実Gitでpartial `1/1/0`、retry `0/0/1`、再retry `0/0/0`。既存stageもbyte不変。 |
| 10 | **FAIL** | P-01。Secret／削除／destructive／external／bulkは停止するが、scope変更が`saved / 1`。 |
| 11 | **FAIL** | V-01。digestは公開rootで一致するが、各entry markerと各edition実rootを検査せず偽PASS可能。 |
| 12 | **FAIL** | P-03／V-01。Yasashii／private実sourceに現行markerがなく、代替の隔離candidateもない。 |
| 13 | PASS | 宣言inventoryは17 surfaceを持ち、settings／daily／projects／templates／runtime／memory seam／golden／Sprint 010を列挙。 |
| 14 | PASS | Sprint 038は67/67で、request/content分離、pending、訂正、retry、partial fixtureを含む。 |
| 15 | **FAIL** | P-03。3版別candidate／専用fixture／master相当offline回帰がなく、公開版結果を流用。 |
| 16 | **FAIL** | protected digest不変は確認したが、3版共通対象のauthorization／意味保存／冪等性を各candidateで証明できない。 |
| 17 | PASS | push、tag、Release、marketplace、cache、workspace、Mac mini、external service変更0。 |
| 18 | PASS | progressはsource/offline、release未実行、cache未反映、新session未確認、下流not-appliedを分離。 |
| 19 | **FAIL** | 独立Evaluatorで対象閾値とACを満たさない。 |

## Rubric scores

対象閾値はいずれも **5/5**。1項目でも未達ならSprintは不合格。

| Rubric | Score | 根拠 |
|---|---:|---|
| C2 構文・整合 | **4/5** | JSON／Node構文は成立するが、handoffのsource rootと実検査rootが不整合で、Yasashii／privateの宣言IDを実candidateとして解決できない。 |
| C5 安全・規律 | **4/5** | Secret、削除、destructive、external、bulk、Git所有範囲は維持したが、memory外scope変更の確認漏れが1件ある。 |
| C6 無回帰 | **5/5** | 提供された既存・追加assertはclean checkout／archiveで全て成功し、既知FAILの持越しは観測しなかった。findingは未収載caseと偽PASS検査による。 |
| C13 edition分離・互換 | **4/5** | 実下流repoはPASS前の変更0だが、Yasashii／privateの隔離candidateと独立評価がなく、公開版の共通bytesを結果として流用している。 |
| C14 会話のMarkdown可読性 | **5/5** | 検査した会話文とSkill surfaceに一行圧縮、固定3項目、partialの全成功表示はなく、edition別copyも宣言上保持。 |
| C15 会話authorization・意味保存 | **4/5** | scope変更の確認漏れ、meaning tupleと実保存本文の不一致、negative fixtureの見逃しがある。 |
| C18 明示memory authorization・内容冪等性 | **4/5** | 通常case、pending、訂正、retry、partialは成立するが、意味欠落／誤dedupe、1版PASSの他版昇格、inventory偽PASSがある。 |

## Safety／外部操作の確認

- Secret保存拒否、path traversal拒否、削除2段階、destructive／external／bulk確認、所有path限定commit、既存stage保持は提供suiteでPASS。
- candidate diffと実行commandにpush、tag作成、GitHub Release、marketplace、installed cache、利用者workspace migration、Mac mini同期、external service writeはない。
- remote fetchも行っていない。network、connector、live serviceは使用していない。
- 一時fixtureは`/tmp`内だけに作成し、製品repo／下流repoの製品file、test、spec、progress、state、Git履歴を変更していない。
- 下流実repoへの反映は**未実行**。公開candidateの隔離PASSを下流実repo反映済みとは扱っていない。

## Not-run／非昇格

- UI／browser／screenshot: 対象なし。
- installed cache、new session、loaded version、実利用者workspace: NOT-RUN。Sprintの合格条件へ追加していない。
- external service、release、marketplace、push、tag、Mac mini: NOT-RUN／write 0。
- Yasashii／private実repoへのsource適用とedition別offline suite: NOT-RUNではなく、着手時AC12／15／16の**必須成果欠落**としてP-03へ分類。
- 新しいattestation／collector／live cache検査は要求していない。

## Evaluator self-review

- Generatorの会話履歴、自己評価、宣言IDを合格根拠にせず、正本spec、rubric、Sprint contract、製品／test実装を読み直した。
- product commitとdocs-only state HEADを分離し、clean checkoutと同一commitのGit-free archiveを作り直した。
- 提供suiteのgreenを記録したうえで、期待値注入とroot取り違えによる偽PASS余地を敵対的に確認した。
- request/content hedge、pending、訂正、通常retry、異なる不確実性、checkpoint partial／retryを実file／Git snapshotで確認した。
- findingを`product` 3件、`verification-infra` 1件へ分離した。verification-infraだけを製品FAILへ昇格していない。
- safe harborを証拠の上限として守り、UI、live cache、新session、collector、attestationを追加条件にしていない。
- 書き込んだ正本は本feedbackだけ。製品、tests、spec、progress、state、Git commitは変更していない。

## 最終Verdict

**FAIL — `implementation-issue`**

P-01とP-02は製品挙動の欠陥、P-03は着手時に必須だった3版source／offline成果の欠落である。
V-01のinventory偽PASSだけを直しても合格にはならない。修正後は同じproduct candidate群を固定し、
scope変更0副作用、tuple／display整合のnegative fixture、Yasashii／privateの実隔離candidateと各版専用suiteを
独立Evaluatorが再実行する必要がある。
