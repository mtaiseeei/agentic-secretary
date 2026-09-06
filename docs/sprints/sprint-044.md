# Sprint 044 — Claude Code／Codex共通Clarity専用Hook

- Type: main
- Risk: high（plugin lifecycle、並行発火、Stop継続、host trustを扱う）
- 依存: `sprint-043` done
- 含む機能: F69, F70, F78, F79
- 主眼: plugin rootの共通`hooks/hooks.json`と軽量command router 1組でClarityを補助し、disabledでもmanual Skillを完全に保つ。
- Target Case IDs: HC-001〜HC-017、HX-001〜HX-014、HP-001〜HP-007、AT-015、IM-012（正確な40 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## 承認済み前提

- Codex／Claude Codeともplugin rootの共通Hookを使い、host payload差だけをadapterで正規化する。
- Codex trust前skip、Codex無効、Claude plugin無効は正常なdegraded状態。
- 複数source／matching Hookの並行発火に耐え、Hook内network／LLM／Xmind／全scan／connector／updateは禁止。
- Project Clarity以外のSkill Hookと、memory候補の意味判定Hookは作らない。

## Scope

1. 共通Hook manifestとrouter、host payload normalizer、output serializer、plugin root解決。
2. SessionStart brief、PostToolUse observation、PreCompact flush／resume、compact後再注入、Stop one-shot、SessionEnd軽量flush。
3. 未初期化／未linked高速no-op、bounded context、1 event 1 fileまたは同等の競合安全なruntime記録。
4. trust／disable／failure診断、manual status／review／checkpoint fallback。
5. Claude Code／Codexを別々に実機評価し、Desktop／CLIのsupportedとverifiedを別表示するhost inventory入口。
6. SessionStartのAttention最大件数と、Codex Hook trust未承認時のdoctor案内。

## Acceptance Criteria

1. Target Case 40件がPASSし、両hostのCritical live caseと本契約Acceptance Criteriaの未実行0件である。
2. 共通`hooks/hooks.json`＋router 1組で、同じnormalized fixtureが同じClarity Event semanticになる。
3. 未初期化no-op、SessionStart最大3件程度、concurrent PostToolUse parse 100%、Stop一度限り、SessionEnd時間上限を満たす。
4. Codex trust前／disabledとClaude disabledでcanonical write 0、manual Skillは完全動作する。
5. Hook内network／LLM／Xmind／connector／update／memory意味判定と他Skill Hookが0件である。
6. 1host PASSを他hostへ昇格せず、supported／verified／degraded／unverifiedが実状態と一致する。
7. `AT-015`は実SessionStartで重要3件程度にboundedされ、`IM-012`はuntrusted Hookを実状態どおり診断してtrust確認方法を示す。

## Non-scope

- 他SkillのHook、自動memory保存、外部connector、plugin更新、Xmind生成、semantic Drift解析。

## Verification scope（着手時に固定）

- Claude CodeとCodexの実plugin load、trust前後／disable、各event、subdirectory、concurrency、failure、large State。
- Target Caseとmanual Skill／core直接回帰。host schemaや追加attestationを新しい合格条件にしない。

### Evidence safe harbor

- host／surface／version、plugin load、event payload、normalized output、command／exit／timing、runtime event count／parse。
- trust／disabled表示、manual fallback、Stop 1回／2回、context size、network instrumentation 0、Hook inventory。

## 完了条件

両hostのfresh独立評価とC21／C24 PASS前にHook対応済みと表示しない。
