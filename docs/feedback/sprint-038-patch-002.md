# Sprint 038 Patch 002 独立評価

## 判定

- Sprint contract result: **NOT PASS — verification-scope-issue**
- Product candidate result: **macOS上で確認した範囲はPASS。Windowsネイティブ面は未検証**
- Product findings: **0件**
- Verification-infra findings: **1件（blocking）**
- Escalation Recommendation: **none**
- Candidate branch: `codex/sprint-038-patch-002-windows-compat`
- Candidate full commit: `f14a9c3f59b07387ebd2968cf334b88e88b56143`
- Evaluator環境: `Darwin arm64`、Node.js `v22.23.2`

macOSで再現できる対象回帰、wrapper互換、path guard、failure injection、rollback、再実行、
release integrity、offline gate、Git-free archive gateはすべて最終的に0 product FAILだった。
独立再現した製品不具合はない。

ただし、AC13はWindowsネイティブ環境の実行証跡を必須とし、Windows path文字列の模擬を
PASS根拠にすることを明示的に禁止している。EvaluatorにはWindows実行面がなく、追加された
GitHub Actions workflowはcandidateが未pushのため起動できない。一方、AC14は独立Evaluator PASS前の
pushを禁止している。このため、現在の契約と利用可能な検証面の組合せではAC13を満たせない。
未実行をPASSへ読み替えず、製品FAILとも推測せず、blockingな`verification-scope-issue`とする。

## Rubric

| 項目 | Score | Threshold | 判定根拠 |
|---|---:|---:|---|
| C1 完成度 | 3/5 | 4 | macOS上の対象機能はgreenだが、必須のWindowsネイティブ証跡がなく契約全体は未完了。 |
| C2 構文・整合 | 5/5 | 5 | 対象suite、wrapper、release validator、archive gate、`git diff --check`が成功。 |
| C3 機能の実証 | 3/5 | 4 | 実ファイル操作、失敗注入、rollback、再実行はmacOSで実証したが、対象OSであるWindowsの実操作がない。 |
| C4 非エンジニア体験 | 4/5 | 4 | Windows修正とmigration不要をREADME／CHANGELOGで区別。常駐UI変更はない。 |
| C5 安全・規律 | 5/5 | 5 | traversal、prefix sibling、外向きsymlink、削除2段階、rollback、外部write 0を確認。 |
| C6 無回帰 | 4/5 | 5 | macOS offline/archiveは0 product FAILだが、必須Windows回帰を未実行のため5/5にはできない。 |
| C7 やさしさ | 4/5 | 4 | 利用者向け説明は不具合修正とmigration不要を短く示す。 |
| C8 wizard体験・デザイン | N/A | 4 | CLI/filesystem変更で、wizard／UI差分はない。 |
| C9 配布チャネル非依存 | 5/5 | 5 | 現行master回帰とrelease integrityがgreen。配布チャネル固有の新規依存は確認されない。 |
| C10 更新の安全性 | 5/5 | 5 | journal／TODO／設定／文書の失敗注入で開始前状態への復元と再実行の冪等性を確認。 |
| C11 Google Chat境界 | 5/5 | 5 | 本Patchの差分対象外。offline/archive全体回帰にproduct FAILなし。 |
| C12 release履歴・現在candidate整合 | 5/5 | 5 | manifest、README、CHANGELOG、release validator、archiveが`0.9.2`で整合。過去履歴の書換えを検出しない。 |
| C13 edition分離・互換 | 4/5 | 5 | private／cache／利用者workspace／実Yasashii repoは不変だが、契約に含まれるYasashii隔離candidateを未実行。 |
| C14 Markdown可読性 | 5/5 | 5 | 対象外の会話契約を含むmaster回帰がgreen。 |
| C15 authorization・意味保存 | 5/5 | 5 | Sprint 038会話回帰64/64をarchive gateで再確認。 |

C1、C3、C6、C13が閾値未達であり、SprintをPASSにはできない。これらは今回再現した製品欠陥の
採点ではなく、契約が必須とする実行面・証跡を取得できていないことによる未達である。

## Acceptance Criteria

| AC | 結果 | 独立確認 |
|---:|---|---|
| 1〜4 | NOT VERIFIED ON WINDOWS | 同じ操作のmacOS fixtureはPASS。Windowsネイティブ実行なし。 |
| 5 | PARTIAL | macOSでtraversal、prefix sibling、外向きsymlinkを副作用0で拒否。Windows junction等の実証なし。 |
| 6 | PARTIAL | project、journal、TODO、decision、settings、documentの失敗注入とrollbackをmacOSで確認。Windows実証なし。 |
| 7 | PARTIAL | retry／再実行の重複0をmacOSで確認。Windows実証なし。 |
| 8 | PASS（macOS safe harbor） | offline gateとGit-free archive gateが0 product FAIL。既存安全assertを含む。 |
| 9 | NOT RUN | PASS済みAgentic完全SHAから作るYasashii隔離candidateは未作成・未実行。実Yasashii repoは変更していない。 |
| 10 | PASS（観測範囲） | candidate repoと一時directory以外へのwriteなし。private、installed cache、利用者workspace、外部serviceは未変更。 |
| 11 | PASS | `0.9.2`のmanifest／CHANGELOG／README／release integrityが一致。 |
| 12 | PASS | Windows互換修正、migration不要、Agentic先行→Yasashii後続、my-vault対象外を確認。 |
| 13 | FAIL / NOT VERIFIED | Windowsネイティブ、Yasashii隔離candidateが未実行。文字列模擬をPASSへ昇格していない。 |
| 14 | PASS | Evaluator開始時点でbranchはupstreamなし・未push。push、tag、Release、marketplace更新、install/updateを行っていない。 |

## 完了した実行証跡

### 1. 対象Windows-storage suite（macOS上の製品面）

```text
node scripts/sprint-038-patch-002-windows-test.mjs
OS=darwin arch=arm64 node=v22.23.2
SPRINT038_PATCH002_WINDOWS_PASS=12 FAIL=0 OS=darwin
exit 0
```

空白・日本語を含む一時workspaceで、project／journal、決定、TODO、memory、settings、
document、weekly／archive／resume、保護付き削除、4系統のfailure injection、rollback、再実行、
traversal、prefix sibling、外向きsymlink、Bash非依存を確認した。

Windows必須flagを同じcandidateで実行した結果は次のとおりで、未検証を正しく赤にした。

```text
node scripts/sprint-038-patch-002-windows-test.mjs --require-windows
OS=darwin arch=arm64 node=v22.23.2
FAIL native OS metadata — Windowsネイティブrunnerではありません
SPRINT038_PATCH002_WINDOWS_PASS=11 FAIL=1 OS=darwin
exit 1
```

### 2. wrapper互換

```text
bash scripts/sprint-010-regression.sh
PASS=56 FAIL=0
exit 0
```

既存shell wrapperからNode-native境界へ接続する操作を含むtimeline、journal、TODO、memory、
save-deliverable、morning／eveningの既存契約を確認した。

### 3. path guard／rollback基線

```text
node scripts/sprint-022-safety-test.mjs
SPRINT022_PASS=69 SPRINT022_FAIL=0
exit 0
```

最初に他suiteと並列実行した1回は、`safe-git timeout後`の1 caseが`calls=[] pid=0`となり
68 PASS / 1 FAILだった。直列の単独再実行は69/69、後述offline gate内の再実行も69/69だったため、
再現する製品findingにはしていない。並列負荷による非blockingな検証観測として残す。

### 4. release integrityと0.9.2

```text
python3 scripts/check-release-integrity.py --root .
PASS release integrity: manifests and CHANGELOG are consistent
exit 0
```

抽出した現行面はClaude marketplace、Claude plugin manifest、Codex plugin manifest、
canonical／legacy CHANGELOG、READMEが`0.9.2`で一致した。Codex marketplaceはlocal sourceのため
version fieldを持たない正規形式だった。`git diff --check origin/main...HEAD`もexit 0。

### 5. macOS offline gate

```text
node scripts/master-release-gate.mjs --mode offline
RELEASE_GATE mode=offline status=pass suites=20 required=20 passed=19
verification-infra=1 failed=0 assertions=708 pass=702 fail=0 infra-fail=6
exit 0
```

6件は固定historical fixtureのloopback `listen EPERM`で、既存classifierが
verification-infraとして分離した。current product assertionをPASSへ読み替えておらず、
product failは0。対象Windows-storage suiteはmacOS上で12/12、Sprint 022は69/69だった。

### 6. Git-free archive gate

HEADを`git archive`し、`.git`を含まない
`/private/tmp/agentic-secretary-eval-archive.GmuIOT/candidate`で実行した。

```text
node scripts/master-release-gate.mjs \
  --mode archive \
  --root /private/tmp/agentic-secretary-eval-archive.GmuIOT/candidate
RELEASE_GATE mode=archive status=pass suites=23 required=15 passed=15
verification-infra=0 failed=0 assertions=291 pass=291 fail=0 infra-fail=0
exit 0
```

archive内の対象Windows-storage suiteはmacOS上で12/12、Sprint 038会話回帰64/64、
historical classifier 14/14、path alias 3/3、Harness互換15/15、release integrity PASSだった。

## 未実行・not-completed

- Windowsネイティブrunnerでの
  `node scripts/sprint-038-patch-002-windows-test.mjs --require-windows`: **not run**。
  macOSで同commandを実行したexit 1はWindows証跡ではない。
- `.github/workflows/windows-recording-regression.yml`のGitHub-hosted `windows-2025` job: **not run**。
  workflowを含むcandidate branchはupstreamなし・未pushで、AC14に従いpushしていない。
- 固定したPASS済みAgentic SHAからのYasashii隔離candidate作成、overlay同期、Windows fixture、
  downstream-owned digest: **not run**。Agentic PASS前に実Yasashii repoへ同期していない。
- Linuxネイティブ個別実行: **not run**。固定検証面の「macOSまたはLinux」はmacOS gateで実行した。
- 実Yasashii repo、`agentic-secretary-my-vault`、installed cache、利用者workspace、外部service、
  remote、tag、GitHub Release、marketplace、plugin install/update: **アクセス・変更・実行なし**。
- live conversation gateはmaster gateの契約どおり`incomplete`の別集計であり、本Patchの
  Windows記録・保存PASS根拠には使っていない。

## Finding分類

### V1 — Windowsネイティブ証跡とpre-PASS push禁止が同時には満たせない

- Classification: `verification-infra`
- Severity: blocking
- Route: `verification-scope-issue`としてユーザー判断へ

Windows-native必須のAC13は妥当な製品保証だが、現在利用できるEvaluator hostはmacOSだけである。
repositoryにWindows GitHub Actions jobは追加されているものの、未push branch上にあり、remote runnerで
実行するには先にpushまたはPRが必要になる。AC14はそのpushをEvaluator PASS前に禁止しているため、
同じ契約のままではWindows証跡を取得できない。これは実装をGeneratorへ戻しても解消しない。

加えてAC9／AC13はYasashii隔離candidateも同じ評価の必須証跡に含める一方、Release gate節は
Agentic Evaluator PASS後だけ、その完全SHAから下流Patchを作る順序を要求する。現在の評価では
Yasashiiを先に作らず、順序違反を避けた。これも製品欠陥ではなく、検証段階の切り分けを
Orchestrator／Plannerが明確にする必要がある。

### Product findings

- **0件**。macOSで実行できた対象操作、path guard、rollback、retry、wrapper、release integrity、
  offline/archive gateに再現するproduct failureはない。

## 次に必要なこと

次のいずれかをユーザーが選び、同じfull commitに対して独立評価を再開する必要がある。

1. **Windows検証専用のpre-release branch pushを例外許可する（推奨）**  
   `f14a9c3f59b07387ebd2968cf334b88e88b56143`だけを検証用branchへpushし、
   `windows-2025` jobで`--require-windows`を実行する。tag、Release、marketplace、install/updateは
   引き続き禁止し、job結果とcommit SHAを固定して再評価する。
2. **同じfull commitを実行できる既存Windows端末／runnerを提供する**  
   remote pushを行わず、Windowsネイティブ環境で必須commandとfixtureを実行し、OS、Node version、
   exit code、12 case、failure injection、canary、Git状態を証跡化する。
3. **契約の検証順序をPlannerが改訂する**  
   Agentic評価を「Windows証跡取得前の限定評価」と「Windows証跡後の最終評価」に分ける、または
   AC14へWindows検証branchだけの明示例外を置く。Yasashii AC9／AC13はAgentic PASS後の下流Patchへ
   移し、Agentic未合格SHAから同期しない既存原則を保つ。

本結果はimplementation-issueではないため、同じ条件のままGeneratorへ自動差し戻ししない。

## Evaluator自己レビュー

- Generatorの自己評価を合否根拠にせず、同じHEADで対象suite、必須flagのnegative、wrapper、
  safety、release integrity、offline、Git-free archiveを独立実行した。
- 完了したcommandとnot-runを分離し、Windows文字列fixtureをWindows-native PASSへ昇格していない。
- 初回の並列safety 1 FAILを隠さず、直列2回の69/69と区別して記録した。
- productとverification-infraを分離し、未実行面から製品欠陥を推測していない。
- 実装、spec、contract、state、progressは編集していない。書き込んだ正本は本feedbackだけである。
