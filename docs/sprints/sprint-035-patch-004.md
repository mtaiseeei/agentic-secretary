# Sprint 035 Patch 004 — generic Skill validationを正式schemaへ揃える

- Type: regular patch
- Risk: standard（Skill metadataと検証導線の変更。外部write、install、利用者データ変更は行わない）
- 主眼: public upstreamが所有する `secretary`／`update` の非正式frontmatterを正式Skill schemaへ揃え、generic `quick_validate.py`を対象除外やvalidator緩和なしで全Skillに通せるようにする。
- 依存: `sprint-035-patch-003` の合格済みcandidate。private downstreamの4 Skills、installed cache、`/Users/taisei/my-vault`は変更しない。

## 背景と正本判断

private版 `agentic-secretary-my-vault` のSprint 044では、formal Codex plugin検査4/4、Git archive gate 13/13、installed 19 Skills、source／cache一致、installed smokeが合格した。一方、generic `quick_validate.py` は、public upstream由来の `secretary`／`update` にある `trigger` fieldを非対応として17/19に留まった。Evaluator環境の通常PythonにはPyYAMLも無く、validator自身の依存不足とSkill schema不一致が同時に観測された。

正本調査では、次を確認済みである。

- `secretary`／`update` はpublic `agentic-secretary` のupstream 15 Skillsに属する。
- private `agentic-secretary-my-vault` はupstream 15 Skillsをbyte同一で取り込み、private固有4 Skillsだけを追加する。
- installed cacheはprivate配布物の19 Skillsを持つが、配布結果であって編集正本ではない。
- 現行 `skill-creator` は発火条件を `description` に置き、追加の `trigger` frontmatterを正式fieldとして認めていない。

したがって、このPatchはpublic repoだけを修正し、private repoまたはinstalled cacheへ同じ修正を直接重複適用しない。

## 外から見える成果

`secretary` と `update` は、Claude Code／Codexの明示入口を `description` で保ったまま正式frontmatterだけを持つ。public 15 Skillsはgeneric validatorで15/15、private固有4 Skillsを加えた合成downstream candidateは19/19になる。PyYAMLが無い環境では19件のSkill不合格へ誤分類せず、validator依存不足として明確に停止する。

## Scope

### A. 正式Skill schemaへの整合

- `secretary`／`update` のfrontmatterから、現行正式schemaに無い `trigger` fieldを除く。
- Claude Codeの `/secretary`／`/update`、Codexの `$secretary`／`$update` を含む発火条件は `description` へ残す。
- `name`、Skill本文、質問順、安全境界、host別更新導線、plugin root解決を変更しない。
- 他13 Skillsも含め、public upstream 15 Skillsのfrontmatterが現行generic validatorに全件合格することを確認する。

### B. generic validatorの再現可能な実行と依存不足表示

- 現行system `skill-creator/scripts/quick_validate.py` を実行対象とし、別実装で結果を代替しない。
- 実行用PythonがPyYAMLをimportできる場合、全対象Skillを実際にgeneric validatorへ渡して件数を集計する。
- 通常PythonにPyYAMLが無い場合、利用者が明示した既存のPythonまたは依存pathを使える。特定PCの一時pathを製品既定としてhard-codeしない。
- 利用可能な依存経路が無い場合は、`dependency-unavailable`／`incomplete`、検査前停止、pass／fail件数を明確に示して非0終了する。全Skill不合格、0 FAIL、PASSのいずれにも読み替えない。
- generic validator実行のためだけにplugin package、manifest、利用者workspaceへPyYAMLやPython依存を追加しない。

### C. formal validatorとの責務分離

- formal Codex plugin検査はmarketplace／manifest、plugin identity、version、15 Skills roster、synthetic install、source／cache整合を引き続き検査する。
- generic validatorは個別 `SKILL.md` のfrontmatter構文、許可field、必須field、name／description規則を検査する。
- 両者の重複範囲は「Skillが存在し名前を解決できる」までとし、片方の合格で他方を省略しない。
- formal validatorの受け入れ条件を緩めず、generic validatorの対象Skill、許可field、失敗条件も緩めない。

### D. publicからdownstreamへの引き渡し証拠

- public source 15 Skillsでgeneric validator 15/15を確認する。
- `/private/tmp` の一時candidateへprivate固有4 Skillsと修正後public 15 Skillsを組み合わせ、private repoとcacheを変更せずgeneric validator 19/19を確認する。
- private repo、installed cache、`/Users/taisei/my-vault` の開始時／終了時Git状態またはbyte digestが不変であることを記録する。
- source修正後のprivate downstream反映、push、release、再インストールは、このPatchの独立評価後に対象・影響を示してユーザー確認を取る別操作とする。

## Non-scope

- generic validatorへの `trigger` 許可追加、対象Skill除外、warning化、失敗の握りつぶし。
- private `agentic-secretary-my-vault`、installed cache、`/Users/taisei/my-vault` の編集、stage、commit、cleanup。
- public／private remoteへのpush、PR、release、marketplace更新、plugin再インストール。
- Skill本文のrouting判断、質問順、安全境界、wizard、更新処理、plugin identity、versionの変更。
- plugin runtimeへのPyYAML追加、package manifest新設、検証専用dependency directoryの配布。
- formal validatorとgeneric validatorを1つの合否へ統合する新しいattestation／collector／schema。

## Acceptance Criteria

1. `secretary`／`update` のfrontmatterは `name` と `description` だけを持ち、現行正式schemaにない `trigger` fieldが0件である。
2. `secretary`／`update` の `description` は、自然文の依頼に加えてClaude Codeの `/secretary`／`/update` とCodexの `$secretary`／`$update` を発火条件として保持する。
3. 現行system `quick_validate.py`をPyYAMLが利用できる実行面でpublic upstream 15 Skillsへ実行し、15/15 valid、除外0件である。
4. private固有4 Skillsと修正後public 15 Skillsを組み合わせた一時candidateへ同じgeneric validatorを実行し、19/19 valid、除外0件である。
5. PyYAMLを解決できない実行面では、検査前の依存不足を `dependency-unavailable`／`incomplete` と明示して非0終了し、19件FAIL、0 FAIL、PASSのいずれも表示しない。
6. formal Codex plugin検査は4/4を維持し、generic validatorとは別に実行される。記録はformalの対象を配布構造／導入、genericの対象を個別Skill frontmatterとして区別する。
7. `secretary`／`update` の本文、routing、安全境界、host別導線に意図しない差分がなく、public repoの既存近傍回帰とGit archive gateが合格する。
8. private repo、installed cache、`/Users/taisei/my-vault` に変更0件である。外部push、release、再インストールも0件である。

## 検証スコープ（着手時に固定）

- 検証対象:
  - public `plugins/secretary/skills/*/SKILL.md` 15件
  - private固有4 Skillsを加えた `/private/tmp` の一時19-Skill candidate
  - generic system `skill-creator/scripts/quick_validate.py`
  - public formal Codex plugin検査、Git archive gate、frontmatter近傍回帰
- 必須シナリオ:
  1. public 15/15 valid
  2. 合成downstream 19/19 valid
  3. PyYAMLなしでdependency-unavailable／incomplete
  4. 非正式fieldを持つ負fixtureはgeneric validatorで拒否
  5. formal validator 4/4とgeneric validatorの別実行
  6. private／cache／my-vault／remote write 0件
- 証拠形式（safe harbor）:
  - 実行command、exit code、pass／fail／incomplete件数
  - 変更前後のfrontmatter key一覧と対象2 Skillのdiff
  - public／private／cacheのsource ownership、Skill roster、byte digest
  - private repo／public repoのGit status、cache対象digest、my-vaultは内容を読まずGit status digestまたは既存保護証拠
  - temporary candidateの作成先とcleanup結果

## 完了条件

- Generatorはpublic repoだけを編集し、対応する `docs/progress/sprint-035-patch-004.md` に実装、テストcommand、generic／formalの責務差、依存不足時の表示、private反映待ちを記録する。
- EvaluatorはGeneratorとは別の作業単位で実commandを再実行し、対応する `docs/feedback/sprint-035-patch-004.md` に合否と証跡を書く。
- Evaluator PASS後もexternal push、private反映、plugin再インストールは行わず、対象・影響を示したユーザー確認待ちで停止する。
