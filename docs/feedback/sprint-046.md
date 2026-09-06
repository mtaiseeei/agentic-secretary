# Sprint 046 評価結果

**判定:** 合格
**分類:** PASS
**評価対象:** Sprint 046 — reciprocal link、pull sync、authority／conflict
**Generator candidate:** `9c6da76f61bbf510a2b9f4cb74a24c3c119e8f3e`
**評価開始HEAD:** `1721c73dfb76b74a54233d4b48673cf14b7f105f`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**Escalation Recommendation:** none

## 結論

Generatorのfixtureとは別に、`/private/tmp/s046-evaluator.JRzMjH`へ新しい2つのGit Repoを作り、実製品CLIで`prepare → accept → finalize`、両方向manual bundle sync、authority／concurrent conflict、6つのresolution、doctor、stale Portfolio、retry、負例を操作した。

- exact Targetは34/34 PASS、registry missing／duplicate／extraは各0、Critical 19/19実行で未実行0だった。
- Secretary側Project IDは`cp_3046cc40168450a27084`、外部Repo側Project IDは`cp_fcaf9d8ae6f4925b2932`、link IDは`cl_593c261c0b4026be77ca`。link前後、sync、unlink後も各Project IDを維持した。
- accept／finalize後のdigestはAcceptance `da670734ade80475d20a2a403598b494bf237a1b546749fa321d81a624915a46`、Finalization `8aec87eec0b61b0977fd313c8b1e67e2fc8c8530509760fdec47e2ae74fcb313`で双方一致した。
- Link Request、双方manifest、manual bundleのSecret、local absolute path、顧客本文canaryは0件だった。absolute pathは各Repoの`.git/clarity-links.json`だけに存在した。
- previewはwrite 0。applyは実行側自身のimports／linked projection／Eventだけを更新し、相手Repo、Git HEAD、commit数、branch、index、remote、root外canaryを変更しなかった。
- 実link／syncのauthority conflictは`authority_conflict / critical / rank 1`、concurrent revisionは`sync_conflict / high / rank 1`だった。両方とも`level-desc-conflict-id-asc`で、Sprint 042の合成fixtureを代用していない。
- `bash scripts/sprint-046-regression.sh`はexit 0。Target 34、Sprint 041〜045、projects／daily／weekly、release integrityはすべてgreenだった。

Acceptance Criteria未達0、新規product finding 0、新規verification-infra finding 0、全採点閾値通過のため、Sprint 046を合格とする。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 5/5 | 4 | PASS | AC1〜8を同じ独立2-Repo candidateで実操作し、未達0 |
| C2 構文・整合 | 5/5 | 5 | PASS | Node構文、Event schema、registry、manifest／bundle digest、strict validator、diff checkが成立 |
| C3 機能の実証 | 5/5 | 4 | PASS | 実CLIでhandshake、両方向sync、conflict、resolution、doctor、Portfolio、retryを操作 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | plain CLIは変更有無、network／外部write、conflict、次の一手を短く表示。補助的な英語技術語は残るが行動判断を妨げない |
| C5 安全・規律 | 5/5 | 5 | PASS | Secret／absolute path／顧客本文非露出、preview write 0、cross-root／symlink拒否、network／push 0 |
| C6 無回帰 | 5/5 | 5 | PASS | 046、041〜045、projects 68、daily 56、weekly 38、release integrityが0 FAIL |
| C7 やさしさ | 4/5 | 4 | PASS | healthy／broken時の変更有無と次の選択が簡潔。規律省略なし |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | 双方のimmutable Project ID、Event履歴、linked→Standalone mode復帰が成立 |
| C20 Attention・Clarity UX | 5/5 | 4 | PASS | actual conflictからreason／level／rankingを決定し、last-write-winsせず選択肢を保持 |
| C22 federated link・sync・Drift | 5/5 | 5 | PASS | reciprocal identity／digest、pull sync、authority、stale／schema／delete、cross-root write 0が成立 |
| C24 Clarity安全・統合・public-first | 5/5 | 5 | PASS | path／symlink／Secret／schema／retry、Portfolio、関連回帰、public境界が成立。downstream／release write 0 |

C8〜C18、C21、C23はSprint 046の新規採点対象外である。C22のうちSprint 047対象の意味的Drift comparatorは再採点していない。

## Acceptance Criteria

| AC | 判定 | 独立実行証拠 |
|---|---|---|
| 1. Target 34、Critical／AC未実行0 | PASS | 34/34、Critical 19/19、registry差分0、AC1〜8実行 |
| 2. Request非機密、ID／identity／digest不一致はwrite 0 | PASS | Secret／path／顧客本文0。wrong Project ID、wrong Repo identity、request／acceptance／finalization／manifest／bundle digest改ざんを全拒否 |
| 3. Standalone ID維持、duplicateで追加0 | PASS | 外部IDは`cp_fcaf...`を維持。時刻差retry後もmanifest hash、digest、Event件数、treeが同一 |
| 4. preview write 0、applyは自Repoだけ | PASS | preview前後snapshot一致。両方向applyで相手tree／Git／remote／canary一致 |
| 5. Primary重複、stale、schema、delete、identityを隠さない | PASS | Primary重複・duplicate itemはexit 3、stale／schema 99／tombstone／identityを個別検査。last-write-wins 0 |
| 6. 許可前network 0、manual bundleだけで成立 | PASS | adapterは`permission-required / networkCalls:0`。許可fixtureも`verifiedExternal:false / networkCalls:0`。実GitHub 0 |
| 7. actual AT-008／009再評価 | PASS | `authority_conflict / critical / rank 1`、`sync_conflict / high / rank 1`を同じ実link modelから取得 |
| 8. IM-002／003／010／011、PF-009 | PASS | link／sync retry byte安定、healthy／stale／unreachable／identity mismatch doctor、repair choices、stale Portfolioを同じmodelで確認 |

## Target 34件／registry

registry JSONを独立parseし、次の正確な34 IDを確認した。

- `LK-001`〜`LK-016`
- `SY-001`〜`SY-013`
- `IM-002`、`IM-003`、`IM-010`、`IM-011`
- `PF-009`

結果はunique 34、missing 0、duplicate 0、extra 0。case本文のSeverityを独立照合し、Criticalは19件、実行19件、未実行0件だった。

## 独立2-Repo実行証拠

### Fixtureと開始状態

Generator runnerのfixture名、Item ID、assert helper、生成済みbundleを使わず、次を新規作成した。

- Secretary Git Repo: `/private/tmp/s046-evaluator.JRzMjH/selene-secretary-git`
- generic open Project: `月面運用刷新`
- external Git Repo: `/private/tmp/s046-evaluator.JRzMjH/orion-service-git`
- root外canary: `/private/tmp/s046-evaluator-outside-canary-JRzMjH/canary.txt`

未初期化targetの予定Project ID／identity導出だけは製品coreの`previewInit`／`inspectRepoIdentity`を使用した。handshake、sync、conflict、resolution、doctor、Portfolioの判定対象はすべて`clarity.mjs`／`clarity-secretary.mjs`の実CLIをspawnして確認した。

| 対象 | 開始tree SHA-256 | HEAD／commit | branch | index tree | remote |
|---|---|---|---|---|---|
| Secretary Repo | `23423dcceb983017be78fd8f1dee9b40ce6a6d22d02a54299e351d715904077a` | `e6e3485f05ab76b7cf3b7c7e3079e095f1bf0a67`／1 | `evaluation-main` | `acad7b2b0d7b697bba03fd62b40ccfbba81f643e` | `https://example.invalid/selene-secretary.git` |
| external Repo | `4005127f04887680310b5d88be9b0d690f811e2dfc0db59b55bebad389f0f5e8` | `4d89df24c434b6c75c874d84c79fdbea79cdd191`／1 | `evaluation-main` | `910c72ec741069cdad5cc433b82ab192dcfa9925` | `https://example.invalid/orion-service.git` |

全操作後もHEAD、commit数、branch、index tree、remoteは上表と一致した。最終content treeはSecretary `1c7a28cdd76d8635235972d82029fd15668d350fb4c03294c1acd069a0a691fa`、external `d9e6efccac3e51ebbb36980117911620a769f305d0934fd6dba5b435a2c2f8dc`で、差分は各Repo自身の`.clarity` owned pathだけだった。applyごとの相手tree digestは前後同一である。

canary SHA-256は開始・終了とも`fd7eedfead8d90b9349ef23204e00c36646b77fb6daaafcec78977a4085718fb`だった。

### Handshake／非機密性／retry

代表コマンド。

```bash
node plugins/secretary/scripts/clarity.mjs link-prepare <secretary-clarity> \
  --target-project-id cp_fcaf9d8ae6f4925b2932 \
  --target-repo-identity-json '<synthetic identity JSON>' --role secretary --json
node plugins/secretary/scripts/clarity.mjs link-accept <external-repo> --input-file <request.json> --json
node plugins/secretary/scripts/clarity.mjs link-accept <external-repo> --input-file <request.json> --apply --json
node plugins/secretary/scripts/clarity.mjs link-finalize <secretary-clarity> --input-file <acceptance.json> --apply --json
node plugins/secretary/scripts/clarity.mjs link-finalize <external-repo> --input-file <finalization.json> --apply --json
```

- accept previewは`initialization-preview-required / changed:false`で`.clarity`を作らなかった。apply後だけtargetを初期化した。
- request／manifest／bundleには合成Secret canary、顧客本文canary、両fixture absolute pathが0件だった。
- wrong target、wrong identity、request digest、acceptance digest、finalization digest、manifest digest、bundle digest改ざんはexpected exit 3、`changed:false`またはsnapshot不変だった。
- prepare、accept、双方finalizeを`2026-08-28T04:15:00.000Z`と`2026-09-01T15:40:00.000Z`で再実行し、digest、manifest bytes、Event件数、treeは不変だった。

### Pull sync／authority／負例

代表コマンド。

```bash
node plugins/secretary/scripts/clarity.mjs link-export <source> --link-id cl_593c261c0b4026be77ca --json
node plugins/secretary/scripts/clarity.mjs sync-preview <target> --input-file <bundle.json> --json
node plugins/secretary/scripts/clarity.mjs sync-apply <target> --input-file <bundle.json> --apply --json
node plugins/secretary/scripts/clarity.mjs sync-resolve <target> \
  --link-id cl_593c261c0b4026be77ca --conflict-id <actual-conflict-id> \
  --choice <secretary|repo|new-decision|split|defer|unlink> --apply --json
```

- 双方向sync previewはいずれもwrite 0。applyは実行側の`.clarity/imports/<link-id>/`、`.clarity/projections/linked/<link-id>.json`、Eventだけを更新した。
- Primary重複、duplicate item、concurrent revision、stale source sequence、schema 99、tombstone、link ID／Repo identity／digest改ざんを個別に実行した。拒否・conflictでは対象Repo snapshot不変だった。
- unknown `futureEnvelope`はimport bundleとlinked projectionの`unknownFields`へ同じ値で保持された。
- 同一bundleを時刻差付きで再applyし、`status: unchanged / writeCount: 0`、import file 1件、Event追加0、tree／import／projection bytes同一だった。

### actual AT-008／AT-009

同じ2-Repo linkのbundleを使い、Sprint 042の合成Attention fixtureは使っていない。

```json
{
  "AT-008": {"reason":"authority_conflict","level":"critical","rank":1,"ranking":"level-desc-conflict-id-asc"},
  "AT-009": {"reason":"sync_conflict","level":"high","rank":1,"ranking":"level-desc-conflict-id-asc"}
}
```

conflict bundleのapplyはexit 3 `sync-conflict`で、local projectionを上書きせず、last-write-winsは0件だった。

### 6 resolution／doctor／Portfolio

同じactual authority conflict IDへ次を実行した。

| choice | status | Event | 追加確認 |
|---|---|---|---|
| `secretary` | `resolved` | `sync.conflict.resolved` | choice保持 |
| `repo` | `resolved` | `sync.conflict.resolved` | choice保持 |
| `new-decision` | `resolved` | `sync.conflict.resolved` | choice保持 |
| `split` | `resolved` | `sync.conflict.resolved` | `split-from-conflict` relationとconflict ID保持 |
| `defer` | `deferred` | `sync.conflict.resolved` | 履歴保持 |
| `unlink` | `disabled` | `link.disabled` | choice保持、Project ID不変、external modeを`standalone`へ復帰 |

split previewはwrite 0、split retryはEvent追加0だった。5つの`sync.conflict.resolved`とunlinkの`link.disabled`をEvent履歴で確認した。

doctorは同じlink modelで次を確認した。

- healthy: mode `linked-external`、schema current、Hook supported、link healthy、Xmind disabled。
- stale: import時刻を古くしたfixtureで`sync-stale`、Portfolio `linkStale:true / linkHealth:broken`。
- unreachable: local mappingなしで`peer-unreachable`、local `status`は継続可能。
- identity mismatch: mappingのpeer identity不一致で`peer-identity-mismatch`。
- broken時は原因、3つ以上のrepair choices、mapping／manual sync／unlinkのnext actionを表示。

plain CLIも実行し、healthy doctorは「変更なし／追加操作は不要」、sync unchangedはnetwork 0／外部write 0を表示した。

### symlink／root escape／cross-root

- peer rootをsymlink aliasへ差し替えた`link-map --apply`はexit 3 `working-root-unsafe`。local Repoとcanaryは不変だった。
- root外canary directoryを`sync-apply`対象にした負例はexit 3で拒否し、canary hashは不変だった。
- 両方向applyの各processはpeer treeを変更しなかった。
- 307 subprocessを記録し、expected negative exitは14件、unexpected exitは0件。外部remote commandは0件だった。

## 公式回帰

`bash scripts/sprint-046-regression.sh` → **exit 0**。

- `SPRINT046_TEST_PASS=34 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0`
- `SPRINT045_CASE_PASS=35 FAIL=0 TOTAL=35`
- `SPRINT044_CASE_PASS=40 FAIL=0 TOTAL=40`
- `SPRINT043_CASE_PASS=29 FAIL=0 NOT_RUN=1 TOTAL=30`
- `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`
- `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`
- projects: `PASS=68 FAIL=0`
- daily: `PASS=56 FAIL=0`
- weekly: `PASS=38 FAIL=0`
- `PASS release integrity: manifests and CHANGELOG are consistent`
- `SPRINT046_REGRESSION_PASS=34 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0`

追加整合。

- `git diff --check 3a8a260..9c6da76` → exit 0。
- 変更4 scriptの`node --check` → exit 0。
- Event schema JSON parse → `EVENT_SCHEMA_PARSE=PASS`。
- `claude plugin validate plugins/secretary --strict` → exit 0、`Validation passed`。
- current HEADとcandidateの差分は`docs/sprints/state.md`だけ。評価開始時の製品bytesはcandidateと一致した。

`XM-007` real Xmind MCP external-liveはSprint 043から継続する未承認NOT-RUNで、本Sprint PASSやexternal-live verifiedへ昇格していない。

## Finding／バグ一覧

| ID | 重要度 | 対象区分 | 状態／内容 | route |
|---|---|---|---|---|
| — | — | product | 新規finding 0 | なし |
| — | — | verification-infra | 新規finding 0。公式runnerは独立反例と同じTarget／負例を検出可能 | なし |

Evaluatorの独立runner作成中に、期待したerror code名を実製品の`sync-bundle-invalid`／`sync-bundle-tampered`へ合わせる修正と、Critical抽出用Evaluator正規表現の修正を行った。いずれも一時評価script側のexpectation／構文であり、製品欠陥・公式runner欠陥ではない。各再実行前に2 Repoとroot外canaryを削除して新規作成し、最終exit 0のfresh runだけを判定証拠にした。

## UI／スクリーンショット

本Sprintの新規製品面はCLI／JSON／filesystemであり、常駐server、URL、DOM、responsive UI、視覚品質を持たない。C8／C23を採点していないためbrowser操作とスクリーンショットは非該当。実CLI stdout／stderr、JSON、filesystem、Git、digestを証拠にした。

## 外部副作用

- 実GitHub／network read: **0件**。adapter fixtureは`verifiedExternal:false`。
- private my-vault／Yasashii実repo／実利用者workspace read/write: **0件**。
- connector／Xmind live／Notion task／顧客data write: **0件**。
- push／fetch／pull／PR／tag／release／remote変更: **0件**。
- installed plugin／cache／marketplace／Mac mini: **0変更**。
- 評価中の永続repo書込みは本feedbackだけ。隔離fixtureとroot外canaryは評価完了後に削除する。

## 残余リスク

- GitHub read-only取得はユーザー許可がないため実行していない。manual bundleとadapter確認境界はPASSしたが、external-live verifiedではない。
- Sprint 043のreal Xmind MCP、Sprint 044のユーザー受理済みhost実機残件、旧Sprint 014／018のbaseline debtは未解消のまま。本Sprintで再採点・昇格していない。
- private my-vault、Yasashii、installed cache、marketplace、releaseは未適用。public sourceのSprint 046 PASSを他edition／配布stageへ流用しない。
- semantic Drift comparisonとGit／filesystem／Secret hardeningの全体判定はSprint 047以降であり、本Sprintはlink／sync対象だけを評価した。

## Evaluator自己レビュー

- Generatorと別sessionで、Generator runnerのfixture名／Item ID／生成済みbundle／assert helperを使わず2 Git Repoを新規作成したか: yes
- `prepare → accept → finalize`と両方向syncを実製品CLIで操作したか: yes
- C22／C24とTarget 34を同じ2-Repo candidateで採点したか: yes
- registryの正確な34 ID、missing／duplicate／extra、Critical 19件を独立parseしたか: yes
- 未初期化targetでwrong target／identity／request digestをapply付きで拒否し、write 0を確認したか: yes
- Request／manifest／bundleのSecret、absolute path、顧客本文を実canaryでscanしたか: yes
- preview write 0、applyの自Repo限定、peer／Git／remote／canary不変を毎方向比較したか: yes
- Primary重複、authority conflict、concurrent revision、stale、schema 99、unknown field、tombstone、duplicate item、tamperを個別に実行したか: yes
- AT-008／AT-009をactual link／syncから取得し、Sprint 042 fixtureを代用していないか: yes
- 全6 choice、split relation、retry、unlink mode／Project ID／historyを確認したか: yes
- healthy／stale／unreachable／identity mismatch doctor、repair choices、stale Portfolioを同じlink modelで確認したか: yes
- accept／finalize／sync retryを時刻差付きで実行し、byte／count安定を確認したか: yes
- 公式046、041〜045、projects／daily／weekly、release integrityを実行したか: yes
- 実GitHubを許可なしで実行せず、adapter fixtureをexternal-live PASSへ昇格していないか: yes
- productとverification-infraを分離し、Evaluator自身の一時script修正を製品findingへ混ぜていないか: yes
- private／Yasashii／cache／marketplace／release／Sprint 047以降へ触れていないか: yes
- spec、contract、state、code、test、progressを編集していないか: yes
- 契約外collector／attestation／Evidence formatを合否条件に追加していないか: yes
- UI非該当理由を明記したか: yes

最終分類根拠は、AC1〜8、C1〜C7、C19、C20、C22、C24、Target 34、Critical 19、関連回帰が全閾値を通過し、新規product／verification-infra findingが0件であることによる。
