# Sprint 047 Patch 001 Generator進捗 — Windows並行writeの整合回復

- 初回開始HEAD: `a758dad4a35c71012e02a2629a849db77e6745b8`
- 初回製品candidate commit: `26f1c12985b4b752b30f7e34a599c076ed0d21eb`
- Retry 1開始HEAD: `8999a1bddc5001fd7f808e68dbb7d1d2c5836c68`
- Retry 1製品candidate commit: `22326598ec4ae1cfce10ea29b6ea6638a1e24e55`
- Retry 1製品candidate tree: `53a2a014f94d03b39657af354509f2feb7c4238f`
- 対象: `sprint-047-patch-001`（regular patch、Risk high、Model Tier strong）
- 現在地: 利用者承認の最終Retryについて、public source／exact clean candidate／同SHA Git-free archiveのGenerator自己検査完了。Windows Server 2025／Node 22とfresh独立Evaluator待ち

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

## Retry 2 — Windows lock排他作成の一時共有競合

- Retry 2開始HEAD: `397180ba227a900bb46b68985afbaaf3f5c27ab6`
- Retry 2製品candidate commit: `842b4bcddc422edf2655abb52de9b093bbc63f38`
- Retry 2製品candidate tree: `b1837771c3b3bd083910b841560b8b5524e5376a`
- 因果Windows evidence: exact head `43741c5eae212e1e8dfe899189b1e493df9e3367`、run `33430167446`、job `99613326562`、Windows Server 2025、Node `v22.23.2`

因果runで実測された`EPERM`／`open`だけをlock排他作成の回復候補にした。platform名だけで結果を作るtest専用成功分岐は置かず、実`openSync(... O_EXCL ...)`直前のfailure injectionとproductionを同じ分類pathへ通す。POSIXで同じ狭い`EPERM`／`open`署名が発生した場合もbounded recoveryするが、EACCES、rename、write、未知error等の一般permission errorはretryしない。これは因果runで未観測のerrorへ対象を広げず、errno単独のblind retryを避けるためである。

各lock create retry前にphysical Clarity root、lock pathとparent、parentの通常directory identityと`W_OK`、lock pathのmissingまたは通常file／non-symlink状態を再確認する。root／parent／path差替え、symlink／junction、unwritable parent、unsafe lockは即時fail closedにする。retry中にlockが現れた場合は既存`EEXIST`経路へ戻し、通常file、owner／token、active／staleを既存どおり再検査する。既存`ENOENT`の15秒上限、全lock waitのattempt上限、正のsleep、30秒lease、record前crash／empty lock／stale owned lock／他者lock境界は変更していない。

lock create共有競合は最大7 failure、1,000 ms以内に限定した。成功結果と恒久停止errorへ`lockCreateFailures`、`lockCreateRetryAttempts`、`lockCreateRetryWaitMs`、上限、marginを記録する。P001-20のexact clean実測はtransientが3 open／2 failure／2 retry／30 ms wait／965 ms marginでEvent 1件・残骸0、permanentが7 failure／6 retry／470 ms wait／475 ms marginで`canonical-lock-create-failed`・canonical不変・残骸0だった。EACCES／openはretry metricsなしで即時`canonical-lock-create-failed`、directory化したunsafe lockは`canonical-lock-unsafe`でcanonical不変のまま保持した。

P001-12はtest modeなしの実write成功、Event +1、残骸0を主証拠にし、mode分岐のsource検査は改行をLFへ正規化した補助構造検査へ変更した。同じ検査へLF bytesと人工CRLF bytesを渡して両方通すため、Windows checkoutのCRLFに依存しない。`CLARITY_TEST_MODE=0`では新しい`lock-create-open`を含むfailure／crash seamが無効であることも実挙動で確認した。Windows製品挙動の最終根拠はnative CIのままであり、Mac結果をWindows PASSへ昇格していない。

### Retry 2変更path

```text
plugins/secretary/scripts/lib/clarity-core.mjs
scripts/sprint-047-patch-001-test.mjs
plugins/secretary/collaboration-inventory.json
docs/progress/sprint-047-patch-001.md
```

workflowの`windows-2025`、Node 22、`timeout-minutes: 10`、既存step／trigger、Sprint 047のGS-009／GS-010、Windows 3 round×Hook 32＋CLI 32、Case ID／Severity／thresholdは変更していない。inventoryは`clarity-root-policy`と`clarity-harness-scanner`の実内容digestだけを追従した。

### Retry 2検証集計

| 面／command | Retry 2結果 |
|---|---|
| source、`node scripts/sprint-047-patch-001-test.mjs` | 20／20 PASS。P001-01〜19の意味を維持しP001-20追加。Windows native NOT-RUN |
| exact clean candidate `842b4bcddc422edf2655abb52de9b093bbc63f38`、同上 | 20／20 PASS、開始／終了`git status --short`空 |
| 同candidate Git-free archive、同上 | 20／20 PASS、`.git`不存在 |
| source／exact clean／Git-free、`node scripts/sprint-047-test.mjs` | 各25／25 PASS、registry missing／duplicate／extra 0 |
| exact clean GS-009（macOS 1 round） | Hook 32＋CLI 32の64／64 exit 0、canonical／Hook delta各32、parse／unique／State 100%、rebuild前後residue 0 |
| exact clean GS-009時間 | max canonical lock wait `1126/15000 ms`、min margin `13874 ms`、max lease critical `192/30000 ms`、min margin `29808 ms`、round `2073 ms`。Windows 3 round／job時間の代用ではない |
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS／0 FAIL／Windows 4 NOT-RUN |
| `node scripts/sprint-050-patch-005-test.mjs` | 9 PASS／0 FAIL／Windows 1 NOT-RUN |
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9／9 PASS／Windows native NOT-RUN |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface／67 case、marker／digest PASS |
| `node scripts/agentic-archive-gate.mjs` | `AGENTIC_ARCHIVE_GATE_PASS=9 FAIL=0 CLARITY_REGRESSION=25` |
| `node --check`／`git diff --check` | exit 0 |

### Retry 2残余リスク／Evaluator導線

- Windows Server 2025／Node 22の修正candidateはGenerator環境では **NOT-RUN**。因果run `33430167446`の旧candidate FAILを修正後PASSへ読み替えていない。
- 次のWindows native runは同一jobでPatch 20 case、Sprint 047 25 case、GS-009 3 round×Hook 32＋CLI 32、GS-010、Patch 004／005、conversation migrationを実行し、step／job timingと10分marginを記録する。1 roundでも64／64、parse／unique／State 100%、residue 0、正marginを欠けばPASSにしない。
- 本記録はGenerator自己評価であり、fresh独立Evaluator Verdictではない。public handoff ready、private my-vault、Yasashii同期へ昇格しない。
- push／workflow dispatch／PR更新／merge／tag／release／Marketplace／install／cache／live workspace／実Xmind／実downstream writeは **0件**。network／connector／GitHub API callも0件である。

## 利用者承認の最終Retry — lock競合episodeとdelete-pending診断

- 最終Retry開始HEAD: `21082cc743975b960158a8834406eda86786589d`
- 最終Retry製品candidate commit: `b48060f555278ec6ca14d2019025e48c6c5166a1`
- 最終Retry製品candidate tree: `c3aa1cbe54045399570cded40caae5fe9800ad54`
- dispatch: fresh isolated Generator、期待metadata `gpt-5.6-sol`／`high`

FableがRetry 2後に限定した2つの製品findingだけを補正した。lock取得の全体15秒、attempt上限、EPERM／`open`だけの狭い回復条件、7 failure／1,000 ms、30秒lease、owner／token、root／parent identity、`W_OK`、unsafe path拒否、rollback／cleanup条件は変更していない。

### 補正した境界

- EPERMの7 failure／1,000 ms予算を、1回のlock取得全体ではなく1つのcontention episodeへ限定した。実`openSync(... O_EXCL ...)`成功、EPERM後のboundaryでlockがvisible／existingになった時点、または実`EEXIST`待機へ入った時点でepisodeの開始時刻、failure数、backoff段階をresetする。その後のEPERMは新episodeとしてfresh budgetを持つ。累積観測値と`lockCreateEpisodes`／`lockCreateMaxEpisodeFailures`は分けて出力する。
- EPERM後のparent／lock path `lstat`、通常`EEXIST`待機中のlock path `lstat`、lock取得開始時のparent identity読取を、raw filesystem errorの再throwからpath非含有の`ClarityError`へ変更した。外向けdetailsは許可文字だけの`errorCode`／`syscall`に限定する。identityを確認できない場合はwriteせずfail closedし、root外writeやsymlink／junction緩和を行わない。
- `CLARITY_TEST_MODE=1`の既存failure seamだけに、bounded delayとparent／lock `lstat`境界を追加した。本番環境ではfailure／delay／message注入を有効化できない。
- inventoryは`clarity-root-policy`と`clarity-harness-scanner`の実内容digestだけを追従した。workflow、trigger、Case ID、Severity、threshold、GS-009の3 round×Hook 32＋CLI 32は不変である。

### 追加した決定的fixture

| Case | 結果 | 実挙動 |
|---|---:|---|
| P001-21 | PASS | 実在するactive Clarity lockを作り、1回目EPERM、実`EEXIST`待機、別process release、2回目EPERM、成功を同じproduction open境界で通した。`lockAttempts=4`、累積EPERM 2、episode 2、最大failure／episode 1、retry 1、Event追加1、残骸0、全体15秒margin正 |
| P001-22 | PASS | EPERM後のparent／lock path lstatとEEXIST待機中lstatへ、absolute fixture pathをmessageに含むraw errorを注入した。3経路ともpath非含有`canonical-lock-*-unavailable`、`EPERM`／`lstat`、canonical不変、残骸0 |

P001-01〜20のID、期待、意味は変更していない。Patch専用suiteは合計 **22／22 PASS** である。

### 最終Retry検証集計

| 面／command | 結果 |
|---|---|
| source、`node scripts/sprint-047-patch-001-test.mjs` | 22／22 PASS、Windows native NOT-RUN |
| exact clean candidate、同上 | 22／22 PASS、開始／終了`git status --short`空 |
| 同candidate Git-free archive、同上 | 22／22 PASS、`.git`不存在 |
| source／exact clean／Git-free、`node scripts/sprint-047-test.mjs` | 各25／25 PASS、GS-009 Hook 32＋CLI 32、registry missing／duplicate／extra 0 |
| source／exact clean／Git-free、`node scripts/sprint-050-patch-004-test.mjs` | 各12 PASS／0 FAIL／Windows 4 NOT-RUN |
| source／exact clean／Git-free、`node scripts/sprint-050-patch-005-test.mjs` | 各9 PASS／0 FAIL／Windows 1 NOT-RUN |
| source／exact clean／Git-free、`node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 各9／9 PASS／Windows native NOT-RUN |
| source／exact clean／Git-free、`node scripts/sprint-049-inventory.mjs validate` | 各20 surface／67 case、marker／digest PASS |
| source、`node scripts/agentic-archive-gate.mjs` | `AGENTIC_ARCHIVE_GATE_PASS=9 FAIL=0 CLARITY_REGRESSION=25` |
| `node --check`／`git diff --check` | exit 0 |

clean cloneとGit-free archiveは製品candidate `b48060f555278ec6ca14d2019025e48c6c5166a1`／tree `c3aa1cbe54045399570cded40caae5fe9800ad54`に固定した。3面ともPOSIX結果であり、Windows native PASSの代用ではない。

### 最終Retry残余リスク／外部副作用

- Windows Server 2025／Node 22で製品candidateを実行していない。既知FAIL runやRetry 2旧candidateの因果runを本candidateのPASSへ読み替えない。次のWindows同一jobでPatch 22 case、Sprint 047 25 case、GS-009 3 round×Hook 32＋CLI 32、GS-010、Patch 004／005、conversation migration、step／job timing、10分marginをfresh独立Evaluatorが確認する必要がある。
- delete-pending等でparent／lock identityを安全に確認できない場合は、raw errorを出さず非0でfail closedする。Windows nativeでこの安全停止が反復して可用性を満たさない場合は、閾値やroundを弱めずproduct findingとして扱う。
- 本記録はGenerator自己評価であり、独立Evaluator Verdict、public handoff ready、private my-vault／Yasashii ready、release readyではない。
- push／workflow dispatch／PR更新／merge／tag／release／Marketplace／install／cache／live workspace／実downstream writeは **0件**。network／connector／GitHub API callも0件である。

## 利用者承認の追加Retry — stale lock削除境界のsanitized収束

- 追加Retry開始HEAD: `135210f233218da648cc721cbd600caf545d3484`
- 製品candidate commit: `59ac895b32a434b03ba748b895e26e2911bff8e8`
- 製品candidate tree: `45a3da59700dc83e302c5e7b238600d6b0675c33`
- dispatch: fresh isolated Generator、期待metadata `gpt-5.6-sol`／`high`

Fableが直前candidate `b48060f555278ec6ca14d2019025e48c6c5166a1`で実filesystem再現したproduct Major 1件だけを補正した。`removeOwnedStaleLock()`の`rmSync(checked)`境界を局所的に捕捉し、CLI top-level catch全体、doctor／cleanup全般、前回のepisode reset／`lstat` sanitize、全体15秒／1502 attempts／30秒lease、owner／token、root／parent identity、`W_OK`、symlink／junction／permission境界は変更していない。workflow、Case ID、Severity、threshold、Windows 3 round×Hook 32＋CLI 32、`timeout-minutes: 10`も不変である。

### 補正した製品境界

- `rmSync`の非`ENOENT` failureはraw `error.message`を再throwせず、`canonical-lock-stale-cleanup-failed`へ変換する。外向けdetailsは既存allowlist helperを通した`errorCode`／`syscall`と`changed: false`だけで、absolute local pathを含めない。
- 競合`ENOENT`は、直前にClarity owner／kind、期限切れ、同一token／expiresAtを2回照合済みであり、catch後の`lstat`でもpath不在を確認できた場合だけ「別processが既に削除済み」としてacquire loopを継続する。pathが存在する場合は成功扱いせず、再確認自体が非`ENOENT`で失敗した場合はsanitized errorでfail closedする。
- 決定的race用のbarrierは`CLARITY_TEST_MODE=1`かつ専用envが明示された場合だけ有効で、同一stale identityの照合後・`rmSync`直前に限定した。5秒で必ず停止し、本番または`CLARITY_TEST_MODE=0`ではfile作成・待機とも0件である。
- inventoryは`clarity-root-policy`と`clarity-harness-scanner`の実内容digestだけを追従した。

### P001-23 決定的fixture

1. 非`ENOENT`削除失敗: stale lockの`rmSync`直前に、fixture absolute lock pathをraw messageへ含む`EACCES`／`unlink`を注入した。exit 4、code `canonical-lock-stale-cleanup-failed`、detailsは`changed: false`／`EACCES`／`unlink`だけで、stdout／stderr／JSON／detailsのpath・raw message露出0、Event／Evidence／State変更0、stale lock保持、operation／temp residue 0だった。
2. 同一identity並行削除: process Aを同一owner／token／expiresAtのstale lock照合後にbarrierで停止し、process Bが実filesystemで同lockを削除してEvent writeとlock releaseをexit 0で完了した。lock path不在をfixture側で確認後にAを再開し、Aの実`rmSync`を`ENOENT`へ到達させた。Aもexit 0でacquire loopへ収束し、Event delta +2、両Event ID各1件・全ID unique、Evidence delta 0、State eventCount一致、rebuild一致、lock／operation／temp residue 0だった。
3. `CLARITY_TEST_MODE=0`ではstale lock削除failure注入とbarrier envを同時に与えても通常回復し、barrier file 0、Event 1件、lock residue 0である。既存P001-01〜22、GS-010のstale owned lock回復、active／unsafe／ownership不明を自動成功へ昇格しない境界は維持した。

Patch専用suiteは合計 **23／23 PASS**。P001-01〜22のID、期待、意味を変更していない。

### 追加Retry検証集計

| 面／command | 結果 |
|---|---|
| source、`node scripts/sprint-047-patch-001-test.mjs` | 23／23 PASS、Windows native NOT-RUN |
| exact clean candidate、同上 | 23／23 PASS、開始／終了`git status --short`空 |
| 同candidate Git-free archive、同上 | 23／23 PASS、`.git`不存在 |
| source／exact clean／Git-free、`node scripts/sprint-047-test.mjs` | 各25／25 PASS。GS-009は各面Hook 32＋CLI 32の64／64 exit 0、parse／unique／State rebuild 100%、rebuild前後residue 0。Windows 3 roundの代用ではない |
| source／exact clean／Git-free、`node scripts/sprint-050-patch-004-test.mjs` | 各12 PASS／0 FAIL／Windows 4 NOT-RUN |
| source／exact clean／Git-free、`node scripts/sprint-050-patch-005-test.mjs` | 各9 PASS／0 FAIL／Windows 1 NOT-RUN |
| source／exact clean／Git-free、`node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 各9／9 PASS／Windows native NOT-RUN |
| source／exact clean／Git-free、`node scripts/sprint-049-inventory.mjs validate` | 各20 surface／67 case、marker／digest PASS |
| source、`node scripts/agentic-archive-gate.mjs` | `AGENTIC_ARCHIVE_GATE_PASS=9 FAIL=0 CLARITY_REGRESSION=25` |
| source／exact clean／Git-free、`node --check`。source／exact clean、`git diff --check` | exit 0 |

起動URLはないCLI製品である。Evaluatorの再現入口は`node scripts/sprint-047-patch-001-test.mjs`、基礎回帰は`node scripts/sprint-047-test.mjs`、配布面の回帰は上表のPatch 004／005、conversation migration、inventory、archive gateである。

### 追加Retry残余リスク／外部副作用

- Windows Server 2025／Node 22はGenerator環境で **NOT-RUN**。macOSのsource／clean／Git-free結果をWindows PASSへ読み替えない。次のWindows native同一jobではPatch 23 case、Sprint 047 25 case、GS-009 3 round×Hook 32＋CLI 32、GS-010、Patch 004／005、conversation migration、step／job timing、10分marginをfresh独立Evaluatorが確認する必要がある。
- `ENOENT`収束は同一stale identityの事前照合とcatch後path不在に限定したが、Windows固有delete-pending／共有挙動の最終可用性はnative実測待ちである。identityを確認できない場合は意図的にfail closedする。
- 本記録はGenerator自己評価であり、Fable再レビュー／独立Evaluator Verdict、public handoff ready、private my-vault／Yasashii ready、release readyではない。
- push／workflow dispatch／PR更新／merge／tag／release／Marketplace／install／cache／live workspace／実downstream writeは **0件**。network／connector／GitHub API callも0件である。

## 利用者承認のatomic takeover Retry — active replacement非削除

- Retry開始HEAD: `e683b438cf810979a83326acd633ade7fec2a9b6`
- 製品candidate commit: `4a28f6b57ea31a842f7144d23ce15fca2daa2f0d`
- 製品candidate tree: `56971d6f6b75ea7b0740e92d5819b4f76a01afa3`

Evaluatorが再現した、stale identity確認後のprocess Aを停止し、process Bが回復して別owner／tokenのactive lockを保持した後にAを再開するとAがBのlockを削除できるTOCTOUを補正した。owner／token／active／stale／lease、全体15秒、1502 attempts、30秒lease、root／target／parent identity、writability／read-only、symlink／junction／ancestor alias／permission、absolute path／Secret非露出、他者所有物非変更の既存契約は維持した。

### 実装したidentity-bound protocol

- `.clarity/lock-transition.json`を`O_CREAT | O_EXCL`で作る短命の切替guardとし、canonical `lock.json`のmissing→create、stale recheck→remove→同一操作のcreate、active leaseを伴うreleaseを同じguard内へ直列化した。guard取得後にcanonical lockのidentityを再確認するため、guard外で確認した古いidentityを根拠に削除しない。
- Aがstale確認後に停止している間にBが回復・active lockを取得した場合、AはBのguard／active leaseが解放されるまで既存のbounded waitを使う。Aがguardを得た時点の再確認ではstale identityが一致しないため、Bのactive replacementを削除できない。
- guard releaseはrecordのowner／kind／token／operationIdに加えてfile identity（`dev`／`ino`）を照合し、別identityへ置き換わっていれば削除せず`canonical-lock-transition-cleanup-failed`で非0終了する。
- guard保有processがkill／crashした場合、guardを期限だけで自動削除しない。後続writeは既存15秒上限で`canonical-lock-transition-busy`となり、doctorは`interrupted-lock-transition`／利用者確認必須として保存する。recursiveなstale guard takeoverを新設しないfail-closed設計であり、確認後の回復後は通常成功・residue 0へ戻る。
- test barrierとcrash injectionは`CLARITY_TEST_MODE=1`かつ専用envのときだけ有効で、production result専用分岐やsleepだけの再現ではない。
- inventoryは変更したproduct sourceのdigestだけを追従した。workflowのpath／Case ID／threshold／process数／3 round／timeoutは変更不要で、既存値を維持した。

### P001-23へ追加した決定的product negative

1. process Aをstale owner／token／expiresAt確認後に停止し、process Bを実CLIで起動した。Bがstale回復後の別token active lockを保持している間にAを再開し、100ms後も両processが実行中で、canonical `lock.json`のbytesがBのactive lockと同一であることを確認した。最終的にA／Bともexit 0／`changed: true`、Event delta +2・ID unique、Evidence不変、State count／rebuild一致、owned residue 0だった。
2. guard保有直後にprocessを実SIGKILLした。doctorがconfirmation-required、`cleanup --apply`がguard非削除、次writeが約15秒内にexit 4／`canonical-lock-transition-busy`、canonical不変であることを確認した。利用者確認相当のfixture回復後はwrite成功・residue 0だった。
3. guard release直前に別token／別inodeのguardへ置換した。writerはexit 4／`canonical-lock-transition-cleanup-failed`、replacement bytesを保持、canonical不変、doctor confirmation-requiredとなった。確認後の回復では成功・residue 0だった。
4. stale cleanupの非`ENOENT` sanitize、既存P001-01〜22のID／期待／意味も保持し、Patch専用suiteは合計 **23／23 PASS** のままである。

### 変更path

- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `scripts/sprint-047-patch-001-test.mjs`
- `plugins/secretary/collaboration-inventory.json`
- `docs/progress/sprint-047-patch-001.md`

### 実行済み検証

| 面／command | 結果 |
|---|---|
| source、`node scripts/sprint-047-patch-001-test.mjs` | 23／23 PASS、Windows native NOT-RUN |
| source、`node scripts/sprint-047-test.mjs` | 25／25 PASS、GS-009 Hook 32＋CLI 32＝64／64、parse／unique／State rebuild 100%、residue 0。観測最大lock wait 1470ms／15000ms、lease critical 121ms／30000ms |
| source、`node scripts/sprint-050-patch-004-test.mjs` | 12 PASS／0 FAIL／Windows 4 NOT-RUN |
| source、`node scripts/sprint-050-patch-005-test.mjs` | 9 PASS／0 FAIL／Windows 1 NOT-RUN |
| source、`node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9／9 PASS／Windows native NOT-RUN |
| source、`node scripts/sprint-049-inventory.mjs validate` | 20 surface／67 case、marker／digest PASS |
| source、`node scripts/agentic-archive-gate.mjs` | `AGENTIC_ARCHIVE_GATE_PASS=9 FAIL=0 CLARITY_REGRESSION=25` |
| exact clean candidate、上記Patch／Sprint／migration／inventory suite | sourceと同件数で全green、開始／終了`git status --short`空。GS-009最大wait 1430ms、lease 196ms |
| 同candidate Git-free archive、上記Patch／Sprint／migration／inventory suite | sourceと同件数で全green、`.git`不存在。GS-009最大wait 1497ms、lease 99ms |
| `node --check`／`git diff --check` | exit 0 |

起動URLはないCLI製品である。Evaluatorは製品candidate `4a28f6b57ea31a842f7144d23ce15fca2daa2f0d`を固定し、`node scripts/sprint-047-patch-001-test.mjs`のP001-23をTOCTOU negativeの入口として、基礎回帰、Patch 004／005、conversation migration、inventory、archive gateを独立実行する。

### 残余リスク／未実施事項

- Windows Server 2025／Node 22 nativeはGenerator環境で **NOT-RUN**。macOSのsource／exact clean／Git-free結果をWindows PASSへ読み替えない。次のWindows同一jobでPatch 23件、Sprint 047 25件、GS-009 3 round×Hook 32＋CLI 32、Patch 004／005、conversation migration、inventory、step／job timing、10分marginをfresh独立Evaluatorが確認する必要がある。
- guard crashは安全側へ停止するため、利用者確認付きcleanupまでwrite可用性が戻らない。これはactive replacement誤削除を避ける意図的なfail-closedで、doctor証拠と回復fixtureを追加済みである。OS外部からguard inodeを確認直後に直接置換する非協調processまではfilesystem APIだけで完全に排除できないが、製品の全canonical lock遷移は同protocolへ統一した。
- 本記録はGenerator自己評価であり、独立Evaluator Verdict、public handoff ready、private my-vault／Yasashii ready、release readyではない。
- push／workflow dispatch／PR更新／merge／tag／release／Marketplace／install／cache／live workspace／実Xmind／downstream writeは **0件**。network／connector／GitHub API callも0件である。
