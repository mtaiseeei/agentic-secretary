## Sprint 059: Astra指示改善とmanaged workspace更新を含む `0.13.2` 公開

**ステータス:** migration実装完了 - 評価待ち

### 実装内容

- `0.13.1→0.13.2` を、4つの `replace-section` を持つ非空の内容変更migrationとして追加した。
- 公開済み `v0.13.1` のAGENTS／CLAUDE管理節をimmutable old assetとSHA-256で固定し、現行templateのsession再読、read-only進捗、preferences参照の意味へ更新する。
- assetはowner名等のplaceholderを含まない固定節に限定した。migration engineの所有対象外である `secretary/memory/preferences.md` は変更しない。
- `supported.json` に公開済みsource `0.13.1` を追加し、全declared sourceから `0.13.2` への有限到達性を確認した。
- 現実的なGit workspace fixtureを使う `scripts/sprint-059-migration-test.mjs` を追加した。

### 自己評価

| 基準 | スコア(1-5) | コメント |
|------|------------|---------|
| 機能完全性 | 5 | 旧tag由来4節、到達性、preview／apply／rerun／rollback／partial retryを25ケースで確認した。 |
| 動作安定性 | 5 | LFとCRLFの両fixtureが0 FAIL。rerunはcontent write／追加checkpointとも0件。 |
| デザイン性 | 4 | UI対象外。既存migration schemaとasset命名へ揃えた。 |
| 独自性 | 4 | UI対象外。全template置換を避け、今回変化した固定節だけを配布する。 |
| エラーハンドリング | 5 | customized、unknown-baseline、stale plan、wrong edition、Secret-like contentを副作用なしで保持・拒否する。 |
| 回帰なし | 5 | preferences、利用者自由記述、管理対象外file、EOL、mode、既存ledger／rollbackを保持した。root側release検査も0 FAILと報告済み。 |

### 技術的な判断

- AGENTSの3操作は、1節でもownershipを確認できなければ既存engineのpath単位conflict規則によりAGENTS全体をkeepする。独立したCLAUDEだけは安全に更新できる。
- `preferences.md` template先頭文の変更は新規workspace向けであり、既存利用者の個人設定本文はmigrationで書き換えない。
- 専用testはmigration定義より行数が多い。新collectorは作らず、既存 `update-apply.mjs` の実経路を使うGit fixtureへ限定した。

### 検証結果

- `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-059-migration-test.mjs`: `25 PASS / 0 FAIL`（`NODE_BEFORE=35`、`NODE_AFTER=35`）。
- `git diff --check -- plugins/secretary/migrations scripts/sprint-059-migration-test.mjs docs/progress/sprint-059.md`: PASS。
- migration JSON読込と4つのold asset SHA-256再計算: PASS。
- Orchestratorから同一candidateのroot検査として、release test `13 PASS / 0 FAIL`、inventory `20面 / 67 cases PASS`、Ruby/Psychによる17 Skills型検査PASS、generic PyYAML検査は依存不在のため `INCOMPLETE` と報告された。

### 既知の課題

- Windows native結果は未取得。既存の対象jobへ `scripts/sprint-059-migration-test.mjs` を追加してexact candidateを確認する必要がある。
- candidate freeze、公開前／公開後のfresh独立評価、push／main統合／tag／ReleaseはOrchestratorと後続Evaluatorの所有範囲。

### Evaluatorへの引き渡し事項

- 起動方法: UIなし。Node.jsとGitが利用できるcheckoutで専用testを実行する。
- テスト対象URL: 該当なし。
- 回帰チェック: `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-059-migration-test.mjs`
- Windows job: `node scripts/sprint-059-migration-test.mjs`
- テストシナリオ: 0.13.1のLF／CRLF workspaceをpreview→apply→rerun→rollbackし、4節だけの更新、preferences／自由記述／mode保持、partial retry、customized／unknown／stale／edition／Secret拒否を確認する。

### 配布metadata・root guidanceのGenerator補足（親分担）

- 0.13.2へClaude/Codex manifests、marketplace、current release/host inventory、handoff template versionとそのvalidatorを更新。edition互換baseline0.5.1と固定accepted SHA／過去migration／履歴は不変。CHANGELOG正本・互換copy、新更新guide／READMEを整合させた。
- root guidanceは大幅短縮のreview拒否後、安全・role・counterを保つ局所修正で解消。具体的理由・代替は `docs/astra-instruction-audit-20260912.md`。元repo開始dirtyはAgentic46/Yas33ファイルともhash不変。
- 追加実測: `node scripts/sprint-056-patch-001-release-test.mjs` 13 PASS / 0 FAIL、`node scripts/sprint-049-test.mjs` 20 PASS / 0 FAIL / side effects0。共通wrapper使用、各Node35→35。release guardにcheckout integrityとGit-free CRLF archiveの正負検証を含む。
- current collaboration inventory20面67casesのdigest/marker PASS。system Ruby/Psych 17 Skills name/description型PASS。generic PyYAML quick validationは依存不足INCOMPLETEのまま区別。`git diff --check` PASS。
- Windows既存update jobは新059 migration、既存release guard、既存conversation migrationに限定。workflow_dispatchの `update_only=true` は無関係なwindows-native jobをskipし、従来の既定呼出は保持する。旧固定candidate全migration scriptは履歴として保持し、今回の追加ゲートにしない。
- 正式更新経路は現在のCLI helpとSkillで照合。Codexはmarketplace upgrade／host Plugin UI、Claudeは対象plugin updateと既存scope、新sessionでversion確認。架空のplugin update CLIは追加しない。

### Windows増分修理1（verification-infra）

- 初回candidate `19211cf5dce6db09e095f50524b4c2ecc9a00664` のWindows run34674495396/job103501798053はmigration23 PASS/2 FAIL。LF/CRLF実apply、rerun、rollback、partial、保持・拒否の操作はPASS。release/archive guardと既存conversation migrationもPASS。
- 失敗は `git show` のLF原本とWindows checkoutのCRLF asset/templateをraw比較していた2assert。template/asset比較だけ既存runtimeと同様に改行を正規化し、workspace実bytes保持のassertと製品コード・asset・期待する意味は変更しない。許可済みの1回の局所検証修理で、追加条件や全量再検証は導入しない。

- 修理後Mac当該migration検査25 PASS / 0 FAIL、Node33→33。製品／migration assetは初回candidateとbyte一致、再評価は検証修理差分と新candidateのWindows結果へ限定する。
