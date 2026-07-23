# Sprint 036 — 利用者中立の呼び方と配布物

- Superseded By: `sprint-037`
- 理由: Generator実装前に、アカウント名候補の探索方針がhost明示値限定から、host提供済み文脈→Git→OSのbest-effort探索へ変更されたため。以下の旧受入条件は当時の契約履歴として保持する。

- Type: main sprint
- Risk: standard（初回対話、ローカル設定の同期、配布文面・回帰fixtureを変更する。外部write、資格情報、利用者データ、remoteは扱わない）
- 主眼: Claude Code／Codexの初回オンボーディングで呼び方を4つの選択肢から安全に確定し、既存設定変更の現役表示を同期する。同時に、配布物と現行製品正本から個人・端末・私用環境への依存を除く。
- 依存: `sprint-035` 系譜の完了。`sprint-036` は同系譜のPatchではなく、次のメインSprintである。

## ユーザー決定

次は確定済みであり、Generatorが再質問して別案へ変えない。

1. 初回の呼び方は「あなた」「アカウント名」「指定の名前」「その他」の4選択肢にし、Claude CodeとCodexの両方で採用する。
2. アカウント名はhostが現在の会話へ明示提供した場合だけ候補に使う。取得API、過去会話探索、端末path、環境変数、Git設定から探さない。
3. どの選択経路でも、書込み前に解決した値をユーザーが確認できる。選択への未回答、空回答は「あなた」へ解決し、保存確認が未完了なら書き込まない。
4. 既存の呼び方変更では `preferences.md` を現在値の正本とし、`AGENTS.md` と `MEMORY.md` の現役表示を同期する。初回決定ログは当時の履歴として書き換えない。
5. 配布物の個人名、利用者端末固有の絶対path、私用workspace依存を除く。人物を使うtest fixtureは合成人物へ置換する。
6. LICENSEの著作権名、GitHub owner `mtaiseeei`、公式repository URL等、製品所有・配布に必要な正式情報は維持する。

## 開始時の保全条件

現在HEADにはユーザー既存変更の `[sprint-045]` 2 commitがある。これは本Sprintの成果へ混ぜず、revert、置換、再設計しない。

- `plugins/secretary/templates/AGENTS.md` のopen／closedプロジェクト構成を維持する。呼び方の現役表示と同じfileに触れる必要がある場合も、対象行だけを保全しながら統合する。
- `plugins/secretary/scripts/project-tools.mjs`、`plugins/secretary/skills/daily/SKILL.md`、`plugins/secretary/skills/projects/SKILL.md`、`plugins/secretary/skills/weekly/SKILL.md`、`scripts/sprint-015-regression.sh` のSprint 045挙動を本Sprint理由で変更しない。
- 実装前後のdiffで、Sprint 045由来のopen／closed境界と回帰期待が失われていないことを確認する。

## 外から見える成果

初回セットアップでは、Claude Code／Codexのどちらでも呼び方を4経路から選び、実際に保存される値を確認してから進められる。hostがアカウント名を提供していない場合は候補値を作らず、未回答なら「あなた」で開始する。

既存workspaceで呼び方を変更すると、確認後に `preferences.md`、`AGENTS.md`、`MEMORY.md` の現役表示が同じ値になる。途中失敗では3者の一部だけを残さず、初回決定ログは当時の値を保持する。

配布物と現行製品正本は、特定の利用者・保守者、特定Macのhome path、私用workspaceが無くても理解・実行・検証できる。正式な著作権・repository識別情報は残る。

## Scope

### A. Claude Code／Codex共通の呼び方4選択肢

- 共通正本 `plugins/secretary/skills/onboarding/SKILL.md` に、Claude Codeの `AskUserQuestion` とCodexの構造化ユーザー入力の両方で実行できる文面を持たせる。
- 3つの明示候補「あなた」「アカウント名」「指定の名前」と、host標準の「その他」を合わせて4選択肢にする。host UIが「その他」を自動付与する場合は重複させない。
- 「あなた」は解決値 `あなた`。「指定の名前」と「その他」は短い自由入力を受け、空なら `あなた`。「アカウント名」は現在の会話へhostが明示した値だけを表示・解決値に使う。
- account-nameが現在の会話へ提供されていない場合は、その場で利用不能と分かるようにし、値の探索や推測を行わない。
- Q1の選択後、最初のdirectory／file作成より前に `呼び方: <解決値>` を示して確認する。キャンセルまたは訂正では書込みへ進まない。Q1が未回答なら確認候補を `あなた` とする。
- `plugins/secretary/skills/settings/SKILL.md` の初回説明も同じ選択肢・情報源・確認契約を参照し、hostごとに違う候補を作らない。

### B. 既存workspaceの呼び方変更

- 変更前の例文と `この設定で反映しますか: 呼び方=<値>` の別turn確認を維持する。
- 確認後の現在値は `secretary/memory/preferences.md` を正本とし、`secretary/AGENTS.md` のオーナー情報と `secretary/memory/MEMORY.md` のオーナー基本表示を同じ値へ同期する。
- 3 fileを同じ安全なtransactionとして扱い、symlink／path境界、空値、書込み失敗では部分更新をrollbackする。他の設定、手書き行、索引、Sprint 045のopen／closed構成を変更しない。
- `secretary/memory/decisions/<初回日>-decisions.md` の「呼び方は…に決めた」は初回決定の履歴として変更しない。
- 成功後のjournal追記とlocal commit、失敗時にjournal／commitへ進まない既存契約を維持する。pushは行わない。

### C. 個人・環境固有情報の棚卸しと修正

active surfaceを次に固定する。

- 配布面: `README.md`、`.claude-plugin/**`、`.agents/plugins/**`、`adapters/**`、`plugins/secretary/**`
- 現行製品正本: `CLAUDE.md`、`docs/spec.md`、`docs/spec/**`、`docs/DESIGN.md`、`docs/agentic-upstream-mapping.md`、`docs/guide/**`
- 現役の配布・回帰処理: `scripts/**`

上記を、`村山`、`たいせい`、`Taisei`、`Murayama`、具体的な `/Users/<利用者名>/...`、`my-vault`、および同等の私用環境依存について機械scanする。検出結果は、修正対象、allowlist、監査履歴の対象外に分類し、無条件grepの0件だけを根拠にしない。

- 利用者向け文面、共通Skill、adapter、現行設計、回帰入力にある個人名・私用workspace参照は中立表現へ直す。
- 人物が必要なfixtureは `架空利用者`、`検証担当` 等の合成人物へ置換し、個人名の検出規則自体をfixture値として残さない。
- 特定端末の絶対pathは、実行時root、repository相対path、placeholder、または明示的な合成pathへ置換する。
- 現行製品仕様は振る舞い自体を正本にし、私用workspaceを参照しなければ要件を理解できない記述を残さない。

### D. scan allowlist

次だけを明示allowlistとする。追加例外は「なぜ製品配布に必要か」を契約へ戻さずに増やさない。

1. `LICENSE` の著作権表示 `Copyright (c) 2026 Taisei Murayama (村山汰成)`。
2. manifest、README、adapter、公開guide、edition設定、mapping、release検査にあるGitHub owner `mtaiseeei` と、`https://github.com/mtaiseeei/...` 等の公式repository／release URL。
3. `forkedFrom`、元作者クレジット、MIT、製品名、公開version等の正式な配布識別情報。
4. path境界testに必要な、実在利用者を示さない合成path（例: `/Users/synthetic-real-home`）と、特定user名を含まない汎用guard pattern（例: `//Users/**`）。用途と許可fileをscan結果へ列挙する。
5. `docs/sprints/**`、`docs/progress/**`、`docs/feedback/**`、`docs/evidence/**`、`docs/proposal-*.md`、Git履歴にある過去の判断・実行証跡。これらは監査履歴として改変しないが、現行挙動や配布依存の根拠にも使わない。

allowlistは値だけでなく許可pathと件数を出力する。許可値を別pathへ置けば通る実装にしない。負fixtureとして、配布Skillへの個人名、adapterへの端末固有path、現行specへの私用workspace依存、非LICENSE文書への著作権名コピーをそれぞれ検出できることを確認する。

### E. 回帰

- Sprint専用回帰 `scripts/sprint-036-test.mjs` を追加し、4選択肢、account-nameあり／なし、指定名、その他、未回答、保存前確認、確認前副作用0件を構造とデータで検査する。
- 一時 `secretary/` で呼び方変更を実行し、3つの現役表示一致、他設定・手書き行・索引維持、初回決定ログ不変、失敗時rollbackを検査する。
- active surface scanは母集団、除外path、allowlistの値／path／件数、unexpected matchをmachine-readableに集計し、負fixtureで検出力を確認する。
- Sprint 045のopen／closed構成、既存オンボーディング、settings、4 host adapter、配布archiveを回帰させない。

## Non-scope

- 呼び方以外の質問数、サービス、任せたいこと、役割、報告詳しさ、口調presetの再設計。
- account-name取得API、OS user、home directory、Git user、connector、過去会話を使った名前探索。
- 初回決定ログの訂正・削除・最新値への置換。
- 過去のSprint契約、progress、feedback、evidence、proposal、state、Git履歴の個人情報を遡及編集すること。
- LICENSEの著作権名、GitHub owner、公式repository URL、`forkedFrom`、MIT、公開versionの削除・匿名化。
- `[sprint-045]` のproject open／closed構成、移行、検索、daily／weekly挙動の再設計。
- downstream repo、private edition、installed cache、利用者workspaceへの反映・cleanup。
- external connector、GitHub API、remote push、PR、release、marketplace更新、plugin install／update。

## Acceptance Criteria

1. Claude Code／Codexの共通Skill文面が「あなた」「アカウント名」「指定の名前」「その他」の4選択肢を持ち、host標準の「その他」を重複表示しない。
2. hostが現在の会話へaccount-nameを明示した場合だけその値を候補に使う。未提供時は取得API、過去会話、端末path、環境変数、Git設定へアクセスせず、架空候補を作らない。
3. 4経路すべてで解決値が保存前に表示され、訂正・キャンセル・保存確認未完了では副作用0件。選択への未回答、空回答の確認候補は `あなた`。
4. Claude Code用 `AskUserQuestion` とCodex用構造化質問の両方で同じ意味契約を実行でき、1 hostの文面だけを直して合格にしない。
5. 既存の呼び方変更後、`preferences.md`、`AGENTS.md`、`MEMORY.md` の現役表示が一致する。他設定・手書き行・索引・open／closed構成は維持される。
6. 同期途中の失敗、外向きsymlink、空値では3 fileの部分更新、journal、commitが0件。成功時だけjournalとlocal commitが各1件で、pushは0件。
7. 初回決定ログは初回値のままbyte不変であり、現在値として参照するのは `preferences.md`。後日の変更を初回判断へ遡及反映しない。
8. active surface scanでunexpectedな個人名、利用者端末固有path、私用workspace依存が0件。allowlistは値／path／件数が一致し、負fixture4種をすべて拒否する。
9. LICENSE著作権表示、GitHub owner `mtaiseeei`、公式repository URL、`forkedFrom`、MIT、公開versionが維持され、test fixtureの人物は合成人物になっている。
10. `[sprint-045]` 2 commit由来のopen／closed挙動と対象diffを維持し、本Sprintの差分へ無関係なproject変更を含めない。
11. 次の回帰コマンドが0 FAILで完了する。
    - `node scripts/sprint-036-test.mjs`
    - `bash scripts/regression-check.sh --offline`
    - `bash scripts/sprint-011-regression.sh`
    - `bash scripts/sprint-012-regression.sh`
    - `node scripts/sprint-033-test.mjs --root .`
    - `bash scripts/agentic-regression.sh`
    - `node scripts/agentic-archive-gate.mjs`
12. downstream repo、installed cache、利用者workspace、external service、remote、releaseへのwriteが0件である。

## 検証スコープ（着手時に固定）

- 検証対象:
  - `plugins/secretary/skills/onboarding/SKILL.md`
  - `plugins/secretary/skills/settings/SKILL.md`
  - 呼び方の決定的更新シームと `plugins/secretary/templates/{AGENTS.md,memory/MEMORY.md,memory/preferences.md,memory/decisions/_first-decision.md}`
  - Scope Cのactive surface
  - `scripts/sprint-036-test.mjs` とAcceptance Criteria 11の既存回帰
- 必須シナリオ:
  1. Claude Code／Codexの4選択肢
  2. account-name提供あり／なし
  3. 指定名／その他／未回答
  4. 保存前確認の了承／訂正／キャンセル
  5. 既存呼び方変更の成功／空値／途中失敗／symlink拒否
  6. 現役3表示一致、初回決定ログ不変、他設定・手書き行・索引維持
  7. active surface scan、固定allowlist、負fixture4種
  8. Sprint 045 open／closed回帰
- 証拠形式（safe harbor）:
  - 実行command、exit code、PASS／FAIL件数
  - host別の質問文と候補数、入力、解決値、確認前後snapshot
  - 一時workspaceの対象4 fileについて変更前後の値、byte digest、Git log／push有無
  - scanの母集団、除外path、allowlist値／path／件数、unexpected match、負fixture結果
  - Sprint 045対象fileの開始HEAD、関連diff、open／closed回帰結果
  - repo外writeについては検査対象を列挙した範囲限定の前後状態

契約とrubricにない外部attestation、統一証拠schema、下流反映、実plugin再インストールを合否条件へ追加しない。

## 完了条件

- Generatorは本Sprintだけを実装し、対応する `docs/progress/sprint-036.md` に実装内容、変更file、回帰command、scan結果、既知事項、external write 0件を記録する。
- Evaluatorは別の作業単位で実回帰と一時workspaceを操作し、対応する `docs/feedback/sprint-036.md` に合否、各findingの `product`／`verification-infra` 分類、証跡を記録する。
- Evaluator PASSとオーケストレーターによる `docs/sprints/state.md` 更新前に完了扱いにしない。
- 本Sprint中は外部push、release、cache更新、downstream反映を行わない。
