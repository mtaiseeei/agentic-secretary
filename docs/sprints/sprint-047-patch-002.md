# Sprint 047 Patch 002 — Windows並行burstのClarity root Git identity discovery

- Type: regular patch
- Risk: high（全Clarity root入口、Git／filesystem identity、Windows 64 process burst、fail-closed境界に関わるため）
- Base Sprint: `sprint-047`
- 依存: `sprint-047-patch-001` done
- 対象機能: F78
- 直接回帰Case: `GS-009`、`GS-010`（既存ID、意味、Severity、初回割当を変更しない）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)
- 主眼: 対応Windowsの既存並行burstで、Clarity rootのRepo／Git identityを全processが安全かつboundedに確認し、root identity確認のproduct timeoutを0件にする。

## 背景と通常Patch判定

public `sprint-047-patch-001`は、Windows Server 2025／Node 22の3 round×（Hook 32＋CLI 32）を各round 64／64でPASSした。
その固定公開成果をprivate my-vaultへ適用したWindows native `private-CW-019`では、同じburst条件でClarity rootの
Git identity確認が5秒のproduct timeoutを返す事象を3回再現し、最新runでは64 process中6件がtimeoutした。

public／privateの`clarity-root.mjs`、`clarity-core.mjs`、`external-ops.mjs`とstress本体はbyte／意味が一致する。
freshなread-only Sol Max reviewは原因を高い確度でproduct側と分類し、public-first修正を推奨した。
このreviewは、以前のFable review要求を本件について置き換える完了済みplanning inputであり、別のFable／Opus reviewを
Generator開始条件、Windows実行条件、Evaluator PASS条件に追加しない。

root resolverはCLI、core、link、projection、Drift、Secretary adapter、Hookの共通安全境界であり、同時起動時だけtestを
弱める修正では不十分である。単一flowに閉じたmicroではなく、通常のhigh-risk Patchとする。

## 外から見える成果

- WindowsでHookとCLIが同時にClarity rootを使っても、正しいlocal Repo／Git identityを全processが有限時間内に確認し、その後の既存logical writeへ進める。
- 正常なlocal Git Repo、non-Git root、worktree、ancestor alias／物理rootで、既存のroot identity意味と結果が変わらない。
- 不正・変化・実timeoutを速さのために成功へ丸めず、副作用なしで理由を示して停止する。
- private my-vaultとYasashiiは、public PASS後の固定candidateを入力に、それぞれ別Harnessで同期・Windows native・独立評価する。

## Scope

### A. boundedなroot identity discovery

1. 対応Windowsの既存GS-009 burstで、Hook 32＋CLI 32の全64 processが、各roundで現在のphysical rootとRepo／Git identityを確認してexit 0になる。
2. discoveryは有限時間で完了または失敗し、無制限待機、busy loop、process残存を起こさない。5秒値を単に延長して隠すだけの修正にしない。
3. 同じrequest内で検証済み観測を安全に共有するか、各processが独立確認するか等の方式は実装へ委ねる。ただし古いidentityをrequest境界の外で再利用せず、write前の再確認と変更検知を維持する。
4. local identity確認のためにGit prompt、credential取得、network、fetch／pull、remote providerを起動しない。Git commandが必要な場合もread-only、prompt禁止、boundedである。

### B. fail-closed safety

1. 空／malformed／過大／複数行等の不正なGit出力、実timeout、実行不能、正当に識別したnon-Git以外のunexpected非0終了を、non-Gitまたは成功identityへ誤変換しない。
2. root、Git top-level、Git dirのいずれかがdirectoryでない、読めない、差し替わる、またはfilesystem identityが変わる場合はcanonical／runtime write前に停止する。
3. 一般rootのancestor symlink拒否、Clarity内部だけのancestor alias opt-in、root自身／root内symlink、junction、root外escape、broken／file向きalias、alias差替えの既存境界を維持する。
4. Git top-level、Git dir、config由来identity、worktree／common Git dirの既存意味を弱めない。別Repo、親Repo、子Repo、changed identityを同一として扱わない。
5. Secret、credential、local absolute pathをcanonical、tracked artifact、stdout／stderr、errorへ追加露出しない。dirty／staged／untracked、HEAD、branch、remote、visibility、Git configを変更しない。
6. 実timeoutその他の拒否では成功、partial success、retry済みと表示せず、logical write、Event／Evidence／State、lock／tempへの副作用を0件にする。

### C. GS-009／GS-010とPatch 001の意味維持

1. `GS-009`のHook 32＋CLI 32、Windows 3 round、各round 100% hard gate、JSON parse、Event ID unique、期待件数、State rebuild、residue 0を変更しない。
2. `GS-010`の期限切れClarity-owned lockのdoctor／recovery、active lock、owner／token不一致、利用者所有file保持を変更しない。
3. lock waitは15秒未満、leaseは30秒未満、Windows jobは10分未満の既存上限を維持し、いずれも正のmarginを持つ。上限延長、process数／round削減で合格させない。
4. Patch 001で確定したlogical write、rollback、cleanup、durable progress、transition guard、active replacement、fail-closed意味を回帰させない。

### D. public-firstと比例した検証

1. public sourceで修正し、freshな独立Evaluatorが同じcandidateをPASSするまでprivate my-vault／Yasashiiへwriteしない。
2. public PASS後のdownstreamはprivate my-vault、次にYasashiiとし、別contract、別Generator、別Windows native run、別Evaluatorで扱う。byte一致をdownstream PASSへ昇格しない。
3. 検証は本Patchのroot identity正負例、既存Patch 001のlogical-write隣接回帰、変更なしのSprint 047 Windows causal jobに限定する。
4. 深い歴史chain、全master回帰、新collector／schema／attestation、release／install／cache／live workspace／実Xmind／connectorを追加条件にしない。

## Acceptance Criteria

1. 正常なlocal Git Repo、non-Git root、worktree、Clarity ancestor alias／physical rootのfocused positiveで、現在のRepo／Git identityと既存root policyが一致し、write前再確認までboundedに完了する。
2. Windows Server 2025／Node 22の同一jobで、変更しない3 round×（Hook 32＋CLI 32）を実行し、各roundの64 processが全てexit 0、root Git identity timeout 0件、JSON parse 100%、Event ID unique 100%、期待Event件数100%、State rebuild 100%、lock／temp residue 0件である。
3. 前項のWindows runでlock wait最大値が15秒未満、lease内処理最大値が30秒未満、job合計が10分未満で、それぞれ正のmarginを持つ。process／round／step削減、stagger／batch、prewarm、threshold緩和、上限延長が0件である。
4. malformed Git output、実timeout、正当に識別したnon-Git以外のunexpected Git非0／実行不能、root／Git top-level／Git dirの非directory・unreadable、identity変更を個別negativeで通し、成功表示、non-Gitへの誤変換、Event／Evidence／State、lock／temp、Git変更が0件である。
5. root外symlink／junction、root自身／root内symlink、broken／file向きancestor、alias差替え、別Repo／親子Repo、worktree identity不一致の既存negativeがfail closedのままである。
6. Git prompt／credential／network／fetch／pull／provider起動0件、Secret／local absolute pathの新規露出0件、dirty／staged／untracked、HEAD、branch、remote、visibility、Git config変更0件である。
7. stale identityをrequest境界外で再利用せず、root／Git identityを確認後に差し替えるnegativeでwrite前に停止する。retryでtimeoutやmalformed outputを握りつぶさず、同じlogical writeの重複0件である。
8. 既存`sprint-047-patch-001`のfocused logical-write隣接回帰が0 product FAILで、Patch 001のrollback／cleanup／doctor／transition guard／active replacement意味を維持する。
9. 既存Sprint 047の25 caseが25／25 PASSし、`GS-009`／`GS-010`のID、Severity、意味、初回割当、件数、thresholdを変更していない。
10. Windows workflowは既存`windows-native`、Windows Server 2025、Node 22、`timeout-minutes: 10`、既存stepsを維持し、exact candidateの本Patch focused check、Patch 001隣接回帰、Sprint 047を因果的に実行する。
11. public fresh独立Evaluatorが同一candidate、focused正負例、Patch 001隣接回帰、Windows raw resultを確認し、C1、C2、C3、C5、C6、C19、C21、C24を既存threshold以上、ゼロ許容軸を5／5、product finding 0、Acceptance Criteria未達0とした場合だけPASSである。
12. public PASS前のprivate my-vault／Yasashii write、merge、release、tag、GitHub Release、Marketplace、install／update、cache、loaded version、live workspace、実Xmind、connector external writeが0件である。

## 禁止する解き方

- testのstagger／batch／直列化、process開始delay、prewarm、fixture専用cacheで同時起動を避ける。
- Hook／CLI件数、3 round、既存step、期待値、100% hard gateを減らす。
- timeout、非0、malformed outputをretryで握りつぶす、non-Gitまたは成功へ丸める。
- request境界を越えた古いGit／filesystem identityを、安全な再確認なしに再利用する。
- lock wait 15秒、lease 30秒、job 10分の上限を増やす、またはroot identity timeoutを伸ばすだけで通す。
- private downstreamだけを変更し、byte／意味が一致するpublic共通欠陥を残す。

## Verification scope（着手時に固定）

- Focused root identity: Git／non-Git／worktree／aliasのpositive、malformed／timeout／non-directory／changed identity／root escapeのnegative。
- Logical-write adjacency: 既存Patch 001の対象回帰をそのまま実行し、lock／lease／rollback／cleanup／doctorを変更面近傍として確認する。
- Windows causal: 既存`windows-native` jobでWindows Server 2025／Node 22、3 round×64 process、既存上限とstepを変更せず実行する。
- Evaluator: fresh独立Evaluatorが実command、exact candidate、Windows raw resultを確認する。UI差分はなくbrowser／DOM／screenshotは非適用。

### Evidence safe harbor

- 40桁candidate SHA、workflow／job／run ID、OS／Node、command、exit、round、process種別／件数、PASS／FAILとerror code。
- focused正負例のroot kind、Git／non-Git／worktree／alias class、期待／観測結果、経過時間、before／after filesystem・Git snapshot。absolute local pathやSecret値は記録しない。
- Windows各roundのroot identity timeout件数、64 process exit、parse／unique／Event delta／State rebuild、lock／temp residue、max lock wait／15秒、max lease／30秒、job時間／10分のmargin。
- Patch 001隣接回帰とSprint 047のsummary、network／prompt／credential／external write 0、public／downstream write 0。

上記で十分とする。新しいcollector、統一schema／attestation、深い歴史chain、全master、実顧客Repo、実downstream、
release／install／cache／live workspace／実Xmind／connectorを合格条件にしない。

## Non-scope

- Clarity以外のGit discovery／external process全般の再設計。
- GS-009／GS-010、Case registry、Severity、F78、root alias／worktree／Git identity意味の変更。
- test scheduling、process／round／step／threshold、lock wait／lease／job上限の変更。
- private my-vault／Yasashiiのsource、spec、state、progress、feedback、release判断の変更。
- merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache、loaded version、live workspace、実Xmind、connector。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへproduct／test／workflow変更、focused正負例、Patch 001隣接回帰、
Windows因果run、exact candidate、threshold margin、Git／network／external operation、既知残余を記録する。

freshな独立Evaluatorは同一candidateで本Acceptance Criteriaと指定rubricを評価し、製品findingとverification-infra findingを分ける。
public PASSとOrchestratorのstate更新後だけ固定candidateをprivate my-vault、次にYasashiiの別Harnessへ渡せる。
