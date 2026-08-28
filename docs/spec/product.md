# Product

## これは何か

`yasashii-secretary` は、Claude Codeを使う非エンジニア一般向けのAI秘書プラグイン
（Claude Code plugin / public / MIT）。名前と README の両方で非エンジニア向けであることを明確にする。

中心思想は **「1つのprivate GitHub repoに、秘書・一般プロジェクト・選択したチャットの文脈をまとめる」**。
秘書の記憶と成果物、営業・マーケティング・新規事業等の一般プロジェクト、選択したChatwork roomとGoogle Chat通常スペースの履歴を
同じrepoでGit管理する。開発は既存の `build` と `yasashii-harness` 導線を維持し、案件に応じて
別repoを正本にできる。その場合、秘書workspace側には概要と正本repoへの参照ポインタだけを置く。
Chatworkと明示設定済みGoogle Chat以外の外部データは、従来どおり公式コネクタで都度参照する。

publicな `yasashii-secretary` repoは配布物の正本であり、利用者データの保存先ではない。
各利用者はpluginを使う秘書ワークスペース、一般プロジェクト、Chatwork／Google Chat設定・workflow・履歴を
1つのprivate GitHub repoに置く。実API評価用repoもこの実利用構成を再現する専用private test workspaceとし、
チャット専用repoへ分離しない。開発の正本repoは必要に応じてこのworkspaceから分けられるが、作成・接続・公開範囲を
ユーザーに確認し、workspace側に同じ仕様や判断ログを二重管理しない。

2026-07-15 の方針転換は `docs/proposal-2026-07-15-realignment.md` を基礎とする。
2026-07-16 に追加承認されたsingle-repo Git-first + Chatwork方針は本spec群が正本であり、
外部同期なし・ローカルだけ・Web UIなし・pushなしという旧条件を、single-repoワークスペースとChatworkの範囲で上書きする。

## 対象ユーザー

- **主対象**: Claude Codeを使う非エンジニア。Git / GitHubの習熟度や、特定の講座・教材を受けた経験を前提にしない。標準環境は Claude デスクトップアプリ／Claude Code。
- **副対象**: 配布・保守者。一般利用者向けの導入と保守を、秘書本体と開発ハーネスを独立に扱いながら行う。

この主対象は `yasashii-secretary` editionの対象である。共通基盤から分かれる上流の
`agentic-secretary` は、エンジニアおよびAI活用に慣れた利用者を主対象にする。
一方を簡易版・下位版とは扱わず、両方を対象ユーザーに合わせて完成した製品として提供する。

## 製品テーマと優先順位

### G1【最優先】話すだけでコンテキストが整う

相談や作業を普段どおり進めるだけで、次の三層が役割を混ぜずに蓄積される。

1. 活動は、成果物保存・TODO・設定変更など定義済みシームの副作用として確実に溜まる。
2. 決定は、明示された低リスク保存依頼なら同じターンで、自発的に検出した候補なら質問後に回収する。会話の締めでは明確な拾い漏れ候補がある場合だけ確認し、決定0件の内部監査を強制表示しない。LLMによる検出であり完全自動保証ではないことを隠さない。
3. 結論に至らない相談の文脈は、明示保存依頼なら同じターンで、自発提案なら要点を示した質問後に案件メモへ残す。

G1 の最小達成状態は、`timeline` により「何がいつ決まり、その日に何をしたか」を決定的に一覧・検索できること。
dashboard は必須条件ではなく、sprint-012 で利用反応を踏まえて判断する。

### G2【次点】100人100通りの秘書

初回と途中変更の両方を `settings` が受ける。職業・役割、言葉遣い、説明の詳しさ、呼び方、
決定確認のタイミングを `preferences.md` v2 に保存し、提案・例示・用語補足に実際に反映する。
既定動作を安全な正本とし、ユーザーが明示した項目だけを opt-in で上書きする。
初回の呼び方は「あなた」「アカウント名」「指定の名前」「その他」の4選択肢から解決し、
どの経路でも保存前に実際の値を確認する。未回答は「あなた」とする。

### G3 やさしいハーネスの分離と上流追随

やさしいハーネスの正本は、本体への同梱コピーではなく別リポジトリ `yasashii-harness` に置く。
`yasashii-secretary` はインストール案内と接続導線だけを持つ。
`mtaiseeei/yasashii-harness` は GitHub forkではない独立public downstream repoとして、fb9c303を初期基点にする。
書込先 `origin` は自身、読取専用の `upstream` は `mtaiseeei/agentic-harness` とし、上流追随とやさしさ差分の検証を反復可能にする。
配布時は marketplace名 `yasashii-harness` とplugin本体名 `harness` を組み合わせ、`harness@yasashii-harness` で一意に導入できるようにする。上流との差分は `yasashii` 見出し追加と、宣言的allowlistに載せた配布識別metadataだけに限定する。

### G4 やさしいハーネスの再定義

> やさしいハーネスの「やさしい」とは、ユーザーに見える言葉遣い・報告・次の一手の先回り提案がやさしいという意味である。やること自体はやさしくしない。6規律、根拠、記憶保護、封じ込め、Planner / Generator / Evaluator の分離、評価閾値、回帰ゼロ許容は削らず、緩めない。

### G5 1つのrepoでChatworkまで読める

初回オンボーディングはprivate GitHub repoの作成、初期commit、初回pushまで完了する。
このrepoが、プラグインを使う秘書ワークスペース、一般プロジェクト、秘書の記憶と成果物、
Chatwork履歴の作業単位になる。Chatwork専用repoや、Chatwork以外だけを別のローカル領域へ分けない。
開発PJは必要に応じて別repoを正本にでき、その場合はこのworkspaceに参照ポインタだけを置く。

Chatwork API TokenはGitHub Actions Repository Secretへ登録し、repo本文には保存しない。
ユーザーはローカル設定wizardで参加roomを確認・選択し、同期間隔を決める。
推奨・初期値は3時間ごととし、利用者は取得量に応じて別の間隔または手動のみを選べる。
APIが返せる最新100件より前の履歴は導入直後には存在せず、それを正常状態として説明する。
検索で見つからない場合は、承認を得てから手動同期し、成功を確認してpull後に再検索する。

実APIのlive gateはpublic配布repoでは実行しない。ユーザーが専用private test workspaceの作成、
Repository Secret設定、workflow dispatch、push、Chatwork API送信を明示許可し、test用tokenと
非機密test roomを準備した場合だけ実行する。準備が無ければlive gateは未達であり、合成fixtureの成功を
実API合格へ読み替えない。

### G6 継続する仕事をプロジェクトにする

一つの会話や一つの行動で終わらず、同じ成果に向けて複数の次の行動や別日の継続が生まれる仕事を、
秘書がプロジェクト候補として捉える。候補は自動作成せず、なぜ候補と考えたかを短く添えて
「プロジェクトとしてまとめますか？」と確認し、了承後だけ `secretary/projects/` に作る。

営業、マーケティング、新規事業、採用、研修、契約準備等の一般プロジェクトは、同じprivate workspace内を正本にする。
最初は `PROJECT.md` 1枚のライト運用とし、判断・事実・ファイル・固有ガードレールが増えたときにその場で提案し、
了承後だけ「指示・状態・判断・事実」のフル運用へ昇格する。

開発プロジェクトは既存の `build` 導線を変えない。別repoを正本にする場合、workspace側には
`AGENTS.md` と概要スナップショットの `PROJECT.md` を参照ポインタとして置き、実装仕様・判断・進行状態の正本を複製しない。

### G8 安心して更新を続けられる

配布開始後も、利用者が自分のカスタマイズや記憶を失う不安なく新しい版へ進めるようにする。
最初の体験は完全な読み取り専用とし、「最新版にして」と頼まれた時点では現在版、利用できる最新版、
誰に何が変わるか、設定・ファイルへの影響、必要な操作、カスタマイズと衝突する可能性だけを平易に説明する。

実更新は別の段階とし、説明を読んだ利用者が明示的に了承した後だけ行う。更新直前にはpushを伴わない
ローカルcommitを復元地点として作る。配布時の基準から変更された管理対象ファイルは、ファイルごとに
「現状を残す」を既定にし、利用者が選んだものだけ置き換える。移行はdry-runで予定を見せ、同じ処理を
複数回実行しても結果が変わらない冪等性を持たせ、更新後の検証とrollbackを一続きで扱う。

### G9 Google Chatを安全に蓄積する

Google Chatは、各利用組織が所有するGoogle Cloudプロジェクトと、利用者本人が同意するユーザーOAuthで接続する。
共通の外部向けOAuthアプリは使わず、OAuth Audienceは同じGoogle Workspace組織内に限る `Internal` を前提とする。
READMEでは通常機能と混同せず「Google Chatをつなぐ（少し高度な設定）」として扱う。
Google Cloudの準備はGoogle Chat skillとの会話が担当する。起動中のGit repo名を基にProject案を示し、Google公式CLIの
`gcloud` で可能なプロジェクト作成と必要APIの有効化を、変更内容の説明と明示確認の後だけ進める。
Google画面で本人操作が必要な `Internal` Audience、`Desktop app`、接続用JSON取得は、対象Projectを指定した直接リンクと
一画面一操作の案内を順に出し、利用者の「できました」を受けて次へ進む。`gcloud`を導入できない場合は同じ全工程を
直接リンクによる手動操作支援へ切り替える。Browser Useやブラウザ拡張機能は必須にしない。

接続用JSONを取得できた後だけlocal wizardを開く。wizardはJSON選択、明示ボタンから別タブで行うOAuth許可、
通常スペース選択以降に集中し、Cloudプロジェクト作成やAPI有効化の説明画像・手順を重複して持たない。

接続後は、利用者が名前を確認して選んだ `SPACE` 種別の通常スペースだけを同じprivate workspaceへ保存する。
1対1のDMとグループDMは初版では対象外にし、投稿・編集・削除も行わない。保存形式と取得の考え方は
本specを基準に、スペース別・日付別Markdown、スレッド、発言者、Asia/Tokyoの時刻、
初回の取得可能な全履歴、以後の差分取得を保つ。ただし、使っていない権限、古いサービスアカウント案内、
資格情報を端末へ表示する挙動は引き継がない。

自動取得の既定推奨は3時間ごとにする。利用者は手動のみ、1時間、3時間、6時間、12時間から選べ、
確定前に対象、保存内容、共同編集者への可視性、commit・pushを確認する。保存形式と取得境界は本specを正本とし、
自動取得の推奨間隔とAsia/Tokyoの日付境界は本製品で意図的に改善する。
初回設定はChatworkと同じ一体型フローとし、スペースと間隔を選んで安全情報へ同意した1回の確定操作で、
初回取り込みと自動取得設定を完了する。手動のみでは初回取り込みだけを行い、scheduleは作らない。

### G10 配布前監査を閉じ、公開済み0.7.0の安全基準を維持する

配布前監査で確認されたHighからLowまでの全指摘を、公開前に残件0件へする。最優先は、secretをcommit・pushしないこと、
各操作が所有しないstageを混ぜないこと、symlink経由でworkspace外へ書込み・削除しないこと、OAuthとloopback wizardを
同一sessionの正当な操作だけに閉じることである。次にGoogle Chat履歴とGitHub Actions runの取り違えを防ぎ、
`0.6.0`利用者がカスタマイズと記憶を保ったまま `0.7.0`へ更新・復元できる状態を作る。

Google ChatのOAuth実値はlocal wizard sessionのmemoryから `gh` のstdin経由で現在のprivate repoのRepository Secretへ直接登録する。
Chatwork API Tokenはwizardが取得・受領・登録せず、F24の既存導線どおり利用者本人がGitHubのRepository Secret画面へ直接入力する。
両サービスともRepository Secretを正本とし、通常フローで実値がrepo、Git履歴、ログ、製品側DOM、会話に残ることは0件とする。補助scannerは製品管理対象と初回publishの
合理的な誤混入を止めるための追加防御であり、private repo内の任意コードを全構文解析する万能secret detectorとは扱わない。

配布可否はコード修正だけで決めない。全自動回帰、`.git`がないGit archive相当の配布物、desktop／mobile／200%のwizard、
専用private test workspaceでのChatwork／Google Chat／OAuth／Repository Secret／Actions／commit・push／検索を確認し、
最後にschedule停止、Secret削除、Google OAuth grant／token取消、選択解除まで完了した場合だけ合格とする。

### G11 2つの完成品を安全に育てる

`agentic-secretary` を共通基盤の上流、`yasashii-secretary` を非エンジニア向けoverlayの下流として分ける。
両者はneutralization commitまでのGit履歴と共通祖先を持ち、共通の安全性、Chatwork／Google Chat wizard、
OAuth、同期、更新回帰を共有する。edition差分は会話、診断、報告、developer handoffに限定する。

初期リリースではco-installationとedition switchingを提供しない。反対editionまたは混在状態を検出したら、
利用者データを移動・統合・上書きせず停止する。`0.7.0` の歴史記録は不変とし、まだ利用者へ明示配布していない段階の
最初の配布候補を `0.8.0` へ直接揃える。既存0.7.0利用者向けの複雑なexternal recovery／bootstrapは作らず、
未検証のlive update成功を公開条件として主張しない。same-version bootstrap bridgeは採用せず、同一版とdowngradeは副作用0件で停止する。

両editionの思想と対象ユーザーの違いは保ったまま、全ユーザー会話には改行、段落、必要なMarkdown箇条書きという
共通の可読性最低基準を適用する。これは好みとして質問せず、preferencesでも無効化しない。
完了・状態報告を含む全応答は内容依存とし、単純成功は自然な短文、複数結果・部分失敗は必要な段落・箇条書きで返す。
固定3項目の存在・順序・prefixは要求しない。

`agentic-secretary` は技術者向けにそのまま配布できる完成品とし、正式な必須対象環境を
Claude Code Desktop App、Claude Code CLI、Codex App、Codex CLIの4つとする。その他のコーディングエージェントは
共通本体を再利用しやすくする設計対象だが、公式受入対象・配布保証・実環境検証必須対象ではない。
共通本体はホスト非依存の1実装とし、ホスト固有部分だけをhost adapterとして分ける。
対応対象ホストと検証済みホストは別集計し、1ホストのPASSを全ホストPASSとして扱わず、
未検証環境を「対応済み」と表示しない。詳細は `editions.md` を正本とする。

### G12 呼び方と配布物を利用者中立にする

Claude CodeとCodexの初回セットアップは、同じ4つの呼び方候補と確認手順を提供する。
アカウント名候補は、現在のタスクへhostが既に渡している過去会話の記憶・Personalization・Project文脈・
現在会話で明示された名前、`git config user.name`、OSユーザー名の順で探す。任意の過去会話や生session logを
直接探索する共通APIは前提にしない。候補は表示名向けに正規化し、メール、bot／CI／root等の汎用名、
数字中心、長すぎる識別子、machine-like文字列を除く。複数候補は出典を添えて最良1件を推奨し、
探索結果自体は保存しない。既存設定を変える場合は `preferences.md` を現在値の正本とし、
`AGENTS.md` と `MEMORY.md` の現役表示を同じ値へ同期する。初回決定ログは当時の履歴として書き換えない。

### G13 現在の依頼を自然に完了する

ユーザーが「覚えて」「設定して」「完了にして」のように、対象と操作を明示した低リスクの依頼は、
その発話自体を実行許可として扱う。同じ内容を復唱して別ターンの了承を待たず、同じターンで実行し、
成功後に何をどこへ残したかを過去形で伝える。

秘書が保存やプロジェクト化を自発提案する場合、対象や行き先が曖昧な場合は、利用者が答えられる質問を出す。
削除、上書き、公開、push、認証、権限変更、課金、他者への通知、大量操作、Secretを含む保存は、
明示依頼でも対象と影響を示して事前確認する。安全性は確認回数ではなく、intent（意図）、
side effect（副作用）、残る危険の組み合わせで守る。

現在の用件は、古い再開しおり、決定の拾い漏れ監査、プロジェクト候補、内部index整合より優先する。
返答は内容と実行結果に応じて、自然な短文、質問、複数結果、部分失敗を使い分ける。
固定3項目、原文のbyte単位復唱、質問禁止、架空の「次の一手」を合格条件にしない。

共通coreは `agentic-secretary`、private downstreamの `agentic-secretary-my-vault`、
`yasashii-secretary` の3配布系統で意味を揃える。my-vaultではNotion TaskDBを実行タスクの正本として維持し、
通常のproperty、relation、作成・再読確認は再設計せず、承認済みの5問題だけを直す。

既存workspaceの旧 `secretary/AGENTS.md` は全面上書きしない。配布template由来と証明できる旧会話契約行だけを、
dry-run、衝突検出、backup／rollback、冪等性を備えたmigrationで置き換える。所有判定不能または利用者編集と競合する場合は停止し、
CHANGELOGで旧挙動が残る可能性と確認箇所を案内する。

配布物と現行製品正本には、特定利用者・保守者の個人名、利用者端末固有の絶対path、私用workspaceへの
実行時依存を残さない。テストで人物が必要な場合は合成人物を使う。一方、MITの著作権表示、GitHub owner、
公式repository URL、`forkedFrom` 等の製品所有・配布に必要な正式情報は削除しない。

### G14 Windowsでも記録・保存できる

Windowsのローカルworkspaceを使うAgentic版・Yasashii版の利用者が、drive letter、空白、
日本語を含むWindows形式pathでも、プロジェクト化、記憶、TODO、settings、文書保存を完了できる。
OS固有のshellやpath表記の違いは利用者に回避させず、製品側の共通動作として扱う。

ただし、Windows対応を理由に安全性を緩めない。許可workspace外、path traversal、symlink／junction等の参照は
副作用0件で拒否し、一括更新・rollback・journal純追加・重複防止はmacOS／Linuxと同じ強さで守る。
`agentic-secretary` の共通coreを先に独立評価し、PASSした完全SHAから
`yasashii-secretary` をoverlay同期する。`agentic-secretary-my-vault` は今回の対象に含めない。

### G15 秘書名をworkspace全体で一貫させる

利用者の呼び方とは別に、秘書自身の英語名、renameで変わらないstable ID、`ai-secretary`種別を持つ。
初回利用者はオンボーディングで、既存利用者は専用name Skillで設定し、作者表示と別repoからの呼びかけでも
人間・顧客・取引先と区別できる。user-scope連携は任意で、明示確認前には変更しない。

### G16 既存workspaceも更新後に新規導入相当へ揃える

Plugin更新は新しいSkillと処理を読み込む段階であり、既存workspaceのローカルファイル移行とは区別する。
更新後の新sessionで不足状態をread-only診断し、希望の英語名または既存identityを確定したうえで、
変更予定をpreviewする。別確認後だけidentity、製品所有のAGENTS／CLAUDE identity管理節、最小台帳を
一体移行し、利用者自由記述を保持する。移行後もuser-scope routingは別確認の任意操作である。

### G17 「覚えて」を一度で安全に完了する

利用者が低リスクの内容を「覚えて」と明示したら、`memory`への保存許可として一度で受け取り、
decision／topic等の内部分類、保存先file、要約案のために聞き返さない。保存するか自体が曖昧な提案と、
「と思う」「と聞いた」等の内容上の不確実性は分け、後者は意味を保ったまま同じturnで保存する。

同じ内容のretryではmemory、journal、checkpointを重複させず、topic訂正は旧内容を残して追記する。
保存とjournalが済んだ後にlocal commitだけ失敗した場合は部分成功を正直に示し、retryはcommitだけを行う。
この契約をAgentic、Yasashii、private my-vaultの3版へ揃え、旧確認契約が再流入しないinventoryで守る。

### G18 Project Clarity — 今、人間が考える必要があることを示す

Project Clarity（クラリティ）は、タスク数や進捗率ではなく、プロジェクトで「決まっていること」と
「実行されていること」のずれを外部化する。利用者がRepoやSecretaryのPJを再開したとき、全体を頭の中で
復元しなくても、判断・確認が必要な項目、決定済みなのに未実行の項目、確認済みDecisionなしで実装された項目、
Decisionと実装のDrift（ずれ）を、理由と根拠つきで把握できることを中核価値とする。

Project ClarityはStandalone Repo、Secretary-local Project、Linked External Repo、Portfolioの4モードを持つ。
既存の`PROJECT.md`、Decision、memory、実行タスク、外部Repoを置き換えず、状態・Evidence参照・Attention・履歴を
扱う派生レイヤーとして動く。Claude CodeとCodexでは同じSkill semanticとcommand-only lifecycle hookを使い、
Hookが未信頼・無効・失敗でもmanual Skillから全機能を使える。

## ゴール

1. 非エンジニアが説明に沿って導入し、初回5問以内で `secretary/` を安全に生成したうえで、1つのprivate GitHub repoを作成・初回pushできる。
2. 話す・成果物を保存する・TODOを扱う・設定を変えるだけで、三層記憶が定義どおり蓄積される。
3. `timeline` で期間・種類・キーワードを指定し、決定と活動を日付つきで再発見できる。
4. 設定を後から変えられ、適用前の例文プレビューと適用後の宣言により意図しない人格変更を防げる。
5. Chatworkと明示設定済みGoogle Chat以外の外部データは同期せず根拠を添えて使い、両チャットは選択対象だけを同じrepoへ保存できる。
6. 開発依頼は `yasashii-harness` への健全な参照導線から、規律を維持した3 Agent ループへ接続できる。
7. 既存の記憶保護・封じ込め・単段クレジット・節目commitを回帰させない。初回pushと同意済みChatwork schedule push以外の予期しないpushは確認する。
8. `/chatwork` からroom設定、同期状態、履歴検索へ進め、検索失敗時も「無い」と断定せず次の確認手段を選べる。
9. public配布repoとprivate workspaceの責務を混ぜず、専用private test workspaceで実API経路を伏せ字証跡つきで評価できる。
10. 継続する一般業務を確認後にプロジェクト化し、ライトな1枚から開始して、必要になった時だけユーザー確認後にフル運用へ昇格できる。
11. 特定の講座・期・教材の説明がなくても、READMEと配布物だけで一般の非エンジニアが導入・利用を始められる。
12. 「最新版にして」から、まず現在版・最新版・変更点・影響・カスタマイズ衝突可能性を変更なしで理解でき、明示確認後だけ保護commit、更新、移行、検証、必要時の復元へ進める。
13. `/google-chat` からAI支援で各社所有Cloud projectを準備し、接続用JSON取得後のOAuth接続、通常スペース選択、初回取得、検索、3時間推奨の定期取得へ進める。
14. `0.7.0`の配布前gateで、監査指摘0件、全自動回帰0 FAIL、Git archive相当の動作、専用private test workspaceの両チャットlive gateと後始末をすべて証跡つきで確認できる。
15. `agentic-secretary` と `yasashii-secretary` が同じGit系譜と共通安全基盤を持ち、対象ユーザーに合わせた4つの表現面だけをedition差分として独立配布できる。
16. 公開済み `0.8.0`／`0.9.0`／`0.9.1` の記録と新規導入・停止条件を履歴回帰として維持し、Windowsの記録・保存互換を直すpatch candidate `0.9.2` をmanifest、CHANGELOG、edition metadata、導入案内、回帰検査、配布先で一意に整合できる。反対edition、曖昧なworkspace、同一版、downgradeではデータを変えずに停止し、旧0.7.0 updaterの既知blockerを対応済みと誤表示しない。
17. agentic／yasashiiの全会話が、内容に応じた改行・段落・Markdown箇条書きで読める。ChatworkのSecret登録ではGitHub画面の `Name` と `Secret` に入れる内容が具体的に分かる。
18. `agentic-secretary` を4つの正式対象ホスト（Claude Code Desktop App／Claude Code CLI／Codex App／Codex CLI）で、共通本体＋host adapterの構成により導入・検証でき、対応対象と検証済みが別集計で正直に表示される。
19. 初回の呼び方を4選択肢から確認して保存でき、既存変更後は現役3正本が一致する。配布物と現行製品正本は個人名・端末固有path・私用workspaceへ依存しない。
20. 明示された低リスク操作は重複確認なしで同じターンに完了し、自発提案・曖昧さ・高リスク操作では必要な事前確認が働く。応答は実際の副作用状態と一致する。
21. 共通会話契約と意味保存golden setが3配布系統で成立し、my-vaultのNotion変更は承認済み5問題に限定される。
22. Windowsの通常workspace pathでproject／memory／TODO／settings／文書保存が完了し、中途失敗で利用者データとjournalの片方だけを残さない。同時にmacOS／Linuxの既存回帰と安全境界を維持する。
23. 秘書自身の英語名、stable identity、AI authorが初回と既存利用者で一貫し、別repo routingは任意の明示確認、renameは分類previewから安全に行える。
24. 公開済み`0.10.0`へplugin更新済みでもローカルidentity面が未導入または部分適用のworkspaceを、新sessionのread-only診断、preview、別確認、atomic migration、local checkpoint、rollbackで新規導入相当へ揃えられる。
25. 明示memory依頼は内部分類の確認なしに同じturnで1回保存され、content hedge、訂正、retry、checkpoint失敗でも意味と副作用件数が正しく保たれる。3版のsourceは同じoffline契約へ揃い、live cache／新session反映とは別状態で確認できる。
26. Project Clarityが4モードで動き、決定状態×実行状態から4象限を再計算し、Attentionを理由・根拠・選択肢つきで最大3件程度へ絞って示せる。
27. Standalone Repoをread-only previewから初期化でき、後からSecretaryへリンクしてもClarity Project IDと履歴を失わない。linked Repoは相手を直接書き換えず、双方が相手exportを読むpull方式で同期する。
28. Claude Code／CodexのHookが正常時に軽量な観測・再開支援を行い、未信頼・無効・失敗時は正常なdegraded状態としてmanual Skillへ戻れる。Hookはnetwork、LLM、重い全Repo解析を行わない。
29. Mermaid、Markdownに加え、Xmind integration ON時はprovider resolverがMCP-firstでcloud mapまたは明示承認後のlocal native `.xmind`を選び、同じ状態と固定4象限visualを可視化できる。いずれも正本ではなく再生成可能なprojectionであり、Xmind編集は人間確認前のproposalに留まる。
30. public `agentic-secretary`は、独立Evaluator PASS、または元feedbackと残余リスクへ束縛したユーザー判断の明示的例外のどちらかを正直な別statusで固定し、そのexact SHA／digestだけをprivate my-vault、次にYasashiiの別Harnessへ渡せる。例外をPASSへ昇格せず、public版へprivate固有のvault／Notion実装を混ぜない。

## 成功状態

- `journal` / `decisions` / `topics` が役割どおりに蓄積され、会話全文や承認対象外の外部データ本文を保存していない。Chatwork／Google Chat本文は選択対象の専用履歴領域だけにある。
- `timeline` は同じ入力から同じ Markdown を返し、「Zoomの件いつ決めたっけ」のような問いをキーワード検索できる。
- `MEMORY.md` は200行以内で、topics と月単位に畳んだ journal を索引できる。
- 初回設定は5問以内。呼び方は4選択肢から解決値を保存前に確認し、未回答は「あなた」とする。口調は聞かず標準値で開始し、いつでも変更できることを伝える。
- `preferences.md` が欠落または空でも既定値で安全に動き、明示した設定だけが挙動を上書きする。
- 呼び方の既存変更では `preferences.md`、`AGENTS.md`、`MEMORY.md` の現役表示が同じ値になり、初回決定ログは当時の値を保持する。
- 配布物と現行製品正本の個人・環境固有情報scanが明示allowlistだけで合格し、合成人物fixtureと正式な製品所有情報を区別できる。
- 決定を含む模擬会話、決定ゼロの日の締め、3種類の設定差分を Evaluator が実際に確認できる。
- `yasashii-secretary` にハーネスや agents のコピーがなく、`yasashii-harness` への案内が切れていない。
- GitHub上の `mtaiseeei/yasashii-harness` がpublic・`fork=false`で実在し、origin/upstream remoteとfb9c303基点を証跡で確認できる。
- remote manifestsのmarketplace `name` / `repository`、plugin `name` / `source` / `repository` / `homepage` がdownstreamと `harness@yasashii-harness` に整合し、metadata allowlist外の上流行変更が0件である。
- private GitHub repoの初回push後、秘書・プロジェクト・Chatwork設定が同じrepoにあり、別のChatwork専用repoを必要としない。
- Chatwork API TokenがRepository Secret以外へ露出せず、参加room一覧から選んだRoom IDだけがGit管理される。
- 初回取得が0件または最大100件でも正常完了し、以後の取得がmessage ID単位で重複せず蓄積される。
- Chatwork wizardで30分／1時間／3時間／6時間／12時間／手動のみを選べ、3時間が推奨・初期値であり、月間run数の概算・実課金との差が分かる。
- 検索で見つからないとき、確認なしの手動同期を行わず、承認時だけdispatch→完了確認→pull→再検索が成立する。
- 実API評価では、専用private test workspace内にpluginの利用設定・生成物、秘書、通常project、Chatwork設定・workflow・履歴が同居し、Repository Secret経由の非機密test room同期、commit、push、pull後検索を確認できる。public配布ソース自体は複製せず、token値、不要なroom名、本文は証跡に残らない。
- 複数行動・複数セッションの仕事は理由つきでプロジェクト候補として提案され、拒否時は作成0件、承認時は一般PJのライト構成または別repo開発PJの参照ポインタとして整理される。
- 一般PJは `PROJECT.md` の現在状況から再開でき、決定・恒久事実・成果物・旧版が役割どおり分かれる。フル昇格はトリガー到達とユーザー承認の両方が必要である。
- 現行正本・公開面・配布物に旧配布チャネル固有の名称・期数・教材導線・その利用者であることを前提にした説明がなく、一般の非エンジニア向け表現に統一されている。
- marketplaceとplugin manifestのversionが一致し、不一致は配布前の検査で検出される。CHANGELOGは「誰に何が変わるか」「設定・ファイルへの影響」「必要な操作」を版ごとに示す。
- 「最新版にして」の初回診断ではplugin更新、workspace書込み、migration、commit、pushが0件で、利用者は実更新へ進むかを説明後に選べる。
- 実更新ではカスタマイズ済みファイルの既定が「現状を残す」となり、台帳が無い0.2.0利用者も安全な初回判定を経て更新できる。失敗時は直前のローカルcommitへ戻す手順が分かる。
- Google OAuthの厳格secretが永続物へ露出せず、client IDは識別子として必要な一時表示だけに限られ、`SPACE`だけを選べ、DM／グループDMが候補・履歴に混ざらない。
- 選択したGoogle Chatスペースは取得可能な履歴を初回に日付別Markdownへ保存し、スレッド、発言者、添付メタデータを検索できる。添付本文は保存しない。
- 3時間ごとの自動取得を推奨・初期値として選べ、同意済みscheduleだけがcommit・pushする。認証失効や管理者ブロック時は、秘密値を出さず再認証または管理者確認へ進める。
- ChatworkとGoogle Chatは共通wizard骨格で操作でき、各画面のサービス名とサービス別primary CTA色により取り違えない。
- Chatwork／Google Chatの初見利用者が、主説明だけで「今すること」「次に起きること」「何を読み、どこへ保存し、誰が見られるか」を説明できる。正式な技術名は必要な場面だけ短い役割説明または管理者向け詳細で確認できる。
- Google Chatを設定する利用者は、Google Chat skillの案内に沿って、現在のrepoに対応するCloud project、必要API、`Internal`、`Desktop app`、接続用JSONの取得まで進められる。`gcloud`を使えない環境でも、対象Projectを指定した直接リンクで同じ完了状態へ到達できる。JSON取得後のwizardではスペースと間隔を一度だけ選び、`この設定で始める` の1回で初回取り込みと自動取得設定が完了する。完了画面のprimary CTAは `設定を終了する` だけである。
- Google ChatのOAuth実値がlocal wizard sessionのmemoryから `gh` のstdin経由でRepository Secretへ直接登録される。ChatworkはwizardがTokenを取得・受領・登録せず、利用者本人がGitHubのRepository Secret画面へ直接入力する既存F24導線を維持する。両サービスとも通常フローのrepo・Git履歴・ログ・製品側DOM・会話へ実値が0件である。
- 初回publish、Chatwork／Google Chat設定、記憶の節目commit、更新の各経路で、既存stageや操作対象外のファイルがcommitへ混ざらない。製品が生成・管理するworkflow／config／historyと初回publish inventoryでは、OAuth client JSON、private key、known token field、通常のliteral assignment等の合理的な誤混入がcommit・push前に拒否される。
- `${{ secrets.NAME }}` 等の正規のruntime参照、通常文書、合理的な非機密metadataはsecretとして誤拒否されない。
- Node／shellの書込み・削除はsymlinkを含む実体境界を守り、workspace外の本体を変更しない。外部CLI・HTTPはtimeout後に安全に停止し、部分成功または未完了を正直に示す。
- loopback wizardは同一origin・同一session・正しいContent-Typeの状態変更だけを受け付け、OAuth callbackは再送・再入でtoken交換やSecret登録を重複しない。後始末失敗を成功と表示しない。
- Google Chat本文に内部markerと同じ文字列が含まれても、既存履歴と新規履歴を欠落させない。GitHub Actionsは今回のdispatchに因果的に対応するrunだけを追跡し、古いrunや時刻不明runを成功扱いしない。
- `0.7.0`／`0.8.0`／`0.9.0`／`0.9.1`／`0.9.2`／`0.10.0` のmanifest、migration、fixture、評価記録、tag、Git履歴は不変である。最初の明示配布候補 `0.8.0` の新規導入、equal／downgrade副作用0停止、portable gateは履歴回帰として成立し、旧0.7.0 updaterの既知blockerは未解消のlive互換として区別される。現在patch candidate `0.10.1` はmarketplace、Claude／Codex manifest、正本／旧raw CHANGELOG新entry、edition metadata、README、既存workspace移行回帰、release gateで一致する。
- Windowsネイティブの通常ローカルworkspaceで、drive letter・空白・日本語を含むpathからプロジェクト、記憶、TODO、settings、文書保存を実行できる。失敗時は契約どおりrollbackし、workspace外の参照先を変更しない。
- 両editionの会話、診断、確認、進行、結果、エラー、handoffで、複数要素が改行なしの平文に連結されず、段落またはMarkdown箇条書きとして読める。edition固有の対象・内容差は保たれる。
- Chatwork wizardのGitHub Secret案内は `Name` 欄=`CHATWORK_API_TOKEN`、`Secret` 欄=本人が公式画面で取得したAPI Tokenと示し、実値をwizardや会話へ入力させない。
- master回帰は受入済みSprint 015とSprint 020 Patch 002を含む必要な全suiteを実行し、Git checkoutとGit archive相当の両方で合格する。配布可否を個別suiteの成功だけで代替しない。
- wizardの画面遷移後は新しい見出しまたは主領域へfocusが移り、keyboard利用者が現在地を把握できる。主要操作は44px相当以上で、README、onboarding、`.mcp.json`、公開ガイドが現行機能と一致する。
- 最終live gateでは両チャットの非機密test対象を同じ専用private test workspaceへ保存し、OAuth、Secret、Actions、commit、push、pull後検索を確認する。終了後はschedule、Secret、対象選択、Google OAuth grant／tokenが残っていない。
- 「覚えて」「設定して」「TODO 3を完了にして」等の明示依頼は、操作・対象・行き先が一意で低リスクなら同じターンに副作用1件と成功報告まで進む。自発提案と曖昧入力は副作用0件で質問し、高リスク操作は対象・影響の確認前に進まない。
- 成功、質問、失敗、部分成功の返答が実状態と一致し、単純成功に不要な固定帳票や次行動を付けない。保存内容は入力の主体・日付・行動を保ち、入力にない事実、依頼語、不要な全文を加えない。
- `agentic-secretary`、`agentic-secretary-my-vault`、`yasashii-secretary` は、行き先・正本ルールが同じ共通caseで同じ意味と安全境界を持つ。Notion routing等は版固有caseとして、その版の正本に従う保存先とresponse stateを評価し、共通比較は安全境界に限定する。
- 明示memory依頼、content hedge、pending修正、topic訂正、同内容retry、checkpoint failureの各caseで、memory／journal／commitの実件数がF63どおりとなり、3版のconversation-core inventoryに禁止旧契約が0件である。
- 「今、人間が考える必要があるのは何か」に対し、結論→理由→根拠→選択の順で重要Attentionを最大3件程度示し、その他の正常・idea項目は件数へ畳める。
- `decision.status`と`execution.status`が正本で、`quadrant`は毎回決定的に派生する。AI推定だけのDecisionは`confirmed`にならず、Evidenceが弱いDriftは`possible_drift`に留まる。
- Clarity未導入RepoではHookが高速no-opし、初期化済みRepoでもHook内のnetwork／LLM／重いscanは0件である。Claude Code／Codexの未信頼・無効状態を故障と誤表示しない。
- Standalone、generic Secretary-local、Linked、Portfolioの各modeで正本所有が一意で、cross-root write、last-write-wins、自動タスク起票が0件である。
- 同じ入力からMarkdown／Mermaid／選択されたXmind providerのprojectionが安定して再生成され、projectionの手編集だけでDecision／Executionが確定しない。Xmind MCPの未接続／無効／能力不足／失敗は理由つきでlocal fallback承認待ちとなり、承認なしにlocal fileを作成・更新しない。
- public版の独立PASS、または元feedback・未達・明示承認へ束縛した`public-user-decision-risk-accepted`のいずれかと、固定SHA／digest、protected path、rollbackが揃う前にprivate／Yasashiiへ反映しない。ユーザー判断経路をEvaluator PASSと表示せず、release／marketplace／cache／pushをPlanningまたは実装Sprintの完了へ混ぜない。

## 非ゴール

- ChatworkとGoogle Chat以外の外部データ同期層・キャッシュ層は作らない。2つの実装を汎用同期基盤へ一般化しない。
- cc-company の部署制、必須 `case-NNN`、`patterns/` 自動統合は導入しない。
- 同意前のschedule push、確認なしの予期しない手動同期、public repoへのChatwork保存は行わない。復元機能「昨日の状態に戻して」は今回作らない。
- 濃いキャラクター（関西弁・執事風等）のプリセットは同梱しない。例ペアを育てる方法は本プラグインの必須導線にしない。
- genericな自動化HookやHarness Hookは同梱しない。例外はProject Clarityの成立に必須なcommand-only lifecycle hookだけであり、Clarity未初期化・未linked Repoでは高速no-op、manual Skill fallback必須、network／LLM／重い処理禁止とする。
- Notion TaskDBのproperty設計、relation、通常の作成・再読確認、DB正本を全面再設計しない。Sprint 038では承認済みの5問題を越えるNotion変更を行わない。
- 会話を自然にするために、削除・上書き・公開・push・認証・権限・課金・他者通知・大量操作・Secret保存の事前確認、path guard、atomic write、rollback、未確認外部状態の正直な表示を外さない。
- dashboard は G1 の完了条件にしない。sprint-012 で明示判断する。
- 常設Webアプリ、外部公開サーバー、汎用dashboardは作らない。例外としてChatwork／Google Chat設定用の共通ローカルwizardを提供する。
- public配布repoへのChatwork Repository Secret、同期workflow、room設定、履歴の配置は行わない。
- Chatwork専用のtest repo、または秘書・projectと分離したChatwork専用workspaceは作らない。
- `~/workspace/agentic-harness` を操作しない。編集だけでなくcheckout、commit、branch、remote変更、生成物作成、複製元利用、コマンド対象化を禁止し、上流参照はGitHubに限定する。
- GitHubのfork badge／parent relation、同じforkから上流へPRする導線は作らない。上流変更は本作業のスコープ外であり、将来あらためて明示承認された場合だけ `agentic-harness` 側の別branch / PR手順に分離する。
- Chatwork APIの100件より前を遡るバックフィル、全roomの無断同期、Chatworkへの投稿・編集・削除は行わない。
- 単発の見積書、一度きりの成果物、同じ会話で完了する作業を、形式だけのプロジェクトへ自動昇格させない。
- Sprint 017/018の履歴正本は改変しない。Google Chatの接続、OAuth、同期、設定画面はSprint 019/020だけで扱う。
- ShigApps共通の外部向けOAuthアプリ、Googleの外部公開審査を前提にした配布、サービスアカウント、Domain-Wide Delegationは初版で扱わない。
- Google ChatのDM／グループDM、全スペース自動選択、投稿・編集・削除、添付ファイル本文のダウンロード、取得済み履歴の自動削除は行わない。
- 無料の個人Googleアカウント向けの分岐、`External` Audience、Test users、公開審査の案内は扱わない。Google WorkspaceのGoogle Chatだけを正式サポートする。
- Browser Use、Chrome拡張機能、特定のブラウザ自動操作環境をGoogle Cloud準備の必須条件にしない。
- 会社別・相手別にGoogle Chat／Chatworkを自動判定するチャットルーティングは今回扱わない。
- 読み取り専用診断中のplugin更新、workspace書込み、migration、commit、push、設定の自動変更は行わない。
- 更新のために利用者のカスタマイズを無確認で上書きしない。自動push、履歴書換え、secretや私的内容を含む台帳は作らない。
- 配布前監査の残件を「既知の制限」として `0.7.0`へ持ち越さない。live gateを合成fixture、過去の成功run、片方のチャットだけの確認で代替しない。
- `0.6.0`以前の公開履歴、過去の監査記録、既存Git履歴を書き換えない。`0.7.0`のためにforce push、rebase、filter-repoを行わない。
- 利用者がローカル／private repo内の任意のJS／TS／shell／JSONを意図的に特殊構文・難読化・computed／escaped key・偽placeholderへ改変し、補助scannerを回避するケースの完全検出は保証しない。補助scannerを任意言語の万能parserへ拡張することもゴールにしない。
- 初期リリースでは、2 editionの同一workspaceへのco-installation、edition切替command、反対editionのledger／marker／履歴の移動・統合・自動削除を行わない。
- editionごとにChatwork／Google Chat wizard、skill名、command名、workspace root名、OAuth scope、migration filenameを分岐しない。
- `agentic-secretary` を設定項目だけ増やした万能版にしない。技術者向け差分は会話、診断、報告、developer handoffに限定する。
- `0.7.0 → 0.7.0` のsame-version bootstrap bridge、公開済み `0.7.0` のin-place差替え、同一versionの更新、version downgradeを提供しない。
- 未配布段階の初回0.8.0候補のために、旧0.7.0利用者向けexternal recovery／bootstrapを作らない。fixture削除や安全scan弱体化で旧updateを合格にしない。
- 公開済み `0.7.0` のrelease記録、manifest、migration、fixture、progress／feedback、Git履歴を `0.8.0` 前提へ書き換えない。
- Windowsネイティブ対応を理由に、Chatwork／Google Chat、Notion、my-vault固有機能、全外部CLIのWindows互換を一括して再設計しない。
- Windowsネイティブ対応を理由に、path guard、rollback、journal純追加、空上書き拒否、削除2段階を緩和しない。
- Windowsネットワーク共有path、すべてのUNC変種、WSL／Windows間の任意path相互変換は本Patchの保証範囲に含めない。
- 既存workspaceの名前オンボーディング確認を、user-scope registry／routingの有効化、rename、既存文書のgrep置換、push、release、Mac mini同期の許可へ拡張しない。
- Sprint 039 Patch 002では実HOME、installed cache、実下流repo、実利用者workspace、remote、GitHub Releaseを変更しない。3版PASS後のrelease／Mac mini同期と、release後の受講者向け文面は別の運用phaseとする。
- Sprint 040のsource／offline regression完了を、push、tag、GitHub Release、marketplace更新、installed cache、利用者workspace、Mac mini、release後の新sessionへ反映済みという意味に拡張しない。
- Project ClarityをJira／Linear／Notion／GitHub Issuesの代替、PJ内の生きた`TODO.md`、自動タスク起票、会議録・チャット本文の複製、単一の進捗率へ拡張しない。
- public版へprivate my-vault固有の`05/02` resolver、`vault/10_sources`実装、Notion TaskDB property／relation、private root guidanceを混ぜない。これらはpublic固定handoff後のprivate版別Harnessで扱う。
- Xmind integrationは明示ON／OFFを持ち、public AgenticとYasashiiは既定OFF、private my-vaultは既定ONとする。ON／OFF設定とprovider capability／priority／selected／reasonは別stateとし、ONだけでproviderを利用可能・検証済み・課金承認済みにしない。
- integration ONでXmind MCPが接続済み・利用可能・固定色と配置を含む必要capabilityを満たす場合はMCPを第1優先にする。MCP未接続／無効／capability不足／失敗／外部操作不承認では、理由、local代替、対象file／path、create／update、既存fileへの影響、sign-inとcredit見込みをpreviewし、利用者の明示承認後だけlocal native `.xmind`を書く。承認なし／cancelはwrite 0件で停止する。最初からlocalを明示指定した場合も同じwrite preview／confirmを省略しない。
- cloud map create／update、その他のexternal write、network、credit／課金消費はprovider、対象、予想影響を示した明示確認後だけ実行する。local Skill／CLIもsign-inやcreditが必要な場合があるため、「完全offline／無料」と断定しない。実external live未承認ではadapter contract／isolated fakeで実装境界を評価できるが、fakeでreal providerをverifiedにしない。
- Xmind MCP、local `.xmind`、表現可能なMermaidは、左上 🟢 定着・検証／安定している／`#16A34A`、右上 🔵 実行待ち／あとは進めるだけ／`#2563EB`、左下 🟡 暫定実装・要再確認／注意して確認する／`#D97706`、右下 🔴 設計・意思決定／人間の判断が必要／`#DC2626`の固定配置・固定色を守る。上軸は「決まっている」、下軸は「まだ決まっていない」。色だけでなくemoji／ラベル／意味文を併記する。
- Clarityがprojectsのcomplete／reopenなどproject lifecycle、memory-careの一般memory、dailyの予定・TODO、updateの更新判断を所有しない。関連Skillは責務を保ったままinput／output／routingだけをClarity-awareにする。
- 本計画ではpush、tag、GitHub Release、marketplace、installed cache、Mac mini、downstream実repoへの反映を行わない。
- `done-by-user-decision`というstate文字列、文脈から切り離した短い了承、別candidateへの承認転用だけでdownstream gateを開かない。handoff governance commitをaccepted product sourceとして置き換えず、実機未検証をPASSと表示しない。

## 承認済みの条件付き判断

- HookはProject Clarity専用とし、projects、daily、weekly、memory-care、updateその他のSkillへ独立Hookを追加しない。memory-careの自然会話選択はSkill description、secretary router、conversation contract、回帰で扱い、Hookが意味的な保存候補を自動判定しない。
- projectsはproject lifecycle、ClarityはDecision／Execution／Validation／Attention／Driftを所有する。この責務分離を保ったまま、project作成・表示・完了・再開・canonicalRepo link、daily、weekly、Portfolioのinput／output／routingをClarity-awareにする。
- Clarityからタスク化を暗黙実行しない。「タスク化して」の明示依頼だけを既存TODO／notion-tasksへ委譲し、その既存確認境界を維持する。
- secretary、projects、daily、weekly、notion-tasks、memory-care、build、update／release inventory、onboarding、templates、rules、host inventory、edition handoffを関連surfaceとして棚卸しし、Clarity正本の重複・暗黙外部操作・旧copyの再流入を回帰で防ぐ。外部connectorをClarityから自動実行しない。

- sprint-012時点では既存利用者の証跡がなかったため、journalディレクトリ追加とpreferences v1→v2のmigrationは作らなかった。今後の配布更新と既存workspace移行は、別Sprintであらためて扱う。
- 更新機能はSprint 017の読み取り専用基盤とSprint 018の実行に分ける。実更新の主体は秘書とするが、説明とユーザーの明示確認を必須にし、カスタマイズ済みファイルは「現状を残す」を既定とする。
- dashboard は timeline の利用反応を見て sprint-012 で実施可否を判断し、無断で追加しない。
- Google Chatは `1A` 各社所有Cloud project、`2A` 選択した通常スペースだけ、`3A` 同じprivate workspace＋GitHub Actionsで確定した。Chatworkと同じ3時間取得を推奨・初期値とし、DM、共通External app、サービスアカウントは初版で扱わない。
- 配布前監査は `1A` HighからLowまで全指摘を公開前に解消、`2A` 公開版 `0.7.0`として既存 `0.6.0`から安全更新、`3A` 自動回帰と専用private test workspaceのChatwork／Google Chat live gateを正式な合格条件、で確定した。追加質問は不要である。
- 2026-07-19、secret検査の保証境界を確定した。Google Chatのwizard memory→`gh` stdin→Repository Secretと、Chatworkの利用者本人によるGitHub Repository Secret画面への直接入力という既存の2導線、および製品管理対象／初回publish inventoryの合理的な誤混入を厳格に保護する。一方、利用者が意図的に難読化した任意コードの完全検出は非ゴールとし、それのみを理由に配布不合格としない。
- 2026-07-20、`0.7.0` の歴史記録は不変、まだ明示配布していない2 editionの最初のcandidate／latestは `0.8.0` と決定した。旧0.7.0利用者向けexternal recovery／bootstrapを作らず、旧scanner blockerを隠さない。same-version bridgeは採用せず、同一版とdowngradeは副作用0件で拒否する。
- 2026-07-20、Repo分割前に全会話のMarkdown可読性とChatwork Secretの具体的な `Name`／`Secret` 入力案内を共通実装する。改行は好みとして質問せず、両editionの思想・対象差は維持する。
- 2026-07-20、`agentic-secretary` の正式対象環境を Claude Code Desktop App／Claude Code CLI／Codex App／Codex CLI の4つと確定した。その他のコーディングエージェントは設計対象だが受入・保証・検証必須対象外とし、共通本体はホスト非依存、host固有部分だけをadapterに分け、対応対象と検証済みを別集計する。未検証環境を「対応済み」と表示しない。
- 2026-07-20、Sprint 032 Patch 002で、一般回答を固定3項目へ押し込まない分離、実会話runnerの安全化（env allowlist・最小ツール・workspace内fixture・cleanup）、完了報告テストの誤合格解消、wizard進捗一貫性、GitHub用語の初出説明、serializer正本の明確化、yasashii向け `ルーム` 表記統一を確定した。設定確認の `key=value` 表現改善はSprint 034へ延期する。
- 2026-08-14、利用者の呼び方と別に秘書自身の英語名とstable identityを持たせる方針を承認した。初回／既存利用者向けSkill、安全なrename、明示opt-inのuser-scope routing、canonical workspace解決を共通コアにし、Agentic PASS後にYasashiiとprivate my-vaultを別Sprintで評価する。
- 2026-08-14、公開済み`0.10.0`ではplugin更新だけで既存workspaceのidentity管理節と台帳が新規導入相当にならない欠陥を確認し、`0.10.1`の通常Patchで修正する方針を承認した。Agentic固定handoff後にYasashii／privateを別評価し、3版PASS後だけrelease、Mac mini同期、受講者向け案内へ進む。
