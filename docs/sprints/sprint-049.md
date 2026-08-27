# Sprint 049 — Clarity-aware collaboration surface完成

- Type: main
- Risk: high（router、projects、daily、memory、update、templates、edition handoffを横断する）
- 依存: `sprint-048` done
- 含む機能: F73, F74, F79, F80
- 主眼: Clarity Skill／CLIだけでなく、実際に関係する全Secretary surfaceの責務・routing・copy・回帰を揃える。
- Target Case IDs: CLX-001〜CLX-020（正確な20 IDはregistry JSON。repo内primary 250 caseには追加しない）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. secretary router、projects lifecycle、daily／weekly／Portfolio、notion-tasks／TODO明示委譲、memory重複防止。
2. buildのHarness正本非置換、updateの自動実行禁止、onboarding／templates／rules／serializerのClarity-aware copy。
3. host／release inventory、edition handoff、public／private／Yasashii Xmind integration default、共通MCP-first priority、承認付きlocal fallback、fixed visual、protected path。
4. Chatwork、Google Chat、Google／Microsoft／Notion等external connectorの自動実行禁止。
5. Clarity専用Hook以外0件、Hook内memory意味判定0件。
6. tracked collaboration inventoryのpath、role、edition、marker、digest、test、delegation／no-touch契約。

## Acceptance Criteria

1. CLX-001〜020が全件PASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. projects lifecycleとClarity state ownershipが一意で、作成／完了／再開／canonicalRepo linkを強く協働しつつ二重実装しない。
3. daily／weekly／Portfolioはbounded Attentionを追加し、TODO／予定／journal／connector正本を混ぜない。
4. task化、memory、build、update、connectorは明示された既存入口と確認境界だけを使い、自動副作用0件である。
5. Clarity専用Hook以外のHook、memory候補意味判定、毎session network／updateが0件である。
6. inventoryはF80とcollaboration inventoryに列挙した全関連surfaceの実内容、marker、digest、回帰と一致し、漏れ／stale／旧契約／private literal 0件である。XmindはAgentic／Yasashii OFF、private ONのdefaultだけedition差とし、ON時のMCP-first、local preview／confirm、4象限の位置／4色／emoji／ラベル／意味文は3 edition共通である。

## Non-scope

- 新しい外部connector、Notion schema、projects lifecycle再設計、他Skill Hook、release／downstream実適用。

## Verification scope（着手時に固定）

- router natural-language fixture、各Skillの正負routing、file／adapter log前後snapshot、inventory tamper／omission fixture。
- CLX case、Sprint 045／048直接回帰、各関連既存suite。250 case全再実行はSprint 050へ送る。

### Evidence safe harbor

- case ID、input、selected Skill／route、expected／observed side effect、response state、before／after snapshot。
- inventory entry／digest／marker／negative tamper、Hook tree、connector／update command log 0、既存suite集計。

## 完了条件

EvaluatorはC15／C18／C21／C24とCLX全件を評価し、PASS後だけ最終Sprintへ進む。
