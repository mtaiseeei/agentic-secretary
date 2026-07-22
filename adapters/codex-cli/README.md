# Codex CLI adapter

正式な配布面は、repo rootの `.agents/plugins/marketplace.json` と
`plugins/secretary/.codex-plugin/plugin.json` です。Codex CLI 0.144.6で確認した新規導入は次の順序です。

```bash
codex plugin marketplace add mtaiseeei/agentic-secretary --ref main
codex plugin add agentic-secretary@agentic-secretary
codex plugin list --marketplace agentic-secretary
```

install後は新しいCLI sessionを開始し、`$secretary` または自然な依頼で呼び出します。`/plugins` browserから
同じmarketplaceを選んでinstall／enableすることもできます。

Git marketplaceのsnapshotを更新するときは次を実行します。

```bash
codex plugin marketplace upgrade agentic-secretary
codex plugin add agentic-secretary@agentic-secretary
```

現行hostにplugin単体の自動upgradeがあるとは主張しません。marketplace refreshと再installを分け、
installed versionを確認してから新しいsessionを開始します。cache directoryは直接編集しません。

`AGENTS.md`、skills手動コピー、`config.toml` はrepository-localのauthoring・隔離test・fallbackだけに使い、
正式pluginのPASS根拠にはしません。Codex CLIは2026-07-22にユーザーがv0.8.0共通core `891eabc`の
実環境動作を確認済みで、現在のstatusは `verified` です。connector認証、OAuth、Repository Secret、
GitHub Actions、外部chat同期も実環境で確認済みです。
