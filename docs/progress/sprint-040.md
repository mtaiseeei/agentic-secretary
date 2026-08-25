# Sprint 040 Progress — 会話の記憶authorizationと内容冪等性

## 実装結果

- 明示された低リスクの記憶依頼は、保存先や要約の再確認を挟まず同じturnで1回実行する。秘書側からのdecision／topic保存提案だけは、従来どおり確認を待つ。`memory-care`、`secretary`、`settings`、`daily`、`projects`、生成用AGENTS／CLAUDE、copy contractを同じ区別へ揃えた。
- 会話classifierで依頼自体の曖昧さ（request hedge）と、伝聞・推量・訂正など内容側の属性（content hedge）を分離した。引用された依頼語、現在依頼でない仮定、取消、過去照会はwrite 0を維持する。明示保存された伝聞・推量・訂正は`source`、`certainty`、`correctionOf`、`correctionReason`を意味tupleへ保持する。
- pending memoryは同じ会話anchorに1件だけ保持する。別話題では失効し、`はい、ただしX`はXを反映して同じturnで実行する。
- decision／topic／journal／checkpointを内容由来keyで冪等にした。つまり、別turnや別の表示文で同じ意味を再試行しても、memoryとjournalを増やさない。topic訂正は旧eventを残し、訂正eventをappend-onlyで追加する。
- memoryとjournalが成功しcheckpoint commitだけが失敗した場合は`partial`を返す。retryは既存内容を検出してcommitだけを実行し、再retryは変更0・追加commit 0となる。既存の所有path限定commit、既存stage保持、Secret scan、rollbackを共通Git境界のまま使用する。
- Sprint 038 golden／runnerとSprint 010の旧肯定assertを現契約へ更新した。固定されたhistorical classifier/path fixtureは変更していない。削除、external、一括処理、Git、Secretの安全境界は残した。
- 17 surfaceのtracked inventoryと3版別の宣言的handoffを追加した。存在だけでなくSHA-256、必須marker、旧marker／旧文言の不在を検査し、settings／daily／projectsも含める。Yasashii／private実repoはread-onlyで照合し、編集していない。

## 実行結果

| Command | 結果 |
|---|---|
| `bash scripts/sprint-040-regression.sh` | wrapper `PASS=7 FAIL=0`。Sprint 040 9/9、inventory 6/6、Sprint 038 67/67、historical classifier 14/14、historical path 3/3、Sprint 010 56/56、safe Git／Secret 71/71、report schema 1/1、release integrity PASS |
| `node scripts/sprint-038-patch-002-windows-test.mjs` | Darwin上の空白・日本語path互換回帰 `PASS=12 FAIL=0` |
| `bash scripts/sprint-039-patch-002-regression.sh` | Sprint 039近傍回帰 wrapper `PASS=6 FAIL=0`。Patch002 23/23、Patch001 16/16、Sprint039 69/69、安全境界71/71、formal Codex 4/4、schema／release integrity PASS |
| stage済み同一bytesのGit-free directoryで`bash scripts/sprint-040-regression.sh` | wrapper `PASS=7 FAIL=0`、3版inventory `PASS=6 FAIL=0`、candidate ID一致 |
| `git diff --check`／変更したNode.js entrypointの`node --check` | PASS |

開始HEADは`5b48b7ba0784aa9b9d6552aed5162fafbc831c99`。今回実行した原因範囲・安全境界のsuiteにFAILはない。開始HEAD由来の非因果な既知FAILを今回の製品FAILへ混ぜていない。

## 具体的な評価シナリオ

1. 「たぶん覚えておいて」と、依頼は明示だが内容が推量／伝聞／訂正である依頼を分け、前者は不足一点を質問し、後者は同じturnで1回保存する。
2. 依頼語の引用、現在依頼でない仮定、保存取消、過去の保存有無照会がwrite 0であることを確認する。
3. pending 1件へ「はい」、別話題、「はい、ただしX」を返し、順に1回実行、失効、修正版1回実行となることを確認する。
4. 同じdecisionを別turn・別表示で再試行し、memory／journal／commitが0件増加であることを確認する。情報源や確実性が異なる内容は誤dedupeしない。
5. topic訂正で旧eventが残り、訂正eventだけが増えること、同じ訂正retryが0件であることを確認する。
6. checkpoint commitを故意に失敗させ、`partial`後のretryがcommit-only、再retryが0件で、開始前の無関係stageがbyte単位で残ることを確認する。
7. path traversalとSecretを保存前に拒否し、削除／external／一括確認とGit保護の既存回帰がPASSすることを確認する。
8. 3版それぞれでinventory対象16 surfaceのdigest、必須marker、旧marker不在、下流固有保護path digestを照合する。

## Candidate／3版handoff

- 公開版: `agentic` candidate `7b82cbe616cf304877e4b0acdeeebd9ff1476dcfd7c59f11a000d489d6aedd31`
- Yasashii handoff: `72b48383ad821907a48862a35ea6a42438363768a2808ce9d6caa60f5a383cd2`、固定base `3c472dd9a2b5299f27741ae2c418094486b7d035`
- private my-vault handoff: `04a5d68946db83351f85d2e6a8b91ef1ea4d40059b594c2093f62ecaa06c495a`、固定base `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`
- 識別正本は`plugins/secretary/conversation-core-inventory.json`と`scripts/fixtures/sprint-040/downstream-handoff.json`。各candidate IDはedition、固定base、共通surface digest、保護path digestから算出する。
- 下流2repoへの実適用は行わない。公開版PASS後、各repo固有Harnessがこのmanifestを入力として保護pathを維持しながら適用・独立評価する。

## 起動・評価handoff

- UI／対象URL: N/A。Skill、Node.js library／CLI、回帰fixtureの変更であり、起動する画面はない。
- 専用回帰入口: `bash scripts/sprint-040-regression.sh`
- 製品caseだけ: `node scripts/sprint-040-test.mjs`
- 3版inventory: `node scripts/sprint-040-inventory-test.mjs [--root <candidate-root>]`
- Evaluatorは同一commitのclean checkoutとGit-free archiveで専用wrapperを実行し、上記8 scenario、候補ID、下流実repoのHEAD／status／保護digest不変を独立に確認する。

## Known issues／not-run

- Yasashii／private実repoへの適用、実利用者workspace、installed cache、marketplace、new session、push、tag、release、workspace migration、external serviceへのwriteはnot-run／0件。これは`source-candidate-offline-only`であり、配布済み・同期済み・受入済みとは表示しない。
- Windows native実行はnot-run。Node-native境界の近傍回帰をDarwin上の空白・日本語pathで実行したが、Windows native PASSとは扱わない。
- whole transcript保存、exact copy、永続operation-ID ledger、統一attestation／collectorは追加していない。内容keyは実データから再計算し、隠しmarkerと既存ファイル走査だけで再試行を判定する。
