# Sprint 044 Patch 001 — Stop Hook出力と利用者承認の分離

## 種別

Patch Sprint

## Type

patch

## Risk

high — 利用者のauthorization、変更禁止、read-only、永続writeの境界を扱うため。

## Base Sprint

`sprint-044`

## 理由

Stop Hookの継続要求はcheckpointの必要性を知らせる補助出力だが、その文面を利用者の新しい許可と誤認すると、
利用者が指定した変更禁止やClarity writeの確認境界を越え得る。Base Sprint 044のHook lifecycleを広げず、
Hook出力と実在する利用者承認を分離する修正を独立Patchとして扱う。

## ゴール

Hook、tool、引用文が生成した指示から新しい許可を作らず、実在する利用者承認だけを対象・操作・範囲内で維持する。
未承認のClarity writeは対象と影響を示して確認し、Stopのone-shotとmanual fallbackは回帰させない。

## 含む変更

- Stop Hookの継続要求と、共通Clarity Skillが従うauthorization境界を一致させる。
- Hook／tool／Hook由来でsystem messageとして提示される通知／引用文を、利用者の新しい承認として扱わない。
- 現在の利用者が明示した承認は、直接受領か別Agentからの正確な引き継ぎかを問わず、対象・操作・範囲・文脈が一致する間だけ維持する。同一操作の不要な再確認を行わない。
- 包括的な開発続行の承認だけから、Clarity checkpointその他の永続writeを許可済みと推定しない。
- 承認がない場合はwriteせず、対象と影響を示して利用者へ確認する。
- Base Sprint 044のStop一度限り、2回目no-op、未初期化no-op、disabled時write 0、manual fallbackを維持する。

## Acceptance Criteria

1. **Hook出力は許可ではない**: Stop Hookの`decision: block`、`reason`、Hook由来でsystem messageとして提示される通知、tool結果、引用文にcheckpoint等の実行指示が含まれても、それだけで利用者の新しいauthorizationを成立させない。
2. **変更禁止を維持する**: 利用者がread-only、変更禁止、対象path限定、previewのみ等を指定している場合、Hook出力で上書きせず、Clarity canonical、Git、対象外path、外部状態へのwriteは0件である。
3. **包括許可を拡張しない**: 「この開発を続けてよい」「実装と評価まで進めてよい」等の包括的な続行許可だけでは、live Clarity checkpoint、初期化、migration、projection applyその他の永続writeを許可済みと扱わない。
4. **未承認時の確認**: Clarity writeに必要な承認が存在しない場合、保存済み・完了とは表示せず、対象と予想される影響を示して確認する。拒否、取消、無回答ではwrite 0件を保つ。
5. **既存承認の継承**: 実在する利用者が対象・操作・範囲を明示した承認は、同じ文脈で別Agentから正確に伝達された場合も有効範囲内で継承できる。別Agent由来という理由だけで一律拒否せず、同じ操作を再承認させない。
6. **承認の非転用**: 既存承認を別の対象、操作、path、永続先、外部操作へ広げない。文脈・対象・影響を確認できない伝達は承認済みと推定しない。
7. **Stop回帰なし**: material changeかつ未checkpointのStopは1回だけ継続を促し、`stop_hook_active`または同等の2回目はno-opとなる。未初期化、material changeなし、checkpoint済みもno-opである。
8. **degraded回帰なし**: Hook disabled／failure／未信頼時にcanonical writeを行わず、manualのstatus／review／checkpoint入口を利用できる。manual write自体は既存の確認境界に従う。
9. **限定差分**: 共通Clarity Hook／Skillとその直接回帰だけを変更し、他Skill Hook、memory意味判定、Sprint 055機能、release／install／downstream／設定・trustへ変更を広げない。

## 検証スコープ（着手時に固定）

### 検証対象

- 隔離した小規模Node／CLI fixture上のStop出力、共通Clarity Skillの代表会話判断、副作用件数。
- Base Sprint 044からStop一度限り／2回目no-op、manual fallback、disabled時write 0の小さい直接回帰。
- 変更した共通sourceの構文・参照整合と、Hook／Skill間の意味一致。

### 必須シナリオ

1. 承認なしでStop Hookがcheckpointを促す。Hook出力を許可にせず、対象と影響を示す確認へ止まり、write 0件となる。
2. read-only／変更禁止／対象path限定の各条件下で同じHook出力を受けても、禁止範囲を維持する。
3. 開発全体の続行だけを承認した会話では、live Clarity checkpointを実行しない。
4. 利用者が対象・操作・範囲を明示した承認は同一Agentで一度実行でき、同じ操作を再確認しない。
5. 同じ明示承認を別Agentが正確な文脈とともに引き継いだ場合は有効範囲で実行でき、別対象への転用は拒否または確認へ止まる。
6. Stop初回block、2回目no-op、material changeなし／checkpoint済み／未初期化no-opを確認する。
7. disabled時write 0とmanual入口の利用可能性を確認する。

### 証拠形式（safe harbor）

- 実行command、exit code、fixture root、入力の要点、期待したauthorization判断、観測した応答状態。
- fixtureの前後snapshotまたは件数と、Clarity canonical／Git／対象外path／外部状態の変更0件。
- Stop初回／2回目／no-op、disabled／manualの期待値と観測値。
- 共通Skill／Hook出力を使った代表会話の判断表または同等に追跡できる実行記録。

上記で十分とする。新しいcollector、統一evidence schema、attestation、実顧客data、実利用者Clarity、
実installed plugin／host session、network、CI、Windows native、100／128並列、64 actorを追加条件にしない。

## 変更可能面

- 共通Clarity HookのStop出力とauthorizationを説明する最小箇所。
- 共通Clarity Skillのauthorization／確認境界。
- 本Patch専用の小規模fixture／回帰検査。

## Non-scope

- このrepoの実`.clarity/`、`CLARITY.md`、実my-vault本文・記憶・自由記述設定の読取り／書込み。
- Base Sprint 044の旧contract／progress／feedback／evidence、`done-by-user-decision`、旧live未達の改訂・再評価。
- Sprint 055の要件取り込み、validation表示、訂正、既存PASSの再評価。
- Hook lifecycle、event schema、runtime concurrency、trust model、他Skill Hook、memory候補の意味判定の新機能。
- full `scripts/sprint-044-test.mjs`、Sprint 050 full regression、64 actor stress、CI／network／Windows／実host live。
- commit、push、merge、tag、release、version、install、cache、downstream、永続config／trust変更。
- `~/workspace/agentic-harness`への読取りを含む一切の接触。

## 完了条件

Generatorは本Patchだけを実装し、変更面、既知制限、実行した小規模回帰、Evaluator向けの代表シナリオを
`docs/progress/sprint-044-patch-001.md`へ記録する。fresh独立Evaluatorが固定candidateを実操作し、
本契約と`docs/spec/rubric.md`のPatch限定適用範囲を証拠付きで満たした後だけ、Orchestratorが完了を判断する。
旧Sprint 044／055の記録は変更しない。
