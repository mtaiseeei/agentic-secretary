# Sprint 047 Patch 001 Generator進捗 — Windows並行writeの整合回復

- 開始HEAD: `a758dad4a35c71012e02a2629a849db77e6745b8`
- 製品candidate commit: `26f1c12985b4b752b30f7e34a599c076ed0d21eb`
- 製品candidate tree: `8d5c0d0fade8a4547b0413cf6bee34c263972bbc`
- 対象: `sprint-047-patch-001`（regular patch、Risk high、Model Tier strong）
- 現在地: public source／exact clean candidate／同SHA Git-free archiveのGenerator自己検査完了。Windows Server 2025／Node 22と独立Evaluator待ち

## 実装結果

- EventまたはEvidenceのappendと派生Stateを、operation identityを持つ1つのlogical writeへまとめた。canonical append用とState用のbefore／after artifact、および`.clarity/runtime/operation-<digest>.json`のdurable progressを先に作り、append canonical、Stateの順で置換する。
- canonicalとprogressの置換は、本番と同じ`renameSync`境界で有限retryする。各試行でphysical Clarity root、target／parent／tempの通常file・writable・read-only・inode identity、symlink／junction境界、lock owner／token／operation、lease期限、artifact digestを再確認する。retryは最大7回か1,000 ms、lock waitは最大15,000 ms、leaseは30,000 msで、全waitに正のsleepと上限がある。
- retry対象は`EACCES`、`EBUSY`、`EPERM`、`ETXTBSY`だけである。permission／read-only／missing parent／schema／identity／owner／token／boundary変更はretryせずfail closedにする。既存の`safe-fs.mjs`既定動作は変更していない。
- State失敗時は、同じ有効leaseと同じoperationだけが今回追加したEvent／Evidenceをbefore artifactへrollbackする。開始前履歴や別writerは巻き戻さない。rollbackまたはcleanupも失敗した場合はexit 0にせず、durable progressと自己所有artifactを残してdoctor／同一operation retry／明示rebuildで収束させる。
- crash後のcanonicalとprogressが一致する場合だけ、同一operation retryまたは明示`clarity rebuild`がroll-forward／cleanupする。progressなし、target／stage／owner／token／digest不一致、利用者または別processのtempは自動削除しない。
- lockの`O_EXCL`作成後・owner record確定前に失敗した場合、作成したinodeと現在pathのidentityが同一のときだけ削除する。cleanupにも失敗した空／識別不能lockは非成功とし、doctorで`ownership-unverified`として利用者確認を求める。
- doctor／cleanup inventoryへcanonical直下の`.clarity-op-*-(before|after).tmp`とlogical progressを追加した。明示cleanupはartifactを先、所有recordを最後に削除し、途中停止しても所有根拠を先に失わない。partial canonicalはcleanup候補にせず明示rebuildへ送る。
- filesystem failure injectionは`CLARITY_FS_FAILURES`で実際のcanonical／progress rename、rollback、cleanup、lock record境界へerrno互換の`code`／`syscall`として入る。fixture専用の判定直返し製品分岐はない。外向けerrorはoperation ID、code、syscall、metricsだけで、absolute local path、Secret、transcript本文を含めない。
- Windows workflowは既存の`windows-2025`、Node 22、`timeout-minutes: 10`、全既存stepを維持した。`scripts/sprint-047-test.mjs`とPatch専用suiteをpaths／同一jobへ追加した。GS-009はWindowsだけ3 roundを必須にし、各roundでHook 32＋CLI 32のexit 0、canonical Event delta 32、Hook runtime Event delta 32、全JSON parse、各ID unique、State count一致、logical residue 0、lock／lease／job margin正をhard gateにする。

## 変更path

```text
.github/workflows/windows-recording-regression.yml
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/lib/clarity-core.mjs
scripts/sprint-047-test.mjs
scripts/sprint-047-patch-001-test.mjs
docs/progress/sprint-047-patch-001.md
```

Planner正本、`docs/sprints/state.md`、Evaluator feedback、private my-vault、Yasashii source、installed cache、Marketplace、live workspaceは変更していない。

## Patch専用case

| Case | 結果 | 検証内容 |
|---|---:|---|
| P001-01 | PASS | State replaceのtransient `EPERM` 2回後に成功、append 1件、重複／残骸0 |
| P001-02 | PASS | Stateのpermanent `EPERM`上限到達、自己Event rollback、開始前bytes保持、残骸0 |
| P001-03 | PASS | 最初のEvent replace前のpermanent拒否、canonical未変更、残骸0 |
| P001-04 | PASS | State失敗＋Event rollback失敗のdouble fault、doctor診断、明示rebuild roll-forward |
| P001-05 | PASS | commit後cleanup失敗は非成功、同一operation retryでEvent重複0・残骸0 |
| P001-06 | PASS | durable progress replace自身のtransient `EPERM`をproduction retryで回復 |
| P001-07 | PASS | lock record前失敗のinode cleanup、cleanup失敗の識別不能lockをdoctor表示 |
| P001-08 | PASS | Event-State間`SIGKILL`後、stale lockとdurable progressから明示rebuild |
| P001-09 | PASS | progressなしcanonical sibling tempと外部canaryをcleanupでも保持 |
| P001-10 | PASS | Evidence append＋Stateの同一logical writeとtransient retry |
| P001-11 | PASS | canonical sibling temp作成後`SIGKILL`、progress target不一致をfail closed |

既存GS-007／008／010〜015、Patch004 HS-007／010〜015、Patch005 SR-002〜009、conversation migration Patch003を関連回帰として使い、schema破損、root／symlink／junction／ancestor alias、permission／read-only、active／stale／mismatch lock、Secret／absolute path、Git-free、外部canary、Windows native専用面を重複なく覆う。Windows専用caseはMac結果からPASSへ昇格していない。

## failure injection実測

exact clean candidateのmacOS／Node `v22.23.2`で得た値。時間はms。

| Case | lock wait / 上限 / margin | lease critical / 上限 / margin | replace attempts | retry wait | rollback | cleanup |
|---|---:|---:|---:|---:|---:|---:|
| transient State（P001-01） | 1 / 15000 / 14999 | 59 / 30000 / 29940 | 7 | 30 | 0 | 2 |
| permanent State＋rollback（P001-02） | 1 / 15000 / 14999 | 560 / 30000 / 29439 | 12 | 470 | 8 | 5 |
| State＋rollback double fault（P001-04） | 0 / 15000 / 15000 | 1074 / 30000 / 28926 | 18 | 940 | 540 | 0 |
| cleanup failure（P001-05） | 0 / 15000 / 15000 | 10 / 30000 / 29990 | 5 | 0 | 0 | 0 |
| progress transient（P001-06） | 0 / 15000 / 15000 | 60 / 30000 / 29940 | 7 | 30 | 0 | 2 |
| Evidence transient（P001-10） | 1 / 15000 / 14999 | 27 / 30000 / 29973 | 6 | 10 | 0 | 2 |

値はsuite出力の`failureMetrics`にも記録する。cleanup failureの0 msは高分解能clock未満で失敗した実測であり、未実行ではない。すべてexit 0ではなく期待した非0終端または整合成功を検査した。

## 実行済み検証

| 面／command | 結果 |
|---|---|
| source、`node scripts/sprint-047-patch-001-test.mjs` | 11/11 PASS、failure metrics出力、WindowsはNOT-RUN |
| exact clean candidate、同上 | 11/11 PASS、開始／終了`git status --short`空 |
| exact SHAのGit-free archive、同上 | 11/11 PASS、`.git`不存在 |
| source／exact clean／Git-free、`node scripts/sprint-047-test.mjs` | 各25/25 PASS、registry missing／duplicate／extra 0 |
| exact clean GS-009（macOS 1 round） | Hook 32＋CLI 32 exit 0、canonical delta 32、Hook delta 32、parse／unique／State 100%、residue 0 |
| exact clean GS-009時間 | max lock wait 1093/15000、min margin 13907、max lease critical 145/30000、min margin 29855、round 2030/600000、job margin 597970 ms |
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS／0 FAIL／Windows 4 NOT-RUN |
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9/9 PASS、Windows native NOT-RUN |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface／67 case、marker／digest PASS |
| `node scripts/sprint-050-patch-005-test.mjs`（progress作成前） | 製品case 8 PASS、SR-001だけ本progress未作成のlifecycle baselineでFAIL、Windows 1 NOT-RUN |
| progress-only commit後、同Patch005 suite | 9 PASS／0 FAIL／Windows 1 NOT-RUN、external write／network 0 |
| `node scripts/agentic-archive-gate.mjs`（progress-only commit後） | `AGENTIC_ARCHIVE_GATE_PASS=9 FAIL=0 CLARITY_REGRESSION=25` |
| `node --check`／`git diff --check` | exit 0 |

Patch005 SR-001は製品runtime failureではない。Current Sprintのtracked progressが存在することを検査するため、実装commitとprogress-only commitを分ける本Sprintの所定手順ではprogress作成前だけ失敗する。progress commit後に同suiteを再実行する。
再実行ではSR-001を含む9件がPASSし、Windows専用SR-010だけをNOT-RUNのまま維持した。archive gateもGit-free bundleで製品FAIL 0を確認した。

## 起動／Evaluator handoff

server、DOM、UI、test URLはない。CLIとfilesystemが製品surfaceである。

```bash
node plugins/secretary/scripts/clarity.mjs event <repo-root> --event-json '<JSON>' --json
node plugins/secretary/scripts/clarity.mjs evidence <repo-root> --evidence-json '<JSON>' --json
node plugins/secretary/scripts/clarity.mjs doctor <repo-root> --json
node plugins/secretary/scripts/clarity.mjs rebuild <repo-root> --json
node plugins/secretary/scripts/clarity.mjs cleanup <repo-root> --json
node plugins/secretary/scripts/clarity.mjs cleanup <repo-root> --apply --json
```

Evaluatorはcandidate SHA／treeを固定し、まずPatch専用11 caseを実行する。P001-04／05／07／08／11では非0終端、canonical digest、progress stage、doctor reason、明示recovery後のEvent／Evidence ID unique、State count、artifact／lock残骸を操作で確認する。通常失敗で開始前履歴や他writer tempを削除していないことも再確認する。

Windowsでは同じcandidateに因果する既存workflow runだけを証拠にする。GS-009の3 roundすべてが64/64 exit 0、canonical／Hook各delta 32、parse／unique／State 100%、residue 0、各margin正でなければPASSにしない。workflow全体が10分に収まらない場合はtestを弱めず`verification-scope-issue`として扱う。

## Known issues／境界

- Windows Server 2025／Node 22はGenerator環境ではNOT-RUN。macOS／POSIX結果をWindows PASSへ昇格していない。
- 本記録はGenerator自己評価で、独立Evaluator Verdictではない。
- Windows workflowの実job合計時間、run ID／URL、3 round実数はpush後の因果的CI待ち。10分を超える場合はjob分割や回数削減をせず利用者判断へ送る。
- release、downstream public/private/Yasashii、installed/cache、Marketplace、live workspaceの検証またはwriteは0件。

## 外部副作用

- network／GitHub API／connector／Xmind live call: **0件**
- push／workflow dispatch／PR更新／merge／tag／release: **0件**
- private my-vault／Yasashii／installed cache／実workspace write: **0件**
- test writeは各suiteが削除したOS temporary fixtureだけ。Git-free archiveは`/tmp`に作成し、external product dataへ触れていない。
