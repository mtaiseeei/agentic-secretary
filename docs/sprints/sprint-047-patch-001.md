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
- 恒久的な書込み失敗では成功と表示せず、Eventだけ追加、Stateだけ更新といった不整合なcanonicalを残さない。
- 失敗後のretry、明示rebuild、doctorは重複Eventや他process所有物の削除なしに安全な状態へ収束する。
- macOS／Linux、Git-free配布、既存Clarity、conversation migrationの安全境界は変わらない。

## Scope

### A. canonical論理writeの整合境界

1. EventまたはEvidenceの追加と、それらから派生するState更新を、利用者から見て整合した一つの論理writeとして完了させる。
2. 成功時はEvent／Evidence／Stateの全canonicalが同じ履歴を表す。process終了時にparse不能、ID重複、Event／EvidenceとStateの件数・内容不一致を残さない。
3. State更新まで完了できない恒久失敗では、Event／Evidenceだけを追加済みにしたまま成功・部分成功と表示しない。開始前と整合するcanonicalへ戻すか、同じ安全性を満たす形で失敗を閉じる。
4. 失敗経路でStateだけを先へ進めない。error、exit、`changed`、retry案内は実際に残ったcanonical状態と一致させる。
5. 同じ論理writeのretryは同じEvent／Evidenceを重複追加せず、別の正当な並行writeを誤dedupeしない。State rebuildは決定的である。

### B. Windowsの一時競合だけをbounded recoveryする

1. Windows filesystemがcanonical置換を一時的な共有／利用中競合として拒否した場合に限り、対象root、canonical、lock、owned tempの同一性と安全境界を再確認してboundedに回復する。
2. 回復は有限の試行回数または時間上限を持ち、上限到達時は非0で停止する。CPUを占有するbusy loop、無制限待機、workflow timeout依存の終了を禁止する。
3. 一時競合と確認できないpermission、read-only、境界違反、symlink／junction差替え、missing parent、schema破損、所有不明、注入した恒久失敗を無差別にretryしない。全`EACCES`相当を一律に成功候補へ扱わない。
4. retryの各境界でphysical root、target、lock owner／token、temp ownershipを再確認する。途中で差し替わった場合は変更を続けず、別pathへのwriteやcleanupを行わない。
5. 回復後も一つの論理writeは一度だけ反映する。内部試行回数をEvent件数、State revision、利用者向け成功回数へ加算しない。

### C. lock、owned temp、cleanup

1. 既存canonical lockのowner、token、stale TTL、active待機、期限切れClarity-owned lockの回復意味を維持する。
2. activeな別process lock、owner／token不一致、利用者所有file、開始前から存在するtemp類似fileを削除・上書きしない。
3. cleanup対象は現在の論理writeが排他的に作成し、現在も同じowner／tokenで識別できるowned tempとlockだけに限定する。
4. 成功、拒否、恒久失敗後のowned temp／owned lock残骸は0件とする。cleanup自体が安全に完了できない場合は成功表示せず、doctorが別process所有物を消さずに診断・回復できる情報を返す。
5. root外symlink／junction、root自身／root内symlink、ancestor alias、path traversal、absolute path injection、差替え、物理root identity変更の既存拒否境界を緩めない。

### D. concurrencyとfailure recovery

1. 既存`GS-009`のHook 32件＋CLI 32件を減らさず、全64 process成功、全JSON parse、Event ID unique、期待件数、State rebuild 100%、lock残骸0を各roundで満たす。
2. timingの良い一度だけに依存しないよう、Windows nativeの同一job内で少なくとも3 roundの32＋32 stressを行う。合算成功率ではなく各roundを100% hard gateとし、1件でも失敗したroundを平均やflake率で合格へ丸めない。
3. `GS-010`は期限切れClarity-owned lockをdoctorで残骸として観測し、安全な次writeで回復する。active lock、owner／token不一致、利用者所有fileは保持する。
4. OS非依存の決定的failure injectionで、少なくとも一時競合後の成功、上限まで継続する恒久失敗、canonical置換前、Event／Evidence反映後からState確定前、cleanup失敗を個別に通す。
5. 一時競合fixtureはretryが実際に起きたことを観測し、成功後の論理writeが1件だけであることを確認する。恒久失敗fixtureは成功表示0、不整合canonical 0、別process／利用者所有file変更0、失敗後retry／rebuild／doctorの安全収束を確認する。
6. Windows PASSをerror名の文字列mock、別OS上のWindows風path、failure injectionだけで代替しない。逆に、一時／恒久failure injectionはWindows timingへ依存させず、macOS／Linuxでも決定的に回帰できるようにする。

### E. 回帰と配布面

1. Sprint 047の既存25 caseを、`GS-009`／`GS-010`の意味、件数、threshold、Critical／High、Case registryを変えずに全件実行する。testのskip、process数削減、期待値緩和、失敗握りつぶしを行わない。
2. Sprint 050 Patch 004／005、Clarity inventory、Sprint 038 Patch 003 conversation migration、archive gateを同じcandidateで実行する。
3. source checkout、clean checkout、`.git`なしGit-free archive相当で対象と関連回帰を実行し、POSIXの既存Clarity behaviorを維持する。
4. full masterの既知baseline failureは、開始candidateでも同じであることを証拠で分離し、本Patchの製品PASSやFAILへ混ぜない。対象safe harborの新規product failureは既知baselineとして扱わない。
5. workflow、test、inventoryを変更した場合は実内容digest、tracked path、起動条件を追従させ、stale inventoryでWindows jobを偽PASS／偽FAILにしない。

### F. Windows因果runとpublic-first handoff

1. Windows Server 2025／Node 22の既存PR #11 `windows-native` jobで、同じexact candidateのPatch対象、Sprint 047、Patch 004／005、0.9.2／conversation migration関連回帰を実行する。
2. runは40桁完全candidate SHA、workflow／job、OS／Node、command、各round、PASS／FAIL、retry／temp／lock／rebuild観測を持つ。`timeout-minutes: 10`と既存stepを維持する。
3. 既知の失敗run `33420169869`と、修正candidateの成功runを因果証拠として分ける。修正後の単なる同一workflow rerunだけを修正根拠にせず、製品差分、決定的failure injection、各round hard gateでcontractを閉じる。
4. public版のfresh独立Evaluatorが同一candidateをPASSした後だけ、完全SHAと宣言済みcommon pathをprivate my-vaultへ、次にYasashiiへ渡す。両downstreamは別Harness、別contract、別Generator、別Windows native run、別Evaluatorを必要とする。
5. public PASSをprivate／Yasashii PASS、release-ready、installed、loadedへ昇格しない。本Patch中に実downstreamへwriteしない。

## Acceptance Criteria

1. 既存Sprint 047の25 caseが同一candidateで25／25 PASSし、`GS-009`はHook 32＋CLI 32を減らさず、`GS-010`のdoctor／recovery意味も変更されていない。
2. Windows nativeの同一job内で32＋32 stressを3 round以上行い、各roundで全process exit 0、JSON parse 100%、Event ID unique 100%、期待Event件数100%、State rebuild 100%、owned lock／temp残骸0件である。
3. Windows native stressはmockを挟まず実canonical置換pathを全round通す。native runで一時競合を観測した場合はerror分類と回復結果を記録し、未観測でも決定的failure injectionの回復証拠とnative stressのplatform証拠を混同しない。error文字列mockや別OS模擬だけをWindows PASSへ数えない。
4. 決定的な一時競合fixtureはbounded recovery後に同じ論理writeを1件だけ反映し、内部retryによるEvent／Evidence／State重複0件である。
5. 決定的な恒久失敗fixtureは上限内に非0で停止し、busy loop／無制限待機0、成功表示0、Event／EvidenceだけまたはStateだけが進む不整合0、開始前から存在する利用者所有file変更0件である。
6. canonical置換前、Event／Evidence反映後からState確定前、cleanup failureの各注入後にparse可能で整合したcanonicalが残る。cleanup自体の失敗で残るartifactは当該operation所有物として識別され、retry／明示rebuild／doctor後に他者所有物を変えず重複なし・残骸0へ収束する。
7. transient以外のpermission、read-only、schema破損、ownership不一致、root／symlink／junction／alias差替えをretry対象へ広げず、対象外write、root外canary変更、別process lock／temp削除が0件である。
8. lock owner／token／stale TTL、active lock待機、期限切れClarity-owned lock回復、owner不一致保持が成立する。通常の成功／拒否／恒久canonical failure後はClarity-owned残骸0件、明示cleanup failure後はdoctorが一致する所有物だけを回復した時点で残骸0件である。
9. Secret値、local absolute path、transcript本文をcanonical、output、error、Evidence、tracked artifactへ露出せず、dirty／staged／untracked、HEAD、branch、remote、visibilityを保持する。
10. source／clean／Git-freeとPOSIXでSprint 047 25 case、Sprint 050 Patch 004／005、inventory、Sprint 038 Patch 003、archive gateが0 product FAILである。
11. 既存testのskip／削除、Hook／CLI件数削減、期待値／threshold緩和、Case ID／Severity／初回割当変更、単なるworkflow rerunだけによるPASSが0件である。
12. Windows native因果runがexact candidate SHA、Windows Server 2025、Node 22、各command／round、PASS／FAIL、retry／lock／temp／rebuild結果を持ち、既存Windows stepsと`timeout-minutes: 10`を維持して0 product FAILである。
13. workflow／test変更に対応するinventoryのpath／digest／markerが最新で、source／clean／Git-free／Windowsの検査入口がstaleでない。
14. offline fixture／製品実行のnetwork／external service writeは0件で、外部操作は既存PR #11同一branchへの通常pushと因果Windows CIだけである。
15. public独立Evaluator PASS前にhandoff readyを発行せず、固定完全SHA以外をprivate my-vault／Yasashiiへ渡さない。下流各版の別Windows／Harness評価要件と保護範囲が明記される。
16. merge、release、tag、GitHub Release、Marketplace、install／update、cache、live workspace、実Xmind、実downstream writeが0件である。

## 必須negative control／fixture

- Windows nativeの空白／日本語を含む通常local pathで、Hook 32＋CLI 32を同一roundに発火する3 round以上のstress。
- canonical置換が一時的に競合し、有限回内に解消するfixture。同じ論理Event／Evidence／Stateが1件だけ残る。
- canonical置換が上限まで恒久的に失敗するfixture。成功表示、partial canonical、無制限待機が0件である。
- Event／Evidence確定後からState確定前、canonical置換前、cleanup時の個別failure injection。
- active Clarity-owned lock、期限切れClarity-owned lock、owner／token不一致lock、開始前から存在するtemp類似file、別process owned temp。
- permission／read-only、schema corruption、root外symlink／junction、root自身／root内symlink、ancestor alias差替え、absolute／traversal、root外canary。
- 失敗後retry、同一write rerun、明示rebuild、doctor。Event ID、件数、State source count、bytes、lock／temp集合を前後比較する。
- POSIX source／clean／Git-freeの同じfailure injectionとSprint 047／Patch 004／005／inventory／conversation migration／archive回帰。

各negativeは期待するerror／exit、試行上限、論理operation identity、canonical before／after hash、Event／Evidence件数、
State rebuild結果、lock／temp owner・token、外部canary、filesystem／Git／network／external operationを持つ。
固定source文字列の存在、error名mock、sleepだけ、成功runの再実行だけで合格できない。

## Non-scope

- Clarity以外の全atomic writeを対象にしたfilesystem abstraction再設計。
- Windows network share全般、すべてのUNC変種、WSL／Windows間の任意path変換。
- retry対象を全permission error、全filesystem error、未知errorへ広げること。
- Event／Evidence／State schema、Case ID、Severity、Sprint 047の初回割当、GS-009／GS-010の意味・threshold変更。
- process数削減、test skip／削除、timeout延長だけ、workflow rerunだけでgreenにすること。
- 新しいcollector、統一attestation、flake率dashboard、実顧客data、実providerを合格条件にすること。
- private my-vault／Yasashiiのsource／spec／state／progress／feedback変更または同期実行。
- merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache、live workspace、実Xmind、Mac mini同期。

## Verification scope（着手時に固定）

- Product path: Clarity canonical lock、Event／Evidence append、State rebuild、canonical／owned temp置換、doctor／recoveryを実際に通す。
- Concurrency: 既存`GS-009` Hook 32＋CLI 32、`GS-010` stale owned lockを維持し、Windows同一job内3 round以上を各round別にhard gateする。
- Failure: OS非依存の決定的なtransient／permanent、置換前、Event／Evidence後からState前、cleanup、retry／rebuild／doctorを実行する。
- Safety: owner／token／TTL、root／symlink／junction／ancestor alias、Secret、dirty／staged／untracked／Git／remote／visibility、external canaryを前後比較する。
- Regression: source／clean／Git-free、Sprint 047 25 case、Patch 004／005、inventory、conversation migration Patch 003、archive gate、関連POSIX回帰。
- Windows: 既存PR #11のexact candidateをWindows Server 2025／Node 22で実行し、既存stepsと10分上限を維持する。

### Evidence safe harbor

- 40桁candidate SHA、workflow／job／run ID、OS／Node、command、exit、case ID、round、PASS／FAIL／NOT-RUNと理由。
- Hook／CLI process総数と各exit、Event／Evidence行数、JSON parse率、ID重複数、State source count／rebuild結果。
- transient／permanent injection point、試行回数／経過上限、論理operation identity、error分類、before／after canonical hash。
- lock／tempのowner、token一致／不一致、stale／active、成功／失敗後の残存件数。利用者所有fileは内容を出さずhash／mtime／存在だけを記録する。
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
