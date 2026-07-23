# Codex App adapter

正式な配布面は、repo rootの `.agents/plugins/marketplace.json` と
`plugins/secretary/.codex-plugin/plugin.json` です。

1. Codex AppのPlugins Directoryで `agentic-secretary` marketplaceを追加または選択する。
2. plugin detailsから `agentic-secretary` をinstallする。
3. install後に新しいchatを開始する。
4. `$secretary` または自然な依頼で、共通のbundled skillsが読まれることを確認する。

更新ではPlugins Directoryの実際の更新操作に従い、installed versionと新しいchatへの反映を確認します。
cache directoryは直接編集しません。`AGENTS.md`、skills手動コピー、`config.toml` はrepository-localの
authoring・隔離test・fallbackだけに使い、正式pluginのPASS根拠にはしません。

Codex Appは2026-07-22に実利用で確認済みです。配布版v0.8.0の共通core `891eabc` を取り込んだ
private downstreamも正式なCodex Plugin経路で使用し、
ユーザーが実環境での動作を確認しました。現在のstatusは `verified` です。

connector認証、OAuth、Repository Secret、GitHub Actions、外部chat同期も実環境で確認済みです。
