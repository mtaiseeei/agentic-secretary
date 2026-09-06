# Sprint 050 Generator進捗 — Project Clarity最終統合gate

- 開始HEAD: `327431ba0b79843643c56c1eb1addc154da9f4b7`
- Generator: fresh strong tier、Retry 0
- 実装日: 2026-08-28
- 判定範囲: Generator自己検査のみ。EvaluatorのPASS、release acceptance、`done-by-user-decision`を兼ねない。

## 実装した検証資産

- `scripts/sprint-050-test.mjs`: canonical registry JSONだけからprimary 250、CLX 20、XV 4を解決し、Sprint 041〜049の実case runnerを起動する。runner exit、exact Case ID集合、重複、missing、extra、statusを機械照合し、別suite内の補助assertはCase数へ加えない。
- 同runner内にrepo内synthetic fixtureの`E2E-001`〜`E2E-004`を実装した。実顧客、提供PDF、提供Xmind、実user absolute path、private pathはfixtureへコピーしない。
- `scripts/sprint-050-candidate-check.mjs`: clean source、同じfull SHAのdetached checkout、`git archive`由来Git-free treeをsorted path＋mode＋bytesで比較する。full tree／common path digest、file count、`.git` 0、strict validator、release integrity、fixed handoffを確認する。
- `scripts/sprint-050-regression.sh`: 上記full coverage＋E2E、strict validator、release integrity、fixed handoff、`git diff --check`を1つの最終wrapperにまとめた。`--candidate`はcommit後のclean candidate checkも実行する。

registryのSprint割当とCaseの意味／severityは開始HEADのSHA-256をfrozen baselineにしている。primary／CLX／XVそれぞれのunique、group間割当重複、既存IDの別Sprint移動、意味変更を失敗にする。並列runnerの出力順は非決定的なので、runnerごとの完全な集合一致を確認した後、coverage reportだけregistry順へ正規化する。

## Case coverage

通常環境で同一wrapperを実行した。

```bash
bash scripts/sprint-050-regression.sh
```

```text
SPRINT050_REGISTRY primary=250 collaboration=20 visual=4 unique=274 missing=0 extra=0 duplicate=0 semantic_changed=0 assignment_changed=0
SPRINT050_COVERAGE PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1 TOTAL=274 CRITICAL=124/124 HIGH_PASS=127 HIGH_NOT_RUN=1 AC_EXECUTED=9 AC_PASS=8 AC_BLOCKED=1
SPRINT050_E2E PASS=4 FAIL=0 CROSS_ROOT_WRITE=0 HOOK_LOOP=0 TASK_AUTO_CREATE=0 DECISION_FALSE_CONFIRM=0
SPRINT048_VALIDATOR_PASS=23 FAIL=0 SKILLS=17 HOSTS=4
PASS release integrity: manifests and CHANGELOG are consistent
SPRINT050_REGRESSION PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1 CASES=274 E2E_PASS=4 E2E_FAIL=0 AC_EXECUTED=9 AC_PASS=8 AC_BLOCKED=1 HOST_EXTERNAL_LIVE=NOT_RUN XMIND_EXTERNAL_LIVE=NOT_RUN EXTERNAL_WRITE=0 DOWNSTREAM_WRITE=0
```

| group | total | PASS | conditional NOT-RUN | FAIL |
|---|---:|---:|---:|---:|
| primary Sprint 041〜048 | 250 | 249 | 1 | 0 |
| collaboration Sprint 049 | 20 | 20 | 0 | 0 |
| visual provider Sprint 043 | 4 | 4 | 0 | 0 |
| 合計 | 274 | 273 | 1 | 0 |

| severity | total | PASS | conditional NOT-RUN | FAIL |
|---|---:|---:|---:|---:|
| Critical | 124 | 124 | 0 | 0 |
| High | 128 | 127 | 1 | 0 |
| Medium | 22 | 22 | 0 | 0 |

- `XM-007`（High）だけが、未承認の実Xmind MCP external-liveであるためconditional `NOT-RUN`。未実行をPASSへ昇格していない。
- Sprint 050 ACは9件中、実行9、PASS 8、blocked 1。blockedはAC3のClaude Code／Codex実host liveだけである。
- Sprint 049 Retry 1のrouter反例8/8と独立25/25相当は`CLX-001`等を含む実`sprint-049-test.mjs`の20 Caseを再実行して保護した。
- Sprint 048 `PK-007`がexisting master regressionを実行し、`AGENTIC_REGRESSION_PASS=15 FAIL=0`を確認した。Sprint 041〜049の全runner exitは0である。

## E2E evidence

### E2E-001 — StandaloneからLinked／Portfolioまで

- `init` previewでwrite 0をtree比較し、明示`--apply`後に4象限を構築した。Project IDはlink／sync／Xmind提案反映後も不変。
- Mermaid raw projectionで4象限、emoji、label、意味、色、上軸／下軸を照合した。
- Claude CodeとCodexの実candidate Hook CLI commandへhost別synthetic payloadを渡し、SessionStart、PostToolUse、Stop checkpoint、`stop_hook_active`再入時のloop 0を別々に確認した。
- generic Secretary-local fixtureとのprepare→accept→finalizeを双方へ適用し、双方向sync、daily `今日の要確認`、Portfolio rollupを確認した。各操作のpeer treeを比較しcross-root write 0。
- Xmind public default OFF、隔離fixtureだけON。MCP capableはpriority 1の`mcp-selected`、不可時は`fallback-approval-required`でwrite 0、rejectは`stopped`でwrite 0、preview digestへの明示承認後だけtemp `.xmind`を作成／更新した。
- Xmind proposalは未承認時canonical変更0、明示承認後だけ反映。Git HEAD／branch／remote、Secret、TODO、Decision誤確定、task自動作成を不変確認した。

### E2E-002 — 匿名CRM導入PJ

- 合成sourceだけで5 area×3 Itemを作り、固定4象限と`将来アイデア` areaを構築した。
- Xmindのmatrix sheetとProject構造sheetで、各area／Item、4配置、emoji、label、意味、色、上軸／下軸を厳密照合した。
- Itemを定着・検証から暫定実装・要再確認へ遷移し、象限branchとProject構造badgeが同時に更新されることを確認した。
- canonical evidenceにtemp absolute path、実顧客、提供PDF／Xmind、`my-vault` literalがないことを確認した。

### E2E-003 — Critical Drift

- Decision根拠`docs/decision.md`の「メールアドレスを第一キー」と、実装根拠`src/lookup.js`の`customer_id`優先を比較し、Critical／rank 1のDriftを作った。
- 根拠2件を保持し、実装をemail優先へ修正後にalignedへresolvedした。historyにdriftとalignedの両方が残ることを確認した。

### E2E-004 — bounded morning

- Secretary-local合成Project 29件へ、実装済み未決定2、決定済み未実行1、Drift 1、idea 5、正常20を配置した。
- morningは判断4件を数え、表示3＋other 1にbounded化し、最優先をCritical Driftとした。idea／正常の詳細、Item body、connector readは0。

## host／provider status

| surface | 実証できたこと | 実証していないこと |
|---|---|---|
| Claude Code CLI | `claude --version`=`2.1.231`、candidate Hook CLIをClaude形式synthetic payloadで実行 | candidateを実hostへinstallしたlive conversation／Hook発火 |
| Codex CLI | `codex --version`=`0.147.0`、candidate Hook CLIをCodex形式synthetic payloadで実行 | Codexへの自己申告ではない実host install／live Hook発火 |
| Xmind MCP／App | adapter契約、priority、failure／approval state、temp local archive構造 | 実MCP connected create/read/update、実Xmind App openability |

`node scripts/agentic-live-host-gate.mjs --host claude-code-cli`と`--host codex-cli`は、どちらも`external-live-gate-unavailable`、execution `incomplete`、installed `false`を返した。external liveの個別許可はなく、合成payloadをhost verifiedへ昇格していない。`plugins/secretary/host-inventory.json`の4 candidate surfaceは`verified: false`のままである。これはAC3の残余であり、他ACの完走を妨げる製品findingはない。

Xmind external-liveも現在未承認のため`NOT-RUN`、`verified: false`。実user fileへのwrite 0。local `.xmind`は削除されるtemp fixture内だけである。

## visual contract

MCP request契約、承認済みtemp local Xmind、Mermaid raw projectionの3面で次を一致確認した。色だけでなくposition、emoji、label、意味もassertしている。

| position | emoji | label | meaning | color |
|---|---|---|---|---|
| 左上 | 🟢 | 定着・検証 | 安定している | `#16A34A` |
| 右上 | 🔵 | 実行待ち | あとは進めるだけ | `#2563EB` |
| 左下 | 🟡 | 暫定実装・要再確認 | 注意して確認する | `#D97706` |
| 右下 | 🔴 | 設計・意思決定 | 人間の判断が必要 | `#DC2626` |

上軸は「決まっている」、下軸は「まだ決まっていない」。

## candidate／handoff

commit後のclean candidateで次を実行する。full SHA、tree SHA-256、common path SHA-256、file countはこのcommandの出力を最終報告へ記録し、progressを書き換えてcandidate bytesを変えない。

```bash
bash scripts/sprint-050-regression.sh --candidate
```

candidate checkはsource／detached checkout／Git-free archiveのsorted path＋mode＋bytes digest、file count、common path digestを一致確認し、archive `.git` 0、両複製のstrict validator／release integrity／fixed handoffを実行する。

fixed handoffは引き続き次のままである。

- `publicationStatus: pending-public-evaluator-pass`
- `acceptedSource: null`
- `preWriteGate.status: closed`
- `writesDownstream: false`
- common／excluded／protected path、adapter seam、downstream order、file-scoped rollbackは既存templateから変更していない。

## sandbox finding／Sprint 022 timing debt

- sandbox内の最初のcoverage実行は、Sprint 048 `PK-007`内のmaster regressionが`listen EPERM 127.0.0.1`で停止した。契約やtimeoutを緩和せず、同一wrapperを通常環境で再実行し、274 Case／4 E2E／masterをexit 0まで完走した。
- このSprintでは製品code、Sprint 022 fixture、`safe-git.mjs`、`external-ops.mjs`を変更していない。最終通常環境wrapperでは既存Sprint 022もgreenで、timing待ち時間の緩和は0。

## 起動／Evaluator handoff

- startup command: なし。plugin／CLI／Hookの統合検証Sprintで、常駐appはない。
- test URL: なし。
- main regression: `bash scripts/sprint-050-regression.sh`
- clean candidate evidence: `bash scripts/sprint-050-regression.sh --candidate`
- machine-readable report: `node scripts/sprint-050-test.mjs --report /tmp/sprint-050-report.json`

Evaluatorは、同じclean candidateで274 coverage、4 E2E、candidate parityを再実行し、AC3はexternal-live未完了のまま独立判定する。Generator自己評価をPASS根拠として流用しない。

## Known residual／未検証境界

- AC3: public candidateのClaude Code／Codex実host live install／conversation／Hook発火は未検証。CLI executable存在とcandidate Hook commandのsynthetic payload実行だけを確認した。
- 実Xmind MCP connected create/read/update、実Xmind App openabilityは未承認のため`NOT-RUN`。
- Claude Code Desktop、Codex App、Windows native、Mac miniは未検証。
- 実private my-vault、Yasashii実repo、downstream candidate／handoff、installed plugin／cache、new session loaded versionは未実行。
- push、tag、GitHub Release、marketplace publish／refreshは未実行。

## 外部／下流副作用

- network／external connector write: 0
- 実Xmind cloud／local user file write: 0
- task自動作成／Decision誤確定／Hook loop／cross-root write: 0
- push／tag／GitHub Release／marketplace publish／refresh: 0
- installed plugin／cache／Mac mini変更: 0
- private my-vault／Yasashii実repo／downstream write: 0
- fixed handoff gate write: 0
