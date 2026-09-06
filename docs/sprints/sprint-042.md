# Sprint 042 — Attention、doctor、migration、bounded UX

- Type: main
- Risk: high（Attention優先度、schema migration、cleanup、partial retryを扱う）
- 依存: `sprint-041` done
- 含む機能: F67, F68, F69, F78
- 主眼: 「今、人間が考える必要があるのは何か」を最大3件程度で示し、診断・migration・retryを安全に運用する。
- Target Case IDs: AT-001〜AT-014、AT-016〜AT-018、IM-001、IM-004、IM-006〜IM-009、IM-013〜IM-014、UX-001〜UX-010（正確な35 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. Attention reasons、severity、stable tie-break、human override、解消履歴、固定時刻staleness。
2. status／attention／history／doctor／migration preview・apply／runtime cleanup preview・apply。
3. Event、State rebuild、migration、checkpointの共通idempotency primitiveとpartial／retry状態。
4. 結論→理由→根拠→選択、最大3件程度、その他件数、Attentionなし、日本語・推定・未検証表示。
5. `AT-003`／`AT-004`／`AT-008`／`AT-009`は合成canonical State／Evidence fixtureを使い、Attention reason、level、rankingだけを評価する。

## Acceptance Criteria

1. Target Case 35件がPASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. 無承認実装、決定済み未実行、Drift／possible、validation、conflict、Evidence不足等を正しいlevelで出す。
3. ideaと期限前deferredは既定除外、期限到来で再評価し、同点順序と繰返し出力が安定する。
4. 標準表示は最大3件程度で結論→理由→根拠→選択を満たし、正常／idea全件を押し付けない。
5. migration／cleanup previewはwrite 0、apply failureは旧schema／利用者dataを保持し、retryで一状態へ収束する。
6. doctorはmode、schema、Clarity canonical、lock、projection capabilityを正直に表示し、未検証を成功扱いしない。
7. technical handoffはcommand／path／error／Evidence／残課題を保持し、通常利用者表示へ内部詳細を詰め込まない。

## Non-scope

- Mermaid／Xmind、Hook live、Secretary統合、link／sync、Drift comparator、packaging。
- 実sync／authority conflict生成と実Drift意味比較。本Sprintの合成fixture評価をSprint 046／047の直接回帰PASSへ代用しない。

## Verification scope（着手時に固定）

- 固定時刻fixture、全Attention reason、tie／override／resolution、schema old／new／corrupt、lock残骸、failure injection。
- `AT-003`／`AT-004`／`AT-008`／`AT-009`は同構造のcanonical State／Evidenceを直接投入し、reason／level／stable rankingを検査する。実syncはSprint 046、実Drift comparatorはSprint 047で再評価する。
- Target CaseとSprint 041直接回帰だけ。UIはCLI／Markdown出力で評価し、browser screenshotを要求しない。

### Evidence safe harbor

- case ID、入力State、Attention order／reason／level、output size、repeat hash。
- migration／cleanup前後tree・Event件数・schema・failure／retry snapshot、doctor output。

## 完了条件

別EvaluatorがC19／C20／C24とTarget Caseを評価し、PASS後だけ次Sprintへ進む。
