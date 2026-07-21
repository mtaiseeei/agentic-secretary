---
name: setup-microsoft
description: >
  Microsoft 365（Outlook のメール・予定表、OneDrive、Teams）を秘書につなぐ案内。現在のhostが提供する
  公式コネクタ／Appで接続する。「Microsoft につなぎたい」「Outlook／Teams を見て」等で呼び出す。
---

# Microsoft 365 接続ガイド（setup-microsoft）

## plugin root（必須）

このSKILL.mdの実ファイル絶対pathを `SECRETARY_SKILL_FILE` に入れ、最初に1回だけ解決する。
空・相対path・未解決placeholderならcommandへ渡さず停止し、cwdやhost固有の環境変数から推測しない。

```bash
SECRETARY_SKILL_FILE="<このSKILL.mdの実ファイル絶対path>"
case "$SECRETARY_SKILL_FILE" in /*/skills/*/SKILL.md) ;; *) exit 2 ;; esac
SECRETARY_PLUGIN_ROOT="$(node "$(dirname "$SECRETARY_SKILL_FILE")/../../scripts/resolve-plugin-root.mjs" --skill-file "$SECRETARY_SKILL_FILE")" || exit 2
```

以後の共通file参照は `${SECRETARY_PLUGIN_ROOT}` を使う。

Outlook（メール・予定表）・OneDrive・Teams を秘書が参照できるようにする案内です。
**接続は現在のhostが提供する公式コネクタ／App（OAuth＝アプリ同士を安全につなぐ仕組み）で行います。**
むずかしい開発者向けの下準備（管理画面での登録や鍵の発行）は**一切要りません**。設定画面のボタン操作だけで完結します。

- Claude CodeではClaudeの接続設定を案内する。
- Codexでは利用可能なMicrosoft App／connectorを確認し、hostに無ければ `未確認` と伝えて停止する。
- 一方のhostの画面名、再起動手順、接続済み判定を他方へ推測適用しない。

`${SECRETARY_PLUGIN_ROOT}/rules/plain-language.md` と、存在する場合は
`secretary/memory/preferences.md` を読む。案内内容と安全条件だけをrouterへ返し、
通常報告を独自に包装しない。最終出力形は同rule入口から解決される「最終応答serializer」だけを正本とする。

## はじめに一言（予告と不安の先回り）

始める前に、何をするか・途中で一度 Claude を再起動するかもしれないことを予告する。例:

> これから Microsoft 365（Outlook のメール・予定表）を秘書につなぎます。
> 設定画面でボタンを押して許可するだけです（3分ほど）。途中で一度アプリの再起動をお願いすることがあります。

## ステップ0: 再起動しおりを書く（中断に備える・計画）

接続は Claude の再起動を挟むことがある。**設定に進む前に**、記憶ケアのしおり機能で「いま接続の途中」という文脈を残す。
これで再起動して会話が途切れても、戻ってきたときに秘書のほうから続きを案内できる。

```
${SECRETARY_PLUGIN_ROOT}/skills/memory-care/scripts/memory-tools.sh resume-write <secretary> \
  "Microsoft接続の設定" "設定画面でMicrosoftコネクタを有効化→許可" "どのMicrosoftアカウントでログインするか"
```

（`<secretary>` は作業中フォルダの `secretary/`。しおりの詳しい扱いは `${SECRETARY_PLUGIN_ROOT}/skills/memory-care/SKILL.md` の「3. 再起動しおり」に従う。）

## ステップ1: 設定画面から公式コネクタを有効にする（道具）

Claude の**設定画面 → コネクタ（Connectors）**を開き、Microsoft 365 を有効にして、表示に沿って Microsoft アカウントでログイン・許可する。
これで次が使えるようになる。

- **Outlook**（メール・予定表）
- **OneDrive**（ファイル）
- **Teams**（チャット）

- ログインは「見る人を制限する」ための本人確認です。使うアカウントを1つ決めて、それでログインしてください（仕事用と個人用がある人は取り違えに注意）。
- ここで扱うのは公式のつなぎ方だけです。パスワードやトークン（接続用の合言葉のような文字列）を秘書フォルダに書き込むことはありません（安全のため、記憶には保存しません）。

もし「再起動してください」と表示されたら、ステップ0でしおりを書いてあるので安心して再起動してよい旨を伝える。

## ステップ2: つながったかを確認する（確認）

つながったかを、軽い読み取りで一度だけ確かめる。例:

- 予定表: 「直近の予定を1件だけ見せて」と試す（今日〜数日先の予定が1件読めれば OK）。
- メール: 「未読の件名を1つだけ教えて」と試す。

読めたら「つながりました」と伝える。まだ読めない場合はステップ3へ。

## ステップ3: うまくいかないときの言い換え（英語エラーをそのまま出さない）

コネクタが英語のエラーを返しても、**そのまま見せない**。「何が起きて・どうすれば直るか」に言い換えてから示す。
原因を決めつけず、まず実際のエラーで原因を確かめてから案内する（実エラーで原因確定 → 日常語で案内）。言い換えの型と例:

| 実際に起きがちなこと（英語表示の例） | 日常語での言い換えと直し方 |
|---|---|
| まだ許可していない（not authorized / consent required） | 「接続の許可がまだのようです。設定画面のコネクタで Microsoft を有効にし、ログイン画面で『許可』を押してください。」 |
| 別アカウントでログインした（wrong account / tenant） | 「別の Microsoft アカウント（仕事用/個人用）でログインしているかもしれません。使いたいアカウントでログインし直すと直ります。」 |
| 期限切れ・つなぎ直しが必要（expired / reconnect） | 「接続の有効期限が切れたようです。設定画面でもう一度つなぎ直すと直ります。」 |
| 接続そのものが無い（not connected / no connector） | 「まだ Microsoft がつながっていません。設定画面のコネクタから有効にしましょう。」 |

英語の原文が必要なときは、言い換えの後ろに小さく添えるだけにする。

## ステップ4: 完了時にrouterへ返す内容

- 実コネクタの読み取りで確認できたサービスと状態。
- 外部データ本文をローカルに保存していないこと。
- ユーザーが選べる次の操作を1つまで。

実コネクタの成功結果が無ければ接続済みと断定しない。ここでは通常報告を作らず、
内容と安全条件だけをrouterへ返し、出力形は`plain-language.md` から解決される「最終応答serializer」に任せる。

接続が完了したら、記憶ケアのしおりを閉じる（`memory-tools.sh resume-clear <secretary>`）。

## やらないこと（この案内の範囲）

- 開発者向けの下準備（管理画面での登録・鍵の発行）は案内しない。公式コネクタだけで完結する。
- Google / Notion の接続はこの案内では扱わない（別途）。国内チャット（Chatwork / LINE 等）はまだ対応していない。
- トークン・パスワード・鍵ファイルを秘書ディレクトリ（`secretary/`）に保存・コミットしない。

## 参照

- 言葉づかいルール（必読）: `${SECRETARY_PLUGIN_ROOT}/rules/plain-language.md`
- 再起動しおり: `${SECRETARY_PLUGIN_ROOT}/skills/memory-care/SKILL.md`
- 接続の状態を確認: `${SECRETARY_PLUGIN_ROOT}/skills/connections/SKILL.md`
