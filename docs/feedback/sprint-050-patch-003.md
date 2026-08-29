# Sprint 050 Patch 003 独立評価 — 正本freshness確認とClarity ancestor alias

- Evaluator: fresh独立Harness Evaluator
- 評価日: 2026-08-30
- Evaluated product/test candidate: `6497e09cc3fb5d52f5e282f04439fadcd25ac6b8`
- 評価開始時のorchestration HEAD: `f52938b860cb5f0dc52514b26f0ffac563e248bd`
- 開始HEAD: `e75a3f27ec894b03f705eff09b6e5f3f06b37cd7`
- Type: `regular`
- Verdict: **FAIL**
- Failure Kind: **implementation-issue**
- Escalation Recommendation: **strongを維持**
- Escalation Evidence: filesystem rootのfail-closed境界で、同一物理Repoを複数aliasから観測した場合にrequestごとのguardが失われ、差替え後の旧root writeを許すproduct findingを再現した。

## 結論

公式Target suiteはCF-001〜007、AR-001〜014を21/21 PASSし、独立fixtureでも一般`workingRoot`の既定拒否、
Clarity内部opt-in、alias／physical identity、bounded canonical read、Secret／binary／large／symlink除外、
単一aliasの差替え停止、Drift locator拒否、portable metadata、Git不変、`/var`／`/tmp`回帰を確認した。
Sprint 041／045／046／047／049、inventory、通常環境Sprint 048、Git-free archiveもgreenだった。

しかしAR-008を懐疑的に広げ、同じ物理Repo Aへ2つのancestor aliasから同一processで順に到達させると、
後から解決したalias 2の観測がalias 1のroot guardを上書きする。alias 1だけをRepo Bへ差し替えた後、
alias 1由来の旧handleで`safeWritePath(..., ".clarity/project.json")`を呼んでも
`clarity-root-changed`にならず成功した。返されたpathへsynthetic writeすると旧Repo Aのtree digestが変わり、
新しいalias 1の参照先Repo Bは不変だった。

契約はroot observationをrequest中に保持し、alias差替えを重要read／write直前に検出して旧／新rootを
どちらも変更せず停止することを要求する。これはAR-008、AC1／9／11、C5／C24のゼロ許容条件に反するため、
Sprint全体を不合格とする。

## Rubric score

| 基準 | Score | 閾値 | 判定 | 独立根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **3/5** | ≥4 | FAIL | 21 TargetのうちAR-008が複数alias interleavingで未達。AC1／9／11がFAIL |
| C2 構文・整合 | **5/5** | 5 | PASS | `git diff --check` 0、inventory 19 surface／41 case、Patch 21 ID重複・未割当・extra 0、既存274のspec bytes不変 |
| C5 安全・規律 | **4/5** | 5 | FAIL | root差替え後に旧rootの安全pathを返すfail-openが1件。synthetic fixtureで旧root writeを再現 |
| C6 無回帰 | **5/5** | 5 | PASS | Patch 21、Sprint 041／045／046／047／049、通常環境Sprint 048／Git-free／wrapperは0 FAIL。coverage digest差は開始HEADとcandidateで同一の既存verification-infraとして分離 |
| C20 Attention・Clarity UX | **5/5** | ≥4 | PASS | status／daily／weekly／Portfolioが正本観測、observedAt、revision、freshness、未確認理由をbounded表示。snapshot単独断定0 |
| C22 federated link・sync・Drift | **5/5** | 5 | PASS | alias／physical identity一致、link bundle absolute path 0、`drift-path-symlink`維持、Sprint 046 34/34 |
| C24 Clarity安全・統合・public-first | **4/5** | 5 | FAIL | 単一aliasは成立するが、同一physical rootの複数alias観測でrequest固有guardが上書きされ、差替え後writeを止められない |

合計は**31/35**。C1、C5、C24が閾値未達であり、1軸でも未達ならFAILの規則に従う。

## Acceptance Criteria

| AC | 判定 | 独立確認 |
|---:|---|---|
| 1 | **FAIL** | 公式suiteは21/21だが、AR-008の複数alias interleavingがFAIL。最終Targetは20 PASS／1 FAIL |
| 2 | PASS | status／daily／weekly／Portfolioの4 surfaceで`README.md` 57 bytesをread。Repo／Git／Clarity identity、observedAt、revision、freshnessを確認 |
| 3 | PASS | remote-only／missing／unsafe／unreadable／staleを`unavailable`等の固有reasonで返し、network／Git write 0。snapshotから`aligned`断定0 |
| 4 | PASS | `.env`、binary、70 KiB、内部symlinkを`sensitive-name`／`binary`／`file-too-large`／`symlink-not-followed`で本文非読取。Secret canary露出0 |
| 5 | PASS | 一般`workingRoot`のoption省略／falseは`working-root-unsafe`。CLIは利用者flagなしで`clarity-internal-root-resolver`／`allowAncestorSymlinks:true` |
| 6 | PASS | 未初期化alias／physicalはともに`clarity-not-initialized`。初期化済みのProject ID、Repo identity、Git top-levelが一致 |
| 7 | PASS | alias／physical previewは`changed:false`。既存`CLARITY.md`を保持し、apply追加は`.clarity/events.jsonl`、`evidence.jsonl`、`project.json`、`state.json`だけ |
| 8 | PASS | `root-self-symlink`、`root-internal-symlink`、`ancestor-symlink-broken`、`ancestor-symlink-not-directory`を区別し、external canary不変 |
| 9 | **FAIL** | 単一alias／同path inode差替えは`clarity-root-changed`だが、別aliasの後続観測後は先のalias差替えが`allowed`となり旧root writeを止めない |
| 10 | PASS | `.clarity` tracked data、link bundle、projectionをscanし、fixture alias／physical absolute pathとSecret canary 0 |
| 11 | **FAIL** | 通常canonical観測と公式positive／negativeはGit不変だが、複数alias差替えnegativeで安全pathが返り、synthetic writeにより旧root treeが変化した |
| 12 | PASS | ST-008、LK-007、CLX-006、GS、macOS platform alias、Git-free、Sprint 041／045／046／047／049／048は0 product FAIL。Sprint 050 coverage guardの既存赤はV-02へ分離 |
| 13 | PASS | CLI／core／link／projection／Drift／Secretary adapter／Hookを独立fixtureから直接通し、単一aliasでは同じphysical root policy、固有errorを確認 |
| 14 | PASS | inventory 19 surface／41 case、Patch 21 ID、duplicate 0、missing 0、extra 0、feature各1。開始HEADからprimary／CLX／XVのspec bytes不変 |
| 15 | PASS | Fable reviewはPlanner後／Generator前の履歴をstateで確認。製品PASS、Evaluator証拠、scoreへ流用していない |

## Target Case 21件

| ID | 判定 | 観測 |
|---|---|---|
| CF-001 | PASS | ancestor alias配下の`canonicalRepo`をstatusがbounded readし、policy／identity／Clarity状態を返した |
| CF-002 | PASS | workspace snapshotは`stale-snapshot`、正本は`current-at-observation`として分離 |
| CF-003 | PASS | daily／weekly／Portfolioが同じrevision／first-file digest／freshness意味を共有 |
| CF-004 | PASS | remote-onlyは`read-only-provider-evidence-unavailable`、network／Git operation 0 |
| CF-005 | PASS | Secret／binary／large／symlink本文0、理由をexcludedへ記録 |
| CF-006 | PASS | missing／unsafe／unreadable／staleはtruthful availability、`changed:false` |
| CF-007 | PASS | canonical observation前後のfilesystem／dirty／staged／untracked／HEAD／branch／remote不変 |
| AR-001 | PASS | 一般option省略／false拒否、Clarityだけ内部opt-in |
| AR-002 | PASS | alias／physical未初期化の次判定一致、初期化済み成功 |
| AR-003 | PASS | Repo／Git／Clarity identity一致 |
| AR-004 | PASS | preview write 0、applyは物理Repoの宣言済み`.clarity/**`だけ |
| AR-005 | PASS | working root自身のsymlinkを`root-self-symlink`で拒否 |
| AR-006 | PASS | `.clarity`外向きsymlinkを`root-internal-symlink`で拒否、外部canary不変 |
| AR-007 | PASS | broken ancestorをinspection前に拒否 |
| AR-008 | **FAIL** | 単一alias／inode差替えは停止するが、同一物理rootを別aliasが後から観測すると先のrequest guardが上書きされ、差替え後writeを許す |
| AR-009 | PASS | link bundleへalias／physical absolute local path 0 |
| AR-010 | PASS | dirty／staged／untracked、HEAD、branch、remote保持 |
| AR-011 | PASS | read-only comparatorだけで`drift-path-symlink`、Evidence／Git変更0。resolve／apply／commit未実行 |
| AR-012 | PASS | macOS `/var`→`/private/var`、`/tmp`→`/private/tmp`。利用者home／volume hard-code 0 |
| AR-013 | PASS | file向きancestorを`ancestor-symlink-not-directory`で拒否 |
| AR-014 | PASS | CLI／core／link／projection／Drift／Secretary adapter／Hookの各入口を共有helper unitだけにせず直接操作 |

## Findings

### F-01 — 同一physical rootの後続alias観測が先のrequest guardを上書きし、alias差替え後の旧root writeを許す

- 対象区分: **product**
- Severity: **Critical**
- Failure Kind: `implementation-issue`
- 該当: AR-008、AC1／9／11、C1／C5／C24
- 実装箇所: `plugins/secretary/scripts/lib/clarity-root.mjs:12,154-165`、`plugins/secretary/scripts/lib/safe-fs.mjs:47-58,125-127`

再現手順は次のとおり。

1. synthetic Repo A／Bを作り、alias 1とalias 2をどちらもRepo Aのworkspaceへ向ける。
2. alias 1由来で`resolveClarityRoot()`し、旧handleを保持する。
3. alias 2由来で同じ物理Repo Aを`resolveClarityRoot()`する。
4. alias 1だけをRepo Bへ差し替える。
5. alias 1由来の旧handleのphysical rootで`safeWritePath(root, ".clarity/project.json")`を呼ぶ。

期待は`clarity-root-changed`／`changed:false`だが、観測は`allowed`だった。返されたpathへsynthetic writeすると
Repo Aのtree digestだけが変化し、Repo Bは不変だった。外部・実顧客repoへのwriteは行っていない。

原因は`observations`と`rootGuards`がphysical rootをkeyにした単一slotであることにある。alias 2のresolveが
alias 1のrequest固有observation／guardを置換し、その後の`safeWritePath`はalias 2だけを再検証する。
修正時はrequest固有のobservation tokenを重要read／writeへ渡すか、同一physical rootのlive observationを
上書きせず管理し、呼出し元requestのalias chainを必ず再検証する必要がある。回帰は少なくとも
2 alias interleavingのread／write双方とcleanup後再利用をAR-008内へ追加する。

### V-01 — 公式AR-008 fixtureが単一aliasだけで、guard上書きを検出しない

- 対象区分: `verification-infra`
- Severity: Major
- 単独の合否影響: なし。F-01のproduct failureを隠す検出漏れとして記録

`node scripts/sprint-050-patch-003-test.mjs`はalias差替えと同path inode差替えを各1観測で検査するため21/21になる。
同一physical rootを別aliasが後から観測するinterleavingを既存AR-008 fixtureへ追加すれば、新collectorなしで検出できる。

### V-02 — Sprint 050 coverage-onlyのprimary digest guard差は開始HEADから存在する

- 対象区分: `verification-infra`
- Severity: non-blocking baseline
- candidate因果: なし

current checkoutに加え、開始HEAD `e75a3f2...`とcandidate `6497e09...`を同じGit-free archive面へ展開し、
両方で同じcommandを実行した。いずれもexit 1、同じstack位置、同じdigestだった。

```text
node scripts/sprint-050-test.mjs --coverage-only
AssertionError: primary meaning/severity changed
actual   6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8
expected f3782f008a362f4a7d9d38afeb48cda97ced61062e69fd062093132277ccf979
```

これはSprint 050全体のPASS証拠には数えない。一方、candidate diffより前から同じ停止を再現し、Patch対象suite、
inventory、関連回帰は別の現役commandでgreenなため、F-01とは別の既存verification-infra baselineとして分類する。

### V-03 — sandboxのSprint 048 loopback EPERM

- 対象区分: `verification-infra`
- Severity: environment-only／解消確認済み

sandbox内のSprint 048はPK-007配下で`listen EPERM 127.0.0.1`となった。同一candidate・同一commandを通常環境で
再実行し、PK 12/12、Git-free／clean checkout、wrapper 8/8、exit 0を確認した。製品findingへ数えない。

## 実行証拠

### Target suiteと独立fixture

```text
node scripts/sprint-050-patch-003-test.mjs
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0

# exact candidateのGit-free archive相当でも同じcommand
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0

node <OS一時directory>/sprint-050-p003-evaluator.mjs
generic workingRoot omitted/false: working-root-unsafe
single alias/inode replacement: clarity-root-changed
multi alias replacement: outcome=allowed, expected=clarity-root-changed
old physical root changed=true, new alias target changed=false
canonical status/daily/weekly/Portfolio: available/current-at-observation
excluded: sensitive-name,binary,file-too-large,symlink-not-followed
portable absolute path hits=0, Secret hits=0
drift=drift-path-symlink
platform aliases=/private/var,/private/tmp
```

独立fixtureはOS一時directoryだけに作り、完了時に削除した。実顧客repo、private／Yasashii、installed cache、
remote、provider、networkへは触れていない。

### 関連回帰

```text
node scripts/sprint-041-test.mjs
SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43

node scripts/sprint-045-test.mjs
SPRINT045_CASE_PASS=35 FAIL=0 TOTAL=35

node scripts/sprint-046-test.mjs
SPRINT046_TEST_PASS=34 FAIL=0 ... REMOTE_COMMANDS=0 CANARY=UNCHANGED

node scripts/sprint-047-test.mjs
SPRINT047_TEST_PASS=25 FAIL=0 ... STRESS_CLI=32 STRESS_HOOK=32 EVENT_PARSE=100% EVENT_UNIQUE=100% STATE_REBUILD=100%

node scripts/sprint-049-inventory.mjs validate
SPRINT049_INVENTORY_PASS=19 FAIL=0 CASES=41 MARKERS=VALID DIGESTS=VALID

node scripts/sprint-049-test.mjs
SPRINT049_PASS=20 FAIL=0 ... CLX-006 PASS ... SIDE_EFFECT_VIOLATIONS=0

bash scripts/sprint-048-regression.sh  # 通常環境
SPRINT048_VALIDATOR_PASS=24 FAIL=0 SKILLS=17 HOSTS=4
SPRINT048_PASS=12 FAIL=0 ... CRITICAL_PASS=7 CRITICAL_NOT_RUN=0
SPRINT048_REGRESSION_PASS=8 FAIL=0 TARGETS=12 ... AC_NOT_RUN=0
```

### Candidate／registry／worktree

```text
git diff --check e75a3f27ec894b03f705eff09b6e5f3f06b37cd7..6497e09cc3fb5d52f5e282f04439fadcd25ac6b8
exit 0

git diff --exit-code e75a3f27ec894b03f705eff09b6e5f3f06b37cd7..6497e09cc3fb5d52f5e282f04439fadcd25ac6b8 -- \
  docs/spec/clarity-acceptance.md docs/spec/clarity-acceptance-cases.md docs/spec/rubric.md
exit 0

node scripts/sprint-049-inventory.mjs validate
19 surface / 41 case / marker valid / digest valid
```

既存primary 250、CLX 20、XV 4の意味、Severity、初回割当は開始HEADとcandidateでspec bytesが同一。
PatchはCF 7＋AR 14の21 IDで重複0、未割当0、余分0、各1 featureである。candidateから評価開始HEADまでの
差分はOrchestrator所有の`docs/sprints/state.md`だけで、製品／test bytesはexact candidateと一致した。

## 未実施・残余境界

- UI変更がないためbrowser／DOM／screenshotは非該当。
- Driftはread-only locator negativeだけを実行し、resolve／apply／Git commitは実行していない。
- Sprint 050 primary 250／CLX 20／XV 4のfull suiteは既存coverage digest guardで開始前に停止した。これをPASS表示していない。
- 実Xmind MCP、Claude Code／Codex live Hook、Windows native、Mac mini対象repo、実顧客repoは未実施。
- private my-vault／Yasashii source、installed cache、Marketplace、version、release、push、PR、tag、remoteは未変更。
- 実provider、connector、network、clone／fetch／pull／checkoutは実行していない。
- 本feedbackはpublic source candidateの評価であり、release-ready、installed、loaded、external-liveを意味しない。

## Evaluator自己レビュー

1. Generator progressとFable reviewをVerdict根拠へ流用せず、公式command、exact candidate archive、独立fixtureを再実行した。
2. 公式21/21で停止せず、AR-008の既存文言「request中の観測」「重要write直前」「旧／新root不変」を同一physical rootの2 aliasで直接検査した。これは新しい合格条件ではなく、着手時点のfail-closed条件の反例確認である。
3. synthetic fixtureでのみ安全path後のwriteを行い、実顧客repo、private／Yasashii、remote、external dataには触れていない。
4. coverage-onlyの赤をcandidate product failureにも製品PASSにもせず、開始HEAD／candidateの同一command・同一Git-free面で因果分離した。
5. sandbox EPERMを通常環境の同一Sprint 048 commandで再確認し、製品と検証環境を分けた。
6. findingをproduct／verification-infraへ分け、F-01だけをimplementation-issueのFAIL根拠にした。
7. spec、contract、progress、state、製品、tests、fixture、inventoryは編集せず、本feedbackだけを書いた。

Orchestratorが本feedbackを確認して`docs/sprints/state.md`を更新するまで、進行状態は変更しない。
