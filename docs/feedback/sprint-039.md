# Sprint 039 — Independent Evaluator feedback

## 判定

**FAIL — implementation-issue**

候補 `17c6a19e75aa4822f688d07cb88e4bb8847bf845` はSprint専用回帰、identity、registry、
resolver、author metadata、下流handoffの多くを満たした。一方、独立fixtureでuser-scope opt-inを破る
rename、AGENTS.mdの無関係な利用者記述まで変更するrename、有効な直接呼びかけを落とすroutingを再現した。
いずれもC5・C10・C15・C16のゼロ許容境界に反するため不合格とする。

また、新しいname Skillを追加したcandidate自身が `check-report-schema.py` の正当なsurface件数を
20のまま残し、checkout／archiveのmaster gateを失敗させた。これは開始commitにはないcandidate起因の
product integration欠陥であり、AC12／AC14をPASSにできない。開始commitから存在したdigest不一致と、
このsandbox固有のloopback `EPERM` は別のverification-infra findingとして分離する。

## 評価対象

- Candidate: `17c6a19e75aa4822f688d07cb88e4bb8847bf845`
- Orchestrator state-only HEAD: `b2e46d7`（製品候補の判定には不使用）
- 開始commit比較: `7d861e9`
- Clean checkout: `/private/tmp/agentic-s039-eval.Pisgmo/checkout`
- Git-free archive: `/private/tmp/agentic-s039-eval.Pisgmo/archive`
- 独立fixture: `/private/tmp/agentic-s039-eval.Pisgmo/adversarial.mjs`
- UI: なし。screenshot不要。

## Product findings

### P1 — renameが無効なuser-scope routingを無断で有効化する

**分類:** product / C5・C10・C15・C16 / blocker

managed blockが一度も存在しない合成HOMEへ、通常の `AGENTS.md` と `CLAUDE.md` だけを用意した。
`rename-preview` はuser-scope対象を0件と報告したが、identityのrenameをA=current-configとして確認して
`applyRename(... home, confirmedClasses:["current-config"])` を実行すると、Codex／Claudeの両fileへ
managed blockが新規作成された。

観測:

```text
CASE disabled-routing-after-rename [{"host":"codex","enabled":true},{"host":"claude","enabled":true}]
```

原因は `applyRename` がHOME内の既存fileについて、managed blockが現在有効かを確認せず
`composeManagedBlock(..., operation:"enable")` を呼ぶことにある。名前変更とrouting設定は別操作であり、
user-scope連携は明示opt-in後だけ有効化する契約なので、既存blockがある対象だけを更新し、無効なhostは
無効のまま保つ必要がある。

### P2 — AGENTS.md全体をcurrent-configとして扱い、無関係な利用者記述まで置換する

**分類:** product / C5・C10・C16 / blocker

隔離workspaceの `secretary/AGENTS.md` に表示名fieldと、利用者記述
`顧客Alexの案件は変更しない` を併記した。previewはfile全体をA=current-configに分類し、apply後は次のように
利用者記述まで変わった。

```text
CASE agents-collateral "- 表示名: Morgan (AI Secretary)\n- 顧客Morganの案件は変更しない\n"
```

これは分類別renameではなく、A file内の全出現へblind replacementを行っている。AGENTS.mdでは製品所有の
identity fieldだけを更新し、カスタマイズ・顧客名・自由記述はBまたはDとして個別表示・確認する必要がある。

### P3 — 人間文脈語や引用が依頼本文にあるだけで、有効な直接呼びかけを落とす

**分類:** product / AC7・C16 / major

次の全caseは文頭で現在名へ直接依頼しているが、routerは `none` を返した。

```text
Morgan、顧客への提案書を作って       -> none / human-or-business-context
Morgan、取引先の予定を整理して       -> none / human-or-business-context
Morgan、著者Alexの本を調べて          -> none / human-or-business-context
Morgan、「Q3」の文言を直して          -> none / quote-code-or-body
```

negative語を文全体へ先に適用するため、呼びかけ対象ではなく依頼内容に「顧客」「取引先」「著者」や引用が
含まれるだけで正caseを抑止する。`Morganさんに聞いて`、`取引先Morganに聞いて`、`author Morganに聞いて`
は独立fixtureでもrouting 0を維持したので、人間negativeを保ったまま文頭の直接呼びかけ部分と依頼本文を
分離して判定する必要がある。

### P4 — name Skill追加にreport-schema validatorが追随せず、candidateのmaster gateが失敗する

**分類:** product integration / AC12・AC14・C6 / major

同じcommandを開始commitとcandidateで比較した。

```text
7d861e9: python3 scripts/check-report-schema.py --plugin-root plugins/secretary
exit 0: SCHEMA_OK ... surfaces=20 ... PASS=1 FAIL=0

17c6a19: python3 scripts/check-report-schema.py --plugin-root plugins/secretary
exit 1: SCHEMA_ERROR unexpected user-facing surface count: 21 (expected 20)
```

新しいname Skillは意図したuser-facing surfaceなので、正本inventoryとnegative fixtureを21面へ整合させる必要がある。
archive masterではこの1件が複数suiteへ伝播して5 required suiteを失敗させた。固定件数を単に緩めず、name Skillを
正式inventoryへ加えたうえで未知surfaceを引き続き拒否すること。

## Verification-infra findings

### V1 — Sprint 033 neutral-base digestは開始commitから不一致

`node scripts/sprint-033-test.mjs --root .` はcandidateと開始commit `7d861e9` の両方で同じ位置に失敗した。

```text
plugins/secretary/rules/safety.md
actual   d07eb28d35986f5e11ea244ca848bd34c2ce66fe5a433981d06a7f02f33607d1
expected fa098672a314a66f377cbe7ce4d2ee612aee4d3b6c4777f7873c27a319944362
```

Sprint 039 diff起因ではないためproduct findingへ昇格しない。ただしAC14のmaster 0 FAIL証拠には使えず、
別途baseline修復が必要である。

### V2 — Sprint 035 Patch 001の既存digest不一致は開始commitでも同じ

`bash scripts/sprint-035-patch-001-regression.sh` はcandidate、開始commitとも
`SPRINT035_PATCH001_REGRESSION_PASS=5 ... FAIL=4`。IME／検索fixtureのwizard asset digestと上記Sprint 033
digestが既存正本に追随していない。Sprint 039 product diff起因ではない。

### V3 — loopback listen EPERMはsandbox制約で開始commitでも同じ

Chatwork／Google Chatのwizard回帰はcandidate、開始commitとも次で停止した。

```text
Error: listen EPERM: operation not permitted 127.0.0.1
code=EPERM syscall=listen address=127.0.0.1
```

このsandboxのloopback listen拒否であり、Sprint 039 product failureには数えない。offline masterはこの長時間
historical面まで実行後、評価収束指示に従って中断したため、offline master全体PASSは未確認である。

## 実行証拠

| Command / surface | Exit | 結果 |
|---|---:|---|
| current repo `bash scripts/sprint-039-regression.sh` | 0 | product 56 PASS / 0 FAIL、wrapper 7 PASS / 0 FAIL |
| clean checkoutで同command | 0 | 同じ63/63 PASS |
| Git-free archiveで同command | 0 | 同じ63/63 PASS |
| checkout `python3 scripts/check-release-integrity.py --root .` | 0 | manifest／CHANGELOG整合PASS |
| archiveで同command | 0 | 同上 |
| checkout `node scripts/agentic-codex-plugin-test.mjs --root .` | 0 | 4 PASS / 0 FAIL |
| archiveで同command | 0 | 4 PASS / 0 FAIL |
| archive `node scripts/archive-release-gate.mjs --root .` | 0 | 14 PASS / 0 FAIL、`.git`なし確認 |
| clean checkout `node scripts/sprint-039-handoff.mjs --root .` | 0 | full SHA、common digest、除外／保護path、rollbackを出力 |
| archive master `node scripts/master-release-gate.mjs --mode archive ...` | 1 | Sprint039はPASS。report-schema 21/20が伝播しrequired 5 FAIL |
| offline master | 130 | 長時間実行を収束指示で中断。途中でreport-schema、既存digest、loopback infraを再現 |
| candidate／開始commit `node scripts/sprint-033-test.mjs --root .` | 各1 | 同一neutral-base digest不一致 |
| candidate／開始commit `bash scripts/sprint-035-patch-001-regression.sh` | 各1 | 同一5 PASS / 4 FAIL。既存digest＋loopback EPERM |
| independent adversarial fixture | 0 | P1〜P3を観測し、CRLF/mode、parent symlink、全対象rollback、B traversalはPASS |

## AC評価

| AC | 判定 | 根拠 |
|---:|---|---|
| 1 | PASS | 希望名、おまかせ、取消相当、8不適格入力、確認前write 0、owner呼び方不変を隔離fixtureで確認。 |
| 2 | PASS | stable UUID、`ai-secretary`、aliases、AI author metadata、rename後stable ID／過去author不変。 |
| 3 | **FAIL** | 専用enableは確認前write 0だが、renameがrouting無効状態を無確認で有効化する（P1）。 |
| 4 | PASS | regular／override優先、Claude、重複block拒否、既存内容／他block保持を合成HOMEで確認。 |
| 5 | **FAIL** | atomic rollback／disable／冪等性の正常fixtureはPASSしたが、renameがdisabled状態を保持しない（P1）。 |
| 6 | PASS | registry許可metadataだけ、実体path、edition、identity、必要正本、欠落／重複／移動／symlink停止。 |
| 7 | **FAIL** | canonical解決とcwd副作用0はPASS。直接呼びかけ正caseが依頼本文中のnegative語で落ちる（P3）。 |
| 8 | PASS | 人間／顧客／author／引用／code／file本文の既定negativeと曖昧一度確認はPASS。追加human fixtureもrouting 0。 |
| 9 | **FAIL** | previewはread-onlyでA〜Dを表示するが、AGENTS.md内の利用者記述をAへ誤分類する（P2）。 |
| 10 | **FAIL** | stable ID、C保持、alias、D不変、選択B、全対象rollback、retry安全は確認。一方、Aの全file置換とrouting再有効化が契約違反。 |
| 11 | PASS | 同名、alias衝突、missing／duplicate／opposite edition、parent／target symlink、read-only、部分失敗をsafe stop。 |
| 12 | **NOT PASS** | 対象回帰はgreenだがcandidate起因report-schema FAIL、既存baseline FAIL、Windows nativeで新identity面はnot-run。未実行をPASS扱いしない。 |
| 13 | PASS | 全Sprint039 fixtureは合成HOME／隔離workspace。実HOME digestと実下流statusを前後確認し、外部write 0。 |
| 14 | **FAIL** | checkout/archiveのSprint039・manifest・Skill・release integrityはgreenだが、archive masterがcandidate起因report-schemaでFAIL。offline全完走もなし。 |
| 15 | PASS | handoffはAgentic full SHA、common paths、excluded paths、Yasashii/private保護path、rollbackを明示。実下流変更0。 |
| 16 | **FAIL** | fresh独立Evaluatorが実操作しP1〜P4を再現。下流、実HOME、Mac mini、external publish変更0。 |

## Rubric scores

ゼロ許容項目は1件の違反でも5/5にしない。

| Rubric | Score | 判定根拠 |
|---|---:|---|
| C2 構文・整合 | 5/5 | identity／registry schema、manifest、Skill tree、Node構文、release metadataは整合。 |
| C5 安全・規律 | 2/5 | renameがuser-scope opt-inを迂回し、AGENTSの無関係な利用者内容を変更する。 |
| C6 無回帰 | 2/5 | target suiteはgreenだがcandidate起因schema gate FAIL。全master 0 FAIL証拠なし。 |
| C9 配布チャネル非依存 | 5/5 | 共通CLI／Skillは任意絶対install path・Claude／Codex共通treeで検証。実cache依存なし。 |
| C10 更新の安全性 | 2/5 | rollback自体は確認したが、preview非表示のuser-scope enableとblind replacementがある。 |
| C12 release履歴・candidate整合 | 4/5 | 0.9.2 manifest／CHANGELOGは一致。candidate release masterはreport-schemaで未達。 |
| C13 edition分離・互換 | 5/5 | 固定full SHA、common tree digest、除外／保護pathを確認。下流write 0。 |
| C14 Markdown可読性 | 5/5 | name／onboarding copyは段落・箇条書きで影響と確認を示す。 |
| C15 authorization・意味保存 | 2/5 | rename authorizationがrouting有効化のauthorizationへ誤って拡張される。 |
| C16 identity・routing・rename | 1/5 | stable identityは成立するが、opt-in迂回、誤分類置換、正routing欠落の3境界違反。 |

## Portability／security review

- CRLF既存fileはmanaged block更新後も孤立LF 0、mode `0640`保持を確認した。
- `.codex` parent symlinkと対象file symlinkは副作用前に拒否した。workspace symlink／反対edition／正本欠落も停止した。
- B path traversal `../outside.md` はpreview外として拒否した。
- failure injectionをuser-scope 1件書込み後まで進め、identity、AGENTS、選択B、Codex、Claudeの全bytesが開始前へ戻ることを確認した。
- Windows既存fileのatomic replaceはコードレビュー対象にしたが、今回の候補SHAをWindows nativeでは実行していない。Nodeのrename挙動を別OSの模擬だけでWindows PASSへ昇格していない。明白なWindows限定product defectはこの実行環境では確定していない。
- rollback処理そのものが失敗する二重故障は専用hookがなくnot-run。成功としては扱わないが、今回のblocking findingはP1〜P4で確定している。

## 修正後の再評価条件

1. renameは既にmanaged blockが有効なtargetだけを更新し、disabled／未作成状態を保つ。
2. AGENTS.mdは製品所有identity fieldを構造的に更新し、同file内の利用者本文をB/Dへ分離する。
3. routerは直接呼びかけ部分と依頼本文を分け、人間negativeを維持したまま今回の4正caseをrouteする。
4. report-schemaの正式surface inventoryへname Skillを追加し、unknown surface拒否のnegative fixtureを維持する。
5. clean checkoutとGit-free archiveでSprint039、release integrity、Skill／manifest、masterを再実行する。
6. Sprint033／Sprint035の開始commit由来digestとloopback infraはproduct修正と混ぜず、別途正本化または正式classifierで解消する。

## 外部変更

実HOME、installed cache、Yasashii repo、private my-vault repo、Mac mini、remote、外部service、push、tag、
releaseへのwriteは0件。Evaluatorが変更した正本は本feedbackだけである。
