---
name: clarity
description: Project Clarityを安全に初期化し、決定×実行の現在状態、履歴、再構築、Decision確定を扱う。「クラリティを初期化」「今のClarity状態」「決定を確定」「Clarity履歴」「Clarityを再構築」で使う。
---

# Project Clarity

Project ClarityはTODO一覧ではありません。Decision、Execution、Validationと根拠を分け、「何が決まり、何が実行され、どこに人間の判断が要るか」を扱います。

## 初期化

1. 最初は必ずread-only previewを実行する。

   ```bash
   node "${CLAUDE_PLUGIN_ROOT:-$CODEX_PLUGIN_ROOT}/scripts/clarity.mjs" init "<repo-root>" --json
   ```

2. Project名、Repo identity、Item候補、作成予定path、競合、除外・未確認範囲を利用者へ示す。
3. 利用者が明示確認した後だけ `--apply` を付ける。取消では `--cancel` を使い、副作用0件で終える。
4. `.env`、credential、binary、巨大file、symlink先は候補本文として読まない。既存`CLARITY.md`は上書きしない。

## 手動fallback

Hookが無効・未信頼・失敗でも、次は完全に手動で使える。

```bash
node "${CLAUDE_PLUGIN_ROOT:-$CODEX_PLUGIN_ROOT}/scripts/clarity.mjs" status "<repo-root>" --json
node "${CLAUDE_PLUGIN_ROOT:-$CODEX_PLUGIN_ROOT}/scripts/clarity.mjs" history "<repo-root>" --json
node "${CLAUDE_PLUGIN_ROOT:-$CODEX_PLUGIN_ROOT}/scripts/clarity.mjs" rebuild "<repo-root>" --json
node "${CLAUDE_PLUGIN_ROOT:-$CODEX_PLUGIN_ROOT}/scripts/clarity.mjs" doctor "<repo-root>" --json
```

`rebuild`はEvent／EvidenceからStateを再生成します。Stateやquadrantの手編集をDecision確定として扱いません。

## generic projectのDecision確定

- 利用者が明示的に確定した内容だけを、既存projectsのDecision seamへ委譲する。
- `PROJECT.md`／`DECISIONS.md`がDecision正本、Clarity Eventは状態遷移です。同じ本文を一般memoryへ複製しません。
- partial時は成功済みと未完了を分け、同じoperationのretryでDecisionやEventを重複させません。
- AI推定、draft、superseded sourceは`confirmed`にしません。

## 安全境界

- preview／cancelではClarity canonical、Git、journal、runtimeを変更しない。
- root外write、network、connector、push、remote／branch変更、Xmind／Mermaid、Hook、task自動作成を行わない。
- Evidenceは相対path／ID／日付／SHA等の最小locator、短いsummary、digestだけを保存し、本文やSecretを保存しない。
