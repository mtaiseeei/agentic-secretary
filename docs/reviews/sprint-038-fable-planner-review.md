# Sprint 038 Fable敵対的レビュー

- 実施日: 2026-07-31
- 実行面: `claude -p --model fable --effort high`
- 対象: Planner更新後の `docs/spec*` と `docs/sprints/sprint-038.md`
- 操作境界: Read / Glob / Grepのみ。ファイル変更、外部write、commit、push、releaseなし
- Verdict: `PASS-WITH-REQUIRED-CHANGES`

## 総評

intent分類、副作用状態、確認境界、Notion限定5点、Fable gate、release gateの方向性は妥当。
ただし、新契約と衝突する旧不変条件、release version、既存workspace移行、
my-vault所有境界、検証手続きに穴があり、このままGeneratorへ渡してはならない。

## Generator前の必須修正

### R1 High: 固定3項目の旧不変条件が新契約と衝突

対象:

- `docs/spec.md` の不変条件32
- `docs/spec/features.md` のF10、F51
- `docs/spec/domain.md` の既定値「報告=みじかく（3行）」
- `scripts/lib/sprint-032-patch-001-conversation.mjs` 等の固定3項目judge

必要修正:

- 完了・状態報告も内容依存にする。
- 単純成功は自然な短文、複数結果・部分失敗は構造化する。
- 固定3項目の存在・順序を要求する現役回帰を置換対象として契約に名指しする。

### R2 High: `0.8.0` 固定の旧不変条件とrelease gateが残存

対象:

- `docs/spec.md` の不変条件23、26
- `docs/spec/constraints.md` §14.22
- `docs/spec/rubric.md` C12
- `scripts/master-release-gate.mjs` 等のhard-coded version期待

必要修正:

- `0.8.0` は公開済み履歴として不変にする。
- 次candidateは現行正本から一意に解決する。
- 0.7.0／0.8.0履歴回帰と、新candidate整合を分ける。
- version整合gate、manifest、CHANGELOG期待値の更新をSprint 038の所有変更へ入れる。

### R3 High: 既存workspaceの生成済みAGENTSに旧別ターン契約が残る

対象:

- `plugins/secretary/templates/AGENTS.md` 由来の既存 `secretary/AGENTS.md`

必要修正:

- template由来行を対象にした冪等migrationを、dry-runと安全確認付きで含める。
- または明示的Non-scopeとし、既存workspaceで旧挙動が残る可能性をCHANGELOGへ記載する。
- どちらかをPlannerが一意に決める。

### R4 High: explicit誤発火の負例不足

golden set必須例へ追加:

- 引用
- 伝聞
- 仮定・条件
- 訂正
- 取消
- 過去依頼への照会

これらは語として「覚えて」「記録して」を含んでも、現在のexplicit依頼として即時writeしない。
取消時に既に保存済みなら、既存の削除2段階へ接続する。

### R5 Medium-High: my-vault限定5点の実装所有が未定義

必要修正:

- 共通coreで完結する分類・応答契約は本repoで実装する。
- `task-triage`、`notion-tasks`、`vault-*` 等のmy-vault所有Skillに閉じる修正は、
  private repo側の対応作業単位が同一契約を継承して実装する。
- 検証は隔離candidateで行い、実downstream反映と再インストールはEvaluator後の別操作とする。

### R6 Medium: 3版parityとmy-vault正本ルールが衝突

必要修正:

- 共通caseは行き先・正本ルールが同じcaseに限る。
- Notion routing等、行き先が版で異なるcaseはedition固有golden setにする。
- 版固有caseではintentと安全境界を共通比較し、保存先・response stateは各版の正本に従う。

### R7 Medium: destructiveの「上書き」「大量」が曖昧

必要修正:

- destructiveな上書きは、利用者作成内容の置換・喪失、または容易に戻せない変更と定義する。
- 単一設定値の可逆更新は除外する。
- 大量操作の判定基準を定義する。

### R8 Medium: response stateと意味保存の判定手続きが未指定

必要修正:

- caseごとに必須要素、禁止表現、期待する意味tupleを持つ。
- 副作用は前後snapshotで判定する。
- 主体、日付、行動、否定、行き先の欠落・反転・追加を起こすnegative fixtureを必須にする。
- 決定的に判定できない項目は、判定根拠付きで記録する。

### R9 Medium: 旧回帰調整に最小差分制約がない

必要修正:

- 置換は新契約と衝突するassertだけに限定する。
- 同一suiteのpath guard、timeline決定性等の非衝突assertは保持する。
- 削除・置換・追加したassert一覧を証拠へ含める。

## 推奨修正

- `docs/spec.md` の不変条件番号重複を直す。
- 低リスク依頼とexternal操作が混在する複合依頼の実行順序を定義する。
- releaseの配布先とrollbackを配布系統別に列挙する。
- 「同じターン」を1 assistant turnと定義し、retry時も副作用1回とする。
- weekly月退避、MEMORY上限退避等、維持する別ターン確認を名指しする。
- connector状態を確認できない場合のsetup既定動作を定義する。

## Notion scope

property、relation、TaskDB正本、通常作成計画提示、write後再読確認を維持する5層の制約は妥当。
必須修正はR5の所有境界とR6の版固有parity。これらを直せば限定範囲を維持できる。

## 追加すべき反例

- 引用・伝聞・仮定・取消・照会
- write失敗時の`error`と成功宣言0件
- 同一依頼再実行時の重複0件
- 複数低リスク依頼の各副作用1件と部分失敗
- 低リスク＋external混在
- my-vaultの日付＋覚えての版固有期待
- yasashii単純成功で固定3項目を要求しない
- 否定欠落、入力にない期限追加、依頼語混入
- 既存workspaceの旧AGENTSと新pluginの共存またはmigration

## Generator dispatch条件

R1〜R9をPlanner正本へ反映し、契約間の矛盾、versionの詰み、
既存workspaceの扱い、my-vault所有境界、判定手続きが一意になったことを
オーケストレーターが確認した後だけGeneratorへ進める。
