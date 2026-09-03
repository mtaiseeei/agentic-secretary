# Sprint 050 Patch 006 Generator進捗 — state.md限定256 KiB読取

- 開始HEAD: `39864adb74ed109f0ff30a4c09037aa59b2e0ace`
- 担当: Generator（自己検査とEvaluator handoffのみ。Evaluator PASSは宣言しない）
- 実装日: 2026-09-02
- 対象: `sprint-050-patch-006`（Type: micro、Model Tier strong）
- 現在地: public sourceの実装とFable read-only reviewの限定補正、focused／scanner回帰完了。Windows nativeとfresh独立Evaluator待ち

## 着手時の実装契約

- development-pointerの最初に読むファイルが正確に`docs/sprints/state.md`の場合だけ、canonical Repo observationの読取上限へ既存metadata上限256 KiBを適用する。
- その他のfirst fileは64 KiBを維持し、256 KiB超のstate、Secret、binary／NUL、symlink、unsafe、unreadableを既存理由でfail closedする。
- focused回帰は既存`scripts/sprint-050-patch-003-test.mjs`の既存case内へ追加し、Case ID／registry／collector／workflowを増やさない。
- 現行Harness authoritative scannerとCurrent ID parserは製品変更せず、`scripts/sprint-050-patch-005-test.mjs`で回帰確認する。
- public sourceとOS一時directoryのsynthetic fixtureだけを対象とし、private／Yasashii、cache、install、release、merge、実Repo applyは行わない。

## 成功確認

- 194,857 bytes、256 KiB、256 KiB＋1の正確なstateと、一般fileの64 KiB／64 KiB＋1、類似path、安全negativeを確認する。
- status、daily、weekly、Portfolioが同じsource revision／first-file digest／freshnessへ収束し、全経路で`changed:false`、canonical／Git／network write 0、filesystem／Git不変を確認する。
- focused回帰とPatch 005 scanner回帰を0 FAILで完走し、Windows nativeは同一candidateに因果するCIがない限りNOT-RUNのまま引き渡す。

## 実装内容

- `observeCanonicalRepoImpl()`のfirst-file読取で、pointerの解決値が文字列として正確に`docs/sprints/state.md`の場合だけ`CANONICAL_METADATA_MAX_BYTES`（256 KiB）を渡す。その他は従来の`CANONICAL_ENTRY_MAX_BYTES`（64 KiB）のままとした。
- `safeCanonicalFile()`本体、Secret／binary／NUL／symlink／unsafe／unreadableの判定順、availability／freshness、Harness authoritative scanner、Current ID parserは変更していない。
- 既存CF-003へ194,857-byte stateを使うstatus／daily／weekly／Portfolioの収束、`changed:false`、canonical／Git／network write 0、filesystem／Git snapshot不変を追加した。
- 既存CF-005へ次の補助matrixを追加した。新しいCase ID、registry、collectorは追加していない。

| first file | size／状態 | 結果 |
|---|---:|---|
| exact `docs/sprints/state.md` | 194,857 bytes | `inspected:true`、`bytesRead:194857`、digest一致 |
| exact `docs/sprints/state.md` | 256 KiB | `inspected:true`、`bytesRead:262144`、digest一致 |
| exact `docs/sprints/state.md` | 256 KiB＋1 | `file-too-large`、本文非採用 |
| `README.md` | 64 KiB | `inspected:true`、`bytesRead:65536` |
| `README.md` | 64 KiB＋1 | `file-too-large` |
| `docs/sprints/state-copy.md` | 64 KiB＋1 | `file-too-large` |
| `./docs/sprints/state.md`／traversal／absolute | - | `path-unsafe` |
| backslash表記 | 70 KiB | 256 KiB例外を受けず、Windowsでは`file-too-large`、POSIXでは`missing` |
| case違い `docs/sprints/State.md` | 70 KiB | 256 KiB例外を受けず、case-insensitive filesystemでは`file-too-large`、case-sensitiveでは`missing` |
| exact state＋Secret-like content | 64 KiB超・256 KiB以下 | `secret-like-content`、canary非露出 |
| exact state＋NUL | 64 KiB超・256 KiB以下 | `binary` |
| exact state symlink | 参照先canaryあり | `symlink-not-followed`、参照先本文非露出、観測前後の存在／内容不変 |
| exact state unreadable | 64 KiB超・256 KiB以下 | macOSのmode／Windowsの既存ACL補助で`unreadable` |

- 製品file変更に伴い、既存collaboration inventoryのうち同fileを含む6 surfaceのcontent digestだけを再計算した。surface、path、marker、Case ID、件数は変更していない。
- `.github/workflows/windows-recording-regression.yml`は変更していない。既存`windows-native` jobがPatch 005を実行し、そのSR-009がPatch 003 focused回帰を子processで実行する結線を維持した。
- Fable read-only reviewの限定補正として、backslash表記とcase違いpathの直前に同じ70 KiB state fixtureを固定した。これにより64 KiB上限と256 KiB例外を識別でき、外部symlink canaryも観測直前／直後の存在とcontentが不変であることを近接assertした。

## 変更file

```text
plugins/secretary/scripts/lib/clarity-secretary.mjs
scripts/sprint-050-patch-003-test.mjs
plugins/secretary/collaboration-inventory.json
docs/progress/sprint-050-patch-006.md
```

Planner所有の`docs/spec*`／Sprint契約、Orchestrator所有の`docs/sprints/state.md`、Evaluator所有の`docs/feedback/**`は編集していない。Harness scanner、Current ID parser、workflow、private／Yasashii、cache、install、manifest、version、release面も変更していない。

## 実行結果

| command | result |
|---|---|
| `node --check plugins/secretary/scripts/lib/clarity-secretary.mjs` | exit 0 |
| `node --check scripts/sprint-050-patch-003-test.mjs` | exit 0 |
| `git diff --check` | exit 0 |
| `node scripts/sprint-050-patch-003-test.mjs` | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| `node scripts/sprint-049-inventory.mjs validate` | `PASS=20 FAIL=0 CASES=67 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-050-patch-005-test.mjs` | `PASS=9 FAIL=0 SKIP=0 NOT_RUN=1 TOTAL=10 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false` |

Patch 005のSR-009は同一process treeでPatch 004、Patch 003、Sprint 041、Sprint 047、Sprint 049、inventoryを子回帰として実行し、すべて0 FAILだった。現行Harness authoritative scanner製品fileとCurrent ID parserの差分は0件である。

### Fable限定補正後の再実行（2026-09-02）

| command | result |
|---|---|
| `node --check scripts/sprint-050-patch-003-test.mjs` | exit 0 |
| `git diff --check` | exit 0 |
| `node scripts/sprint-050-patch-003-test.mjs` | `PASS=21 FAIL=0 TOTAL=21 EXTERNAL_WRITES=0 NETWORK_CALLS=0` |
| `node scripts/sprint-049-inventory.mjs validate` | `PASS=20 FAIL=0 CASES=67 MARKERS=VALID DIGESTS=VALID` |
| `node scripts/sprint-050-patch-005-test.mjs` | `PASS=9 FAIL=0 SKIP=0 NOT_RUN=1 TOTAL=10 EXTERNAL_WRITES=0 NETWORK_CALLS=0 WINDOWS_VERIFIED=false` |

この補正roundの差分は検証codeとGenerator progressだけで、製品code変更は0行である。Patch全体では既存candidate `7fcc9fce536693ec2f0cb6acdd4e3374e705b83b`に製品code変更を含むが、本roundではその製品実装、scanner、parser、workflow、registry、spec、state、feedbackを変更していない。

## 自己評価（micro-patch）

| 基準 | スコア | 根拠 |
|---|---:|---|
| 機能完全性 | 5/5 | exact stateだけ256 KiB、他file 64 KiB、上限＋1と安全negativeを既存case内で確認 |
| 動作安定性 | 5/5 | focused 21/21、Patch 005 9/9実行対象、関連回帰・inventory 0 FAIL |
| 回帰なし | 5/5 | scanner／parser／workflow差分0、CF／AR件数21とinventory 20 surface／67 caseを維持 |

今回の差分はverification-onlyではなく製品codeを含む。一方、境界値と安全negativeの固定によりtest差分は製品diffより大きい。新しいcase／registry／collector／workflowは作らず、ユーザー承認済みの既存focused case内matrixに限定した。

## NOT-RUN／残余境界

- macOSではWindows専用SR-010を`NOT-RUN requires-windows-native`とし、`WINDOWS_VERIFIED=false`を維持した。同じproduct／test candidateに因果するWindows Server 2025／Node 22の既存CIは未実行であり、Windows PASSを主張しない。
- fresh独立Evaluatorの再現・軽量3軸採点と、Orchestratorによるstate更新は未実施。本progressはEvaluator Verdictではない。
- UI変更がないためbrowser／DOM／screenshotは非該当。Linux native、実顧客Repo、Mac mini対象Repo、private my-vault、Yasashii、installed cache、実Xmind／connector／providerは未実施。
- push、PR操作、workflow dispatch、merge、version bump、CHANGELOG、manifest、tag、GitHub Release、Marketplace、install／reinstall、cache、new sessionは未実施・未変更。
- external／downstream writeは0件。検証のfilesystem writeはOS一時directory内のsynthetic fixtureだけで、正本Repo観測は全経路read-onlyだった。

## Evaluatorへの引き渡し

- 起動方法: CLI libraryのためdev serverなし。
- テスト対象URL: 非該当。
- focused回帰: `node scripts/sprint-050-patch-003-test.mjs`
- scanner／関連回帰: `node scripts/sprint-050-patch-005-test.mjs`
- inventory: `node scripts/sprint-049-inventory.mjs validate`
- 最初にfocused 21 caseを実行し、CF-003の4 surface収束とCF-005内のサイズ／安全matrixを独立確認する。その後Patch 005を実行してscanner／parser差分0、関連回帰、inventoryを確認する。
- Windowsは同一candidateに因果する既存`windows-native` jobでPatch 005→Patch 003の間接結線を確認し、runがない限りNOT-RUNのままにする。新しいworkflow／job／collectorは要求しない。
