# Sprint 050 Patch 005 Generator進捗 — state構造とSecret本文の分離

- 開始HEAD: `b73e120`
- 製品candidate commit: `5ab63d6455e919fb3bb825fc1c7448d3861e609b`
- 製品candidate tree: `ad9d5a70c49a68d48dc926287256282b4ea228ad`
- 担当: Generator（自己検査とEvaluator handoffのみ。Evaluator Verdictは宣言しない）
- 実装日: 2026-08-31
- 対象: `sprint-050-patch-005`（Model Tier strong）
- 現在地: public source／exact clean checkout／Git-free portable検証完了。Windows native CIと独立Evaluator待ち

## 実装内容

- `docs/sprints/state.md`だけを、構造化したexecution truthと非構造本文へ分けてboundedに解析するようにした。Current ID、status、Next Planned、該当table row、許可済みfallbackを、fenced／inline code、HTML comment、履歴説明から分離する。
- Markdown fenceはdelimiter文字とopening長を保持し、同じ文字かつ同じ長さ以上のclosingだけで閉じる。重複Current rowは同じstatusでも曖昧としてunresolvedにする。inline codeのMarkdown delimiterはplaceholder判定前に安全に除く。
- placeholderは、山括弧、環境変数参照、mask記号、明示的な置換語など、構文上明らかな形式だけに限定した。任意suffixを許すprefix allowlistや現在stateのexact文字列allowlistは使用していない。
- 実値らしいSecretはstateのbounded本文全体で検査し、fence／comment内でも無害扱いしない。安全に抽出できる構造metadataは保持しつつ、sourceを`redacted`／`partial`にして固定理由とfield単位coverageを返す。Secret spanが構造field自体に重なる場合、そのfieldだけをunresolvedにし、Current、status、PASSを補完しない。
- redacted時は値、断片、周辺本文、summary、candidate、Evidence、raw bytes由来digestを返さない。正確な`size`／`bytesRead`とlane使用量も隠し、既存上限に基づく`bytesReadAtMost`だけを返す。値だけ、または値長だけが異なる同一構造入力は、外部へ返るsanitized state／coverage／candidate digestが一致する。
- Harness stateはgeneric laneで重ねて読まず、`harness-authoritative-source`として除外する。state以外のcontract／progress／feedback／spec／guidance／manifestとgeneric sourceは従来のstrict Secret exclusionを維持する。
- bounded readは128 KiBのままで拡張していない。valid／TBD／missing／invalid／unsafe Current、last-completion fallback、feedback absent、範囲外fieldの固有reasonを維持する。
- Patch005専用suiteへSR-001〜010を登録した。Secret canaryはruntimeだけで生成し、tracked fixture／stdout／progressへ実値またはraw hashを残さない。
- Windows workflowの既存`windows-native` job、`windows-2025`、Node 22、`timeout-minutes: 10`、0.9.2回帰を維持したまま、`node scripts/sprint-050-patch-005-test.mjs --require-windows`を結線した。
- collaboration inventoryへSR 10件とPatch005 suiteを追加した。Patch caseは47、SRは10、全caseは67となり、duplicate／missing／extra 0、feature単一割当を機械確認する。過去suiteは進化するregistry総数だけを更新し、historical findingやverification基準を改変していない。

## 変更file

```text
.github/workflows/windows-recording-regression.yml
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/clarity.mjs
plugins/secretary/scripts/lib/clarity-core.mjs
plugins/secretary/scripts/lib/clarity-harness-scan.mjs
scripts/lib/sprint-049-inventory.mjs
scripts/sprint-049-test.mjs
scripts/sprint-050-patch-003-test.mjs
scripts/sprint-050-patch-004-test.mjs
scripts/sprint-050-patch-005-test.mjs
docs/progress/sprint-050-patch-005.md
```

Planner所有の`docs/spec*`／Sprint契約、Orchestrator所有の`docs/sprints/state.md`、Evaluator所有の`docs/feedback/**`は変更していない。private my-vault／Yasashii source、release／merge／tag、Marketplace、install／cache、live apply、実Xmind、実顧客Repoも変更していない。

## 起動／回帰command

server／UI／test URLはない。実Repoのread-only previewは次で起動できる。

```bash
node plugins/secretary/scripts/clarity.mjs init <repo-root> --json
```

portable Target suite:

```bash
node scripts/sprint-050-patch-005-test.mjs
```

Windows native必須入口:

```powershell
node scripts/sprint-050-patch-005-test.mjs --require-windows
```

inventory gate:

```bash
node scripts/sprint-049-inventory.mjs validate
```

## Target結果

| case | local結果 | 確認内容 |
|---|---|---|
| SR-001 | PASS | current public sourceでCurrent、status、Next Planned、row、4 role、bundleを保持 |
| SR-002 | PASS | placeholder／inline／fence／comment／履歴説明、fence長negative、構造／coverage digest安定 |
| SR-003 | PASS | runtime Secretを本文へ置いてredacted／partial、構造保持、本文非露出 |
| SR-004 | PASS | 値と値長が異なるSecretでsanitized identity一致、長さ／raw digest非露出 |
| SR-005 | PASS | state以外のauthoritative／generic strict exclusion維持 |
| SR-006 | PASS | 128 KiB枠の先頭／中間／末尾と範囲外、固定reason／上限表示 |
| SR-007 | PASS | valid／TBD／missing／invalid／unsafe／fallback／feedback absent |
| SR-008 | PASS | public common 3 path identityとcopy portability precheck。これ単体をclean checkout証拠には数えない |
| SR-009 | PASS | Patch004／003、Sprint041／047／049、inventory、generic／alias回帰 |
| SR-010 | NOT-RUN | Windows native runner必須 |

集計は`SPRINT050_PATCH005_PASS=9 FAIL=0 SKIP=0 NOT_RUN=1 TOTAL=10 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false`である。SR-010未実行のため、GeneratorはTarget全件PASSまたはWindows verifiedを宣言しない。

## 実source read-only結果

Darwin `25.6.0 arm64`、Node `v22.23.2`で、current public sourceへ`init . --json`を実行した。

- `ok=true`、`status=preview`、`changed=false`
- Harness detection: `harness`／`state-and-spec-confirmed`
- Current: `sprint-050-patch-005`、status `active`、Next Planned `TBD`
- table row: `sprint-050-patch-005`／`active`、`reason=resolved`、推測なし
- bundle source: `harness-authoritative`
- 4 role: state inspected、contract inspected、progress inspected、feedbackは`evaluation-not-yet-recorded`
- stateは約210 KiBだが、読込は既存上限128 KiB、`reason=bounded-section-read`
- preview後のfilesystem／Clarity runtime／journal／Git／network writeは0件

progress作成後に再度previewし、Generator roleが`inspected`／`available`となってもCurrentとbundleを維持することを確認した。同じ実sourceへ`--cancel --json`も実行し、`status=canceled`、`changed=false`を確認した。apply、connector、Xmind、外部providerは実行していない。

## exact candidateの3面検査

製品candidate `5ab63d6455e919fb3bb825fc1c7448d3861e609b`を固定し、次の3面で検査した。

1. public source: candidate commit上の作業treeでTarget／関連回帰／inventoryとread-only previewを実行。
2. exact clean checkout: local `git clone --no-hardlinks --no-checkout`後、同SHAをdetached checkout。開始／終了とも`git status --short`は空。
3. Git-free: 同SHAの`git archive`を別directoryへ展開し、`.git`不存在を確認。

clean checkoutとGit-freeの両方で次を得た。

```text
SPRINT050_PATCH005_PASS=9 FAIL=0 SKIP=0 NOT_RUN=1 TOTAL=10 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false
SPRINT049_INVENTORY_PASS=20 FAIL=0 CASES=67 MARKERS=VALID DIGESTS=VALID
```

SR-008のfixture copyはidentity portabilityの事前検査にだけ使い、上記clean checkout／Git-freeの代替証拠にはしていない。

common runtime 3 pathのSHA-256はsource／clean checkout／Git-freeで一致した。

```text
61fe8a9ca207db3dd0039c1f98ea315f1c0f390a30bee69a771aa851849dc6c9  plugins/secretary/scripts/clarity.mjs
55a5383e432ff3ba9081ff9603d7c417ab7912da441a0ab29172c5be6855f02e  plugins/secretary/scripts/lib/clarity-core.mjs
d70610079f6c1d4812b62818b54c609a8940a9d2941419e91f2662b12871b345  plugins/secretary/scripts/lib/clarity-harness-scan.mjs
```

## 実行済み検証

| command | result |
|---|---|
| `node scripts/sprint-050-patch-005-test.mjs` | `PASS=9 FAIL=0 SKIP=0 NOT_RUN=1 TOTAL=10`、external write／network 0、Windows false |
| exact clean checkoutで同上 | 同じく`9/0/0/1` |
| Git-free exact archiveで同上 | 同じく`9/0/0/1` |
| `node scripts/sprint-049-inventory.mjs validate`（source／clean／Git-free） | 各面`PASS=20 FAIL=0 CASES=67 MARKERS=VALID DIGESTS=VALID` |
| SR-009内 `node scripts/sprint-050-patch-004-test.mjs` | exit 0。macOSではWindows専用4件をNOT-RUNとして維持 |
| SR-009内 `node scripts/sprint-050-patch-003-test.mjs` | exit 0 |
| SR-009内 `node scripts/sprint-041-test.mjs` | exit 0 |
| SR-009内 `node scripts/sprint-047-test.mjs` | exit 0 |
| SR-009内 `node scripts/sprint-049-test.mjs` | exit 0 |
| `node --check`（変更した`.mjs`） | 全件exit 0 |
| `git diff --check` | exit 0 |

最初の通常sandbox内`git add`は`.git/index.lock: Operation not permitted`で失敗した。製品fileの問題ではなくGit metadata書込権限の境界だったため、許可された昇格で同じ対象だけをstage／commitし、回避用Repoや別Git metadataは作っていない。

## Windows待ちと外部境界

- SR-010、Windows Server 2025／Node 22の因果的run、run ID／URL、0.9.2同居結果は未実行。`windowsVerified=false`、1 NOT-RUNを維持する。
- workflowは既存`windows-native`、`windows-2025`、Node 22、10分、0.9.2を維持し、Patch005 suiteを`--require-windows`で結線済み。
- Generatorはpush、workflow dispatch、remote変更、merge、release、tag、Marketplace、install、cache、live apply、Xmind、private my-vault／Yasashii writeを行っていない。
- 通常pushと、そのcandidateに因果する既存Windows CIはOrchestratorの責務。manual dispatchや別SHA／過去runを証拠にしない。
- public独立Evaluatorの判断前にdownstream handoff ready、private／Yasashii PASS、release-ready、installed、loadedへ昇格しない。

## Evaluator handoff

Evaluatorは製品candidate SHAとtreeを固定し、source／exact clean checkout／Git-freeでSR-001〜009、inventory 67 case、common 3 path digestを独立確認する。runtime Secret fixtureは値を記録せず、redacted理由、field coverage、sanitized identity一致、本文／断片／raw digestの非露出を操作で確認する。

Windowsでは同じcandidateに因果する既存workflow runで、Windows Server 2025、Node 22、Patch005 `--require-windows`、Patch004／既存0.9.2回帰、10分timeoutを確認する。SR-010が実行され0 FAILになるまでは、本progressからSprint PASSを推測しない。

## Generator補正 — stateライフサイクルに追随するSR-001（2026-08-31）

- 補正開始HEAD: `73ed397`
- 補正candidate commit: `a938f792786f16acdad9877138dd76403b2c5f66`
- 補正candidate tree: `51179ae7f1cf49de4288bc194379d37c88040582`
- 対象: verification-infraのみ。製品runtime candidate `5ab63d6455e919fb3bb825fc1c7448d3861e609b`、common runtime 3 path、workflow、spec／contract、state、feedbackは変更していない。

オーケストレーターがstateを正規に`awaiting-eval`へ進めた際、SR-001の実source assertionだけがstatusを`active`へ固定していたため、製品previewは整合しているのにsuiteが8 PASS／1 FAIL／1 Windows NOT-RUNとなった。synthetic fixtureの入力条件としての`active`は維持し、実sourceの期待値をtracked `docs/sprints/state.md`の構造行から独立に得るよう補正した。

補正後は、対象rowが一意でstatusが`active`／`awaiting-eval`／`done`の許可集合にあることを先に検査する。宣言Currentが対象Sprintなら`fallbackSource=null`／`inferred=false`、最終`Current ID: TBD`なら対象rowが`done`、`Next Planned: TBD`、`fallbackSource=last-recorded-completion`／`inferred=true`であることを要求する。state／bundle／4 role pathとstatus、candidate path、Evidence locator、`executionStatus`、Evaluator role／`validationStatus`を同じtracked lifecycleへ完全一致させ、最終done時はPASS feedbackを要求する。fenced code、HTML comment、inline code内の履歴例は期待値の正本にしない。

SR-001には次のtemporary lifecycle回帰を追加した。いずれも製品Repoやstateへのwriteはなく、OS一時directoryだけで実行した。

- Current対象＋`active` → `in_progress`、fallbackなし
- Current対象＋`awaiting-eval` → `implemented`、fallbackなし
- Current対象＋`done` → `implemented`、fallbackなし
- Current `TBD`＋対象`done` → `last-recorded-completion`、`inferred=true`

`scripts/sprint-050-patch-005-test.mjs`変更に伴う`clarity-harness-scanner` inventory digestだけを正規計算値へ更新した。case数、path、marker、feature割当、製品runtime digestは変更していない。

### 補正candidateの3面検証

source、exact clean detached checkout、同SHAのGit-free archiveを並列化せず順番に実行し、3面とも次を確認した。

```text
SPRINT050_PATCH005_PASS=9 FAIL=0 SKIP=0 NOT_RUN=1 TOTAL=10 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false
SPRINT049_INVENTORY_PASS=20 FAIL=0 CASES=67 MARKERS=VALID DIGESTS=VALID
SPRINT050_PATCH004_PASS=12 FAIL=0 SKIP=0 NOT_RUN=4 TOTAL=16 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false
SPRINT050_PATCH003_PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0
SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43
SPRINT047_TEST_PASS=25 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0
SPRINT049_PASS=20 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0
```

exact clean checkoutは実行前後とも`git status --short`が空で、HEAD／treeは補正candidateと一致した。Git-free面は`.git`不存在を確認した。`node --check scripts/sprint-050-patch-005-test.mjs`と`git diff --check`もexit 0。テスト一時fileは各suiteのcleanup対象だけで、external write／network callは0件である。

### 残る評価境界

- SR-010とPatch004のWindows専用4件はMacではNOT-RUN。Windows Server 2025／Node 22の同一candidate因果runが必要で、`windowsVerified=false`を維持する。
- 本補正はGenerator自己検査であり、独立Evaluator Verdictではない。
- push、manual workflow dispatch、remote変更、private my-vault／Yasashii write、merge／release／tag／Marketplace／install／cache／live apply／実Xmindは行っていない。
