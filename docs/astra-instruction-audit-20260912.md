# Astra向け指示・Skill横断監査（Secretary public source）

## 現在の追加承認scope（Sprint059／0.13.2 candidate）

2026-09-12の追加承認で、保留だったroot guidanceの局所修正と正式リリースまでが対象になった。以下のSprint058記録は当時の判断と検証履歴として保持し、現在の状態は本節とSprint059 progress／feedback／stateで確定する。

| 既出項目 | 今回の状況 → 対応／残す理由 |
|---|---|
| 1／2／3／4／11 | Sprint058独立PASS済み製品修正を最新公開sourceへ保持。current request、run-once、read／setup／diagnosis、条件付きcontext、影響検査が該当。 |
| 5／7／9／10／14 | root `AGENTS.md`、`CLAUDE.md`、`docs/harness-guidance.md`の具体的矛盾を局所修正。安全・role・counterを維持する代替の内容とreview拒否は末尾に記録。Harness両版v0.5.5の正式公開・独立PASSを親から受領した。Secretary互換baselineは別の0.5.1として保持。 |
| 6／13 | publicには該当storage／private Skillなし。my-vault／private ownerへ引渡し済みで、親の完了報告を受領。private内容はpublicへ移植しない。 |
| 8 | Secretary自身にHarness SessionStart全体注入はない。Harness owner側のv0.5.5公開PASSに所属する修正として参照する。 |
| 12 | 最新remoteと公開tagを再実測し、公開0.13.1から0.13.2を準備。installed private0.13.0とは異なるeditionであり、cache変更／利用者workspace一括更新を行わない。 |
| 15 | consulting slidesの共有writerはpublic Secretaryに存在せず非該当。 |
| A1〜A6／Retry1の2件 | 現public runtimeと17 Skillsへ修正を保持。Yasは最新0.13.1に同runtimeがあるため、古い0.10.3の「runtimeなし」という観測を現在版へ流用せず、固定PASS sourceから限定移植する。 |

- remote Agentic main: `9903b34b4333dcab10fd2204e8664f43aecbbea6`、公開v0.13.1 tag: `4d86d47d6ebada92ecd0b731b41320202569bd93`。`gh`の再実測が成功し、旧Forbiddenは解消した。
- public Yas main: `4bf0552200d432320b1ccd8f7365c158970062a2`、公開v0.13.1 tag: `849af0b8a5712b450a8d55b091af67ce255d9f49`。旧ローカル0.10.3を最新版として配布せず、最新remote cloneの17 Skills／Clarity／Voiceを保持する。
- Harness正本の公開再実測: https://github.com/mtaiseeei/agentic-harness/releases/tag/v0.5.5 （target `d80865042538fd906dc7c062c0d635777f308ff0`）、https://github.com/mtaiseeei/yasashii-harness/releases/tag/v0.5.5 （target `2510439fd362069bbd73446d64a2918bc279a3cd`）。独立PASSは親の報告、公開metadataは本担当のgh API読取証拠として区別する。
- 移行／配布: managed AGENTS／CLAUDEの変更には内容変更migrationを追加する。利用者所有preferences本文は上書き対象にしない。旧overlay／accepted SHAなど固定履歴は保持し、current version／content hashだけを更新する。
- 現在のsourceは公開前candidate。正式公開・実artifact評価・対象SHA／URLはSprint059 state／feedbackで確定する。元repoの開始dirty hashは保持し、関連局所差分の反映時にbefore／afterを別記する。

## Sprint058当時の監査記録

監査日: 2026-09-12

この記録は `agentic-secretary` の公開source（`plugins/secretary/`、0.13.1、17 Skills）を対象にした。
利用者が依頼した15件のseedを起点に、実際の到達経路、Skill description、rules、templates、adapters、hooks、runtime router、
およびそれらを拘束する検査を確認した。必要な局所修正は同じsourceへ行い、private版、installed cache、別repo、rootの既存dirty guidanceは変更していない。

## 版と所有境界

- sourceのClaude/Codex manifestは `0.13.1`。この監査で変更したのはsourceとそのaffected testだけである。
- installed `/Users/taisei/.codex/plugins/cache/agentic-secretary/agentic-secretary/0.13.0/.codex-plugin/plugin.json` は `repository=agentic-secretary-my-vault` のprivate版であり、source 0.13.1と同一製品のbyteとは扱わない。installed cacheへ反映していない。
- source `edition.json` が記録するHarness互換基準は `0.5.1`。監査時に見えているinstalled Harness `0.5.4`は実行環境の観測値で、sourceの宣言を推測変更していない。
- `gh release view --repo mtaiseeei/agentic-secretary --json tagName,publishedAt,url,isDraft,isPrerelease` は Forbidden（exit 1）、webのlatestもCache missだった。state 057にある0.13.1の公開履歴と、現在の公開latest未確認を混同していない。
- public sourceには `vault-search` や private `notion-tasks` の実装を同梱しない。保存済みチャットの所有は `chatwork`／`google-chat`、Notion taskはdownstreamが存在し利用可能な場合だけ委譲する。

## seed 15件の disposition

各行は「具体的trigger → 監査前の結果 → 修正後の結果 → source位置 → edition → disposition」の順で記録する。以下の `skills/...`、`rules/...`、`scripts/...` は `plugins/secretary/` 起点である。`deferred` は未修正のまま放置したという意味ではなく、所有repoまたは保護されたrootの変更が必要なため、このsourceの局所修正から切り離したことを示す。

| # | 状況 → 修正内容・残した理由 | source位置 / edition | disposition |
|---|---|---|---|
| 1 | 「前回の続き」がある状態で「今日の予定を見せて」と言うと、resumeが先に提示され得た。現在の依頼を先に処理し、resumeは再開要求・関係性・用件欠如のときだけ確認する。関係のないしおりを消去・上書きしない。 | `skills/secretary/SKILL.md` 起動時のしおり、`skills/memory-care/SKILL.md` 再起動しおり、`setup-*/SKILL.md` step 0 / public共通 | fixed |
| 2 | 「口調をfriendlyにして」のような明示された可逆変更について、単一設定を同じturnで一度だけ実行する境界自体は元から実装済みだった。一方、settingsとmemory-careの確認が重なり、settingsがjournal／commit前にsavedを宣言していた。明示値は同じturnで正規seamを1回だけ実行し、更新・journal・commitの後だけsaved、後段失敗はpartialとして未完了効果だけ再試行する。owner-name transactionのrollback境界は残した。 | `skills/settings/SKILL.md` 保存工程・例文、`skills/memory-care/SKILL.md` settings委譲 / public共通 | fixed |
| 3 | 「Gmailを検索して」「Googleにつなぎたい」「Chatwork履歴を検索して」がsetupや別Skillへ近接し、単なるdiagnoseも広く拾い得た。Google／Microsoftのreadはhost connector handoff、connectionはsetup、保存済み履歴はchat Skill、対象付き接続診断はconnectionsへ分け、tool unavailableを未接続と断定しない。publicにないvault-searchへ送らない。 | `scripts/lib/collaboration-router.mjs`、`skills/secretary`、`skills/{connections,setup-google,setup-microsoft,chatwork,google-chat}/SKILL.md` / public共通 | fixed |
| 4 | plain-languageが全rules・copy・preferencesを毎回読む契約で、leafも同じ鎖を再読していた。安全・実行境界を同じplugin実体／workspaceの未変更中に一度だけ読み、変更時は該当fileだけ再読し、evidence・style・surface copy・preferencesを必要時だけ読む。standalone leafの安全境界は残した。 | `rules/plain-language.md`、`rules/styles/{agentic,yasashii}.md`、各Skillのentry guidance / public共通 | fixed |
| 5 | Harnessのverification-infra failureや、受入条件を変えないbounded test修理までuserへ戻す経路は、Harness loopの所有範囲にある。このsourceのaffected testは、read/setupの意味変更に合わせてscenario期待値を修正した。評価独立性と本当のscope／criteria変更時のuser gateを残すため、Harness本体のroutingは書き換えていない。 | root `AGENTS.md`／Harness agents・guidance（既存dirty保護）、`scripts/sprint-049-test.mjs` / source側は一部fixed、Harnessはdeferred | deferred |
| 6 | my-vaultの古いPJ rootやChatwork／Google Chat scheduleは、このpublic sourceのcanonical workspaceではない。実workspaceのstorage／workflowを持つmy-vault側の所有で、root guidanceも既存dirtyのため変更しなかった。 | my-vaultとroot guidance / private downstream | deferred |
| 7 | Harness loop monolithとagents／templatesの複製はHarness repoの所有。Secretaryのbuild入口はHarnessのcanonical files／rolesを置換せず、記録された互換基準と実利用可能versionを分ける説明へ直した。 | `skills/build/SKILL.md`、`edition.json` / public source fixed; Harness repo deferred | deferred |
| 8 | Claude SessionStartがHarness Skill全体を無条件注入する問題はHarness hookの所有。Secretary sourceの通常routerは同一session・未変更条件の必要contextだけを使い、CodexへClaude hookの挙動を推測適用しない。 | Harness `.claude` hook（root／別repo） / Secretary entryはfixed | deferred |
| 9 | 小さい変更を一律に3 role roundtripへ送るmicro policyはHarness contractの所有。このsourceは新しいUI／behaviorを追加せず、明示設定・既存確認境界を維持した。 | Harness sprint contract、`skills/build/SKILL.md` / public source scope外 | deferred |
| 10 | resumeや全statusで全contractを再読する一律手順は、変更されていないsourceまで読み直す。現在用件と対象の必要contextを先に解決し、同じplugin実体・workspace・未変更fileの間だけ再利用、変更時だけ再読する。内部routingでuser gateを増やさず、削除・外部write・bulkのgateは残した。 | `rules/plain-language.md`、`skills/secretary`、関連leaf / public共通。Harness state再読規則はroot ownership | deferred |
| 11 | exact文字列だけを各distributionへ複製する検査は、意味のある到達性を見落とし得た。`sprint-049`のaffected connector scenarioをroute／delegation／sideEffectで更新し、Sprint058 testにroute分離、未接続状態、context、root解決、保存状態の意味チェックを追加した。安全assertは削除していない。 | `scripts/sprint-049-test.mjs`、`scripts/sprint-058-test.mjs`、collaboration／conversation inventory / public共通 | fixed |
| 12 | build文面がHarness `0.5.1`をhostでsupportedな実versionと読める余地があり、installed private Secretary 0.13.0とsource public 0.13.1も混同し得た。`edition.json`の記録基準、hostで別途観測するversion、public／private／installedの差を分けた。cacheやreleaseを変更していない。 | `skills/build/SKILL.md`、source manifest、`edition.json` / public fixed、installed/private deferred | fixed |
| 13 | private my-vaultのCodex model/pathやGoogle Chat researchの制約は別repoの所有。public sourceにはprivate Skillを足さず、host／modelを推測せず、保存済みChatwork／Google Chatの境界を維持した。 | private my-vault Skills、別repo research agent / public source | deferred |
| 14 | root／PJ guidanceの古い履歴や全docs列挙はHarness／my-vaultの正本に属する。source templatesでは必要contextと長いread-onlyの節目連絡を参照する形へ整理したが、既存dirty root guidanceは保護した。 | root `AGENTS.md`、`CLAUDE.md`、`docs/harness-guidance.md`（変更禁止）、`plugins/secretary/templates/{AGENTS,CLAUDE}.md` / template fixed、root deferred | deferred |
| 15 | consulting slidesが共有rules／template CSSへfeedbackを自動追記する問題は、このsourceに該当するartifact writerがない。shared ruleの維持を自動副作用にせず、別repoのartifact／明示scopeに残した。 | consulting slides workflow（別repo） / public source | not-applicable |

## 追加で見つかった問題

| id | 状況 → 修正内容 | source / edition | disposition |
|---|---|---|---|
| A1 | `CONNECTOR_ROUTES` のGoogle／Microsoft operation regexがread／searchまでsetupへ送っていた。read専用routeをsetup判定より前に追加し、`secretary` のhost connector handoff（sideEffect 0）へ返す一方、connect／re-authは既存setupに残した。runtime routerはAgentic public sourceだけに存在し、Yasashii側に同じ実装があるとは扱わない。 | `scripts/lib/collaboration-router.mjs`（read route／setup route）、`skills/secretary/SKILL.md`（handoff） / Agentic runtime＋public共通Skill文面 | fixed |
| A2 | read handoffの `selectedSkill=secretary` をそのまま再ロードすると、handoffのroute／delegationを無視してrouterを再帰できた。`secretary` routeは同Skillを再読せずhost official connectorへ1回渡し、`notion-tasks`はprivate downstreamの存在・利用可能性を確認できる場合だけ委譲する。 | `skills/secretary/SKILL.md` / public共通 | fixed |
| A3 | setup step 0がconnector capability確認前にresumeを書き、完了時に別作業のしおりを消し得た。capability確認→実際に中断し得る場合だけ専用しおり→成功／中断不要時だけ同じしおりをclearへ順序変更した。workspace未解決でも接続説明とcapability確認は続け、setup目的の初期化はしない。 | `skills/setup-google/SKILL.md`、`setup-microsoft/SKILL.md`、`setup-notion/SKILL.md` / public共通 | fixed |
| A4 | 全leafのBash `case`／`dirname`絶対path例はWindows hostでそのまま実行できず、cwd推測を誘発する。すべてのpublic leafをNode `path.dirname`／`path.join`と配列引数、実Skill fileを別引数にするhost-neutral resolver案内へ変更した。空・相対・placeholderはfail-closedのままにした。 | 17 `skills/*/SKILL.md` / public共通 | fixed |
| A5 | dailyの軽いprobeが読めない場合に未接続と扱う余地があり、外部connector失敗でlocal TODOまで止まり得た。成功、実際のnot connected、未確認、errorを分け、指定された照会を最初のprobeに再利用し、local TODOは可能な範囲で続ける。 | `skills/daily/SKILL.md` / public共通 | fixed |
| A6 | decision settingとpreferencesを毎session読む文面が、短いroutingにも不要な再読を要求していた。決定確認が必要なときだけ該当節を読み、変更されたplugin／workspace／fileだけ再読する。明示されたsettings値の同じturn保存はmemory-careへ戻さない。 | `skills/secretary/SKILL.md`、`skills/settings/SKILL.md`、`templates/memory/preferences.md` / public共通 | fixed |

## 変更pathと因果

- `plugins/secretary/scripts/lib/collaboration-router.mjs`: A1。read／setupの分離とroute metadataを追加したため、CLX-018の期待値を更新した。
- `plugins/secretary/skills/secretary/SKILL.md`: 1、3、A2、A6。current request、resume、handoff metadata、private downstream境界を同じ窓口へ反映した。
- `plugins/secretary/skills/{memory-care,settings,daily,connections,setup-google,setup-microsoft,setup-notion}/SKILL.md`: 1、2、3、5、A3、A5。保存・状態・setupの順序と説明を現行seamへ揃えた。
- `plugins/secretary/skills/{build,chatwork,clarity,google-chat,name,onboarding,projects,update,weekly}/SKILL.md`: 4、6、A4、A6。共通entry参照、version／host説明、leaf root解決、該当contextの再読条件を整理した。
- `plugins/secretary/rules/{plain-language,common-language}.md`、`rules/styles/{agentic,yasashii}.md`: 4、7、A6。short readの無言完了とlong read-onlyの開始／節目通知を分け、serializer一回の境界を維持した。
- `plugins/secretary/templates/{AGENTS,CLAUDE}.md`、`templates/memory/preferences.md`: 4、7、14、A6。workspace側への到達可能な共通入口と条件付きpreferencesを整理した。
- `scripts/sprint-049-test.mjs`、`scripts/sprint-058-test.mjs`、current-content inventory checksum: 11。意味シナリオと変更したsource checksumを追従させた。過去accepted candidate／base／handoff／provenanceの固定値は変更していない。

## 検証と既知の限界

検査は変更面とaffected regressionへ限定した。全Node／間接Node検査は
`python3 /private/tmp/astra-secretary-heavy.py <command>` を使い、各成功実行でNode数は上限内だった。途中のheavy lock busy（exit 75）2回は編集を継続して後で再試行し、lockを横取りしていない。

| command | exit / result | wrapper観測 |
|---|---|---|
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-058-test.mjs` | 0、`SPRINT058_PASS=8 FAIL=0` | NODE_BEFORE=36 / NODE_AFTER=36 |
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-029-rule-boundary-test.mjs` | 0、`SPRINT029_RULE_PASS=25 SPRINT029_RULE_FAIL=0 WIZARD_DIGESTS=5` | 36 / 36 |
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-049-test.mjs` | 0、`SPRINT049_PASS=20 FAIL=0`、side effect violations 0 | 36 / 36 |
| `python3 /private/tmp/astra-secretary-heavy.py bash scripts/sprint-011-regression.sh` | 0、`PASS=73 FAIL=0` | 36 / 36 |
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-035-test.mjs` | 0、`SPRINT035_PASS=15 SPRINT035_FAIL=0` | 36 / 36 |
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-032-patch-002-test.mjs` | 0、`SPRINT032_PATCH002_PASS=32 SPRINT032_PATCH002_FAIL=0` | 36 / 36 |
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-052-secretary-voice-test.mjs` | 0、`SPRINT052_VOICE_PASS=3 SPRINT052_VOICE_FAIL=0` | 36 / 36 |
| `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-049-inventory.mjs digests` | 0、current-content digestを更新 | 36 / 36 |
| parent実行 `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-040-test.mjs` | 0、`SPRINT040_PASS=15 FAIL=0` | 32 / 35 |
| `ruby /private/tmp/astra-secretary-frontmatter.rb /Volumes/ExternalSSD/workspace/agentic-secretary` | 17 Skills、`RUBY_PSYCH_FRONTMATTER_PASS=17 FAIL=0` | system Ruby/Psychのname／description型検査 |

上記のほか、調整中のSprint058／011／035／052の再実行では一時的なstatic assertion failureを修理し、最終結果を表へ記録した。heavy wrapperはこの作業で16回呼び出し、うちlock busyが2回だった。baselineは `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-029-rule-boundary-test.mjs` の exit 0、PASS25／FAIL0／WIZARD5、NODE_BEFORE=32／NODE_AFTER=32である。

Ruby/Psychのfrontmatter検査はPyYAML版の代替syntax／型証拠であり、`GENERIC_QUICK_VALIDATE=INCOMPLETE (Python PyYAML unavailable)` を別状態として残した。これはoffline source／fixture検証であり、live LLM、hostをまたぐ接続、OAuth、外部write、browser UI、release／cache反映を検証済みとは書かない。source／installed／public latestの区別、Forbidden／Cache miss、private cache未変更を上記版境界に記録した。

## Sprint 058 Retry1 — 独立評価の追加finding対応

初回独立Evaluatorが、自然文のruntime routeで次の2件を追加確認した。いずれもrouterの副作用は0件だったが、現在の依頼の意味と段階ロード先がずれていたため、implementation-issueとして修正した。

| finding | 状況 → 修正内容 | 実検査 / 対象path | disposition |
|---|---|---|---|
| 1 | 「Googleの接続状態を確認して」「Microsoftの接続状態を確認して」が単独readへ流れ得た。`CONNECTIONS`へ接続状態・状況・可否・有無の確認表現を追加し、接続状態診断を個別readより先に`connections-read-only-diagnosis`へ送るようにした。 | `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-058-test.mjs`（exit 0、8/0、route side effect 0）、`plugins/secretary/scripts/lib/collaboration-router.mjs`、`scripts/sprint-058-test.mjs` | fixed |
| 2 | 「Googleを接続して、予定を見て」「Microsoftを接続してOutlookメールを読んで」がread-only handoffだけになりsetupが消えていた。明示setupを単独readより先に判定し、`setup-google`／`setup-microsoft`の結果へ`followUp`として公式connector readを`after-setup`で保持した。 | 同上の8/0に加え、`python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-049-test.mjs`（exit 0、20/0、side effect 0）、`plugins/secretary/scripts/lib/collaboration-router.mjs`、`plugins/secretary/skills/secretary/SKILL.md`、`scripts/sprint-058-test.mjs` | fixed |

判定順は「接続状態診断 → 明示setup → 単独read」。Chatwork／Google Chatは既存の専用入口を維持し、診断・setup・readの全routeで`sideEffect`はfile／adapter／command／externalとも0件である。今回の変更に伴い`collaboration-inventory.json`の`secretary-router`と`conversation-core-inventory.json`の`skill-secretary`だけcurrent-content digestを更新した。過去のaccepted candidate／base／handoff／provenanceは変更していない。

最終状態: fresh独立増分再評価PASS、今回対象の未解消finding 0。初回FAILと解消根拠は `docs/feedback/sprint-058.md` に保持し、`docs/sprints/state.md` でSprint 058をdoneとした。

## 追加承認後のroot guidance局所修正（Sprint059）

- 自動承認レビューは、`AGENTS.md`と`docs/harness-guidance.md`の削除・再作成による全面短縮、およびAGENTSの大幅短縮を2回拒否した。理由は「必要な差分だけ」「既存ルールを保持」の範囲を超え、所有境界・検証・安全規則を弱めるという判断だった。いずれも変更は適用されていない。
- 利用者はその後「必要な具体的矛盾をすべて局所修正できれば全面短縮は不要」と明示した。全面短縮を別手段で再試行せず、既存role・counter・model・検証・安全規則を保持して局所修正した。
- 代替で解消: 5の検証基盤問題の一律user差戻しを、合否・証拠を変えない1回の限定修理と独立再評価へ分岐。7/14は既存安全説明を残してinstalled canonical entryと条件付き参照を追記。9は低リスク同一flowを既存checkまたは再現可能な独立実操作で確認できるmicroに限定。10は現在state/counter確認を保持し、変更依存だけ再読・再評価、無関係dirtyを保護した証拠再利用へ統一した。
- 追加の実害を解消: `CLAUDE.md`の古いHarness checkout全面read禁止を、利用者承認済みcanonicalのread-only参照と別owner write禁止へ適応。固定Harness0.5.0説明を現configの上限へ置換。initializerのno-overwriteと明示承認された局所保守を区別した。Macの実測、Node40/60、Playwright2以下、共通lock、他PJ非接触を保持する。
- 対象: root `AGENTS.md`、`CLAUDE.md`、`docs/harness-guidance.md`。参照した正本はHarness担当の`plugins/harness/templates/AGENTS.md`、`templates/docs/harness-guidance.md`、`skills/harness-loop/references/scope.md`。旧installedにsplit referenceが無い場合も実在entryを使い、欠落pathを必須にしない。
- 局所検証: `git diff --check -- AGENTS.md CLAUDE.md docs/harness-guidance.md` はexit0。旧一律差戻し、global clean要求、既存自動check必須、全面接触禁止、固定0.5.0の現行矛盾表現は3fileから除去。安全規則を全文削除する短縮は未実施のまま残すが、その方法自体は今回の完了条件ではない。独立評価で実害ある未修正の有無を確認する。
