# Sprint 058 評価結果

## Retry 1 増分再評価（2026-09-12）

**判定:** 合格  
**Escalation Recommendation:** none

初回FAILのproduct finding 2件は解消した。未変更面は初回feedbackのgreen証跡を引き継ぎ、今回の修正面と近傍導線だけを再評価した。

### 変更スコア

| 基準 | 初回 | 今回 | 閾値 | 判定 | 根拠 |
|---|---:|---:|---:|---|---|
| C1 完成度 | 3/5 | 5/5 | 4 | PASS | AC2の接続診断とsetup／read複合意図が実routeで成立し、全ACがPASS。 |
| C3 機能の実証 | 3/5 | 4/5 | 4 | PASS | 初回に失敗した3入力とMicrosoft診断、近傍の単独read／setup／Chatwork／Google Chatを実routerで確認。 |
| C15 会話authorization・意味保存 | 4/5 | 5/5 | 5 | PASS | 接続診断、setup、後続readの順序と現在意図を保持し、全routeで副作用0件。 |

### 増分証跡

- `python3 /private/tmp/astra-secretary-heavy.py node --input-type=module -e '<10入力をrouteSecretaryIntentへ渡してJSON出力>'`: exit 0、Node 40→40。
  - `Googleの接続状態を確認して`／`Microsoftの接続状態を確認して` → `connections / connections-read-only-diagnosis`。
  - `Googleを接続して、予定を見て` → `setup-google / google-explicit-entry`、`followUp.route=google-read-only-handoff`、`order=after-setup`。
  - `Microsoftを接続してOutlookメールを読んで` → `setup-microsoft / microsoft-explicit-entry`、`followUp.route=microsoft-read-only-handoff`、`order=after-setup`。
  - 単独Google予定／Outlookメールは各read-only handoff、単独Google／Microsoft接続は各setup、Chatwork／Google Chat履歴は既存専用route。10件すべてfile／adapter／command／external side effect 0件。
- `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-058-test.mjs`: exit 0、`SPRINT058_PASS=8 FAIL=0 ROUTE_SIDE_EFFECT_VIOLATIONS=0`、Node 40→40。
- Orchestratorが同一candidateで直近実行したaffected回帰 `sprint-049-test.mjs` は20/0、registry／side-effect violation 0。初回feedbackに記録済みの011／029／035／032 Patch 002／052／040等のgreenは未変更面の証跡として引き継いだ。
- UI／URLは契約どおりN/A。live connector、OAuth、release／cache反映はNon-scopeのままPASSへ算入していない。

### 確定

- AC2: PASS — 診断、明示setup、setup後read、単独readの意味と優先順位が一致。
- AC6: PASS — 限定回帰8/0とaffected回帰20/0。近傍routeの副作用違反0件。
- 未解消finding: 0件。初回finding 1／2はclosed（product）。
- 自己レビュー: 閾値と合格判定は一致し、各変更PASSに実command証跡がある。基準追加、全量再監査、実装・test・spec・progress・stateの編集は行っていない。

以下の初回不合格記録は履歴として保持する。

**判定:** 不合格  
**分類:** implementation-issue  
**評価対象:** Sprint 058 — Astra向け指示・Skill横断監査と局所整理  
**Escalation Recommendation:** none

## 結論

既存の限定回帰はすべてgreenで、17 Skillのfrontmatter、root resolver、current-first、setup bookmark、保存状態、版境界の静的整合も確認できた。ただし、Agenticの実runtime routerに、Sprint 058が修正対象とした接続診断とsetup／read分離の誤routingが残る。

`Googleの接続状態を確認して` は `connections` ではなく `secretary / google-read-only-handoff` へ進む。また、`Googleを接続して、予定を見て` と `Microsoftを接続してOutlookメールを読んで` は、明示されたsetupを落としてread-only handoffへ進む。いずれもrouter自体の副作用は0件だが、現在依頼の意味と段階ロード先が一致しないため、Acceptance Criteria 2、C1、C3、C15を満たさない。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | AC2の対象付き接続診断とsetup／read分離に実runtimeの未解消例がある。 |
| C2 構文・整合 | 5/5 | 5 | PASS | Ruby/Psychで17 Skillのfrontmatterが17/0。両manifestは0.13.1、editionはAgentic、Harness記録値は0.5.1。root resolverも実pathを正しく返した。 |
| C3 機能の実証 | 3/5 | 4 | FAIL | 提供8 scenarioは成功したが、独立した自然文入力3件で誤routeを再現した。static regex PASSを実会話や副作用の証拠には数えていない。 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | 長いread-onlyの節目連絡、短いreadの無言処理、error／partialの説明は成立。誤route自体はC1／C3／C15で判定した。 |
| C5 安全・規律 | 5/5 | 5 | PASS | 独立route実行を含めside effectはfile／adapter／command／externalすべて0。高リスク確認、Secret、no-overwrite、rollback境界の削除はない。 |
| C6 無回帰 | 5/5 | 5 | PASS | 引き渡されたaffected regressionはすべて0 FAIL。今回のFAILは、既存suiteが覆っていない実runtime入力で見つけた製品欠陥である。 |
| C13 edition分離・互換 | 5/5 | 5 | PASS | source 0.13.1、installed private 0.13.0、公開latest未確認を分離。private Skillをpublicへ追加せず、固定provenanceを変更していない。 |
| C14 会話のMarkdown可読性 | 5/5 | 5 | PASS | conditional contextと最終serializer一回の境界を保持し、短い／長いreadの進捗を分離している。 |
| C15 会話authorization・意味保存 | 4/5 | 5 | FAIL | 副作用状態は正直だが、明示された接続診断とsetupの現在意図が別routeへ変わる。ゼロ許容基準のため不合格。 |
| C18 明示memory authorization・内容冪等性 | 5/5 | 5 | PASS | 引継ぎ済み実runtime 15/0でdedupe、append-only訂正、checkpoint partial→commit-only retry、Secret／path拒否を確認。 |

## 証跡

### Evaluatorが今回実行した確認

- `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-058-test.mjs`
  - exit 0、`SPRINT058_PASS=8 FAIL=0 ROUTE_SIDE_EFFECT_VIOLATIONS=0`
  - `NODE_BEFORE=38`、`NODE_AFTER=40`
- `node --input-type=module -e '<routeSecretaryIntentの代表入力>'`
  - `Googleの接続状態を確認して` → `selectedSkill=secretary`、`route=google-read-only-handoff`
  - `Googleを接続して、予定を見て` → `selectedSkill=secretary`、`route=google-read-only-handoff`
  - `Microsoftを接続してOutlookメールを読んで` → `selectedSkill=secretary`、`route=microsoft-read-only-handoff`
  - 3件とも `sideEffect.performed=false`、file／adapter／command／external 0件。
- `ruby /private/tmp/astra-secretary-frontmatter.rb /Volumes/ExternalSSD/workspace/agentic-secretary`
  - `RUBY_PSYCH_FRONTMATTER_PASS=17 FAIL=0`
  - `GENERIC_QUICK_VALIDATE=INCOMPLETE` はPython PyYAML不在による別対象。generic PASSへ昇格していない。
- `node plugins/secretary/scripts/resolve-plugin-root.mjs --skill-file /Volumes/ExternalSSD/workspace/agentic-secretary/plugins/secretary/skills/secretary/SKILL.md`
  - `/Volumes/ExternalSSD/workspace/agentic-secretary/plugins/secretary`
- `/private/tmp/astra-secretary-frozen.json` のSHA-256を現物406 pathへ照合: missing 0、mismatch 0。
- `/private/tmp/astra-secretary-baseline.json` の既存dirty 1,483 pathを照合: missing 0、mismatch 0。staged path 0件。
- source metadata: plugin 0.13.1、edition `agentic-secretary`、Harness記録値0.5.1、17 Skills。
- installed比較: private cache 0.13.0、repository `agentic-secretary-my-vault`。sourceと同一版として扱っていない。

### 引き継いだgreen証拠

- Sprint 058: 8/0、Sprint 049: 20/0、Sprint 011: 73/0、Sprint 035: 15/0、Sprint 029: 25/0、Sprint 032 Patch 002: 32/0、Sprint 052 Voice: 3/0。
- root実行のSprint 040: 15/0。`/private/tmp/astra-secretary-main-040.log` でhelperの内容dedupe、append-only、partial retry、Secret／path拒否を確認した。
- scope内 `git diff --check`: exit 0（rootからの引継ぎ）。

これらのgreenは変更面の広い回帰と安全境界を支えるが、今回の独立runtime誤routeを相殺しない。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---|---|---|
| AC1 | PASS | 15 seed全件とA1〜A6に、処置／残した理由、source位置、edition、dispositionがある。deferred／not-applicableをfixedと表示していない。 |
| AC2 | FAIL | 対象付き接続診断とsetupを含む自然文がread-only handoffへ誤routeする。 |
| AC3 | PASS | 明示設定／memoryのrun-once、saved後置、partial retryと既存高リスク境界は静的指示＋実runtime引継ぎで成立。 |
| AC4 | PASS | conditional context、安全rule保持、長いread-onlyの進捗、Agenticの直接的な表現が成立。 |
| AC5 | PASS | 17 leafはNode path／引数配列のroot案内を持ち、source／installed／public境界も正直に分離。 |
| AC6 | FAIL | affected suite自体は0 FAILだが、独立runtime scenarioで変更した意味面の欠陥を確認した。 |

## Finding／バグ

| # | 重要度 | 対象区分 | 内容 | 再現手順 |
|---|---|---|---|---|
| 1 | Major | product | 接続状態確認が接続診断ではなく通常readへ送られる。`CONNECTOR_READ_ROUTES` の広い `確認` が `CONNECTIONS` の限定語彙から漏れた自然文を先取りする。 | `routeSecretaryIntent("Googleの接続状態を確認して")` を実行。期待 `connections-read-only-diagnosis`、実際 `google-read-only-handoff`。 |
| 2 | Major | product | setupとreadを同時に明示した依頼でread routeがsetupを先取りし、認証・接続工程を落とす。 | `routeSecretaryIntent("Googleを接続して、予定を見て")` またはMicrosoft例を実行。期待 setupを保持するroute、実際 read-only handoff。 |

verification-infra finding: 既存Sprint 058の8 scenarioが上記の自然な接続状態表現と複合意図を覆っていない。ただし主因は実runtime routerのproduct defectである。

## Generatorへの指示

1. 接続診断を表す自然な「接続状態を確認」を `connections` へ一意に送る。
2. 同一依頼にsetup intentとread intentがある場合、明示されたsetupを消さず、接続後のreadを保持できるroute意味にする。
3. 上記3入力を意味回帰へ追加し、既存の単独read、単独setup、保存済みChatwork／Google Chat、side effect 0を増分再確認する。

## Evaluator 自己レビュー

- 閾値と不合格判定は一致しているか: yes
- 各PASSに証拠があるか: yes
- 未検証のlive LLM／external connector／browser UIをPASS扱いしていないか: yes
- FAIL理由は着手時点の契約・rubricに存在するか: yes（AC2、AC6、C1、C3、C15）
- 証拠形式は契約のsafe harbor内か: yes
- static regex PASSを実会話副作用の証拠と呼んでいないか: yes
- findingに対象区分を付けたか: yes
- source／installed／public latestを混同していないか: yes
- Yasashiiの結果をAgenticへ流用していないか: yes
- 実装、test、spec、progress、stateを修正していないか: yes
