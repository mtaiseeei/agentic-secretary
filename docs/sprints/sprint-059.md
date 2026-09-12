# Sprint 059 — Astra指示改善とmanaged workspace更新を含む `0.13.2` 公開

- Type: standard
- Risk: high（root guidance、workspace migration、remote main、tag、Release、artifactを扱う）
- Candidate version: `0.13.2`（Phase A着手前のremote tag実測で`v0.13.1`がlatestの場合）
- 開始remote main: `9903b34b4333dcab10fd2204e8664f43aecbbea6`
- 依存: `sprint-058` fresh独立Evaluator PASS。初回FAILと修正履歴は保持する。
- 関連rubric: C1、C2、C3、C5、C6、C10、C12、C13、C14、C15、C18（既存thresholdを維持）

## ゴール

Sprint 058で独立PASSしたAstra向けinstruction改善と、監査でHarness／root所有として保留した必要項目を、現在の公開Agentic sourceへ意味統合する。変更されたmanaged guidanceを既存利用者へ安全に届けるmigration、配布metadata、CHANGELOGを揃え、後方互換なpatch releaseとして公開する。公開前candidateと公開後の実artifactは別々のfresh独立Evaluatorが判定する。

## 固定前提と許可

- 利用者は、deferred／保留／禁止事項の全件再確認、今回必要なroot guidance／overlay・handoff／migration／checkpointの修正、candidate commit、対象branchへの通常push、通常main統合、新tag、GitHub Release、artifact公開を明示承認済みである。同じ許可を再質問しない。
- Phase A前に`origin`の対象branch、`main`、tag、latest Releaseを再実測する。`v0.13.1`がlatestで、`v0.13.2`が未使用の場合だけ`0.13.2`を採番する。新しい公開版または同名tagを検出した場合は上書きせず、実測値を記録してOrchestratorへ返す。
- 開始時のroot既存dirtyとSprint 058の製品修正は消さず、関連する意図を保持して必要差分だけ重ねる。force push、reset、rebase、無断cleanup、tag移動、既存Release／artifactの差替え・削除、公開範囲変更は行わない。
- private my-vault固有機能・値・workspaceとconsulting slidesは別ownerであり、今回のpublic Agentic releaseへ取り込まない。監査で`not-applicable`／別ownerとした理由を保持し、修正済みと表示しない。
- Harnessのmodel／effortは現在の共有設定・個人設定・ユーザー指定を正本とし、推測変更しない。installed Harnessの版をSecretary互換宣言へ自動転記しない。
- root guidanceの大幅短縮はautomatic approval reviewに2回拒否されている。拒否理由は、重要な運用・安全ガイダンスの一括削除が「必要な差分だけ」「既存規則を保持」の承認範囲を越え、安全・role・counter境界を持続的に弱めるためである。この結果を隠さず、大幅短縮の再試行や同じ結果を得るworkaroundを行わない。
- 利用者は、必要な具体的矛盾をすべて局所修正できれば全面短縮は不要と明示承認した。既存境界を保つ小patchによるcanonical pointer追加、`CLAUDE.md`の古いpath一律禁止と固定`0.5.0`案内の局所修正はapproval reviewを通過済みであり、その安全な差分を開始入力として保持する。

## Phase A — source統合、migration、candidate validation

1. `docs/astra-instruction-audit-20260912.md`の15 seedと追加findingを現candidateへ再照合する。Sprint 058のfixed項目を維持し、5／7／9／10／14はHarness担当がfresh独立PASSしたcanonical最新版を参照して、必要な意味だけをroot `AGENTS.md`、`CLAUDE.md`、`docs/harness-guidance.md`および既存の正規参照面へ反映する。verification-infra分類、role所有、micro判定、必要正本の再読、root guidance所有を混ぜず、active基準やsafe harborを勝手に厳格化しない。
2. root `AGENTS.md`、`CLAUDE.md`、`docs/harness-guidance.md`は既存の運用、安全、role ownership、counter、model／effort、承認、Mac mini低並列規則を全文保持し、今回の実行を妨げる局所矛盾だけを最小差分で直す。canonical pointerは既存規則を削除・置換しない条件付き補足としてだけ追加できる。`<user-home>/workspace/agentic-harness`へのreadを含む一律接触禁止は、今回承認済みのowner連携とread-only canonical参照を許すscope／ownership境界へ局所適応する。未承認write、Git操作、別owner内容の取込みは禁止のまま維持する。
3. root guidanceと`.harness/config.toml`に既存変更がある場合は内容を分類し、利用者のmodel／effort、project固有制約、既存文面を保持する。固定されたHarness `0.5.0`等の古い案内、Secretaryが記録する互換baseline、read-onlyで観測したcanonical／実導入版を別field／別文脈として正直に表し、観測版を互換宣言へ自動昇格しない。canonicalとの差を全量置換で解消せず、今回必要な節だけを適応する。固定済みの履歴SHA／digest／provenanceとcurrent-content checksumを区別する。
4. Sprint 058のcurrent-first、resume、setup／read／接続診断、条件付きcontext、run-once、partial、Windows-safe root解決、17 Skills、Secretary Voice、Project Clarity、安全境界を現在sourceで成立させる。監査済み製品修正を別版の古いbytesへ戻さず、旧機能・安全assert・版固有identityを退行させない。
5. `0.13.1→0.13.2`はmanaged guidanceの内容変更を伴うmigrationとして扱い、空hopにしない。正式なworkspace registry／forward解決、edition guard、preview、別の明示確認、所有範囲限定apply、検証、local checkpoint、rollback／partial／retryの既存経路で配布する。利用者の自由記述、既存設定、他managed block、改行、file mode、unrelated dirty／staged／untracked、Secretを保持し、checkpointは今回変更した製品所有pathだけをpushなしで記録する。
6. current templateだけでなく、対応する公開済み旧tagの管理節asset／hash／markerを根拠に旧workspaceを分類する。known旧管理節だけを安全に更新し、customized／unknown／競合、stale plan、wrong root／edition／scope、backup不一致は副作用0で停止する。成功後rerunは差分・重複marker・追加checkpoint 0件とする。
7. Claude／Codex manifest、marketplace、`edition.json`、migration graph／assets／supported source、release inventory、正本・互換CHANGELOG、README／更新guide、archive metadataを実candidate versionと内容へ揃える。source-stageと公開後stateを混同せず、過去tag／Release／artifact／migration／fixture／評価記録を変更しない。
8. current-content inventory、handoff／overlay metadata、checkpointやmigrationのhashは、今回変更した実bytesに直接因果するcurrent fieldだけ更新する。accepted candidate、historical base、過去handoff、公開済みprovenanceを現在値で上書きしない。
9. 既存の成功証拠は依存bytesが変わらない面だけ引き継ぐ。変更したinstruction route、root guidance、managed migration、release／archive、inventory、checkpoint／rollbackを既存の比例した入口と現実的なfixtureで0 FAILにする。Generic PyYAML quick validationの依存不足は`INCOMPLETE`のまま別記し、Ruby／Psychの17 Skills型検査PASSをgeneric PASSへ読み替えない。
10. Windowsへ影響するmigration／path／改行面は、既存workflowと既存の対象jobをexact candidateで実行する。Windows nativeの結果、macOS実行、別OS文字列fixture、過去runを区別し、一つのPASSを別hostへ流用しない。無関係な全suite、全host matrix、新runner／collector／attestationは追加条件にしない。
11. candidate完全SHA／tree、開始状態、変更path分類、protected snapshot、回帰結果、Windows結果、Git-free archiveを固定し、対象branchへ通常pushする。fresh独立EvaluatorがPhase AをPASSする前にmain統合、tag、Releaseを行わない。

## Phase B — publication and post-publication verification

1. Phase A PASS済みの完全treeだけを、対象branchから通常Git手順でremote mainへ統合する。新しい`v0.13.2` tag、GitHub Release、通常配布artifactを作成し、既存公開物を変更しない。
2. Phase A担当とは別のfresh独立Evaluatorが、remote main、tag、Release metadata、ダウンロードした実Git-free artifactをread-onlyで照合する。candidate／tag／artifactの製品bytes、version、edition、17 Skills、root guidance、release integrity、代表instruction route、代表managed migration／checkpointを確認する。
3. Phase Bの実artifact PASS後、tag、Release URL、candidate／main／tag SHAとtree、asset digest、実行した検証と結果、Windowsの実測範囲、未検証・残件を版別に報告する。root guidanceについては、拒否された全面短縮の対象と理由、安全な局所代替で解消した具体的矛盾、今回依頼に実害がある未修正の有無を明示する。利用者がCodexまたはClaude Codeへ貼る次のAgentic用更新promptを1〜3文で添える。promptは「Agentic Secretaryを現在hostの正規手順で最新版へ更新」「既存設定とworkspaceの独自変更を保持」「成功後に実際に読み込まれたversionを確認」を含み、存在未確認のCLI commandを作らない。

## Acceptance Criteria

1. 15 seedと追加findingのcurrent dispositionが根拠付きで確定し、5／7／9／10／14はfresh独立PASS済みHarness canonicalの意味へ追随する。private my-vault／slides等の別owner項目は理由付きで非該当または後続のままである。
2. root guidanceは既存の安全・role・counter規則を削除せず、局所矛盾の修正と条件付きcanonical pointerだけで相互整合する。全面短縮を必須にせず、承認済みread-only owner参照を古い絶対path禁止が妨げず、未承認write／Git操作を許可へ広げない。Harness本体の新規複製、古い全量文書の上書き、互換baselineと実導入版の混同、未承認の設定変更、今回依頼に実害がある未修正矛盾が0件である。
3. Sprint 058の全受入意味、17 Skills、Project Clarity、Secretary Voice、安全・privacy・Secret・confirmation・rollback境界が維持され、変更面の現実的なinstruction scenarioが0 FAILである。
4. `0.13.1→0.13.2`は内容変更migrationであり、公開済み対応版から有限に到達できる。known旧管理節は更新でき、利用者編集と既存設定を保護し、preview／cancelはwrite 0、apply／rollback／partial retry／rerunが実状態に一致する。
5. manifest／marketplace／edition／migration／inventory／CHANGELOG／guide／archive metadataが採番したversionで一致し、過去の公開bytes・履歴・固定provenanceは不変である。
6. 変更面のMac回帰、必要なWindows native job、Git-free archive、release integrity、protected snapshotが0 FAILである。未実行hostとgeneric PyYAML `INCOMPLETE`をPASSへ数えない。
7. fresh独立EvaluatorがPhase AをPASSし、その完全treeだけが通常main、tag、Release、artifactへ進む。公開後は別fresh Evaluatorが実artifactをPASSするまで完了扱いにしない。
8. force push、reset、rebase、tag移動、既存asset上書き、履歴削除、公開範囲変更、private転記、installed cache直接編集、実利用者workspaceの一括更新は0件である。

## 検証スコープ（着手時に固定）

- 対象: Sprint 058の変更面、root guidanceの5／7／9／10／14、current distribution metadata、内容変更migration、workspace registry／edition guard／checkpoint、release／archive、直接因果するinventory／handoff。
- 証拠形式: remote preflight、開始HEAD、candidate／main／tagの完全SHA・tree、変更path分類、canonical参照元とPASS receipt、protected snapshot／digest、実command・exit・件数、Windows workflow／run／jobと環境、archive inventory／digest、Release URL／asset名／digest、代表更新prompt。
- 既存の小さいrelease／migration／instruction／checkpoint入口を優先する。無関係なClarity stress、全master、全host matrix、新collector、統一schema、追加attestationは要求しない。

## 運用制約

- heavy処理は共通lock `/private/tmp/astra-audit-heavy-20260912.lock` を取得した1系統だけで実行する。開始前にNode数を実測し40以下、実行中60超で直ちに中断する。他のheavy処理と同時実行せず、他projectのprocessへ触れない。
- 自分が起動したserver、browser、watcher、child processを終了時に残さない。既存lockを削除・横取りしない。

## Non-scope

- private my-vault版への反映、consulting slides、利用者全workspaceの一括migration、installed cacheの手編集。
- 新しいSecretary機能、Clarity再設計、Harness本体の開発、検証基盤の刷新、公開範囲変更。
- root guidanceの大幅削除・短縮、安全・role・counter規則の除去、approval review拒否と同じ結果を得る回避策。
- force push、reset、rebase、無断cleanup、tag移動、既存Release／artifact差替え、過去migration／安全assertの削除・緩和。

## 完了条件

Phase Aのfresh独立Evaluator PASS、許可済みの通常公開、別fresh独立Evaluatorによる実artifact PASSが揃い、Orchestratorがstateへ実SHA／tag／URL／digest／検証／残件を記録した場合だけ完了する。
