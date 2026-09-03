# Sprint 050 Patch 007 — Windows更新rootの物理directory identity判定

- Type: micro
- Risk: high（更新開始前のworkspace／Git安全境界とWindows native path identityに触れるため）
- Base Sprint: `sprint-050`
- 依存: `sprint-050-patch-006` done
- 対象機能: F30、F31、F58
- 主眼: Windowsが同じGit rootを8.3短縮pathと長いpathで表した場合だけ、文字列表記の差を安全な物理directory identityで吸収し、更新の既存安全境界を変えずに誤拒否を解消する。

## 背景とmicro判定

private my-vaultのWindows native run `33716116328`／job `100525538259`では、Clarity、Harness scanner、
conversation migrationの先行stepがすべて通った後、既存`scripts/sprint-032-update-gate-test.mjs`が
`SPRINT032_RELEASE_PASS=13 SPRINT032_RELEASE_FAIL=2`となった。同一版停止とdowngrade停止の2 caseは、
`update-apply.mjs`がworkspaceの8.3短縮pathと`git rev-parse --show-toplevel`の長いpathを文字列比較し、
同じ物理Git rootを別rootと誤判定したため、更新開始前に拒否された。

Clarityでは同じWindows表記差について、双方が通常directoryであり、0ではないfilesystem identity
（`dev`／`ino`）が完全一致する場合だけ同じ物理directoryとして扱い、識別不能ならfail closedとする意味が
既にWindows評価されている。本Patchはこの意味を更新のworkspace root確認1 flowへ限定して適用する。
更新内容、migration、rollback、同意、edition、配布物、Clarity／Xmindの製品動作は変えないため`Type: micro`とする。

## 外から見える成果

- Windowsの通常workspaceで、同一Git rootの8.3短縮path／長いpathという表記差だけを理由に更新診断・停止確認が誤拒否されない。
- 異なるrootや安全に同一性を証明できないpathは、従来どおり更新を開始せず副作用0件で停止する。
- 同一版とdowngradeは、root確認を通過した後も既存契約どおりplugin、workspace、Git、設定、ledger、migrationへ副作用0件で停止する。

## Scope

### A. 同一物理Git rootの限定受理

1. 安全確認済みworkspaceとGitが返すtop-levelの双方が実在する通常directoryで、各directoryの0ではない
   filesystem identityが完全一致する場合だけ、path文字列が異なっても同じGit rootとして受理する。
2. 大文字小文字変換、文字列の前方一致、separator置換、basename、host固有pathのallowlistだけから同一rootを推測しない。
3. identityは更新開始時の現在状態から取得し、実際の更新writeへ進む場合は既存の保護・critical section内で
   同じ安全条件を再確認する。確認後の差替えやidentity変化を古い観測で通さない。

### B. fail-closed安全境界

1. 別directory、親／子／前方一致だけの別root、0または取得不能のidentity、非directory、missing、unreadable、
   malformed／複数行Git出力、Git非0／timeoutは同一rootとして扱わない。
2. workspace自体または途中componentのsymlink、外向きsymlink／junction、root外escape、path traversal、
   Git管理領域のsymlink／unsafe状態をWindows対応のために許可しない。
3. 拒否はplugin、workspace、Git、session、backup、ledger、migrationへ副作用を出す前に行い、成功や更新済みと表示しない。
4. local root確認のためにnetwork、credential prompt、fetch／pull、remote providerを起動しない。Secret、credential、
   absolute local pathをtracked artifactや評価記録へ追加露出しない。

### C. 更新契約と無回帰

1. F30／F31の診断と実行の分離、明示同意、edition衝突停止、managed path、保護commit、dry-run、
   atomic migration、rollback、rerunの冪等性、push禁止を変更しない。
2. 同一版とdowngradeの停止理由・戻り値・副作用0件を変更しない。
3. 公開`0.7.0`の旧scanner blocker、release履歴、version／manifest／CHANGELOG、既存fixtureの期待値を
   修正済みやlive update対応済みへ書き換えない。
4. Clarityのroot resolver、ancestor alias、Hook、scanner、link、projection、Xmind provider／承認境界、
   projects／memory／TODO／settings／文書保存の動作を変更しない。

### D. public-firstと比例した検証

1. public sourceでfocused正負回帰と既存Sprint 032回帰を実行し、同じcandidateをWindows nativeで検証する。
2. Windows nativeでは既存`scripts/sprint-032-update-gate-test.mjs`を弱めず、
   `SPRINT032_RELEASE_PASS=15 SPRINT032_RELEASE_FAIL=0`にする。別OSのWindows風文字列fixtureだけを
   Windows PASSへ昇格しない。
3. private my-vaultの`Sprint 050 Patch 005 10/10`はpublic PASS後に固定candidateを渡した別Harnessの
   downstream確認であり、本public PatchのPASSへ流用・先取りしない。Yasashiiも同様に別評価する。
4. 検証は更新root identityのfocused test、Sprint 032、同じWindows job内の既存関連stepへ限定し、
   新しいcollector、統一attestation、全master、release／install／cache／live workspaceを追加条件にしない。

## Acceptance Criteria

1. Windows nativeで、同じ通常directoryを示す8.3短縮workspace pathと長いGit top-level pathをfocused positiveが通り、
   実際に取得した0ではないfilesystem identityの完全一致を根拠に同一Git rootと判定する。
2. focused negativeで、異なるroot、親／子root、prefix sibling、identity 0、identity取得不能、非directory、
   missing／unreadable、identity差替えを個別に拒否し、workspace／Git／session／backup／ledger／migrationへの副作用が0件である。
3. symlink／junction、root外escape、path traversal、unsafe Git directory、malformed／複数行Git出力、Git非0／timeoutの
   既存拒否を維持し、文字列正規化やcase-foldだけで受理するcaseが0件である。
4. 同一版とdowngradeを含む`scripts/sprint-032-update-gate-test.mjs`がWindows nativeで
   `15 PASS / 0 FAIL`となり、両停止caseのplugin、workspace、Git、設定、ledger、migration副作用が0件である。
5. 同じcandidateのPOSIX focused回帰とSprint 032回帰が0 FAILで、正常な同一root、別root拒否、
   公開0.7.0 blocker、release履歴の既存意味を維持する。
6. 更新の明示同意、edition、managed path、保護commit、dry-run、atomic migration、rollback、rerun、push禁止、
   Secret非露出の関連回帰が0 product FAILである。
7. `.github/workflows/windows-recording-regression.yml`は`windows-native`、Windows Server 2025、Node 22、
   `timeout-minutes: 10`を維持し、exact candidateでfocused testとSprint 032を因果的に実行する。
8. 前項のWindows runでfocused testとSprint 032が0 FAILとなり、既存Clarity／Harness scanner／conversation migration／
   logical-write／concurrency／root identity stepも0 product FAILである。test除外、SKIPへの変更、threshold緩和は0件である。
9. product変更は更新root判定に必要な最小範囲、test／workflow変更は本Patchのfocused回帰接続に限定され、
   Clarity／Xmindと無関係な製品bytes、version、manifest、migration metadata、release artifactを変更していない。
10. fresh独立Evaluatorが同一candidate、focused正負例、Sprint 032、Windows raw logを確認し、C1、C2、C3、C5、C6、C10を
    既存threshold以上、ゼロ許容軸を5／5、product finding 0、Acceptance Criteria未達0とした場合だけPASSである。
11. public PASS前のprivate my-vault／Yasashii source write、merge、release、tag、GitHub Release、Marketplace、
    plugin install／update、cache、loaded version、live workspace、実Xmind、connector external writeが0件である。

## 禁止する解き方

- `resolve()`／`realpath()`後の文字列一致、case-fold、separator置換、prefix、basename、host固有pathだけで安全を推測する。
- identityが0／取得不能、非directory、別root、差替えを成功扱いする、またはnegativeをSKIPへ変える。
- `workingRoot()`、symlink／junction、Git directory、consent、edition、rollback、Secret、pushのguardを緩める。
- Sprint 032のcase、assert、fixture、PASS数を削る、失敗caseをoptional化する、timeoutを伸ばすだけで通す。
- Clarity coreへ更新固有処理を持ち込む、またはClarity／Xmindの既存root policyを本Patchのために変更する。
- private downstreamだけを直し、public common update runtimeの同じ欠陥を残す。

## Verification scope（着手時に固定）

- Focused update root identity: 同一物理directoryの表記差positive、別root／zero・unavailable identity／非directory／
  差替え／symlink・junction／Git出力異常のnegative、全副作用before／after。
- Existing update regression: `scripts/sprint-032-update-gate-test.mjs`と`scripts/sprint-032-regression.sh`。
- Windows causal: 既存`windows-native` jobでfocused test、Sprint 032、既存関連stepを同一candidateから実行する。
- Evaluator: fresh独立Evaluatorが実command、candidate SHA、Windows raw resultを確認する。
  UI差分はなくbrowser／DOM／screenshotは非適用。

### Evidence safe harbor

- 40桁candidate SHA、workflow／run／job ID、OS／Node、実行command、exit、PASS／FAIL／NOT-RUN理由。
- focused caseごとのroot class、identity available／nonzero／match、期待／観測結果、before／afterのfilesystem・Git要約。
  実absolute path、`dev`／`ino`の実値、Secret値は記録しない。
- Sprint 032の`15/0`、同一版／downgrade副作用0、既存Windows関連stepのsummary、network／prompt／external write 0。
- public／private／Yasashii、source／release／installed／loadedの状態分離。

上記で十分とする。新しいcollector、統一schema／attestation、全master、実顧客Repo、実downstream、
release／install／cache／live workspace／実Xmind／connectorを合格条件にしない。

## Non-scope

- 更新処理全体、共通filesystem library、Git discovery全般、Clarity root resolverの再設計。
- version、manifest、CHANGELOG、migration metadata、edition契約、release artifactの変更。
- private my-vault／Yasashiiのsource、spec、state、progress、feedback、独立評価。
- merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache、loaded version、live workspace、実Xmind、connector。

## External live gate

許可するexternal writeは、既存PR #11の同一branch `codex/sprint-041-project-clarity`を既存`origin`へ通常pushし、
そのexact candidateに因果する既存Windows CIを起動することだけである。force push、manual workflow dispatch、別branch／remote、
merge、release、tag、GitHub Release、Marketplace、install／cache、downstream writeは行わない。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更file、focused正負例、Sprint 032の15／0、POSIX結果、
Windows因果run、exact candidate、更新／Git／network／external operation境界、既知残余を記録する。

fresh独立Evaluatorは同一candidateで本Acceptance Criteriaと指定rubricを評価し、製品findingとverification-infra findingを分ける。
public PASSとOrchestratorのstate更新後だけ、固定candidateをprivate my-vault、次にYasashiiの別Harnessへ渡せる。
