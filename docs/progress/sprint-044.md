# Sprint 044: Claude Code／Codex共通Clarity専用Hook

## 実装結果

- plugin root共通の`hooks/hooks.json`とClarity専用command router 1組を追加した。manifest自身が`PLUGIN_ROOT`、`CLAUDE_PLUGIN_ROOT`、互換用`CODEX_PLUGIN_ROOT`の順でscriptを起動するため、router起動前からhost差と空白入りpathを処理できる。
- routerはClaude Code／Codexのpayloadを共通semanticへ正規化し、host固有の出力envelopeだけをserializerで組み立てる。HookはSessionStart、PostToolUse、PreCompact、Stop、SessionEndだけで、他Skill Hookは0件。
- SessionStartはcanonical Attentionを最大3件、3,600文字以内で返す。`source: compact`では同じcanonical Stateを再読込し、再注入をruntimeへ記録する。
- PostToolUseは本文を保存せず、最大12件のRepo相対path、test候補、success／failed／unknownだけを記録する。1 event 1 fileを`wx`で排他的に作成し、共有JSONのread-modify-writeを行わない。
- PreCompactはpending checkpointとresume context digestをflushする。Stopはmaterial変更後にcheckpointがない場合だけblockし、`stop_hook_active: true`では再blockしない。SessionEndは1ファイルだけを軽量flushする。
- 未初期化Repoは親方向の上限64階層だけを確認してno-opする。Hook内のnetwork、LLM、Xmind、MCP、connector、update、全Repo scan、外部process、transcript依存、memory候補の意味判定は0件。
- `clarity review`をmanual Attention確認のaliasとして追加した。`doctor --host ... --hook-state ...`はsupported／verified／degraded／unverifiedを分け、Codex trust前は`/hooks`のreviewを案内する。trust前、disabled、failure fixtureではcanonical write 0を確認した。
- `host-inventory.json`はClaude Code Desktop／CLI、Codex App／CLIを別surfaceとして保持し、全surfaceを`verified: false`のままにした。fixture PASSや1hostの結果を別hostの実機verifiedへ昇格しない。

## 変更箇所

- `plugins/secretary/hooks/hooks.json`
- `plugins/secretary/scripts/clarity-hook.mjs`
- `plugins/secretary/scripts/lib/clarity-hook.mjs`
- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `plugins/secretary/scripts/clarity.mjs`
- `plugins/secretary/skills/clarity/SKILL.md`
- `plugins/secretary/host-inventory.json`
- `scripts/sprint-044-test.mjs`
- `scripts/sprint-044-regression.sh`
- `scripts/agentic-regression.sh`

spec、rubric、acceptance、Sprint契約、state、feedback、downstream、release、cache、installed pluginは変更していない。

## Retry 1 — F-01 Hook runtimeの実体path境界

- 修正前にEvaluatorのF-01を公式`HX-006`へ組み込み、`.clarity/runtime`をProject外directoryへのsymlinkへ差し替えると外部へevent fileが作られることを`39 PASS / 1 FAIL`で再現した。
- Hook writerは`findClarityRoot`が返すcanonical rootを`workingRoot`で再固定し、既存`safeWritePath`を使って`.clarity`から`runtime／hooks／events／session`までの全componentを検査する。中間directoryは`recursive`作成をやめ、親の検査、1階層作成、作成後のrootからの再検査を繰り返す。
- event fileはopen直前にroot、全directory、最終targetを再検査し、`O_EXCL`と利用可能hostでは`O_NOFOLLOW`を付ける。open後もdescriptorとpathのdevice／inode一致を確認し、未所有collision、partial JSON、最終symlinkを上書き・追跡しない。
- runtime recordへ`owner: agentic-secretary:clarity-hook`を付け、同一event retryだけを既存owned recordへ収束させる。Stop／PreCompactが読むruntimeも同じcomponent／owner検査を通す。
- 公式40 IDは増減していない。Critical `HC-005`へretry／partial／未所有collision、Critical `HX-006`へ通常50件、追加128件の並行parseと、`runtime／hooks／events／session`中間symlink、最終event symlink、非directory、root symlink alias、open直前path raceを追加した。全負例でcanonical digestとProject外sentinel／fileは0変更となる。
- Retry 1の変更は`plugins/secretary/scripts/lib/clarity-hook.mjs`、`scripts/sprint-044-test.mjs`、本progressだけ。製品コードを含むためverification-code-only roundではない。

## fixture／supportedと実機verifiedの区分

| host／surface | 実装・fixture | 実機verified | 根拠／残条件 |
|---|---|---:|---|
| Claude Code CLI 2.1.231 | supported、17/17 fixture PASS、strict validator PASS | false | 実plugin load、実event、compact、plugin disabledをfresh AI sessionで別途確認する |
| Claude Code Desktop | supported、共通bundle対象 | false | Desktopのfresh plugin sessionで別途確認する |
| Codex CLI 0.147.0 | supported、14/14 fixture PASS | false | `/hooks`のtrust前後、disable、実eventをfresh AI sessionで別途確認する |
| Codex App | supported、共通bundle対象 | false | Appのfresh plugin sessionで別途確認する |

`claude plugin validate --strict`はplugin manifestのoffline validatorとして利用できた。Codex 0.147.0の`debug`／`doctor`／`app-server` helpには、対象plugin rootを渡すoffline manifest validatorが見つからなかったため、Codex側は公式schemaに沿うmanifest inspectionと隔離payload fixtureまでをsupported証拠とした。実AI session、credit消費、plugin install、cache更新が必要な確認は許可範囲外のため実行していない。したがって、Sprint契約Acceptance Criteria 1の「両host Critical live case未実行0」はGenerator時点では未充足であり、Evaluatorのfresh独立live評価が必要。

## 自動検証

### Sprint 044と041〜043直接回帰

```bash
bash scripts/sprint-044-regression.sh
```

- exit 0。
- Sprint 044: `PASS=40 FAIL=0 TOTAL=40`。
- registry: missing 0、duplicate 0、extra 0。
- Claude Code concurrent PostToolUse: 50 event／50 file／50 JSON parse。
- Codex concurrent PostToolUse: 50 event／50 file／50 JSON parse。合計100/100 parse。
- Retry 1追加stress: Codex PostToolUse 128 event／128 file／128 JSON parse。中間／最終symlink、非directory、root alias、path race、collision／retry負例も同じ40-case内でPASS。
- Claude Code／Codexの空白入りplugin rootから、manifestに記載したcommandをshell経由で実起動してPASS。
- 未初期化no-op、subdirectory、large Attention、failure、trust前、disabled、Stop 1回／2回、SessionEnd 3秒上限をPASS。
- Sprint 041: 43/43 PASS。
- Sprint 042: 35/35 PASS。
- Sprint 043: fixture対象29/29 PASS。既存の`XM-007` real Xmind MCP external-liveだけは、Sprint 043の記録どおり未承認のためNOT-RUN。

### manifest／release integrity／静的検査

```bash
claude plugin validate plugins/secretary --strict
python3 scripts/check-release-integrity.py
git diff --check
```

- Claude validator: `Validation passed`。
- release integrity: `PASS release integrity: manifests and CHANGELOG are consistent`。
- diff check: exit 0。
- Sprint regression内でHook 2 scriptの`node --check`、manifest／inventoryのJSON parseもPASS。

### Retry 1の直接安全回帰

```bash
bash scripts/sprint-015-regression.sh
bash scripts/sprint-021-regression.sh
bash scripts/sprint-022-regression.sh
```

- Sprint 015: `PASS=68 FAIL=0`。
- Sprint 021: 動的fixture `PASS=71 FAIL=0`、wrapper `PASS=8 FAIL=0`。
- Sprint 022: 動的fixture `PASS=69 FAIL=0`、wrapper `PASS=8 FAIL=0`。
- `claude plugin validate plugins/secretary --strict`、`python3 scripts/check-release-integrity.py`、`git diff --check`はいずれもexit 0。

### 全体回帰の既知baseline failure

```bash
bash scripts/agentic-regression.sh
```

- sandbox内初回はSprint 013のloopback listenが`EPERM 127.0.0.1`となったため、同じcommandを許可済みの非sandbox実行面で再実行した。
- release integrityとSprint 013はPASSしたが、Sprint 019の既存検査`README高度設定と管理者順序・People API限界`が1 FAILで停止した。
- Sprint 044はREADME、Google Chat Skill、Sprint 019 testを変更していない。`scripts/sprint-019-google-chat-test.mjs`は開始HEAD `9df9cdc`と同一SHA-256で、検査が要求する`連絡先にない同僚名`は開始HEADでもREADME／Google Chat SkillではなくCHANGELOGにだけ存在する。このためSprint 044差分による回帰とは分類せず、所有境界外として修正していない。
- post-commitの`node scripts/agentic-archive-gate.mjs`はrelease integrityをPASS後、Sprint 033の固定Skill数`16`に対して実数`17`で停止した。開始HEAD `9df9cdc`のSkill数も17であり、Sprint 044がSkillを追加した結果ではないため、同じく既存gateのbaseline findingとして修正していない。
- Sprint 044の直接suiteと041〜043直接回帰は上記のとおり別commandで全PASSしている。

## Evaluator手順

1. `bash scripts/sprint-044-regression.sh`を実行し、40件のID、registry 0/0/0、100/100 parse、041〜043の結果を確認する。
2. `claude plugin validate plugins/secretary --strict`と`python3 scripts/check-release-integrity.py`を実行する。
3. Claude Code CLI／Desktopを別surfaceとしてfresh plugin sessionで読み込み、SessionStart startup／resume、同時PostToolUse、PreCompact→compact後SessionStart、Stop初回／再入、SessionEnd、failure、plugin disabledを実eventで確認する。command、version、payload、exit、timing、runtime event、contextをsurfaceごとに記録する。
4. Codex CLI／Appも別surfaceとしてfresh plugin sessionで読み込み、まず`/hooks`のtrust未承認表示とcanonical 0-writeを確認する。trust後、disable後、各event、`stop_hook_active`、subdirectoryを別々に記録する。
5. 実機証拠が得られたsurfaceだけをverifiedとし、Claude CodeのPASSをCodexへ、CLIのPASSをDesktop／Appへ流用しない。
6. `bash scripts/agentic-regression.sh`のSprint 019 baseline failureは再現と開始HEAD比較を確認し、candidate findingとbaseline findingを分ける。

## 起動・手動fallback

常駐server／test URLはない。Hookはhostがmanifestから起動し、手動経路は次で確認できる。

```bash
node plugins/secretary/scripts/clarity.mjs status "<initialized-repo>" --json
node plugins/secretary/scripts/clarity.mjs review "<initialized-repo>" --json
node plugins/secretary/scripts/clarity.mjs checkpoint "<initialized-repo>" --operation-id "<stable-id>" --json
node plugins/secretary/scripts/clarity.mjs doctor "<initialized-repo>" --host codex --hook-state untrusted --json
```

## 自己評価と既知の限界

- C21はF-01のruntime path／symlink欠陥を修正し、共通router、no-op、bounded context、競合安全、Stop one-shot、compact、manual fallback、安全禁止事項をfixtureで満たした。ただしrubric 5に必要なClaude Code／Codex両host liveは未実行のため、GeneratorはC21 PASSを主張しない。
- C24はF-01の中間／最終path境界、public-first、外部副作用0、041〜043直接回帰、release integrityを満たした。全体回帰は上記の開始HEAD由来Sprint 019 failureが残るため、Evaluatorの分類前に0 FAILとは主張しない。
- 外部network 0、AI credit 0、push 0、release 0、cache／install 0、downstream write 0。書込みはRepo内のSprint 044所有差分とOS temporary fixtureだけ。
- Hook runtime eventはcanonical dataではなく`.clarity/runtime/hooks/events`配下のbounded観測。host trust前／disabledはrouter自体が起動しないため、実host側の0-writeはfixtureとlive表示を分けて評価する必要がある。
- Retry 1でも実AI live、candidate plugin install、cache更新、trust UI変更、host disable、network、creditは未承認のため実行していない。全4 surfaceは引き続き`verified:false`であり、offline 40/40をliveへ昇格していない。
