# Sprint 039 — Generator handoff

**状態:** Retry 1の製品修正とSprint専用回帰は完了。独立Evaluator再判定待ち。

## 実装したこと

- 利用者の呼び方と分離した秘書identityを追加した。`display_name`、stableな
  `secretary_id`、`actor_type=ai-secretary`、`aliases`、作成時刻だけを正本へ保存する。
- 初回onboardingへ「希望する英語名／おまかせ」を追加した。既存利用者向けに直接起動できる
  `name` Skillと共通CLIを追加し、保存前の確認、不適格名拒否、後からのrenameを扱う。
- AI成果物へ`author`、`author_id`、`author_type`を付ける。identity未作成の既存workspaceでは
  従来どおり保存でき、壊れたidentityだけは安全停止する。
- 合成HOME用のuser-scope managed block処理を追加した。Codexは
  `AGENTS.override.md`が存在すればそれだけを優先し、なければ`AGENTS.md`、Claudeは
  `CLAUDE.md`を扱う。create/update/disable、atomic write、全体rollback、再実行差分0、
  symlink/read-only/重複block拒否を実装した。
- 最小workspace registry/resolverを追加した。保存項目は`secretary_id`、`edition`、
  `canonical_workspace`だけで、別repo cwdから既存workspaceへ接続する。欠落、移動、重複、
  反対edition、symlink、正本不足は誤onboardingせず停止する。
- 名前routingを直接呼びかけと「Xに聞いて」に限定した。人間、顧客、取引先、author、引用、
  code、file本文はroutingせず、曖昧caseは一度だけ確認する。
- rename previewをA=current config、B=user content、C=historical author、D=unknown conflictへ
  分類した。previewはread-only、applyはAを一体更新し、明示選択されたBだけ更新する。
  Cは保持して旧名をaliasへ追加し、Dは変更しない。途中失敗はworkspaceとuser-scopeを戻す。
- Agentic共通path、除外path、Yasashii/private保護path、rollbackを宣言する下流handoff inventoryを
  追加した。dirty working treeでは開始HEADをcandidate SHAと誤表示せず、commit後のclean checkout
  だけ完全SHAを返す。
- Skill数を15から16へ更新し、checkout/archive/master gateへSprint 039 suiteを組み込んだ。

## Retry 1 — Evaluator P1〜P4

- renameはuser-scope fileが存在するだけではroutingを作成しない。現在有効なmanaged blockだけ表示名を
  更新し、一度も有効化していないhostと明示disable済みhostはdisabledのまま保持する。
- `secretary/AGENTS.md`はfile全体を置換せず、製品所有の`表示名`（互換表記`display`）fieldだけを
  構造的に更新する。同じfile内の顧客名・自由記述は`unknown-or-conflict`としてpreviewへ分離し、変更しない。
- routerは文頭の直接呼びかけと依頼本文を分離した。呼びかけ後の顧客・取引先・著者・引用語は正caseを
  抑止せず、人間への「Morganさんに聞いて」、取引先／author文脈、引用・code内だけの名前は従来どおりrouteしない。
- report-schema validatorへ`name` Skillを含む正式21面を列挙した。単なる件数許容ではなく、21面のまま
  `name`を未知Skillへ差し替えるnegative fixtureも拒否する。
- Evaluatorの独立caseをSprint 039回帰へ取り込み、未作成／disabled routing、既存template＋custom本文、
  routing正4件・負5件、正式／未知surfaceを自動回帰にした。

## 起動・回帰

- UI/URL: なし。SkillとNode.js CLI/libraryの機能である。
- 専用回帰: `bash scripts/sprint-039-regression.sh`
- 個別テスト: `node scripts/sprint-039-test.mjs`
- 下流handoff確認: `node scripts/sprint-039-handoff.mjs`
- clean candidate用checkout gate: `node scripts/master-release-gate.mjs --mode offline --root <checkout>`
- Git-free candidate用archive gate: `node scripts/master-release-gate.mjs --mode archive --root <archive>`

## Generator実行結果

### PASS

- `bash scripts/sprint-039-regression.sh`: product 69 PASS / 0 FAIL、wrapper 7 PASS / 0 FAIL。
- `node scripts/sprint-032-patch-002-test.mjs`: 32 PASS / 0 FAIL。21 surfaceを走査する既存serializer回帰を含む。
- `python3 scripts/check-report-schema.py --plugin-root plugins/secretary`: 21 surfaces、1 PASS / 0 FAIL。
- `bash scripts/sprint-038-regression.sh`: 64 PASS / 0 FAIL、historical classifier 14 PASS / 0 FAIL、
  historical path 3 PASS / 0 FAIL。
- `node scripts/sprint-038-patch-002-windows-test.mjs`: 12 PASS / 0 FAIL。
  空白、日本語path、失敗rollback、symlink、Node-native entrypointを含む。
- `bash scripts/sprint-011-regression.sh`: 68 PASS / 0 FAIL。
- `node scripts/sprint-035-test.mjs`: 15 PASS / 0 FAIL。
- `node scripts/agentic-codex-plugin-test.mjs`: 4 PASS / 0 FAIL。
- `python3 scripts/check-release-integrity.py`: PASS。

すべてのSprint 039 fixtureは`mkdtemp`配下の合成HOME／隔離workspaceを使う。テストは実HOME、
installed cache、Yasashii/private実repo、remote、外部serviceの対象別digestを前後比較し、write 0を確認した。

### 未完走・既存baseline FAIL

- `node scripts/master-release-gate.mjs --mode offline`は全体完走していない。
  先行するSprint 033 gateが開始commit `7d861e9`の時点ですでに固定digestと不一致である。
  例: `plugins/secretary/rules/safety.md`の実SHA-256は
  `d07eb28d35986f5e11ea244ca848bd34c2ce66fe5a433981d06a7f02f33607d1`、
  `adapters/neutral-base.json`の期待値は
  `fa098672a314a66f377cbe7ce4d2ee612aee4d3b6c4777f7873c27a319944362`。
  本Sprint外のbaselineを広く更新してFAILを隠していない。
- `bash scripts/sprint-035-patch-001-regression.sh`: wrapper 5 PASS / 4 FAIL。
  上記Sprint 033 baseline、既存wizard asset digest不一致、およびsandboxがloopback listenを拒否する
  `Error: listen EPERM: operation not permitted 127.0.0.1`（Chatwork／Google Chat）が原因。
  Sprint 039の変更面に起因するFAILは観測していない。
- `git archive`相当の同一candidate gateは未実行。Generatorはcommit禁止で、`git archive HEAD`では
  uncommitted candidateを含められないためである。master/archiveへのsuite組込みは実装済み。
  Orchestratorがcandidateをcommitした後、同じcommitのclean checkoutとGit-free archiveでEvaluatorが
  AC14を判定する。

## 既知事項

- 既存利用者はidentityがないため、`name` Skillを一度直接起動する。設定前に既存memoryやowner呼び方は
  書き換えない。
- user-scope routingは任意であり、効果、対象file、managed block、無効化を説明した明示確認後だけ有効化する。
- 下流repo反映、release、Mac mini同期はこのSprintでは行っていない。handoff inventoryだけを用意した。
- working treeがdirtyの間、handoffの`agenticFullSha`は意図的に`null`、
  `candidateGitStatus=dirty`となる。clean commit後に再実行して完全SHAを記録する。

## Evaluatorの具体的シナリオ

1. 空の隔離workspaceで希望名`Alex`とおまかせを試し、確認前snapshotが不変、不適格名がwrite 0、
   確認後だけidentityとAI author metadataが作られることを確認する。
2. identityのない既存workspaceで`name` Skillを直接起動し、owner呼び方を変更せずidentityだけ追加する。
3. 合成HOMEでCodex通常、overrideあり、両方あり、Claude、既存block、重複block、read-only、symlink、
   部分失敗を操作し、対象file、既存内容、他block、rollback、disable、冪等性を確認する。
4. 別repo cwdからregistryのcanonical workspaceを解決し、cwdへの`secretary/`、ledger、commit、pushが
   0であることを確認する。欠落、移動、重複、反対edition、symlinkも操作する。
5. 文頭の`Alex、…`と`Alexに聞いて`がroutingされ、名前自体が人間／顧客／author／引用／code／
   file本文にあるcaseはroutingされないこと、曖昧文が一度だけ確認されることを確認する。
6. rename preview前後digestを比較し、A〜Dの件数と推奨処理を確認する。applyではA、選択B、保持C＋alias、
   不変D、stable ID、過去author不変を比較し、同名、alias衝突、途中失敗、retryも操作する。
7. candidate commit後にhandoffの完全SHAとcommon tree digestを記録し、clean checkoutと同一commitの
   Git-free archiveでSprint 039、manifest/Skill validator、secret scan、master gateを実行する。
8. 実HOME、cache、実下流、Mac mini、external publishへwrite 0であることを独立に確認する。
9. managed block未作成HOMEとenable後disableしたHOMEでrenameし、user-scope bytesとdisabled状態が不変、
   rename authorizationがrouting enableへ拡張されないことを確認する。
10. 既存`templates/AGENTS.md`へ`顧客Alexの案件は変更しない`を追加し、表示名fieldだけMorganへ更新、
    顧客記述はAlexのまま、previewではAとDへ分離されることを確認する。
11. `Morgan、顧客への提案書を作って`等4正caseと、人間／取引先／author／引用／codeの負caseを再操作する。
12. report-schemaの正式21面がPASSし、`name`を未知surfaceへ差し替えた件数21のfixtureがFAILすることを確認する。

## 外部操作

commit、push、tag、release、実HOME変更、installed cache変更、実下流repo変更、Mac mini同期、
外部serviceへのwriteはすべて0件。
