# Sprint 047 Patch 001 独立評価

## 判定

- Verdict: **FAIL**
- Failure kind: **implementation-issue**
- Escalation Recommendation: **strongを維持**
- 対象: `sprint-047-patch-001`（regular patch / high risk）
- 評価role: fresh独立Evaluator
- dispatchで宣言された期待metadata: `gpt-5.6-sol` / `high`
- Product findings: **1件（blocking 1）**
- Verification-infra findings: **0件**
- Blocking findings: **1件**

Windows nativeの通常stress、Patch専用23 case、Sprint 047、関連Patch、conversation migration、inventory、portable 3面はすべてgreenだった。
しかし、契約が明示的に禁止する「別processのactive replacement lock削除」を、既存の決定的test seamと実process 2件を使った独立negativeで再現した。

期限切れlockの同一identity確認後から`rmSync()`までの間に、別processがそのstale lockを回復して新しいowner／tokenのactive lockを取得すると、
先行processは置換後lockを削除して`exit 0 / changed: true`になり、実際にlockを保持していたprocessは`exit 4 / canonical-cleanup-incomplete`になった。
したがってAC 4、9、10、C1、C3、C5、C6、C19、C21、C24が既存閾値を満たさず、本Patchは不合格である。

## Candidateと因果境界

| 役割 | commit | tree | 独立確認 |
|---|---|---|---|
| stale lock製品candidate | `59ac895b32a434b03ba748b895e26e2911bff8e8` | `45a3da59700dc83e302c5e7b238600d6b0675c33` | 製品、Patch test、inventory変更を含む |
| progress head | `5253d1d11b95e2939da78b9a3e585a5da436be0a` | `5a8f5e00b26fbdf7669d52df39c027e544be0e07` | `59ac895`との差分はprogress 1 fileのみ |
| Windows causal head | `5b225696741f6482c2b827bf9c507e1c5d0cb1f7` | `fdfd346205fc12b75d692c554727a0609f1d6329` | `5253d1d`との差分はstate 1 fileのみ |
| 評価開始/current HEAD | `b8628096d6a8aabef59e9e3f512dc269c82ca3da` | `8e18bc68d961f049b4a47f53a7f11a8c81b1a06e` | `5b225696`との差分はstate 1 fileのみ |

ancestryは`59ac895 -> 5253d1d -> 5b225696 -> b862809`である。

```text
git diff --name-status 59ac895..5b225696
M docs/progress/sprint-047-patch-001.md
M docs/sprints/state.md

git diff --name-status 5b225696..b862809
M docs/sprints/state.md
```

次の製品／test／workflow／inventory scopeはいずれも`git diff --exit-code`で差分0だった。

```text
plugins/secretary/**
scripts/**
.github/workflows/**
plugins/secretary/collaboration-inventory.json
```

workflow blobもcurrent sourceとWindows causal headで同一の
`cf9483bdd01cb76c2b8f69da538f76b0bc06bc53`だった。
したがってWindows runの製品／test証拠はcurrent HEADへ継承できる。state-only差分を製品差分として扱っていない。

## 独立実行結果

評価開始時のsource worktreeはcleanだった。exact candidate `59ac895`のlocal cloneをdetached checkoutしたclean面と、
`git archive 59ac895`から作った`.git`不存在のGit-free面を別々に実行した。

| command / suite | source current HEAD | exact clean `59ac895` | Git-free `59ac895` |
|---|---|---|---|
| `node scripts/sprint-047-patch-001-test.mjs` | exit 0、23 PASS / 0 FAIL | exit 0、23 / 0 | exit 0、23 / 0 |
| `node scripts/sprint-047-test.mjs` | exit 0、25 / 0、Critical 16/16、AC 7/7 | 同左 | 同左 |
| Sprint 047 GS-009 | Hook 32＋CLI 32、64/64 exit 0、parse／unique／rebuild 100%、residue 0 | 同左 | 同左 |
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS / 0 FAIL / 4 Windows NOT-RUN | 同左 | 同左 |
| `node scripts/sprint-050-patch-005-test.mjs` | 9 PASS / 0 FAIL / 1 Windows NOT-RUN | 同左 | 同左 |
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9 / 9、Windows NOT-RUN | 同左 | 同左 |
| `node scripts/sprint-049-inventory.mjs validate` | 20 / 20、67 cases、markers／digests valid | 同左 | 同左 |
| `node scripts/agentic-archive-gate.mjs` | exit 0、`PASS=9 FAIL=0 CLARITY_REGRESSION=25` | source gateが同じcandidate bytesのarchiveを検査 | source gateが同じcandidate bytesのarchiveを検査 |

source GS-009の実測は次のとおりだった。

- writers 64、Hook 32、CLI 32、exit 0は64/64
- canonical／Hook JSON parse 100%、ID unique true
- expected deltaは各32、State rebuild true
- rebuild前後residue 0
- max lock wait `1258 / 15000 ms`
- max lease critical `172 / 30000 ms`
- round `2603 / 600000 ms`

exact cleanではmax wait `1105 ms`、lease `156 ms`、round `2147 ms`、Git-freeではmax wait `1118 ms`、lease `106 ms`、round `2024 ms`だった。

追加の静的整合は次をすべてexit 0で確認した。

```text
git diff --check
node --check plugins/secretary/scripts/lib/clarity-core.mjs
node --check scripts/sprint-047-patch-001-test.mjs
```

## Windows native raw log

GitHub Actionsをread-onlyで独立確認した。

| 項目 | 観測 |
|---|---|
| Workflow | `Windows recording regression` |
| Run / conclusion | `33477548460` / success |
| Job / conclusion | `99759871060` (`windows-native`) / success |
| Event / branch | `pull_request` / `codex/sprint-041-project-clarity` |
| head SHA | `5b225696741f6482c2b827bf9c507e1c5d0cb1f7` |
| Runner | Microsoft Windows Server 2025 |
| Image | `windows-2025-vs2026` |
| Node / platform | `v22.23.2` / `win32 x64` |
| Job time | 06:25:42Z〜06:30:14Z、4分32秒（272秒） |
| 10分margin | 328秒 |

raw logの集計は次のとおりだった。

- P001-01〜23: **23 PASS / 0 FAIL / platform win32**。P001-23実行行を確認。
- conversation migration: **9 / 9**、`WINDOWS_NATIVE=RUN`。
- Patch 004: **16 PASS / 0 FAIL / 0 SKIP / 0 NOT-RUN**、`WINDOWS_VERIFIED=true`、external write 0、network 0。
- Patch 005: **10 PASS / 0 FAIL / 0 SKIP / 0 NOT-RUN**、`WINDOWS_VERIFIED=true`、external write 0、network 0。
- Sprint 047: **25 / 25**、Critical 16/16、AC 7/7、registry missing／duplicate／extra 0。

GS-009の3 roundはすべて各64 writer（Hook 32＋CLI 32）、64/64 exit 0、expected delta各32、parse／unique／State rebuild true、
residue before／after 0だった。

| round | max lock wait / 15s | wait margin | max lease critical / 30s | round duration / 10分 |
|---:|---:|---:|---:|---:|
| 1 | 7080 ms | 7920 ms | 1016 ms | 13934 ms |
| 2 | 6404 ms | 8596 ms | 1164 ms | 14743 ms |
| 3 | 5368 ms | 9632 ms | 993 ms | 12982 ms |

Actionsの`actions/checkout@v4`／`actions/setup-node@v4`にNode 20 deprecation warningと、action内部の`punycode` warningがある。
製品suiteはNode `v22.23.2`で実行され、全step／jobはsuccessだったため、これは製品／test failureではないnonblocking platform warningとして分離する。

## Blocking product finding

### P1: stale identity確認後のactive replacement lockを削除して先行writeを成功させる

- 分類: **product**
- Blocking: **yes**
- 影響AC: 4、9、10
- 影響rubric: C1、C3、C5、C6、C19、C21、C24

`removeOwnedStaleLock()`は期限切れrecordを読み、`safeDeletePath()`後にtoken／expiresAtを再確認する。
しかし、その最終確認後にtest barrierとfailure injectionを通ってから`rmSync(checked)`するまで、対象identityをlock deleteと結び付けていない。
その間に別processが旧stale lockを回復し、新owner／tokenのactive lockを取得しても、先行processは同じpathを削除できる。

独立negativeはrepo内testや製品を変更せず、temporary fixtureだけで次を実行した。

1. 同じClarity-owned／token／expiresAtの期限切れlockを配置した。
2. process Aを、製品に既存の`CLARITY_TEST_MODE=1`用barrierで、stale identity確認後・`rmSync`直前に停止した。
3. process Bを実製品CLIのEvent writeとして起動した。Bは旧stale lockを回復し、別token／operation IDのactive lockを実取得した。
4. Bをproduction canonical replace境界の既存failure injectionで有限時間保持した。
5. Bのactive lock bytesとactive leaseを確認してからAのbarrierを解除した。

期待結果は、Aがowner／token／active変更を検出してreplacement lockを保持し、待機またはfail closedすることだった。
実結果は次のとおりだった。

```json
{
  "activeReplacementPreservedWhileSecondRuns": false,
  "firstExit": 0,
  "secondExit": 4,
  "firstChanged": true,
  "secondErrorCode": "canonical-cleanup-incomplete",
  "finalLockExists": false
}
```

単なるlock recordの手書きだけでも同じ境界を再現し、Aは`exit 0 / changed: true`、replacement lockは不存在となった。
上記の主証拠はさらに実process Bがそのactive lockを保持している間の結果である。

これはtest専用の成功分岐で結果を作ったものではない。barrierは契約どおりidentity確認後・実`rmSync`直前の競合を決定的にするだけで、
両processのlock取得、canonical replace、cleanup、exitは製品の実filesystem経路を通った。
通常Windows 3 roundがgreenでも、この順序を踏まなかったことはactive replacement保持の証明にならない。

契約はactiveな別process lock、owner／token不一致lock、回復中lockの横取り、同時正当owner、別process lock削除を明示的に0件要求する。
このfindingは新しい証拠schemaや契約外基準ではなく、着手時のAC 4／9／10と必須negative controlそのものに対する失敗である。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | Sprint 047 25/25、GS-009 32＋32、GS-010意味維持 |
| 2 | PASS | Windows 3 roundが各64/64、parse／unique／rebuild、residue、wait／lease／round marginを満たす |
| 3 | PASS | Windows native実canonical pathと決定的failure injectionを分離して確認 |
| 4 | **FAIL** | stale identity確認後のreplacement owner／tokenを削除直前に保持できず、実active lockを削除した |
| 5 | PASS | permanent／permission failureは有限非0、成功表示0、P001-02／20／23の既存証拠成立 |
| 6 | PASS | 置換前・Event／Evidence後・State前のrollback suiteはgreen |
| 7 | PASS | double fault、durable progress、doctor／rebuild／cleanup suiteはgreen |
| 8 | PASS | progress一致／不一致state-mismatchのfail-closed suiteはgreen |
| 9 | **FAIL** | owner／token不一致の別process active lockをAが削除したため、別process lock変更0件を満たさない |
| 10 | **FAIL** | active replacementでowner／token変更を即停止できず、Bのactive lockをAが横取りした |
| 11 | PASS | record前failure、識別不能lock、orphan tempの既存negativeはgreen |
| 12 | PASS | 3 crash／kill地点とownership区別の既存negativeはgreen |
| 13 | PASS | P001-23非ENOENT errorのpath／raw message非露出、canonical不変、Git／Secret境界成立 |
| 14 | PASS | source／exact clean／Git-freeの対象関連gateが0 product FAIL。archive gate 9/9 |
| 15 | PASS | Case ID／Severity／件数／3 round／threshold緩和0、単なるrerunだけで判定していない |
| 16 | PASS | Windows causal runはexact product/test bytes、4分32秒、正margin、0 FAIL |
| 17 | PASS | workflow pathsにSprint 047本体とPatch入口があり、inventory digest valid |
| 18 | PASS | offline fixtureのnetwork／external write 0、評価中のGitHub操作はread-only log確認だけ |
| 19 | PASS | handoff ready未発行、private／Yasashiiへ未反映 |
| 20 | PASS | merge／release／tag／Marketplace／install／cache／live workspace／実Xmind／downstream write 0 |

1件でも既存閾値未達ならFAILという契約に従い、AC 4／9／10の3件未達で不合格とする。

## Rubric scores

| 軸 | Score | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | **3/5** | 4 | FAIL | Windows通常面を含む多くの成果は成立したが、必須AC 4／9／10が未達 |
| C2 構文・整合 | **5/5** | 5 | PASS | Node構文、registry、workflow trigger、inventory marker／digest、candidate系譜が整合 |
| C3 機能の実証 | **3/5** | 4 | FAIL | 通常suiteはgreenだが、必須のactive replacement実process negativeが失敗 |
| C5 安全・規律 | **4/5** | 5 | FAIL | 別process owner／tokenのactive lockを削除する安全違反が1件 |
| C6 無回帰 | **4/5** | 5 | FAIL | handed-over suiteは全greenだが、着手時契約の必須negative controlでproduct failureを再現 |
| C19 Clarity正本・状態モデル | **4/5** | 5 | FAIL | Aが成功、Bがcleanup不完了となり、owner／tokenによるlogical write排他が成立しない |
| C21 Clarity Hook・host parity | **4/5** | 5 | FAIL | Windows通常3 roundは成立したが、共通concurrent canonical lockのreplacement順序で破綻 |
| C24 Clarity安全・統合・public-first | **4/5** | 5 | FAIL | public-first／portable／Secret境界は成立したが、lock／retry安全にproduct違反1件 |

C2以外のゼロ許容軸を、通常suiteやWindows runの高い実数で相殺していない。

## Findings集計

### Product findings

- **1件（blocking）**: stale identity確認後のactive replacement lock削除。上記P1。

### Verification-infra findings

- **0件**。
- 既存P001-23は同一stale identityの競合`ENOENT`収束を正しく検証するが、active replacement順序を通さない。
  これは今回、着手時契約のproduct negativeを実行した結果であり、handed-over suite実行不能や新証拠schema要求ではない。

### Blocking findings

- **1件**。P1が解消され、同じactive replacement順序で別process lock保持、両writeの正直な終端、canonical／State整合、residue 0を再評価するまでPASS不可。

## UI／screenshot

本Patchはserver、browser UI、DOM、responsive画面を持たないCLI／filesystem変更である。
契約の適用軸にもC8、C23等のvisual採点は含まれないためscreenshotは非該当。
実CLI、実filesystem、実process、Git 3面、Windows native Actions raw logを操作証拠とした。

## NOT-RUNとNon-scope

- macOSのPatch 004 Windows専用4件、Patch 005 Windows専用1件、conversation migration Windows面はtruthful NOT-RUNで、macOS PASSへ数えていない。Windows因果runだけで対応するnative結果を確認した。
- 実Xmind MCP／local `.xmind` apply、実顧客data、実provider、実Claude／Codex host installは本PatchのNon-scope／conditional NOT-RUNでありPASSへ数えていない。
- Windows network share全般、全UNC、WSL変換、Clarity以外のatomic write再設計はNon-scopeのまま。
- Node 20／punycode warningはActions platform保守警告で、製品／test findingへ昇格していない。

## Residual risks

- 通常Windows 3 roundがgreenでも、stale確認直後に別writerがactive lockを取得する狭い順序は未保護である。
- 今回の決定的reproductionでは先行Aが成功表示し、Bがcleanup不完了になった。高並行Hook／CLIで発生すると、可用性低下だけでなく同時owner状態とpartial operation診断へ波及する可能性がある。
- `ENOENT`後にpathが存在する場合は現行コードが`false`を返し、再確認不能はsanitized errorでfail closedする。問題はその前段、最終identity確認後から`rmSync`までに別identityへ置換された場合である。
- 前回のepisode reset、parent／lock `lstat` sanitize、15秒／1502 attempts、30秒lease、P001-01〜22はgreenであり、それらをfindingの原因としていない。

## Release／downstream状態

- public Sprint完了: **未達**
- public fixed handoff: **未発行**
- private my-vault同期／評価: **未実施**
- Yasashii同期／評価: **未実施**
- merge／release／tag／GitHub Release／Marketplace: **未実施**
- install／update／cache／new session／loaded version: **未実施**
- live workspace／実Xmind／Mac mini: **未実施**
- push: Evaluatorは**未実施**

## 自己レビュー

- Generator progress、Fable Go、stateのWindows PASS記録をVerdictへ流用せず、契約、rubric、実diff、3面の実CLI、Actions metadata／raw log、追加の実process negativeから独立判定した。
- Windows結果をmacOSへ置換せず、macOS NOT-RUNをPASSへ数えていない。
- 契約に無いcollector、attestation、追加schema、実providerを合否条件にしていない。
- findingを`product`へ分類し、verification-infra単独でFAILにしていない。
- code、test、fixture、inventory、workflow、spec、contract、progress、stateを変更していない。Evaluator所有の本feedbackだけをrepoへ追加した。
- Windows通常runがgreenである事実と、active replacement順序のblocking product defectを両方そのまま記録し、片方で他方を隠していない。
