# Sprint 050 Patch 003 — 正本repo freshnessとClarity限定ancestor root alias

- Type: regular
- Risk: high（外部正本の現在判断、filesystem root identity、全Clarity入口のcontainmentを横断する）
- 依存: `sprint-050` done-by-user-decision、`sprint-050-patch-001` done、`sprint-050-patch-002` done
- 対象機能: F64, F68, F73, F74, F75, F77, F78, F80
- Target Case IDs: CF-001〜CF-007、AR-001〜AR-014（正確な21 IDは`docs/spec/clarity-acceptance.md`の`patchCaseIds.sprint-050-patch-003`）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)
- 主眼: development-pointerの古いworkspace snapshotだけで現在判断せず、利用可能な正本repoをread-onlyに確認する。同時に、Clarityだけが明示opt-inしたancestor symlink aliasを物理rootへ固定し、従来の内部symlink／Git／write境界を弱めない。

## 背景と正本判断

別repo開発PJのworkspace側`PROJECT.md`は概要snapshotであり、仕様・判断・実装・Sprintの正本ではない。
現状のClarity-aware status／daily／weekly／PortfolioがsnapshotとPJ内Clarityだけを読むと、正本repoが利用可能でも
古い情報から包括的な現在判断を返し得る。development-pointerでは「正本を複製しない」と「正本を確認しない」は別である。

一方、現在のfilesystem境界はworking rootまでの途中ancestorにsymlinkがあると拒否する。これは一般用途の安全な既定として
維持する。ただしClarityを置くRepo自身は通常directoryでも、その上位workspaceだけが別volume等へのsymlink aliasである
正当な配置がある。Clarityに限って明示opt-inされたときだけ、ancestor aliasを物理rootへ固定して扱う。

ユーザー提供の実機baselineは次のとおりである。この観測は要件決定のupstream evidenceであり、public PatchのPASS、
private版修正、実顧客repoへのapplyを証明しない。

- Mac mini: `/Users/taisei/workspace -> /Volumes/ExternalSSD/workspace`
- 対象repo自身: symlinkではない通常directory
- installed private版のalias path `link-identity`: `working-root-unsafe`、`changed:false`
- 同じrepoのphysical path `link-identity`: 次の判定である`clarity-not-initialized`まで到達

本Patchはpublic sourceとsynthetic fixtureだけを対象にする。実顧客repoへapplyする場合は、本Patchの独立Evaluator PASS後も
対象・write予定・rollbackを示した別の明示確認gateを必要とする。

## 外から見える成果

- development-pointerのstatus、daily、weekly、Portfolioが、利用可能なlocal正本repoの現在根拠をboundedかつread-onlyに確認する。
- workspace snapshotと正本観測の時刻・revision・freshnessが分かれ、正本未確認時に「最新」「問題なし」「Driftなし」と断定しない。
- workspace ancestorだけがsymlinkのRepoは、Clarityの明示opt-in時にphysical pathと同じRepo identity・Clarity結果へ到達する。
- root自身やRepo内部のsymlink、broken／file向きalias、途中差替えは、何も変更せず理由を区別して停止する。
- alias経由でもwriteは物理RepoのClarity所有pathだけ、Git状態とlink bundleのportable性は不変である。

## Scope

### A. development-pointer canonical observation

1. `projectType: development-pointer`と`canonicalRepo`／`PROJECT.md`の「正本repo」を既存projects正本から解決する。
2. local checkoutが実在する通常directoryなら、Project status、daily morning／evening、weekly、Portfolioで自動的にbounded readする。
3. 最低限、pointerにある「最初に読むファイル」、物理root基準のRepo identity、Git current state、既存Clarity canonical／stateの有無を確認する。
4. 「最初に読むファイル」は物理root内の安全な相対pathである通常fileだけを対象にし、absolute path、traversal、symlink、missing、directory、上限超過は理由つきで未確認とする。
5. 観測はsource kind、availability、observed at、source revision、`current-at-observation / stale-snapshot / unknown`のfreshness、inspected／excluded／uninspected、理由を返す。
6. workspace snapshotは履歴的な要約、正本観測は現在根拠として分離する。正本がmissing、unsafe、unreadable、stale、unavailableなら、その理由を表示し、snapshotだけで包括的current判断を確定しない。
7. Secret、credential、binary、巨大file、transcript、顧客本文、root内symlinkを追わず、正本内容全文をworkspace、Clarity、log、Evidenceへ複製しない。
8. remote URLだけの場合はclone／fetch／pull／checkoutしない。Clarity coreはnetwork／providerを暗黙起動しない。現在の用件で既に利用可能かつ許可済みのread-only provider evidenceがadapter入力として供給された場合だけ取り込み、それ以外は`unavailable`とする。

### B. Clarity限定ancestor symlink opt-in

1. root policyは`allowAncestorSymlinks: false`相当を既定とする。一般`workingRoot`、project／memory／update等の既存入口は既定拒否を維持する。
2. trueはClarityのrequest-boundな明示opt-inに限る。呼出し元、CLI／Skill入口、Secretary canonical readerはopt-inの有無を曖昧にせず、結果へ適用policyを示す。
3. trueでも要求されたworking root自身がsymlinkなら拒否する。許可するのはその上のancestor aliasだけである。
4. ancestor aliasをrealpathで物理rootへ固定し、解決先が実在する通常directoryであることを確認する。Git RepoではGit top-levelの実体も物理rootと一致させる。
5. root内のcontainment、canonical／runtime／projection／link／Drift／Secretary adapter／Hookのread・writeは、要求pathの文字列ではなく同じ物理rootを基準にする。
6. root解決後も重要read、各write／renameの直前にalias target、物理root filesystem identity、Repo identityを再確認する。差替え・実体変更を検出したら旧／新rootのどちらも変更せず停止する。
7. root内のsymlinkは従来どおり追わない。`.clarity`、write target、Decision／implementation source locatorの外向き・broken symlinkをancestor例外へ含めない。
8. macOSの既存platform alias `/var`→`/private/var`、`/tmp`→`/private/tmp`を維持する。特定利用者のhome、workspace、volume pathをsource／contract判定へhard-codeしない。

### C. identity、portable metadata、write境界

1. alias／physical pathは同じRepo identity、Git top-level identity、Clarity Project IDを返す。
2. tracked project、Event、Evidence、link bundle、projectionへalias／physicalのabsolute local pathを保存しない。local mappingが必要な既存面はgitignored境界を維持する。
3. preview／status／daily／weekly／Portfolio／link identityはwrite 0件である。
4. alias経由のapply fixtureは、操作が宣言した物理Repo内`.clarity/**`だけを変更する。alias文字列から別treeを作らず、workspace側PJ、相手Repo、外部symlink先を変更しない。
5. dirty／staged／untracked、HEAD、branch、remoteを全成功／失敗経路で保持する。fetch、pull、push、checkout、branch／remote変更、network callを行わない。

### D. 全入口の整合

1. safe filesystem、Clarity core、link、projection、Drift、Secretary adapter、Clarity Hookの各入口が同じroot policyとphysical containmentを使う。
2. errorは少なくとも、ancestor alias未許可、root自身symlink、root内unsafe symlink、broken／directory以外のancestor、alias／physical root changedを区別する。
3. errorは何が起きたか、`changed:false`、次に指定できる安全なpathまたはopt-inの必要性を示し、内部例外だけを利用者へ返さない。
4. tracked collaboration inventoryはcanonical reader、適用surface、root policy、marker、digest、回帰を含み、stale／欠落を検出する。

## Feature／Caseの単一割当

- CF-001／002／004／005 → F73
- CF-003／006 → F74
- CF-007 → F80
- AR-002 → F64
- AR-003 → F68
- AR-009 → F75
- AR-011 → F77
- AR-001／004〜008／010／012／013 → F78
- AR-014 → F80

各Target Caseは`docs/spec/clarity-acceptance.md`の`patchCaseIds`へ一度だけ現れ、
`patchCaseFeatureAssignments`でfeatureを一つだけ持つ。既存primary 250、CLX 20、XV 4、E2E 4のID、意味、Severity、
初回割当、Sprint 050履歴を変更しない。

## Acceptance Criteria

1. CF-001〜007、AR-001〜014の21件が同一candidateで全件PASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. local development-pointerを含むProject status、daily、weekly、Portfolioが、最初に読むファイル、Repo identity／Git current state、Clarity状態、observed at、freshness、除外・未確認理由をbounded readする。
3. remote-only、missing、unsafe、unreadable、staleでは利用不能理由を示し、snapshotだけから包括的current／aligned／no driftを断定しない。clone／fetch／pull／checkout／networkは0件である。
4. Secret／binary／巨大file／内部symlink先のreadと、正本本文のworkspace／Clarity／logへの複製が0件である。
5. 一般`workingRoot`はancestor symlinkを従来どおり拒否する。Clarityの`allowAncestorSymlinks: true`だけがworkspace ancestor aliasを許可する。
6. alias／physicalの未初期化`link-identity`は同じ次の`clarity-not-initialized`へ到達し、初期化済みは両方成功する。Repo identity、Clarity Project ID、Git top-level identityが一致する。
7. alias／physicalのinit previewは`changed:false`で同じ対象・identityを示す。apply fixtureのwriteは物理Repo内の宣言済み`.clarity/**`だけで、workspace、alias別tree、peer Repo、外部canaryは不変である。
8. root自身symlink、root内`.clarity`／write targetの外向きsymlink、broken／file向きancestorを固有理由で拒否し、全対象へ副作用0件である。
9. alias差替え／物理root identity変更を重要read／write直前に検出し、旧／新rootのcanonical、runtime、projection、Gitを変更せず停止する。
10. tracked link bundle／Event／Evidence／projectionのabsolute local pathは0件で、local mappingの既存gitignored境界を維持する。
11. dirty／staged／untracked、HEAD、branch、remoteが全positive／negative fixtureで不変で、正本repoへのwrite／fetch／pull／push／checkout／branch／remote／network callが0件である。ただしAC7のsynthetic `.clarity/**` applyだけを宣言済み例外とする。
12. Drift source locator symlink拒否、ST-008、LK-007、CLX-006、GS安全回帰、macOS platform alias、Git-free archive、existing masterの関連回帰が0 FAILである。
13. core／link／projection／Drift／Secretary adapter／Hookのentrypoint matrixが同じroot policyを使い、ancestor可・root自身・内部unsafe・root changedのerrorを区別する。
14. registryは既存274 case不変、Patch case 21件、Target ID重複0、未割当0、余分なcase 0、feature割当各1件を機械確認する。
15. Fable静的reviewはPlanner正本完成後、最初のGenerator前に行い、意味、Severity、case／feature割当、重複、スコープを確認する。ただしreview結果は製品PASS、Evaluator証拠、state遷移へ数えない。

## 必須negative control／fixture

- 一般`workingRoot`＋workspace ancestor alias、opt-inなし。
- Clarity opt-in trueだがworking root自身がsymlink。
- `.clarity`、write target、Drift locatorがそれぞれroot外を指すsymlink。
- broken ancestor、通常file向きancestor、directory以外の実体。
- root解決後のalias target差替え、物理rootの置換／identity変更。
- remote URLだけ、local checkout missing、permission unreadable、最初に読むファイルmissing。
- Secret、binary、上限超file、scan limit、内部symlinkを持つcanonical Repo。
- dirty／staged／untracked、branch／remoteを持つGit Repo。
- link bundleへのalias absolute path、physical absolute pathの混入。
- macOS platform aliasと無関係なancestor symlinkを同じ許可として扱う誤実装。

各negative fixtureは期待するerror／availability reason、非0 exitまたはtruthful unavailable、`changed:false`、
filesystem／Git／external operation 0を持つ。固定summaryやsource scanだけで成功できない。

## Non-scope

- private my-vault／Yasashii source、spec、state、adapter実装、実repo適用、各版のrelease判断。
- Sprint 050の`done-by-user-decision`、元feedback、AC3／C21残余、Patch 001 handoff、Patch 002 Hook manifest履歴の変更。
- `XM-007`の実Xmind MCP、conditional NOT-RUN、verified状態の変更。
- version bump、CHANGELOG、release inventory、edition metadata、Marketplace、cache、install、new session。
- push、PR、merge、tag、GitHub Release、remote変更、実provider／network call。
- 実顧客repo、ユーザーの実development repo、Mac mini上の対象repoへのwrite／apply。
- 一般filesystemのancestor symlink許可、working root自身またはroot内symlinkの許可。
- 新しいclone／fetch manager、remote cache、background polling、全Repo全文index、canonical本文のvault複製。

## Verification scope（着手時に固定）

- CF-001〜007はsynthetic Secretary workspaceとlocal／remote-only／missing／unsafe／unreadable canonical fixtureで、status／daily／weekly／Portfolioを実行する。各surfaceのread path／bytes上限、source revision、observed at、freshness、Clarity状態、unavailable理由を記録する。
- AR-001〜014はalias/workspace/repoのworkspaceだけをsymlinkにし、一般default、Clarity opt-in、alias／physical、未初期化／初期化済み、preview／applyを組み合わせる。
- AC7のapplyはsynthetic fixtureだけで行い、宣言済み`.clarity/**`の前後diffと外部canaryを取る。実顧客repoでは実行しない。
- core、link、projection、Drift、Secretary adapter、Hookの各入口を直接実行し、単に共有helperのunit testだけで全入口PASSとしない。
- actual path／realpath、filesystem identity、Repo identity、Clarity Project ID、Git top-level、link bundleを比較する。tracked dataへabsolute local pathを残さない。
- dirty／staged／untracked、HEAD、branch、remoteとfilesystem treeを前後比較し、command runnerでwrite／fetch／pull／push／checkout／branch／remote／network call 0を記録する。
- 通常checkout、ancestor alias経由、`.git`なしGit-free archive相当で同じcandidateを検査する。macOSでは`/var`／`/tmp`回帰を実行し、他OSではhost固有path hard-code 0を検査する。
- 関連するST-008、LK-007、CLX-006、GS／PK、Sprint 041／045／046／047／049／050、existing master回帰は現役commandで再実行する。primary／CLX／XV全件の意味を再定義しない。

### Evidence safe harbor

- case ID、fixture ID／root、command、exit code、期待／観測error codeまたはavailability reason。
- requested alias／physical root、actual path／realpath、filesystem／Repo／Git／Clarity identityの比較結果。absolute pathは評価用一時証拠にだけ記録し、tracked product dataへ保存しない。
- status／daily／weekly／Portfolioのsource kind、observed at、revision、freshness、inspected／excluded／uninspected、read件数／bytes上限。
- before／after filesystem tree digest、`.clarity/**` diff、external canary、Git worktree／index／HEAD／branch／remote snapshot。
- link bundle／Event／Evidence／projectionのabsolute local path scan、external operation log、Secret canary非露出。
- registryのcase count、duplicate、missing／extra、feature割当件数と、Fable静的reviewの指摘／対応記録。

上記で十分とし、新しいcollector、統一attestation、実顧客data、実provider、実network、実downstream、release、
installed private版の更新を追加条件にしない。Fable reviewはGenerator着手前gateだが製品PASS証拠ではない。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更file、root policy適用matrix、canonical read report、negative fixture、
Git-free／actual path evidence、回帰command、not-run、external write 0を引き渡す。Evaluatorはfreshな別作業単位で同じcandidateを
C1、C2、C5、C6、C20、C22、C24とTarget Case 21件に対して評価する。

C5／C22／C24は5/5、ゼロ許容違反0、全Acceptance Criteria PASSをfeedbackへ証跡つきで記録し、
Orchestratorがstateを更新した後だけ完了扱いにできる。実顧客repo apply、private／Yasashii、release／installは開始しない。
