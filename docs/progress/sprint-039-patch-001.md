# Sprint 039 Patch 001 Progress — rename local Git checkpoint

## 実装結果

- rename previewへcanonical workspace実体path、edition、正確なGit top-level、所有path、checkpoint `required`／`not-applicable`、push `not-run`を追加した。
- workspace所有fileが変わる場合は、既存の`safe-git.mjs`を使い、今回変更した所有pathだけを一時indexで検査・local commitする。開始前のstaged／unstaged／untrackedと対象外pathはcommitへ含めず、その状態を維持する。
- workspace変更0件で、有効なuser-scope managed blockだけが旧表示のcaseはcheckpoint `not-applicable`とし、commitを作らない。
- `stage`、`commit`、`post-commit`を実在するGit工程へ接続した。特にCLIの`rename-apply --fail-at commit`はGit commit command自身を決定的に失敗させ、exit非0となる。
- file write、checkpoint前、stage、commit、commit後確認の失敗では、workspace／有効user-scope／Git HEAD／index／working treeを開始前へ戻す。rollbackに失敗した場合は成功表示せず、workspace rootと対象pathを返す。
- 成功後の同renameはworkspace差分0・追加commit 0。commit failure後のretryは所有commit 1件で成功する。
- 既存のA〜D、P1〜P4、未作成／disabled routing保持、stable identity、author履歴、alias、構造的AGENTS更新、routing正負case、正式16 Skills／21 surfacesを維持した。

## Failure matrix

Patch専用fixtureは16/16 PASS。

| Case | 結果 |
|---|---|
| preview／確認拒否 | workspace／HOME／Git write 0 |
| required checkpoint | 所有pathだけ1 commit、対象外dirty／stage／untracked保持 |
| commit message／remote | 旧名・新名・利用者本文0、remote不変、push 0 |
| user-scope-only | `not-applicable`、commit 0 |
| `before-write-2` | 全対象rollback |
| `before-checkpoint` | 全対象rollback |
| `stage` | 全対象rollback |
| `commit` | 実Git command非0、全対象rollback |
| `post-commit` | 作成直後commitを取り消し全対象rollback |
| failure後retry／成功後rerun | retry 1 commit、rerun 0 commit／0差分 |
| 開始前target dirty | safe stop、既存変更保持 |
| 親repo／nested別repo | 正確なGit root不一致としてsafe stop |
| 未知failure point | 非0、write 0 |

## 実行結果

| Command / surface | 結果 |
|---|---|
| `node scripts/sprint-039-patch-001-test.mjs` | `SPRINT039_PATCH001_PASS=16 ... FAIL=0` |
| `bash scripts/sprint-039-patch-001-regression.sh` | Patch 16/16、Sprint 039 69/69＋wrapper 7/7、safe Git／secret scan 71/71、Codex formal 4/4、schema 21面、release integrity PASS |
| `bash scripts/sprint-039-regression.sh` | `SPRINT039_PASS=69 ... FAIL=0`、wrapper `PASS=7 FAIL=0` |
| `node scripts/sprint-021-git-safety-test.mjs` | secret scan／所有path／index保持を含む `PASS=71 FAIL=0` |
| `node scripts/agentic-codex-plugin-test.mjs --root .` | formal Codex plugin 16 Skills、`PASS=4 FAIL=0` |
| `python3 scripts/check-report-schema.py --plugin-root plugins/secretary` | 正式21 surfaces、`PASS=1 FAIL=0`。Sprint 039内のunknown差替えnegativeもPASS |
| `python3 scripts/check-release-integrity.py --root .` | PASS |
| clean checkout candidateでPatch regression | PASS |
| 同candidateのGit-free archiveでPatch regression | PASS、fixture内部の一時Gitだけを使用 |
| `node scripts/master-release-gate.mjs --mode archive --root <git-free-archive>` | required suite 17/17、0 FAIL（最終再実行値は下記Candidate欄へ追記） |

## 開始commitとの既知infra比較

- 開始HEAD `528f012987603ee5bd5d05bf8231448529c04715` と現在candidateの双方で、`node scripts/sprint-033-test.mjs --root .` は同じ`plugins/secretary/rules/safety.md` digest差（actual `d07e...07d1`、expected `fa09...9362`）でexit 1。Patch差分起因ではなく、greenとして数えていない。
- cleanな開始HEAD fixtureと現在candidateの双方で、`bash scripts/sprint-035-patch-001-regression.sh` は同じ`PASS=5 FAIL=4`。既存wizard asset digest、Sprint 033 digest、sandboxのChatwork／Google Chat `listen EPERM 127.0.0.1`が同じであり、Patch product PASSへ混ぜていない。

## Candidate／handoff

- 現在のrepoはGenerator candidate未commit。`agenticFullSha: null`、`candidateGitStatus: dirty`、base HEADは`528f012987603ee5bd5d05bf8231448529c04715`。
- 実装candidate bytesから計算したcommon tree digestは`c810f60c3664ca331338e34680eec9bb6d21f8d850b97a39eef29f1a24f58557`。
- handoffは`publicationStatus: candidate-unverified`、`acceptedDownstreamInput: null`。旧Sprint 039 SHA `3e08eb6d377392440e753bd5073c73d1d63399b6`／digest `7498...f883`はhistorical inputとして保持し、本Patch修正版と表示しない。
- `safe-git.mjs`とその直接依存`external-ops.mjs`をcommon pathsへ追加した。Yasashii／privateの除外・保護pathは維持した。
- fresh独立Evaluator PASSとstate更新後だけ、clean candidateの新しい完全SHA／digestを下流固定入力として発行する。

## 起動・評価handoff

- UI／URL: なし。CLI／library Patch。
- 主入口: `node plugins/secretary/scripts/secretary-name.mjs rename-preview ...`、確認後`rename-apply ... --confirm`。
- 回帰入口: `bash scripts/sprint-039-patch-001-regression.sh`。
- Evaluatorは隔離workspaceと合成HOMEで、required、not-applicable、commit failure、post-commit failure、retry、rerun、既存dirty／stage／untracked、親repo／nested repoを実操作する。
- clean checkoutと同一bytesのGit-free archiveを別々に作り、Patch regressionとarchive masterを再実行する。

## Known issues／not-run

- 実HOME、installed cache、実Yasashii repo、private repo、Mac mini、remote、push、fetch、tag、release、外部serviceへのwriteはnot-run／0件。
- Windows nativeでの新rename checkpoint実行はnot-run。別OS結果をWindows PASSとは表示しない。
- offline／online master全体はnot-run。契約対象のGit-free archive masterは実行した。
- 本roundはproduct codeより専用検証codeの追加行が多い。理由は契約で要求されたfailure matrix、Git snapshot、checkout／archive自己完結fixtureを1本に明示したためで、collectorや統一attestationは追加していない。
