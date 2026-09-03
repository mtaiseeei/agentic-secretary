# Sprint 050 Patch 008 — Windows canonical mutation内の重複root／Git再検査統合

- Type: regular patch
- Risk: high（Clarity canonical writeのcritical section、root／Git identity、lock／lease、Windows並行Hook／CLIへ触れるため）
- Base Sprint: `sprint-050`
- 依存: `sprint-047-patch-004` done、`sprint-050-patch-006` done、`sprint-050-patch-007` awaiting-eval
- 対象機能: F78, F80
- 直接回帰Case: `GS-009`、`GS-010`（既存ID、意味、Severity、初回割当を変更しない）
- 関連rubric: C1、C2、C3、C5、C6、C19、C21、C24、C26（既存thresholdを維持）
- 主眼: Windows canonical critical sectionで、同じ同期filesystem mutationに対して重複しているfull Clarity root／Git安全再検査だけを一つへ統合し、安全境界を保ったまま3 round×64 processを全件収束させる。

## 背景と通常Patch判定

Patch 007 exact head `e8b3d0065a6b83aa9b4e6c7c61f8070cb4a96262`のWindows native run
`33718943133`／job `100533920841`は、Patch 007 focused stepへ到達する前に、Patch 005が内包する
Sprint 047 `GS-009`で停止した。Hook 32＋CLI 32の64 process中3件が非0となり、CLI Eventは期待32件に対して29件だった。
同runではconversation migration 9／9、Clarity Harness scan 16／16、`GS-001`〜`GS-008`と
`GS-010`〜`GS-015`がPASSしており、Patch 007の更新root変更に因果する失敗は観測されていない。

ユーザーはRetry Countを0へ戻し、Windows canonical critical section内で、同一filesystem mutationに重複する
full root／Git安全再検査だけを安全に統合する限定再試行を明示承認した。これは単なるworkflow rerunではなく、
並行writeの製品経路を変更する。root／Git identity、lock／lease、mutation直前のfail-closed判定を扱うため、
変更量が小さくてもmicroではなく通常のhigh-risk Patchとする。Patch 007へ混ぜず、同Patchは`awaiting-eval`のまま保持する。

## 外から見える成果

- WindowsでHookとCLIが同時にcanonicalへ記録しても、同じmutation直前の重複検査による競合・遅延で一部processが停止せず、全件が有限時間内に収束する。
- 速度改善後も、別mutation、retry、callback write、release／cleanup、別requestでは新しい現在状態を検査し、差替えや境界違反を成功へ丸めない。
- Event／Evidence／Stateは同じlogical writeとして整合し、失敗時は成功表示、破損、重複、他writer所有物の変更を残さない。
- Patch 007のWindows更新root identity変更はbyte不変とし、同Patchの独立評価はPatch 008のWindows gate回復後に同一最終候補で再開できる。

## Scope

### A. 同一mutation内だけの再検査統合

1. 統合できるのは、canonical lock取得後の有効lease内で、一つの同期filesystem mutationを実行する直前に、同じphysical rootへ重複して行われるfull root／Git安全再検査だけとする。
2. 統合された検査は、そのmutationの開始直前に現在のroot、Git top-level、Git dir、common Git dir、config由来identity、filesystem identity、symlink／junction境界を確認済みでなければならない。
3. 共有範囲は一つの同期mutationの開始から終了までで閉じる。次のmutation、retryの次試行、rollback、cleanup、lock releaseは、前の成功観測を再利用せず、それぞれの既存重要境界で現在状態を再検査する。
4. lock取得前、callbackが行う別write、非同期境界、nested critical section、別logical operation、別request、別processへ観測を共有しない。request境界外cacheや時間だけを根拠にした再利用を行わない。
5. 統合対象でない軽量なowner／token、lease期限、target／parent、temp ownership、digest、file kind等のmutation固有検査は省略しない。

### B. fail-closed境界の維持

1. physical root、Git top-level／dir／common dir、config、target／parent／temp、owner／token、operation identityのいずれかが変化・不一致・取得不能なら、そのmutationを行わず非0で停止する。
2. root自身／root内symlink、root外symlink／junction、broken／file向きalias、ancestor alias差替え、別Repo、path traversal、absolute injection、non-directory、read-only、malformed／複数行Git出力、Git非0／timeoutを従来どおり拒否する。
3. 一時競合のretryは各試行を新しいmutation試行として扱い、full root／Git検査を再実行する。恒久失敗、lease喪失、owner変更、境界差替えをretryで成功へ丸めない。
4. 拒否時はEvent／Evidence／State、runtime、lock／temp、Git、workspaceへ新しい副作用を残さない。partial stateが発生した既存logical writeはPatch 001のrollback／durable progress／doctor契約に従う。
5. Git prompt、credential取得、network、fetch／pull／push、providerを製品runtimeから起動せず、Secret、credential、absolute local pathをcanonical、tracked artifact、stdout／stderr、評価証跡へ追加露出しない。

### C. GS-009と既存上限の不変

1. Windows Server 2025／Node 22の同一jobで、Hook 32＋CLI 32を3 round実行し、各roundを64／64の100% hard gateとする。
2. 各roundでprocess exit 0、JSON parse 100%、Event ID unique 100%、CLI／Hook期待delta 100%、repair前full-State一致、State rebuild 100%、owned lock／temp residue 0件を維持する。
3. canonical lock wait 15秒、lease 30秒、Windows job 10分を変更せず、それぞれ正のmarginを持たせる。process／round／step削減、stagger、batch、prewarm、直列化、threshold緩和、timeout延長で通さない。
4. `GS-010`の期限切れClarity-owned lock回復、active lock、owner／token不一致、利用者所有file保持の意味を変更しない。
5. Patch 001〜004で確定したlogical transaction、bounded recovery、request-local Git discovery、repair前State oracle、Git config binding、64-bit identity、path非露出を回帰させない。

### D. public-firstと限定された宣言同期

1. public sourceで本Patchを実装し、同じexact candidateのWindows native gateとfresh独立EvaluatorがPASSするまでprivate my-vault／Yasashiiへwriteしない。
2. Patch 007で変更した更新root判定、`update-apply.mjs`、更新専用identity helper、focused update testの製品bytesは、Patch 007 exact headから変更しない。Patch 007の受入基準、threshold、証拠を本Patchで置き換えない。
3. workflowまたはinventory追跡対象runnerの正当な変更により宣言digestがstaleになる場合に限り、
   `plugins/secretary/collaboration-inventory.json`のsurface ID `clarity-harness-scanner`にある
   `contentDigest`該当1値だけを現在bytesへ同期できる。
4. 前項を使う場合、inventoryの他surface、他field、path、marker、test、schema、case countのJSON semantic diffは0件とし、既存inventory validatorを0 FAILにする。digest更新を製品scope追加や別surface修正へ使わない。
5. Fable追加review、新しいcollector、統一schema／attestation、全master、release／install／cache／live workspace／実Xmind／connectorを本Patchの合格条件に追加しない。

## Acceptance Criteria

1. focused正回帰で、一つの同期canonical filesystem mutation内に重複するfull root／Git安全再検査が一つへ統合され、mutation直前の現在identity確認とmutation固有のowner／lease／target／temp検査が残っている。
2. focused境界回帰で、連続する別mutation、retryの別試行、callback write、rollback、cleanup、release、別requestは前のfull検査結果を共有せず、各境界で既存が要求する現在検査を行う。非同期／nested／別rootへscopeが漏れない。
3. root、Git、config、target／parent／temp、owner／token、leaseを検査間またはmutation間で差し替えるnegativeが、該当mutation前に非0／fail closedとなり、成功表示と未許可writeが0件である。
4. root自身／root内／root外symlink、junction、broken／file向きancestor、別Repo、path traversal、absolute injection、non-directory、read-only、malformed／複数行Git出力、Git非0／timeoutの既存negativeが0 FAILである。
5. 一時競合retryの各試行がfreshなfull root／Git検査を通り、恒久失敗、lease喪失、owner変更、identity差替えは有限時間内に非0となる。内部retryによるEvent／Evidence／State重複と他writer所有物変更が0件である。
6. Windows Server 2025／Node 22の同一`windows-native` jobで3 round×（Hook 32＋CLI 32）を実行し、各roundが64／64 exit 0、parse／unique／CLI・Hook delta／repair前full-State／rebuild 100%、owned residue 0件である。
7. AC6の各roundでmax lock wait <15秒、max lease critical section <30秒、job合計 <10分かつ各marginが正である。process／round／step削減、stagger／batch／prewarm／直列化、threshold緩和、timeout延長が0件である。
8. Sprint 047は既存25 caseを25／25 PASSし、Patch 001／002／003／004とSprint 050 Patch 005の関連回帰が0 product FAILである。`GS-009`／`GS-010`のID、Severity、意味、初回割当を変更していない。
9. Git prompt／credential／network／fetch／pull／push／provider起動0件、Secret／absolute local pathの新規露出0件、dirty／staged／untracked、HEAD、branch、remote、visibility、Git configの意図しない変更0件である。
10. Patch 007 exact head `e8b3d0065a6b83aa9b4e6c7c61f8070cb4a96262`から、更新root identityの製品bytesとfocused update意味が不変で、同じWindows job内のPatch 007 focused回帰とSprint 032 15／0を妨げない。
11. inventory同期が必要な場合、JSON semantic diffは`clarity-harness-scanner.contentDigest`該当1値だけで、他surface／field／path／marker／test／schema／case countが不変、既存inventory validatorが0 FAILである。不要ならinventory bytesを変更しない。
12. exact candidateを既存PR #11の同じbranchから通常pushで検証し、Windows workflow／run／job、40桁candidate SHA、OS／Node、各step結果が因果的に一致する。別SHA、過去run、別OS結果をWindows PASSへ流用しない。
13. fresh独立Evaluatorが同一candidateの実diff、focused正負回帰、既存回帰、Windows raw resultを確認し、C1、C2、C3、C5、C6、C19、C21、C24、C26を既存threshold以上、ゼロ許容軸を5／5、product finding 0、Acceptance Criteria未達0とした場合だけPASSである。
14. public PASS前のprivate my-vault／Yasashii write、merge、release、tag、GitHub Release、Marketplace、install／update、cache、loaded version、実利用者root／live workspace、実Xmind、connector external writeが0件である。

## 禁止する解き方

- full root／Git安全再検査をcritical section全体、複数mutation、retry全体、callback、release／cleanup、別request、別processへ共有する。
- 時間ベースcache、request外cache、古いidentity、realpath文字列、case-fold、separator置換、prefix、basenameだけで安全を推測する。
- owner／token、lease、target／parent／temp、symlink／junction、Git config、write直前の変更検知を省略する。
- process／round／step／期待deltaを減らす、stagger／batch／prewarm／直列化する、失敗をSKIP／optionalへ変える。
- 15秒lock wait、30秒lease、5秒Git probe、10分jobを延長する、またはtimeout／非0をretryで握りつぶす。
- Patch 007の更新root製品codeを変更する、private downstreamだけを修正する、Clarity以外のfilesystem／Git discovery全般を再設計する。
- inventoryの許可されたdigest 1値以外を変更し、stale宣言やvalidator failureを残す。

## Verification scope（着手時に固定）

- **Focused scope**: 同一mutation内の重複full検査、別mutation／retry／callback／rollback／cleanup／release／requestのfresh検査、nested／別root拒否を決定的fixtureで確認する。
- **Safety matrix**: root／Git／config／identity／symlink／junction／target／temp／owner／leaseの差替えと、Git timeout／異常出力を既存negativeで確認する。
- **Regression**: `scripts/sprint-047-test.mjs`、Patch 001〜004の既存focused入口、`scripts/sprint-050-patch-005-test.mjs`、Patch 007 focused updateとSprint 032を、変更面に必要な既存commandだけで確認する。
- **Windows causal**: 既存`windows-native` job、Windows Server 2025／Node 22、3 round×64、15秒／30秒／10分、既存stepを変えず、同じexact candidateで実行する。
- **Evaluator**: fresh独立Evaluatorが実command、exact candidate、Windows raw resultを確認する。UI差分はなくbrowser／DOM／screenshotは非適用。

### Evidence safe harbor

- 40桁candidate SHA、変更path、workflow／run／job ID、OS／Node、command、exit、case／round summary。
- focused fixtureごとのscope class、full revalidation回数、mutation数、期待／観測結果、error code、before／after filesystem／Git snapshot。実absolute path、raw filesystem identity、Secret値は記録しない。
- Windows各roundの64 process exit、CLI／Hook件数、parse／unique／delta／full-State／rebuild／residue、max wait／15秒、max lease／30秒、job時間／10分のmargin。
- Patch 001〜004、Sprint 047、Patch 005、Patch 007／Sprint 032、inventory validatorの既存summaryと、network／credential／external write 0。
- inventory変更時のJSON semantic diff 1値、変更前後のsurface IDとvalidator結果。digest以外の本文や端末固有pathは不要。

上記で十分とする。新しいcollector、統一attestation、全master、深い履歴chain、実顧客Repo、実downstream write、
release／install／cache／live workspace／実Xmind／connectorを追加条件にしない。

## Non-scope

- canonical lock／lease／logical transaction全体、root resolver、Git discovery、Event／Evidence／State schemaの再設計。
- Patch 007の更新root identity製品変更、受入基準、評価結果の変更。
- rubric、Case registry、GS-009／GS-010の意味・Severity・初回割当、process／round／時間thresholdの変更。
- private my-vault／Yasashiiのsource、spec、state、progress、feedback、同期、Windows評価。
- merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache、loaded version、実利用者root／live workspace。
- Xmind MCP、local `.xmind`、connector、network provider、credit／課金、Fable追加review。

## External live gate

許可するexternal writeは、既存PR #11の同一branch `codex/sprint-041-project-clarity`を既存`origin`へ通常pushし、
そのexact candidateに因果する既存Windows CIを起動することだけである。force push、manual workflow dispatch、別branch／remote、
merge、release、tag、GitHub Release、Marketplace、install／cache、downstream writeは行わない。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更path、統合scopeとfresh再検査境界、focused正負例、既存回帰、
exact candidate、Windows因果run、threshold margin、inventory semantic diff、Git／network／external operation、既知残余を記録する。

fresh独立Evaluatorは同一candidateで本Acceptance Criteriaと指定rubricを評価し、product findingとverification-infra findingを分ける。
public PASSとOrchestratorのstate更新後だけPatch 007の評価を再開し、その後に固定candidateをprivate my-vault、次にYasashiiの
別Harnessへ渡せる。
