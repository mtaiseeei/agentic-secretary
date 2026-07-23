# Sprint 037 — 呼び方候補の安全な探索と利用者中立の配布物

**ステータス:** Generator retry 1実装・Sprint専用／近傍自己検証完了。Evaluatorのproduct finding 2件を修正し、fresh独立Evaluator待ち

## 実装結果

### 1. 初回の4経路と保存前確認

- 共通のonboarding Skillへ「あなた」「アカウント名」「指定の名前」とhost標準の「その他」を追加した。
- host UIが「その他」を自動付与する場合は明示候補を3件にして重複させない。
- 「アカウント名」を選んだ後だけ候補moduleを呼ぶ。他の経路ではGit／OS providerを呼ばない。
- 4経路すべてで `保存する呼び方: <値>` を別turnで確認し、明示了承前はedition guardを含む
  command、directory、file、marker、journal、commitを実行しない。
- settingsの初回説明も同じ共通契約を参照する。

### 2. 決定的な候補収集

`plugins/secretary/scripts/name-candidates.mjs` を追加した。

- 順序は現在会話の明示名、Personalization、Project、現在タスクへ渡された記憶、Git表示名、OSユーザー名。
- 任意の過去会話、別task、raw transcript、生session log、memory storeは検索しない。
- Gitは `git config --get user.name` だけ、OSはprocessのusernameだけをread-onlyで確認する。
- NFKC、空白整理、40文字上限、email、汎用名、数字中心、path、UUID、long hex、host名、
  token風、machine-like値の除外、OS値のUnicode letter必須、正規化後の重複排除を実装した。
- 重複keyはUnicode default case-foldの同値集合を使う。`Straße`／`STRASSE`、`ẞ`／`ss`、
  Greekのfinal sigma、Cherokeeの大小文字を統合し、別文字であるdotless `ı`／`i` は統合しない。
- host名はTLD allowlistへ依存せず、DNS labelだけで構成される1-dot以上の値を除外する。
  `device.jp`、`server.jp`、`pc.localhost`、`localhost` を拒否し、空白を含む人名表記
  `J. Smith` は候補として維持する。
- 候補は優先順の最初の1件だけをおすすめにし、取得できないsourceはエラーにせず次へ進む。
- 探索値、除外値、出典、順位を永続化する処理は持たない。外部processは共通timeout処理を通す。

合成例:

| 入力source | 入力 | 正規化後 | 結果 |
|---|---|---|---|
| current conversation | ` 青空　みらい ` | `青空 みらい` | 採用・おすすめ |
| Personalization | `青空 みらい` | `青空 みらい` | 上位と重複のため統合 |
| Project | `Alex Example` | `Alex Example` | 採用 |
| Git | `Git Person` | `Git Person` | 採用 |
| OS | `runner-build-1234` | 同左 | machine-likeで除外 |

### 3. 既存workspaceの3正本同期

`plugins/secretary/scripts/owner-name-transaction.mjs` を追加した。

- `preferences.md` の「基本」、`AGENTS.md` の「オーナー情報」、`MEMORY.md` の
  「オーナーの基本」を同じ確認済み値へ同期する。
- 3 fileとjournalを事前snapshotし、symlink、範囲外、空値、書込み、journal、commitの
  いずれかが失敗した場合は全てrollbackする。
- journalは成功時だけ1件、local commitも成功時だけ1件作る。pushはしない。
- 初回decisionは対象pathに含めず、byte不変を専用fixtureで確認した。
- `AGENTS.md` のopen／closed project行、他設定、手書き行、MEMORY索引を維持した。

### 4. 利用者中立化とscan

- active surfaceの端末固有絶対pathを `<user-home>`／`<workspace-root>` へ変更した。
- 私用workspace名を一般表現へ変更した。
- Sprint 011／012とmaster fixtureの人物名を合成人物 `青空みらいさん` へ変更した。
- 固定active surface 278 filesをscanし、unexpected match 0件だった。
- 公式GitHub owner／URLのallowlistは38 files、合成path／guard patternは2 filesで、
  file別件数が固定値と一致した。合成の負fixture 3件を3件とも検出した。
- Sprint 045の保護対象6 filesはdiff 0件。open／closed挙動は同期transaction fixtureと既存回帰で維持した。

## 主な変更file

- 候補収集: `plugins/secretary/scripts/name-candidates.mjs`
- 3正本同期: `plugins/secretary/scripts/owner-name-transaction.mjs`
- 会話契約: `plugins/secretary/skills/onboarding/SKILL.md`、`plugins/secretary/skills/settings/SKILL.md`
- 専用回帰・scan: `scripts/sprint-037-test.mjs`
- 合成人物fixture: `scripts/sprint-011-regression.sh`、`scripts/sprint-011-live-dialogue.sh`、
  `scripts/sprint-012-regression.sh`、`scripts/regression-check.sh`
- 中立表記: `CLAUDE.md`、`docs/DESIGN.md`、`docs/agentic-upstream-mapping.md`、
  `adapters/codex-app/README.md`

Planner／Orchestrator管理の `docs/spec*`、`docs/sprints/state.md`、Sprint契約は編集していない。
既に存在した未commit変更を保持した。Generator commit、push、release、downstream、installed cache、
利用者workspace、external serviceへのwriteは0件。

## 自動テスト結果

| コマンド | 結果 |
|---|---:|
| `node scripts/sprint-037-test.mjs` | 14 PASS / 0 FAIL |
| `bash scripts/sprint-011-regression.sh` | 68 PASS / 0 FAIL |
| `bash scripts/sprint-012-regression.sh` | 38 PASS / 0 FAIL |
| `bash scripts/sprint-022-regression.sh` | 69 PASS、wrapper 8 PASS / 0 FAIL |
| `git diff --check` | PASS |
| Sprint 045保護対象への `git diff` | 0 files |

## Generator retry 1

Evaluatorの2件のproduct findingだけを修正した。source順、account-name選択時だけの探索、
transaction、active surface scan、Sprint 045の保護範囲は変更していない。

1. `toLocaleLowerCase("und")` だけの重複keyを、NFKC後のUnicode case-fold同値keyへ変更した。
   上位sourceを残す `Straße`／`STRASSE` の回帰に加え、capital sharp s、Greek、
   Cherokee、dotless iの正負境界を固定した。
2. 固定TLD列挙によるhost名判定を、DNS label構造による判定へ変更した。
   `device.jp`、`server.jp`、`pc.localhost`、`localhost` の負fixtureと、
   `J. Smith` の正fixtureを追加した。

retry後は `node scripts/sprint-037-test.mjs` が14 PASS / 0 FAIL、
`bash scripts/sprint-011-regression.sh` が68 PASS / 0 FAIL、
`bash scripts/sprint-012-regression.sh` が38 PASS / 0 FAIL、
`bash scripts/sprint-022-regression.sh` が69 PASS＋wrapper 8 PASS / 0 FAIL、
`git diff --check` がPASSした。

開始HEADから赤いことが独立評価で確認済みのfull-suite baselineは再実行していない。
下記の非因果FAILと、AC12の検証scope判断は未変更である。

## 既存全体回帰との分離

次はSprint 037の変更ではなく、着手時HEADにある既存実装と既存期待値の不一致で停止した。
本Sprintで追随修正していない。

1. `node scripts/sprint-033-test.mjs --root .`
   - 未変更の `plugins/secretary/skills/google-chat/assets/wizard/app.js` の現在digest
     `fcea246d...` と、既存baseline `c8d71dac...` が不一致。
2. `node scripts/agentic-archive-gate.mjs`
   - 上記Sprint 033 digest不一致をarchive内でも再現して停止。
3. `bash scripts/agentic-regression.sh`
   - restricted sandboxのloopback `EPERM` は許可面で再実行した。
   - Chatwork 35 PASS / 0 FAILの後、Google Chat suiteは49 PASS / 1 FAIL。
     FAILは未変更READMEの「高度設定と管理者順序・People API限界」期待。
4. `bash scripts/regression-check.sh --offline`
   - 旧Yasashii identity期待、旧README／Harness導線、既存update fixture、loopback `EPERM` 等、
     複数の既知不一致を再現したため全体greenではない。
   - Sprint 037追加moduleに因果のあった「直接 `execFileSync`／`spawnSync`」は共通timeout処理へ修正し、
     `bash scripts/sprint-022-regression.sh` 69 PASS / 0 FAILで解消を確認した。
   - 非因果FAILが継続する長時間masterは途中終了（exit 130）。本SprintのPASSへ加算していない。

## 起動・Evaluator確認

常駐アプリやtest URLはない。repo rootで次を実行する。

```bash
node scripts/sprint-037-test.mjs
bash scripts/sprint-011-regression.sh
bash scripts/sprint-012-regression.sh
bash scripts/sprint-022-regression.sh
```

Evaluatorは特に次を増分確認する。

1. 4経路とhost標準「その他」の重複防止、保存確認前の副作用0件。
2. source欠落を含む候補順、全除外値、重複、おすすめ1件、候補0件。
3. provider spyと探索前後snapshot、任意会話／session探索API 0件。
4. 一時workspaceの3正本一致、decision digest、journal／commit各1件、push 0件。
5. write失敗、journal失敗、commit前失敗、symlinkでの完全rollback。
6. scan母集団、固定allowlist件数、unexpected 0、負fixture検出。
7. Sprint 045保護対象diff 0とopen／closed行の維持。

Generator実装と因果範囲の自己検証は完了した。Sprint完了判定はfresh独立EvaluatorとOrchestratorへ委ねる。
