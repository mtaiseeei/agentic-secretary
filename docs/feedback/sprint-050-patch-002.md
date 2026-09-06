# Sprint 050 Patch 002 独立評価 — Claude標準Hook重複manifest宣言の解消

- Evaluator: fresh独立Harness Evaluator
- 評価日: 2026-08-29
- Evaluated product/test candidate: `60cda8f7529950465920aa2bed5657da30cacc07`
- 評価開始時のorchestration HEAD: `5caf80e`
- Type: `micro`
- Verdict: **PASS**
- Failure Kind: なし
- Escalation Recommendation: なし

## 結論

Claude manifestは標準`hooks/hooks.json`を重複宣言しない構成になり、Codex manifestは従来どおり
`./hooks/hooks.json`を明示参照している。両manifestと共通Hookは有効なJSONで、name、version、skills、
共通Hook event、Project Clarityの既存挙動を独立回帰で確認した。

変更はClaude manifestの`hooks`削除、host差に追随する現役assert、Generator progressに限定されている。
共通Hook、router、core、Clarity Skill、rules、inventory JSON、Codex manifest、Sprint 050／Patch 001の
履歴正本はPatch開始時から差分0である。実install、public live、release、Marketplace、cache、downstreamへは
昇格していない。

## 軽量評価

| 基準 | Score | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| 機能完全性 | **5/5** | 5 | PASS | Claudeは`hooks` fieldなし、Codexは正確な明示参照、共通Hook fileは同一pathに存在。PK-001／PK-002をhost別にPASS |
| 動作安定性 | **5/5** | 5 | PASS | JSON 3件、validator 24/24、host差の正負fixture、Hook 40/40、Sprint 048／049／035／Codex plugin／release integrityが0 FAIL |
| 回帰なし | **5/5** | 5 | PASS | 共通Hook／router／core／Skill／rules／inventory／履歴の差分0。Sprint 048 wrapper 8/8、Sprint 049 20/20、Hook regression 8/8 |

3項目すべて必須閾値5を満たした。

## Acceptance Criteria

| AC | 判定 | 独立確認 |
|---:|---|---|
| 1 | PASS | Claude manifestはJSONとして有効。`candidateHasHooks=false`、`name=agentic-secretary`、`version=0.11.0`、`skills=./skills/`。baselineから`hooks`だけを除いたJSON objectと完全一致 |
| 2 | PASS | Codex manifestはJSONとして有効で`hooks=./hooks/hooks.json`。Patch開始時との対象diff 0、SHA-256 `f7e5ba85465e0d172479701b82c0a4645a9a9f61005344912b3ba5ec232205f8` |
| 3 | PASS | 共通Hookは有効なJSON、mode `100644`、1,768 bytes、SHA-256 `7ac60c7f280c965321ced1658dd7fcdad1b481f09bd6eee5cf8153278b5bc40b`で開始時と同一 |
| 4 | PASS | router／core／Skill／rules／inventory対象diff 0。Sprint 044 Hook 40/40、Sprint 049 CLX 20/20、Sprint 048 wrapper 8/8 |
| 5 | PASS | validator、Sprint 048、Sprint 035、release integrityの現役pathはClaude field不在とCodex明示参照を別assertで要求。旧「両manifest同値」assertは対象実行pathから除去 |
| 6 | PASS | `PK-001`／`PK-002`はともにCritical、Sprint 048の単一割当を維持。Sprint 048は12/12、Critical 7/7 |
| 7 | PASS | Claude再追加、Codex削除／別path、共通Hook欠落／event改変の5負例を非0終了と固有理由で拒否 |
| 8 | PASS | source diffはClaude manifest、現役assert 5 files、inventory digest helper、progressの7 filesだけ。Hook実装、release／Marketplace／handoff／履歴fileの差分0 |
| 9 | PASS | stateはSprint 050=`done-by-user-decision`、Patch 001=`done`を維持。元feedbackは`verification-scope-issue`、product finding 0、AC3／C21 live未達のまま |
| 10 | PASS | 評価中にinstall、cache、workspace、remote、release、Marketplace、private／Yasashii repoへのwrite commandを実行していない。PK-011も副作用0を確認 |

## 実行証拠

### Manifest／JSON／identity

```text
python3 -m json.tool plugins/secretary/.claude-plugin/plugin.json
python3 -m json.tool plugins/secretary/.codex-plugin/plugin.json
python3 -m json.tool plugins/secretary/hooks/hooks.json
```

すべてexit 0。baseline／candidate JSON比較は次の結果だった。

```json
{"baselineHooks":"./hooks/hooks.json","candidateHasHooks":false,"otherFieldsEqual":true,"name":"agentic-secretary","version":"0.11.0","skills":"./skills/","fieldCount":8}
```

### Targeted packaging／negative

```text
node scripts/sprint-048-validator.mjs
SPRINT048_VALIDATOR_PASS=24 FAIL=0 SKILLS=17 HOSTS=4

bash scripts/sprint-048-regression.sh
SPRINT048_PASS=12 FAIL=0 ... CRITICAL_PASS=7 CRITICAL_NOT_RUN=0
SPRINT048_REGRESSION_PASS=8 FAIL=0 TARGETS=12 ... AC_NOT_RUN=0
```

`PK-001`／`PK-002`内の隔離fixtureで、次を確認した。

| 負例 | 観測した固有理由 |
|---|---|
| Claude manifestへ`hooks`再追加 | `Claude manifest must not redeclare standard Clarity hooks` |
| Codex manifestから`hooks`削除 | `Codex manifest must explicitly reference shared Clarity hooks` |
| Codex manifestを`./hooks/other.json`へ変更 | `Codex manifest must explicitly reference shared Clarity hooks` |
| 共通Hook file削除 | `shared Clarity Hook file is missing` |
| `SessionStart` event key改変 | `Clarity Hook event inventory mismatch` |

初回sandbox実行はPK-007のloopback bindで`listen EPERM 127.0.0.1`となったため、同じcheckoutを
sandbox外で再実行した。最終結果は上記12/12、wrapper 8/8、exit 0であり、製品assert失敗はない。

### Hook／inventory／既存回帰

```text
bash scripts/sprint-044-regression.sh
SPRINT044_CASE_PASS=40 FAIL=0 TOTAL=40
SPRINT044_REGRESSION_PASS=8 FAIL=0 CASES=40

node scripts/sprint-049-inventory.mjs validate
SPRINT049_INVENTORY_PASS=17 FAIL=0 CASES=20 MARKERS=VALID DIGESTS=VALID

node scripts/sprint-049-test.mjs
SPRINT049_PASS=20 FAIL=0 ... CRITICAL_PASS=15 ... SIDE_EFFECT_VIOLATIONS=0

node scripts/sprint-035-test.mjs
SPRINT035_PASS=15 SPRINT035_FAIL=0

node scripts/agentic-codex-plugin-test.mjs
AGENTIC_CODEX_PLUGIN_TEST_PASS=4 FAIL=0

python3 scripts/check-release-integrity.py
PASS release integrity: manifests and CHANGELOG are consistent
```

Sprint 044内の`XM-007` external-liveは、元契約どおり無許可のため`NOT-RUN`であり、本Patchの合否条件ではない。

### `sprint-050-test --coverage-only`の因果切り分け

Patch開始baseline `ce8804b5d1b75aa0ea3b1a805269a1185d4b2683`とcandidate `60cda8f...`を
別のGit archiveへ展開し、同じcommandを実行した。

```text
node scripts/sprint-050-test.mjs --coverage-only
```

両方ともexit 1、同じ最初のregistry guardで停止した。

```text
AssertionError: primary meaning/severity changed
actual   6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8
expected f3782f008a362f4a7d9d38afeb48cda97ced61062e69fd062093132277ccf979
```

停止位置、actual、expectedはbaselineとcandidateで同一で、今回変更したmanifest／validator surfaceへ到達する前に
発生する。したがってcandidate起因のproduct regressionではなく、既存registry guardの
`verification-infra` findingとして分類する。本Patch対象はSprint 048／049／044の現役回帰で0 FAILを確認済みであり、
この既存差だけを理由にmicro Patchを不合格にしない。

### 固定bytes／diff

Patch開始baselineからcandidateへの全差分は次の7 filesだった。

```text
A docs/progress/sprint-050-patch-002.md
M plugins/secretary/.claude-plugin/plugin.json
M scripts/check-release-integrity.py
M scripts/lib/sprint-049-inventory.mjs
M scripts/sprint-035-test.mjs
M scripts/sprint-048-test.mjs
M scripts/sprint-048-validator.mjs
```

`git diff --check ce8804b... 60cda8f...`はexit 0。candidateから評価開始HEAD `5caf80e`までの差分は
orchestrator所有の`docs/sprints/state.md`だけで、製品／test bytesはcandidateと同一だった。評価前後のworking treeはclean。

| path | mode / bytes | SHA-256 | 開始時比較 |
|---|---:|---|---|
| `.claude-plugin/plugin.json` | 100644 / 498 | `d8704bdcb9162bf63823b76b151bc431c3aadd6f5363d2d300cb79749c148591` | `hooks`削除だけの予定差分。開始時531 bytes／`fcf753...` |
| `.codex-plugin/plugin.json` | 100644 / 1,519 | `f7e5ba85465e0d172479701b82c0a4645a9a9f61005344912b3ba5ec232205f8` | 同一 |
| `hooks/hooks.json` | 100644 / 1,768 | `7ac60c7f280c965321ced1658dd7fcdad1b481f09bd6eee5cf8153278b5bc40b` | 同一 |
| `scripts/clarity-hook.mjs` | 100644 / 1,087 | `8cf657ae6a9f1c0fdbd2ce96aa73c1917c3105e3d5488cebc92e80db385ceea3` | 同一 |
| `scripts/lib/clarity-hook.mjs` | 100644 / 22,573 | `c85137b5b5b0abce9fc1da454218c205e090aa086daaa26cdcb17b924165aa48` | 同一 |
| `scripts/lib/clarity-core.mjs` | 100644 | `49ccac57d074baa01c4b50dd7203e13f0669c79ae3dd6e89078c8281489db5ac` | 同一 |
| `skills/clarity/SKILL.md` | 100644 / 12,896 | `93b899e9a2e2455cc68445043dc56da254e3c8162cb7e8d5d82e0bed5514340b` | 同一 |
| `collaboration-inventory.json` | 100644 | `67575b580d49acb914078fff561ca5d4906f77ebb000bc2871bf10fb5324449b` | 同一 |
| `host-inventory.json` | 100644 | `5bdb44a0c59411c71bb780e29efef352e056df7bbef4ec1aa6b6903544c4f719` | 同一 |
| `release-inventory.json` | 100644 | `da775a78e4a6710e262f38b681fc7c93086dad8d57d62335d18117a5593d0285` | 同一 |

`plugins/secretary/rules/**`、Sprint 050／Patch 001 contract・feedback、tracked handoff templateにも対象diffはない。

## Findings

### V-01 — 既存Sprint 050 registry digest guard差

- 対象区分: `verification-infra`
- Severity: non-blocking
- candidate因果: なし。Patch開始baselineで同じactual／expected、同じ停止位置を再現
- 影響: `sprint-050-test --coverage-only`全体は完走しないが、本Patchのmanifest／Hook／inventory対象回帰は
  Sprint 048／049／044で0 FAIL。product findingには昇格しない
- 推奨: 本Patchとは分離し、registry meaning／severity正本と固定digestのどちらがstaleかを次の検証基盤整備で確認する

新規product findingは0件。blocking verification-infra findingも0件。

## 未実施・残余境界

- private実機のClaude Code `2.1.232`観測は本Patchのtriggerに限定し、public candidateのinstall、live conversation、
  実Hook発火、verified、Evaluator live PASSへ昇格していない。
- Sprint 050のAC3／C21、public host live、Xmind external-live、Claude Desktop、Codex App、Windows native、
  Mac miniは本Patchで新たに実施・PASS表示していない。
- push、PR、merge、tag、GitHub Release、Marketplace publish／refresh、install、cache、workspace migration、
  private／Yasashii downstream writeは実施していない。
- 本feedbackのPASSはsource micro Patchの評価だけであり、release-ready、installed、loaded、external-liveを意味しない。

## Evaluator自己レビュー

1. Generatorの自己評価をVerdictへ流用せず、candidate archiveと現行checkoutでコマンドを独立再実行した。
2. baselineとcandidateを別archiveで同条件比較し、既存digest差と今回の変更の因果を分けた。
3. 実private hostの観測、synthetic Hook、offline回帰をpublic liveへ昇格していない。
4. Type `micro`の3基準だけを採点し、契約safe harbor外のinstall、collector、attestationを追加条件にしていない。
5. 製品、tests、spec、contract、progress、state、install、cacheは編集せず、本feedbackだけを書いた。
