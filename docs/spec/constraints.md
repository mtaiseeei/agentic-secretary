# Constraints

横断制約・禁止事項・安全方針。ここに書く条件は、受け入れ済み機能を含め**回帰させてはならない不変条件**。

## 1. 製品とリポジトリの境界

1. `~/workspace/agentic-harness` は全面操作禁止。ファイル編集、checkout / switch、commit、branch作成・変更、remote変更、生成物作成、複製元としての利用、当該checkoutを対象にしたコマンド実行をすべて禁止する。上流参照はGitHub上の `mtaiseeei/agentic-harness` だけを使う。
2. やさしいハーネスの正本は別リポジトリ `yasashii-harness`。`yasashii-secretary` に `harness/` のコピーや planner / generator / evaluator の agents を同梱しない。
3. `yasashii-secretary` は `yasashii-harness` のインストール案内・存在確認・接続導線だけを持つ。参照先が無い、リンクが切れる、同梱コピーが復活する状態を回帰として扱う。
4. `mtaiseeei/yasashii-harness` は独立public downstream repoとして、GitHub API上 `private=false`、`fork=false` でなければならない。初期基点は `mtaiseeei/agentic-harness` の fb9c303 とする。
5. `yasashii-harness` の本文・スキル・agents・runtimeロジックの差分は、**見出しに `yasashii` を含む追加セクションだけ**。上流由来の実装行の書換・削除は禁止。上流変更は本作業のスコープ外であり、将来あらためて明示承認された場合だけ上流側の別branch / PR手順に分離する。
6. remoteは `origin=https://github.com/mtaiseeei/yasashii-harness.git` と、読取専用の `upstream=https://github.com/mtaiseeei/agentic-harness.git` を分離する。上流追随はGitHubの `upstream/main` から行い、ローカル `~/workspace/agentic-harness` を参照元・複製元・書込先・検査対象にしない。
7. 親repo `mtaiseeei/agentic-harness` は移管・改名・変更しない。GitHubのfork badge／parent relation／同じforkから上流へPRする導線は非ゴール。上流変更は本作業では行わず、将来あらためて明示承認された場合だけ `agentic-harness` 側の別branch / PR手順に分離する。
8. 上流由来行を変更できる機械的例外は、独立downstreamの配布識別metadataだけ。`.claude-plugin/marketplace.json` のmarketplace `name=yasashii-harness` / `repository=mtaiseeei/yasashii-harness`、plugin `name=harness` / `source=./plugins/harness`、plugin manifestの `repository` / `homepage=https://github.com/mtaiseeei/yasashii-harness`、必要なCodex marketplace識別子をdownstream向けに揃える。
9. metadata例外は `gentle-overlay/metadata-overrides.json` に対象ファイル・JSON field・期待値を宣言し、これをoverlay兼allowlistの唯一の正本とする。sync後に完全一致を検査し、allowlist外のmetadata変更と上流由来行の書換・削除は0件でなければならない。

## 2. 外部データ・プライバシー・Git

1. Gmail / Calendar / Drive / Microsoft 365 / Notion等は公式リモートコネクタで都度参照し、同期層や `10_sources` 型の汎用複製を作らない。**同期例外は、選択したChatwork roomとGoogle Chat通常スペースを同じprivate repoへ保存する承認済みGitHub Actions**に限定する。
2. コネクタ由来の本文を記憶やjournalへ複製しない。Chatwork／Google Chat本文はサービス別の履歴領域だけに保存し、取得件数・対象・時刻等の同期状態もjournalではなく各サービス専用の状態記録に分ける。
3. Chatwork API Tokenを含む資格情報、パスワード、APIキーを保存・コミットしない。Chatwork API Tokenの正本はGitHub上の安全な保管場所（Repository Secret）だけであり、repo本文、設定、ログ、エラー、fixture、スクリーンショット、会話、wizardに値を出さない。Tokenは有効期限がなくChatwork機能へフルアクセスできる資格情報として扱い、第三者へ開示しない。
4. ユーザーワークスペースはprivate GitHub repoでなければならない。public repoへの初回pushまたはチャット保存を拒否し、privateからpublicへ変更されたことを検出した場合は同期を止める。
5. private repoの共同編集者は保存されたChatwork／Google Chat本文を読める。wizardは対象選択確定前にこの影響を表示し、ユーザーは所属組織の情報管理方針に従う。
6. 初回オンボーディングはrepo作成、初期commit、初回pushを完了条件とする。既存remoteがある場合は現在のrepoを使う確認を行い、Chatwork専用repoを黙って作らない。
7. scheduleによるChatwork／Google Chatの自動commit・pushは、対象・間隔・保存内容を示して同意を得た後だけ許可する。検索不成立等から開始する予期しない手動同期は、実行直前に構造化質問で確認する。
8. 通常の秘書・一般プロジェクト成果のpushは同じworkspace repoのGit運用に従う。別repoを正本にした開発PJはそのrepoのGit運用に従い、workspace側へ履歴や正本を複製しない。チャットを別repoへ分離したり、秘書の記憶・成果物だけを永続的なローカル専用正本にしたりしない。
9. Chatworkの取得は選択roomだけに限定し、message ID単位で冪等、つまり同じ取得を繰り返しても重複しない。API応答に無いことだけを理由に取得済み履歴を削除しない。
10. Chatwork APIの最新100件制約をユーザーへ明示する。導入前履歴の欠落、初回0件、100件より古い履歴を取得できない状態をエラーや「存在しない」の根拠にしない。
11. コミットメッセージは、何をしたかが分かる日本語1行とし、可能な範囲で固有名詞を含める。`git log` を予備のタイムラインとして使える粒度を保つ。
12. public / MIT と Shin-sibainu/cc-company の単段クレジットを維持する。中間フォークを必須クレジットとして追加しない。
13. public配布repo `yasashii-secretary` へChatwork／Google ChatのRepository Secret、同期workflow、対象設定、同期状態、履歴を置かない。これらは利用者ごとのsingle private workspaceだけに置く。
14. 実API評価は専用private test workspaceで行う。test workspaceもpluginの利用設定・生成物、秘書、通常project、Chatwork／Google Chat設定・workflow・履歴を同じrepoに置き、チャット専用repoへ分離しない。public配布ソース自体の複製は要求しない。
15. private test workspaceの作成、Repository Secret設定、workflow dispatch、remote push、Chatwork／Google Chat API送信はexternal live gateとする。各操作へのユーザー明示許可と、サービス別のtest資格情報・非機密test room／spaceの準備が揃う前に実行しない。
16. external live gateの準備が無い場合、合成fixtureで実APIを代替せずSprintを不合格とする。ただし理由は `external-live-gate-unavailable` と明記し、実装不具合としてGeneratorへ誤分類しない。
17. live gateの権限は、専用private test workspaceと非機密test room／spaceの読取・同期に必要な範囲へ限定する。証跡にはSecret名の存在、workflow run状態、件数、commit、push／pull、検索状態だけを残し、token値、不要な対象名、チャット本文を残さない。
18. live gate完了後はscheduleを停止し、Repository Secretを削除し、test room／spaceの選択を解除する。Google ChatではGoogle側のOAuth grant／tokenもrevokeし、アプリ権限の取消を確認する。test workspaceと取得済み履歴を削除・archiveする場合は対象と影響を示し、ユーザーの明示確認後だけ行う。
19. Chatwork／Google Chatのwizard、検索、同期が履歴repoのremote更新を取り込むときは、fast-forwardだけを許可し、rebaseを明示的に無効化する。利用者の `pull.rebase` 設定を変更せず、取得対象と競合しない既存の未commit差分は保持する。fast-forward不能、または取得対象pathとdirty差分が競合する場合は、rebase、merge commit、force、差分の退避・復元を行わず安全に停止する。

## 3. 記憶保護と封じ込め

1. 空内容・実質空で既存記憶を上書きしない。
2. 削除は、対象を示す警告とユーザーの明示確認を分ける2段階にする。
3. 記憶の増減時は `MEMORY.md` 索引を追従させ、200行以内を保つ。
4. `secretary/` の記憶・成果物に対する読み書き・削除・ディレクトリ作成は path guard を先に通し、symlink解決後も `secretary/` 内である場合だけ許可する。基点自体が外部を指す symlink の場合も拒否し、拒否前に副作用を出さない。
5. 境界外、空・`.`・親方向への脱出を非ゼロで拒否する。境界外 symlink は `exit 3` とし、文字列の前方一致だけで判定しない。
6. 再セットアップは既存 `secretary/` のバックアップ提案と明示確認を先に行い、無確認で上書き・再初期化しない。

### journal の限定例外

- journal は追記専用の事実ログ。定義済みシームが成功した事実だけは、ユーザー確認なしで副作用として追記してよい。
- 無確認追記を許すシームは `save-deliverable`、`todo-add`、`todo-done`、`todo-carry`、`remember-decision`、`topic-add`、確認済みPJに対する定義済みproject操作、settings の設定変更に限定する。
- `journal-add` は末尾appendのみ、空本文拒否、既存行の書換・削除機能なし。会話全文・逐語ログ・未確認の推測は書かない。
- `decided` と `topics` はF54のauthorization境界に従う。明示された低リスクの保存依頼はその発話を確認済みとして扱い、自発提案・曖昧な保存先では質問への了承後だけシームを呼ぶ。journal自体の副作用を、未依頼の保存許可には使わない。

### 決定の純追加

- 過去の decision 行を書き換えない。変更・撤回は新しい日付ファイルに、元の決定・日付・新しい決定・理由を追記する。
- 表示時は新しい決定を優先する。週次で矛盾を統合するときもユーザー確認を挟む。
- 確認済みPJ固有の決定はライト `PROJECT.md` またはフル `DECISIONS.md` を正本とする。決定本文を一般memoryにも複写せず、timeline用記録はプロジェクト名と参照先を含む短い記録に留める。

## 4. 既定値＋opt-in 上書き

1. 共有規律と既定の体験を第1部、個人設定による上書きを第2部として分ける。
2. `preferences.md` が無い・空・該当項目未設定なら既定値で動く。暗黙推測で設定を変えない。
3. 既定値は、丁寧で堅すぎない口調、専門用語「ふつう」、報告「みじかく」、自発的な決定保存提案は都度確認。
4. 報告は内容依存とする。1要点の成功は自然な短文、複数結果・部分失敗・比較は必要な段落または箇条書きで示す。`preferences.md` の「くわしく」は必要な説明量を増やせるが、固定項目、架空の次行動、未実行の完了表現を追加してはならない。
5. 一般技術用語は常にそのまま使う。「ことば添え」のopt-inでも語彙を置換せず、馴染みの薄い語またはユーザーの役割から未知と思われる語に短い補足を足すだけにする。
6. パーソナライズされた文面の完全一致は回帰対象にしない。rubricは既定値を採点し、設定分岐は構造・適用・安全なフォールバックと模擬会話で確認する。
7. 自発的な `秘書のメモ` 追記や、秘書側から提案する口調・呼び方・詳しさ等の変更は、適用前に質問する。ユーザーが値と対象を明示した可逆変更はその発話をauthorizationとして扱い、値不足や複数候補がある場合だけ質問する。
8. 初回の呼び方は「あなた」「アカウント名」「指定の名前」「その他」の4選択肢から解決し、保存前に実際の値を確認する。選択への未回答、空回答は「あなた」へ解決し、保存確認が未完了なら書き込まない。
9. アカウント名候補は、現在タスクへhostが既に渡した文脈、`git config user.name`、OSユーザー名の順で読み取る。任意の過去会話や生session logを直接探索する共通APIは前提にしない。Git／OS候補は表示名向けに正規化し、不適格値を除外する。
10. 既存の呼び方変更では `preferences.md` を現在値の正本とし、`AGENTS.md` と `MEMORY.md` の現役表示を同じ値へ同期する。同期に失敗した場合は部分更新を残さない。初回決定ログは履歴として改変しない。
11. 候補探索の途中結果、出典一覧、除外値、推奨順位は永続化しない。ユーザーが選択し保存前確認を通過した呼び方だけを既存正本へ保存する。

## 5. やさしさと規律

1. やさしさは、言葉遣い、報告、進行の見せ方、次の一手の先回り提案に適用する。
2. 6規律（スコープ・根拠・出力・記憶保護・自動コミット・報告）、封じ込め、Planner / Generator / Evaluator の分離、書込責務、評価閾値、回帰ゼロ許容は削らず、緩めない。
3. 一般技術用語はそのまま使う。過度な平易化、幼稚なメタファー、生の英語エラーの放置は禁止。
4. 先回り提案は有用な場合だけ1つまで、根拠を一言添える。置き場所を固定せず、次の行動が無ければ作らない。着手はユーザーが決める。
5. 口調や詳しさの違いを、C2・C5・C6のゼロ許容基準とトレードオフにしない。

## 6. データと実行の決定性

1. 日付を使う処理は `CC_SECRETARY_NOW` で時刻を注入でき、未指定時だけ現在時刻を使う。
2. 回帰では固定時刻を与え、ファイル名・日付境界・並び順を決定的に検証する。ロケール依存の曜日表示はしない。
3. `timeline` はLLMを介さず、同一入力から同一Markdownを返す。
4. reindex が200行を超える場合は、既存の終了コード契約 0/2/3 を壊さず、`exit 0` と stderr 警告で退避提案へつなぐ。

## 7. 配布構成

1. 配布物は改名後の `plugins/yasashii-secretary/` 配下に置き、manifest・marketplace・README・インストールコマンドの名前を一致させる。
2. 配布SKILLは同梱されない開発docsを参照しない。必要な規律は配布 `rules/` やテンプレに含める。
3. 同梱スクリプトの実行権限と案内する実行方法を一致させる。
4. 薄いルーターと段階ロードを維持し、部署制・自動case生成・patterns自動統合・generic／Harness hooksを追加しない。Project Clarityに必須なcommand-only lifecycle hookだけは§25の狭い例外とする。
5. `yasashii-secretary` から同梱ハーネス、agents、ハーネスベースラインを撤去し、section 12 は参照導線の健全性を検査する。

## 8. Chatwork設定wizard

1. wizardはloopbackだけで利用するローカル設定画面とし、外部公開サーバーや常設サービスにしない。
2. 画面へAPI Token入力欄を作らず、会話にもToken値を貼らせない。接続順は、(1) ChatworkでTokenを取得または組織管理者へ利用申請、(2) 現在のGitHub repoのSecret追加画面を開く、(3) GitHub画面の `Name` 欄へ `CHATWORK_API_TOKEN`、`Secret` 欄へ本人がChatwork公式画面で取得したAPI Tokenを入力、(4) 登録確認後にルーム一覧取得、とする。Token実値はGitHub画面だけへ入力する。
3. Chatwork公式のTokenページ、発行ヘルプ、組織契約のAPI利用申請ヘルプへ直接案内する。パーソナルプランを除き組織管理者への申請が必要であり、実際にAPIを利用するアカウントで申請する。承認前はルーム一覧取得へ進めない。Tokenページが利用できない状態では「組織管理者へAPI利用申請→承認後にこの設定画面へアクセスする」を示し、設定途中の選択を保持する。
4. Secret追加画面は `https://github.com/<owner>/<repo>/settings/secrets/actions/new` を現在のrepo情報から組み立て、CTAを「GitHub上の安全な保管場所を開く」とする。固定owner／repo pathを使わず、外部リンクは新しいタブで開き、行き先と目的が分かる日本語ラベルを付ける。
5. 変更は確認画面まで副作用を出さず、確定後だけルーム設定・自動取得の間隔・scheduleへ一貫して反映する。キャンセル時は0変更。
6. 「30分ごと」「1時間ごと」「3時間ごと（おすすめ・初期値）」「6時間ごと」「12時間ごと」「手動のみ」を選べる。scheduleは17分起点とし、選択値と実際の動作を一致させる。
7. 30日換算の概算実行回数1,440／720／240／120／60／0回を表示する。実行回数と処理時間を区別し、GitHub Freeの非公開リポジトリに含まれる月2,000分は2,000回ではなくGitHub Actionsの処理時間枠であることを明記する。2026年7月確認の参考情報であり、プランや1回の処理時間で実使用量が変わり、料金・枠は変更されうることと、GitHub公式billingページへのリンクを併記する。
8. ユーザー向け表示では `room` を原則「ルーム」、識別子が必要な箇所を「ルームID」、`頻度` を「自動取得の間隔」、`runs` を「実行回数」とする。`schedule` は「自動実行」、`workflow` は「自動取得処理（GitHub Actions）」、`private repo` は「非公開のGitHubリポジトリ」、`Repository Secret` は初出で「GitHub上の安全な保管場所（Repository Secret）」とする。内部コード、設定key、CLI、正式なAPI名は対象外。
9. GitHub Actionsの初出には「決めた間隔で自動取得を動かすGitHubの仕組み」と短く補足する。`同期` の初出は「最新メッセージの取り込み（同期）」とし、commit・pushは正式名称を保ったまま「取得結果をこのリポジトリへ自動保存します（Gitのcommit・push）」と目的を先に示す。
10. wizard本文は決定に必要な情報へ絞り、料金・実行時間などの補足は「料金と実行時間について」のdetailsまたは短いhelpへ置く。1 step 1 primary message、CTA最大2、既存デザイン言語を維持する。
11. ChatworkとGoogle Chatは同じwizard骨格、step構造、responsive・accessibility基準を使う。全画面で「Chatworkの設定」または「Google Chatの設定」を可視見出しとaccessible nameに明示し、取り違えを防ぐ。
12. primary CTAの背景色はChatwork `#F03747`、Google Chat `#11BB62` に固定し、前景は両方とも `#000000` とする。背景色を変えてコントラスト不足を隠さず、文字・アイコンとのcontrast ratio 4.5:1以上を満たす。青色primary CTAはこの2サービスのwizardに残さない。
13. UIは4px radius、8px spacing、400/500 weight、14px中心、headline最大40pxを守る。hoverは0.33秒のcolor／border変化だけで、scale／translateを使わない。
14. 768px未満は1 column・CTA縦積みとし、desktopは中央寄せの広い余白を持つ。keyboard操作、visible focus、可視ラベル、accessible name、エラー関連付け、十分なcontrast、200% zoomでの非欠落を必須にする。日本語化で折返しや横overflowを増やさない。

### 公式情報の確認基準（2026年7月）

- Chatwork API Token: `https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php`
- Chatwork公式発行ヘルプ: `https://help.chatwork.com/hc/ja/articles/115000172402-API%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%82%92%E7%99%BA%E8%A1%8C%E3%81%99%E3%82%8B`
- Chatwork組織契約の申請・承認ヘルプ: `https://help.chatwork.com/hc/ja/articles/115000169501-API%E3%81%AE%E5%88%A9%E7%94%A8%E7%94%B3%E8%AB%8B%E3%82%92%E6%89%BF%E8%AA%8D-%E5%8D%B4%E4%B8%8B%E3%81%99%E3%82%8B`
- Chatwork API Tokenの取扱い: `https://developer.chatwork.com/docs/endpoints`
- GitHub Actions billing: `https://docs.github.com/en/billing/concepts/product-billing/github-actions`

公開ガイドには「公式情報は2026年7月確認。サービス側の変更により手順・料金・利用枠が変わる可能性がある」と明記する。

## 9. プロジェクト管理

1. プロジェクト候補の検出と作成を分ける。候補を検出しても、ユーザーが了承する前にディレクトリ、ファイル、journal、commit、remoteを変更しない。
2. 候補提案は、少なくとも2つの候補シグナルがあり、そのうち1つが複数行動または複数セッションである場合に限る。単発成果物、同じ会話で完了する作業、一つだけのTODOを形式的にプロジェクト化しない。
3. 一般PJの正本は `secretary/projects/<project>/` 内に置く。path guard、symlink拒否、空上書き禁止、削除2段階、資格情報禁止を既存の記憶・成果物と同じ強さで適用する。
4. ライト運用は `PROJECT.md` 1枚から開始し、空テンプレだけを生成しない。既存情報があれば、ユーザーが指定した最小範囲の根拠から概要・現状・要確認事項を起こす。
5. フル昇格は、Decisions 10件超、メモ10件超または状態以外で読みにくい、PJ固有ガードレールが必要、PJ直下10ファイル超のいずれかと、ユーザー承認の両方を必要とする。トリガー到達だけで自動昇格しない。
6. フル運用の役割は `AGENTS.md`=指示、`PROJECT.md`=状態、`DECISIONS.md`=判断、`MEMORY.md`=事実とし、`CLAUDE.md` は `AGENTS.md` へのポインタだけにする。別の `INDEX.md` を作らず、索引は `AGENTS.md` に内包する。
7. PJ固有の決定はユーザー確認後だけ記録し、同じ操作で `PROJECT.md` の現在状況と日付を更新する。未確定の判断はDecisionsへ入れず、要確認事項に置く。
8. 実行タスクは `secretary/inbox/todo.md` または接続済みサービスを正本とし、PJ内に生きた `TODO.md` を作らない。プロジェクト文書は状態・待ち・次の入口を示し、同じタスク本文を複数の正本へ置かない。
9. 一般PJの確定成果物は `outputs/`、旧版・backup・superseded文書は `archive/` に置く。フル運用でファイルを移動・追加・削除したときは、同じ操作で `AGENTS.md` の索引と関連リンクを更新する。最新版を判断できない場合は移動せず確認する。
10. 開発PJは既存の `build` と `yasashii-harness` 導線を維持する。別repo化は作成・接続・公開範囲を確認した後だけ行い、workspace側には `AGENTS.md` と概要スナップショットの `PROJECT.md` を参照ポインタとして置く。正本repoの仕様、判断ログ、進行状態、成果物を二重管理しない。
11. 一般PJを外部repoへ黙って分離せず、別repo開発PJの正本を `secretary/projects/` へ黙って複製しない。正本がどこかを各PJの `PROJECT.md` で一意に示す。
12. 一般PJの完了・再開はユーザー確認後だけ行う。完了は `status: completed`、再開は `status: active` とし、確認前・拒否・失敗ではPROJECT、journal、commitを変更しない。status欠落をcompletedと推定しない。
13. 完了時は完了日・結果・残件を `PROJECT.md` に残し、進行中一覧から外すが、検索・timeline・明示参照から除外せず、ディレクトリを自動移動・削除しない。再開時も過去の完了記録を削除・上書きしない。

## 10. 配布チャネルからの独立

1. 主対象はClaude Codeを使う非エンジニア一般とし、特定の講座・期・教材への参加経験、年齢層、そこでGit / GitHubを学んだことを利用前提にしない。
2. README、公開ガイド、配布物、project guidance、現行spec、現行Sprint契約を対象に、旧配布チャネル固有の名称、英字表記、期数、学習段階、教材導線、その参加者向けとする見出し・説明を残さない。
3. 過去の `docs/progress/`、`docs/feedback/`、対応する評価証跡、Git commitは監査記録として改変しない。これらは現在の製品説明の検査対象から除外し、新しく作るprogress／feedbackには旧配布チャネル固有表現を書かない。
4. 一般化は文章の意味を薄めず、一般の非エンジニアがREADMEと配布物だけで導入・利用を始められる状態を保つ。
5. MIT表記、Shin-sibainu/cc-companyの単段クレジット、`forkedFrom`、配布識別子は削除・変更しない。元リポジトリからの独立実装化やGit履歴書換えも行わない。
6. 文言整理を理由に機能、既存の安全境界、Chatwork、プロジェクト管理、ハーネス参照導線、回帰assertを弱めない。
7. 正本の書き手を越境しない。Plannerはspec・Sprint契約とPlanner文書、Generatorは実装・公開文書・Generator文書、EvaluatorはEvaluator文書、オーケストレーターはstateをそれぞれ扱う。

## 11. 更新の安全境界

1. marketplaceとplugin manifestのversionは同一でなければならず、不一致の配布を機械検査で拒否する。利用者向けCHANGELOGの対象版も同じversionと整合させる。
2. 更新診断と更新実行を分ける。「最新版にして」の最初の応答では現在版、最新版、変更点、影響、必要操作、カスタマイズ衝突可能性を説明するだけとし、plugin、workspace、Git、設定へ副作用を出さない。
3. 読み取り専用診断ではplugin更新、workspace書込み、migration、commit、push、reload／restartの実行、設定変更を0件とする。自動更新は案内だけとし、利用者の設定を変更しない。
4. 実更新はF30の説明後にユーザーが明示了承した場合だけ行う。了承前、拒否、キャンセル、説明不能、影響判定不能では変更しない。
5. 更新直前の保護はpushを伴わないローカルcommitとする。commitの対象と結果を示し、secretや資格情報らしきファイルを含めない。commitを安全に作れない場合は更新を止める。
6. 管理対象ファイルが配布時の基準hashから変わっている場合は、ファイルごとに選択を求め、既定を「現状を残す」とする。無応答を上書き同意とみなさず、一括置換を既定にしない。
7. 最小台帳が保持できるのは管理対象path、配布版、配布時の基準hash、明示的に許可した非機密のテンプレート変数だけ。私的内容になり得る変数値は保存せず、ファイル本文、差分本文、記憶、会話、外部データ、Chatwork／Google Chat本文、API Token、OAuth token、password、secret、資格情報も保存しない。
8. migrationは対象versionと予定変更をdry-runで示し、明示確認後だけ実行する。同じversionのmigrationを複数回実行しても追加変更が出ない冪等性を必須とし、実行済み状態を安全に判定する。
9. 台帳無し0.2.0は正常な既存利用者として扱う。現状ファイルを未変更とも全変更とも決めつけず、上書きしない側へ倒したbootstrap判定を行う。
10. 更新後はversion、管理対象ファイル、主要導線を検証し、失敗を成功と報告しない。失敗時は更新直前commitを基準にrollbackできる手順と影響を示す。
11. 更新に伴うpushは自動で行わない。private workspace、記憶保護、一般PJ／別repo開発PJ、Chatwork／Google Chatのsecret・同期同意、配布チャネル非依存の境界を変更理由で緩めない。
12. Google Chat、OAuth、Google Chat同期、Google Chat設定画面はF30/F31の対象外とし、更新導線へ混在させない。

## 12. Google Chat OAuth・同期境界

1. 各利用組織が所有するGoogle Cloudプロジェクトを使い、同じGoogle Workspace組織の利用者だけを対象にOAuth Audienceを `Internal` とする。ShigApps共通の `External` OAuth app、サービスアカウント、Domain-Wide Delegationへ自動的に切り替えない。
2. OAuth Clientは `Desktop app` とし、利用者本人によるユーザーOAuth、PKCE、state検証、loopbackのローカル受付を使う。外部公開callback serverや常設Webアプリを作らない。認可コードは受領直後にtokenへ交換し、記録しない。
3. 必須scopeは `https://www.googleapis.com/auth/chat.spaces.readonly`、`https://www.googleapis.com/auth/chat.messages.readonly`、発言者表示名補完用の `https://www.googleapis.com/auth/contacts.readonly` の3つだけ。未使用のChat scope、write scope、管理者scopeを要求しない。People APIで一部の同僚表示名を取得できない可能性をREADMEで説明し、取得不能時は安定した代替表示にして、追加scopeへ黙って拡張しない。
4. 厳格secretはclient secret、認可コード、access token、refresh token、OAuth client JSON全文であり、tracked file、設定、Git差分・履歴、ログ、会話、journal、fixture、スクリーンショット、評価証跡、再読込後も残るDOMへ表示・保存しない。client IDは識別子として、一時的なOAuth認可リクエストURLと管理者向けチェックリストには表示できるが、同じ永続物へ保存しない。
5. 一時的なOAuth認可リクエストURLとloopback callback URLは漏えいゼロ検査の対象外だが、URL自体をログ、スクリーンショット、評価証跡へ記録しない。callbackの認可コードは即時交換し、エラー表示にも含めない。
6. `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`、`GOOGLE_OAUTH_REFRESH_TOKEN_GCHAT` の値はRepository Secretを継続取得の正本とする。OAuth client JSONはローカル設定中だけ読み、通常導線では厳格secretを表示・コピーさせずRepository Secretへ直接登録する。登録できない場合は値を会話へ貼らせず、安全に停止して管理者向けの不足事項を示す。
7. 初回取得はOAuth完了直後の同じwizardセッションで、メモリ上のtokenだけを使ってローカル実行する。tokenはセッション終了時に破棄し、以後の取得はGitHub Actionsが担う。初回取得結果の保存とGitのcommit・pushは、実行前の確認画面で明示同意を得た場合だけ行う。
8. 同期対象は利用者が選択した `spaceType=SPACE` だけ。`DIRECT_MESSAGE`、`GROUP_CHAT`、未選択スペース、全スペース自動選択を禁止する。候補表示時だけでなく初回・継続取得の実行時にもspace typeを再確認し、不正な設定値では取得しない。
9. Google Chatは読取専用。メッセージ、reaction、space、membershipの作成・更新・削除を行わない。添付ファイルは名前、種類、参照先等のメタデータだけを保存し、本文をダウンロードしない。
10. 初回はAPIと組織の保持設定が返せる範囲を取得し、0件を正常として扱う。取得不能な過去履歴を「存在しない」と断定せず、保持設定、権限、未選択、検索条件の可能性を示す。
11. message resource name単位で冪等に統合し、再取得で重複・同日既存投稿の消失を起こさない。編集・削除の反映は、その取得実行でAPIが返した範囲に限る。`createTime` 差分の範囲外にある過去メッセージの編集・削除が反映されないことを正常仕様として説明し、削除済み本文を復元せず、API応答から消えたことだけを理由に保存済み履歴を削除しない。
12. scheduleによるcommit・pushは、選択スペース、間隔、保存内容、共同編集者への可視性を示した後の明示同意でだけ許可する。既定推奨・初期値はChatworkと同じ3時間ごとで、手動のみを選べる。
13. public配布repoにはGoogle ChatのSecret、workflow、スペース設定、同期状態、履歴を置かない。実APIは専用private test workspaceと非機密test spaceでだけ評価し、ユーザー許可前にCloud project作成、Secret設定、OAuth認可、workflow dispatch、API送信、pushを行わない。
14. OAuth後のキャンセルとlive gate後始末では、schedule停止、Google Chat用Secret削除、test space選択解除に加えて、Google側のOAuth grant／tokenをrevokeする。アプリ権限ページからの取消手順を示し、取得履歴やtest workspaceの削除は別の明示確認を必要とする。
15. Google Cloud準備はGoogle Chat skillの会話が担当する。local wizardとREADMEへCloud準備の説明画像を置かず、wizardは接続用JSON選択から始める。READMEはAIへ設定を依頼する入口と、AIを使わず進める場合の公式リンクを持つが、同じ長い手順をwizardへ重複させない。
16. Google ChatはGoogle WorkspaceのGoogle Chatだけを正式サポートする。OAuth Audienceは `Internal` に固定し、無料の個人Googleアカウント、`External`、Test users、公開審査へ分岐・fallbackしない。利用者向けREADME、skill会話、wizardに個人アカウント向け説明を出さない。
17. Cloud projectのProject表示名は、Git repo rootのディレクトリ名へ `-google-chat` を付けた値とする。Project IDの初期案も同じ値とし、Googleの命名制約または全体重複で使えない場合だけ調整する。調整後を含む表示名、Project ID、Google Workspace組織、API、Billing非接続を作成前に示し、明示確認を得る。Git repo rootを確認できない場合はprojectを作らない。
18. `gcloud`はGoogle公式の管理ツールで、インストール自体に料金は発生しないと案内できる。ただしCloud設定を変更できるため、インストール内容と実行予定を先に示し、利用者の明示承認後だけ導入・変更を行う。Billing Accountを自動接続せず、有料サービスを勝手に有効化しない。`gcloud`を導入できない、利用者が断る、権限がない場合は直接リンクの手動支援へ切り替え、行き止まりにしない。
19. CLIでproject作成とGoogle Chat API／People API有効化を行う前に、ログイン中のアカウント、利用可能な組織、対象project、権限を確認する。未ログイン、複数組織、権限不足、Project ID衝突、CLI途中失敗を推測で越えず、完了済み工程と未完了工程を分けて表示する。同じ操作を無条件に繰り返さない。
20. Google画面で必要な `Internal` Audience、`Desktop app`、接続用JSON取得は、Project IDを指定した公式の直接リンク、押す場所、完了条件を一画面一操作で案内し、利用者の「できました」を受けて次へ進む。Browser Use、Chrome拡張機能、特定ブラウザを必須にしない。手動工程が中断しても、厳格secretを保存せず、repo、Project案、組織、完了工程、次の工程だけで再開できる。

### Google公式情報の確認基準（2026年7月）

- Google Cloud CLI install: `https://cloud.google.com/sdk/docs/install`
- `gcloud projects create`: `https://cloud.google.com/sdk/gcloud/reference/projects/create`
- `gcloud services enable`: `https://cloud.google.com/sdk/gcloud/reference/services/enable`
- Google Cloud project management: `https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects`
- Google Chat authentication: `https://developers.google.com/workspace/chat/authenticate-authorize`
- User OAuth setup: `https://developers.google.com/workspace/chat/authenticate-authorize-chat-user`
- OAuth consent and scope categories: `https://developers.google.com/workspace/guides/configure-oauth-consent`
- Restricted scope verification and internal-use exception: `https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification`
- Desktop app loopback OAuth: `https://developers.google.com/identity/protocols/oauth2/native-app`
- Spaces list and space types: `https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/list`
- Messages list: `https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list`
- Attachment metadata: `https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages.attachments`

公開ガイドには「公式情報は2026年7月確認。Google側の画面・scope分類・管理者設定は変更される可能性がある」と明記する。

## 13. チャット設定wizardの文章境界

1. Chatwork／Google Chatの主導線は、画面冒頭に「今すること」を1文で示す。1画面で求める判断は1つ、1段落の要点は1つとし、複数の準備・判断・安全同意を一段落へ詰め込まない。
2. 主説明には、その場の判断に不要な内部用語を並べない。`wizard`、`workflow`、`commit`、`push`、`Repository Secret`、`loopback`、`runtime`、`scope`、`token`、`OAuth client JSON`、Sprint番号は、コード・設定key・正式名称が必要な箇所を除きprimary pathの見出し・本文・CTAから外す。
3. API、OAuth、Google Cloud、GitHub Actions等の正式名称は完全に削除しない。利用者が判断に必要なときは初出で短い役割説明を添え、それ以外は閉じた「詳しい説明」または「管理者向け」へ移す。詳細を開かなくても主導線を完了できなければならない。開閉部は山形アイコン等で開くことが見た目から分かり、開閉状態、keyboard操作、visible focus、accessible nameを備える。
4. 安全同意は簡略化を理由に削らない。読む対象、保存先が非公開のGitHubリポジトリであること、共同編集者にも本文が見えること、自動取得・自動保存の有無、選択解除や手動のみでも取得済み履歴を削除しないことを、確認画面で意味ごとに短く分けて示す。
5. CTAは次に起きることが分かる短い動詞句にする。「次へ」「実行」「Submit」のように結果が分からない語だけにせず、「接続を確認する」「保存内容を確認する」「この設定で始める」のように対象または結果を含める。1画面のCTAは既存どおり最大2つとする。
6. 失敗表示は「何が起きたか」→「次にすること」の順で、primary pathでは最大2段落にする。生の英語エラー、エラーコード、内部状態は主説明より後ろへ置く。完了表示は「確認できた結果」と「次の一手」だけを主表示にする。
7. 不自然な直訳、英語と日本語の不用意な混在、主語不足、同じ意味の二重表現を残さない。サービス名、正式なAPI名、設定値等の検索に必要な語を残す場合も、文章全体は自然な日本語にする。
8. 簡潔化しても、Chatwork `#F03747`、Google Chat `#11BB62` のprimary CTA、前景 `#000000`、3時間推奨・初期値、Google Chatのread-only、`SPACE`限定、DM／グループDM除外、private workspace、明示同意、secret非露出の境界を変更しない。
9. 「選択0件」と「手動のみ」は、今後の自動取得が止まることと、取得済み履歴を削除しないことを自然な日本語で分けて示す。機能上の停止・履歴保持・0件処理の不具合修正は、文章整理と混ぜず対象Sprintへ戻す。
10. 全画面の見出し、本文、help、details、label、CTA、empty／loading／error／success copyをinventory化し、画面・状態・対象サービス・主導線／技術詳細・必須意味要素を追跡できるようにする。未棚卸しの可視文言を残したまま合格にしない。
11. Google Chatの初回設定はChatworkと同じ一体型フローにする。スペース選択→間隔選択→保存内容・共同編集者可視性・自動取得・commit／pushの明示同意→`この設定で始める`→初回取り込みと自動取得設定→`設定を終了する` の順とし、確定後に別の自動取得CTA、スペース／間隔の再選択、追加の設定変更フローを出さない。手動のみでも初回取り込みは行い、scheduleは作らない。
12. 初回取り込みとschedule設定の結果が分かれ得る場合は、完了した処理と未完了の処理、次にすることを別々に表示し、全体を成功と誤認させない。既存の確認前0変更、安全なtransaction／rollback、secret非露出の境界を緩めない。後日の通常の設定変更導線は維持する。
13. Cloud準備の会話とlocal wizardを分ける。skill会話はJSON取得までを担当し、JSON取得を確認してからwizardを起動する。wizardはJSON選択→OAuth許可→通常スペース選択へ進み、Cloud project作成・API有効化・Audience・OAuth Client作成の画像や重複説明を表示しない。
14. OAuth許可はJSON確認後の明示ボタンで別タブに開く。元wizardの状態確認、ポップアップ拒否、タブ閉鎖、同意拒否、再試行、許可後の自動SPACE選択というSprint 019の合格動作を維持する。OAuth画面をJSON選択だけで勝手に開かない。

## 14. 公開済み0.7.0／0.8.0と現在candidateの配布安全境界

1. 2026-07-18の公開判断では公開版を `0.7.0` とし、marketplace、plugin manifest、CHANGELOG、更新診断、最小台帳、migration、公開ガイドの版を一致させた。これは公開済みreleaseの歴史的な不変条件であり、`0.6.0`のまま監査対応を大幅追加して配布しない。
2. 初回publish、チャット設定、記憶commit、更新等のGit操作は、その操作が所有するpathだけをstage・commitする。操作開始前からstage済みの変更、別サービス、一般PJ、repo rootの無関係ファイルをcommitへ混ぜず、既存indexを勝手にunstage・上書き・削除しない。
3. 初回publishのように複数領域を初期化する場合も、commit候補のinventoryを明示的に確定してから全候補をsecret検査する。製品が生成・管理するworkflow／config／historyと初回publish inventoryでは、Google OAuth client JSON、client secret、認可コード、access／refresh token、Chatwork API Token、private key／秘密鍵、credential URL、known token field、通常のliteral assignment等の合理的な誤混入が1件でもあればcommit・push前に停止する。検査後に候補が変われば再検査する。
4. OAuth／Chatwork資格情報の正本は、現在のprivate repoのRepository Secretとする。サービスごとの登録境界を混同しない。
   - Google Chatの厳格secretはlocal wizard sessionのmemory内だけで受け渡し、`gh` のstdin経由でRepository Secretへ直接登録する。登録失敗時も値をコピー／貼り付けさせず安全に停止する。
   - Chatwork API Tokenはwizardが自動取得・受領・登録しない。F24の既存導線どおり、利用者本人がChatwork公式画面で取得し、GitHubのRepository Secret画面へ `CHATWORK_API_TOKEN` として直接入力する。Tokenをwizard、AI会話、repo本文、ログ、journal、fixture出力、スクリーンショット、評価証跡、製品側DOMへ入力・貼り付けさせない。
   - 両サービスとも、通常フローのrepo本文、Git差分・履歴、ログ、journal、fixture出力、スクリーンショット、評価証跡、再読込後も残る製品側DOM、会話に実値を出さない。
   - commit前scannerはこの通常フローを代替する安全境界ではなく、合理的な誤混入を止めるdefense-in-depthである。万能secret detectorまたは任意言語の完全parserと表示しない。
   - `${{ secrets.NAME }}`、定義済みの環境変数参照等の製品が生成する正規のruntime参照は許可する。通常文書と合理的な非機密metadataを、文字列がtoken風であるという理由だけで拒否しない。
   - 利用者がローカル／private repoの任意のJS／TS／shell／JSONを意図的に特殊構文・難読化・computed／escaped key・偽placeholderへ改変してscannerを回避するケースの完全検出は非ゴールとする。この非ゴールは、製品管理対象と通常フローの非露出保証を緩めない。
5. 書込み・作成・移動の許可境界は、現在ユーザーが確認して開いているworking rootごとに定める。既存／未作成を問わず対象までの実体境界を副作用前に確認し、秘書workspaceから外部repoを指すsymlink越しの書込みを拒否する。別repo開発PJを確認後、そのrepo自身をworking rootとして開いた場合はrepo内の正常な書込みを許可する。symlink自体の削除は参照先へ追従せずlinkだけを対象にし、参照先本体を削除・変更しない。
6. `git`、`gh`、`claude`、`gcloud`等の外部CLIと外部HTTPは、有限のtimeoutと明確な失敗状態を持つ。timeout後にcommit、push、pull、検索、削除、成功表示へ進まず、子process・待機sessionを残さない。
7. loopback wizardは `127.0.0.1`／localhostのloopback以外へbindしない。状態変更requestは同じsessionの正しいorigin、正しいContent-Type、推測困難なsession確認値を必須とし、cross-origin、確認値なし／不一致、JSON以外の送信を副作用0件で拒否する。状態変更をGETで行わない。
8. OAuth callbackは1つの認証sessionで一度だけ処理する。再送、同時再入、完了後の再アクセスでtoken交換、Repository Secret登録、初回取得を重複させない。callbackとsession確認値をURL、ログ、DOM、証跡へ残さない。
9. OAuth grant／token取消、Repository Secret削除、schedule停止、対象選択解除の失敗を無視しない。1件でも未完了なら `cleanup-required` とし、成功または配布可能と表示しない。
10. Google Chat本文・表示名・添付メタデータは非信頼入力として扱う。内部Markdown marker、HTML comment、見出し、区切り線と同じ文字列が含まれても保存構造として解釈せず、既存・後続の履歴を欠落・結合・上書きしない。
11. GitHub Actionsの結果は今回のdispatchと因果関係を確認できるrunだけを採用する。dispatch前、別workflow／branch、作成時刻欠落・不正、識別不能なrunを成功候補にせず、対応runを確認できなければtimeoutまたは未確認として停止する。
12. `0.6.0`から `0.7.0`への更新は、診断、明示確認、pushなし保護地点、dry-run、更新、検証、rollbackを一続きで持つ。migrationは冪等、カスタマイズ・記憶・PJ・チャット・secretは既定で保持する。
13. rollbackはworkspaceとpluginを別の対象として扱い、両方を更新前状態へ戻す。pluginを自動復元できない環境では、旧版 `0.6.0`、対象scope、実行手順、復元確認をその場で実施できる形で示し、単なる問い合わせ案内で終わらせない。
14. Claude plugin／marketplace validatorは必須author情報、MIT、単段クレジット、`forkedFrom`、name／source／version整合を検査し、欠落・不正・不一致を拒否する。
15. master offline suiteは受入済みの必要suiteを実行し、少なくともSprint 015とSprint 020 Patch 002を含む。存在確認だけ、子suite未実行、失敗の握りつぶしを禁止する。
16. 配布検査はGit checkoutと `.git`がないGit archive相当の両方で成立する。Git履歴が必要な検査はcheckout専用と明示し、archiveで実行可能なmanifest、参照、配布ファイル、secret、version検査を `.git`不在だけで失敗させない。
17. wizardの画面遷移・非同期結果後は新しい見出しまたは主領域へfocusを移す。入力中の再描画では利用者のfocusを奪わず、主要なbutton、link、summary、checkbox／radioは44px相当以上の操作領域を持つ。
18. `.mcp.json`、onboarding、README、公開ガイドは `0.7.0`の現行機能と一致させる。古い「後続対応予定」、古いversion、既に置き換えた導線を現行説明へ残さない。
19. `0.7.0`の配布合格には、F36〜F42の回帰、master offline／online、Git archive相当の検査、専用private test workspaceのChatwork／Google Chat live gateがすべて必要である。片方のサービス、合成fixture、過去run、過去版の成功で代替しない。
20. live gate完了後は両チャットschedule、全Repository Secret、room／space選択、Google OAuth grant／tokenが残っていないことを確認する。後始末未完了は不合格。履歴またはtest workspaceの削除は別の明示確認を必要とする。
21. 1〜20は公開済み `0.7.0` で確定した不変条件として維持する。公開済み `0.7.0` のmanifest、migration、fixture、評価記録、Git履歴を `0.8.0` 前提へ書き換えず、同一versionのまま配布物を差し替えない。
22. 当時まだ利用者へ明示配布していなかった2 editionの最初のrelease candidate／latestは `0.8.0` とし、marketplace、plugin manifest、正本CHANGELOG、edition設定、README／公開ガイドの候補versionを一致させた。この条件は `v0.8.0` の公開履歴として保持し、現在candidateへ読み替えない。
23. 旧 `plugins/yasashii-secretary/CHANGELOG.md` はredirectではないraw CHANGELOG互換fileとして残し、新しい正本とbyte-for-byteで一致させる。過去entryを書き換えず、未検証の旧0.7.0 live update成功を説明しない。
24. 更新可能とするのは候補versionが導入済みversionよりsemver上で新しい場合だけとする。同一versionとdowngradeはplugin、workspace、Git、設定、ledger、migrationへ副作用0件で停止する。same-version bootstrap bridge、別配布物による橋渡し、公開済み `0.7.0` のin-place差替えを作らない。
25. 0.8.0は新規または未導入状態から導入でき、正本plugin path、neutral marker、edition付きledger、主要skillを整合させる。旧0.7.0 updaterのscanner停止は既知blockerとして保持し、対応済み・live互換PASS・配布保証のいずれにも数えない。
26. 旧0.7.0利用者向けexternal recovery／bootstrapは作らない。旧scannerで止まる標準生成fileのfixture削除、既知pathの広い除外、secret scan弱体化、公開済みartifactの改変で合格を作らない。
27. `0.8.0` release candidateのidentityは配布対象bytesで固定する。checkout専用のGit履歴・監査evidence検査と、`.git`／監査evidenceを含まないarchive配布検査は役割を分ける。checkout専用入力をarchiveへ混ぜず、どちらか一方の合格で全体を代替しない。
28. 旧 `0.6.0 → 0.7.0` と調査済み `0.7.0 → 0.8.0` のmigration、fixture、受入記録は歴史的回帰として期待値を変更せず保持する。未実施live gateを合格として追加しない。
29. 現在の公開済み最高版は、manifest、CHANGELOG先頭、公開tagが一致する `0.8.0` とする。Sprint 038は後方互換な利用者向け機能追加であり、Semantic Versioningのminor更新を1回適用した `0.9.0` を現在candidateとして一意に使う。解決入力が一致しない場合はversionを推測せずreleaseを停止する。
30. Sprint 038が所有するversion変更は、現在candidateを指すmarketplace、Claude／Codex manifest、正本／legacy CHANGELOGの新entry、edition metadata、公開ガイド、current release gateの期待値である。`0.7.0`／`0.8.0` のmanifest snapshot、migration、fixture、tag、progress、feedback、履歴assertは変更しない。
31. version gateは「履歴回帰」と「現在candidate整合」を別結果で表示する。履歴回帰は0.7.0／0.8.0の既存期待値、現在candidate整合は0.9.0のmanifest／CHANGELOG／配布先／artifact identityを検査し、一方のPASSで他方を代替しない。
32. 現在candidateの同一版 `0.9.0 → 0.9.0` とdowngradeは副作用0件で停止する。過去の `0.8.0 → 0.8.0`／downgrade fixtureは履歴回帰として別に保持する。
33. release確認は配布系統別に行う。public upstream `agentic-secretary`、private downstream `agentic-secretary-my-vault`、public downstream `yasashii-secretary` ごとに、source SHA、version、destination、artifact、rollback、再インストール／cache更新の要否を列挙し、未許可の系統へ横展開しない。
34. `0.9.0` はSprint 038で公開済みの履歴として保護する。Harness互換参照だけを更新する後方互換なpatchは `0.9.1` を当時のcandidateとし、`0.9.0` のtag、artifact、progress、feedback、履歴assertを書き換えない。
35. Harness互換性の正本はedition metadataのversion、repository、検査済みfull commit、host別導入IDとする。build導線、README、回帰、online検査はそれと一致させ、network unavailable、commit不一致、manifest version不一致をPASSにしない。
36. SecretaryはHarness本体、Harnessのagent定義、model routing、custom agent生成ロジックを同梱・複製・暗黙installしない。private版、installed cache、利用者workspaceは系統別の明示許可なしに更新しない。
37. `0.9.1` はAgentic／Yasashiiで公開済みの履歴として保護する。Windowsの記録・保存互換を直す後方互換patchは `0.9.2` を現在candidateとし、`0.7.0`〜`0.9.1` のtag、artifact、migration、fixture、Sprint記録、履歴assertを書き換えない。
38. `0.9.2` と、秘書identity機能を追加した `0.10.0` は3版で公開済みの履歴として保護する。既存workspaceのidentity完全移行を直す後方互換patchは `0.10.1` を現在candidateとし、Agentic→Yasashii／private固定handoff→3版独立PASS→release／Mac mini同期の順序を守る。

## 15. 2 editionとprivate downstream境界

1. `agentic-secretary` は下流と別のlocal checkoutかつ `mtaiseeei/agentic-secretary` の別GitHub repoとする。`yasashii-secretary` 内のmonorepo／subdirectoryにしない。
2. `agentic-secretary` は上流、`yasashii-secretary` は下流とし、下流の `upstream` remoteはfetch専用・push無効とする。両者はneutralization commitまでのGit履歴と共通祖先を持つ。
3. 別directory／repo作成、remote追加・変更、push、公開、release、実plugin install／updateは、該当Sprintのexternal gateで操作ごとのユーザー明示許可を再確認する。
4. 内部plugin pathは両editionで `plugins/secretary/`。外部plugin ID、marketplace名、repository／homepageはedition別とする。
5. workspace `secretary/`、skill／command名、migration filename、OAuth scope、Chatwork／Google Chat wizardとそのcopy、安全・証拠ruleは共通とする。
6. edition差分は会話、診断、報告、developer handoffに限定する。やさしさoverlayから安全rule、証拠要件、wizard動作を上書きしない。
7. 新規workspaceはneutral markerとedition値を使う。legacy yasashii markerを認識し、反対edition、混在、判定不能は副作用0件で停止する。別editionのledger／marker／履歴を移動・統合・削除・上書きしない。
8. 旧 `plugins/yasashii-secretary/CHANGELOG.md` はraw CHANGELOGの長期互換fileとして、新しい正本とbyte-for-byte一致させる。不一致、過去entry改変、equal／downgradeの副作用、same-version bridge、旧blockerを解消済みとする誤表示は公開不合格とする。
9. 新規生成bot名の第一候補は `secretary[bot]`。既存workspaceのbot名やworkflowは強制改名しない。
10. LICENSEとShin-sibainu/cc-company単段クレジットを両editionで保持する。`forkedFrom` は公式validatorまたはlive gateの証拠なしに推測変更しない。
11. yasashii overlayは共通plugin、共通安全回帰、必要な互換／release checkだけを対象とする。spec、Sprint、progress、feedback、evidenceは各repoが所有し、同期しない。
12. 呼び方変更transactionのjournal本文とGit commit subjectは変更項目だけの固定表現とし、確認済みの呼び方、他の設定値、値の一部、値から導いた表現を再掲しない。この安全境界はedition差分にせず、両editionでbyte同一の共通処理として維持する。
13. `agentic-secretary-my-vault` は第3の公開editionではなく、`agentic-secretary` 共通coreを取り込むprivate downstreamである。my-vault固有のTaskDB・vault正本・private値をpublic upstreamやyasashiiへ逆流させない。
14. 3配布系統を同期するときも、各repoのspec、Sprint、progress、feedback、evidence、README、release判断を上書きしない。共通caseの意味と安全境界を揃え、版固有copy・metadata・private機能を保護する。
15. 共通coreのintent分類、response state、内容依存応答、安全境界はpublic upstreamが所有する。`task-triage`、`notion-tasks`、`vault-search`、`vault-documents` 等のmy-vault固有SkillとNotion routingはprivate repoが所有し、public upstreamへ複製しない。
16. private所有変更は同じSprint 038契約を継承したprivate側の作業単位で行うが、Generator／Evaluator中は実downstreamではなく隔離candidateだけを変更する。共通candidate SHA、private base SHA、対象pathを固定し、独立Evaluator PASS後かつ配布系統別の明示確認後だけ実downstreamへfast-forward相当で反映し、再インストールする。
17. 共通parity caseは保存先・正本ルールまで同じcaseに限る。Notion TaskDB routing等はedition固有caseとし、共通比較はintentと確認・Secret・外部状態等の安全境界に限定する。保存先とresponse stateは各editionの正本に従う。
18. 3版handoffは、builderが下流candidateについて直接copy、adapt、read、execute、保護digest照合する全pathをmanifestへ役割別に宣言する。宣言集合、builderの実アクセス／変更集合、固定baseからの実candidate差分は実行時に機械算出し、重複、未分類、builder変更pathの未収載、利用実績のない宣言、stale pathを0件とする。件数を手入力した期待値へ固定せず、candidate identityはsorted relative path、mode、実bytesから版別に再計算する。

## 16. ホスト対応・検証表示と実会話回帰の安全境界

1. 正式な必須対象環境は Claude Code Desktop App、Claude Code CLI、Codex App、Codex CLI の4つとする（正本: `editions.md`）。その他のコーディングエージェントは設計対象だが、公式受入対象・配布保証・実環境検証必須対象ではない。
2. 共通本体（安全性、会話ルール、wizard、OAuth scope、同期境界、fixture・validator等）はホスト非依存の1実装とし、ホストごとに複製・二重実装しない。ホスト固有はmanifest・導入・更新・plugin root・command・実会話runner等のadapterに限る。
3. 対応対象ホストと検証済みホストは常に別集計する。1ホストのPASSを他ホストのPASSへ昇格・流用せず、未検証環境を「対応済み」と表示しない。未実行ホストは `unverified` と明示する。
4. 実会話テストの証跡には、host名、runner名、実行面（CLI／App等）を必ず記録する。Claude Code上の結果は「Claude Code実行面の証拠」に限定して表現する。
5. 共通会話validator・共通fixtureは特定ホストの応答形式・専用commandを前提にしない。共通rulesへホスト固有commandを新規追加しない。ホスト固有の起動方法はrunnerの責務とする。
6. 実会話runnerの子プロセスenvはallowlist方式とし、`process.env` 全体を複製せず、認証情報・APIキー・token・secret類を渡さない。子セッションへは各scenarioに必要な最小ツールだけを許可し、原則Bashを許可しない。
7. 実会話runnerの読み取り拒否・境界テストは一時workspace内の管理対象fixtureだけで行い、`/System` やuser home等のworkspace外パスを対象にしない。封じ込めはcwd・TMPDIRの誘導や許可ツールの絞り込みだけでは成立せず、合成HOME（実HOME非透過）、plugin本体のread-only参照、OS sandboxまたはホスト保証のpath-scoped permissionによる書込み先限定を必須とし、制御されたworkspace外canaryへの書き込みが実際に拒否されることを実証する。canary拒否を実証できない構成ではWrite/Editを使うscenarioを自動実行しない。無限定の「workspace外変更0件」という主張はせず、検査対象を列挙した範囲限定の表現だけを用いる。
8. 実会話runnerは成功・失敗を問わず一時workspaceをcleanupし、証跡は秘密情報を含まないサニタイズ済み構造化結果だけとする。安全な環境を用意できない項目は `unverified` と記録し、安全条件を弱めてPASSにしない。
9. 会話回帰の合否判定は共通契約を正本とし、`intent × side effect × response state` と意味保存で判定する。固定3項目、固定prefix、自然文のbyte一致、質問禁止、行数だけを合格条件にしない。複数要素を圧縮した改行なし平文、実状態と異なる応答、意味の欠落・追加は不合格にする。
10. 公式仕様の裏づけがないホスト機構を推測実装しない。公式ドキュメント・正式schemaで確認できない事項は `unverified` として記録する。
11. 実会話出力の回帰確認は、offline回帰・構文チェック・master gateから分離した明示的なlive conversation gateとして扱い、未実行・未認証・隔離未実証は「未完了（incomplete）」として集計・表示する。offline検証の合格・runnerの構文チェックを実会話の回帰保証として数えない。「解消済み」「回帰保証」という主張は実際に実行された検証に限定する。過去のfeedback・progress・stateの記述は遡って書き換えず、訂正は新しい記録で行う。

## 17. 全ユーザー会話の可読性

1. 両editionの会話、診断、確認、進行、成功、部分失敗、エラー、検索結果、更新、プロジェクト、接続案内、developer handoffは、複数要素を改行なしの平文へ連結しない。
2. 1要点だけの短い内容は1段落でよい。複数の手順、選択肢、変更点、結果、原因、影響、次の行動は、空行で分けた段落またはMarkdown箇条書きで構造化する。
3. 1文ごとのbullet、不要な見出し、同じ内容の重複、装飾目的のMarkdownは避ける。可読性のための改行を、冗長化や情報追加の理由にしない。
4. 改行の有無をユーザーへ質問せず、preferencesへ設定項目を追加しない。口調、専門用語、報告詳しさを変更しても、この最低基準は無効にできない。
5. 「改行しない」「1行にまとめる」「平文で返す」「箇条書きを使わない」等のユーザー向け指示を配布rules、skills、templates、commands、edition copy、handoffに残さない。内部record、commit message、index、machine-readable出力の1行契約は対象外として区別する。
6. agenticは結論・正式名称・証拠を早めに、yasashiiは何が起きたか・影響・次にすることを先に示す。可読性の共通化を理由に、思想・対象・4つのedition差分を同一化しない。

## 18. Skill metadataとvalidatorの責務分離

1. `SKILL.md` の発火条件は正式なSkill schemaに従って `description` へ記載する。正式schemaにない独自frontmatter fieldを、特定hostで偶然動くことを理由に配布正本へ残さない。
2. generic Skill validatorは各Skillのfrontmatter構文、許可field、必須field、name規則、description規則を検査する。対象Skillの除外、validatorの許可field追加、失敗の握りつぶしで合格を作らない。
3. formal Codex plugin validatorはmarketplace／plugin manifest、plugin identity、version、Skill roster、sourceからcacheへの導入整合を検査する。generic Skill validatorの合格をformal配布検査の代わりにせず、formal配布検査の合格を個別Skill frontmatter検査の代わりにしない。
4. generic validatorがPyYAML等のvalidator自身の依存不足で起動できない場合は、Skill不合格または合格へ読み替えず `dependency-unavailable`／`incomplete` として明示する。既存の正式runtimeまたは明示された依存pathを使える場合だけ実検査を行い、plugin runtimeへ検証専用依存を追加しない。
5. public upstream所有のSkillはpublic repoで修正する。private downstream、installed cache、利用者workspaceを正本として直接修正せず、下流反映と再インストールは実装・独立評価後の別操作として扱う。

## 19. 利用者中立の配布境界

1. 配布物と現行製品正本は、特定利用者・保守者の個人名、利用者端末固有の絶対path、私用workspaceを実行条件・参照元・fallbackにしない。
2. 人物を必要とするtest fixtureは、実在利用者を示さない合成人物名を使う。過去のprogress、feedback、evidence、Sprint契約、state、proposal等の監査・判断履歴は改変対象にせず、active surface scanの対象外pathとして明示する。
3. allowlistは値と許可pathを列挙する。MITの著作権表示、GitHub owner `mtaiseeei`、公式repository URL、`forkedFrom`、公開版の正式な製品識別子は削除しない。
4. 絶対path自体が必要なruntime検証は、placeholder、合成path、実行時に解決したpathを使う。特定端末の実pathを製品既定へhard-codeしない。
5. downstream repo、installed cache、利用者workspace、remote、release、外部サービスは本変更の書込み対象にしない。

## 20. 人間らしい会話と副作用の確認境界

1. 操作、対象、行き先が明示され、残る危険が小さい依頼は、その発話自体をauthorizationとして同じターンで実行する。同じ内容の復唱、別ターン停止、二重承認を安全性の代用にしない。
2. 秘書が保存・プロジェクト化・設定変更等を自発提案する場合は、対象と操作が分かる質問を出す。対象、日付、行き先、参照先が曖昧な場合は、不足する一点だけを質問する。宣言文だけを返して確認待ちにしない。
3. 削除、destructiveな上書き、戻しにくい変更、公開、push、認証、権限変更、課金、メール・チャット・assign・mention等の他者通知、大量作成・一括変更、Secret保存、曖昧な送信先・公開範囲は、明示依頼でも対象と影響を示した事前確認を維持する。
   - destructiveな上書きは、利用者作成・編集内容を置換または喪失させる変更、もしくは容易にrollbackできない変更。単一設定値の可逆更新は含めない。
   - 大量操作は、10件以上、対象件数が未確定の「全部／一括」、または複数repo・複数外部宛先にまたがる操作のいずれか。1〜9件でも削除・外部通知等の別境界に該当すれば確認する。
4. path guard、atomic write、rollback、空上書き拒否、Secretの非表示・保存拒否、未依頼push禁止、書込み失敗時の非成功報告、未確認外部状態の非成功扱い、入力にない事実の非追加を緩めない。
5. 現在の明示依頼を、古い再開しおり、決定0件監査、プロジェクト候補、内部index整合より優先する。軽量なclosed project照合等のread-only確認は必要に応じて行えるが、現在用件を別フローへ横取りしない。
6. 応答は実状態と一致させる。副作用0件で待つ場合は `question`、成功は `saved`、失敗は `error`、一部だけ完了した場合は `partial` として、利用者が分かる言葉で示す。未実行を完了風に宣言しない。
7. 単純成功へ固定3項目、内部stage名、不要な技術証跡、架空の次行動を強制しない。複数結果や部分失敗は必要な段落・箇条書きで示し、次の行動が無い場合は作らない。
8. 会話テストは自然文のbyte一致、固定prefix、質問禁止を主条件にせず、intent、side effect、response state、保存された主体・日付・行動・否定・条件の意味保存を検査する。
9. my-vaultのNotion変更はF57の5点だけに限定する。TaskDB正本、property、relation、通常の作成計画提示、connector write後の再読確認、未確認外部状態の非成功扱いを維持する。
10. 既存Sprintの契約・progress・feedbackは当時の履歴として改変しない。現行仕様と衝突するexact copy・固定3項目等の旧テストは、Sprint 038で意味契約へ置換し、旧記録の遡及改変ではなく新しい回帰結果として残す。
11. 依頼語そのものの引用、現在の実行依頼ではない仮定・条件、取消、過去依頼への照会に「覚えて」「記録して」等が含まれても、現在の`explicit` write依頼へ昇格させない。一方、現在利用者が保存を明示した発話に含まれる伝聞・推量・留保・訂正はcontentの属性であり、それだけを理由にauthorizationを取り消さない。未保存の取消は副作用0件、保存済み内容の取消は対象提示と明示確認を分ける削除2段階へ接続する。
12. 「同じターン」は、1つのユーザー発話を受け、必要なtool実行を含み、1つの最終応答で終わるassistant turnとする。timeout、応答再送、resumeでも同じoperation idの副作用は1回だけとし、既実行なら前後状態を確認して重複実行しない。
13. 低リスク操作とexternal／destructive操作が混在する複合依頼は、利用者の記載順を守る。確認境界より前にある独立した低リスク操作だけは実行できるが、その結果は`partial`として示し、境界以降は確認後まで実行しない。操作が相互依存する、「まとめて／一括」と指定された、またはatomicな結果が期待される場合は、最初の副作用前に全体の影響を確認する。
14. 別確認を維持する既存操作には、記憶削除、週次の古い月の退避、`MEMORY.md`上限超過時の退避、既存`secretary/`の再初期化・backup、一般PJのフル昇格、customized管理対象の上書き、plugin／workspace rollback、公開・push・認証・権限・他者通知を含む。現在の明示依頼を即時実行できる規則で、これらの境界を上書きしない。
15. connector接続状態を確認できない場合は「未接続」と推定してsetupへ送らない。read-only診断を第一選択として示し、利用者がsetupを明示しても認証・権限変更・外部writeの直前確認を維持する。
16. 既存workspaceの `secretary/AGENTS.md` に残る旧会話契約は、配布template由来と証明できる行または管理blockだけをmigration対象にする。dry-runで対象行、期待旧値、新値、衝突、backup／rollbackを示し、完全一致または記録済みtemplate fingerprintがない行、利用者編集がある行、所有判定不能な行では停止する。ファイル全面上書き、周辺の利用者指示の並べ替え・削除は禁止する。適用はatomic、同じmigrationの再実行差分0件を必須とし、対象外workspaceにはCHANGELOGで旧挙動が残る可能性と手動確認箇所を示す。
17. 会話golden setの各caseは、case ID、対象edition、入力、前提、期待intent、期待side effect、期待response state、必須応答要素、禁止表現、意味tuple（主体、日付・期限、行動、対象、否定・条件、情報源・確実性・訂正関係、行き先）、前後snapshotを持つ。意味の欠落・反転・入力にない追加を各要素へ注入するnegative fixtureを用意し、決定的に機械判定できない項目はEvaluatorが判定根拠を記録する。
18. 応答状態は、read-only照会等へ副作用0件で答えた`answered`、不足回答を求める`question`、実write成功の`saved`、失敗の`error`、一部成功の`partial`を区別する。必須要素・禁止表現・意味tuple・snapshotのいずれかが期待と異なれば、文面が自然でも当該caseは不合格とする。
19. 旧回帰の置換は新契約と衝突するassertだけに限定する。`scripts/lib/sprint-032-patch-001-conversation.mjs`とそのreadability／smoke judge、`scripts/check-report-schema.py`、固定報告shapeを要求するSprint 010／011／012／029／032系assertは対象inventoryに含める。同じsuiteのpath guard、timeline決定性、Secret非露出、Git所有範囲、cleanup等は削除・緩和しない。削除・置換・追加したassertの一覧と、保持した安全assertの一覧をEvaluator証拠へ残す。

## 21. Windowsネイティブの記録・保存境界

1. Windowsの通常のローカルworkspace pathは正式対象である。drive letter、空白、日本語を含むpathを、実在する秘書workspaceとして正しく扱う。
2. project／memory／TODO／settings／文書保存の主要操作は、OS固有のshellが無いこと、または異なるshellがWindows pathを別の意味で解釈することにより利用不能になってはならない。
3. path guardはOSごとのpath表記を扱っても、最終的に確認済みworkspaceの実体内部への書込みかで判定する。文字列の前方一致、単純なseparator置換、存在するshellのみに依存した安全判定へ緩和しない。
4. ドライブ直下、workspace外、path traversal、同じ先頭文字列を持つ別ディレクトリ、最終要素／途中ancestor／workspace基点自体の外向きsymlink／junction等の参照を、副作用0件で拒否する。
5. 本体処理とjournalがひとつの契約上の操作である場合、どちらかの必須工程が失敗したら部分更新を残さない。ファイル、journal、索引、Git HEAD／index／working treeは、操作ごとの既存rollback契約に従う。
6. 同じ操作のretried実行でproject、memory、TODO、journal、文書、commitを重複させない。成功、部分成功、失敗の報告は実際の副作用と一致させる。
7. Windows対応のために、空上書き拒否、削除2段階、純追加journal、所有pathだけのcommit、push禁止、Secret非露出、macOS／Linux回帰を削除・緩和しない。
8. Windows対応のPASSにはWindowsネイティブの実行証跡を必要とする。別OSでWindows形式path文字列を模擬した結果だけで「Windows対応済み」と表示しない。
9. Agentic共通coreを先に独立評価し、PASSした完全SHAからだけYasashii overlayを同期する。Yasashiiは固有copy・identity・README・repo所有docsを保護した別回帰・独立評価を必要とする。
10. `agentic-secretary-my-vault`、installed cache、利用者workspace、private固有Skillは本変更の対象外とし、本Patchの対応済み表示に含めない。

## 22. 秘書identity・名前routing・rename境界

1. 利用者の呼び方と秘書自身の名前は別field・別導線とし、一方の変更で他方を暗黙変更しない。
2. 秘書名は英語名だけとし、保存候補を確認前に書き込まない。表示名を変えてもstable IDと `ai-secretary` 種別は維持する。
3. user-scope連携は既定で未変更とする。効果、対象file、managed block、無効化方法を示した明示確認後だけ有効にする。
4. user-scope guidanceは製品所有marker間だけを扱う。全面上書き、既存内容の並べ替え、他blockの削除、重複block、symlink越しの境界外書込みを禁止する。
5. registryはcanonical workspace解決に必要な最小metadataだけを持ち、Secret、記憶、会話、顧客名、成果物本文を保存しない。cwdや単純文字列一致だけでworkspaceを決めない。
6. 名前routingは秘書への直接呼びかけと依頼文脈だけに限定する。人間、顧客、author、引用、コード、ファイル本文の同名はroutingせず、曖昧時は確認前副作用0件とする。
7. rename探索はread-onlyで分類する。無条件grep置換、Git履歴書換え、利用者コンテンツの無確認変更を禁止する。
8. rename applyは分類別の影響を示した明示確認後だけ行う。履歴authorは原則保持し、旧名をaliasesへ加える。衝突・所有不明は自動変更せず、途中失敗はrollbackする。
9. user-scope複数file、identity、registryの更新はtransactionとして扱い、部分成功を全体成功と表示せず、再実行は同じ状態へ収束する。
10. renameがcanonical workspace内の製品所有fileを変更する場合、実体path、edition marker、Git top-levelが同じ正確なworkspace rootを指すことを再検証し、今回の所有pathだけをlocal commitへ含める。既存index、対象外のstage／unstaged／untracked変更、別履歴を変えず、push、fetch、remote変更を行わない。Git repoの新規初期化や親／子の別repoへの代替commitは禁止する。
11. 必須local checkpointの作成、検証、またはcommit後確認に失敗した場合は、renameのworkspace／user-scope変更とGit HEAD／index／working treeを開始前へrollbackする。stable ID、過去author／履歴、開始前aliases、未選択を含む利用者コンテンツを保持し、backup、一時file、部分commit、旧名／新名混在を残さない。成功に見えるexit 0や`checkpoint skipped`への格下げは禁止する。
12. 修正版の下流handoff完全SHA／common digestはfresh独立Evaluator PASS後だけ正本として公開する。PASS前candidate、Generator自己評価、旧accepted SHAを修正版の同期入力として扱わず、Yasashii／private版の実repoへ先行反映しない。
13. 受入は合成HOMEと隔離workspaceで行い、実HOME、installed cache、実下流repo、Mac mini、external releaseへ書き込まない。
14. Agentic PASS前にYasashii／private my-vaultへ反映しない。下流は固定SHA、保護digest、別Sprint、独立評価を必要とし、private固有挙動とroot AGENTSを上書きしない。

## 23. 既存workspaceのidentity migration境界

1. Plugin更新とworkspace migrationは別の状態である。新しいSkillが読み込まれていても、`secretary/identity.json`、AGENTS／CLAUDEの製品所有identity管理節、最小台帳が新規導入相当でなければ「移行完了」と表示しない。
2. Plugin更新後の新sessionは、canonical workspaceとeditionをread-onlyで再確認し、identity未作成、identityだけ作成済み、完全適用済み、利用者編集衝突、所有不明を区別する。cwdに`secretary/`がないことを新規onboardingの根拠にしない。
3. identityが無い場合は希望の英語名またはおまかせ候補を示し、保存名を確認する。既存identityがschema、edition、workspaceと整合する場合は、そのdisplay name、stable ID、`ai-secretary`種別、作成時刻を保持し、再生成しない。不正または曖昧ならwrite 0件で停止する。
4. migration previewは完全なread-onlyとし、identity、AGENTS／CLAUDEの製品所有identity管理節、最小台帳をpathごとに追加・更新・維持・衝突へ分類する。対象、変更理由、local checkpoint、rollback、非対象を示し、本文やSecretを複製しない。
5. 名前確認とmigration apply確認は別にする。名前候補の了承だけでworkspaceを変更せず、previewと影響を示した後の明示確認までidentity、guidance、ledger、Git、user-scope、registryを変更しない。
6. AGENTS／CLAUDEは一意な製品所有marker間だけを追加・更新し、利用者自由記述、他のmanaged block、周辺行、改行、modeを保持する。marker重複、閉じ忘れ、既知基準と異なる既存節、symlink／junction、read-only、edition不一致では全面置換せず停止する。
7. 最小台帳は移行した管理対象path、適用version、基準hash等の非機密metadataだけを扱う。秘書名、stable ID、利用者本文、記憶、顧客名、path以外の私的内容、Secretを台帳へ保存しない。既存recordと無関係なrecordを並べ替え・削除しない。
8. migration applyはidentity、AGENTS／CLAUDE管理節、台帳を一transactionで新規導入相当へ揃え、構文・stable identity・AI author表示・台帳整合を確認する。適用対象がある場合は正確なGit rootから今回の所有pathだけをlocal checkpointへ含め、既存stage／unstaged／untrackedと対象外pathを保持する。
9. file write、整合確認、台帳、stage、commit、commit後確認の失敗では、今回変更したfile、作成file、Git HEAD、index、working treeを開始前へ戻す。開始前の利用者変更を失わず、部分stage、部分commit、backup、一時file、identityだけの部分成功を残さない。rollback不能を成功表示しない。
10. 成功後の同じ診断・migration再実行は、追加file差分、marker重複、ledger重複、stable ID変化、追加commitが0件である。確認拒否、既に完全適用済み、Git root不一致、target所有pathの開始前dirty、Git-free target workspaceでは副作用0件で停止する。
11. user-scope registry／routingはローカルmigrationから除外し、移行後も別の任意確認を必要とする。rename、B分類の利用者コンテンツ、既存文書のgrep置換、過去author変更もmigrationへ混ぜない。
12. `0.10.1`は公開済み`0.10.0`の後方互換patch candidateである。`0.10.0`以前のtag、artifact、CHANGELOG entry、migration、fixture、評価記録を変更せず、同一版差替えやsame-version bridgeを行わない。
13. Agenticのfresh独立Evaluator PASS後だけ、完全SHA、共通digest、共通path、除外・保護path、rollbackを固定handoffとして発行する。Yasashii／private my-vaultは各repoの別Sprintと独立評価を必要とし、3版PASS前にrelease、cache更新、Mac mini同期、受講者向け配布文作成を完了扱いにしない。
14. Agentic Patchの実装・評価は合成HOME、隔離workspace、clean checkout、同一bytesのGit-free archiveを使い、実HOME、実利用者workspace、installed cache、実下流repo、Mac mini、remote、external service、releaseへ書き込まない。

## 24. 明示memory依頼のauthorization・訂正・retry境界

1. 「覚えて」「記録して」により低リスクのmemory保存が明示された場合、user-visible scopeの `memory` は行き先として十分である。decision／topic等の内部分類、保存先path、要約文案を利用者に選ばせず、それらを理由に同じ内容を再確認しない。
2. authorizationは会話router、呼び出されたSkill、保存シーム、journal、local checkpointまで一方向に維持する。内部routeの変更は許可の格下げ理由にならない。Secret、削除、destructive、external、一括操作、memory外へのscope変更は独立した安全分類として停止できる。
3. request hedgeとcontent hedgeを分離する。「覚えといたほうがいいかも」は未承認の提案、「Xだと思う。覚えて」は明示依頼である。伝聞元、推量、留保、否定、条件、訂正理由を確定事実へ変換せず、不要な会話全文・完全verbatimを保存しない。
4. pending confirmationは1件のcontentとuser-visible scopeだけに束縛する。別話題が介在した時点で失効し、後の短い了承を古い候補へ適用しない。「はい、ただしX」は修正済みcontentへの明示許可として同じturnで実行し、修正版を再確認しない。
5. topic訂正はappend-onlyとし、旧内容を編集・削除しない。訂正前、訂正後、明示された理由または不確実性を追跡できる形で追加し、同じ訂正のretryは0件追加とする。
6. idempotencyは同じoperation idだけに依存しない。memory種別、正本scope、正規化した意味内容、訂正関係が同じ既保存内容は、別turn・別operation id・再起動後でもtopic／decision／journal／checkpointを重複追加しない。異なる確実性、否定、条件、訂正関係を同一内容として誤dedupeしない。
7. memory本体と必須journalが成功しcheckpoint commitだけが失敗した場合、保存をrollbackまたは全体失敗へ偽装せず`partial`とする。retryは未完了commitだけを行い、memory、journal、索引を再実行しない。commit成功後のretryは追加差分・追加commit 0件である。
8. conversation-core inventoryはtrackedな正本として恒久化し、対象path、surfaceの役割、適用edition、実内容から得た現行契約marker、禁止された旧契約markerを機械検査できるようにする。fileの存在や名前だけで合格にしない。
9. inventoryは少なくとも会話rule／copy、`memory-care`、`secretary`、`settings`、`daily`、`projects`、workspace templates、runtime classifier、memory保存シーム、golden fixture、Sprint 010を含む現役回帰を対象とする。topic保存前の一律確認、exact copy、明示memory依頼の別turn確認を表す旧契約を、言い換え・別surfaceを含めて負検査する。
10. Agentic、Yasashii、private my-vaultのsourceは、各版固有の文体・Notion／vault routing・repo-owned docsを保ちながら同じauthorization、安全分類、内容冪等性を持つ。共通caseは実内容markerとoffline file fixtureで3版を別々に検査し、1版のPASSを他版へ昇格しない。
11. Sprint 040ではsourceとoffline regressionまでを完了範囲とする。push、tag、GitHub Release、marketplace、installed cache、利用者workspace、Mac mini、release後の新session／loaded version確認は別phaseであり、offline PASSをlive反映済みと表示しない。

## 25. Project Clarityの正本・Hook・連携境界

1. Project Clarityは生きた実行タスクの新しい正本を作らない。PJ内の生きた`TODO.md`、Notion TaskDB複製、自動タスク起票、会議録・チャット本文の恒久コピー、進捗率だけの健康判定を禁止する。
2. `PROJECT.md`、確認済みDecision、memory、既存TODO／Notion、外部Repoのspec・Sprint・実装・成果物は従来の正本を維持する。Clarityが所有するのはimmutable ID、状態、Evidence参照、Attention、link、Event、projectionである。
3. `decision.status`と`execution.status`を正本とし、quadrantは決定的に派生する。AI推定、draft、古いproposal、superseded情報だけでDecisionを`confirmed`へ進めない。
4. Eventは純追加を原則とし、state、Markdown、Mermaid、Xmindは再構築可能なprojectionとする。projectionを直接編集してDecision／Execution／authorityを確定しない。
5. 初期化、sync、migration、cleanup、Xmind proposal applyはpreviewとapplyを分ける。取消・拒否・競合・確認不足ではClarity canonical、Git、journal、runtimeを含む副作用0件とする。
6. working rootは実体path、Git top-level、edition／Clarity identityで確認する。root外symlink／junction、path traversal、absolute path injection、別Repoへのwrite、禁止pathへのwriteを拒否する。
7. linked Repo連携は双方が相手exportをread-only取得し、自Repoのimport projectionだけを更新するpull方式とする。cross-root write、暗黙fetch／pull／push、branch／remote／visibility変更、last-write-winsを禁止する。
8. authorityはfieldごとにPrimary／Reference／Shared derivedを一意に持つ。同一fieldにPrimaryが複数ある、Repo identity／link ID／digestが不一致、schemaが非互換の場合はconflictとして停止し、利用者へ選択を返す。
9. Secret、OAuth token、private key、`.env`値、connector／Xmind／GitHub credential、transcript全文、顧客本文、local absolute pathをtracked Clarity dataへ保存しない。Evidenceは最小locator、短いsummary、digestへ限定する。
10. 既存dirty、staged、unstaged、untracked、HEAD、branch、remoteを利用者の状態として保持する。Clarityのwrite、rollback、commitは所有pathだけを対象にし、pushは別の明示許可なしに行わない。
11. Hookはplugin rootの共通`hooks/hooks.json`と軽量command routerを1組だけ持つ。Claude CodeとCodexのevent payload差はadapterで正規化し、common coreをhost別に複製しない。
12. HookはClarity未初期化・未linked Repoで高速no-opする。Clarity利用中でもnetwork、LLM、Xmind生成、Git全履歴、全Repo scan、外部connector、plugin更新を実行しない。
13. PostToolUse等の並行発火は共有JSONのread-modify-writeへ依存せず、atomic write、競合安全なlockまたは同等手段、一意eventで破損と重複を防ぐ。lock残骸はdoctorとcleanup previewから回復できる。
14. Stopはmaterial changeと未checkpointを確認した場合に同一turnで1回だけ継続を促す。`stop_hook_active`または同等marker、turn／checkpoint identityにより2回目をblockせず、Hook failureでsession終了を妨げない。
15. SessionStart／compact後の再開contextはAttention最大3件程度、件数summary、詳細path、last checkpointに制限する。全state、transcript、顧客本文をcontextへ注入しない。
16. Codexはplugin rootの`hooks/hooks.json`を読み、互換用`CLAUDE_PLUGIN_ROOT`／`CLAUDE_PLUGIN_DATA`も提供する前提で共通routerを使える。ただし環境変数名だけでhostを推定せず、実payloadを正規化してClaude Code／Codexを別々に実機検証する。
17. Codexの非managed plugin hookは内容hashのtrust前にskipされること、Codex trust未承認／無効、Claude plugin無効を正常なdegraded状態とする。manual Skill fallbackを常に利用可能にし、未実行Hookを故障またはverifiedと表示しない。
18. 複数sourceまたは複数matching command hookが並行実行され得るため、同一観測、checkpoint、flush、Eventは内容とsession／turn identityで冪等にし、追加Eventや共有state破損を起こさない。
19. Xmind integrationは明示ON／OFFとprovider capability／priority／selected／reasonを別に持つ。public Agentic／Yasashiiは既定OFF、private my-vaultは既定ONとするが、ONだけでprovider接続、必要能力、verified、課金承認を推定しない。integration ONかつXmind MCPがconnected／availableで必要capabilityを満たす場合はMCPを第1優先、local native `.xmind`を明示承認後の第2優先とする。MCP未接続／無効／capability不足／失敗／外部操作不承認は、理由・local代替・対象file／path・create/update／既存file影響／auth／credit見込みをpreviewし、利用者の明示承認前はlocal write 0件とする。拒否／cancel／無回答は`stopped`、write 0件。最初からlocal指定でもpreview／confirmを省略しない。
20. Xmind MCPのcloud map create／update、external write、network、credit／課金消費は、provider、対象、予想影響を示した明示確認後だけ実行する。provider側のWrite Toolsが`Always allow`でも製品の事前確認を省略しない。実external-live gateで新しい権限・auth／creditが必要になった場合はその時点で停止し、対象と影響を示して利用者に確認する。local Skill／CLIもsign-inやcreditが必要な場合があるため「完全offline／無料」と断定しない。external-live未承認ではadapter contract／isolated fakeで確認境界を評価できるが、fakeでreal providerをverifiedにしない。Hook内ではXmind生成、MCP／CLI呼出し、networkを禁止する。
21. Xmind MCP、local `.xmind`、表現可能なMermaidの4象限は、左上 🟢 定着・検証／安定している／`#16A34A`、右上 🔵 実行待ち／あとは進めるだけ／`#2563EB`、左下 🟡 暫定実装・要再確認／注意して確認する／`#D97706`、右下 🔴 設計・意思決定／人間の判断が必要／`#DC2626`に固定する。上軸は「決まっている」、下軸は「まだ決まっていない」。「赤=判断、黄=確認、青=実行、緑=安定」とemoji／ラベル／意味文を併記し、色だけに依存しない。MCPの実tool schemaでこの色／配置を保証できない場合はcapability不足と表示し、要件を弱めない。
22. public版のSecretary-local統合はgeneric `secretary/projects/open/`と既存project seamを使う。private my-vault固有の`05/02` resolver、`vault/10_sources`、Notion property／relation、root private guidanceをpublic sourceへ持ち込まない。
23. public `agentic-secretary`を先に完全実装・独立評価する。通常はPASSした完全SHA／digest、共通path、除外・保護path、rollbackだけを`public-evaluator-pass`のhandoff正本とする。記録済み`verification-scope-issue`をユーザーが明示受容した例外では、同じ要素と元feedback／未達／承認記録を固定し、PASSとは異なる`public-user-decision-risk-accepted`だけを使用できる。private my-vault、次にYasashiiは別Harness、別state、別Evaluatorで適用・評価し、1版の結果を他版へ昇格しない。
24. planningとpublic実装Sprintではpush、tag、GitHub Release、marketplace公開、installed cache更新、Mac mini同期、実downstream writeを行わない。sourceのEvaluator結果／ユーザー判断basis、release、snapshot、installed cache、loaded version、downstream外部liveを別状態で報告する。
25. HookはProject Clarity専用である。projects、daily、weekly、memory-care、updateその他のSkillへ独立Hookを追加せず、Hookから一般memoryの保存候補を意味判定しない。memory自然会話はSkill description、secretary router、conversation contract、回帰で扱う。connector live取得、自動更新、他の外部／確認系Skillの暗黙実行を禁止する。
26. projectsはproject lifecycle（作成、open／closed、complete／reopen、`canonicalRepo`）を、ClarityはDecision／Execution／Validation／Attention／Driftを所有する。関連Skillのinput／output／routingはClarity-awareにするが、正本と確認境界を交換しない。タスク化は明示依頼時だけ既存TODO／notion-tasksへ委譲する。
27. secretary、projects、daily、weekly、notion-tasks、memory-care、build、update／release inventory、onboarding、templates、rules、host inventory、edition handoffを実内容まで棚卸しする。外部connectorはClarityから自動実行しない。inventory対象漏れ、stale digest、Clarity正本の二重化、private値のpublic混入を不合格とする。
28. primary 250 acceptance IDは`sprint-041`〜`sprint-048`のtarget集合で各1回だけ割り当て、ID／意味／割当を変更しない。CLX-001〜020は`sprint-049`割当のまま保持する。最新user decision用のXV-001〜004は`sprint-043`に初回割当し、`sprint-050`でprimary 250、CLX 20、XV 4、4 E2E、既存master回帰を再実行する。個別Sprintで他Sprintの全caseを合格条件に追加しない。
29. ユーザー判断handoffは、accepted product sourceの完全SHA／tree SHA-256／file count／common path SHA-256／common file count、元feedbackのcommit／path／SHA-256／Verdict、受容対象、条件付きNOT-RUN、別phase残余、承認日／原文／判断文脈／scope／対象candidate／失効条件を一体で固定する。いずれか不足・不一致ならfail closedとする。
30. `docs/sprints/state.md`の`done-by-user-decision`だけ、ユーザー発話の自動推測、文脈から切り離した「はい」「よいです」、別candidate／別feedbackへの転用、承認後のsource・tree・common path・未達・順序・file scope変更、撤回済み承認をauthorizationとして扱わない。現在の短い原文は、同じ記録内の具体的な判断文脈とcandidate束縛が揃う場合に限り有効である。
31. ready handoffでは`acceptedSource`と`governanceSource`を分離する。`acceptedSource`はSprint 050 exact product candidate `5f08d454c05576fcff8ab32c10c00887b4c15a96`のまま保持し、Sprint 050 Patch 001の実装・評価commitを代入しない。`governanceSource`はこの例外gateを実装し独立EvaluatorがPASSしたcommitを指し、state文字列だけで代替しない。
32. `public-evaluator-pass`の既存経路は同じ意味・入力・失敗条件を維持する。ユーザー判断経路で`evaluatorPass=true`、Sprint 050 Verdictの書換え、live／Xmindのverified昇格、`public-evaluator-pass`へのaliasを禁止する。
33. handoffの順序は`agentic-secretary-my-vault`→`yasashii-secretary`、write対象は宣言済みcommon pathだけとする。excluded／protected pathと各downstream同期前状態を保持し、rollbackは同期前commitへcommon pathだけを戻す。順序、対象repo identity、path集合、protected digest、rollbackが固定値と異なる場合はreadyにしない。
34. Sprint 050 Patch 001自身は実downstream repo、remote、release、tag、push、marketplace、installed cache、new session、実Xmind MCP、実hostへwriteしない。Patchの独立Evaluator PASS後に、各downstreamの別Harnessがhandoffを入力として適用・独立評価する。
35. `development-pointer`／`canonicalRepo`を持つopen PJのClarity-aware status、daily、weekly、Portfolioは、利用可能なlocal正本repoをboundedかつread-onlyに確認する。pointerの「最初に読むファイル」、Repo identity、Git current state、Clarity状態の有無、観測時刻、未確認理由を欠かさず、Secret、binary、巨大file、root内symlink、本文全文を取り込まない。
36. remote URLだけのpointerをclone／fetch／pull／checkoutせず、Clarityからnetwork／providerを暗黙起動しない。利用可能かつ許可済みのread-only provider evidenceが現在のadapter入力に無い場合は`unavailable`とする。missing、unsafe、unreadable、staleな正本をworkspace snapshotだけで補完して包括的な現在判断へ昇格しない。
37. 一般filesystemのworking rootは`allowAncestorSymlinks: false`相当を既定とし、ancestor symlinkも拒否する。Clarityだけがrequest-boundにtrueを明示した場合、working root自身がsymlinkではないことを確認したうえでancestorだけを物理rootへ固定できる。設定をtracked project／link bundleへabsolute pathつきで永続化しない。
38. opt-in時も解決先は実在する通常directoryでなければならず、containmentとwriteは物理root基準とする。root内から外向きのsymlink、root自身のsymlink、壊れた／file向きalias、Drift source locator symlink、解決後のalias差替え・物理root identity変更は副作用0件で拒否する。readとwriteの重要境界で同じroot identityを再確認する。
39. canonical readerとancestor alias対応は正本repoへのwrite、fetch、pull、push、checkout、branch／remote変更、network callを0件に保ち、dirty／staged／untracked、HEAD、branch、remoteを保持する。applyのsynthetic fixtureでは物理repo内の宣言済み`.clarity/**`だけが変わり、alias側の別tree、workspace側、外部参照先を変更しない。
