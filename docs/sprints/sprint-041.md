# Sprint 041 — Project Clarity coreとStandalone初期化

- Type: main
- Risk: high（Repo解析、canonical data、Decision正本、atomic initを扱う）
- 依存: `sprint-040-patch-001` done、Planner正本完成後のOrchestratorによるFable静的レビュー（製品PASS／state遷移の証拠にはしない）
- 含む機能: F64, F65, F66, F68, F69, F78
- 主眼: Clarity無しRepoをread-only previewから安全に初期化し、Event／Evidenceから4象限Stateを決定的に再構築する。
- Target Case IDs: ST-001〜ST-015、QM-001〜QM-014、DE-001〜DE-014（正確な43 IDは`docs/spec/clarity-acceptance.md`の`primaryCaseIds.sprint-041`）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## 外から見える成果

- 任意Repoで`clarity init`をpreviewし、作成内容と未確認範囲を見てから初期化できる。
- AI推定は確認候補のままで、人間が確定したDecisionと区別される。
- 決定×実行クラリティマトリクスの4象限がStateから再計算される。
- 同じ操作のretry、途中失敗、既存`CLARITY.md`、non-git／remoteなしRepoでも状態を壊さない。

## Scope

1. public共通coreのClarity Project／Item／Event／Evidence／State schemaとschema validation。
2. safe root、bounded scan、既定除外、Repo identity、既存ADR／spec／Decision候補のread-only inspection。
3. init preview／confirm apply、既存file conflict、managed root entry、runtime除外、partial／retry。
4. Decision／Execution／Validation／Alignment／dispositionと、quadrantの決定的派生・rebuild。
5. Decision確定を既存Decision seamへ委譲できるcore契約と、partial failureでの非誤表示。
6. status／history／rebuildの最小CLIとmanual Skill入口。UI projectionやHookは後続Sprintへ送る。
7. `DE-002`〜`DE-004`は既存generic projects Decision seamをfixture workspaceで実行し、Decision正本／PROJECT／Clarity Eventの一体性とpartial retryを評価する。

## Acceptance Criteria

1. Target Case 43件が同一candidateでPASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. preview／cancelはtree、Git、runtime、journalを含むwrite 0件である。
3. applyは空テンプレでなく実Repo由来Itemを作り、同一入力の再実行でItem／Event／commit追加0件である。
4. Secret／binary／巨大Repo／root外symlinkを安全に除外し、読んだ範囲と未確認範囲を表示する。
5. 4象限、`in_progress`、`rolled_back`、`superseded`、`idea`、期限前後`deferred`が仕様どおりである。
6. AI推定／draft／superseded sourceは`confirmed`にならず、Decision正本失敗時に確定表示しない。
7. Event／EvidenceからStateを繰り返しrebuildしてbyte安定し、手動quadrant改ざんを復元する。
8. 既存dirty／stage／branch／remoteと対象外fileが開始前後で不変である。

## Non-scope

- Hook、Secretary統合、link／sync、Drift意味比較、Mermaid／Xmind、Portfolio、packaging。
- task作成、Notion変更、外部connector、network、push、release、downstream反映。
- Secretary-localの配置・resolver・lifecycleとの統合は本Sprintでは扱わず、`SL-006`としてSprint 045で再評価する。

## Verification scope（着手時に固定）

- synthetic Git／non-git Repo、remoteなし、巨大tree、binary、Secret、symlink、既存ADR／CLARITY、write failure fixture。
- fixture workspace内の既存generic projects Decision seamで`DE-002`〜`DE-004`を実行し、一体成功、両向きpartial、重複なしretryを確認する。Secretary-local統合済みとは判定しない。
- Target Caseだけと既存path／Secret／Decision seamの直接回帰。後続Sprintの全caseを要求しない。

### Evidence safe harbor

- case ID、fixture root、command、exit、stdout／stderr、before／after tree・Git snapshot。
- schema／State／Event／Evidenceの構文、件数、digest、rebuild hash、Decision source／human confirmation。
- failure injectionとretryの差分・件数。これで十分とし、Hook live、browser、network、統一attestationを追加しない。

## 完了条件

Generatorは本Sprintだけを実装して対応progressへ引き渡す。Evaluatorは別作業単位でTarget CaseとC19／C24を評価し、
PASS後にだけOrchestratorがstateを次へ進める。
