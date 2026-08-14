# Sprint 039 Patch 002 Progress — 既存workspaceの名前オンボーディング完全移行

## 実装結果

- 既存workspace専用のread-only診断、preview、applyを`secretary-identity-migration.mjs`へ追加した。`identity-missing`、`identity-only`、`migration-current`、`migration-conflict`を区別し、cwdだけで新規onboardingへ送らず、canonical workspace、edition、必要正本、正確なGit rootを再検証する。
- `name` Skill、`secretary` Skill、`update` Skill、共通CLIを同じ状態モデルへ接続した。plugin更新、reload／新session、ローカルidentity migration完了を別状態として案内し、見送りを完了表示しない。英語名の確認とmigration applyの確認も分離した。
- 明示確認後だけ、`secretary/identity.json`、`secretary/AGENTS.md`と`secretary/CLAUDE.md`の製品所有identity管理節、`.secretary/update-ledger.json`のidentity関連recordを一transactionで揃える。
- AGENTS／CLAUDEは一意な`secretary:workspace-identity:v1` marker間だけを追加・更新する。v0.10.0の既知のmarkerなしAGENTS節は限定的に移行し、未知編集はconflictとして停止する。利用者自由記述、他managed block、周辺行、CRLF、file modeを保持する。
- 正当な既存identityはdisplay name、stable ID、`ai-secretary`種別、aliases、created timeを保持する。identity未導入時だけ確認済み英語名から生成する。renameも同じ製品所有節を構造更新し、移行済み状態を壊さない。
- 最小台帳はidentity関連path、`0.10.1`、baseline hash、空の非機密template variablesだけを一意に保存する。秘書名、stable ID、利用者本文、顧客名、記憶、Secretは保存せず、既存の無関係recordとeditionを保持する。
- workspace変更がある場合は今回の4所有pathだけを一時indexで検査し、pushなしのlocal checkpoint 1件へ記録する。開始前のstage／unstaged／untracked、対象外path、remote、branch、tagを混ぜない。
- file write、台帳、整合確認、stage、commit、commit後確認の全failure pointで、workspace tree、HEAD、index、working treeを開始前へ戻す。failure後retryは1 checkpointで成功し、成功後rerunと完全適用済みrerunは0差分・0追加commitである。
- `0.10.1` current candidateとしてClaude／Codex manifest、marketplace、README、正本／互換CHANGELOG、current release gateを揃えた。`0.10.0`以前のCHANGELOG bytes、migration、固定fixture、tag／artifactは変更していない。
- 下流handoff inventoryへ新migration、ledger、update Skill、CLAUDE templateを追加した。Yasashii／private実repoは変更していない。

## Failure matrix

Patch専用fixtureは23/23 PASS。

| Case | 観測結果 |
|---|---|
| identity未導入／identity-only／完全適用済み | 3状態を区別。diagnose／preview前後snapshot一致 |
| 希望名／不適格名／取消／migration未確認 | 確認前write 0。不適格名は保存しない |
| identity未導入成功 | 4所有pathだけを1 local commit。identity／2 managed sections／ledger整合 |
| v0.10.0 identity-only | stable ID、display name、AI種別、created timeを保持して完全移行 |
| v0.10.0 markerなしAGENTS | 既知の旧identity節だけを製品所有markerへ限定移行 |
| v0.10.1新規導入相当 | `migration-current`、rerun差分0 |
| rename後 | AGENTS／CLAUDEの表示名だけを構造更新し、migration-currentを維持 |
| 自由記述／他block／CRLF／mode | bytesとmodeを保持し、identity管理節だけ更新 |
| 開始前の対象外stage／unstaged／untracked／remote | migration後も開始前状態を保持、checkpointへ混入0 |
| `before-write-1..4` | workspace／Gitを完全rollback |
| `ledger`／`consistency` | workspace／Gitを完全rollback |
| `stage`／`commit`／`post-commit` | HEAD／index／working treeを含め完全rollback |
| failure後retry／成功後rerun | retryは1 checkpoint、rerunは差分・追加commit 0 |
| marker重複／managed節編集／ledger重複 | `migration-conflict`、write 0 |
| edition不一致／symlink／read-only | 理由付きsafe stop、外部副作用0 |
| target dirty／別Git root／Git-free target | checkpoint不能としてwrite 0 |
| user-scope／registry／routing | local migrationでは変更0。既存の別確認導線を維持 |

## 実行結果

| Command / surface | 結果 |
|---|---|
| `node scripts/sprint-039-patch-002-test.mjs` | `SPRINT039_PATCH002_PASS=23 FAIL=0`、exit 0 |
| `bash scripts/sprint-039-patch-002-regression.sh` | Patch wrapper `PASS=6 FAIL=0`。Patch 23/23、Patch001 16/16、Sprint039 69/69、safe Git 71/71、Codex formal 4/4、schema 1/1、release integrity PASS |
| `bash scripts/sprint-039-regression.sh` | `SPRINT039_PASS=69 FAIL=0`、wrapper `PASS=7 FAIL=0` |
| `node scripts/sprint-039-patch-001-test.mjs` | `PASS=16 FAIL=0` |
| `node scripts/sprint-021-git-safety-test.mjs` | `PASS=71 FAIL=0` |
| `node scripts/agentic-codex-plugin-test.mjs --root .` | `PASS=4 FAIL=0` |
| `python3 scripts/check-report-schema.py --plugin-root plugins/secretary` | 正式21 surfaces、`PASS=1 FAIL=0` |
| `python3 scripts/check-release-integrity.py --root .` | release integrity PASS |
| `node scripts/sprint-032-update-gate-test.mjs` | current update gate `PASS=15 FAIL=0` |
| clean local clone `3ef792819a4a445df089f70aa74ca09176762e5e`でPatch wrapper | `SPRINT039_PATCH002_REGRESSION_PASS=6 FAIL=0`、source checkout clean |
| 同じSHAの`git archive`でPatch wrapper | `SPRINT039_PATCH002_REGRESSION_PASS=6 FAIL=0`、source archiveに`.git`なし。fixture内部の一時Git targetだけを使用 |
| `node scripts/master-release-gate.mjs --mode archive --root <git-free-archive>` | 1回実行。`required=17 passed=15 failed=2 assertions=359 pass=357 fail=2`。2件は下記の開始HEAD既知failureと同一。Patch 039／Patch001と近傍required suiteはPASS |
| `git diff --check`／Node構文確認 | PASS |
| 固定履歴bytes | v0.9.2／v0.10.0のAGENTS・CLAUDE fixture 4件を各tagとbyte比較してPASS。現行CHANGELOGの`0.10.0`以降tailをv0.10.0 tagとbyte比較してPASS |

## 開始HEADとの既知historical／verification-infra比較

- 開始HEADは`b52efc59e70b0f1089b32694de9fe9d0b3655c55`。この開始HEADを別のGit-free archiveへ展開し、失敗suiteだけを同じNode.js環境で比較した。
- `node scripts/sprint-033-test.mjs --root .`は開始HEADとcandidateの双方で同じ固定digest不一致。`plugins/secretary/rules/safety.md` actualは`d07eb28d35986f5e11ea244ca848bd34c2ce66fe5a433981d06a7f02f33607d1`、expectedは`fa098672a314a66f377cbe7ce4d2ee612aee4d3b6c4777f7873c27a319944362`。本Patch差分起因ではなく、greenとして数えていない。
- `node scripts/sprint-038-patch-001-test.mjs --root .`は開始HEADとcandidateの双方で5/6。開始HEADですでにCHANGELOG先頭を`0.9.2`と固定期待する一方、実際のcurrent entryは`0.10.0`だった。candidateではcurrent entryが`0.10.1`になったが、同じhistorical assertionだけが失敗する。本Patchのproduct failureではなく、verification-infra／historical expectationとして分離した。
- 親オーケストレーターの指示に従いfull masterは再実行していない。契約対象のGit-free archive masterだけを1回実行し、開始HEAD比較は上記2 suiteに限定した。

## Candidate／handoff

- Generator product commit: `3ef792819a4a445df089f70aa74ca09176762e5e`（`[sprint-039-patch-002] 既存workspaceの名前移行を実装`）。
- `node scripts/sprint-039-handoff.mjs --root <clean-checkout>`の再計算値:
  - `publicationStatus: candidate-unverified`
  - `acceptedDownstreamInput: null`
  - `agenticFullSha: 3ef792819a4a445df089f70aa74ca09176762e5e`
  - `candidateGitStatus: clean`
  - `commonTreeSha256: a7d74a7a9bb42ea67815a75132acf588fe312314f98b7f9685cef97fdfca59c9`
- 共通pathはhandoff inventoryの20 path。新規のidentity migration、update-ledger、update Skill、CLAUDE templateを含む。README、docs、adapters、copy／styleは除外し、Yasashii／private固有pathを保護する。
- 旧Sprint 039 accepted SHA／digestはhistorical inputとしてのみ保持する。本candidateはfresh独立Evaluator PASSとstate更新前なので、accepted下流入力、release済み、同期済みとは表示しない。

## 起動・評価handoff

- UI／URL: なし。SkillとNode.js CLI／libraryのPatch。
- 診断: `node plugins/secretary/scripts/secretary-name.mjs migration-diagnose --workspace <workspace> --plugin-root plugins/secretary`
- preview: `node plugins/secretary/scripts/secretary-name.mjs migration-preview --workspace <workspace> --plugin-root plugins/secretary [--name <EnglishName>]`
- apply: `node plugins/secretary/scripts/secretary-name.mjs migration-apply --workspace <workspace> --plugin-root plugins/secretary [--name <EnglishName>] --confirm`
- 回帰入口: `bash scripts/sprint-039-patch-002-regression.sh`
- Evaluatorは固定candidateから合成HOME、隔離Git workspace、clean checkout、Git-free archiveを新規作成し、23 caseの前後snapshot、commit path一覧、retry／rerun、user-scope不変、handoff SHA／digestを独立に再確認する。

## Known issues／not-run

- 実HOME、実利用者workspace、installed cache、実Yasashii repo、private my-vault repo、Mac mini、remote、push、fetch、branch変更、tag、GitHub Release、marketplace公開、release、外部serviceへのwriteはnot-run／0件。
- Windows nativeでの新identity migration transactionはnot-run。Node-nativeの近傍Windows保存互換回帰はarchive masterでPASSしたが、別OS結果をWindows native PASSとは表示しない。
- online／live conversation gateはnot-run。UI変更はなく、実会話回帰をoffline結果で代替していない。
- 専用test／固定fixtureの追加行はproduct差分より多い。契約が求める4履歴状態、CRLF／mode、全failure matrix、Git snapshot、clean checkout／archiveの自己完結再現を明示したためであり、統一attestation、collector、証拠schemaは追加していない。
