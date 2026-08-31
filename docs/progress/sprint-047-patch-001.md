# Sprint 047 Patch 001 Generator進捗 — Windows並行writeの整合回復

- 初回開始HEAD: `a758dad4a35c71012e02a2629a849db77e6745b8`
- 初回製品candidate commit: `26f1c12985b4b752b30f7e34a599c076ed0d21eb`
- Retry 1開始HEAD: `8999a1bddc5001fd7f808e68dbb7d1d2c5836c68`
- Retry 1製品candidate commit: `22326598ec4ae1cfce10ea29b6ea6638a1e24e55`
- Retry 1製品candidate tree: `53a2a014f94d03b39657af354509f2feb7c4238f`
- 対象: `sprint-047-patch-001`（regular patch、Risk high、Model Tier strong）
- 現在地: Retry 1 public source／exact clean candidate／同SHA Git-free archiveのGenerator自己検査完了。Windows Server 2025／Node 22とfresh独立Evaluator待ち

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

## Retry 1 — Fable No-Go補正

初回candidate `26f1c12985b4b752b30f7e34a599c076ed0d21eb` の実装履歴と上記自己検査は削除せず保持する。FableのP-1／P-2／V-1／V-2を必須修正し、同じ回復境界にあるP-3〜P-7、V-3〜V-5を限定補正した。契約、既存P001-01〜11の意味、Sprint 047の25 case、GS-009／GS-010のID・Severity・threshold、Windows 3 round×Hook 32＋CLI 32、workflowの既存stepsと`timeout-minutes: 10`は変えていない。

### 補正した製品境界

- P-1: canonical tempのPOSIX permission bit検査を`process.platform !== "win32"`へ限定した。Windowsではlibuvのmode複製を所有判定に使わず、root／parent／lock token、non-symlink regular file、dev／ino／kind identity、digestを毎試行再検査する。targetのread-only判定はWindowsだけ`accessSync(target, W_OK)`、POSIXは既存mode検査を維持する（`clarity-core.mjs:1236-1251`）。
- P-2: 回復可能な組合せを、両方before、canonical after／State before、両方afterに限定した。製品順序で到達不能なcanonical before／State afterはprogressを書き換える前に`operation-progress-mismatch`で停止する（`clarity-core.mjs:1316-1339`）。
- P-3: canonical／State commit後のprogress、artifact cleanup、lock release失敗は、実体が変更済みであることを`changed: true`で返す（`clarity-core.mjs:375-383`, `1459-1478`）。
- P-4: rollback rename成功と、その後のprogress書込みを分けた。後者だけの失敗を`rollback-failed`／double faultと誤表示せず、`canonical-rollback-record-incomplete`、canonical before／State before、明示rebuild案内で停止する（`clarity-core.mjs:1429-1454`）。
- P-5: 明示rebuildの最終State replaceも自己所有temp、identity／digest／parent／lease再検査、最大7回／1,000 msのbounded transient retryへ接続した。恒久失敗時はState不変で識別可能tempを回収する（`clarity-core.mjs:1481-1506`）。
- P-6: `CLARITY_FS_FAILURES`と`CLARITY_CRASH_AT`は`CLARITY_TEST_MODE=1`のときだけ有効である。test modeはfailure発火だけをgateし、分類／retry／rollback／cleanupは同じ製品pathを通る（`clarity-core.mjs:169-201`）。
- P-7: 破損progressは自動回復せず、doctorが`ownership-unverified`と利用者確認を返す。自動cleanupしない残余リスクは維持する。

### 追加case（既存11 caseは不変）

| Case | 結果 | Fable finding／実挙動 |
|---|---:|---|
| P001-12 | PASS | Windows／POSIX mode分岐のsource contract、test modeなしではfailure／crash envが無効。source文字列検査は補助証拠であり、Windows実挙動の判定はnative CIだけが担う |
| P001-13 | PASS | canonical before／State afterと任意bytesの偽造after artifactを作り、rebuildが`operation-progress-mismatch`、canonical／State／progress／外部canary不変 |
| P001-14 | PASS | `CLARITY_CRASH_AT=lock-record-before`を実child processのSIGKILLで通し、空lock、canonical不変、doctor `confirmation-required`／`ownership-unverified`、cleanup `removed: []`、利用者確認相当のunlink後に正常回復 |
| P001-15 | PASS | rollback rename成功後のprogress永久失敗をdouble faultにせず、before／before、非成功、doctor、明示rebuild、残骸0 |
| P001-16 | PASS | State rebuild replaceのtransient 2回後成功とpermanent上限失敗。恒久失敗時State不変、orphan 0、通常rebuildで回復 |
| P001-17 | PASS | commit後progress永久失敗は`changed: true`、Event +1／State count一致、同一Event retryで重複0 |
| P001-18 | PASS | JSON破損progressをdoctorが`ownership-unverified`として示し、cleanup applyでもcanonical／State／canary不変 |
| P001-19 | PASS | commit後`lock-release-cleanup`実failureは非成功かつ`changed: true`、doctorでactive lockを保持、stale化後の明示cleanup、同一Event retry重複0 |

Patch専用suiteは合計 **19/19 PASS**。P001-01〜11は削除・改名・期待変更をしていない。

### GS-009表示訂正

初回handoffの「macOS 1 round `2030/600000`、job margin `597970 ms`」は誤記である。1 roundの実測からGitHub Actions job全体の時間や10分marginは算出できない。履歴は上に残し、本Retry 1で次のように訂正する。

- metricは`roundDurationMs`／`roundBudgetMs`／`roundMarginMs`へ改名した。これは1 roundのlocal guardであり、job timingではない。
- job合計時間と10分上限までのmarginは、後続Windows runnerのstep／job timingだけをfresh Evaluatorが記録する。local結果から主張しない。
- lock／lease metricsの対象はcanonical writerであるCLI 32だけとし、`canonicalWriterCount: 32`、`maxCanonicalLockWaitMs`等へ明記した。Hook 32はruntime Hook writeであり、`hookWriterCount: 32`、exit、delta、JSON parse、uniqueの別hard gateである。
- `canonicalUnique`、`hookUnique`、`stateRebuild`、canonical／Hook delta、rebuild前後residueは実測値から組み立て、assert後の固定literalを廃止した。rebuild前にもresidue 0をassertする。

Retry 1 exact clean macOS round実測は、CLI 32＋Hook 32の64/64 exit 0、canonical delta 32、Hook delta 32、parse／unique／State rebuild 100%、rebuild前後residue 0、canonical max lock wait `1085/15000 ms`、最小lock margin `13915 ms`、max lease critical `126/30000 ms`、最小lease margin `29874 ms`、round `1979 ms`である。これはWindows 3 roundまたはCI job時間の代用ではない。

### negative control（Retry 1開始candidate）

開始candidate `8999a1bddc5001fd7f808e68dbb7d1d2c5836c68` とRetry 1 candidateを同じsource条件で比較した。

- P-1: 旧`clarity-core.mjs:1240`は`(tempStat.mode & 0o077) === 0`を無条件適用し、Windowsで全canonical replaceを拒否し得た。新candidateはplatform分岐とnegative P001-12を持つ。
- P-2: 旧`clarity-core.mjs:1322-1327`はcanonical before／State afterからappend after artifactをroll-forwardするbranchを持った。新candidateはbranchを削除し、P001-13で任意bytes、canonical／State／progress／canary不変を実行確認した。
- V-1: 旧`sprint-047-test.mjs:318-331`は1 roundの時間を`jobLimitMs`／`jobMarginMs`として出力した。新candidateに旧metric名は0件で、round表示とrunner job timingを分離した。
- V-2: 旧Patch suiteで`CLARITY_CRASH_AT: "lock-record-before"`とP001-12〜19は0件だった。新P001-14はthrow mockでなく実child process SIGKILLを通す。

### Retry 1検証集計

| 面／command | Retry 1結果 |
|---|---|
| source、`node scripts/sprint-047-patch-001-test.mjs` | 19/19 PASS、Windows native NOT-RUN |
| exact clean `22326598ec4ae1cfce10ea29b6ea6638a1e24e55`、同上 | 19/19 PASS、開始／終了`git status --short`空 |
| 同SHA Git-free archive、同上 | 19/19 PASS、`.git`不存在 |
| source／exact clean／Git-free、`node scripts/sprint-047-test.mjs` | 各25/25 PASS、Case ID／Severity／threshold不変 |
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS／0 FAIL／Windows 4 NOT-RUN |
| `node scripts/sprint-050-patch-005-test.mjs` | 9 PASS／0 FAIL／Windows 1 NOT-RUN |
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9/9 PASS／Windows native NOT-RUN |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface／67 case、marker／実digest PASS |
| `node scripts/agentic-archive-gate.mjs` | `AGENTIC_ARCHIVE_GATE_PASS=9 FAIL=0 CLARITY_REGRESSION=25` |
| `node --check`／`git diff --check` | exit 0 |

### Retry 1残余リスク／Evaluator導線

- Windows Server 2025／Node 22はGenerator環境では **NOT-RUN**。P001-12のsource contractはCI前の補助negativeであり、Windowsのmode、read-only attribute、dev／ino identity、3 roundの実挙動をPASSへ昇格しない。
- Windows nativeは既存workflowの同一jobでPatch 19 case、Sprint 047 25 case、GS-009 3 round×Hook 32＋CLI 32、GS-010を実行し、runnerのstep／job timingから10分marginを記録する。実測で収まらなければcase削減やtimeout延長をせず`verification-scope-issue`へ戻す。
- 破損progressや識別不能lockは意図的に自動削除しない。doctorの`confirmation-required`／`ownership-unverified`に従い、利用者が所有を確認して回復方法を選ぶ必要がある。
- 本Retry 1もGenerator自己評価であり、fresh Fable／独立Evaluator Verdictではない。public handoff ready、private my-vault、Yasashii同期は未実施である。

### Retry 1外部副作用

- network／external service／GitHub API／Xmind live call: **0件**
- push／workflow dispatch／PR更新／merge／tag／release: **0件**
- private my-vault／Yasashii／installed plugin／cache／live workspace write: **0件**
- source／spec／Sprint contract／state／feedback変更: **0件**
- 一時fixtureとGit-free archiveはローカルtemporary directory内だけに作成し、終了後に削除した。
