# Sprint 038 — 人間らしい会話フローと3配布系統の意味整合

- Type: main sprint
- Risk: high（共通会話契約、private Notion連携、3配布系統、release candidate、外部公開判断を扱う）
- 依存: `sprint-037-patch-001` done
- 含む機能: F54, F55, F56, F57
- 主眼: 確認回数ではなく、利用者のintent（意図）、実際の副作用、応答状態に基づいて安全で自然な会話を成立させる。

## ゴール

明示された低リスク操作は、その発話自体をauthorization（実行許可）として同じターンで完了する。
一方、自発提案、曖昧な依頼、破壊的操作、外部通知・公開、大量操作では必要な事前確認を維持する。
この共通契約を `agentic-secretary`、private downstreamの `agentic-secretary-my-vault`、
`yasashii-secretary` の3配布系統へ同期し、同一Sprintのrelease gateまで検証可能な状態にする。

## ユーザー承認済みの判断

1. 本調整は単一の大きなmain Sprintとして扱う。
2. 明示依頼は、操作・対象・行き先が一意で残る危険が小さい場合、その発話をauthorizationとする。
3. 自発提案と曖昧な依頼は質問前の副作用0件を守り、質問では不足する一点を示す。
4. 削除、上書き、戻しにくい変更、公開、push、認証、権限、課金、他者通知、大量操作、Secret保存は別確認を維持する。
5. Notionは承認済みの限定5点だけを直し、通常フローを全面変更しない。
6. Planner完了後、Generator dispatch前にFableの敵対的レビューを行い、採否をPlanner正本へ反映する。
7. 実装と独立評価の後、release gateを通過し、外部公開の確認点を経た場合だけreleaseを実行できる。

## 外から見える成果

- 「覚えて」「設定して」「TODO 3を完了にして」等の一意な低リスク明示依頼は、同じ内容を再承認させず完了する。
- 秘書側の保存・設定・プロジェクト化提案は、実行内容が分かる質問を出し、了承前は何も変更しない。
- 曖昧な依頼は質問のない宣言文で止まらず、対象、日付、行き先、参照先の不足一点を尋ねる。
- 成功、質問、失敗、部分成功の返答は実状態と一致し、単純成功は自然な短文になる。
- 現在の用件が、古い再開しおり、決定0件監査、内部index、プロジェクト候補に横取りされない。
- agentic、private my-vault、yasashiiで、文体差を残しながら同じ意味と安全境界を持つ。

## Scope

### A. 共通authorizationモデル

- `explicit / inferred / ambiguous / destructive / external` の分類と優先関係を共通coreへ反映する。
- 複数分類に当たる場合は `destructive` または `external` の強い確認境界を優先する。
- 明示低リスクは同じターンで1回だけ実行し、自発提案・曖昧入力・高リスク操作は確認前0件とする。
- 「同じターン」は1つのユーザー発話を受け、tool実行を含み、最終応答で終わる1 assistant turnとする。retry／resumeは同じoperation idを引き継ぎ、既実行の副作用を重複させない。
- 引用、伝聞、仮定・条件、訂正、取消、過去依頼への照会に「覚えて」「記録して」等が含まれても、現在の`explicit` write依頼にしない。未保存の取消は副作用0件、保存済みの取消は既存の削除2段階へ接続する。
- destructiveな上書きは、利用者作成・編集内容の置換・喪失、または容易にrollbackできない変更とする。単一設定値の可逆更新は除外する。
- 大量操作は10件以上、件数未確定の「全部／一括」、複数repo・複数外部宛先にまたがる操作のいずれかとする。
- 低リスクとexternal／destructiveが混在する複合依頼は記載順を守る。確認境界より前の独立低リスクだけを実行して`partial`で示し、境界以降は確認後まで実行しない。相互依存、一括指定、atomicな結果が必要な場合は最初の副作用前に全体確認する。
- 重複確認を省いても、同じ副作用の重複実行は許さない。既存のidempotencyと重複防止を維持する。
- path guard、atomic write、rollback、空上書き拒否、Secret非表示・保存拒否、未依頼push禁止を維持する。
- 外部状態を確認していない成功表示、書込み失敗時の成功表示、入力にない事実の保存を禁止する。

### B. 会話surfaceの監査と調整

次のsurfaceを、共通契約、現在用件優先、重複確認、質問の有無、実状態に合う返答の観点で監査し、
旧契約と衝突する指示・copy・fixture・回帰を調整する。

- `memory-care`: 明示保存、自発提案、曖昧な保存先、意味保存、不要な全文非保存。
- `settings`: 明示された可逆変更、値不足、通常設定とSecretの分離、変更後の自然な報告。
- `daily`: 明示TODO完了・持越し、重複作成、日付と現在用件の優先。
- `projects`: 明示プロジェクト化、自発候補、完了、再開、closed projectの軽量read-only照合。
- `secretary` / resume: 現在用件を古い再開しおりや内部状態より優先する。
- 会話の締め: 決定0件の内部監査を通常の締めへ強制しない。
- setup: 利用依頼と接続設定依頼を分け、確認可能なら実際に未接続の場合だけsetupへ進む。
- `update`: 読み取り専用診断と、確認が必要な更新・公開・rollbackを混同しない。
- `onboarding`: 同じ選択・依頼の重複確認を減らし、既存の重大な作成・公開境界は維持する。
- response style: 固定3項目、内部stage名、不要な技術証跡、架空の次行動を内容依存の応答へ置き換える。

setupの接続状態を確認できない場合は未接続と推定しない。read-only診断を推奨し、setupを明示的に選んでも認証・権限変更・外部writeの直前確認を維持する。
週次の古い月退避、`MEMORY.md`上限超過時の退避、既存workspace再初期化・backup、PJフル昇格、customized file上書き、
rollback、削除、公開、push、認証、権限、他者通知は、引き続き別確認を必要とする。

### C. 意味保存golden setと回帰置換

- 会話の主な合格条件を自然文のbyte一致、固定prefix、質問禁止、固定3項目から、
  `intent × side effect × response state`、意味保存、境界golden setへ置き換える。
- intentは `explicit / inferred / ambiguous / destructive / external` を含む。
- side effectは `0 / 1 / partial`、response stateは `answered / question / saved / error / partial` を含む。`answered` はread-only照会等へ副作用0件で答えた状態とする。
- 保存された主体、日付・期限、行動・対象、否定・条件、行き先が入力と一致することを検査する。
- 入力にない担当、期限、顧客名、因果、確定状態、依頼語、不要な全文を保存しない。
- 各caseはcase ID、edition、入力、前提、期待intent／side effect／response state、必須応答要素、禁止表現、
  意味tuple（主体、日付・期限、行動、対象、否定・条件、行き先）、変更前後snapshotを持つ。
- 主体、日付・期限、行動、対象、否定・条件、行き先の欠落・反転・入力にない追加を注入したnegative fixtureを必須にする。
  決定的に機械判定できない項目は、Evaluatorが観測文と判定根拠を記録する。
- 境界例に、引用、伝聞、仮定・条件、訂正、取消、過去依頼照会、重複作成、Secret保存、他者通知、複合依頼の一部失敗、明示TODO完了・持越し、
  closed project照合、決定0件の締め、setup接続済み／未接続を含める。
- CHANGELOG互換、候補bytes、共通asset等、会話意味以外の既存byte一致契約は対象理由を明示して維持する。
- 過去Sprintのcontract、progress、feedback、evidenceは履歴として改変しない。
- 現役旧judgeの置換対象には、`scripts/lib/sprint-032-patch-001-conversation.mjs` とそれを使うreadability／smoke、
  `scripts/check-report-schema.py`、固定3項目shapeを要求するSprint 010／011／012／029／032系assertを含める。
  置換は新契約と衝突するassertだけとし、同じsuiteのpath guard、timeline決定性、Secret非露出、Git所有範囲、cleanup等を保持する。

### D. 3配布系統の同期

- `agentic-secretary` の共通coreを正本とし、対象pathとcandidate SHAを固定してprivate my-vaultへ反映する。
- `yasashii-secretary` は宣言済みoverlay経由で同期し、edition固有の会話、診断、報告、handoffを維持する。
- 各repo固有のspec、Sprint記録、README、配布判断、private値を上書き・逆流させない。
- 同期前後でrepo-owned fileのdigestを保護し、未分類差分、private値漏洩、版間driftを拒否する。
- 共通coreのintent分類、response state、内容依存応答、安全境界は本repoが所有する。
- `task-triage`、`notion-tasks`、`vault-search`、`vault-documents` 等はprivate repoが所有し、private側の同一Sprint契約作業単位でだけ変更する。
- Generator／Evaluator中は実downstreamへ反映せず、common SHAとprivate base SHAを固定した隔離candidateで実装・評価する。独立Evaluator PASS後、配布系統別の明示確認を経たrelease操作でだけ実downstreamへ反映・再インストールする。`/Users/taisei/my-vault` の利用者データは変更しない。
- 共通golden setは、行き先・正本ルールまで同じcaseだけを3配布系統で比較する。Notion routing等はedition固有caseとし、intentと安全境界だけを共通比較し、保存先とresponse stateは各版正本に従う。文言のbyte一致は要求しない。

### E. my-vaultの限定Notion修正

1. task-triageの番号承認後、内容と対象が不変なら同じタスクを再承認させない。
2. 明示保存依頼で、質問文なしに停止しない。
3. 日付を伴う将来の実行行動をlocal TODOへ誤送せず、Notion TaskDB正本へ送る。
4. Calendarとvaultのread-only横断依頼は内部で分けて取得し、利用者へ統合結果を返す。
5. 内部用語だけで停止せず、利用者が決める不足一点を質問する。

通常のNotion直接起票におけるTaskDB、property、relation、作成計画提示、connector write、
page再読確認、未確認外部状態を成功扱いしない境界は変更しない。

### F. 既存workspaceの限定migration

- `plugins/secretary/templates/AGENTS.md` 由来と証明できる既存 `secretary/AGENTS.md` の旧別ターン・固定3項目契約行だけを対象にする。
- dry-runで対象行、期待旧値、新値、template fingerprint、衝突、backup／rollbackを示す。
- 完全一致または記録済みfingerprintがない行、利用者編集、所有判定不能では副作用0件で停止する。ファイル全面上書き、周辺指示の並べ替え・削除は禁止する。
- 適用はatomicで、同じmigrationの再実行は差分0件。対象外・衝突workspaceにはCHANGELOGで旧挙動が残る可能性と手動確認箇所を示す。

### G. 公開履歴と現在candidate

- `v0.8.0`、marketplace、Claude／Codex manifest、CHANGELOG先頭の一致により `0.8.0` を最高公開版とする。
- 本Sprintは後方互換な利用者向け機能追加なので、Semantic Versioningのminor更新を1回適用した `0.9.0` を現在candidateとして一意に固定する。入力不一致ならversionを推測せずPlannerへ戻す。
- 本Sprintが変更するversion ownerは、current marketplace、Claude／Codex manifest、正本／legacy CHANGELOGの0.9.0新entry、edition metadata、公開ガイド、current release gateである。
- `0.7.0`／`0.8.0` のmanifest snapshot、migration、fixture、tag、progress、feedback、履歴assertは変更しない。履歴回帰と0.9.0 current gateを別結果で検査する。
- agentic public、private my-vault、yasashii publicごとにsource SHA、artifact、destination、rollback、再インストール要否、外部許可を確認する。1系統の許可・PASSを他系統へ流用しない。

## Pre-Generator Fable review gate

- Planner正本が揃った後、オーケストレーターは `claude -p` のFableへ敵対的レビューを依頼する。
- Fableは安全性後退、intent誤分類、Notion過剰変更、3配布系統のversion／copy／挙動drift、
  テスト抜け、release事故を重点的に探す。
- 各指摘は採用／不採用と理由を記録し、採用事項はPlannerだけがspecまたは本契約へ反映する。
- 反映後に矛盾とscopeを再確認し、未処理の重大指摘が0件になるまでGeneratorをdispatchしない。
- Fableレビューは独立Evaluatorの代替ではなく、PASSやstate更新を行わない。

## Non-scope

- Notion property設計、relation、TaskDB正本、通常の作成・再読確認フローの全面変更。
- Notion connectorの汎用wrapper化、Notion以外を含む新しい外部タスク基盤。
- 自然な会話を理由にした削除・公開・push・認証・権限・課金・通知・大量操作の確認省略。
- path guard、atomic write、rollback、Secret境界、外部状態検証、Git所有範囲の弱体化。
- 3 repoの統合、edition switching、co-install、private値・private-owned fileのpublic側への同期。
- 既存 `secretary/AGENTS.md` の全面上書き、template由来と証明できない行の自動変更、利用者編集との自動merge。
- 独立Evaluator PASS前の実 `agentic-secretary-my-vault` downstream反映、plugin再インストール、`/Users/taisei/my-vault` の利用者データ変更。
- 過去release、過去Sprint記録、`0.7.0` のmanifest・migration・fixture・Git履歴の遡及変更。
- 統一evidence schema、attestation、collector等の新しい大規模検証基盤の開発。

## Acceptance Criteria

1. 監査対象surfaceすべてで、明示低リスクは同じターンに副作用1件、自発提案・曖昧さは質問前0件となる。
2. destructive／externalは、明示依頼でも対象・影響・送信先または公開範囲の確認前0件となる。
3. `answered / question / saved / error / partial` が副作用 `0 / 1 / partial` と一致し、read-only回答でのwrite、質問なし停止、未実行の完了表示、部分成功の全体成功表示が0件である。
4. 現在用件がresume、決定0件、project候補、内部indexより先に扱われ、closed projectのread-only照合を人工的に拒否しない。
5. 保存内容の主体、日付・期限、行動・対象、否定・条件、行き先に欠落・反転・追加がなく、依頼語・不要全文を保存しない。
6. golden setが全intent、全side effect、全response stateと指定境界例を網羅し、caseごとの必須要素、禁止表現、意味tuple、前後snapshotを機械検査し、欠落・反転・追加negative fixtureを検出する。
7. 引用、伝聞、仮定・条件、訂正、取消、過去依頼照会は現在のexplicit writeへ誤分類されず、未保存取消は副作用0件、保存済み取消は削除2段階となる。
8. 旧exact copy、固定prefix、質問禁止、固定3項目を主条件とする現役会話回帰が0件で、意味以外のbyte一致契約は維持される。削除・置換・追加assert一覧と、同一suiteで保持した安全assert一覧が証拠にある。
9. memory-care、settings、daily、projects、resume、締め、setup、update、onboarding、closed project、response styleの専用回帰が0 FAILである。setup判定不能時は未接続と推定せず、read-only診断または利用者選択へ進む。
10. 低リスク＋externalの複合依頼は記載順を守り、確認境界後を実行しない。相互依存・一括は最初の副作用前0件、retry／resumeでも副作用重複0件である。
11. agentic、private my-vault、yasashiiの共通caseは行き先・正本ルールまで同じものに限定し、intent、副作用、応答状態、保存意味が一致する。Notion routing等の版固有caseは各版正本に従い、安全境界だけが共通である。
12. my-vaultの変更は限定5点だけで、Notion property、relation、TaskDB正本、通常の計画提示、write後再読確認が回帰しない。private所有Skillは隔離candidateで評価され、Evaluator PASS前の実downstream変更・再インストールが0件である。
13. 同期対象外のrepo-owned fileとprivate値は開始前後で不変、未分類差分と版間driftは0件である。
14. 既存workspace migrationはtemplate由来行だけをdry-run後にatomic変更し、利用者編集・所有判定不能では0変更、全面上書き0件、rollback可能、再実行差分0件である。
15. 共通の安全回帰、各配布系統の専用回帰、checkout gate、Git archive相当gateが同一candidate bytesで0 FAILになる。
16. manifest、CHANGELOG先頭、公開tag `v0.8.0` の一致と変更分類からcandidate `0.9.0` が一意に解決され、推測値を使わない。
17. `0.7.0`／`0.8.0` の履歴回帰は期待値不変で合格し、current marketplace／両manifest／CHANGELOG新entry／edition metadata／公開ガイド／version gateが `0.9.0` で一致する。
18. candidate version、candidate SHA／bytes、配布先、変更内容、rollback、再インストール要否が、agentic public、private my-vault、yasashii publicごとのrelease記録案で一致する。
19. 独立Evaluatorが同一candidateを実操作し、C2・C5・C6・C9〜C15の対象閾値と本基準を満たす。
20. Fable敵対的レビューR1〜R9の各指摘に反映先があり、推奨事項の採否と理由が記録され、未処理の必須指摘が0件である。
21. 外部publish前に、オーケストレーターが配布系統別のversion、destination、candidate、rollback、後始末を提示して確認を得る。
22. 許可された外部publishだけを実行し、公開後のversion／artifact／destination照合とrollback可能性を確認する。

## 検証スコープ（着手時に固定）

- 対象: Scope Bの全surface、共通会話rule／copy／fixture、3配布系統の同期対象、my-vault限定5点、release candidate／gate。
- 必須シナリオ: Acceptance Criteria 1〜22と、F56の全分類・境界例。
- 必須環境: agentic正本、private my-vault downstream、yasashii downstreamの隔離されたcandidate。
- 外部操作: release gate通過後も、オーケストレーターの確認前はtag、GitHub Release、marketplace更新、remote push、公開を0件とする。

### 証拠形式（safe harbor）

- 実行command、対象repo／candidate、exit code、PASS／FAIL／未実行件数。
- golden setのcase ID、入力、期待・観測intent、前後snapshotで確認した副作用、応答状態、必須要素、禁止表現、意味tuple、negative fixture結果。
- サニタイズ済み実会話記録と、host・runner・実行面。資格情報、private本文、不要な個人情報は含めない。
- 一時workspaceの変更前後snapshot、重複件数、rollback結果、外部通知・push・Secret保存0件の対象限定記録。
- 3配布系統の同期元SHA、対象path、共通case結果、repo-owned fileの前後digest、未分類差分一覧。
- common parity caseとedition固有caseの一覧、共通比較した安全境界、版固有の保存先／response state。
- my-vault隔離candidateのbase／candidate SHA、限定5点の独立結果、Notion通常フローの不変確認、実downstream未反映の確認。実Notion writeは明示許可がある場合だけ行う。
- 既存AGENTS migrationのdry-run、template由来判定、衝突fixture、前後snapshot、rollback、再実行差分0件、CHANGELOG警告。
- 旧judgeについて削除・置換・追加したassert一覧と、同じsuiteで保持した非衝突安全assert一覧。
- Fableレビュー本文、指摘ごとの採否・理由、反映先、反映後diff。
- 最高公開版0.8.0の解決根拠、minor更新0.9.0の変更分類、0.7.0／0.8.0履歴回帰、0.9.0 current gate、candidate identity、checkout／archive gate結果、配布系統別destination、変更内容、rollback／再インストール手順。
- 外部publishを行う場合は確認記録、実行対象、公開後照合、後始末。行わない場合は未実行として明記する。

上記の証拠があれば合否判定に十分とする。統一attestation、専用collector、証拠schema、
新しい大規模verification infrastructure、契約外の実サービス書込みを合否条件へ追加しない。

## Release candidate / release gate

1. Generator完了後、public common candidateと各隔離downstream candidateの配布対象bytes／SHAを固定する。独立Evaluator PASS前に実downstreamへ反映しない。
2. marketplace、両manifest、CHANGELOG先頭、公開tagから最高公開版 `0.8.0` を確認し、後方互換機能追加のminor更新 `0.9.0` を使う。入力不一致ならpublishせずPlannerへ戻す。
3. 同一candidateで専用回帰、共通回帰、checkout gate、archive gate、3配布系統parityを完走する。
4. 独立EvaluatorのPASS後、agentic public、private my-vault、yasashii publicごとにversion、source SHA、artifact、destination、変更内容、rollback、再インストール、後始末をrelease判断としてまとめる。
5. オーケストレーターの確認点を通過した操作だけ、指定destinationへpublishする。
6. 公開後のartifactとcandidateの対応を確認し、不一致または後始末未完了なら `ready` としない。

## 完了条件

- Generatorは1 Sprintだけを実装し、対応するprogressへ実装、回帰、candidate、既知事項を記録する。
- Evaluatorは別作業単位で同一candidateを実操作し、対応するfeedbackへ証拠とfinding分類を記録する。
- 外部publishを含める場合も、確認前の外部変更は0件とし、許可範囲を越えない。
- Evaluator PASS、必要なrelease gate、オーケストレーターによるstate更新前に完了扱いにしない。
