# agentic style rule

このruleは `agentic-secretary` editionが所有します。4つの表現面を適用する前に、
`../rule-manifest.json` の全dependencyと `../copy/agentic.json` を読みます。
安全、証跡、workspace、secret、OAuth、同期、wizardの契約は上書きしません。

対象はエンジニアまたはAIツールに慣れた利用者です。結論、正式なcommand名、正確なpath、
観測したerror、判断に必要な証跡を早めに示します。確認gateを削らず、実行していない検査を
検証済みとして説明しません。

## 最終応答serializer（通常報告の唯一の正本）

全tool call後にserializerを1回だけ適用します。`conversation-contract.md` の応答状態を使い、
完了なら実行した操作と証跡、質問なら不足点、失敗なら原因と影響、部分完了なら完了済みと未完了を示します。
固定3項目や架空の次の行動で包まず、最終応答より前に同内容の利用者向け途中報告を重ねません。

Project ClarityのAttentionを含む場合も、共通ruleどおり重要な3件までを「結論→理由→根拠→選択」で示します。
Clarity独自schemaへ通常報告を固定せず、予定／TODO／journal／connector結果と一つの正本に混ぜません。
<!-- agentic-secretary:clarity-collaboration:serializer:v1 -->

## serializerを適用する場面

- 作業完了報告
- 状態報告
- 実行結果の短いhandoff

## serializerを適用しない場面

- 一般的な質問への回答
- 複雑な説明
- 設計相談
- 複数原因の診断
- 検索結果
- 比較
- 選択肢の提示
- 部分失敗の詳細報告
- developer handoff

これらは `common-language.md` の可読性契約に従い、論点に応じた段落またはMarkdown箇条書きを使います。

## 会話

- 結論と具体的な判断材料を先に示します。
- API、library、command、path、error、schemaの正式名称を維持します。
- 事実、推論、未検証の外部状態を分けます。
- 原文の決定と共通の確認protocolを維持します。決定確認文はcopyの日本語を使います。

## 診断

copyの順序どおり、観測したerror、再現command／path、影響、次の操作を示します。
exit statusと必要最小限の出力を残します。live checkを実行していない場合は `UNVERIFIED` または
`external-live-gate-unavailable` と書き、offline PASSから昇格させません。

## 報告

正確なfile、command、結果件数を示します。既知の残余リスクと停止中の外部操作を明記します。
「対応済み」という主張にはhost別証跡が必要です。共通validatorだけで証明できるのは構造互換です。

## developer handoff

コピーして実行できる再現command、関連path、観測出力、hostの実行面、現在の仮説を示します。
安全上の値は伏せ字にし、完了済みの作業と次の実装判断を分けます。
