---
name: setup-notion
description: >
  Notion を秘書につなぐ任意の案内。使っている人だけ繋げばよい（未接続でも他の機能は普通に使える）。
  現在のhostが提供する公式コネクタ／Appで接続する。「Notion につなぎたい」等で呼び出す。
---

# Notion 接続ガイド（setup-notion・任意）

## plugin root（必須）

このSKILL.mdの実ファイル絶対pathを `SECRETARY_SKILL_FILE` に入れ、最初に1回だけ解決する。
空・相対path・未解決placeholderならcommandへ渡さず停止し、cwdやhost固有の環境変数から推測しない。

```bash
SECRETARY_SKILL_FILE="<このSKILL.mdの実ファイル絶対path>"
case "$SECRETARY_SKILL_FILE" in /*/skills/*/SKILL.md) ;; *) exit 2 ;; esac
SECRETARY_PLUGIN_ROOT="$(node "$(dirname "$SECRETARY_SKILL_FILE")/../../scripts/resolve-plugin-root.mjs" --skill-file "$SECRETARY_SKILL_FILE")" || exit 2
```

以後の共通file参照は `${SECRETARY_PLUGIN_ROOT}` を使う。

Notion を秘書が参照できるようにする**任意**の案内です。**使っている人だけ繋げば大丈夫**で、
繋がなくても「今日やること」や記憶、Google / Microsoft の接続はそのまま使えます。
**接続は現在のhostが提供する公式コネクタ／App（OAuth＝アプリ同士を安全につなぐ仕組み）で行います。**
むずかしい開発者向けの下準備は要りません。設定画面のボタン操作だけで完結します。

- Claude CodeではClaudeの接続設定を案内する。
- Codexでは利用可能なNotion App／connectorを確認し、hostに無ければ `未確認` と伝えて停止する。
- 一方のhostの画面名、再起動手順、接続済み判定を他方へ推測適用しない。

`${SECRETARY_PLUGIN_ROOT}/rules/plain-language.md` と、存在する場合は
`secretary/memory/preferences.md` を読む。案内内容と安全条件だけをrouterへ返し、
通常報告を独自に包装しない。最終出力形は同rule入口から解決される「最終応答serializer」だけを正本とする。

## 任意です（使わないなら素通りしてよい）

- Notion を使っていない人は、この案内を飛ばして構いません。他の機能には影響しません。
- 「あとで」でも大丈夫です。必要になったらいつでも「Notion につなぎたい」と言ってください。

## ステップ0: 再起動しおりを書く（中断に備える）

設定は Claude の再起動を挟むことがある。設定に進む前に、しおりで文脈を残す。

```
${SECRETARY_PLUGIN_ROOT}/skills/memory-care/scripts/memory-tools.sh resume-write <secretary> \
  "Notion接続の設定" "設定画面でNotionコネクタを有効化→許可" "どのNotionワークスペースを使うか"
```

## ステップ1: 設定画面から公式コネクタを有効にする

Claude の**設定画面 → コネクタ（Connectors）**を開き、Notion（`mcp.notion.com`）を有効にして、表示に沿ってログイン・許可する。
使いたい Notion ワークスペースを選ぶ。パスワードやトークンを秘書フォルダに保存することはありません。

## ステップ2: つながったかを確認する

- 「Notion のページを1つだけ探して」と試す。1件見つかれば OK。

## ステップ3: うまくいかないときの言い換え（英語エラーをそのまま出さない）

英語エラーはそのまま見せず、「何が起きて・どうすれば直るか」に言い換える（実エラーで原因確定 → 日常語で案内）。

| 実際に起きがちなこと（英語表示の例） | 日常語での言い換えと直し方 |
|---|---|
| まだ許可していない（not authorized） | 「接続の許可がまだのようです。設定画面のコネクタで Notion を有効にし、『許可』を押してください。」 |
| ページを共有していない（no access / not shared） | 「秘書に見せたいページがまだ共有されていないかもしれません。Notion 側で対象ページの共有を確認してください。」 |
| 期限切れ・つなぎ直し（expired / reconnect） | 「接続の有効期限が切れたようです。設定画面でもう一度つなぎ直すと直ります。」 |

## ステップ4: 完了時にrouterへ返す内容

- 実コネクタの読み取りで確認できたNotionの状態。
- 外部データ本文をローカルに保存していないこと。
- Notionが任意であることと、ユーザーが選べる次の操作を1つまで。

実コネクタの成功結果が無ければ接続済みと断定しない。ここでは通常報告を作らず、
内容と安全条件だけをrouterへ返し、出力形は`plain-language.md` から解決される「最終応答serializer」に任せる。

接続が終わったら、しおりを閉じる（`memory-tools.sh resume-clear <secretary>`）。

## 参照

- 言葉づかいルール（必読）: `${SECRETARY_PLUGIN_ROOT}/rules/plain-language.md`
- 再起動しおり: `${SECRETARY_PLUGIN_ROOT}/skills/memory-care/SKILL.md`
- 接続の状態を確認: `${SECRETARY_PLUGIN_ROOT}/skills/connections/SKILL.md`
