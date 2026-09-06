# Sprint 050 Patch 005 — Harness stateの構造化execution truthとSecret本文の安全な分離

- Type: regular
- Risk: high（authoritative state解析、Secret非露出、candidate／Evidence identity、3版共通runtime、Windows external live gateを横断する）
- 依存: `sprint-050-patch-004` done
- 対象機能: F78, F79, F80, F81
- Target Case IDs: SR-001〜SR-010（正確な10 IDは`docs/spec/clarity-acceptance.md`の`patchCaseIds.sprint-050-patch-005`）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)
- 主眼: `docs/sprints/state.md`の構造化execution truthをboundedに保持しながら、無害なcredential field名・placeholder・過去説明を誤ってwhole-file除外せず、実値らしいSecret本文は値・本文・raw digest・summary・candidate・Evidenceへ一切漏らさない。

## 背景と正本判断

Sprint 050 Patch 004は、Harness authoritative reserved lane、Current 4 role、fallback bundle、portable path、Windows nativeを
独立EvaluatorでPASSした。その後、Yasashii相当の実source、exact detached candidate、Git-free candidateの3面で、state内の
無害な履歴説明がgeneric Secret regexへ一致し、state全体が`secret-like-content`として除外されるproduct defectを再現した。

current public sourceのstateにも、過去のscanner検査を説明するinline codeとしてcredential field名とplaceholderがある。
現行runtimeはstateをbounded readした後、state全体へ一般sourceと同じSecret-like判定を適用するため、無害な説明だけでも
`currentId=null`となり、state／contract／progress／feedbackの4 roleとCurrent bundleが消える。観測されたC26は4/5である。

stateは一般文書の本文を候補化するsourceではなく、Orchestrator execution truthを構造として読むauthoritative sourceである。
したがって、stateだけは構造化fieldと非構造本文を分ける。一方、これはSecret検査を弱める許可ではない。実値らしいSecretが
混在する場合は、値と本文を出さず、安全に得られる構造metadataだけを`redacted`／`partial`として返す。state以外の
authoritative sourceとgeneric laneは既存のstrict Secret exclusionを維持する。

Yasashii契約では`clarity.mjs`、`clarity-core.mjs`、`clarity-harness-scan.mjs`がpublic fixed candidateとのbyte-sync必須面である。
Yasashii単独修正は行わず、public common upstreamを先に直して独立評価する。public PASS後のprivate my-vault、次にYasashiiは
各repoの別Harnessで同期・独立評価し、public PASSを下流PASSへ流用しない。

## 外から見える成果

- current public sourceの実stateやYasashii相当stateに無害なSecret検査説明があっても、Current Sprint、status、Next Planned、4 role、bundleを確認できる。
- placeholder／コード例／過去説明と、実値らしいSecretを区別し、前者では誤除外せず、後者では値・本文を一切表示しない。
- Secretが混在しても、安全な構造metadataとredaction理由を分けて返し、「全部確認済み」「全部除外」の二択に潰さない。
- candidate／EvidenceへSecret由来のraw-content digestを出さず、低エントロピー値の推測材料を残さない。
- state以外のcontract／progress／feedback／spec／guidance／manifestとgeneric fileは従来どおりstrictに除外する。
- public common runtimeの固定candidateと3 pathを明確にし、後続のprivate my-vault／Yasashiiが別々に適用・評価できる。

## Scope

### A. stateの構造化execution truth

1. `docs/sprints/state.md`からCurrent ID、Current status、Next Planned、該当Sprint table row、許可済みfallback sourceをboundedに抽出する。
2. state metadataとtable rowの構造を、履歴説明、inline code、fenced code、コメント、自由記述から分ける。非構造本文をCurrent／statusの根拠へ使わない。
3. stateのCurrent ID valid／TBD／missing／invalid、Next Planned、last recorded completion fallback、巨大state／section未解決の既存意味を維持する。
4. safe fallbackは`inferred=true`と根拠を保持し、invalid stateを完全Harnessへ昇格しない。filename辞書順／mtimeでCurrentを推測しない。
5. state構造を安全に取得できた範囲で、contract、progress、feedbackのrepo-relative locatorと4 role bundleを維持する。feedback不存在は`evaluation-not-yet-recorded`のままとする。

### B. 無害なSecret語彙の誤除外防止

1. credential field名、placeholder、伏字、環境変数参照、コード例、過去の検査説明があるだけでstate whole-fileを除外しない。
2. current public sourceの実stateを必須positiveとし、同じ無害な説明をYasashii相当fixtureの128 KiB枠内へ置いてCurrent／4 roleを確認する。
3. 特定の既知literal、特定行、現在のstate bytesだけを許可するexact allowlistに依存しない。複数のfield名、placeholder形式、inline／fenced code、説明文で意味境界を検査する。
4. 無害な非構造本文をcandidate title、summary、Evidence本文として採用しない。誤除外を防ぐことと本文を取り込むことを分ける。

### C. 実値らしいSecretの非露出

1. runtime生成のsynthetic Secret-like値を使い、実資格情報をfixture、tracked file、stdout、snapshot、feedbackへ保存しない。
2. Secret-like spanの値、周辺本文、伏字再掲、部分文字列をJSON、人間向け出力、error、summary、candidate、Evidenceへ出さない。
3. unredacted whole-file bytes、Secret span、Secret値を含むraw-content digestを外部へ返さない。低エントロピー候補を辞書照合できるdigestも禁止する。
4. 外部へ返す必要があるidentity／coverage digestは、redaction後の構造metadataと非機密locatorから決定的に得られ、Secret値の違いを漏らさない。
5. 構造metadataを安全に抽出できる場合はsourceを`redacted`／`partial`とし、理由とfield単位coverageを返す。構造field自体がunsafe／分断／範囲外ならそのfieldだけをunresolvedにし、値を補完しない。
6. Secret検査を無効化しない。state以外のauthoritative sourceとgeneric laneへstate専用例外を伝播させない。

### D. bounded placement／fallback

1. 無害説明とsynthetic Secret spanを128 KiB枠の先頭／中間／末尾、Current metadata／table rowの前後へ置く。
2. 範囲内の安全な構造は決定的に取得し、範囲外／分断fieldはpartial／uninspectedとする。完全coverageへ丸めない。
3. 巨大stateはper-file上限を拡大せず、既存bounded section contractを維持する。全履歴、全table、全feedbackを無制限に読まない。
4. valid／TBD／missing／invalid／fallback、feedback absentを、無害本文／Secret本文と組み合わせてもreasonとbundle意味を維持する。

### E. state以外と既存Clarity回帰

1. contract、progress、feedback、spec reference、AGENTS／CLAUDE、package manifest、generic fileのSecret-like contentは既存strict exclusionを維持する。
2. non-Harness Repoのgeneric候補、budget、順序、安全意味を変更しない。
3. state、requirements、Generator self-report、Evaluator validationの4 roleを混同せず、progressだけからPASSを推測しない。
4. Sprint 050 Patch 003のancestor alias／physical identity、root自身／root内symlink、差替え、containmentを回帰させない。
5. preview／cancelは`changed:false`で、filesystem、Clarity runtime、journal、Git、network、external provider write 0件とする。
6. dirty／staged／untracked、HEAD、branch、remote、external canaryを保持し、Xmind、connector、別Skillを暗黙実行しない。

### F. public common fixed candidateと3版境界

1. public common runtimeの固定面は少なくとも次の3 pathである。
   - `plugins/secretary/scripts/clarity.mjs`
   - `plugins/secretary/scripts/lib/clarity-core.mjs`
   - `plugins/secretary/scripts/lib/clarity-harness-scan.mjs`
2. public source、clean checkout、`.git`なしGit-freeで同じTarget意味と3 path identityを確認する。
3. public独立Evaluator PASS後だけ、candidate SHA、3 path digest、宣言済みcommon path、excluded／protected path、rollbackをhandoff入力にする。
4. downstream順序はprivate my-vault→Yasashiiとする。各repoは別Harness、別state、別contract、別Generator／Evaluatorで適用・評価する。
5. public PASSをprivate／Yasashii PASS、byte-sync完了、release-ready、installed、loadedへ昇格しない。本Patch中は実downstreamへwriteしない。

### G. Windows nativeとexternal live gate

1. current state positive、Secret negative、bounded placement、generic／4 role回帰をWindows native filesystem上でも実行する。
2. `.github/workflows/windows-recording-regression.yml`の既存`windows-native` job、Windows Server 2025、Node 22、既存0.9.2回帰、`timeout-minutes: 10`を維持する。
3. external writeは既存PR #11のbranch `codex/sprint-041-project-clarity`から既存`origin`同名branchへの通常pushと、そのcandidateに因果する既存Windows CIだけである。
4. workflow手動dispatch、force push、別branch／別remote、merge、release、tag、Marketplace、install、cache、live apply、実Xmind、実downstream writeを行わない。
5. CI未起動、認証／runner不能、timeoutは`windowsVerified=false`のverification未達、runner内candidate因果failureはproduct findingとして分ける。過去run／別SHAを流用しない。

## Feature／Caseの単一割当

- SR-001〜003、SR-006〜007、SR-010 → F81
- SR-004〜005 → F78
- SR-008 → F79
- SR-009 → F80

各Target Caseは`docs/spec/clarity-acceptance.md`の`patchCaseIds.sprint-050-patch-005`へ一度だけ現れ、
`patchCaseFeatureAssignments`でfeatureを一つだけ持つ。既存primary 250、CLX 20、XV 4、CF／AR 21、HS 16の
ID、意味、Severity、割当を変更しない。

## Acceptance Criteria

1. SR-001〜010が同一candidateで全件PASSし、Critical caseと本契約Acceptance Criteriaの未実行0件である。
2. current public sourceの実stateでCurrent ID、status、Next Planned、該当row、4 role、Current bundleが得られ、無害な履歴説明だけによるwhole-file除外0件である。
3. placeholder、inline／fenced code、過去説明、複数credential field名の無害positiveで、exact文字列allowlistなしに同じ構造結果を返す。
4. runtime synthetic Secret negativeで、値、断片、周辺本文、error、summary、candidate、Evidence、raw-content digestへの露出0件である。
5. Secret値だけを変えた同一構造fixtureで、外部へ返すsanitized identity／coverageが値を辞書照合できる差を持たず、同じ構造metadataへ決定的に収束する。
6. state内Secret spanは`redacted`／`partial`と理由を返し、安全なCurrent／4 roleを保持する。構造field自体がunsafeなら該当fieldだけunresolvedとし、Current／PASSを推測しない。
7. state以外のauthoritative sourceとgeneric sourceは既存strict Secret exclusionを維持し、本文・値・symlink先を読まない。
8. Yasashii相当の128 KiB内配置、巨大state、valid／TBD／missing／invalid／fallback、feedback absentがbounded readと固有reasonを維持する。
9. non-Harness generic scan、4 role意味分離、Sprint 041／047／049／050 Patch 003／004、ancestor alias、Secret／path／inventoryが0 product FAILである。
10. preview／cancelは`changed:false`、filesystem／Clarity runtime／journal／Git／network／external provider write 0件で、dirty／staged／untracked、HEAD、branch、remote、canaryが不変である。
11. public source、clean checkout、Git-freeでTarget結果とcandidate bundle意味が一致し、3 common runtime pathとcandidate identityを固定できる。
12. Target registryはPatch case合計47、SR 10、duplicate／missing／extra 0、feature割当各1件を機械確認する。
13. Windows Server 2025／Node 22の因果的runでSR Target、HS／portable path、既存0.9.2回帰が0 FAILとなり、`timeout-minutes: 10`を維持する。
14. public candidateの独立Evaluator PASS前にhandoff readyを発行せず、private my-vault／YasashiiのPASS、release、installed、loadedを表示しない。
15. external writeは既存PR #11同一branchへの通常pushと因果Windows CIだけで、manual dispatch、merge、release、tag、Marketplace、install、cache、live apply、実Xmind、downstream writeは0件である。

## 必須negative control／fixture

- current public sourceの実stateと、同じ無害な履歴説明を持つYasashii相当state。
- credential field名だけ、`<literal>`、環境変数placeholder、伏字、inline code、fenced code、過去説明を個別に持つstate。
- runtimeでのみ組み立てるsynthetic high-entropy／low-entropy Secret-like値。tracked sourceと証跡には実値を残さない。
- Secret値だけを複数候補へ変えた同一構造stateと、返却digest／candidate／Evidenceの辞書照合negative。
- Secret spanがCurrent metadata／table rowの前後、128 KiB枠の先頭／中間／末尾にあるstate。
- valid／TBD／missing／invalid／unsafe Current、Next Planned、last completion fallback、feedback absent、巨大state／section分断。
- contract／progress／feedback／spec／guidance／manifest／generic fileのstrict exclusion negative。
- source checkout、clean checkout、Git-free、ancestor alias／physical、non-Harness、dirty／staged／untracked、preview／cancel。
- Windows nativeのcurrent state、CRLF、bounded placement、existing HS／0.9.2回帰。
- 別SHA／過去run／manual dispatchを因果Windows CIとして採用する誤実装。

各negativeは期待coverage／reason、構造field、PASS／FAIL／NOT-RUN、canary non-occurrence、`changed:false`、
filesystem／Git／network／external operation 0を持つ。Secret実値、raw-content digest、固定summary文字列scanだけで合格させない。

## Verification scope（着手時に固定）

- SR-001〜007はOS一時directoryのsynthetic Harness Repoとcurrent public sourceのread-only scanで実行し、構造field、coverage、redaction、candidate bundle、tree／Git digestを記録する。
- SR-008はpublic source／clean checkout／Git-freeから3 common path digestとcandidate identityを得る。実downstreamへwriteせず、handoff order／scope／protected boundaryだけを検査する。
- SR-009はTargetとSprint 041／047／049／050 Patch 003／004、generic、ancestor alias、inventory、Git-freeを同一candidateで実行する。既存safe harborを新collectorへ置き換えない。
- SR-010は既存PR #11の因果的Windows CIで実行する。Windows専用結果をmacOS fixtureへ流用せず、manual workflow dispatchは行わない。
- Secret canaryはruntime memory内で生成・照合し、値とraw hashをtracked file／stdout／feedbackへ残さない。

### Evidence safe harbor

- case ID、fixture class、OS／Node、command、exit、PASS／FAIL／NOT-RUN、reason。
- Current ID／status／Next Planned／table row、fallback source、4 role、bundle／candidate ID、coverage／redaction reason。
- canary非露出結果、sanitized structure digest、同一構造rerun digest。Secret値、断片、raw-content digestは記録しない。
- authoritative／generic lane limits、used bytes／files／entries、inspected／excluded／uninspected／not-found／redacted、partial reason。
- before／after filesystem tree、Git worktree／index／HEAD／branch／remote、external canary、network／external operation log。
- public candidate SHA、3 common path digests、handoff scope／order／protected boundary、downstream write 0。
- Windows workflow／job／run、candidate SHA、OS／Node、command、Target／0.9.2 totals、external operation境界。

上記で十分とする。Secret実値、raw digest、新しいcollector、統一attestation、実顧客data、実downstream write、
merge／release／tag／Marketplace／install／cache／live apply／実Xmindを追加条件にしない。

## Non-scope

- Secret検査の無効化、特定placeholder／現在state bytesのexact allowlist、任意Markdown／任意言語の万能Secret parser。
- state本文全文のcandidate／Evidence化、全履歴／全table／全feedbackの読込、global／per-file上限の撤廃。
- state以外のauthoritative source／generic sourceのSecret exclusion緩和。
- 実資格情報、実顧客Repoへのapply、実利用者workspace／Mac miniへのwrite。
- private my-vault／Yasashii source、state、spec、progress、feedbackの変更または同期実行。
- downstream adaptation、独立評価、release、tag、GitHub Release、Marketplace、installed cache、new session、loaded version。
- PR #11のmerge、別branch／remote、manual workflow dispatch、force push、remote変更。
- 実Xmind MCP、local `.xmind` apply、connector、network provider、credit／課金。
- 既存Project Clarity case／Feature／rubric閾値の緩和または再割当。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更file、state構造／redaction境界、Target／negative結果、
public source／clean／Git-free、関連回帰、Windows待ち、candidate identity、external write境界を記録する。
独立Evaluatorは同じcandidateと因果Windows runを実操作し、C1、C2、C5、C6、C19、C20、C24、C26を採点する。
Target／Acceptance Criteria／ゼロ許容基準の未達が1件でもあればPASSにしない。

Evaluator PASS後も、本Patchが意味するのはpublic source candidateの合格だけである。Orchestratorが`docs/sprints/state.md`へ
結果を記録するまで完了扱いにせず、private my-vault／Yasashiiへの同期・評価、merge、release、install、cache、live applyへ進まない。
