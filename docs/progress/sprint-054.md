# Sprint 054 — Project Clarityを含む0.12.0の3版公開とこのMacへの反映

**ステータス:** 公開Agentic版の限定実装と承認済みfixture追随完了 - 再評価待ち

## 着手範囲

- 受入済みSprint 051〜053とProject Clarity F64〜F81を、公開Agentic版の製品・配布面で意味統合する。
- Windowsで再現したCHANGELOGのCRLF解析、Clarity Hookの未知top-level field、`0.12.0`のmanifest／marketplace／inventory／案内面だけを修正する。
- 新しいrunnerや検証frameworkは追加せず、既存の限定回帰を個別に実行する。

## 検証方針

- このMacでは64 actor stressを実行しない。`scripts/agentic-regression.sh`は末尾から`scripts/sprint-047-regression.sh`、さらに64 actorの`scripts/sprint-047-test.mjs`を呼ぶため、wrapper全体も実行しない。
- 安全な既存componentを個別に実行し、64 actor stressは最終candidateのWindows CIへ引き渡す。
- 本作業単位はmodel／effort継承が未検証のcapacity fallbackであり、ここでの自己確認は独立EvaluatorのPASS判定ではない。

## 実装内容

- 受入済みSprint 051〜053とProject Clarityの競合4面を意味統合した。Windows workflowはGit取り込みとClarityの回帰を両方保持し、READMEはGoogle Chatの取得限界とID非捏造を保持した。neutral inventoryは統合後の実bytesへ合わせ、weeklyは原本取得不能時の安全停止と独立Clarity sectionを両方残した。
- `plugins/secretary/hooks/hooks.json`のtop-levelを`description`と`hooks`だけにし、Clarity collaboration markerを`description`内へ移した。Hook event、router、manual fallbackは削除していない。
- CHANGELOG解析前にCRLF／単独CRをLFへ正規化し、Windows checkoutでも5 sectionの箇条書きを同じ意味で読めるようにした。Sprint 032へCRLF回帰を1件追加し、先頭判定をLF／CRLF両対応にした。
- Claude Code／Codex manifest、Claude marketplace、release／host／handoff metadataと現行assertを`0.12.0`へ揃えた。正本CHANGELOGとlegacy互換CHANGELOGに5 sectionの`0.12.0` entryを追加し、byte一致と過去entryを維持した。
- README／getting started／Project Clarity guideを`0.12.0`の公開準備状態へ揃え、版別更新依頼文へのguide索引を追加した。案内は未公開Releaseを導入済みと扱わない。
- collaboration inventoryとconversation core inventoryを統合後の実bytesへ更新した。Clarity SkillをVoice共通entrypointの17番目のSkillとして追跡し、独立したClarity inventoryは20 surface／67 caseを維持した。

## 変更ファイル

- 製品／配布: `.claude-plugin/marketplace.json`、`.github/workflows/windows-recording-regression.yml`、`README.md`、`adapters/downstream-clarity-handoff.json`、`adapters/neutral-base.json`
- plugin: `plugins/secretary/.claude-plugin/plugin.json`、`plugins/secretary/.codex-plugin/plugin.json`、`plugins/secretary/CHANGELOG.md`、`plugins/yasashii-secretary/CHANGELOG.md`、`plugins/secretary/hooks/hooks.json`、`plugins/secretary/scripts/update-diagnose.mjs`、`plugins/secretary/skills/weekly/SKILL.md`
- inventory: `plugins/secretary/release-inventory.json`、`plugins/secretary/host-inventory.json`、`plugins/secretary/collaboration-inventory.json`、`plugins/secretary/conversation-core-inventory.json`
- 案内: `docs/guide/README.md`、`docs/guide/getting-started.md`、`docs/guide/project-clarity.md`。Orchestrator準備済みの`docs/guide/update-0.12.0.md`と4カード画像を配布案内として参照した。
- 既存検査の現行版追従: `scripts/agentic-codex-plugin-test.mjs`、`scripts/archive-release-gate.mjs`、`scripts/check-release-integrity.py`、`scripts/master-release-gate.mjs`、`scripts/sprint-032-update-gate-test.mjs`、`scripts/sprint-033-test.mjs`、`scripts/sprint-035-test.mjs`、`scripts/sprint-038-patch-001-test.mjs`、`scripts/sprint-038-test.mjs`、`scripts/sprint-048-handoff.mjs`、`scripts/sprint-048-test.mjs`、`scripts/sprint-048-validator.mjs`、`scripts/sprint-052-secretary-voice-test.mjs`

## 自己確認

| 確認 | 結果 |
|---|---|
| `python3 scripts/check-release-integrity.py` | PASS |
| `node scripts/sprint-048-validator.mjs` | 25 PASS / 0 FAIL、17 Skills、4 hosts |
| collaboration inventory直接検証 | 20 surfaces / 67 cases、digest／marker PASS |
| `node scripts/sprint-032-update-gate-test.mjs` | 16 PASS / 0 FAIL（CRLFを含む） |
| `node scripts/sprint-051-git-ingest-test.mjs` | 45 PASS / 0 FAIL（darwin限定面） |
| `node scripts/sprint-052-secretary-voice-test.mjs` | 3 PASS / 0 FAIL |
| `bash scripts/sprint-010-regression.sh` | 56 PASS / 0 FAIL |
| `bash scripts/sprint-012-regression.sh` | 38 PASS / 0 FAIL |
| `bash scripts/sprint-015-regression.sh` | 74 PASS / 0 FAIL |
| `node scripts/sprint-049-test.mjs` | 20 PASS / 0 FAIL、critical 15、side-effect violation 0 |
| `node scripts/agentic-codex-plugin-test.mjs` | 4 PASS / 0 FAIL |
| `node scripts/sprint-033-test.mjs` | 20 PASS / 0 FAIL |
| `node scripts/sprint-035-test.mjs` | 15 PASS / 0 FAIL |
| `node scripts/sprint-038-patch-001-test.mjs` | 6 PASS / 0 FAIL |
| `node scripts/sprint-038-test.mjs` | 67 PASS / 0 FAIL |
| JSON parse／canonical-legacy `cmp`／Node構文 | PASS |
| Orchestrator実行 `claude plugin validate plugins/secretary --strict` | exit 0 / Validation passed（manifest検証のみ。loaded／Hook動作のPASSではない） |

この自己確認は公開Agentic版の限定実装に対するGeneratorの確認であり、Sprint 054の独立Evaluator判定ではない。Clarity統合前の規模確認は製品8,763行、検証8,712行で、今回新しいrunner／framework／網羅suiteは追加していない。
途中、Sprint 052の初回実行は統合前digestが残ったconversation inventoryで1 FAILだった。実bytesとClarity Skillを既存inventoryへ反映後、3 PASS／0 FAILで再実行済みである。

## 自己評価（公開Agentic版の限定範囲）

| 基準 | スコア(1-5) | コメント |
|---|---:|---|
| 機能完全性 | 4 | 公開版の競合、Hook、CRLF、0.12.0配布面は実装済み。Sprint全体の下流・公開・導入は後続。 |
| 動作安定性 | 5 | 対象の既存回帰とinventory／manifest検査は0 FAIL。 |
| デザイン性 | 3 | 案内文の整合は確認したが、4カード画像の独立render評価は未実施。 |
| 独自性 | 4 | Clarity、Git取り込み、Voice、LLM中心整理を同じ配布説明へ統合した。 |
| エラーハンドリング | 5 | CRLF、同一版、downgrade、旧0.7.0 blockerの停止境界を維持した。 |
| 回帰なし | 5 | 051／052と既存010／012／015、Clarity inventoryの限定回帰が通過。 |

## 技術的な判断

- CHANGELOG parserは新しいversion parserへ作り替えず、解析入口で改行だけを正規化した。
- inventoryは検証を無効化せず、既存digest方式で現在の実bytesへ更新した。
- Hook markerは未知fieldとして削除するのではなく、対応済み`description`へ同じ文字列を移した。

## 既知の課題・未実行

- `bash scripts/agentic-regression.sh`は**未実行**。末尾で`scripts/sprint-047-regression.sh`を呼び、その中の`scripts/sprint-047-test.mjs`が1 roundあたり32 CLI＋32 Hookを同時起動するため、このMacの64 actor禁止に該当する。
- `node scripts/agentic-archive-gate.mjs`も**未実行**。末尾で同じSprint 047 wrapperへ到達する。Git-free archiveの安全componentはmerge commit後にOrchestratorが個別実行し、64 actor stressはWindows CIへ分ける。
- Windows nativeのSprint 051／CRLF／Clarity stress、HookのClaude Code／Codex実host読込、4カード画像の独立render確認は未実施。
- public archive、candidate commit／SHA固定、Windows CI、独立Evaluator、private／Yasashiiへの適応、main統合、tag、GitHub Release、marketplace、installed cache、このMacへのprivate版導入は未実施。3版公開済みとは扱わない。

## Evaluatorへの引き渡し

- 起動方法: server起動は不要。plugin sourceと既存Node／shell検査を使う。
- テスト対象URL: 該当なし。案内画像は`docs/guide/assets/secretary-0.12.0-overview-clarity.png`をrender対象とする。
- 安全な基線: 上表の個別command。Macでは64 actorへ到達する2 wrapperを実行しない。
- 確認シナリオ: Hook JSONのtop-levelが`description`／`hooks`のみでmarkerと5 eventが残ること、LF／CRLF CHANGELOGが同じ`0.12.0`5 sectionになること、正本／legacy CHANGELOGがbyte一致すること、4改善と公開準備中の表現がREADME／guide／CHANGELOGで一致することを確認する。

## 現在の保留

- archive、Windows CI、下流2版、main統合、tag／GitHub Release、private版の実導入は本限定作業の後続とする。

## Verification-only fixture追随（ユーザー選択1）

- 製品コードの変更は0行。既存の検証script 2ファイルだけを変更した1 roundである（検証script差分 `+49/-8`）。新runner、framework、collector、case削減、期待閾値の緩和は0件。
- `scripts/sprint-011-regression.sh` は実在するtemplates 5面＋17 Skillsの22 surfaceに数とlabelを合わせた。serializer参照とschema重複検査は維持した。
- `scripts/sprint-020-adversarial-test.mjs` のfake Gitに、現行`ingestGit()`のroot、branch、remote、fetch対象、commit関係、dirty無し、fast-forward、事後確認の正常応答を追加した。run相関の正式分類 `run-correlation-unconfirmed`／`run-correlation` へ追随し、過去success、`createdAt`欠落／不正／dispatch前、pull 1回のみ、`pull-after-sync`／`retry-same-query`禁止のassertを維持・明示化した。

### 限定再確認

| command | 結果 |
|---|---|
| `bash scripts/sprint-011-regression.sh` | 73 PASS / 0 FAIL |
| `node scripts/sprint-020-adversarial-test.mjs` | 16 PASS / 0 FAIL |
| `bash scripts/sprint-020-regression.sh` | wrapper 16 PASS / 0 FAIL、内訳020本体 50/0、adversarial 16/0 |
| `node scripts/sprint-045-test.mjs` | 35 PASS / 0 FAIL、registry missing / duplicate / extraはすべて0 |
| `node --check scripts/sprint-020-adversarial-test.mjs` / `bash -n scripts/sprint-011-regression.sh` / `git diff --check` | PASS |

- 上記4対象は実行前に内部spawnを確認し、すべて逐次実行した。Macで禁止されたSprint 044／047、64 actor、`agentic-regression.sh`、`agentic-archive-gate.mjs`、Sprint 048 testへの到達は0件。
- Nodeプロセス数は開始前18〜19、Sprint 045実行中の観測23、終了後18で、開始禁止40／中断60を下回った。自分が起動したserver、browser、watcherは無い。
- 初回の020再実行でfake Gitのpull後`FETCH_HEAD`固定不足、2回目で旧run error名の不一致を検出した。いずれもfixture内だけで修正し、最終実行は上表のとおりgreen。

### 再評価への引き渡し

- 差分対象は上記2 scriptと本progressのみ。製品source、spec、Sprint契約、state、feedbackは変更していない。
- Evaluatorは011、020 adversarial／wrapper、045のgreenと、差分が安全入口やnegative assertを迂回していないことを確認する。Phase A全体の再固定・判定とC21／C22の残る証拠確認は独立Evaluator／Orchestrator側の後続とする。
