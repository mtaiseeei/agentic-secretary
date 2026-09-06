# Sprint 053 — LLM中心の読み取り・整理・提案

- Type: standard
- Risk: medium（`daily` / `weekly` / `memory-care` / `projects` の利用フローを横断するが、外部操作・破壊操作・認証・データ構造の変更は含まず、既存の安全シームを維持する）
- Candidate version: 変更しない（version更新・releaseは本Sprint外）
- 依存: sprint-052 done。Sprint 010 / 012 / 015の受入済み動作と、Sprint 052のconversation inventory / Voiceが現行candidateで保護されていること。
- 含む機能: F84（関連: F18、F21、F28、F54、F55、F83）

## ゴール

秘書が、安全に取得済みの原本を利用者の問いに合わせて自分で読み解き、
並べ、要約し、必要な提案をできるようにする。
read-onlyの整形・診断helperは便利な任意手段として残し、保存・削除・Git・整合性の決定的シームと明示確認は緩めない。

## 現在の弱点と受入済み動作

- `daily` の morning / evening、`weekly`、`memory-care` の timelineが、必要な原本をすでに安全に読めている場合でも `timeline` / `weekly` helperを必須にし、LLMの通常の意味整理を不要に拘束する。
- `projects` は件数を返す `promotion-status` を昇格提案の必須前段のように示し、既存 `promote-full` が受け取れる `--hard-to-read` / `--guardrail-needed` とLLMの根拠説明が利用フローに出ていない。
- 一方、既存helperはcanonical root / symlink / archive / 期間 / 種類を扱う決定的なread-only手段として正常に動く。`promote-full` も `--confirm`、open / general / active、既存file保護、atomic rollbackを内部で担保し、意味判断の任意化のために置き換える必要はない。
- 会話シグナルの `candidate-check` はすでに任意補助であるが、案件名が分かるときの同名PJ照合は必須のままである。identity migration診断とweeklyの `reindex` はそれぞれ安全・writeの境界であり、任意化対象ではない。

## 確定済みの製品判断とreadiness

- 利用者、主要体験、成功状態、対象外、体験の方向は本契約で明確である。主対象は現行のAgentic / Yasashii利用者で、主要体験は「安全に読める情報はAIが自然に整理し、危険な副作用はシームが止める」ことである。
- 利用者は次のmain Sprintとして本方向へ進むことと、合意範囲内で確認を繰り返さず完了まで進むことを承認済みである。追加の製品判断は不要である。

## Scope

1. `daily` の morning / evening、`weekly`、`memory-care` の timeline / オンデマンド振り返りを整合させる。必要な原本が要求範囲を十分かつ現時点で覆う形で安全に取得済みなら、LLMがhelperの追加実行なしに応答を組み立てられる。helperは大量・期間抽出・再現可能な整形が有用なときの任意手段とする。
2. どの読取経路でも、canonical root、symlink、active / archiveの対象、日付範囲、種類、出典、訂正・変更履歴、重複抑止を保つ。`all` 相当はdecision正本を優先して同じjournal `decided` を重ねず、weekly相当はjournal `did` / `decided` / `next` を区別する。
3. 原本の出典と対象範囲がすでに確立しているとき、安全性の再証明のためだけに別helperを必須化しない。部分取得・過去の要約・取得失敗を、対象期間全体の網羅、0件、最新状態と言い切らない。安全拒否がある対象はそのまま停止し、直接Readで迂回しない。
4. `projects` は `promotion-status` を任意のread-only診断と明記する。LLMが実内容から読みにくさまたは固有ガードレールの必要性を判断したら、理由を利用者に示して昇格の確認を行う。承認後のみ、対応する `--hard-to-read` / `--guardrail-needed` を既存 `promote-full` へ渡す。
5. 実書込みの `promote-full`、`--confirm`、open / general / active、既存full file / `INDEX.md` 保護、path / symlink / secret、分割・索引・journalのatomic更新とrollbackは必須のままとする。`PROJECT.md` 等を直接分割する代替経路は認めない。
6. 競合する指示だけを最小改訂し、`secretary` のルート、workspace template、conversation inventoryに別経路の矛盾が残らないことを確認する。共通rule参照で解決する面は重複改訂しない。

## Non-scope

- scriptの一括削除・置換え、新framework、意味parser、固定router、新しい証拠collector / attestation / checklist file / 全root scan。
- `candidate-check` の再設計、identity migration診断の任意化、weekly `reindex`・archive・保存・削除・Git・整合性操作の任意化。
- Memory Radar、Skill Coach、記憶の自動保存、Clarity関連機能。
- Chatworkの別plugin分割、Chatwork / Google Chatの接続・同期・wizard・認証・権限・外部データ境界の変更。
- version、distribution、install / cache、downstream反映、push、PR、tag、release、利用者workspace・実HOME・外部serviceへの書込み。

## Acceptance Criteria

1. **任意のread-only集計（C1/C3/C4）**: `daily` morning / evening、`weekly`、`memory-care` timelineのどの入口でも、要求範囲を十分かつ現時点で覆う原本が安全に取得済みなら、`timeline` / `weekly` helperの追加実行なしにLLMが内容を整理できる。helperを使った場合の決定性も回帰しない。
2. **範囲と意味の忠実性（C3/C5/C15）**: 日付範囲、種類、本文の意味、出典、訂正・変更履歴を保ち、decision正本とjournal `decided` の二重計上が0件。weekly相当の `did` / `decided` / `next` を混ぜない。部分取得や過去要約から全体網羅・0件・最新と誤報しない。
3. **読取安全性（C2/C5）**: canonical root、symlink、active / archiveの対象範囲を保つ。出典と対象範囲が確立済みなら不要な再証明helperを強制せず、安全拒否では対象を停止して直接Readで迂回しない。新attestation・checklist・全root scanは0件。
4. **閲覧の無副作用（C5/C15）**: 日次・週次・timeline・昇格診断と提案だけでfile、journal、索引、Git、project構成の変更が0件。保存依頼だけが既存成果物シームへ進み、必要なjournal / checkpoint境界を保つ。
5. **LLMによる昇格理由（C1/C3/C4）**: 件数が少なくても実内容が読みにくい、またはPJ固有ガードレールが必要な場合、LLMが具体的な理由を示して「フル運用へ整理する／今はライトのまま」を確認できる。`promotion-status` は返答の必須前提ではない。
6. **昇格の安全書込み（C2/C3/C5）**: 承認前・拒否時は変更0件。承認後だけ `promote-full` へ正直な `--hard-to-read` / `--guardrail-needed` と `--confirm` を渡し、低件数fixtureでも5fileの役割分離が原子的に完了する。open / general / active、既存full / `INDEX.md`、path / symlink / secret、rollbackの既存拒否は維持する。直接file分割の代替経路は0件。
7. **必須シーム不変（C5/C6）**: 会話シグナル判定補助の任意性は維持し、同名PJ照合、identity migration診断、weekly `reindex`、archive、保存、削除、Git、整合性の既存シーム・確認・rollbackを削除・迂回・任意化しない。
8. **小さい実装と回帰（C2/C6/C19）**: 変更は競合するSkill指示と必要なconversation inventory更新、既存Sprint 015回帰への最小assert追加に留める。新test file、runner、matrix、frameworkを作らず、既010 / 012 / 015と既存inventory / Voice検査が0 FAIL。検証コードが製品diffを超えない。
9. **作業境界（C5）**: Memory Radar / Skill Coach、Chatwork分割、version、distribution、install / cache、downstream、push、PR、release、実HOME、利用者workspace、外部serviceの変更・操作は0件。

## 必須の意味シナリオ（3件）

1. **日次 / timeline**: 「今日やったことと決めたことを教えて」に対し、当日のjournalとdecision正本が安全に取得済みの状態から、helperなしで問いに合う順に整理する。日付・種類・出典・訂正を保ち、同じ決定をjournalと二重表示せず、write 0件とする。
2. **週次の十分性**: 「先週を振り返って」に対し、active / archiveの対象週journalが十分に得られた場合は `did` / `decided` / `next` を分けてLLMが整理する。一部だけまたは取得失敗を含む場合は、読めた範囲と読めなかった範囲を区別し、全週の網羅や0件と言い切らない。新しい証明fileは作らない。
3. **プロジェクト昇格**: Decisions / メモ / 作業fileが件数基準未満でも、`PROJECT.md` が状態以外の情報で読みにくい、または固有ガードレールが必要な原本をLLMが読み、`promotion-status` なしで根拠と選択肢を示す。拒否は0変更、承認は対応flag付き `promote-full --confirm` のみで成功させる。

## 検証スコープ（着手時に固定）

- 検証面: 現在checkoutの公開正本、既存の隔離合成workspace / project fixture、現行Skill指示。実HOME、installed cache、downstream、外部serviceは使わない。
- 必須command:
  - `bash scripts/sprint-010-regression.sh`
  - `bash scripts/sprint-012-regression.sh`
  - `bash scripts/sprint-015-regression.sh`
  - `node scripts/sprint-052-secretary-voice-test.mjs`
  - `git diff --check`
- 証拠形式（safe harbor）: commandのexit codeとpass / fail件数、必須意味シナリオ3件のraw input・前提・観測した全応答・意味判定、閲覧・拒否・昇格の前後snapshot、変更対象とNon-scopeのnot-run記録。
- 自然さや内容整理は固定copy・言語regex・substringだけでPASSにせず、Evaluatorが原本・問い・全応答の意味を読む。安全境界は既存の構造・副作用assertで確認する。
- 上記を満たせば十分とする。新test file、新runner、カルテシアン積matrix、統一attestation、release gate、Windows CI、全root scanを追加の合否条件にしない。

## 制約事項 / オープンクエスチョン

- 追加の製品判断はない。本契約の範囲は利用者承認済みであり、Generatorは別ターンの確認を理由に停止せず実装へ進める。
- 受入基準・rubric閾値・証拠形式の追加や厳格化は、別のスコープ変更として利用者承認なしに行わない。
