# Sprint 044 評価結果

**判定:** 不合格
**分類:** `implementation-issue`
**評価対象:** Sprint 044 — Claude Code／Codex共通Clarity専用Hook
**Generator candidate:** `890d64f392d7b633f4900b20677e8665a939b561`
**評価開始HEAD:** `c7bd290d0ffd5ab2b87a51927df7aebde28c182b`（candidateとの差分はOrchestrator所有の`docs/sprints/state.md`だけ）
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**Evaluator model／effort metadata:** host metadataを取得できないため`unverified`。dispatch指定から実起動値を推定しない。
**Escalation Recommendation:** none

## 結論

専用回帰はTarget 40/40 PASS、registry missing／duplicate／extra 0、Claude Code／Codexの並行PostToolUse合計100/100 JSON parseでgreenだった。Evaluator独立fixtureでも、3種類のplugin root env、空白入りpath、missing env、Claude／Codex payload normalization、SessionStart 4 source、本文非保存、manual fallback、disabled／failure、未初期化no-op、collision retry、並行128 event、large State、SessionEnd時間上限、禁止処理の直接参照0を再確認した。

ただし、`.clarity/runtime`がProject root外directoryへのsymlinkである場合、Hookは中間symlinkを追跡し、外部directoryへ`hooks/events/<session>/<event>.json`を作成する。独立fixtureではrouter exit 0、canonical bytes不変だったが、project root外へruntime eventが1件作成された。これはF78、Acceptance Criteria 3の競合安全なruntime記録、C5とC24のpath／symlink／cross-root write 0に反するproduct defectである。公式40 case runnerは通常directoryだけを使うため、この経路を検査していない。

また、契約が必須とするClaude Code／CodexのCritical live caseは実行していない。candidate install／cache変更、trust UI操作、plugin disable、fresh AI session、AI credit／networkを伴い得るため、今回のユーザー許可範囲では実行しなかった。fixtureをlive verifiedへ昇格せず、4 surfaceを`verified: false`のまま保持した。このlive境界だけが残る場合は`verification-scope-issue`だが、本評価には独立したproduct failure F-01があるため、Sprint全体の分類は`implementation-issue`とする。

## スコア

| 基準 | スコア | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | AC1の両host Critical live未実行0を満たさず、F-01も残る |
| C2 構文・整合 | 5/5 | 5 | PASS | Node構文、JSON、registry、Claude strict validator、release integrity、diff checkが成立 |
| C3 機能の実証 | 4/5 | 4 | PASS | manifest command、製品router／CLI、failure、128並行、large Stateを独立fixtureで実行。host liveだけ未実行 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | bounded brief、degraded説明、manual status／review／checkpoint／doctor、`/hooks`案内が成立 |
| C5 安全・規律 | 4/5 | 5 | FAIL | Hook runtimeが中間symlinkを追跡し、project root外へ1 fileを書いた |
| C6 無回帰 | 5/5 | 5 | PASS | Sprint 044／043／042／041直接回帰とrelease integrityは0 FAIL。Sprint 019／033は開始HEAD同一の既知baselineとして分離 |
| C7 やさしさ | 4/5 | 4 | PASS | Hook失敗を故障完了とせず、短い日本語でmanual fallbackを示す |
| C20 Attention・Clarity UX | 5/5 | 4 | PASS | SessionStartは最大3件、3,600文字以内。20,000 Event fixtureでもbounded |
| C21 Clarity Hook・host parity | 3/5 | 5 | FAIL | offline semantic／競合／one-shotは成立するが、両host live未実行かつruntime安全境界に欠陥 |
| C24 Clarity安全・統合・public-first | 4/5 | 5 | FAIL | public／release／cache分離は成立するが、path／symlink境界に1件違反 |

C8〜C19とC22〜C23は今回の新規採点対象外である。Sprint 041〜043の直接回帰は実行したが、その結果をSprint 044のhost live証拠へ流用していない。

## Target Case／registry

| 区分 | fixture PASS | fixture FAIL | live verified |
|---|---:|---:|---:|
| HC-001〜017 | 17 | 0 | 0 surface |
| HX-001〜014 | 14 | 0 | 0 surface |
| HP-001〜007 | 7 | 0 | HP-007 live conversation未実行 |
| AT-015／IM-012 | 2 | 0 | 実SessionStart／実`/hooks`状態は未実行 |
| 合計 | **40** | **0** | **0/4 surface** |

- registry: missing 0／duplicate 0／extra 0。
- 40/40はisolated payload／CLI fixture結果であり、Claude CodeまたはCodexへのcandidate plugin load成功を意味しない。
- Critical liveの未実行を0件と偽装しないため、Acceptance Criteria 1はFAILとする。

## コマンド証跡

| command | exit／結果 |
|---|---|
| `bash scripts/sprint-044-regression.sh` | exit 0。Sprint 044 40/40、registry 0/0/0、並行100/100 parse。043 29 PASS／0 FAIL／XM-007だけNOT-RUN、042 35/35、041 43/43 |
| `claude plugin validate plugins/secretary --strict` | exit 0、`Validation passed`。Claude Code 2.1.231 |
| `python3 scripts/check-release-integrity.py` | exit 0、manifest／CHANGELOG整合PASS |
| `git diff --check 9df9cdc..890d64f` | exit 0 |
| `codex --version` | `codex-cli 0.147.0` |
| `codex debug --help`／`codex plugin --help` | 対象plugin rootを渡すoffline validatorは列挙されない。Codexはmanifest inspectionとisolated payload fixtureまで |
| `node /tmp/sprint044-independent.mjs` | exit 1。17 PASS／1 FAIL。fixtureとscriptは終了時に削除 |
| 20,000 Event large State fixture | router exit 0、46.31ms、context 155 chars |
| timing fixture | SessionEnd 28.81ms、未初期化SessionStart 25.82ms |
| instrumented Hook fixture | SessionStart／PostToolUseともexit 0。`childProcess=0`、`network=0`、`fetch=0` |
| `bash scripts/agentic-regression.sh` | sandbox初回はloopback `EPERM`。許可済みlocal-only再実行でSprint 019既知1件が50/51となりexit 1 |
| `node scripts/agentic-archive-gate.mjs` | release integrity後、Sprint 033固定Skill数16に対して実数17でexit 1 |

## 独立fixtureの詳細

### Manifest／payload／serializer

- manifest記載commandをshell経由で、空白入りplugin rootに対する`PLUGIN_ROOT`、`CLAUDE_PLUGIN_ROOT`、`CODEX_PLUGIN_ROOT`の各単独envで実行し、全てexit 0、SessionStart contextあり。
- root envを全て欠落させるとcommandはnon-zeroで安全に停止し、canonical／runtime write 0。host側ではHook command failureとしてmanual fallbackへ戻す必要がある。
- Claude Code payloadとCodex payloadを別々にnormalizerへ渡し、host／turn差を除くsemanticが一致。
- Stop serializerは両hostで同じcheckpoint semanticを保つ。

### lifecycle／bounded context／manual fallback

- SessionStart `startup`／`resume`／`clear`／`compact`を別payloadで実行。全て最大3件、3,600文字以内。compactは`compact-resume` runtime eventを記録。
- 20,000 Eventのcanonical fixtureでSessionStartは46.31ms、context 155 chars。Repo全scan、全件context化は発生しない。
- PostToolUseの`tool_input.content`／`tool_response.body`へsentinelを入れ、runtime JSONに本文0、repo相対path、tool、result metadataだけ、1 file 1,500 bytes未満。
- PreCompactは`pendingCheckpoint`と64桁`resumeContextDigest`、Stop初回はcheckpoint継続、`stop_hook_active:true`は再継続なし、SessionEndは28.81ms。
- manual `status`／`review`／`checkpoint`／`doctor`は全てexit 0。untrusted doctorは`degraded`、`verified:false`、Codex `/hooks`案内。
- disabledとfailure injectionはcanonical 4 fileをbyte保持。JSONL破損fixtureもdegradedを返し、canonical不変、runtime新規作成0。

### concurrency／collision／failure

- 専用suiteはClaude 50＋Codex 50 eventを同時実行し、100 file／100 JSON parse。
- 独立fixtureはCodex PostToolUse 128 eventを同時実行し、128 file／128 JSON parse、欠落0。
- 同一`tool_use_id`、同一semanticのretry 2回は1 fileへ収束し、JSON parse成功。
- 未初期化RepoのSessionStart 10回は合計3秒未満、`.clarity`作成0。subdirectoryから正しいClarity rootを解決。

### 禁止処理とsurface表示

- `plugins/secretary/scripts/clarity-hook.mjs`と`scripts/lib/clarity-hook.mjs`の直接sourceにnetwork URL、`fetch`、`node:child_process`、Xmind、MCP、connector、update、memory-care、transcript parser参照0。
- preload instrumentationで`child_process`のspawn／exec系、`http`／`https`／`net`、global `fetch`を計数・拒否してSessionStart／PostToolUseを実行し、両eventともexit 0、`childProcess=0`、`network=0`、`fetch=0`。
- Hook pathはClarity coreの`attention`／`history`だけを呼ぶ。Hook実行中のnetwork、LLM、Xmind、MCP、connector、update、他Skill Hook、memory意味判定を観測していない。
- `hooks/hooks.json`内は5 lifecycle eventのcommand typeだけで、prompt／agent／MCP Hook 0。hooks JSONは1 file、routerは1組。
- `host-inventory.json`はClaude Code Desktop／CLI、Codex App／CLIを全て`supported`かつ`verified:false`で保持。degraded stateとsurface間非昇格規則も保持。

## F-01 再現証拠

fixtureはOS temporary directory内だけで実行し、終了時に削除した。

1. 通常RepoをClarity初期化する。
2. Project外の空directoryを作り、`.clarity/runtime`をそこへのsymlinkに置き換える。
3. 製品routerへCodex形式のPostToolUse／Write payloadを送る。
4. 期待: unsafe runtimeとしてdegraded停止し、Project外write 0。
5. 実際: router exit 0、stdout空、Project外へ`hooks/events/symlink-session/he_8af6be23bb1e50dd35b572f8.json`を1件作成。canonical digestは不変。

原因の手がかりは`plugins/secretary/scripts/lib/clarity-hook.mjs:145`〜`:161`である。`runtimeBase`がpathをjoinし、`ensureRuntimeDirectory`は`mkdirSync(..., recursive:true)`を先に実行してから最終directoryだけを`lstat`する。`.clarity/runtime`や`.clarity/runtime/hooks`のような中間componentがsymlinkでも、外部target内に最終events directoryを作った後なので検出できない。

## Acceptance Criteria

| AC | 判定 | 根拠 |
|---|---|---|
| 1. Target 40、両host Critical live、AC未実行0 | **FAIL** | fixture 40/40だがlive 0/4 surface。Critical host load／trust／eventが未実行 |
| 2. 共通manifest／router、同semantic | PASS | 1 hooks JSON、1 router、env／payload／serializer独立fixture |
| 3. no-op、bounded、concurrency、Stop、SessionEnd | **FAIL** | 通常pathは成立するがruntime中間symlinkでcross-root write |
| 4. trust前／disabled canonical 0、manual完全動作 | **INCOMPLETE** | isolated fixtureはPASS。実`/hooks`、実plugin disableは未実行 |
| 5. Hook禁止処理0 | PASS | direct source inventory、command-only manifest、runtime fixtureで禁止処理の実行なし |
| 6. surface別truthful state | PASS | 全surface `verified:false`、fixtureやread-only installed stateをcandidate liveへ昇格していない |
| 7. AT-015／IM-012 live | **INCOMPLETE** | bounded outputとdoctor copyはfixture PASS。実SessionStartと実`/hooks` untrusted表示は未実行 |

## Finding／バグ一覧

| # | 重要度 | 対象区分 | 内容 | Sprint 044判定への影響 |
|---|---|---|---|---|
| F-01 | Major | product | Hook runtime writerが`.clarity/runtime`の中間symlinkを追跡し、Project root外へevent fileを作成する | C5／C21／C24、AC3を不合格にする`implementation-issue` |
| V-01 | Minor | verification-infra | 公式HC／HX runnerは通常runtimeだけを使い、中間symlink／cross-root write負例を検査しない | 40/40がF-01を見逃したcoverage gap。F-01修正時に回帰追加が必要 |
| P-BASE-019 | Minor | product | READMEにPeople APIの「連絡先にない同僚名」限界がない既知debt | README／Google Chat Skill／Sprint 019 test blobは開始HEADとcandidateで同一。Sprint 044差分外 |
| V-BASE-019 | Minor | verification-infra | Sprint 019の旧copy単一conjunction assert | baseline同一。full masterをgreenとは扱わない |
| V-BASE-033 | Minor | verification-infra | archive gateがSkill数16を固定するが開始HEADから実数17 | Sprint 033 test blobとSkill数は開始HEAD／candidateで同一。Sprint 044差分外 |

Critical findingは0件。Sprint 044新規findingはMajor product 1件、Minor verification-infra 1件。

## Live verification boundary

read-only host stateは確認したが、candidate live証拠には採用していない。

- Codex: installed `agentic-secretary@agentic-secretary`はprivate source由来`0.10.1+codex.20260814074627`でenabled。Sprint 044 candidateではない。
- Claude Code: project scopeのAgentic `0.9.0`は別project向けでdisabled。Sprint 044 candidateではない。
- 未実行surface:
  - Claude Code CLI 2.1.231: candidate plugin load、fresh sessionのSessionStart startup／resume／clear／compact、PostToolUse、PreCompact、Stop初回／再入、SessionEnd、failure、plugin disabled。
  - Claude Code Desktop: candidate plugin loadと上記lifecycle／disabled。
  - Codex CLI 0.147.0: candidate plugin load、`/hooks` trust前表示、trust後各event、disable、subdirectory、`stop_hook_active`。
  - Codex App: candidate plugin load、trust前後、各event、disable。
- 必要な操作／副作用: candidate installまたはcache差替え、host設定のenable／disable、Codex trust UI変更、fresh AI session、場合によりnetwork／AI credit。既存installed plugin／cache／trust／設定を変更し得る。
- 今回実行した副作用: 上記0件。network、AI credit、実plugin install、cache update、trust変更、external connector、Xmind、push、release、downstream write 0。

F-01修正後もliveだけが残る場合、Orchestratorは自動でfixture PASSへ昇格せず、次のいずれかをユーザーへ確認する必要がある。

1. candidateを隔離installし、4 surfaceのうち契約が求めるClaude Code／Codex liveを実行する。cache／trust／disable／fresh session／creditの影響と復元手順を先に示す。
2. live証拠水準を下げ、offline supportedまでを`done-by-user-decision`で受理する。host integration、trust、Stop continuationの実機リスクが残る。
3. liveをNon-scope化して別の明示承認済み運用phaseへ送る。Sprint 044を通常のEvaluator PASSにはしない。

## Generatorへの指示

1. Hook runtime writerで`.clarity`からevent targetまでの各path componentを、書込み前と直前に通常directory・非symlink・root内として検証する。既存の`safeWritePath`相当の境界を使い、検証前に`recursive:true`で外部targetを作らない。
2. `.clarity/runtime`、`.clarity/runtime/hooks`、`.clarity/runtime/hooks/events`をそれぞれ外向きsymlinkにした負fixtureを追加し、routerはcanonical／outside write 0でdegraded停止することを検査する。
3. 通常directoryの128+ concurrent event、同一event retry、collision、partial／malformed event、SessionEnd時間、bounded contextを回帰させない。
4. F-01修正とlive権限境界を混ぜない。実plugin install／cache／trust／AI sessionはGeneratorが勝手に実行せず、Evaluator／ユーザー承認へ残す。

## Evaluator 自己レビュー

- 閾値と不合格判定は一致しているか: yes
- Generator自己評価を流用せず、製品router／CLIを独立fixtureで操作したか: yes
- Target 40 IDとregistry missing／duplicate／extraを確認したか: yes
- fixture 40/40をlive verifiedへ昇格していないか: yes
- F-01を通常pathのsuite PASSで見逃さず、before／afterと外部file数で再現したか: yes
- product findingとverification-infra findingを分離したか: yes
- live未実行をproduct defectと混同せず、ただし契約必須ACをPASS扱いしていないか: yes
- Sprint 019／033 baselineをcandidate回帰へ誤分類していないか: yes
- 要求した証拠はcontract／rubricのsafe harbor内か: yes
- UI／browserを採点していないためscreenshot非該当としたか: yes
- 実装、test、spec、state、progressへ越境していないか: yes
- 判定根拠: 新規Major product F-01がC5／C21／C24を閾値未達にし、AC1／4／7のliveも未完了。したがってSprint 044は`implementation-issue`として不合格。

---

## Retry 1 独立再評価

**判定:** 不合格
**分類:** `verification-scope-issue`
**Generator candidate:** `53f327b7de3df0343122fae5692a4c5fbf8ee2e3`
**評価開始HEAD:** `fdde678a8a84ed6730f7aa03fdeae551a4ba32de`
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**Evaluator model／effort metadata:** host metadataを取得できないため`unverified`。dispatch指定から実起動値を推定しない。
**Escalation Recommendation:** none

### Retry 1 結論

初回F-01の修正面をcandidate差分と通常回帰で再評価した。Hook writerはcanonical rootを再固定し、`.clarity`から
`runtime／hooks／events／session`までを1階層ずつ作成前後に再検査する。event fileはopen前の全component再検査、
`O_EXCL`、利用可能hostでの`O_NOFOLLOW`、open後のdescriptor／path inode照合を行い、owned recordだけをretryとして
再利用する。partial JSON、未所有collision、最終file symlinkは上書きしない。

公式`HX-006`には、`.clarity/runtime`、`runtime/hooks`、`runtime/hooks/events`、session directoryの各外向きsymlink、
最終event file symlink、非directory、working root symlink alias、open前path差替え、Codex 128並行が追加された。
全負例はdegraded停止し、canonical digestとProject外sentinel／treeのbefore／after一致をassertしている。
通常suiteはTarget 40/40、registry差分0、Claude 50＋Codex 50の100/100 JSON parse、追加Codex 128/128 parseでgreenだった。

したがって、初回のMajor product F-01とMinor verification-infra V-01は、今回の固定candidateと契約済み通常証拠の範囲で
**RESOLVED**。新規product finding、verification-infra findingとも0件である。

ただし、Claude Code Desktop／CLI、Codex App／CLIのcandidate plugin liveは4 surfaceとも未実行である。実行にはcandidateの
installまたはcache差替え、fresh AI session、Codex trust UI変更、plugin enable／disable、場合によりnetwork／AI creditが必要になる。
これらはユーザー未承認の外部・利用環境変更なので実行せず、全surfaceを`verified: false`のまま維持した。
契約AC1、AC4、AC7とC21は両hostのCritical liveを必須にしているため、offline 40/40をliveへ昇格せず、通常のEvaluator
PASSにはしない。残件の主因は製品実装ではなく、未承認の実host検証scopeであるため、最終分類は
`verification-scope-issue`とする。ユーザー判断後のfresh再評価が必要である。

### Retry 1 スコア

| 基準 | スコア | 閾値 | 判定 | Retry 1根拠 |
|---|---:|---:|---|---|
| C1 完成度 | 3/5 | 4 | FAIL | offline必須面は成立したが、AC1の両host Critical live未実行0を満たさない |
| C2 構文・整合 | 5/5 | 5 | PASS | Node／JSON、registry、Claude strict validator、release integrity、diff checkが成立 |
| C3 機能の実証 | 4/5 | 4 | PASS | 製品router／CLI、failure、collision、100＋128並行、large Stateをfixtureで実行。実hostだけ未実行 |
| C4 非エンジニア体験 | 4/5 | 4 | PASS | bounded brief、degraded説明、manual fallback、`/hooks`案内が通常fixtureで成立 |
| C5 安全・規律 | 5/5 | 5 | PASS | 中間／最終symlink、非directory、root alias、path差替え、collisionでProject外／canonical変更0を通常suiteが検査 |
| C6 無回帰 | 5/5 | 5 | PASS | Sprint 044、041〜043、015、021、022、strict validator、release integrityの実行対象は0 FAIL |
| C7 やさしさ | 4/5 | 4 | PASS | failureを完了扱いせず、短い日本語でmanual fallbackと変更なしを示す |
| C20 Attention・Clarity UX | 5/5 | 4 | PASS | SessionStartは最大3件、3,600文字以内。large Stateでもbounded |
| C21 Clarity Hook・host parity | 4/5 | 5 | FAIL | 共通router、競合安全、Stop one-shot、compact、truthful inventoryは成立。両host liveだけ未実行 |
| C24 Clarity安全・統合・public-first | 5/5 | 5 | PASS | F-01負回帰、041〜043と安全関連回帰、public／release／cache分離が成立 |

C8〜C19とC22〜C23は今回の新規採点対象外。C21の閾値未達は製品欠陥ではなく、実host検証の未承認境界による。

### Target Case／registry

| 区分 | fixture PASS | fixture FAIL | live verified |
|---|---:|---:|---:|
| HC-001〜017 | 17 | 0 | 0 surface |
| HX-001〜014 | 14 | 0 | 0 surface |
| HP-001〜007 | 7 | 0 | HP-007 live conversation未実行 |
| AT-015／IM-012 | 2 | 0 | 実SessionStart／実`/hooks`未実行 |
| 合計 | **40** | **0** | **0/4 surface** |

- registry: missing 0／duplicate 0／extra 0。
- Claude Code並行: 50 event／50 file／50 JSON parse。
- Codex並行: 50 event／50 file／50 JSON parse。
- Retry 1追加stress: Codex 128 event／128 file／128 JSON parse。
- fixture結果をClaude Code／Codexのcandidate plugin liveへ流用していない。

### コマンド証跡

| command | exit／結果 |
|---|---|
| `bash scripts/sprint-044-regression.sh` | exit 0。Sprint 044 40/40、registry 0/0/0、100/100 parse、追加128/128 parse。Sprint 043 29/29＋XM-007既存NOT-RUN、042 35/35、041 43/43 |
| `claude plugin validate plugins/secretary --strict` | exit 0、`Validation passed` |
| `python3 scripts/check-release-integrity.py` | exit 0、manifest／CHANGELOG整合PASS |
| `git diff --check 53f4fa7..53f327b` | exit 0 |
| `bash scripts/sprint-015-regression.sh` | exit 0、68/68 PASS |
| `bash scripts/sprint-021-regression.sh` | exit 0、動的71/71、wrapper 8/8 PASS |
| `bash scripts/sprint-022-regression.sh` | exit 0、動的69/69、wrapper 8/8 PASS |

### F-01／V-01の再評価

| ID | 対象区分 | Retry 1結果 | 証拠 |
|---|---|---|---|
| F-01 | product | **RESOLVED** | runtime各中間component、session、最終fileのsymlinkとroot aliasを通常runnerで拒否し、Project外tree／sentinelとcanonical digestがbefore／after一致 |
| V-01 | verification-infra | **RESOLVED** | 公式40-caseのCritical `HX-006`へ中間／最終symlink、非directory、root alias、path差替えを追加。case数40、registry差分0を維持 |

#### 通常fixtureで確認した境界

- `.clarity/runtime`、`runtime/hooks`、`runtime/hooks/events`、session directoryを個別にProject外symlinkへ変更。
- 最終event fileをProject外fileへのsymlinkへ変更。
- `.clarity/runtime`を通常directory以外へ変更。
- working rootをsymlink aliasから渡す。
- file open前にevents directoryをProject外symlinkへ差し替えるcontrolled race。
- owned同一event retryは1 fileへ収束。partial JSONと未所有collisionは上書き0。
- `O_EXCL`、利用可能時`O_NOFOLLOW`、descriptor／pathのdevice・inode一致をcandidate差分で確認。
- Project外fixtureはsentinel／tree snapshotのbefore／after一致をassertした。runnerはraw SHA-256値をstdoutへ出さないため、
  feedbackでは未出力のdigest値を作らず「一致」として記録する。
- SessionEndは契約上限3秒未満をassertした。runnerは実測msをstdoutへ出さないため、未出力の時間を推定しない。

### Acceptance Criteria

| AC | Retry 1判定 | 根拠 |
|---|---|---|
| 1. Target 40、両host Critical live、AC未実行0 | **FAIL** | fixture 40/40だがlive 0/4 surface |
| 2. 共通manifest／router、同semantic | PASS | 1 hooks JSON、1 router、payload normalization／serializer fixture |
| 3. no-op、bounded、concurrency、Stop、SessionEnd | PASS | 100＋128並行、各runtime負例、Stop一度限り、compact、3秒上限がgreen |
| 4. trust前／disabled canonical 0、manual完全動作 | **INCOMPLETE** | fixtureはPASS。実`/hooks` trust前と実plugin disableは未実行 |
| 5. Hook禁止処理0 | PASS | command-only manifest、source inventory、禁止処理instrumentation 0 |
| 6. surface別truthful state | PASS | 4 surfaceすべて`verified:false`。1host／fixtureの昇格0 |
| 7. AT-015／IM-012 live | **INCOMPLETE** | bounded output／doctor copyはfixture PASS。実SessionStart／実`/hooks`未実行 |

### Retry 1 Finding一覧

| # | 重要度 | 対象区分 | 状態 | 内容 |
|---|---|---|---|---|
| F-01 | Major | product | RESOLVED | 初回のruntime中間symlinkによるProject外writeは、全component実体境界と公式負回帰で解消 |
| V-01 | Minor | verification-infra | RESOLVED | 公式runnerへ中間／最終path負例が追加され、初回coverage gapを閉じた |
| V-LIVE-01 | Major | verification-infra | OPEN | 契約必須のClaude Code／Codex candidate liveが4 surfaceとも未実行。製品欠陥は観測していないが、通常PASSに必要な証拠が不足 |

Retry 1の新規product findingは0件。新規verification-infra defectも0件。`V-LIVE-01`はrunner欠陥ではなく、未承認の
実host検証scopeを明示するopen gateであり、これだけを理由にGeneratorへ自動差し戻ししない。

### Live verification boundaryとユーザー選択肢

未実行surfaceと必要操作は次のとおり。

- Claude Code CLI: candidate plugin load、fresh sessionのstartup／resume／compact、並行PostToolUse、PreCompact、Stop初回／再入、SessionEnd、failure、plugin disabled。
- Claude Code Desktop: candidate plugin loadと同じlifecycle／disabledをDesktop sessionで別確認。
- Codex CLI: candidate plugin load、`/hooks` trust前表示、trust後各event、disable、subdirectory、`stop_hook_active`。
- Codex App: candidate plugin load、trust前後、各event、disableをApp sessionで別確認。

必要になり得る副作用は、candidate install／cache差替え、host設定のenable／disable、Codex trust UI変更、fresh AI session、
network、AI creditである。今回の実行件数はすべて0。push、release、downstream write、Xmind、connectorも0件。

ユーザーへ次の3案を提示し、判断後に再評価する必要がある。

1. **実host評価を承認する（推奨）**: candidateを隔離installし、4 surfaceを個別に実行する。変更するcache／trust／設定、
   credit見込み、終了後の復元手順を実行前に示す。全必須liveがPASSした場合だけ通常のEvaluator PASSへ進める。
2. **offline証拠で受理する**: live証拠水準を下げ、残余リスクを明示的に引き受けて`done-by-user-decision`とする。
   host integration、trust、Stop continuation、Desktop／App差の実機リスクが残る。
3. **liveを別phaseへ送る**: 実host確認をNon-scope化し、明示承認済みの運用phaseで実行する。Sprint 044は現時点で
   通常のEvaluator PASSにせず、未完了surfaceを引き継ぐ。

### Retry 1 Evaluator 自己レビュー

- 初回FAILを保持してRetry 1だけ追記したか: yes
- fixed candidateと評価開始HEADを分けたか: yes
- 閾値と`verification-scope-issue`判定は一致しているか: yes
- F-01 productとV-01 verification-infraの解消を通常runnerの具体的負例で確認したか: yes
- Target 40 ID、registry 0/0/0、100＋128 parseを確認したか: yes
- fixture 40/40をlive verifiedへ昇格していないか: yes
- live未実行をproduct defectまたはGenerator修正対象へ誤分類していないか: yes
- 未出力のdigest値、timing、model metadataを推定していないか: yes
- 要求した証拠はcontract／rubricのsafe harbor内か: yes
- UI／browserを採点していないためscreenshot非該当としたか: yes
- 実plugin install、cache、trust、fresh AI session、network、credit、push、release、downstream writeを0件に保ったか: yes
- 実装、test、spec、state、progressへ越境していないか: yes
- 最終分類根拠: product defectは0件。未達は、ユーザー未承認で実行できない4 surfaceのCritical live証拠だけである。
  Harness契約に従い`verification-scope-issue`としてユーザー判断へ返す。

---

## Retry 2 — Mac実host live評価

**判定:** 不合格
**分類:** `verification-scope-issue`
**Generator candidate:** `53f327b7de3df0343122fae5692a4c5fbf8ee2e3`
**評価開始HEAD:** `b3d2ca6db4add1973c9e700089277fc95ddd0099`
**評価開始branch:** `codex/sprint-041-project-clarity`
**評価開始時worktree:** clean
**評価OS:** macOS。Windowsは未実行・`unverified`のままとし、Mac結果を昇格しない。
**Evaluator model／effort metadata:** host metadataを取得できないため`unverified`。dispatch指定から推定しない。
**Escalation Recommendation:** user decision。製品修正への自動差し戻しは行わない。

### Retry 2 結論

ユーザー承認の範囲でcandidateをMac実hostへ一時読込みし、Claude Code CLIとCodex CLIでは実lifecycleを確認できた。
Claude Code CLI 2.1.231は実SessionStart、materialなWrite、PostToolUse、Stop一度限り、2回目停止、SessionEnd、
環境flagによるHook disabled、manual fallbackを実行した。Codex CLI 0.147.0は`/hooks`のtrust前skip、untrusted doctor、
trust後SessionStart、materialな`apply_patch`、PostToolUse、Stop一度限り、2回目停止、SessionEnd、5 Hookの実disable、
manual fallback、PreCompactを実行した。両CLIともcanonical 4 fileはbyte不変で、実runtime eventはJSON parseできた。

一方、Claude Code DesktopはComputer UseのApp state取得が2回とも60秒を超えて無応答となり中断した。
Codex AppはComputer Useが`not allowed to use the app 'com.openai.codex' for safety reasons`として操作を拒否した。
両Appでclick、type、candidate task／session作成は0件で、candidate load、trust、disable、lifecycleを実行していない。
CLI証拠をDesktop／Appへ昇格しない。

また、Codex CLIの`/compact`では実PreCompact recordを得たが、compact直後のcandidate SessionStart recordは0件だった。
同じ評価sessionをsandbox外のexact resume commandで再開できたものの、resume時もcandidate SessionStart recordは0件だった。
routerがpayloadを受け取って失敗した証拠ではなく、Codex 0.147.0から対象eventがcandidateへ配送された証拠がないため、
製品findingへ推定せずhost capability未確認として分離する。ただしHX-004／C21のlive PASSには数えない。

Target 40/40、registry 0/0/0、F-01／V-01解消、100＋128並行、禁止処理instrumentation、既存Skill inventoryは、
同一candidate・clean worktreeのRetry 1証拠を増分評価規則に従ってcarry forwardした。CLIで確認できた面は増えたが、
契約AC1は両hostのCritical liveと未実行0件、C21は両host別live、Sprint scopeはDesktop／Appを含むsurface別truthを要求する。
したがって通常PASSには到達しない。

### surface別結果

| surface | host／version／load方法 | trust／disabled | 実event／manual | 判定 |
|---|---|---|---|---|
| Claude Code CLI | `claude 2.1.231`。candidate sourceの`plugins/secretary`を`--plugin-dir`でfresh `-p` sessionへ直接読込み。`--no-session-persistence` | Claude側hash trustは非該当。`CLARITY_HOOK_DISABLED=1`でcandidate runtime 11→11、canonical不変、manual attention 7件。hostのplugin disable操作自体は未実行 | SessionStartは重要3件＋`その他 4件`、material Writeは`touchedPaths=[live-claude-probe.txt]`、Stop `checkpoint-request`は1件、2回目0件、SessionEnd。実runtime 11件 | **一部PASS**。確認したeventはPASS。PreCompact／resume／compact、実plugin disable、実host concurrency／failure／network instrumentationは未実行 |
| Claude Code Desktop | local scopeへcandidate 0.10.2を一時installし、source↔cache `diff -qr`は差分0 | UIへ到達できず未実行 | Computer UseのApp state取得が2回とも60秒超。click／type／task作成0、screenshot 0 | **UNVERIFIED**。Computer Use capability unavailable。CLIから昇格しない |
| Codex CLI | `codex 0.147.0`。隔離local marketplace `clarity-live-eval`からcandidate 0.10.2をinstall。source↔cache差分0 | trust前の`/hooks`はcandidate 5件を`need review`表示し、`Continue without trusting`でcandidate runtime 0。manual doctorは`degraded`／`verified:false`と`/hooks`案内。trust後は5件Active。実disableでは5件Active 0、runtime 10→10、manual attention 7件。再有効化も確認 | trust後SessionStart、material `apply_patch`は`touchedPaths=[live-codex-probe.txt]`、Stop request 1件、2回目0件、SessionEnd。`/compact`でPreCompact 1件。実runtime 12件 | **一部PASS**。trust／disable／manual／主要eventはPASS。compact／resume SessionStart 0、実host concurrency／failure／network instrumentationは未実行 |
| Codex App | candidateがCodex共通設定へ一時installされた時間帯にAppはrunningだったが、App sessionでのloadは証明していない | 未実行 | Computer Useが自己App操作を安全上拒否。click／type／task作成0、screenshot 0 | **UNVERIFIED**。Computer Use capability unavailable。CLIから昇格しない |

`supported`は製品inventory上の宣言、`verified`はこの表の実測だけを指す。Retry 2終了時にもDesktop／Appを
`verified:true`へ変更する根拠はない。

### 実runtime／canonical証拠

| host | 実runtime | 代表sessionと結果 |
|---|---:|---|
| Claude Code CLI | 11 | `30c8ebcd-8a4e-4f1b-aa0f-f948548e3a8e`: SessionStart、Write observation、checkpoint-request 1、SessionEnd。`3a489b28-ecd3-4f5e-aa53-f00ae87fdeac`: read-only observation。disabled sessionはcandidate record 0 |
| Codex CLI | 12 | `01a0464e-fcc0-7433-8676-e105f0601e6a`: SessionStart、`apply_patch` observation、checkpoint-request 1、2回目request 0、SessionEnd。`01a04652-cba8-7b33-bc5c-f3d33d4555ae`: PreCompact、SessionEnd、resume SessionStart 0 |

- runtime合計23件は全てowner `agentic-secretary:clarity-hook`でJSON parse成功。内訳はClaude 11、Codex 12。
- kind内訳は`session-start` 6、`observation` 6、`checkpoint-request` 2、`pre-compact` 1、
  `session-end-flush` 8。checkpoint-requestはmaterial sessionごとに1件だけである。
- canonical before／after SHA-256は次のとおりで一致した。
  - `events.jsonl`: `22bb4b850650ea6375d586efa39e472d4c944770703ad654b8d30c5a0c5ec447`
  - `evidence.jsonl`: `05dac8465599724eac544a50885c4eb195600a2b0f0e4208ae39fa3914540830`
  - `project.json`: `5e3c549c21261596c2f5be2b1f4752cb97ed412071be0a11616120b3b6d9ee11`
  - `state.json`: `8bed7ac7b582b6e7d07e98d892f8e18d92513ee8b3e6ec477e1435cd26275af6`

### Acceptance Criteria

| AC | Retry 2判定 | 根拠 |
|---|---|---|
| 1. Target 40、両host Critical live、AC未実行0 | **FAIL** | fixture 40/40は維持。CLI 2面は一部liveだが、実host concurrency／failure／networkとDesktop／App 2面が未実行 |
| 2. 共通manifest／router、同semantic | PASS | Retry 1の同一candidate証拠をcarry forward。実CLI runtimeも同じowner／schema／semantic |
| 3. no-op、bounded、concurrency、Stop、SessionEnd | PASS | fixture 100＋128並行を維持し、両CLIのmaterial Stopは各1回、2回目0、SessionEndを実測 |
| 4. trust前／disabled canonical 0、manual完全動作 | **INCOMPLETE** | Codex trust前／5 Hook disabledとmanualは実測。Claudeは環境flag disabledを実測したがhost plugin disable自体とDesktopは未実行 |
| 5. Hook禁止処理0 | PASS | Retry 1 instrumentation／source inventoryを維持。liveで禁止処理を呼んだrecordは0 |
| 6. surface別truthful state | PASS | CLIとApp、MacとWindowsを分離。Desktop／App／Windowsをverifiedへ昇格していない |
| 7. AT-015／IM-012 live | PASS | Claude実SessionStartは3件＋その他4件。Codex trust前doctorは`degraded`と`/hooks`による確認方法を実表示 |

### C21／C24 独立判定

| 基準 | スコア | 閾値 | 判定 | Retry 2根拠 |
|---|---:|---:|---|---|
| C21 Clarity Hook・host parity | 4/5 | 5 | **FAIL** | 共通router、両CLIのtrust／disable／manual、競合安全fixture、Stop one-shotは成立。Desktop／App 0/2、Codex compact／resume SessionStart 0、Critical live未実行が残るためゼロ許容の5ではない |
| C24 Clarity安全・統合・public-first | 4/5 | 5 | **FAIL** | candidate自身のpath／Secret／既存Skill／回帰はRetry 1どおり5相当で、新規product finding 0。ただし実host評価中の公式Codex marketplace refreshで既存private installed plugin／cacheが更新され、終了時にexact復元できない残差が1件ある。installed cache非変更のゼロ許容を満たさないため運用結果を4とする |

C24の減点はcandidate製品codeの欠陥ではなく、実host検証の隔離／復元に関するverification-infra findingである。
それでもrubricの閾値を緩めず、通常PASSへ読み替えない。

### Finding／capability／cleanup residual

| ID | 重要度 | 区分 | 状態 | 内容 | route |
|---|---|---|---|---|---|
| F-01 | Major | product | RESOLVED | 初回runtime symlink問題はRetry 1どおり解消 | none |
| V-01 | Minor | verification-infra | RESOLVED | 公式runner coverage gapはRetry 1どおり解消 | none |
| V-LIVE-01 | Major | verification-infra／verification-scope | OPEN | Desktop／Appと一部Critical liveが未実行。1 surfaceの証拠を他へ昇格できない | user decision。Generatorへ自動差し戻ししない |
| V-HOST-02 | Major | host capability | OPEN | Codex 0.147.0でPreCompactは配送されたが、compact／resume時のcandidate SessionStartは0件。router failureとは判定できない | 対象host capabilityを別実測。推測でproduct PASS／FAILにしない |
| V-UI-01 | Major | verification-infra／host capability | OPEN | Claude Desktopは状態取得timeout、Codex AppはComputer Use safety refusal。両App操作0 | UIが利用可能なfresh Evaluatorで再実行 |
| V-CLEAN-01 | Major | verification-infra／cleanup residual | OPEN | Codex candidate導入時の既存Git marketplace自動refreshでprivate版が0.10.1系から0.10.3系へ更新。candidate cleanup後も旧版へexact復元できず残存 | local旧Git objectはあるが、networkなし・公式CLIだけでは旧revision／timestampをexact復元できないため停止 |

Retry 2の新規product findingは0件である。製品不具合、host capability、verification scope、cleanup residualを
同じ「失敗」へ混在させず、上表のrouteを維持する。

### cleanup／副作用／復元

- Codex candidate `agentic-secretary@clarity-live-eval`とlocal marketplaceを公式CLIで削除した。
  candidate plugin list 0、candidate config entry 0、candidate cache 0である。
- candidateの5 hook trust／enabled stateとtemporary workspace trustを削除した。評価中は全5 Hookをdisabled後に再有効化し、
  終了時はcandidate entry自体を除去した。
- Codex評価用保存session `01a0464b-dfd1-7272-a711-890e756e9763`と
  `01a04652-cba8-7b33-bc5c-f3d33d4555ae`は、削除せずrecoverable archiveへ移した。ephemeral sessionは保存していない。
- Claude local plugin／marketplaceを削除し、candidate cacheを削除した。`plugins/config.json`、
  `installed_plugins.json`、`known_marketplaces.json`、user／local settingsの5 fileは全てbefore SHA-256へ一致した。
  評価session固有のsecurity state JSON／lock 10件と空のtemporary project memory directoryも削除した。
- Claude Desktop／Codex Appではclick、type、task／session作成、権限承認、credential入力、network、AI credit消費を0件に保った。
  Claude CLI／Codex CLIのfresh AI sessionでは承認済みcreditを使用したが、外部connector、Xmind、push、tag、release、
  public marketplace、downstream repo、実顧客data、Secretへの操作は0件である。
- Codex `config.toml`のbefore SHA-256は
  `05410eb7f94c3c5cca3eb0e0db0390f6dabf085d1d8cdc1f4101c355744f238f`、cleanup後は
  `ce94e31de59511db043d88b8c74eb4d816e4c15362bfd58c2b1ed846e6ed3907`。差分は既存
  `marketplaces.agentic-secretary`の`last_updated`と`last_revision` 2行だけである。
- 残差のbeforeはversion `0.10.1+codex.20260814074627`、revision
  `51f850a771618a8ad445e39e0dd939fb6515820b`。afterはversion
  `0.10.3+codex.20260827213803`、revision `e9bc1882247403c90b47ce593f3bb25d7b79e99d`である。
  local cloneには旧commit／plugin tree `322585a036b8ffaf76a501f5d23dbe7873c4940b`が残るが、旧cache実体はない。
  公式CLIでtemporary local marketplaceを使うとsource type／pathがbefore不一致となり、Git URL＋旧refはnetwork fetchを要する。
  exact revision／timestampまで戻せない条件に該当したため、private pluginの追加remove／add、checkout、direct cache edit、
  config手書き復元は行わなかった。
- Mac temporary fixture／marketplace／backupはsanitized要約を本節へ転記後に削除した。Windows環境への副作用は0件。

### Retry 2 Evaluator 自己レビュー

- Retry 1を改変せずRetry 2だけ追記したか: yes
- candidate SHA、評価開始HEAD、branch、Mac／Windows境界を分けたか: yes
- Claude CLI／Desktop、Codex CLI／Appを4 surfaceで別判定したか: yes
- CLI証拠をDesktop／Appへ昇格していないか: yes
- fixture 40/40をCritical liveへ昇格していないか: yes
- trust前、trust後、disabled、manual fallback、Stop one-shot、canonical不変を実測値で記録したか: yes
- Codex compact／resume SessionStart 0を成功へ推定していないか: yes
- App UI未実行をproduct defectへ誤分類していないか: yes
- private plugin自動更新残差を隠さず、candidate product findingと分離したか: yes
- WindowsをMac結果から対応済みへ昇格していないか: yes
- state、spec、code、test、progressを編集していないか: yes
- 最終分類根拠: candidateの新規product findingは0件だが、C21とC24のゼロ許容thresholdを満たさない。
  未達の主因はDesktop／Appを操作できないverification scope、Codex host event capability未確認、実host cleanup残差である。
  よって`verification-scope-issue`としてユーザー判断へ返す。
