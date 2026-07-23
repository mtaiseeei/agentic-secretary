# Sprint 037 — 呼び方候補の安全な探索と利用者中立の配布物

- Type: main sprint
- Replaces: `sprint-036`
- Risk: standard（read-onlyのlocal候補探索、初回対話、ローカル設定同期、配布文面・回帰fixtureを変更する。外部write、資格情報、利用者データ、remoteは扱わない）
- 主眼: Claude Code／Codexで、現在タスクのhost提供済み文脈→Git→OSの順に安全な表示名候補をbest effortで提示し、4選択肢と保存前確認を成立させる。既存呼び方の現役表示同期と、配布物の個人・環境固有情報除去も完了する。
- 置換理由: `sprint-036` のGenerator着手前に、アカウント名をhost明示値だけに限定する方針から、優先順位・除外規則を持つ候補探索へユーザー判断が変わった。旧契約を拡張せず次メインSprintとして置換する。

## ユーザー決定

1. 初回の呼び方は「あなた」「アカウント名」「指定の名前」「その他」の4選択肢とし、Claude CodeとCodexの両方で採用する。
2. account-nameの探索順は、(1) 現在タスクへhostが既に渡している過去会話の記憶・Personalization・Project文脈・現在会話で明示された名前、(2) `git config user.name`、(3) OSユーザー名。
3. 任意の過去会話や生session logを直接探索する共通APIは前提にしない。現在タスクへhostから渡された文脈だけを使う。
4. Git／OS値は表示名候補として正規化する。メール形式、bot／CI／root／admin／user／unknown等の汎用名、数字中心、長すぎる識別子、machine-like文字列、空値は除外する。OS値は名前らしい場合だけ候補にする。
5. 複数候補には出典を短く添え、優先順位に従う最良1件を推奨する。「アカウント名」を選んだときだけ候補として提示する。候補0件なら利用不能とする。
6. host間で取得可能情報が違っても、同じ優先順位・正規化・除外規則でbest effortとする。
7. 探索値、除外値、出典、推奨順位は保存しない。ユーザーが選び、保存前確認を通過した解決値だけを保存する。選択への未回答は「あなた」へ解決し、保存確認が未完了なら書き込まない。
8. 既存変更では `preferences.md` を現在値の正本とし、`AGENTS.md` と `MEMORY.md` の現役表示を同期する。初回決定ログは履歴として改変しない。
9. active surfaceの個人・環境固有情報監査、固定allowlist、合成人物fixture、外部write禁止は維持する。

## 開始時の保全条件

現在HEADにあるユーザー既存変更 `[sprint-045]` 2 commitは、本Sprintへ混ぜず、revert・置換・再設計しない。

- `plugins/secretary/templates/AGENTS.md` のopen／closedプロジェクト構成を維持する。
- `plugins/secretary/scripts/project-tools.mjs`、`plugins/secretary/skills/daily/SKILL.md`、`plugins/secretary/skills/projects/SKILL.md`、`plugins/secretary/skills/weekly/SKILL.md`、`scripts/sprint-015-regression.sh` のSprint 045挙動を変更しない。
- 実装前後のdiffと既存回帰で、open／closed境界が失われていないことを確認する。

## 外から見える成果

初回セットアップで「アカウント名」を選ぶと、利用できる情報だけから安全に整えた候補が出典つきで表示される。複数ならおすすめが1件分かり、候補が無ければ「あなた」「指定の名前」「その他」へ戻れる。どの経路でも、実際に保存する呼び方を確認してから作成を開始する。

既存workspaceの呼び方変更では、`preferences.md`、`AGENTS.md`、`MEMORY.md` の現役表示が同じ値になり、初回決定ログは当時の値を保持する。配布物と現行製品正本は、特定個人・端末固有path・私用workspaceへ依存しない。

## Scope

### A. 4選択肢とhost別の共通体験

- 共通正本 `plugins/secretary/skills/onboarding/SKILL.md` に、Claude Codeの `AskUserQuestion` とCodexの構造化ユーザー入力の両方で実行できる文面を持たせる。
- 3つの明示候補「あなた」「アカウント名」「指定の名前」とhost標準の「その他」を合わせて4選択肢にする。host UIが「その他」を自動付与する場合は重複させない。
- account-name探索は「アカウント名」を選んだ後だけ行う。他の3経路ではGit／OSを読まない。
- 「指定の名前」と「その他」は短い自由入力を受け、空なら確認候補を「あなた」とする。
- 最初のdirectory／file作成前に `呼び方: <解決値>` を示して確認する。訂正、キャンセル、保存確認未完了では副作用0件とする。
- `plugins/secretary/skills/settings/SKILL.md` の初回説明も同じ契約を参照し、hostごとに探索順・除外規則を変えない。

### B. account-name候補のsource priority

候補sourceは次の順で読む。上位sourceに候補があっても、ユーザーへ選択肢を提示できるよう下位の適格候補も集めてよいが、推奨順位は必ず上位を優先する。

1. `host-task-context`
   - 現在タスクへhostが既に渡した過去会話の記憶、Personalization、Project文脈、現在会話で明示された名前。
   - 任意の過去会話、別task、raw transcript、生session log、memory storeを直接検索する共通APIは呼ばない。
   - 同一tier内の推奨順は、現在会話の明示名、Personalizationのpreferred name、Projectの利用者名、過去会話の記憶。
2. `git-user-name`
   - 現在環境でread-onlyに解決できる `git config user.name`。email、remote、credential、commit historyは名前候補のsourceにしない。
3. `os-user-name`
   - 現在processからread-onlyに得られるOSユーザー名。home pathの解析やdirectory列挙は行わない。

hostが一部sourceを提供しなくてもエラーにせず、次sourceへ進む。候補0件ならaccount-name利用不能を返す。

### C. 正規化、除外、重複、推奨

- 候補はUnicode NFKC、前後空白除去、連続空白の1個化を行う。表示名の大文字小文字を勝手に別人名へ翻訳しない。
- 次を除外する。
  - 空、空白だけ、email形式。
  - 40 Unicode文字を超える値。
  - 空白を除く可視文字の半数以上が数字の値。
  - path、UUID、16文字以上のhex、host名、token風、slug／machine ID等、人物表示名として不自然なmachine-like値。
  - case-insensitiveで `bot`、`ci`、`root`、`admin`、`administrator`、`user`、`username`、`unknown`、`nobody`、`runner`、`github-actions`、`build` と一致する汎用名。
- OS値は上記に加えUnicode letterを1文字以上含む場合だけ候補にする。
- NFKC＋case-fold後に一致する候補は1件へまとめ、最も高いsourceの出典を残す。
- 候補表示は値と短い出典だけにし、raw context、Git config全体、OS環境、除外値を表示しない。最良1件へ「おすすめ」を付ける。
- 探索結果はfile、journal、log、preferences、decision、prompt fixtureの実行結果へ保存しない。回帰証跡は合成値だけを使う。

### D. 既存workspaceの呼び方変更

- 変更前の例文と別turnの保存確認を維持する。
- 確認済みの現在値は `secretary/memory/preferences.md` を正本とし、`secretary/AGENTS.md` のオーナー情報と `secretary/memory/MEMORY.md` のオーナー基本表示へ同じ値を同期する。
- 3 fileを同じ安全なtransactionとして扱い、symlink／path境界、空値、書込み失敗では部分更新をrollbackする。他設定、手書き行、索引、open／closed構成を変更しない。
- `secretary/memory/decisions/<初回日>-decisions.md` は初回決定の履歴としてbyte不変にする。
- 成功時だけjournalとlocal commitを各1件作り、失敗時はどちらにも進まない。pushは行わない。

### E. 個人・環境固有情報scan

active surfaceを次に固定する。

- 配布面: `README.md`、`.claude-plugin/**`、`.agents/plugins/**`、`adapters/**`、`plugins/secretary/**`
- 現行製品正本: `CLAUDE.md`、`docs/spec.md`、`docs/spec/**`、`docs/DESIGN.md`、`docs/agentic-upstream-mapping.md`、`docs/guide/**`
- 現役の配布・回帰処理: `scripts/**`

個人名、具体的な `/Users/<利用者名>/...`、私用workspace依存をscanし、修正対象、allowlist、監査履歴の対象外へ分類する。人物を使うfixtureは合成人物へ置換し、端末pathはruntime root、相対path、placeholder、または明示的な合成pathにする。

固定allowlist:

1. `LICENSE` の著作権表示 `Copyright (c) 2026 Taisei Murayama (村山汰成)`。
2. GitHub owner `mtaiseeei` と公式repository／release URL。
3. `forkedFrom`、元作者クレジット、MIT、製品名、公開version等の正式な配布識別情報。
4. path境界testの合成path `/Users/synthetic-real-home` と、特定user名を含まない汎用guard pattern `//Users/**`。許可fileと件数を列挙する。
5. `docs/sprints/**`、`docs/progress/**`、`docs/feedback/**`、`docs/evidence/**`、`docs/proposal-*.md`、Git履歴の監査・判断履歴。改変せず、現行挙動の根拠にも使わない。

allowlistは値、許可path、件数を固定し、別pathへの同じ値を通さない。

### F. 回帰

- `scripts/sprint-037-test.mjs` を追加し、合成providerでsource priority、正規化、除外、重複、推奨、候補0件、host差を決定的に検査する。
- 正fixtureは、host current-name、Personalization、Project、memory、Git、OS、複数sourceの一致、異なる複数候補を含む。
- 負fixtureは、email、空、汎用名、bot／CI、root／admin、数字中心、40文字超、path、UUID、long hex、host名、token風、machine-like OS値を含む。
- 任意の過去会話／生session log探索APIを呼ばないこと、探索結果を永続化しないことをspyと前後snapshotで確認する。
- 一時workspaceで3正本同期、初回決定ログ不変、rollbackを検査する。
- active surface scanの母集団、除外path、allowlist、unexpected matchをmachine-readableに集計し、負fixtureで検出力を確認する。

## Non-scope

- 任意の過去会話、別task、raw transcript、生session log、memory storeを直接検索する共通API。
- Git email、remote、credential、commit history、home directory列挙を名前sourceにすること。
- AIによる本名推測、外部人物検索、connector、SNS、連絡先、メール本文からの名前抽出。
- 候補探索結果、除外値、出典一覧、推奨順位の永続化。
- 初回決定ログの訂正・削除・最新値への置換。
- 過去のSprint契約、progress、feedback、evidence、proposal、state、Git履歴の遡及編集。
- LICENSE、GitHub owner、公式URL、`forkedFrom`、MIT、公開versionの削除・匿名化。
- Sprint 045のproject open／closed構成の再設計。
- downstream repo、private edition、installed cache、利用者workspaceへの反映・cleanup。
- external connector、GitHub API、remote push、PR、release、marketplace更新、plugin install／update。

## Acceptance Criteria

1. Claude Code／Codexの共通Skill文面が4選択肢を持ち、host標準の「その他」を重複表示しない。
2. account-name探索は「アカウント名」選択後だけ行い、source priorityが `host-task-context`→`git-user-name`→`os-user-name` である。任意の過去会話／生session logの直接探索は0件。
3. host current-name、Personalization、Project、memory、Git、OSの正fixtureで、出典、重複排除、最良1件の推奨が期待どおりになる。host間で欠けるsourceがあっても同じ順序でbest effortになる。
4. email、空、汎用名、bot／CI、root／admin、数字中心、40文字超、path、UUID、long hex、host名、token風、machine-like OS値をすべて除外する。OS値は名前らしい場合だけ残る。
5. 適格候補0件ではaccount-nameを利用不能とし、架空候補を作らず他の3経路へ戻れる。
6. 4経路すべてで解決値を保存前に表示する。訂正、キャンセル、保存確認未完了では副作用0件。選択への未回答、空回答の確認候補は「あなた」。
7. 探索値、除外値、出典、推奨順位は永続物へ0件で、選択・確認済みの呼び方だけが保存される。
8. 既存変更後に `preferences.md`、`AGENTS.md`、`MEMORY.md` の現役表示が一致し、他設定、手書き行、索引、open／closed構成を維持する。途中失敗では3 file、journal、commitの部分副作用0件。
9. 初回決定ログはbyte不変。成功時だけjournalとlocal commit各1件、push 0件。
10. active surface scanのunexpected matchが0件。固定allowlistの値／path／件数が一致し、個人名・端末path・私用workspace依存の負fixtureを拒否する。正式所有情報を維持し、人物fixtureは合成人物である。
11. `[sprint-045]` 2 commit由来のopen／closed挙動を維持し、無関係なproject変更を本Sprintへ含めない。
12. Sprint 037の必須回帰は、着手時HEADでgreenかつ本Sprintの変更に因果のある次のコマンドとし、すべて0 FAILで完了する。
    - `node scripts/sprint-037-test.mjs`
    - `bash scripts/sprint-011-regression.sh`
    - `bash scripts/sprint-012-regression.sh`
    - `bash scripts/sprint-022-regression.sh`

    次は着手時HEADですでに赤い既存baselineとして記録を保持するが、Sprint 037の合否を妨げない。
    任意の内部QAとして再実行してよいが、修復は本Sprintへ混ぜず、必要なら将来の別Sprintで扱う。
    - `bash scripts/regression-check.sh --offline`: 旧Yasashii identity、README、update fixture等の既存不一致。
    - `node scripts/sprint-033-test.mjs --root .`: 未変更のGoogle Chat wizard digestと既存期待値の不一致。
    - `bash scripts/agentic-regression.sh`: 未変更READMEのGoogle Chat説明と既存期待値の不一致。
    - `node scripts/agentic-archive-gate.mjs`: archive内で再現する同じSprint 033 digest不一致。
13. downstream repo、installed cache、利用者workspace、external service、remote、releaseへのwriteが0件である。

## 検証スコープ（着手時に固定）

- 対象: onboarding／settings Skill、候補抽出の決定的処理、呼び方更新シーム、対象templates、Scope Eのactive surface、Sprint専用・既存回帰。
- 必須シナリオ: 4選択肢、全sourceと優先順位、複数一致／複数相違、全除外値、候補0件、host差、保存前確認、探索結果非保存、3正本同期、初回決定不変、scan、Sprint 045回帰。
- 証拠形式（safe harbor）:
  - 実行command、exit code、PASS／FAIL件数。
  - 合成入力、正規化後候補、除外理由、source、推奨結果。
  - provider spy、任意会話／session探索0件、永続物の前後snapshot。
  - 一時workspaceの3正本値、初回決定digest、Git log、push有無。
  - scan母集団、除外path、allowlist値／path／件数、unexpected match、負fixture結果。
  - Sprint 045対象diffとopen／closed回帰結果。

契約・rubricにない外部attestation、統一証拠schema、下流反映、実plugin再インストールを合否条件へ追加しない。

## 完了条件

- Generatorは本Sprintだけを実装し、`docs/progress/sprint-037.md` に実装内容、回帰command、候補fixture結果、scan、既知事項、external write 0件を記録する。
- Evaluatorは別作業単位で実回帰を行い、`docs/feedback/sprint-037.md` に合否、証跡、各findingの `product`／`verification-infra` 分類を書く。
- Evaluator PASSとオーケストレーターによる `docs/sprints/state.md` 更新前に完了扱いにしない。
- 本Sprint中は外部push、release、cache更新、downstream反映を行わない。
