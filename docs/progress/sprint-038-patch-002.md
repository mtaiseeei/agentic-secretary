# Sprint 038 Patch 002 実装handoff

- Candidate: public Agentic Secretary `0.9.2`
- 対象: Agentic版の共通coreと配布準備
- UI変更: なし
- workspace migration: なし
- Windows実機: **修正後candidateはnot-run**（このGenerator環境はmacOS。修正前 `81b44147485caefc325b3b6a3cee5a09101c7577` はfixture作成時のnative crashで製品処理へ未到達）

## 実装内容

- 記憶、journal、TODO、settings、単発文書保存が共有する記録境界を
  `plugins/secretary/scripts/lib/secretary-store.mjs` へ集約した。
- `memory-tools.mjs` と `workspace-tools.mjs` をWindowsでもBashを使わず実行できる正規入口として追加した。
- `project-tools.mjs` と `owner-name-transaction.mjs` は、Windows形式pathをBashへ渡さず、同一process内のNode.js APIでjournal／TODOを更新するよう変更した。
- 従来の `memory-tools.sh` と `workspace-tools.sh` はPOSIX利用者向け互換wrapperとして残した。`exec node ... "$@"` により、引数、標準入力／出力／エラー、終了コードをNode.js本体へそのまま渡す。
- path guardは実行OSの `node:path` だけで絶対path、root、relative containmentを判定する。POSIX上でWindows形式文字列を別OSの絶対pathとして解釈する分岐は追加していない。
- project、memory、TODO、settings、単発文書の本体更新とjournal／索引をtransactionで保護し、中途失敗時は開始前snapshotへ戻す。journal、TODO、decision、topic、文書の再実行は同一eventを重複させない。
- 配布Skillの主要導線をNode.js入口へ変更し、Windowsの正規導線からBash必須条件を除いた。
- `windows-2025` とNode.js 22で実行する
  `.github/workflows/windows-recording-regression.yml` を追加した。drive letter、空白、日本語、project一式、memory／weekly／archive／resume、TODO、settings、文書、rollback、再実行、traversal、symlink／junctionを実行する。
- marketplace、Claude／Codex manifest、CHANGELOG、README、current release gateを`0.9.2`へ整合した。公開済み最新版は`0.9.1`のままと明記し、migration不要、Agentic先行評価、my-vault対象外を示した。

## 2026-08-11 Windows fixture限定修正

- Windows `10.0.26200.8875`、`win32 x64`、Node.js `v22.23.2`のユーザー実機で、修正前candidate `81b44147485caefc325b3b6a3cee5a09101c7577` の
  `node scripts/sprint-038-patch-002-windows-test.mjs --require-windows` が、製品entrypointより前の再帰 `fs.cpSync` でaccess violation `0xC0000005`となった。Node.js `v22.22.1`でも同じ結果だった。
- `scripts/sprint-038-patch-002-windows-test.mjs` のfixture作成だけを、directory列挙と単一fileごとの `copyFileSync` へ置き換えた。再帰 `fs.cpSync` を使わず、製品の書込み処理は変更していない。
- コピー直後に、相対pathのdirectory／file treeと全fileのSHA-256が `plugins/secretary/templates` と一致することを既存の `native OS metadata` check内で確認する。12シナリオの数、後続操作、failure injection、境界assert、`--require-windows` の条件は変更していない。
- このGenerator roundの実装diffは検証code 1 fileと本progressだけで、製品codeは0行。直前roundは製品codeのNode-native化を含むため、verification-onlyの2回連続ではない。

## failure injectionとrollback

- `journal-after-write`: project作成とjournal／索引を開始前へ戻す。
- `todo-before-journal`: TODO正本とjournal／索引を開始前へ戻す。
- `decision-before-journal`: decision正本とjournal／索引を開始前へ戻す。
- `pref-before-index`: preferencesとMEMORY索引を開始前へ戻す。
- `deliverable-before-journal`: 文書、journal、索引を開始前へ戻す。
- owner-nameの既存 `before-journal`／`before-commit` と所有path限定commitの回帰は維持した。

## 検証結果

1. `node scripts/sprint-038-patch-002-windows-test.mjs`
   - macOS `darwin arm64`、Node.js `v22.23.2`
   - exit 0、`SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0`
   - 空白・日本語を含む一時workspaceでproject、memory、TODO、settings、文書、rollback、再実行、境界拒否を実動作確認。
   - Windows形式path文字列の模擬をWindows PASSには数えていない。
   - 変更後fixtureの相対treeと全file SHA-256がtemplateと一致。
   - `--require-windows` はmacOSでexit 1、`11 PASS / 1 FAIL`。Windows必須条件を維持し、macOS結果をWindows PASSへ昇格していない。
2. `bash scripts/sprint-010-regression.sh`
   - exit 0、`PASS=56 FAIL=0`
   - POSIX互換wrapper経由のtimeline、保存、引数、標準出力、終了コードを確認。
3. `node scripts/sprint-022-safety-test.mjs`
   - exit 0、`SPRINT022_PASS=69 SPRINT022_FAIL=0`
   - path guard、途中ancestor／基点／最終symlink、外部副作用0件、共通境界への集約を確認。
4. 主要な既存回帰
   - `bash scripts/sprint-009-regression.sh`: `41/0`
   - `bash scripts/sprint-011-regression.sh`: `68/0`
   - `bash scripts/sprint-012-regression.sh`: `38/0`
   - `bash scripts/sprint-015-regression.sh`: `68/0`
   - `node scripts/sprint-037-patch-001-test.mjs`: `5/0`
   - `node scripts/sprint-038-patch-001-test.mjs`: `6/0`
   - `node scripts/sprint-032-update-gate-test.mjs`: `15/0`
   - `node scripts/sprint-038-test.mjs`: `64/0`
   - `python3 scripts/check-release-integrity.py --root .`: PASS
5. `node scripts/master-release-gate.mjs --mode offline`
   - exit 0、`status=pass`
   - required suites `20/20`、passed `19`、verification-infra `1`、failed `0`
   - assertions `708`、pass `702`、product fail `0`
   - pinned historical suiteのloopback `listen EPERM` 6件は既存classifierがverification-infraと判定。product FAILへの読み替えなし。
6. `.git`を除いた一時candidateで `node scripts/master-release-gate.mjs --mode archive --root <candidate>`
   - exit 0、`status=pass`
   - required suites `15/15`、verification-infra `0`、failed `0`
   - assertions `291`、pass `291`、fail `0`
7. 限定修正の構文とdiff
   - `node --check scripts/sprint-038-patch-002-windows-test.mjs`: exit 0
   - `python3 scripts/check-release-integrity.py --root .`: exit 0
   - `git diff --check`: exit 0

## WindowsとYasashiiの未実行事項

- 修正後candidateのWindowsネイティブ実行は、このローカルmacOS環境では**not-run**。修正前 `81b44147485caefc325b3b6a3cee5a09101c7577` のnative crashは原因分類の証拠として保持するが、修正後candidateのAC1〜7／AC13 PASS証拠には使わない。workflowも未実行であり、Windows PASSは主張しない。
- Yasashii実repoは変更していない。Agenticの独立Evaluator PASSと完全SHA固定前のため、隔離candidate作成・byte parity・Windows回帰は**not-run**。
- `agentic-secretary-my-vault`、installed cache、利用者workspace、remote、tag、GitHub Release、marketplace公開、実plugin install／updateは変更していない。
- `node scripts/sprint-033-test.mjs` は、着手時点から存在するneutral-base digest不一致3件
  （`rules/safety.md` とGoogle Chat 2ファイル）で単独FAILする。対象3ファイルは本Patchで変更しておらず、保護baselineを本Patch都合で更新していない。master／archive release gateのproduct FAILには含まれない。

## 起動・回帰command

- macOS／Linux共通回帰: `node scripts/master-release-gate.mjs --mode offline`
- Windowsネイティブ: `node scripts/sprint-038-patch-002-windows-test.mjs --require-windows`
- GitHub Actions: `Windows recording regression` の `windows-native` job
- test URL: なし（CLI／filesystem操作のPatch）

## Evaluator向け確認シナリオ

- Windowsネイティブrunnerでworkflowを実行し、`OS=win32`、drive letter、空白、日本語path、12シナリオの0 FAILを記録する。
- project作成→journal、フル整理、文書archive／output、完了／再開、別repo pointer、関連TODOを確認する。
- memory、timeline、weekly、archive、reindex、resume、保護付き削除、TODO完了／持ち越し、settings、単発文書を確認する。
- failure injectionごとに本体、journal、索引が開始前digestへ戻ることを確認する。
- drive root、traversal、prefix sibling、基点junction、途中junctionでworkspace外canaryが不変であることを確認する。
- Agentic candidateの完全SHAを固定後、Yasashii隔離candidateへoverlayを適用し、共通core parityとYasashii固有surface digest不変を別に評価する。

## 自己評価と残課題

- 完全性: 4/5。Agentic実装とmacOS回帰は揃ったが、WindowsネイティブとYasashii隔離candidateは未実行。
- 安定性: 4/5。既存POSIX回帰と安全回帰はPASS。Windows実環境の証拠待ち。
- エラー処理: 5/5。主要中途失敗、rollback、再実行非重複、境界拒否を自動回帰へ追加。
- 回帰保護: 4/5。master gateはPASS。Windows workflow実行結果をEvaluatorが確定する必要がある。

Windowsネイティブ証拠がないため、本handoffだけでAcceptance Criteria 13のPASSやSprint完了は主張しない。
