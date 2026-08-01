# Sprint 038 — 人間らしい会話フローと3配布系統の意味整合

**ステータス:** Retry 2 Generator実装完了・独立Evaluator再評価待ち

## Retry 2 の修正範囲

Retry 1 Evaluatorが記録した製品finding P1〜P3だけを修正した。Planner正本、Sprint契約、
rubric、feedback、`docs/sprints/state.md`は変更していない。V1のloopback `listen EPERM`と
V2のmacOS `/var`・`/private/var`表記差はverification-infraとして分離し、製品のnetwork境界や
path guardを緩めていない。

## P1 — 非競合回帰、履歴/current分離、wizard byte契約

### release gate inventory

`scripts/master-release-gate.mjs`へ、開始HEADで保持していた非競合suiteと長期master suiteを戻した。
current 0.9候補は次を個別に実行する。

- Sprint 010 timeline、011 settings、012 weekly
- Sprint 015 projects
- Sprint 020 Patch 002 Cloud preparation
- Sprint 021 Secret検査・Git所有範囲
- Sprint 022 path guard・symlink・有限時間処理
- Sprint 027 README/current copy・wizard accessibility
- Sprint 029 rule graph・wizard digest
- Sprint 030 edition guard
- Sprint 031 canonical plugin path
- Sprint 032 current release preparation
- Sprint 032 Patch 001 readability、Patch 002 conversation safety
- Sprint 038、report schema、current release integrity

長期`regression-check.sh`は削除・書換えせず、固定した最後のyasashii履歴commit `337756f`を
`scripts/run-historical-regression.mjs`で一時ローカルcloneし、そのcommit自身のsuiteとして実行する。
これにより旧edition名、旧README、旧固定3項目をcurrent 0.9要件へ誤適用せず、当時の安全assertを
byteのまま保持する。履歴runnerは外部fetchをせず、実downstreamも変更しない。

固定履歴masterの結果は331 PASS。sandboxのloopback制限だけが次の8件を発生させた。

- Sprint 013: 1件
- Sprint 014: 1件
- Sprint 019: 1件
- Sprint 020 Patch 001: 2件
- Sprint 023: 3件

8件はすべて`Error: listen EPERM: operation not permitted 127.0.0.1`であり、V1と一致する。
gateは、`pinnedCommit=337756f`、`expectedFail=8`、exact errorが8件以上という3条件が同時に
成立する場合だけ`verification-infra`へ別集計する。件数、commit、errorのどれかが違えば通常FAILである。

Git-free archiveではGit checkoutを必要とするsuiteを理由つきで`excluded`とし、配布bytes上で実行可能な
010/011/012/015/027/029/030/031/032 Patch群/038/report schema/release integrityを実行する。

### Sprint 029 wizard byte契約

履歴baselineのschemaとbytesは変更していない。現行で受け入れた5 wizard assetのexact SHA-256を
`scripts/fixtures/sprint-038/current-wizard-assets.json`へ固定し、
`scripts/sprint-029-rule-boundary-test.mjs`が完全一致を検査する。各assetを1 byte変更するnegative testで
不一致を検出する。64桁hexであることだけを合格条件にはしていない。

### current suite内で置換した衝突assert

現在用fixtureだけを次のように調整し、同じsuiteの安全assertは残した。

- Sprint 020 Patch 001/002、027: 現行READMEとAI主導Cloud/OAuth安全説明へ更新
- Sprint 029: 履歴digestとcurrent exact digestを分離
- Sprint 030: active editionとcanonical temp rootで検査
- Sprint 031: canonical CHANGELOG URL、agentic diagnosis、`.agents` fixtureを検査
- Sprint 032: immutableな0.7/0.8履歴判定とcurrent 0.9判定を分離
- Sprint 032 Patch 002: serializer ownerをactive manifestから解決
- Sprint 015: test fixtureの同一実体pathだけをcanonical化。製品path guardは不変

## P2 — 自然文runner、独立oracle、private mock操作

### 共通golden set

`scripts/lib/sprint-038-conversation-runner.mjs`はrunner入力として自然文`input`と`precondition`だけを受ける。
fixtureのexpected intent、response、after snapshot、meaning tupleは渡さない。runnerは一時workspaceへ
`state.json`と`operations.jsonl`を実際に書き、次を観測値として返す。

- intent
- response stateとresponse text
- side effect 0/1/partial
- before/after snapshot
- operation log
- subject、date、action、target、negationCondition、destinationのmeaning tuple

`scripts/sprint-038-test.mjs`は32 caseを独立したexpectedとobservedで比較する。quote、hearsay、
hypothetical、correction、cancel、past inquiry、duplicate、Secret、他者通知、partial、TODO、closed project、
setup、resume、private限定5点を含む。同じpreconditionでも、保存、取消、引用の自然文を変えるとintentと
副作用が変わることを検査する。

retry/resumeは同じ一時workspaceとoperation idを使い、`operations.jsonl`上で二重副作用0件を確認する。

### tamper・negative proof

expectedだけを次のように壊してもobservedは追随せず、comparisonがFAILになることを確認した。

- required response: `UNREQUESTED_CANARY`
- after snapshot: `decisionCount=99`
- destination: `Slack-unrequested`

meaningの6要素それぞれについて、runner出力へmissing、reversed、addedを注入し、全18種を検出する。
以前のようにexpected tupleをobserved生成へ渡していない。

### private隔離candidate

`scripts/lib/sprint-038-private-runner.mjs`と`scripts/sprint-038-private-test.mjs`は、一時workspace、
mock Notion connector、mock Calendar/vault readを操作する。Skill本文の正規表現だけを合格へ数えない。

- 番号承認後は1 write、retry/resumeは二重write 0
- 明示保存は通常plan後に1 writeし、質問文なしで停止しない
- 日付付き将来行動はTaskDBへ1 write、local TODOは0
- Calendar＋vault read-only mergeはwrite 0、片側失敗はpartial
- 不足一点だけを利用者向けに質問
- TaskDB、Title、Status、GTD、project relation、plan previewを不変に維持
- connector write後にpageを再読し、URL/properties一致を確認
- 再読不一致では成功表示0

## P3 — content-addressed buildと再構築可能な固定入力

### 固定入力

- source base commit: `d9a62755ff78db12c435f225cdd40e95f86a8055`
- source overlay: 69 entries
- source overlay SHA-256: `bef2803ee8591698bbf195a5eea6bfd9b9443465a0a92879ac0668365fed9622`
- yasashii seed: 648 files / `24202f527f72ea9a5ab26fe81a6980d20166fa0d3875b8c7779c916534e26d96`
- private seed: 774 files / `0b1d2d604dfdf48f260f28eca8a39f84a8ba093c7e36e2080bcf423ac8972f5c`

`scripts/fixtures/sprint-038/candidate-source-snapshot.json`は、base commitとの差分をpath、status、mode、
base64 bytesで固定し、document全体のSHA-256を検証する。
`scripts/fixtures/sprint-038/candidate-inputs.json`はbase、overlay、seed digestを固定する。
mutableなsource working treeをcandidateへ直接コピーしない。

snapshot manifestは自分自身をsnapshot entriesへ含めると自己参照になるため、entriesから除外する。
同様にinput metadataもentriesから除外する。ただしbuilderは両ファイルを検証後にcandidateへ同梱するため、
audit rebuildに必要な入力はartifactから落としていない。両metadataはcandidate digestからだけ除外する。

`docs/sprints/state.md`、`docs/progress/sprint-038.md`、`docs/feedback/sprint-038.md`はorchestration/evidenceであり、
配布product bytesではない。オーケストレーターやEvaluatorの正当な追記でartifact identityが変わらないよう、
dirty overlayとcandidate digestから除外した。plugin、migration、runtime、tests、release toolingは除外していない。

yasashiiは固定seed内で公式overlayを`--record → --apply → --check`の順に実行する。2回とも
managed=258、repo-owned digest=`7bc092f30020e7fc89b3da6aa601686eb06c20846b1d7d3a1bb01041c4592a11`、
upstream push disabledで一致した。privateは共通coreと共通scriptsだけを隔離candidateへ重ね、実repoを変更しない。

### 独立2回build

freeze後の同一commandを新規outputへ2回実行した。

```text
node scripts/sprint-038-candidate-build.mjs \
  --source /Users/taisei/workspace/agentic-secretary \
  --yasashii-seed /private/tmp/sprint-038-retry1.eQgxcb/final-candidates/yasashii \
  --private-seed /private/tmp/sprint-038-retry1.eQgxcb/final-candidates/private \
  --output <new-empty-output>
```

両方のcandidate commitは`9bf26510e2fe9043696ca9e43d3f2ce9fcfc238c`、
treeは`96eb7fd71a966e8b10cb93b311e9fe78c91d9760`で一致した。
このprogress更新後にもsnapshotを再recordせず3回目を新規outputへbuildし、同じcommit、tree、
3 candidate digestを再現した。progress除外がartifact identityを変えないことを確認した。

### 最終candidate identity

- agentic: 673 files / `641730f2dc50311f07c4f0a4345d7156c452e90ec087442a9b265ffcf0283df5`
- agentic Git-free archive: 673 files / `641730f2dc50311f07c4f0a4345d7156c452e90ec087442a9b265ffcf0283df5`
- yasashii: 653 files / `46059fb09ec3f9617ecb381bb199e4de24670102a3896c135e78f6f7941221cc`
- private: 788 files / `715525cab412dc971a33444bd60393dd5dc949c3e91f48f1b39ec33f9eb9d022`

最終candidate paths:

- build A: `/private/tmp/s038-r2final-e.szD2ms`
- build B: `/private/tmp/s038-r2final-f.B1C8qK`
- Git-free archive: `/private/tmp/s038-r2final-e-archive`

## 実行結果

### agentic current checkout

- Sprint 010: 56 PASS / 0 FAIL
- Sprint 011: 68 PASS / 0 FAIL
- Sprint 012: 38 PASS / 0 FAIL
- Sprint 015: 68 PASS / 0 FAIL
- Sprint 020 Patch 002: 68 product PASS、wrapper 7 PASS / 0 FAIL、V1 infra 1
- Sprint 021: 71 product PASS、wrapper green / 0 FAIL
- Sprint 022: 69 product PASS + wrapper 8 PASS / 0 FAIL
- Sprint 027: copy 66 PASS、wrapper 5 PASS / 0 FAIL
- Sprint 029: rule 25 PASS、wrapper 4 PASS / 0 FAIL
- Sprint 030: child 53+10 PASS、wrapper 7 PASS / 0 FAIL
- Sprint 031: child 13 PASS、wrapper 7 PASS / 0 FAIL
- Sprint 032: child 15 PASS、wrapper 5 PASS / 0 FAIL
- Sprint 032 Patch 001: readability 28 PASS、wrapper 7 PASS / 0 FAIL
- Sprint 032 Patch 002: product 32 PASS、readability 28 PASS、wrapper 8 PASS / 0 FAIL
- Sprint 038: 64 PASS / 0 FAIL
- report schema: 1 PASS / 0 FAIL、states=5
- current release integrity: PASS

`node scripts/master-release-gate.mjs --mode offline`の最終結果:

```text
RELEASE_GATE mode=offline status=pass suites=18 required=18 passed=17
verification-infra=1 failed=0 assertions=742 pass=734 fail=0 infra-fail=8
```

17 current suitesはすべてPASS。固定履歴masterは331 PASS、V1 8件だけを`verification-infra`へ別集計した。
V1/V2以外のFAILは0件。

### Git-free archive

candidate commitから`git archive`で新規展開し、`.git`がない状態でagentic digestと完全一致した。

```text
RELEASE_GATE mode=archive status=pass suites=21 required=13 passed=13
verification-infra=0 failed=0 assertions=325 pass=325 fail=0 infra-fail=0
```

### 3配布系統

- agentic Sprint 038: 64 PASS / 0 FAIL
- yasashii official overlay: record/apply/check PASS、managed=258、upstream push disabled
- yasashii Sprint 038: 64 PASS / 0 FAIL
- private Sprint 038: 64 PASS / 0 FAIL
- private mock operation: 9 PASS / 0 FAIL
- `git diff --check`: 0 error

## Evaluatorへの再評価手順

1. agentic checkout:
   `node scripts/master-release-gate.mjs --mode offline --root /private/tmp/s038-r2final-e.szD2ms/agentic`
2. agentic Git-free archive:
   `node scripts/master-release-gate.mjs --mode archive --root /private/tmp/s038-r2final-e-archive`
3. yasashii:
   `bash /private/tmp/s038-r2final-e.szD2ms/yasashii/scripts/sprint-038-regression.sh`
4. private:
   `bash /private/tmp/s038-r2final-e.szD2ms/private/scripts/sprint-038-regression.sh && node /private/tmp/s038-r2final-e.szD2ms/private/scripts/sprint-038-private-test.mjs`
5. digest:
   `node scripts/sprint-038-candidate-digest.mjs <candidate> <expected-sha256>`
6. rebuild:
   上記の固定build commandを別の空outputへ実行し、commit、tree、3 digestを比較する。

## 既知事項と外部操作

- V1: sandboxは`127.0.0.1`のlistenを`EPERM`で拒否する。製品network境界は変更していない。
- V2: macOSの同一実体pathが`/var`と`/private/var`で表記される。製品path guardは変更していない。
- live conversation gateはoffline gateと別の三値集計で、未実行は`incomplete`のまま。offline PASSを
  実host会話PASSへ昇格していない。
- tag、GitHub Release、marketplace更新、remote push、plugin install/reinstall、実Notion write、
  実Calendar write、実vault write、実yasashii/private repo変更は0件。

## ユーザー承認後の最終限定round（verification codeのみ）

この節が、上のretry 2にあるhistorical master分類とcandidate identityの最新記録を置き換える。
Evaluatorが指摘した単一findingだけを対象にし、2回連続でverification codeだけを変更した。
会話contract、Notion、migration、配布candidateの構成方針、その他のproduct codeは変更していない。

変更対象:

- `scripts/master-release-gate.mjs`
- `scripts/run-historical-regression.mjs`
- `scripts/sprint-038-historical-classifier-test.mjs`
- `scripts/fixtures/sprint-038/historical-classifier-cases.json`
- `scripts/fixtures/sprint-038/historical-classifier-runner.mjs`
- `scripts/sprint-038-regression.sh`
- `scripts/fixtures/sprint-038/candidate-source-snapshot.json`
- `scripts/fixtures/sprint-038/candidate-inputs.json`
- `docs/progress/sprint-038.md`

### finding修正

historical runner自身が、隔離checkout後の`git rev-parse HEAD`と`git rev-parse --short=7 HEAD`、
top-level assertion、各failure eventを最終行の構造化結果として返す。master gateは呼び出し側の
`pinnedCommit`やraw文字列出現数を証拠にせず、そのrunner-owned resultだけを照合する。

`verification-infra`にできる条件は、実checkoutが`337756f204eb5e709ddf39912df3ce1edfbec834`、
総FAILが8、top-level failure eventも8、各eventが正確に
`Error: listen EPERM: operation not permitted 127.0.0.1`であり、他のerror/failureがない場合だけである。
Nodeが同じlisten errorを包む場合は、同一section内の`wizard did not start: node:events:<line>`だけを
狭いcompanionとして許可する。

負fixtureの子process出力は親のSprint 038集計へ混ぜず、fixture自身の構造化resultだけを判定へ渡す。
修正前のmatrixは4 PASS / 5 FAIL、修正後は次の9 PASS / 0 FAILだった。全caseで分類とmaster gate exitを確認した。

| case | expected classification | expected gate exit |
|---|---|---:|
| good | verification-infra | 0 |
| wrong actual commit | fail | 1 |
| 8 EPERM + product error | fail | 1 |
| 7 EPERM | fail | 1 |
| 9 EPERM | fail | 1 |
| 7 EPERM + 1 other | fail | 1 |
| missing observed commit | fail | 1 |
| same count, different error | fail | 1 |
| declared commit only correct / actual wrong | fail | 1 |

### 実historical runとoffline gate

固定candidateでfull offline gateを実行した。historical runnerが観測した実checkoutは
`337756f204eb5e709ddf39912df3ce1edfbec834`、集計は331 PASS / 8 FAIL、top-level failure eventは8件だった。
ただし構造化eventの内訳はexact loopback EPERMが6件だけで、次の2件は別failureだった。

- sprint-017: Python `JSONDecodeError: Expecting value: line 1 column 1 (char 0)`
- sprint-025: `0.6.0→0.7.0を読み取り専用で診断` assertion FAIL

したがって「8件すべてexact EPERM、他error/failureなし」は成立しない。分類を緩めず通常のproduct FAILを保持したため、
full offline gateはFAILが正しい。以前のprogressにある
`verification-infra=1 / failed=0 / infra-fail=8`は、この最終roundの実測では再現しなかった。
子fixture出力の親集計混入を直した後のSprint 038限定suiteは64 PASS / 0 FAIL、classifier matrixは9 PASS / 0 FAIL。
historicalだけを最終実装で再実行しても、同じ実commit、331/8、exact EPERM 6件 + 非EPERM 2件だった。

### candidate freezeと配布面

最終overlay SHA-256は`dcd24b4289b44e71589912a4a8f38447aa79632f3fcea1a6f325d317942bf01b`。
新規outputへ独立に2回buildし、両方で次が一致した。

- candidate commit: `9e715322630ba2a842425eac60eb7d9c085245fd`
- tree: `d81360a94f51db8f3a3a62dc07872c19c18038c4`
- agentic: 676 files / `53691d6657b57b6de4cb6082b1c67c9f6d6bd4581cd050ef0a5b8126c984bd2f`
- yasashii: 656 files / `d6e708f2c9b27c76fcbd31c25a018e8cd9fcf27066c8a93b79702a829ba7f71f`
- private: 791 files / `69cfa6e2919c93797cf652d471ee29fbb970372a85bf5dd46021823fd5506578`

最終candidate paths:

- build C: `/private/tmp/s038-final.Q5IrHD/build-c`
- build D: `/private/tmp/s038-final.Q5IrHD/build-d`
- Git-free archive: `/private/tmp/s038-final.Q5IrHD/archive-c`

このprogress更新後にもsnapshotを再recordせず`/private/tmp/s038-final.Q5IrHD/build-e`へ3回目をbuildし、
同じcommit、tree、3 digestを再現した。progress追記でartifact identityが変わらないことを確認した。

archive gateは13 required suiteすべてPASSし、270 PASS / 0 FAIL。
agentic、yasashii、privateのSprint 038は各64 PASS / 0 FAIL、classifier matrixは各9 PASS / 0 FAIL、
private mock operationは9 PASS / 0 FAIL。3 candidate digestも固定値と一致した。

### 最終判定と外部操作

このGenerator roundはfinding修正と安全な負テストを完了したが、実historical runに非EPERM failureが2件残るため
Sprint 038のPASSは主張しない。独立Evaluatorの判定待ちとする。

実downstream、cache、vault、Notion、Calendar、remoteへのwriteは0件。
commit、push、tag、release、plugin install/reinstall、実yasashii/private repo変更も0件。

## ユーザー承認A案 — historical pathとfull SHAの限定修復

このroundは前2回に続く **verification codeのみ** の変更である。product code、会話contract、Skill、
Notion、migration、版固有実装は変更していない。ユーザーが選択したA案の範囲どおり、
historical isolation pathとfull SHA strictnessだけを修復した。

変更対象:

- `scripts/run-historical-regression.mjs`
- `scripts/master-release-gate.mjs`
- `scripts/sprint-038-historical-classifier-test.mjs`
- `scripts/sprint-038-historical-path-test.mjs`
- `scripts/fixtures/sprint-038/historical-classifier-cases.json`
- `scripts/fixtures/sprint-038/historical-classifier-runner.mjs`
- `scripts/fixtures/sprint-038/historical-path-alias-probe.mjs`
- `scripts/sprint-038-regression.sh`
- `scripts/fixtures/sprint-038/candidate-source-snapshot.json`
- `scripts/fixtures/sprint-038/candidate-inputs.json`
- `docs/progress/sprint-038.md`

### historical isolation path

runner entrypointは`import.meta.url`と`pathToFileURL(process.argv[1])`をそれぞれ`realpathSync`した
canonical absolute pathで比較する。一時rootも`tmpdir()`のrealpathから作り、nested historical suiteへ
`TMPDIR`／`TMP`／`TEMP`を同じcanonical rootとして渡す。これによりmacOSの`/var`／`/private/var` aliasを
一時checkoutとnested archiveへ持ち込まない。broad path guard、symlink拒否、Secret検査、固定commit bytesは変更していない。
runnerの`finally` cleanupも維持した。

path alias負fixtureは、symlink aliasで`import.meta.url`とargv URLが不一致になること、realpath後は一致することを
3 PASS / 0 FAILで確認した。固定bytesの実runは次のとおりだった。

- Sprint 017: 33 PASS / 0 FAIL
- Sprint 025の固定0.7.0 revision: 25 PASS / 0 FAIL
- fixed historical full master: 333 PASS / 6 FAIL
- `JSONDecodeError`と`0.6.0→0.7.0を読み取り専用で診断`の偽FAIL: 0件

残る6件はすべて`Error: listen EPERM: operation not permitted 127.0.0.1`のtop-level failure eventで、
別error／failureは0件だった。

### full SHA classifier

infra分類はrunnerが実checkoutで返した`observedCommitFull`と
`337756f204eb5e709ddf39912df3ce1edfbec834`の40桁完全一致を必須にした。
`337756f`は表示とfull SHAとの整合確認にだけ使う。top-level assertion failure 6件、failure event 6件、
assertion fail総数6、全件exact loopback EPERM、runner error／別error 0、historical exit 1を同時に満たす場合だけ
`verification-infra`になる。

classifier matrixは14 PASS / 0 FAIL。goodだけ`verification-infra`／gate exit 0で、同prefix別full SHA、
39桁、41桁、大文字、欠落、wrong actual、declared fullだけ正しいactual別、EPERM 5／7件、
6 EPERM＋別error、同数別errorはすべて通常FAIL／gate exit 1だった。raw文字列や子processの申告値は分類根拠にしていない。

### gateと3配布系統

build Aのagentic candidateでfull offline gateを実行した。

```text
RELEASE_GATE mode=offline status=pass suites=18 required=18 passed=17
verification-infra=1 failed=0 assertions=681 pass=675 fail=0 infra-fail=6
```

current 17 suiteは全PASS。fixed historicalだけが上のexact EPERM 6件としてinfra分離され、別error混在は0件だった。
live conversation gateは従来どおり別集計の`incomplete`で、offline PASSから昇格していない。

- Git-free archive gate: required 13 / 13 PASS、264 PASS / 0 FAIL
- agentic Sprint 038: 64 / 0、classifier 14 / 0、path alias 3 / 0
- yasashii Sprint 038: 64 / 0、classifier 14 / 0、path alias 3 / 0
- private Sprint 038: 64 / 0、classifier 14 / 0、path alias 3 / 0
- private mock operation: 9 / 0
- migration／history: Sprint 038内のversion-specific migrationとhistorical fixture検査がPASS

### candidate freeze

implementation/test freeze後にsource snapshotをrecordした。

- source base commit: `d9a62755ff78db12c435f225cdd40e95f86a8055`
- source overlay: 74 entries
- source overlay SHA-256: `f2100a8b9af138b7e9ccec77024d1e833e4e6579e05079f908886567bff6d090`

新規outputへ独立にbuild A／Bを作り、両方で次が一致した。

- candidate commit: `f433373ee92d00956627ed419557928aa3c3976a`
- tree: `d7fac121a5988a7c5bc87106b91d55776476e939`
- agentic: 678 files / `5b19a88c4419d53ee1c9f19f681f590e66b126742bfb935ffbd3cb4613a5780f`
- yasashii: 658 files / `47b804d00c0c75c072b50ad92489bde2a5bc20d639dde0f2ee997d452a451ef8`
- private: 793 files / `bf0981c0a53e363acd4fddc130164566f862324e015742d21133b0c2db294a4d`
- Git-free archive: agenticと同じ678 files / `5b19a88c4419d53ee1c9f19f681f590e66b126742bfb935ffbd3cb4613a5780f`

paths:

- build A: `/private/tmp/s038-option-a.ZM0tNj/build-a`
- build B: `/private/tmp/s038-option-a.ZM0tNj/build-b`
- Git-free archive: `/private/tmp/s038-option-a.ZM0tNj/archive-a`

このprogress更新後はsnapshotを再recordせず、`/private/tmp/s038-option-a.ZM0tNj/build-c`へ3回目をbuildした。
commit、tree、3 candidate digestはbuild A／Bと完全一致した。progress更新がartifact identityを変えないことを確認した。

### 外部操作

実downstream、cache、vault、Notion、Calendar、remoteへのwriteは0件。
commit、push、tag、release、plugin install/reinstall、実yasashii/private repo変更も0件。
Sprint完了は主張せず、独立Evaluatorの最終判定待ちとする。
