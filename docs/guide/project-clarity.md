# Project Clarity

Project Clarityは、プロジェクトの現在地を1つのMarkdown正本へまとめ、Attention、投影、repo間link、Driftを確認する機能です。
`0.11.0`ではpublic Agentic版のsource candidateとして収録しています。まだtag、GitHub Release、marketplace、installed cache、
新しいsession、Yasashii版、private版へは反映していません。

## 基本command

Clarity Skillを呼び出し、次のいずれかを依頼します。

- `status`: 正本とAttentionを読み取り専用で確認する。
- `attention`: 期限、blocker、未決定、Drift候補を確認する。
- `review`: 正本と投影のずれを確認する。
- `checkpoint`: 表示した差分と対象を確認した後だけ正本を更新する。
- `doctor`: Hook、path、schema、投影providerの状態を診断する。

Hookを利用できるhostでは、`SessionStart`、`PostToolUse`、`PreCompact`、`Stop`、`SessionEnd`から同じ共通routerへ接続します。
Hookが無効、未信頼、未対応のときは、上記の手動commandを使います。手動fallbackは「自動処理が使えないときの代替経路」であり、
未検証のhostを検証済みにするものではありません。

## Xmind投影

public Agentic版とYasashii版のXmind integrationは既定OFFです。private my-vault版だけがhandoff後の既定ON候補ですが、
実際の有効化と評価は下流の別Harnessで行います。

providerは次の順で扱います。

1. Xmind MCP。接続状態とcreate/read/update、固定色、固定配置のcapabilityを確認してから選択します。
2. local `.xmind`。MCPが利用できない場合でも自動選択しません。previewを先に示し、明示承認後だけ書きます。

承認なしのlocal writeは行いません。投影は次の4区画を固定します。

| 位置 | 色 | 意味 |
|---|---|---|
| 左上 | 緑 `#16A34A` | 定着・検証 |
| 右上 | 青 `#2563EB` | 実行待ち |
| 左下 | 黄 `#D97706` | 暫定実装・要再確認 |
| 右下 | 赤 `#DC2626` | 設計・意思決定 |

## hostの状態表示

Claude Code Desktop／CLI、Codex App／CLIはそれぞれ別のsurfaceとして扱います。`supported`（対応設計）、
`verified`（そのsurfaceで実機確認済み）、`degraded`（Hookを使えず手動fallback等へ退避）を混ぜません。
candidate `0.11.0`では4 surfaceとも実機検証前なので、対応設計であっても`verified: false`です。
