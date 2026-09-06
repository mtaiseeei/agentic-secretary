# Sprint 047 Patch 002 Retry 2 独立評価

## 判定

- Verdict: **PASS**
- Failure kind: **該当なし**
- 対象: `sprint-047-patch-002`（regular patch / high risk / Retry 2）
- 評価role: fresh独立Evaluator
- Product findings: **0件**
- Verification-infra findings: **1件（nonblocking Minor）**
- Blocking findings: **0件**
- Acceptance Criteria未達: **0件**

Windows Server 2025／Node 22の因果runをbadgeだけでなくraw logまで監査し、過去2回の停止点だった
Patch 005内包`SR-009`、P001、P002、正式Sprint 047の順に全stepが成功したことを確認した。
正式`GS-009`は3 roundすべてHook 32＋CLI 32の64／64で、parse、unique、期待delta、State rebuild、
residue、lock wait、lease、job時間の契約済みhard gateを満たした。

PR #11の2件のP1は、現candidateの製品実装と独立fixtureで解消を確認した。P2のState oracle gapは実在するが、
今回のproduct findingではなく、着手時契約のsafe harborへ後付けのhard gateを追加せず、次の限定verification Patchへ
分離できるnonblocking residualと判定する。現candidateについては、別のread-only補助確認で32並行CLI後のstored State全体が
writeなし再構築結果と一致した。

## Candidate束縛

| 役割 | commit / tree | 独立確認 |
|---|---|---|
| 製品candidate | `6487666b32d166c1a419b7e45dc069e81cc309cb` / `fe6c5f5e98a252366b464a1c05d1a3fd6bddb893` | 製品、focused test、workflow、inventoryを固定 |
| Generator progress HEAD | `6ceadaa9c43b810265b20732d9f4ed9067c071e9` / `bd803094a9752b3a88a1bfd2705c1a49c3eeacad` | candidate後のprogressだけを追加 |
| Windows因果head | `f39a9a08327a5088cabef02e8b54a8a855f2daff` / `a248c9de6471fb33a7840d0ba6658ad4df768861` | candidate後のprogress／stateだけを追加 |
| 評価開始時local HEAD | `59c9eea08c1451f1347ba99ea95a0c7b697138a4` / `3f6ff4fd5e39aac11f1b99e2d589277e004c67b9` | Windows証跡のstate-only追加 |

`6487666..HEAD`で、workflow、製品core、対象tests、inventoryのdiffが0件であることを確認した。
candidate後の3 commitはprogress／stateだけで、今回実行した製品bytesを変更していない。
Windows run metadataの`headSha`は`f39a9a0...`、checkoutはPR merge ref
`11fca0845c5093b250d514e5c3e18fce2391b0dc`である。

## 実diffと変更境界

Patch開始HEAD `f4d9ed96935f8e80dcfbd023b6caace80ddcb51c`から製品candidateまでを確認した。

- root Git identity discoveryは5秒boundedなread-only combined probe 1回。
- `GIT_TERMINAL_PROMPT=0`、`GIT_OPTIONAL_LOCKS=0`を維持。
- `.git` directory／gitfile、linked worktree、`commondir`、config、marker、filesystem identityをwrite前に再確認。
- Retry 1のrevalidation scopeは1同期mutationだけで失効し、request、retry、複数mutationを跨がない。
- Retry 2はcreate経路だけがtransition待機中のcanonical出現を既存canonical waitへ返す。
- stale takeover／releaseはcreate専用early exitを使わない。
- transition releaseは取得時のowner／kind／token／operationId、4 KiB上限のno-follow record、BigInt filesystem identityを各試行で照合する。
- workflowはP002 path／syntax／実行stepを追加しただけで、`windows-2025`、Node 22、`timeout-minutes: 10`、P001、Sprint 047の既存stepを維持。
- 5秒Git timeout、15秒lock wait、30秒lease、32＋32、Windows 3 round、stagger／batchなしを維持。

`git diff --check`はexit 0。変更対象5本の`node --check`はすべてexit 0、workflow YAMLもparseできた。

## 独立ローカル実行

評価開始前はtracked／untracked差分0件だった。次を現candidateと同じ製品bytesで実行した。

| command / 面 | 結果 |
|---|---|
| `node scripts/sprint-047-patch-002-test.mjs` | exit 0、P002 **12/12**、Git probe/request 1、timeout 5,000 ms、external write 0、network 0 |
| `node scripts/sprint-047-patch-001-test.mjs` | exit 0、P001 **23/23**、`WORKFLOW_PREFLIGHT_PASS=1` |
| `node scripts/sprint-050-patch-003-test.mjs` | exit 0、root／alias **21/21**、external write 0、network 0 |
| `node scripts/sprint-047-test.mjs` | exit 0、Sprint 047 **25/25**、Critical 16/16、AC 7/7 |
| `node scripts/sprint-049-inventory.mjs validate` | exit 0、20 surface／67 case、markers／digests valid |
| syntax／YAML／`git diff --check` | 全てexit 0 |

ローカル`GS-009`は仕様どおり1 roundで、Hook 32＋CLI 32の64／64、parse／unique／期待delta／State rebuild 100%、
residue 0、max lock wait 1,230／15,000 ms、max lease critical 166／30,000 msだった。

P001-23の実process／実filesystem caseでは、次を同じcase内で確認した。

- transition guardを保持したcreate convoy中にactive canonical lockが現れると、guardを取得・書換えず既存canonical waitへ戻る。
- transition release barrier中にguardを同一inodeのままforeign token／operationIdへ上書きすると、exit 4、
  `canonical-lock-transition-cleanup-failed`となる。
- foreign guard bytesを保持し、canonical Event／Evidence／Stateを変更せず、absolute path／tokenをerrorへ出さない。

PRのGit binding P1は、実Gitの`--separate-git-dir` fixtureで旧Git dirを残したままroot `.git`の参照先だけを
別Git dirへ変更して独立再現した。`safeWritePath()`前の再検証は`clarity-root-changed`で停止し、writeは0件だった。

## Windows native raw log監査

GitHub Actions run `33529616204`、job `99929124095`をread-onlyで監査した。

- URL: https://github.com/mtaiseeei/agentic-secretary/actions/runs/33529616204
- workflow: `Windows recording regression`
- event／branch: `pull_request` / `codex/sprint-041-project-clarity`
- head SHA: `f39a9a08327a5088cabef02e8b54a8a855f2daff`
- conclusion: success
- runner: Microsoft Windows Server 2025 `10.0.26100`
- image: `windows-2025-vs2026`
- Node／platform: `v22.23.2` / `win32`
- job時間: 2026-09-01 16:04:27Z〜16:09:54Z、327秒、10分上限まで273秒margin

raw logで次を直接照合した。

| suite / gate | Windows native結果 |
|---|---|
| Patch 005内包の過去停止点 | `SR-009` PASS、Patch 005 10/10 |
| P001 | P001-01〜23の全inventory、23/23、P001-23 PASS、platform `win32` |
| P002 | 12/12、Git probe/request 1、timeout 5,000 ms、external write 0、network 0 |
| Sprint 047 | 25/25、Critical 16/16、AC 7/7 |

Windows正式`GS-009`は次のとおりだった。

| round | Hook＋CLI | parse／unique／delta／State rebuild | residue | max wait / 15秒 | max lease / 30秒 | round時間 |
|---:|---:|---|---:|---:|---:|---:|
| 1 | 32＋32、64/64 | 全て100% | 0→0 | 7,927 ms | 1,512 ms | 12,139 ms |
| 2 | 32＋32、64/64 | 全て100% | 0→0 | 7,731 ms | 847 ms | 11,976 ms |
| 3 | 32＋32、64/64 | 全て100% | 0→0 | 7,570 ms | 1,203 ms | 12,132 ms |

最大lock wait marginは7,073 ms、最大lease marginは28,488 msで、いずれも正だった。
raw log全体の`Git identity timeout`、`root identity timeout`、`canonical-lock-transition-busy`、
`canonical-lock-busy`は各0件だった。Windows 8.3は`NOT-RUN:8dot3-unavailable`であり、実行済みへ昇格しない。

ActionsのNode 20 runtime廃止予告とaction内部`punycode` warningは出ているが、製品suiteは明示されたNode 22.23.2で
全step successであり、今回のproduct failureではない。

## State oracle指摘の独立判定

### 観測

PR P2のとおり、現`GS-009`はwriter終了直後のstored State全体を保存せず、write付き`clarity rebuild`を先に実行し、
その後に`source.eventCount`だけを比較する。

一時fixtureでstored Stateの`source.eventCount`を意図的に変えたところ、次を再現した。

```text
STATE_ORACLE_NEGATIVE=CONFIRMED
PRE_REBUILD_MISMATCH=true
WRITEFUL_REPAIR=true
LEGACY_EVENTCOUNT_ORACLE=true
```

つまり、oracleはwrite前のState不整合を検出できない。これは実在するverification-infra gapである。

### productとの分離

同じ製品bytesの別一時fixtureで32 CLI writerを同時実行し、write付きrebuildの前にstored State全体と
`rebuildState(root, { write: false }).state`を比較した結果は次のとおりだった。

```text
READONLY_STATE_AFTER_32_CLI=PASS EVENT_COUNT=33 RESIDUE=0
```

現candidateについてState不整合というproduct findingは観測していない。P001 23/23のlogical transaction、
ローカル／Windowsの全writer exit 0、parse／unique／delta、residue 0も成立している。

### 合否への影響

- 分類: **Minor / verification-infra / nonblocking**
- 理由: 今回の着手時契約とEvidence safe harborは既存`State rebuild 100%`、P001隣接回帰、Windows raw resultを固定し、
  read-only全State比較や故意のState破損negativeを本Patchのhard gateにしていない。
- Harness規則上、契約にない証拠形式・厳格化を当該Sprintへ後付けせず、greenな引渡しsuiteをこのgap単独でproduct FAILにしない。
- 次の対応: writer直後のstored Stateとread-only再構築結果を全体比較し、必要ならwrite付きrebuild後のbyte no-opも確認する
  **限定verification Patch**へ分離する。parallelism、round、時間上限は変更しない。

引渡しsuiteは実行可能でgreenであり、verification-infraが主因の実行不能ではないため
`verification-scope-issue`には該当しない。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | Git／non-Git／worktree／alias focused positive、fresh write境界、root policyがgreen |
| 2 | PASS | Windows 3 round各64/64、timeout 0、parse／unique／delta／rebuild 100%、residue 0 |
| 3 | PASS | max wait 7,927/15,000 ms、max lease 1,512/30,000 ms、job 327/600秒、負荷削減なし |
| 4 | PASS | malformed、timeout、unexpected非0、non-directory、cross-Repo、changed identityを副作用0で拒否 |
| 5 | PASS | root／alias 21/21、nested／cross-Repo／worktree binding negativeがgreen |
| 6 | PASS | prompt／network／external write 0、Secret／absolute path新規露出0、Git状態保持 |
| 7 | PASS | request境界fresh、次write境界fresh、`.git`参照先変更をwrite 0で拒否 |
| 8 | PASS | P001 23/23、rollback／cleanup／doctor／transition／active replacementを維持 |
| 9 | PASS | Sprint 047 25/25、GS-009／GS-010のID、意味、件数、threshold不変 |
| 10 | PASS | 既存`windows-native`、Windows 2025、Node 22、10分上限、既存step＋P002因果stepがsuccess |
| 11 | PASS | 全指定rubricが閾値以上、product finding 0、AC未達0 |
| 12 | PASS | 評価中のprivate／Yasashii、merge、release、tag、install、cache、live／Xmind／connector write 0 |

## Rubric scores

| 軸 | Score | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **5/5** | 4 | PASS | AC 1〜12を全て実行証拠で確認 |
| C2 構文・整合 | **5/5** | 5 | PASS | syntax、YAML、candidate／workflow／inventory／case参照が整合 |
| C3 機能の実証 | **5/5** | 4 | PASS | 実Git、実filesystem、実process、Windows raw logで変更面を直接実証 |
| C5 安全・規律 | **5/5** | 5 | PASS | fail-closed、foreign guard保持、root／Git／Secret／external境界が成立 |
| C6 無回帰 | **5/5** | 5 | PASS | handed-over regressionはローカル／Windowsとも0 product FAIL |
| C19 Clarity正本・状態モデル | **5/5** | 5 | PASS | logical write、Event／Evidence／State、read-only補助比較、rebuild、residueが成立 |
| C21 Clarity Hook・host parity | **5/5** | 5 | PASS | Hook 32＋CLI 32、macOSとWindows native 3 roundが成立 |
| C24 Clarity安全・統合・public-first | **5/5** | 5 | PASS | root／lock／transition／retry境界とpublic-first、inventory、Git安全が成立 |

ゼロ許容軸C2／C5／C6／C19／C21／C24はすべて5/5である。

## Findings

### Product

- **0件**。

### Verification-infra

1. **Minor V-01（nonblocking）**: `GS-009`のState oracleはwrite付きrebuild後のeventCountだけを比較するため、
   pre-rebuild Stateの内容不整合を見逃せる。独立negativeで再現した。現candidateの補助read-only比較はgreenで、
   着手時safe harborを満たすsuiteも全てgreenのため、本Patchのproduct FAILにはしない。次の限定verification Patch候補とする。

## UI／screenshot

本Patchはbrowser UI、DOM、responsive画面を持たないCLI／filesystem／Git process変更である。
契約もbrowser／screenshotを非適用としているため、実CLI、実filesystem、実Git、実process、Windows native raw logを証拠にした。

## NOT-RUN／残余

- Windows 8.3 short pathはrunner capability不足により`NOT-RUN:8dot3-unavailable`。PASSへ数えていない。
- 実Xmind、connector、実顧客Repo、private my-vault、Yasashii、release／install／cacheは本PatchのNon-scopeで未実施。
- V-01はWindowsのpre-rebuild State全体比較をまだ持たない。現製品の不整合を示す証拠ではないが、将来のfalse positive防止として限定修正を推奨する。
- Actions runtime warningは保守対象だが、明示Node 22の製品suite結果を無効化しない。

## Release／downstream状態

- public Sprint評価: **PASS**
- public fixed handoff: **Evaluator対象外／未発行**
- private my-vault同期／評価: **未実施**
- Yasashii同期／評価: **未実施**
- merge／release／tag／GitHub Release／Marketplace: **未実施**
- install／update／cache／new session／loaded version: **未実施**
- live workspace／実Xmind／Mac mini: **未実施**
- push: Evaluatorは**未実施**

これらを本PatchのPASSやdownstream PASSへ昇格していない。次のstate更新とhandoff判断はOrchestratorの所有範囲である。

## 自己レビュー

- Generatorの自己評価やGitHub job badgeをVerdictへ流用せず、契約、rubric、実diff、独立CLI、PR指摘、Windows metadata／raw logから判定した。
- PR P1は独立fixtureで解消を確認し、P2は実在するverification-infra findingとして隠さず分離した。
- safe harborにないread-only全State比較を後付けhard gateへせず、補助観測と次Patch候補として扱った。
- Windows 8.3 NOT-RUNをPASSへ数えず、macOS結果をWindowsへ昇格していない。
- product、tests、workflow、inventory、spec、contract、progress、stateを変更していない。Evaluator所有の本feedbackだけを変更した。
- feedback編集前のworktreeはcleanで、テスト後の製品／test residueは0件だった。
