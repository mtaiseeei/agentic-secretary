# Sprint 038 Patch 002 独立再評価

## 判定

- Sprint contract result: **NOT PASS — verification-scope-issue**
- Candidate branch: `codex/sprint-038-patch-002-windows-compat`
- Candidate full commit: `24520a1d06f8d3833568a1386bf814e1085f5da9`
- Incremental base: `c7319e55b6ea7018870fe8cd254020088f995ea6`
- Evaluator環境: `Darwin arm64`、Node.js `v22.23.2`
- Product findings: **0件**
- Verification-infra findings: **1件（blocking）**
- Escalation Recommendation: **none**

今回の増分は、Windows実機で確認された2件のproduct findingを直接修正している。

1. projectの更新・完了・再開transactionとmemory directory削除のbackup／restoreに残っていた
   再帰 `cpSync` を、通常fileを1件ずつコピーし、symlinkを参照先へ辿らない
   `copyTreeNoFollow` へ置き換えた。
2. `preferences.md` と呼び方変更transactionのMarkdown行を本文と行末へ分離し、
   CRLFでも見出しを一意に認識し、対象外の手書き行と既存行末を保持するよう変更した。

macOSでは、対象suite 12/12、project stage／complete／reopen、memory delete rollback、
CRLF preferences／owner-name、既存回帰、offline／archive gateを独立再実行し、product failureを再現しなかった。
一方、Windowsでproduct codeが実際に変わった完全SHA `24520a1...` は未実行である。
AC13と `docs/spec/constraints.md` §21.8 はWindowsネイティブの実行証跡を必須とし、
macOSの結果をWindows PASSへ昇格することを禁止しているため、現時点ではSprintをPASSにできない。

## Rubric

| 項目 | Score | Threshold | 判定根拠 |
|---|---:|---:|---|
| C1 完成度 | 3/5 | 4 | Agentic製品修正とmacOS回帰はgreenだが、変更後SHAのWindowsネイティブ証跡と後続Yasashii隔離candidateが未完了。 |
| C2 構文・整合 | 5/5 | 5 | 対象suite、CRLF回帰、release integrity、offline／archive gate、`git diff --check`が成功。 |
| C3 機能の実証 | 3/5 | 4 | 実ファイルでtree／bytes／mode、rollback、CRLFを実証したが、対象OSであるWindowsの修正後実行がない。 |
| C4 非エンジニア体験 | 4/5 | 4 | UI／利用者向けcopyの変更なし。Windows不具合修正とmigration不要の説明を維持。 |
| C5 安全・規律 | 5/5 | 5 | no-follow、no-overwrite、境界拒否、外部canary不変、rollback、push／外部write 0を確認。 |
| C6 無回帰 | 4/5 | 5 | offlineはproduct FAIL 0、archiveは291/291だが、必須Windows回帰が変更後SHAで未実行。 |
| C7 やさしさ | 4/5 | 4 | 利用者向けsurfaceの変更なし。既存説明を維持。 |
| C8 wizard体験・デザイン | N/A | 4 | CLI／filesystem Patchであり、wizard／UI差分なし。 |
| C9 配布チャネル非依存 | 5/5 | 5 | 配布面の回帰にproduct FAILなし。 |
| C10 更新の安全性 | 5/5 | 5 | project／memory／settings／文書のfailure injectionと開始前復元を確認。 |
| C11 Google Chat境界 | 5/5 | 5 | 対象外。offline／archive全体回帰にproduct FAILなし。 |
| C12 release履歴・現在candidate整合 | 5/5 | 5 | `0.9.2`のmanifest／CHANGELOG／release integrityが一致。 |
| C13 edition分離・互換 | 4/5 | 5 | private／cache／利用者workspace／実Yasashii repoは不変。Yasashii隔離candidateはAgentic PASS後の順序に従い未実行。 |
| C14 Markdown可読性 | 5/5 | 5 | 製品会話surface差分なし。Sprint 038とoffline／archive回帰がgreen。 |
| C15 authorization・意味保存 | 5/5 | 5 | Sprint 038会話回帰64/64。 |

C1、C3、C6、C13が閾値未達である。今回の増分からproduct defectは再現しておらず、
主な未達は変更後candidateをWindowsネイティブで実行していないことによる。

## Acceptance Criteria

| AC | 結果 | 独立確認 |
|---:|---|---|
| 1 | PARTIAL | 前SHAでproject create＋journalはWindows PASS。create経路は実差分の影響外。project更新transactionは変更されたため、変更後Windowsの再実行が必要。 |
| 2 | NOT VERIFIED ON CHANGED WINDOWS SHA | project stage／complete／reopenをmacOSで実操作し、tree／bytes／modeを保持。変更後Windowsは未実行。 |
| 3 | NOT VERIFIED ON CHANGED WINDOWS SHA | CRLF settings、memory directory deleteを含む変更面はmacOS PASS。変更後Windowsは未実行。 |
| 4 | PARTIAL | Node-native入口とBash非依存を静的・macOS回帰で確認。変更後Windowsは未実行。 |
| 5 | PARTIAL | macOSでtraversal、prefix sibling、外向きsymlinkを副作用0で拒否。前SHAではWindows junction拒否がPASSしたが、共有filesystem helper変更後のWindows再実行が必要。 |
| 6 | PARTIAL | project／TODO／decision／settings／documentとmemory delete restoreをmacOSで確認。変更後Windowsは未実行。 |
| 7 | PARTIAL | retry／再実行の重複0をmacOSで確認。変更後Windowsは未実行。 |
| 8 | PASS（macOS safe harbor） | offline gateは0 product FAIL、Git-free archive gateは291/291。既存安全assertを維持。 |
| 9 | NOT RUN | PASS済みAgentic完全SHAから作るYasashii隔離candidateは、Agentic先行評価の順序に従い未作成・未実行。 |
| 10 | PASS（観測範囲） | candidate repoと一時directory以外へのwriteなし。private、cache、利用者workspace、外部serviceは未変更。 |
| 11 | PASS | `0.9.2`のmanifest／CHANGELOG／release integrityが一致。 |
| 12 | PASS | Windows互換修正、migration不要、Agentic先行→Yasashii後続、my-vault対象外の説明を維持。 |
| 13 | FAIL / NOT VERIFIED | 変更後SHAのWindowsネイティブと後続Yasashii隔離candidateが未実行。macOS結果をWindows PASSへ昇格していない。 |
| 14 | PASS | branchはremoteより1 commit ahead。push、tag、Release、marketplace更新、install/updateを行っていない。 |

## 増分差分と実装確認

```text
git diff --name-status c7319e55b6ea7018870fe8cd254020088f995ea6..24520a1d06f8d3833568a1386bf814e1085f5da9
M docs/feedback/sprint-038-patch-002.md
M docs/progress/sprint-038-patch-002.md
M docs/sprints/state.md
A plugins/secretary/scripts/lib/markdown-lines.mjs
M plugins/secretary/scripts/lib/safe-fs.mjs
M plugins/secretary/scripts/owner-name-transaction.mjs
M plugins/secretary/scripts/project-tools.mjs
M plugins/secretary/skills/memory-care/scripts/memory-tools.mjs
M scripts/sprint-037-patch-001-test.mjs
M scripts/sprint-038-patch-002-windows-test.mjs
```

評価対象の製品差分は5ファイルと新規helper 1ファイル。`docs/sprints/state.md`、progress、前feedback、
testsはrole正本／検証差分として製品判定から分離した。

### 再帰copy inventoryとworkspace-repo分類

- `project-tools.mjs` のdirectory再帰copy 2箇所は `copyTreeNoFollow` へ置換済み。
- `memory-tools.mjs` のdirectoryを取り得るdelete backup／restoreは `copyTreeNoFollow` へ置換済み。
- `secretary-store.mjs` の `cpSync` は `MEMORY.md` という単一fileのbackup／restoreだけで、
  `recursive: true` を使わない。
- `workspace-repo.mjs` はtemplate treeを先に列挙し、symlinkを拒否し、全destinationを事前検査した後、
  通常fileごとに非再帰 `cpSync` を呼ぶ。`recursive: true` はなく、今回のdirectory transaction crashと同じ面ではない。
- 関連する公開製品面に、directoryへ `recursive: true` を指定した `cpSync` は残っていない。

`copyTreeNoFollow` はdestination既存時に `copy-target-exists` で停止し、通常fileは
`COPYFILE_EXCL`、directoryはsource modeで作成する。symlinkは `readlinkSync` で得たlink objectを複製し、
参照先treeを列挙しない。Windowsでは参照先の種類を確認してfile link／junctionを選ぶ。
projectの更新・移動は既存の `assertNoSymlinks` によりproject tree内のsymlink／junctionをcopy前に拒否する。
memory deleteはsymlink自体のbackup／restoreを許し、参照先を削除しない。

### CRLF解析

`parseMarkdownLines` は各行を `{ text, ending }` として保持し、`renderMarkdownLines` は元の行末を再利用する。
`pref-set`、`pref-note-add`、owner-nameの見出し比較は末尾 `\r` を本文へ含めない。
対象回帰では次を確認した。

- `## 言葉遣い` と `## 秘書のメモ` は各1件のまま。
- `pref-set` → `pref-note-add` の連続実行が成功。
- 手書き行を保持。
- 既存CRLFへ単独LFを混在させない。
- owner-name変更後もpreferences／AGENTSのCRLFと3正本の値を保持。

## 完了した実行証跡

### 1. 対象Windows-storage suite（macOS実行）

```text
node scripts/sprint-038-patch-002-windows-test.mjs
OS=darwin arch=arm64 node=v22.23.2
SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0 OS=darwin
exit 0
```

日本語・空白path、既存nested project、CRLF preferences、directory memory delete、failure injection、
rollback、retry、traversal、prefix sibling、外向きsymlink、Bash非依存を実行した。
これはmacOS証跡であり、Windows PASSには数えていない。

### 2. copyとproduct transactionの追加独立検査

一時fixtureで次を直接確認した。

```text
copyTreeNoFollow:
PASS exact bytes / exact POSIX modes / exact readlink text
PASS outside canary unchanged / destination no-overwrite

product transaction:
PASS project stage exact tree/bytes/modes
PASS complete -> reopen exact nested bytes/modes
PASS journal failure rollback exact tree/bytes/modes
PASS project symlink rejected; outside canary unchanged
PASS memory directory delete reindex-failure rollback exact tree/bytes/modes
```

初回の追加fixture準備は、`workspace-repo prepare` の入力rootを未作成のまま渡したため
`working-root-unsafe` で副作用なく停止した。仕様どおりrootを通常directoryとして作成後、上記検査はPASSした。

### 3. 対象・近傍回帰

```text
node scripts/sprint-037-patch-001-test.mjs
RESULT: 5 PASS / 0 FAIL

bash scripts/sprint-010-regression.sh
PASS=56 FAIL=0

bash scripts/sprint-011-regression.sh
PASS=68 FAIL=0

bash scripts/sprint-012-regression.sh
PASS=38 FAIL=0

bash scripts/sprint-015-regression.sh
PASS=68 FAIL=0

node scripts/sprint-022-safety-test.mjs
SPRINT022_PASS=69 SPRINT022_FAIL=0

node scripts/sprint-038-test.mjs
SPRINT038_PASS=64 SPRINT038_FAIL=0

node scripts/sprint-038-patch-001-test.mjs
SPRINT038_PATCH001_PASS=6 SPRINT038_PATCH001_FAIL=0

python3 scripts/check-release-integrity.py --root .
PASS release integrity: manifests and CHANGELOG are consistent
```

### 4. macOS offline gate

```text
node scripts/master-release-gate.mjs --mode offline
RELEASE_GATE mode=offline status=pass suites=20 required=20 passed=19
verification-infra=1 failed=0 skipped=0 assertions=708 pass=702 fail=0 infra-fail=6
exit 0
```

6件は固定historical fixtureのloopback `listen EPERM`で、既存classifierが
`verification-infra`として分離した。product FAILは0件。

### 5. Git-free archive gate

完全SHA `24520a1d06f8d3833568a1386bf814e1085f5da9` の `git archive` を
`/private/tmp` の一時directoryへ展開し、終了後に削除した。

```text
node scripts/master-release-gate.mjs --mode archive --root <git-free-candidate>
RELEASE_GATE mode=archive status=pass suites=23 required=15 passed=15
verification-infra=0 failed=0 skipped=0 assertions=291 pass=291 fail=0 infra-fail=0
exit 0
```

### 6. diff・Git状態

```text
git diff --check c7319e55b6ea7018870fe8cd254020088f995ea6..24520a1d06f8d3833568a1386bf814e1085f5da9
exit 0

git status --short --branch
branch: codex/sprint-038-patch-002-windows-compat
remoteとの差: ahead 1
評価開始時のmodified: docs/sprints/state.md のみ（Orchestrator所有）
```

## Windows証跡の増分採用

前candidate `c7319e55b6ea7018870fe8cd254020088f995ea6` では、ユーザー所有Windows実機
`Windows 10.0.26200.8875`、`win32 x64`、Node.js `v22.23.2` で9 PASS／3 FAILだった。

変更後も関連codeとcheck内容が変わらない次の6 labelは、前回Windows証跡を増分採用できる。

- native OS metadata／fixture copy
- project create and journal
- timeline／weekly／archive／reindex／resume
- TODO failure rollback
- traversal／prefix sibling rejection
- external symlink／junction rejection

ただし、次の変更面を含むlabelは証跡が失効している。

- project update／complete／reopenのfile-by-file stage copy
- CRLF settingsと`pref-note-add`
- directory memory delete backup／restore
- changed project rollback assertion
- changed source inventory／Bash非依存assert

そのため、前回の9 PASSを変更後candidateの9/12として表示せず、変更後完全SHAでは
Windows suite全体を再実行する。TODOの前回FAILはproject crash後のcascadeであり、独立product findingには数えない。

## Finding分類

### V1 — 変更後product candidateのWindowsネイティブ実行が必要

- Classification: `verification-infra`
- Severity: blocking
- Route: `verification-scope-issue`

前Windows実行で失敗したproject transactionとCRLF settingsは今回の製品差分そのものである。
macOSでは修正動作と全回帰を確認できたが、問題が起きたWindows／Node.js上で変更後codeをまだ実行していない。
これは現時点で再現したproduct defectではなく、必須検証面が残っている状態である。

### Product findings

- **0件**。今回の実差分、対象操作、追加のtree／bytes／mode検査、CRLF、path guard、rollback、
  retry、release integrity、offline／archive gateに再現するproduct failureはない。

## 次に必要なWindows実行

Windows実機で、必ず次の完全SHAをcheckoutした状態で実行する。

```text
git rev-parse HEAD
# 24520a1d06f8d3833568a1386bf814e1085f5da9

node scripts/sprint-038-patch-002-windows-test.mjs --require-windows
```

必要な結果は次のとおり。

```text
OS=win32
SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0 OS=win32
exit 0
```

access violation `0xC0000005`が再発せず、12 scenariosすべてが完走すること。
証跡には実行日時、Windows version、Node.js version、full commit、command、exit codeを付ける。
この結果をstateへ採用した後、同じ完全SHAをfresh独立Evaluatorが増分再判定する。
それまではYasashii同期、push、tag、Release、marketplace更新、実plugin install/updateを行わない。

## Evaluator自己レビュー

- Generatorの自己評価を合否根拠にせず、`c7319e5..24520a1` の実diffを起点に変更面を決めた。
- project stage／move、memory delete backup／restore、no-follow、no-overwrite、rollback、CRLFを実ファイルで追加確認した。
- `workspace-repo.mjs` の残存 `cpSync` を名前だけで同じ問題とせず、file単位・非再帰・symlink拒否・事前検査を確認して分類した。
- 前Windows 9 PASSは、関連codeとcheckが変わらない6 labelだけを増分採用し、変更面へ流用していない。
- macOS 12/12をWindows-native PASSへ昇格していない。
- 完了したcommand、失敗後に正しい前提で再実行した診断、not-runを分離した。
- productとverification-infraを分離し、未実行面からproduct defectを推測していない。
- 実装、test、spec、contract、state、progressは編集していない。書き込んだ正本は本feedbackだけである。
