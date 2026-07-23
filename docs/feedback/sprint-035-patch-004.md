# Sprint 035 Patch 004 評価結果

**判定:** 合格
**評価対象:** Sprint 035 Patch 004 — generic Skill validationを正式schemaへ揃える
**評価commit:** `590f5d2`
**Escalation Recommendation:** none

## 結論

public upstream所有の `secretary`／`update` は、非正式な `trigger` frontmatterを除き、Claude Code／Codexの明示入口を `description` へ保持した。現行system `quick_validate.py`を実際に使い、public 15/15、private固有4 Skillsを加えたfresh一時candidate 19/19を確認した。

PyYAMLが無い通常Pythonでは、個別Skillを実行する前に `dependency-unavailable`、checked 0、exit 2となった。対象Skill除外、validatorの許可field追加、warning化、失敗の握りつぶしはない。formal Codex plugin検査4/4とgeneric Skill検査は別々に実行され、責務の置換もない。

## スコア

| 基準 | スコア | 閾値 | 判定 |
|---|---:|---:|---|
| C1 完成度 | 5/5 | 4 | PASS |
| C2 構文・整合 | 5/5 | 5 | PASS |
| C3 機能の実証 | 5/5 | 4 | PASS |
| C5 安全・規律 | 5/5 | 5 | PASS |
| C6 無回帰 | 5/5 | 5 | PASS |

UI、wizard、会話本文の変更はないため、C4、C7、C8、C11、C14の再採点とbrowser／screenshotはNon-scopeとした。

## 正式schemaの根拠

- 現行system `skill-creator/SKILL.md` は、Skillの発火条件を `description` に置くと明記し、frontmatterへ他fieldを追加しないよう定めている。
- 同梱 `skill-creator/scripts/quick_validate.py` の許可field集合に `trigger` はなく、負fixtureの `trigger: /bad` を実際に拒否した。
- したがって `trigger` をgeneric validatorへ追加許可する根拠はなく、public upstreamの2 Skillsを正式schemaへ揃える実装が正しい。

## Acceptance Criteria

| # | 結果 | 独立確認 |
|---|---|---|
| 1 | PASS | `secretary`／`update` のfrontmatter keyは `name`／`description`だけ。`trigger` 0件。 |
| 2 | PASS | descriptionに自然文、Claude Code `/secretary`／`/update`、Codex `$secretary`／`$update`を確認。 |
| 3 | PASS | system `quick_validate.py`でpublic 15/15 valid、除外0。 |
| 4 | PASS | private固有4 Skillsと修正後public 15 Skillsをfresh一時candidateへ合成し、19/19 valid、除外0。 |
| 5 | PASS | `/usr/bin/python3`ではexit 2、dependency-unavailable、checked 0／passed 0／failed 0。PASS／0 FAIL／15件FAILへの誤変換なし。 |
| 6 | PASS | formal Codex plugin検査4/4とgeneric 15/15／19/19を別commandで実行。責務表もprogressと仕様に記録。 |
| 7 | PASS | 対象2 Skillの本文diff 0。release integrity、専用5/5、Git archive 13/13、archive内formal 4/4が合格。 |
| 8 | PASS | private repoはread-only status clean、cacheの対象2 digest不変。my-vaultは読取禁止に従いcommand対象0。push／release／reinstall 0。 |

## 実行証跡

### 専用回帰とgeneric validator

```text
QUICK_VALIDATE_PATH=... QUICK_VALIDATE_PYTHONPATH=/private/tmp/sprint-042-pydeps \
node scripts/sprint-035-patch-004-test.mjs
→ SPRINT_035_PATCH_004_PASS=5 FAIL=0

node scripts/generic-skill-validate.mjs \
  --plugin-root plugins/secretary \
  --validator .../skill-creator/scripts/quick_validate.py \
  --pythonpath /private/tmp/sprint-042-pydeps
→ GENERIC_SKILL_VALIDATE_RESULT status=pass checked=15 passed=15 failed=0 total=15
```

fresh一時candidate `/private/tmp/agentic-eval-19.V2gGIo` へprivate pluginをcopyし、修正後public 15 Skillsをoverlayして同じgeneric validatorを実行した。

```text
GENERIC_SKILL_VALIDATE_RESULT status=pass checked=19 passed=19 failed=0 total=19
Skill roster: upstream 15 + private 4
```

PyYAMLなしの通常Python:

```text
node scripts/generic-skill-validate.mjs ... --python /usr/bin/python3
→ exit 2
→ GENERIC_SKILL_VALIDATE_INCOMPLETE
  status=dependency-unavailable dependency=PyYAML reason=missing-pyyaml
  checked=0 passed=0 failed=0 total=15
```

負fixture:

```text
trigger: /bad
→ FAIL bad: Unexpected key(s) in SKILL.md frontmatter: trigger
```

### formal validatorとGit archive

```text
node scripts/agentic-codex-plugin-test.mjs
→ AGENTIC_CODEX_PLUGIN_TEST_PASS=4 FAIL=0

python3 scripts/check-release-integrity.py --root .
→ PASS

git archive HEADをfresh一時directoryへ展開
node scripts/archive-release-gate.mjs --root <archive>
→ ARCHIVE_RELEASE_PASS=13 ARCHIVE_RELEASE_FAIL=0

archive内の専用回帰
→ 5/5 PASS

archive内のformal Codex検査
→ 4/4 PASS

git diff --check
→ PASS
```

## 正本境界と不変確認

- public repo: `main`、評価時HEAD `590f5d2`、`origin/main`からahead 3。pushはしていない。
- private repo: `main...origin/main`、評価前後のread-only statusで変更0件。
- installed cache:
  - `secretary` digest `90e76bb13646b2406f3636d0126990812bd3286118b758331381111be204524c`
  - `update` digest `58d20bb6ca59fd32a3c657b14d7a26418c22a6c9f749b86b04c2e4da7711c079`
  - 直接編集／cleanup 0件。
- `/Users/taisei/my-vault`: ユーザーの読取禁止に従い、内容、Git status、path inventoryを確認していない。command対象化、write、stage、cleanup 0件。
- 評価用 `/private/tmp` candidate／archiveは全て削除し、private repo／cache／my-vaultはcleanup対象にしていない。
- external push、PR、release、private downstream反映、plugin再インストールはnot-run。

## finding

### E1 [verification-infra / Minor] 専用回帰単体の依存不足summary

`scripts/sprint-035-patch-004-test.mjs` を `QUICK_VALIDATE_PATH`／`QUICK_VALIDATE_PYTHONPATH`なしで単体実行すると、actual quick_validate scenariosを `INCOMPLETE` と表示する一方、依存不要の3検査について `SPRINT_035_PATCH_004_PASS=3 FAIL=0` を出してexit 0になる。generic validator本体は契約どおりexit 2であり、評価は依存pathを明示して5/5を実行したため、今回のproduct合否は妨げない。将来master suiteへ組み込む場合は、actual generic validation未実行をsuite全体のPASSと誤読しない集計にする余地がある。

### E2 [verification-infra / Note] 既存の広い回帰gate

`scripts/agentic-regression.sh` は今回と無関係なREADME固定文字列期待でSprint 019の50 PASS / 1 FAILに停止する。`scripts/sprint-033-test.mjs` と広い `scripts/agentic-archive-gate.mjs` は、今回未変更のGoogle Chat wizard `app.js` 固定digest期待差で停止する。今回のdiffにREADME、Google Chat skill、wizard、既存test変更はなく、契約safe harborの専用回帰、formal、release integrity、Git archive 13/13は全て合格したため既存verification-infra driftとして分離した。これらを0 FAILとは記録していない。

## product finding

0件。

## 改善提案

- private downstreamへ反映する次の別操作では、publicの対象2 Skillだけを正式なupstream同期経路で取り込み、private固有4 Skillsを維持する。
- 再インストール後は、実installed 19 Skillsへ同じgeneric commandを実行して19/19を再確認する。
- PyYAMLの実行経路は特定の `/private/tmp` pathを製品へ固定せず、評価環境が提供する正式runtimeまたは明示依存pathを使い続ける。
- external push、private反映、再インストールは、対象と影響を示したユーザー確認後だけ行う。

## Evaluator自己レビュー

- 閾値と合否は一致しているか: yes
- 各PASSに独立実行証跡があるか: yes
- Generator自己評価を判定根拠へ流用していないか: yes
- 未検証項目をPASS扱いしていないか: yes
- 契約外の証拠形式を追加していないか: yes
- generic validatorを緩和・除外していないか: yes
- formal／genericの片方で他方を代替していないか: yes
- 各findingにproduct／verification-infra区分があるか: yes
- 実装やコード修正へ越境していないか: yes
