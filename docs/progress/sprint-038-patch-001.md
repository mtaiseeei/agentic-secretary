# Sprint 038 Patch 001 実装handoff

- Candidate: public Agentic Secretary `0.9.1`
- Harness互換正本: Agentic Harness `0.5.1`
- Observed full commit: `747a8fbd06000144ca7e27330bf1d32495475fe0`
- UI変更: なし
- workspace migration: なし

## 実装内容

- Claude marketplace、Claude plugin manifest、Codex plugin manifestのcurrent versionを`0.9.1`へ揃えた。
- `edition.json`、`build` skill、READMEのHarness参照を`0.5.1`と指定full commitへ揃えた。
- CHANGELOG先頭に`0.9.1`を追加し、Harnessは別plugin、Luna custom agentは非同梱、workspace migration不要と明記した。
- current release integrity、archive、master gateのversion期待値を`0.9.1`へ更新した。
- Patch専用回帰をmaster gateのcheckout/archive両面に追加した。
- `0.9.0`以前のmigration、fixture、release entryは書き換えていない。

## 検証結果

1. `bash scripts/sprint-038-patch-001-regression.sh`
   - exit 0
   - Patch専用: `SPRINT038_PATCH001_PASS=6 ... FAIL=0`
   - Harness既存互換: `SPRINT035_PASS=15 ... FAIL=0`
   - release integrity: PASS
2. `node scripts/master-release-gate.mjs --mode offline --timeout-ms 600000 --json /private/tmp/agentic-secretary-091-offline.json`
   - exit 0
   - `status=pass`, suites 19/19 required, passed 18, verification-infra 1, failed 0
   - assertions 696, pass 690, product fail 0
   - pinned historical suiteのloopback `listen EPERM` 6件は既存classifierがverification-infraと判定。product FAILへの読み替えなし。
3. worktreeを`.git`なしで固めた一時archiveに対する `master-release-gate.mjs --mode archive`
   - exit 0
   - `status=pass`, required 14/14, assertions 279, fail 0
4. `node scripts/check-harness-compat-online.mjs`
   - sandbox内の初回はDNS制限で`HARNESS_ONLINE_UNVERIFIED`
   - network許可下の再実行はexit 0、`HARNESS_ONLINE_PASS`
   - repo `mtaiseeei/agentic-harness`、version `0.5.1`、commit `747a8fbd06000144ca7e27330bf1d32495475fe0`
   - Claude `agentic-harness/harness@agentic-harness`
   - Codex `agentic-harness-local/harness@agentic-harness-local`
5. `python3 -m json.tool` を4つのcurrent JSONに実行: すべてexit 0
6. `git diff --check`: exit 0

## Evaluator向け確認シナリオ

- 3つのcurrent release versionとCHANGELOG先頭が`0.9.1`で一致すること。
- `edition.json`から解決したHarness version、full commit、repository、host別install IDがREADMEとbuild skillに一致すること。
- online checkが公開`main`のfull commitと両manifest `0.5.1`を同時に確認すること。
- `plugins/secretary/` にHarness本体、agents、commands、hooks、Luna custom agent、`0.9.0-to-0.9.1` migrationが存在しないこと。
- `0.8.0-to-0.9.0` migrationと`0.9.0` CHANGELOG entryが履歴として残ること。

## 注意事項

- live conversation gateは本Patchの対象外で、master gateでも従来どおり`incomplete`を別集計している。
- 作業開始時の指示ファイル探索で、`find .. -name AGENTS.md` がsibling名として禁止対象のpath名も列挙した。その後は対象化を停止し、内容を開かず、書込みも行っていない。
- push、tag、GitHub Release、commitはGeneratorでは実行していない。
