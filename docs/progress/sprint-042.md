# Sprint 042: Attention、doctor、migration、bounded UX

**ステータス:** Generator実装完了、Evaluator待ち

## 実装したこと

- public共通の`clarity-core.mjs`へ、13個のAttention reasonと正本default levelを実装した。固定時刻でvalidation pending 14日、未決定30日を判定し、severity、disposition、impact、urgency、age、dependency、conflict、validation、人間override、Item IDの順で決定的に並べる。
- `evaluateAttention`はcanonical State／Evidenceを直接入力できる純粋な製品関数である。`AT-003`／`AT-004`／`AT-008`／`AT-009`はこの入口へ合成canonical fixtureを渡し、reason／level／rankingだけを評価する。実syncや実Drift comparatorのPASSには代用していない。
- `clarity attention`と`status`は、通常表示を結論→理由→根拠→選択の順にし、既定3件＋その他件数へ制限した。Attentionなし、推定、未検証、根拠不足を日本語で区別し、不透明なClarity scoreを出さない。JSONにはcommand、path、Evidence ID、残件数を持つtechnical handoffも含めた。
- `checkpoint.recorded`と`attention.resolved` Eventを追加した。同じoperation IDのEvidence／Eventは内容由来IDで重複せず、Evidence後または解消履歴後のpartial retryでも未完了分だけを終える。解消済みAttentionはactiveから外れ、`history`に残る。
- schema v2を追加し、v1をreader互換として保持した。`migrate`の既定はread-only preview、`--apply`だけがdirectory swapを行う。before swap／backup後／swap後の失敗はいずれも旧`.clarity/`へ戻し、retryでv2へ収束する。Project、Event、Evidence、Item、Stateの未知fieldを不要に破壊しない。
- `doctor`はmode、schema、projection、Hook、link、lockを分け、Hook／linkの後続Sprint面は「未検証」または「未設定」と表示する。期限切れruntimeはcleanup previewへ出すが、成功扱いしない。
- `cleanup`は既定read-only previewで、`--apply`時も名前、所有者marker、有効期限を再確認したClarity所有の期限切れruntimeだけを削除する。利用者file、所有不明file、期限内runtimeは保持する。
- `clarity` Skillへattention、checkpoint、migrate、cleanupの手動fallbackと確認境界を追加した。Hook liveがなくてもCLIから同じ製品面を利用できる。

## 実装しなかったこと

Mermaid／Xmind、Hook live、Secretary統合、link／sync、実Drift comparator、Portfolio、task作成、connector、network、packaging／release、cache、downstream反映は実装していない。Xmind MCP／local fallbackや`.xmind` fileは作成していない。Sprint 041 feedbackのP-01／V-01に関係するREADME／Sprint 019検査も変更していない。

## 35 case coverage

| Case群 | 対象 | PASS | FAIL |
|---|---:|---:|---:|
| Attention | AT-001〜AT-014、AT-016〜AT-018 | 17 | 0 |
| Idempotency／Migration／Doctor | IM-001、004、006〜009、013〜014 | 8 | 0 |
| UX／日本語 | UX-001〜UX-010 | 10 | 0 |
| 合計 | registryの正確な35 ID | 35 | 0 |

`scripts/sprint-042-test.mjs`は`docs/spec/clarity-acceptance.md`の単一registry JSONを直接parseし、Sprint 042割当と実行IDを照合する。結果はmissing 0、duplicate 0、extra 0である。assert対象はreason／level／順序、Evidence、固定時刻、repeat順序、Event／Evidence件数、tree digest、schema、unknown field、failure／retry、owned runtime tree、CLIの構造化dataであり、表示文言だけのsnapshotには依存していない。

## 起動・手動CLI

server／test URLはない。CLI製品である。

```bash
node plugins/secretary/scripts/clarity.mjs status <repo-root>
node plugins/secretary/scripts/clarity.mjs attention <repo-root>
node plugins/secretary/scripts/clarity.mjs history <repo-root>
node plugins/secretary/scripts/clarity.mjs checkpoint <repo-root> --operation-id <stable-id> --json
node plugins/secretary/scripts/clarity.mjs doctor <repo-root>

# どちらも既定はwrite 0のpreview
node plugins/secretary/scripts/clarity.mjs migrate <repo-root> --json
node plugins/secretary/scripts/clarity.mjs cleanup <repo-root> --json

# 利用者がpreview内容を確認した後だけ
node plugins/secretary/scripts/clarity.mjs migrate <repo-root> --apply --json
node plugins/secretary/scripts/clarity.mjs cleanup <repo-root> --apply --json
```

## 実行結果

- `bash scripts/sprint-042-regression.sh` → `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`、`SPRINT042_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`。
- `bash scripts/sprint-041-regression.sh` → `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`、Sprint 041直接回帰PASS。
- `bash scripts/sprint-015-regression.sh` → `PASS=68 FAIL=0`（既存generic Project／Decision seam）。
- `node scripts/sprint-021-git-safety-test.mjs` → `PASS=71 FAIL=0`。
- `node scripts/sprint-022-safety-test.mjs` → `SPRINT022_PASS=69 SPRINT022_FAIL=0`。
- `node scripts/sprint-023-security-test.mjs` → 制限sandboxではloopback bindが`EPERM`。外部通信なしのlocal-only実行で再実行し、`SPRINT023_PASS=21 SPRINT023_FAIL=0`。
- `python3 scripts/check-release-integrity.py` → `PASS release integrity: manifests and CHANGELOG are consistent`。
- `git diff --check` → exit 0。schema JSON 5件もparse成功。

全masterは今回再実行していない。Sprint 041で記録済みのSprint 019 README 1件（P-01／V-01）は今回差分外であり、対象外READMEや検査期待値を混ぜて直していない。

## Self-evaluation

- C19: v1 reader互換、v2 Event／Evidence／State、byte安定rebuild、unknown field保持、checkpoint履歴を専用caseとSprint 041の43件で確認した。
- C20: 全reasonの正本level、stable ranking、override、bounded表示、推定／未検証／根拠不足、解消履歴を17 AT＋10 UX caseで確認した。
- C24: preview write 0、atomic migration rollback、partial retry、cleanup所有再確認、safe path、既存Git／Secret回帰を確認した。
- 実sync／authority生成／Drift比較を合成fixtureで実装済みとは主張しない。今回確認したのは契約どおりAttention評価面だけである。

## Known issues／正直な未達

- Sprint 042対象35 caseに既知の未達はない。
- stalenessの製品既定値はコード上でvalidation pending 14日、未決定30日として明示している。固定時刻または環境注入時刻だけで判定し、実行時刻による順序揺れを避ける。
- Hook、link、Xmind providerの実状態は本Sprintでは検証しない。doctorは未検証を明示し、正常へ昇格しない。
- full masterの既知Sprint 019 debtはgreenと報告しない。

## Evaluatorの具体的な確認手順

1. `bash scripts/sprint-042-regression.sh`を実行し、35 IDの順序、35/35、registry missing／duplicate／extra 0を確認する。
2. AT-003／004／008／009のfixtureが`evaluateAttention`へ合成canonical State／Evidenceを直接渡し、実sync／実Drift comparatorを呼ばないことを確認する。Driftは両Evidence、possibleは断定しない文言を確認する。
3. 同じ5 Itemを逆順に渡しても同一順序、上位3件＋その他2件となること、人間overrideが同level内で安定して先に来ることを確認する。
4. checkpointをEvidence後にfailure injectionし、retry／再retry後のEvidence件数不変、同operationの`checkpoint.recorded` 1件を確認する。状態解消後はactive 0、`history.resolvedAttention`に旧reasonが残ることを確認する。
5. v1 fixtureでmigrate preview前後tree digest一致、apply後v2、Event ID履歴一致、再apply差分0を確認する。backup後failureではtree byte一致とv1利用可能を確認し、その後retryでv2へ収束させる。
6. Project／Event／Evidence／Item／Stateに未知fieldを持つv1 fixtureを移行し、各値が保持されることを確認する。
7. `.clarity/runtime/`へClarity所有stale lock、所有不明file、期限内operationを置く。doctorの候補、preview write 0、apply後にstale lockだけが消えることを確認する。
8. 通常CLIで結論→理由→根拠→選択、推定、未検証、Attentionなし、「決定×実行クラリティマトリクス」と4つの日本語labelを確認する。migration failure JSONでerror、変更なし、次の一手を確認する。
9. `bash scripts/sprint-041-regression.sh`とSprint 015／021／022／023の関連安全回帰を実行する。Sprint 023は127.0.0.1 bind可能なlocal-only環境で行う。

## 外部副作用

- external write: **0件**
- network／external connector／Xmind live: **0回**
- push／release／cache／downstream write: **0件**
- migration／cleanup／checkpointの製品fixture writeはOS temp directory内だけ。安全回帰のpush確認はtemporary local bare remoteだけで、外部remoteへ送信していない。

## Retry 1 — F-01／V-01限定修正

### 修正内容

- EvaluatorのF-01を再現し、expired Clarity-owned lockだけを削除した後の空`.clarity/runtime`へfile向け`rmSync`を実行していたことを根本原因と確認した。
- owned runtime fileの実削除結果から`removed`と`changed`を算出するようにした。空runtime directoryは、owned fileを実際に削除した場合だけ、working root内の削除path、通常directory、symlinkではないこと、空であることを再検証し、空directory専用の`rmdirSync`で削除する。
- 再検証後にentryが増えた場合は再帰削除せず保持する。directory後処理が失敗しても、既に削除したowned fileを「変更なし」と誤案内せず、`runtimeDirectory`へ保持理由を返す。
- 開始時から空のruntimeは削除せず`unchanged`とする。user file、unowned file、期限内owned operationを削除する条件は追加していない。既存のpreview、所有者／期限再確認、safe path／symlink境界も維持した。

### V-01回帰追加

- 35 case registryは変更せず、Critical `IM-014`へEvaluator独立再現と同じ「expired owned lockだけ」のCLI fixtureを追加した。
- previewはexit 0、write 0、candidate 1、`changed:false`。applyはexit 0、`status: cleaned`、`changed:true`、実際のremoved path一致、lockと空runtime directoryの消滅をassertした。
- 同じapplyのretryはexit 0、`status: unchanged`、`changed:false`、removed 0件へ収束することをassertした。
- 開始時から空runtimeのapplyがexit 0、`unchanged`、write 0でruntimeを保持する負ケースも追加した。既存のuser file／期限内operation保持caseも同じ`IM-014`内で継続している。

### Retry 1検証結果

- `bash scripts/sprint-042-regression.sh` → `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`、`SPRINT042_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`、wrapper 4/4。
- `bash scripts/sprint-041-regression.sh` → `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`、wrapper 4/4。
- `bash scripts/sprint-015-regression.sh` → `PASS=68 FAIL=0`。
- `node scripts/sprint-021-git-safety-test.mjs` → `PASS=71 FAIL=0`。
- `node scripts/sprint-022-safety-test.mjs` → `SPRINT022_PASS=69 SPRINT022_FAIL=0`。
- `node scripts/sprint-023-security-test.mjs` → sandbox内は127.0.0.1 bindが`EPERM`。外部通信なしのlocal-only実行面で再実行し、`SPRINT023_PASS=21 SPRINT023_FAIL=0`。
- `python3 scripts/check-release-integrity.py` → `PASS release integrity: manifests and CHANGELOG are consistent`。
- Clarity schema JSON 5件parse → `SCHEMA_JSON_PASS=5`。
- `git diff --check` → exit 0。

### Retry 1自己評価と引き渡し

- C1／C4／C24: F-01の正常applyとretry非収束を解消し、CLI resultを実状態へ一致させた。
- C19／C20およびAttention、checkpoint、migration、doctorは変更していない。Sprint 042 35/35とSprint 041 43/43で無回帰を確認した。
- 起動方法、テスト対象、回帰command、Evaluator確認手順は上記初回handoffから変更なし。再評価では`IM-014`のexpired-only CLI fixture、開始時空runtime、user／live file保持を優先確認する。
- 既知のSprint 019 P-01／V-02、Attention、migration、後続Xmind／Hook／Secretary／sync／Driftへ変更を広げていない。
- external write、network、connector、Xmind live、push、release、cache、downstream writeはRetry 1でも0件。
