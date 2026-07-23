# Sprint 037 Patch 001 独立評価

## 判定

- Sprint contract result: **PASS**
- Product candidate result: **PASS**
- Product findings: **0件**
- Verification-infra findings: **0件（合否を妨げる現行finding）**
- 評価基点: `0fa7af24551c149c3aabf9671d4cd87d6c276192`
- 評価対象: `sprint-037-patch-001` の未commit candidate

呼び方変更transactionを実行すると、正規化後の値は
`secretary/memory/preferences.md`、`secretary/AGENTS.md`、
`secretary/memory/MEMORY.md` の3つの現役表示へだけ反映される。
journal本文は `設定を変更: 呼び方`、Git commit subjectは
`設定を変更（呼び方）` に完全一致し、commit bodyは空である。

Unicode、連続空白、引用符、shell／Markdown風metacharacterを含む合成値でも、
完全値、入力固有断片、JSON／URL escape、Base64、SHA-256表現は履歴メタデータへ
現れなかった。実装上も、正規化後の値は3正本の置換と呼出結果にだけ渡され、
journal／commitへ向かう引数は入力非依存の固定literalである。

5つのfailure injectionでは、3正本、journal、初回decision、Git HEAD、index、
working treeが開始時へ戻った。成功時はjournal 1 event、local commit 1件で、
remoteとpush処理はない。

## 軽量評価

Type: microのため、Sprint契約に従って3項目だけを採点した。

| 項目 | スコア | 閾値 | 判定と根拠 |
|---|---:|---:|---|
| 機能完全性 | 5/5 | 5 | 固定journal／固定commit subject、空body、3正本一致、初回decision不変、1 event／1 commitを実fixtureで確認。 |
| 動作安定性 | 5/5 | 5 | Unicode・metacharacter合成値と5失敗点が合格。HEAD／index／working treeを含むatomic rollback、remoteなし、push処理なしを確認。 |
| 回帰なし | 5/5 | 5 | Sprint 037、011、012、022、Patch専用一時downstream、Sprint 045保護6 files、diff checkがすべて合格。実repo・cache・remoteへのwriteなし。 |

全項目が閾値5を満たすため、micro PatchはPASSである。

## Acceptance Criteria

| # | 結果 | 独立確認 |
|---|---|---|
| 1 | PASS | journalはtype `did` の1 eventで、対象行は `- 09:30 [did] 設定を変更: 呼び方` に完全一致。 |
| 2 | PASS | local commitは1件、subjectは `設定を変更（呼び方）`、bodyは空。remoteなし、push処理なし。 |
| 3 | PASS | Unicode、連続空白、`=`、`:`, 引用符、backtick、`$()`、`${}`、Markdown記号の合成値で、完全値・固有断片・JSON／URL escape・Base64・SHA-256がjournal／subject／bodyに0件。固定literalへのデータフローも確認。 |
| 4 | PASS | 正規化値は3正本の現役表示だけに一致して反映。他設定、手書き行、MEMORY索引、open／closed、初回decisionを保持。 |
| 5 | PASS | `before-write-1/2/3`、`before-journal`、`before-commit` の全5点で、3正本、journal、HEAD、index、working treeが開始snapshotへ復元。部分commit／追加event 0件。 |
| 6 | PASS | `owner-name-transaction.mjs` に `agentic`／`yasashii`／`edition` 分岐0件。Agenticと一時downstreamが同じ非再掲fixtureに合格。 |
| 7 | PASS | Agenticと一時downstreamのscriptは6,626 bytes、SHA-256 `f79242124e4cc13152774f0434b504fc5e97f316304e088884b8bbc7b65d8d24` でbyte一致。実Yasashii同期済みとは判定していない。 |
| 8 | PASS | Sprint 037専用14/14。4経路、候補探索、Unicode case-fold、hostname除外、候補0件、保存前確認、transaction、初回decision、利用者中立性scanを維持。 |
| 9 | PASS | Sprint 045保護6 filesの基点差分0件。transaction fixtureのopen／closed行を保持。 |
| 10 | PASS | 必須回帰は専用14/14、Patch 5/5、Sprint 011 68/68、Sprint 012 38/38、Sprint 022 69/69＋wrapper 8/8、`git diff --check` PASS。 |
| 11 | PASS | 評価中のwriteはAgenticの本feedbackと、各testが作成・cleanupしたOS一時fixtureだけ。実downstream、installed cache、利用者workspace、external service、remote、releaseへのwrite 0件。 |

## 履歴メタデータと3正本の直接確認

### 成功時

`scripts/sprint-037-test.mjs` と
`scripts/sprint-037-patch-001-test.mjs` を独立実行し、通常Unicode値と
次の性質を持つ合成値を確認した。

```text
Unicode全角空白 / 連続空白 / = / : / " / ` / $() / ${} / *_[ ]_
```

観測結果:

```text
active preferences name = 正規化後値
active AGENTS name      = 正規化後値
active MEMORY name      = 正規化後値
journal event           = - 09:30 [did] 設定を変更: 呼び方
commit subject          = 設定を変更（呼び方）
commit body             = <empty>
commit delta            = +1
remote                  = <empty>
working tree            = clean
```

値の完全一致だけでなく、固有断片、`JSON.stringify`、`encodeURIComponent`、
Base64、SHA-256表現についてもjournal／subject／bodyへの混入0件を確認した。
実装差分では `normalizedName` が3正本の `replaceSetting` にだけ渡され、
`journal-add` と `commitOwnedChanges.message` は固定文字列である。

Git commitは3正本とjournalの変更内容そのものを履歴へ記録するが、
subject／body等の履歴メタデータへ呼び方を重ねて記録しない、という契約上の
区別も維持されている。

### 失敗時

次の5点をそれぞれ独立した一時Git workspaceで実行した。

```text
before-write-1
before-write-2
before-write-3
before-journal
before-commit
```

各点で例外を確認し、3正本と初回decisionのbyte列、journalの不存在、
Git HEAD、cached binary diff、porcelain working-tree snapshotが開始時と一致した。
部分commitと追加journal eventは0件である。

## 共通coreと一時downstream

Patch専用testはAgentic candidateの `plugins/secretary/` をOS一時領域へ複製し、
共通transactionを別moduleとして読み込んだ。

| 対象 | bytes | SHA-256 | fixture |
|---|---:|---|---|
| Agentic candidate | 6,626 | `f79242124e4cc13152774f0434b504fc5e97f316304e088884b8bbc7b65d8d24` | PASS |
| 一時downstream candidate | 6,626 | `f79242124e4cc13152774f0434b504fc5e97f316304e088884b8bbc7b65d8d24` | PASS |

byte列、digest、非再掲fixtureが一致し、edition別分岐は0件だった。
これは共通coreの下流適用可能性を示す証拠であり、実
`yasashii-secretary` repoの同期完了を意味しない。

## 実行証跡

| Command / check | 結果 |
|---|---|
| `node scripts/sprint-037-test.mjs` | exit 0、14 PASS / 0 FAIL。scan 279 files、allowlist 40、unexpected 0、負fixture 3/3。 |
| `node scripts/sprint-037-patch-001-test.mjs` | exit 0、5 PASS / 0 FAIL。Agentic／一時downstream byte・SHA一致、両fixture合格。 |
| `bash scripts/sprint-011-regression.sh` | exit 0、68 PASS / 0 FAIL。 |
| `bash scripts/sprint-012-regression.sh` | exit 0、38 PASS / 0 FAIL。 |
| `bash scripts/sprint-022-regression.sh` | exit 0、69 PASS / 0 FAIL、wrapper 8 PASS / 0 FAIL。 |
| `git diff --check` | PASS。 |
| Sprint 045保護6 filesの `git diff HEAD -- <paths>` | 0 files。 |
| `shasum -a 256 plugins/secretary/scripts/owner-name-transaction.mjs` | `f79242124e4cc13152774f0434b504fc5e97f316304e088884b8bbc7b65d8d24`。 |
| `wc -c plugins/secretary/scripts/owner-name-transaction.mjs` | 6,626 bytes。 |

Sprint 045の保護対象は次の6 filesである。

- `plugins/secretary/templates/AGENTS.md`
- `plugins/secretary/scripts/project-tools.mjs`
- `plugins/secretary/skills/daily/SKILL.md`
- `plugins/secretary/skills/projects/SKILL.md`
- `plugins/secretary/skills/weekly/SKILL.md`
- `scripts/sprint-015-regression.sh`

## 初回の並列Sprint 022結果

Generatorのprogressには、3 suiteを並列実行した最初のSprint 022で
`safe-git timeout後のcommit・push・子孫・副作用0件` が
`calls=[]` となった1 FAILが記録されている。

- Classification: `verification-infra`
- Current result: **closed / non-blocking**

本PatchはSprint 022の製品実装・testを変更していない。契約に記載された
`bash scripts/sprint-022-regression.sh` をEvaluatorが単独実行すると、
69/69＋wrapper 8/8で再現可能に合格した。初回1件は並列負荷時だけの
非決定的なfixture timingとして扱い、製品findingや0 FAILへの言い換えには使わない。

## Not Run / 境界

- 既知redのbroad master／release baseline: 契約の因果範囲外で、指示どおりnot-run。
- 実 `yasashii-secretary` repoへの同期・commit・push: not-run。
- installed cache、利用者workspace、external service、OAuth、Repository Secret、
  GitHub Actions、remote、release: not-run。
- browser／screenshot: 常駐UI変更がなく、micro契約のsafe harbor外のためnot-run。

## Evaluator自己レビュー

- Generatorの自己評価だけでなく、専用2 suite、近接3 suite、実差分、
  source上の値データフロー、保護6 files、script digestを独立確認した。
- Yasashii Sprint 037のFAIL原因だった値再掲を、固定文言の完全一致と
  Unicode／metacharacter合成値の両方で再確認した。
- 一時downstreamのPASSを実Yasashii同期完了へ昇格していない。
- 初回並列Sprint 022の1 FAILを隠さず、単独再実行の0 FAILと分けて記録した。
- 実装、spec、contract、state、progress、downstream、cache、workspace、remoteは
  編集していない。書き込んだ正本は本feedbackだけである。
