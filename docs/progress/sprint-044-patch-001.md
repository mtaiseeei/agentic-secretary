# Sprint 044 Patch 001 — Stop Hook出力と利用者承認の分離

**ステータス:** 実装完了 - 評価待ち

## 着手時の契約

- F70／制約27.46に従い、Hook／tool／引用／Hook由来通知を利用者の新しい承認として扱わない。
- 現在の実在する利用者承認は、対象・操作・範囲・文脈が一致する場合に限り、別Agentからの正確な引き継ぎも含めて維持する。
- Stop初回block、2回目no-op、未初期化／変更なし／checkpoint済みno-op、disabled時write 0、manual fallbackを維持する。
- 変更は共通Clarity HookのStop出力、共通Clarity Skill、本Patch専用の小回帰に限定する。Sprint 055、実`.clarity/`、`CLARITY.md`、実my-vault、release／install／downstreamには触れない。

## 検証方針

- `/private/tmp`に自己作成する小規模fixtureで、Stop出力とno-op条件、canonical／Git／対象外pathへの副作用を確認する。
- HookとSkillの共通authorization境界は、固定文字列の全文一致や自然言語parserではなく、実出力と小さい代表会話判断表で確認する。
- `scripts/sprint-044-test.mjs`全体、Sprint 050／055、64 actor、CI、network、実hostは実行しない。

## 実装内容

- F70: Stop初回の`decision: block`は維持しつつ、reason内で「Hook通知自体は保存許可ではない」「変更禁止・read-only・対象path制限を上書きしない」を明示した。
- F70／制約27.46: 現在の利用者承認がcheckpointの対象・操作・範囲を含み、既存境界に反しない場合だけ、その範囲で一度実行する。未承認なら保存対象と影響を示して確認する文面へ直した。
- 共通Clarity Skill: Hook／tool／system通知／引用／生成指示と実在する利用者承認を分離し、包括的な開発続行を永続writeへ広げないこと、正確な別Agent引き継ぎを有効範囲で維持することを追加した。
- Patch専用小回帰: `/private/tmp`の自己作成fixtureでStop初回／同じroot・sessionの2回目、no-material、checkpoint済み、未初期化、disabled、manual read-only入口、canonical／Git／対象外canaryの不変を検査する。

## 変更面と規模

- 製品差分: `clarity-hook.mjs` 1行置換、`clarity/SKILL.md` 6行追加。
- 検証差分: `scripts/sprint-044-patch-001-test.mjs` 172行。検証コードが製品差分を上回る。fixture作成、前後snapshot、cleanupを自己完結させるためで、製品文を機械的に増やしていない。
- 既存のSprint 055候補はbaseline `/private/tmp/secretary-stop-patch-baseline-qb_6x2kv` と限定diff／byte比較した。`clarity.mjs`、`clarity-core.mjs`、`clarity-projection.mjs`、Sprint 055 test／contract／progress／feedback、および旧`scripts/sprint-044-test.mjs`は同一だった。

## 代表会話の意味判断

以下は実Hook出力と共通Skillを契約に照らしてGeneratorが読んだ判断表であり、LLM live実行の証拠ではない。fresh Evaluatorが同じ出力を独立に判断する。

| 入力の要点 | 期待する応答状態／副作用 |
|---|---|
| 承認なし + Stop通知 | 保存せず、対象と影響を示して確認。canonical／Git／対象外はwrite 0 |
| read-only／変更禁止／path限定 + Stop通知 | 既存境界を維持し、禁止範囲はwrite 0 |
| 開発全体の続行承認のみ | live Clarity checkpointへ拡張しない |
| 対象・操作・範囲が一致する利用者承認 | 既存境界内で一度実行し、同じ操作を再確認しない |
| 同じ承認の正確な別Agent引き継ぎ | 同じ文脈・範囲で継承し、再確認しない |
| 既存承認を別path／永続先へ転用 | 実行せず、必要な対象と影響を示して確認 |

## 検証結果

- 実行前Node数: 26（`pgrep node | wc -l`をsandbox外で実測。取得失敗を0扱いしていない）。最終成功run後: 26。
- `node scripts/sprint-044-patch-001-test.mjs`: exit 0、5/5 PASS。fixture `/private/tmp/agentic-s044-p001-J4f02n` は終了時に削除済み。
- 観測した初回Stop: `decision: block`。reasonはHook通知の非許可、既存禁止境界の優先、対象・操作・範囲が一致する既存承認、未承認時の確認を返した。同じroot／sessionの`stop_hook_active:true`は`{}`で、runtime追加0件だった。
- `node --check plugins/secretary/scripts/lib/clarity-hook.mjs` と `node --check scripts/sprint-044-patch-001-test.mjs`: exit 0。
- `skill-creator`の`quick_validate.py`は環境にPyYAMLがなく`ModuleNotFoundError: yaml`で未実行相当。依存は追加していない。frontmatterを変更しておらず、Node回帰・構文確認の合否とは分離する。

## 自己評価（Patch限定8軸）

| 基準 | スコア(1-5) | コメント |
|---|---:|---|
| C1 完成度 | 4 | 契約の製品面と専用回帰を実装。独立評価待ち |
| C2 構文・整合 | 5 | Node構文確認PASS。Hook／Skillの境界が一致 |
| C3 機能の実証 | 4 | 小fixtureで実Stop出力、no-op、副作用を実証。live会話は未検証 |
| C5 安全・規律 | 5 | 禁止境界の優先、未承認write 0、対象外canary／Git不変を確認 |
| C6 無回帰 | 5 | 契約指定のStop／disabled／manual小回帰5/5。全044 suiteは契約上未実行 |
| C15 authorization | 5 | 新規承認の非生成、既存承認の範囲継承、非転用をHook／Skillへ反映 |
| C21 Hook | 5 | 初回block、同じsessionの2回目no-op、未初期化等no-op、disabled／manual維持 |
| C24 Clarity安全 | 5 | canonical／Git／対象外path保護をfixture snapshotで確認 |

## 技術的な判断

- authorization parser／ledger／新frameworkを追加せず、Stopの既存一文とSkillの共通指示だけを直した。
- 自然言語判断をhard-codedな許可判定にせず、自動検査は観測可能なStop状態、正本数、構文、副作用へ限定した。

## 既知の課題・未検証

- fresh Evaluatorによる代表会話の独立判断は未実施。
- Claude Code／Codexの実installed host session、Windows、network、CIは本Patchの固定検証範囲外で未実施。
- `scripts/sprint-044-test.mjs`全体、Sprint 050／055、64 actor stressは契約どおり実行していない。
- `quick_validate.py`はPyYAML不足で完走していない。依存追加は行っていない。

## Evaluatorへの引き渡し事項

- 起動方法／回帰チェック: `node scripts/sprint-044-patch-001-test.mjs`
- テスト対象URL: なし（command-only Hook／Skillと隔離CLI fixture）
- 同じroot／sessionでPostToolUse→Stop初回→`stop_hook_active:true`の2回目を実行し、初回block、2回目`{}`、追加runtime 0を確認する。
- 未承認、read-only／変更禁止／path限定、包括的な開発続行、直接の明示承認、別Agentからの正確な引き継ぎ、別対象への転用の6会話を、実Stop出力とSkillで独立に判断する。hard-coded表をLLM実証として扱わない。
- disabled時のtree不変とmanual `status`／`review`、canonical／Git／対象外canaryの前後snapshotを確認する。
- `scripts/sprint-044-test.mjs`全体やSprint 055の再評価へ広げない。
