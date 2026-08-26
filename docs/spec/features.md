# Features

機能IDと、ユーザーから見える振る舞いの正本。F01〜F16 は受け入れ済みの既存機能、F17〜F22 は 2026-07-15 方針転換、F23〜F27 は 2026-07-16 のsingle-repo Git-first + Chatwork方針、F28 は 2026-07-17 の一般プロジェクト管理方針、F29 は配布チャネルから独立した製品説明、F30〜F31 は更新の説明と実行を分ける安全な更新体験、F32〜F35 は各社所有Google Cloudプロジェクトを使うGoogle Chat同期、F36〜F43 は `0.7.0` の配布前監査を閉じたrelease hardening、F44〜F50 は公開済み `0.8.0` で2 editionへ安全に分離した履歴と、次candidateへ引き継ぐ配布境界、F51は両edition共通の会話可読性、F52は4つの正式対象ホストへ拡張できるホスト非依存の共通本体とhost adapter、F53は利用者中立の呼び方と配布物、F54〜F57は2026-07-31承認の人間らしい会話フローと3配布系統の意味整合、F58はWindows保存互換、F59〜F61は秘書identity／routing／rename、F62は既存workspaceの名前オンボーディング完全移行である。

## 既存機能（F01〜F16）

| ID | 機能 | 外から見える結果 |
|---|---|---|
| F01 | マーケットプレイス配布 | `yasashii-secretary` を public / MIT で配布し、Shin-sibainu/cc-company の単段クレジットを維持する |
| F02 | 3コマンド導入 | marketplace add → install → `/secretary` で導入できる |
| F03 | 薄いルーター | 自然な言い回しを必要なスキルへ段階ロードし、全機能を一度に読まない |
| F04 | オンボーディング | 5問以内で `secretary/` を安全に生成し、1つのprivate GitHub repoの作成、初期commit、初回pushまで完了する |
| F05 | 記憶ケア | 空上書き禁止、削除2段階、索引追従、`_resume.md` による再開を提供する |
| F06 | daily | 外部予定・タスクとローカルTODOを根拠つきで突き合わせる |
| F07 | Git履歴 | 節目で何をしたか分かる日本語メッセージをcommitし、秘書・一般プロジェクト・Chatwork／Google Chatを同じworkspace repoの履歴として扱う。別repo開発PJの履歴はその正本repoに残す。初回pushと同意済みチャットschedule以外の予期しないpushは確認する |
| F08 | 成果物規約 | 単発成果物は `docs/YYYY/MM/YYYY-MM-DD_<title>.md`、確認済み一般PJの成果物は当該PJ内にfrontmatterつきで保存し、確定版を `outputs/`、旧版を `archive/` へ分ける |
| F09 | Google 接続 | Gmail / Calendar / Drive の公式コネクタ接続と診断を案内する |
| F10 | 文言ルール | 一般技術用語を保ち、馴染みの薄い語だけ短く補足し、内容依存の自然な報告と必要な進行表示を守る |
| F11 | Microsoft 接続 | Microsoft 365 公式コネクタの接続と確認を案内する |
| F12 | Notion 接続 | 任意で Notion の公式接続を案内する |
| F13 | 接続診断 | 実エラーを根拠に原因と対処を伝える |
| F14 | やさしいハーネス提供 | **再定義**: 同梱せず、別repo `yasashii-harness` を正本として提供する |
| F15 | build | `yasashii-harness` の有無を確認し、無ければ3コマンド案内、あれば開発ループへ接続する |
| F16 | 公開ドキュメント | README 前半で非エンジニアが導入でき、後半で技術者が設計とライセンスを確認できる |

## 新機能（F17〜F22）

### F17 journal — 活動記録

- `memory-tools.sh journal-add <sec> <did|decided|next|note> "<本文>"` で日次ログへ末尾追記できる。共通の追記境界は `scripts/lib/journal.sh` の `journal_append` とする。
- 成果物保存、TODO追加・完了・持ち越し、決定記録、topic追加、設定変更を行う定義済みシームは、成功した事実を journal へ自動追記する。
- 空本文を拒否し、既存行の書換・削除シームを提供しない。
- `_resume.md` は作業の中断点、journal の `next` は翌日への申し送りとして使い分ける。

### F18 timeline — 時系列表示と検索

- `memory-tools.sh timeline <sec> [--from/--to] [--type decisions|journal|all] [--grep <キーワード>]` で決定と活動を逆時系列の Markdown に整形する。
- 同一入力から同一出力を返し、LLMの要約に依存しない。
- 「先週なにしてた」「今日やったこと」「いつ決めた」「7月に決まったこと」を期間・種類・キーワードに対応づける。
- 出力を保存してと言われた場合は既存の成果物保存規約に従う。

### F19 節目プロトコル — 決定と相談文脈の記録

- 「覚えて」「決定として残して」等の明示依頼はF54のauthorizationに従い、対象と行き先が一意で低リスクなら同じターンで `remember-decision` へ渡す。原文復唱だけで別ターンへ止めない。
- 明示依頼がない決定候補や相談文脈を秘書側から保存提案するときは、保存する要点を示した実際の質問で確認する。確認待ちは副作用0件とする。
- 会話の締めで、その日の `decided` が0件でも、通常は内部監査を利用者へ報告しない。会話中に明確な拾い漏れ候補がある場合だけ、現在の用件を妨げない質問として扱う。
- topicは `memory/topics/` に保存し、会話全文や逐語ログは残さない。
- 確認済みプロジェクトに属する決定・相談文脈は、一般memoryへ同じ本文を二重保存せず、F28のプロジェクト正本へ送る。timeline用の活動記録はプロジェクト名と参照先を含む短い記録に留める。

### F20 settings — パーソナライズ

- 初回と途中変更を同じ `settings` で扱う。初回は既存項目に「仕事・役割」「説明の詳しさ」を加え5問以内、口調は聞かず標準で開始する。
- 「もっとフランクに」「専門用語そのままで」等、設定値と対象が一意な可逆変更は、その発話を実行許可として同じターンで反映する。値不足、複数候補、不可逆な波及があるときだけ不足する一点を質問する。
- `memory-tools.sh pref-set` は指定した構造化項目だけを更新し、`memory-tools.sh pref-note-add` は秘書のメモへ追記する。全文の read-modify-write を要求しない。
- 自発的に秘書のメモへ追加するときも1行確認する。
- 役割は保存するだけでなく、提案・例示・用語補足の題材へ反映する。

### F21 週次ふりかえり

- 毎回、対象週の日次 journal 原本から振り返りを作り、要約の要約をしない。
- 決定・活動・翌週への申し送りを区別し、矛盾の統合や古い月の退避はユーザー確認後に行う。
- 外部データを使う場合は出典を行内に明記し、本文を複製しない。

### F22 yasashii-harness の上流追随

- 本機能の実装・正本は別repo `yasashii-harness` に置く。`yasashii-secretary` は参照導線だけを持つ。
- `mtaiseeei/yasashii-harness` はpublic・`fork=false`の独立downstreamで、`origin` を自身、`upstream` を `mtaiseeei/agentic-harness` に向け、fb9c303を初期基点とする。
- 配布識別子はmarketplace `yasashii-harness` とplugin `harness` を分け、`harness@yasashii-harness` で導入する。remote manifestのrepository / homepage / sourceと必要なCodex marketplace識別子をdownstreamへ揃える。
- 本文・スキル・agents・runtimeロジックの差分を「見出しに `yasashii` を含む追加セクションのみ」に限定し、上流由来の実装行を書換・削除しない。機械的例外は宣言済みの配布識別metadata fieldだけとする。
- `gentle-overlay/`、アンカー、`metadata-overrides.json`、`scripts/sync-harness.sh`、やさしい版 agents 3種、独自回帰により、上流merge後も差分と規律を検証できる。
- 上流HEADの前進は警告、取り込み済み上流＋overlayとの不一致、未分類の新規・削除ファイル、アンカー不在は失敗として扱う。
- fork badge／parent relation／同じforkからの上流PRは提供しない。上流変更は本機能のスコープ外であり、将来あらためて明示承認された場合だけ `agentic-harness` 側の別branch / PR手順に分離する。

## Chatwork・single-repo機能（F23〜F27）

### F23 single-repo Git-first workspace

- `yasashii-secretary` を使うrepoを、秘書の記憶・成果物、営業・マーケティング・新規事業等の一般プロジェクト、Chatwork履歴の共通ワークスペースにする。
- 開発プロジェクトは既存の `build` 導線を使い、必要に応じて別repoを正本にできる。別repo化する場合は作成・接続・公開範囲を確認し、workspace側には概要と参照ポインタだけを置く。
- public配布repo `yasashii-secretary` と利用者のprivate workspaceを分離する。Repository Secret、Chatwork workflow、room設定、履歴は利用者のprivate workspaceだけに置く。
- 新規オンボーディングはprivate GitHub repoの作成、初期commit、初回pushを完了条件とする。public repoは選べない。
- 既存remoteがあるrepoでは、別repoを黙って作らず、現在のrepoを使うかを確認する。Chatwork専用repoは作らない。
- privateであること、remoteが接続済みであること、初回pushが成功したことをユーザーが確認できる。
- 実API評価用の専用private test workspaceも、pluginの利用設定・生成物、秘書、通常project、Chatwork設定／workflow／履歴を1つのrepoに置き、Chatwork専用test repoを作らない。public配布ソース自体の複製は要求しない。

### F24 Chatwork接続・room選択wizard

- ChatworkとGoogle Chatは同じローカルwizard骨格を共有する。Chatworkの各画面には「Chatworkの設定」を見出しとaccessible nameで明示し、primary CTAの背景色を `#F03747` にする。
- 主導線は、最初に「今すること」を1文で示し、1画面1判断・1段落1要点にする。`Repository Secret`、`workflow`、`commit・push`等は目的を日常語で先に伝え、正式名称は判断に必要な場面か「詳しい説明」に置く。
- 「詳しい説明」は、山形アイコン等により開閉できることが見た目で分かり、keyboard、visible focus、開閉状態、accessible nameを備える。閉じた状態でも主導線を完了できる。
- `/chatwork` から接続状態と次の行動を確認でき、未設定ならChatworkのAPI Token取得、GitHub上の安全な保管場所への登録、ルーム選択を順に進められる。
- API Token取得ではChatwork公式のTokenページと発行ヘルプへ直接進める。組織契約でTokenページを利用できない場合は、実際にAPIを使うアカウントで組織管理者へ利用申請し、承認後にこの設定画面へアクセスする導線を示す。承認前はルーム一覧取得へ進めない。
- Tokenはwizardや会話へ貼らせない。現在のGitHub repoのowner／nameから組み立てたSecret追加画面を「GitHub上の安全な保管場所を開く」と案内する。開いたGitHub画面では `Name` 欄へ `CHATWORK_API_TOKEN`、`Secret` 欄へ利用者本人がChatwork公式画面で取得したAPI Tokenを入力すると具体的に示す。Token実値はGitHub画面だけへ入力し、固定ownerや固定repo pathへ誘導しない。
- API Tokenの値はrepo本文、設定ファイル、ログ、journal、fixture、画面キャプチャへ保存しない。
- Secret登録を利用者が確認した後、GitHub Actionsが参加中のルーム一覧を取得して同じ非公開のGitHubリポジトリへ反映し、ローカル設定wizardはその一覧を読み、ルーム名を見ながら複数選択できる。Git管理するのはルーム一覧・選択結果・ルームIDであり、Tokenではない。
- wizardは選択ルーム、自動取得の間隔、保存内容、非公開のGitHubリポジトリの共同編集者にも履歴が見えることを確定前に示す。
- 0ルーム、認証エラー、rate limit、ネットワーク失敗を区別し、設定途中の選択を失わず再試行できる。

### F25 初回取得と基本検索

- 選択roomごとにChatwork APIが返す最新100件以内を初回取得し、同じrepoへ保存する。0件でも正常完了する。
- 導入以前の履歴は自動で遡れず、初回取得より古いメッセージが無いことを明示する。
- message IDを基準に重複を作らず、選択していないroomを取得しない。取得済み履歴をAPI応答から消えたことだけで削除しない。
- `/chatwork search` は最新のGit状態を取り込んでから、room、発言者、日付、キーワードで保存済み履歴を検索し、該当箇所とroom/dateの根拠を返す。

### F26 定期同期と設定変更

- 自動取得の間隔は「30分ごと」「1時間ごと」「3時間ごと（おすすめ・初期値）」「6時間ごと」「12時間ごと」「手動のみ」から選べる。実行は毎時0分を避け、17分を起点にする。
- wizardは30日換算の概算実行回数を順に1,440回、720回、240回、120回、60回、0回と表示する。実行回数とGitHub Actionsの処理時間は別であり、2,000分を2,000回と誤解させない。
- 2026年7月時点では、GitHub Freeの非公開リポジトリに月2,000分のGitHub Actions処理時間が含まれることを参考情報として示す。プラン・runner・1回あたりの処理時間で実使用量が変わり、料金や枠も変更されうるため、GitHub公式のbillingページへ案内する。
- 選択した間隔は表示値だけでなく、実際のscheduleへ反映される。手動のみではscheduleを無効にする。
- 選択roomのうち最も忙しいroomの最新100件が覆う時間幅を参考に、取りこぼしにくい間隔を提案してよい。最終決定はユーザーが行う。
- roomと間隔はwizardから見直せる。確定前は設定・workflow・履歴へ副作用を出さず、確定後に変更内容をcommitする。
- 設定変更後の結果は、変更後の選択room、頻度、schedule有効／無効を現在値として表示する。変更前の初回取得結果を再表示して、反映失敗と誤解させない。
- scheduleによる自動取得・commit・pushは、セットアップで内容を示して同意を得た後だけ有効になる。

### F27 見つからない時の確認付き手動同期

- `/chatwork search` は最初にrepoをpullして保存済み履歴を検索する。
- 見つからない場合、AskUserQuestionまたはCodexのstructured input等、hostの構造化質問で「同期して再検索（推奨）／同期しない／対象roomを見直す」を提示する。質問前に手動同期しない。
- 承認時だけ手動workflowを開始し、完了まで待ち、成功を確認し、pullして同じ条件で再検索する。
- 再検索でも見つからない場合は、導入前の履歴、最新100件制約、未選択room、キーワード不一致、編集・削除、workflow失敗を区別して示し、「Chatworkに存在しない」と断定しない。
- 手動同期のキャンセル、失敗、timeout時はrepo内容を壊さず、何が起きたかと次の選択肢を示す。

## プロジェクト管理（F28）

### F28 プロジェクト候補の確認とライト→フル運用

- 一つの成果に向けた複数行動、別の日・別セッションへの継続、締切・待ち・関係者、増えていく判断・成果物、繰り返し登場する同一案件を候補シグナルとする。少なくとも2つのシグナルがあり、そのうち1つが「複数行動」または「複数セッション」である場合にプロジェクト化を提案する。
- 単発成果物、同じ会話で完了する作業、一つだけのTODOは候補にしない。LLMによる候補検出であり完全自動保証ではないことを隠さない。
- 提案時は理由を1〜2点に絞り、「この内容は今後も続きそうです。プロジェクトとしてまとめますか？」と構造化質問で確認する。確認前・拒否・キャンセルではディレクトリ、ファイル、journal、commitを変更しない。
- 営業・マーケティング・新規事業等の非開発PJは `secretary/projects/<安全な名前>/` に作り、ライト運用は実情報を入れた `PROJECT.md` 1枚から始める。空テンプレだけを置かない。
- ライト `PROJECT.md` は、現在の状況（日付つき）、概要、ゴールと成功の測り方、1行のDecisions、記録日つきメモ、関連ドキュメントを持つ。未確定判断はDecisionsに入れず要確認事項に置く。
- Decisionsが10件超、メモが10件超または状態以外で読みにくい、PJ固有ガードレールが必要、PJ直下が10ファイル超のいずれかに達したら、その場でフル昇格を提案する。了承前は昇格しない。
- フル運用は `AGENTS.md`（指示・Start here・索引・ガードレール）、`PROJECT.md`（状態）、`DECISIONS.md`（判断）、`MEMORY.md`（恒久的な事実・知見）、`CLAUDE.md`（`AGENTS.md`へのポインタ）を持つ。決定追記時は同じ操作で `PROJECT.md` の現在状況と日付も更新する。
- PJ固有の決定はライトのDecisionsまたはフルの `DECISIONS.md`、恒久事実はライトのメモまたはフルの `MEMORY.md` を正本とする。同じ本文を `secretary/memory/decisions/`、`memory/topics/`、プロジェクト文書へ重複保存しない。
- 実行タスクの正本は既存の `secretary/inbox/todo.md` または接続済みサービスに置く。プロジェクト内に生きた `TODO.md` を作らず、`PROJECT.md` には現在状況、待ち、次の入口だけを置く。ローカルTODOにはプロジェクト名またはPROJECTへの参照を付けられる。
- 確定成果物は `outputs/`、作業中の文書は日付つきファイル、旧版・backup・superseded文書は `archive/` に分ける。フル運用でファイルを移動・追加・削除したら、同じ操作で `AGENTS.md` の索引と関連リンクを更新する。
- 開発PJはF15の `build` 導線を維持する。別repoを正本にすると確認された場合、workspace側は `AGENTS.md` と概要スナップショットの `PROJECT.md` だけを持ち、正本repoの場所、最初に読むファイル、現在状態の要約を示す。仕様、判断ログ、実装進捗をworkspace側へ複製しない。
- 既存情報があるPJを初期化するときは、ユーザーが指定した最小範囲の既存文書・接続済みサービスを根拠に概要と現在状態を起こす。資格情報、外部本文、会話全文は保存しない。
- 一般PJの `PROJECT.md` は `status: active | completed` を持つ。ユーザー確認後だけ `completed` にし、完了日・結果・残件を残して通常の進行中一覧や候補検出から外すが、ディレクトリは移動・削除せず検索・再参照できる状態を保つ。再開も確認後だけ `active` に戻し、過去の完了記録を残す。status欠落は誤って非表示にせず `active` として扱う。

## 配布チャネルに依存しない製品説明（F29）

### F29 一般の非エンジニア向け公開面

- README、配布物、現行正本は、特定の講座・期・教材を経験した利用者であることを前提にしない。
- 旧配布チャネル固有の名称・英字表記・期数・学習段階・教材導線を除去し、一般の非エンジニア向け表現へ揃える。
- 既存のMIT表記、Shin-sibainu/cc-companyの単段クレジット、`forkedFrom`、配布識別子、機能、回帰保護は維持する。
- 元リポジトリからの独立実装化、Git履歴の書換え、過去commitの変更は行わない。
- 過去のprogress／feedbackは監査記録として改変せず、現在の製品説明を検査する対象から除外する。新しいprogress／feedbackには旧配布チャネル固有表現を持ち込まない。

## 安全な更新（F30〜F31）

### F30 更新の土台と読み取り専用診断

- marketplaceとplugin manifestのversionを同じ公開版に揃え、不一致を配布前に検出する。
- 利用者向けCHANGELOGは版ごとに「誰に何が変わるか」「設定・ファイルへの影響」「必要な操作」を示し、内部実装名だけの列挙にしない。
- 配布済みの管理対象ファイルについて、配布版、配布時の基準hash、置換されたテンプレート変数だけを最小台帳として扱う。ファイル本文、記憶、会話、外部データ、secret、資格情報は台帳へ保存しない。
- 自動更新を有効にできる環境では、既定状態、利点、注意点、利用者が行う操作を案内する。案内を理由に設定を自動変更しない。
- 「最新版にして」では、現在版、利用できる最新版、CHANGELOGの要点、影響する設定・ファイル、必要な操作、カスタマイズとの衝突可能性を先に説明する。
- 更新可能とするのは、確認できた候補versionが導入済みversionよりsemver上で新しい場合だけとする。同一versionまたはdowngradeは理由と両versionを示し、実更新へ進まず副作用0件で終える。
- F30は完全な読み取り専用である。plugin更新、workspace書込み、migration、commit、push、設定変更を行わず、実更新へ進むかを利用者に委ねる。

### F31 確認後の安全な更新・移行・復元

- F30の説明後に利用者が明示的に了承した場合だけ、秘書が実更新を行う。了承前、拒否、キャンセルでは変更0件とする。
- 更新直前に、pushしないローカルcommitを復元地点として作る。commitできない状態では更新へ進まず、理由と選択肢を示す。
- 配布時の基準から変更された管理対象ファイルをファイルごとに示し、各ファイルの既定選択を「現状を残す」とする。利用者が明示選択したファイルだけ置き換える。
- plugin更新後に、必要なreload／restartを利用者が迷わない順序で案内する。更新後の版、管理対象ファイル、主要機能を検証してから成功と報告する。
- version別migrationはdry-runで予定変更を先に示し、冪等、つまり同じ移行を複数回実行しても結果が変わらないようにする。対象外ファイル、私的内容、secretを変更しない。
- 台帳が存在しない0.2.0利用者は、現状ファイルを新規配布物として決めつけず、安全な初回判定を行うbootstrap経路から更新する。
- 台帳なし既存利用者のbootstrap判定は基準hashを確定するための既存機能であり、同一versionを更新可能にするsame-version bootstrap bridgeとして使わない。
- 失敗または利用者の希望時は、更新直前のローカルcommitを基準にrollbackできる。pushは別の操作として扱い、秘書が勝手に行わない。

## Google Chat高度接続（F32〜F35）

### F32 各社所有Google CloudプロジェクトとユーザーOAuth

- READMEに「Google Chatをつなぐ（少し高度な設定）」を設け、最初の操作を「Google Chatを設定したい」とAIへ伝えることにする。Google WorkspaceのGoogle Chatだけを正式サポートし、無料の個人Googleアカウント向けの説明・分岐は利用者向け画面に出さない。
- Google Cloudの準備はlocal wizardではなくGoogle Chat skillの会話が担当する。主導線は「今すること」を1文で先に示し、CLIで行う工程と本人がGoogle画面で行う工程を1回1操作で進める。
- Google Chat skillはGit repo rootを確認し、そのディレクトリ名に `-google-chat` を付けた値をProject表示名にする。Project IDも同じ値を初期案にし、Googleの命名制約または全体重複で使えない場合だけ安全な候補へ調整する。実際に作る名前、Project ID、所属するGoogle Workspace組織、有効にするAPI、Billing Accountを自動接続しないことを、作成前に利用者へ示す。Git repo rootを確認できない場合はprojectを作成せず、対象repoの選択を求める。
- `gcloud`が未導入なら、Google公式の管理ツールでありインストール自体は無料、非公式ソフトではないことを伝える。同時に、Google Cloudの設定を変更できるため、インストール内容と実行予定を示し、明示承認後だけ安全な導入を試みる。導入できない、権限がない、または利用者が断った場合は、直接リンクによる手動操作支援へ切り替える。
- `gcloud`を使える場合は、Google Workspaceアカウントのログイン状態、利用可能な組織、既存候補project、作成権限を先に確認する。未ログイン、複数組織、権限不足を推測で越えず、利用者の選択または管理者対応へ止める。明示承認後だけproject作成とGoogle Chat API／People APIの有効化を行い、Billing Accountは自動接続しない。
- Google画面で行うAudienceの `Internal` 設定、`Desktop app` のOAuth client作成、接続用JSONの取得は、Project IDを指定した直接リンクと「この画面で押す場所」を一つずつ案内する。利用者が「できました」と返してから次へ進み、Browser Useや拡張機能を必須にしない。`gcloud`を使えない場合はproject作成とAPI有効化も同じ形式で支援する。
- 利用者の会社ごとに、そのGoogle Workspace組織が所有するGoogle Cloudプロジェクトを使う。OAuth Audienceは `Internal`、OAuth Clientは `Desktop app` とし、ShigApps共通の外部向けOAuthアプリ、`External`、個人向け手順へ切り替えない。
- Google Chat APIと、発言者名の補完に必要なGoogle People APIを有効にする。権限は `chat.spaces.readonly`、`chat.messages.readonly`、`contacts.readonly` だけに限定し、未使用の `chat.memberships.readonly` は要求しない。People APIで一部の同僚名を補完できない場合があることと代替表示をREADMEで説明する。
- 接続用JSONを取得できた後だけローカルwizardを起動する。wizardはJSON選択から開始し、Cloud project作成、API有効化、Audience、Client作成の説明画面・案内画像を重複して持たない。JSONは資格情報として扱い、client secret、認可コード、access token、refresh token、client JSON全文を厳格secretとして永続物へ表示・保存しない。client IDは識別子であり、一時的なOAuth認可URLと管理者チェックリストには表示できるが、tracked file、Git差分・履歴、ログ、journal、fixture、スクリーンショット、評価証跡、再読込後も残るDOMへ保存しない。
- OAuthはPKCEとstateを併用し、利用者のブラウザとloopbackのローカル受付だけで完了する。認可コードは受領後すぐtokenへ交換して記録しない。取得した3つの値は現在のprivate repoのRepository Secret `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`、`GOOGLE_OAUTH_REFRESH_TOKEN_GCHAT` へ直接登録し、値のコピー＆ペーストを通常導線にしない。
- JSON確認後に明示ボタンでOAuth許可画面を別タブに開き、元wizardは状態確認を続ける。許可後は元wizardが自動で通常スペース選択へ進む。ポップアップ拒否、タブ閉鎖、同意拒否、失敗時に元wizardを失わないSprint 019の合格動作を維持する。
- Google Cloud準備は、厳格secretを含めず「repo、Project案、組織、完了済み工程、次の工程」だけで途中再開できる。中断後は完了済み工程をやり直さず、現在のProjectを確認して次の一操作から再開する。
- Google ChatはChatworkと同じwizard骨格を共有する。各画面には「Google Chatの設定」を見出しとaccessible nameで明示し、primary CTAの背景色を `#11BB62` にする。
- `Internal` にできない、管理者がAPI access controlsで拒否した、必要APIが無効、OAuth同意が拒否・失効した場合を区別し、Googleの英語エラーより先に必要な対応を日本語で示す。

### F33 通常スペース選択・初回取得・基本検索

- OAuth接続後、利用者本人が参加するスペースを名前で一覧表示する。選択候補は `spaceType=SPACE` の通常スペースだけとし、`DIRECT_MESSAGE` と `GROUP_CHAT` は候補にも履歴にも含めない。
- 初期状態で全スペースを選ばない。検索、複数選択、全解除を提供し、確定前に対象スペース、保存内容、private repoの共同編集者が本文を読めることを示す。
- 初回取得は、選択スペースについてGoogle Chat APIと組織の保持設定が返せるメッセージをページングして取得する。0件は正常とし、APIが返さない履歴を取得済みと見せない。
- 初回設定はChatworkと同じ一体型フローとする。OAuth後に通常スペース、取得間隔の順に選び、保存内容、private repo共同編集者への可視性、自動取得、Gitのcommit・pushを確認して明示同意する。`この設定で始める` の1回で、メモリ上のtokenを使う初回取り込みと、選んだ間隔の自動取得設定を完了する。
- 間隔が手動のみの場合も初回取り込みは行うが、scheduleは作らない。自動間隔の場合は初回取り込み後に別の「自動取得を設定する」を表示せず、スペース・間隔の再選択や追加の設定変更フローを要求しない。完了画面のprimary CTAは `設定を終了する` とする。
- 初回取り込みとschedule設定の結果が分かれる場合は、完了した処理、未完了の処理、次にすることを別々に示し、全体を成功と誤認させない。既存の安全なtransaction／rollback境界は維持する。
- 初回取り込みはOAuth完了直後の同じwizardセッション内で、メモリ上のtokenだけを使ってローカル実行する。tokenはセッション終了時に破棄し、以後の取得はGitHub Actionsが担う。
- 初回取得時にも選択済みspace IDの `spaceType=SPACE` を再確認し、設定ファイルの直編集等でDM／グループDMが混入しても取得を拒否する。
- スペース別・日付別Markdown、Asia/Tokyoの時刻、スレッド親子関係、発言者、本文、添付ファイル名・種類・参照先等のメタデータを保存する。添付ファイル本文はダウンロードしない。
- message resource nameを同一性の基準にして再取得時の重複を防ぐ。同日ファイルへ新しい投稿を追加しても既存投稿を失わず、部分失敗時は成功スペースと失敗スペースを区別する。
- `/google-chat search` は最新のGit状態を取り込んでから、スペース、発言者、日付、キーワードで保存済み履歴を検索し、該当箇所とスペース・日付の根拠を返す。

### F34 定期取得・設定変更・再認証

- 自動取得の間隔は「1時間ごと」「3時間ごと（おすすめ・初期値）」「6時間ごと」「12時間ごと」「手動のみ」から選べる。既定推奨はChatworkと同じ3時間ごとで、毎時0分を避ける。
- 選択スペース、間隔、保存内容、commit・push、共同編集者への可視性を確認画面にまとめ、明示同意後だけscheduleを有効にする。手動のみではscheduleを持たない。
- 初回設定とは別に、既存設定を後日見直す通常の設定変更導線を維持する。設定変更では現在値を起点にし、初回取り込みを繰り返さない。
- 新規投稿、スレッド返信、その取得実行でAPIが返した範囲の編集・削除状態を既存履歴へ統合する。`createTime` に基づく差分取得の範囲外にある過去メッセージの編集・削除は反映されないことを正常仕様として利用者へ説明する。削除済み本文を復元せず、削除情報だけを扱い、API応答から消えたことだけで保存済み履歴を削除しない。
- 継続取得時にもspace IDの `spaceType=SPACE` を再確認し、DM／グループDMを取得しない。
- 設定変更は確定前0変更、確定後だけ選択スペースとscheduleへ一貫して反映する。選択解除は今後取得しないという意味で、取得済み履歴を削除しない。
- refresh token失効、管理者によるブロック、scope不足、API無効、rate limit、network失敗を区別する。再認証はF32と同じloopback経路を使い、既存履歴を壊さない。
- 自動取得のcommit・pushは同意済み設定の範囲だけで行う。public配布repo、public workspace、選択外スペース、DM／グループDMへ範囲を広げない。

### F35 見つからない時の確認付き再取得

- `/google-chat search` は最初にrepoをpullし、保存済み履歴を検索する。見つからないだけではGoogle Chatに存在しないと断定しない。
- 見つからない場合、構造化質問で「取得して再検索（推奨）／取得しない／対象スペースを見直す」を提示し、質問前にworkflowを開始しない。
- 承認時だけ手動workflowを開始し、完了を待ち、成功を確認し、pullして同じ条件で再検索する。
- 再検索でも見つからない場合は、未選択スペース、組織の保持設定、APIが返さない履歴、キーワード差、編集・削除、認証・workflow失敗を区別する。
- キャンセル、失敗、timeout、再認証待ちではrepo内容を壊さず、何が起きたかと次の選択肢を示す。

## 公開済み0.7.0で確定した配布前ハードニング（F36〜F43）

### F36 secret検査とGit変更範囲の分離

- Google ChatのOAuth実値はlocal wizard sessionのmemoryから `gh` のstdin経由で現在のprivate repoのRepository Secretへ直接登録し、利用者のコピー／貼り付けを求めない。
- Chatwork API Tokenはwizardが自動取得・受領・登録しない。F24の既存導線どおり、利用者本人がChatwork公式画面で取得し、GitHubのRepository Secret画面へ `CHATWORK_API_TOKEN` として直接入力する。Tokenをwizard、AI会話、repo本文、ログ、製品側DOMへ入力・貼り付けさせない。
- 両サービスともRepository Secretを正本とし、通常フローのrepo、Git差分・履歴、ログ、製品側DOM、会話へ実値を残さない。
- 製品が生成・管理するworkflow／config／historyと初回publishは、commit候補の全inventoryを検査する。Google OAuth client JSON、client secret、refresh token、API Token、private key／秘密鍵、credential URL、known token field、通常のliteral assignment等の合理的な誤混入が1件でもあればcommit・push前に停止する。ファイル名だけ、特定の1サービスだけの検査で合格にしない。
- `${{ secrets.NAME }}` 等の製品が生成する正規のruntime参照、通常文書、合理的な非機密metadataは許可し、誤拒否で通常利用を止めない。
- commit前scannerは合理的な誤混入を止めるdefense-in-depthであり、万能secret detectorではない。利用者が任意のJS／TS／shell／JSONを意図的に特殊構文・難読化・computed／escaped key・偽placeholderへ改変したケースの完全検出は保証しない。
- 初回publish、Chatwork設定、Google Chat設定、記憶の節目commit、更新は、それぞれが所有するpathだけをcommit対象にする。操作開始前からstageされていた変更、隣接する一般PJ、別サービス、repo rootの無関係ファイルを混ぜない。
- 操作前のworking treeとindexの状態を保ち、自分の変更だけをcommitした後も既存stageを同じ内容・stage状態で残す。commit不能、競合、push失敗では対象変更だけを安全に戻し、第三者の変更をunstage・上書き・削除しない。
- pushはその操作が作成し検証したcommitだけを対象にし、secret検査後に候補範囲が変わった場合は再検査する。

### F37 symlink境界と有限時間の外部処理

- Node／shellの書込み・作成・移動は、既存・未作成の最終要素を含む全ancestorを実体として確認し、許可root外を指すsymlinkがあれば副作用前に拒否する。
- 秘書workspaceから別repoへ向くsymlink越しの書込みは拒否する。一方、ユーザーが別repo開発PJとして確認し、そのrepo自身をworking rootとして開いた開発作業では、そのrepo内の正常な書込みを妨げない。
- 許可root内にあるsymlink自体を削除する操作は、参照先のファイル／ディレクトリを辿らずlinkだけを削除する。通常ファイル、通常ディレクトリ、symlinkを区別し、削除前の対象提示と明示確認を維持する。
- secret、memory、project、成果物、更新、チャット設定の全書込み導線で同じ境界を守り、拒否時に外部・内部のどちらにも部分生成を残さない。
- `git`、`gh`、`claude`、`gcloud`等の外部CLIと外部HTTPは、操作の種類に応じた有限時間で完了またはtimeoutする。timeoutは成功や空結果に読み替えず、後続commit・push・削除を進めない。

### F38 OAuth callbackとloopback wizardのsession保護

- OAuth callbackは1つの認証sessionで一度だけ受理し、同じcode／stateの再送、同時再入、完了後の再アクセスでtoken交換、Secret登録、履歴取得を重複しない。
- callback処理中、成功済み、失敗済み、後始末待ちを区別する。OAuth grant／token取消やRepository Secret削除に失敗した場合は成功と表示せず、残っている対象と次の操作を示す。
- Chatwork／Google Chatのloopback wizardはloopback interfaceだけへbindし、状態変更requestは同じsessionの正しいorigin、正しいContent-Type、推測困難なsession確認値を満たす場合だけ受け付ける。cross-origin、確認値なし／不一致、JSON以外の送信は副作用0件で拒否する。
- GETは状態参照と静的配信だけにし、状態変更を起こさない。認証・session情報はログ、URL、DOM、評価証跡へ残さない。

### F39 履歴markerとActions runの因果整合

- Google Chat本文、発言者名、添付メタデータに履歴内部marker、Markdown見出し、HTML comment、区切り線と同じ文字列が含まれても、既存blockの境界として解釈せず本文として保持する。
- 1件の悪意ある／偶発的な本文で、同日既存投稿、後続投稿、thread、添付メタデータが欠落・結合・上書きされない。再取得でもmessage resource name単位の冪等性を保つ。
- Chatwork／Google Chatのworkflow dispatch後は、今回のdispatchより前のrun、別workflow／別branchのrun、作成時刻が欠落・不正なrunを候補にしない。今回開始したrunとの対応を確認できない場合はtimeoutまたは未確認として停止する。
- 成功確認前のpull・検索・成功表示、失敗runを避けて別の古い成功runを採用する動作を0件にする。

### F40 0.6.0から0.7.0への安全更新と完全復元

- marketplace、plugin manifest、CHANGELOG、更新診断、最小台帳、migrationの最新版を `0.7.0`へ揃え、`0.6.0`利用者へ対象者、変わること、設定・ファイルへの影響、必要な操作、互換性上の注意を示す。
- `0.6.0`からの更新は診断→明示確認→pushなし保護地点→dry-run→更新→検証の順を守る。カスタマイズ、記憶、一般PJ、チャット履歴・設定、secretを無確認で置換しない。
- migrationは冪等で、同じ `0.6.0` workspaceへ再実行しても追加変更0件。途中失敗、reload前後、検証失敗を区別し、成功前に `0.7.0`適用済みと記録しない。
- rollbackはworkspaceとpluginの両方を更新前状態へ戻す。pluginの自動復元が環境上不可能な場合も、正確な旧版、対象scope、確認方法を含むその場で実行可能な手順を示し、「保守者へ連絡」だけで終わらせない。

### F41 配布validatorとportableなmaster回帰

- Claude plugin／marketplaceの配布validatorは、必須author情報と `forkedFrom`を検査対象にし、欠落・不正・不一致を失敗にする。独自validatorだけが通りClaude側の配布条件を満たさない状態を合格にしない。
- master offline suiteは受入済み機能の正本とし、少なくともSprint 015のプロジェクト境界とSprint 020 Patch 002のGoogle Cloud準備を実行する。子suiteの存在確認だけ、実行漏れ、失敗の握りつぶしを認めない。
- master suiteはGit checkoutと、`.git`がないGit archive相当の配布物の両方で実行できる。Git履歴を検査する項目は、checkoutで必須の検査とarchiveで利用可能な配布物検査を区別して結果を示す。
- release integrity、manifest、CHANGELOG、migration、配布チャネル非依存、MIT・単段クレジット、`forkedFrom`、authorを1つの配布前結果として確認できる。

### F42 wizard accessibilityと公開説明の整合

- Chatwork／Google Chat wizardは画面遷移、非同期成功、失敗、キャンセル後に、新しい画面の見出しまたは主領域へfocusを移し、現在地をkeyboard／支援技術で把握できる。入力中の再描画では入力focusを不必要に奪わない。
- button、link、summary、checkbox／radioの主要操作領域はdesktop／mobile／200%で44px相当以上とし、見た目だけでなく実際のhit areaを確保する。
- `.mcp.json`、onboarding、README、公開ガイドは、Microsoft／Notion対応、Google公式コネクタ、Chatwork／Google Chat同期、更新、`0.7.0`の現行機能と一致する。古い「後続対応予定」、古い版、古い導線を現行説明に残さない。
- READMEの主導線は短く保ち、技術者向けの配布検査、live gate、復元情報は後半または公開ガイドへ分ける。文書整理で安全同意や正式名称を削らない。

### F43 公開済み0.7.0の正式release gate

- release candidateはF36〜F42の専用回帰とmaster offline／online suiteが0 FAIL、Git archive相当の配布検査がPASSになるまでlive gateへ進まない。
- live gateはユーザーが許可した1つの専用private test workspaceで、ChatworkのToken、Google Chatの組織所有Internal OAuth、両サービスのRepository Secret、選択した非機密room／spaceだけを使う。
- ChatworkとGoogle Chatの接続、対象選択、初回取得、3時間schedule相当のActions、commit、push、pull後search found、同条件再実行の重複0件を、同じrelease candidateで確認する。片方だけ、過去run、合成fixtureをlive合格に数えない。
- 証跡はprivate状態、版、Secret名、伏せ字対象、run ID／時刻／状態、件数、commit hash、push／pull、検索状態、重複0件だけとし、資格情報、OAuth URL、本文、発言者名を残さない。
- 評価後は両サービスのschedule停止、全チャットSecret削除、room／space選択解除、Google OAuth grant／token取消を確認する。後始末が1つでも未完了なら `cleanup-required`で不合格とし、取得履歴やworkspaceの削除は別の明示確認なしに行わない。

## 2 editionへの安全な分離（F44〜F50）

### F44 rule境界とedition可変copy

安全性・証拠・文体を別ruleとして扱い、edition styleが安全条件を弱められないようにする。
会話、診断、報告、developer handoffのedition可変copyを1か所へ集約する。Chatwork／Google Chat wizard copyは集約対象外で、現行表示を変えない。

### F45 edition設定と衝突停止

配布ID、repository、更新URL、ledger、session directory、保護commit prefix、Harness、表現copyを宣言的設定から得る。
対応するHarnessのversion、repository、検査済みcommit、host別導入IDはedition設定を正本とし、
build導線、README、互換性回帰、online検査を同じ値へ揃える。SecretaryはHarness本体を同梱せず、
Harness固有のmodel routingやcustom agent実装を複製しない。
新規workspaceはneutral markerとedition値を持ち、legacy yasashii markerも認識する。反対edition、混在、判定不能を検出したら書込み前に停止し、既存データを移動・統合・上書きしない。

### F46 共通plugin pathと旧CHANGELOG互換

両editionの内部plugin pathを `plugins/secretary/` にする。manifest、回帰、archive、release gateを新pathへ揃える一方、
旧 `plugins/yasashii-secretary/CHANGELOG.md` をredirect説明ではないraw CHANGELOG長期互換fileとして残し、
新しい正本と常にbyte-for-byteで同一にする。旧 `0.7.0` の診断処理がこのfileから `0.8.0` と変更点を読めることを守る。

### F47 公開済み0.8.0のrelease履歴

`0.7.0` のrelease記録は不変、当時まだ利用者へ明示配布していなかった2 editionの最初のrelease candidate／latestは `0.8.0` とした。
marketplace、plugin manifest、正本／legacy CHANGELOG、edition設定、README、公開ガイドを揃え、新規または未導入状態から
0.8.0を導入できることを同一candidateで検証する。旧0.7.0 updaterがGoogle Chat標準生成fileをscannerで止める既知事実を保持し、
external recovery／bootstrap、fixture削除、安全scan弱体化で回避しない。未検証の旧0.7.0 live updateを対応済みと主張しない。
same-version bootstrap bridgeは作らず、`0.8.0 → 0.8.0` と `0.8.0 → 0.7.0` は副作用0件で停止する。
この節は `v0.8.0` 公開後も履歴回帰として期待値を変更しない。現在candidateはF50で別に解決する。

### F48 agentic-secretary上流edition

neutralization commitまでの全Git履歴を継承し、下流とは別のlocal checkoutと
GitHubの別repo `mtaiseeei/agentic-secretary` に上流editionを成立させる。monorepo／subdirectoryにはしない。
技術者向け差分は会話、診断、報告、developer handoffだけで、wizardと安全動作は共通にする。

### F49 yasashii-secretary下流overlay

`yasashii-secretary` はfetch専用 `upstream` remoteで `agentic-secretary` を参照する。overlayは共通pluginのedition style、
共通安全回帰、必要な互換／release checkだけに限定し、spec、Sprint、progress、feedback、evidenceは各repoが所有する。

### F50 2 editionと現在candidateの公開gate

共通回帰、edition別回帰、公式validator、Git共通祖先、overlay冪等性、反対edition停止、wizard parity、
旧raw CHANGELOG互換、新規0.8.0導入、equal／downgrade停止、旧blockerの非誤表示、
公開済み `0.8.0` 履歴の不変、現在candidate／latest／versionの `0.9.0` 整合、LICENSE／クレジット／mappingを証拠化する。
現在candidate `0.9.0` は、manifest・CHANGELOG・公開tagで確定した最高公開版 `0.8.0` に、後方互換な利用者向け機能追加のminor更新を適用して一意に得る。別directory／repo作成、remote、push、公開、
release、実plugin install／updateは該当Sprintで明示許可された操作だけ実行する。
`0.9.0` 公開後のHarness互換参照更新は、Secretary本体の後方互換なpatch更新 `0.9.1` とする。
`0.9.0` の公開tag・artifact・評価記録は変更せず、現在candidate、marketplace、両manifest、CHANGELOG新entry、
edition metadata、公開案内、current release gateだけを `0.9.1` へ進める。

### F51 全会話のMarkdown可読性

両editionの会話、診断、確認、進行、成功、部分失敗、エラー、検索結果、更新、プロジェクト、接続案内、developer handoffは、
複数要素を改行なしの平文へ連結しない。1要点は短い段落、複数の手順・選択肢・結果・原因・次の行動は空行で分けた段落または
Markdown箇条書きにする。単純成功は自然な短文でよく、固定の項目数・順序・prefixを要求しない。改行の有無をユーザーへ質問せず、preferencesで無効化しない。
一方、1文ごとのbullet、不要な見出し、装飾目的のMarkdownは増やさない。agentic／yasashiiの思想、対象、4面の内容差は維持する。
完了・状態報告、一般的な質問への回答、複雑な説明、診断、検索結果、部分失敗は、すべて内容に応じた短文・段落・箇条書きを使い分ける。

### F52 ホスト非依存の共通本体と4環境host adapter

正式な必須対象環境は Claude Code Desktop App、Claude Code CLI、Codex App、Codex CLI の4つとする。
その他のコーディングエージェントは共通本体を再利用しやすくする設計対象だが、公式受入対象・配布保証・
実環境検証必須対象ではない。安全性、会話ルール、wizard、OAuth scope、同期境界、fixture・validator等の
共通本体はホスト非依存の1実装とし、manifest・導入・更新・plugin root・command・実会話runner等の
ホスト固有部分だけをhost adapterとして分ける。同じ機能を4コピーしない。
実会話テストの証跡にはhost・runner・実行面を記録し、対応対象ホストと検証済みホストを別集計する。
1ホストのPASSを全ホストPASSへ昇格させず、未検証環境を「対応済み」と表示しない。
「対応済み」判定の条件は `editions.md` の12条件を正本とする。

### F53 利用者中立の呼び方と配布物

- 初回の呼び方は「あなた」「アカウント名」「指定の名前」「その他」の4選択肢をClaude CodeとCodexの両方で提示する。
- 「アカウント名」の候補は、(1) 現在タスクへhostが提供済みの過去会話の記憶・Personalization・Project文脈・現在会話の明示名、(2) `git config user.name`、(3) OSユーザー名の順で探す。任意の過去会話や生session logを直接探索する共通APIは使わない。
- Git／OS値は表示名向けに正規化する。空、メール形式、bot／CI／root／admin／user／unknown等の汎用名、数字中心、長すぎる識別子、machine-like文字列を除外し、OS値は名前らしい場合だけ候補にする。
- 候補は正規化後に重複を除き、複数なら出典を短く添えて最良1件を推奨する。host間で取得可能情報が違っても同じ優先順位・除外規則でbest effortとし、候補0件なら「アカウント名」を利用不能にする。
- 「指定の名前」と「その他」で得た自由入力を含め、解決した保存値を作成処理より前にユーザーへ示して確認する。選択への未回答、空回答は「あなた」へ解決し、保存確認が未完了なら書き込まない。
- 探索・正規化・推奨の途中結果は保存しない。ユーザーが選び、保存前確認を通過した解決値だけを保存する。
- 既存の呼び方変更は `preferences.md` を現在値の正本とし、`AGENTS.md` と `MEMORY.md` の現役表示を同一transactionで同期する。初回決定ログは当時の判断履歴として改変しない。
- 既存の呼び方変更で新しい確認済み値を再掲するのは、この3つの現役正本だけとする。journalとGit commit subjectは変更項目だけを記録し、確認済み値や他の設定値、値から導いた文字列を含めない。
- 配布物と現行製品正本から個人名、利用者端末固有の絶対path、私用workspaceへの依存を除く。回帰fixtureの人物は合成人物へ置換する。
- MITの著作権名、GitHub owner `mtaiseeei`、公式repository URL、`forkedFrom`、公開版の正式な配布識別子は維持する。

### F54 危険に応じたauthorizationと確認

- `explicit` は、ユーザーが操作、対象、行き先を明示し、残る危険が小さい状態である。その発話自体をauthorizationとして同じターンで実行し、同じ内容を再承認させない。
- 保存依頼の確かさと、保存する内容の確かさを分ける。「覚えといたほうがいいかも」のように操作自体をぼかす依頼は`inferred`として確認前0件だが、「Rokunabeだと思う。覚えて」のように内容へ推量を残しつつ保存を明示した低リスク依頼は`explicit`である。伝聞・推量・訂正は内容の属性として意味を保ち、現在利用者の明示した保存依頼を取り消さない。
- 「『覚えて』と言われた」のような依頼語の引用、現在依頼ではない仮定・条件、保存の取消、過去依頼への照会は、現在の`explicit`依頼とみなさない。read-only照会は副作用0件で答え、取消は未保存なら副作用0件、保存済みなら削除2段階へ接続する。
- `inferred` は、秘書が保存、設定変更、プロジェクト化等を自発提案する状態である。何を行うかが分かる質問を出し、回答前の副作用は0件にする。
- `ambiguous` は、対象、日付、行き先、参照先に複数候補が残る状態である。不足する一点だけを質問し、質問でない宣言文を残して停止しない。
- `destructive` な上書きは、利用者が作成・編集した内容を置換・喪失させる、または容易にrollbackできない変更である。単一設定値の可逆更新は除外する。`大量操作` は10件以上、件数未確定の「全部／一括」、複数repo・複数外部宛先にまたがる操作のいずれかとする。
- `destructive` または `external` は、削除、上記の上書き、戻しにくい変更、公開、push、認証、権限、課金、他者通知、大量操作、Secret保存、曖昧な送信先・公開範囲を含む。明示依頼でも対象と影響を示して事前確認する。
- 同じターンは、1つのユーザー発話を受けてtool実行を含み最終応答で終わる1 assistant turnである。retryや再開でも同じoperation idの副作用は1回だけにし、既実行なら再実行せず状態を確認して報告する。
- path guard、atomic write、rollback、空上書き拒否、Secret非表示・保存拒否、未依頼push禁止、未確認外部状態の非成功扱い、入力にない事実の非追加を維持する。

### F55 現在用件優先と内容依存の応答

- 現在の明示依頼を、古い再開しおり、決定0件監査、プロジェクト候補、内部index整合より優先する。内部管理は必要なら現在用件の完了後に行い、利用者の依頼を別件へ横取りしない。
- 応答は `answered`、`question`、`saved`、`error`、`partial` の実状態と一致させる。`answered` はread-only照会や非操作的な引用等へ副作用0件で答えた状態である。未実行を「残します」「記録します」と完了風に述べない。
- 待つ場合は利用者が何を返すか分かる質問または選択肢を示す。成功後は、保存した内容の要点、種別、行き先を過去形で伝える。
- 単純成功は自然な短文、複数結果や部分失敗は必要な段落・箇条書きにする。固定3項目、内部stage名、不要な技術証跡、架空の次行動を強制しない。
- setupは「サービスを使いたい」と「接続設定をしたい」を区別し、接続状態を確認できる場合は実際に未接続のときだけsetupへ進む。
- 接続状態を確認できない場合は未接続と推定せず、read-only診断を先に提案する。利用者が明示的にsetupを依頼しても、認証・権限変更・外部writeの直前確認は省かない。

### F56 意味保存golden set

- 会話回帰は自然文のbyte一致や固定prefixではなく、`intent × side effect × response state` の期待遷移を検査する。
- 保存では、主体、日付、行動、対象、否定・条件が入力と一致する。入力にない担当、期限、顧客名、因果、依頼語、不要な会話全文を保存内容へ追加しない。
- golden setは `explicit / inferred / ambiguous / destructive / external`、副作用 `0 / 1 / partial`、応答 `answered / question / saved / error / partial` を網羅する。
- 各caseは、必須応答要素、禁止表現、期待する意味tuple（主体、日付・期限、行動、対象、否定・条件、情報源・確実性・訂正関係、行き先）、副作用の前後snapshotを持つ。意味要素の欠落・反転・入力にない追加を注入したnegative fixtureを必須にし、機械判定不能な項目は判定根拠を記録する。
- 境界例として、依頼自体のhedge、内容だけのhedge、依頼語の引用、伝聞内容の明示保存、仮定・条件、訂正、取消、過去依頼照会、重複作成、Secretを含む入力、通知を伴う即時実行、複合依頼の一部失敗、closed projectの軽量read-only照合、明示TODO完了・持越し、決定0件の自然な締めを含める。
- 旧exact copy、質問禁止、固定3項目の回帰は、現在の意味契約と衝突するassertだけを置換する。`scripts/lib/sprint-032-patch-001-conversation.mjs` と、それを使うreadability／smoke judge、`scripts/check-report-schema.py`、固定報告shapeを要求するSprint 010／011／012／029／032系assertを置換対象に含める。履歴記録自体は改変せず、同じsuiteのpath guard、timeline決定性、Secret、Git所有範囲等の非衝突assertは保持する。

### F57 3配布系統の同期と限定Notion修正

- 共通会話契約は `agentic-secretary` を上流正本とし、private downstreamの `agentic-secretary-my-vault` と、狭いoverlayを持つ `yasashii-secretary` へ反映する。各repo固有のspec、Sprint記録、README、配布判断は上書きしない。
- 共通coreの分類・応答・安全契約は本repoが所有する。`task-triage`、`notion-tasks`、`vault-search`、`vault-documents` 等のmy-vault所有Skillはprivate repo側の同一Sprint契約作業単位でだけ変更し、public coreへ移植しない。GeneratorとEvaluatorは実downstreamではなく隔離candidateを用い、独立Evaluator PASS後の明示されたrelease操作でのみ実downstreamへ反映・再インストールする。
- my-vaultは実行タスクの正本をNotion TaskDBに維持し、今回の変更を次の5点に限定する。
  1. task-triageで番号承認済みかつ内容不変の候補を、Notion write前に同じ内容で再承認させない。
  2. 明示保存依頼で、質問文なしのまま停止しない。
  3. 日付を伴う将来の実行行動をlocal TODOへ誤送せず、意味と正本ルールによりNotion taskへ送る。
  4. Calendarとvaultのread-only横断依頼は内部で分けて取得し、利用者には統合結果を返す。
  5. 内部用語だけで停止せず、利用者が決める不足一点を質問する。
- Notionのproperty設計、relation、TaskDB正本、通常の作成計画提示、connector write後のpage再読確認、未確認外部状態の非成功扱いは維持する。
- yasashiiは通常設定とSecretを混同せず、明示された可逆設定を同じターンで反映し、edition固有の言葉遣いを保った自然な結果を返す。
- 3配布系統の共通parity caseは、行き先と正本ルールが同じcaseだけに限定する。Notion routing等、保存先が版で異なるcaseはedition固有golden setとし、intentと安全境界だけを共通比較し、response stateと保存先は各版の正本に従う。
- 3配布系統のcandidateは、共通caseの意味、安全境界、版固有差分、同期後のrepo-owned file不変を確認してからrelease gateへ進む。

### F58 Windowsネイティブの記録・保存操作

- Windowsの通常のローカルworkspace pathで、一般プロジェクトの作成・更新・整理・完了・再開、関連TODO、memory、daily、weekly、settings、単発／PJ文書保存を利用できる。
- drive letter、空白、日本語を含むpathを有効なworkspaceとして扱い、OS固有のshellの有無やpath解釈の違いを理由に「秘書ディレクトリが見つかりません」と誤報しない。
- project／memory／TODO／settings／文書保存が共有するjournal、索引、commitの境界は、OSにかかわらず同じ意味を持つ。成功時は必要な副作用が1回だけ完了し、失敗時は契約どおり開始前へ戻るか、実際の部分成功範囲を正確に示す。
- workspace外、path traversal、前方一致する別ディレクトリ、外向きsymlink／junction等の参照は副作用0件で拒否する。Windows対応のためにpath guardを文字列の前方一致へ緩和しない。
- Windows回帰はWindowsの実行環境で行い、path文字列の模擬だけを合格にしない。macOS／Linuxの既存回帰と安全assertもすべて維持する。
- 公開済み `0.9.1` の次の後方互換patchを `0.9.2` とし、Agenticの共通coreを先に独立評価する。YasashiiはPASSしたAgentic完全SHAからoverlay同期し、別の回帰と独立評価を行う。private my-vault版は変更しない。

### F59 秘書自身の英語名とidentity

- F53の「利用者をどう呼ぶか」と別に、秘書自身の英語名を持つ。初回オンボーディングでは「希望の英語名」または「おまかせ」を選び、解決した候補を確認してから保存する。Alexは例であり固定値ではない。
- 既存利用者は専用name Skillを直接起動でき、後から変更できる。英語名として不適格な空値、メール、path／command風、制御文字、汎用bot名は保存しない。
- identityは変更可能な表示名、stable ID、種別 `ai-secretary`、aliasesを持つ。作者表示は `Alex (AI Secretary)` のように人とAIを区別し、構造化記録でもstable IDと種別を保持する。renameで過去の作者主体を変えない。

### F60 user-scopeの名前routingとcanonical workspace

- 別repoから名前で呼べる効果、対象host/file、無効化方法を説明し、推奨yesとして明示確認後だけ有効化する。
- Codexは `~/.codex/AGENTS.override.md` の有無と優先を扱い、実際に読まれるuser-scope AGENTSへ製品所有managed blockを置く。Claude Codeは `~/.claude/CLAUDE.md` を扱う。既存内容、他block、改行を保持し、全面上書きしない。
- registry/resolverはstable ID、edition、canonical workspace実体path等の最小metadataだけを持つ。別repoのcwdを新しい秘書workspaceと誤認せず、edition markerと必要正本を再検証して既存秘書へ接続する。
- 現在名への直接呼びかけと「現在名に聞いて」を正のcaseとする。人間、顧客、取引先、author、引用、コード、ファイル本文の同名はroutingしない。曖昧時だけ副作用0件で一度確認する。

### F61 安全なrenameと下流handoff

- rename previewは現在名の利用箇所を、A: identity／現行設定／managed block／registry、B: 利用者作成コンテンツ、C: 履歴／author、D: 所有不明／衝突へ分類し、件数、対象、推奨処理、非対象、rollbackを示す。previewはread-onlyである。
- applyは新名と分類別対象を明示確認後だけ更新する。Aは一体更新、Bは個別許可だけ、Cは原則保持してaliasesへ旧名追加、Dは変更しない。途中失敗は開始前へrollbackし、retry／再実行で重複を作らない。盲目的な全件置換は禁止する。
- Agentic共通コアを先に独立評価し、PASSした完全SHAと宣言済み共通pathからだけYasashiiとprivate my-vaultを別repo Sprintへ渡す。Yasashii overlay、private固有Notion／vault、root AGENTS、各repo docsを上書きしない。
- 実利用者HOME、installed cache、実下流repo、release、Mac mini同期はSprint 039の実装ACではなく、各repoの独立PASS後の運用phaseとする。

### F62 既存workspaceの名前オンボーディング完全移行

- pluginの更新と、利用者workspaceへコピー済みのローカルファイルの移行を別の段階として扱う。plugin更新後の新sessionでは、canonical workspaceを読み取り専用で診断し、名前設定が未完了または部分適用なら、pluginだけが新しくなりローカル移行が残っていることを明示してname onboardingを案内する。
- 既存workspaceは、identity未作成、現行 `0.10.0` name Skillでidentityだけ作成済み、新規導入相当まで適用済み、利用者編集または所有衝突ありを区別する。希望の英語名またはおまかせ候補を確認し、既存identityが正当ならdisplay name、stable ID、AI種別を再生成せず使う。
- read-only previewは、`secretary/identity.json`、製品所有のAGENTS／CLAUDE identity管理節、最小台帳について、追加・更新・維持・衝突、対象path、local checkpoint、rollback、非対象を示す。利用者自由記述、記憶、プロジェクト、チャット履歴、Secret、user-scope fileを変更候補へ含めない。
- 別turnの明示確認後だけ、上記の製品所有範囲を新規導入相当へatomicに揃える。AGENTS／CLAUDEは管理節だけを扱い、台帳は管理対象metadataだけを更新して秘書名やstable ID等の私的値を保存しない。成功には構文・identity整合・台帳整合・所有path限定local checkpointの確認を含む。
- 書込み、整合確認、台帳、stage、commit、commit後確認のどこかが失敗したら、今回の変更、Git HEAD、index、working treeを開始前へ戻す。開始前の利用者変更を保持し、部分file、部分stage、部分commit、backup、一時fileを残さない。成功後の再実行はfile差分、台帳重複、追加commitが0件である。
- user-scope registry／routingは完全移行の必須条件にせず、ローカル移行完了後も別の任意操作とする。名前の変更や既存コンテンツのgrep置換はF61のrename導線へ送り、初回移行の確認をrename authorizationへ流用しない。
- `0.10.1`は公開済み`0.10.0`の既存workspace移行欠陥を直す後方互換patch candidateとする。Agenticの独立PASS後だけ完全SHA、共通digest、宣言済み共通pathをYasashii／private my-vaultへ固定handoffし、両下流の別Sprint・独立PASS後だけ3版releaseとMac mini同期を行う。受講者向け更新文はrelease後に作成する。

### F63 明示memory依頼の一度きりauthorizationと内容冪等性

- 利用者が「これ覚えて」「Rokunabeだと思う。覚えて」のように低リスクの保存を明示した場合、利用者から見た行き先 `memory` は十分に一意である。decision／topic等の内部分類、具体的な保存ファイル、要約案を理由に再確認せず、同じturnで1回だけ保存する。
- authorizationはrouterからmemory-care、正規の保存シーム、journal、checkpointへ一方向に引き継ぐ。内部段階が変わっても`explicit`を`proposed`へ戻さない。ただしSecret、削除・破壊的変更、外部送信・公開・push、10件以上または件数不明の一括操作、利用者が示したmemory以外へのscope変更は、既存の安全分類により停止・確認できる。
- request hedge（保存するかの曖昧さ）とcontent hedge（保存内容の推量・伝聞・留保）を別に扱う。content hedgeがあっても現在の保存依頼が明示されていれば`explicit`であり、推量・情報源・留保を要約から消したり、確定事実へ反転したりしない。会話全文や完全なverbatim copyは保存要件にしない。
- 確認が必要な保存候補は、一度に1件のcontentとuser-visible scopeを固定する。未回答の間に別話題が介在したらpendingを失効し、古い「はい」で保存しない。「はい、ただしX」は修正後contentへの`explicit` authorizationとして同じturnで実行し、修正版をもう一度確認しない。
- topicの訂正は旧内容を上書きせず、`訂正: 旧→新（理由）`と同等の意味を持つappend-only記録を追加する。訂正前の内容、訂正後の内容、理由または不確実性を追跡できるようにし、同じ訂正のretryでは追記を重複させない。
- memoryの冪等性はoperation idだけでなく内容に基づく。同じmemory種別、正本scope、正規化した意味内容、訂正関係が既に保存済みなら、別turn・別operation id・再起動後のretryでもtopic／decision／journal／commitを追加しない。利用者には保存済みであることを副作用0件の結果として伝える。
- memory本体と必要なjournalが成功し、local checkpoint commitだけが失敗した場合は`partial`である。保存済みcontentとjournalを保持し、retryは未完了のcommitだけを行う。保存・journalを再実行せず、commit成功後の再retryも差分・追加commit 0件とする。
- 会話coreの対象surfaceを追跡する機械可読なinventoryを製品正本として保つ。rules、copy、skills、templates、runtime分類、memory保存シーム、golden fixture、旧Sprint回帰を実内容まで検査し、`memory-care`／`secretary`に加えて`settings`／`daily`／`projects`等の関連surfaceを含める。Agentic、Yasashii、private my-vaultの各sourceで新契約markerの存在と、topic保存前の一律確認、exact copy、明示memory依頼の別turn確認を表す旧markerの不在を検証する。
- 3版のsourceとオフライン回帰を同じ契約へ揃える。push、tag、GitHub Release、marketplace更新、installed cache、利用者workspace、release後の新session確認は別phaseとし、sourceのオフラインPASSだけでloaded versionへ反映済みと表示しない。

## Gテーマと機能の対応

| テーマ | 主な機能 |
|---|---|
| G1 | F05 F06 F07 F08 F17 F18 F19 F21 |
| G2 | F04 F10 F20 F51 F53 |
| G3 | F14 F15 F22 |
| G4 | F10 F14 F15 F20 F22 F51 |
| G5 | F04 F07 F23 F24 F25 F26 F27 |
| G6 | F03 F05 F06 F07 F08 F15 F17 F18 F19 F28 |
| G7 | F01 F02 F04 F10 F16 F29 |
| G8 | F01 F02 F07 F10 F16 F20 F30 F31 |
| G9 | F03 F07 F10 F16 F23 F32 F33 F34 F35 |
| G10 | F01 F02 F04 F05 F07 F10 F16 F23 F24 F30 F31 F32 F33 F34 F35 F36 F37 F38 F39 F40 F41 F42 F43 |
| G11 | F30 F31 F36 F40 F41 F42 F43 F44 F45 F46 F47 F48 F49 F50 F51 F52 |
| G12 | F04 F16 F20 F41 F42 F53 |
| G13 | F03 F05 F06 F10 F17 F19 F20 F28 F30 F31 F51 F54 F55 F56 F57 |
| G14 | F05 F06 F07 F08 F17 F20 F28 F31 F53 F54 F55 F58 |
| G15 | F03 F04 F20 F52 F53 F54 F55 F59 F60 F61 |
| G16 | F03 F04 F20 F30 F31 F52 F54 F55 F59 F60 F61 F62 |
| G17 | F05 F07 F17 F19 F52 F54 F55 F56 F57 F63 |
