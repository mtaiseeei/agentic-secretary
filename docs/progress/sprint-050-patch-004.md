# Sprint 050 Patch 004 Generator進捗 — Harness正本優先scanとWindows native回帰

- 開始HEAD: `ded437132e36789c63e4af4ce3c5555be457a59d`
- 担当: Generator（自己検査とEvaluator handoffのみ。Evaluator PASSは宣言しない）
- 実装日: 2026-08-31
- 対象: `sprint-050-patch-004`（Model Tier standard）
- 現在地: macOS／Git-free portable検証完了。Windows native CIと独立Evaluator待ち

## 実装内容

- Clarity init scanへHarness専用のauthoritative reserved laneを追加した。一般scanの2 MiB枠とは別に512 KiB／16 file／32 entryを確保し、state、spec index、Current contract／progress／feedback、root guidance／package、bounded spec参照の順で確認する。一般`src/`／`scripts/`が先に容量を使ってもHarness正本枠を消費しない。
- `docs/sprints/state.md`は128 KiB以内のsectionをbounded readし、Current ID、status、Next Plannedとfallback根拠を解決する。TBD、missing、invalid、section未解決を固有状態に分け、全file読込や`maxFileBytes`の単純拡大を行わない。
- stateを`orchestrator-execution-truth`、contractを`requirements`、progressを`generator-self-report`、feedbackを`evaluator-validation`として分離した。feedback不存在は`evaluation-not-yet-recorded`であり、progressだけからEvaluator PASSへ昇格しない。
- Currentの4正本を1つのcandidate bundleへ束ね、repo-relative locator、digest、短いsummaryだけをEvidenceにする。過去Sprint文書を1 file 1 Itemで羅列しない。authoritative／generic laneごとにlimit、使用量、inspected／excluded／uninspected／not-found、partial理由とcoverage digestを返す。
- 非Harness Repoでは従来generic candidate、上限、順序、安全境界を維持する。partial／invalid Harness markerを完全なHarnessへ昇格しない。
- Secret候補、binary、root内symlink／junction、traversal、absolute path、Windows reserved／invalid nameをfail closedで扱う。alias／physical pathは同じcandidate ID／順序／coverage digestになり、Git root一致判定はNodeの`path.relative()`でplatform separatorとcase semanticsを扱う。
- human-readable previewへCurrent、4正本の役割／状態、lane別budgetとpartial状態を表示した。JSONは同じ構造化結果を返す。
- Windows suiteを既存`.github/workflows/windows-recording-regression.yml`の`windows-native` jobへ追加した。既存0.9.2回帰と`timeout-minutes: 10`は維持し、正式入口を`node scripts/sprint-050-patch-004-test.mjs --require-windows`とした。
- Windows fixtureの複製は既知の日本語path上`fs.cpSync(..., { recursive: true })`を使わず、既存方針と同じfile-by-file／no-follow copyにした。symlinkとjunction capabilityは別々にprobe／集計し、作成不能をPASSに数えない。
- tracked collaboration inventoryへ`clarity-harness-scanner` surface、HS-001〜016、workflow／portable suite markerとdigestを追加した。Target registryはPatch case合計37、HS 16、duplicate／missing／extra 0、feature単一割当を機械確認する。

## 変更file

```text
.github/workflows/windows-recording-regression.yml
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/clarity.mjs
plugins/secretary/scripts/lib/clarity-core.mjs
plugins/secretary/scripts/lib/clarity-harness-scan.mjs
scripts/lib/sprint-049-inventory.mjs
scripts/sprint-049-test.mjs
scripts/sprint-050-patch-003-test.mjs
scripts/sprint-050-patch-004-test.mjs
docs/progress/sprint-050-patch-004.md
```

Planner所有の`docs/spec*`／Sprint契約、Orchestrator所有の`docs/sprints/state.md`、Evaluator所有の`docs/feedback/**`は変更していない。version、manifest、CHANGELOG、release inventory、Marketplace、installed cache、private my-vault／Yasashiiも変更していない。

## 起動／command

server／UI／test URLはない。read-only previewは次で実行できる。

```bash
node plugins/secretary/scripts/clarity.mjs init <repo-root> --json
```

Patch suiteのportable入口:

```bash
node scripts/sprint-050-patch-004-test.mjs
```

Windows native必須入口:

```powershell
node scripts/sprint-050-patch-004-test.mjs --require-windows
```

macOSで`--require-windows`を実行してPASSを偽装する設計にはしていない。workflowのWindows runnerだけがHS-012〜015を実行し、0 FAILの実runが固定されるまでは`windowsVerified=false`である。

## Target case集計

| case | local結果 | 内容 |
|---|---|---|
| HS-001〜011 | PASS 11／FAIL 0 | 予約lane、Harness判定、semantic bundle、coverage、bounded state、Secret／binary／symlink、決定性、alias／Git安全 |
| HS-012〜015 | NOT-RUN 4 | Windows nativeのみ。drive／日本語／CRLF、collision／reserved／invalid／別root、symlink／junction capability、workflow実行 |
| HS-016 | PASS 1／FAIL 0 | Patch 37、HS 16、feature単一割当、inventory／portable entry |
| 合計 | `PASS=12 FAIL=0 SKIP=0 NOT-RUN=4 TOTAL=16` | `EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false` |

WindowsではHS-014内でsymlink／junctionを別capabilityとして集計する。capability不足はcase内の理由付きSKIPであり、suite PASS数やWindows全保証へ加算しない。HS-012〜015のWindows native結果自体はまだ存在しないため、本書ではSKIPではなくNOT-RUNである。

## lane／candidate確認

実Repoへの`init . --json`はread-onlyで成功した。約197 KiBの巨大stateは128 KiBだけをbounded readし、Current `sprint-050-patch-004`と契約を解決した。progress／feedbackが未作成だった時点では別々にmissingとなり、feedbackだけが`evaluation-not-yet-recorded`を返した。Harness candidateは1件でgeneric候補より先頭、generic scanの`truncated`とは別にauthoritative coverageを保持した。実Repoへのapply、Clarity data write、Git write、networkは行っていない。

synthetic fixtureでは次を確認した。

- `src/`／`scripts/`が2 MiB超でも、state、spec、Current contract／progress／feedback枠を確保する。
- non-Harness、partial marker、invalid stateを分離し、generic候補を回帰させない。
- Current valid／TBD／missing／invalid、feedback absent、巨大state／section未解決を固有reasonにする。
- sourceごとのSecret-like、binary、内部symlink、permission相当、missingを本文や参照先を読まず分類する。
- 大量の過去contract／progress／feedbackをCurrentのItemへ混ぜず、同じCurrent bundle 1件へ束ねる。
- ancestor alias／physicalでRepo identity、candidate ID／意味／順序、coverage digestが一致する。
- preview／cancelは`changed:false`、applyはsynthetic物理Repo内の宣言済みClarity所有path（`.clarity/**`と`CLARITY.md`）だけを変更し、dirty／staged／untracked、HEAD、branch、remote、external canaryを保持する。

## 実行済み検証

| command | result |
|---|---|
| `node scripts/sprint-050-patch-004-test.mjs` | `PASS=12 FAIL=0 SKIP=0 NOT-RUN=4 TOTAL=16 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false` |
| macOSで同suiteへ`--require-windows` | 4件をNOT-RUNのままexit 1。非Windows結果をWindows PASSへ昇格しない |
| Git-free current bytesで同上 | 同じく`PASS=12 FAIL=0 SKIP=0 NOT-RUN=4`、external write／network 0 |
| `node scripts/sprint-041-test.mjs` | `PASS=43 FAIL=0` |
| `node scripts/sprint-050-patch-003-test.mjs` | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| Git-free current bytesでPatch 003 | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| `node scripts/sprint-047-test.mjs` | `PASS=25 FAIL=0`、Secret／path／Git安全、stress 32 CLI＋32 Hook、parse／unique／rebuild 100% |
| `node scripts/sprint-049-inventory.mjs validate` | `PASS=20 FAIL=0 CASES=57 MARKERS=VALID DIGESTS=VALID` |
| Git-free current bytesでinventory validate | 同じく`PASS=20 FAIL=0 CASES=57 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-049-test.mjs` | `PASS=20 FAIL=0`、critical 15、AC 6、side-effect violation 0 |
| `node --check`（変更した`.mjs`） | exit 0 |
| `git diff --check` | 最終commit前に再実行 |

Git-free検証は`.git`と`node_modules`を除外したcurrent bytesの一時copyで実行した。fixtureの複製を含め、recursive `fs.cpSync`は使っていない。Linux nativeはこのGenerator環境では未実行であり、macOS portable PASSをLinux native PASSへ読み替えない。

## Windows CI待ち／未実施境界

- Windows native HS-012〜015、workflow run ID／URL、candidate SHAに束縛したWindows結果は未実行。`windowsVerified=false`、4 NOT-RUNを維持する。
- Generatorはremote write、push、workflow dispatchを行っていない。exact candidateの通常pushとWindows live gateはOrchestratorの責務である。
- Windows workflow未起動／認証不能／runner timeoutは`external-live-gate-unavailable`／verification-infraとして、runner内Clarity assertion failureはproduct／implementation-issueとして分離する。どちらもWindows verifiedやSprint PASSにはしない。
- Evaluatorの独立操作、Evaluator PASS、Orchestratorのstate更新は未実施。本progressから判定を推測しない。
- UI変更がないためbrowser／DOM／screenshotは非該当。実顧客Repo apply、Mac mini、private my-vault、Yasashii、Xmind、実provider／connector、downstream write、install、cache、release、tag、merge、force pushは未実施である。

## Fable review反映

Plannerが記録したGenerator前Fable reviewの必須指摘に沿い、実在workflowへのClarity suite結線、既存0.9.2回帰／10分timeout維持、HS 16とPatch 37の機械確認、Windows native fixture、symlink／junction別capability、Windows live gate前の`windowsVerified=false`を実装した。Fable review自体は製品PASS、Windows run、Evaluator PASS、state遷移の証拠には数えていない。

## Evaluator handoff

Evaluatorはclean candidateで、まずportable Target suiteを実行しHS-001〜011／016、Patch 37、HS 16、feature単一割当、lane別coverage、Current bundle、alias／physical digestを独立確認する。続いてSprint 041、Patch 003、Sprint 047、Sprint 049 inventory／portable、Git-free current bytesを再実行する。

Windows live gate後は同じcandidate SHAについて、workflow path、`windows-native` job、run ID／URL、OS／Node、command、HS-012〜015のPASS／FAIL／SKIP、symlink／junction capability理由を確認する。既存0.9.2 Windows回帰と`timeout-minutes: 10`も同runで維持されていることを確認し、別SHA／過去run／macOS上のWindows風文字列を証拠へ流用しない。4 NOT-RUNが解消され、実行可能case 0 FAILになるまではSprint PASSを宣言しない。
