# Sprint 050 Patch 001 — ユーザー判断の下流引継ぎgate

- Type: regular
- Risk: high（Evaluator PASS以外の明示例外でdownstream handoffをreadyにできる安全境界変更）
- 依存: `sprint-050` done-by-user-decision
- 対象機能: F79 public-first packagingと固定handoff
- 主眼: Sprint 050のEvaluator結果を書き換えず、exact product candidateへのユーザー判断を独立したtruthful statusへ束縛し、Patchの独立Evaluator PASS後だけdownstream別Harnessが利用できるhandoff gateを成立させる。

## 確定済みのユーザー判断

追加質問は不要とする。2026-08-28の現Harness会話で、ユーザーは次を決定済みである。

1. Sprint 050の唯一の必須残余である、exact candidate実install後のClaude Code／Codex別live conversation・Hook発火未実施を自ら後日確認するリスクとして引き受け、Sprint 050を`done-by-user-decision`として先へ進める。
2. 実host PASS前でも、上記リスクと元feedbackを隠さない明示的例外として、固定candidateをprivate my-vault、次にYasashiiの別Harnessへ展開してよい。承認原文は「よいです」。
3. この承認はrelease／tag／push／marketplace／installed cache／new session、実Xmind MCP、実host検証の実施許可ではない。Public Patch自身も実downstreamへwriteしない。

短い原文だけではauthorizationにしない。本節のcandidate、feedback、残余、順序、scopeと一体で
`authorizationId=sprint-050-downstream-user-decision-2026-08-28`として記録する。

## 固定identity

### Accepted product source

| field | value |
|---|---|
| full SHA | `5f08d454c05576fcff8ab32c10c00887b4c15a96` |
| full tree SHA-256 | `1fbffe636565355b875dcde35ff05d26cd7e15f00710c1c88a563866749037c5` |
| file count | 828 |
| common path SHA-256 | `4aa6e8d4b21aa9e0020cfaa6edefd5ff0e6640fd2e8f937db00478190142f849` |
| common file count | 44 |

### Origin evaluation

| field | value |
|---|---|
| feedback commit | `8483d86390b6c105163e64d24dcafe498ed2fe8b` |
| feedback path | `docs/feedback/sprint-050.md` |
| feedback SHA-256 | `fcaed413963cfcee2ea6303c1293a8c376b197a4998b5e3a682154eeca1b9cdd` |
| Verdict | `verification-scope-issue` |
| product finding | 0 |
| registry／E2E | 273 PASS／0 FAIL／1 conditional NOT-RUN、E2E 4/4 |

`acceptedSource`は上の製品bytesだけを指す。本PatchのGenerator commitおよびEvaluatorが確認したhandoff governance commitは
`governanceSource`として別に固定し、`acceptedSource`へ代入しない。

## 残余の分類

### ユーザーが今回受容したblocking residual

- AC3／C21: exact candidateを実installしたClaude CodeとCodexのlive conversation、SessionStart、PostToolUse、Stop、loop負例、manual fallbackがhost別に未実施。

### 受容対象外のconditional NOT-RUN／別phase residual

- `XM-007`: 実Xmind MCP connected create／read／update。未承認conditional NOT-RUN、`verified=false`のまま。
- Claude Code Desktop、Codex App、Windows native、Mac miniの実機確認。
- private my-vault／Yasashiiの実repo適用と各repoの独立評価。
- release、tag、push、marketplace、installed cache、new session loaded version。

これらをこの承認からPASS、verified、実施済み、許可済みへ昇格しない。

## Scope

1. `adapters/downstream-clarity-handoff.json`と`scripts/sprint-048-handoff.mjs`が所有するfixed handoff contractへ、既存PASS経路と分離したユーザー判断経路を追加する。
2. `publicationStatus=public-user-decision-risk-accepted`、`acceptanceBasis.type=user-risk-acceptance`、`evaluatorPass=false`を一体にする。既存`public-evaluator-pass`は同じ意味・入力・失敗条件を維持する。
3. exact accepted product source、origin evaluation、残余分類、承認記録、Patch governance evaluation、downstream order、common／excluded／protected path、protected digest、rollbackを検証し、不足・不一致をfail closedにする。
4. templateは受入根拠を自動推測せずclosedを維持する。ユーザー判断ready handoffは、本Patchのfresh独立Evaluator PASSを示すgovernance feedbackと、そのEvaluatorが確認した`governanceSource`を入力した後だけ生成または検証できる。
5. downstream orderは`agentic-secretary-my-vault`→`yasashii-secretary`。write scopeは宣言済みcommon pathだけで、excluded／protected pathを変更しない。rollbackは各downstreamの同期前commitへcommon pathだけを戻す。
6. state文字列だけ、自動推測、曖昧な承認、別candidate、変更されたfeedback／残余／順序／scope、撤回・失効承認、governance非PASSを拒否する回帰を追加する。

## Acceptance Criteria

1. 既存`public-evaluator-pass`のpositive／negative fixtureが変更前と同じ結果を返し、PASS経路のrequired source、tree、common、protected、excluded、rollback、clean tree検査が弱まらない。
2. ユーザー判断経路は`public-user-decision-risk-accepted`だけを返し、`evaluatorPass=false`、元Verdict=`verification-scope-issue`、product finding 0、AC3／C21未達、`XM-007` conditional NOT-RUN、別phase残余を保持する。`public-evaluator-pass`またはlive／Xmind `verified=true`へ変換しない。
3. `acceptedSource`は固定SHA `5f08d454...`、tree `1fbffe...`／828、common `4aa6e8...`／44と一致する。clean checkoutまたはGit-free archiveの再計算値が1つでも異なればreadyにならない。
4. origin feedbackはcommit `8483d863...`、path、SHA-256 `fcaed413...`、Verdict、残余集合まで一致する。feedback本文の変更、別feedback、Verdict／未達の減少・置換を拒否する。
5. authorization recordはID、2026-08-28、原文「よいです」、具体的な判断文脈、scope、対象candidate、origin feedback、受容residual、受容対象外residual、downstream order、失効条件、撤回状態を持つ。原文だけ、stateだけ、要約だけ、対象不明の承認を拒否する。
6. candidate SHA／tree／common digest、feedback digest／Verdict／残余集合、downstream repo identity／order、common／excluded／protected path、protected digest、rollbackのいずれかが承認記録から変わる、承認が撤回される、またはgovernance evaluationがPASSでない場合、既存ready artifactもstaleとしてclosedにする。
7. `governanceSource`は本Patchの実装commitと、そのcommitを評価した`docs/feedback/sprint-050-patch-001.md`のPASSへ一致する。`acceptedSource`との混同、stateのstatusだけ、Generator自己評価だけではreadyにならない。
8. common path、excluded path、private／Yasashii protected path、adapter seam、Xmind edition差、downstream order、file-scoped rollbackは現行handoffから無断変更されない。別path、extra path、欠落path、protected digest不一致を拒否する。
9. targeted handoff test、既存Sprint 048 handoff test／validator、関連public regressionが0 FAILとなる。exact product sourceのClarity primary 250／CLX 20／XV 4、Fableレビュー済み意味・Severity・割当、C19〜C24の要件は変更しない。
10. PatchのGenerator／Evaluatorは実downstream repo、remote、release、tag、push、marketplace、installed cache、new session、実Xmind MCP、実hostへwriteしない。前後snapshotでwrite 0を確認する。
11. ready判定は純粋な検証結果であり、downstreamへのwriteを行わない。実適用は本Patch PASS後、private my-vault、次にYasashiiの各別Harnessがそれぞれのstate・契約・Evaluatorを使って行う。

## Required negative fixtures

- `done-by-user-decision` stateだけ。
- 文脈を持たない「はい」「よいです」、自動生成した承認、撤回済み承認。
- accepted source SHA、tree digest、file count、common digest、common file countの各単独差替え。
- feedback commit、path、digest、Verdict、AC3／C21、`XM-007`、別phase残余の各単独差替え。
- 別candidateへの承認転用、承認後のscope変更、downstream順序逆転、repo identity差替え。
- common／excluded／protected pathの追加・欠落・順序／値変更、protected digest不一致、rollback変更。
- governance commit不一致、Patch feedbackなし／非PASS／別commit評価、governance commitの`acceptedSource`誤代入。
- ユーザー判断statusの`public-evaluator-pass` alias、`evaluatorPass=true`、live／Xmind `verified=true`。

各fixtureは期待する固有の拒否理由と非0 exitを持ち、固定summaryだけで成功できない。

## Non-scope

- Sprint 050のEvaluator feedback、`done-by-user-decision`記録、Clarity product source、primary／CLX／XV case、C21 host-live要件の変更。
- 実host live、実Xmind MCP、Claude Code Desktop／Codex App／Windows／Mac mini確認。
- private my-vault／Yasashii実repoへの適用、各repoのspec／state／実装／評価。
- release、tag、push、marketplace、installed cache、new session確認。
- 新しいcollector、統一attestation、汎用approval基盤。必要な束縛はfixed handoff contract内に閉じる。

## Verification scope（着手時に固定）

- `scripts/sprint-048-test.mjs`の既存PASS経路を回帰させず、Patch専用positive／negative fixtureで本契約AC1〜11を検査する。
- exact product sourceのclean checkoutまたはGit-free archiveでfull tree／common digestを再計算し、governance candidateとは別identityとして照合する。
- origin feedback bytes／digest／Verdict／residual、Patch feedback PASS／evaluated commit、承認記録、downstream order、path scope、protected snapshot、rollbackをそれぞれ独立にtamperしてfail closedを確認する。
- 変更surface、既存Sprint 048 handoff test／validator、関連public regressionを実行する。Sprint 050 product evidenceは同一`5f08d454...`の既存fresh独立Evaluator証跡を引き継ぎ、製品caseの意味を再定義しない。
- 実downstream、network、release、host、Xmind writeは行わず、前後Git／filesystem snapshotで0件を示す。

### Evidence safe harbor

- 実行command、exit code、assert数、fixture ID、期待した拒否code、observed publication status。
- accepted／governance SHA、tree／common digest、feedback digest、residual IDs、authorization ID、downstream order、path／protected snapshot／rollbackの比較結果。
- source repoと隔離fixtureの前後Git／filesystem snapshot、external／downstream／release／host／Xmind write 0。

上記で十分とし、実downstream write、実host live、実Xmind MCP、追加collector、統一attestationを合格条件にしない。

## 完了条件

fresh独立EvaluatorがC1、C2、C5、C6、C24、C25を採点し、C25=5/5、ゼロ許容違反0、全Acceptance Criteria PASSを
`docs/feedback/sprint-050-patch-001.md`へ証跡つきで記録した後だけ、ユーザー判断handoffをreadyにできる。
Evaluator PASS前のtemplate／derived handoffはclosedのままとし、実downstream適用は開始しない。
