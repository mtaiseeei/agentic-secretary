# Sprint 050 Patch 004 — Harness正本を取りこぼさない包括的init scannerとWindows native互換

- Type: regular
- Risk: high（Clarity初期化の候補意味、bounded filesystem scan、platform path、安全境界、Windows native検証を横断する）
- 依存: `sprint-050-patch-003` done
- 対象機能: F68, F78, F80, F81
- Target Case IDs: HS-001〜HS-016（正確な16 IDは`docs/spec/clarity-acceptance.md`の`patchCaseIds.sprint-050-patch-004`）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)
- 主眼: 一般scanが上限へ達する大規模RepoでもHarnessの現在判断に必要な正本を予約枠で先に確認し、意味とcoverageを正直に初期候補へ反映する。同じscanner／init previewをWindows nativeで安全に動かし、実行していないplatform caseを対応済みへ昇格しない。

## 背景と正本判断

実機のClarity previewでSprint 050 Patch 003のancestor alias修正は成功し、`working-root-unsafe`を解消して
`link-identity`が次の`clarity-not-initialized`へ到達した。previewはvault側／本Repo側ともwrite 0で、既存untracked fileも不変だった。

一方、対象Repoのgeneric init scanは2 MiB上限で`truncated: true`となり、Item候補が`docs/spec.md`、設計draft、
`package.json`、`src/middleware.ts`だけに偏った。`docs/sprints/state.md`、Current Sprint contract、最新progress／feedbackが候補に入らず、
`docs/feedback/`も未確認だった。この結果から初期化するとschema上は有効でも、実行・検証状態が薄いClarityになる。

本Patchでいう「包括的」は全Repoを無制限に読むことではない。判断に必要な正本をboundedに取りこぼさず、読めなかった範囲を
理由つきで返すことである。byte上限を単純拡大してSecret／巨大Repo／性能境界を弱めず、Harness正本用の予約枠と一般scanを分ける。

また、開発・初回実機確認はmacOS中心だったが、ClarityはWindowsも正式対象にする。Windows形式文字列をmacOSへ渡すだけで
対応済みとせず、Windows native runnerで実行可能なscanner／preview／identity／安全caseを直接評価する。symlink／junctionは
Windowsではsymlink作成がDeveloper Mode／権限に依存し得る一方、junctionは別の作成条件を持つ。両capabilityを別々にprobeし、
実行結果とSKIP／NOT-RUN理由を正直に分離する。

Windows native runは本Patchのexternal live gateである。ユーザーは今回機能を既存PRへ載せることを依頼済みで、2026-08-31に
アカウント変更後の継続を明示した。このauthorizationは、exact candidate branch `codex/sprint-041-project-clarity`の`origin`への通常pushと、そのpushで起動する
既存PRのWindows CI、必要な場合の同一candidateに対する`workflow_dispatch`だけを許可する。force push、merge、tag、Release、
Marketplace、install、downstream、実顧客Repo write、remote変更には拡張しない。

## Planner process note（受入条件外）

Generator開始前の`Claude -p`によるFable静的reviewは2026-08-31に完了し、Verdictは`PASS-WITH-REQUIRED-CHANGES`だった。
Windows CIのexternal live gate、実在workflow、case割当、Windows fixture、安全境界に関する必須指摘を本正本へ反映した。
このreviewは製品PASS、case結果、Windows native実行、独立Evaluator、state遷移の証拠ではない。

## 外から見える成果

- 2 MiBを超えるHarness Repoでも、state、spec、Current contract／progress／feedbackの確認状況をpreviewから把握できる。
- state、requirements、Generator自己報告、Evaluator検証が別の意味で表示され、progressだけから独立PASSを推測しない。
- feedbackがまだ無い状態、存在するが読めない状態、scan-limitで未確認の状態を区別できる。
- Harness正本を確保した後、残った容量で一般file候補も取得できる。非Harness Repoの既存generic scanは変わらない。
- Windowsのdrive letter、backslash、空白、日本語、CRLFを含むRepoでもinit preview／identityが動き、危険なcollision／invalid pathは副作用0件で止まる。
- Windowsで権限上実行できないsymlink／junction caseは未実行理由が分かり、他caseのPASSに隠れない。

## Scope

### A. Harness検出とauthoritative reserved lane

1. Harness Repoはpath文字列やrepo名ではなく、`docs/sprints/state.md`と関連構造を安全に確認して検出する。partial／invalid構造を完全なHarnessへ昇格しない。
2. Harness時だけ一般scanと分離したauthoritative reserved laneを使う。generic scanがbyte／file／entry上限へ先に達しても予約枠を消費しない。
3. 最初にstateをbounded readし、Current ID、status、Next Planned、該当sectionの解決結果を得る。TBD、missing、invalid、巨大stateを固有状態にする。
4. stateからCurrent IDを解決後、`docs/spec.md`とboundedに必要な`docs/spec/*.md`、current contract、対応progress、対応feedback、`AGENTS.md`、`CLAUDE.md`、package manifestを一般`src/`／`scripts/`より先に扱う。
5. CurrentがTBD／missing／invalidの場合、明示されたNext Planned、直近完了記録等のbounded fallbackだけを使い、使用根拠と推測を表示する。filename辞書順／mtimeだけでCurrentを確定しない。
6. current feedback不存在は`evaluation-not-yet-recorded`相当として扱う。pathが存在するが上限・Secret・binary・symlink・permission等で読めない状態と区別する。
7. authoritative laneを確保した後だけ、残余budgetでgeneric scanを行う。非Harness Repoは既存generic候補、上限、安全意味を維持する。

### B. Harness正本の意味とClarity候補

1. stateはOrchestrator execution truth、contractはrequirements、progressはGenerator self-report、feedbackはEvaluator validationとする。
2. progressの「実装完了」をEvaluator PASSへ昇格しない。feedbackがFAIL／verification-scope-issue／未作成の場合も、その意味をstateやprogressで上書きしない。
3. 1 fileを1 Itemへ機械変換せず、同じCurrent Sprintのstate／contract／progress／feedbackをDecision／Execution／ValidationとEvidence参照へ一貫して束ねる。過去Sprint全文をItem化しない。
4. tracked Clarity dataへ本文全文やabsolute local pathを複製せず、repo-relative locator、digest、短いsummary、観測時刻を使う。
5. authoritative／generic laneごとにbudget、使用量、`inspected / excluded / uninspected / not-found`、partial理由を返す。`truncated: true`だけで包括的確認済みと表示しない。
6. stateが将来1 file上限を超えても無制限readへ戻さず、Current metadata／該当sectionをboundedに扱える契約を持つ。解決できない場合はpartialとして止める。

### C. 安全性・決定性・ancestor alias回帰

1. `.env`／credential／Secret-like content、binary、root内symlink／junction、path traversal、absolute path injectionの既存除外を維持する。
2. preview／cancelは`changed:false`、filesystem、runtime、journal、Git、network、external provider write 0件である。
3. applyはsynthetic fixtureだけで評価し、物理Repo内の宣言済みClarity所有path以外を変更しない。実利用者Repoへのapplyは本Patchの合格条件にしない。
4. dirty／staged／untracked、HEAD、branch、remote、既存fileを全positive／negative経路で保持する。
5. ancestor alias／physical pathは同じRepo identity、候補ID／意味／順序、coverage digestを返す。Sprint 050 Patch 003の一般root既定拒否、Clarity限定opt-in、root自身／root内symlink／差替え拒否を維持する。
6. 同一inputのpreview／apply retryは候補、Item、Event、Evidence、Stateを重複させず決定的に収束する。

### D. Windows native互換

1. scanner、candidate resolver、init preview、identity、安全pathはNode-nativeとplatform path APIで動き、POSIX separator、Bash、`/tmp`固定を前提にしない。
2. drive letter、backslash、空白、日本語、CRLFを含むfixtureをWindows native filesystem上で直接扱う。
3. Windowsのcase-insensitive collision、reserved名、invalid path表現、前方一致する別rootを安全側へ分類し、文字列prefix containmentへ緩和しない。
4. symlinkとjunctionは別々にcapability probeする。symlinkはDeveloper Mode／権限を理由に作成不能となり得るが、junctionへ同じ理由を流用しない。各capabilityで実行可能なら対応positive／negativeを直接評価し、作成不能ならcase単位でSKIP／NOT-RUN理由を記録する。権限不足をPASSへ数えない。
5. host固有home、drive、volume、利用者名をsource、fixture expectation、tracked artifactへhard-codeしない。
6. 実在する`.github/workflows/windows-recording-regression.yml`の`windows-native` jobへ今回のClarity suiteを結線する。既存0.9.2 Windows回帰と`timeout-minutes: 10`を壊さず、実Windows runが0 FAILになるまでpublic sourceを`windowsVerified=true`としない。
7. macOS／Linuxのportable suite、Secret／symlink境界、Sprint 041、Sprint 050 Patch 003を同じcandidateで回帰させる。macOS platform aliasをWindowsへ要求せず、platform固有caseを別OSのPASSへ流用しない。

### E. Windows external live gate

1. offline／synthetic preview、fixture、candidate生成はnetwork／external write 0件を維持する。外部操作はexact candidate固定後のWindows live gateだけに分離する。
2. 許可されたpushは`codex/sprint-041-project-clarity`から既存`origin`の同名PR branchへの通常pushだけとし、push前後でcandidate SHA、branch、remote、対象commit集合を記録する。force、remote URL変更、別branch、mergeを行わない。
3. pushで既存PRのWindows workflowが起動する場合はそのrunを待つ。起動しない場合だけ、同じcandidate SHAを対象に`workflow_dispatch`できる。別SHA、別workflow、過去runを証拠へ流用しない。
4. live gateが未実行、認証／runner／dispatch等で利用不能、timeoutの場合は`windowsVerified=false`とNOT-RUN／incomplete理由を維持し、`verification-infra`または`external-live-gate-unavailable`として製品実装不具合と分離する。
5. Windows runnerでClarity assertionが失敗しcandidate挙動に因果がある場合はproduct／`implementation-issue`として扱う。workflow起動不能等と同じ分類へ丸めない。どちらもWindows verifiedとSprint PASSを満たさない。
6. run証跡はworkflow path／job、run ID／URL、candidate SHA、OS／Node、command、PASS／FAIL／SKIP／NOT-RUN、理由に限定する。Secret値、利用者data、実顧客pathを保存しない。

### F. inventoryと版境界

1. Clarity collaboration／test inventoryへauthoritative scanner、candidate resolver、Windows workflow、portable suite、適用marker、digestを追加し、stale／漏れを検出する。
2. public coreで実装・独立評価する。public PASS後のprivate my-vault／Yasashiiへの固定handoffは後続phaseであり、本Patch中に実downstreamへ書かない。
3. version、manifest、CHANGELOG、release inventory、Marketplace、installed cache、Mac mini、new session loaded versionは変更しない。

## Feature／Caseの単一割当

- HS-001 → F68
- HS-002〜009、HS-012〜015 → F81
- HS-010〜011 → F78
- HS-016 → F80

各Target Caseは`docs/spec/clarity-acceptance.md`の`patchCaseIds.sprint-050-patch-004`へ一度だけ現れ、
`patchCaseFeatureAssignments`でfeatureを一つだけ持つ。既存primary 250、CLX 20、XV 4、CF／AR 21のID、意味、Severity、割当を変更しない。

## Acceptance Criteria

1. HS-001〜016が同一candidateで全件PASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. 2 MiB超のHarness fixtureで一般`src/`／`scripts/`が先に容量を消費しても、state、spec、current contract／progress／feedback用authoritative laneが確保される。
3. state／contract／progress／feedbackの意味roleが区別され、Current Sprintの一貫したcandidate bundle／Evidenceになる。progressだけからEvaluator PASSを推測せず、過去fileを1 file 1 Itemで羅列しない。
4. Current ID valid／TBD／missing／invalid、feedback absent、巨大stateを固有coverageと理由で扱い、filename順／mtimeだけの推測、無制限read、完全coverage誤表示が0件である。
5. authoritative／generic laneのbudget、inspected／excluded／uninspected／not-found、partial理由を返し、Secret／binary／symlink／permission／missingの本文・値・参照先を読まない。
6. 非Harness Repoのgeneric候補、上限、安全意味が開始candidateから意図せず変わらない。
7. alias／physical pathでRepo identity、候補ID／意味／順序、coverage digestが一致し、Sprint 050 Patch 003のAR安全境界が0 FAILである。
8. preview／cancelは`changed:false`、apply fixtureは物理Repo内の宣言済みClarity所有pathだけを変更し、dirty／staged／untracked、HEAD、branch、remote、external canary、networkを保持する。
9. Windows native runnerでdrive letter、backslash、空白、日本語、CRLFを含むscanner／init preview／identity caseがPASSする。
10. Windows nativeでcase-insensitive collision、reserved／invalid path、別root前方一致を固有理由でfail closedし、副作用0件である。
11. Windows symlink／junction caseは各capabilityを別々に観測し、実行できたcaseと権限理由付きSKIP／NOT-RUNを別集計する。SKIPをPASSや全保証へ数えない。
12. `.github/workflows/windows-recording-regression.yml`の既存`windows-native` jobへ今回suiteが結線され、0.9.2回帰と`timeout-minutes: 10`を維持した実Windows runのcandidate SHA、command、OS／Node、PASS／FAIL／SKIPが記録される。Windows native PASS前は`windowsVerified=false`である。
13. macOS／Linux portable回帰、Sprint 041、Sprint 050 Patch 003、Secret／path／inventory／Git-free回帰が0 product FAILである。
14. host固有home／drive／volume、tracked absolute local path、private my-vault／Yasashii固有literalがpublic sourceのClarity data／contract判定へ0件である。
15. Target registryはPatch case合計37、HS 16、duplicate／missing／extra 0、feature割当各1件を機械確認する。
16. external writeは許可済みのexact candidate branch `origin` pushと同candidate Windows CI／必要時workflow dispatchだけである。private／Yasashii、merge、release、tag、Marketplace、install、cache、Mac mini、実顧客Repoへのwriteは0件である。

## 必須negative control／fixture

- `src/`／`scripts/`だけで2 MiBを超え、Harness正本が一般walkでは後になるRepo。
- 同サイズの非Harness Repo、Harness marker partial／invalid Repo。
- Current ID valid／TBD／missing／invalid、feedback absent、巨大state、該当section解決不能。
- authoritative sourceごとのSecret-like、binary、内部symlink、permission、missing。
- 同じCurrent Sprintの多数正本と大量の過去contract／progress／feedback。
- ancestor alias／physical、root自身symlink、root内symlink、alias差替えのPatch 003回帰。
- dirty／staged／untracked、branch／remoteありRepoのpreview／cancel／apply failure。
- Windows nativeのdrive letter、backslash、空白、日本語、CRLF、case-only collision／reserved／invalid path参照、前方一致別root。
- Windows symlink capabilityとjunction capabilityそれぞれのavailable／unavailable分岐。
- Windows workflow未起動、認証不能、runner timeoutと、runner内Clarity assertion failureの分類negative。
- Windows風文字列をmacOSで通しただけの結果を`windowsVerified=true`へ昇格する誤実装。

各negative fixtureは期待reason／error、PASS／FAIL／SKIP／NOT-RUNの正しい分類、`changed:false`または宣言済みsynthetic write、
filesystem／Git／external operation／network 0を持つ。固定summary、source文字列scan、別OSの模擬だけで成功できない。

## Non-scope

- 全Repo全文index、全Git履歴読込、全過去Sprint文書のItem化、global／per-file上限の撤廃。
- 実顧客Repo、ユーザーのMac mini対象Repo、vault、本Repoへのinit apply／link apply。
- private my-vault／Yasashii source、spec、state、adapter、release判断。
- Windows network share全般、すべてのUNC変種、WSL／Windows間の任意path変換。
- Windowsのsymlink／junction作成権限を製品が変更すること、Developer Mode設定、runner権限昇格。
- 新しいexternal provider、collector、統一attestation、実顧客data、remote clone／fetch／pull、remote URL変更、force push、別branch push。
- version bump、manifest、CHANGELOG、tag、GitHub Release、Marketplace、installed cache、new session、Mac mini同期。
- 許可済みcandidate branch push／Windows CI以外のpublic独立PASS前external write、downstream write、実provider、実Xmind、実connector、利用者workspace変更。

## Verification scope（着手時に固定）

- HS-001〜011はOS一時directoryのsynthetic Git／non-Git Repoで実行し、lane budget、coverage、candidate bundle、tree／Git digestを記録する。applyはsynthetic fixtureだけに限定する。
- HS-012〜015は`.github/workflows/windows-recording-regression.yml`の既存`windows-native` jobで直接実行する。既存Node setup、0.9.2回帰、`timeout-minutes: 10`を維持してClarity suiteを結線する。symlink／junctionは別capabilityとSKIP／NOT-RUN理由を出す。
- HS-016はmacOS／Linux portable suite、Sprint 041、Sprint 050 Patch 003、inventory／Git-freeを同一candidateで実行する。既存回帰のsafe harborを新collectorへ置き換えない。
- alias／physicalではRepo identity、candidate IDs／meaning／order、coverage digestを比較する。absolute pathは一時Evaluator evidenceだけに記録し、tracked product dataへ残さない。
- Windows pathはnative filesystemから得たpathで評価し、POSIX host上の文字列模擬は補助negativeへ限定する。

### Evidence safe harbor

- case ID、fixture kind／root、OS／Node、command、exit、PASS／FAIL／SKIP／NOT-RUN、reason。
- authoritative／generic laneのlimits、used bytes／files／entries、inspected／excluded／uninspected／not-found、partial reason。
- state Current ID／fallback source、contract／progress／feedback role、candidate／Evidence ID、rerun digest。
- before／after filesystem tree、Clarity-owned diff、Git worktree／index／HEAD／branch／remote、external canary、network／external operation log。
- Windows capability probe、native path characteristics、workflow job／run summary、`windowsVerified`判定。
- 許可済みpushのbranch／remote／candidate SHA／commit集合と、因果的なWindows run ID。preview／fixtureのnetwork／external write 0記録。
- registry count／feature assignment、inventory digest、関連回帰のcommand／exit。

上記で十分とする。新しいcollector、統一attestation、実顧客data、実Repo apply、external provider、downstream／release／installを
追加条件にしない。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更file、lane／candidate設計、Windows workflow、Target／negative結果、
portable／Git-free回帰、not-run、offline／fixture external write 0を引き渡す。exact candidate固定後の許可済みbranch pushとWindows live gateは
candidate SHA／run IDへ束縛して別記録する。Evaluatorはfreshな別作業単位で同じcandidateをC1、C2、C5、C6、
C19、C20、C24、C26とTarget 16件に対して評価する。

C5／C19／C24／C26は5/5、ゼロ許容違反0、全Acceptance Criteria PASS、Windows native実行可能case 0 FAILをfeedbackへ
証跡つきで記録し、Orchestratorがstateを更新した後だけ完了扱いにできる。権限依存SKIPは理由を残し、Windows全保証へ昇格しない。
実顧客Repo apply、private／Yasashii、release／installは開始しない。
