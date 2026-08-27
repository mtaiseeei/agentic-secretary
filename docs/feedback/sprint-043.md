# Sprint 043 Evaluator Feedback

## 判定

**不合格 — `implementation-issue`**

- Generator candidate: `d29a549cb49894edf26b0f067d7caac93f5bec15`
- 評価開始HEAD: `345f8783bc438d3ea53fe17ac21aa80adf23e7bf`
- candidate親: `1bce187721ca2e932ceb9415565649f097e29843`
- 評価開始時worktree: clean
- Generator起動model／effort: host metadataを取得できないため**未検証**。commit名や自己申告から推定しない。

専用wrapperは29 PASS／0 FAIL／`XM-007`だけNOT-RUNと報告したが、独立temporary fixtureで承認済みtargetとは別のtargetへ同じapproval digestを流用できることを製品CLIと製品moduleの両方で再現した。previewが表示したtarget pathと承認が束縛されておらず、未承認pathへlocal `.xmind`を新規作成できる。このため`XV-003`、Acceptance Criteria 1／4／7、C1／C3／C5／C23／C24を不合格とする。

Critical findingは0件。新規findingはproduct Major 1件、verification-infra Minor 1件である。実Xmind MCP／App／CLI、実local fallback、実利用者path、network、credit、connector、push／release／cache／downstream writeは一切実行していない。

## スコア

| 観点 | 得点 | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | **FAIL** | 必須XV-003とAC 1／4／7が不成立 |
| C2 構文・整合 | 5/5 | 5 | PASS | Node構文、registry、参照path、release integrity、`git diff --check`が整合 |
| C3 機能の実証 | 3/5 | 4 | **FAIL** | 主要CLIは動作するが、独立approval-path assertionが失敗 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | 日本語preview、provider reason、次の選択は明確。承認対象のすり替えはC5／C23へ計上 |
| C5 安全・規律 | 4/5 | 5 | **FAIL** | 高リスクlocal writeの影響確認がtarget pathへ束縛されない |
| C6 無回帰 | 5/5 | 5 | PASS | 041／042、015／021／022、release integrityは0 FAIL。full masterの環境制約とSprint 019既知debtは分離 |
| C7 やさしさ | 4/5 | 4 | PASS | 既定OFF、fallback理由、未検証表示、選択権を維持 |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | State由来投影、proposal前後不変、承認時のみEvent 1、stale停止 |
| C20 Attention・Clarity UX | 5/5 | 4 | PASS | Attention Markdown、固定4象限、日本語label／意味文が成立 |
| C23 projection・Xmind | 3/5 | 4 | **FAIL** | 投影、resolver、visualは成立するが、target固有のpreview／confirmが欠け未承認local writeを許す |
| C24 Clarity安全・統合・public-first | 4/5 | 5 | **FAIL** | root外／symlinkは防ぐが、approval path変更を防げない。後続scope漏れは0 |

1つでも閾値未達ならSprint不合格のため、総合判定は変わらない。

## Target Case／registry

`bash scripts/sprint-043-regression.sh`自体はexit 0で、次を報告した。

- `SPRINT043_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`
- `SPRINT043_CASE_PASS=29 FAIL=0 NOT_RUN=1 TOTAL=30`
- `SPRINT043_REGRESSION_PASS=6 FAIL=0 CASES=30 EXTERNAL_LIVE_NOT_RUN=1`
- wrapper内Sprint 042: 35/35、registry差分0
- wrapper内Sprint 041: 43/43、registry差分0

ただしEvaluatorの独立反証を優先し、最終case判定は次のとおりとする。

| Case群 | PASS | FAIL | conditional NOT-RUN | 判定補足 |
|---|---:|---:|---:|---|
| MM-001〜010 | 10 | 0 | 0 | Markdown／Mermaid raw、座標、jitter、fallback、retryを確認 |
| XM-001〜015 | 14 | 0 | 1 | `XM-007`だけreal external-live未承認 |
| IM-005 | 1 | 0 | 0 | local archive retry byte同一 |
| XV-001〜004 | 3 | 1 | 0 | `XV-003`はapproval target非束縛でFAIL |
| 合計 | **28** | **1** | **1** | registry 30 ID、未実行AC 0 |

`XM-007`は実Xmind MCPのconnected create／read／update external-liveだけを対象とする。ユーザー承認、実接続、network／credit許可がなく、実行すると禁止された外部副作用になるためconditional NOT-RUNは妥当である。isolated fakeはcreate／read／update contractだけを検査し、全結果を`verified: false`のまま保持したため、real external-live PASSへ代用していない。

## F-01 再現証拠

**Major / product — approval digestがtarget pathを束縛せず、未承認pathへlocal `.xmind`を書ける**

独立script `node /private/tmp/s043-race-evaluator.mjs`をOS temp fixtureで実行した。processは検査結果JSONを返してexit 0、JSON内の`status`は期待どおり`FAIL`となった。

1. `.clarity/maps/approved-a.xmind`をpreviewし、approval digestを取得。
2. 同じdigestを使い、製品CLIへ別target `.clarity/maps/cli-unapproved-b.xmind --apply`を渡した。
3. CLIは`local-selected-after-approval`、`changed: true`を返した。
4. 承認対象Aは存在せず、未承認対象Bが作成された。

観測値:

- `cliTargetBindingSafe=false`
- `cliApprovedTarget=.clarity/maps/cli-approved-a.xmind`
- `cliActualWrittenTarget=.clarity/maps/cli-unapproved-b.xmind`
- `cliSwappedWriteStatus=local-selected-after-approval`
- `cliApprovalDigestA=34493672e91f700d67594828d0a5bb38d8ad4f698fac228ab3d110d701c4fecf`
- 製品module経路もA未作成、B作成、B SHA-256=`34493672e91f700d67594828d0a5bb38d8ad4f698fac228ab3d110d701c4fecf`

approval digestがarchive bytesだけから計算され、target、operation、既存targetの状態を含まないため、同一内容になる新規target間で再利用できる。root内に限定され、既存の異なるarchiveをこの手順で任意上書きできることまでは確認していないため、CriticalではなくMajorとする。一方、previewで示したpath以外への新規writeは明示承認後だけ書く契約を破るため、Sprint blockerである。

期待する修正は、approval token／digestを少なくとも正規化済みroot相対target、create／update operation、archive digest、既存target fingerprintへ束縛し、write直前に同じ情報を再検査すること。同じState・同じbytesでもtargetが変わればstaleとしてwrite 0にする必要がある。

## V-01 回帰検査の不足

**Minor / verification-infra — XV-003が同一targetの承認だけを検査し、target差し替えを見逃す**

`scripts/sprint-043-test.mjs`のXV-003は、`map.xmind`をpreviewし、同じ`map.xmind`へreject／approvedを適用する。root外、symlink、approval target差し替え、write直前raceをcase内で攻めていないため、F-01が存在しても29 PASS／0 FAILと報告する。F-01修正時に、CLIを使ったA preview→B apply、A preview→A symlink差し替え、既存A content変更→old digest applyを回帰へ追加すること。

## 独立fixtureによる製品操作

### Project preview／apply／retry

`node /private/tmp/s043-evaluator.mjs`を独立OS temp fixtureで実行しexit 0。fixture `/var/folders/k1/582ptqfx73l_t0glc9q1hck40000gn/T/s043-independent-G4rRJb`は終了時に削除した。

- `project <root> --json`: `status=preview`、canonical State／Event digest不変、projection write 0。
- `project <root> --apply --json`: 7 fileを生成。
- retry: `changed=false`、7 fileのbyte／hash、`stateDigest=4e405b4064c11fb9dfec6a465d7ffa4b9457c712d35e989bab9cfcbc1913a75b`が同一。
- 生成物は`.clarity/projections/`配下であり、canonical Stateではなくprojectionであることを出力pathとSkillで明記。

| file | SHA-256 |
|---|---|
| `overview.md` | `f732283838667702595fefa070541990d35d9e941aeac854a2da914428256cbf` |
| `attention.md` | `e5d8acaadfc0f76ecba49f0caa8e52c189f32011ae536e1bf2d6cf96aae03e31` |
| `matrix.md` | `13715e828448515fee75be2d0af434fe45e40a33d793962b73406f006af5ce8e` |
| `quadrant.mmd` | `f6e22d10ab7a6774a5de190ec1bff751ba0e97be7842ec715e97391a0cd87a14` |
| `structure.mmd` | `3b89d3741d3e90eba6adbaa4af71434b0b2a1709ba8c03e587e7d56b4a5f5618` |
| `dependencies.mmd` | `2809dc5daabec0418799785337d619d734f5eeba3bd8de1151e5dcdc080f156e` |
| `state-flow.mmd` | `1f949a32b57af1e090373c2e46d56b1a6d5bd8f8a95d981bf64177e428f17841` |

Item ID由来のstable coordinate／jitterは全Itemが0〜100内で重複なし、retry同一。日本語の`<`／`>`等は除去され、mindmap failureでは`structure.mmd`だけ`flowchart TD`へfallbackし、Markdownと他raw `.mmd`を保持した。

### Mermaid fixed visual

raw `quadrant.mmd`とlocal Xmind内容、fake MCP requestで次をexact確認した。

| 位置 | Mermaid quadrant | emoji／label | 意味文 | 色 |
|---|---|---|---|---|
| 左上 | q2 | 🟢 定着・検証 | 安定している | `#16A34A` |
| 右上 | q1 | 🔵 実行待ち | あとは進めるだけ | `#2563EB` |
| 左下 | q3 | 🟡 暫定実装・要再確認 | 注意して確認する | `#D97706` |
| 右下 | q4 | 🔴 設計・意思決定 | 人間の判断が必要 | `#DC2626` |

上軸「決まっている」、下軸「まだ決まっていない」を確認し、全象限で色だけでなくemoji、label、意味文を保持した。local環境に`mmdc`、`xmind`、repo内Mermaid renderer dependencyは存在しなかった。install／networkは禁止のためrendererを追加せず、raw syntax／style／文字情報とfailure fallbackのsafe harborで評価した。`renderer.available=false`、`renderer.verified=false`を維持し、render screenshotは取得していない。実Xmind App／CLIのopenabilityも未検証である。

### Settings／provider／fake MCP

- public default OFF、明示ON、再OFFを製品CLIで確認。
- settings値とcapability表示は分離。
- ON＋connected＋create／read／update／stylePlacement capable MCPは、`--provider local`かつlocal approval済み指定でもpriority 1の`xmind-mcp`を選択。
- disabled、capability不足、provider failureは選択せず、具体的reason付き`fallback-approval-required`。
- fake MCP transportはcontract `agentic-secretary.xmind.v1`でcreate／read／updateを各1回。requestへ2必須Sheetとfixed visualを含み、response境界も保持。3結果すべて`verified=false`。

### Local XMind Zen archive

temp fixture内でのみ明示approvalを模擬した。実利用者の承認、実fallbackの実行とは扱っていない。

- previewはtarget、create／update、既存影響、refresh注意、`authExpected=false`、`creditExpected=false`、approval requiredとdigestを表示。
- preview／reject／cancel／unanswered／missing digest／stale digestはwrite 0。
- 正しい同一target approval後だけcreate／updateし、2 managed Sheet `clarity-matrix-sheet`／`clarity-structure-sheet`、stable Item ID、座標、色、意味文を内部読戻し。
- 独立archiveは6457 bytes、SHA-256=`7ff6536dda493760658ea4706ea9713c5ac697fb1bc69538363b40a5ddeb44a8`。validatorは`structurallyValid=true`だが`verified=false`、`openability=not-verified-with-xmind-app`。
- unknown `custom.bin` SHA-256=`ff5d8507b6a72bee2debce2c0054798deaccdc5d8a1b945b6280ce8aa9cba52e`、metadata／manifest unknown field、無関係Sheet、root branch、deep branchを完全保持。
- retryは`changed=false`、archive byte同一。
- `../escape` entry、data descriptor形式、root外targetは拒否。
- preview後にtargetをoutside fileへのsymlinkへ差し替えるraceは停止し、outside sentinel SHA-256=`7cae66c5286a9f8160cfc772e38084d4c4145a7ff438182e544bda721cd77182`で不変。

内部validatorの成功を実Appで開ける証明へ昇格していない。

### Xmind edit proposal

- proposal作成前後: canonical State bytes不変、Event増加0。
- reject／cancel／unanswered: State bytes不変、Event増加0。
- approved: Eventだけ1件増加し、対応Stateが更新。
- 同じ古いproposalの再適用: `xmind-proposal-stale`で停止。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---|---|---|
| 1. Target 30 case、許可依存だけNOT-RUN、AC未実行0 | **FAIL** | 未実行0とXM-007理由は成立するがXV-003がFAIL |
| 2. 同じStateから安定projection、projection明示 | PASS | 7 file、State digest、retry hash同一 |
| 3. default OFF、ON／再OFF、provider分離、MCP first | PASS | CLI／resolver全fixtureで成立 |
| 4. fallback preview、承認後だけcreate/update | **FAIL** | 表示targetとは別pathへapproval digestを流用できる |
| 5. 2 Sheet、stable ID、固定visual、既存map保持 | PASS | fake MCP contractとlocal archive読戻しで成立 |
| 6. Xmind editはproposal、承認時だけEvent | PASS | 前後State／Event count、stale停止を確認 |
| 7. 無断cloud/local/network/credit/external write 0 | **FAIL** | 外部副作用は0だが、未承認local target Bへfixture writeを許す |
| 8. retry byte同一、Event重複0 | PASS | projection／archive／proposal retryで成立 |

Acceptance Criteriaの**未実行は0件**。FAILは未実行ではなく、実行して反証した結果である。

## 回帰、release、既知debt

| command | exit／結果 |
|---|---|
| `bash scripts/sprint-043-regression.sh` | exit 0、wrapper 6/6、公式case 29/0/1。ただしV-01によりEvaluator判定を上書き |
| `bash scripts/sprint-015-regression.sh` | exit 0、68/68 |
| `node scripts/sprint-021-git-safety-test.mjs` | exit 0、71/71 |
| `node scripts/sprint-022-safety-test.mjs` | exit 0、69/69 |
| `python3 scripts/check-release-integrity.py` | exit 0、manifest／CHANGELOG整合PASS |
| `node --check`（Clarity core／projection／CLI） | exit 0 |
| `git diff --check 1bce187..d29a549` | exit 0 |
| `bash scripts/agentic-regression.sh` | exit 1、release integrity後にsandboxの`listen EPERM 127.0.0.1`で停止 |

full masterはloopback bind禁止によるverification environment制約で完走せず、PASS扱いしない。許可外のsandbox昇格は行っていない。Sprint 019既知debtは今回のmasterでは到達前に停止したが、README blobはcandidate／親とも`c714beeaa71d9d99be0b14af4c2fb8b4329ef68c`、Sprint 019 test blobも双方`817e502ed3541691837e39d61d1b4ca3e64eb6eb`で同一である。既存P-01（People API限界のREADME説明不足）とV-02（単一conjunction assert）はOPENのまま、本SprintのF-01／V-01と混ぜず、full master greenとも記録しない。

## Scope非混入

`1bce187..d29a549`の変更はSprint 043 progress、Clarity CLI／core／projection、Clarity Skill、Sprint 043 fixture／test／wrapper、master wrapperだけである。Hook、Secretary router、projects、daily、weekly、memory-care、notion-tasks、link／sync、実Drift comparator、Portfolio、packaging／handoff、manifest、README、CHANGELOG、edition／downstreamの先行変更は**0件**。core変更は既存象限metadataへの固定visual追加とstatus name追加だけで、後続機能の実行入口ではない。

## Generatorへの指示

1. local approval digest／tokenを正規化済みtarget pathとoperationへ束縛する。既存target更新では、preview時の既存file fingerprintも含める。
2. write直前にroot、symlink、target、operation、既存fingerprint、生成archive digestを再計算し、1つでも変われば`fallback-approval-required`／staleとしてwrite 0にする。
3. 製品CLIで「Aをpreview→digest AでBへapply」がwrite 0になる回帰をXV-003へ追加する。同時にAのsymlink差し替え、既存Aのcontent変更、missing／stale digest、retry byte同一を維持する。
4. 成立済みのMCP-first resolver、fixed visual、unknown archive保持、proposal境界、041／042直接回帰、禁止されたexternal操作0を変えない。

## Evaluator自己レビュー

- Generator自己評価を判定へ流用せず、製品CLIとexported product moduleを独立temp fixtureで操作した: yes
- 30 IDをexact registryと照合し、missing／duplicate／extra 0、AC未実行0を確認した: yes
- 専用suiteのPASSへ反例がある場合、独立観測を優先した: yes
- Mermaidのexact位置／4色／emoji／label／意味文／上下軸を確認した: yes
- renderer／実Xmind openabilityを未検証のまま保持した: yes
- fake MCPをreal external-live PASSへ代用していない: yes
- preview／reject／cancel／unanswered／missing／stale digest、正しいapproval、path変更、root外、symlink、archive edgeを分けて攻めた: yes
- findingをproduct／verification-infraへ分類した: yes
- full masterのloopback制約とSprint 019既知debtをgreenへ昇格していない: yes
- external Xmind、network、credit、connector、実利用者path、push／release／cache／downstream writeを行っていない: yes
- Evaluator所有外のcode／test／spec／state／progressを変更していない: yes
