# Sprint 038 Patch 003 独立評価

## 判定

- Verdict: **PASS**
- Failure kind: **none**
- Escalation Recommendation: **none**
- 評価開始HEAD: `2a805c9928cc55b675fa61bf83cbdd6f9d2da3ee`
- 評価開始tree: `6cfab7d2364d7f5333932c285933dae4718467f3`
- 製品・直接回帰candidate: `77e38d43b378971571b544c1200088fe5fae6360`
- 最終verification candidate: `f64e973d0cc6ab7f8894d768e09c175129c07362`
- 最終verification tree: `a480cd46de3b473340a9a49e45b0e67343a49a3d`
- Windows因果head: `e70d3b7a85be5294168c3041cb0eff4ef4efe91f`
- Windows因果tree: `c801b2147cc401107d5a3efae798c2f0711f2bdb`
- 評価環境: macOS `darwin arm64`、Node.js `v22.23.2`
- Product findings: **0件**
- Blocking verification-infra findings: **0件**

本Patchは合格である。Generatorの自己評価をVerdictへ流用せず、契約、rubric、実装diff、実CLI、修正前negative、
source checkout、同一HEADのclean detached checkout、`.git`なしGit-free archive、PR #11のWindows job logを独立に確認した。

Windows Server 2025／Node.js 22.23.2では、conversation migration専用9 caseが0 FAILである。
通常apply、sibling temp、EEXIST retry、開始前canary保持、rename前／後failure、atomic相当rollback、失敗後retry、
成功後rerun、明示rollback、drive letter／backslash／空白／日本語pathを実filesystemで完走した。

このPASSはpublic source candidateだけを対象にする。private my-vault、Yasashii、merge、release、tag、Marketplace、
installed plugin／cache、loaded version、実利用者workspace migrationのPASSや完了へ昇格しない。

## Candidate系譜と因果境界

次のancestryを確認した。

```text
77e38d4... -> f64e973... -> e70d3b7... -> 2a805c9...
```

`e70d3b7...`から評価開始HEADまで、製品、test、workflow、inventoryの差分は0件で、差分はOrchestrator所有の
`docs/sprints/state.md`だけである。

```text
git diff --exit-code e70d3b7...2a805c9... -- plugins/secretary scripts .github/workflows plugins/secretary/collaboration-inventory.json
exit 0
```

Windows workflowはPR eventのmerge ref `9b6a315023724b49efb7325c9818fdc3ad86b6bc`をcheckoutした。
GitHub APIでmerge refとbranch head `e70d3b7...`がともにtree
`c801b2147cc401107d5a3efae798c2f0711f2bdb`を指すことを確認したため、base branch混入による別bytesではない。

主要bytesのSHA-256は次のとおり。

| Path | SHA-256 |
|---|---|
| `plugins/secretary/scripts/lib/conversation-migration.mjs` | `a972073d29883b429876a4a3d0a3eaed370674c20fbe3e6b2d15ae58888484ee` |
| `scripts/sprint-038-patch-003-conversation-migration-test.mjs` | `f3b189789bde2306bd26570d7b2ab38e0105ad70faa05ee9a8f14506f86352fc` |
| `.github/workflows/windows-recording-regression.yml` | `21e611a811f39e55eb73fcebccaeaf03d29eea647a981e90dea98c7e7e2e2752` |
| `scripts/sprint-050-patch-005-test.mjs` | `92800e4ba6941bb801a57c79c818685d52c3a3a52695dc940a92211ecc5ea174` |
| `plugins/secretary/collaboration-inventory.json` | `351692e44697eaec889014ca8134e8167bcb83df2e8c864485054a800db9e8bb` |

## 独立実行結果

### Source／clean detached／Git-free

評価開始HEADを、通常source、`git worktree add --detach`したclean checkout、`git archive`で作った`.git`なしcopyの
3面に固定して実行した。

| Command | Source | Clean detached | Git-free |
|---|---:|---:|---:|
| `node scripts/sprint-038-patch-003-conversation-migration-test.mjs` | 9 PASS / 0 FAIL / Windows NOT-RUN | 同左 | 同左 |
| `bash scripts/sprint-038-regression.sh` | base 67/0、Patch 003 9/0、classifier 14/0、path 3/0 | 同左 | 同左 |
| `node scripts/sprint-038-patch-002-windows-test.mjs` | 12 PASS / 0 FAIL / darwin | 同左 | 同左 |
| `node scripts/sprint-050-patch-004-test.mjs` | 12 PASS / 0 FAIL / 4 Windows NOT-RUN、HS-016 PASS | 同左 | 同左 |
| `node scripts/sprint-050-patch-005-test.mjs` | 9 PASS / 0 FAIL / 1 Windows NOT-RUN、SR-001 PASS | 同左 | 同左 |
| `node scripts/sprint-049-inventory.mjs validate` | 20 PASS / 0 FAIL / 67 cases / valid | 同左 | 同左 |
| `node scripts/archive-release-gate.mjs --root .` | `.git`ありを13/1で正しく拒否 | 同左 | **14 PASS / 0 FAIL** |

source／clean checkoutへarchive gateを誤適用した2回は、`archive root has no .git`だけを期待どおりFAILにした。
Git-free copyでは14/14であり、これを製品FAILやarchive未達へ数えていない。

`--require-windows`をmacOSで実行すると、8 PASS／1 FAIL、`WINDOWS_NATIVE=NOT-RUN`、exit 1となった。
別OSのWindows風path模擬からWindows PASSへ昇格できないことも確認した。

### 修正前negative control

修正前 `5509560c220ce953132ea19a108690540cceeb37` のGit-free製品bytesへ最終直接回帰だけを載せると、
4 PASS／5 FAIL、exit 1となった。通常temp観測、現行candidate collision、rename前のtarget再書込み、
rename後のatomic相当復元、明示rollback tempを検出した。

Fable補正前 `18a41825b5b28d9c8519fab94360619b8a35e87a`へ最終回帰を載せると、
6 PASS／3 FAIL、exit 1となった。現行candidate名の`EEXIST`を実際に通らない旧canary、決定的初回candidate名、
製品levelの`already-applied` no-op不足を検出した。最終candidateは同じ回帰で9/9である。

### Full offline gateの分離

参考観測として次も実行した。

```text
node scripts/master-release-gate.mjs --mode offline --timeout-ms 120000
RELEASE_GATE mode=offline status=fail suites=22 required=22 passed=19
verification-infra=0 failed=3 skipped=0 assertions=376 pass=373 fail=3
```

未達は、既知のSprint 011旧surface期待1 assert、Sprint 038 Patch 001の旧CHANGELOG／Hook期待2 assert、
固定historical suiteの120秒timeoutである。これらのtest、期待対象product bytes、master runnerは
本Patchのbase `5509560...`から最終candidateまで差分0件で、本Patchの対象回帰ではない。
full master全体をPASSとは表示しない一方、着手時に固定された対象safe harborは3面とWindowsで0 product FAILである。
既知baselineを本Patch都合で書き換えたり、skip／除外／期待値緩和したりしていない。

## Windows native evidence

`gh run view`とjob logをread-onlyで照合した。

| 項目 | 独立確認 |
|---|---|
| Run / Job | `33418410765` / `99574540666` |
| Workflow / event | `Windows recording regression` / `pull_request` |
| Head | `e70d3b7a85be5294168c3041cb0eff4ef4efe91f` |
| Merge ref | `9b6a315023724b49efb7325c9818fdc3ad86b6bc`、headと同一tree |
| Status | workflow `success`、job `windows-native` success、全step success |
| OS / image | Microsoft Windows Server 2025 `10.0.26100` / `windows-2025-vs2026` |
| Node | `v22.23.2`、x64 |
| Patch 002 | 12 PASS / 0 FAIL / `OS=win32` |
| Patch 003 | 9 PASS / 0 FAIL / `WINDOWS_NATIVE=RUN` |
| collision | `EEXIST_RETRY_OBSERVED=true`、`TEMP_CREATE_ATTEMPTS=2` |
| ownership | canary hash／mtime不変、owned temp residual 0 |
| Patch 004 | 16 PASS / 0 FAIL / 0 SKIP / 0 NOT-RUN、HS-016 PASS、`WINDOWS_VERIFIED=true` |
| Patch 005 | SR-001〜010 10 PASS / 0 FAIL / 0 SKIP / 0 NOT-RUN、`WINDOWS_VERIFIED=true` |
| External / network | 製品suite集計0 / 0、job token permissionはcontents read／metadata read |

Patch 003のjob logで、drive letter、backslash、空白、日本語を含むnative temp rootを確認した。
通常apply、EEXIST fallback、dry-run／ownership、stale、rename前後failure、retry／rerun、明示rollbackの各labelがPASSした。

Actionsの`actions/checkout@v4`／`actions/setup-node@v4`に対するNode 20 deprecation annotationは、action runtimeの保守観測である。
製品suiteはsetup後のNode 22.23.2で0 FAILなのでblocking findingにしない。

## 実装・安全境界の独立確認

- `basename`／`dirname`は実行中OSのpath実装を使い、temp basenameへdrive prefix、ancestor、separatorを入れない。
- tempは対象parent内で`wx`排他作成し、作成に成功したowned fileだけをwrite／cleanupする。
- 最初の候補が`EEXIST`なら別nonceへretryし、開始前canaryを上書き・unlinkしない。
- 完成bytesを`fsync`してclose後にrenameする。rename前failureでは対象mtimeが不変で、target再書込み0件。
- rename後failureと明示rollbackは、元bytesを別のowned siblingへ完成させてからrenameし、半端な直接復元writeをしない。
- cleanup／rollback失敗は成功へ丸めず`AggregateError`として表す。
- `already-applied` rerunは`changed:false`、temp作成0、target hash／mtime不変。
- Patch 005のSR-001はactual Current Sprintへ構造的に追随し、SR-001〜010のID、contract、rubric、thresholdは不変。
  invalid ID、missing row／files、duplicate final fallback、未分類user-decision feedbackを拒否し、case緩和ではない。
- 公開migration manifest／asset／fingerprint、release version／manifest／CHANGELOG／edition metadata、過去fixture、
  base Sprint／Patch 002正本の差分は0件。

## Rubric

| ID | Score | Threshold | 判定根拠 |
|---|---:|---:|---|
| C1 完成度 | **5/5** | ≥4 | AC1〜12を実CLI、negative、Windows native、履歴diffで確認 |
| C2 構文・整合 | **5/5** | 5 | `node --check`、inventory 20/20、`git diff --check`、native basename／parent整合 |
| C3 機能の実証 | **5/5** | ≥4 | apply、collision、failure injection、rollback、retry、rerunを実filesystemで操作 |
| C5 安全・規律 | **5/5** | 5 | 排他所有temp、外部canary不変、対象外write／Secret／downstream write 0 |
| C6 無回帰 | **5/5** | 5 | 固定scopeのsource／clean／Git-free／Windowsが0 product FAIL。full master既知baselineは差分0で別記 |
| C9 配布チャネル非依存 | **5/5** | 5 | OS native pathとNode共通core、配布metadata／固有表現の新規差分0 |
| C10 更新の安全性 | **5/5** | 5 | dry-run、stale、atomic apply／restore、rollback、rerun no-op、push禁止を維持 |
| C12 release履歴・candidate整合 | **5/5** | 5 | release／migration履歴差分0、現行0.11.0面不変、未release |
| C13 edition分離・互換 | **5/5** | 5 | publicだけを変更し、private／Yasashii／cache／workspace write 0、別評価順序を維持 |
| C15 authorization・意味保存 | **5/5** | 5 | Sprint 038 67/67、historical classifier 14/14、path 3/3。migration以外の意味契約差分0 |

C8はUI差分のないCLI／filesystem Patchなので非適用。browser、URL、screenshotを新しい合否条件へ追加していない。

## Acceptance Criteria

| AC | 結果 | 独立確認 |
|---:|---|---|
| 1 | PASS | Windows native通常applyが完了し、旧section 1件だけを置換、利用者前後bytesを保持 |
| 2 | PASS | tempはtarget parent直下、basenameにdrive／ancestor／separatorなし、対象外write 0 |
| 3 | PASS | dry-run、ownership不明、marker片側、複数一致、staleでtarget不変・owned temp残存0 |
| 4 | PASS | rename前target再write 0、rename後atomic相当復元、半端なsection／owned temp残存0 |
| 5 | PASS | failure後retryと成功後rerunが同一最終状態へ収束し、rerunはtemp作成0 |
| 6 | PASS | Sprint 038関連93/93、Patch 002 12/12、Git-free archive 14/14、Windows後続gate 0 FAIL |
| 7 | PASS | prepatch 4/5、Fable前6/3のnegativeを最終9/0へ閉じ、case削除／skip／threshold緩和0 |
| 8 | PASS | migration／release履歴、version／manifest／CHANGELOG／edition metadata、過去正本の意図しない差分0 |
| 9 | PASS | 完全SHA、OS／Node、command、exit、9/0、temp／rollback／rerun観測を同一Windows treeで固定 |
| 10 | PASS | 製品・回帰のexternal write／network 0、private／Yasashii／cache／利用者workspace不変 |
| 11 | PASS | 本feedbackはpublicだけを判定。下流はpublic PASS SHA固定後の別Harness／別Evaluatorを必須と明記 |
| 12 | PASS | merge、release、tag、GitHub Release、Marketplace、install、cache、live migration 0 |

## Finding分類と残余リスク

### Blocking findings

- product: **0件**
- verification-infra: **0件**

### Non-blocking observations

1. `verification-infra`: full offline masterには本Patch前からの3 suite未達が残る。今回scopeの全suiteはgreenで、
   未達を削除・skip・期待値緩和せず、master全体PASSとも表示していない。
2. `verification-infra`: Actions Node 20 deprecation annotationはaction runtimeの更新課題。製品Node 22結果と分離した。
3. `product residual / non-scope`: CRLFの完全byte保持、非UTF-8入力、`MAX_PATH`近傍、Windows固有lock競合、
   Windows上の`0o600`実効ACLは本契約外で未検証。
4. `product residual / non-scope`: Patch 005の最終`TBD` fallbackは時系列ではなくstate table記録順を使う既存意味のまま。

## NOT-RUNと外部操作境界

- private my-vault／Yasashiiの同期・回帰・独立評価: NOT-RUN。
- merge、release、tag、GitHub Release、Marketplace、plugin install／update、cache、loaded version確認: NOT-RUN。
- 実利用者workspace migration、実Xmind MCP／local `.xmind`、connector、実外部service write: NOT-RUN。
- EvaluatorによるnetworkはGitHub Actions metadata／log／commit treeのread-only照合だけ。push、dispatch、comment、merge等のwrite 0。
- workflowのPR branch pushはOrchestratorが評価前に許可済み境界で実行したもの。本Evaluatorは外部writeを実行していない。

## Write boundaryと自己レビュー

- 評価開始時のsource working treeはclean。clean detached checkoutも終了時clean。Git-free copyに`.git`なし。
- Evaluatorが書く正本は本feedback 1ファイルだけで、state、spec、contract、progress、製品、test、workflow、inventoryを編集しない。
- Generator progressは候補とcommandの入口にだけ使い、Verdictは実diff、独立実行、Windows job logから決めた。
- 過去run／別SHA／macOSのWindows風pathをWindows PASSへ流用していない。
- full masterの既知未達を隠さず、同時に対象suiteの0 FAILと混同していない。
- Orchestratorが本feedbackを確認し`docs/sprints/state.md`を更新するまで、EvaluatorはSprint statusを変更しない。
