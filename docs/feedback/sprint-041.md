# Sprint 041 評価結果

**判定:** 合格
**評価対象:** Sprint 041 — Project Clarity coreとStandalone初期化
**Generator candidate:** `88591aef67069018529e34ae44bc4ab0db4cd7dd`
**評価時HEAD:** `0b557aaaf94c9641dbd88f6e8ff1e89e7f6a923f`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）
**Escalation Recommendation:** none

## 結論

Sprint 041へ単一割当されたST 15件、QM 14件、DE 14件を同一candidateで全件実行し、43/43 PASS、missing 0、duplicate 0、Acceptance Criteria未実行0を確認した。独立temporary Git／non-Git fixtureでも製品CLIを操作し、preview／cancelのwrite 0、apply、冪等retry、partial retry、Decision正本との一体性、State改ざん検知と決定的rebuild、安全境界を再確認した。

全masterは既知のSprint 019 README検査1件で停止する。これはbaseline `037d397`でも同じ50/51で、READMEと検査scriptのblobもcandidateと同一である。内訳は、現在READMEにPeople APIの表示名限界が明記されていない既存product debtと、旧exact phraseを単一conjunctionで検査するverification-infra debtである。Sprint 041の変更による回帰ではなく、個別Sprintの正本が定める「対象case＋直接回帰」gateは全てgreenであるため、Sprint 041を不合格にはしない。ただしfull masterをgreenとは記録しない。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 5/5 | 4 | PASS | AC1〜8を実物で全件確認 |
| C2 構文・整合 | 5/5 | 5 | PASS | runtime schema、JSON／JSONL parse、ID、path、`git diff --check`が成立 |
| C3 機能の実証 | 5/5 | 4 | PASS | CLI、固定時刻、実Repo由来Item、Decision seam、failure injectionを実行 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | preview、cancel、partial、doctorの日本語結果が現在状態と次の操作を区別。Attentionのbounded UXはSprint 042対象 |
| C5 安全・規律 | 5/5 | 5 | PASS | Secret、binary、巨大file、symlink、dirty／stage、外部副作用境界が成立 |
| C6 無回帰 | 5/5 | 5 | PASS | Sprint 015/021/022/023、release integrity、Sprint 041直接回帰が0 FAIL。full master既知1件はbaseline同一のP/V debtとして分離 |
| C7 やさしさ | 4/5 | 4 | PASS | 技術用語を維持しつつ、preview／partial／未確定を誤表示しない短い日本語CLI |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | Event／Evidence／State分離、4象限、非確定境界、4 mode schema、rebuild byte安定 |
| C24 Clarity安全・統合・public-first（Sprint 041対象面） | 5/5 | 5 | PASS | path／symlink／Secret／dirty／stage／schema／retry、既存Decision seam、public-first境界が成立 |

C8〜C18は今回の採点対象外である。既存面は契約で指定されたSprint 015／021／022／023とrelease integrityを直接回帰した。C20〜C23はSprint 042〜047の後続契約であり、本SprintへAttention本体、Hook、link／sync、Drift、Mermaid／Xmindを先行要求・先行実装していない。

## 証跡

### Target 43件と専用baseline

- `bash scripts/sprint-041-regression.sh` → exit 0。
  - `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`
  - `SPRINT041_REGRESSION_PASS=4 FAIL=0 CASES=43`
  - ST-001〜015、QM-001〜014、DE-001〜014をregistryと照合し、欠落0、重複0。
- Case runnerはtemporary Repoで実CLI／coreを実行し、tree、Git、Event／Evidence／State、digest、Decision本文、failure injectionをassertしている。Evaluatorは下記の独立fixtureでも主要導線を再操作した。

### 独立Git／non-Git CLI fixture

- Git fixture: `/private/tmp/s041-eval-git.gEXGWP`
  - 開始HEAD `962808905cce3f72901c11ad46a8a8cb030c2ecc`、branch `eval-branch`、remote `https://example.invalid/evaluator/repo.git`。
  - 開始時にREADMEのunstaged変更、`staged-note.md`のstaged追加、`untracked-note.md`を用意。
  - `clarity init <root> --json` と `--cancel --json` はともにexit 0。前後tree digestは `f1941796b24fef850cea5f720023df51afc144539715cc39a4022babd493f161` で一致し、`.clarity*` runtime作成0、HEAD／branch／remote／status一致。
  - `--apply --json` → `initialized`、Clarity Project ID `cp_0b1c872a22972105559a`、実Repo由来3 Item（`README.md`、`src/feature.mjs`、`docs/adr/0001-plan.md`）、Event 3、Evidence 3。
  - 再apply → `unchanged`、`rootEntry=false`、`state=false`。Event／Evidence各3、HEAD、5生成fileのdigestは不変。
  - apply後も開始前のunstaged／staged／untracked、branch、remote、HEADを保持し、追加差分は所有する`.clarity/`と`CLARITY.md`だけ。
- non-Git fixture: `/private/tmp/s041-eval-nongit.dzcppg`
  - cancel前後tree digest `1ae242b509197fe3692d61ad71883e32283c846a81bb2eadd9bdb56a0a0afd4b`。
  - applyはexit 0、`mode=standalone`、`repoIdentity.kind=non-git`、Item 1で初期化。

### 安全境界

- fixture `/private/tmp/s041-eval-safety.vAI4IA` で `.env`、secret-like通常file、binary、300KB file、510件tree、root外symlink、既存`CLARITY.md`を同時に操作。
  - previewは`.env=sensitive-name`、binary、`file-too-large`、`secret-like-content`、`symlink-not-followed`を表示し、`filesRead=200`で`truncated=true`、`scan-limit-reached`を表示。
  - synthetic markerはstdout／canonicalへ0件。
  - 既存`CLARITY.md` digest `85e97b1cd930e4b9536719cb80b2080f65a1c9f1ab4662792e4a20e2246b49ab`をapply後も保持し、結果は`initialized-with-root-entry-conflict`、`rootEntry.status=external-conflict`。
- `CLARITY_FAIL_AT=after-canonical ... --apply --json` → exit 4、`completed=[.clarity/]`、`pending=[CLARITY.md]`。retryは`repaired`、doctor `ok=true`、Event／Evidence各1のまま。
- `node scripts/sprint-021-git-safety-test.mjs` → `PASS=71 FAIL=0`。
- `node scripts/sprint-022-safety-test.mjs` → `SPRINT022_PASS=69 SPRINT022_FAIL=0`。
- `node scripts/sprint-023-security-test.mjs` → 制限sandboxではloopback bindが`EPERM`。外部通信なしのlocal-only実行面で再実行し、`SPRINT023_PASS=21 SPRINT023_FAIL=0`。これは実行環境制限でありproduct failureではない。

### Decision seam、非確定境界、rebuild

- generic projects fixture: `/private/tmp/s041-eval-secretary.SOoMdQ`
  - `clarity-finalize` injection → exit 4。Decision正本D-001は1件、confirmed Event 0、Stateは`proposed/humanConfirmed=false`。retry後はDecision 1、pending Event 1、confirmed Event 1、State `confirmed/true`。追加retryは`unchanged`。
  - `decision-write` injection → exit 4。Decision正本0、pending Event 1、confirmed Event 0、State `proposed/false`。retry後はDecision 1、pending 1、confirmed 1、State `confirmed/true`。
- AI推定、draft ADR、superseded ADRがconfirmedにならないことはDE-001／005／006でPASS。accepted canonical ADRだけはsourceを明示し、本文を複製しない。
- `state.json`のquadrantを`stabilize`、confirmed Itemの`humanConfirmed`をfalseへ改ざんするとdoctorは`stateError=human-confirmation-invalid`、`stateMismatch=true`、`humanConfirmationMismatch=true`。
- rebuildでEvent由来の`execute/confirmed/true`へ復元。固定時刻でのstate digestは `edd37e40ae4d1ee11dddc8537471f494b3d21e6d3c97c55938f5575e688a0aac`、2回目は`changed=false`でbyte安定。

### 関連回帰、master、candidate固定

- `bash scripts/sprint-015-regression.sh` → `PASS=68 FAIL=0`。
- `python3 scripts/check-release-integrity.py` → `PASS release integrity: manifests and CHANGELOG are consistent`。formal Skill inventoryは17件。
- `bash scripts/agentic-regression.sh` → Sprint 013は35/35、その後Sprint 019が`README高度設定と管理者順序・People API限界`だけ50/51で停止。full masterをPASS扱いしていない。
- `git archive 037d397`から作ったGit-free baseline `/private/tmp/s041-baseline.fbioDE`で`node scripts/sprint-019-google-chat-test.mjs`を再実行 → 同じ50/51、同一1件FAIL。
- README blobはbaseline／candidateとも`c714beeaa71d9d99be0b14af4c2fb8b4329ef68c`、Sprint 019 test blobも双方`817e502ed3541691837e39d61d1b4ca3e64eb6eb`。Sprint 041 diffにREADME、Google Chat Skill、Sprint 019 testは0件。
- `git diff --check 037d397..88591ae` → exit 0。
- 評価開始時とfeedback作成直前のrepo worktreeはclean。feedback作成後の差分はEvaluator所有の本fileだけ。HEADはstate commit、直前親は固定candidate。

### Scope非混入

- candidateの製品差分はClarity schema／core／CLI／Skillだけ。既存projects／daily／weekly／memory-care／notion-tasks、Hook、manifest、README、CHANGELOG、edition/downstream fileの変更0件。
- CLI commandは`init/status/history/rebuild/doctor/event/evidence/decide-project`だけ。Attention engine本体、Hook、Secretary-local配置、link／sync、Drift comparator、Portfolio、Mermaid／Xmind provider、packaging／handoff／release処理は未実装。
- 4 mode、alignment、Evidence typeのschema enumは共通core契約の表現であり、後続機能の実行入口や外部writeを持たない。

### UI／外部副作用

- 本Sprintはserver／browser UIを持たないCLI製品面のため、スクリーンショット採点は非該当。
- network、external connector、Xmind live、外部remote push、release、cache、downstream writeは0件。回帰中のpushはtemporary local bare remoteだけ。
- 実HOME、実利用者workspace、実downstream repo、installed cache、Mac mini、外部serviceは変更していない。

## Acceptance Criteria

| AC | 判定 | 実行証拠 |
|---|---|---|
| 1. Target 43件、Critical、未実行0 | PASS | 43/43、missing 0、duplicate 0 |
| 2. preview／cancel write 0 | PASS | Git／non-Gitの前後digest、Git status、HEAD、runtime 0 |
| 3. 実Repo由来Item、再実行非増加 | PASS | 3 Item、Event/Evidence 3/3、再apply unchanged |
| 4. Secret／binary／巨大Repo／symlink | PASS | combined safety fixtureの除外理由、bounded report、marker非露出 |
| 5. 4象限と各status/disposition | PASS | QM-001〜014 |
| 6. AI／draft／superseded非確定、Decision失敗境界 | PASS | DE-001〜006、両向きpartial独立fixture |
| 7. Event／Evidenceからbyte安定rebuild | PASS | tamper復元、digest一致、2回目changed=false |
| 8. dirty／stage／branch／remote／対象外file保持 | PASS | Git fixtureの開始前後statusとidentity |

## Finding／バグ一覧

| # | 重要度 | 対象区分 | 内容 | Sprint 041判定への影響 |
|---|---|---|---|---|
| P-01 | Minor | product | 現READMEはPeople APIで連絡先にない同僚名を補完できない場合の制限を明示していない。Sprint 019仕様に対する既存baseline debt | candidateとbaselineでblob同一、Sprint 041差分外。別Patch候補として記録し、本Sprintは不合格にしない |
| V-01 | Minor | verification-infra | Sprint 019の1 assertが旧見出し、旧管理者exact phrase、People API限界を単一conjunctionで検査し、受理済みcopy rewriteと実説明不足を分離できない | baselineでも同じFAIL。検査の診断性改善候補であり、Sprint 041 product failureではない |

Critical／Majorなproduct findingは0件。Sprint 041対象のverification-infra findingは0件。

## 改善提案

- 別PatchでREADMEへPeople APIの表示名限界を現在の文体で戻し、Sprint 019検査は見出し／管理者説明／People API限界を別assertへ分離する。旧exact phraseそのものではなく意味上必要なmarkerを検査する。
- 制限sandboxでloopback suiteを実行する場合は、local bind許可が必要であることをrunner出力で早めに区別すると再実行理由が分かりやすい。

## Generatorへの指示

なし。Sprint 041の修正差し戻しは不要。P-01／V-01はSprint 041へ混ぜず、必要なら別Patchとして扱う。

## Evaluator 自己レビュー

- 閾値と合否は一致しているか: yes
- 各PASSに証拠があるか: yes
- 未検証項目をPASS扱いしていないか: yes
- FAIL／incompleteの理由を着手時点の契約外要求として追加していないか: yes
- 要求した証跡は契約・rubricのsafe harbor内か: yes
- 各findingにproduct／verification-infra区分を付けたか: yes
- rubricが過剰な後続機能をSprint 041へ要求しないよう、対象面を契約の単一割当に合わせたか: yes
- full masterの既知FAILをgreenへ昇格していないか: yes
- 実装やコード修正へ越境していないか: yes
- 判定根拠: Target 43件、AC1〜8、C19／C24のSprint 041対象面、直接関連回帰が全PASS。full masterの1件はbaseline同一の既存P/V debtで、candidateによる回帰ではない。
