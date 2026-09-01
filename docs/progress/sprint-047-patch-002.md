# Sprint 047 Patch 002 Generator進捗 — Windows並行burstのGit identity discovery

- 開始HEAD: `f4d9ed96935f8e80dcfbd023b6caace80ddcb51c`
- Windows失敗candidate: `e9b5f1f9d95c3463205f2acfb417a4fd075436f9`
- Retry 1製品candidate commit: `f8e1a1c4b510c4ac3700c3aab33b3076ae833696`
- Retry 1製品candidate tree: `c63b734e2fef1453b492f6bb820bbec549150c4b`
- Retry 2製品candidate commit: `6487666b32d166c1a419b7e45dc069e81cc309cb`
- Retry 2製品candidate tree: `fe6c5f5e98a252366b464a1c05d1a3fd6bddb893`
- 対象: `sprint-047-patch-002`（regular patch、Risk high、Model Tier strong）
- 現在地: Retry 2のpublic Generator実装と比例したmacOS回帰が完了。Windows Server 2025／Node 22とfresh独立EvaluatorはNOT-RUN

## 原因

最初のPatch 002では、1 requestに2回あったGit identity probeを、read-onlyのcombined probe 1回へ集約した。この実装は正しく、Windows run `33525750026`、job `99916020064`でもsyntax、Windows path、conversation migration、Clarity scanは通過した。一方、GS-009では64 process中2 processが`canonical-lock-busy`となり、その後のP001／P002／formal 3 roundはskipされた。Git identity timeoutは出ていない。

Retry 1で実際の`clarity event --apply` writerを一時的な診断copyで計測すると、1 writerにつきfull root/Git revalidationは合計78回、canonical lock保持中62回だった。登録済みsafe-fs guardが`safeWritePath()`ごとに`revalidateAll()`を呼び、root、alias chain、ancestor `.git` marker、Git top／dir／common dirの物理identity、Gitfile／commondir関係、config digest、環境digestを繰り返し確認していた。正しい検証だが、同じ同期writeの直前にも重複し、Windowsの直列critical sectionを増幅する経路だった。

比較したA案は、各revalidationで探索する`.git` markerをfilesystem rootまでではなく既知のGit topまでに限定する方法。20 writerの比較でbaselineはcritical section平均13.55 ms、process平均119.96 ms、A案は13.75 ms／120.66 msとなり、改善がなかった。意味上の保護範囲を狭める利点もないため採用していない。

採用したB案は、1回のfilesystem mutationだけをrevalidation scopeに入れる方法。提案時はlock内を約33回まで減らせる見込みだったが、`mkdir + write`を同じscopeに入れず、mutation 0回のpath解決もscope化しない厳密な最終形では、合計51回、lock内35回だった。lock内は62回から27回、43.5%減少した。20 writerでcritical section平均は13.55 msから10.95 msへ約19.2%短縮し、process平均は119.96 msから118.52 msだった。

## Retry 1実装

- `withClarityRootRevalidationScope()`はscope入口で必ずfull revalidationを1回行い、scope内の登録guardと明示revalidationだけがその結果を再利用する。`finally`で直後に無効化し、nested scopeは拒否する。
- scopeはprogress tempの`writeFileSync` 1回、各progress `renameSync` retry attempt 1回、各canonical `renameSync` retry attempt 1回、owned artifactの`unlinkSync` 1回にだけ配置した。
- `ensureRuntimeDirectory`はtemp write scopeの外にあり、`mkdir + write`を共有しない。2回のrename、rename retry attempts、別request、次のwrite boundaryもscopeを共有しない。
- 最初の親／temp identity path解決はmutationを伴わないためscope化せず、full validationを維持した。
- test-only observerは`CLARITY_TEST_MODE=1`でだけ有効にし、製品diagnosticや新collectorは追加していない。
- timeout 5,000 ms、lock 15,000 ms、lease 30,000 ms、process数、round数、workflow順序は変更していない。timeout延長、retry swallowing、stagger、batch、prewarmはない。

GI-012は必要な境界を1 caseで検証する。

1. 1つの同期write boundary内で`safeWritePath()`を繰り返しても、full validationは入口の1回だけであり、そのscopeのmutationはtest fixture write 1回だけ。
2. scope終了後にGit configを変更すると、次のrequest／write boundaryは古いidentityを再利用せず、2回目のfull validationで`clarity-root-changed`として停止する。

これにより、同一mutation内の重複だけを除き、filesystem変更をまたぐstale identityは許可しない。

## 維持したidentity／write保護

- 1 requestにつき5秒bounded read-only combined Git probe 1回。
- rootとGit identityのfail closed、`.git` directory、linked-worktree Gitfile、`commondir`、worktree bindingを維持。
- Windows long pathと8.3 short pathは文字列でなく物理identityで判定。
- ancestor alias、symlink／junction、親Repo／子Repo／別Repo negativeを維持。
- Git config、ancestor `.git` marker、Gitfile／commondir関係のwrite-before-change検出を維持。
- `GIT_TERMINAL_PROMPT=0`、`GIT_OPTIONAL_LOCKS=0`、network／credential／provider call 0を維持。

## 変更path

Retry 1製品commitの変更は次の4 fileだけ。

```text
plugins/secretary/scripts/lib/clarity-root.mjs
plugins/secretary/scripts/lib/clarity-core.mjs
scripts/sprint-047-patch-002-test.mjs
plugins/secretary/collaboration-inventory.json
```

Retry 1製品diffは112追加／37削除。内訳はroot `+31/-0`、core `+45/-35`、focused test `+34/-0`、inventory digest `+2/-2`。Patch 002開始HEADからの製品全体では、root `+297/-48`、core `+45/-35`、focused test `+372/-0`、workflow `+7/-0`、inventory関連 `+4/-4`である。Retry 1ではcollector、scheduler、attestation、workflow stepを増やさず、重いguardの重複を1 mutation内だけ除いた。

Planner正本、`docs/sprints/state.md`、contract、rubric、feedback、private my-vault、Yasashii、installed cacheは変更していない。

## 実行済み検証

| command／面 | 結果 |
|---|---|
| `node --check plugins/secretary/scripts/lib/clarity-root.mjs`ほか2 file | 3/3 exit 0 |
| `node scripts/sprint-047-patch-002-test.mjs` | 12/12 PASS、probe/request 1、timeout 5,000 ms、external write 0、network 0、Windows 8.3はmacOS NOT-RUN |
| GI-012 | scope内の反復path解決はfull validation 1回。scope外のGit config変更後は次境界で2回目を実行し`clarity-root-changed` |
| `node scripts/sprint-050-patch-003-test.mjs` | root／alias positive・negative 21/21 PASS、external write 0、network 0 |
| `node scripts/sprint-047-patch-001-test.mjs` | logical-write隣接回帰23/23 PASS |
| Patch 001 timing | max lock wait 2,224/15,000 ms、margin 12,776 ms。max lease critical 1,064/30,000 ms、margin 28,936 ms |
| `node scripts/sprint-047-test.mjs` | 25/25 PASS、Critical 16/16、AC 7/7 |
| GS-009 local 1 round | CLI 32＋Hook 32、64/64 exit 0、parse／unique／expected delta／State rebuild 100%、residue 0 |
| GS-009 local timing | max canonical lock wait 1,135/15,000 ms、margin 13,865 ms。max lease critical 128/30,000 ms、margin 29,872 ms。round 1,785 ms |
| inventory | 20 surface／67 case、digest valid、marker valid、JSON parse exit 0 |
| YAML | Rubyで`.github/workflows/windows-recording-regression.yml` parse exit 0 |
| diff | `git diff --check` exit 0 |

ローカルGS-009はmacOS仕様どおり1 roundであり、Windows 3 roundやjob全体時間の代用ではない。Windowsでは既存test本体が`process.platform === "win32"`により3 roundを実行する。

## 起動／Evaluator handoff

server、DOM、UI、test URLはない。CLI／filesystem／Git processが製品surfaceである。

```bash
node scripts/sprint-047-patch-002-test.mjs
node scripts/sprint-050-patch-003-test.mjs
node scripts/sprint-047-patch-001-test.mjs
node scripts/sprint-047-test.mjs
```

Evaluatorは製品candidate `f8e1a1c4b510c4ac3700c3aab33b3076ae833696`を固定し、上記4 commandとこのcandidateに因果するWindows workflow raw resultを確認する。WindowsではP002の`WINDOWS_8DOT3=RUN`または環境側8.3無効による明示NOT-RUNを区別し、GS-009 3 roundの各round 64/64、各margin正、job全体10分未満をraw timingから判定する。

## NOT-RUN／外部副作用

- Windows Server 2025／Node 22、8.3短縮名、Windows 3 round、Retry 1 candidateのroot identity timeout実数、lock timing、job合計時間: **NOT-RUN**
- Windows run `33525750026`／job `99916020064`はRetry 1のPASS evidenceではなく、原因調査に使った失敗evidence。
- fresh独立Evaluator: **NOT-RUN**。本記録はGenerator自己評価でありVerdictではない。
- push、workflow dispatch、PR更新、merge、tag、release、Marketplace、install／update、cache、loaded session、live workspace、connector: **0件**
- private my-vault／Yasashii source／spec／state／contract／rubric／feedbackへのwrite: **0件**
- network／GitHub API／credential／remote provider call: **0件**

## Retry 1時点のfollow-up

- transition guardのowner-token releaseはRetry 1では変更していなかった。Retry 2で同じtransition安全境界を変更するため、PR P1どおり閉じた。
- State rebuild oracleのPR findingは別のverification patchとして扱う。Retry 1では変更していない。

## Retry 2原因と限定修正

Windows pull request run `33528106290`、job `99924026435`はWindows Server 2025／Node 22で2分44秒後にFAILした。変更なしのPatch 005内包`GS-009`で64 writer中9件が非0となり、内訳は`canonical-lock-transition-busy` 6件、`canonical-lock-busy` 3件だった。Git identity timeoutは0件で、後続P001、P002、正式3 roundはskipされた。

Retry 1でfull root／Git revalidationを合計78→51、canonical lock内62→35へ減らしてもWindowsで失敗したため、検査量ではなくtransition guardのconvoyを主因とした。`createCanonicalLockPath()`は最初にcanonical lock不存在を確認してからtransition取得へ進む。burstでは複数processがtransition待機へ入り、その間にwinnerがcanonical lockを作っても、waiterはguardを順番に取得して`open(O_EXCL)`の`EEXIST`を知るまでcanonical待機へ戻れず、共有15秒budgetを消費していた。

Retry 2は次の2点だけを修正した。

1. create経路だけが`acquireCanonicalLockTransition()`へcanonical pathを渡す。transition待機中はguard pathが通常fileかつnon-symlinkであることを先に確認し、canonical lockが出現していればraw `EEXIST/open`として既存canonical waitへ戻る。stale takeoverとlock releaseはcanonical pathを渡さないため、この早期exitを使わない。
2. transition取得時に作成した`owner`、`kind`、`token`、`operationId`を期待recordとして保持する。releaseの各試行はno-follow open、BigInt filesystem identity、4 KiB上限のbounded read、期待4 field、unlink直前のpath identityを再確認し、全部一致した場合だけguardを削除する。identityまたはrecord不一致はforeign guardを保持し、sanitizedな`canonical-lock-transition-cleanup-failed`で停止する。

create waiterはforeign／malformed transitionをcanonical lockへ変換しない。既存transition pathの安全性を確認した後、別pathであるcanonical lockの出現だけを既存`EEXIST`導線へ返す。canonicalが消えた後もforeign guardが残る場合は、次のtransition取得で従来どおりboundedに待ってfail closedとなる。

## Retry 2 focused証拠

- deterministic create-convoy positive: transition guardを先に保持し、writerがその待機へ入ったbarrier後にactive canonical lockを作成した。writerはguardを取得・書換えずcanonical出現を観測し、15秒上限前に既存canonical waitへ戻って最終writeを1回だけ完了した。lock wait marginは正。
- deterministic same-inode negative: transition release barrier中に、guardをunlink／renameせず同じ`dev`／`ino`のままforeign token／operationIdへ上書きした。releaseはexit 4、`canonical-lock-transition-cleanup-failed`。foreign guard bytesを保持し、empty canonical lockを自己identityでcleanupし、Event／Evidence／Stateの差分0、token／absolute path露出0だった。
- 既存rename replacement negative、transient release retry、stale takeover、active lock、transition permanent failure、BigInt identityも同じP001 case内でPASSした。

## Retry 2変更path

製品candidate `6487666b32d166c1a419b7e45dc069e81cc309cb`は次の3 fileだけを変更した（158追加／18削除）。workflow、P002 suite、Sprint 047 suite、timeout、process／round／step、thresholdは変更していない。

```text
plugins/secretary/scripts/lib/clarity-core.mjs
scripts/sprint-047-patch-001-test.mjs
plugins/secretary/collaboration-inventory.json
```

Planner正本、`docs/sprints/state.md`、contract、rubric、feedback、private my-vault、Yasashii、installed cacheは変更していない。

## Retry 2実行済み検証

| command／面 | 結果 |
|---|---|
| `node scripts/sprint-047-patch-002-test.mjs` | 12/12 PASS、probe/request 1、timeout 5,000 ms、external write 0、network 0、Windows 8.3はmacOS NOT-RUN |
| `node scripts/sprint-047-patch-001-test.mjs` | 23/23 PASS。create-convoy正例とsame-inode foreign-token負例をP001-23へ追加 |
| Patch 001 timing | max lock wait 2,219/15,000 ms、margin 12,781 ms。max lease critical 1,060/30,000 ms、margin 28,940 ms |
| `node scripts/sprint-050-patch-003-test.mjs` | root／alias positive・negative 21/21 PASS、external write 0、network 0 |
| `node scripts/sprint-047-test.mjs` | 25/25 PASS、Critical 16/16、AC 7/7 |
| GS-009 local 1 round | CLI 32＋Hook 32、64/64 exit 0、parse／unique／expected delta／State rebuild 100%、residue前後0 |
| GS-009 local timing | max canonical lock wait 1,138/15,000 ms、margin 13,862 ms。max lease critical 149/30,000 ms、margin 29,851 ms。round 1,762 ms |
| inventory | 20 surface／67 case、digest valid、marker valid、JSON parse exit 0 |
| syntax／YAML／diff | Node 3 file、Ruby YAML、`git diff --check`すべてexit 0 |

## Retry 2 Evaluator handoff

server、DOM、UI、test URLはない。CLI／filesystem／Git processが製品surfaceである。

```bash
node scripts/sprint-047-patch-002-test.mjs
node scripts/sprint-047-patch-001-test.mjs
node scripts/sprint-050-patch-003-test.mjs
node scripts/sprint-047-test.mjs
node scripts/sprint-049-inventory.mjs validate
```

Evaluatorは製品candidate `6487666b32d166c1a419b7e45dc069e81cc309cb`、tree `fe6c5f5e98a252366b464a1c05d1a3fd6bddb893`を固定し、上記5 commandと、このexact candidateに因果するWindows workflow raw resultを確認する。WindowsではPatch 005内包`GS-009`、P001、P002、正式3 roundの順に、各round 64/64、root identity timeout 0、transition／canonical busy 0、各margin正、job全体10分未満を判定する。

## Retry 2 NOT-RUN／残余

- Windows Server 2025／Node 22、Windows 8.3短縮名、Windows正式3 round、Retry 2 candidateのroot identity timeout／transition busy／canonical busy実数、job合計時間: **NOT-RUN**
- exact Retry 1失敗run `33528106290`／job `99924026435`は原因証拠であり、Retry 2 PASS evidenceではない。
- fresh独立Evaluator: **NOT-RUN**。本記録はGenerator自己評価であり、Evaluator PASS／Sprint doneを主張しない。
- State rebuild oracleのPR P2は別のverification follow-upとして残す。Retry 2では変更していない。
- push、workflow dispatch、PR更新、merge、tag、release、Marketplace、install／update、cache、loaded session、live workspace、connector: **0件**
- private my-vault／Yasashii source／spec／state／contract／rubric／feedbackへのwrite: **0件**
- network／GitHub API／credential／remote provider call: **0件**
