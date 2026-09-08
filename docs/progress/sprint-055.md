# Sprint 055: Clarityの要件取り込み・正直な状態表示・安全な訂正

**ステータス:** Generator実装・小規模回帰完了（独立Evaluator待ち）

## スプリント契約

### 作るもの

- F85: 利用者が選んだ安全なsource／sectionからAIが作ったfeature／claim候補を、gap・既存Itemとの関係つきでpreviewし、選択確認後だけItem単位で保存する共通入口。
- F86: 通常Markdown／raw MermaidへValidationと厳密なvalidated completion、`active matrix / excluded / historical items / total`の排他的件数を同じStateから表示するoverlay。既存quadrant ID／geometry／color／membershipとXmindは変えない。
- F87: title、claim、Evidence associationをpreview／確認後にappend-only Eventで訂正し、旧ID・旧内容・旧association・理由をrebuild／replay可能に保つ入口。同一operation retryは重複させず、同じlocator／digestの異なるclaimは別identityにする。

### 成功の確認方法

- 実際の利用者データには触れず、`mkdtemp`の隔離fixtureだけでpreview→一部confirm、reject／cancel／error、stale conflict、訂正→rebuild／replay、retryを実行する。
- 前後のEvent／Evidence／State件数とID／associationを照合し、外部source metadataがID／section／digestだけであること、raw本文／absolute path／Secretが保存されないことを確認する。
- 緑象限へvalidationの各状態と参照切れを置き、validated completionと4区分件数が通常Markdown／raw Mermaidで一致することを確認する。
- 小さい既存近傍回帰として、内容確認後に`node scripts/sprint-043-test.mjs`を使い、Xmind共有visualを含む既存projection契約を確認する。Sprint 050 wrapper、archive／recursive loop、64 actor stress、network／CIは実行しない。

## スコープ境界

- 変更対象はSprint契約で許可されたClarity product files、`skills/clarity/SKILL.md`、小さい直接回帰、当progressだけとする。
- `.clarity/`と`CLARITY.md`はlive dogfood dataとして読取・書込とも行わない。
- spec、state、feedback、Xmind、他Skill、version／release／install／downstreamは変更しない。

## 実装した内容

- `requirements-preview`／`requirements-apply`を追加した。AIが選択sourceから組み立てたfeature／claim候補を、source ID・section・digest・coverage・gap・既存Itemとの関係つきでpreviewし、選択承認後だけ既存canonical lock／logical writeで保存する。
- Evidence identityへ短いclaim summaryを含め、同じlocator／digestの異なるclaimを分離した。既存の同一Evidence／Event retryは旧IDを返し、schemaVersionやtimestampだけの差を競合扱いしない。
- revision bindingと各writeの`expectedRevision`で無関係な同時変更を取り込まない。成功済みoperationのretryは後続の無関係変更があってもwrite 0で既存IDへ収束する。遅いcleanup／release失敗は`details.changed`と処理段階からEvidence／Itemの保存有無、未確認selected候補をpartialとして返す。
- `correction-preview`／`correction-apply`と`item.corrected` Eventを追加した。旧Item ID・旧title／claim・旧Evidence association・理由を履歴へ残し、置換前Itemはmatrix／Attentionの現在集合から外す。titleだけならpassedを保持し、claimまたはassociation変更時はpassedをpendingへ戻す。
- 通常Markdown／raw MermaidにValidation 5状態、厳密な検証済み完了、`active matrix / excluded / historical / total`の排他的件数を追加した。参照は1件以上かつ全件availableの場合だけ到達可能とする。Mermaidのx軸文言を既存座標へ合わせたが、quadrant ID／座標／色／membershipとXmind生成は変更していない。
- Clarity Skillへ自然言語→AI作成の最小入力→preview→明示確認の流れを追加した。曖昧な訂正対象は一度確認し、利用者へraw JSONの手入力を求めない。

## 変更面とサイズ

- Product: `clarity.mjs`、`lib/clarity-core.mjs`、`lib/clarity-projection.mjs`、`skills/clarity/SKILL.md`。tracked diffは582行追加・16行削除。
- Regression: `scripts/sprint-055-test.mjs` 237行。検証コードはproduct差分を上回っていない。
- Handoff: このfileのみ。spec、state、feedback、live `.clarity/`、`CLARITY.md`は変更していない。

## 起動・回帰

- 起動command: `node plugins/secretary/scripts/clarity.mjs status <repo-root> --json`（CLIのためtest URLなし）。
- 回帰command: `node scripts/sprint-055-test.mjs && node scripts/sprint-043-test.mjs`
- 結果（2026-09-07）: exit 0。Sprint 055は8 pass／0 fail、Sprint 043は29 pass／0 fail／1 NOT-RUN。NOT-RUNは契約どおり外部live未承認の`XM-007`だけ。
- `node --check`はcore／projection／CLIの3fileでexit 0。`git diff --check`もexit 0。
- `skill-creator`の`quick_validate.py`はhostにPyYAMLがなく`ModuleNotFoundError: yaml`で未実行。install禁止のため依存追加は行わず、既存frontmatterを維持して本文だけを更新した。

## 評価scenario

1. 2つのclaimと未確認coverageをpreviewし、1件だけ承認する。拒否・取消・unsafe sourceはwrite 0、同じoperationのretryは件数とIDが不変、同じlocator／digestの別claimは別Item／Evidenceになることを確認する。
2. Evidence commit後／Item commit後のcleanup失敗を隔離fixtureで発生させ、`changed`、`evidenceSaved`、`itemSaved`、`unconfirmed`、`remainingSelected`が実際の正本と一致することを確認する。
3. title訂正、claim訂正、Evidence association訂正を順に行い、旧ID・理由・旧associationがhistoryへ残ること、title-onlyはpassed維持、claim／association変更はpassedをpendingへ戻すこと、rebuild結果がstored Stateと一致することを確認する。
4. 緑Itemへpending／failed／passed／waived／mixed参照切れを置き、完了は全条件と全validation参照availableを満たす1件だけであることをMarkdown／Mermaidで確認する。ideaはactive matrixに残ってAttentionだけから外れ、rejectedと訂正前Itemはhistoricalへ1回だけ数える。
5. Sprint 043でstable座標、4色、既存Xmind Sheet／branch、provider fallback、raw Mermaid／Markdownを再確認する。

## 既知の制限・リスク

- 自然言語の意味解釈はSkillを使うAIの責務であり、新しいsemantic parserやrepo外自動探索は実装していない。
- 実Xmind MCPのlive操作は未承認のため未実行。共有visualとlocal archiveの既存隔離回帰は通っている。
- Sprint完了判定は行っていない。fresh独立Evaluatorによる実操作と記録が必要。
