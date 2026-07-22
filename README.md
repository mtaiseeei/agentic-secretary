# agentic-secretary — 技術者向けAI秘書

**技術者・AI活用に慣れた利用者向けのAI秘書プラグイン**（public、MIT）です。Claude CodeとCodexで利用でき、
判断の根拠、command、path、error、残課題を省略せず、次の作業へつなげやすい形で返します。

メール・予定・ファイルは各サービスに置いたまま公式コネクタで都度参照します。一方、秘書の記憶、
成果物、継続するプロジェクト、選択したChatworkルームとGoogle Chat通常スペースの履歴は、
利用者ごとの1つのprivate GitHub repositoryで管理します。

---

## まず使ってみる

### これは何？

`agentic-secretary` は、会話だけで次の仕事を進められるAI秘書です。

- 決定・好み・作業の中断点を記録し、**前回の続き**から再開する。
- 予定とローカルTODOを突き合わせ、**今日やること**を根拠つきで整理する。
- 一度で終わらない仕事を、確認後に**プロジェクトとして管理**する。
- Gmail、Google Calendar、Google Drive、Microsoft 365、Notionを**公式コネクタで参照**する。
- 選択したChatworkルームとGoogle Chat通常スペースだけを取得し、保存済み履歴を検索する。
- 「診断して」「引き継ぎにして」で、正式名称や実行結果を含む**技術的なhandoff**を作る。
- 「〇〇を作って」で、別プラグイン `agentic-harness` の**計画 → 実装 → 独立評価**へ接続する。
- 「更新ある？」で変更の影響を読み取り専用で診断し、了承後だけ安全に更新する。

基本方針は、**外部データは各サービスに置いたまま参照し、秘書が育てる情報と選択したチャット履歴だけをprivate repositoryへ残す**ことです。

### インストール

対応するhostは次の4つです。

| Host | 呼び出し方 | 詳細 |
|---|---|---|
| Claude Code Desktop App | `/secretary` | [導入ガイド](adapters/claude-code-desktop-app/README.md) |
| Claude Code CLI | `/secretary` | [導入ガイド](adapters/claude-code-cli/README.md) |
| Codex App | `$secretary` または自然な依頼 | [導入ガイド](adapters/codex-app/README.md) |
| Codex CLI | `$secretary` または自然な依頼 | [導入ガイド](adapters/codex-cli/README.md) |

#### Claude Code Desktop App／CLI

Claude Codeで次を上から順に実行します。

```text
# 1. 配布元を登録する
/plugin marketplace add mtaiseeei/agentic-secretary

# 2. pluginをinstallする
/plugin install agentic-secretary@agentic-secretary

# 3. 新しいsessionで秘書を呼ぶ
/secretary
```

#### Codex App

1. Plugins Directoryで `agentic-secretary` marketplaceを追加または選択します。
2. plugin detailsから `agentic-secretary` をinstallします。
3. 新しいchatを開始します。
4. `$secretary` または「初回セットアップを始めて」と依頼します。

#### Codex CLI

```bash
# 1. GitHub repositoryをmarketplace sourceとして登録する
codex plugin marketplace add mtaiseeei/agentic-secretary --ref main

# 2. marketplaceからpluginをinstallする
codex plugin add agentic-secretary@agentic-secretary

# 3. installed stateを確認する
codex plugin list --marketplace agentic-secretary
```

続いて新しいCLI sessionを開始し、`$secretary` または自然な依頼で呼び出します。

### 初回セットアップ

最初に秘書を呼ぶと、呼び方、主に使うサービス、任せたいこと、仕事・役割、報告の詳しさを確認します。
回答後、現在のworkspaceに `secretary/` を作り、記憶や成果物を保存できる状態にします。

```text
secretary/
├── AGENTS.md
├── CLAUDE.md
├── inbox/
├── docs/
├── projects/
└── memory/
```

最後に1つのprivate GitHub repositoryを作り、最初のcommitとpushまで進めます。既存remoteがある場合は、
別repositoryを作る前に現在のrepositoryを使うか確認します。ChatworkとGoogle Chatは、あとから選んだ対象だけを
同じprivate repositoryへ保存します。

セットアップ後は、たとえば次のように依頼できます。

- 「今日やることを整理して、判断材料も示して」
- 「このerrorを診断して、commandとpathを含むhandoffにして」
- 「この案件をプロジェクトにして」
- 「Chatworkにつなぎたい」
- 「Google Chatで先週の話を探して」
- 「接続状態を診断して」

## できること

| やりたいこと | 呼び方の例 | Skill |
|---|---|---|
| 秘書の窓口・初回セットアップ | `/secretary`、`$secretary` | `secretary` / `onboarding` |
| 覚える・守る・前回の続き | 「覚えて」「消して」「前回の続き」 | `memory-care` |
| 今日の予定とTODOを整理 | 「今日やること」「段取りを組んで」 | `daily` |
| 継続する仕事を管理 | 「この案件をプロジェクトにして」 | `projects` |
| 口調・専門用語・報告量を変更 | 「設定変えたい」「詳しく報告して」 | `settings` |
| 今週の活動・決定・申し送りを整理 | 「今週を振り返って」 | `weekly` |
| Googleを接続 | 「Googleにつなぎたい」 | `setup-google` |
| Microsoft 365を接続 | 「Microsoftにつなぎたい」 | `setup-microsoft` |
| Notionを接続 | 「Notionにつなぎたい」 | `setup-notion` |
| Chatworkを接続・検索 | `/chatwork`、「Chatworkで探して」 | `chatwork` |
| Google Chatを接続・検索 | `/google-chat`、「Google Chatで探して」 | `google-chat` |
| 接続状態を診断 | 「繋がってる？」「診断して」 | `connections` |
| アプリや機能の開発へ接続 | 「〇〇を作って」「実装して」 | `build` |
| 更新状況を確認 | 「更新ある？」「最新版にして」 | `update` |

詳しい使い方は[公開向けガイド](docs/guide/README.md)に分けています。

### Chatworkをつなぐ

`/chatwork` または「Chatworkにつなぎたい」と依頼すると、設定画面が開きます。保存するルームと取得間隔を選び、
保存内容とGitのcommit・pushを確認した後だけ、初回取得や自動取得を開始します。

![Chatworkのルーム、取得間隔、保存内容を確認する設定画面。表示内容はサンプルです。](docs/assets/chatwork-settings-review.png)

<details><summary>設定と安全性の詳細を見る</summary>

1. Chatwork公式画面でAPI Tokenを取得します。Tokenを使えない組織では、管理者によるAPI利用承認が必要です。
2. wizardから、現在のprivate repositoryのGitHub Repository Secret追加画面を開きます。
3. `Name` に `CHATWORK_API_TOKEN`、`Secret` に本人が取得したAPI Tokenを入力します。Token値をwizardや会話へ貼る必要はありません。
4. 登録確認後だけルーム一覧を取得し、保存するルームと取得間隔を選びます。
5. 保存対象、自動取得、commit・pushの内容を確認し、同意後だけ設定を反映します。

初回取得は選択した各ルームの最新100件以内です。検索で見つからない場合も、導入前、取得範囲より前、
未選択ルームの可能性があるため、「Chatworkに存在しない」とは断定しません。自動取得を選ばない場合は手動だけで利用できます。

- [ChatworkでAPI Tokenを取得する](https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php)
- [API Tokenの発行方法](https://help.chatwork.com/hc/ja/articles/115000172402-API%E3%83%88%E3%83%BC%E3%82%AF%E3%83%B3%E3%82%92%E7%99%BA%E8%A1%8C%E3%81%99%E3%82%8B)

</details>

### Google Chatをつなぐ

Google Workspace版Google Chatに対応しています。`/google-chat` または「Google Chatを設定したい」と依頼すると、
Google Cloudの準備から案内します。接続後は、選択した通常スペースだけを取得・検索できます。

![Google Chatの通常スペース、取得間隔、保存内容を確認する設定画面。表示内容はサンプルです。](docs/assets/google-chat-settings-review.png)

<details><summary>設定と安全性の詳細を見る</summary>

Google Workspace組織が所有するGoogle Cloud projectで、Google Chat API、People API、Audience `Internal`、
Application type `Desktop app` のOAuth clientを準備します。管理者またはCloud project作成権限者の操作が必要な場合があります。

接続用JSONを取得した後、ローカルwizardでファイルを選び、別タブでGoogleの接続を許可します。OAuthは
`chat.spaces.readonly`、`chat.messages.readonly`、`contacts.readonly` だけを要求します。client secret、
認可コード、access token、refresh token、client JSON全文を会話・画面・repositoryへ保存しません。

候補に出すのは `spaceType=SPACE` の通常スペースだけです。DMとグループDMは取得しません。保存するスペース、
取得間隔、保存内容、共同編集者への可視性、Gitのcommit・pushを確認し、同意後だけ初回取得と自動取得を設定します。

- [ユーザーとしてGoogle Chat APIを認証する](https://developers.google.com/workspace/chat/authenticate-authorize-chat-user)
- [OAuth同意画面とscope分類](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [Desktop appのloopback OAuth](https://developers.google.com/identity/protocols/oauth2/native-app)

</details>

## データの置き方と安全性

| データ | 置き場 | 扱い |
|---|---|---|
| メール・予定・外部ファイル | Gmail、Google Calendar、Drive、Microsoft 365、Notionなど | 公式コネクタで都度参照し、全文同期しない |
| 決定・好み・作業の中断点 | private repository内 `secretary/memory/` | 境界を確認して読み書きし、Gitで履歴を残す |
| 成果物 | private repository内 `secretary/docs/` | 日付とタイトルを付けて保存する |
| 継続するプロジェクト | private repository内 `secretary/projects/` | 確認後に作り、別の日も現在地から再開する |
| 選択したChatworkルーム | 同じprivate repository内 `chatwork/` | Repository SecretとGitHub Actionsを使う |
| 選択したGoogle Chat通常スペース | 同じprivate repository内 `google-chat/` | OAuthとGitHub Actionsを使う |

主な安全上の約束は次のとおりです。

- workspaceの書き込みは確認済みrootに限定し、symlinkを使った境界外への書き込みを拒否する。
- Chatwork API TokenやGoogle OAuthの資格情報を、会話・ログ・repositoryへ保存しない。
- Chatworkは選択したルーム、Google Chatは選択した通常スペースだけを読み取る。
- 診断は読み取り専用で行い、更新や外部同期は対象と影響を示してから進める。
- 同一versionやdowngradeの更新要求では、plugin、workspace、Git、設定を変更せず停止する。

## 更新を確認する

「更新ある？」と依頼すると、現在版、最新版、主な変更、設定やカスタマイズへの影響を読み取り専用で確認します。
更新は、対象と復元方法を示して了承を得た後だけ開始します。変更内容の正本は
[CHANGELOG](plugins/secretary/CHANGELOG.md)です。

現在のmanifest versionは **[v0.8.0](https://github.com/mtaiseeei/agentic-secretary/releases/tag/v0.8.0)** です。
旧 `0.7.0` updaterには既知の停止要因があるため、
`0.7.0 → 0.8.0` のlive updateは保証していません。該当する場合は、新規導入を含む安全な移行方法を確認してください。

## 現在の対象外

- LINEなど、Chatwork／Google Chat以外のチャット履歴取得。
- Chatwork／Google Chatへの投稿・編集・削除。
- Google Chat添付ファイル本文の取得。
- 公式コネクタで参照するメールやファイルのローカル全文同期。

---

## 仕組みと設計

### Repository構成

```text
agentic-secretary/
├── .claude-plugin/marketplace.json   # Claude Code marketplace
├── .agents/plugins/marketplace.json  # Codex repository marketplace
├── plugins/secretary/                # host共通のplugin本体
│   ├── .claude-plugin/               # Claude Code manifest
│   ├── .codex-plugin/                # Codex manifest
│   ├── rules/                        # 安全性・証拠・会話表現の規則
│   ├── skills/                       # 各機能のskill
│   ├── scripts/                      # workspace・更新・OAuth・同期処理
│   └── templates/                    # 生成するsecretary directoryの雛形
├── adapters/                         # host別の導入面
│   ├── claude-code-desktop-app/
│   ├── claude-code-cli/
│   ├── codex-app/
│   └── codex-cli/
└── docs/
    ├── guide/                        # 利用者向けガイド
    ├── spec/                         # 製品仕様
    ├── sprints/                      # 開発契約と状態
    ├── progress/                     # 実装handoff
    └── feedback/                     # 独立評価
```

hostごとにskillを複製せず、`plugins/secretary/skills/` を共通で使います。host固有の違いは、配布manifestと
adapterに閉じ込めています。各skillは読み込まれた `SKILL.md` の絶対pathからplugin rootを解決し、
空path、相対path、現在directoryからの推測をcommandへ渡しません。

### Agentic Harnessとの連携

アプリや複数段階の機能開発は、別プラグイン
[Agentic Harness 0.5.0](https://github.com/mtaiseeei/agentic-harness)へ接続します。Secretary本体にHarnessを同梱せず、
`build` skillが現在のhostに合う導入方法を案内します。

| Host | Marketplace | Install ID | 明示的な入口 |
|---|---|---|---|
| Claude Code | `agentic-harness` | `harness@agentic-harness` | `/harness` |
| Codex | `agentic-harness-local` | `harness@agentic-harness-local` | `$using-harness` / `$harness-loop` |

通常は「〇〇を作って」「この機能を実装して」と依頼するだけで、Planner → Generator → Evaluatorのループへ接続します。

### 技術資料

- [使い方](docs/guide/README.md)
- [設計方針](docs/DESIGN.md)
- [詳細仕様](docs/spec.md)
- [host固有の前提](plugins/secretary/host-inventory.json)
- [yasashii-secretaryとの境界](docs/agentic-upstream-mapping.md)

## yasashii-secretaryとの関係

このrepositoryは技術者向けの上流editionです。
[yasashii-secretary](https://github.com/mtaiseeei/yasashii-secretary)は、共通の安全機能と実装を引き継ぎ、
非エンジニア向けの表現を狭いoverlayとして重ねる下流editionです。各repositoryのREADME、仕様、Sprint、
progress、feedback、evidence、LICENSEは、それぞれが所有します。

## ライセンスとクレジット

- License: [MIT](LICENSE)
- Original author credit: [Shin-sibainu/cc-company](https://github.com/Shin-sibainu/cc-company)（MIT）
