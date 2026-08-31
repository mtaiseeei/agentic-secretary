# Sprint 038 Patch 003 — conversation migrationのWindows native sibling temp修正

- Type: regular patch
- Risk: high（既存workspaceの会話契約migrationが利用者所有ファイルを置換し、atomic write・rollback・履歴保護を維持する必要があるため）
- Base Sprint: `sprint-038`
- 依存: `sprint-038-patch-002` done
- 対象機能: F31, F58
- 主眼: Windows native pathでもconversation migrationの一時ファイルを対象ファイルと同じdirectoryへ安全に作り、既存のownership確認、atomic置換、rollback、再実行の冪等性を変えずに実製品の`ENOENT`を解消する。

## 背景と通常Patch判定

private版のWindows native CIで、public common coreの
`plugins/secretary/scripts/lib/conversation-migration.mjs` が一時ファイル名を作る際、`/`だけを前提に
対象pathの最終要素を取り出していることが判明した。Windowsの`\\`区切りでは絶対path全体がファイル名相当として残り、
対象ファイルのsibling（一つ上のdirectoryに置く同階層ファイル）ではない不正な一時pathとなって`ENOENT`で停止する。

これは文字列上のWindows pathだけを模擬した検証では見つからず、既存workspace migrationの実writeをWindowsで失敗させる
製品不具合である。公開版common coreがprivate版・Yasashii版の同期元でもあるため、test除外や期待値緩和ではなく、
public版を先に直して独立評価する。その後、PASSした完全SHAだけをprivate版とYasashii版へ別々に引き渡す。

変更は利用者所有ファイルの置換、失敗時rollback、Windows native証拠、複数editionへの固定handoffを含み、
既存の単一回帰だけでは保護されていないためmicroではなく通常Patchとする。

## 外から見える成果

- Windowsのdrive letter、空白、日本語、`\\`区切りを含む通常workspaceで、対象の会話契約migrationが`ENOENT`にならず完了する。
- migrationの一時ファイルは対象ファイルと同じdirectoryにだけ作られ、置換途中の別volume移動やworkspace外書込みを生じない。
- 失敗時は対象ファイルを開始前のbytesへ戻し、一時ファイルや半端な置換結果を残さない。
- 同じmigrationを再実行しても追加変更は0件で、既存marker、利用者固有の前後内容、migration履歴を保持する。
- macOS／Linuxの既存migrationとupdate導線は従来どおり動く。

## Scope

### A. platform nativeなsibling temp

1. 対象pathの最終ファイル名は、実行中OSのpath規則で解決する。Windowsのdrive prefix、ancestor、`\\` separatorを一時ファイル名へ取り込まない。
2. 一時ファイルは解決済み対象ファイルの親directory内にだけ作る。対象と別directory、別volume、workspace外、現在directory、固定temp directoryへ置かない。
3. 一時ファイル名は対象の最終ファイル名とmigration用途を識別でき、既存のatomic sibling writeからrenameする契約を維持する。
4. Windows対応を理由に対象pathのownership、safe managed path、stale plan、Secret、symlink／junction等の既存guardを迂回しない。

Plannerは特定のNode APIや実装式を合格条件へ固定しない。上記の製品挙動と安全条件を満たす実装をGeneratorが選ぶ。

### B. atomic置換・rollback・cleanup

1. dry-runとplan作成はwrite 0件である。ownership不明、marker衝突、複数一致、stale planでは対象・一時ファイルを変更せず停止する。
2. applyは対象と同じdirectoryの一時ファイルを経由し、完成した内容だけを対象へ置換する。利用者固有の前置き・後書きと対象外sectionをbyte単位で保持する。
3. 一時ファイル作成後からrename前、およびrename後の失敗を注入し、rollback対象の操作では元の対象bytesを復元する。
4. 成功、拒否、失敗のすべてで、この操作が所有する一時ファイルを残さない。開始前から存在する対象外ファイルは削除・上書きしない。
5. rollbackやcleanupの失敗をmigration成功と表示しない。実際の対象状態と`changed`／error結果を一致させる。

### C. 冪等性とmigration履歴保護

1. 適用済みmarkerを持つ同一migrationの再実行は`already-applied`相当となり、対象bytes、marker、台帳、一時ファイルを追加変更しない。
2. retry／resumeで同じ置換、backup、marker、台帳eventを重複させず、既存update sessionの再開契約を維持する。
3. 公開済みmigration manifest、asset、template fingerprint、version間のfrom／to、過去fixture、過去Sprintのcontract／progress／feedbackを変更しない。
4. 現行version、manifest、CHANGELOG、edition metadata、release inventoryを変更しない。本Patchは新しいworkspace migrationやversion段階を追加しない。

### D. native WindowsとPOSIX回帰

1. Windows native filesystem上で、drive letter、backslash、空白、日本語を含む絶対pathから実際の`applyConversationMigration`経路を実行する。
2. Windows風path文字列の静的検査、別OS上の模擬、mockだけをWindows PASSへ昇格しない。
3. Windowsでは成功、rename前失敗、rename後失敗、再実行、ownership／stale拒否を確認し、対象と同階層のtemp、対象bytes、残存temp件数を観測する。
4. macOSまたはLinuxで既存Sprint 038 migration回帰、update関連回帰、master／Git-free archive相当の関連gateを同じcandidateで実行する。
5. 既存testを除外、skip、削除、期待値緩和してPASSにしない。既存の安全assertと履歴assertを維持し、本不具合を再現する回帰を追加する。

### E. public先行と下流handoff

1. 今回実装するのはpublic `agentic-secretary` のcommon coreと、その回帰だけである。
2. public版のfresh独立Evaluatorが同一candidateをPASSした後だけ、40桁の完全commit SHAと対象common pathをhandoff入力として固定できる。
3. private `agentic-secretary-my-vault` と `yasashii-secretary` は互いに独立したdownstreamである。各repoの別Harness契約、実装、Windows native回帰、独立Evaluatorを必要とし、一方のPASSを他方へ流用しない。
4. 下流は固定public SHAから宣言済みcommon coreだけを取り込み、private固有Skill／値、Yasashii overlay／copy、各repoのspec／state／progress／feedback／README／release判断を保護する。
5. 本Patch中に実private repo、実Yasashii repo、installed plugin、cache、利用者workspaceへ書き込まない。public PASSを下流反映済み・対応済み・公開済みと表示しない。

### F. 外部操作境界

- 製品実行と回帰は外部serviceへのwrite、外部API、任意networkへ依存せず、一時workspace内で完結する。
- Windows native証拠は、同一candidateを実行できる既存のWindows runnerまたはユーザー実機確認から取得する。別のremote操作が必要な場合は本契約の許可とみなさず、Orchestratorが別途ユーザー判断を得る。
- merge、release、tag、GitHub Release、Marketplace更新、plugin install／update、cache更新、workspace migration適用は本Patchの範囲に含めない。

## Acceptance Criteria

1. Windows nativeの通常workspaceで対象migrationが`ENOENT`なく完了し、変更対象sectionだけが1回置換され、利用者固有の前後bytesを保持する。
2. Windows nativeで一時ファイルが対象の親directory直下にあり、ファイル名へdrive prefix、ancestor、path separatorを含めず、対象外directoryへのwriteが0件である。
3. dry-run、ownership不明、marker衝突、複数一致、stale planは対象bytes不変、一時ファイル残存0件で停止する。
4. rename前とrename後のfailure injectionで対象が開始前bytesへ戻り、半端な新section、欠落した旧section、残存tempが0件である。
5. 成功後の再実行と、失敗後のretryが同じ最終状態へ収束し、置換、marker、台帳event、tempを重複させない。
6. macOSまたはLinuxで既存のSprint 038 migration、update関連、master／Git-free archive相当の関連回帰が0 product FAILである。
7. 既存testの除外・skip・削除・期待値緩和が0件で、修正前の不正な一時path生成をnegativeとして検出し、修正candidateで防止する回帰がある。
8. 公開済みmigration manifest／asset／fingerprint、過去fixture／Sprint記録、現行version／manifest／CHANGELOG／edition metadataの意図した差分が0件である。
9. 同一candidateのWindows native証拠に、40桁完全SHA、OS／Node、実行command、exit、PASS／FAIL、対象・temp・rollback・rerunの観測結果がある。別OSのWindows path模擬だけでは合格しない。
10. 製品・回帰による外部service write、外部API／network、private／Yasashii実repo、installed cache、利用者workspaceの変更が0件である。
11. public版の独立Evaluator PASS後だけ完全SHAを固定し、private版とYasashii版のhandoff先、保護範囲、別Harness評価要件が明記される。本Patchだけで下流PASSを主張しない。
12. merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache更新、実workspace migration適用が0件である。

## 必須negative control／fixture

- Windows nativeのdrive letter、backslash、空白、日本語を含む対象path。
- 対象と同名に近いsibling、一時ファイル名へancestor全体を混入させる修正前挙動の再現。
- ownership不明、marker片側だけ、旧section複数、dry-run後の対象変更。
- 一時ファイル作成後からrename前の失敗、rename後の失敗、失敗後retry、成功後rerun。
- 対象directory外canary、開始前からある対象外sibling、利用者固有の前後content。
- POSIXの通常pathと既存Sprint 038 migration fixture。

各negativeは期待するaction／error、対象before／after hash、tempの親directoryと残存件数、外部canary、
write／network件数を持つ。固定source文字列の存在だけで成功できない。

## Non-scope

- conversation migration以外の全path操作を対象にした一般的なWindows監査・filesystem abstraction再設計。
- updateのconfirmation、version解決、protection commit、ledger、edition marker、verification flowの仕様変更。
- 新しいmigration manifest／asset、既存利用者内容の一括変換、既存migration履歴の修正。
- private `agentic-secretary-my-vault`、Yasashii overlay、各downstreamのspec／Harness正本／release判断の変更。
- test除外、Windows jobのoptional化、既存rollback／ownership／history assertの緩和。
- merge、release、tag、GitHub Release、Marketplace、push、install／update、cache、利用者workspace反映。
- 新しいcollector、統一attestation、外部service、実顧客data、remote／networkを必須とする検証基盤。

## Verification scope（着手時に固定）

- 対象面: `plugins/secretary/scripts/lib/conversation-migration.mjs` の実apply経路、直接呼出し回帰、
  `update-apply.mjs` から同経路へ到達する関連回帰、Windows native runner、POSIX関連回帰、Git-free archive相当。
- Windows必須シナリオ: 通常apply、sibling temp観測、rename前／後failure、ownership／stale拒否、成功後rerun、失敗後retry。
- POSIX必須シナリオ: 既存Sprint 038 migrationとupdate関連回帰、関連master gate、Git-free archive相当。
- 履歴保護: migration manifest／asset／fingerprint、過去fixture／Sprint正本、version／manifest／CHANGELOG／edition metadataの差分確認。

### Evidence safe harbor

- candidate完全SHA、OS／Node、実行command、exit、PASS／FAIL／NOT-RUNと理由。
- fixtureの対象path特性、対象before／after hash、変更section件数、利用者固有前後bytesの一致。
- tempの親directory、basename特性、成功／拒否／失敗後の残存件数、外部canaryのbefore／after。
- failure injectionとrerunごとの対象hash、action／error、marker／台帳eventの重複件数。
- POSIX関連回帰、master／Git-free archive相当、履歴保護diffのcommandと結果。
- external service write／network、downstream、release／install／cache／workspace反映0件の対象限定記録。

上記で十分とする。新しいcollector、統一attestation、実service、remote操作、private／Yasashiiの実同期を
public版の合格条件へ追加しない。

## 完了条件

Generatorは本Patchだけを実装し、対応するprogressへ変更file、Windows／POSIX回帰command、failure injection、
rollback／rerun、履歴保護、外部操作0件、not-runを記録する。Evaluatorはfreshな別作業単位で同一candidateを
既存rubricのC1、C2、C3、C5、C6、C9、C10、C12、C13、C15と本Acceptance Criteriaに対して評価する。

既存rubricのcase意味、閾値、証拠形式は変更しない。UI差分がないためC8は非適用とし、新しいbrowser／screenshot要件を
追加しない。Windows nativeの実行可能case 0 FAIL、対象のPOSIX回帰0 product FAIL、全Acceptance Criteria PASSを
feedbackへ証拠付きで記録し、Orchestratorがstateを更新した後だけ完了扱いにできる。

private版・Yasashii版への展開、merge／release／tag／Marketplace／install／cache／workspace反映は開始しない。
