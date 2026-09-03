# はじめ方（インストールと初回セットアップ）

`agentic-secretary` はClaude CodeとCodexの両方で使えます。どのhostでも、install後は新しいchat／sessionを
開始してから秘書を呼び出します。

## Claude Code Desktop App／CLI

Claude Codeで次を上から順に実行します。

```text
# 1. 配布元を登録する
/plugin marketplace add mtaiseeei/agentic-secretary

# 2. pluginをinstallする
/plugin install agentic-secretary@agentic-secretary

# 3. 新しいsessionで秘書を呼ぶ
/secretary
```

Desktop AppでもCLIでも `.claude-plugin` の正式manifest／marketplaceを使います。

## Codex App

1. Plugins Directoryで `agentic-secretary` marketplaceを追加または選択します。
2. plugin detailsから `agentic-secretary` をinstallします。
3. 新しいchatを開始します。
4. `$secretary` または「初回セットアップを始めて」のような自然な依頼で呼び出します。

## Codex CLI

Codex CLI 0.144.6で確認した主導線です。

```bash
# 1. GitHub repositoryをmarketplace sourceとして登録する
codex plugin marketplace add mtaiseeei/agentic-secretary --ref main

# 2. marketplaceからpluginをinstallする
codex plugin add agentic-secretary@agentic-secretary

# 3. installed stateを確認する
codex plugin list --marketplace agentic-secretary
```

続いて新しいCLI sessionを開始し、`$secretary` または自然な依頼で呼び出します。`/plugins` browserから
同じmarketplaceを選んでinstall／enableする方法もあります。

`AGENTS.md`、skills手動コピー、`config.toml` はrepository-localの開発・隔離test・fallback用です。
正式なCodex plugin導入の代わりにはなりません。

## 0.11.0 source candidateについて

Project Clarityを含む現在のpublic source candidateは`0.11.0`です。source、manifest、CHANGELOG、
inventory、clean checkout／Git-free archiveの検査対象を示す版であり、まだtag、GitHub Release、
marketplace公開・refresh、installed cache、新しいsessionのloaded versionではありません。
public版のsource candidateと、private版やYasashii版のinstalled version／評価状態は別々に扱います。

## 初回セットアップ

最初に秘書を呼ぶと、呼び方、主に使うサービス、任せたいこと、役割、報告の詳しさを確認します。
回答後、現在のworkspaceに次の共通構造を作ります。

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
別repositoryを作る前に現在のrepositoryを使うか確認します。Chatwork／Google Chatは、あとから選んだ対象だけを
このprivate repositoryへ保存します。

セットアップ後は、次のように依頼できます。

- 「今日やることを整理して、判断材料も示して」
- 「このerrorを診断して、commandとpathを含むhandoffにして」
- 「Chatworkにつなぎたい」または `/chatwork`
- 「Google Chatにつなぎたい」または `/google-chat`

既存の `secretary/` がある状態で作り直す場合は、いきなり上書きしません。現在のedition、ledger、
workspace状態を診断し、保護と確認を行ってから進めます。
