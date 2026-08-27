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
