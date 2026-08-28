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
