# Sprint 047 評価結果

**判定:** 合格
**分類:** PASS
**評価対象:** Sprint 047 — Drift DetectionとGit／filesystem／Secret hardening
**Generator candidate:** `4493fa660c41f40cc54e27d85f2772cae3eb5667`
**評価開始HEAD:** `b51ab6dda9e543c58e3b0f4f904dd45a79f2bbf5`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**Escalation Recommendation:** none

## 結論

Generatorのfixtureとは別に、新しい独立Git Repo
`/var/folders/k1/582ptqfx73l_t0glc9q1hck40000gn/T/s047-adversarial-evaluator-YKWD5b/nebula-routing-repo`
を作り、実製品CLIとHookを操作した。

- exact Targetは25/25 PASS、registry missing／duplicate／extraは各0、Critical 16/16、Acceptance Criteria 7/7で未実行0だった。
- email-first Decisionとcustomer_id-first current codeは、双方の相対locator／digestを持つ`drift`となった。previewはwrite 0、apply後はactual `decision_implementation_drift / critical / rank 1`だった。
- 片側marker不足はactual `possible_drift / high / rank 1`だった。同義、古いcommit、generated source authorityあり／なし、`unknown`、`not_applicable`を個別に操作し、根拠なしのconfirmed driftは0件だった。
- Decision変更、実装修正、再drift、期限付きwaiver、期限切れ、revokeを固定時刻で操作した。元Drift Eventと全alignment／waiver transitionを保持し、Attentionだけが抑制・再出現した。
- `after-evidence`と`before-alignment`の2地点でpartial failureを注入し、同じoperation IDのretryでEvidence／Event重複0、State収束、既存dirty／stage／untrackedへのrollback作用0を確認した。
- Generatorと異なる件数でCLI 17件＋Hook 23件を並行実行した。全40 process exit 0、JSON parse 100%、Event ID unique 100%、State rebuild 61/61、lock残骸0だった。
- absolute、traversal、root外symlink、`.git`、credential、Secret value、transcript候補の7負例はcanonical write前に拒否された。stdout／stderr／Evidence／canonicalのSecret canaryは0件、root外canary digestは不変だった。
- Event JSONLとState JSONを別々に破損し、applyが破損bytesを上書きしないことを確認した。Event復元後もStateは明示`rebuild`だけで修復した。
- Clarity明示commit成功は`.clarity/events.jsonl`、`.clarity/evidence.jsonl`、`.clarity/state.json`だけを含んだ。既存stage blob、dirty／untracked、branch、remote、visibilityを保持し、push 0件だった。pre-commit failureでも同じGit snapshotへ留まった。
- `bash scripts/sprint-047-regression.sh`はexit 0。Sprint 047、041〜046、projects／daily／weekly、release integrityはすべてgreenだった。

Acceptance Criteria未達0、新規product finding 0、新規verification-infra finding 0、全採点閾値通過のため、Sprint 047を合格とする。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 5/5 | 4 | PASS | Target 25、Critical 16、AC 7を同じ独立candidateで実操作し、未実行0 |
| C2 構文・整合 | 5/5 | 5 | PASS | Node構文、Clarity schema、registry、State rebuild、strict validator、release integrity、diff checkが成立 |
| C3 機能の実証 | 5/5 | 4 | PASS | 実CLIでDrift正負例、transition、waiver、partial、corruption、Git commitを固定時刻fixtureで操作 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | plain CLIはalignment、理由、変更有無、Attention、次の一手を日本語で示す。補助的なinternal enumは残るが判断を妨げない |
| C5 安全・規律 | 5/5 | 5 | PASS | path／symlink／Secret／dirty／stage／lock／schema／push境界に違反0、root外canary不変 |
| C6 無回帰 | 5/5 | 5 | PASS | 047、041〜046、projects 68、daily 56、weekly 38、release integrityが0 FAIL |
| C7 やさしさ | 4/5 | 4 | PASS | preview、partial、失敗時に変更有無と次の行動を示し、規律省略なし。CLI技術語の軽微な改善余地のみ |
| C19 Clarity正本・状態モデル | 5/5 | 5 | PASS | Event／Evidence／State分離、純追加transition、破損safe stop、決定的rebuild、履歴保持が成立 |
| C20 Attention・Clarity UX | 5/5 | 4 | PASS | actual comparatorからDrift／possibleを正しくrank 1へ出し、waiver中だけ抑制、期限切れ／revokeで再出現 |
| C22 federated link・sync・Drift | 5/5 | 5 | PASS | 双方Evidence、possible境界、old commit／generated authority、履歴保持、cross-root write 0が成立 |
| C24 Clarity安全・統合・public-first | 5/5 | 5 | PASS | path／Secret／dirty／stage／schema／lock／retryと関連Skill回帰が成立し、downstream／release／cache／external write 0 |

C8〜C18、C21、C23はSprint 047の新規採点対象外である。C22のlink／sync部分は依存Sprint 046の直接回帰を再実行し、Sprint 047ではDrift comparatorを独立採点した。

## Acceptance Criteria

| AC | 判定 | 独立実行証拠 |
|---|---|---|
| 1. Target 25、Critical／AC未実行0 | PASS | registryから正確な25 ID、Critical 16 IDを独立抽出。25/25、16/16、AC1〜7実行 |
| 2. email-firstとcustomer_id-first、根拠不足possible | PASS | `docs/routing-decision.md`と`src/customer-route.ts`の双方locator／digestで`drift`。marker不足は`possible_drift` |
| 3. false positive抑制と履歴 | PASS | 同義`aligned`、old commit`unknown`、generated sourceあり`aligned`、なし`unknown`＋apply拒否、Decision／code修正後も過去transition保持 |
| 4. Git利用者状態不変 | PASS | staged blob `cb137b241e0ebd8178a44563706ff2d6a356a46f`、dirty／untracked、branch `evaluation-main`、remote、visibility `internal-only`を成功／失敗で保持 |
| 5. root外／Secret／corruptionをwrite前拒否 | PASS | 7負例をexit 3で拒否。canary非露出、root外digest `b43f5fba67f56cc5817ca3296eaf7db5bb527af5171a6937122d7c734b13e946`不変 |
| 6. concurrency／lock／rebuild | PASS | CLI 17＋Hook 23、exit／parse／unique各100%、rebuild 61/61。active待機、expired owned回復、unowned保持、最終lock残骸0 |
| 7. actual AT-003／AT-004 | PASS | 同じ実comparatorから`decision_implementation_drift / critical / rank 1`と`possible_drift / high / rank 1`を取得 |

## Target 25件／registry

`docs/spec/clarity-acceptance.md`のregistry JSONを独立parseし、次の正確な25 IDを確認した。

- `DR-001`〜`DR-010`
- `GS-001`〜`GS-015`

結果はunique 25、missing 0、duplicate 0、extra 0。case本文のSeverityを独立照合し、Criticalは次の16件、実行16件、未実行0だった。

- `DR-001`、`DR-004`、`DR-010`
- `GS-001`〜`GS-009`
- `GS-011`、`GS-012`、`GS-013`、`GS-015`

## 独立Drift／transition証拠

### Fixtureと開始状態

- source Repo: `nebula-routing-repo`
- Clarity Item ID: `ci_3f77a93a94f0fbfbb926`
- branch: `evaluation-main`
- remote: `https://example.invalid/nebula-routing.git`
- visibility fixture: `internal-only`
- Decision: email addressを第一キー
- current code: customer_idを第一キー
- 利用者状態: staged／dirty／untrackedを各1件
- root外canary: 別directoryの1 file。値は証跡へ保存せずdigestだけ記録

実行した主コマンドは次のとおり。

```bash
node plugins/secretary/scripts/clarity.mjs init <fixture-root> --json
node plugins/secretary/scripts/clarity.mjs init <fixture-root> --apply --json
node plugins/secretary/scripts/clarity.mjs drift <fixture-root> --input-file <comparison.json> --json
node plugins/secretary/scripts/clarity.mjs drift <fixture-root> --input-file <comparison.json> --apply --json
node plugins/secretary/scripts/clarity.mjs drift-waiver <fixture-root> --item-id <id> --reason <reason> --scope <scope> --expires-at <time> --apply --json
node plugins/secretary/scripts/clarity.mjs attention <fixture-root> --limit 20 --json
node plugins/secretary/scripts/clarity.mjs history <fixture-root> --json
```

観測結果。

1. init previewとdrift previewはいずれもtree／canonical digest不変だった。
2. main applyは`alignment=drift`、Evidence 2件、双方の相対locatorとcontent digestを返した。source本文はoutput／Evidenceに保存しなかった。
3. implementation markerだけを不存在にしたmanifestは`possible_drift`となり、Critical表現を使わなかった。
4. canonical claim valueを同じ`email-first`にし、本文markerを別表現にした同義fixtureは`aligned`だった。
5. 初回source commitを明示した`git-commit` locatorは`historical-implementation-not-current`、`current=false`、`alignment=unknown`だった。
6. generated fileにsource authorityを付けるとsource側を評価して`generated-source-aligned`。authorityなしは`generated-source-authority-missing / unknown`で、applyはexit 3・write 0だった。
7. `applicable=false`は`not_applicable`を返し、write 0だった。
8. Decision変更、code変更で各`aligned`へ進み、再度codeを不一致にすると`drift`へ戻った。historyには過去のdrift／alignedを保持した。
9. active waiverはDrift Eventを削除せずAttentionだけを抑制した。固定時刻を期限後へ進めるとDriftが再出現し、`status=revoked`も即時再出現した。waiver Eventはactive／revoked各1件だった。

## partial failure／retry

Generator fixtureと異なるlocator、field、operation IDを2組使った。

### Evidence後の失敗

```bash
CLARITY_DRIFT_FAIL_AT=after-evidence \
  node plugins/secretary/scripts/clarity.mjs drift <fixture-root> \
  --input-file <partial-a.json> --apply --json
```

- 初回exit 4、code `drift-partial`
- Evidenceは2件保存、対象operationのEventは0件
- 同じoperation IDのretry後はEvidence合計2件のまま、対象Event 5件、Event ID重複0

### alignment前の失敗

```bash
CLARITY_DRIFT_FAIL_AT=before-alignment \
  node plugins/secretary/scripts/clarity.mjs drift <fixture-root> \
  --input-file <partial-b.json> --apply --json
```

- 初回exit 4、code `drift-partial`
- Evidence 2件、evidence link Event 4件、alignment Event 0件
- 同じoperation IDのretry後はEvidence 2件、対象Event 5件、Event ID重複0

両failure／retryで、既存index blob、dirty／untracked本文、HEAD、branch、remote、visibility、root外canary digestは不変だった。製品は利用者差分をrollbackしなかった。

## concurrent CLI／Hookとlock

Generatorの32＋32とは異なる件数で次を同時実行した。

- CLI canonical Event: 17 process
- Hook `PostToolUse`: 23 process

観測結果。

- 40/40 process exit 0
- canonical Event JSONL parse 100%
- runtime Hook event JSON parse 100%
- canonical／runtimeそれぞれEvent ID unique 100%
- canonical stress Event 17/17
- runtime Hook event 23/23
- 明示rebuildのState event count 61、Event JSONL 61で一致
- stress後の`.clarity/lock.json`残骸0

lockは3状態を個別に操作した。

1. 有効なClarity-owned lockを置き、別processのwrite開始後約350msでfixture ownerが解放した。write processは待機後exit 0で完了した。
2. 期限切れClarity-owned lockはwrite時に回復し、操作完了後のlock残骸0だった。
3. 期限切れでもownerが第三者のlockは削除せず、約15秒待機後`canonical-lock-busy`、exit 4となり、lock bytesを保持した。検査後はEvaluatorがfixtureを後始末した。

## path／Secret／corruption

次の7負例を個別にapplyした。

| 負例 | exit | code | canonical write |
|---|---:|---|---:|
| absolute path | 3 | `drift-path-invalid` | 0 |
| `..` traversal | 3 | `drift-path-invalid` | 0 |
| root外fileへのsymlink | 3 | `drift-path-symlink` | 0 |
| `.git/config` | 3 | `drift-path-sensitive` | 0 |
| credential名のfile | 3 | `drift-path-sensitive` | 0 |
| transcript名のfile | 3 | `drift-path-sensitive` | 0 |
| source本文にSecret canary | 3 | `drift-secret-detected` | 0 |

- stdout、stderr、`.clarity/evidence.jsonl`、project／Event／Evidence／Stateの全canonicalにcanary 0件。
- canonicalにfixture absolute path、root外path、transcript locator 0件。
- root外canary digestは開始後とも`b43f5fba67f56cc5817ca3296eaf7db5bb527af5171a6937122d7c734b13e946`。
- `.clarity/xmind-credential.json`は存在せず、Xmind credential候補0件。
- Macのroot外symlinkで実検証した。Windows junctionをMacのsymlink結果へ昇格していない。

corruptionは別々に作った。

1. Event JSONL末尾へ不正bytesを追加し、drift applyを実行した。exit 3、`jsonl-invalid`、破損bytesはbyte一致で保持された。
2. Eventを正常bytesへ復元した後、State JSONを破損した。drift applyはexit 3、`state-json-invalid`、破損State bytesを保持した。
3. `clarity rebuild`を明示実行した時だけStateが正常JSONへ戻った。

## Git／filesystem安全性

### 成功commit

```bash
node plugins/secretary/scripts/clarity.mjs commit <fixture-root> \
  --message "Independent Clarity snapshot" --json
node plugins/secretary/scripts/clarity.mjs commit <fixture-root> \
  --message "Independent Clarity snapshot" --apply --json
```

- previewはwrite 0。
- 新commit: `15bb18db7742d5d461ee3a550f173d3c66bd5b2d`
- commit対象:
  - `.clarity/events.jsonl`
  - `.clarity/evidence.jsonl`
  - `.clarity/state.json`
- `.clarity/runtime/`、projectionのuntracked、利用者staged／dirty／untrackedはcommitへ混入0。
- 既存stage blob OID `cb137b241e0ebd8178a44563706ff2d6a356a46f`と本文を保持。
- branch、remote、visibilityを保持。remote tracking ref作成0、push 0。

### 失敗commit

Clarity Eventを追加後、fixtureのpre-commit hookをexit 19にし、明示commit applyを実行した。

- 製品CLI exit 3、code `clarity-commit-failed`
- HEAD、commit count、既存stage blob、dirty／untracked本文、branch、remote、visibilityは開始前と一致
- 失敗後のpush 0

projectionもpreview write 0、apply後はClarity-owned projectionだけを生成し、無関係な`generated/route.ts`のdigestを維持した。

## 回帰証拠

実行コマンド。

```bash
bash scripts/sprint-047-regression.sh
claude plugin validate plugins/secretary --strict
git diff --check
```

結果。

- Sprint 047: `25 PASS / 0 FAIL`、registry missing／duplicate／extra各0、Critical `16/16`、AC `7/7`
- actual AT-003／AT-004: `2/2 PASS`
- Sprint 046: `34/34 PASS`
- Sprint 045: `35/35 PASS`
- Sprint 044: `40/40 PASS`
- Sprint 043: `29 PASS / 0 FAIL / 1 conditional NOT-RUN`
- Sprint 042: `35/35 PASS`
- Sprint 041: `43/43 PASS`
- projects: `68/68 PASS`
- daily: `56/56 PASS`
- weekly: `38/38 PASS`
- release integrity: PASS
- Claude strict validator: `Validation passed`
- Node構文、Clarity schema JSON parse、`git diff --check`: exit 0

Sprint 043の1 NOT-RUNは、既記録の実Xmind MCP external-liveであり、Sprint 047のTarget／ACではない。isolated adapter結果をreal provider verifiedへ昇格していない。

## Candidate diffとscope

`57b3adc99b7da16c4dacc359c77f7fc7d8ef127b..4493fa660c41f40cc54e27d85f2772cae3eb5667`を確認した。

- 変更は8 file、894 insertions／47 deletions。
- 製品変更はClarity core／drift／CLI／event schema／Clarity Skillに閉じ、test／regression／progressを追加している。
- spec、Sprint契約、state、release metadata、private my-vault、Yasashii、installed cache／marketplace変更はcandidateに0件。
- 実顧客Repo、private repo、実利用者workspace、connector、Xmind live、network、push、tag、release、Sprint 048以降へのwrite 0件。

## Finding分類

- `product`: 新規finding 0件。
- `verification-infra`: repo内の新規finding 0件。

評価中、一時Evaluator script側で3点を自己修正した。

1. 利用者Git snapshotへClarity-owned statusまで含めていたため、operator-owned pathだけへ比較範囲を修正した。
2. Evidence schemaに保存されない補助comparison fieldで件数を照合していたため、正本のlocatorで照合した。
3. Hook runtime eventのsession subdirectoryを非再帰で数えていたため、再帰JSON parseへ修正した。

いずれも一時評価コードだけの問題で、製品候補やrepo内回帰基盤は変更していない。修正後は新しいfixtureを最初から作り直し、最終runをPASS根拠とした。

## ブラウザ／スクリーンショット

Sprint 047の製品surfaceはCLI、Git、filesystem、Hookであり、常駐server、DOM、画面、responsive／visual採点はない。契約のsafe harborどおり実command、exit code、JSON、Git snapshot、filesystem digestで評価したため、browser操作とスクリーンショットは非該当である。

## 残余リスク／未検証境界

- Windows native junctionは未検証。Macのroot外symlinkで代用PASSとしていない。
- 汎用semantic search、万能Secret parser、external deployment verificationはNon-scope。
- 実顧客Repo、private my-vault、Yasashii実repo、実connector、実Xmind MCP、実利用者workspace、installed cache／marketplace、Mac miniは未検証・未変更。
- 実network、push、tag、release、downstream反映は未実行。
- `not_applicable`はread-only comparison結果とwrite 0を確認した。本SprintのTarget caseとsafe harborに永続化要件はないため、applyによるEvent化を追加合否条件にしていない。

上記は契約どおり未検証またはNon-scopeであり、Sprint 047のproduct failureではない。

## 懐疑的self-review

1. 公式runnerだけでなく別ID、別locator、別件数、別Git branch／remote／visibility、別failure operationを使用した。
2. 単なるexit 0ではなく、実JSON値、Event／Evidence件数、ID uniqueness、State source count、Git object、tree／canary digestを照合した。
3. successだけでなく、Secret、path、symlink、active／expired／unowned lock、2 partial地点、Event／State corruption、commit hook failureを操作した。
4. fake external provider、実顧客data、Windows未実行をPASSへ昇格していない。
5. evaluator harness自身の誤りをproduct findingへ混ぜず、修正後のfresh最終runだけを根拠にした。
6. source本文とSecret canary値をfeedbackへ記録せず、digest／件数／error codeだけを証拠化した。
7. Candidateの実装主張と独立観測が一致することを確認したが、Generatorのassert helperやfixture生成物は再利用していない。

以上より、判定をPASSとする。
