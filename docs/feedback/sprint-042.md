# Sprint 042 評価結果

**判定:** 不合格
**分類:** `implementation-issue`
**評価対象:** Sprint 042 — Attention、doctor、migration、bounded UX
**Generator candidate:** `6f2c23c42635fb9772243d289c16fd39b29dea8f`
**評価開始HEAD:** `d36bdc8f58d2ec8078add151a4dc898a2ad29503`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）
**Escalation Recommendation:** none（Generatorで修正可能）

## 結論

Target 35件（AT 17、IM 8、UX 10）は同一candidateで35/35 PASSし、registry missing／duplicate／extraは全て0、Acceptance Criteriaの未実行も0だった。独立fixtureでも全13 Attention reason、固定時刻staleness、stable tie-break、人間override、上位3件＋残件数、checkpointの2種類のpartial／retry、migrationの3 failure point、doctor、cleanup所有再確認を操作した。

ただし、`.clarity/runtime`に期限切れのClarity-owned fileだけがある正常なcleanup applyで、対象fileを削除した後、空directoryへ`rmSync(runtime)`を実行して`ERR_FS_EISDIR`になる。CLIは実際にはlockを削除したのに`changed: false`を返し、同じcommandのretryも同じerrorから収束しない。これはAC5とC24の必須境界に直接反するproduct defectである。専用suiteのIM-014は保持対象fileが残りruntime directoryが空にならないため、この経路を通過していない。したがって、suite自己申告の35/35だけでは合格にせず、Sprint 042を`implementation-issue`として不合格にする。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | AC5のcleanup apply／retryが空runtime経路で成立しない |
| C2 構文・整合 | 5/5 | 5 | PASS | schema JSON 5件、case registry、ID、path、`git diff --check`が成立 |
| C3 機能の実証 | 4/5 | 4 | PASS | Attention、checkpoint、migration、doctorを独立操作。cleanupの1必須経路だけ失敗 |
| C4 非エンジニア体験 | 3/5 | 4 | FAIL | cleanupが生のfilesystem error相当になり、実際の削除後も`changed: false`、retry案内も収束しない |
| C5 安全・規律 | 5/5 | 5 | PASS | user file、unowned／期限内runtime、Secret、外部repo、network／push境界を保持 |
| C6 無回帰 | 5/5 | 5 | PASS | Sprint 015/021/022/023、release integrity、Sprint 041/042直接回帰が0 FAIL。full master既知1件はbaseline同一のP/V debtとして分離 |
| C7 やさしさ | 4/5 | 4 | PASS | Attention通常表示は短い日本語で結論→理由→根拠→選択。cleanup errorだけはC4/F-01で減点 |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | Event／Evidence／State分離、rebuild byte安定、履歴／ID／unknown field保持 |
| C20 Attention・Clarity UX | 5/5 | 4 | PASS | 13 reason、priority、bounded top 3、推定／未検証／根拠不足／到達不能を正直に表示 |
| C24 Clarity安全・統合・public-first（Sprint 042対象面） | 4/5 | 5 | FAIL | migration／checkpoint／所有再確認は成立するが、cleanup lock／retry境界に1件違反 |

C8〜C18、C21〜C23は今回の採点対象外である。Hook、link／sync、実Drift、Mermaid／Xmind、Secretary統合、Portfolio、packagingは後続Sprintの非scopeとしてPASSへ代用していない。

## 証跡

### Target 35件と専用baseline

- `bash scripts/sprint-042-regression.sh` → exit 0。
  - AT-001〜014、016〜018の17件、IM-001／004／006〜009／013〜014の8件、UX-001〜010の10件を実行。
  - `SPRINT042_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`
  - `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`
  - `SPRINT042_REGRESSION_PASS=4 FAIL=0 CASES=35`
- `AT-003`／`AT-004`／`AT-008`／`AT-009`は`evaluateAttention`へ合成canonical State／Evidenceを直接投入し、reason／level／rankingだけを評価している。実sync、authority conflict生成、実Drift comparatorのPASSとは扱っていない。

### 独立Attention／checkpoint／doctor fixture

- `node /private/tmp/s042-evaluator.mjs` → exit 0、`status=PASS`。fixture rootは`/var/folders/k1/582ptqfx73l_t0glc9q1hck40000gn/T/s042-independent-8RaHSV`。
- 固定時刻`2026-08-28T10:30:00.000Z`で、次の13 reasonと既定levelを独立確認した。
  - Critical: `decision_implementation_drift`、`validation_failed`、`authority_conflict`
  - High: `implemented_without_confirmed_decision`、`possible_drift`、`validation_pending_too_long`、`sync_conflict`
  - Medium: `confirmed_but_not_executed`、`undecided_stale`、`missing_evidence`、`dependency_blocked`、`decision_owner_missing`
  - Low: `source_unreachable`
- validation pendingは14日境界の1秒前をstaleにせず、境界超過だけをHighにした。同一5 Itemを逆順入力しても表示順は同一で、人間override Itemが先頭、表示3件、`otherCount=2`だった。
- checkpoint Evidence後partialと解消履歴後partialを別operationで注入した。各retryを2回行い、最終`evidenceCount=3`、`checkpointEvents=2`、`resolvedEvents=1`、active 0。same-operationのEvidence／Event非増加、解消項目のactive除外、history保持を確認した。
- doctorは`mode=standalone`、`schema=current`、projection=`正常/verified`、Hook=`未検証`、link=`未設定`、lock=`残骸あり/verified`で`ok=false`。未検証面を成功扱いしていない。
- 通常日本語CLIで結論→理由→根拠→選択、Attentionなしの短文、AI推定、未検証、根拠不足、matrix 4 labelを確認。rebuild digestは`fc62469187ad442f70c50734d7bdff4a98cd4b996c344417088305f504d4dcce`、2回目`changed=false`。

### migration preview／failure／retry

- v1 fixtureにはproject／Event／Item／Evidence／State各層のunknown fieldと`user-note.txt`を入れた。各failure pointでpreview前後write 0、failure後tree完全一致、v1で`attention`利用可能、retry後v2、Event／Evidence ID保持、unknown field保持、利用者file byte保持、再apply`unchanged`と同一digestを確認した。

| failure point | before / restored digest | apply後digest | Event ID / Evidence ID | tree rows |
|---|---|---|---|---:|
| `before-swap` | `73b00ae97662f93616e4cd9a02e9753aa2208fdb1de97b5d0a640c5de08ff324` | `c9f214b704dffc9c7d9c45edbd40b36e42c170948036dccb182032d734925fa1` | `cv_fe59628c0ceca5ce252c` / `ce_d5337bddb3306b4bf5b1` | 8 |
| `after-backup` | `a4f240b9093deb1a8b7de2bc14b1fecdee91a64b3af7c3ef52911ac203e344ad` | `bcfa336ef1f4d21ddeaab2d2771ea5210822e99875d984c00328a199e1c36b3f` | `cv_d48160aa8e9618e8d5c7` / `ce_ab61d27118a8b0f3ae2d` | 8 |
| `after-swap` | `a95a482e3103fb00c1d0f6a7f0fad83421f4ea174d8bed6199454bea41b61b34` | `a9b45eb167ec9088f3f76c7d88ed9e5bd66897e8857a65326f9d4438371e5ca5` | `cv_4154378cda68d43a837b` / `ce_3ee6de905b0b5e35a104` | 8 |

### cleanup正常境界と不合格再現

- 独立fixtureでpreview write 0、期限切れClarity-owned `.clarity/runtime/lock.json`だけを削除し、期限内owned operation、期限切れunowned operation、user fileを保持した。前digest`650f096df40eeb4fc9740f8495a432d0b3cfa9510121b3cf268c3f318964d2f6`、後digest`cf5862475d6b4d67b9cefd4bbc9ea28138b9fc59ecc1970080c50d515e144ab3`。
- apply中にpreview済みlockのownerを`agentic-secretary:clarity`から`user`へ変更する独立race fixtureを実行した。`node /private/tmp/s042-cleanup-race.mjs` → exit 0、fixture root`/var/folders/k1/582ptqfx73l_t0glc9q1hck40000gn/T/s042-cleanup-race-72ytQN`。製品CLIはexit 3、`code=runtime-changed`、`changed=false`で停止し、user-ownedへ変わったfileを保持した。apply直前の所有再確認は成立する。
- 不合格再現: `node /private/tmp/s042-cleanup-empty-repro.mjs` → fixture runner exit 0、root`/var/folders/k1/582ptqfx73l_t0glc9q1hck40000gn/T/s042-cleanup-empty-J8hcyS`。
  1. runtimeには期限切れClarity-owned `lock.json`だけを置く。
  2. `clarity cleanup <root> --json` → exit 0、candidate 1、`changed=false`、lock digest一致でpreview write 0。
  3. `clarity cleanup <root> --apply --json` → exit 3、`code=unexpected-error`、`ERR_FS_EISDIR`。
  4. 観測状態は`lockExists=false`、`runtimeExists=true`、entries 0。出力は実際の削除に反して`changed=false`。
  5. 同じapplyをretry → exit 3、同じ`ERR_FS_EISDIR`で収束しない。
- 原因箇所は`plugins/secretary/scripts/lib/clarity-core.mjs:1151`。fileを安全に削除した後、空directoryをdirectory用optionなしの`rmSync(runtime)`で削除している。

### 関連回帰、master、candidate固定

- `bash scripts/sprint-041-regression.sh` → `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`、`SPRINT041_REGRESSION_PASS=4 FAIL=0 CASES=43`。
- `bash scripts/sprint-015-regression.sh` → `PASS=68 FAIL=0`。
- `node scripts/sprint-021-git-safety-test.mjs` → `PASS=71 FAIL=0`。
- `node scripts/sprint-022-safety-test.mjs` → `SPRINT022_PASS=69 SPRINT022_FAIL=0`。
- `node scripts/sprint-023-security-test.mjs` → sandboxではloopback bindが`EPERM`。外部通信なしのlocal-only再実行で`SPRINT023_PASS=21 SPRINT023_FAIL=0`。
- `python3 scripts/check-release-integrity.py` → `PASS release integrity: manifests and CHANGELOG are consistent`。
- `bash scripts/agentic-regression.sh` → sandbox初回はloopback bindの`EPERM`。local-only再実行はSprint 013が35/35、その後Sprint 019の`README高度設定と管理者順序・People API限界`だけ50/51で停止。full masterをgreenへ昇格していない。
- README blobはSprint 041 candidate／Sprint 042 candidateとも`c714beeaa71d9d99be0b14af4c2fb8b4329ef68c`、Sprint 019 test blobも双方`817e502ed3541691837e39d61d1b4ca3e64eb6eb`。Sprint 042差分にREADME、Google Chat Skill、Sprint 019 testは0件で、既知Sprint 019 debtは本Sprint差分外。
- `node -e ... plugins/secretary/clarity/schemas/*.schema.json` → `SCHEMA_JSON_PASS=5`。
- `git diff --check 88591ae..6f2c23c42635fb9772243d289c16fd39b29dea8f` → exit 0。

### Scope非混入

- candidateの製品差分はClarity schema 5件、Clarity core／CLI、Clarity Skillだけ。Hook、projects、secretary、daily、weekly、memory-care、notion-tasks、manifest、README、CHANGELOG、edition/downstream fileの変更0件。
- 新規CLI入口は`attention`、`attention-override`、`checkpoint`、`migrate`、`cleanup`。Hook router、Secretary統合、link／sync、実Drift comparator、Portfolio、Mermaid／Xmind provider、packaging／handoff／release処理は実装していない。
- schema enumやAttention signalに`sync_conflict`、`authority_conflict`、`drift`があることは合成canonical評価の受け口であり、実生成・外部接続・意味比較のPASSではない。

### UI／外部副作用

- 本Sprintはserver／browser UIを持たないCLI／Markdown製品面のため、スクリーンショット採点は非該当。
- network、external connector、Xmind live、外部remote push、release、cache、downstream writeは0件。回帰中のpushはtemporary local bare remoteだけ。
- 実HOME、実利用者workspace、実downstream repo、installed cache、Mac mini、外部serviceは変更していない。

## Acceptance Criteria

| AC | 判定 | 実行証拠 |
|---|---|---|
| 1. Target 35件、Critical、未実行0 | PASS | 35/35、missing／duplicate／extra 0、AC未実行0 |
| 2. 全Attention reasonと正しいlevel | PASS | 独立13 reason＋専用17 AT case |
| 3. idea／deferred、stable tie／repeat | PASS | 固定時刻境界、逆順入力同一、人間override |
| 4. 上位3件、結論→理由→根拠→選択 | PASS | visible 3、other 2、正常／ideaを既定非表示 |
| 5. migration／cleanup preview、failure、retry | **FAIL** | migrationは成立。cleanup空runtimeでapply exit 3、部分削除後`changed=false`、retry非収束 |
| 6. doctorのmode／schema／canonical／lock／projection | PASS | stale lock時`ok=false`、Hook未検証、link未設定 |
| 7. technical handoffと通常表示の分離 | PASS | UX-006／010、独立CLI日本語表示 |

## Finding／バグ一覧

| # | 重要度 | 対象区分 | 内容 | Sprint 042判定への影響 |
|---|---|---|---|---|
| F-01 | Major | product | cleanupで期限切れowned fileだけを削除すると空runtime directoryの`rmSync`が`ERR_FS_EISDIR`。fileは削除済みなのに`changed=false`、retryも同じerrorで収束しない | AC5、C1、C4、C24を不合格にする`implementation-issue` |
| V-01 | Minor | verification-infra | IM-014はuser file／期限内operationを同じruntimeに残すため、cleanup後にdirectoryが空になる経路とretryを検査していない | product failureを隠すcoverage gap。F-01修正時に回帰case追加が必要 |
| P-01 | Minor | product | 現READMEはPeople APIで連絡先にない同僚名を補完できない場合の制限を明示していない、Sprint 019由来の既存baseline debt | candidateとの差分外。full masterはgreen扱いしないが、Sprint 042のF-01とは別 |
| V-02 | Minor | verification-infra | Sprint 019の1 assertが旧copyの複数条件を単一conjunctionで検査し、説明不足と旧exact phrase依存を分離できない | baseline同一の既存debt。本Sprintの修正対象へ混ぜない |

Critical findingは0件。新規Majorはproduct 1件、新規verification-infraはMinor 1件。

## Generatorへの指示

1. `applyRuntimeCleanup`で空runtime directoryを安全に削除するか、空directoryを保持しても成功扱いできるようにする。directory削除時もsafe path／symlink境界を維持すること。
2. file削除後に後処理が失敗する可能性があるなら、`changed`と完了／未完了を実状態どおりに返す。少なくとも「変更前の状態を保った」という誤案内をしないこと。
3. 期限切れowned fileが唯一のentryであるfixture、開始時から空runtimeのfixture、failure後retryをSprint 042回帰へ追加する。
4. 既に成立しているAttention、checkpoint、migration、所有再確認、scope境界を回帰させない。F-01とV-01だけを狭く修正し、Sprint 019既知debtや後続機能を混ぜない。

## Evaluator 自己レビュー

- 閾値と合否は一致しているか: yes
- Target 35 IDを全件実行し、registry欠落／重複／余剰とAC未実行を0にしたか: yes
- suite自己申告だけでなく独立CLI／fixtureを操作したか: yes
- 未検証の実sync／実Drift／Hook／link／XmindをPASS扱いしていないか: yes
- migrationのpreview、3 failure point、tree／ID／byte／unknown field、retryを証拠化したか: yes
- cleanupのpreview、所有再確認、保持対象、単独expired file、retryを証拠化したか: yes
- 各findingにproduct／verification-infra区分を付けたか: yes
- full masterの既知FAILをgreenへ昇格していないか: yes
- network／external connector／Xmind live／push／release／cache／downstream writeを行っていないか: yes
- 実装やコード修正へ越境していないか: yes
- 判定根拠: Targetと主要独立fixtureはPASSしたが、必須AC5と閾値C1／C4／C24がF-01でFAILしたため、Sprint全体は`implementation-issue`として不合格。
