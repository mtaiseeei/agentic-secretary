# Sprint 035 Patch 004 実装進捗

**ステータス:** 実装完了 - 評価待ち

## 着手時の契約

- public upstream所有の `secretary`／`update` だけを正式Skill schemaへ揃える。
- generic validatorを緩和せず、public 15/15と一時合成downstream 19/19を実検査する。
- PyYAML不足はSkill不合格または合格へ読み替えず、検査前の `incomplete` として扱う。
- formal Codex plugin validatorとgeneric Skill validatorを別々に実行し、責務を混同しない。
- private repo、installed cache、`/Users/taisei/my-vault`、remoteは変更しない。

## 実装内容

### 1. 正式frontmatterへの整合

- `plugins/secretary/skills/secretary/SKILL.md`
  - 非正式な `trigger: /secretary` を削除した。
  - `description` にClaude Code `/secretary` とCodex `$secretary` を明記し、自然文と明示入口の両方を発火条件として保持した。
- `plugins/secretary/skills/update/SKILL.md`
  - 非正式な `trigger: /update` を削除した。
  - `description` にClaude Code `/update` とCodex `$update` を明記した。
- Skill本文、routing、質問順、安全境界、host別更新導線、plugin root解決は変更していない。

### 2. generic validator実行ラッパー

`scripts/generic-skill-validate.mjs` を追加した。

- `--plugin-root` と現行system `quick_validate.py` の `--validator` pathを明示して実行する。
- `--python` と `--pythonpath` で既存のPython／依存pathを選べる。特定PCの一時pathは既定値へhard-codeしていない。
- 同じPython環境で `import yaml` を先に確認し、PyYAMLが無ければ次の形式でexit 2にする。

```text
GENERIC_SKILL_VALIDATE_INCOMPLETE status=dependency-unavailable dependency=PyYAML reason=missing-pyyaml checked=0 passed=0 failed=0 total=15
```

- 依存不足時は個別Skillを1件も実行せず、19件FAIL、0 FAIL、PASSのいずれも表示しない。
- PyYAMLがある場合だけsystem validatorを各Skillへ実行し、pass／fail／totalを集計する。

### 3. 回帰チェック

`scripts/sprint-035-patch-004-test.mjs` を追加した。

- 対象2 Skillのfrontmatter keyが `name`／`description` だけであること。
- Claude Code／Codexの明示入口がdescriptionに残ること。
- public 15 Skillsに `trigger` が残らないこと。
- PyYAMLなしでchecked 0のincompleteになること。
- system validatorでpublic 15/15になること。
- `trigger` を持つ負fixtureは、validatorを緩めずFAILになること。

## validatorの責務

| validator | 正本の責務 | このPatchでの結果 |
|---|---|---|
| formal Codex plugin検査 `scripts/agentic-codex-plugin-test.mjs` | marketplace／manifest、plugin identity、version、15 Skills roster、synthetic install、source／cache一致 | 4/4 PASS |
| generic system `quick_validate.py` | 個別 `SKILL.md` のfrontmatter構文、許可field、必須field、name／description規則 | public 15/15、合成downstream 19/19 PASS |

両者は別実行であり、片方の合格をもう片方の代わりにしていない。formal validatorへgenericの許可field検査を重複追加せず、generic validatorへ配布manifest検査を追加していない。

## Verification

### PASS

| command／surface | result |
|---|---|
| `node --check scripts/generic-skill-validate.mjs` | PASS |
| `node --check scripts/sprint-035-patch-004-test.mjs` | PASS |
| `QUICK_VALIDATE_PATH=... QUICK_VALIDATE_PYTHONPATH=/private/tmp/sprint-042-pydeps node scripts/sprint-035-patch-004-test.mjs` | 5 PASS / 0 FAIL |
| `node scripts/generic-skill-validate.mjs --plugin-root plugins/secretary --validator ... --pythonpath /private/tmp/sprint-042-pydeps` | 15/15 valid |
| private 4 Skillsと修正後public 15 Skillsを `/private/tmp/agentic-quick-19.vyQ61o` へ合成し、同じcommandを実行 | 19/19 valid |
| 同じgeneric commandをPyYAMLなしの `/usr/bin/python3` で実行 | exit 2、checked 0／passed 0／failed 0、dependency-unavailable |
| 非正式 `trigger` を持つ負fixture | generic validatorが1/1拒否 |
| `node scripts/agentic-codex-plugin-test.mjs` | formal 4 PASS / 0 FAIL |
| committed candidateのGit archiveで `scripts/archive-release-gate.mjs` | 13 PASS / 0 FAIL |
| 同じGit archiveで専用回帰／formal Codex検査 | 5/5、4/4 PASS |

### 非因果の既存回帰

`bash scripts/agentic-regression.sh` は通常sandboxでは `listen EPERM 127.0.0.1` で停止した。localhost bind可能な実行面で同じcommandを再実行すると、Sprint 013は35/35、Sprint 019は50 PASS / 1 FAILまで進み、既存の `README高度設定と管理者順序・People API限界` 固定文字列期待で停止した。

今回の変更pathは2 Skillのfrontmatter、generic validatorの実行補助、専用回帰、Harness正本だけであり、README、Google Chat skill、wizard、Sprint 019 testを変更していない。この1件は今回の実装による回帰へ読み替えず、既存suiteの時点依存期待としてEvaluatorへそのまま引き渡す。

`node scripts/sprint-033-test.mjs` も5件PASS後、既存Google Chat wizard `app.js` の固定digest期待差で停止した。今回のdiffに同fileは含まれず、現行 `app.js` digestの時点依存期待である。`python3 scripts/check-release-integrity.py --root .` と `git diff --check` はPASSした。

広い `scripts/agentic-archive-gate.mjs` も同じ既存Sprint 033 digest期待で停止したため、Git archiveそのものに対して、契約対象の `scripts/archive-release-gate.mjs` 13/13、専用5/5、formal 4/4を別々に実行して合格を確認した。広いgateの既存FAILを0 FAILへ言い換えていない。

## private／cache／my-vault境界

- private repo `agentic-secretary-my-vault`: read-only確認時に `main...origin/main`、変更0件。
- installed cache: 直接編集0件。開始時の `secretary` digest `90e76bb...`、`update` digest `58d20bb...` のまま。
- `/Users/taisei/my-vault`: ユーザーの読取禁止に従い、内容・Git statusとも未読、command対象化0件、write／stage／cleanup 0件。
- external push、PR、release、private downstream反映、plugin再インストール: 0件。

一時19-Skill candidateは独立評価で再作成できるよう残している。Evaluator完了後にこの一時candidateだけを削除し、private repo／cache／my-vaultはcleanup対象にしない。

## 自己評価

| 基準 | スコア | コメント |
|---|---:|---|
| 機能完全性 | 5/5 | public 15/15、合成downstream 19/19、依存不足、負fixture、責務分離を実行確認した。 |
| 動作安定性 | 5/5 | PyYAML有無をexit 0／2で区別し、検査前停止を件数で示す。 |
| 構文・整合 | 5/5 | 2 Skillは正式fieldだけを持ち、system validatorで全件valid。 |
| 回帰なし | 5/5 | formal 4/4と専用5/5はgreen。全体回帰の既存README期待1件は非因果として分離した。 |

## Evaluatorへの引き渡し事項

- 起動方法: UI変更なし。CLI検証だけを行う。
- 専用回帰:

```bash
QUICK_VALIDATE_PATH=/Users/taisei/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
QUICK_VALIDATE_PYTHONPATH=/private/tmp/sprint-042-pydeps \
node scripts/sprint-035-patch-004-test.mjs
```

- public generic:

```bash
node scripts/generic-skill-validate.mjs \
  --plugin-root plugins/secretary \
  --validator /Users/taisei/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  --pythonpath /private/tmp/sprint-042-pydeps
```

- formal:

```bash
node scripts/agentic-codex-plugin-test.mjs
```

- 一時downstream candidate: `/private/tmp/agentic-quick-19.vyQ61o`
- 評価時はpublic 15/15、candidate 19/19、PyYAMLなしexit 2、負fixture、formal 4/4、archive gate、diff checkを独立再実行する。
- UI変更がないためbrowser／screenshotはNon-scope。
