# Sprint 054 — Project Clarityを含む0.12.0の3版公開とこのMacへの反映

**ステータス:** 公開Agentic版の限定実装、Windows Hook／CLI Git identity process削減完了 - exact Windows再評価待ち

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

## Windows Hook 31/32と日本語判定の限定修正（追加承認後）

### 診断

- exact Windows run `34007865815`の`GS-009`は、第1 roundが32 CLI＋32 Hook、canonical／Hook delta、State rebuild、residue、時間境界をすべてPASSした。第2 roundは64 child exit 0、canonical 32、Hook JSON／ID一意性を通過した後、Hook runtime eventだけ31/32で停止した。第2 roundの後続assertと第3 roundは未実行である。
- stress fixtureの32 Hookは`turn-0`〜`turn-31`とtouched pathが固有で、`stableEventId`の入力は重ならない。Hook eventは共通fileへの追記ではなく固有fileの`O_EXCL`作成である。
- 一方、各Hookの初回root解決は`Hook Node → external-runner Node → git rev-parse`を起動していた。root／Git identity確認が失敗すると`inspectClarityHookRootImpl()`が`null`へ変換し、routerはstdout／stderr空、exit 0、runtime event 0で終わる。1 actorの合成fixtureで、通常時はevent 1、Git probe不能時はexit 0／出力空／event増分0を確認し、Windowsの観測形と同じ欠落経路を再現した。
- Windowsの欠落child個別stdoutは元runに残っていないため、具体的なOS error codeは未確定である。本修正は原因を断定したretryではなく、観測済みの無言欠落経路を診断可能にし、その直前の余分なprocess段を減らす限定対策である。

### 製品修正

- `plugins/secretary/scripts/lib/clarity-root.mjs`にHook限定の直接Git identity probeを追加した。Hookだけを`Hook Node → git rev-parse`へ短縮し、CLI／canonical write側の`runExternalSync`経路は変更していない。
- probeは従来と同じ1回、`5,000ms`、`1 MiB`、`shell:false`、同じargv／Git環境を使う。retry、timeout延長、lease延長、lock wait変更は0件。`SIGKILL`を明示し、timeout後にleaf processを残さない。
- 直接停止の保証対象は通常の`git rev-parse`単体leafである。任意の`git` wrapperが独自に孫processを起動する場合のprocess-group停止を新たに保証する変更ではなく、Hookの通常probeを越える外部process設計は追加していない。
- filesystem／Git top-level／Git dir／common dir／config digest／environment digestとwrite前root identity再検証は既存`resolveClarityRoot()`内に残し、root-changed／unsafe／timeout／max-bufferのfail-closed分類を維持した。既存のtest用Git runner注入はHook wrapperから上書きしない。
- Hook診断を明示した既存stress時だけ、root解決failureをdegradedとして返し、許可済みの短いcodeだけを表示する。通常の未初期化Repoは引き続きstdout／stderr空のno-opで、absolute path、利用者本文、Secretを出さない。
- `CLARITY_HOOK_DIAGNOSTIC=1`は既存Windows stressが欠落時のcodeを得るための診断専用envで、manifest／host通常起動では設定しない。常設機能、利用者設定、host inventory capabilityへは昇格していない。

### 既存検証の修正

- `scripts/sprint-047-test.mjs`はcase、actor、round、assert、timeoutを変えず、Hook件数不一致時だけ欠落index、`no-output`／`degraded`、許可済みsafe codeをbounded JSONのassert detailへ含める。raw stdout、payload、path、利用者本文は出さない。
- `scripts/sprint-050-patch-005-test.mjs`の`expectedEvaluatorStatus()`を、製品scannerと同じ構造化行の規則へ揃えた。英語`Verdict`と日本語`判定`のPASS／FAIL／合格／不合格、明示的`verification-scope-issue`だけを読み、code fence、HTML comment、任意の説明文は判定根拠にしない。
- 日本語`判定: 不合格`と本文中`verification-scope-issue`が併存するfixtureは`failed`を期待する。正当なfeedback本文と製品scannerは変更していない。
- 既存inventoryのpaths／case／markerを変えず、実bytesが変わった`clarity-hook`、`clarity-root-policy`、`clarity-harness-scanner`の3 `contentDigest`だけを再計算した。

### 低並列の自己確認

| 確認 | 結果 |
|---|---|
| Hook直接probeのtimeout合成fixture（1 actor） | `durationMs=5058`、Hook exit 0、safe `timeout`、absolute path漏洩なし、fake Git child残留なし |
| Hook直接probeのmax-buffer合成fixture（1 actor） | Hook exit 0、`clarity-git-output-invalid`、absolute path漏洩なし、診断出力294 bytes |
| Hook低並列fixture | 4 actors、exit 4/4、degraded 0、stderr 0、runtime event 4/4 |
| Hook wrapperと既存test runner注入 | injected runner 1 call、上書きなし、non-Git分類維持 |
| 通常の未初期化Repo | exit 0、stdout／stderr空、write 0 |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface、67 case、marker／digest VALID |
| `node scripts/sprint-049-test.mjs` | 20 PASS / 0 FAIL、critical 15、side-effect violation 0 |
| `node scripts/sprint-047-patch-004-test.mjs` | 13 PASS / 0 FAIL、Git probe 1回、timeout 5,000ms、path canary 0 |
| `node scripts/sprint-050-patch-003-test.mjs` | 21 PASS / 0 FAIL、external write 0、network 0 |
| 変更5 JSの`node --check`と`git diff --check` | PASS |

- 実行時のNodeは`v26.7.0`。開始前／終了後の実Node process数は21／21で、自分が起動したserver、browser、watcher、fake Gitは残していない。
- `node scripts/sprint-050-test.mjs`も実行したが、変更対象のcaseへ入る前に既存primary meaning／severity digestの不一致で停止した。今回の製品／test差分に`docs/spec/clarity-acceptance*.md`は含まれず、この固定値は変更していないため、本修正のPASS証拠には採用せず既存不整合として引き渡す。
- Mac禁止の`sprint-044-test.mjs`、`sprint-047-test.mjs`、`sprint-050-patch-005-test.mjs`、`agentic-regression.sh`、`agentic-archive-gate.mjs`、`sprint-048-test.mjs`、master gateと、それらへ到達するwrapperは実行していない。32 CLI＋32 Hook、Windows 3 round、100%成功はexact candidateのWindows CIで再確認が必要である。

### 規模と再評価への引き渡し

- この追加roundは製品／metadata `+84/-26`、既存検証 `+67/-6`（progressを除く）。製品変更を含むためverification-onlyではなく、直前のverification-only 1 roundとの連続2回条件には該当しない。新runner、framework、collector、case、matrixは0件。
- Orchestratorは今回の全変更を含むclean candidate SHAを固定し、Macではなく既存Windows workflowでP005の`SR-001`と`SR-009`を確認する。`SR-009`は3 round各32 CLI＋32 Hook、100%、既存timeout／lease／residue／rebuildを一切緩めず評価する。失敗時は追加したsafe diagnosticだけから原因を再分類し、再実行を繰り返してgreenだけを採らない。
- このGenerator自己確認はSprint 054、Phase A、Windows gateのPASS判定ではない。downstream、main、tag、Release、marketplace、installへ進む判断は独立EvaluatorとOrchestratorへ残す。
- Fable 5.1 highによるread-only補助レビュー（Herdr `w4:p2`、session `b1598b34-1e1f-4883-98fd-ad88a01e84ad`）はblocker 0、medium 1、low 3。上記leaf／diagnostic env境界を記録した。括弧付き判定とindent code行は既存product scannerの未変更解釈であり、本修正では基準・意味を拡大していない。Fableはファイル編集・test実行・正式Evaluator判定を行っていない。

## Hook Git probeの共通process安全境界への復帰とSprint 050 pin追随

### 製品修正

- `clarity-root.mjs`からHook限定の直接`spawnSync`を撤去した。Hook入口だけは既存の非同期`runExternal()`を直接awaitし、通常rootでは`Hook Node → git`の1 leafを維持する。CLIと他の同期root APIは既存`runExternalSync()`のままである。
- Git probe requestは1つのpure helperから生成し、既存と同じ`git rev-parse` argv、`5,000ms`、`1 MiB`、`allowFailure:true`、`GIT_OPTIONAL_LOCKS=0`、`GIT_TERMINAL_PROMPT=0`へ固定した。`runExternal()`の`shell:false`、POSIX process group、SIGTERM→SIGKILL、max-buffer、listener／timer cleanupをそのまま使い、独自timeout実装は追加していない。
- await前と各await直後、同期callback開始直前、prefetch結果の消費直前に、requested／physical root、filesystem identity、ancestor alias、全ancestorの`.git` marker、top／git dir／common dir、common／worktree config、Git discovery環境を照合する。待機中に変わった状態を新しいbaselineとして採用せず、write前の既存revalidationも維持した。
- prefetch結果はbinary、完全argv（`-C` rootを含む）、cwd、input、encoding、timeout、max-buffer、allowFailure、label、完全envへ束縛する。同じ同期Hook request内で完全一致する同一identity probeだけは、各利用時のfull boundary再確認を通して再利用できる。global runnerの差替えはawait完了後の同期callback中だけで、`finally`で戻す。test用runnerが注入済みなら上書きしない。
- Hookのfilesystem-only候補探索は既存のdepth 64、親Clarity探索、ancestor alias限定許可、root自身とroot内`.clarity`／project／state symlink拒否を保つ。通常rootはprobe 1回、subdirectoryから親rootを探す場合は旧意味どおりdistinct physical pathごとに逐次、最大2回とし、nested Git repoのcwd結果を親Clarity rootへ流用しない。先頭probeがtimeout／max-buffer／spawn errorなら後続parent probeを開始しない。
- 未初期化または通常の安全拒否は従来どおり無言no-op、`Stop`だけ`{}`を返す。明示済み`CLARITY_HOOK_DIAGNOSTIC=1`の既存stress経路だけsafe code付きdegradedを返し、path、env、stderr、Git出力を露出しない。

### 検証基盤の限定修正

- `scripts/sprint-022-safety-test.mjs`の既存「主要production callsiteを共通安全境界へ集約」assertへ`clarity-root.mjs`を加えた。既存の同test内にあるtimeout／max-buffer時の孫process、後続副作用、再試行、listener／timer cleanup負例をHookが使う同じ`runExternal()`へ結線した。case、閾値、runnerは追加・削減していない。
- `scripts/sprint-050-test.mjs`の`BASELINE.semantic.primary`だけを、受入済み現行値`6c073e574638b2e9382e0521a936c9b4605eea7ccc03dbabd21d0953d5b0bba8`へ更新した。`5f08d45…`とのprimary 250行比較は差分`PK-001`だけで、Critical、Sprint 048割当、他249行は不変だった。`e961833`の契約と`sprint-050-patch-002`の独立PASSもread-only確認した。allocation、CLX／XV semantic、final recheck、mutation拒否、runnerは変更していない。
- 製品3pathの変更に伴うcollaboration inventoryは`clarity-hook`と`clarity-root-policy`の既存digestだけを再計算した。surface、path、marker、caseは変更していない。

### 低並列の自己確認

| 確認 | 結果 |
|---|---|
| 変更5 JSの`node --check`、`git diff --check` | PASS |
| `node scripts/sprint-022-safety-test.mjs` | 69 PASS / 0 FAIL。direct production sync API 0、timeout／max-buffer後の孫process・副作用0、再試行とtimer cleanupを含む |
| `node scripts/sprint-047-patch-004-test.mjs` | 13 PASS / 0 FAIL。config matrix 8、direct config change 2、probe 1、5秒、path canary 0 |
| Hook subdirectory／nested Git repo内cwd | 各1 actor PASS。親Clarity rootを正しく解決しdegraded 0 |
| Hook timeoutのfake Git wrapper＋孫process | 1 actor、約6.1秒でsafe timeout。孫process、後続副作用、fixture residue 0 |
| Hook max-buffer | 1 actor、約0.7秒で`clarity-git-output-invalid`。timeout前に終了 |
| await中の`.git/config`差替え | 1 actor、`clarity-root-changed / repo-git-identity-changed`、runtime write 0 |
| 通常silent Stop／test runner注入 | unsupported configでも`{}`、注入runner 1 callで上書きなし |
| primary 250の旧accepted source比較 | 250 unique、意味差はPK-001だけ、Severity Critical不変、現digest`6c073e…` |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface / 67 case、marker／digest VALID |
| `node scripts/sprint-049-test.mjs` | 20 PASS / 0 FAIL、Critical 15、side-effect violation 0 |

- 実行前のhost Node数は19、Sprint 022実行中の観測も19で、開始禁止40／即時中断60を下回った。自分が起動したserver、browser、watcher、fake Git、孫processは残していない。
- Orchestrator所有`state.md`を除く現diffは、製品／metadataが`+194/-73`、検証scriptが`+2/-1`で、検証コードが製品コードを上回っていない。verification-only roundでもない。

### 未実行とEvaluatorへの引き渡し

- Mac禁止のSprint 044、Sprint 047、Sprint 048 test、Sprint 050 full／coverage-only／P005、agentic master／archive／regressionと、それらへ到達するwrapperは実行していない。case数、32 CLI＋32 Hook、3 round、timeout、lease、lock wait、100%閾値は変更していない。
- clean candidate固定後のfull offline master、Sprint 050 `--e2e-only`、candidate／archive確認、exact Windows P005／047はOrchestratorへ引き渡す。Windowsでは前回と同じ3 round各32 CLI＋32 Hook、canonical／Hook delta、parse／unique／rebuild、residue 0、wait 15秒未満、lease 30秒未満を再評価する。
- 本作業は公開Agentic sourceの限定修正であり、Phase AまたはSprint 054全体のPASSを意味しない。private／Yasashii、main、tag、Release、marketplace、install、実workspaceは変更していない。

## Fable最終レビュー F-A — ancestor alias rootの同一probe再利用

### 再現と修正

- Fable最終read-onlyレビューのhigh F-Aを、既存低並列`Sprint 047 Patch 004`へactual Hook child 1 actorで追加した。構成は`alias-workspace -> physical-workspace`で、cwdはalias配下の実directory `repo`そのもの（depth 0）。working root自身をsymlinkにする構成とは分離した。
- 修正前はHook childがexit 0／stdout・stderr 0のままruntime event `0`件となり、追加caseだけが`0 !== 1`で失敗した。同じalias requestをroot探索中に2回解決する一方、1回だけprefetchしたGit identity結果を`consumed` filterが2回目に渡さず、silent no-opへ閉じていた。
- `clarity-root.mjs`のprefetch request照合から消費済みfilterだけを外した。同じ同期Hook callback内でbinary、完全argv、cwd、input、encoding、5秒、1 MiB、allowFailure、label、完全envが一致するrequestだけが同じ結果を再利用でき、各利用時にrequested／physical root、filesystem identity、ancestor alias、Git marker／directory／config、envを再確認する。外部spawnは増えず、通常rootの単一probe、POSIX process-group cleanup、CLI経路は不変である。
- 修正後は同じactual Hook childがruntime event `1`件を記録した。別のactual Hook childでworking root自身をsymlinkにしたnegativeはexit 0／stdout・stderr 0／runtime event `0`件のままで、root-self symlinkを許可していない。

### 限定自己確認

| 確認 | 結果 |
|---|---|
| 修正前 `node scripts/sprint-047-patch-004-test.mjs` | 13 PASS / 1 FAIL。唯一のFAILは`HOOK-ALIAS`のevent `0 !== 1` |
| 修正後 `node scripts/sprint-047-patch-004-test.mjs` | 14 PASS / 0 FAIL。ancestor alias正例 event 1、root-self symlink負例 event 0 |
| `node scripts/sprint-022-safety-test.mjs` | 69 PASS / 0 FAIL。直接同期process API 0と共通process cleanup境界を維持 |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface / 67 case、marker／digest VALID |
| 変更source／testの`node --check`、`git diff --check` | PASS |

- 変更bytesに対応し、既存inventoryは`clarity-root-policy`と、既存低並列testを収載する`clarity-harness-scanner`のdigestだけを再計算した。surface、path、marker、case IDは変更していない。
- Fable low F-Bは候補walkが旧implより安全側に閉じる差であり変更しない。F-Cはdiagnostic reasonが粗いだけで漏えい・誤許可がなく変更しない。F-Dの`.git` symlink拒否は既存どおりで、許可へ広げない。
- 現worktree累計は製品／metadata約`+196/-73`に対し検証約`+57/-1`で、検証コードは製品コードを上回っていない。本follow-upは小さい製品修正と既存suite内の正負回帰を含み、verification-only連続roundではない。新suite／runner／framework／case IDは0件。
- Mac禁止の044／047／048／050 full／coverage／P005、master／archive／regression wrapper、Windows CIは実行していない。commit、candidate push、Windows／master、Phase A判定、downstream／release／installはOrchestratorへ残す。

## Windows Git identity timeoutへのevent限定process削減

### 原因範囲と実装

- exact Windows run `34018986578`／job `101447948026`では、P005の`SR-009`から起動されたSprint 047 `GS-009`が、Clarity root Git identityの`timeoutMs: 5000`を返してmetric出力前に停止した。失敗actorがCLIかHookか、round、成功件数は出力されていないため、今回のprocess削減を実証済み原因とは断定しない。
- コード上、`GS-009`の32 CLI actorはすべて`clarity event`であり、初回root解決に`CLI Node → external-runner Node → git rev-parse`を使う一方、32 Hook actorは既に`Hook Node → git rev-parse`へ短縮済みだった。観測された`event` commandだけを既存の非同期Git probeへ結線し、通常経路を`CLI Node → git rev-parse`へ短縮した。他のCLI command、Hook、multi-root操作、GitHub read adapterは変更していない。
- `event` JSONはroot probe前に1回だけ構文解析する。root必須、JSON構文、root identity、canonical/payload validation、write、root policyという従来の順序を維持した。unknown commandと他commandのvalidation順序は変更していない。
- 初回snapshotを作れない場合はCLIだけ既存の同期resolverへ戻し、従来の`working-root-unsafe`等の正規化を維持する。prefetch済みrequestと同期resolverのrequestが一致しない場合もCLIだけ既存同期runnerへ戻す。Hookは従来どおりunbound requestを安全拒否し、silent no-opの意味を変えていない。
- await開始後にroot、filesystem identity、ancestor alias、Git marker、top-level／Git dir／common dir、config、Git discovery環境が変わった場合はfallbackせず`clarity-root-changed`で停止する。cached responseを同期callbackで使う直前にも同じ境界を再確認し、write前のreference-based revalidationを保持した。
- 外部Git errorはawait直後に別分類せず、同期resolverがbound responseを消費した時点で従来の`probeGitIdentity()`へ渡す。`timeout`の`5000ms` details、`max-buffer`の1 MiB分類、non-Git、malformed output、spawn failureのfail-closed意味を維持した。
- `runExternal()`の`shell:false`、既存process-tree cleanup、1回、5,000ms、1 MiB、Git prompt/network抑止をそのまま使う。timeout延長、retry、actor／round／assert、lock wait／lease、canonical write、root alias許可範囲の変更は0件である。

### 既存回帰への限定追加

- `scripts/sprint-047-patch-004-test.mjs`の既存`HOOK-ALIAS` case内に、ancestor aliasからのactual CLI `event`成功とroot policy、invalid JSONがroot probeより先に`usage`となること、missing rootが既存`working-root-unsafe`を保つことを追加した。
- 同case内で、非同期probe開始直後にGit discovery環境を変えるとcallbackを実行せず`clarity-root-changed / repo-git-identity-changed`になることを確認した。新しいcase ID、runner、framework、collector、matrixは追加していない。
- 変更bytesに合わせ、既存collaboration inventoryの`clarity-root-policy`と`clarity-harness-scanner`のdigestだけを更新した。surface、path、marker、case IDは不変である。

### 低並列の自己確認

| 確認 | 結果 |
|---|---|
| 変更3 JSの`node --check` | PASS |
| `node scripts/sprint-047-patch-004-test.mjs` | 14 PASS / 0 FAIL。actual CLI event、alias正例、root-self symlink負例、初回fallback、await後変更拒否を同じ既存case内で確認 |
| `node scripts/sprint-022-safety-test.mjs` | 69 PASS / 0 FAIL。共通external process境界、timeout／max-buffer後の子孫・副作用0、再試行、timer cleanupを維持 |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface / 67 case、marker／digest VALID |
| `node scripts/sprint-049-test.mjs` | 20 PASS / 0 FAIL、Critical 15、side-effect violation 0 |
| `git diff --check` | PASS |

- 開始前／終了後のhost Node process数は21／21で、禁止開始値40未満、自分が起動した子processの残留は0件だった。64 actor stress、Sprint 044／047／048本体、Sprint 050 full／coverage／P005、agentic master／archive／regressionとそれらのwrapperはMacで実行していない。
- このroundのOrchestrator所有`state.md`と本progressを除く差分は、製品code`+41/-5`、metadata`+2/-2`、既存test`+37/-1`。検証codeは製品codeを上回らず、製品変更を含むためverification-only roundではない。
- main／tag／Release／marketplace／install、private／Yasashii、CI dispatch、push、commitは実行していない。Orchestratorは今回bytesをcommitしてexact candidateを固定後、既存Windows workflowのP005／Sprint 047／P004を1回の因果runで確認する。3 round×32 CLI＋32 Hook、100%、5秒／1 MiB、lock／lease／residue／rebuildの基準は変更しない。

### 自己評価とEvaluatorへの引き渡し

| 基準 | 自己評価 | 理由 |
|---|---:|---|
| 機能完全性 | 3/5 | Windows timeoutの不要process段は限定削減したが、exact Windows run未実行のためAC7完了を主張しない。 |
| 動作安定性 | 4/5 | 低並列のactual CLI／Hook、初回fallback、await後変更拒否、process安全回帰はgreen。Windows 64 actorは未確認。 |
| エラーハンドリング | 5/5 | 初回観測不能は従来分類へ戻し、待機後のidentity変更はcallback前に停止。timeout／max-buffer分類を維持。 |
| 回帰なし | 4/5 | 既存低並列回帰は0 FAILだが、必須Windows回帰が未実行のため5/5にしない。 |

- Evaluatorは、exact candidateのWindows nativeで`GS-009`の全3 round、各32 CLI＋32 Hookがexit 0、canonical／Hook delta 32、parse／unique／rebuild、residue 0、既存wait／lease marginを満たすことを確認する。続くP004 actual CLI event／Hook alias caseもWindows上で14/14完走させる。
- Windowsが再びtimeoutした場合、今回の限定削減だけで原因解消を断定せず、失敗actor／roundと既存safe diagnosticの範囲で再分類する。greenになるまでの無制限再実行や基準緩和は行わない。
- 起動方法／テスト対象URL: CLI製品のためWeb起動なし。`node plugins/secretary/scripts/clarity.mjs event <fixture-root> --event-json '<JSON>' --json`。
- 回帰チェック: Macの安全な限定入口は上記の低並列test／inventory。全Phase Aのoffline／archive／Windows gateはOrchestrator／fresh Evaluatorがexact commitで実行する。
