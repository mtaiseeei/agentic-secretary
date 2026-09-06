# Sprint 053 Generator handoff

## Sprint 053: LLM中心の読み取り・整理・提案
**ステータス:** 実装完了 - 評価待ち

### 実装内容

- `memory-care` のtimeline、`daily` のmorning / evening、`weekly` の週次振り返りを、必要な原本がcanonical rootから安全に取得済みで対象範囲が確認できる場合は、read-only helperを追加実行せずLLMが整理できる指示へ改訂した。
- `timeline` / `weekly` は期間抽出、大量記録、再現可能な一覧が必要な場合の任意helperとして残した。active / archive、日付、種類、出典、訂正・変更履歴、部分取得の正直な表示、`all`相当のdecision正本優先とjournal `decided`重複抑止を維持した。
- `projects` の`promotion-status`を任意のread-only診断へ明記し、件数基準未満でもLLMが実内容から「読みにくい」「PJ固有ガードレールが必要」と理由を示して提案できるようにした。承認後は理由に対応する`--hard-to-read`または`--guardrail-needed`と`--confirm`を、既存`promote-full`の唯一の書込み経路へ渡す。
- `secretary` routerとworkspace `templates/AGENTS.md`にも同じ境界を最小限反映し、保存・削除・reindex・Git・同名PJ照合・rollbackは既存の決定的シームから外さないことを明記した。安全拒否を直接Readで迂回しない。
- 既存の`scripts/sprint-015-regression.sh`へ、低件数PJの`guardrail-needed`／`hard-to-read`を別々に実行する確認前不変・承認後5役割のassertを追加した。新規test file、runner、matrix、frameworkは作っていない。
- `conversation-core-inventory.json`は変更した6 surface（`skill-memory-care`、`skill-secretary`、`skill-daily`、`skill-weekly`、`skill-projects`、`template-agents`）のsha256だけを更新し、Sprint 052のvoiceContract・既存metadata・他surfaceは保持した。

### 自己評価

| 基準 | スコア(1-5) | コメント |
|------|------------|---------|
| 機能完全性 | 5 | 取得済み原本のLLM整理、helper任意化、低件数の昇格理由、flag付き既存昇格経路を4対象へ反映した。 |
| 動作安定性 | 5 | 既存のread/write seamを変更せず、必須offline回帰がすべてgreen。 |
| デザイン性 | 4 | helperを便利な再現可能手段として残し、意味判断と事故防止の境界を各入口で読み取れるようにした。 |
| 独自性 | 4 | 件数だけに依存せず、実内容の読みにくさ・PJ固有ガードレールを理由にできるLLM中心の昇格導線を追加した。 |
| エラーハンドリング | 5 | canonical root／symlink／archive／範囲拒否、部分取得、確認前副作用0、既存atomic rollbackの指示を維持した。 |
| 回帰なし | 5 | Sprint 010／012／015／052、inventory全38面、差分checkが0 failure。 |

### 技術的な判断

- 意味の要約・並べ替えはSkillのLLM指示で扱い、決定的helperや新しい意味parserは追加しなかった。
- 原本を直接整理できる条件を「canonical root、対象範囲、active / archive、日付・種類・出典が安全に確認済み」とし、安全境界で拒否された対象の迂回を禁止した。
- `promote-full`の既存引数と内部検査を利用し、flagを常に付けるのではなくLLMの理由に対応するものだけを渡す指示にした。

### 変更規模と境界

- 今回の製品instructions差分は、対象Skill／router／templateで54行追加・16行削除。既存のSprint 015回帰への追加検証コードは17行で、検証コードが製品diffを上回っていない。
- inventoryはハッシュ更新のみ。既存Sprint 052の未commit差分、spec／contract／state／feedback／config、外部サービス、実HOME、downstream、release、push、PR、install／cacheは変更・操作していない。
- `scripts/sprint-015-regression.sh`の実fixture操作は一時隔離workspaceに限定し、終了時に削除された。常駐server／watcher／child processは起動していない。

### 必須回帰の実行結果

| Command | Exit | 観測結果 |
|---|---:|---|
| `bash scripts/sprint-010-regression.sh` | 0 | `PASS=56 FAIL=0` |
| `bash scripts/sprint-012-regression.sh` | 0 | `PASS=38 FAIL=0` |
| `bash scripts/sprint-015-regression.sh` | 0 | `PASS=74 FAIL=0`。低件数`guardrail-needed`と`hard-to-read`を個別に確認前停止、`--confirm`後に各5役割を確認。 |
| `node scripts/sprint-052-secretary-voice-test.mjs` | 0 | `SPRINT052_VOICE_PASS=3 SPRINT052_VOICE_FAIL=0`。全38 inventory surfaceの実hashも一致。 |
| `git diff --check` | 0 | 出力0件 |

全commandは直列実行した。テスト開始前の親オーケストレーター実測Node process数は19件（40未満）で、60件超の中断条件には達していない。sandbox内のsysmond不可信な値は採用していない。

### 必須意味シナリオ（合成会話。live host出力ではない）

以下の3例は、LLMが返す意味と安全境界をEvaluatorが読むための合成例であり、インストール済みhostの実会話証拠ではない。実fixtureで実行した事実は上の回帰表と、各例の「fixture観測」に分けている。

#### 1. 日次 / timeline

**Raw input:** `今日やったことと決めたことを教えて`

**前提:** 2026-09-05のjournal原本と同日のdecision正本をcanonical rootから安全に取得済み。journalには`did`と、decision正本の参照を含む`decided`があり、decision本文には訂正履歴がある。対象範囲のwriteはない。

**Reply（全文の合成例）:**

> 2026-09-05の記録です。
>
> - やったこと: 顧客向け資料の確認を完了しました（journal / did / 2026-09-05）。
> - 決めたこと: 次の候補を採用しました（decision正本 / 2026-09-05）。
> - 変更: 以前の候補は、今回の決定で置き換えました。変更前の記録も残っています（decision正本 / 2026-09-05）。
>
> journal側の同じ`decided`行は重ねず、活動・決定・変更を分けて整理しています。閲覧だけなので、ファイル・journal・Gitは変更していません。

**意味判定:** 日付、did／決定、decision正本の出典、変更履歴を保持し、同じ決定を二重表示しない。timeline helperを追加実行しない前提でも、閲覧writeは0件。

#### 2. 週次の十分性と部分取得

**Raw input:** `先週を振り返って`

**前提:** 対象週は2026-08-24〜2026-08-30。activeとarchiveの日次journal原本7日分を安全に取得済みで、各pathと日付が確認できる。過去の週次要約は入力にしていない。

**Reply（全文の合成例）:**

> 2026-08-24〜2026-08-30を振り返ります。7日分のjournal原本（active / archive）を読み取りました。
>
> **活動（did）**
>
> - 顧客候補を整理しました（journal / did / 2026-08-25）。
>
> **決定（decided）**
>
> - 提案書の構成を変更しました。変更前の決定は残しています（journal / decided / 2026-08-27）。
>
> **翌週への申し送り（next）**
>
> - 次回の打合せで候補を確認します（journal / next / 2026-08-30）。
>
> 活動・決定・申し送りは混ぜていません。閲覧だけなので、新しい証明file、journal、Git commitは作っていません。

**部分取得時の意味判定:** 7日中5日しか読めない場合は「読めた5日分を整理しました。2026-08-26と2026-08-29は取得できていないため、週全体の網羅・0件・最新とは言えません」とし、読めない範囲を隠さない。安全拒否時に直接Readで迂回しない。

#### 3. プロジェクト昇格

**Raw input:** `このPJは件数が少なくても、PROJECT.mdが読みにくいのでフル運用へ整理するか相談したい`

**前提:** open / general / activeの低件数PJを安全に取得済み。`PROJECT.md`に状態、判断、作業情報が混在しているが、`promotion-status`は未実行。まだユーザー承認はなく、file／journal／Gitは不変。

**Reply（全文の合成例）:**

> 件数は少ないですが、`PROJECT.md`に現在の状態と判断・作業の情報が混在していて、必要な情報を追いにくくなっています。PJ固有のガードレールも必要かを確認できます。
>
> フル運用へ整理しますか？
>
> - フル運用へ整理する
> - 今はライトのまま

**拒否後のReply:**

> 了解しました。今はライトのままにします。確認前のため、プロジェクト、journal、Gitは変更していません。

**承認後の観測:** 「フル運用へ整理する」を受けた場合だけ、理由に対応する`promote-full --hard-to-read --confirm`（ガードレールが必要な場合は`--guardrail-needed`も付ける）を既存シームへ渡し、5役割のatomic結果を伝える。`PROJECT.md`等の直接分割や、flagの無条件付与はしない。

### Evaluator への引き渡し事項

- 起動方法: 常駐serverなし。対象Skillを通常のplugin rootから読み込む。
- テスト対象URL: `not applicable`
- 回帰チェック: `bash scripts/sprint-010-regression.sh && bash scripts/sprint-012-regression.sh && bash scripts/sprint-015-regression.sh && node scripts/sprint-052-secretary-voice-test.mjs && git diff --check`（個別実行時はいずれも上表のexit 0）。
- 手動確認導線: 上記3合成会話を、十分に取得済みのactive／archive原本、部分取得、低件数PJの実内容で再現し、helper未実行でも意味保持できるか、拒否・承認前後のsnapshot、直接Read迂回0件、`promote-full`のflagと`--confirm`、既存5役割・rollbackを確認する。
- 実fixture観測: Sprint 015の一時workspaceで、`promotion-status`なしの低件数`hard-to-read`／`guardrail-needed`各経路、確認前0変更、承認後5役割を実行済み。Sprint 010／012は既存timeline／weekly、archive、重複抑止、閲覧副作用0を実fixtureで実行済み。
- 未検証: Claude Code Desktop／CLI、Codex App／CLIの実host会話、外部connector、OAuth、Actions、push、downstream、install、cache、release、実利用者workspaceはこのoffline turnで実行していない。

### Fable最終レビュー後の限定修正（2026-09-05）

- Fable finding #2（低・product / implementation-issue）のみを採用し、`memory-care` §3 step 5のhelper前提を1文だけ修正した。編集後の文は次のとおり: `5. 会話の締めで、当日の決定が要求範囲を十分かつ現時点で覆う形で安全に取得済みの原本で0件と確認できた場合、または\`timeline\`で実際に0件と確認できた場合だけ、会話を読み返す。`
- 十分かつ現時点を覆う安全な原本、または`timeline`による実際の0件確認を条件に残したため、部分取得から0件とは断定しない。後続の候補確認・確認1回のプロトコルは変更していない。
- 対応する`conversation-core-inventory.json`の`skill-memory-care` hashだけを`410efbd64a5e29ddd137ae1b12f883e8df5b4cde9bbae4267dbf20eb143a091e`へ更新した。他のinventory面、新規test／runner／verification codeは変更していない。

#### 限定修正後のコマンド結果

| Command | Exit | 観測結果 |
|---|---:|---|
| `bash scripts/sprint-010-regression.sh` | 0 | `PASS=55 FAIL=1`。唯一の失敗は既存assert「decidedゼロの締め確認を定義」が旧helper前提の`当日の.*decisions.*0件`を静的に要求するためで、今回の修正と衝突する。テストコードは変更していない。 |
| `node scripts/sprint-052-secretary-voice-test.mjs` | 0 | `SPRINT052_VOICE_PASS=3 SPRINT052_VOICE_FAIL=0`。inventoryを含むVoice検査はgreen。 |
| `git diff --check` | 0 | 出力0件。 |

テストは指定どおり直列実行した。開始前のhost Node process数は親オーケストレーター実測21件を引き継ぎ、sandbox内`pgrep`のsysmondエラー／0件はhost測定値として扱っていない。

### 010既存assert整合の最終微調整（2026-09-05）

- 直前の限定修正で記録した`PASS=55 FAIL=1`は、既存assertが正式な種類名`decisions`を要求していたためであり、履歴として保持する。検証コードは変更していない。
- helper必須に戻さず正式な種類名を残すため、同じstep 5の一文を次へ微調整した。
  > 5. 会話の締めで、要求範囲を十分かつ現時点で覆う形で安全に取得済みの当日の`decisions`が0件と確認できた場合、または`timeline`で当日の`decisions`が実際に0件と確認できた場合だけ、会話を読み返す。
- 十分かつ現時点を覆う安全な原本、または`timeline`の実際の0件確認を条件にし、部分取得から0件とは断定しない。候補確認・1回確認の後続プロトコルは不変。対応する`skill-memory-care` hashは`b1b336444c00c7e9ad4f2f3e7c776a00ed4543e8aab0116bde417e23a081909b`。

| Command | Exit | 観測結果 |
|---|---:|---|
| `bash scripts/sprint-010-regression.sh` | 0 | `PASS=56 FAIL=0` |
| `node scripts/sprint-052-secretary-voice-test.mjs` | 0 | `SPRINT052_VOICE_PASS=3 SPRINT052_VOICE_FAIL=0` |
| `git diff --check` | 0 | 出力0件 |

上記は直列実行。新規test／runner／verification code、対象外surfaceの変更はない。
