# Sprint 048 — public packaging、host inventory、fixed handoff準備

- Type: main
- Risk: high（plugin manifest、archive、version／inventory、downstream handoff境界を扱う）
- 依存: `sprint-047` done
- 含む機能: F79, F80
- 主眼: public `agentic-secretary` candidateをclean checkout／Git-free archiveで再現し、host状態とdownstream handoffを固定可能にする。
- Target Case IDs: PK-001〜PK-012（正確な12 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. Claude／Codex manifest、共通Hook、Clarity Skill、marketplace metadata、host／Skill inventory整合。
2. public candidate version／CHANGELOG／README／guide／release inventoryのsource-level整合。
3. clean checkout、Git-free archive、existing master regression、supported／verified／degraded host status、Xmind integration defaultとprovider capability／priority／selected／reason／verifiedの分離。
4. public PASS後に固定するSHA／digest／common path／adapter seam／excluded／protected／rollback handoffのschemaとpre-write gate。
5. planning／Sprint中のpush、tag、Release、marketplace publish、cache、実downstream write 0境界。

## Acceptance Criteria

1. Target Case 12件がpublic解釈でPASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. 両manifest／marketplace／host inventoryがClarity Skillと共通Hookを正確に列挙し、実treeと一致する。
3. clean checkoutとGit-free archiveの同一candidateでvalidator、Clarity回帰、existing master回帰が0 FAILである。
4. host statusはClaude／Codex、Desktop／CLIのsupported／verified／degradedを分け、未検証をverifiedにしない。Xmind statusはON／OFFとprovider capability／priority／selected／reason／verifiedを分け、MCP-firstと承認付きlocal fallbackをinventory／handoffで正確に表す。
5. public sourceへprivate path／Notion実装／Yasashii copy 0件で、handoffはprotected／excluded pathを明示する。
6. public PASS前のprivate candidate作成、実downstream write、push、tag、Release、marketplace、cache変更0件である。

## Non-scope

- external publish、installed plugin、new session loaded version、実downstream適用、Mac mini。

## Verification scope（着手時に固定）

- source checkoutと同一bytes archive、manifest／inventory／version／docs validator、master regression、handoff negative fixture。
- Target Caseだけ。外部publishや実private candidateを合格条件にしない。

### Evidence safe harbor

- candidate SHA／tree digest／file count、manifest／inventory diff、validator／suite command／exit／count。
- host／Xmind provider status artifact、handoff schema／protected digest、external／downstream before／after read-only snapshot。

## 完了条件

EvaluatorはC12／C13／C21／C24とTarget Caseを評価する。実handoffのaccepted SHA／digest確定は全最終Sprint PASS後にOrchestratorが扱う。
