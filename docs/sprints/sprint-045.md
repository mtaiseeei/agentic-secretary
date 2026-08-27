# Sprint 045 — generic Secretary-local、daily／weekly／Portfolio

- Type: main
- Risk: high（project lifecycle、Decision seam、daily／weekly、既存Skill回帰を扱う）
- 依存: `sprint-044` done
- 含む機能: F73, F74, F80
- 主眼: projectsの責務を置き換えず、generic Secretaryのopen PJと日次／週次／PortfolioをClarity-awareにする。
- Target Case IDs: SL-001〜SL-012、PF-001〜PF-008、PF-010〜PF-012、RG-001〜RG-012（正確な35 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. public `secretary/projects/open/`のgeneric Clarity配置と既存resolver／Decision seam／complete／reopenの協働。
2. PROJECT表示のmode／Attention／link health summary。全Item埋込と生きたTODO作成は禁止。
3. daily morningの独立`今日の要確認`、evening、weekly、open-only Portfolio rollup。
4. 明示的タスク化だけを既存TODO／notion-tasksへ委譲する境界。
5. projects、daily、weekly、memory、Chatwork、Google Chat、vault-search、identity、update、Harnessの既存回帰。
6. private固有`05/02/10_sources/Notion`はadapter seam／literal非混入／fixed handoffだけをpublicで評価する。

## Acceptance Criteria

1. Target Case 35件がpublic解釈でPASSし、本契約Acceptance Criteriaの未実行0件で、private固有live未実行をpublic PASSへ偽装しない。
2. projectsが作成／open／closed／complete／reopen／canonicalRepoを所有し、Clarityがlifecycleを二重実装しない。
3. PJ固有Decisionは既存seamへ一度だけ記録され、一般memory／Clarityへ本文を重複保存しない。
4. daily／weekly／PortfolioはAttentionを独立・bounded表示し、closed、全Item本文、外部connectorを自動読込しない。
5. Clarity Item作成でTODO／Notion Task 0件、明示タスク化だけが既存確認境界へ進む。
6. 既存projects／daily／weekly／memory／chat／identity／update／Harness回帰が0 FAILである。
7. public sourceにprivate literal／path／property実装0件で、downstream adapter契約が明確である。
8. `SL-006`はgeneric Secretary-local fixtureで既存project Decision seamへの委譲を再評価し、Sprint 041のcore fixtureだけを統合PASSへ代用しない。

## Non-scope

- private実repo、`05/02/10_sources`、Notion property変更、connector live、linked sync、release。

## Verification scope（着手時に固定）

- generic Secretary fixtureのopen／closed／legacy、Decision、complete／reopen、複数PJ、Attention有無／source failure。
- `SL-006`ではSprint 041の`DE-002`〜`DE-004`と同じ一体性／partial境界をSecretary-local配置とlifecycle込みで再評価する。
- Target Case、既存関連Skill suite、private literal negative。実private workspaceは使わない。

### Evidence safe harbor

- project tree／ID／history／PROJECT diff、daily／weekly output、Portfolio rollup、TODO／Notion adapter log。
- 既存suite command／exit／集計、public source scan、private adapter handoff marker。

## 完了条件

EvaluatorはC19／C20／C24とTarget Case、既存回帰を評価し、private対応済みとは表示しない。
