# Sprint 039 Patch 001 Evaluation

## 判定

**PASS**

- Failure classification: `none`
- Product findings: **0**
- Verification-infra findings: **3**（いずれも開始commitで同じ因果を再現し、本Patch起因ではない）
- Escalation Recommendation: `none`

candidate `3fa8d97e5dbfb2afa314f4ad179f17401b76d320` は、workspace所有pathだけのlocal Git checkpoint、
commit段階を含むrollback、既存Git変更の保持、user-scope-onlyの `not-applicable`、失敗後retryと成功後rerunを
clean checkout／同一bytesのGit-free archive／製品fixtureを流用しない独立fixtureで満たした。
ゼロ許容のproduct findingはない。

## 評価対象と隔離境界

- Candidate: `3fa8d97e5dbfb2afa314f4ad179f17401b76d320`
- Orchestrator docs-only HEAD: `d23dc9faafabfc5dfb327d6a4e68d59bf988f0ef`（製品判定には不使用）
- 開始commit: `528f012987603ee5bd5d05bf8231448529c04715`
- Clean detached checkout: `/private/tmp/agentic-s039-p001-eval.aOjzgq/checkout`
- 同一candidateのGit-free archive: `/private/tmp/agentic-s039-p001-eval.aOjzgq/archive`
- 開始commit比較checkout: `/private/tmp/agentic-s039-p001-eval.aOjzgq/base`
- 独立fixture: `/private/tmp/agentic-s039-p001-eval.aOjzgq/independent.mjs`
- UI／URL: なし。CLI／libraryのtransaction Patchであり、C8や視覚品質を採点していないためscreenshot不要。
- Windows native: **NOT-RUN**。Darwin上の既存Windows保存互換12/12をWindows native PASSとは表示しない。
- External write: **0**。実HOME、installed cache、Yasashii／private repo、利用者workspace、Mac mini、remote、外部service、push、fetch、tag、releaseは未操作。

## 実行証拠

| Command / surface | 結果 |
|---|---|
| checkout／archive `bash scripts/sprint-039-patch-001-regression.sh` | 両方0。Patch 16/16、Sprint 039本体69/69＋wrapper 7/7、formal／schema／release／safe Git関連0 FAIL |
| checkout `node scripts/sprint-039-patch-001-test.mjs` | `SPRINT039_PATCH001_PASS=16 ... FAIL=0` |
| checkout／archive `bash scripts/sprint-039-regression.sh`（Patch wrapper内） | `SPRINT039_PASS=69 ... FAIL=0`、wrapper `PASS=7 FAIL=0` |
| checkout `node scripts/sprint-021-git-safety-test.mjs` | safe Git／secret scan `PASS=71 FAIL=0` |
| checkout `node scripts/agentic-codex-plugin-test.mjs --root .` | formal Codex plugin 16 Skills、`PASS=4 FAIL=0` |
| checkout `python3 scripts/check-report-schema.py --plugin-root plugins/secretary` | 明示21 surfaces、`PASS=1 FAIL=0` |
| Sprint 039 unknown差替えnegative | 総数21を保った `unknown` 差替えをunexpected／missingとして拒否 |
| checkout `python3 scripts/check-release-integrity.py --root .` | manifests／CHANGELOG整合PASS |
| archive `node scripts/master-release-gate.mjs --mode archive --root .` | required 17/17、0 FAIL。archive自身の `.git` 不在を確認 |
| checkout `node scripts/sprint-039-handoff.mjs --root .` | clean完全SHA一致、common digest一致、候補未公開状態を確認 |
| `git diff --check 528f012...3fa8d97` | 出力0、PASS |
| 独立fixture | `INDEPENDENT_S039_PATCH001_PASS=10 ... FAIL=0` |

archive masterは契約safe harborの対象面を1回だけ実行した。長時間のfull historical masterは反復していない。

## 独立実操作

独立fixtureは製品test helperとfixture本文を流用せず、別の英語名、顧客記述、code、選択／未選択B、C、D、
合成HOME、Git remote、dirty／staged／untrackedを作成して次を確認した。

1. previewと確認拒否はworkspace／HOME／Git write 0。
2. required caseは `secretary/AGENTS.md`、`secretary/docs/selected.md`、`secretary/identity.json` だけを1 commit。
3. 既存stage、unstaged、untracked、未選択B、C、D、AGENTS内の顧客名とcodeをbyte保持。
4. commit subject／bodyに旧名、新名、利用者本文0。Git traceにpush／fetch／pull／branch／tag／amend／hard reset／remote操作0。
5. `before-checkpoint`、`stage`、`commit`、`post-commit` は全対象rollback。
6. CLI `rename-apply --fail-at commit` は非0。失敗後retryは所有commit 1件、成功後rerunは追加commit／差分0。
7. user-scope-onlyは `not-applicable`、commit 0。
8. 開始前target dirty、親repo、nested別repo、未知failure pointは副作用0で停止。

commit failureの独立digestは前後一致した。

```text
workspace  770047fa23c69aca57315209d25d5c75d6f893fd96861720e5ffe767bbab121f
user-scope 7356a739330b00d5b2faf02bc6cabfc3a6c04698f6167f183a2a77af0fb60669
HEAD       431f1ce5286277bb924f85883bcd90a7500b723c
index      a1450738f85cdd97c627172d586bd932d9cdaabb9abcf9bd123ccfc5b9d1f85e
worktree   cd1fbfbd983620d80c2cfb6dbf0054835623bd455c010010edef1fd456289403
```

## Handoff確認

`node scripts/sprint-039-handoff.mjs --root .` の再計算結果:

- `agenticFullSha`: `3fa8d97e5dbfb2afa314f4ad179f17401b76d320`
- `candidateGitStatus`: `clean`
- `commonTreeSha256`: `c810f60c3664ca331338e34680eec9bb6d21f8d850b97a39eef29f1a24f58557`
- `publicationStatus`: `candidate-unverified`
- `acceptedDownstreamInput`: `null`
- `commonPaths` は `plugins/secretary/scripts/lib/safe-git.mjs` と直接依存
  `plugins/secretary/scripts/lib/external-ops.mjs` を含む。
- Yasashii／privateの除外・保護path、rollback説明を保持。
- 旧Sprint 039 SHA `3e08eb6...`／digest `7498d355...` はhistorical inputとして分離され、修正版やaccepted inputと表示されない。

Evaluatorはhandoffをacceptedへ変更していない。新SHA／digestの固定とstate更新はオーケストレーターの責務である。

## 開始commitとの因果比較

### V1 — Sprint 033固定digest

**分類:** `verification-infra`

candidateと開始commitで同じ `plugins/secretary/rules/safety.md` 不一致を再現した。

```text
actual   d07eb28d35986f5e11ea244ca848bd34c2ce66fe5a433981d06a7f02f33607d1
expected fa098672a314a66f377cbe7ce4d2ee612aee4d3b6c4777f7873c27a319944362
```

Patch差分外で、正式archive masterはこのcheckout-only historical面をrequiredへ混ぜず0 FAILで完走した。

### V2 — Sprint 035 Patch 001 wizard asset固定digest

**分類:** `verification-infra`

candidate／開始commitとも `SPRINT035_PATCH001_REGRESSION_PASS=5 ... FAIL=4` で、
Google Chat wizard assetの既存固定digest不一致を同じ位置で再現した。Patch変更pathではない。

### V3 — loopback `EPERM`

**分類:** `verification-infra`

candidate／開始commitのChatwork／Google Chat双方で
`listen EPERM: operation not permitted 127.0.0.1` を同じく再現した。評価sandboxのlisten制約であり、
rename checkpoint製品挙動とは因果がない。archive masterと静的／隔離Git fixtureは0 FAILで完走した。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | previewにA〜D、required／not-applicable、実root、所有path、非対象、rollback、push not-run。確認前write 0。 |
| 2 | PASS | canonical realpath／edition／Git top-level一致。所有3 pathだけ1 commitし既存Git変更を保持。 |
| 3 | PASS | commit messageへ旧名／新名／利用者本文0。Git trace上remote／push／fetch／branch／tag操作0。 |
| 4 | PASS | user-scope-onlyはnot-applicable、commit 0。workspace変更caseはrequired。 |
| 5 | PASS | CLI commit failure非0。workspace／HOME／HEAD／index／worktree digest一致、残存部分commit 0。 |
| 6 | PASS | before-checkpoint／stage／commit／post-commitで今回変更だけrollback。B／C／D、aliases、既存Git変更を保持。 |
| 7 | PASS | failure後retryは1 commit、成功後rerunは追加commit／alias／差分0。 |
| 8 | PASS | target dirty、親root、nested repo、未知failureを独立確認。symlink／read-only／edition／registry／同名／aliasは専用回帰0 FAIL。 |
| 9 | PASS | A所有fieldと選択Bだけ更新。未選択B、C、D、顧客名、自由記述、codeをbyte保持。 |
| 10 | PASS | 未作成／disabled routingは専用69件で保持。有効managed blockだけtransaction／rollback対象。 |
| 11 | PASS | formal 16 Skills、明示21 surfacesがPASS。総数維持unknown差替えnegativeを拒否。 |
| 12 | PASS | Patch専用suiteはcheckout／Git-free archive両方0 FAIL。archive自身に `.git` なし。 |
| 13 | PASS | Sprint 039、safe Git／secret、formal、schema、release、Windows既存、archive masterが対象safe harborで0 FAIL。開始commit由来infraは分離。 |
| 14 | PASS | handoffの完全SHA、common digest、safe-git／external-ops、除外／保護pathを確認。acceptedへの昇格0。 |
| 15 | PASS | 実HOME／cache／下流／Mac mini／remote／service／release write 0。 |
| 16 | PASS | fresh独立Evaluatorが同一candidateを実操作。該当rubric全閾値、product finding 0。 |

## Rubric scores

| Rubric | Score | 根拠 |
|---|---:|---|
| C2 構文・整合 | 5/5 | formal 16 Skills、21 surface、manifest／CHANGELOG、handoff pathが整合。 |
| C5 安全・規律 | 5/5 | 確認前0、所有path限定、secret scan 71/71、remote操作0、全failure rollback。 |
| C6 無回帰 | 5/5 | Patch／Sprint039／関連safe harbor／archive masterが0 FAIL。既存infraは開始commit同因果として分離。 |
| C9 配布チャネル非依存 | 5/5 | 任意絶対pathのcheckout／Git-free archiveで同一bytesを実行し、実HOME／cache依存0。 |
| C10 更新の安全性 | 5/5 | preview read-only、明示確認、既存変更保持、retry／rerun冪等、commit後を含むrollback。 |
| C12 release履歴・candidate整合 | 5/5 | 0.9.2 integrity、candidate未公開、旧handoff履歴分離、external write 0。 |
| C13 edition分離・互換 | 5/5 | common／excluded／protected path固定、実下流write 0、accepted昇格0。 |
| C14 Markdown可読性 | 5/5 | name Skill変更は既存serializer／21面inventoryと整合し、過剰schema追加なし。 |
| C15 authorization・意味保存 | 5/5 | rename確認をrouting enableへ拡張せず、確認拒否・未作成／disabled routingを保持。 |
| C16 identity・routing・rename | 5/5 | stable identity、A〜D、所有checkpoint、commit failure非0、全体rollback、push 0を独立実証。 |

## Evaluator self-review

- Generatorの自己評価を判定根拠へ流用せず、固定candidateからcheckout／archive／独立fixtureを作り直した。
- candidate外の現HEAD、実HOME、installed cache、実下流、remoteを評価対象へ混ぜていない。
- `verification-infra` 3件はcandidateと開始commitの同一失敗を実行比較してから分離した。
- UIを採点せずscreenshotを省略した。Windows native、external write、downstream sync、releaseを実行済みと表示していない。
- 書き込んだrepo正本は本feedbackだけ。製品、test、spec、state、progress、Git履歴は変更していない。
