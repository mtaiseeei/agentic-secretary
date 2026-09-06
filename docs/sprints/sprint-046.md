# Sprint 046 — reciprocal link、pull sync、authority／conflict

- Type: main
- Risk: high（複数Repo identity、authority、外部read、conflictを扱う）
- 依存: `sprint-045` done
- 含む機能: F64, F75, F76, F78
- 主眼: Secretary PJと外部Repoを相互確認でlinkし、相手を直接書き換えずにprojectionをpull同期する。
- Target Case IDs: LK-001〜LK-016、SY-001〜SY-013、IM-002、IM-003、IM-010、IM-011、PF-009（正確な34 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. link prepare／accept／finalize、reciprocal manifest、immutable Project ID、Repo identity／digest検証。
2. gitignored local mapping、manual bundle、明示許可されたread-only GitHub取得のadapter境界。
3. authority profile、export／import、sync preview／apply、stale／schema／unknown field／tombstone。
4. conflict検知と、Secretary側／Repo側／new Decision／split／defer／unlinkのresolution Event。
5. cross-root write、push、last-write-wins、duplicate／tamperの負例。
6. sync／link finalize retry、healthy／broken-link doctor、stale linked projectのPortfolio表示。

## Acceptance Criteria

1. Target Case 34件がPASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. Link RequestはSecret／absolute path／顧客本文0、双方のID／identity／digest不一致をwrite 0で拒否する。
3. 既存Standalone IDを維持し、duplicate prepare／accept／finalizeでmanifest／Event追加0件である。
4. sync previewはwrite 0、applyは自Repoのimports／projectionだけを更新し、相手Repo／remote／Git状態を変えない。
5. authority Primary重複、stale、newer schema、delete、identity改ざんを隠さず、last-write-wins 0件である。
6. network取得はread-onlyでも明示許可前0件。manual bundleだけで全link semanticを検証できる。
7. 実sync／authority conflictから`AT-008`／`AT-009`のreason／level／rankingを再評価し、Sprint 042の合成fixtureだけを統合PASSへ代用しない。
8. `IM-002`／`IM-003`／`IM-010`／`IM-011`／`PF-009`が実link／sync状態とPortfolioからPASSする。

## Non-scope

- 自動fetch／pull／push、PR、remote変更、external live、Drift意味比較、release。

## Verification scope（着手時に固定）

- 2つの隔離Repoとfilesystem canary、local mapping／manual bundle、tamper／stale／schema／conflict fixture。
- 実sync／authority conflictで`AT-008`／`AT-009`を直接回帰し、healthy／broken link doctorとstale Portfolioを同じlink modelで検査する。
- Target CaseとSprint 041／045のID／project直接回帰。GitHub read-only liveは明示許可なしならadapter fixture。

### Evidence safe harbor

- 双方のtree／Git／Project ID／link ID／digest、preview／apply diff、filesystem canary、remote command log。
- authority／conflict／resolution StateとEvent、retry counts、external operation 0 snapshot。

## 完了条件

EvaluatorはC22／C24とTarget Caseを同じ2-Repo candidateで評価する。
