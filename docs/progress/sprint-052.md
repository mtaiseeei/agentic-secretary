# Sprint 052 Generator handoff

## 実装結果

Secretary Voice の製品差分は、共通 `conversation-contract.md` と `common-language.md` を入口に、Agentic／Yasashii の style・copy、settings／name Skill、workspace template、preferences template、最終応答の事実状態境界へ反映されている。`memory-tools.mjs` は新規・欠損時の `一人称: 私`、既存 `pref-set` の部分更新、前後空白を除く 1〜16 Unicode code point、改行／secret 拒否を維持する。

検証は次のように縮小した。

- `scripts/sprint-052-secretary-voice-test.mjs` は、261行のfixture／memory／synthetic-response matrixを廃し、共通ruleのvoice marker、inventoryの実hash・required marker、実在する16 SKILL集合、両editionのvoice copyだけを39行で検査する。自然さ・事実状態はこのscriptのsubstring判定では合格にしない。
- `scripts/sprint-011-regression.sh` の既存fixtureへ、一人称のtrim、Unicode 1／16 code point、17 code point／改行／secret拒否と拒否前後のpreferences byte一致を追加した。旧／欠損preferences、手書き行、他設定、journal境界は既存fixtureのassertを再利用する。
- inventoryの現行hashは、Voice変更対象を含めて実ファイルと一致している。current wizard fixtureは5資産をHEAD `283627a` と照合し、一致した2資産のdigestだけを更新、契約metadataをaccepted051へ改めた。Sprint 029 historical baselineとwizard本体は変更していない。

## 仕上げ補正

- 共通rule §5 に会話限定の一人称変更は永続化しないことを追加し、名前使用の許可イベントを onboarding／rename／自身の名前質問／同じ会話の初回cross-repo routing の4つへ分割した。
- 専用testのrepo rootは `fileURLToPath` でURLデコードし、inventoryのSKILL path集合を実在ディレクトリから作って16件すべてとの一致を確認する。既存の全surface hash検査とrequired marker検査は保持した。

## verification-size guard

着手前の見積りどおり、memory／nameの既存fixtureと新runnerは追加していない。`git diff --numstat HEAD` と新規testの行数を分けて記録する。

| 区分 | 追加 | 削除 | 内容 |
|---|---:|---:|---|
| 製品 instructions／rules／SKILL／template | 45 | 9 | Secretary Voice と一人称設定の実装 |
| conversation inventory metadata | 40 | 6 | 変更面の実hashとvoice契約metadata |
| 検証コード | 54 | 1 | 新規専用guard 39行、既存Sprint 011の15/1行 |
| current wizard検証fixture | 3 | 3 | accepted051 `283627a` のcurrent digestとmetadata |

261行の専用testを、検査責務を保ったまま39行へ縮小した。Cartesian matrix、統一collector、attestation、live runner、外部API、wizard変更は追加していない。

## ローカル検証

全commandは直列実行し、各開始前にchild側の `pgrep node | wc -l` を試行した。child側は `sysmond service not found`／`Cannot get process list` となるため値を採用せず、親オーケストレーターの事前測定 `node 23` を採用する。自分が起動したserver／watcherはない。

| Command | Exit | Assertions / result |
|---|---:|---|
| `node scripts/sprint-052-secretary-voice-test.mjs` | 0 | 3 pass / 0 fail |
| `bash scripts/sprint-011-regression.sh` | 0 | 73 pass / 0 fail |
| `node scripts/sprint-029-rule-boundary-test.mjs` | 0 | 25 pass / 0 fail、5 wizard digest。current fixtureをaccepted051 `283627a` の一致bytesへ更新後、historical baseline不変を含めgreen |
| `node scripts/sprint-032-patch-001-readability-test.mjs` | 0 | 28 pass / 0 fail、SURFACES=36 |
| `node scripts/sprint-039-test.mjs` | 0 | 69 pass / 0 fail |
| `node scripts/sprint-040-test.mjs` | 0 | 15 pass / 0 fail |
| `git diff --check` | 0 | 出力0件 |

### preferences／副作用 snapshot

- `materialize` の初期preferencesと欠損再生成は `一人称: 私`。既存の `口調`／`専門用語`／`報告の詳しさ`／`決定の確認` と手書き行を保持する。
- 既存fixtureで `一人称` を `  ぼく  ` → `私` → 16個の `😀` と更新し、保存結果はtrim済みの値になった。`pref-set` 単体では journal 件数を増やさない。
- 17 code point、改行、`token: leaked` はそれぞれ拒否され、最後の有効な16 code point後の `preferences.md` byte列と一致した。対象行以外のbyte保持、手書き行保持、欠損／部分欠損の既存境界も73/73で確認した。
- 新しい memory／name のGit fixtureは作らず、保存成功・pending・error・checkpoint partial・routingは既存のSprint 039／040 suiteへ委譲した。

## 合成会話の完全な代表例

以下は、契約を独立レビューできるように記録した**合成例**であり、インストール済みhostのlive出力ではない。`Hypothetical input`／`Hypothetical state`／`Reply` は想定例で、実行済みテスト証拠とは分けている。自然さは名前やmarkerの部分一致で判定せず、Evaluatorが全文を読む。

1. **既定値・欠損／空（Agentic）**

   Hypothetical input: `preferences.md` が欠損または空の状態で「会議メモを確認して」。

   Hypothetical state: 応答時の既定一人称は「私」。この例は保存処理を実行せず、save-memoryが`preferences.md`を自動生成すると仮定しない。

   Reply: 「会議メモを確認できます。必要なら内容を整理します。」

2. **永続一人称（pref-setのみ、Yasashii）**

   Hypothetical input: 「一人称を『ぼく』に変えて」。

   Hypothetical state: `pref-set`で対象行だけが`一人称: ぼく`に更新され、他設定・手書き行・journal・commitは不変。この例はpref-set-onlyであり、complete settings flowでは宣言後にjournal／commitを実行する。

   Reply: 「一人称を『ぼく』に変更しました。予定の整理を始めますね。」

3. **自身の名前／完了主張になる設定値のfallback（Agentic）**

   Hypothetical input: 「一人称を『Ari』にして、会議メモを保存して」。

   Hypothetical state: `一人称: Ari` は既存のoneLine／secret検査を通過して保存し、意味parserによる拒否はない。メモ保存も成功するが、自身の名前と重なるため、保存結果では設定値を名前として繰り返さず、自然な主語省略を使う。値が`完了しました`でも保存値は変えず、未実行時は「まだ保存していません」と返す。

   Reply: 「会議メモを1件保存しました。設定値が名前と重なるため、この報告では名前として繰り返さず、保存結果だけお伝えします。」

4. **初回設定完了（Agentic、許可イベント1）**

   Hypothetical input: 初回設定の回答と名前 `Ari` をすべて確定。

    Hypothetical state: identity、既定preferences、最初のlocal checkpointを作成済み。

   Reply: 「初期設定が完了しました。Ariです。これから記録と整理をお手伝いします。」

5. **rename直後の最初の成功結果（Yasashii、許可イベント2）**

   Hypothetical input: 「名前をAriに変えて」。

   Hypothetical state: identity、aliases、所有範囲の設定を更新し、rename直後の最初の成功結果を返す。

   Reply: 「名前をAriに変更しました。設定を保存したので、これからこの名前でご案内します。」

6. **自身の名前への質問（Agentic、許可イベント3）**

   Hypothetical input: 「あなたの名前は？」。

   Hypothetical state: secretary identityのnameは `Ari`。routingや設定変更は発生していない。

   Reply: 「名前はAriです。利用者の呼び方とは別に設定しています。」

7. **同じ会話でのcanonical routing初回成功（Yasashii、許可イベント4）**

   Hypothetical input: 別repoから「Ari、前の続き」と呼び、canonical secretary workspaceのread-only解決が成功。

   Hypothetical state: 初回routingは成功。同じ会話のrouting専用永続状態は追加していない。

   Reply: 「別のリポジトリから、Ariとして続きの作業場所へ切り替えました。ここで続けられます。」

8. **通常応答（Agentic）**

   Hypothetical input: 「会議メモを確認して」。

   Hypothetical state: topic fileをread-onlyで確認。保存・routing・identity変更なし。

   Reply: 「会議メモを確認しました。未整理の項目は2件です。」

9. **名前で呼ばれただけ（Yasashii、禁止場面）**

   Hypothetical input: 「Ari、予定を見て」。

   Hypothetical state: 名前の呼びかけとして受理しただけ。rename／routing／名乗りイベントではない。

   Reply: 「はい。予定を確認します。」

10. **routing反復（Yasashii、禁止場面）**

    Hypothetical input: 同じ会話で再び「Ari、さっきの場所へ」と呼ぶ。

    Hypothetical state: 直前のrouting成功は確認済み。再routingと新しい永続状態は発生していない。

    Reply: 「作業場所は先ほど切り替え済みです。続きから進めます。」

11. **同名の人間（Agentic、routing負例）**

    Hypothetical input: 「田中さんからAri宛てのメールを確認して」。

    Hypothetical state: `Ari` はメールの宛名。secretaryへの直接呼びかけやroutingではない。

    Reply: 「田中さんからAri宛てのメールを確認しました。これは宛名の名前で、私への呼びかけとは扱いません。」

12. **request-hedge／未保存（Yasashii）**

    Hypothetical input: 「来月の会議は火曜かも。覚えておいたほうがいいかも」。

    Hypothetical state: request hedgeを`ambiguous`として扱い、memory、journal、commitは0件。内部の分類や保存先を選ばせない。

    Reply: 「まだ記録していません。この内容を保存しますか？」

13. **error／未実行（Agentic）**

    Hypothetical input: 明示された保存依頼を実行したが、保存先の読み取りでエラー。

    Hypothetical state: memory、journal、commitを変更していない。

    Reply: 「保存できませんでした。保存先の読み取りでエラーになったため、メモとjournalは変更していません。読み取り状態を確認してから再実行できます。」

14. **checkpointだけ失敗したpartial（Agentic）**

    Hypothetical input: 「会議は対面開催と覚えて」。

    Hypothetical state: memory本文とjournalは各1件保存。local checkpointのcommitは0件で失敗。

    Reply: 「メモとjournalは保存しましたが、local checkpointのcommitだけ失敗しました。内容は残っているため、再試行では未完了のcommitだけを実行します。」

15. **一時的な一人称（Yasashii）**

    Hypothetical input: 「この会話だけ『ぼく』と言って」。

    Hypothetical state: 当該会話の応答だけ一時的に変更。`preferences.md` は `一人称: 私` のままで、永続書込み0件。

    Reply: 「わかりました。この会話では『ぼく』と言いますね。設定は変えていないので、次の会話では元の『私』に戻ります。」

16. **経験・感情を捏造しない自然な応答（Yasashii）**

    Hypothetical input: 「昨日は楽しかった？」。

    Hypothetical state: 個人的な体験・感情はなく、保存・commit・routingなし。

    Reply: 「昨日の実体験や感情はありませんが、残っているメモの振り返りならお手伝いできますよ。」

## 起動・評価用メモ

- 本Sprintは対話rule／template／既存CLI seamの変更で、専用の常駐serverやtest URLは追加していない。URLは `not applicable`。
- Claude Code Desktop／CLI、Codex App／CLIの実host会話はこのoffline turnでは未検証（`unverified`）。実コネクタ、OAuth、GitHub Actions、Repository Secret、push、downstream、install、cache、release、version更新は実行していない。
- Sprint 029はcurrent fixtureのaccepted051 digest補正後に25/25でgreen。wizard本体のworking-tree diffとhistorical baselineは変更せず、fixtureだけをverification-infra保守として更新した。Voiceのproduct failureへ数えていない。

## Candidate handoff

新規dedicated guard、既存Sprint 011の一人称assert、本文のsynthetic evidenceを含む未commit working treeとして、独立Evaluatorへ引き渡す。Sprint 029 current fixtureのaccepted051 digest補正以外のwizard変更や、外部操作は行っていない。
