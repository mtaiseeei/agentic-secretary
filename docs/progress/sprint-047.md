# Sprint 047: Drift DetectionとGit／filesystem／Secret hardening

**ステータス:** Generator実装・自動回帰完了、Evaluator独立評価待ち

## 実装結果

- 開始HEADは`57b3adc99b7da16c4dacc359c77f7fc7d8ef127b`。明示されたDecision／ADR／spec／meeting locatorと、current file／commit／diff／test／deployment locatorを、64KB・240行の上限内で比較するDrift comparatorを追加した。
- 比較結果は`unknown`、`aligned`、`possible_drift`、`drift`、`not_applicable`を区別する。Decisionと実装の`claim.field`／canonical value／markerを分け、双方の相対path・行範囲・digestをEvidence locatorとして保存する。source本文はEvidenceやoutputへ保存しない。
- email-first Decisionとcustomer_id-first codeを、双方の実file locatorから`drift`として検出する。markerが片側で不足する場合は`possible_drift`に留め、同義表現はcanonical valueが一致すれば`aligned`として扱う。
- 古いcommitは履歴Evidenceとして`unknown`に留め、current implementationと誤認しない。generated codeは生成物そのものより明示された`generatedFrom`をauthorityとして評価し、source authorityがない場合は断定しない。
- Decision変更、実装修正、Drift再検出の`alignment.changed`を純追加Eventとして保持する。waiverは理由・範囲・期限・active／revokedを`drift.waiver.recorded`へ追加し、Drift Eventを消さずにAttentionだけを抑制する。期限切れ後はAttentionへ再出現する。
- comparatorはworking root内の明示locatorだけを読む。absolute path、traversal、symlink／junction、`.git`、runtime、credential／Secret／transcript候補をcanonical write前に拒否する。Secretらしき値をsource内で検出した場合も、値をerror／Evidenceへ含めない。
- `.clarity/lock.json`に所有者・token・期限を持つ排他lockを追加した。Event／Evidence appendはlock内でcanonicalを再読込し、Stateとの一致を確認してから書き、Stateを同じ順序で再構築する。active lockは待機し、期限切れのClarity-owned lockだけを自動回復する。
- schema破損やState不一致は上書き修復せず停止する。明示`rebuild`だけがEvent／EvidenceからStateを再生成する。partial failure後は同じoperation IDで再実行するとEvidence／Eventが重複せず収束する。
- `clarity commit`をpreview／applyへ分離した。applyは`.clarity/`と`CLARITY.md`だけを`git commit --only`し、既存のdirty／staged／untrackedを保持する。自動push、checkout、restore、branch／remote変更は行わない。
- actual comparatorの結果をAttentionへ渡し、AT-003は`decision_implementation_drift`／Critical／rank 1、AT-004は`possible_drift`／High／rank 1として実fixtureから再評価した。Sprint 042の合成fixtureは補助回帰に留めた。

## 変更ファイル

- `plugins/secretary/scripts/lib/clarity-drift.mjs`
- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `plugins/secretary/scripts/clarity.mjs`
- `plugins/secretary/clarity/schemas/event.schema.json`
- `plugins/secretary/skills/clarity/SKILL.md`
- `scripts/sprint-047-test.mjs`
- `scripts/sprint-047-regression.sh`
- `docs/progress/sprint-047.md`

spec、Sprint契約、state、feedback、release metadata、private my-vault、Yasashii実repo、installed cache、marketplaceは変更していない。

## 25 case coverage

| Case群 | 対象 | PASS | FAIL |
|---|---:|---:|---:|
| Drift比較・遷移・waiver | DR-001〜010 | 10 | 0 |
| Git／filesystem／Secret／concurrency | GS-001〜015 | 15 | 0 |
| 合計 | registryの正確な25 ID | 25 | 0 |

`docs/spec/clarity-acceptance.md`のregistry JSONを直接parseし、missing 0、duplicate 0、extra 0を検査した。Critical 16件と本Sprint Acceptance Criteria 7項目の未実行は0件。AT-003／AT-004のactual comparator補助確認も2件PASSした。

## 自動検証

```bash
bash scripts/sprint-047-regression.sh
```

- exit 0、`SPRINT047_REGRESSION_PASS=25 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0`。
- Sprint 047 target: 25/25 PASS、Critical 16/16、AC 7/7。AT-003／AT-004 actual comparator: 2/2 PASS。
- 独立Git fixtureでDecision、current code、古いcommit、generated file、dirty／staged／untracked、Clarity-owned commit、root外canaryを検証した。explicit commit以外の成功／失敗操作でHEADは不変、全操作で既存index blob、working tree、branch、remote、visibility、canary digestは不変だった。explicit commitはClarity-owned pathだけをcommitした。
- concurrent stressはCLI 32件＋Hook 32件。終了後のEvent JSON parse 100%、Event ID uniqueness 100%、State rebuild 100%。期限切れlockから回復し、lock残骸0件を確認した。
- Secret canaryはCLI stdout／stderr／Evidence／canonical managed filesで0件。absolute／traversal／symlink／credential／transcript候補はcanonical write前に拒否した。
- Sprint 046: 34/34、Sprint 045: 35/35、Sprint 044: 40/40、Sprint 043 fixture: 29 PASS／0 FAIL／external-live 1 NOT-RUN、Sprint 042: 35/35、Sprint 041: 43/43。
- projects: 68/68、daily: 56/56、weekly: 38/38。
- release integrity: PASS。
- `claude plugin validate plugins/secretary --strict`: `Validation passed`。
- Node構文、全Clarity schema JSON parse、`git diff --check`: exit 0。

## 起動・CLI

常駐server、DOM、UIはなく製品surfaceはCLIとfilesystemであるため、test URLは非該当。

```bash
# comparison manifestをpreviewし、双方のlocatorと結果を確認する
node plugins/secretary/scripts/clarity.mjs drift <repo-root> --input-file <comparison.json> --json

# 確認後だけEvidence／Eventへ反映する
node plugins/secretary/scripts/clarity.mjs drift <repo-root> --input-file <comparison.json> --apply --json

# waiverは理由・範囲・期限をpreviewしてからapplyする
node plugins/secretary/scripts/clarity.mjs drift-waiver <repo-root> \
  --item-id <item-id> --reason <reason> --scope <scope> --expires-at <ISO-8601> --json
node plugins/secretary/scripts/clarity.mjs drift-waiver <repo-root> \
  --item-id <item-id> --reason <reason> --scope <scope> --expires-at <ISO-8601> --apply --json

# Clarity所有pathだけの明示commitもpreviewを先に行う
node plugins/secretary/scripts/clarity.mjs commit <repo-root> --message <message> --json
node plugins/secretary/scripts/clarity.mjs commit <repo-root> --message <message> --apply --json
```

## Evaluator向け具体scenario

1. 独立Git Repoを作り、email-firstを確定したDecision fileとcustomer_id-firstのcurrent codeを置く。Clarity Itemをconfirmed／implementedにし、dirty、staged、untracked、remote、visibility、root外canaryを準備して全digestを記録する。
2. 同一manifestをpreview／applyし、previewはwrite 0、applyは`drift`、双方のEvidence locator／digest、`decision_implementation_drift`／Critical／rank 1を返すことを確認する。Evidence、stdout、stderrにsource本文やcanaryがないことを確認する。
3. implementation markerだけを不一致にし、actual comparatorが`possible_drift`、Attentionが`possible_drift`／High／rank 1になることを確認する。Sprint 042の合成Stateを代用しない。
4. 同義表現、Decision変更、実装修正、古いcommit、generated source authorityあり／なしを個別に実行する。false positiveを避け、historyに過去のdrift／aligned Eventが残ることを確認する。
5. Driftへ期限付きwaiverをpreview／applyし、元のDrift Eventを保持したままAttentionだけが消えること、固定時刻を期限後へ進めると再出現することを確認する。revokedも同じEvent履歴境界で確認する。
6. partial failureをEvidence後とalignment前で注入し、既存dirty／stageへrollbackせず、同じoperation IDのretryでEvidence／Eventが重複せず収束することを確認する。
7. 32件のCLI Eventと32件のHook writeを同時実行する。全process exit 0、JSONL全行parse、Event ID重複0、明示rebuild後のState event count一致を確認する。active lock待機、期限切れowned lock回復、unknown lock非削除も敵対的に確認する。
8. root外symlink／junction、`../` traversal、absolute path、`.git`、Secret／credential／transcript candidateを渡し、canonical write前に拒否することとroot外canary不変を確認する。
9. Event JSONLとState JSONを別々に破損し、drift applyが破損bytesを上書きしないことを確認する。Eventを復元後、Stateは明示`rebuild`だけで修復する。
10. Clarity canonicalを変更し、別fileをstaged／dirtyのまま`commit` preview／applyする。新commitがClarity-owned pathだけ、既存stage blob、working tree、branch、remote、visibilityが不変でpush 0件であることを確認する。
11. `bash scripts/sprint-047-regression.sh`でTarget 25件、Sprint 041〜046、projects／daily／weekly、release integrityを再実行する。

## Known issues／正直な未検証

- Sprint 047の自動targetと関連回帰に製品FAILはない。ただしGeneratorの自己評価であり、EvaluatorのPASS判定ではない。
- 汎用semantic search、万能Secret parser、external deployment verificationはNon-scopeであり、実装・検証していない。
- 実顧客Repo、private my-vault、Yasashii実repo、実connector、実利用者workspace、Mac mini、installed plugin/cache、marketplace、GitHub remoteは未検証・未変更。
- Sprint 043から継続する`XM-007`実Xmind MCP external-liveはNOT-RUN。local fixtureのcredential非保存を確認しただけで、実Xmind App／MCPをverifiedへ昇格していない。
- junctionはMac／Nodeで同じsymlink拒否境界を通る設計だが、Windows実junction fixtureは未実行。
- 実deployment、network、push、tag、releaseは未実行。

## 外部副作用

- network／GitHub／connector／Xmind live call: **0件**
- external Repo／private repo／実利用者workspace write: **0件**
- push／tag／release／remote変更: **0件**
- 実task／relation／customer data write: **0件**
- 書込みは本repoのGenerator所有差分と、各test終了時に削除したOS temporary fixtureだけ。
