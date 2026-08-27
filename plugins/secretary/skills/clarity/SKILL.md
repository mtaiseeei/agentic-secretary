---
name: clarity
description: Project Clarityを安全に初期化し、人間が考える必要のあるAttention、決定×実行の現在状態、Markdown／Mermaid／Xmind投影、履歴、checkpoint、診断、schema移行を扱う。「クラリティを初期化」「今のClarity状態」「今考えること」「Clarity map」「決定を確定」「Clarity履歴」「Clarityを診断」で使う。
---

# Project Clarity

Project ClarityはTODO一覧ではありません。Decision、Execution、Validationと根拠を分け、「何が決まり、何が実行され、どこに人間の判断が要るか」を扱います。

## 初期化

1. 最初は必ずread-only previewを実行する。

   ```bash
   node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" init "<repo-root>" --json
   ```

2. Project名、Repo identity、Item候補、作成予定path、競合、除外・未確認範囲を利用者へ示す。
3. 利用者が明示確認した後だけ `--apply` を付ける。取消では `--cancel` を使い、副作用0件で終える。
4. `.env`、credential、binary、巨大file、symlink先は候補本文として読まない。既存`CLARITY.md`は上書きしない。

## 手動fallback

Hookが無効・未信頼・失敗でも、次は完全に手動で使える。

```bash
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" status "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" attention "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" review "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" attention-override "<repo-root>" --item-id "<item-id>" --level "<level>" --reason "<reason>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" history "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" checkpoint "<repo-root>" --operation-id "<stable-operation-id>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" rebuild "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" doctor "<repo-root>" --json
```

`rebuild`はEvent／EvidenceからStateを再生成します。Stateやquadrantの手編集をDecision確定として扱いません。

## Attentionと診断

- 通常表示は「結論→理由→根拠→選択」の順で、重要な3件までを先に示す。残りは件数と`.clarity/state.json`へのpathへ畳む。
- AI推定は「推定」、確認していない状態は「未検証」、根拠が足りない状態は「根拠不足」と明示する。不透明なscoreを利用者向けの理由にしない。
- `doctor`のHook／link等が未検証なら成功扱いしない。schema移行や古いruntime lockが必要な場合は、まずread-only previewを案内する。
- Codexで`/hooks`がtrust未承認を示した場合は、`doctor --host codex --hook-state untrusted --json`でdegraded状態とtrust確認方法を表示する。無効時は`disabled`、command失敗時は`failure`を渡す。1hostの結果を別hostのverifiedへ昇格しない。

```bash
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" migrate "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" cleanup "<repo-root>" --json
```

previewの対象path、保持する履歴、削除候補を利用者が確認した後だけ、それぞれ`--apply`を付ける。migration失敗は旧schemaを利用可能な状態へ戻し、cleanupは所有確認済みの期限切れruntimeだけを削除する。

## generic projectのDecision確定

- 利用者が明示的に確定した内容だけを、既存projectsのDecision seamへ委譲する。
- `PROJECT.md`／`DECISIONS.md`がDecision正本、Clarity Eventは状態遷移です。同じ本文を一般memoryへ複製しません。
- partial時は成功済みと未完了を分け、同じoperationのretryでDecisionやEventを重複させません。
- AI推定、draft、superseded sourceは`confirmed`にしません。

## Markdown／Mermaid投影

同じcanonical Stateから、概要・Attention・マトリクスのMarkdownと、象限・Project構造・依存関係・状態遷移のraw Mermaidを生成する。

```bash
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" project "<repo-root>" --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" project "<repo-root>" --apply --json
```

previewはwrite 0件。Mermaid rendererが使えなくても`.mmd`とMarkdownを保持し、構造図のmindmap構文を使えない場合は`--mindmap-failure`でflowchartへfallbackする。

## Xmind provider

- Xmind設定は既定OFF。利用者が明示した場合だけ`xmind-setting --enabled on`とし、`off`で再停止できる。
- ON時にcreate/read/updateと色・配置を扱えるconnected Xmind MCPがあれば、必ず第1優先にする。設定値とruntime capabilityは別に表示する。
- MCPを使えない場合のlocal `.xmind`は第2優先。最初からlocalを指定された場合も、まずpreviewで対象path、create/update、既存mapへの影響、auth／credit見込み、再読込注意を示す。
- local writeはpreviewの`approvalDigest`に対する利用者の明示承認後だけ行う。拒否、取消、無回答、digest不一致ではwrite 0件。
- local archiveは既知のXMind Zen JSON ZIP内部構造として検査する。内部構造検査と「実Xmind Appで開けたか」を分け、App未確認時は`verified: false`のままにする。
- Xmind側の状態変更はproposalとして返す。承認前／拒否時はcanonical Stateを変更せず、明示承認後だけClarity Eventへ反映する。

```bash
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" xmind-setting "<repo-root>" --enabled on --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" xmind-resolve "<repo-root>" --capabilities-json '<JSON>' --json
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" xmind-local "<repo-root>" --target ".clarity/maps/clarity.xmind" --json
# previewのapprovalDigestと表示内容を人間が確認した後だけ:
node "${PLUGIN_ROOT:-${CLAUDE_PLUGIN_ROOT:-${CODEX_PLUGIN_ROOT:-}}}/scripts/clarity.mjs" xmind-local "<repo-root>" --target ".clarity/maps/clarity.xmind" --apply --approval-digest "<sha256>" --json
```

## 安全境界

- preview／cancelではClarity canonical、Git、journal、runtimeを変更しない。
- root外write、network、未承認のXmind MCP／local `.xmind` write、connector、push、remote／branch変更、Hook、task自動作成を行わない。
- Evidenceは相対path／ID／日付／SHA等の最小locator、短いsummary、digestだけを保存し、本文やSecretを保存しない。
