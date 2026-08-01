# Sprint 038 A option 独立評価

## 判定

- Sprint contract result: **PASS**
- Product findings: **0件**
- Verification-infra findings: **0件**
- Non-blocking verification observations: **1件**
- Escalation Recommendation: **none**
- 評価対象: `/private/tmp/s038-option-a.ZM0tNj/build-a`
- 固定candidate commit: `f433373ee92d00956627ed419557928aa3c3976a`
- 固定candidate tree: `d7fac121a5988a7c5bc87106b91d55776476e939`

A optionで対象にした2点は解消した。

1. historical isolation pathは、`/var`と`/private/var`の表記差を実体pathへ正規化し、固定bytesのSprint 017を33 PASS / 0 FAIL、Sprint 025を25 PASS / 0 FAILで実行できた。
2. historical classifierは、7桁表示値ではなく固定40桁full SHAの完全一致をinfra分類条件にした。同じ7桁prefixの別full SHA、欠落、短い値、長い値、大文字、呼出側申告だけ正しいcaseをすべて通常FAILへ落とした。

strict offline gateはexit 0で、固定historical commitの残る6 FAILを、6件すべてが完全一致するloopback `EPERM`である場合だけ`verification-infra`として分離した。current candidate、Git-free archive、3配布系統、private固有Notion mock、candidate identityはすべてgreenである。

## 増分再評価の範囲

前回candidate `/private/tmp/s038-final.Q5IrHD/build-e/agentic` とA candidateを`diff -qr`で比較した。`.git`とcandidate入力metadataを除く差分は次のverification codeだけだった。

- `scripts/fixtures/sprint-038/historical-classifier-cases.json`
- `scripts/fixtures/sprint-038/historical-classifier-runner.mjs`
- `scripts/fixtures/sprint-038/historical-path-alias-probe.mjs`
- `scripts/master-release-gate.mjs`
- `scripts/run-historical-regression.mjs`
- `scripts/sprint-038-historical-classifier-test.mjs`
- `scripts/sprint-038-historical-path-test.mjs`
- `scripts/sprint-038-regression.sh`

会話contract、migration、Notion、配布product codeに差分はない。代表4 fileのSHA-256も前回candidateとA candidateで同一だった。

- `plugins/secretary/rules/conversation-contract.md`
- `plugins/secretary/scripts/lib/conversation-contract.mjs`
- `plugins/secretary/scripts/lib/conversation-migration.mjs`
- `plugins/secretary/migrations/0.8.0-to-0.9.0.json`

したがって変更面であるpath正規化、full SHA classifier、strict offline gateを重点的に再実行し、変更のないproduct面は、今回の専用回帰・3配布系統・private mock・candidate digestがgreenであることを条件に前回の実操作証拠を引き継いだ。

## 独立実行結果

### 1. historical pathと固定bytes

```text
node scripts/sprint-038-historical-path-test.mjs
SPRINT038_HISTORICAL_PATH_PASS=3
SPRINT038_HISTORICAL_PATH_FAIL=0
exit 0
```

3 caseは、aliasで`import.meta.url`とargvが不一致になること、`realpathSync`後に一致すること、basenameが保持されることを確認した。実装ではrunner entrypoint、`tmpdir()`、生成したtemporary rootをcanonical absolute pathへそろえ、nested suiteにも`TMPDIR`／`TMP`／`TEMP`として同じrootを渡している。製品側のbroad path guard、symlink拒否、Secret検査は変更していない。

固定bytesの個別再実行:

```text
node scripts/run-historical-regression.mjs \
  337756f204eb5e709ddf39912df3ce1edfbec834 \
  sprint-017-regression.sh
PASS=33 FAIL=0
observedCommitFull=337756f204eb5e709ddf39912df3ce1edfbec834
exit 0
```

```text
node scripts/run-historical-regression.mjs \
  337756f204eb5e709ddf39912df3ce1edfbec834 \
  sprint-025-regression.sh
SPRINT025_PASS=25 SPRINT025_FAIL=0
0.6.0→0.7.0を読み取り専用で診断: PASS
exit 0
```

前回の`JSONDecodeError`とSprint 025診断FAILは再現しなかった。

### 2. full SHA classifier

```text
node scripts/sprint-038-historical-classifier-test.mjs
SPRINT038_HISTORICAL_CLASSIFIER_PASS=14
SPRINT038_HISTORICAL_CLASSIFIER_FAIL=0
exit 0
```

infraへ分離できるpositive caseは、実checkoutの40桁full SHA、exact EPERM 6件、other error 0件がすべて一致する場合だけだった。次のnegative caseはいずれもgate exit 1を確認した。

- 別actual commit
- 同じ7桁prefixだが別40桁full SHA
- 39桁、41桁、大文字、full SHA欠落
- exact EPERM 5件または7件
- exact EPERM 5件＋別error 1件
- event数は同じだが別error
- 呼出側の申告commitだけ正しいcase

fixtureがraw stderrへ同じEPERM文字列や途中PASS summaryを出しても、classifierはrunner最終行の構造化resultだけを使う。`HISTORICAL_REQUESTED_COMMIT*`等の呼出側値でinfra判定を偽装できない。

### 3. strict offline gate

```text
node scripts/master-release-gate.mjs \
  --mode offline \
  --root /private/tmp/s038-option-a.ZM0tNj/build-a/agentic \
  --json /private/tmp/s038-option-a-eval-offline.json

RELEASE_GATE mode=offline status=pass suites=18 required=18
current-passed=17 verification-infra=1 failed=0 skipped=0
assertions=681 pass=675 fail=0 infra-fail=6
LIVE_CONVERSATION_GATE status=incomplete separate=true
exit 0
```

historical suiteの実観測は次のとおりだった。

```text
observedCommitFull=337756f204eb5e709ddf39912df3ce1edfbec834
PASS=333 FAIL=6
parsedFailureEvents=6
exactLoopbackListenEPERM=6
otherError=0
runnerError=null
```

6件はすべて完全一致する`Error: listen EPERM: operation not permitted 127.0.0.1`で、`JSONDecodeError`、Sprint 025診断FAIL、他のproduct errorは0件だった。別error混在caseはclassifier matrixで通常FAIL／gate exit 1になるため、広いallowlistにはなっていない。

### 4. Git-free archive

```text
node scripts/master-release-gate.mjs \
  --mode archive \
  --root /private/tmp/s038-option-a.ZM0tNj/archive-a

RELEASE_GATE mode=archive status=pass suites=21 required=13 passed=13
verification-infra=0 failed=0
assertions=264 pass=264 fail=0
exit 0
```

`.git`なし、0.9.0 manifest、author／MIT／credit、release validator、CHANGELOG、migrationを含むrequired 13 suiteがすべてPASSした。

### 5. 3配布系統とprivate固有動作

| Candidate | Sprint 038 | Classifier | Path | Edition固有 |
|---|---:|---:|---:|---:|
| agentic | 64/0 | 14/0 | 3/0 | - |
| yasashii | 64/0 | 14/0 | 3/0 | overlay済みcandidate |
| private | 64/0 | 14/0 | 3/0 | private mock 9/0 |

private mockは、限定Notion 5点と通常契約の非回帰を確認した。

- 番号承認後の再確認なし起票とretry重複0件
- 明示保存依頼が質問なしに停止しない
- 将来行動はNotion TaskDB 1件、local TODO 0件
- Calendar＋vaultのread-only統合、write 0件、部分結果保持
- 不足一点だけを質問
- 通常のTaskDB／property／relation／計画提示、write後再読、外部状態不一致時の成功表示禁止

### 6. candidate identity

build A／B／Cの3回について、candidate付属digest scriptと、別実装のSHA-256再計算の両方で確認した。

| 項目 | A / B / C |
|---|---|
| commit | `f433373ee92d00956627ed419557928aa3c3976a` |
| tree | `d7fac121a5988a7c5bc87106b91d55776476e939` |
| agentic | 678 files / `5b19a88c4419d53ee1c9f19f681f590e66b126742bfb935ffbd3cb4613a5780f` |
| yasashii | 658 files / `47b804d00c0c75c072b50ad92489bde2a5bc20d639dde0f2ee997d452a451ef8` |
| private | 793 files / `bf0981c0a53e363acd4fddc130164566f862324e015742d21133b0c2db294a4d` |

Git-free archiveはagenticと同じ678 files／同じdigestだった。progress追記後のbuild CもA／Bと同一であり、artifact identityは固定されている。

## Rubric

| 項目 | Score | Threshold | 判定根拠 |
|---|---:|---:|---|
| C1 完成度 | 5/5 | 4 | 22 ACのうち外部publish後にしか実行できない21/22を明示的に未到達として分離し、release前の全条件を満たす。 |
| C2 構文・整合 | 5/5 | 5 | changed JSの`node --check`、JSON parse、manifest、candidate metadataがgreen。 |
| C3 機能の実証 | 5/5 | 4 | golden、migration、private mock、3配布系統、archiveを実行。 |
| C4 非エンジニア体験 | 4/5 | 4 | 内容依存の5 response stateを模擬会話で確認。live hostは別gateでincomplete。 |
| C5 安全・規律 | 5/5 | 5 | 確認境界、Secret、Git所有、重複防止、外部write 0件。 |
| C6 無回帰 | 5/5 | 5 | current 17 suite、3配布系統、固定historicalのproduct failureが0件。 |
| C7 やさしさ | 4/5 | 4 | edition差を保った短い内容依存応答。 |
| C8 wizard体験 | 4/5 | 4 | product差分なし。既存の導線回帰がgreen。 |
| C9 配布チャネル非依存 | 5/5 | 5 | 3配布系統とpublic／private境界が整合。 |
| C10 更新の安全性 | 5/5 | 5 | dry-run、conflict、atomic、rollback、冪等を保持。 |
| C11 Google Chat境界 | 5/5 | 5 | 対象回帰はgreen。6 loopback EPERMは厳密条件でverification-infra分離。 |
| C12 release履歴・現在candidate整合 | 5/5 | 5 | full SHA履歴実行、0.9.0、archive、3 build identityが一致。 |
| C13 edition分離・互換 | 5/5 | 5 | overlay、隔離private、repo-owned境界を確認。 |
| C14 Markdown可読性 | 5/5 | 5 | readabilityと5 response stateがgreen。 |
| C15 authorization・意味保存 | 5/5 | 5 | natural-language runner、snapshot、negative fixture、private routingがgreen。 |

hard thresholdはすべて満たす。

## Acceptance Criteria

| # | 結果 | 独立確認 |
|---:|---|---|
| 1 | PASS | 明示低リスク1回、提案／曖昧0件。 |
| 2 | PASS | destructive／externalは確認前0件。 |
| 3 | PASS | 5 response stateと0／1／partialが実副作用と一致。 |
| 4 | PASS | resume、決定0件、project候補、closed照合を回帰。 |
| 5 | PASS | 6意味要素と不要全文非保存。 |
| 6 | PASS | 全軸、snapshot、必須／禁止、negative fixtureを機械判定。 |
| 7 | PASS | 引用等の誤write 0件、取消境界を保持。 |
| 8 | PASS | 衝突assertだけをcurrent化し、安全assertを保持。 |
| 9 | PASS | 指定surface専用回帰とcurrent suiteが0 product FAIL。 |
| 10 | PASS | 順序、確認境界、retry重複0件。 |
| 11 | PASS | 共通caseを3候補、private固有routingを別評価。 |
| 12 | PASS | 限定5点、通常Notion契約、実downstream不変。 |
| 13 | PASS | overlay、repo-owned digest、private値逆流0。 |
| 14 | PASS | migration dry-run、conflict、atomic、rollback、冪等。 |
| 15 | PASS | current、fixed historical、archive、3配布系統がgate方針どおりgreen。 |
| 16 | PASS | 公開0.8.0と変更分類から0.9.0を一意解決。 |
| 17 | PASS | 0.7.0／0.8.0履歴をfull SHA固定で実行し、current 0.9.0と分離。 |
| 18 | PASS | build A／B／Cのcommit、tree、3 digest、archiveが一致。配布先は各edition metadataで別々に固定。 |
| 19 | PASS | 独立Evaluatorが同一candidateを実操作し、C2・C5・C6・C9〜C15を含む全閾値を満たした。 |
| 20 | PASS | Fable R1〜R9の反映先・採否記録を保持し、未処理必須指摘0件。 |
| 21 | READY / NOT EXECUTED | Evaluator PASS後のオーケストレーター確認点。publish前に3系統を別々に提示して承認を得る必要がある。 |
| 22 | NOT REACHED | publish許可なし。外部publishは0件で、実行後照合はまだ発生していない。 |

AC21／22はEvaluator PASS後の外部release phaseに属するため、未実行をproduct failureとはしない。無断publishを行わず、契約どおり次の確認点として残す。

## Release前にオーケストレーターが提示する3系統

1系統の許可や成功を他系統へ流用しない。

| 系統 | Version / candidate | Destination | Rollback | 再反映 |
|---|---|---|---|---|
| agentic public | `0.9.0` / agentic digest `5b19...780f` | `mtaiseeei/agentic-secretary` | 公開前SHAへ戻し、pluginとworkspaceを分けてrollback | 公開artifactのplugin refresh／reinstallを系統別確認 |
| private my-vault | `0.9.0` / private digest `bf09...94a4d` | `mtaiseeei/agentic-secretary-my-vault` | private公開前SHAへ戻し、private workspaceを別rollback | private plugin反映を別確認。`/Users/taisei/my-vault`利用者データは対象外 |
| yasashii public | `0.9.0` / yasashii digest `47b8...51ef8` | `mtaiseeei/yasashii-secretary` | yasashii公開前SHAへ戻し、pluginとworkspaceを分けてrollback | yasashii plugin refresh／reinstallを別確認 |

実公開前には省略SHAではなく、上記candidate identity節のfull digest、destination、後始末、許可対象をそのまま提示すること。

## Finding分類と残余リスク

### Blocking findings

- `product`: 0件
- `verification-infra`: 0件

### O1 — 評価開始前から残る古い一時directory

- Classification: `verification-infra`
- Severity: non-blocking observation
- Candidate impact: none

今回のhistorical runnerが作る`secretary-historical-regression-*`は終了後0件だった。別名の`/private/.../T/sprint025-history.QPp1Tx`が1件あるが、birth timeは`2026-07-31T19:58:10+0900`で今回の評価開始前に存在した古いartifactである。Evaluatorの書込み境界を守るため削除していない。A option runnerのcleanup failureではなく、candidate／downstream／vaultのいずれにも含まれない。

### Release後まで残る確認

- live conversation gateはoffline gateと分離されたまま`incomplete`。これはoffline PASSを実host会話PASSへ昇格していないことを示す。release判断時に実hostでの会話確認を追加すると、利用環境固有の不確実性をさらに下げられる。
- AC21／22は未実行。オーケストレーターが3系統別にversion、full digest、destination、rollback、再反映、後始末を提示して明示許可を得るまで、tag、push、release、marketplace更新、plugin reinstallを実行しない。

## 外部write・境界

- remote fetch／push、Notion、Calendar、OAuth、Repository Secret、Actions、tag、release、publish、plugin install／update／reinstallは0件。
- 実downstreamは評価終了時点でcleanだった。評価対象commandはすべて隔離candidateまたはOS一時directoryへ向けた。
  - `yasashii-secretary`: `e16758757371f2b9075273246c1ffe49df7e3133`
  - `agentic-secretary-my-vault`: `bb372d3d991dc17f0ee7c8fbdbb7ba038bd7665f`
  - `my-vault`: `e954f9c70b3345445bc7345bb276d9b703e36f7a`
- fixed build A／B／C、archive、実downstream、cache、vault、Gitは編集していない。
- changed JSは`node --check`、changed JSONはparse成功、`git diff --check`は0 error。

## Evaluator自己レビュー

- GeneratorのPASS申告をそのまま採用せず、path alias、full SHA、fixed historical、offline、archive、3配布系統、private mock、candidate digestを独立実行した。
- path修正を2件の旧FAILのallowlist追加として扱わず、同じ固定bytesをSprint 017 33/0、Sprint 025 25/0へ戻したことを確認した。
- infra分類を7桁prefixや呼出側申告に依存させず、40桁full SHA完全一致とexact EPERM 6件だけに限定した。
- current product errorをEPERMへ混ぜたnegative caseがgate exit 1になることを確認した。
- A option前後でproduct file bytesが同一であることと、A／B／Cのartifact identityが同一であることを別々に確認した。
- strict offline gateの`verification-infra=1`とlive gateの`incomplete`を隠していない。前者は契約どおり限定分離され、後者は別gateとして未昇格である。
- AC21／22を実行済みと誤認せず、Evaluator PASS後の明示確認／公開phaseとして残した。
- 実装、test、fixture、spec、contract、progress、state、candidate、downstream、cache、vault、Git、remoteは編集していない。書き込んだ正本は本feedbackだけである。
