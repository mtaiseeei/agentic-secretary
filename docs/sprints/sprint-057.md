# Sprint 057 — 更新migration修正版 `0.13.1` の公開

- Type: standard
- Risk: high（migration、Windows native CI、remote main、tag、Release、artifactを扱う）
- Candidate version: `0.13.1`
- 開始candidate: `9d45e47dde6ef254f0ea44fff5300288b65afba5`
- 依存: `sprint-056-patch-001`／`sprint-056-patch-002` done、MacとWindowsの最終run `34506823738`で対象2 job SUCCESS
- 関連rubric: C1、C2、C3、C5、C6、C10、C12、C13、C15（既存thresholdを維持）

## ゴール

更新migrationの到達性、`0.10.1`中断session回復、Windows CRLF互換を修正済みのcandidateを、後方互換なpatch release `0.13.1`として公開する。公開前candidateと公開後のremote main／tag／Release／artifactを別々に独立評価し、公開済み`0.13.0`以前のbytesと履歴を保持する。

## 固定前提と許可

- remote latestは`v0.13.0`で、修正内容はPatch 001／002の不具合修正であるため次versionは`0.13.1`とする。
- 利用者は「よし、リリースして。yasashii版にも流し込んで。」と明示している。必要なcandidate commit、通常push、PR、mainへの通常統合、新しい`v0.13.1` tag／Release／artifactは許可済みであり、同じ許可を再質問しない。
- force push、tag移動、既存Release／artifactの上書き・削除、履歴削除は行わない。private版、installed plugin／cache、実利用者workspaceは対象外である。

## Phase A — source candidate validation

1. `9d45e47`の修正bytesを保持し、current version面を`0.13.1`へ揃える。`0.13.0→0.13.1`は内容差分のない有効なhopとし、workspace content write、`changedPaths`、内容適用件数を発生させない。
2. 更新元は既存の対応8版（`0.8.0`、`0.9.0`、`0.9.1`、`0.9.2`、`0.10.0`、`0.10.1`、`0.10.2`、`0.12.0`）と、現行利用者の`0.13.0`を含む。既存edge／asset／support宣言、same-versionの成功no-op、downgrade／改ざん拒否、旧target向けmigrationを削除・緩和しない。
3. manifest／marketplace、正本・互換CHANGELOG、release inventory、案内、archive内metadataを`0.13.1`で一致させる。version、hash、config、fixtureの更新は本releaseへ直接因果する箇所だけに限定し、既存case／assertを減らさない。
4. Macの比例した回帰として、focused migration `46 PASS以上／0 FAIL`、release `13 PASS以上／0 FAIL`、Sprint 032 `16 PASS以上／0 FAIL`、Sprint 038 Patch 003 `9 PASS以上／0 FAIL`、release integrity、既存の小さいGit-free archive gate、変更したinventory面を確認する。これらは既存最低件数であり、追加source／hopのassertに伴う増加を許す。`0.10.1` pending回復と`0.13.0`空hopを実fixtureで含める。
5. exact candidateを通常pushし、既存Windows workflowの対象update jobをNode 22／Python UTF-8 modeで実行する。上記migration／release／032／038の対象結果を記録し、Macや過去runをWindows PASSへ流用しない。
6. fresh独立Evaluatorがexact candidate SHA／tree、Mac／Windows結果、archiveを評価する。Phase A PASS前にmain統合、tag、Releaseを行わない。

## Phase B — publication and post-publication verification

1. Phase A PASS済みtreeだけをPR経由または同等の通常Git手順でremote mainへ統合し、新しい`v0.13.1` tag、Release、通常の配布artifactを作成する。
2. main／tag／Release／artifactのsourceと配布bytesを版別に固定し、途中失敗は公開状態を分けて報告する。
3. Phase A担当とは別のfresh独立Evaluatorが、remote main、tag、Release metadata、ダウンロードしたGit-free artifactをread-onlyで照合する。artifact上でrelease integrity、archive gate、migration／releaseの代表入口を実行し、公開sourceとcandidateの一致を確認する。

## Acceptance Criteria

1. `0.13.1`のcurrent manifest／marketplace／CHANGELOG／inventory／案内／archive metadataが一致し、`0.13.0`以前のtag、Release、artifact、migration、fixture、履歴が変更されていない。
2. 対応9版すべてから`0.13.1`へ有限に到達し、複数の有効edge候補があっても既存BFSの選択が決定的である。複数経路の存在自体は拒否理由にしない。`0.13.0→0.13.1`とsame-versionは成功no-opでcontent write 0を維持し、downgrade、unsupported、壊れたgraph、改行以外のasset改ざんは副作用0件で拒否される。
3. `0.10.1`中断sessionは新targetへの別planと別確認で回復でき、apply後の検証と開始前版へのrollbackが成立する。partial、backup不一致、HEAD／scope／edition不一致を成功扱いしない。
4. Macでmigration `46 PASS以上／0 FAIL`、release `13 PASS以上／0 FAIL`、Sprint 032 `16 PASS以上／0 FAIL`、Sprint 038 Patch 003 `9 PASS以上／0 FAIL`、release integrity、archive gate、変更inventoryが0 FAILである。追加source／hopのassertによるPASS件数増加は許す。
5. exact Phase A candidateに因果するWindows native update jobがNode 22で必須対象を0 FAILとする。別jobの結果は実結果どおり分離し、candidate非因果の失敗を対象jobのPASSへ混ぜず、candidate因果の失敗を無視しない。
6. fresh独立EvaluatorがPhase AをPASSし、その完全SHA／treeだけがremote main、`v0.13.1` tag、Release source、artifactへ使われる。force push、tag移動、既存asset上書き、履歴削除は0件である。
7. freshな公開後Evaluatorが実Release artifactを取得し、candidate／tagとの配布bytes一致、version、release integrity、archive gate、代表migrationをPASSするまで完了扱いにしない。
8. private／Yasashii source、installed cache、実workspace、実`.clarity/**`／`CLARITY.md`、利用者本文・記憶・自由設定への変更・操作は0件である。

## 検証スコープ（着手時に固定）

- 必須入口: `scripts/sprint-056-patch-001-migration-test.mjs`、`scripts/sprint-056-patch-001-release-test.mjs`、`scripts/sprint-032-update-gate-test.mjs`、`scripts/sprint-038-patch-003-conversation-migration-test.mjs`、`scripts/check-release-integrity.py`、既存archive gate、変更inventoryの既存入口。
- 証拠形式: candidate／main／tagの完全SHAとtree、変更path、実command／exit／件数、Windows workflow／run／job IDと環境、archiveのfile inventory／digest、Release URL／asset名／digest、source対応。
- 上記で十分とする。全Clarity stress、全master、全host matrix、新runner／collector／統一schema／attestationは追加条件にしない。既存CIが他jobを実行した場合は結果を隠さず、本Sprintとの因果を分けて記録する。

## Non-scope

- Patch 001／002の再設計、新しいupdate framework、検証基盤の刷新、無関係なClarity修正。
- private版、Yasashii版の差分適応・公開、Macへの導入、実利用者workspace migration、cache直接編集。
- force push、tag移動、既存Release／artifact差替え、過去migration／安全assertの削除・緩和。

## 完了条件

Phase Aのfresh独立Evaluator PASS、許可済みPhase B公開、別のfresh独立Evaluatorによる公開後artifact PASSが揃い、Orchestratorがstateへ版別の実結果を記録した場合だけ完了する。
