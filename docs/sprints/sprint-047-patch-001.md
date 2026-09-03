# Sprint 047 Patch 001 — Windows canonical並行writeのbounded recoveryと整合transaction

- Type: regular patch
- Risk: high（並行Hook／CLI、複数canonical fileの整合、Windows filesystem共有競合、rollbackを横断するため）
- Base Sprint: `sprint-047`
- 依存: `sprint-047` done
- 対象機能: F65, F67, F78
- 直接回帰Case: `GS-009`、`GS-010`（既存ID、意味、Severity、初回割当を変更しない）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)
- 主眼: Windows nativeの一時的なcanonical置換競合から安全かつboundedに回復し、Event／Evidenceだけ、またはStateだけが進む不整合な部分成功を残さず、並行Hook／CLI writeを全件収束させる。

## 背景と通常Patch判定

public最終HEAD `d62a66b07c385e1d0a405a1db72bee774ed9a530` を対象にしたPR #11のWindows native run
`33420169869`／job `99580324118`では、Sprint 038 Patch 002／003、Sprint 050 Patch 004／005、inventory、
SR-001の完了stateはPASSした一方、SR-009内のSprint 047 `GS-009`／`GS-010`がFAILした。

Hook 32 processとCLI 32 processの並行write中に、Clarity所有のState一時ファイルからcanonical
`.clarity/state.json`への置換がWindowsで一時的に拒否された。直前にEvent追加は完了していたため、Stateだけが古い状態となり、
後続processが`state-mismatch`で連鎖停止した。直前run `33418410765`は同じ製品／test bytesでPASSし、両HEAD間の差分は
feedback／state文書だけ、Sprint 047 testとClarity coreのblobは同一だった。

したがって、これは単なるworkflow rerunや偶発的な検証失敗として閉じられないWindows timing依存の既存product defectである。
同時に、Event／Evidence／Stateの複数canonicalとlock／owned tempを一つの安全な論理writeとして扱う必要があるため、microではなく
通常のhigh-risk Patchとする。Plannerは特定のNode API、retry関数、待機式、ファイル配置の実装方法を合格条件へ固定しない。

## 外から見える成果

- WindowsでClarity HookとCLIが同時に記録しても、一時的な共有／置換競合だけなら全processがboundedに完了する。
- 完了後はEvent／Evidenceが全行parse可能でID重複0、Stateは同じcanonicalから100%再構築できる。
- 恒久的な書込み失敗では成功と表示せず、rollback成功時は開始前と整合するcanonicalへ戻る。rollback／cleanupも失敗した場合は、自己所有の未完了operationとして診断できる終端へ閉じる。
- 失敗後のretry、明示rebuild、doctorは、一致する自己所有の未完了operationだけを対象に、重複Eventや他process所有物の削除なしで安全な状態へ収束する。記録のない改ざん疑いは自動修復しない。
- macOS／Linux、Git-free配布、既存Clarity、conversation migrationの安全境界は変わらない。

## Scope

### A. canonical論理writeの整合境界

1. EventまたはEvidenceの追加と、それらから派生するState更新を、利用者から見て整合した一つの論理writeとして完了させる。
2. 成功時はEvent／Evidence／Stateの全canonicalが同じ履歴を表す。process終了時にparse不能、ID重複、Event／EvidenceとStateの件数・内容不一致を残さない。
3. State更新まで完了できないときのrollbackは、同じlogical writeが同じowner／tokenの有効leaseを保持している間かつrelease前だけに限定し、そのoperationが新しく追加したEvent／Evidenceだけを対象にする。開始前から存在するappendと別writerの正当なwriteを変更しない。
4. State確定失敗後にrollback／cleanupまで成功した経路は開始前と整合するcanonicalへ戻す。rollbackまたはcleanupも失敗するdouble faultは成功／部分成功を表示せず、自己所有の未完了operationと実際のcanonical状態を識別できる診断可能な終端へ閉じる。
5. 各logical writeは、operation identity、対象canonical、進行段階、owner／tokenを持つClarity所有のdurable progress record相当を残し、実残骸との一致を検査できるようにする。方式、schema、配置は実装へ委ねる。
6. retry／doctor／rebuildが自動収束させてよいのは、一致する自己所有の未完了operationだけとする。記録がない、または対象・段階・owner／tokenが一致しない`state-mismatch`は第三者変更の可能性があるため、既存どおり通常writeをfail closedにし、自動rollback／自動rebuildしない。
7. 同じlogical writeのretryは同じEvent／Evidenceを重複追加せず、別の正当な並行writeを誤dedupeしない。State rebuildは同じcanonicalから決定的で、error、exit、`changed`、未完了表示、retry案内は実際に残った状態と一致する。

### B. Windowsの一時競合だけをbounded recoveryする

1. transientはerrno単独では分類しない。各試行前にphysical root、canonical targetとparentの存在・書込み可能性・read-only状態、symlink／junction／identity不変、lock owner／token、temp ownershipの再検査がすべて通り、有限上限内に実際に解消した共有／利用中競合だけをtransientとする。
2. permission、read-only、missing parent、schema破損、所有不明、境界差替え、または上限まで継続する競合は恒久／非対象として非0で停止する。恒久fixtureは、再検査で識別できる条件を作るか、同じ競合を回復上限まで継続させる。
3. retry対象のfailure injectionは、製品がcanonical writeで使う実filesystem操作境界にerrno互換の観測可能な失敗として発生させ、本番と同じ分類、retry、rollback、cleanup経路を通す。fixtureだけで製品判断を迂回する専用成功／失敗分岐を作らない。
4. lock取得、stale回復、lease延長、canonical置換、release／cleanupを含む全待機loopは、有限の試行回数または時間上限と非busy待機を持つ。`ENOENT`その他の再試行も上限内に成功または非0で終了し、workflow timeoutへ終了責任を委ねない。
5. retryの各境界で前項の安全条件を再確認し、途中で差し替わった場合、owner／tokenが変わった場合、またはlease延長に失敗した場合はwrite／rollback／cleanupを即停止する。別pathへのwriteや別ownerのartifact cleanupを行わない。
6. 回復後も一つのlogical writeは一度だけ反映する。内部試行回数をEvent件数、State revision、利用者向け成功回数へ加算しない。

### C. lock、owned temp、cleanup

1. 開始HEADのlock TTL 30秒／active wait 15秒は観測済み基準値であり、固定値の維持自体は要件にしない。owner／tokenによる排他、active lockをstale扱いしない意味、期限切れClarity-owned lockだけを安全に回復する意味を維持する。実装は、相互に整合する上限値への調整または同じtokenを再確認した安全なlease延長を選べる。
2. activeな別process lock、owner／token不一致、利用者所有file、開始前から存在するtemp類似fileを削除・上書きしない。
3. lock取得後のretry、rollback、cleanupを含む排他処理は有効lease内に収める。leaseを延長する場合は同じowner／tokenと対象identityを更新直前・直後に確認し、延長失敗、owner変更、期限切れではそのoperationを成功させない。回復中のlockを別writerが横取りせず、同時に2 writerが正当ownerにならない。
4. cleanup対象は現在のlogical writeが排他的に作成し、durable progressと現在のowner／token／operation identityが一致するowned tempとlockだけに限定する。
5. lock fileを排他作成した後、所有recordの確定に失敗した場合は同じoperation内で識別不能lockをcleanupする。cleanupも失敗した場合は成功0、doctorで識別不能lockとして診断し、利用者確認付きの回復導線だけを示す。他者所有または同一operationと証明できないlockを自動削除しない。
6. canonical直下のatomic replace tempを含むorphan tempもdoctor／cleanup inventory対象にする。owner／token／operation identityと対象を照合し、PIDまたは時刻だけで所有を推定しない。
7. 通常成功、通常拒否、rollback成功後のowned temp／owned lock残骸は0件とする。double faultで残る自己所有artifactは診断可能にし、利用者確認後のdoctor／cleanup／retryで別process所有物を消さず残骸0へ収束する。
8. root外symlink／junction、root自身／root内symlink、ancestor alias、path traversal、absolute path injection、差替え、物理root identity変更の既存拒否境界を緩めない。

### D. concurrencyとfailure recovery

1. 既存`GS-009`のHook 32件＋CLI 32件を減らさず、全64 process成功、全JSON parse、Event ID unique、期待件数、State rebuild 100%、lock残骸0を各roundで満たす。
2. timingの良い一度だけに依存しないよう、Windows nativeの同一job内で少なくとも3 roundの32＋32 stressを行う。合算成功率ではなく各roundを100% hard gateとし、1件でも失敗したroundを平均やflake率で合格へ丸めない。
3. `GS-010`は期限切れClarity-owned lockをdoctorで残骸として観測し、安全な次writeで回復する。active lock、owner／token不一致、利用者所有fileは保持する。
4. OS非依存の決定的failure injectionで、少なくとも一時競合後の成功、上限まで継続する恒久失敗、canonical置換前、Event／Evidence反映後からState確定前、rollback失敗、cleanup失敗、lock排他作成後から所有record確定前を個別に通す。
5. 一時競合fixtureはretryが実際に起きたことを観測し、成功後のlogical writeが1件だけであることを確認する。恒久失敗fixtureは成功表示0、rollback成功時の不整合canonical 0、別process／利用者所有file変更0を確認する。double fault fixtureは自己所有の未完了operationを識別し、retry／rebuild／doctorが他者を変えずに収束することを確認する。
6. process crash／killを、lock record確定前、Event／Evidence後からState前、canonical sibling temp作成後で個別に発生させる。PID再利用または経過時刻だけで残骸を削除せず、operation identityとowner／token一致により回復対象を決める。
7. Windows PASSをerror名の文字列mock、別OS上のWindows風path、failure injectionだけで代替しない。逆に、一時／恒久failure injectionはWindows timingへ依存させず、macOS／Linuxでも決定的に回帰できるようにする。

### E. 回帰と配布面

1. Sprint 047の既存25 caseを、`GS-009`／`GS-010`の意味、件数、threshold、Critical／High、Case registryを変えずに全件実行する。testのskip、process数削減、期待値緩和、失敗握りつぶしを行わない。
2. Sprint 050 Patch 004／005、Clarity inventory、Sprint 038 Patch 003 conversation migration、archive gateを同じcandidateで実行する。
3. source checkout、clean checkout、`.git`なしGit-free archive相当で対象と関連回帰を実行し、POSIXの既存Clarity behaviorを維持する。
4. full masterの既知baseline failureは、開始candidateでも同じであることを証拠で分離し、本Patchの製品PASSやFAILへ混ぜない。対象safe harborの新規product failureは既知baselineとして扱わない。
5. workflow、test、inventoryを変更した場合は実内容digest、tracked path、起動条件を追従させ、stale inventoryでWindows jobを偽PASS／偽FAILにしない。
6. Windows workflowのPR `paths` triggerは既存入口に加えて`scripts/sprint-047-test.mjs`を含み、本Patch用またはstress用の新入口を作る場合はそのtracked pathも含める。Patch対象だけを変更したPRでWindows jobが起動しない状態を許容しない。

### F. Windows因果runとpublic-first handoff

1. Windows Server 2025／Node 22の既存PR #11 `windows-native` jobで、同じexact candidateのPatch対象、Sprint 047、Patch 004／005、0.9.2／conversation migration関連回帰を実行する。
2. runは40桁完全candidate SHA、workflow／job、OS／Node、command、各round、PASS／FAIL、retry／temp／lock／rebuild観測を持つ。各stepの実測時間、job合計時間、10分上限までの正のmarginを記録し、`timeout-minutes: 10`と既存stepを維持する。
3. 既知の失敗run `33420169869`と、修正candidateの成功runを因果証拠として分ける。修正後の単なる同一workflow rerunだけを修正根拠にせず、製品差分、決定的failure injection、各round hard gateでcontractを閉じる。
4. public版のfresh独立Evaluatorが同一candidateをPASSした後だけ、完全SHAと宣言済みcommon pathをprivate my-vaultへ、次にYasashiiへ渡す。両downstreamは別Harness、別contract、別Generator、別Windows native run、別Evaluatorを必要とする。
5. public PASSをprivate／Yasashii PASS、release-ready、installed、loadedへ昇格しない。本Patch中に実downstreamへwriteしない。
6. exact candidateの実測が10分枠へ収まらない場合、writer件数、3 round、threshold、既存stepを減らしたりtimeoutを延長したりせず、`verification-scope-issue`としてユーザーへ返す。job分割その他の検証構成変更は別の明示承認を必要とする。

## Acceptance Criteria

1. 既存Sprint 047の25 caseが同一candidateで25／25 PASSし、`GS-009`はHook 32＋CLI 32を減らさず、`GS-010`のdoctor／recovery意味も変更されていない。
2. Windows nativeの同一job内で32＋32 stressを3 round以上行い、各roundで全process exit 0、JSON parse 100%、Event ID unique 100%、期待Event件数100%、State rebuild 100%、通常完了後のowned lock／temp残骸0件である。64 writer全件のlock acquisition wait、lease内の排他処理時間、retry／rollback／cleanup時間、設定した待機上限を実測し、最大値が各上限未満かつ正のmarginを持ち、待機上限によるprocess failure 0件である。
3. Windows native stressはmockを挟まず実canonical置換pathを全round通す。native runで一時競合を観測した場合はerror分類と回復結果を記録し、未観測でも決定的failure injectionの回復証拠とnative stressのplatform証拠を混同しない。error文字列mockや別OS模擬だけをWindows PASSへ数えない。
4. 決定的な一時競合fixtureは実canonical filesystem操作境界でerrno互換の失敗を発生させ、本番と同じ再検査、分類、retry、rollback、cleanup pathを通る。各試行前のroot／target／parent、writability／read-only、symlink／junction、lock owner／token、temp ownership検査が通り、有限上限内の解消後に同じlogical writeを1件だけ反映し、内部retryによるEvent／Evidence／State重複0件である。fixture専用の製品分岐で結果を作らない。
5. 決定的な恒久失敗fixtureは、再検査で識別できるpermission／read-only等か、回復上限まで継続する競合として、上限内に非0で停止する。lock取得、stale回復、lease延長、canonical置換、release／cleanupの全待機loopでbusy loop／無制限待機0、`ENOENT`等の無制限再試行0、成功表示0、rollback成功経路のEvent／Evidence／State不整合0、開始前から存在する利用者所有file変更0件である。
6. canonical置換前、Event／Evidence反映後からState確定前の注入で、同じowner／tokenの有効lease内かつrelease前だけに自分の未完了appendをrollbackする。rollback成功経路ではparse可能かつ開始前と整合するcanonical、他writerの正当なwrite変更0、成功表示0、owned残骸0件である。
7. State確定失敗に加えてrollbackまたはcleanupも失敗するdouble faultは、非0かつ成功／部分成功表示0で終了する。operation identity、対象、段階、owner／tokenを持つClarity所有のdurable progressと実残骸が対応し、doctorが未完了を識別し、retry／明示rebuild／利用者確認付きcleanup後に他者所有物を変えず重複なし・整合・残骸0へ決定的に収束する。
8. 自己所有progressと一致する未完了operation由来の`state-mismatch`は前項の回復導線へ進み、記録がないか対象・段階・owner／token不一致の`state-mismatch`は通常write／retryで自動rollback／自動rebuildせず既存どおりfail closedになる。第三者由来のEvent／Evidence／State／lock／temp変更0件である。
9. transient以外のpermission、read-only、missing parent、schema破損、ownership不一致、root／symlink／junction／alias差替えをretry対象へ広げず、対象外write、root外canary変更、別process lock／temp削除が0件である。
10. lock owner／token／active／staleの意味、期限切れClarity-owned lock回復、owner不一致保持が成立する。各logical writeはretry／rollback／cleanupを有効lease内に完了し、同一tokenのlease延長を使う場合は所有を再確認する。延長失敗、owner変更、期限切れで即停止し、回復中lockの横取りと同時正当ownerが0件である。
11. lock file排他作成後から所有record確定前の失敗は同じoperationでcleanupされる。cleanupも失敗した識別不能lockは成功0、doctor診断、利用者確認付き回復となり、他者所有lock削除0件である。canonical直下orphan tempを含むinventoryはowner／token／operation identityで一致する対象だけを回復し、PID／時刻だけに依存しない。
12. lock record確定前、Event／Evidence後からState前、canonical sibling temp作成後のcrash／kill negativeで、再開後doctorが自己所有の未完了operationと所有不明artifactを区別する。再利用され得るPIDまたは時刻だけで削除せず、一致する自己所有物だけが利用者確認後に収束する。
13. Secret値、local absolute path、transcript本文をcanonical、output、error、Evidence、tracked artifactへ露出せず、dirty／staged／untracked、HEAD、branch、remote、visibilityを保持する。
14. source／clean／Git-freeとPOSIXでSprint 047 25 case、Sprint 050 Patch 004／005、inventory、Sprint 038 Patch 003、archive gateが0 product FAILである。
15. 既存testのskip／削除、Hook／CLI件数削減、3 round削減、期待値／threshold緩和、Case ID／Severity／初回割当変更、単なるworkflow rerunだけによるPASSが0件である。
16. Windows native因果runがexact candidate SHA、Windows Server 2025、Node 22、各command／round、PASS／FAIL、retry／lease／wait／lock／temp／rebuild結果、step別実測時間、job合計時間、10分上限までの正のmarginを持ち、既存Windows stepsと`timeout-minutes: 10`を維持して0 product FAILである。実測で収まらない場合は本ACを弱めず`verification-scope-issue`としてユーザーへ戻す。
17. Windows workflowのPR trigger `paths`に`scripts/sprint-047-test.mjs`と、作成した場合の本Patch／stress検査入口が含まれる。workflow／test変更に対応するinventoryのpath／digest／markerが最新で、source／clean／Git-free／Windowsの検査入口がstaleでない。
18. offline fixture／製品実行のnetwork／external service writeは0件で、外部操作は既存PR #11同一branchへの通常pushと因果Windows CIだけである。
19. public独立Evaluator PASS前にhandoff readyを発行せず、固定完全SHA以外をprivate my-vault／Yasashiiへ渡さない。下流各版の別Windows／Harness評価要件と保護範囲が明記される。
20. merge、release、tag、GitHub Release、Marketplace、install／update、cache、live workspace、実Xmind、実downstream writeが0件である。

## 必須negative control／fixture

- Windows nativeの空白／日本語を含む通常local pathで、Hook 32＋CLI 32を同一roundに発火する3 round以上のstress。
- canonical置換が一時的に競合し、有限回内に解消するfixture。同じ論理Event／Evidence／Stateが1件だけ残る。製品と同じfilesystem境界でerrno互換failureを起こし、各試行前の安全再検査を観測する。
- canonical置換が上限まで恒久的に失敗するfixture。成功表示、rollback成功経路のpartial canonical、全待機loopの無制限待機が0件である。
- Event／Evidence確定後からState確定前、canonical置換前、rollback、cleanup、lock排他作成後から所有record確定前の個別failure injection。State確定失敗とrollback／cleanup失敗を組み合わせたdouble faultを含む。
- active Clarity-owned lock、期限切れClarity-owned lock、owner／token不一致lock、開始前から存在するtemp類似file、別process owned temp、canonical直下orphan temp、識別不能lock。
- lock record確定前、Event／Evidence後からState前、canonical sibling temp作成後のprocess crash／kill。PID／時刻が同じでもoperation identityまたはowner／tokenが一致しないnegativeを含む。
- 自己所有progressと一致するstate mismatch、progressのないstate mismatch、対象／段階／owner／tokenが一致しないstate mismatch。
- permission／read-only、schema corruption、root外symlink／junction、root自身／root内symlink、ancestor alias差替え、absolute／traversal、root外canary。
- 失敗後retry、同一write rerun、明示rebuild、doctor。Event ID、件数、State source count、bytes、lock／temp集合を前後比較する。
- POSIX source／clean／Git-freeの同じfailure injectionとSprint 047／Patch 004／005／inventory／conversation migration／archive回帰。

各negativeは期待するerror／exit、試行上限と実経過、logical operation identity、対象、段階、canonical before／after hash、Event／Evidence件数、
State rebuild結果、lock／temp owner・token・lease、外部canary、filesystem／Git／network／external operationを持つ。
固定source文字列の存在、error名mock、sleepだけ、成功runの再実行だけで合格できない。

## Non-scope

- Clarity以外の全atomic writeを対象にしたfilesystem abstraction再設計。
- Windows network share全般、すべてのUNC変種、WSL／Windows間の任意path変換。
- retry対象を全permission error、全filesystem error、未知errorへ広げること。
- Event／Evidence／State schema、Case ID、Severity、Sprint 047の初回割当、GS-009／GS-010の意味・threshold変更。
- process数削減、test skip／削除、timeout延長だけ、workflow rerunだけでgreenにすること。
- Windows 10分枠へ収めるためのround削減、threshold緩和、既存step削除、未承認のjob分割。
- 新しいcollector、統一attestation、flake率dashboard、実顧客data、実providerを合格条件にすること。
- private my-vault／Yasashiiのsource／spec／state／progress／feedback変更または同期実行。
- merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache、live workspace、実Xmind、Mac mini同期。

## Verification scope（着手時に固定）

- Product path: Clarity canonical lock、lease取得／延長／release、Event／Evidence append、State rebuild、canonical／owned temp置換、rollback、cleanup、doctor／recoveryを実際に通す。
- Concurrency: 既存`GS-009` Hook 32＋CLI 32、`GS-010` stale owned lockを維持し、Windows同一job内3 round以上を各round別にhard gateする。64 writerのwait予算とlease内処理時間を実測する。
- Failure: OS非依存の決定的なtransient／permanent、置換前、Event／Evidence後からState前、rollback、cleanup、double fault、lock record未確定、crash／kill、retry／rebuild／doctorを実行する。
- Safety: operation progress、owner／token／lease、root／target／parent、writability／read-only、symlink／junction／ancestor alias、Secret、dirty／staged／untracked／Git／remote／visibility、external canaryを前後比較する。
- Regression: source／clean／Git-free、Sprint 047 25 case、Patch 004／005、inventory、conversation migration Patch 003、archive gate、関連POSIX回帰。
- Windows: 既存PR #11のexact candidateをWindows Server 2025／Node 22で実行し、既存stepsと10分上限を維持する。step別時間、job合計、marginを記録し、超過時は`verification-scope-issue`へ分岐する。

### Evidence safe harbor

- 40桁candidate SHA、workflow／job／run ID、OS／Node、command、exit、case ID、round、PASS／FAIL／NOT-RUNと理由。
- Hook／CLI process総数と各exit、Event／Evidence行数、JSON parse率、ID重複数、State source count／rebuild結果、各writerのlock waitと最大値／上限／margin。
- transient／permanent injection point、実filesystem errorの`code`／`syscall`相当、試行回数／経過上限、logical operation identity、対象／段階、error分類、before／after canonical hash。
- lock／tempのowner、token一致／不一致、lease active／stale／延長、operation progress、成功／rollback成功／double fault後の残存件数。利用者所有fileは内容を出さずhash／mtime／存在だけを記録する。
- Windows各stepの開始／終了または経過時間、job合計、10分上限までのmargin。runnerが提供するstep／job timingで十分とし、専用collectorを要求しない。
- filesystem tree、root外canary、Git worktree／index／HEAD／branch／remote／visibility、network／external operation 0の前後snapshot。
- source／clean／Git-free／POSIX関連回帰、inventory digest、既知baseline分離、public handoff scope／order／downstream write 0。

上記で十分とする。新しいcollector、統一attestation、実顧客Repo、実downstream、release／install、実Xmind、
追加remote操作を合格条件にしない。UI差分はなく、browser／DOM／screenshotは非適用である。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ製品／test／workflow／inventory変更、bounded recovery境界、
failure injection、各round、source／clean／Git-free／POSIX／Windows結果、candidate SHA、既知baseline分離、external operationを記録する。

freshな独立Evaluatorは同一candidateと因果Windows runを実操作し、既存rubricのC1、C2、C3、C5、C6、C19、C21、C24、
既存`GS-009`／`GS-010`、本Acceptance Criteriaを評価する。C5、C6、C19、C21、C24は5/5、他の適用軸は既存threshold以上、
Windows各roundと対象回帰は0 product FAIL、Acceptance Criteria未達0でなければPASSにしない。製品findingとverification-infra findingを分け、
対象safe harborでPASSできる状態へ新しい証拠形式を追加しない。

Evaluator PASSとOrchestratorのstate更新後だけpublic版を完了扱いにし、その完全SHAだけをprivate my-vault、次にYasashiiの
別Harnessへ渡す。merge／release／tag／Marketplace／install／cache／live workspace／実Xmindは開始しない。
