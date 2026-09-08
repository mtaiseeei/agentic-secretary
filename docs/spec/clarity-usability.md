# Clarity Usability — Sprint 055

## 位置づけ

これはF85〜F87とSprint 055だけに適用する、既存Project Clarity仕様への追加・限定overrideである。
衝突する箇所では本書を優先し、衝突しない`features.md`、`constraints.md`、`domain.md`、`ui.md`、
`rubric.md`、Clarity acceptance正本は維持する。activeな過去Sprintの基準は変更しない。

## F85 選択sourceからの要件取り込み

- 利用者がsourceとsectionを選ぶ。AIは安全に読めた範囲だけからfeature／claim単位の候補を作る。
- previewは候補ごとに短いclaim要約、source ID／section、安全なdigest、gap、既存Itemとの関係を示す。
- 保存前に利用者が候補を選べる。確認前、拒否、取消、読取失敗ではClarity正本とprojectionを変えない。
- repo外sourceの参照metadataはsource ID／section／digestだけを保存する。Clarity Itemには非機密の短い
  feature／claim要約を保存できるが、raw source本文、absolute local path、Secret、資格情報、顧客本文は保存しない。
- semantic classifier script、repo外の自動探索、全要件の自動網羅は要求しない。既存source scan上限と安全拒否を保つ。

### Coverage

source／sectionごとに`inspected / excluded / uninspected / not-found`と理由を示す。
canonicalがrebuild可能、doctorがhealthy、現在Itemが矛盾なし、のいずれも要件coverageの完全性を意味しない。
未確認・除外・未登録を「網羅済み」「完了」と表示しない。

## F86 Validationを分けた正直な表示

既存quadrant ID、geometry、color、Decision×Executionの派生意味を維持する。
通常Markdown／Mermaidに限り、緑の既存文言「定着・検証／安定している」は
Decision confirmedかつExecution implemented以上という配置上の意味であり、Validation passedの証明ではない。
Xmindの既存label、provider、visual契約は変更しない。

Validationは`unknown / pending / passed / failed / waived`をそのまま表示する。
validated completionは、次をすべて満たすItemだけである。

1. activeな現在Itemである。
2. Decisionが`confirmed`である。
3. Executionが`implemented / verified / operational`のいずれかである。
4. Validationが`passed`である。
5. 現在有効で参照可能なvalidation Evidenceがある。

`waived`、Evidence不足、参照切れ、quadrantが緑というだけのItemはvalidated completionにしない。

### 件数

各Itemは通常集計で次の1区分だけへ入り、3区分は排他的で、`total = active matrix + excluded + historical items`とする。

- `active matrix`: `activeMatrix !== false`のItem。`idea`や期限前`deferred`をAttentionだけから除外しても、この所属は変えない。
- `historical items`: inactiveで、訂正置換済み、`rejected`、`superseded`のいずれかに当たるItem。
- `excluded`: inactive Itemのうち`historical items`に当たらない残りのItem。

Event件数はhistorical Item件数へ混ぜない。別の詳細表示で集合を重ねる場合は重なりを明示する。
Markdownとraw Mermaidは同じStateから同じ区分・件数を示す。

## F87 自然言語からの追記型訂正

- 「タイトルが違う」「この根拠は別項目」のような依頼から、title、claim、Evidence associationを訂正できる。
- 利用者へraw Event／Item／Evidence JSON全文を要求しない。対象、変更前後、理由、影響、競合をpreviewする。
- 確認後だけ新Eventとして訂正し、旧ID、旧内容、旧association、理由をappend-only historyに残す。
- silent overwrite、履歴削除、現在のcompletion／Validationの無根拠な格上げをしない。
- 同じsource＋locator＋digestでも異なるclaimは別identityとして保持する。同じoperationのretryだけを重複0件にする。
- 旧Event／Evidenceのrebuild／replayで、訂正後Stateと履歴を再現できる。

### 競合・partial

previewの基準revisionが変わったstale changeは適用せず、再previewする。
各承認済みItemの登録・訂正は既存logical write保護の1単位として整合し、Eventだけの不完全記録を成功にしない。
複数候補の一部成功は、確定した各Itemが完全で、未確定Itemと理由を明示する場合だけ許容する。
batch全体を束ねる新transaction frameworkは要求しない。

## 評価overrideとsafe harbor

F85〜F87は既存rubricのC19-Clarity、C20、C23、C24とSprint 055契約で評価する。
上記の保存禁止、coverage誤表示、validated completion誤判定、履歴消失、claim誤dedupe、stale上書き、
不完全Eventの成功表示はいずれもゼロ許容である。

隔離した小規模Node／CLI fixtureでpreview→一部confirm、表示、訂正→rebuild／replay、retry、
reject／cancel／error／stale conflictを実行し、command、exit code、前後件数、Event／Evidence／State整合、
通常Markdown全文、raw Mermaid、ID／associationの前後一覧を記録すれば十分とする。

新しいweb app、screenshot、live host 4-way matrix、CI／network、full Sprint 050 wrapper、64 actor stress、
archive／recursive loop、統一evidence schema／collector／attestationを追加条件にしない。

## Non-scope

- Xmind、4象限のID／位置／色／Decision×Execution意味の変更。
- Memory Radar、Skill Coach、旧workspace migration、初回publish upstream設定。
- version、commit、merge、push、tag、Release、marketplace、install、downstream／my-vault反映。
