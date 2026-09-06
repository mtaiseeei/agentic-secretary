# Sprint 050 Patch 003 Generator進捗 — 正本freshness確認とClarity ancestor alias

- 開始HEAD: `e75a3f27ec894b03f705eff09b6e5f3f06b37cd7`
- 担当: Generator（自己検査とEvaluator handoffのみ。Evaluator PASSは宣言しない）
- 実装日: 2026-08-30
- 対象: `sprint-050-patch-003`（Retry 0、Model Tier strong）

## 実装内容

- development-pointerの`canonicalRepo`が利用可能なlocal checkoutなら、Project status、daily、weekly、Portfolioが毎回read-onlyで現在根拠を観測するようにした。最初に読むfile、Repo／Git／Clarity identity、`observedAt`、source revision、freshness、inspected／excluded／uninspected理由を返す。
- 1 file 64 KiB、Clarity metadata 256 KiB、最大3 fileに制限した。Secret候補名／値、binary、巨大file、symlink、通常file以外は本文を読まず理由だけを返す。remote-onlyは`unavailable`で、clone／fetch／pull／networkを行わない。
- `workingRoot(value, { allowAncestorSymlinks: false })`を追加した。option省略／falseは従来の`working-root-unsafe`を維持し、Clarity専用resolverだけが内部的にtrueを指定する。利用者向けflagは追加していない。
- ancestor aliasは`realpath`で物理rootへ固定し、root／ancestor link／Git top-level／`.git`／Git configのfilesystem identityを保持する。重要path解決、read、write、rename前のguardで再確認し、alias差替えまたは同じrealpath文字列でのroot実体差替えを`clarity-root-changed`、`changed:false`で停止する。
- root自身のsymlink、root内`.clarity`、broken ancestor、file向きancestorを、それぞれ`root-self-symlink`、`root-internal-symlink`、`ancestor-symlink-broken`、`ancestor-symlink-not-directory`で区別した。`link-map --peer-root`は外部locatorとして既存LK-007の`working-root-unsafe`互換を維持する。
- macOSの標準`/var`→`/private/var`、`/tmp`→`/private/tmp`だけは従来どおり正規化する。host固有home／volume pathは製品コードへ追加していない。
- concurrency中に一時pathがrename／削除される正常競合はbounded retryし、既存canonical lockの一貫性を維持した。root resolverのGit照合は既存`runExternalSync`境界を使い、直接`spawnSync`を追加していない。
- tracked collaboration inventoryへ`canonical-repo-reader`と`clarity-root-policy`を追加した。19 surface、CLX 20＋CF 7＋AR 14の41 case、marker、content digestを双方向検査する。

## 変更file

```text
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/clarity-secretary.mjs
plugins/secretary/scripts/clarity.mjs
plugins/secretary/scripts/lib/clarity-core.mjs
plugins/secretary/scripts/lib/clarity-drift.mjs
plugins/secretary/scripts/lib/clarity-hook.mjs
plugins/secretary/scripts/lib/clarity-link.mjs
plugins/secretary/scripts/lib/clarity-projection.mjs
plugins/secretary/scripts/lib/clarity-root.mjs
plugins/secretary/scripts/lib/clarity-secretary.mjs
plugins/secretary/scripts/lib/safe-fs.mjs
scripts/lib/sprint-049-inventory.mjs
scripts/sprint-049-test.mjs
scripts/sprint-050-patch-003-test.mjs
docs/progress/sprint-050-patch-003.md
```

Planner所有の`docs/spec*`／`docs/sprints/sprint-*`、Orchestrator所有の`docs/sprints/state.md`、Evaluator所有の`docs/feedback/**`は変更していない。Skill本文、manifest、version、release／Marketplace／cacheも変更していない。

## 起動／CLI

server／UI／test URLはない。通常checkoutまたはworkspace ancestor alias配下のRepoで次を実行できる。

```bash
node plugins/secretary/scripts/clarity.mjs status <repo-root> --json
node plugins/secretary/scripts/clarity.mjs link-identity <repo-root> --json
node plugins/secretary/scripts/clarity.mjs init <repo-root> --json
```

Project status／daily／weekly／Portfolio adapterの回帰入口:

```bash
node scripts/sprint-050-patch-003-test.mjs
```

## case集計

| group | PASS | FAIL | NOT-RUN | 補足 |
|---|---:|---:|---:|---|
| CF-001〜007 | 7 | 0 | 0 | local／remote-only／missing／unsafe／unreadable、Secret／binary／large／symlink、Git状態保存 |
| AR-001〜014 | 14 | 0 | 0 | alias／physical、preview／apply、root差替え、Drift negative、macOS alias、全入口 |
| Patch合計 | 21 | 0 | 0 | `EXTERNAL_WRITES=0 NETWORK_CALLS=0` |

registry正本は既存274 caseの本文、Severity、初回Sprint割当、feature割当を変更していない。Patch 21 IDは重複0、未割当0、各1 featureである。既存Sprint 050 coverage guardの非因果baselineは「既知issue」に分離した。

## root policy適用matrix

| surface | Clarity内部opt-in | 観測／結果 |
|---|---|---|
| 一般`workingRoot` | なし（省略／false） | ancestor aliasを`working-root-unsafe`で拒否 |
| CLI Repo root | あり | policy sourceをJSONへ返し、previewは`changed:false` |
| core init／status／Event／Evidence | あり | 物理rootの`.clarity/**`だけを参照／変更 |
| link prepare／accept／finalize／sync | あり | alias／physical identity同一、tracked absolute local path 0 |
| projection | あり | 物理root内の宣言済みprojectionのみ |
| Drift Repo root | あり | Repo rootは許可、Decision／implementation locator symlinkは従来どおり拒否 |
| Secretary adapter／canonicalRepo | あり | local正本をbounded read、remote-onlyはunavailable |
| Clarity Hook cwd／root discovery | あり | alias入力を物理rootへ固定 |
| `link-map --peer-root` locator | なし | LK-007互換の`working-root-unsafe` |

AR-004ではunmanaged `CLARITY.md`をcanaryとして保持し、alias経由applyが物理Repo内の`.clarity/**`だけを作成した。AR-008ではalias targetを別Repoへ変更するfixtureと、rootをrename後に同じpathへ別inodeのRepoを作るfixtureの双方で、旧／新treeが不変のまま`clarity-root-changed`になった。

## canonical read report

synthetic `development-pointer`の`canonicalRepo`記載値そのものをworkspace ancestor alias配下に置いた。macOSでrequested pathは`/var`配下、actual pathは`/private/var`配下へ正規化され、alias／physicalでRepo identity、Git HEAD／branch／top-level、Clarity Project IDが一致した。

| source | availability／freshness | inspected | excluded／uninspected |
|---|---|---|---|
| local Git＋Clarity | `available`／`current-at-observation` | 最初に読む`README.md`と`.clarity` metadataのdigest／bytes | なし |
| stale workspace snapshot＋新しい正本 | current observationと`stale-snapshot`を分離 | source revision／`observedAt`あり | snapshotをcurrentへ昇格しない |
| remote-only URL | `unavailable` | 0 file | `read-only-provider-evidence-unavailable`、network 0 |
| missing／root-self unsafe／permission 000／missing first file | `missing`／`unsafe`／`unreadable`／`stale` | 読めた範囲だけ | 固有reason、包括的aligned／no-drift断定なし |
| Secret名／binary／70 KiB／外向きsymlink | `stale` | 本文0 | `sensitive-name`／`binary`／`file-too-large`／`symlink-not-followed` |

canonical observation前後でfilesystem tree、dirty、staged、untracked、HEAD、branch、remoteが一致した。canonical repo write、Git write、network callはいずれも0。例外はAR-004のsynthetic `.clarity/**` applyだけである。

## negative evidence

| fixture | observed | 副作用 |
|---|---|---|
| option省略／false＋ancestor alias | `working-root-unsafe` | 0 |
| root自身symlink | `root-self-symlink` | 0 |
| Repo内`.clarity`外向きsymlink | `root-internal-symlink` | external canary不変 |
| broken ancestor | `ancestor-symlink-broken` | 0 |
| file向きancestor | `ancestor-symlink-not-directory` | 0 |
| alias target差替え／同path実体差替え | `clarity-root-changed`、`changed:false` | 旧／新root不変 |
| Drift source locator symlink | `drift-path-symlink` | Evidence／Git変更0 |
| remote-only canonicalRepo | `unavailable` | clone／fetch／network 0 |

tracked link bundle、Event、Evidence、projectionをscanし、fixtureのrequested／physical absolute pathとSecret値は0件だった。dirty／staged／untracked、HEAD、branch、remoteはpositive／negative fixtureの前後で不変だった。

## 実行済み回帰

| command | result |
|---|---|
| `node scripts/sprint-050-patch-003-test.mjs` | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| Git-free current bytesで同上 | `PASS=21 FAIL=0 TOTAL=21` |
| `node scripts/sprint-041-test.mjs` | `PASS=43 FAIL=0` |
| `node scripts/sprint-045-test.mjs` | `PASS=35 FAIL=0` |
| `node scripts/sprint-046-test.mjs` | `PASS=34 FAIL=0`、LK-007 PASS |
| `node scripts/sprint-047-test.mjs` | `PASS=25 FAIL=0`、GS-009 stress 32 CLI＋32 Hook、parse／unique／rebuild 100% |
| `node scripts/sprint-049-inventory.mjs validate` | `PASS=19 FAIL=0 CASES=41 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-049-test.mjs` | `PASS=20 FAIL=0`、CLX-006／020 PASS |
| sandbox外`bash scripts/sprint-048-regression.sh` | `SPRINT048_PASS=12 FAIL=0`、wrapper `PASS=8 FAIL=0`、PK-008 Git-free PASS |
| `node scripts/sprint-050-test.mjs --coverage-only` | 既知baselineでexit 1。詳細は次節 |
| `git diff --check` | exit 0 |

## 既知issue／非因果baseline

`node scripts/sprint-050-test.mjs --coverage-only`は、Patch開始HEADと現在の双方でregistry guard
`primary meaning/severity changed`により停止する。actualは`6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8`、expectedは`f3782f008a362f4a7d9d38afeb48cda97ced61062e69fd062093132277ccf979`で同一だった。開始HEAD `e75a3f2`のGit-free archiveでも同じcommand、同じdigest差、同じstack位置を再現したため、本PatchのCF／AR追加とは非因果である。既存274 caseの本文／Severity／割当／hashはこのPatchで修正していない。

最初のsandbox内Sprint 048はlocalhost `listen EPERM 127.0.0.1`でPK-007が停止した。同じcandidateを通常環境で再実行しPK-001〜012とwrapper 8 gateを0 FAILで完走したため、製品findingへ数えていない。実行中にsource修正が入った中間runのGit-free digest差も破棄し、固定した最終bytesでPK-008／009を再PASSさせた。

## Not-run／境界

- Evaluatorの独立操作、Evaluator PASS、orchestratorのstate更新は未実施。本書を判定に流用しない。
- 実顧客repo、Mac mini対象repo、private版、Yasashii版、実provider／network、実remoteへのread／writeは未実施。
- install、version bump、CHANGELOG、release inventory、Marketplace、cachebuster、reinstall、new session、release、tag、push、PRは未実施・未変更。
- Windows native、Claude Code／Codexのlive Hook、external Xmindは未実施。UI変更がないためbrowser／screenshotは対象外。
- external／downstream writeは0件。テストの全writeはOS一時directory内のsynthetic fixtureだけである。

## Evaluator handoff

EvaluatorはGenerator commitのclean candidateで、まず`node scripts/sprint-050-patch-003-test.mjs`を実行し、CF 7／AR 14、actual path／realpath、identity、error code、tree／Git snapshot、operation countを独立確認する。続いてinventory、Sprint 041／045／046／047／049、通常環境のSprint 048 wrapperを再実行する。coverage-onlyの既知digest差は開始HEAD再現と区別し、製品findingとverification baselineを混同しない。

## Retry 1 — F-01複数alias interleavingのfail-closed修正

- Retry開始HEAD: `ff8dc313032d06cc1526b29b5c6f9176a8b16838`
- 対象: Evaluator Critical finding F-01と、既存AR-008を守るV-01回帰だけ
- 実装日: 2026-08-30
- ステータス: Generator実装・自己検査完了、fresh独立Evaluator待ち。本節はEvaluator PASSではない。

### 実装

- `clarity-root.mjs`の物理root単位の単一observation slotを廃止し、同じ物理rootを指すaliasごとにlive observation tokenを保持するbucketへ変更した。alias 2のresolveはalias 1の観測を上書きしない。
- `safeWritePath()`から呼ばれる既存root guardは、その物理rootに残る全live observationについて、要求path、ancestor alias chain、物理root identity、Repo／Git identityを重要read／write直前に再検証する。どれか一つでも差替えを検出すると`clarity-root-changed`、`changed:false`で停止する。
- 同じalias／identityの反復resolveは同じtokenへdedupeし、lease countだけを増やす。`clearClarityRootObservation(handle)`はhandle単位でleaseを解放し、最後のleaseで観測を除去する。従来のroot文字列cleanupはその物理rootの全観測を除去する。最後の観測を解放した後はroot guard自体も除去するため、token／観測の無制限な重複とstale guardの再利用を避ける。
- `refreshClarityRootAfterOwnedReplacement()`と`revalidateClarityRoot()`も単一slotではなくlive observation集合を扱うように揃えた。一般`workingRoot()`、Clarity以外のfilesystem API、利用者向けflagは変更していない。
- collaboration inventoryの`clarity-root-policy` digestだけを現在product bytesへ更新した。surface、case、marker、path集合は変更していない。

### AR-008回帰追加

同じ物理Repo Aを指すalias 1／alias 2を同一processで順にresolveし、alias 1 handleを保持したままalias 1だけをRepo Bへ差し替えた。その後、alias 1旧handleから次を独立検査した。

- `README.md`の重要read直前path解決: `clarity-root-changed`、`changed:false`
- `.clarity/project.json`の重要write直前path解決: `clarity-root-changed`、`changed:false`
- 旧Repo A／新Repo Bのtree digest: read／write negativeの前後で双方不変
- alias 1 handle cleanup後: alias 2 handleは誤停止せずRepo Aをread可能
- alias 2の重複handle cleanup後: alias 1の現在参照先Repo Bを新規resolveして安全pathを再利用可能
- 同一aliasの反復resolve: observation tokenが同一で、同じlive observationを重複保持しない

既存AR-008の単一alias差替えと同path inode差替えも保持した。AR-008は1 caseのままで、CF 7＋AR 14の21 ID、Severity、feature割当、受け入れ基準、証拠形式は変更していない。

### Retry 1変更file

```text
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/lib/clarity-root.mjs
scripts/sprint-050-patch-003-test.mjs
docs/progress/sprint-050-patch-003.md
```

Planner所有の`docs/spec*`／Sprint契約、Orchestrator所有の`docs/sprints/state.md`、Evaluator所有の`docs/feedback/**`は変更していない。private／Yasashii、installed cache、manifest、version、release／Marketplaceも変更していない。

### Retry 1実行結果

| command | result |
|---|---|
| `node scripts/sprint-050-patch-003-test.mjs` | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0`。新しいAR-008 interleaving read／write／cleanupを含む |
| Git-free current bytesで同上 | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| `node scripts/sprint-041-test.mjs` | `PASS=43 FAIL=0` |
| `node scripts/sprint-045-test.mjs` | `PASS=35 FAIL=0` |
| `node scripts/sprint-046-test.mjs` | `PASS=34 FAIL=0`、LK-007 PASS、remote command 0、canary不変 |
| `node scripts/sprint-047-test.mjs` | `PASS=25 FAIL=0`、GS-009 stress 32 CLI＋32 Hook、parse／unique／rebuild 100% |
| `node scripts/sprint-049-inventory.mjs validate` | `PASS=19 FAIL=0 CASES=41 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-049-test.mjs` | `PASS=20 FAIL=0`、CLX-006／020 PASS、side-effect violation 0 |
| `bash scripts/sprint-048-regression.sh`（通常環境） | validator 24/24、`SPRINT048_PASS=12 FAIL=0`、wrapper `PASS=8 FAIL=0`、PK-007／008 PASS |
| `node --check`（変更した2つの`.mjs`） | exit 0 |
| `git diff --check` | exit 0 |

最初のsandbox内Sprint 048は既知の`listen EPERM 127.0.0.1`でPK-007が停止した。同じcandidateを通常環境で再実行し、master回帰、Git-free、clean checkout相当、wrapperを含め0 FAILで完走した。

`node scripts/sprint-050-test.mjs --coverage-only`はRetry 1でも既知baselineの`primary meaning/severity changed`でexit 1、actual `6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8`、expected `f3782f008a362f4a7d9d38afeb48cda97ced61062e69fd062093132277ccf979`だった。Retry 0と開始HEADで因果分離済みのV-02であり、本Retryではspec／registry case本文を変更していない。

### Retry 1残余／未実施境界

- fresh独立Evaluatorの再現・採点、Evaluator PASS、Orchestratorのstate更新は未実施。
- UI変更がないためbrowser／DOM／screenshotは非該当。Windows native、Claude Code／Codex live Hook、external Xmindは未実施。
- 実顧客repo、Mac mini対象repo、private my-vault、Yasashii、installed cache、実provider／connector、実remote、networkへは触れていない。
- install、version bump、CHANGELOG、release inventory、Marketplace、cachebuster、reinstall、new session、push、PR、tag、GitHub Releaseは未実施・未変更。
- external／downstream writeは0件。検証のwriteはOS一時directory内のsynthetic fixtureだけである。

Evaluatorはclean candidateでTarget suiteを先に実行し、AR-008のalias 1／alias 2 tokenが別であること、alias 2 resolve後もalias 1旧観測が残ること、差替え後のread／write双方が`clarity-root-changed`／`changed:false`であること、旧A／新B tree不変、handle cleanup後のalias 2／Repo B再利用を独立確認する。その後、上表の近傍回帰を増分再評価する。Generator自己評価をVerdictへ流用しない。

## Retry 2 — F-02 request lifecycleとstale guard解放

- Retry開始HEAD: `19d9231e29327378c5d46bdc0ccf7fc5a7d54943`
- 対象: 最新EvaluatorのCritical F-02と、既存AR-014／AC13を守るV-01回帰だけ
- 実装日: 2026-08-30
- ステータス: Generator実装・自己検査完了、fresh独立Evaluator待ち。本節はEvaluator PASSではない。

### lifecycle修正

- `clarity-root.mjs`へ同期request scopeを追加した。scopeはrequest中に取得したobservation handleだけを所有し、正常returnとthrowの双方で`finally`相当により逆順解放する。timeout、process global全clear、次request開始時のstale観測掃除には依存しない。
- 同一request内で同じobservation tokenをnested resolveした場合、追加取得したleaseだけを即時返却し、request所有handleを1つ維持する。別aliasの異なるtokenは同じ物理rootでも独立保持し、重要read／write直前の全live alias guardを弱めない。
- CLI、公開core、link、projection、Drift、Secretary adapter、Hook runnerと各library entrypointをrequest scopeへ結線した。各入口はalias handleをrequest開始から結果render／例外処理直前まで保持し、その間のphysical rootを使うnested callも同じscopeへ参加する。
- `clearClarityRootObservation()`は製品入口からscopeの所有handle単位で呼ばれる。root文字列による全clearは製品request lifecycleに使っていない。一般`workingRoot`既定、root自身／内部／broken／file-target symlink拒否、Drift source locator、Git／portable metadata境界は変更していない。
- lifecycle対象pathを含むcollaboration inventoryの既存surface digestだけを更新した。surface、marker、case ID、割当、証拠形式は追加・変更していない。

### AR-008／AR-014回帰

- AR-008はRetry 1のalias 1／alias 2 interleavingを維持する。異なるalias token、同一観測2 lease、alias 1差替え後の重要read／write双方の`clarity-root-changed`／`changed:false`、旧Repo A／新Repo B bytes不変、alias 2継続利用、最終lease後のRepo B再利用を検査する。
- さらにrequest scope内でalias observationを保持し、physical rootへのnested resolveが同じtokenへdedupeされることを確認した。request中にaliasを別Repoへ差し替えるとread／write双方がfail-closedし、scope終了後は旧physical Repoを新しいrequestで正常利用できる。
- AR-014へEvaluator F-02と同じ製品入口再現を追加した。同一processで公開core `previewInit(aliasC)`を2回正常完了し、aliasをRepo Dへretargetした後、別requestの`previewInit(physicalC)`が成功する。Repo C／Dのtree digestとGit snapshotは前後不変である。
- 失敗requestも別fixtureで検査した。`applyInit(aliasC)`が`no-candidates`でthrowした後にaliasをretargetし、別requestの`previewInit(physicalC)`が`clarity-root-changed`へ誤停止せず成功する。

### Retry 2変更file

```text
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/clarity.mjs
plugins/secretary/scripts/clarity-secretary.mjs
plugins/secretary/scripts/clarity-hook.mjs
plugins/secretary/scripts/lib/clarity-root.mjs
plugins/secretary/scripts/lib/clarity-core.mjs
plugins/secretary/scripts/lib/clarity-link.mjs
plugins/secretary/scripts/lib/clarity-projection.mjs
plugins/secretary/scripts/lib/clarity-drift.mjs
plugins/secretary/scripts/lib/clarity-secretary.mjs
plugins/secretary/scripts/lib/clarity-hook.mjs
scripts/sprint-050-patch-003-test.mjs
docs/progress/sprint-050-patch-003.md
```

Planner所有の`docs/spec*`／Sprint契約、Orchestrator所有の`docs/sprints/state.md`、Evaluator所有の`docs/feedback/**`は編集していない。private／Yasashii、installed cache、manifest、version、release／Marketplaceも変更していない。

### Retry 2実行結果

| command | result |
|---|---|
| `node scripts/sprint-050-patch-003-test.mjs` | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0`。AR-008 request中差替え／dedupe／cleanupとAR-014 success・failure lifecycleを含む |
| Generator commitのGit-free archiveで同上 | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| `node scripts/sprint-041-test.mjs` | `PASS=43 FAIL=0` |
| `node scripts/sprint-045-test.mjs` | `PASS=35 FAIL=0` |
| `node scripts/sprint-046-test.mjs` | `PASS=34 FAIL=0`、LK-007 PASS、remote command 0、canary不変 |
| `node scripts/sprint-047-test.mjs` | `PASS=25 FAIL=0`、GS-009 stress 32 CLI＋32 Hook、parse／unique／rebuild 100% |
| `node scripts/sprint-049-inventory.mjs validate` | `PASS=19 FAIL=0 CASES=41 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-049-test.mjs` | `PASS=20 FAIL=0`、CLX-006／020 PASS、side-effect violation 0 |
| `node --check`（変更した全11 `.mjs`） | exit 0 |
| `git diff --check` | exit 0 |

`bash scripts/sprint-048-regression.sh`はsandbox内で既知の`listen EPERM 127.0.0.1`によりPK-007が停止した。通常環境でもvalidator 24/24とPK-001〜006の後にexisting master regressionが長時間無出力となったため、このGenerator runでは中断し、PASSとは記録していない。Retry 1 candidateでは同じ回帰が通常環境で0 FAILだったが、Retry 2 candidateのEvaluator証拠へ流用しない。

### Retry 2残余／未実施境界

- fresh独立Evaluatorの再現・採点、Evaluator PASS、Orchestratorのstate更新は未実施。
- UI変更がないためbrowser／DOM／screenshotは非該当。Windows native、Claude Code／Codex live Hook、external Xmindは未実施。
- Sprint 048 full wrapperは上記の長時間baseline中断によりRetry 2 candidateで完走していない。Sprint 041／045／046／047／049とTarget／inventoryは0 FAILである。
- 実顧客repo、Mac mini対象repo、private my-vault、Yasashii、installed cache、実provider／connector、実remote、networkへは触れていない。
- install、version bump、CHANGELOG、release inventory、Marketplace、cachebuster、reinstall、new session、push、PR、tag、GitHub Releaseは未実施・未変更。
- external／downstream writeは0件。検証のwriteはOS一時directory内のsynthetic fixtureだけである。

Evaluatorはclean candidateでTarget suiteを最初に実行し、AR-014の公開core success反復→alias retarget→旧physical別request成功、failure request後のcleanup、Repo C／D tree・Git不変を独立確認する。AR-008は複数alias guard、request中のread／write fail-closed、nested token dedupe、lease cleanup／reuseを再確認する。その後、上表の近傍回帰を増分評価する。Generator自己評価をVerdictへ流用しない。
