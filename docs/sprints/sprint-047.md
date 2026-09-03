# Sprint 047 — Drift DetectionとGit／filesystem／Secret hardening

- Type: main
- Risk: high（コード比較、Secret、dirty／stage、concurrent write、corruptionを扱う）
- 依存: `sprint-046` done
- 含む機能: F65, F67, F77, F78
- 主眼: Decisionとcurrent implementationのDriftを根拠つきで示し、Clarity全write面の安全境界を敵対fixtureで閉じる。
- Target Case IDs: DR-001〜DR-010、GS-001〜GS-015（正確な25 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. Decision／spec／ADR／顧客合意とcurrent code／commit／test Evidenceの比較。
2. `unknown / aligned / possible_drift / drift / not_applicable`、waiver、解消履歴、generated source authority。
3. dirty／staged／untracked／owned commit、rollback、push／branch／remote／visibility不変。
4. symlink／junction／traversal／absolute injection、Secret／credential／transcript path、schema corruption。
5. concurrent Hook／CLI write、lock残骸、generated ownership、failure recovery。

## Acceptance Criteria

1. Target Case 25件がPASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. email-first Decisionとcustomer_id-first codeを双方のEvidenceつきで検出し、根拠不足はpossibleに留める。
3. 同義、古いcommit、generated codeでfalse positiveを抑え、Decision変更／実装修正／waiver後も履歴を保持する。
4. 既存dirty／stage／untracked、HEAD、branch、remote、visibilityが全成功／失敗fixtureで不変である。
5. root外参照、Secret、schema corruptionをcanonical write前に拒否し、Evidence／outputへ値を露出しない。
6. concurrent write stress後もJSON parse、Event uniqueness、State rebuildが100%成功し、lock残骸から回復できる。
7. 実Drift comparatorから`AT-003`／`AT-004`のreason／level／rankingを再評価し、Sprint 042の合成fixtureだけを統合PASSへ代用しない。

## Non-scope

- 汎用semantic search、万能Secret parser、外部deployment verification、release／downstream。

## Verification scope（着手時に固定）

- Drift正負fixture、Git履歴fixture、Secret canary、dirty／stage、symlink／junction、corruption、concurrency stress。
- confirmed drift／possible driftの実comparator出力から`AT-003`／`AT-004`を直接回帰する。
- Target Caseと全Clarity write面の直接安全回帰。実顧客Repoは使わない。

### Evidence safe harbor

- Decision／implementation locator、comparison summary、alignment transition、Attention、history。
- Git index／working tree／HEAD snapshot、scanner output、canary digest、stress event／parse／duplicate count、recovery result。

## 完了条件

EvaluatorはC22／C24とTarget Caseを独立敵対fixtureで評価する。
