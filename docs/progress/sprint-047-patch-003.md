# Sprint 047 Patch 003 Generator進捗 — GS-009 State oracleの修復前比較

- 対象: `sprint-047-patch-003`（regular patch、verification-only、Risk medium）
- 開始時点: `599d3bd`（Patch 003のstate開始commit）
- verification／inventory commit: `c9ca65e608819a40bfced9f2de495b0b2edda550`
- verification／inventory tree: `9f9fb641411812e480366f4009c49f2bba87964d`
- progress commit: この文書を単独commitで記録
- product code: 変更なし
- workflow: bytes変更なし

## 実装内容

`scripts/sprint-047-test.mjs` の既存 `GS-009` に、全64 writer終了、JSON parse／ID unique／期待delta、
residue-beforeの確認後、write付き `clarity rebuild` より前に次を追加した。

1. 製品のread-only API `rebuildState(root, { write: false })` を直接呼び出し、canonical Event／Evidenceから
   再構築した全Stateのcanonical serializer相当bytesを取得する。
2. stored `.clarity/state.json` をJSONとして正規化した全体と比較する。`source.eventCount` だけではなく、
   `generatedAt`、`quadrants`、全 `items` とそのDecision／Execution／Validation／Attention／Evidence参照を含む
   State全fieldが比較対象になる。
3. read-only rebuildの前後でstored State bytesと一時Repo全体のfilesystem snapshotが一致し、
   `changed: false`であることを確認する。read-only oracleのcanonical／lock／temp／runtime／Git artifactへの
   writeは観測されない。
4. 後段の明示write付きrebuildは残し、正常系で `changed: false`、State bytes前後同一、State rebuild 100%を
   `rebuildNoop` と `preRebuildFullState` として記録する。既存 `stateRebuild`、writers、round、threshold、
   既存metricは維持した。

同じ一時fixtureのGS-009終了後、`source.eventCount`は正しいまま `generatedAt` だけを `2099-01-01` に変える
決定的negativeを作成した。negativeは最後に元bytesへ復元し、実Repo／canonical／利用者Gitを汚さない。

```text
STATE_ORACLE_NEGATIVE=CONFIRMED
eventCountEqual=true
fullStateMismatch=true
repairBeforeLegacyCheck=true
legacyEventCountOnlyGreen=true
readOnlyChanged=false
```

これは、旧順序（write付きrepair後に `eventCount` だけ比較）なら `repaired.changed=true` の後に
`eventCount` が一致してgreenになり得ることと、新oracleがrepair前に全State mismatchを検出することを、
同じfixtureで示す。read-only比較後に明示repairを実行し、repair結果がcanonical read-only Stateへ戻ることも確認した。

## 変更pathと境界

verification／inventory commitの変更pathは次の2本だけ。

```text
scripts/sprint-047-test.mjs
plugins/secretary/collaboration-inventory.json
```

inventoryの `clarity-harness-scanner` digestは実変更後に再計算し、20 surface／67 caseの整合を保った。
product code（`plugins/secretary/scripts/**`）、workflow、spec、contract、rubric、case registry、state、
feedback、private my-vault、Yasashiiは変更していない。

```text
product code diff: 0
workflow bytes diff: 0
new collector: 0
new product seam: 0
```

## ローカル検証

macOS localは契約どおり1 roundで実行した。

| command | result |
|---|---|
| `node scripts/sprint-047-test.mjs` | exit 0、Sprint 047 **25/25**、Critical 16/16、AC 7/7、GS-009 writer 64/64、read-only full-State／rebuild no-op／negative confirmed |
| `node scripts/sprint-047-patch-001-test.mjs` | exit 0、P001 **23/23** |
| `node scripts/sprint-047-patch-002-test.mjs` | exit 0、P002 **12/12**、Git probe/request 1、timeout 5,000ms |
| `node scripts/sprint-050-patch-003-test.mjs` | exit 0、root／alias **21/21**、external write 0、network 0 |
| `node scripts/sprint-049-inventory.mjs validate` | exit 0、20 surface／67 case、markers／digests valid |
| `node --check scripts/sprint-047-test.mjs` | exit 0 |
| `node --check plugins/secretary/scripts/lib/clarity-core.mjs` | exit 0 |
| `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/windows-recording-regression.yml")'` | exit 0、workflow YAML valid |
| `git diff --check` | exit 0 |

GS-009 localの主な観測値は次のとおり。

```text
writers=64, exitsZero=64
canonicalExpectedDelta=32, hookExpectedDelta=32
canonicalUnique=true, hookUnique=true
preRebuildFullState=true, rebuildNoop=true
residueBeforeRebuild=0, residueAfterRebuild=0
maxCanonicalLockWaitMs=1124 / 15000
minCanonicalLockWaitMarginMs=13876
maxCanonicalLeaseCriticalMs=206 / 30000
minCanonicalLeaseMarginMs=29794
roundDurationMs=1830 / 600000
```

既存の `SUPPLEMENTAL=2`、`STRESS_CLI=32`、`STRESS_HOOK=32`、State rebuild 100%は変更していない。

## Windows／Evaluator handoff

- Windows Server 2025／Node 22 native run: **NOT-RUN**（GeneratorではWindowsを実行していない）
- Windows 3 round×（Hook 32＋CLI 32）、各roundの64/64、lock wait 15秒、lease 30秒、job 10分は
  fresh独立Evaluatorが同一candidateの既存workflow raw logで確認する。
- Windows 8.3、private my-vault、Yasashii、release／install／cache／live workspace／Xmind／connectorは
  本Patchの対象外またはNOT-RUNであり、macOS結果をWindowsへ昇格しない。
- push、workflow dispatch、merge、release、tag、Marketplace、downstream writeはGeneratorでは0件。

## Worktree

progress作成前のverification／inventory commit直後は、上記2ファイル以外に差分なし。
このprogressを別commitした後、Orchestratorへ2 commitのSHA／tree、ローカル結果、Windows NOT-RUN、
worktree状態を引き渡す。state更新、feedback、push、Windows実行、Evaluator判定はOrchestratorの責務である。
