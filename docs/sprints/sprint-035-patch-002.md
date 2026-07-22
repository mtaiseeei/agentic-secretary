# Sprint 035 Patch 002 — Git設定に左右されないfast-forward取得

- Type: micro
- Risk: standard（履歴repoの取得方法だけを狭く変更し、commit／push、保存schema、UI、外部サービス接続は変更しない）
- 主眼: Chatwork／Google Chatのwizard、検索、同期で、利用者の `pull.rebase=true` と無関係な未commit差分が共存していても、安全にfast-forwardできるremote状態なら取得を続行できるようにする。
- 依存: sprint-035-patch-001 done。Chatwork／Google ChatのGit取得、timeout、安全停止、Actions run相関を守る既存回帰が存在する。

## 背景と承認済み方針

`/Users/taisei/my-vault` はlocal `main` の分岐を安全に解消し、`origin/main` と一致した。その後、
`vault/.obsidian/workspace.json` の既存未commit差分を保持した状態では、現在の `git pull --ff-only` が
repoの `pull.rebase` 設定を受けて `cannot pull with rebase: You have unstaged changes` で停止した。
設定を変更せず `git pull --ff-only --no-rebase` を実行すると `Already up to date.` で成功した。

ユーザーは、既存差分を保持し、ユーザーのGit設定を変更せず、この残存障害だけを解消する方針を承認済みである。

## micro判定

- 変更は、チャット履歴repoのremote状態をfast-forwardで取り込む同一Git機能に閉じる。
- 現在の製品経路は、Chatwork wizardの2経路、Chatwork search-flow、Google Chat search、Google Chat search-flowの全てで同じ `git pull --ff-only` 契約を使う。
- `scripts/sprint-014-chatwork-test.mjs`、`scripts/sprint-019-google-chat-test.mjs`、`scripts/sprint-020-google-chat-test.mjs`、`scripts/sprint-022-safety-test.mjs`、`scripts/sprint-024-data-causality-test.mjs`、`scripts/sprint-035-patch-001-regression.sh` が該当wizard／検索／同期、timeout、run相関、既存安全境界を自動回帰で保護している。
- UI、OAuth、保存形式、Actions workflow、外部writeへ範囲を広げないため、Harnessのmicro-patch条件を満たす。

## 外から見える成果

利用者は、Obsidian等による取得対象外のローカル編集を残したままでも、Chatwork／Google Chatの設定確認や検索時に最新のfast-forward可能な履歴を取り込める。製品は利用者のGit設定を勝手に変更せず、競合時は従来どおり安全に停止する。

## Scope

- 製品コード内の `git pull --ff-only` を使う全経路をinventoryし、Chatwork wizardの初回／設定変更後取得、Chatwork search-flow、Google Chat search、Google Chat search-flowを漏れなく扱う。
- 各製品経路で `git pull --ff-only --no-rebase` と同等の引数を明示し、repo／globalの `pull.rebase=true` に挙動を委ねない。
- remoteがup-to-date、または安全にfast-forward可能で、dirty差分がremote変更pathと競合しない場合は取得を成功させ、既存のtracked／untracked／staged差分を保持する。
- remote変更pathとdirty差分が競合する、またはfast-forward不能な場合はGitの安全停止を維持し、HEAD、local差分、indexを製品側で書き換えない。
- ChatworkとGoogle Chatのエラー分類、timeout、Actions run相関、検索再試行、Secret非読取、所有path境界を回帰保護する。
- AgenticとYasashiiの共有製品面で引数と結果契約を一致させ、edition固有copy／identityへ差分を作らない。

## Non-scope

- rebase、merge commit、非fast-forward取込、force pull／push、reset、stash、差分の自動commit／restore／cleanup。
- repo／global／systemの `pull.rebase`、`pull.ff` その他Git設定の参照結果を書き換えること。
- Chatwork／Google ChatのUI、wizard step、copy、OAuth scope、設定schema、履歴形式、schedule、workflow、run選択ロジックの再設計。
- 実Chatwork／Google Chat API、OAuth、Repository Secret、GitHub Actions dispatch、remote push、release。
- 本番my-vault、`vault/.obsidian/workspace.json`、資格情報、チャット本文へのread／write／stage。
- 新しい統一Git基盤、collector、attestation、approval manifest、外部署名の作成。

## Acceptance Criteria

1. 製品コード内の `git pull --ff-only` 使用箇所がpathと役割つきで全件inventoryされ、Chatwork wizardの2経路、Chatwork search-flow、Google Chat search、Google Chat search-flowの全てが `--no-rebase` を明示する。対象サービス／flowの未分類箇所は0件である。
2. 隔離したlocal bare remote＋clone fixtureで `pull.rebase=true`、remote up-to-date、取得対象外のtracked unstaged dirty fileありを再現し、各該当製品経路が成功する。dirty fileの内容、stage状態、HEAD、Git設定は実行前後で不変である。
3. 同じfixtureでremoteを1 commitだけ先行させ、remote変更と競合しないtracked／untracked／staged差分を置いても、各該当製品経路がfast-forwardに成功する。local HEADはremote commitへ一致し、既存差分とindexは不変、rebase commit／merge commit／force操作は0件である。
4. remoteが変更したpathへlocal dirty差分を置くfixtureでは、Gitの非ゼロ終了を製品が成功へ読み替えず、HEAD、dirty内容、indexを保持して安全に停止する。製品がstash、reset、restore、commit、merge、rebase、forceを行わない。
5. fast-forward不能な分岐fixtureでも既存の競合分類と安全停止を維持し、履歴書換え、merge commit、local差分の破棄を行わない。
6. repo local／global相当のGit設定snapshotは全fixtureの前後で一致し、製品から `git config` のwrite呼出は0件である。
7. Chatwork／Google Chatの既存エラー分類、外部process timeoutと子process終了、Actions dispatch後の今回runだけを採用する相関、成功確認前のpull禁止、同条件再検索を回帰させない。
8. Secret値、OAuth token、資格情報path、実room／space名・ID、チャット本文を読まず、fixture／ログ／証跡へ含めない。外部API、Actions、remote writeは `not-run` とする。
9. AgenticとYasashiiの共有面で対象path、pull引数、成功／停止結果が一致し、edition固有surfaceの変更は0件である。
10. Patch専用回帰と既存のChatwork／Google Chat／Git安全／timeout／run相関回帰が0 FAILである。Type: microのため、評価は機能完全性・動作安定性・回帰なしだけを採点する。

## 必須回帰

- Patch専用の隔離Git fixture回帰。
- `node scripts/sprint-014-chatwork-test.mjs`
- `node scripts/sprint-019-google-chat-test.mjs`
- `node scripts/sprint-020-google-chat-test.mjs`
- `node scripts/sprint-022-safety-test.mjs`
- `node scripts/sprint-024-data-causality-test.mjs`
- `bash scripts/sprint-035-patch-001-regression.sh`
- `git diff --check`

既存回帰のassert数は追加により増えてよい。Generatorは実行した最終command、exit、assert数をprogressへ記録する。

## Evidence safe harbor

- 対象candidate、変更path、全pull callsite inventory、各経路が実際に渡したGit引数。
- 隔離fixtureの作成・設定・実行command、終了コード、up-to-date／fast-forward／競合dirty／分岐の各結果。
- fixtureごとのHEAD／branch graph、merge commit数、rebase状態、dirty file・index・Git設定の前後snapshot。実内容はsynthetic値だけを使う。
- 既存回帰のcommand、exit、assert数、timeout時の子process終了、run相関、エラー分類結果。
- 外部API／OAuth／Secret／Actions／remote writeの `not-run` 集計と、Secret・実チャット本文を読んでいないpath-level記録。
- UI変更はないため、ブラウザ操作とスクリーンショットを必須にしない。
- 上記で十分とし、新しいcollector、統一証跡schema、approval manifest、外部署名を追加の合格条件にしない。

## External live gate

本Patchはlocal bare remoteと隔離cloneによるsynthetic fixtureで完結する。本番my-vaultでのpull、実Chatwork／Google Chat API、OAuth、Repository Secret、GitHub Actions、remote push、releaseは実行しない。必要になった場合は対象、副作用、rollback、cleanupを示し、別の明示確認を得る。
