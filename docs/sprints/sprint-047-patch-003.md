# Sprint 047 Patch 003 — GS-009のState oracleを修復前比較へ固定

- Type: regular patch（verification-only）
- Risk: medium（Critical caseの偽陽性を防ぐが、製品code・製品仕様・実行thresholdは変更しない）
- Base Sprint: `sprint-047`
- 依存: `sprint-047-patch-002` done
- 対象機能: F78
- 直接回帰Case: `GS-009`（既存ID、意味、Severity、初回割当を維持）
- Finding: `docs/feedback/sprint-047-patch-002.md` の Minor V-01

## 背景と通常Patch判定

現在の`GS-009`は並行writer完了後、write付き`clarity rebuild`を先に実行し、修復後の
`source.eventCount`だけを比較する。そのため、writer直後のstored `.clarity/state.json`がEvent／Evidenceと
内容不一致でも、rebuildが修復した後だけを見てgreenにできる。

Patch 002のfresh Evaluatorは、このgapを独立negativeで再現し、製品不具合ではない
`verification-infra`のnonblocking findingとして本Patchへ分離した。本Patchは既存Critical caseの合否因果を
変えるためmicroにせず、製品変更0の通常Patchとして最小で閉じる。

## 成果

- 各`GS-009` roundで、全writer完了直後かつwrite付きrebuildより前のstored Stateが、同じEvent／Evidenceから
  読み取り専用で再構築したState全体と一致しなければ、そのroundをFAILにする。
- `eventCount`が同じでも別field／内容が不一致なStateを、write付きrepairの前に決定的に検出する。
- 一致後の既存明示rebuildは残し、正常時は`changed: false`かつState bytesが変わらないことを確認する。

## Scope

### A. writer直後のread-only full-State oracle

1. `GS-009`の各roundで、Hook 32＋CLI 32の全64 process終了、JSON parse、ID unique、期待delta、
   residue-before確認の後、write付きrebuildより前にstored `.clarity/state.json`を取得する。
2. 同じ時点のcanonical Project／Event／Evidenceから、製品のread-only rebuild面
   `rebuildState(root, { write: false })`相当で期待Stateを生成する。
3. 比較対象は`source.eventCount`だけでなく、canonical serializerと同じ正規化を通したState全体とする。
   `items`、Decision／Execution、Evidence参照、source metadataその他のState fieldを省略しない。
4. read-only oracle自身のcanonical、lock、temp、runtime、Git、network、stdout用artifactへのwriteは0件とする。
5. 不一致をwrite付きrebuildで修復してからgreenへ戻さず、そのroundの原因がrepair前のState不一致だと分かるassertで停止する。

### B. 見逃しを固定する決定的negative

1. stored Stateの`source.eventCount`は正しい値のまま、別のState fieldまたは内容だけを決定的に不一致にする。
2. 旧順序ならwrite付きrebuildが不一致を修復し、その後のeventCount比較だけではgreenになり得ることを示す。
3. 新oracleは同じfixtureをwrite付きrebuildより前のfull-State比較でFAILとして検出する。
4. negativeは製品codeへのtest seam、専用成功分岐、sleep／timing、Windowsだけの偶然に依存しない。
5. fixtureは一時rootだけを変更し、実Repo、製品canonical、利用者Git状態を変更しない。

### C. 既存rebuildとWindows因果の維持

1. full-State一致後の既存write付き`clarity rebuild`を削除しない。
2. 正常なwriter結果では、明示rebuildが`changed: false`で、rebuild前後のstored State bytesが同一であることを確認する。
3. 既存のState rebuild 100%、Event ID unique、期待Event件数、residue 0、lock／lease観測を維持する。
4. Windows Server 2025／Node 22の同一jobで、3 round×（Hook 32＋CLI 32）を各round 64／64のまま実行する。
5. lock wait 15秒未満、lease 30秒未満、job 10分未満を変更せず、それぞれ正のmarginを持つ。
6. Patch 001、Patch 002、Sprint 047の既存因果stepsを削除・緩和しない。既存workflowのSprint 047 stepで
   本Patchを因果実行できる場合はworkflow bytesを変更しない。

### D. 比例した検証

1. product code変更は0件とし、変更を`GS-009` oracle、決定的negative、必要なinventory追従、Generator progressに限定する。
2. ローカルでは本Patchnegative、Sprint 047、Patch 001、Patch 002、inventoryと構文／diff整合を確認する。
3. PR #11のexact candidateを使うWindows因果runで、変更なしの3 roundと既存上限を確認する。
4. fresh独立Evaluatorが、差分、negativeの旧／新因果、ローカル結果、Windows raw resultを確認する。
5. 深い履歴の再実行、新collector／schema／attestation、全master、実顧客Repoを追加条件にしない。

## Acceptance Criteria

1. `GS-009`の各roundで、writer完了直後・write付きrebuild前のstored Stateとread-only再構築Stateが、
   `eventCount`だけでなく正規化した全fieldで一致し、oracleによるwriteが0件である。
2. `eventCount`同値かつ別field／内容不一致の決定的negativeで、旧oracleならwrite付きrepair後にgreenになり得ること、
   新oracleはrepair前に不一致を検出することを同じfixtureで証明する。
3. 正常roundの後段write付きrebuildは削除されず、`changed: false`かつstored State bytesがrebuild前後で同一である。
4. Windows Server 2025／Node 22の同一jobで3 round×（Hook 32＋CLI 32）を実行し、各roundが64／64、
   parse／unique／期待delta／pre-rebuild full-State／State rebuild 100%、residue 0である。
5. 同Windows runでmax lock wait <15秒、max lease <30秒、job <10分かつ各marginが正であり、
   process／round／step削減、stagger／batch、threshold延長が0件である。
6. 既存`sprint-047-patch-001`と`sprint-047-patch-002`が0 FAIL、Sprint 047は既存25 caseを25／25 PASSする。
   `GS-009`のID、Critical、意味、初回割当と既存metricを変更しない。
7. workflowに既存Sprint 047因果stepがある場合はworkflow bytes変更0であり、変更が必要な場合も新job／新collectorを
   作らず既存stepとtriggerを最小追従する。inventory path／digest／markerは実変更と一致する。
8. product code、製品仕様、rubric、Case registry、Windows／lock／lease／job thresholdの変更が0件である。
9. fresh独立Evaluatorが同一candidateのローカル実行とPR #11 Windows raw resultを確認し、C1、C2、C3、C5、C6、
   C19、C21、C24を既存threshold以上、ゼロ許容軸を5／5、product finding 0、Acceptance Criteria未達0とした場合だけPASSである。
10. private my-vault／Yasashiiへのwrite、merge、release、tag、GitHub Release、Marketplace、install／update、cache、
    loaded version、live workspace、実Xmind、connector external writeが0件である。

## 禁止する解き方

- product code、Event／Evidence／State schema、製品のrebuild意味を変更する。
- `eventCount`だけ、writerのexitだけ、write付きrebuild後だけをState整合の根拠にする。
- oracleまたはnegativeが比較前にstored Stateを修復する。
- Hook／CLI件数、3 round、既存step、期待値、100% hard gateを減らす。
- 15秒／30秒／10分を延長し、stagger／batch／prewarm／blind retryで通す。
- 新collector、統一schema／attestation、product instrumentation、全履歴／全masterを追加する。

## Evidence safe harbor

- 40桁candidate SHA、変更path、product code／workflow bytes変更数、command、exit、case summary。
- negativeの不一致field、eventCount同値、repair前full-State mismatch、旧eventCount-only判定、repair後状態、新oracle検出。
- Windows run／job、OS／Node、各roundの64 process、parse／unique／delta／pre-rebuild full-State／rebuild／residue、
  max wait／15秒、max lease／30秒、job時間／10分のmargin。
- Patch 001／002、Sprint 047、inventory、構文／diff checkと外部write 0のsummary。

上記で十分とする。browser／DOM／screenshotはUI変更がないため非適用。新しい証拠基盤、実downstream、release／install、
実顧客Repoを合格条件にしない。

## Non-scope

- 製品のState生成、logical write、rebuild、lock、root／Git identityの再設計。
- `GS-009`以外のCase意味・Severity・threshold変更。
- Windows workflowの並列数、round、時間上限、runner／Node変更。
- private my-vault／Yasashiiの同期・評価。
- merge、release、tag、GitHub Release、Marketplace、install／update、cache、live workspace、実Xmind、connector。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更path、product／workflow bytes変更数、negativeの旧／新因果、
ローカル回帰、PR #11 Windows因果run、threshold margin、既知残余を記録する。

fresh独立Evaluatorは同一candidateで本Acceptance Criteriaと既存rubricを評価し、product findingと
verification-infra findingを分ける。PASS後のstate遷移とdownstream判断はOrchestratorが行う。
