# Sprint 056 — 0.13.0三版公開・正式導入

**ステータス:** Phase A Agentic public候補準備完了 - 独立Evaluator待ち

## 今回の担当範囲

- Phase Aの最初のgateとして、受入済みSprint 055とSprint 044 Patch 001の製品bytes・直接回帰・正本文書をcommitへ固定した。
- Agentic publicの現行配布面を`0.13.0`へ揃え、既存inventoryと小さいGit-free archive gateを更新した。
- private my-vault／Yasashiiへの適応、main統合、push、tag、GitHub Release、artifact公開、このMacへの導入は実行していない。

## 固定commitと候補identity

- 開始HEAD: `22cc215f76f8eae889d99715f75c76ba5c1e228b`
- 受入済み製品・検査・正本文書の固定: `71f8bbee0298076742dd52992abe8ea64684fe02` — `[sprint-056] Preserve accepted Clarity and Hook changes`
- 0.13.0配布面: `fac240c7d3a192c140825c2fce94b3b95034a136` — `[sprint-056] Prepare Agentic Secretary 0.13.0 candidate`
- downstream handoff validatorのcurrent version pin: `5e26432307a2f247d244dcb2766e870400d006f2` — `[sprint-056] Align downstream handoff with 0.13.0`
- **Phase A public source candidate:** `5e26432307a2f247d244dcb2766e870400d006f2`
- Git tree: `417586847bdf64b9be6a8461b2fd0455d1807aca`

## 受入済みbytesの保持

Sprint 055の5対象fileとPatch 001を含む最終組合せを、`docs/feedback/sprint-055.md`と
`docs/feedback/sprint-044-patch-001.md`のSHA-256へ照合した。7対象pathは全て一致し、両feedbackを編集・再判定していない。

## 0.13.0配布面

- Claude marketplace、Claude manifest、Codex manifestを`0.13.0`へ更新した。Codex marketplaceは既存schemaにversionを持たないため、新しいversion fieldを追加していない。
- canonical／legacy CHANGELOGへ同一bytesの0.13.0 entryを追加した。F85〜F87と「Hook出力は利用者承認ではない」境界を利用者向けに記載した。
- README、getting started、Project Clarity、guide indexを現在版へ更新し、`docs/guide/update-0.13.0.md`を追加した。0.12.0の画像と更新ガイドは履歴資料として保持し、0.13.0の現在表示と区別した。
- `release-inventory.json`、`host-inventory.json`、`conversation-core-inventory.json`、`collaboration-inventory.json`、`downstream-clarity-handoff.json`を現候補に合わせた。既存inventory helperで変化したsurface digestだけを更新した。
- `archive-release-gate.mjs`、`check-release-integrity.py`、`sprint-048-handoff.mjs`はcurrent `0.12.0` pinだけを`0.13.0`へ追随させた。旧version fixture・snapshot・履歴assertは変更していない。

## 配布物とdownstream handoff

- Archive: `/private/tmp/agentic-secretary-0.13.0-public-candidate-5e26432.tar.gz`
- Archive SHA-256: `cc96db50c6d43deb801d71eda3b2582067c596e8cc5ef10b502b2238c38616b1`
- Git-free archive tree: 906 files、SHA-256 `9cfbdf6bf290572d1d431b42e4fc094072426c0c8df516951cfaba8c6f7005ba`
- 配布path `plugins/secretary/`: 158 files、SHA-256 `7ce0b56c1e3098e0ea6a26887206136700f2231e63c371f552d67d6fe79d770e`
- downstream common paths: 44 files、SHA-256 `7876f39247eb7dcbdca00dada4ee27c65d7cf571825c05e9dafe3124b8d52cf7`
- 下流へ渡す共通変更はClarity CLI／core／projection、Clarity Hook、Clarity Skill、release／host／collaboration inventoryである。宣言済み44 common pathの集合、private→Yasashiiの順序、excluded／protected path、rollback、closed pre-write gateは維持した。
- `publicationStatus`は`pending-public-evaluator-pass`、`acceptedSource`は`null`のまま。独立評価前に下流writeを開いていない。

## 実行結果

- 開始前Node数: sandbox内`pgrep`は`sysmond service not found`で取得不能。0扱いせずhost権限で再実測し`34`、上限40未満を確認した。
- `node scripts/sprint-055-test.mjs`: exit 0、`SPRINT055_PASS=8 FAIL=0 TOTAL=8`。
- `node scripts/sprint-044-patch-001-test.mjs`: exit 0、`5/5 PASS`。fixtureはtest終了時に削除済み。
- `node --check`をClarity CLI／core／Hook／projection、055 test、Patch test、archive gateへ実行: 全てexit 0。
- `python3 -m py_compile scripts/check-release-integrity.py`: exit 0。生成した`__pycache__`は直後に削除した。
- `python3 scripts/check-release-integrity.py --root .`: exit 0、manifestとCHANGELOG整合PASS。
- `node scripts/sprint-049-inventory.mjs validate`: exit 0、20 surface／67 cases、marker／digest VALID。
- `node scripts/sprint-048-handoff.mjs validate-template`: exit 0、closed pre-write gate／downstream write false。
- exact candidate archive上の`node scripts/archive-release-gate.mjs --root <extracted-root>`: exit 0、`ARCHIVE_RELEASE_PASS=14 ARCHIVE_RELEASE_FAIL=0`。
- `git diff --check`: exit 0。candidate固定時の対象外worktree差分は0件（`.clarity/**`と`CLARITY.md`はcommand pathspecで除外し、内容を読んでいない）。
- 終了後Node数: host実測`35`。dev server、browser、watcherは起動していない。

## 変更規模

- 開始HEADからsource candidateまで: 39 files、+2029／-53。内訳にはPlanner／Evaluatorの受入正本文書と専用回帰を含む。
- 受入済み製品5 files: +589／-17。
- 直接回帰2 files: +409／-0。
- 0.13.0配布commit: 17 files、+125／-30。handoff validator追随: 1 file、+1／-1。
- 製品変更0行の検証専用ラウンドではない。今回新しいrunner、schema、collector、attestationは追加していない。

## 自己評価と引き渡し

この記録はGeneratorの自己報告であり、Phase Aの独立PASSではない。Evaluatorはcandidate `5e26432307a2f247d244dcb2766e870400d006f2`と上記archiveを対象に、次を確認する。

1. 受入済み製品／直接回帰pathが両feedbackの記録SHA-256と一致し、feedbackが保持されること。
2. current manifest／marketplace／CHANGELOG／inventory／guide／archiveが0.13.0で一致し、Codex marketplaceにversion fieldを新設していないこと。
3. 14-check archive gate、release integrity、inventory validation、handoff template validationが0 FAILであること。
4. common path集合とdigest、excluded／protected path、closed pre-write gateが維持され、private／Yasashii writeがまだ0件であること。

起動方法／test URL: command-only配布候補のためURLなし。上記commandをcandidate archiveまたはexact commitで実行する。

## NOT-RUN

- private my-vault／Yasashiiへの適応と独立評価。
- mainへの統合、remote push、`v0.13.0` tag、GitHub Release／artifact／marketplace公開。
- このMacのCodex／Claude Codeへの正式導入、cache更新、新session loaded確認、Hook trust操作。
- full Sprint 044、full Sprint 050、100／128並列、64 actor stress、recursive wrapper、全suite、CI、Windows native、network、browser、実Xmind MCP。
- 実repoの`.clarity/`と`CLARITY.md`、実my-vault本文・記憶・自由記述設定のread／write。

## 既知の制限

- public Phase Aだけの候補であり、3版公開・このMacへの導入はまだ完了していない。
- host inventoryの4 surfaceはsource candidate時点の`verified: false`を維持する。fixture／構文検査をinstalled host liveへ昇格していない。
