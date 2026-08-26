# Sprint 040 Patch 001 — Generator progress

## 結果

3版handoffをschema 3へ更新し、下流editionごとの `parity`／`adapted`／`supporting` を排他的にした。
builderは固定baseを実repoのcurrent HEADへcheckoutせず `git archive <fixed commit>` から展開し、同一runで
read／copy／write／execute／protect trace、declared input union、固定baseからのactual candidate diff、
最終candidate IDを機械算出する。公開Sprint 040で合格済みの会話・memory製品bytesは変更していない。

## 実装

- `scripts/fixtures/sprint-040/downstream-handoff.json`: schema 3、edition別role、固定base、protected digest、旧candidate IDを正本化。
- `scripts/fixtures/sprint-040/legacy-schema2-handoff.json`: schema 2欠陥の集合観測入力を固定。誤ったunion 27を期待値にしない。
- `scripts/sprint-040-candidate-build.mjs`: 指定commit archive、role検証、実mutation／actual diff照合、trace、candidate identityを同一runで生成。
- `scripts/sprint-040-handoff-test.mjs`: 正常manifestと、未宣言mutation／role overlap／unused declaration／stale pathの4負fixture。
- `scripts/sprint-040-source-snapshot.mjs`: 実下流repoのHEAD、branch、status、staged、remote、protected digestをread-only取得。
- `scripts/sprint-040-inventory-test.mjs`: schema 3、role排他、declared union、actual diff分類、両下流のSprint 038 adaptedを検証。
- `scripts/sprint-040-regression.sh`: 3版suite、2空directory再現、下流before/after byte一致を一つのpre-write dry-runへ接続。

## schema 2欠陥の再現

`node scripts/sprint-040-handoff-test.mjs ...` はfixtureの配列から次を導出した。

- `exactCommonPaths`: 23
- `yasashiiExactPaths`: 5
- intersection: 0
- union: 28
- fixed-baseからのobserved actual diff: 25
- builder mutationの未宣言path: `scripts/sprint-038-test.mjs` 1件

修正後の合否には上記件数を使わず、schema 3のroleと実行traceから毎回集合を導出する。

## 修正後のedition別集合

| Edition | parity | adapted | supporting | declared union | actual diff | role overlap | unclassified diff |
|---|---:|---:|---:|---:|---:|---:|---:|
| Agentic whole tree | 628 | 0 | 0 | 628 | N/A（Git-free source tree自身） | 0 | 0 |
| Yasashii | 29 | 3 | 5 | 37 | 28 | 0 | 0 |
| private my-vault | 26 | 6 | 6 | 38 | 32 | 0 | 0 |

共通parity 26 pathはmanifestの `sharedParity` から導出する。Yasashii固有parityは
`daily`／`memory-care`／`projects`／`settings` の4 Skill、adaptedは
`plugins/secretary/skills/secretary/SKILL.md`、`scripts/sprint-010-regression.sh`、
`scripts/sprint-038-test.mjs`。supportingはREADME、root AGENTS、repo spec、edition identity、Yasashii styleの5 path。

private固有adaptedは `daily`／`memory-care`／`projects`／`secretary`／`settings` の5 Skillと
`scripts/sprint-038-test.mjs`。supportingはREADME、root AGENTS、repo spec、edition identity、
Notion Task routing、vault-searchの6 path。`scripts/sprint-038-test.mjs` は両下流でadaptedであり、parityとの重複は0。
各adapted recordは入力種別、transformer ID、固定base／public source上の変換anchor、`applicationCount: 1`、
最終SHA-256を持ち、宣言欠落・余分なtransformer宣言もbuild前に拒否する。

actual diff pathは次のとおり。各pathのbefore／after mode・SHA-256はcandidate reportへ同一runで記録した。

- Yasashii 28: conversation inventory、conversation contract、agentic/yasashii copy、safety、runtime classifier、
  daily、memory-care本体／Node seam、projects、secretary、settings、AGENTS/CLAUDE template、golden fixture、
  schema 3 handoff、legacy observation、golden runner、Sprint 010／038／040のbuilder・suite・edition・handoff・inventory・regression・snapshot・product test。
- private 32: Yasashii 28の共通対象に加え、`markdown-lines.mjs`、`safe-fs.mjs`、`secretary-store.mjs`、
  `memory-tools.sh`。Yasashii固有Skill bytesはprivate変換で生成し、private protected pathとのintersectionは0。

default buildのtrace countはAgentic `read/copy/write/execute/protect=628/628/628/1/0`、
Yasashii `37/29/32/1/5`、private `38/26/32/1/6`。`--skip-execute` は負fixtureと2回目ID再現だけに限定した。

## Candidate identity

manifest digest: `bdcd5dbd21eed979f224180a44366ddf2d070d57c8507a0c0a66faf6f65ea88f`

| Edition | 旧ID | 新ID | Files |
|---|---|---|---:|
| Agentic | `428b3ff435ee63bf47837e38792873264e14336e85ca1190bd823e80cbc67e0a` | `cb1cbf70ff37bc20184d7114e96ddcda6eede65243519245344217b013bb4e4c` | 628 |
| Yasashii | `bb194d55a3cff4fe6fbfdb588f1db665d4fcd2ed4446482410ca9dc525490cfd` | `73b10b501aea2019e8689e573c56fa5d761783c619c166288585ddc74e3fd7e9` | 604 |
| private my-vault | `95b7c5346dd9173817e40479e7599d39f4660f3efbb2b6d6122ab723b148bc84` | `bdb9587aa7be8fb22087c80205ab49260516acdc9b70027b94fa1d93d45dfe5d` | 714 |

別の空directoryへ同じ固定入力から再構築し、3 IDとも一致した。candidate reportのrootは
`agentic`／`yasashii`／`private-my-vault` の相対pathだけで、実workspaceの絶対pathをidentityへ含めない。

旧→新の公開source変更pathはPlanner正本3件（`docs/spec.md`、`docs/spec/constraints.md`、Patch契約）と、
本Generator所有のhandoff manifest／legacy fixture／builder／handoff test／inventory／regression／source snapshot。
会話contract、memory seam、golden fixtureの期待値変更は0件。

## 実行証拠

| Command | Exit | 結果 |
|---|---:|---|
| `node --check scripts/sprint-040-{candidate-build,inventory-test,handoff-test,source-snapshot}.mjs` | 0 | Node構文4件PASS |
| `node scripts/sprint-040-handoff-test.mjs --yasashii-source ... --private-source ...` | 0 | 正例1、schema 2観測1、4負例、合計6 PASS / 0 FAIL |
| `node scripts/sprint-040-candidate-build.mjs ... --skip-execute` + inventory | 0 | 3 candidate、inventory 8 PASS / 0 FAIL |
| `SPRINT040_YASASHII_SOURCE=... SPRINT040_PRIVATE_SOURCE=... bash scripts/sprint-040-regression.sh` | 0 | 3 edition、2回目ID再現、下流read-only、総合0 FAIL |
| 各candidate `bash scripts/sprint-040-candidate-suite.sh <edition>` | 0 | Sprint 040 15/15、Sprint 038 67/67、historical 14/14＋3/3、Sprint 010 56/56、Git/Secret 71/71。下流private相当9/9 |
| `node scripts/sprint-040-inventory-test.mjs --candidate-report ...` | 0 | schema/roles/inventory/protected/identity 8/8 |
| 別空directoryへのbuild `--skip-execute` とID比較 | 0 | `SPRINT040_CANDIDATE_REPRODUCTION_PASS=3 FAIL=0` |
| final staged treeのGit archiveをGit-free directoryへ展開し、同じregressionを実行 | 0 | `.git`なし、3 candidate／inventory／suite／ID再現／下流read-onlyを省略せずPASS |
| `git diff --check` | 0 | whitespace error 0 |

UI変更はないためbrowser、DOM、screenshotは対象外。

## 下流pre-write dry-run

full regressionの開始前後に `scripts/sprint-040-source-snapshot.mjs` を実行し、JSONを`cmp`した。

- Yasashii実repo: HEAD `4af185daa45290bdfcf4993db841c512cf319e2c`、branch `codex/sprint-040-memory-authorization`、status空、staged空、remote不変、protected digest不変。
- private実repo: HEAD `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`、branch `main`、status空、staged空、remote不変、protected digest不変。
- candidate入力はYasashii `3c472dd9...`、private `8e0796c9...` の固定commit archive。実repoのcheckout／branch／stage／commit／writeは0件。

## 起動・評価handoff

- 通し回帰: `SPRINT040_YASASHII_SOURCE=/Users/taisei/workspace/yasashii-secretary SPRINT040_PRIVATE_SOURCE=/Users/taisei/workspace/agentic-secretary-my-vault bash scripts/sprint-040-regression.sh`
- manifest単体: `node scripts/sprint-040-handoff-test.mjs --yasashii-source /Users/taisei/workspace/yasashii-secretary --private-source /Users/taisei/workspace/agentic-secretary-my-vault`
- candidate単体: `node scripts/sprint-040-candidate-build.mjs --output <empty-dir> --yasashii-source <read-only-repo> --private-source <read-only-repo>`
- inventory単体: `node scripts/sprint-040-inventory-test.mjs --candidate-report <candidate-report.json>`

## Known issues／未実行

- 本Patchはpre-write gateまで。Yasashii／private実repoへの製品適用、commit、branch変更は未実行。
- push、tag、Release、marketplace、installed cache、利用者workspace、Mac mini、new session、external serviceは未実行／write 0。
- source／offline PASSをrelease済み、cache反映済み、新session確認済みへ昇格していない。
- UI変更なし。既知のproduct finding、verification-infra findingは0件。

## 限定再試行cycle（ユーザー承認A）

前EvaluatorのP-01／V-01だけを修正した。会話contract、memory実装、Sprint 038 golden期待値、
下流実repoの製品bytesは変更していない。

### 3根本原因の修正

- `publicWholeTree.root` と `exclusions` をAgentic tree列挙、copy、role、trace、candidate identityの実行入力へ接続した。
  不存在root、空または不正なexclusion、state／progress／feedback／`.git` のcontrol path混入はbuild前に非0終了する。
- edition／pathごとに宣言transformerと実transformerを照合し、宣言anchorの入力内出現回数と変換適用回数を実測する。
  anchorの0回／複数回、transformer不一致、変換結果0 byte差分は非0終了する。reportの `applicationCount` と
  `anchorEvidence` は変換実行recordから生成し、固定値を代入しない。
- copy後にadaptするYasashiiの `plugins/secretary/skills/secretary/SKILL.md` と
  `scripts/sprint-010-regression.sh` を実copy recordから `trace.copy` へ追加した。adapted role recordのactionsも
  traceを逆引きして生成するため、`read/copy/write` が一致する。

変更fileはhandoff manifest、candidate builder、handoff test、inventory testと本progressだけである。

### 正負fixtureと実測trace

`node scripts/sprint-040-handoff-test.mjs ...` は12/12 PASSだった。

- 正例1件、schema 2欠陥観測1件。
- 既存4負例: 未宣言mutation、role overlap、unused declaration、stale path。
- 追加6負例: stale anchor、複数一致anchor、stale public root、空exclusions、transformer不一致、
  入力に1回存在するが実変換点ではないanchor。
- すべての負例は期待どおり非0終了し、正常manifestだけが0終了した。

default buildのtrace countはAgentic `read/copy/write/execute/protect=628/628/628/1/0`、
Yasashii `37/31/32/1/5`、private `38/26/32/1/6`。Yasashiiのcopyは前候補の29から実動作どおり31になった。
全9 adapted pathの変換適用回数は各1、宣言anchorは全件 `occurrenceCount=1`／`applicationCount=1` である。

### 再固定したcandidate identity

manifest digest: `e515842b147393ac77dddfb94d000188916d4aa837fda17d7e8fb4015f844982`

| Edition | 前FAIL候補のID | 限定再試行ID | Files |
|---|---|---|---:|
| Agentic | `cb1cbf70ff37bc20184d7114e96ddcda6eede65243519245344217b013bb4e4c` | `36a5c5f5482fcd510e5b361bdf9e24620be696046e248fb29b3b557800cc083d` | 628 |
| Yasashii | `73b10b501aea2019e8689e573c56fa5d761783c619c166288585ddc74e3fd7e9` | `4bc87169d87baf90f9681f7ba07d3154c71df34eac78bad15b435732e876faf2` | 604 |
| private my-vault | `bdb9587aa7be8fb22087c80205ab49260516acdc9b70027b94fa1d93d45dfe5d` | `5c22b283b0f7c55a30c9b8c581d5ad182035b543e3369b421fe131e2741b5043` | 714 |

別の空directoryへの2回目buildでも3 IDが一致した。candidate rootは相対pathだけである。

### 限定再試行の実行証拠

| Command | Exit | 結果 |
|---|---:|---|
| `node --check scripts/sprint-040-{candidate-build,handoff-test,inventory-test}.mjs` | 0 | Node構文3件PASS |
| `node scripts/sprint-040-handoff-test.mjs --yasashii-source ... --private-source ...` | 0 | 正常／観測／負例を合わせ12 PASS / 0 FAIL |
| `node scripts/sprint-040-candidate-build.mjs ... --skip-execute` | 0 | 3 candidateと実測anchor／action traceを生成 |
| `node scripts/sprint-040-inventory-test.mjs --candidate-report ...` | 0 | whole-tree正本、role、anchor実測、copy trace、inventory、protected、identityを8/8 PASS |
| `SPRINT040_YASASHII_SOURCE=... SPRINT040_PRIVATE_SOURCE=... bash scripts/sprint-040-regression.sh` | 0 | 3版suite、inventory、2回目ID再現、下流before/after不変、総合0 FAIL |
| 最終staged実装treeのGit archiveで同じfull regression | 0 | `.git`なしで12/12正負、3版suite、inventory 8/8、ID再現3/3、下流read-only 2/2、総合0 FAIL |
| `git diff --check` | 0 | whitespace error 0 |

3版candidate suiteはSprint 040 15/15、Sprint 038 67/67、historical 14/14＋3/3、Sprint 010 56/56、
Git／Secret 71/71を各版で再実行し、Yasashii／privateのprivate相当9/9もPASSした。

### 下流不変と未実行境界

- Yasashii実repoはHEAD `4af185daa45290bdfcf4993db841c512cf319e2c`、branch
  `codex/sprint-040-memory-authorization`、status／staged空、remote／protected digestが前後一致した。
- private実repoはHEAD `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`、branch `main`、status／staged空、
  remote／protected digestが前後一致した。
- 下流実repoへのwrite／checkout／stage／commit／branch／remote変更は0件。
- 会話contract、memory実装、golden期待値の変更は0件。既存会話／memory full regressionは0 FAIL。
- push、tag、Release、marketplace、installed cache、利用者workspace、Mac mini、new session、external serviceは未実行／write 0。

限定再試行cycleに既知のproduct finding／verification-infra findingはない。独立Evaluatorの再評価待ちである。
