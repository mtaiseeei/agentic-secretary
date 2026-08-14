# Sprint 039 — 秘書identity、英語名、安全な別repo呼び出し

- Type: main
- Risk: high（user-scope guidance、複数workspace routing、作者identity、既存コンテンツを対象にし得るrenameを扱う）
- 依存: `sprint-038-patch-002` done
- 主眼: Agentic共通コアへ秘書自身の英語名とstable identityを導入し、初回、既存利用者、別repo呼び出し、renameを明示確認とrollbackで一貫させる。

## Scope

1. 利用者の呼び方と別の `display_name`、stable ID、`ai-secretary` 種別、aliases、およびhuman／AIを識別できるauthor表示・構造化metadata。
2. 初回オンボーディングの「希望の英語名／おまかせ」と、既存利用者が直接起動できるname Skill。保存値は確認前に書き込まない。
3. 別repo呼び出しの効果と無効化を説明し、推奨yesの明示確認後だけ設定するuser-scope managed block。CodexのAGENTS override優先とClaude CodeのCLAUDEを扱う。
4. cwdではなく登録済み秘書workspaceを解決する最小registry/resolver。実体境界、edition marker、必要正本を再検証する。
5. 現在名への直接呼びかけ／「名前に聞いて」の正caseと、人間、顧客、author、引用、コード、ファイル本文のnegative case。曖昧時だけ一度確認する。
6. rename候補をA: 現行設定、B: 利用者コンテンツ、C: 履歴／author、D: 所有不明へ分類するread-only preview。Aは一体更新、Bは個別opt-in、Cは原則保持＋alias、Dは変更禁止とする。
7. Agentic candidateと下流同期可能な共通配布面・回帰・handoff。下流の実反映は各repoの別Sprintへ渡す。

## Non-scope

- 日本語名、複数active秘書、人格preset、常駐daemon。
- repo全体の無条件置換、Git履歴書換え、過去authorの一括変更、利用者コンテンツの無確認変更。
- user-scope guidance全体や製品外managed blockの変更。
- 実利用者HOME、installed cache、実Yasashii／private repo、Mac mini、push、tag、release、marketplace公開への書込み。

## Acceptance Criteria

1. 初回とname Skillで希望名／おまかせが成立し、確認前write、不適格名保存、利用者の呼び方変更が各0件である。
2. display name、stable ID、AI種別、aliasesが一貫し、human／AI authorを識別できる。rename前後でstable IDと過去author主体が不変である。
3. user-scope連携は効果、対象host/file、managed block、無効化方法を示した明示確認後だけ有効になり、拒否／取消では変更0件である。
4. Codex通常AGENTS、overrideあり、両方あり、Claude CLAUDE、既存／重複blockの各fixtureで実際の対象だけを扱い、既存内容と製品外blockが不変である。
5. managed blockのcreate／update／disableはatomic、rollback可能、再実行差分0件で、routing無効化がidentityや履歴を削除しない。
6. registryは許可metadataだけを持ち、Secret・記憶・会話・顧客名・成果物本文0件である。resolverは実体path、edition marker、必要正本を検証する。
7. 別repoの正caseはcanonical workspaceへ接続し、cwdへのonboarding、`secretary/`作成、ledger、commit、pushが0件である。
8. 人間／顧客／取引先／author／引用／コード／ファイル本文の同名caseはrouting 0件で、曖昧caseは質問前副作用0件かつ重複確認0件である。
9. rename previewはA〜D分類、対象、件数、推奨処理、非対象、rollbackを示し、preview前後snapshotが一致する。無条件全置換経路は0件である。
10. rename applyは分類別確認後だけ実行し、Aを一体更新、許可済みBだけ更新、Cを保持してaliasを追加、Dを変更しない。途中失敗rollbackと再実行差分0件が成立する。
11. 同名rename、alias衝突、registry欠落／移動／重複、反対edition、symlink／junction、read-only、部分書込み失敗が安全に停止し、部分成功を全体成功と表示しない。
12. onboarding、router、settings、update／migration、author metadata、Claude／Codex Skill、macOS／Linux／Windowsの既存回帰が0 FAILである。
13. 合成HOMEと隔離workspaceだけでuser-scope回帰が完走し、実HOME、cache、実下流、外部サービス、remoteへのwrite 0件を対象別snapshotで示す。
14. checkoutとGit archive相当の同一candidateで、Skill／manifest validator、secret scan、identity、resolver、rename、master回帰が0 FAILである。
15. 下流handoffはAgentic完全SHA、共通path、除外path、保護対象、rollbackを示し、Yasashii overlay、private固有Notion／vault、root AGENTS、各repo docsを含めない。
16. 独立Evaluatorが同一candidateを実操作し、C2・C5・C6・C9・C10・C12〜C16の該当閾値を満たす。PASS前の下流反映、実HOME変更、Mac mini同期、外部publishは0件である。

## Evidence safe harbor

- 合成HOME: Codex通常／override、Claude CLAUDE、空・既存・重複block、利用者編集、permission失敗の前後digest、rollback、再実行結果。
- 隔離workspace: identity新規／既存、別repo cwd、移動・欠落・重複、反対edition、symlink／junction、read-onlyのresolver結果。
- 会話case: 希望名、おまかせ、取消、不適格名、直接Skill、現在名呼びかけ、「名前に聞いて」、人間／顧客／author／引用／コード／曖昧文脈。
- rename: A〜D分類、許可／拒否／一部選択、同名、alias衝突、途中失敗、rollback、retry、履歴不変、stable ID／aliasesの前後snapshot。
- 配布: checkout／archiveの同一candidate、Skill／manifest validator、secret scan、master回帰、下流handoff構造検査。
- command、exit code、fixture root、case ID、期待／観測、前後digest、not-runがあれば十分とする。Secret、実HOME内容、private本文、歴史的live evidence、実下流操作、Mac mini、external publish、新しいcollector／統一attestationは要求しない。

## 完了条件

Generatorは本Sprintだけを実装して `docs/progress/sprint-039.md` へ引き渡しを記録する。Evaluatorは別作業単位で同一candidateを実操作し、`docs/feedback/sprint-039.md` へ証拠と判定を書く。Evaluator PASSとOrchestratorのstate更新前に完了扱いにしない。下流Sprint、release、Mac mini同期は別の完了判定を持つ。
