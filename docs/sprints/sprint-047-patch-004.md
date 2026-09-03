# Sprint 047 Patch 004 — Git config binding・root変更error非露出・Windows identity精度

- Type: regular patch
- Risk: high（Clarity全root入口のGit config、physical root／alias／Git filesystem identity、CLI／Hook error、Windows native gateに関わるため）
- Base Sprint: `sprint-047`
- 依存: `sprint-047-patch-003` done
- 対象機能: F78
- 直接回帰Case: `GS-009`、`GS-010`（既存ID、意味、Severity、初回割当を変更しない）
- 関連rubric: C1、C2、C3、C5、C6、C19、C21、C24（既存thresholdを維持）
- Findings: REPRODUCED R4、REPRODUCED P3-1、CODE-CONFIRMED P3-2
- 主眼: Repo-local Git configを観測した実体とbytesへ安全に束縛し、root変更errorから端末固有pathを除き、Windowsの64-bit filesystem identityを精度損失なく保持する。

## 背景と通常Patch判定

Patch 002／003後の独立確認で、次の3点が残っている。

1. **R4（再現済み）**: common Git configとworktree固有`config.worktree`はdigest対象だが、symlinkやGitの`include`／`includeIf`を安全に束縛した入力として扱えない。参照先や有効設定が観測外で変わり得るため、現在の対応範囲では成功させず、canonical／runtime／Gitへのwrite前にfail closedとする必要がある。
2. **P3-1（再現済み）**: `clarity-root-changed`のerror detailsがprevious／current physical rootのabsolute pathを持ち、CLIのstderr JSONへ出る。停止理由と`changed:false`は維持しつつ、stdout、stderr、canonical、runtime、tracked artifactへ端末固有pathを出さない必要がある。
3. **P3-2（code-confirmed）**: root resolverのfilesystem identity取得がNodeの既定Number表現を経由するため、Windowsが返し得る64-bit `dev`／`ino`を文字列化する前に精度を失う可能性がある。比較意味を変えず、精度を保ったまま安定してserializeできる観測値にする必要がある。

これらはGit／filesystemの共通安全境界、CLI／Hook、Windows実runを横断する。既存の単一bounded Git probe、Patch 001のlogical write、Patch 003のState oracleを同時に回帰確認するため、microではなく通常のhigh-risk Patchとする。

ユーザーは本Patchをこの範囲で進めることを明示済みである。未指定の実装詳細は、既存の安全境界と回帰を変えない最小変更を前提とする。

## 外から見える成果

- 対応外のRepo-local Git config形態は、Clarity dataやGitを変更する前に、端末固有pathを出さない理由付きerrorで停止する。
- 通常のregular configを使うRepoは従来どおり利用でき、観測後の直接的なconfig bytes変更は次のwrite前に検出される。
- root、ancestor alias、Git top-level、Git dir、common Git dirの同一／相違判定は、Windowsの64-bit identityでも精度を失わない。
- CLIとHookは、root変更を`changed:false`のまま利用者に分かる形で返すが、旧・新physical rootをstdout／stderr／保存物へ出さない。
- PR #11が新規に持ち込んだ端末固有absolute pathだけをsemantic placeholderへ置き換え、過去履歴全体は書き換えない。

## Scope

### A. Repo-local Git configのfail-closed binding

1. Git identityに使う`<common-git-dir>/config`と`<git-dir>/config.worktree`は、存在しない場合と、安全な通常fileである場合を区別する。
2. どちらかがsymlinkなら、参照先が存在するsymlink／broken symlinkの双方を対応外として拒否する。参照先を追って対応済み扱いにせず、canonical、runtime、tracked artifact、Gitへのwrite前に停止する。
3. 通常fileにGitの`include`または`includeIf`設定がある場合も、include先や条件付きorigin chainを解決したと推測せず拒否する。拒否はcommon configと`config.worktree`の両方へ同じ意味で適用する。
4. 本Patchではrecursive include parser、`--show-origin` chainの完全な解決、symlink configの追跡と再束縛を実装しない。これらの形態を安全にsupportするのではなく、理由付きでfail closedにする。
5. includeを持たない通常のregular configは従来どおり利用できる。観測対象fileのbytesまたはfilesystem identityが次の重要write境界までに変わった場合は、古い有効設定を再利用せず`clarity-root-changed`として停止する。
6. supported RepoのGit identity discoveryは、既存の1 requestあたり1回、5秒bounded、read-onlyの単一Git probeを維持する。Git prompt、credential取得、network、fetch／pull、providerを追加しない。

### B. `clarity-root-changed`のpath非露出

1. previous／current physical rootその他のabsolute local pathを、`clarity-root-changed`のmessage、details、next action、stdout、stderrへ含めない。
2. error code、何が変わったかを区別できるsanitized reason、`changed:false`、安全に再確認して再実行するための短い案内は維持する。pathを削っただけの空・曖昧なerrorへしない。
3. CLIのJSON errorと、Claude Code／Codex Hookのdegraded responseを個別に検査する。Hookは内部error objectをそのままserializeせず、既存のmanual fallbackを維持する。
4. 拒否時は`.clarity/**` canonical／runtime、test evidence、tracked artifact、Git index／worktree／historyへprevious／current physical rootを保存しない。
5. alias target変更、physical root差替え、Repo／Git config identity変更の各経路で同じprivacy境界を適用する。別error codeのpath fieldを広く削る一般的なerror schema再設計には拡張しない。

### C. Windows 64-bit filesystem identity

1. physical root、ancestor aliasのlink／target、Git top-level、Git dir、common Git dir、Git marker／config、およびRepo／Git identityを支えるfilesystem観測は、`dev`／`ino`をNumberへ狭める前の精度で取得・比較する。
2. 観測dataはJSON等へ安定してserializeでき、同じidentityは決定的に同じ表現、異なる64-bit identityは異なる表現になる。raw BigIntのままJSON serializeを失敗させない。
3. `mode`、file kind、directory確認、zero／取得不能時のfail-closed、alias／physical同一判定、worktree／common Git dir関係、case-foldや文字列prefixへ頼らない既存意味を維持する。
4. `Number.MAX_SAFE_INTEGER`を超え、Number変換では同値へ丸まり得る2つの`dev`／`ino`を使う決定的proofで、同一identityの安定serializeと異なるidentityの変更検知を示す。実filesystemが偶然大きなinodeを返すことへ依存しない。

### D. PR #11の限定privacy cleanup

1. PR #11が新規に導入したtracked textだけを差分根拠に調べ、その中の利用者home、workspace alias、physical volume、temporary root等のabsolute local machine pathをsemantic placeholderへ置き換える。
2. placeholderは`<workspace-alias>`、`<external-volume-workspace>`、`<temporary-repo>`等、証拠の役割とalias→physicalの関係が分かる表現にする。pathを消して検証意味を失わせない。
3. 既存履歴全体の一括置換、PR #11より前から存在するpathの整理、GitHub owner／repository URL、MIT表示、version、case ID、run／job ID等の配布・監査識別情報の匿名化は行わない。
4. canonical file ownershipを維持し、Planner／Generator／Evaluator／Orchestratorが各自の所有文書だけを直す。各roleは他roleの履歴文書を一括編集しない。

### E. public-firstと比例した検証

1. public sourceで本Patchを実装し、fresh独立Evaluatorが同一candidateをPASSするまでprivate my-vault／Yasashiiへwriteしない。
2. 検証はconfig形態と変更、path非露出、identity精度のfocused正負例、既存Patch 001／002／003、Sprint 047、root／alias、inventory、exact candidateの既存Windows gateに限定する。
3. `.github/workflows/windows-recording-regression.yml`の既存`windows-native` job、Windows Server 2025、Node 22、`timeout-minutes: 10`を維持する。新job／新collectorを作らず、同job内で本Patchのfocused checkと既存因果stepsを実行する。
4. external liveとして許されるのは、既存PR #11の同じcandidate branchへの通常pushと、そのexact candidateに因果する既存Windows CI／必要時workflow dispatchだけである。force push、remote変更、別branch、merge、release、install、downstream writeへ拡張しない。
5. offline product／fixtureはnetwork、prompt、credential callを0件に保つ。前項のGitHub gateを、製品runtimeにnetwork／credential処理を追加する根拠にしない。

## Acceptance Criteria

1. common configと`config.worktree`の各file位置で、通常targetを指すsymlinkとbroken symlinkをfocused negativeとして個別に実行し、全て理由付き非0／`changed:false`でfail closedになる。参照先本文を安全なregular configとして採用しない。
2. common configと`config.worktree`の各file位置で、通常fileにあるGitの`include`と`includeIf`をfocused negativeとして個別に実行し、全てorigin chain未対応の理由付き非0／`changed:false`でfail closedになる。include先の存在／不在や条件一致を成功へ丸めない。
3. includeを持たない通常のcommon config／`config.worktree`は利用可能で、supported Git Repoのidentityを従来どおり返す。同じrequestのGit probeは1回、timeoutは5,000 msのままである。
4. supported regular configを観測後に、有効設定へ影響するconfig bytesを直接変更するnegativeで、次のcanonical／runtime write前に`clarity-root-changed`を返す。staleな観測で成功せず、同じlogical writeの重複0件である。
5. AC1、AC2、AC4の各negativeは、fixture準備と意図的config変更を完了した時点をClarity実行前snapshotとし、実行後のcanonical、runtime、tracked artifact、filesystem canary、Git worktree／index／HEAD／branch／remote／config snapshotと比較する。Clarity実行による製品write、追加のGit／config write、lock／temp residueが0件である。
6. alias target変更、physical root差替え、Repo／Git config identity変更のCLI実行で、stdout／stderr、error JSONのmessage／details／next action、canonical／runtime／tracked artifactにprevious／currentのabsolute path canaryが0件である。error code、sanitized reason、`changed:false`は残る。
7. Claude Code／Codex Hookの同じroot変更fixtureは、既存degraded／manual fallbackを返し、stdout／stderr、Hook JSON、canonical／runtime／tracked artifactへabsolute path canaryを出さない。Hook失敗を成功・verifiedに表示しない。
8. root、ancestor alias link／target、Git top-level、Git dir、common Git dir、Git marker／configのfilesystem identityは64-bit `dev`／`ino`を精度損失なく比較し、安定してserializeできる。`Number.MAX_SAFE_INTEGER`超でNumber変換時に衝突し得る決定的な2 identityが区別され、identity変更はwrite前に検出される。
9. identity hardening後も、alias／physical pathは同じ実体なら同じRepo identityを返す。異なるroot／alias／Git identity、zeroまたは取得不能、root自身／root内symlink、junction、broken／file向きaliasは既存どおりfail closedである。
10. PR #11で新規に導入されたabsolute local machine pathだけがsemantic placeholderへ置き換わり、alias→physical、fixture、証拠の意味を維持する。対象外の履歴、配布識別情報、case／run情報に広い置換差分がない。
11. 既存`sprint-047-patch-001`は23／23、`sprint-047-patch-002`は12／12、`sprint-047-patch-003`のrepair前full-State oracle／決定的negative／rebuild no-opはPASSし、Sprint 047は25／25、root／alias回帰は21／21、inventoryは20 surface／67 caseで0 FAILである。
12. exact candidateを既存`windows-native` jobでWindows Server 2025／Node 22へ実行し、本Patchfocused checkとAC11の既存因果stepsが0 FAILである。`GS-009`は3 roundそれぞれHook 32＋CLI 32の64／64、parse／unique／delta／pre-rebuild full-State／rebuild 100%、residue 0を維持する。
13. AC12のWindows runはmax lock wait <15秒、max lease <30秒、job <10分で各marginが正である。process／round／stepの削減、stagger／batch／prewarm、5秒Git probe・15秒lock wait・30秒lease・10分job上限の延長、threshold緩和が0件である。
14. product／test codeに新しいnetwork、Git prompt、credential取得、fetch／pull、provider callが0件で、offline fixtureのexternal writeは0件である。Windows external liveはAC12のexact candidateに因果する既存gateだけに限定される。
15. fresh独立Evaluatorが同一candidateのfocused negative／positive、before／after snapshot、privacy scan、deterministic identity proof、ローカル回帰、Windows raw resultを確認し、C1、C2、C3、C5、C6、C19、C21、C24を既存threshold以上、ゼロ許容軸を5／5、product finding 0、Acceptance Criteria未達0とした場合だけPASSである。
16. public PASS前のprivate my-vault／Yasashii write、merge、release、tag、GitHub Release、Marketplace、install／update、cache、loaded version、実利用者root／live workspace、実Xmind、connector external writeが0件である。

## 禁止する解き方

- symlink configの参照先を追うだけ、またはinclude／includeIfを無視してsupported regular configとして扱う。
- recursive include parser、完全なorigin-chain supportを本Patchへ持ち込む。
- configのidentity／bytes変更を古いdigest、request外cache、blind retryで成功へ戻す。
- pathを伏せるためにerror code、`changed:false`、利用者が再確認できる理由まで削る。
- `dev`／`ino`をNumberへ変換してから文字列化する、case-fold／realpath文字列だけでidentityを代替する。
- `refreshClarityRootAfterOwnedReplacement`へ`rootIdentity`比較を追加する。
- 因果証拠なしにcanonical lock polling、poll間隔、lock／lease設計を最適化する。
- process／round／step／thresholdを減らす、または5秒／15秒／30秒／10分の上限を延長する。
- 新collector、統一schema／attestation、全master／全履歴再実行を追加する。
- PR #11の差分を越えてabsolute path履歴を広く置換する。
- private my-vault／Yasashiiを同期・評価する。
- merge、release、tag、GitHub Release、Marketplace、install／update、cache、loaded session、実利用者root／live workspace、実Xmindを操作する。

## Verification scope（着手時に固定）

- **Config focused matrix**: common config／`config.worktree` × symlink／broken symlink／`include`／`includeIf`、supported regular config、観測後のeffective config bytes変更を一時Git Repo／worktreeで実行する。
- **Privacy matrix**: alias target変更、physical root差替え、Git config identity変更をCLIとClaude Code／Codex Hookで実行し、absolute path canaryのstdout／stderr／artifact非出現と`changed:false`を確認する。
- **Identity matrix**: root、alias link／target、Git top／dir／common dirで同一、相違、zero／取得不能、`Number.MAX_SAFE_INTEGER`超の衝突候補を決定的に比較し、serializeの安定性を確認する。
- **Regression**: Patch 001／002／003、Sprint 047、Sprint 050 Patch 003のroot／alias、inventoryを既存commandと意味のまま実行する。
- **Windows causal**: existing PR #11 exact candidateを既存`windows-native`、Windows Server 2025／Node 22へ通し、3 round×64、5秒／15秒／30秒／10分を変更せず確認する。
- **Evaluator**: fresh独立Evaluatorが実diff、実command、before／after snapshot、Windows raw resultを確認する。UI差分はなくbrowser／DOM／screenshotは非適用。

### Evidence safe harbor

- 40桁candidate SHA、変更path、PR／workflow／run／job ID、OS／Node、command、exit、case summary。
- configの位置とclass（common／worktree、missing／regular／symlink／broken／include／includeIf）、期待／観測error code、probe回数、timeout。absolute local path、include先本文、Secret値は記録しない。
- before／after canonical／runtime／tracked artifact／filesystem canary／Git snapshot、write件数、lock／temp residue。
- privacy canaryのstdout／stderr／Hook JSON／artifact非出現、sanitized reason、`changed:false`。
- 64-bit identityの同一／相違判定、stable serialized representation、Number変換なら衝突するnegativeの検出結果。実利用者pathやraw BigInt objectのdumpは不要。
- Patch 001／002／003、Sprint 047、root／alias、inventoryのsummaryと、Windows各roundの64 process、parse／unique／delta／full-State／rebuild／residue、max wait／15秒、max lease／30秒、job時間／10分のmargin。
- network／prompt／credential／external write 0、public／downstream write 0、限定privacy cleanupの対象fileと置換数。

上記で十分とする。新しいcollector、統一schema／attestation、追加の証拠format、実顧客data、実downstream write、release／install、全master／深い履歴chainを合格条件にしない。

## Non-scope

- recursiveなGit config include／includeIf parser、origin chain解決、symlink configの安全なsupport。
- `refreshClarityRootAfterOwnedReplacement`への`rootIdentity`比較追加。
- 因果証拠のないlock polling最適化、lock／lease／logical write設計の変更。
- rubric、Case registry、GS-009／GS-010の意味・Severity・初回割当、process／round／time thresholdの変更・緩和。
- PR #11より前を含む広範なhistorical path cleanup。
- private my-vault／Yasashiiの同期、spec／state／source／評価。
- merge、release、tag、GitHub Release、Marketplace、install／update、cache、loaded version、実利用者root／live workspace、実Xmind。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更path、config focused matrix、privacy scan、identity precision proof、
before／after snapshot、既存回帰、exact candidate、Windows因果run、threshold margin、外部操作、既知残余を記録する。

fresh独立Evaluatorは同一candidateで本Acceptance Criteriaと指定rubricを評価し、product findingと
verification-infra findingを分ける。public PASSとOrchestratorのstate更新後だけ、別Harnessでdownstreamを判断できる。
