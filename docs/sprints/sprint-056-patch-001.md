# Sprint 056 Patch 001 — 0.13.0更新migrationの到達性・管理節更新・中断session回復

- Type: regular patch
- Risk: high（利用者workspaceの管理対象file、更新session、plugin backup、rollback、配布前gateを扱うため）
- Base Sprint: `sprint-056`
- 依存: `sprint-056` done
- 対象機能: F30、F31、F41
- 関連rubric: C1、C2、C3、C5、C6、C10、C12（既存thresholdを維持）
- Candidate version: 本Patchでは未確定。公開済み`0.13.0`のbytesを変更せず、修正版versionの決定・公開は別工程とする。

## 背景と通常Patch判定

公開済み`0.13.0`に含まれるmigration graphは`0.8.0→0.9.0`で終わるため、Claude Codeの正式なplugin更新後、
`0.10.1→0.13.0`は`update-apply.mjs`の経路解決でexit 3となる。`0.12.0→0.13.0`も同じ理由で停止する。
release integrityとarchive gateは古い2 migrationの存在だけを確認し、この欠落を公開前に検出できなかった。

修正には複数の公開版をつなぐmigration、旧／現行templateの意味差分、台帳と表示、既存の保護済みsession、
plugin backup／rollback、checkout／archiveの公開前gateが関わるため、microではなく通常Patchとする。
ユーザーは診断で提示されたこの修復を承認済みであり、新たな製品方向の確認は不要である。

## 外から見える成果

- 公開済み対応版から現行修正版まで、飛び級更新でも必要な管理節だけをdry-run後に安全に更新できる。
- 内容差分のないversion hopは経路として通過しても、管理ファイルを変更した、migrationを適用したとは表示されない。
- `0.13.0`を予定して中断した保護済みsessionは、workspace未変更なら検証済み修正版へ安全に引き継げ、開始前版へrollbackできる。
- 対応外版、所有不明な管理節、壊れた経路、版ずれ、backup不明、部分適用済みの不正なtarget差替えは、利用者内容を変えず理由付きで停止する。
- release integrityとGit-free archive gateが、公開済み対応版すべてから現行版への実到達性を公開前に検出する。

## Scope

### A. 公開済み対応版とmigration到達性

1. 本Patchで更新元として保証する公開済み版は`0.8.0`、`0.9.0`、`0.9.1`、`0.9.2`、`0.10.0`、
   `0.10.1`、`0.10.2`、`0.12.0`とする。公開tagのない`0.11.x`、未知版、未公開版、既知blockerを持つ
   `0.7.0`以前は、targetが`0.13.0`以降の現行系である更新の対応版に推測追加しない。既存回帰が検証する
   `0.6.0→0.7.0`等の旧target向けmigration／bootstrap契約は、この制限を理由に削除・拒否へ書き換えない。
2. 各対応版から現行版まで、metadataが有効で有限なversion経路を解決できる。途中のpatch／minorを飛ばす通常更新でも、
   必要なhopを順序どおり一度だけ適用する。
3. duplicate edge、cycle、不正semver、filenameとmanifestの不一致、許可外path／operation、欠落asset、root外asset、
   現行版へ到達しないgraphはworkspace write前に拒否する。
4. 現行版を同一版更新する経路やdowngradeを作らず、既存の副作用0件停止を維持する。

### B. 旧／現行templateに基づく安全な管理節更新

1. 公開tag間で`plugins/secretary/templates/AGENTS.md`／`CLAUDE.md`の意味が変わったhopは、旧配布templateと
   現行templateを根拠に、更新が必要な製品所有節をmigrationへ表す。固定sectionを足すだけで、旧memory／会話契約等の
   矛盾する指示を残さない。
2. 完全一致、既知fingerprint、または一意な製品所有markerで旧template由来と確認できる節だけを更新する。
   利用者固有の前後文、編集済み節、他marker、改行、file modeを保持し、所有不明やmarker異常はkeep／conflictとして示す。
3. template内容に差分がないhopは空のoperationsを持てるが、content write、`changedPaths`、適用件数、内容更新済み表示を
   発生させない。台帳のversion bookkeepingと実際のcontent変更を区別する。
4. dry-runはversion経路、追加・変更・維持・衝突、対象pathを示し、同じplanの再実行は追加差分、重複marker、追加commitを出さない。
5. stale plan、dry-run後の利用者変更、Secretらしい内容、symlink／junction、root外path、read-only、edition不一致は既存どおり停止する。

### C. `0.13.0`中断sessionの修正版への安全な回復

1. 対象は、正式updateで保護commitまで作成され、旧target `0.13.0`へのplugin更新後にmigration経路欠落で停止し、
   workspace migration writeが0件のsessionとする。
2. 回復前にsessionの元版、旧target、現在読み込んだ修正版、edition／scope、保護commit、workspace HEAD、managed選択、
   changed paths、ledger／marker、plugin backupの版・identityを再検証する。
3. 現在pluginが旧targetよりsemver上で、対応経路と元版backupを一意に検証できる場合だけ、新targetへ引き継ぎ、
   新しいdry-runとplan hashを提示して改めてapply確認を求める。旧plan hashや旧targetの成功状態を流用しない。
4. workspace file、ledger、markerのいずれかが部分適用済みならtargetを差し替えない。旧sessionの整合したrollbackへ案内するか、
   自動rollback不能なら変更済み対象と安全な手順を示して停止する。
5. 回復後のrollbackは保護commit基準のworkspaceとsession開始前plugin版をともに復元する。plugin backupの復元先、scope、版、
   treeをsession全体で一貫させ、backup欠落／複数候補／不一致や内部path解決失敗を成功扱いにしない。
6. 回復、apply、rollbackのいずれもpush、remote変更、cache直接編集、利用者本文の証跡化を行わない。

### D. release／archive到達性guardと利用者向け回復案内

1. release integrityはcurrent manifest／CHANGELOG整合に加え、明示した対応版集合の各版からcurrent版までのgraph到達性、
   各manifest／assetの有効性、内容差分のあるhopに実操作があること、差分のないhopがcontent更新へ数えられないことを検査する。
2. Git-free archive gateも同じ配布bytesだけから到達性を検査し、`.git`やlocal tag参照を要求しない。checkout側は公開tagから
   対応版集合を照合できるが、archive側の対応版宣言と経路検査をcheckout PASSで代替しない。
3. 利用者向け回復ガイドは、影響する更新元、症状、workspace変更0件の見分け方、修正版公開後の再開、部分適用時のrollback、
   確認command、対応外版の停止を順に示す。公開前candidateを利用可能と断定せず、公開済み版の再配布やtag移動を案内しない。
4. 既存release／archive gateが持つmanifest、CHANGELOG、MIT、author、`forkedFrom`、Secret、Git-free検査を維持する。

## Acceptance Criteria

1. 隔離workspaceのCLI fixtureで、各対応版`0.8.0`、`0.9.0`、`0.9.1`、`0.9.2`、`0.10.0`、`0.10.1`、
   `0.10.2`、`0.12.0`から現行版への経路が解決され、dry-run→明示apply→検証→冪等再実行を完了する。
2. `0.10.1`由来の未編集templateでは、旧／現行templateの意味差分に対応するAGENTS／CLAUDE管理節が更新され、
   古い矛盾指示が残らない。前後の利用者固有bytesと対象外blockは保持される。
3. customized／unknown baseline、重複・片側marker、stale plan、Secret、symlink／junction、root外path、edition不一致は
   内容を上書きせずkeepまたは理由付き拒否となる。
4. `0.12.0→現行版`のように内容差分がないhopは、経路成功後も管理ファイルのbytes／mtime、`changedPaths`、content適用件数が
   変わらない。台帳を更新する場合もcontent変更と表示しない。
5. `0.13.0`targetで経路欠落停止したworkspace未変更sessionは、保護commitと元版backupを保持したまま修正版へ回復し、
   新planへの別確認後に完了できる。回復後rollbackはworkspaceとpluginをsession開始前状態へ戻す。
6. 同じsessionでworkspace／ledger／markerが部分適用済み、backup欠落／複数／改変、HEAD不一致、scope／edition不一致、
   修正版でないversionの場合はtargetを差し替えず、成功表示と追加workspace writeが0件である。
7. targetが`0.13.0`以降の現行系である更新について、unsupported `0.7.0`、tagのない`0.11.x`、unknown版、
   downgrade、same-version、壊れたgraphの負例は、正確な理由、確認版、変更0件、次の行動を返し、
   保護commit／migration／ledger／markerを新たに作らない。既存の旧target向け成功caseは新しいtest bypassを設けず維持する。
8. release integrityとGit-free archive gateは全対応版の到達可能graphでPASSし、1 edge欠落、到達不能版、cycle／duplicate、
   metadata／asset不正、意味差分があるのに空operationsの各negativeでFAILする。古い2 fileの存在だけではPASSしない。
9. 既存のupdate session配置、保護commit、retry、rollback、conversation sectionのatomic置換／cleanup／再実行、
   release／archive検査が0 product FAILである。
10. 回復ガイドが影響、変更有無の確認、公開後の再開、partial時のrollback、対応外版を説明し、公開済み`0.13.0`の
    tag／artifactを修正済みとして差し替えず、未公開candidateを公開済みと表示しない。
11. version実ファイル、remote、tag、Release、Marketplace、downstream、installed plugin／cache、実workspace、`.clarity/**`、
    `CLARITY.md`の変更・操作が0件である。

## 禁止する解き方

- `0.10.1→0.13.0`だけを特例hard-codeし、他の公開済み対応版や将来のcurrent版で到達性を再び失う。
- 空operations、ledger version更新、経路の発見だけを管理ファイルの内容更新件数へ数える。
- 現行sectionを末尾へ追記するだけで、既知の旧template由来の矛盾指示を残す。
- 利用者編集節、所有不明節、ファイル全体を強制置換する、またはconflictをalready-appliedへ変える。
- sessionの`toVersion`だけを書き換え、backup、plan、verification、rollbackの版・identityを旧値のまま使う。
- 部分適用済みsessionへ別versionのplanを重ねる、backup候補をbasenameや隣接directoryだけで推測する。
- 公開済み`v0.13.0` tag／Release／artifactを動かす、同一versionのbytesを差し替える、検査対象版を減らしてgateを通す。

## Verification scope（着手時に固定）

- Focused CLI: 全対応版のgraph解決、`0.10.1`管理節更新、`0.12.0`空hop、unsupported／壊れたgraph、
  `0.13.0`pending session回復、partial拒否、backup／rollback。
- Existing regression: `scripts/sprint-030-update-config-test.mjs`、
  `scripts/sprint-038-patch-003-conversation-migration-test.mjs`。
- Release: `scripts/check-release-integrity.py`と`scripts/archive-release-gate.mjs`をcheckoutと同じ配布bytesの
  Git-free archiveで実行し、focused negativeでreachability failureを確認する。
- Portability: 本Patchで新規追加するfocused fixtureはOS固有shell script、固定separator、実home pathに依存させない。
  mandatory regressionの`scripts/sprint-030-update-config-test.mjs`は歴史的なshell mockを含む既存検査として、書き換えずMacで
  実行できればよい。Windows native環境がこのSprintで利用できなければ`NOT-RUN`と理由を記録し、Windows verifiedとは表示しない。
  Windows native実行は本Patchの必須gateにしない。
- UI変更はなくbrowser／DOM／screenshotは非適用。`scripts/sprint-018-regression.sh`、全master、external CIは必須にしない。

### Evidence safe harbor

- 実行command、exit、PASS／FAIL、OS／Node、fixtureのfrom／to版、planのadd／change／keep／conflict件数、content write件数。
- 管理対象fileのbefore／after hash・mtime、利用者前後bytes保持、marker一意性、ledger／changedPaths／migration countの要約。
- sessionのphase、元版／旧target／新target、workspace write 0／partial、保護commit一致、backup／rollbackの版・tree一致。
- 対応版集合、各版の到達経路、checkout／archive gate summary、negativeの拒否理由、Windows `RUN`または`NOT-RUN`理由。

上記で十分とする。実HOME、実利用者workspace、installed cache、remote、公開、downstream、外部CI、統一collector、
新attestation schema、全master、Windows native runを追加の合格条件にしない。

## Non-scope

- 修正版versionの決定、version／manifest／CHANGELOGのcurrent値変更、push、merge、tag、GitHub Release、Marketplace公開。
- 公開済みtag／Release／artifactの変更、同一version再配布、downstream適応、plugin install／update、cache変更。
- 実利用者workspaceのmigration／rollback、実HOME／private my-vault本文、`.clarity/**`、`CLARITY.md`のread／write。
- `0.7.0`以前や未公開`0.11.x`の新規support、一般的なmigration engine再設計、Windows external CIの新設。

## 完了条件

Generatorは本Patchだけを実装し、対応progressへ変更file、対応版集合、管理節の更新／保持、空hopのcontent write 0、
pending session回復、backup／rollback、focused／既存回帰、checkout／archive、Windows状態、external operation 0を記録する。

fresh独立Evaluatorは隔離workspaceとGit-free archiveで本Acceptance Criteriaを評価し、C1、C2、C3、C5、C6、C10、C12が
既存threshold以上、ゼロ許容軸を5／5、product finding 0、Acceptance Criteria未達0の場合だけPASSとする。
