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

---

## Retry 1 fresh independent evaluation

### 判定

**FAIL**

- Failure classification: `implementation-issue`
- Retry 1 product findings: **1**
- Retry 1 verification-infra findings: **1**
- Initial findings resolved: **P-02、P-03、V-01**
- Initial finding partially unresolved: **P-01**
- Escalation Recommendation: `none`

候補は固定baseから3つのGit-free candidateを実際に構築し、各candidate rootの製品／版固有fixture／既存回帰を
別々に実行できるようになった。初回のmeaning欠落・空tuple誤dedupe、公開root流用、global marker偽PASSは再現せず、
Yasashii／private実repoもread-onlyのまま保護された。

ただし、scope変更の停止条件が`explicitMemoryRequest: true`にだけ結び付いている。同じmemory保存を
`explicit: true, operation: "save-memory"`で表した経路では、`scopeChange: true`かつmemory外destinationでも
確認なしの`saved / 1`になる。これは初回P-01と着手時AC10の同じ安全境界が不完全なまま残ったproduct findingである。

またtracked inventoryは全17 surfaceを正本に持つが、各edition reportはedition適用対象の16 entryへfilterしてから
本文／digest／marker／tracked性を検査する。全candidate digestには残り1 entryも含まれるものの、Retry 1再評価で
指定された「各edition candidate rootの17 entryを本文単位で検査」は満たさないため、V-02として分離する。
V-02単独をproduct FAILへ昇格しておらず、最終failure kindは残存P-01-R1に基づく`implementation-issue`である。

### 評価対象とcandidate識別

- Evaluated docs-state HEAD: `c7bc7bb8c0fdbbf969446ae215fe47b48baaf167`
- Retry 1 product／test candidate commit: `a5011da3d3a75a09a98a108662fa04a159d20c20`
- Retry 1開始HEAD: `85e5c05a57a6ea55328b73d44e5ab30cd7f09e3a`
- Sprint固定base: `5b48b7ba0784aa9b9d6552aed5162fafbc831c99`
- `a5011da`からdocs-state HEADまでの差分: `docs/sprints/state.md`だけ。製品／test bytesは同一。
- Branch: `codex/sprint-040-memory-authorization`
- Clean Git-free checkout: `/tmp/sprint-040-retry1-evaluator.Q9ASre`。`git archive a5011da`から展開し、`.git`なし。
- UI／URL: なし。Skill、Node.js library／CLI、実file／Git fixtureを評価対象とした。

3版candidate IDはsorted relative path、mode、実bytesから再計算され、progressのhandoffと一致した。

| Edition | 固定base | Candidate ID | Files |
|---|---|---|---:|
| Agentic | `5b48b7ba0784aa9b9d6552aed5162fafbc831c99` | `b201b56408fe8b2539f00934545023325e9b1b1fecd965c39c21693041dc7d30` | 624 |
| Yasashii | `3c472dd9a2b5299f27741ae2c418094486b7d035` | `26dec9e8cf194716948cff57c74fce770c027ab8f83202a798a8bc1b20863bc0` | 601 |
| private my-vault | `8e0796c9aba49d9a3dccb020912b0e1cf3989abf` | `3589554f24c96e7fc5a0ab1ab3def5b29da0f124eafa502d69c1f5d97e22543c` | 711 |

### 実行commandと結果

| Command / surface | Exit | PASS／FAILと観測 |
|---|---:|---|
| Git-free checkout `bash scripts/sprint-040-regression.sh`（source env未指定） | 128 | 一時checkoutの兄弟directoryに下流repoがないためdefault source解決で停止。製品caseには未到達。 |
| 同checkout `SPRINT040_YASASHII_SOURCE=/Users/taisei/workspace/yasashii-secretary SPRINT040_PRIVATE_SOURCE=/Users/taisei/workspace/agentic-secretary-my-vault bash scripts/sprint-040-regression.sh` | 0 | builder 3/3、inventory 7/7、3 edition suite 0 FAIL。上記candidate IDを再現。source rootはbuilder入力だけで、candidate report／candidate内suiteは相対rootを使用。 |
| 各版 `scripts/sprint-040-candidate-suite.sh`（wrapper内） | 0 | 各版Sprint 040 12/12、Sprint 038 67/67、historical classifier 14/14、historical path 3/3、Sprint 010 56/56、安全境界71/71。Agentic edition 2/2、Yasashii edition 3/3、private edition 3/3、下流private相当9/9。 |
| `node scripts/sprint-040-candidate-build.mjs ... --output /tmp/.../candidates` | 0 | 固定baseから3つの別Git-free candidate rootを保持して再構築。実下流HEAD不一致時はfail-closedする実装を確認。 |
| `node scripts/sprint-040-inventory-test.mjs --candidate-report /tmp/.../candidate-report.json` | 0 | 通常report 7/7。各版の適用対象16 entryで本文digest、entry marker、禁止旧marker／phrase、tracked宣言を検査し、candidate全tree IDを再計算。 |
| 独立scope／meaning fixture `/tmp/.../independent-retry1.mjs` | 0 | 4/4。`explicitMemoryRequest`のTODO／Notion／projectは`question / 0`、memory／decision／topicは`scopeChange=true`でも`saved / 1`。田中／hearsay／開始は9月をmemoryとjournalから復元。空tuple A/B、target不足、不整合、memory外destinationはexit 2でwrite 0。 |
| 独立inventory敵対fixture `/tmp/.../inventory-adversarial.mjs` | 0 | 5/5。entry marker除去＋別surface残存、stale digest、`tracked:false`、Yasashiiのpublic root流用を各exit 1で検出。reportに`/Users/taisei`／一時absolute rootなし。 |
| 独立generic memory scope fixture | 0 | TODO／Notion TaskDB／projectの3件すべて、`explicit:true, operation:"save-memory", scopeChange:true`で**`saved / 1`**を再現。対応する`explicitMemoryRequest:true`版は`question / 0`。 |
| private candidate `bash .../memory-tools.sh`（引数なし） | 2 | shell入口からNode正本が実行され、Node CLIの正式usage errorを返した。必要な`secretary-store.mjs`／`markdown-lines.mjs`／`safe-fs.mjs`を含む実保存面はSprint 040 12/12で実行済み。 |
| `node --check`（candidate builder／inventory／edition test）、source repo `git diff --check a5011da^..a5011da` | 0 | 構文・whitespace error 0。 |

### 3版candidate／inventoryの実内容確認

- 3 candidateとも`.git`なし。candidate reportのrootは`agentic`／`yasashii`／`private-my-vault`の相対値だけで、
  実workspaceのabsolute pathを合否入力にしていない。
- 下流固定baseの必須markerは3種とも0件。candidate適用後はrules contract、memory-care Skill、runtime classifierの
  それぞれに3種があり、各entry本文へ対応付けて検査した。
- markerをrules contractから1件消し、他surfaceに同markerが残る敵対caseは`missing-marker`でexit 1となった。
  初回V-01のglobal marker偽PASSは解消した。
- Yasashii reportをAgentic candidate rootへ向けた敵対caseはexit 1。各版のcandidate rootを公開rootへ流用できない。
- stale body digest、`tracked:false`、candidate全tree ID不一致は各exit 1。candidate IDは全fileのpath／mode／bytesに依存する。
- inventory正本は17 unique surfaceを持つ。ただしreportの本文単位検査はedition mapping後の16 entryである。
  非適用copy 1件もcandidate treeに存在し全tree IDへ含まれるが、entry単位のdigest／tracked検査対象外である（V-02）。

### 初回findingの解消状況

#### P-01 `product` — **一部解消、一部残存**

`explicitMemoryRequest:true`かつdestinationがTODO／Notion TaskDB／projectの場合は、`scopeChange` flagの有無にかかわらず
`question / sideEffectCount=0 / writes=0`となった。memory／decision／topicは内部routeとして同turnに`saved / 1`を維持する。

一方、runtime classifier自身が受理する別の明示memory表現
`explicit:true, operation:"save-memory", target:"開始は9月", destination:<memory外>, scopeChange:true`では、
3 destinationすべてが`saved / 1`となった。`requiresConfirmation`のmemory境界が
`input.explicitMemoryRequest === true`だけを条件にして`input.scopeChange`とgeneric memory operationを見ないためである。

#### P-02 `product` — **解消**

空tuple A/B、target不足、targetとdisplayの不整合、memory外destinationは保存前exit 2となりfile／journal write 0。
`source=田中, certainty=hearsay, target=開始は9月`は`memory-meaning-v1`としてmemory正本とjournalへ保存され、
4 fieldを機械的に復元できた。通常の表記揺れはdedupeし、source／certainty等が異なるtupleは別件のまま維持した。

#### P-03 `product` — **解消**

固定baseからAgentic／Yasashii／privateの別Git-free candidateが作られ、各rootで専用fixture、Sprint 038、Sprint 010、
Git／Secret安全境界を実行した。1版の結果を他版へ昇格していない。Yasashii identity／style、private Notion／vault／
root guidance、protected copyは版固有fixtureとdigestで維持した。

#### V-01 `verification-infra` — **解消**

inventory testはreport内の各`candidateRoot`からentry本文を読み、candidate body digestとentry固有markerを比較する。
public root流用、global marker残存、stale digest、tracked falseの敵対caseをすべて拒否した。

### Retry 1 Findings

#### P-01-R1 `product` — generic明示memory経路ではscope変更が確認なしで保存される

`plugins/secretary/scripts/lib/conversation-contract.mjs`は`hasCurrentExplicitRequest`で
`explicitMemoryRequest`と`explicit + operation + target + destination`の2表現を明示依頼として受理する。
しかし`requiresConfirmation`の`memoryScopeBoundary`は前者だけを判定する。

独立fixture:

| Input | 期待 | 観測 |
|---|---|---|
| `explicit:true, operation:"save-memory", scopeChange:true, destination:"TODO"` | `question / 0` | `saved / 1` |
| 同、`destination:"Notion TaskDB"` | `question / 0` | `saved / 1` |
| 同、`destination:"project"` | `question / 0` | `saved / 1` |

同じdestinationの`explicitMemoryRequest:true`表現は`question / 0`なので、強い安全分類全体の崩壊ではない。
scope変更を示す入力表現によって結果が変わるP-01の不完全修正であり、AC10、C5、C15、C18に抵触する。

#### V-02 `verification-infra` — 各editionのentry単位検査は17件でなく16件

inventory正本は17件だが、builderの`candidateInventory`とinventory testは
`item.editions.includes(editionId)`でfilterする。このためAgentic／privateは`copy-yasashii`、Yasashiiは`copy-agentic`を除外し、
各edition reportの本文／digest／marker／tracked検査は16件である。候補全体digestは除外entryも覆い、
active copyは版固有fixtureで検査されるため、これ単独をproduct defectにはしない。ただし指定された各root 17 entryの
機械検査ではない。次回は17件すべてを各candidate rootでentry単位に検査するか、非適用entryも明示状態付きでreportへ残す必要がある。

### 下流実repoのread-only不変確認

#### Yasashii

- HEAD: `3c472dd9a2b5299f27741ae2c418094486b7d035`
- `git status --short`: 出力0
- `README.md`: `35361391ad9a74c9403f8a2cc20616b5e3aa0635d76a067c1022fb35b794b527`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `694c582a5200901a4669741956017aedcc242056620d051e9e621d0423d8de76`
- edition／Yasashii style: `663c14cc51b92a936a1dbaf34d5ab4f7ded65f20d57ad0ed645dfd3e8d9bf7b7` ／ `50c9df0ff79fb43d5e051eb0c42070e31393b210a7fb78076c6e7e6996b1699c`

#### private my-vault

- HEAD: `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`
- `git status --short`: 出力0
- `README.md`: `08046efc3648633b0e80f182c254755bb4e1a5e086607e1674abef22783ff293`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `58755995d733d454daad0da28ab98b83c0829f5f1c1ebfe6f0516d30bf78ef1f`
- edition: `29d70da3b1b9c6c48716488919a9de35a38c4087853363563f385eb07dacf7b9`
- Notion／vault-search: `8c40b2007c952b88a38165ef308dc723098ddca9e31cec3ec503d723a84c4527` ／ `54d0e7094a03497ceaeda5a48d753124763982f80bf1e60494034cb7faceca88`

開始値、初回feedback値、Retry 1終了値は一致した。両repoの旧source marker 3種は各0件で、実repoへの適用、checkout、
commit、branch、remote変更は0件。candidate側の同じprotected pathも固定base bytesを維持した。

### Retry 1 Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | 3版Sprint 040 fixtureでdecision／topic相当を質問0、各1件保存。 |
| 2 | PASS | request hedgeは質問前0。推量／伝聞の明示保存は同turn 1件。 |
| 3 | PASS | source／certainty／targetをmemoryとjournalから復元し、負fixtureも67/67で維持。 |
| 4 | PASS | 引用、非現在仮定、取消、過去照会write 0。削除2段階とSecret境界も回帰green。 |
| 5 | PASS | pending 1件、別話題失効、修正付き了承の同turn実行を3版で再実行。 |
| 6 | PASS | topic旧event不変、新訂正event 1、同訂正retry 0。 |
| 7 | PASS | 表記違い、別turn／operation相当、再retryでmemory／journal／commit追加0。 |
| 8 | PASS | source／certainty／訂正関係差は別件。空tuple A/Bは保存前拒否。 |
| 9 | PASS | checkpointはpartial `1/1/0`、retry `0/0/1`、再retry `0/0/0`。 |
| 10 | **FAIL** | P-01-R1。generic明示memory＋scopeChangeのmemory外3 destinationが`saved / 1`。 |
| 11 | **FAIL** | V-02。17 unique surfaceはあるが、各edition rootのentry単位検査は16件。 |
| 12 | PASS | 下流旧base marker 0、3 candidateでは各marker 3 surface。禁止旧marker／phrase 0。 |
| 13 | PASS | settings／daily／projects／templates／runtime／memory seam／golden／Sprint 010をinventoryへ収載。 |
| 14 | PASS | Sprint 038 67/67を各版で実行し、request／content、pending、訂正、retry、partialを維持。 |
| 15 | PASS | 3版別Git-free candidateで専用／Sprint 038／010／安全suite 0 FAIL。 |
| 16 | PASS | 3版共通の対象fixtureは同結果。Yasashii／private protected digest、Notion／vault／root docs不変。 |
| 17 | PASS | push、tag、Release、marketplace、cache、workspace、Mac mini、external service変更0。 |
| 18 | PASS | offline candidateだけをPASSとし、release／cache／new session／live反映と分離。 |
| 19 | **FAIL** | AC10／11と必須rubric閾値に未達。 |

### Retry 1 Rubric scores

| Rubric | Score | 根拠 |
|---|---:|---|
| C2 構文・整合 | **5/5** | Node構文、candidate ID、protected digest、版固有base／rootは整合。V-02はinventory検査範囲の問題として分離。 |
| C5 安全・規律 | **4/5** | Secret／削除／external／bulk／Git境界は維持したが、generic memory scope変更の確認漏れが残る。 |
| C6 無回帰 | **5/5** | 3版の専用・Sprint 038・Sprint 010・安全回帰は0 FAIL。既知accepted suiteの持越しFAILなし。 |
| C13 edition分離・互換 | **5/5** | 固定baseから3 candidateを別構築し、版固有fixture、protected bytes、実下流read-onlyを確認。 |
| C14 会話のMarkdown可読性 | **5/5** | 3版の現役Skill／golden／Sprint 010回帰がgreenで、partialの全成功表示や版固有copy逆流なし。 |
| C15 会話authorization・意味保存 | **4/5** | meaning保存と通常経路は成立したが、同じ明示memory依頼の入力表現でscope変更判定が分岐する。 |
| C18 明示memory authorization・内容冪等性 | **4/5** | pending、訂正、dedupe、checkpoint partial、3 candidateは成立。scope変更のrun-once範囲がgeneric表現で越境する。 |

### Safety／外部操作／Not-run

- 実下流repoのHEAD、status、protected digestは開始前後一致。製品repoもfeedback追記前はHEAD `c7bc7bb`、status clean。
- 実行は`/tmp`のfixture／candidate、read-only下流source、ローカルGit fixtureだけ。network、connector、live serviceは未使用。
- push、tag、GitHub Release、marketplace、installed cache、利用者workspace migration、Mac mini同期、external service writeは0件。
- UI／browser／screenshotは対象なし。installed cache、new session、loaded version、実利用者workspaceはNOT-RUNで、合格条件へ追加していない。
- 新しいcollector、統一attestation、live cache検査は要求していない。

### Evaluator self-review

- Generatorの会話履歴と自己評価を判定根拠にせず、spec、rubric、Sprint契約、state、progress、初回feedbackを読み直した。
- `a5011da`をGit archiveから展開し、固定baseの3 candidateを作り直した。初回P-01〜P-03／V-01を個別に再現確認した。
- wrapper greenだけで判定せず、scope入力表現、meaning復元、invalid tuple、marker局所性、stale digest、tracked宣言、public root流用を独立fixtureで検査した。
- 初回PASSのpending、訂正、通常dedupe、checkpoint partial／retry、安全境界は、変更candidateの3版suiteを再実行して証跡を更新した。
- Retry 1 findingを`product` 1件、`verification-infra` 1件へ分離した。V-02単独をproduct FAILへ昇格していない。
- safe harborを証拠の上限として守り、UI、live/cache/new session、attestationを追加条件にしていない。
- 書き込んだ正本は本feedbackだけ。製品、tests、spec、progress、state、Git commitは変更していない。

### Retry 1 最終Verdict

**FAIL — `implementation-issue`**

P-02、P-03、V-01は解消した。P-01は`explicitMemoryRequest`表現では解消したが、同じclassifierが受理する
generic明示memory表現ではscope変更が確認なしで保存される。AC10とC5／C15／C18のゼロ許容閾値に未達である。
加えて、各edition rootの17 entry本文検査を16件へfilterするV-02を、product findingと混同せず残す。

---

## Retry 2 fresh independent evaluation

### 判定

**FAIL**

- Failure classification: `implementation-issue`
- Retry 2 product findings: **1**
- Retry 2 verification-infra findings: **1**
- Retry 1残存finding解消: **P-01-R1、V-02**
- 初回解消済みfindingの回帰: **P-02、P-03、V-01は回帰なし**
- Escalation Recommendation: `none`

Retry 2の主目的だった旧互換memory表現のscope gateと、各edition 17/17 inventory検査は解消した。
Git-freeな`cb55f19`から3版candidateを再構築し、各版のSprint 040、Sprint 038、Sprint 010、
Git／Secret安全回帰、版固有fixtureは0 FAILだった。meaning復元、invalid tuple拒否、pending、訂正、dedupe、
checkpoint partial／commit-only retry、protected bytesも維持された。

一方、Retry 2差分はruntime classifierの明示依頼判定を`operation === "save-memory"`だけへ狭めた。
そのためSprint 038から受入済みの低リスク明示操作であるdecision保存、設定変更、Notion Task作成、TODO完了／持越し、
現在用件の文書作成が、3版すべてで`explicit / saved / 1`から`inferred / question / 0`へ回帰した。
Retry 1の同runtime classifierでは同じ6件が`explicit / saved / 1`だったため、新規product regressionである。

提供suiteがgreenなのは、Sprint 038 testがgolden fixtureの`classifierInput`をruntime classifierへ渡さず、
別のnatural-language runnerだけを評価するためである。この検証漏れを`verification-infra`へ分離するが、
最終failure kindは実製品classifierの回帰に基づく`implementation-issue`とする。

### 評価対象とcandidate識別

- Evaluated docs-state HEAD: `f235261bfe98fc5e23df5071ab0f1facff9fdf57`
- Retry 2 product／test candidate commit: `cb55f19dd37f97fff82185ca14b7a15ff96f85de`
- Retry 2開始HEAD: `ccd9b262cd7c42198968a003e353d9b551618493`
- Sprint固定base: `5b48b7ba0784aa9b9d6552aed5162fafbc831c99`
- `cb55f19`からdocs-state HEADまでの差分: `docs/sprints/state.md`だけ。製品／test bytesは同一。
- Branch: `codex/sprint-040-memory-authorization`
- Git-free clean archive: `/tmp/sprint-040-retry2-evaluator.LaQ16C/archive`。`git archive cb55f19`から展開し、`.git`なし。
- Candidate output: `/tmp/sprint-040-retry2-evaluator.LaQ16C/candidates`。reportは相対rootだけを持つ。
- UI／URL: なし。Skill、Node.js runtime classifier／CLI、実file／Git fixtureを評価対象とし、browser／screenshotは不要。

3版candidate IDはsorted relative path、mode、実bytesから再計算され、progressのhandoffと一致した。

| Edition | 固定base | Candidate ID | Files | inventory |
|---|---|---|---:|---:|
| Agentic | `5b48b7ba0784aa9b9d6552aed5162fafbc831c99` | `602083b2f0102c775114fa0383cfc6d448827ac3bbbaf7ea4ad8c8d32c00017b` | 624 | 17/17 unique |
| Yasashii | `3c472dd9a2b5299f27741ae2c418094486b7d035` | `485d8f38d47ac938e960f1fe1c9dc46698693ecfb86a004617d0c216f4076ffe` | 601 | 17/17 unique |
| private my-vault | `8e0796c9aba49d9a3dccb020912b0e1cf3989abf` | `e7a0780797a45f0f41c5237fd23306327dc1cf028038ae07ad18a3cfd527bbae` | 711 | 17/17 unique |

### 実行commandと結果

| Command / surface | Exit | PASS／FAILと観測 |
|---|---:|---|
| Git-free archive `SPRINT040_YASASHII_SOURCE=... SPRINT040_PRIVATE_SOURCE=... bash scripts/sprint-040-regression.sh` | 0 | build 3/3、inventory 7/7、3 edition suite 0 FAIL。上記candidate IDを再現。 |
| 各版 `scripts/sprint-040-candidate-suite.sh`（wrapper内） | 0 | 各版Sprint 040 13/13、Sprint 038 67/67、historical classifier 14/14、historical path 3/3、Sprint 010 56/56、安全境界71/71。Agentic edition 2/2、Yasashii／private edition 3/3、下流版ではprivate相当9/9。 |
| `node scripts/sprint-040-candidate-build.mjs --output ...` | 0 | 固定baseから3つの別Git-free candidateを再構築。ID／file数はhandoffと一致。 |
| `node scripts/sprint-040-inventory-test.mjs --candidate-report ...` | 0 | 7/7。各版17/17 unique entryの実本文、candidate digest、entry固有marker宣言、禁止marker／phrase、tracked性、candidate全tree digestを検査。 |
| 独立scope fixtureを3 candidateで実行 | 0 | 各版12/12。旧互換`explicit:true + operation:save-memory + scopeChange:true`はTODO／Notion TaskDB／project=`question / 0`、memory／decision／topic=`saved / 1`。`scopeChange:false`とabsentでもmemory外3 destinationは`question / 0`。 |
| 独立meaning fixture | 0 | 9/9。`source=田中 / certainty=hearsay / target=開始は9月 / destination=topic`をmemoryとjournalの`memory-meaning-v1`から復元。同意味表記揺れは追加0、source差は別件。空tuple、target不足、不整合、TODO destinationはexit 2／write 0。 |
| 独立inventory敵対fixture | 0 | 5/5。移設reportはabsolute workspace参照なしでPASS。16 entry化、Yasashiiのpublic root流用、markerを別entryへ移したglobal偽PASS、`tracked:false`を各exit 1で検出。 |
| Retry 2 runtime classifierの独立既存契約fixture | 0 | 3版それぞれ6/6で回帰を再現。`save / update / create-task / complete / carry / create`が全件`inferred / question / 0`。 |
| Retry 1 `a5011da`の同runtime classifierへ同じ6件 | 0 | `NONMEMORY_EXPECTED_PASS=6 FAIL=0`。全件`explicit / saved / 1`。Retry 2で導入された差分であることを確認。 |
| private candidate `bash plugins/secretary/skills/memory-care/scripts/memory-tools.sh`（引数なし） | 2 | shell入口からNode正本が実行され、正式usage errorを返した。必要な`secretary-store.mjs`／`markdown-lines.mjs`／`safe-fs.mjs`を含む保存面は専用suite 13/13で実行済み。 |
| 変更Node entrypointの`node --check`、inventory JSON parse、`git diff --check cb55f19^ cb55f19` | 0 | 構文／JSON／whitespace error 0。 |

### Retry 1残存findingと初回findingの再確認

#### P-01-R1 `product` — **解消**

`requiresConfirmation`は`explicitMemoryRequest`と旧互換`explicit + operation:"save-memory"`の両方を
memory scope gateへ通し、`scopeChange` flagに依存せずdestination allowlistで停止する。
TODO／Notion TaskDB／projectはflagがtrue／false／absentのいずれでも`question / 0`、
memory／decision／topicは内部routeとして`saved / 1`だった。AC10のscope変更境界は解消した。

#### V-02 `verification-infra` — **解消**

builderはedition filterでentryを捨てず、全17 entryへ`appliesToEdition`を付ける。
inventory testは各版で17件、正本と同じID順、17 unique、実本文digest、entry marker宣言、tracked性を検査した。
16件化をexit 1で拒否し、非適用copyも各candidate rootの実本文として検査対象になった。

#### P-02／P-03／V-01 — **解消維持**

- meaning tupleはmemory／journalから機械復元でき、空tuple、必須target不足、表示不整合、memory外destinationを保存前に拒否した。
- 3版の別Git-free candidate、版固有fixture、Sprint 038／010、安全回帰、protected bytesを別々に実行した。
- candidate reportは相対rootだけを持ち、移設後もinventory 7/7。public root流用、global marker移動、stale／tracked不整合を拒否した。
- pending一件束縛、別話題失効、修正付き了承、append-only訂正、content dedupe、checkpoint `partial`→commit-only retry→再retry 0は3版13/13と実file fixtureで回帰なし。

### Retry 2 Findings

#### P-04-R2 `product` — memory修正のために既存の低リスク明示操作を`inferred`へ回帰させる

`plugins/secretary/scripts/lib/conversation-contract.mjs:8-10`の`hasCurrentExplicitRequest`は、Retry 1まで
`explicit && operation && target && destination`を明示依頼として扱っていた。Retry 2はこれを
`operation === "save-memory"`へ狭めた。`requiresConfirmation`側のmemory scope修正は同file `33-40`で
独立して成立しており、一般明示操作の分類を狭める必要はない。

Sprint 038の受入済みgolden fixtureは、低リスク明示操作を次のように表す。

| 既存case相当 | classifier input | Retry 1 | Retry 2観測 |
|---|---|---|---|
| decision保存 | `explicit:true, operation:"save", destination:"memory/decisions"` | `explicit / saved / 1` | `inferred / question / 0` |
| 設定変更 | `operation:"update", destination:"preferences.md"` | `explicit / saved / 1` | `inferred / question / 0` |
| Notion Task作成 | `operation:"create-task", destination:"Notion TaskDB"` | `explicit / saved / 1` | `inferred / question / 0` |
| TODO完了 | `operation:"complete", destination:"inbox/todo.md"` | `explicit / saved / 1` | `inferred / question / 0` |
| TODO持越し | `operation:"carry", destination:"inbox/todo.md"` | `explicit / saved / 1` | `inferred / question / 0` |
| 現在用件の文書作成 | `operation:"create", destination:"docs"` | `explicit / saved / 1` | `inferred / question / 0` |

この6件を3 candidateへ直接通し、各版6/6で同じ回帰を再現した。decision保存はmemory内部routeそのものであり、
明示依頼を内部分類後に`inferred`へ戻して再質問するためC18にも直接抵触する。他の5件はSprint 038で確定した
低リスク明示依頼のrun-onceを壊す。C6、C15、C18のゼロ許容閾値に抵触する。

#### V-03 `verification-infra` — Sprint 038 greenがruntime classifierのgolden入力を実行しない

`scripts/sprint-038-test.mjs:26-46`はfixture各caseを回すが、`classifierInput`を
`conversation-contract.mjs`へ渡さず、別実装`runConversationScenario`へ自然文とpreconditionだけを渡す。
そのためgolden fixture上は`explicit`の6件をruntime classifierが`inferred`へ変えても67/67になる。

Retry 2専用testも`explicitMemoryRequest`と`operation:"save-memory"`だけを直接分類し、既存の
`save / update / create-task / complete / carry / create`を通さない。このためwrapper全体がgreenのままP-04-R2を見逃す。
これは検証基盤のfindingであり、単独で製品FAILへ昇格していない。最終FAILはP-04-R2に基づく。

### 下流実repoのread-only不変確認

#### Yasashii

- HEAD: `3c472dd9a2b5299f27741ae2c418094486b7d035`
- `git status --short`: 出力0
- `README.md`: `35361391ad9a74c9403f8a2cc20616b5e3aa0635d76a067c1022fb35b794b527`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `694c582a5200901a4669741956017aedcc242056620d051e9e621d0423d8de76`
- edition／Yasashii style: `663c14cc51b92a936a1dbaf34d5ab4f7ded65f20d57ad0ed645dfd3e8d9bf7b7` ／ `50c9df0ff79fb43d5e051eb0c42070e31393b210a7fb78076c6e7e6996b1699c`

#### private my-vault

- HEAD: `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`
- `git status --short`: 出力0
- `README.md`: `08046efc3648633b0e80f182c254755bb4e1a5e086607e1674abef22783ff293`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `58755995d733d454daad0da28ab98b83c0829f5f1c1ebfe6f0516d30bf78ef1f`
- edition: `29d70da3b1b9c6c48716488919a9de35a38c4087853363563f385eb07dacf7b9`
- Notion／vault-search: `8c40b2007c952b88a38165ef308dc723098ddca9e31cec3ec503d723a84c4527` ／ `54d0e7094a03497ceaeda5a48d753124763982f80bf1e60494034cb7faceca88`

初回、Retry 1、Retry 2の値は一致した。candidate側もreportの`protectedBefore`／`protectedAfter`が一致し、
Yasashii identity／style、private Notion／vault／root guidance／repo-owned docsは固定base bytesを保持した。
実下流repoへのapply、checkout、commit、branch、remote変更は0件である。

### Retry 2 Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | 明示memoryのdecision／topic相当は`explicitMemoryRequest`と旧互換`save-memory`で質問0、各1件保存。 |
| 2 | PASS | request hedgeは質問前0。推量／伝聞の明示保存は同turn 1件。 |
| 3 | PASS | source／certainty／target／destinationをmemory／journalから復元し、不整合negativeを拒否。 |
| 4 | PASS | 引用、非現在仮定、取消、過去照会write 0。削除2段階も安全回帰green。 |
| 5 | PASS | pending 1件、別話題失効、修正付き了承の同turn実行を3版で確認。 |
| 6 | PASS | topic旧event不変、新訂正event 1、同訂正retry 0。 |
| 7 | PASS | 表記違い、別turn／operation相当、再retryでmemory／journal／commit追加0。 |
| 8 | PASS | source／certainty／訂正関係差は別件。空tuple等は保存前拒否。 |
| 9 | PASS | checkpointはpartial `1/1/0`、retry `0/0/1`、再retry `0/0/0`。 |
| 10 | PASS | Secret／削除／destructive／external／bulkと、flag true／false／absentのmemory外scope変更は質問前0。 |
| 11 | PASS | 各版17/17 unique entryの実本文、digest、entry marker、tracked性を検査し、16件化等を拒否。 |
| 12 | PASS | 下流旧base marker 0、3 candidateの現行marker 3 surface、禁止旧marker／phrase 0。 |
| 13 | PASS | settings／daily／projects／templates／runtime／memory seam／golden／Sprint 010を17 entryへ収載。 |
| 14 | **FAIL** | P-04-R2／V-03。Sprint 038 fixtureの受入済みexplicit classifier input 6件とruntime classifierが不一致。 |
| 15 | **FAIL** | wrapperは3版0 FAILだが、触ったruntime classifierの既存golden入力を実行せずP-04-R2を見逃すため、無回帰証拠として成立しない。 |
| 16 | **FAIL** | protected bytesと版固有fixtureはPASSしたが、3 candidate共通のruntime authorizationが同じ6件で誤分類。 |
| 17 | PASS | 実source remoteへのpush、tag、Release、marketplace、cache、workspace、Mac mini、external service変更0。 |
| 18 | PASS | offline candidateだけを報告し、release／cache／new session／live反映と分離。 |
| 19 | **FAIL** | 独立EvaluatorでC6／C15／C18とAC14〜16が必須閾値未達。 |

### Retry 2 Rubric scores

| Rubric | Score | 根拠 |
|---|---:|---|
| C2 構文・整合 | **5/5** | Node構文、JSON、candidate ID、17-entry report、base／root、protected digestは整合。 |
| C5 安全・規律 | **5/5** | scope gate、Secret、削除、external、bulk、path／Git所有境界、下流read-onlyは全て維持。 |
| C6 無回帰 | **4/5** | 提供suiteはgreenだが、Retry 2差分で既存の明示低リスク6操作が3版すべて質問へ回帰した。 |
| C13 edition分離・互換 | **5/5** | 固定baseから3 candidateを別構築し、17/17 inventory、版固有fixture、protected bytes、実下流read-onlyを確認。 |
| C14 会話のMarkdown可読性 | **5/5** | 3版のSkill／copy／Sprint 010回帰、partial表示、edition差に可読性回帰なし。 |
| C15 会話authorization・意味保存 | **4/5** | meaning／pending／安全境界は成立したが、既存の明示低リスク6入力を`inferred`へ誤分類する。 |
| C18 明示memory authorization・内容冪等性 | **4/5** | P-01-R1／V-02は解消したが、既存の`operation:"save" + memory/decisions`内部routeを`inferred`へ戻して再質問する。 |

### Safety／外部操作／Not-run

- 評価はGit-free `/tmp` candidate／fixture、read-only下流source、隔離ローカルGit fixtureだけで実施した。network、connector、live serviceは未使用。
- 安全suite内のpush検査は`/tmp`のlocal bare remoteだけ。実source remoteへのpush、tag、GitHub Release、marketplace、installed cache、利用者workspace migration、Mac mini同期、external service writeは0件。
- 実下流2repoは固定HEAD、clean status、protected digest不変。製品repoはfeedback追記前にHEAD `f235261`、status cleanだった。
- UI／browser／screenshotは対象なし。installed cache、new session、loaded version、実利用者workspaceはNOT-RUNで、合格条件へ追加していない。
- 新しいcollector、統一attestation、live cache検査は要求していない。

### Evaluator self-review

- Generatorの会話履歴と自己評価を判定根拠にせず、spec、rubric、Sprint契約、state、progress、初回／Retry 1 feedback、Retry 2実diffを読み直した。
- `cb55f19`をGit archiveから展開し、固定baseから3版candidateを再構築した。candidate ID、各版suite、inventory 17/17、protected bytesを独立確認した。
- 残存P-01-R1をflag trueだけでなくfalse／absentでも、V-02を16件化／public root／global marker／tracked性／移設reportで敵対的に確認した。
- 初回解消済みmeaning、invalid tuple、3版分離、pending、訂正、dedupe、checkpoint partial、安全境界を変更candidateで再実行した。
- Retry 2 diffの`hasCurrentExplicitRequest`変更を近傍だけでなく、Sprint 038で受入済みの低リスクexplicit操作へ戻して比較した。Retry 1 moduleの同一6件が6/6 PASS、Retry 2の3版が各6/6回帰であることを確認した。
- findingを`product` 1件、`verification-infra` 1件へ分離した。V-03単独をproduct FAILへ昇格していない。
- safe harborを証拠の上限として守り、UI、live/cache/new session、attestationを追加条件にしていない。
- 書き込んだ正本は本feedbackだけ。製品、tests、spec、progress、state、Git commitは変更していない。

### Retry 2 最終Verdict

**FAIL — `implementation-issue`**

P-01-R1とV-02は解消し、初回P-02／P-03／V-01の修正も維持した。しかしP-01修正と同じdiffで、
一般の明示依頼判定まで`save-memory`限定へ狭めたため、既存の低リスク明示操作6件が3版すべて再質問へ回帰した。
C6／C15／C18は5/5必須であり未達である。Sprint 038 suiteのgreenだけでは、runtime classifierへ
golden `classifierInput`を通していないためこの回帰を否定できない。

## ユーザー選択A 限定Retry fresh independent evaluation

### 判定

**PASS**

- Failure classification: なし
- Product findings: **0**
- Verification-infra findings: **0**
- Retry 2残存finding解消: **P-04-R2、V-03**
- 初回／Retry 1で解消済みfinding: **P-01-R1、P-02、P-03、V-01、V-02は回帰なし**
- Escalation Recommendation: `none`

ユーザーが選んだ限定Retryの範囲で、P-04-R2とV-03は解消した。candidate commit `09267e3`の
Git-free archiveから3版candidateを再構築し、既存6操作は3版とも`explicit / saved / 1`へ戻った。
memory scope gateはmemory保存操作にだけ適用され、TODO／Notion TaskDB／projectは`scopeChange`が
true／false／absentの全状態で`question / 0`、memory／decision／topicは同じ3状態で`saved / 1`だった。

Sprint 038の全35 golden caseは必須`classifierInput`と`execution`をrunnerへ渡し、実runtime
`executeConversation`から`classifyIntent`と`requiresConfirmation`を経たintent／response／side effectで
実file副作用を制御した。`classifierInput`欠落、runtime判定tamper、旧6操作を再び`save-memory`限定へ戻す
3つの負fixtureは全て`exit 1`となり、runnerの手書き理解・期待値だけではgreenにならないことを確認した。

meaning、invalid tuple、pending、訂正、content dedupe、checkpoint partial、3版builder、各版17/17 inventory、
private入口／依存、safe Git／Secret、protected bytesも0 FAILである。新しいfindingはない。

### 評価対象とcandidate識別

- Evaluated docs-state HEAD: `1b7c284093293d6409ffa5c3c5ac66eb9b2fe748`
- Product／test candidate commit: `09267e3`
- 限定Retry開始HEAD: `50934d6`
- Sprint固定base: `5b48b7ba0784aa9b9d6552aed5162fafbc831c99`
- `09267e3`からdocs-state HEADまでの差分: `docs/sprints/state.md`だけ。製品／test bytesは同一。
- Branch: `codex/sprint-040-memory-authorization`
- Git-free archive: `/tmp/sprint-040-limited-evaluator.YqNqhJ/archive`。`git archive 09267e3`から展開し、`.git`なし。
- Candidate output: `/tmp/sprint-040-limited-evaluator.YqNqhJ/candidates`。reportは相対rootだけを持つ。
- UI／URL: なし。Skill、Node.js runtime、CLI、実file／Git fixtureが評価対象で、browser／screenshotは不要。

3版candidate IDはsorted relative path、mode、実bytesから再計算され、progressのhandoffと一致した。

| Edition | 固定base | Candidate ID | Files | inventory |
|---|---|---|---:|---:|
| Agentic | `5b48b7ba0784aa9b9d6552aed5162fafbc831c99` | `428b3ff435ee63bf47837e38792873264e14336e85ca1190bd823e80cbc67e0a` | 624 | 17/17 unique |
| Yasashii | `3c472dd9a2b5299f27741ae2c418094486b7d035` | `bb194d55a3cff4fe6fbfdb588f1db665d4fcd2ed4446482410ca9dc525490cfd` | 601 | 17/17 unique |
| private my-vault | `8e0796c9aba49d9a3dccb020912b0e1cf3989abf` | `95b7c5346dd9173817e40479e7599d39f4660f3efbb2b6d6122ab723b148bc84` | 711 | 17/17 unique |

### 実行commandと結果

| Command / surface | Exit | PASS／FAILと観測 |
|---|---:|---|
| Git-free archiveで`SPRINT040_YASASHII_SOURCE=... SPRINT040_PRIVATE_SOURCE=... bash scripts/sprint-040-regression.sh` | 0 | build 3/3、inventory 7/7、3 edition suite 0 FAIL。上記candidate IDを再現。 |
| 各版`scripts/sprint-040-candidate-suite.sh`（wrapper内） | 0 | 各版Sprint 040 15/15、Sprint 038 67/67、historical classifier 14/14、historical path 3/3、Sprint 010 56/56、安全境界71/71。Agentic edition 2/2、Yasashii／private edition 3/3、下流版private相当9/9。 |
| `node scripts/sprint-040-candidate-build.mjs --public-root . --yasashii-source ... --private-source ... --output ...` | 0 | 固定baseから3つの別Git-free candidateを再構築。ID／file数はhandoffと一致。 |
| 3 candidateへの独立authorization敵対fixture | 0 | 各版、旧6操作6/6、`scopeChange` 3状態を含む非memory scope非漏洩18/18、2表現×6 destination×3状態のmemory scope 36/36、Sprint 038 golden runtime 35/35。 |
| `classifierInput`を1件欠落させたSprint 038負fixture | 1（期待値） | `explicit-save-decision:classifierInput`を拒否し、`SPRINT038_PASS=66 SPRINT038_FAIL=1`。 |
| runtime `classifyIntent`のexplicit判定をtamperしたSprint 038負fixture | 1（期待値） | explicit golden群が失敗。手書きresponse／snapshotだけではgreenにならない。 |
| `hasCurrentExplicitRequest`を旧`save-memory`限定へ戻したSprint 038負fixture | 1（期待値） | decision、setting、Notion、TODO、文書等のgoldenが失敗し、P-04-R2回帰を拒否。 |
| private candidate `bash plugins/secretary/skills/memory-care/scripts/memory-tools.sh`（引数なし） | 2（期待値） | shell入口がNode正本へ到達し、正式usage errorを返した。`secretary-store.mjs`／`markdown-lines.mjs`／`safe-fs.mjs`は3/3存在。 |
| `node scripts/sprint-038-patch-002-windows-test.mjs` | 0 | Darwin上のNode-native path境界12/12。Windows native実runへは昇格しない。 |
| `bash scripts/sprint-039-patch-002-regression.sh` | 0 | Patch 002 23/23、Patch 001 16/16、Sprint 039 69/69を含むwrapper 6/6。 |
| 変更Node entrypoint 5本の`node --check` | 0 | 5/5。 |
| repo checkoutで`git diff --check 09267e3^ 09267e3` | 0 | whitespace error 0。Git-free archiveから同commandを試した1回は`.git`がないためexit 1となり、正しいrepo面で再実行してPASS。 |

### P-04-R2／V-03の解消確認

#### P-04-R2 `product` — **解消**

`hasCurrentExplicitRequest`は、memory専用のscope gateとは独立して、`explicit && operation && target && destination`を
一般の低リスク明示操作として再び認識する。3版candidateへdecision保存、設定変更、Notion Task作成、TODO完了、
TODO持越し、現在用件の文書作成を直接通すと、各版6/6で`explicit / saved / 1`だった。

同じ6操作へ`scopeChange` true／false／absentを付けた18 caseも全て`saved / 1`であり、memory専用gateの漏洩はない。
一方、memory保存は`explicitMemoryRequest`と旧互換`explicit + operation:save-memory`の両表現で、
TODO／Notion TaskDB／projectが3状態とも`question / 0`、memory／decision／topicが3状態とも`saved / 1`だった。
C5／C6／C15／C18の境界が同時に成立する。

#### V-03 `verification-infra` — **解消**

Sprint 038 testは全caseへ`classifierInput`を必須化し、runnerはそれを`executeConversation`へ渡す。
runtimeは`classifyIntent`と`requiresConfirmation`を実行し、その結果がrunnerの実file更新可否を決める。
3版の35/35 goldenを直接比較し、版別suiteでは各67/67を確認した。

敵対確認では、`classifierInput`欠落がschema検査でexit 1、runtime判定tamperがexplicit群の比較でexit 1、
P-04-R2の旧実装再注入が既存6操作を含むgolden比較でexit 1となった。golden側の`expected`、応答断片、
snapshotはrunnerへ判定入力として渡されず、実runtimeが壊れたままoracleだけでgreenになる経路はない。

### 主要回帰と3版境界

- meaningは`source=田中 / certainty=hearsay / target=開始は9月 / destination=memory`をmemory／journalの
  `memory-meaning-v1`から復元する。空tuple A/B、target不足、表示不整合、memory外destinationはexit 2／write 0。
- request/content hedge、引用、非現在仮定、取消、過去照会、pending一件束縛、別話題失効、修正付き了承を回帰した。
- topic旧event byte不変＋訂正event 1、表記揺れ／別turn／別operation相当retry 0、source／certainty差は別件。
- checkpoint failureは`partial`でmemory／journal／commit=`1/1/0`、retry=`0/0/1`、再retry=`0/0/0`。
- inventoryは各版17/17 unique entryの実本文、candidate digest、entry marker、禁止旧marker／phrase、tracked性を検査。
- private candidateはNode入口と必要依存3本が実在し、Notion／vault routingとroot guidanceを保つ。
- safe Git／Secret 71/71は所有path commit、既存stage／unstaged／untracked保持、資格情報拒否、
  local bare remoteだけのpush／rollbackを確認した。実remoteへのpushはない。

### 下流実repoのread-only不変確認

#### Yasashii

- HEAD: `3c472dd9a2b5299f27741ae2c418094486b7d035`
- `git status --short`: 出力0
- `README.md`: `35361391ad9a74c9403f8a2cc20616b5e3aa0635d76a067c1022fb35b794b527`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `694c582a5200901a4669741956017aedcc242056620d051e9e621d0423d8de76`
- edition／Yasashii style: `663c14cc51b92a936a1dbaf34d5ab4f7ded65f20d57ad0ed645dfd3e8d9bf7b7` ／ `50c9df0ff79fb43d5e051eb0c42070e31393b210a7fb78076c6e7e6996b1699c`

#### private my-vault

- HEAD: `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`
- `git status --short`: 出力0
- `README.md`: `08046efc3648633b0e80f182c254755bb4e1a5e086607e1674abef22783ff293`
- `AGENTS.md`: `dd4343eb57b108bc54f867f458040d3315060da4ccf3df476106323401f7b5da`
- `docs/spec.md`: `58755995d733d454daad0da28ab98b83c0829f5c1ebfe6f0516d30bf78ef1f`
- edition: `29d70da3b1b9c6c48716488919a9de35a38c4087853363563f385eb07dacf7b9`
- Notion／vault-search: `8c40b2007c952b88a38165ef308dc723098ddca9e31cec3ec503d723a84c4527` ／ `54d0e7094a03497ceaeda5a48d753124763982f80bf1e60494034cb7faceca88`

初回、Retry 1、Retry 2、今回の値は一致した。candidate reportの`protectedBefore`／`protectedAfter`も一致し、
Yasashii identity／style、private Notion／vault／root guidance／repo-owned docsは固定base bytesを保持した。
実下流repoへのapply、checkout、commit、branch、remote変更は0件である。

### 限定Retry Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | 明示memoryのdecision／topic相当は質問0、同turn各1件保存。旧6操作も3版6/6でrun-once。 |
| 2 | PASS | request hedgeは質問前0。推量／伝聞の明示保存は同turn 1件。 |
| 3 | PASS | source／certainty／target／destinationを正本から復元し、欠落・反転・追加negativeを拒否。 |
| 4 | PASS | 引用、非現在仮定、取消、過去照会write 0。保存済み取消は削除2段階。 |
| 5 | PASS | pending 1件、別話題失効、修正付き了承は同turnで修正版1件・再確認0。 |
| 6 | PASS | topic旧event不変、新訂正event 1、同訂正retry 0。 |
| 7 | PASS | 表記違い、別turn／operation相当、再retryでmemory／journal／commit追加0。 |
| 8 | PASS | 否定／条件／source／certainty／訂正関係差を別意味として保持。 |
| 9 | PASS | checkpointはpartial `1/1/0`、retry `0/0/1`、再retry `0/0/0`。 |
| 10 | PASS | Secret／削除／destructive／external／bulkとmemory外scope変更は確認前0。3状態を両memory表現で確認。 |
| 11 | PASS | 各版17/17 unique entryの実path、本文、digest、entry marker、tracked性を検査。 |
| 12 | PASS | 3 candidateの現行marker各3 surface、禁止旧marker／phrase 0。 |
| 13 | PASS | settings／daily／projects／templates／runtime／memory seam／golden／Sprint 010を17 entryへ収載。 |
| 14 | PASS | Sprint 038 fixtureへclassifierInputを必須化し、request/content hedge、pending、訂正、retry、partialをruntime経由で67/67。 |
| 15 | PASS | 3版専用offline suite、共通安全回帰、Git-free gateが各版0 FAIL。1版の結果を流用していない。 |
| 16 | PASS | 3版の共通runtime authorization／meaning／idempotencyが一致し、版固有protected bytes不変。 |
| 17 | PASS | push、tag、Release、marketplace、cache、workspace、Mac mini、external service変更0。 |
| 18 | PASS | source／offline PASSだけを報告し、release／cache／new session／loaded version未反映と分離。 |
| 19 | PASS | fresh独立EvaluatorでC2／C5／C6／C13／C14／C15／C18が全て5/5、本AC1〜19を満たす。 |

### 限定Retry Rubric scores

| Rubric | Score | 根拠 |
|---|---:|---|
| C2 構文・整合 | **5/5** | Node check 5/5、JSON／inventory、candidate ID、17/17 report、base／root、protected digest、diff checkが整合。 |
| C5 安全・規律 | **5/5** | scope gate、Secret、削除、external、bulk、path／Git所有境界、下流read-onlyに違反0。 |
| C6 無回帰 | **5/5** | 3版wrapper、Sprint 038／010、安全71、近傍Windows 12、Sprint 039 wrapper 6が全て0 FAIL。P-04再注入も負fixtureで拒否。 |
| C13 edition分離・互換 | **5/5** | 固定baseから3 candidateを別構築し、各17/17 inventory、版固有fixture、private入口、protected bytesを確認。実下流変更0。 |
| C14 会話のMarkdown可読性 | **5/5** | 3版Skill／copy／Sprint 010回帰、partialの完了／未完了分離、edition固有表現を維持。 |
| C15 会話authorization・意味保存 | **5/5** | 全35 goldenを実runtimeへ通し67/67。旧6操作、scope非漏洩、meaning、pending、安全境界、応答状態に不一致0。 |
| C18 明示memory authorization・内容冪等性 | **5/5** | memory scope 36/36、訂正／dedupe／partial、各版17/17、禁止旧marker 0、offline／live分離が成立。 |

### Safety／外部操作／Not-run

- 評価はGit-free `/tmp` candidate／負fixture、read-only下流source、隔離ローカルGit fixtureだけで実施した。network、connector、live serviceは未使用。
- 安全suite内のpushは`/tmp` local bare remoteだけ。実source remoteへのpush、tag、GitHub Release、marketplace、installed cache、利用者workspace migration、Mac mini同期、external service writeは0件。
- 実下流2repoは固定HEAD、clean status、protected digest不変。製品repoはfeedback追記前にHEAD `1b7c284`、status clean。
- UI／browser／screenshotは対象なし。Windows native、installed cache、new session、loaded version、実利用者workspaceはNOT-RUNで、合格条件へ追加していない。
- 新しいcollector、統一attestation、live cache検査は要求していない。

### Evaluator self-review

- Generatorの会話履歴や自己評価を判定根拠にせず、spec、rubric、Sprint契約、state、progress、初回／Retry 1／Retry 2 feedback、限定Retry実diffを読み直した。
- `09267e3`をGit archiveから展開し、固定baseから3版candidateを再構築した。candidate ID、版別suite、inventory 17/17、protected bytesを独立確認した。
- P-04は旧6操作の通常caseだけでなく、`scopeChange` 3状態を付けた18 caseでmemory gate非漏洩を確認した。memory scopeは新旧2表現、外部／内部各3 destination、3状態の36 caseで確認した。
- V-03は全35 goldenのruntime結果比較に加え、classifierInput欠落、runtime tamper、旧P-04再注入を別copyへ行い、全てexit 1になることを確認した。
- meaning、invalid tuple、pending、訂正、dedupe、checkpoint partial、private入口／依存、安全Git／Secret、近傍回帰を変更candidateで再実行した。
- finding分類を再点検し、新しい`product`／`verification-infra` findingは0件。過去FAILは書き換えず、本節を追記した。
- safe harborを証拠の上限として守り、UI、live/cache/new session、attestationを追加条件にしていない。
- 書き込んだ正本は本feedbackだけ。製品、tests、spec、progress、state、Git commitは変更していない。

### 限定Retry 最終Verdict

**PASS**

P-04-R2とV-03は解消し、初回／Retry 1で解消済みのfindingも回帰していない。3版candidateは同じ
authorization、意味保存、内容冪等性を持ち、memory外scope変更だけを確認前0件で停止する。
全AC1〜19とC2／C5／C6／C13／C14／C15／C18の5/5必須閾値を満たす。

これはsource／offline candidateのPASSである。push、tag、Release、marketplace、installed cache、
利用者workspace、Mac mini、new session、loaded version、external serviceへの反映は未実行である。
