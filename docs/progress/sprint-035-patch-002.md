# Sprint 035 Patch 002 — Generator Progress

## 実装結果

- 製品内の5つの履歴取得経路を `git pull --ff-only --no-rebase` に統一した。
- repo／global相当の `pull.rebase=true` を変更せず、無関係なtracked／untracked／staged差分とindexを保持する実Git回帰を追加した。
- rebase、merge commit、force、stash、reset、restore、Git config writeは製品コードへ追加していない。
- UI、copy、identity、OAuth、Secret、Actions run相関、timeout実装は変更していない。

## 変更path

- `plugins/secretary/skills/chatwork/scripts/wizard-server.mjs`
- `plugins/secretary/skills/chatwork/scripts/search-flow.mjs`
- `plugins/secretary/skills/google-chat/scripts/search.mjs`
- `plugins/secretary/skills/google-chat/scripts/search-flow.mjs`
- `scripts/sprint-035-patch-002-git-pull-test.mjs`
- `docs/progress/sprint-035-patch-002.md`

## 全callsite inventory

| # | path | 役割 | 実引数 |
|---|---|---|---|
| 1 | `plugins/secretary/skills/chatwork/scripts/wizard-server.mjs` | Chatwork初回／設定変更後の取得 | `pull --ff-only --no-rebase` |
| 2 | `plugins/secretary/skills/chatwork/scripts/wizard-server.mjs` | Chatworkルーム一覧取得後のpull | `pull --ff-only --no-rebase` |
| 3 | `plugins/secretary/skills/chatwork/scripts/search-flow.mjs` | Chatwork検索前／同期成功後 | `pull --ff-only --no-rebase` |
| 4 | `plugins/secretary/skills/google-chat/scripts/search.mjs` | Google Chat単体検索前 | `pull --ff-only --no-rebase` |
| 5 | `plugins/secretary/skills/google-chat/scripts/search-flow.mjs` | Google Chat検索前／取得成功後 | `pull --ff-only --no-rebase` |

未分類callsiteは0件。Yasashii candidateと上記4製品fileのSHA-256は一致する。

## Patch専用回帰

実行: `node scripts/sprint-035-patch-002-git-pull-test.mjs`

- exit 0、`SPRINT035_PATCH002_CALLSITES=5 SPRINT035_PATCH002_PASS=148 SPRINT035_PATCH002_FAIL=0`
- local bare remote＋cloneを経路ごとに分離し、全5経路で `up-to-date`、安全なfast-forward、remote変更pathと競合するdirty、divergedを実行した。
- 各fixtureはlocal／global相当の `pull.rebase=true`、tracked unstaged、untracked、staged差分を持つ。
- up-to-dateはHEAD不変、fast-forwardはlocal HEADがremote commitへ一致、競合dirty／divergedは非成功でHEAD不変。
- 全状態でunrelated dirty内容、stage状態、index、Git設定snapshotを前後一致で確認した。
- merge commit、rebase状態、force、stash、reset、restore、commit、製品からのGit config writeは0件。
- fixtureは終了時に削除し、一時wizard processも終了した。

## 契約指定の既存回帰

| command | exit | 結果 |
|---|---:|---|
| `node scripts/sprint-014-chatwork-test.mjs` | 1 | 製品挙動55 PASS後、既存README／公開guide文言4 FAIL |
| `node scripts/sprint-019-google-chat-test.mjs` | 0 | 51 PASS / 0 FAIL |
| `node scripts/sprint-020-google-chat-test.mjs` | 0 | 50 PASS / 0 FAIL |
| `node scripts/sprint-022-safety-test.mjs` | 0 | 69 PASS / 0 FAIL |
| `node scripts/sprint-024-data-causality-test.mjs` | 0 | 43 PASS / 0 FAIL |
| `bash scripts/sprint-035-patch-001-regression.sh` | 1 | 主要wrapper 8 PASS / 1 FAIL。既存Sprint 033 overlay allowlistで停止 |
| `git diff --check` | 0 | PASS |

## 既知の問題

- `sprint-014` の4件はAgenticの既存README／公開guideと旧Yasashii向け期待値の差であり、本Patchの製品diffとは非因果。Yasashiiでは同じcommandが59/59で合格する。
- `sprint-035-patch-001` の1件は `sprint-033-test.mjs` が既存の過去evidence／feedback／specと今回Patch pathを `adapters/agentic-overlay.json` の未宣言pathとして扱うもの。本PatchのGit挙動ではなく verification-infra 候補として引き渡す。契約外のedition allowlistは変更していない。
- 上記2点のため、契約指定既存回帰の全件greenは未達。Patch専用148件と変更近傍のtimeout／run相関／Secret非露出回帰はgreen。

## 外部操作と安全記録

- 実Chatwork／Google Chat API: `not-run`
- OAuth／Repository Secret／GitHub Actions: `not-run`
- external remote write／push／release: `not-run`
- 本番my-vaultおよび `/Users/taisei/my-vault/vault/.obsidian/workspace.json`: read／write／rename／delete／stage／restore 0件
- 資格情報path、実room／space名・ID、チャット本文: read 0件
- commit: `not-run`。Evaluatorへdirty candidateとして渡す。

## Evaluator handoff

- UI変更はないため、起動URL・browser・screenshotは不要。
- まずPatch専用回帰を実行し、5経路×4状態の実Git結果と `pull --ff-only --no-rebase` のlogを確認する。
- 次にexit 0の近傍回帰を実行し、`sprint-014` とoverlay 1件は上記の非因果性を実diffで独立評価する。
- candidateはcommitしていない。Planner／Orchestratorの `docs/spec/constraints.md`、`docs/sprints/state.md`、対象契約差分を保持している。
