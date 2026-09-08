# Sprint 055: Clarityの要件取り込み・正直な状態表示・安全な訂正

## 種別

Main Sprint

## Type

standard

## Risk

high — 永続データの訂正と旧Event／Evidenceからの再構築を扱うため。

## ゴール

Project Clarityを実利用し、利用者が選んだ資料から要件を機能単位で確認して登録し、
完了と検証状態を混同せず把握し、誤登録を自然な会話から履歴を保って訂正できる状態にする。

## 含む機能

F85、F86、F87

## 前提

- 対象はpublic `agentic-secretary`の共通Clarity面で、Claude Code／Codexから同じ意味で使える。
- Sprint 054はdoneである。`sprint-050-patch-007`のawaiting-evalは別履歴として保持し、本Sprintで完了へ変えない。
- 「健康なClarity正本」と「元要件を十分に登録済み」は別状態である。
- source scanの容量・件数・安全拒否は既存上限を維持する。

## 利用者フロー

### 1. 要件の取り込み

1. 利用者が読むsourceとsectionを選ぶ。
2. AIが安全に読めた範囲から、文書単位ではなくfeature／claim単位の登録候補を要約する。
3. 各候補にsource ID／section、根拠の短いdigest、未確認範囲、重複・競合候補を示す。
4. 利用者がpreviewを確認し、承認した候補だけを保存する。

### 2. 現在地の確認

1. 通常のMarkdownとMermaidで同じItem集合・4象限を確認できる。
2. 各ItemはDecision、Execution、Validationを分けて表示する。
3. validationは少なくともpending／unknown／failed／passed／waivedを区別する。
4. active Matrix対象、excluded、historical Itemの件数を分けて表示する。

### 3. 登録内容の訂正

1. 利用者は「このタイトルは違う」「この根拠は別の項目」のような自然な依頼をする。
2. AIは訂正対象、変更内容、理由、影響、競合の有無をpreviewする。
3. 利用者の確認後だけ訂正し、旧ID・旧内容・旧Evidence associationを履歴として残す。
4. retry、拒否、取消、失敗、staleな同時変更を安全に扱う。

## Acceptance Criteria

1. **要件候補（F85）**: 利用者が明示選択した安全なsourceだけを読み、feature／claim単位で候補を提示する。
   source／section、短い要約、未確認・除外範囲、既存Itemとの関係が確認前に分かる。
2. **確認前副作用0件（F85）**: preview、拒否、取消、読取失敗ではEvent、Evidence、State、projectionを変更しない。
   承認後だけ候補を保存し、partialを全件成功と表示しない。
3. **外部source最小化（C5）**: repo外sourceの参照metadataは、利用者が選んだ安全なsource ID、section、digestだけを保存する。
   Clarity Itemには非機密の短いfeature／claim要約を保存できるが、absolute local path、raw source本文、Secret、資格情報、顧客本文を保存しない。
4. **要件coverageの正直さ（F85）**: canonicalが再構築可能でdoctorがhealthyでも、未確認source／sectionや登録漏れがあれば
   「要件を網羅した」「完了」と表示しない。機械的な意味classifierやrepo外の広域scanを必須化しない。
5. **状態表示（F86）**: MarkdownとMermaidは既存のquadrant ID、位置、色、Decision×Executionの派生意味を維持しつつ、
   validation状態とvalidated completionを別表示する。緑はvalidation passedを自動的に意味しない。
   validated completionはactiveかつDecision confirmed、Execution implemented／verified／operational、Validation passed、
   有効なvalidation Evidence参照ありをすべて満たすItemだけである。waived、missing Evidence、参照切れは完了にしない。
6. **件数の透明性（F86）**: active Matrix対象、excluded、historical Item、全Itemの件数を別ラベルで示す。
   historical Itemはevent件数ではなく履歴参照対象のItem数であり、重複表示する場合は重なりを明示する。
   同じ正本から再生成した出力で整合し、pending／unknown／failed／waivedをpassedまたは完了へ丸めない。
7. **自然言語の訂正（F87）**: title、claim、Evidence associationを利用者の自然な依頼から訂正できる。
   raw `Event`／`Item`／`Evidence` JSON全文の手入力を利用者へ要求しない。
8. **追記型訂正（F87/C5）**: 訂正理由、旧ID、旧内容、旧associationをhistoryから追跡できる。
   silent overwrite、履歴削除、現在のcompletion／validationの無根拠な格上げをしない。
9. **同一性と冪等性（F87/C5）**: 同じsource＋section／locator＋digestでも異なるclaimは別物として保持し、
   同じ操作のretryでは重複しない。旧データからのrebuild／replayでも訂正後状態と履歴が一致する。
10. **競合と失敗（C5/C6）**: preview後に対象が変わったstale changeは誤適用せず、安全に再previewへ戻す。
    各承認済みItemの登録・訂正は論理write単位で整合し、Eventだけの不完全記録を成功として残さない。
    複数候補の一部成功は、各確定Itemが完全で、未確定Itemと理由を明示する場合だけ許容する。batch全体の新transaction基盤は要求しない。
11. **共通性と限定差分（C2/C6）**: Claude Code／CodexのSkill利用で同じ意味となり、既存Clarity logical write保護を再利用する。
    Xmind、Memory Radar、Skill Coach、他Skill、release／downstream機能へ変更を広げない。

## 検証スコープ（着手時に固定）

### 検証対象

- 隔離した小規模なNode／CLI data fixture上の要件preview→confirm、状態表示、訂正→replay。
- hostに依存しない共通Skill workflowの代表会話。
- 生成された通常Markdown、raw Mermaid、正本Event／Evidence／Stateの整合。
- 実diffに直接関係する既存Clarity検査のうち、小さく実行できる入口だけ。

### 必須シナリオ

1. 選択sourceから異なる2 claimをpreviewし、一部だけ承認する。
2. repo外source metadataはID／section／digestだけで、Itemの短いclaim要約以外のraw本文・absolute path・Secretが残らない。
3. healthy canonicalだが未確認範囲ありを、完全coverageと表示しない。
4. 緑象限にvalidation pending、failed、passed、waived、Evidence参照切れを置き、厳密なvalidated completion表示を確認する。
5. active Matrix対象／excluded／historical Item／全Itemの件数と重なり表示をMarkdownとMermaidで照合する。
6. title／claim／Evidence associationを訂正し、旧ID・理由・履歴をreplay後も確認する。
7. 同じ操作のretryは重複0件で、同じlocatorの異なるclaimは2件を保つ。
8. reject／cancel／error／stale conflictで正本が不変、またはItem単位で完全な確定分だけを持つ明示的partialとなる。

### 証拠形式（safe harbor）

- 実行command、exit code、fixtureの前後件数、期待値と観測値。
- preview／confirm／reject／cancel／error／conflictの利用者向け出力。
- Event／Evidence／Stateの整合結果、rebuild／replay結果、ID／associationの前後一覧。
- 通常Markdown全文とraw Mermaid、およびquadrant mapping・validation・件数の照合。

上記で十分とする。新しいweb app、screenshot基盤、live host 4-way matrix、統一evidence schema、
collector、attestation、追加runnerを合否条件にしない。

## 変更可能面

- `plugins/secretary/scripts/clarity.mjs`
- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `plugins/secretary/scripts/lib/clarity-projection.mjs`
- 必要な場合だけ、同じ論理write保護を再利用する狭いhelper
- `plugins/secretary/skills/clarity/SKILL.md`
- 本Sprint専用の小さいfixture／回帰検査

## Non-scope

- Xmindの表示・provider・schemaの変更、4象限のID／位置／色／Decision×Execution意味の変更。
- semantic classifier script、repo外の自動探索、source scan上限の解除、全要件の自動網羅保証。
- Memory Radar／Skill Coachそのもの、旧workspace migration、初回publish upstream設定。
- full Sprint 050 wrapper、64 actor stress、archive／recursive test loop、CI／network／live host matrix。
- version変更、commit、merge、push、tag、Release、marketplace、install、downstream／my-vault反映。

## 完了条件

Generatorは本Sprintだけを実装し、変更面、既知制限、起動・回帰command、具体的な評価scenarioを
`docs/progress/sprint-055.md`へ記録する。検証コードが製品変更を上回る、または2回連続で検証コードだけを
変更する場合は、次dispatch前にOrchestratorへ報告して止める。

fresh独立Evaluatorが固定candidateを実操作し、既存rubricと本契約を満たす証拠を
`docs/feedback/sprint-055.md`へ記録した後だけ、Orchestratorが完了を判断する。
