# Sprint 050 Patch 002 — Claude標準Hookの重複manifest宣言を解消する

- Type: micro
- Risk: standard（Claude Codeのsource manifest 1 fieldと、そのhost差を検査する既存assertだけを狭く変更する）
- 依存: `sprint-050` done-by-user-decision、`sprint-050-patch-001` done
- 対象機能: F70 Claude Code／Codex共通command-only lifecycle hook、F79 public-first packaging
- 主眼: Claude Codeが標準pathの`hooks/hooks.json`を自動読込する契約に合わせ、Claude manifestの重複した`hooks`宣言だけを省く。Codex manifestの明示参照と共通Hookの実装bytesは維持する。

## 背景と正本判断

Claude Code `2.1.232`へprivate版を実際に導入した際、`claude plugin list --json`は次を報告した。

```text
Hook load failed: Duplicate hooks file detected: ./hooks/hooks.json ... The standard hooks/hooks.json is loaded automatically, so manifest.hooks should only reference additional hook files.
```

private版で`.claude-plugin/plugin.json`から`hooks` fieldだけを除くと、同じ導入面のエラーは解消した。
これは本Patchを始めるupstream triggerとして採用する。ただしprivate hostの結果はpublic source candidateの
実install、live conversation、Hook発火、Evaluator PASSではなく、Sprint 050のAC3／C21を満たした証拠へ昇格しない。

Claude CodeとCodexの差は、Hook本体を複製する理由ではなく、manifestから標準Hookを見つける方法の差である。
Claude Codeは標準`hooks/hooks.json`を自動読込するためmanifestで再宣言しない。Codexは
`.codex-plugin/plugin.json`の`hooks: "./hooks/hooks.json"`を維持する。両hostは同じ物理Hook fileと
Clarity routerを使用する。

## micro判定

- 変更は同じ配布pluginのClaude manifest 1 fieldと、そのhost差を誤って同一視している既存assertへ閉じる。
- manifest、共通Hook、Project Clarity packagingを検査する既存の自動回帰がある。
- version、Hook event、router、Skill、release、Marketplace、導入済みhostの状態は変更しない。

## 外から見える成果

- Claude Codeは標準`hooks/hooks.json`を一度だけ読み込めるsource構成になる。
- Codexは従来どおりmanifestの明示参照から同じ`hooks/hooks.json`を読み込む。
- Clarity Hookのevent、command、処理、manual fallback、trust／disabled時のdegraded動作は変わらない。

## Scope

### A. host別manifest契約

- `plugins/secretary/.claude-plugin/plugin.json`からtop-level `hooks` fieldだけを除く。
- Claude manifestのname、version、description、author、homepage、repository、license、skillsと、それらの値を変更しない。
- `plugins/secretary/.codex-plugin/plugin.json`は`hooks: "./hooks/hooks.json"`を保持する。他fieldも変更しない。
- 両manifestを同じfield集合に揃えず、Claudeの標準Hook自動読込とCodexの明示参照をそれぞれ検査する。

### B. 共通HookとClarity挙動の固定

- `plugins/secretary/hooks/hooks.json`を残し、Patch開始時のbytes、mode、SHA-256 digestを維持する。
- `plugins/secretary/scripts/clarity-hook.mjs`、`plugins/secretary/scripts/lib/clarity-hook.mjs`、Clarity Skill、rules、inventoryのbytesを変更しない。
- SessionStart、PostToolUse、PreCompact、Stop、SessionEnd、command-only、未初期化no-op、bounded output、Stop one-shot、競合安全、manual fallback、trust／disabled degradedの挙動を変更しない。
- Hook fileのrename、移動、複製、追加Hook file、Claude専用／Codex専用routerを作らない。

### C. 現役回帰assertのhost差対応

- Generatorは、Claude manifestにも`hooks` fieldを要求する現役assertを、Claudeはfield不在、Codexは正確な参照を要求するassertへ更新する。
- 少なくとも`scripts/sprint-048-validator.mjs`、`scripts/sprint-048-test.mjs`、`scripts/sprint-035-test.mjs`に残る該当assertを対象にする。
- `PK-001`はClaude manifestのversion／description／skillsと標準Hook重複宣言なしを、`PK-002`はCodex manifestのversion／skills／hooks参照を検査する。Case ID、Severity、Sprint 048への単一割当は変えない。
- Codex manifestだけを検査する既存assert、共通Hook本体のevent／command／挙動回帰は弱めない。

### D. 履歴と検証statusの保持

- public Sprint 050の`done-by-user-decision`、`docs/feedback/sprint-050.md`の`verification-scope-issue`、product finding 0、AC3／C21の実host live未実施を変更しない。
- Sprint 050 exact product candidate、tree／common digest、file count、origin feedback、Patch 001のaccepted／governance sourceと固定handoff履歴を遡及更新しない。
- private host evidenceをpublic live、installed、verified、Evaluator PASS、release-ready、`public-evaluator-pass`へ変換しない。
- 本Patchは新しいsource diffであり、過去candidateと同一bytesまたは同一digestであると表示しない。

## Non-scope

- version bump、CHANGELOG、release inventory、edition metadata、Marketplace metadata、fixed handoff candidate／digestの更新。
- commit後のpush、PR、merge、tag、GitHub Release、Marketplace publish。
- public／private／Yasashiiの実plugin install、update、uninstall、cache変更、導入済みworkspace変更、新sessionのloaded version確認。
- Claude Code／Codexでのpublic candidate live conversation、実Hook発火、trust UI、disabled UI、SessionStart／PostToolUse／Stop実機確認。
- Sprint 050／Patch 001のstate、progress、feedback、candidate history、authorization、downstream順序の変更。
- `hooks/hooks.json`、Clarity router、Skill、rules、event schema、Hook挙動、manual fallbackの変更。
- 新しいHook loader、追加manifest、collector、統一attestation、host自動判定の実装。

## Acceptance Criteria

1. `plugins/secretary/.claude-plugin/plugin.json`が有効なJSONで、top-level `hooks` fieldを持たず、その他のfieldと値がPatch開始時から不変である。
2. `plugins/secretary/.codex-plugin/plugin.json`が有効なJSONで、`hooks`が正確に`./hooks/hooks.json`を指し、全bytesがPatch開始時から不変である。
3. `plugins/secretary/hooks/hooks.json`が存在し、有効なJSONで、path、mode、bytes、SHA-256 digestがPatch開始時から不変である。
4. Clarity Hook router、common core、Skill、rules、inventoryの対象bytesがPatch開始時から不変で、既存Project Clarity／Hook回帰が0 FAILである。
5. 現役validator／regressionはClaude manifestの`hooks`不在を要求し、Codex manifestの`./hooks/hooks.json`参照を要求する。両manifestへ同じ`hooks`値を要求するassertが現役実行pathに残らない。
6. `PK-001`と`PK-002`のID、Severity、Sprint 048割当は不変で、PK-001はClaude標準Hookの重複宣言なし、PK-002はCodexの明示Hook参照を別々にPASSさせる。
7. Claude manifestへ`hooks`を戻すnegative fixtureは固有理由でFAILし、Codex manifestから`hooks`を削除する、別pathへ変える、Hook fileを欠落・変更する各negative fixtureもFAILする。
8. source patchの変更fileはClaude manifest、該当する現役回帰assert、Generator progressに限定され、Hook実装、version／release／Marketplace／handoff／履歴fileへ差分がない。
9. public Sprint 050の`done-by-user-decision`と元Evaluator feedbackを保持し、AC3／C21、public host live、Xmind、release／installed／cache／new sessionをPASSまたはverifiedへ昇格しない。
10. 実install、cache、workspace、remote、release、Marketplace、private／Yasashii repoへのwriteが0件である。

## 軽量評価

Type: microのため、Evaluatorは次の3項目だけを各5点満点、閾値5で採点する。1項目でも5未満ならFAIL。

1. 機能完全性: Claudeの重複宣言なし、Codexの明示参照、共通Hook fileの存在がhost別契約どおり成立する。
2. 動作安定性: JSON／manifest validation、host差のpositive／negative fixture、既存Project Clarity／Hook回帰が0 FAILである。
3. 回帰なし: Hook／Clarity bytes、Sprint 050／Patch 001の履歴とstatus、version／release／Marketplace／cache／install境界が不変である。

常駐UI変更はないためbrowser screenshotは必須にしない。実host installやlive会話を本Patchの合格条件へ追加しない。

## Verification scope（着手時に固定）

- Claude／Codex manifestと共通`hooks/hooks.json`をJSON parserで検証し、host別field契約をtargeted regressionで検査する。
- Claudeの`hooks`再追加、Codexの`hooks`欠落／別path、共通Hook欠落／bytes変更をnegative fixtureで拒否する。
- 現役実行pathから両manifest同値を要求するassertが除かれたことを検索と回帰結果で確認する。
- 既存Sprint 048 packaging validator／regression、Sprint 044 Clarity Hook regression、Sprint 050のProject Clarity回帰のうち本変更surfaceを守る既存commandを実行する。
- Patch前後で共通Hook、Clarity router／core／Skill／rules／inventory、Codex manifest、Sprint 050／Patch 001の履歴正本のdigestまたはdiffを比較する。
- 実private host evidenceはroot causeと要件決定のupstream triggerとして記録するが、public candidateのlive PASSには数えない。

### Evidence safe harbor

- JSON／manifest validation command、exit code、Claudeの`hooks` field不在、Codexの正確な`hooks`値。
- targeted positive／negative fixtureのID、期待した拒否理由、PASS／FAIL件数。
- 既存Project Clarity／Hook regressionのcommand、exit code、PASS／FAIL件数。
- 共通Hook、Clarity router／core／Skill／rules／inventory、Codex manifest、履歴正本の前後path、mode、byte length、SHA-256 digestまたはdiff 0。
- Claude Code `2.1.232`のprivate hostで観測した重複エラーと、Claude manifestから`hooks`だけを除いた後にエラーが解消したというuser-provided upstream evidence。public live／installed／verified／PASSへの昇格0。
- source repo、private／Yasashii repo、installed cache、workspace、remote、release、Marketplaceのwrite 0。

上記で十分とし、実public install、live conversation／Hook発火、新session確認、新しいcollector、統一attestationを
追加の合格条件にしない。

## 完了条件

- Generatorは本Patchだけを実装し、`docs/progress/sprint-050-patch-002.md`に変更file、manifest差、targeted／既存回帰、固定bytes、not-run、external write 0を記録する。
- Evaluatorは別作業単位で同じcandidateを再実行し、`docs/feedback/sprint-050-patch-002.md`に軽量3項目の合否と証跡を書く。
- Evaluator PASSとオーケストレーターのstate更新前に完了扱い、public live PASS、release-ready、installedへ昇格しない。
- release、Marketplace、実install、cache、新session確認は、本source patchと分離した明示許可・別phaseで扱う。
