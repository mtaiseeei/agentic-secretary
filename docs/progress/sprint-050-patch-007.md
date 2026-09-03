# Sprint 050 Patch 007 — Generator進捗

## 実装結果

Windowsで同じGit rootが8.3短縮pathと長いpathとして返る場合の誤拒否を、更新処理のroot確認だけで解消した。
文字列のcase変換、separator置換、prefix、basenameでは同一性を推測しない。双方が通常directoryで、Node.jsの
`lstatSync(..., { bigint: true })`から得た0ではない`dev`／`ino`が完全一致する場合だけ同一rootとして扱う。

更新開始時にはworkspace、Git top-level、Git管理directoryのidentityを観測する。明示同意、dirty／Secret検査を通過し、
最初のwriteである保護commitへ進む直前に同じ3 identityを再取得する。rootまたはGit管理directoryが差し替わった場合は
保護commit、session、backup、plugin update、migrationより前に停止する。retry、resume、rollbackを含む既存更新契約は
変更していない。

## 変更file

- product: `plugins/secretary/scripts/update-apply.mjs`
- product helper: `plugins/secretary/scripts/lib/update-root-identity.mjs`
- focused regression: `scripts/sprint-050-patch-007-test.mjs`
- Windows causal connection: `.github/workflows/windows-recording-regression.yml`
- inventory declaration: `plugins/secretary/collaboration-inventory.json`
- Generator handoff: `docs/progress/sprint-050-patch-007.md`

version、manifest、CHANGELOG、migration metadata、release artifact、Clarity／Xmind製品bytesは変更していない。

## focused正負例

`node scripts/sprint-050-patch-007-test.mjs`

```text
SPRINT050_PATCH007_PASS=24 FAIL=0 WINDOWS_NATIVE=NOT-RUN
```

確認した意味は次のとおり。

- BigIntの`dev`／`ino`を精度を落とさず保持し、完全一致だけを受理する。
- dev差、ino差、0、BigInt以外、非directory、別root、親子root、prefix siblingを拒否する。
- Gitの単一絶対pathだけを受理し、複数行と非0を拒否する。
- workspace自身のsymlinkを拒否し、差替え後のrootを次のwrite前に拒否する。
- 通常root観測、Git管理外拒否、差替え拒否の前後でfixtureのGit状態を変更しない。
- Windowsでは実8.3 aliasとGit top-levelの表記差を要求する。POSIX結果をWindows PASSへ昇格しない。

## 既存更新回帰

`node scripts/sprint-032-update-gate-test.mjs`

```text
SPRINT032_RELEASE_PASS=15 SPRINT032_RELEASE_FAIL=0
```

同一版とdowngradeは副作用0件で停止した。公開0.7.0の旧scanner blocker、0.7.0 CHANGELOG、
0.6.0→0.7.0 migration fixtureも既存意味を保持した。

`bash scripts/sprint-032-regression.sh`

```text
SPRINT032_PASS=5 SPRINT032_FAIL=0
```

release integrity、canonical／legacy CHANGELOG、same-version bridge不存在も0 FAILだった。

## 関連Clarity／Windows近傍回帰

- `scripts/sprint-038-patch-002-windows-test.mjs`: 12／12、OS=darwin。
- `scripts/sprint-038-patch-003-conversation-migration-test.mjs`: 9／9、Windows nativeはNOT-RUN。
- `scripts/sprint-050-patch-004-test.mjs`: 12 PASS、0 FAIL、Windows 4 caseはNOT-RUN、external write 0、network 0。
- `scripts/sprint-050-patch-005-test.mjs`: 9 PASS、0 FAIL、Windows 1 caseはNOT-RUN、external write 0、network 0。
- `scripts/sprint-047-patch-002-test.mjs`: 12／12、Git probe 1／request、Windows 8.3はNOT-RUN。
- `scripts/sprint-047-patch-004-test.mjs`: 13／13、zero-write negative 12、BigInt precision PASS。
- `scripts/sprint-047-test.mjs`: 25／25、Hook 32＋CLI 32、64／64 exit 0、parse／unique／State rebuild 100%、residue 0。

- `scripts/sprint-047-patch-001-test.mjs`: 23／23。logical write、rollback、cleanup、lock境界を保持した。

## Windows workflow

既存`.github/workflows/windows-recording-regression.yml`の`windows-native`、Windows Server 2025、Node 22、
`timeout-minutes: 10`を維持した。同じjobへ次を追加した。

- `update-apply.mjs`のsyntax確認
- `scripts/sprint-050-patch-007-test.mjs --require-windows`
- 既存`scripts/sprint-032-update-gate-test.mjs`

既存Clarity、Harness scanner、conversation migration、logical write、concurrencyのstep、case、thresholdは削除・緩和していない。
Windows nativeはOrchestratorがexact candidateを通常pushするまでNOT-RUNである。

## inventory宣言

workflow bytesが変わったため、契約で許可された`clarity-harness-scanner.contentDigest`だけを
`adbd8823cd49b10c7971d6ef5c682be339a05d824ac766987a7156c533b78245`へ同期した。

```text
SPRINT049_INVENTORY_PASS=20 FAIL=0 CASES=67 MARKERS=VALID DIGESTS=VALID
```

JSON semantic diffは当該1値だけで、他surface、field、path、marker、test、schemaは不変である。

## 残るgateと外部境界

- Windows native focused 8.3 positive、Sprint 032 15／0、既存関連step: NOT-RUN。
- fresh独立Evaluator: NOT-RUN。
- public PRへの通常push: Generatorでは0件。
- private my-vault／Yasashii source write、merge、release、tag、GitHub Release、Marketplace、install、cache、
  loaded version、live workspace、実Xmind、connector external write: 0件。
- 本実装・local検証でnetwork call、credential prompt、fetch、pull、push、remote変更: 0件。

Windows実機で8.3短縮名が利用できない環境ではfocused native positiveがFAILし、文字列fixtureだけでPASSにはしない。
Orchestratorは通常push後、exact candidateのWindows raw logでfocused 0 FAIL、Sprint 032 15／0、既存step 0 product FAILを確認する。
