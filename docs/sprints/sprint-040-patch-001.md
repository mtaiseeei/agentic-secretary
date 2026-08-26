# Sprint 040 Patch 001 — 3版handoff manifestの完全性とcandidate再現

- Type: regular patch
- Risk: high（Yasashii／privateへの製品write直前gateと3版candidate identityを扱う）
- 依存: `sprint-040` done。公開製品commit `09267e352db51227e3f1375d861df53139797249` の会話・memory挙動と独立Evaluator PASSを変更しない。
- 含む機能: F63の下流handoff完全性だけ
- 主眼: builderが実際にcopy／adapt／参照するpathとmanifest宣言を同じ実行から照合し、受入済み製品baselineと下流固定baseから3版candidateを再現できるpre-write gateにする。

## 発生したspec issueと固定入力

Yasashii実適用前のread-only gateで、公開製品commit `09267e3` のschema 2 handoffとbuilder実装に次の不整合が確定した。Yasashii製品writeは0件であり、ユーザーは3版反映の続行と、本Patchによるhandoff完全化を承認済みである。追加質問は行わない。

- `exactCommonPaths` は実測23件、`yasashiiExactPaths` は実測5件で、intersectionは空集合、unionは28件だった。下流契約にあったintersection 1件／union 27件は事実と一致しない。
- `adaptYasashii` は `scripts/sprint-038-test.mjs` を変更するが、このpathは上記2 listのどちらにも収載されていない。
- Yasashii固定base `3c472dd9a2b5299f27741ae2c418094486b7d035` から既存candidate `bb194d55a3cff4fe6fbfdb588f1db665d4fcd2ed4446482410ca9dc525490cfd` の実差分は25 pathで、handoff宣言から生じた24 pathと未宣言のbuilder変更1 pathだった。
- 現在の固定candidate IDは、Agentic `428b3ff435ee63bf47837e38792873264e14336e85ca1190bd823e80cbc67e0a`、Yasashii `bb194d55a3cff4fe6fbfdb588f1db665d4fcd2ed4446482410ca9dc525490cfd`、private my-vault `95b7c5346dd9173817e40479e7599d39f4660f3efbb2b6d6122ab723b148bc84` である。
- private固定baseは `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`。両下流baseはGit archive等の隔離入力として読み、実repoへwriteしない。

上記件数は欠陥の再現事実であり、修正後の期待件数として手入力しない。修正後の件数・intersection・union・差分はmanifestとbuilder実行から毎回導出する。

## 用語と集合契約

下流editionごとに、manifestのpathを次の3役へ一意に分類する。

- **parity**: builderが公開sourceのpathを下流candidateへcopyし、最終candidateのpath／mode／bytesが公開sourceと一致するもの。
- **adapted**: builderが固定baseまたは公開sourceを入力にedition固有変換を行い、最終candidate bytesを生成するもの。公開sourceとのbyte一致は要求せず、変換anchor、適用回数、最終digestを検査する。
- **supporting**: builderまたはgateが直接read、execute、保護digest照合するが、edition固有の製品bytesとして変更しないもの。単なる記載ではなく、実行trace上の利用理由を持つ。

3集合は同一edition内で互いに重複しない。manifestのdeclared input unionは3集合のunionとして機械算出する。builderが実際にwriteしたpath、固定baseからのactual candidate diff、公開sourceと最終candidateのparity、adapted変換path、supportingの実利用pathも同じrunから算出する。

`scripts/sprint-038-test.mjs` はYasashiiとprivate my-vaultの両方で **adapted** と明示する。copy後にadaptする実装であってもparityへ二重計上しない。Agenticのwhole-tree入力は手作業で全fileを列挙せず、manifestのroot／除外規則から実path集合を列挙してreportへ固定する。

## Scope

### A. handoff manifestの役割完全化

- Yasashii／privateごとに、builderが直接copy、adapt、read、execute、保護digest照合する全pathをparity／adapted／supportingのいずれかへ宣言する。
- pathだけでなくedition、役割、利用action、必要な公開入力または固定base入力を解決できるようにする。
- manifest自身、candidate builder、inventory validator、candidate suite／regression wrapperの相互参照も対象とし、自己参照を理由に検査対象から外さない。
- 存在しないpath、editionに適用されないpath、実行で利用されない宣言、同じpathの役割重複をFAILにする。

### B. 実行由来の集合照合

- declared input union、parity、adapted、supporting、builder read／copy／write／execute集合、actual candidate diffを同じcandidate buildから算出し、path一覧と件数をreportする。
- builder-mutated pathのmanifest未収載を0件にする。adapted宣言のpathで実変更されないもの、adapted未宣言の実変更、parityのbyte／mode不一致をFAILにする。
- actual candidate diffの全pathをparityまたはadaptedへ分類する。supportingは固定baseからbyte／modeを変えず、実行traceにread／execute／保護照合の用途があるものだけ許可する。
- parity／adapted／supportingの重複、actual diffの未分類、宣言だけで利用されないpath、古いpath名・古いdigest・古いedition適用条件をFAILにする。
- manifest配列の長さや固定のintersection／union件数を合否の正本にしない。負fixtureでは、未宣言mutation、役割重複、未利用宣言、stale pathをそれぞれ1件注入し、すべて非0終了を確認する。

### C. candidate identityの再固定

- Agenticは本Patchの最終Generator commitを公開sourceとし、Yasashii／private my-vaultはその公開sourceと各下流固定baseから、3つのGit-free candidateを別々に再構築する。sorted relative path、mode、実bytesからcandidate IDを再計算する。
- handoff manifest bytesは3 candidateのidentity入力に含まれる。manifest bytesが変わる本Patchでは、既存3 IDとの差を版ごとに示し、新しい3 ID、file数、manifest digest、変更pathを最終handoffへ固定する。
- 予測に反してIDが変わらない場合は、旧・新candidateの全path／mode／bytesが一致することと、identity計算入力が同一であることを機械比較で証明する。ID文字列の一致だけでは証明にしない。
- candidate reportは一時rootの絶対pathに依存せず、別の空directoryで再構築して同じ3 IDを再現できるようにする。

### D. 下流pre-write dry-run

- Yasashiiとprivateの固定baseを実repoのcurrent HEADへcheckoutせず、Git archiveまたは同等の隔離rootへ展開してcandidateを作る。
- dry-run開始前後で実下流repoのHEAD、`git status --short`、既存protected path digestを比較し、write、checkout、branch、commit、stage、remote変更が0件であることを確認する。
- pre-write gateはmanifest／builder集合照合、candidate ID再現、版別suite、protected digestをすべて満たすまで実repo適用を許可しない。本Patch自体は実repo適用を行わない。

### E. 独立した回帰面

- 公開版のmanifest／candidate builder／inventory validator／regression wrapperを、正例とScope Bの負fixtureで直接評価する。
- Yasashiiとprivateのpre-write dry-runを別々に実行し、一方のPASSを他方へ流用しない。
- 公開Sprint 040の会話、memory、journal、checkpoint、edition別candidate suiteを全件再実行する。
- 公開candidate commitのGit archiveから `.git` なしで同じbuilder、inventory、wrapper、Sprint 040回帰を実行する。
- UI変更はない。browser、DOM、screenshotは合格条件にしない。

## Safety boundaries

- 公開Sprint 040で合格したauthorization、meaning tuple、pending、append-only訂正、content dedupe、checkpoint partial、response stateを変更しない。
- 既存のSecret、削除、destructive、external、bulk、memory外scope、path guard、所有path限定Gitの境界を緩めない。
- Yasashii固有文体、overlay、identity、README、LICENSE、repo-owned docsと、privateのNotion／vault routing、root AGENTS、private値、repo-owned docsを変更しない。
- manifest完全性のために下流実repo、installed cache、利用者workspace、release surfaceを検査入力へ使わない。

## Non-scope

- Yasashii／private実repoへの製品write、overlay apply、commit、checkout、branch変更。
- 会話契約、memory保存形式、meaning／dedupe／pending／checkpointの製品挙動変更。
- push、tag、GitHub Release、marketplace、version変更、remote変更。
- installed plugin／cache、利用者workspace、Mac mini、新session／loaded version確認。
- external service、connector、Notion TaskDBへのwrite。
- 新しい汎用collector、attestation service、配布基盤の開発。

## Acceptance Criteria

1. 現行schema 2の欠陥再現が、23 common、5 Yasashii exact、intersection 0、union 28、Yasashii actual diff 25、未宣言mutation `scripts/sprint-038-test.mjs` 1件として機械観測され、誤った27件前提を期待値へ残さない。
2. 修正後manifestからedition別のparity／adapted／supporting、declared input union、各intersectionを機械算出でき、3役の重複が0件である。
3. builderの直接read／copy／write／execute／保護照合集合がreportされ、builder-mutated path未収載、actual diff未分類、利用実績のない宣言、stale pathが各0件である。
4. Yasashii／privateの `scripts/sprint-038-test.mjs` がedition別adaptedへ明示され、実mutation集合とadapted集合が一致する。parityへの二重計上は0件である。
5. parity pathは公開sourceと最終candidateのpath／mode／bytesが全件一致し、adapted pathは宣言した変換anchor、1回適用、最終digestが全件一致する。supporting pathはcandidate差分0で、read／execute／保護照合の実利用を全件説明できる。
6. declared input unionとactual candidate diffの集合関係をpath一覧で示し、actual diffはparityまたはadaptedだけ、supportingとのintersectionは空集合、未分類は空集合である。
7. 未宣言mutation、役割重複、未利用宣言、stale pathの4負fixtureがそれぞれ非0終了し、正常manifestだけが0終了する。固定のpath件数を書き換えて偽PASSを作らない。
8. Agentic、Yasashii、privateを別々に再構築し、旧3 IDに対する新3 ID、file数、manifest digest、変更pathを固定する。ID不変を報告する版がある場合は、その版の旧・新全path／mode／bytes一致を機械証明する。
9. 同じ固定入力を別の空directoryへ2回構築して3版candidate IDが各回一致し、report内のcandidate rootは相対pathだけで再現できる。
10. Yasashiiとprivateのpre-write dry-run前後で、実repoのHEAD、status、protected digestが一致し、実repo write／checkout／stage／commit／branch／remote変更が各0件である。
11. 公開builder、manifest validator、inventory validator、regression wrapperの正例・負例が独立に0 FAILである。wrapperの総合PASSだけで個別面を代替しない。
12. Git-free archiveでmanifest集合照合、3 candidate build、inventory、edition別suite、candidate ID再現が0 FAILである。`.git`不在を理由に検査を省略しない。
13. 公開Sprint 040の全回帰が0 FAILで、既存candidate suiteのauthorization、meaning、pending、訂正、dedupe、checkpoint partial、Secret／Git安全caseの期待値変更が0件である。
14. Yasashii／private固有protected bytesは不変で、下流実repo、release、cache、workspace、new session、external serviceへのwriteが0件である。
15. 独立EvaluatorがC2・C5・C6・C13・C18を各5/5とし、本AC1〜14を同じ最終candidateから証拠付きで確認する。

## Verification scope（着手時に固定）

- 対象: 公開repoのhandoff manifest、candidate builder、inventory validator、candidate suite／regression wrapper、および固定baseから作る3つの隔離candidate。
- 固定入力: 公開製品baseline `09267e3` は欠陥再現と会話挙動の比較元、本Patchの最終Generator commitは3版candidateの公開source、Yasashii `3c472dd9a2b5299f27741ae2c418094486b7d035` とprivate `8e0796c9aba49d9a3dccb020912b0e1cf3989abf` は下流baseとする。実下流repoのcurrent HEADへ一致を要求せず、指定下流commitをread-only archive入力にする。
- 必須負例: 未宣言mutation、役割重複、未利用宣言、stale pathを各1件。
- 必須回帰: public Sprint 040 full regression、3 edition candidate suite、inventory、Git／Secret安全、Git-free archive。
- UI: 対象なし。browser／screenshot不要。
- 外部操作: downstream write、push、tag、Release、marketplace、install／cache、workspace、Mac mini、new session、external serviceは0件。

### Evidence safe harbor

- manifest schema、edition別parity／adapted／supportingのpath一覧、各集合の機械算出件数・intersection・union。
- builderのread／copy／write／execute／protect traceと、固定base→candidateのactual diff path／mode／before-after digest。
- 正例と4負fixtureのcommand、exit code、PASS／FAIL理由。負例は期待どおり非0終了すれば十分とする。
- 3版の旧／新candidate ID、file数、manifest digest、別directoryでの再現結果。ID不変の場合だけ全path／mode／bytes比較結果を追加する。
- Yasashii／private実repoの開始前後HEAD、`git status --short`、既存protected digest。
- 公開builder／inventory／wrapperの個別結果、3版candidate suite集計、公開Sprint 040全回帰、Git-free archive結果。
- external write 0件と、source／offline PASSをrelease／cache／new sessionへ昇格していない結果報告。

上記で十分とし、固定countの手入力、下流実repo適用、live cache、new session、外部service、新しい統一attestationを追加の合格条件にしない。

## 完了条件

Generatorは本Patchだけを単一の限定実装として完了し、manifest、builder、inventory、wrapper、必要な回帰fixture以外へscopeを広げない。最終candidateと全safe harbor証拠を `docs/progress/sprint-040-patch-001.md` に引き渡す。

Evaluatorは別作業単位で同じ最終candidateを独立再構築し、正例、4負例、下流pre-write dry-run、Git-free archive、公開Sprint 040全回帰を実行して `docs/feedback/sprint-040-patch-001.md` に合否を書く。残るlineage枠はGenerator／Evaluator各1回だけであるため、契約にない証拠形式、追加collector、下流製品writeを新しい合格条件にしない。
