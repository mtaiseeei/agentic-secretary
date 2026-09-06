# Sprint 041: Project Clarity coreとStandalone初期化

**ステータス:** Generator実装完了、Evaluator待ち

## 実装したこと

- public共通の `clarity-core.mjs` に、Clarity Project／Item／Event／Evidence／Stateのruntime validationと決定的rebuildを実装した。Projectは4 modeを同じschemaで表し、本Sprintでは`standalone`だけを生成する。
- `.clarity/project.json`、純追加Eventの`events.jsonl`、本文を複製しないEvidenceの`evidence.jsonl`、再生成可能な`state.json`を分離した。JSON Schema 5種も配布物に含めた。
- `init` は既定read-only preview、`--cancel`は副作用0、`--apply`だけがsafe root内へatomicに書く。Git／non-Git、remoteなし、bounded scan、Secretらしいfile／内容、binary、巨大file、symlink、既存`CLARITY.md`、途中失敗とretryを扱う。commit／push／remote変更は行わない。
- Decision×Executionから`stabilize`／`execute`／`validate`／`decide`を常に派生し、日本語ラベル、`in_progress`、`rolled_back`、`superseded`、`idea`、期限前後`deferred`をprojectionへ反映した。手編集したquadrantや人間確認flagは`doctor`／`rebuild`で検出・復元する。
- AI推定、draft ADR、superseded ADRはconfirmedにしない。Accepted ADRは既存正本候補としてEvidence参照し、本文を重複生成しない。
- generic projectの確定は既存 `project-tools.mjs add-decision` へ委譲する。Clarity pending → Decision正本 → confirmed Eventの順にし、両向きpartialと同一operation retryを重複なしで扱う。外部processは既存のtimeout／process-tree安全境界を使用する。
- `clarity` SkillとCLIに `init`、`status`、`history`、`rebuild`、`doctor`、手動Event／Evidence、generic project Decision確定の最小入口を追加した。
- formal Skill inventoryを16件固定からClarityを含む17件へ更新し、Sprint 041回帰をmaster入口へ追加した。

## 実装しなかったこと

Attention engine本体、UI projection、Mermaid／Xmind、Hook、Secretary-local配置、daily／weekly／Portfolio、link／sync、Drift comparator、task作成、connector、packaging／release、downstream反映は実装していない。後続Sprintのscopeを先行していない。

## 43 case coverage

| Case群 | 対象 | PASS | FAIL |
|---|---:|---:|---:|
| Standalone init | ST-001〜ST-015 | 15 | 0 |
| Quadrant model | QM-001〜QM-014 | 14 | 0 |
| Decision／Evidence | DE-001〜DE-014 | 14 | 0 |
| 合計 | 正確な43 ID | 43 | 0 |

`scripts/sprint-041-test.mjs` はcase IDを固定registryと照合し、重複／欠落時にも失敗する。assert対象はtree／Git HEAD、schema data、Event／Evidence件数、State、digest、Decision本文件数、partial errorであり、文言snapshotだけには依存していない。

## 起動・手動CLI

server／test URLはない。CLI製品である。

```bash
# preview（既定、write 0）
node plugins/secretary/scripts/clarity.mjs init <repo-root> --json

# 利用者の明示確認後だけapply
node plugins/secretary/scripts/clarity.mjs init <repo-root> --apply --json

node plugins/secretary/scripts/clarity.mjs status <repo-root> --json
node plugins/secretary/scripts/clarity.mjs history <repo-root> --json
node plugins/secretary/scripts/clarity.mjs doctor <repo-root> --json
node plugins/secretary/scripts/clarity.mjs rebuild <repo-root> --json
```

## 回帰結果

- `bash scripts/sprint-041-regression.sh` → `SPRINT041_REGRESSION_PASS=4 FAIL=0 CASES=43`
- `bash scripts/sprint-015-regression.sh` → `PASS=68 FAIL=0`（既存generic Project／Decision seam）
- `node scripts/sprint-021-git-safety-test.mjs` → `PASS=71 FAIL=0`
- `node scripts/sprint-022-safety-test.mjs` → `SPRINT022_PASS=69 SPRINT022_FAIL=0`
- `node scripts/sprint-023-security-test.mjs` → `SPRINT023_PASS=21 SPRINT023_FAIL=0`（sandbox内ではloopback bindがEPERMとなるため、許可されたlocal-only実行で確認）
- `python3 scripts/check-release-integrity.py` → PASS（17 Skill inventory）
- `bash scripts/agentic-regression.sh` → **既存Sprint 019の1件で停止**。`README高度設定と管理者順序・People API限界` がFAIL。今回の差分にREADME／google-chat Skill／Sprint 019 testはなく、baseline `037d397`にも期待される「Google Chatをつなぐ（少し高度な設定）」「Google Workspace管理者」「連絡先にない同僚名」が存在しない。Sprint 041の変更として対象外READMEを修正せず、既知のbaseline回帰として引き渡す。

## Self-evaluation

- C19のSprint 041対象面: Event／Evidence／State分離、4象限、rebuild、非確定境界、同一coreのmode schemaを43 caseで確認した。
- C24のSprint 041対象面: safe path、symlink、Secret、Git状態保持、schema、partial／retry、既存Project seamを専用回帰と関連安全回帰で確認した。
- C20〜C23の後続機能は評価対象として実装済みとは主張しない。

## Known issues／正直な未達

- Sprint 041対象43 caseに既知の未達はない。
- repository全体のmasterは上記Sprint 019 baseline failureのため完走していない。今回の関連suiteとSprint 041専用suiteはすべてPASSしているが、全master 0 FAILとは報告しない。
- JSON Schema fileは配布し、製品runtime validationを実行している。repositoryに外部JSON Schema validator dependencyは追加していない。

## Evaluatorの具体的な確認手順

1. `bash scripts/sprint-041-regression.sh` を実行し、43 IDの順序、`43/43`、`FAIL=0`を確認する。
2. temp Git Repoとnon-Git directoryで、preview前後のtree／`git status`／HEADが同じことを確認する。`--cancel`も同じくwrite 0であることを確認する。
3. 明示apply後、`.clarity/` 4正本と実Repo由来Itemを確認する。同じ入力で再実行し、Event／Evidence件数、HEAD、bytesが増えないことを確認する。
4. `.env`、Secretらしい通常file、binary、500 entry超、root外symlink、既存`CLARITY.md` fixtureのpreview reportと非露出／非上書きを確認する。
5. `CLARITY_FAIL_AT=after-canonical` と、Decision seamの `clarity-finalize`／`decision-write` injectionをcase runnerで再現し、partialのcompleted／pendingとretry後のDecision 1件・confirmed Event 1件を確認する。
6. `state.json`のquadrantと`humanConfirmed`を改ざんし、`doctor`が不整合を返し、`rebuild`がEvent／Evidence由来へ戻すことを確認する。
7. 関連回帰としてSprint 015、021、022、023を実行する。全masterを実行する場合は、Sprint 019の既知baseline failureをSprint 041のproduct failureと混同せず、別途記録する。

## 外部副作用

- external write: **0件**
- network／external connector／Xmind live: **0回**
- push／release／cache／downstream write: **0件**
- fixture writeはOS temp directory内だけ。production sourceのpreviewはread-onlyで実行した。
