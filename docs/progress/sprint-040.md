# Sprint 040 Progress — 会話の記憶authorizationと内容冪等性

## Retry 2 実装結果

- P-01-R1: `explicitMemoryRequest`だけでなく、旧互換の`explicit:true + operation:"save-memory"`も同じmemory-scope gateへ通す。`scopeChange` flagだけには依存せずdestination allowlistで判定し、TODO／Notion TaskDB／projectは`question`、side effect 0、`memory`／`decision`／`topic`は内部routeとして`saved`、side effect 1となる。
- P-02: `save-memory`は空tuple、必須`target`不足、memory外destination、表示本文からtargetを読み取れない不整合を保存前に拒否する。意味tuple全体を`memory-meaning-v1`のbase64url JSON markerとしてmemory正本とjournalへ残し、`source=田中`、`certainty=hearsay`、`target=開始は9月`を機械的に復元できるようにした。表記揺れは同じ意味としてdedupeし、source／certainty等が違う内容は別件のまま保持する。whole transcriptやexact copyは要求しない。
- V-02: candidate report生成時のedition filterを撤去し、各edition rootで宣言inventoryの17 unique surfaceをすべて保持する。各entryの本文、candidate digest、entry固有marker宣言、禁止marker／phrase、tracked性を17/17で検査し、版への適用可否は`appliesToEdition`として保持する。global marker 3種の存在集計はentry固有marker検査と分離した。
- P-03/V-01: 固定HEADを`git archive`で隔離したGit-free candidateへ、宣言した共通pathと版固有適応を実際に適用するbuilderを維持した。Yasashii/privateの実repoはread-onlyのまま、各candidate rootの版固有fixtureとmaster相当offline suiteを独立実行する。
- private版では公開`memory-tools.mjs`が必要とする`secretary-store.mjs`、`markdown-lines.mjs`、`safe-fs.mjs`とNode入口`memory-tools.sh`を共通pathとして適用した。Sprint 038のschema 2 fixtureだけを版固有testへ限定適応し、private固有CHANGELOG、Notion／vault routing、root docsは置き換えていない。
- 初回PASS済みのrequest/content hedge、pending 1件、訂正append-only、checkpoint `partial`→commit-only retry、削除／external／bulk／Secret／Git境界は維持した。

## 実行結果

| Command | 結果 |
|---|---|
| `node scripts/sprint-040-test.mjs` | 専用回帰 `PASS=13 FAIL=0`。旧互換explicitのmemory外3件を`question / 0`、内部3件を`saved / 1`に固定し、Retry 1までのmeaning／pending／dedupe／partial／安全負例も維持 |
| `bash scripts/sprint-040-regression.sh` | `3_EDITIONS PASS / FAIL=0`。build 3/3、inventory 7/7、各editionのinventory entry 17/17。各版でSprint 040 13/13、Sprint 038 67/67、historical classifier 14/14、historical path 3/3、Sprint 010 56/56、安全境界71/71を実行。Yasashii/privateは版専用fixtureも3/3、private相当9/9 |
| `node scripts/sprint-038-patch-002-windows-test.mjs` | Darwin上の空白・日本語path互換回帰 `PASS=12 FAIL=0` |
| `bash scripts/sprint-039-patch-002-regression.sh` | 近傍回帰 wrapper `PASS=6 FAIL=0`。Patch002 23/23、Patch001 16/16、Sprint039 69/69を含む |
| Git-free candidate群への`node scripts/sprint-040-inventory-test.mjs --candidate-report <candidate-report.json>` | `PASS=7 FAIL=0`。Agentic／Yasashii／privateの各rootで17/17 entryの本文、digest、entry marker、tracked性を検査。candidate reportは相対rootだけを持ち、実workspaceのabsolute pathを証明入力に使わない |
| 変更したNode.js entrypointの`node --check`／`git diff --check` | PASS |

Retry 2開始HEADは`ccd9b262cd7c42198968a003e353d9b551618493`。candidateの元となる公開Sprint固定baseは`5b48b7ba0784aa9b9d6552aed5162fafbc831c99`。

## Candidate／3版handoff

- 公開版 `agentic`: `602083b2f0102c775114fa0383cfc6d448827ac3bbbaf7ea4ad8c8d32c00017b`（624 files）
- Yasashii: `485d8f38d47ac938e960f1fe1c9dc46698693ecfb86a004617d0c216f4076ffe`（601 files）、固定base `3c472dd9a2b5299f27741ae2c418094486b7d035`
- private my-vault: `e7a0780797a45f0f41c5237fd23306327dc1cf028038ae07ad18a3cfd527bbae`（711 files）、固定base `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`
- IDは各candidateのsorted relative path、mode、実bytesから算出した。下流旧sourceでは必須markerがすべて0、candidate適用後だけmarkerが現れることをinventoryで確認した。
- candidateはすべて`.git`なし。配布状態は`source-candidate-offline-only`で、実repo、push、tag、release、cache、workspace、external serviceへは反映していない。

## 下流read-only不変確認

- Yasashiiは開始・終了ともHEAD `3c472dd9a2b5299f27741ae2c418094486b7d035`、status clean。README `35361391...`、AGENTS `dd4343eb...`、spec `694c582a...`、edition `663c14cc...`、Yasashii style `50c9df0f...`が不変。
- privateは開始・終了ともHEAD `8e0796c9aba49d9a3dccb020912b0e1cf3989abf`、status clean。README `08046efc...`、AGENTS `dd4343eb...`、spec `58755995...`、edition `29d70da3...`、Notion `8c40b200...`、vault-search `54d0e709...`が不変。
- candidate側でも同じprotected digestを検査した。private固有copy／Notion／vault／root docsは固定base bytesを保持する。

## 具体的な評価シナリオ

1. 旧互換`explicit:true + operation:"save-memory" + scopeChange:true`でTODO／Notion TaskDB／projectを指定すると質問で止まり、writeが0件であること。
2. 同じ旧互換表現をmemory／decision／topic内で振り分ける場合は追加確認せず1回だけ保存すること。
3. `source=田中`、`certainty=hearsay`、表示「開始は9月」を保存し、正本から意味tupleを復元できること。
4. 空tuple A/B、target不足、targetと表示の不整合、memory外destinationを保存前に拒否し、異なる表示を空tupleで誤dedupeしないこと。
5. 同じ意味の表記揺れは0件、source／certainty等が違う内容は別件となること。
6. checkpoint失敗後は`partial`、retryはcommit-only、再retryは変更0・追加commit 0であること。
7. 固定baseの各版候補で17/17 surfaceの本文、entry digest、entry marker、tracked性、protected bytes、版固有copy／routing、Sprint 038/010、安全境界がPASSすること。

## 起動・評価handoff

- UI／対象URL: N/A。Skill、Node.js library／CLI、回帰fixtureの変更であり、起動する画面はない。
- 専用回帰入口: `bash scripts/sprint-040-regression.sh`
- 製品caseだけ: `node scripts/sprint-040-test.mjs`
- candidate構築: `node scripts/sprint-040-candidate-build.mjs --output <new-dir> --yasashii-source <read-only-source> --private-source <read-only-source>`
- inventory: `node scripts/sprint-040-inventory-test.mjs --candidate-report <candidate-report.json>`
- Evaluatorは同一commitのclean checkoutでwrapperを再実行し、上記7 scenario、candidate ID、実下流HEAD／status／protected digest不変を独立確認する。

## Known issues／not-run

- Yasashii／private実repoへの適用、実利用者workspace、installed cache、marketplace、new session、push、tag、release、workspace migration、external serviceへのwriteはnot-run／0件。配布済み・同期済み・受入済みとは表示しない。
- Windows native実行はnot-run。Darwin上のNode-native境界回帰12/12をWindows native PASSとは扱わない。
- whole transcript、exact copy、永続operation-ID ledger、統一attestation／collectorは追加していない。
