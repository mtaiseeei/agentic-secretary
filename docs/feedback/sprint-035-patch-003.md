# Sprint 035 Patch 003 Evaluation

## Verdict

- Result: **FAIL**
- Failure kind: `implementation-issue`
- Primary classification: `product`
- Escalation recommendation: `none`

Google Chat の候補取得そのものと、保存済み候補を表示する失敗画面は動作した。しかし、失敗画面でユーザーが変更したチェック状態が再試行で失われる。Sprint 契約が求める、検索・フォーカス・カーソル・チェック状態を保った安全な再試行を満たさないため FAIL とする。

## Scores

| Criterion | Score | Evidence |
|---|---:|---|
| C1 Core experience | 3/5 | complete / partial / failed の画面遷移は確認したが、failed からの再試行で未保存の選択が消える。 |
| C2 Space filtering | 5/5 | 専用回帰テストで `SPACE` と DM の除外を確認。 |
| C3 Discovery result display | 4/5 | 既知・欠落・新規候補の区別は表示された。再試行時の状態復元に欠陥がある。 |
| C4 Partial-result handling | 4/5 | 一部取得の説明と未選択の新規候補を確認。終了操作の全経路は未評価。 |
| C5 Failure safety | 5/5 | 失敗時に保存済み候補を使える説明と再試行導線を確認。 |
| C6 Stability / no regression | 4/5 | 専用回帰は green だが、実ブラウザ操作で High regression を再現。 |
| C7 Copy / guidance | 4/5 | 待機・完了・一部取得・失敗の案内は理解可能。全分岐の文言精査は未評価。 |
| C8 Interaction quality | 3/5 | 再試行後にフォーカス・カーソル・未保存チェック状態が保持されない。要求閾値未達。 |
| C9 Privacy / secrets | 5/5 | 固定テスト値のみ使用。Secret 値、OAuth、実 API は実行していない。 |
| C10 Workflow causality | 5/5 | 因果関係テスト 43/43 PASS。current run、workflow、branch、createdAt の拒否条件を確認。 |
| C11 Existing Chatwork behavior | 5/5 | Chatwork の基礎回帰は 35/35 と 33/33 PASS。 |
| C12 Edition identity | 5/5 | 実行画面で `agentic-secretary` の版識別を確認。 |
| C13 Overlay / reproducibility | 4/5 | 専用テストは PASS。全 overlay 再適用は `not-run`。 |
| C14 Visual integrity | 5/5 | desktop と mobile 相当幅で横 overflow なし、console error 0。 |

一つでも必須閾値を下回れば FAIL という rubric に従い、特に C8 が不合格である。

## Findings

### High — 再試行が未保存のチェック状態とカーソル位置を破棄する

- Classification: `product`
- Route: Generator
- Affected acceptance: AC10、Scope E の検索・IME・focus/caret・checkbox 選択保持、安全な retry
- Location: `plugins/secretary/skills/google-chat/assets/wizard/app.js:157`

再現手順:

1. 候補取得が失敗した画面を開く。
2. 検索欄へ `今回` と入力し、カーソルを末尾に置く。
3. それまで未選択だった保存済み候補 `spaces/synthetic-missing` をチェックする。
4. 「最新候補をもう一度確認する」を押す。
5. 再試行も失敗した後の状態を確認する。

期待結果:

- 検索語、フォーカス、カーソル位置、ユーザーが変更したチェック状態を維持する。

実際の結果:

- 検索語 `今回` は残る。
- カーソル位置は 2 から 0 へ戻る。
- フォーカスは検索欄から見出しへ移る。
- 選択数は 2 から 1 に戻り、`spaces/synthetic-missing` のチェックが消える。

原因は、`discoverConfiguredSpaces()` が再試行のたびに UI 上の選択を保存済み設定で上書きするためである。専用回帰テストは「ユーザーがチェックを変更した後に再試行する」経路を含まず、この欠陥を検出できていない。

### Info — 旧回帰 wrapper の固定 digest が今回の変更と一致しない

- Classification: `verification-infra`
- `bash scripts/sprint-035-patch-001-regression.sh` は Google Chat `app.js` と edition digest の固定値差分で overall FAIL。
- 同 wrapper 内の Chatwork API / search / wizard は 35/35、legacy wrapper は 33/33 PASS。
- 今回の製品 FAIL の理由ではないが、固定 digest は現行候補に合わせた更新または意図確認が必要。

## Executed Evidence

| Command / check | Result |
|---|---|
| `node scripts/sprint-035-patch-003-discovery-test.mjs` | 32 PASS / 0 FAIL |
| `node scripts/sprint-020-google-chat-test.mjs` | 50 PASS / 0 FAIL |
| `node scripts/sprint-024-data-causality-test.mjs` | 43 PASS / 0 FAIL |
| `node scripts/sprint-035-patch-002-git-pull-test.mjs` | 148 PASS / 0 FAIL |
| `node scripts/sprint-019-google-chat-test.mjs` | 50 PASS / 1 FAIL。README の旧期待値で、今回差分に非因果。 |
| `bash scripts/sprint-035-patch-001-regression.sh` | 固定 digest 差分で overall FAIL。Chatwork 部分は 35/35 と 33/33 PASS。 |
| `git diff --check` | PASS |

## Browser Evidence

固定の synthetic data だけを返すローカル helper で、実際の wizard DOM を操作した。

- waiting: 最新候補を確認中であり、既存選択や履歴には影響しない旨を表示。
- complete: 既知候補は選択済み、現在取得できない既知候補は保持、新規候補は未選択。console error 0、desktop 横 overflow 0。
- partial: 全参加スペースではない旨を表示し、新規候補は未選択。console error 0、720px の 200% 相当レイアウトで横 overflow 0。
- failed: 保存済み候補が全参加スペースではない旨と再試行導線を表示。console error 0。
- mobile: ブラウザ有効幅 375px で `scrollWidth=375`、横 overflow なし。
- screenshots: `/tmp/gchat-eval-browser/agentic-waiting.png`, `/tmp/gchat-eval-browser/agentic-complete-desktop.png`, `/tmp/gchat-eval-browser/agentic-complete-mobile.png`, `/tmp/gchat-eval-browser/agentic-partial-200pct-equivalent.png`

上記 failed 画面からの再試行で High finding を再現した。

## Not Run / 未評価

- 実 Google OAuth、Google Chat API、実 Secret 値、GitHub Actions、remote write: `not-run`（Sprint の禁止事項に従った）
- browser の正確な 200% zoom: `not-run`（720px の 200% 相当レイアウトのみ）
- back / exit の全経路: `not-run`
- 全 overlay の再適用: `not-run`
- TypeScript `app` build: `not-run`（この候補には依存関係が未導入）

## Evaluator Self-review

- High finding は実際に動作する候補の DOM で再現し、今回差分内の共通コードへ結び付けた。
- Generator の自己評価だけを verdict の根拠にはしていない。
- 実アカウント、Secret 値、OAuth、外部 write は使用していない。
- 評価で編集したのはこの feedback ファイルだけである。

---

## Retry 1 Evaluation — 最新判定

### Verdict

- Result: **PASS**
- Previous High finding: **resolved**
- Failure kind: `none`
- Finding classification: 初回の `product` finding は修正済み。Retry 1で新規findingなし。
- Escalation recommendation: `none`

初回FAILとHigh findingの履歴は上に保持する。Retry 1では、failed再試行で失われていた未保存checkbox、検索欄focus、caretが、complete／partial／failedの全結果で保持されることを独立に再確認した。

### Retry 1 Direct Evidence

- `node scripts/sprint-035-patch-003-discovery-test.mjs`: `SPRINT035_PATCH003_PASS=45 SPRINT035_PATCH003_FAIL=0`
- 実ローカルwizard DOMで、保存済み1件だけが選択されたbootstrapを確認した。
- 保存済み未選択SPACEを追加して選択2件にし、検索語を `今回`、caretを `2/2`、activeElementを `#settings-space-search` にした後にRetryした。
- Retry結果が `complete`、`partial`、`failed` のいずれでも、query=`今回`、caret=`2/2`、検索欄focus、選択2件を保持した。
- 再認証導線では接続用JSON選択画面へ移り、Retry snapshotを表示・復元しなかった。続く「設定を終了する」では「設定や接続情報は変更していません」と表示した。
- 「選択をすべて外す」による明示破棄はRetry後も選択0件のままで、古い2件snapshotへ戻らなかった。
- Retry snapshotはRetryボタンのlocal closureから当該 `discoverConfiguredSpaces(snapshot)` だけへ渡る。戻る／終了／再認証のhandlerへ保存・受渡しするpathはない。
- desktop既定幅で横overflow 0。390px viewportでは `innerWidth=390`、有効幅375px、`scrollWidth=375`、横overflow 0。console error 0。

### Proportional Regression Evidence

| Command / check | Retry 1 result |
|---|---|
| `node scripts/sprint-035-patch-003-discovery-test.mjs` | 45 PASS / 0 FAIL |
| `node scripts/sprint-020-google-chat-test.mjs` | 50 PASS / 0 FAIL |
| `node scripts/sprint-024-data-causality-test.mjs` | 43 PASS / 0 FAIL |
| Agentic／Yasashii `app.js` byte comparison | SHA-256一致 |
| Agentic／Yasashii Retry専用回帰 byte comparison | SHA-256一致 |
| `git diff --check` | 初回評価のPASSを継承。Retry 1でfeedback以外の追加編集なし |

`node scripts/sprint-035-patch-002-git-pull-test.mjs` のRetry 1再実行は、sandbox内ではローカルlistenが `EPERM` となり、権限付き再実行は長時間処理中断のため完了結果なしとして `not-run` とする。初回評価に記録済みの148/148は履歴として残すが、Retry 1の新規実行証拠には数えない。今回のactual diffは `app.js` のRetry状態保持と専用回帰だけで、旧Patch 001の固定digest／edition inventory失敗は意図的に変わった同ファイルの旧baselineであり、本Retryの製品FAILとは因果がない。

### Retry 1 Scores

| Criterion | Score | Evidence |
|---|---:|---|
| C1 Core experience | 5/5 | 3結果のRetryで編集状態を保持。 |
| C6 Stability / no regression | 5/5 | 専用45/45、Google Chat 50/50、因果関係43/43、実DOM console error 0。 |
| C8 Interaction quality | 5/5 | query、focus、caret、未保存選択、明示破棄を確認。 |
| C14 Visual integrity | 5/5 | desktop／390px相当とも横overflow 0。 |

初回評価で合格済みかつRetry actual diffと無関係な基準は、増分再評価の原則により証跡を引き継ぐ。必須閾値未達はなく、Retry 1の最新判定はPASS。

### Not Run / 未評価

- 実Google OAuth、Google Chat API、Repository Secret、GitHub Actions、remote write: `not-run`
- 正確なbrowser 200% zoom: `not-run`（Retry 1の要求外）
- 実外部環境への設定保存、commit、push: `not-run`
- 上記の長時間回帰の完了結果: `not-run`

### Retry 1 Evaluator Self-review

- Generatorの自己申告だけでなく、専用回帰と実DOM操作で初回High findingの再現手順を再評価した。
- 製品コード、progress、stateは編集していない。
- 実アカウント、Secret値、OAuth、外部writeは使用していない。
