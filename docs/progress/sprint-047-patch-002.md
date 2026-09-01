# Sprint 047 Patch 002 Generator進捗 — Windows並行burstのGit identity discovery

- 開始HEAD: `f4d9ed96935f8e80dcfbd023b6caace80ddcb51c`
- Windows失敗candidate: `e9b5f1f9d95c3463205f2acfb417a4fd075436f9`
- Retry 1製品candidate commit: `f8e1a1c4b510c4ac3700c3aab33b3076ae833696`
- Retry 1製品candidate tree: `c63b734e2fef1453b492f6bb820bbec549150c4b`
- 対象: `sprint-047-patch-002`（regular patch、Risk high、Model Tier strong）
- 現在地: Retry 1のpublic Generator実装と比例したmacOS回帰が完了。Windows Server 2025／Node 22とfresh独立EvaluatorはNOT-RUN

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

## Retry 1対象外のfollow-up

- transition guardのowner-token releaseは別のproduct patchとして扱う。Retry 1では変更していない。
- State rebuild oracleのPR findingは別のverification patchとして扱う。Retry 1では変更していない。
