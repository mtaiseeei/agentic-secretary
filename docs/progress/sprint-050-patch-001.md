# Sprint 050 Patch 001 Generator progress

## 実装結果

- 既存 `public-evaluator-pass` の `evaluatePreWriteGate`、CLI `prewrite`、tracked templateの
  `preWriteGate` を変更せず、別status `public-user-decision-risk-accepted` 専用のgateを追加した。
- `acceptedSource` はSprint 050 product candidate
  `5f08d454c05576fcff8ab32c10c00887b4c15a96` に固定し、Patch実装commitを指す
  `governanceSource` と別fieldにした。
- origin feedback commit／path／SHA-256／Verdict、AC3／C21、`XM-007`、別phase residual、
  authorization ID／日付／原文／文脈／scope／失効条件、下流repo identity／順序、common／excluded／
  protected path、adapter seam、Xmind edition差、protected digest、rollbackを個別にfail closed検査する。
- governanceは、明示された実装SHAだけでなく、そのSHAをHEADに持つclean Git checkoutと、
  `docs/feedback/sprint-050-patch-001.md` の `Verdict: PASS`／`Evaluated commit`／feedback digestが
  一致した場合だけ受理する。Generator自己評価、state文字列、別commitのfeedbackではreadyにならない。
- tracked `adapters/downstream-clarity-handoff.json` は
  `pending-public-evaluator-pass`、`acceptedSource: null`、両gate `closed`、`writesDownstream: false` のまま。
  ready artifactはrepositoryへ作成していない。
- Sprint 049 inventoryは、Sprint 050 accepted product projectionの既存digestを従来どおり検査し、
  Patchのgovernance-only fieldをaccepted product bytesへ混同しないよう分離した。新field自体はPatch専用66 caseで検査する。

## 変更file

- `adapters/downstream-clarity-handoff.json`
- `scripts/sprint-048-handoff.mjs`
- `scripts/lib/sprint-049-inventory.mjs`
- `scripts/sprint-050-patch-001-test.mjs`
- `docs/progress/sprint-050-patch-001.md`

`plugins/secretary/**`、`docs/feedback/sprint-050.md`、`docs/spec/**`、`docs/sprints/**` は変更していない。

## 起動／操作方法

このPatchはserverやUIを持たないため、test URLは `N/A`。

tracked templateのclosed状態確認:

```bash
node scripts/sprint-048-handoff.mjs validate-template
```

Patchのtargeted回帰:

```bash
node scripts/sprint-050-patch-001-test.mjs
```

Patch Evaluator PASS後だけ使える純粋なready生成（標準出力のみ。file／downstreamへwriteしない）:

```bash
node scripts/sprint-048-handoff.mjs build-user-decision-ready \
  --root . \
  --accepted-candidate-root <5f08d454...のGit-free archiveまたはclean checkout> \
  --accepted-observed-sha 5f08d454c05576fcff8ab32c10c00887b4c15a96 \
  --origin-feedback-root . \
  --authorization <明示authorization record JSON> \
  --governance-evidence <Patch governance evidence JSON> \
  --governance-root <Patch実装commitのclean detached checkout> \
  --governance-feedback-root . \
  --governance-observed-sha <Patch実装commit SHA> \
  --protected-snapshot <下流別protected digest JSON>
```

`prewrite-user-decision` も同じaccepted candidate／governance checkout／feedback／protected snapshotを
毎回再照合する。実downstreamへのwriteは別Harnessの責務であり、このcommandは行わない。

## 実行済み回帰

| command | environment | result |
|---|---|---|
| `node scripts/sprint-050-patch-001-test.mjs` | sandbox | `PASS=66 FAIL=0`（positive 6、negative 58、integrity 2） |
| `node scripts/sprint-049-test.mjs` | sandbox | `PASS=20 FAIL=0`、CLX-020 inventory digest PASS |
| `node scripts/sprint-048-validator.mjs` | sandbox | `PASS=23 FAIL=0 SKILLS=17 HOSTS=4` |
| `bash scripts/sprint-048-regression.sh` | sandbox | PK-007だけ `listen EPERM 127.0.0.1`。他PK-001〜006／008〜012 PASS。既知のverification-infra制約 |
| 同上 | normal environment | `SPRINT048_PASS=12 FAIL=0`、`SPRINT048_REGRESSION_PASS=8 FAIL=0`、release integrity PASS |
| `node scripts/sprint-050-test.mjs --report /tmp/agentic-secretary-sprint-050-patch-001-product-report.json` | normal environment | primary 250／CLX 20／XV 4、unique 274、`PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1`、E2E `4/4` |
| `git diff --check` | sandbox | exit 0 |

Sprint 050 product回帰の唯一のNOT-RUNは既存どおり `XM-007`。Critical 124/124、High 127 PASS＋1 NOT-RUN、
Medium 22/22。意味／Severity／初回Sprint割当変更0、cross-root write／Hook loop／task自動作成／
Decision誤確定0、external／downstream write 0。

## 独立Evaluatorの再現scenario

1. `git diff <Generator commit>^..<Generator commit>` で変更面が上記5 fileだけで、
   `plugins/secretary/**` と `docs/feedback/sprint-050.md` がdiff 0であることを確認する。
2. `node scripts/sprint-050-patch-001-test.mjs` を実行し、UD-001〜066と固定summaryを確認する。
   positive governance PASSは `/tmp` 内のisolated Git fixtureであり、実Patch PASSやtracked readyへ昇格しない。
3. `bash scripts/sprint-048-regression.sh` を通常環境で実行し、既存`public-evaluator-pass` PK-012を含む12/12と
   validator／release integrityを確認する。sandboxのloopback EPERMはproduct failureへ混ぜない。
4. `node scripts/sprint-050-test.mjs --report <tmp-report>` を通常環境で実行し、274 case／4 E2E、
   XM-007 truthful NOT-RUN、host／Xmind verified昇格0を確認する。
5. target testのisolated fixtureを基に、accepted SHA／tree／file count／common digest／common count、
   origin feedback各field／本文、authorization各field、residual削減、scope／path／repo／order／rollback、
   governance checkout dirty／HEAD差／feedback missing・非PASS・別commit、status alias／verified昇格の負例が
   それぞれ固有reasonで非0になることを確認する。
6. Evaluator自身のPASS feedbackを書くまでは、tracked templateがclosed、ready artifact 0、
   downstream／remote／release／tag／push／marketplace／cache／new session／実host／実Xmind write 0であることを確認する。

## 既知残余／境界

- このprogressはGenerator自己評価であり、handoffはまだreadyではない。fresh独立Evaluatorが本PatchをPASSし、
  feedbackが実装commitへ一致した後だけready生成条件が成立する。
- Sprint 050でユーザーが引き受けたAC3／C21の実host live未実施はPASSへ変換していない。
- `XM-007`、Claude Code Desktop、Codex App、Windows native、Mac mini、実downstream適用、release／tag／push／
  marketplace／installed cache／new sessionは未実施・未許可のまま。
- sandboxのloopback `EPERM` は通常環境の同一command PASSで切り分け済み。製品findingではない。

## Generator自己確認

- Acceptance Criteria 1〜11をtargeted fixtureと関連回帰へ対応付けた。
- zero-tolerance違反、公開product bytes変更、Sprint 050 feedback変更、tracked ready、実downstream／external writeは0。
- C1、C2、C5、C6、C24、C25の最終採点とPASS判定はfresh独立Evaluatorへ引き渡す。

## Retry 1 — 初回Evaluator FAILの限定修正

初回feedback commit `2e92ecfd59eb1b1f23afe7a67f06d22b58dc2ec0` のproduct finding
P-01／P-02だけを修正した。accepted product source、Sprint 050 feedback、既存`public-evaluator-pass`、
authorization、残余、downstream順序、path scope、tracked templateのclosed状態は変更していない。

### 変更

- governance feedbackは、本文中のcanonicalな機械可読行 `Verdict: PASS` と
  `Evaluated commit: <40hex>` がそれぞれちょうど1件ある場合だけ受理する。PASS／FAIL併存、同値を含む重複、
  0件、code fence、blockquote、例示、引用内marker、非canonical表記は固有codeでfail closedにした。
- manifest top-level、`downstreamRepositories`、`userDecisionPreWriteGate`、`fixedBindings`と全nested object、
  `requiredGovernance`、ready-onlyの`acceptanceBasis`／`verificationStatus`／`governanceSource`等へ、
  明示allow-key集合を持つclosed schemaを適用した。standard `validate-template`、user-decision build、
  `prewrite-user-decision`は同じschemaを通り、未知key、PASS alias、`evaluatorPass=true`をreadyへ通さない。
- Sprint 049の固定pre-Patch product projectionは、field位置に依存する`indexOf` sliceを廃止し、
  JSON構造から除外対象top-level memberだけを特定するprojectionへ変更した。projection前に同じclosed schemaを
  検査するため、除外領域へ未知governance bytesを追加してdigest検査から隠すことはできない。
- `scripts/sprint-050-patch-001-test.mjs`へUD-067〜089の攻撃fixture 23件を追加した。
  初回4系統に加え、同一Verdict重複、同一commit重複、blockquote、例示、引用、0件、nested／top-level／
  ready-only extra key、PASS alias、`evaluatorPass=true`を負例化した。各fixtureは固有拒否codeと非0相当を確認する。

Retry 1の変更fileは次の4件だけである。

- `scripts/sprint-048-handoff.mjs`
- `scripts/lib/sprint-049-inventory.mjs`
- `scripts/sprint-050-patch-001-test.mjs`
- `docs/progress/sprint-050-patch-001.md`

### Retry 1 実行済み回帰

| command | environment | result |
|---|---|---|
| `node scripts/sprint-050-patch-001-test.mjs` | sandbox | `PASS=89 FAIL=0`（positive 6、negative 81、integrity 2、attack fixture 23） |
| `node scripts/sprint-049-test.mjs` | sandbox | `PASS=20 FAIL=0`、固定pre-Patch projection digest維持 |
| `node scripts/sprint-048-validator.mjs` | sandbox | `PASS=23 FAIL=0 SKILLS=17 HOSTS=4` |
| `node scripts/sprint-048-handoff.mjs validate-template` | sandbox | `status=valid`、両gate closed、write 0 |
| `bash scripts/sprint-048-regression.sh` | sandbox | PK-007だけ`listen EPERM 127.0.0.1`。他の先行gateはPASS |
| 同上 | normal environment | `SPRINT048_PASS=12 FAIL=0`、wrapper `8/8`、release integrity PASS |
| `node scripts/sprint-050-test.mjs --report /tmp/agentic-secretary-sprint-050-patch-001-retry-1-product-report.json` | normal environment | primary 250／CLX 20／XV 4、`PASS=273 FAIL=0 CONDITIONAL_NOT_RUN=1`、E2E `4/4` |
| `node --check`（変更3 script）／`git diff --check` | sandbox | exit 0 |

Sprint 050回帰の唯一のconditional NOT-RUNは既存どおり`XM-007`。Critical 124/124、High 127 PASS＋1 NOT-RUN、
Medium 22/22で、cross-root write、Hook loop、task自動作成、Decision誤確定、external／downstream writeは0だった。

### Retry 1 再現手順

1. `node scripts/sprint-050-patch-001-test.mjs`を実行し、UD-001〜089と
   `ATTACK_FIXTURES=23`、`READY_ARTIFACT_TRACKED=0`、`DOWNSTREAM_WRITE=0`を確認する。
2. UD-067〜077で、Verdict／commitの競合・同値重複・0件、code fence／blockquote／例示／引用が、
   各固有codeで拒否されることを確認する。
3. UD-070／078〜089で、Sprint 049 projection、standard `validate-template`、build、
   `prewrite-user-decision`の全入口がtop-level／nested／ready-only未知key、PASS alias、
   `evaluatorPass=true`を固有codeで拒否することを確認する。
4. `node scripts/sprint-049-test.mjs`と通常環境の`bash scripts/sprint-048-regression.sh`を実行し、
   pre-Patch projection、既存`public-evaluator-pass` PK-012、validator、wrapper、release integrityの無回帰を確認する。
5. 通常環境でSprint 050 product回帰を実行し、274 case、E2E 4/4、`XM-007` truthful NOT-RUN、
   host／Xmind verified昇格0、external／downstream write 0を確認する。

### Retry 1 残余／境界

- このRetry 1もGenerator自己評価であり、handoffはまだreadyではない。fresh独立Evaluatorの単一canonical PASSが必要。
- Sprint 050でユーザーが受容したAC3／C21の実host live未実施はPASSへ変換していない。
- `XM-007`、Claude Code Desktop、Codex App、Windows native、Mac mini、実downstream適用、release／tag／push／
  marketplace／installed cache／new sessionは未実施・未許可のまま。
- sandbox loopback `EPERM`は、通常環境の同一Sprint 048回帰12/12＋wrapper 8/8 PASSで切り分けた。
