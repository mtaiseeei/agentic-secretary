# Sprint 037 最終評価 — 改訂AC12

## 判定

- Sprint contract result: **PASS**
- Product candidate result: **PASS**
- Product findings: **0件**
- Verification-infra findings: **0件（本Sprintの必須範囲）**
- 評価基点: `81869bed1f826ad2fc0876d80eccaab9a516d56c`
- 評価対象: ユーザー承認後にAC12を改訂した、未commitの同一実装候補

改訂AC12で必須になったSprint 037／011／012／022の4回帰は、すべて0 FAILで完了した。
初回評価で見つかったUnicode case-foldとhost名判定の2件も、合成値を使った直接確認と
専用回帰の両方で解消を確認した。

呼び方候補のsource順、4経路、探索の限定、候補非保存、保存前確認、3正本同期、
5失敗点でのrollback、active surfaceの利用者中立化、Sprint 045保護範囲を独立確認した。
今回の変更に因果づく新規回帰、安全違反、配布境界違反はない。

着手時HEADですでに赤かった4つの全体baselineは、改訂契約どおり合否条件へ使わず、
既存の残余課題として本feedbackに保持する。最終評価では再実行していない。

## スコア

| 基準 | スコア | 閾値 | 判定と根拠 |
|---|---:|---:|---|
| C1 完成度 | 5/5 | 4 | AC1〜13を満たし、前回のproduct finding 2件も解消。 |
| C2 構文・整合 | 5/5 | 5 | 必須4回帰と `git diff --check` が0 FAIL。Skill参照、Node module、pathに新規欠陥なし。 |
| C3 機能の実証 | 5/5 | 4 | 合成provider、直接反例、一時Git workspace、5失敗点rollbackで実動作を確認。 |
| C4 非エンジニア体験 | 5/5 | 4 | 4経路、出典、おすすめ、候補なし、保存前確認、訂正・キャンセルが明確。 |
| C5 安全・規律 | 5/5 | 5 | account-name以外のGit／OS読取0、任意会話探索0、確認前副作用0、push 0。 |
| C6 無回帰 | 5/5 | 5 | 改訂AC12の開始時green・因果範囲4回帰がすべて0 FAIL。 |
| C7 やさしさ | 5/5 | 4 | 「あなた」を安全な既定にし、利用不能時に他経路へ戻れる。 |
| C8 wizard体験・デザイン | N/A | 4 | 常駐UI／wizard変更ではなく、契約のsafe harborもcommandと一時workspaceである。 |
| C9 配布チャネル非依存 | 5/5 | 5 | active surface 278 files、unexpected 0、負fixture 3/3、正式owner allowlistを維持。 |
| C10 更新の安全性 | 5/5 | 5 | 3正本、journal、commitを1 transactionとして扱い、5失敗点で完全rollback。 |
| C11 Google Chat境界 | 5/5 | 5 | Google Chatの実装差分0。Sprint 022も0 FAILで、既存baseline差は非因果の残余課題として分離。 |
| C12 0.8.0配布準備 | 5/5 | 5 | 本Sprintが変更した配布面の利用者中立化と必須増分回帰が合格。既存の赤いrelease baselineは改訂AC12で非阻害。 |
| C13 edition分離・互換 | 5/5 | 5 | edition、downstream、cache、remote、releaseを変更せず、共通coreだけに実装。 |
| C14 会話のMarkdown可読性 | 5/5 | 5 | onboarding／settingsの複数選択肢・確認・手順が段落と箇条書きで分離。 |

1軸でも閾値を下回ればFAILとするrubricに照らし、対象軸はすべて閾値を満たす。
C8はSprint対象外であり、変更差分にwizard／常駐UIは含まれない。

## Acceptance Criteria

| # | 最終結果 | 独立確認 |
|---|---|---|
| 1 | PASS | Claude Code／Codex共通Skillに3明示候補＋host標準「その他」を規定し、重複を禁止。 |
| 2 | PASS | `account-name`以外でprovider call 0。source順はcurrent conversation→Personalization→Project→memory→Git→OS。任意会話／session探索API 0。 |
| 3 | PASS | 全source、source欠落、複数相違、case-fold同値の重複排除、最良1件のおすすめを確認。 |
| 4 | PASS | email、空、汎用名、数字中心、長すぎる値、path、UUID、hex、token、machine-like、host名を除外。OSの人名候補は維持。 |
| 5 | PASS | 全不適格値では `{available:false,candidates:[]}`。架空候補0。 |
| 6 | PASS | 4経路、未回答／空の「あなた」、別turn保存確認、訂正・キャンセル・未確認の副作用0をSkillで規定。 |
| 7 | PASS | provider実行前後snapshot不変。探索結果を保存する処理と任意会話探索APIなし。 |
| 8 | PASS | 一時Git workspaceで3正本一致、手書き行・索引・open／closed行を保持。5失敗点で完全rollback。 |
| 9 | PASS | 初回decision byte不変、成功時journal 1件・local commit 1件・push 0。 |
| 10 | PASS | scan 278 files、allowlist files 40、unexpected 0、負fixture 3/3。正式所有情報を維持。 |
| 11 | PASS | Sprint 045保護6 filesの基点差分0。owner transaction後もopen／closed行を保持。 |
| 12 | PASS | Sprint 037 14/14、Sprint 011 68/68、Sprint 012 38/38、Sprint 022 69/69＋wrapper 8/8。 |
| 13 | PASS | downstream、installed cache、利用者workspace、external service、remote、releaseへのwrite 0。 |

## 前回product findingsの最終再確認

### Closed — Unicode case-fold同値の候補重複

- Classification: `product`
- Location: `plugins/secretary/scripts/name-candidates.mjs`
- Final result: **closed**

直接確認結果:

```text
unicodeCaseFoldKey("Straße") === unicodeCaseFoldKey("STRASSE") -> true
currentConversationName="Straße", personalization="STRASSE",
Git="STRASSE" -> 候補は上位sourceの "Straße" 1件
```

専用回帰では、`ẞ`／`ss`、Greekのfinal sigma、Cherokeeも同値へ統合し、
別文字のdotless `ı`／`i`を統合しない正負境界も合格した。

### Closed — 短いhost名と未列挙TLDが候補へ残る

- Classification: `product`
- Location: `plugins/secretary/scripts/name-candidates.mjs`
- Final result: **closed**

直接確認結果:

```text
device.jp        -> rejected / host-name
server.jp        -> rejected / host-name
pc.localhost     -> rejected / host-name
localhost        -> rejected / host-name
host.example.com -> rejected / host-name
J. Smith         -> accepted
```

host名判定はTLD allowlistではなくDNS label構造を使い、空白を含む人名表記を維持する。

## 実行証跡

| Command / check | 結果 |
|---|---|
| `node scripts/sprint-037-test.mjs` | exit 0、14 PASS / 0 FAIL。scan population 278、allowlist files 40、unexpected 0、負fixture 3。 |
| `bash scripts/sprint-011-regression.sh` | exit 0、68 PASS / 0 FAIL。 |
| `bash scripts/sprint-012-regression.sh` | exit 0、38 PASS / 0 FAIL。 |
| `bash scripts/sprint-022-regression.sh` | exit 0、69 PASS / 0 FAIL、wrapper 8 PASS / 0 FAIL。 |
| case-fold／host名の直接合成反例 | 前回2 findingを解消。`Straße` 1候補、5 host値拒否、`J. Smith`許可。 |
| 5点rollback追加操作 | `before-write-1/2/3`、`before-journal`、`before-commit` がすべてPASS。3正本・decision・journal・HEAD・worktree不変。 |
| Sprint 045保護6 filesの `git diff 81869be` | 0 files。 |
| `git diff --check` | PASS。 |

## Active surfaceと差分境界

- 固定scan母集団: 278 files。
- 固定allowlist: GitHub owner／公式URLを持つ38 files＋合成path／guard pattern 2 files。
- 想定外の個人名、利用者端末絶対path、私用workspace依存: 0件。
- 合成の負fixture: 個人名、端末path、私用workspace名の3件を3件とも検出。
- Sprint 045保護対象:
  - `plugins/secretary/templates/AGENTS.md`
  - `plugins/secretary/scripts/project-tools.mjs`
  - `plugins/secretary/skills/daily/SKILL.md`
  - `plugins/secretary/skills/projects/SKILL.md`
  - `plugins/secretary/skills/weekly/SKILL.md`
  - `scripts/sprint-015-regression.sh`
- 上記6 filesの基点差分は0件。同期fixtureでもopen／closed行が残る。

## 既存baselineの残余課題

次はSprint 037着手時HEADですでに赤いことが過去の独立評価で確認され、
ユーザー承認後の改訂AC12で本Sprintの合否を妨げない既存baselineへ分類された。
最終評価では再実行せず、修復も本Sprintへ混ぜていない。

1. `bash scripts/regression-check.sh --offline`
   - 旧Yasashii identity、README、update fixture等の既存不一致。
2. `node scripts/sprint-033-test.mjs --root .`
   - 未変更のGoogle Chat wizard digestと既存期待値の不一致。
3. `bash scripts/agentic-regression.sh`
   - 未変更READMEのGoogle Chat説明と既存期待値の不一致。
4. `node scripts/agentic-archive-gate.mjs`
   - archive内で再現する同じSprint 033 digest不一致。

これらは将来の別Sprintで修復候補にできる。Sprint 037の実装候補に因果づくFAILとして扱わない。

## Not Run / 禁止事項

- 上記4つの開始HEAD-red全体baseline: 改訂契約どおり最終評価ではnot-run。
- 任意の過去会話、別task、raw transcript、生session log、memory store探索: 0件。
- 実Git user.name／OSユーザー名の実値取得を評価証跡へ保存: 0件。証跡は合成値だけ。
- 実利用者workspace、downstream repo、installed cache、external connector、GitHub API、
  remote push、PR、release、plugin install／update: not-run。
- browser／screenshot: 常駐UI変更ではなく、Sprint契約のsafe harborがcommandと一時workspaceのためnot-run。

## Evaluator自己レビュー

- Generatorの自己評価だけでなく、必須4回帰、前回2 findingの直接反例、5点failure injection、
  active surface scan、実diff、Sprint 045保護差分を独立確認した。
- 改訂AC12に記載されたgreen・因果範囲だけを合否gateとし、開始HEAD-red baselineを
  暗黙に修復済み、green、または配布gate全体PASSとは表現していない。
- 任意会話探索や実アカウント値を使わず、合成providerだけで候補動作を確認した。
- findingsを再確認し、未解消のproduct／verification-infra findingは0件と判断した。
- 実装、spec、contract、state、progressは編集していない。書き込んだ正本は本feedbackだけである。
