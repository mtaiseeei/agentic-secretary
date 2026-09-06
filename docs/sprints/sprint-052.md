# Sprint 052 — Secretary Voice

- Type: standard
- Risk: medium（全会話面に効く共通ruleとserializerの変更であり、第三者視点や未実行の完了表現が残ると体験と安全の両方を損なう）
- Candidate version: 変更しない（version更新・releaseは本Sprint外）
- 依存: sprint-051の完了candidate `283627a`
- 含む機能: F83（関連: F20、F51、F52、F54、F55、F59〜F63）

## ゴール

秘書が、名前を連呼する第三者的な報告ではなく、既定「私」の一貫した話者として自然に返事する。
ただし軽い人格は話し方に限り、人間の実体・感情・体験を捏造せず、保存・未保存・失敗・部分成功・一時反映の事実を崩さない。

## 確定済みの製品判断

- 一人称は既定「私」。`preferences.md` の既存「言葉遣い」に「一人称」1項目だけを追加し、明示変更は既存 `pref-set` で行う。値は前後空白除去後1〜16 Unicode code pointの改行なし文字列とし、既存の `oneLine`／secret検査を維持する。一人称としての意味はLLMが判断し、意味parserや固定allowlistは追加しない。自由文の口調・秘書名・役割から推測しない。
- 名前・実行状態・安全ruleは一人称設定より優先する。設定値が自身の名前または完了主張として働く文脈では、その値を語り手として反復せず「私」または自然な主語省略を使う。設定値を黙って書き換えず、全返答への一人称表示を強制しない。
- 秘書が自称・名乗りとして自身の名前を使えるのは、初回設定完了またはrename直後に返す最初の成功結果、秘書自身の名前への質問に対する回答、同じ会話で別repoからcanonical workspaceへ初めてroutingできた結果の4場面だけで、許可された返答内でも合計1回以内とする。通常応答、session開始、名前で呼ばれただけの返答での自称・名乗りは0回とし、routing専用の永続状態を追加しない。他者・資料の名前を必要な事実として述べることは妨げない。
- 共通rules層で全会話面を統一し、Agenticの技術的に直接的な表現とYasashiiの平易さは保つ。
- 追加のユーザー判断は不要。実装は本契約の範囲で進める。

## Scope

1. `conversation-contract.md`、`common-language.md`、両style／copy、最終応答serializerの会話発話における話者契約を揃える。下位SKILLは共通rule参照で済むなら重複定義せず、競合する指示・例・既定文だけを修正する。Chatwork／Google Chat wizardのUI label／copyは対象外とする。
2. `preferences.md` template、欠損時の既定生成、settingsの変更可能項目、`pref-set` の部分更新を「言葉遣い / 一人称」へ対応させる。旧preferencesの欠損時は「私」で動き、他項目と手書き行を保持する。値には既存 `oneLine(..., { secret: true })` と前後空白除去後1〜16 Unicode code pointの境界だけを適用し、応答時の意味判断を新しいparserへ移さない。
3. イベント直後の許可4応答と通常0回を、名前未設定、名前での呼びかけ、同名の人間・顧客・author・引用・コード・file本文の負例と一緒に守る。別repo routingは同じ会話内の最初の成功結果だけとし、新しい永続状態を持たない。他者・資料の名前を必要な事実として述べる通常応答は許す。
4. 全てのユーザー向けSKILL、rules、copy、serializer、templates、conversation inventoryを棚卸し、対象漏れと第三者的な固定文を0件にする。file数だけでなく実内容を検査する。
5. 既存の `answered / question / saved / error / partial`、memory authorization、予定した副作用回数、name routingの人間／引用区別を回帰させない。

## Non-scope

- 音声入力・音声出力・音声合成、濃いキャラクタープリセット、人格system、複数の新preferences項目。
- Memory Radar、Skill Coach、記憶の自動保存。これらはClarity PR #11のmerge後のmainを基点に別契約する後続候補として残す。
- scripts全面簡素化。安全・データ整合・外部操作の決定的scriptsは維持し、意味判定・文言・要約をLLM中心に寄せる希望は後続候補とする。Chatworkはplugin内Skillのままとする。
- 下流repoへの実反映、4hostへのinstall・cache更新、version更新、release、PR作成、push、外部サービス操作。
- 新しい会話runner、大きなmatrix、統一collector、attestation、新しいverification framework、不可避でないWindows CI gate。

## Acceptance Criteria

1. **共通Voice（C1/C19）**: wizard UI label／copyを除く全会話発話面が共通ruleから同じ話者契約を読み、自分の保存を「<秘書名>の継続記憶」と第三者目線で語る現行競合が0件である。wizard UI label／copyは変更0件である。
2. **一人称設定（C3/C19）**: 新規・欠損・空・旧preferencesは「私」。明示値は前後空白除去後1〜16 Unicode code pointの改行なし文字列だけを既存oneLine／secret検査後に保存し、`pref-set` は対象行だけを更新して手書き行・他設定・journal・commit境界を既存契約どおり保つ。意味parser／固定allowlistは追加しない。自身の名前や完了主張になる文脈では保存値を変えず「私」または自然な主語省略を使い、全返答へ一人称を強制しない。
3. **名前の使用場面（C16/C19）**: 初回設定完了／rename直後の最初の成功結果、名前質問への回答、同じ会話で最初に成功したcanonical routing結果では、自称・名乗りとして自身の名前を返答内で合計1回以内表示できる。それ以後の通常応答、session開始、名前で呼ばれただけの場合は0回。routing用の永続状態を増やさず、名前未設定でも自然に返し、人間・引用等のrouting負例を保つ一方、他者・資料の名前は必要な事実として記述できる。
4. **状態に忠実な返事（C5/C15/C18/C19）**: 保存成功の後だけ保存済みを語る。確認待ち・未保存・失敗・checkpointだけの失敗・一時反映を全完了と語らず、一人称変更で既存のauthorizationと副作用回数を変えない。
5. **人格の境界（C5/C19）**: 人間の身体・感情・体験・対人関係の捏造、不要な名乗り、入力にない親密さの事実化が0件である。
6. **edition品質（C7/C13/C19）**: AgenticとYasashiiは一人称・名前・事実の意味を共通にし、技術的に直接的な説明／平易な説明の差を保つ。Chatwork／Google Chat wizard copyは変えない。
7. **inventory・回帰（C2/C6）**: 全SKILLを含む追跡inventoryが実内容と一致し、Voice専用検査と下記の小さい関連suiteが0 FAIL。既存の安全assertを削除・緩和しない。
8. **作業境界（C5）**: 製品実装・専用検査と必要な既存関連assertだけを変更し、version、release、downstream、installed cache、PR、push、外部サービスは0変更・0操作とする。

## 検証スコープ（着手時に固定）

- 検証面: 現在checkoutの公開正本と隔離した合成workspace。実downstream、実HOME、installed cache、外部サービスは使わない。
- 必須シナリオ: 既定・欠損・空・1／16 code point境界・改行／secret拒否を含む一人称、設定が自身の名前／完了主張になる会話での「私」または自然な主語省略と保存値不変、memoryの保存成功／未保存／失敗／partial／一時反映、イベント直後の名前許可4応答／禁止代表場面／同じ会話でのrouting反復／同名人間、両editionの代表応答、wizard UI label／copy不変。同じ状態を全SKILLと掛け合わせるmatrixは作らない。
- 必須command:
  - `node scripts/sprint-052-secretary-voice-test.mjs`
  - `bash scripts/sprint-011-regression.sh`
  - `node scripts/sprint-029-rule-boundary-test.mjs`
  - `node scripts/sprint-032-patch-001-readability-test.mjs`
  - `node scripts/sprint-039-test.mjs`
  - `node scripts/sprint-040-test.mjs`
  - `git diff --check`
- 証拠形式（safe harbor）: commandのexit codeとpass/fail件数、対象inventory、preferencesと副作用の前後snapshot、合成会話の完全な返答、Evaluatorが自然さ・話者・事実状態を読んだ記録、not-runの外部操作。
- 静的markerや部分文字列だけで「自然な応答を保証」と判定しない。上の合成会話全文を独立レビュする。candidate rulesを読める既存の対話面が利用可能なら、非破壊の代表会話を追加確認し、利用不能なhostは `unverified` と区別する。既存live runnerの認証不足だけを製品失敗にせず、未実施hostを検証済みにも昇格しない。
- これらを満たせば十分とし、release baseline、重い下流candidate再生成、新runner、統一証拠schema、Windows CIを追加の合否条件にしない。

## Fable事前レビュ観点

Generator開始前に、(1) 四つの名前例外が広がらないか、(2) 一人称設定が口調や秘書名の推測に戻っていないか、
(3) 自然さが未実行の完了主張を生まないか、(4) 共通ruleと両edition差分が逆転していないか、
(5) 検証が新frameworkやlive認証に膨らんでいないかを敵対的に確認する。
