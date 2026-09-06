# Sprint 054 — Project Clarityを含む0.12.0の3版公開とこのMacへの反映

- Type: standard
- Risk: high（3repoのcommit／merge／push／tag／GitHub Release、Windows CI、private pluginの実導入を含む）
- Candidate version: `0.12.0`
- 受入済み基点: sprint-051／052／053を含む `57a1f5c2e1d9607d46e9ee7eafc3a1a065b54d77`
- 含む機能: 受入済みF82／F83／F84と、各版のProject Clarity候補に含まれるF64〜F81。Clarityの新しい機能設計は追加しない。

## ゴールと確定済み判断

Agentic、Yasashii、private my-vaultの3版を、Project Clarityを正式に含む`0.12.0`として公開する。Clarityはprivate端末だけのlocal overlayではなく、3版それぞれの検証済みsource、tag、Release artifactに含める。公開後、このMacのCodexとClaude Codeへprivate `0.12.0`の配布bytesを正式経路で反映する。現在有効なCodexでは新sessionでClarityを利用できる状態まで確認し、現在無効なClaude Codeではenabled状態を変えず、隔離したhost読込面で互換性を確認する。

ユーザーは今回の範囲について、3版の必要なcommit、candidate branch push、Clarity PRとmainの統合、main push、`v0.12.0` tag、GitHub Release、marketplace反映、およびこのPCへのprivate版導入を明示承認済みである。同じ許可を再質問しない。candidate branchへのpushは、修正後のWindows CIを得るためにも使える。ただしmain／tag／Releaseは、該当する最終candidateの必須gateがPASSした後だけ実行する。

private my-vaultの利用者は本人だけで、実導入対象はこのMacに限定する。実my-vaultの本文は読まない。利用者データ、private設定、既存dirty、scope／enabled状態は保持し、必要な確認はpath、version、digest、status等のmetadataに限定する。
開始時の実測はCodexがenabled、Claude Code project `/Users/taisei/my-vault`の`enabledPlugins[agentic-secretary@agentic-secretary]`がdisabledである。後者を勝手にenableせず、disabledを実workspaceのloaded PASSとも表示しない。

Harnessのlimit resetもユーザー承認済みである。`docs/sprints/state.md`のcounter更新はOrchestratorだけが行い、Generator／Evaluatorは変更しない。

## 開始入力と証拠の扱い

開始時点のClarity候補は次の3つである。これらは固定した統合入力であり、現在の最終PASSを意味しない。修正または統合でbytesが変わったら、新しい完全SHAを最終candidateとして固定し直す。

| 配布系統 | PR／branch | 開始head | 最新Windows結果 |
|---|---|---|---|
| Agentic public | PR #11 / `codex/sprint-041-project-clarity` | `84e7eda41a887bac4a291379c7147e6193cd5442` | run `33760135090` FAIL |
| Yasashii public | PR #12 | `21d28913a8c7e8fcaa4299d5f235e44555407cc9` | run `33760136563` PASS |
| private my-vault | PR #10 | `8539bb785046e1ef41cecbfdeb7f1da8f6b5c7e3` | run `33760136372` FAIL |

- PR本文や過去headのPASS記録を、上表のcurrent headまたは統合後candidateのPASSへ読み替えない。
- public ClarityのSprint 050 Patch 007は独立Evaluatorの最終feedbackが未作成である。古いPatchのPASSをその代替にしない。
- 受入済み051／052／053の基点と各Clarity headを意味統合する。単純な片側採用によって、Git取り込み、Secretary Voice、LLM中心の読み取り、Clarity、または版固有差分を落とさない。
- spec、Sprint契約、state、progress、feedbackの衝突は各正本のwriter境界を守る。GeneratorがPlanner／Orchestrator／Evaluator所有記録を都合よく選択・再作成してmergeを通さない。

## Scopeと実行順序

### 1. 3版candidateの意味統合

1. Agenticは受入済み基点とpublic PR #11 headを統合し、F82〜F84とClarity F64〜F81を同じcandidateに残す。現行rootにClarity hooks directoryがないことを理由にClarityを除外せず、PRのClarity本体、Skill、Hook、host／collaboration inventory、guide、release面を取り込む。
2. privateとYasashiiは、それぞれの現在のmain／受入済み改善と上表の版固有Clarity PR headを統合する。public treeの一括上書きや、private端末だけのoverlay合成へ置き換えない。
3. public共通coreを下流へ適応する場合も、Yasashiiのcopy／style／identity／README／LICENSE／mapping／overlay所有物、privateのNotion／vault固有Skill／private値／root guidance、各repoのspec／state／progress／feedback／release判断を保持する。
4. 未分類の衝突、版固有正本とClarityの意味衝突、開始前dirtyとの重なりは自動解消しない。安全に意味統合できるまで該当系統の公開を止め、他系統の成功と区別して報告する。

### 2. public Windows update gateの限定修正

最新run `33760135090`の既知FAILを次の面だけで直す。

- CHANGELOGの箇条書き解析はLFとCRLFを同じ意味で扱う。Windows checkoutの行末`\r`によって正しいentryを欠落させず、本文へ余分なCRを残さない。
- 正本CHANGELOGとlegacy互換CHANGELOGの先頭を`0.12.0`へ揃え、byte一致を保つ。テスト側の先頭判定もLFだけを暗黙前提にしない。
- current／latest metadataを`0.12.0`へ整合させたうえで、同一版停止とdowngrade停止を既存どおり副作用0件で成立させる。`latest-unverified`を成功扱いする、caseを削る、期待PASS数を減らす、旧`0.7.0` blockerや公開済み履歴を書き換える方法は禁止する。
- 修正範囲はrelease metadata、CHANGELOG入力互換、既存update gateの小さな回帰追加に限定する。更新フロー全体や新しいversion parserを再設計しない。

### 3. Codex／Claude Code共通Clarity Hookの起動互換

- 配布する`hooks/hooks.json`は両hostが受理するtop-level構造にする。未対応のtop-level `collaborationMarker`を残さず、top-levelはhostが認識する`description`と`hooks`だけにする。
- Clarity collaboration markerは、対応済みの`description`内または既存inventoryが同じ識別文字列を追跡できる場所へ保持する。parser警告を消すためにClarity Hook、command router、manual fallback、inventory検査を削除しない。
- CodexとClaude Codeの両方でplugin読込時にunknown-field警告がなく、Clarityの対応Hookとmanual fallbackが既存契約どおり使えることを確認する。他SkillへのHook追加、network／LLM／重い処理、Hook責務の拡大は行わない。

### 4. private Windows concurrency FAILの限定解消

private run `33760136372`の`private-CW-019`は、`scripts/sprint-050-patch-006-concurrency-test.mjs`のcanonical-lock-busy判定で失敗している。観測済みのroundでは64 actor中63成功、1 CLIが約20.9秒で`canonical-lock-busy`、成功actorの最大lock waitは約14.8秒、最大critical sectionは約2.5秒、残骸0だった。

- 既存のWindows 3 round、POSIX 1 round、各round 32 CLI＋32 Hook、100%成功、canonical writeの整合性、bounded wait、残骸0という基準を維持する。
- まず既存契約内の競合時間短縮、不要なcritical sectionの縮小、正当な再試行可能性を調べる。15秒の製品lock waitを単に延ばす、stress actor／round／assertを減らす、失敗を握りつぶす、SKIPへ変える方法は禁止する。
- 安全なbounded waitと64同時writeの100%成功が現実のWindows runner上で両立不能と証拠化された場合、基準を勝手に変えず`verification-scope-issue`として、観測値と具体的な選択肢をユーザーへ返す。その状態ではprivateをPASSまたは3版公開済みにしない。
- この64 actor stressはMac miniのnode process上限に反するため、このMacでは実行しない。exact candidateの既存Windows CIで確認し、Macでは低concurrencyの関連回帰だけを使う。

### 5. 独立gate、main統合、0.12.0公開

1. 各repoでversion、manifest、marketplace、正本／互換CHANGELOG、release inventory、README／guide、archiveを`0.12.0`へ整合させる。CHANGELOGとRelease notesにはProject Clarity、051のGit取り込み、052のSecretary Voice、053のLLM中心整理を利用者向けに記載する。
2. Agenticの共通coreを先に固定し、privateとYasashiiの版固有candidateを別々に評価する。Yasashiiの開始headにWindows PASSがあっても、統合・version・Hook・release bytesが変わった最終candidateでは新しい因果runを必要とする。
3. 必須gateがPASSした各最終candidateを完全SHAで固定する。3版すべてのcandidate PASS後だけ、各版の検証済み内容をmainへ統合してpushする。main統合で配布bytesが変わった場合は関係するgateを再実行する。
4. 各remote mainが検証済み内容を指すことを確認してから、既存tagを動かさず新しい`v0.12.0` tagとGitHub Releaseを作る。Release artifact、manifest、marketplace参照、source tagの内容を一致させる。
5. 一部のpush／merge／tag／Releaseが失敗した場合は版ごとのpublication stateを示し、3版公開済みとまとめない。force push、tag移動、履歴書換え、公開済み履歴の削除で揃えない。

### 6. このMacのprivate 0.12.0反映

- 3版公開後、private release `0.12.0`そのものをCodexとClaude Codeの正式なplugin導入／更新経路で反映する。release後にClarityをlocal overlayとして重ねない。
- 反映前後でprivate source、installed version、scope、enabled状態、復元元を確認する。cache directoryを直接編集しない。
- enabledなCodexは新sessionでprivate版ID／`0.12.0`、Clarity Skill、Clarity Hookの読込を確認し、`unknown field 'collaborationMarker'`が再現しないことを確認する。disabledなClaude Code projectはその状態を維持し、実workspaceでloadedとは主張しない。Claude Code向け配布bytesとHook互換は、利用者データを使わない隔離host読込面で確認する。
- 利用者データ、private設定の自由記述、他plugin、既存dirtyを変更・コピー・自動commitしない。実my-vault本文を確認証拠へ読んだり複製したりしない。

### 7. 公開利用者向け成果物

- Agentic public用とYasashii public用に、Claude Codeへ1回貼るだけで、既存カスタマイズを保持しながら正式IDの`0.12.0`へ更新し、reload／版確認まで依頼できるpromptを1本ずつ作る。Codex用promptやprivate配布案内は作らない。
- 1枚のinfographicで、Project Clarityを新機能として明示し、Git取り込み、Secretary Voice、AIによる読み取り・整理とともに0.12.0の変化を平易に伝える。Agentic／Yasashiiの対象差を混同せず、Clarityをprivate限定またはlocal overlayと表現しない。
- 更新promptとinfographicはrepoの公開guideから参照でき、公開tag／Releaseと版・機能説明が一致する。成果物の作成までを含み、メール・チャット・SNS等で他者へ送信しない。

## Acceptance Criteria

1. **統合完全性（C1/C5/C6）**: 受入済み基点`57a1f5c2...`のF82〜F84と各版Clarity候補のF64〜F81が同じ最終candidateに存在し、片側採用による機能・安全シーム・履歴の欠落が0件である。Clarityは3版のsourceとrelease artifactに含まれ、local-only overlayではない。
2. **版固有保護（C5/C13）**: Yasashiiの表現・identity・README／LICENSE／mapping／overlay所有物と、privateのNotion／vault固有Skill・private値・root guidanceが保たれる。上流値でrepo固有spec／state／progress／feedback／release判断を一括置換しない。
3. **0.12.0整合（C2/C12/C13）**: 3版それぞれのplugin ID、repository、style、MIT、単段クレジットを保ち、version、manifest、marketplace、正本／互換CHANGELOG、release inventory、README／guide、archiveが`0.12.0`で一致する。公開済み旧versionの履歴、tag、fixtureを変更しない。
4. **public CRLF update gate（C2/C5/C10/C12）**: LF／CRLFの同じCHANGELOG entryを同じ意味で解析し、正本／互換CHANGELOGはbyte一致する。Windows nativeのSprint 032 update gateが既存15 caseを削除・緩和せず`15 PASS / 0 FAIL`となり、0.12.0同一版とdowngradeは副作用0件で停止する。
5. **Hook host互換（C2/C5/C6）**: 最終3版の`hooks/hooks.json`に未対応top-level fieldがなく、Clarity markerとinventory追跡を維持する。Codex／Claude Codeの読込でparser errorが0件、Clarity Hookとmanual fallbackが有効で、他Skill Hook・network／LLM／重処理の追加が0件である。
6. **private concurrency（C2/C5/C6）**: exact private candidateの既存Windows CIで`private-CW-019`が、3 round×64 actor、assert、timeout、安全境界を弱めず0 FAILとなる。Event／Evidence／Stateの部分成功、lost update、他writer rollback、lock／temp残骸が0件である。両立不能なら`verification-scope-issue`として停止し、PASSへ昇格しない。
7. **3版独立判定（C2/C6/C12/C13）**: Agentic、private、Yasashiiがそれぞれの最終完全SHAで関連回帰、Clarity回帰、edition／private回帰、manifest、release、Git-free archive、Windows nativeを0 product FAILで完了する。過去run、PR本文、別SHA、上流1版のPASSを他版へ流用しない。
8. **公開の因果性（C5/C12）**: 3版candidate PASS後だけmainへ統合し、各remote main、`v0.12.0` tag、GitHub Release、artifact、marketplace参照が検証済み配布内容を指す。既存tag移動、force push、履歴書換えが0件である。
9. **このMacへの正式反映（C2/C5/C6）**: private release `0.12.0`の配布bytesがCodex／Claude Codeの正式経路へ反映され、元source、scope、enabled状態を保持する。enabledなCodexの新sessionはprivate版、Clarity Skill／Hookを読み、startupの`collaborationMarker` parser errorが0件である。disabledなClaude Code projectはdisabledのままで、隔離host読込面では同じ配布bytesのparser errorが0件である。disabledを実workspaceのloaded PASSにせず、local Clarity overlayとcache直接編集は0件である。
10. **利用者・作業中差分保護（C5）**: 実my-vault本文を読取・収集せず、利用者データ、private設定、既存dirty／staged／untracked、他pluginを変更・コピー・自動commitしない。各repoの今回所有変更だけをcommitし、未知の衝突は安全に停止する。
11. **公開案内（C3/C4/C14）**: Claude Code用one-paste promptがAgentic／Yasashiiに各1本あり、正式ID、0.12.0、既存カスタマイズ保持、update、reload、版確認を正しく案内する。1枚のinfographicがClarityを含む4つの主な変化を平易に示し、実Releaseと矛盾しない。
12. **限定された変更（C5/C6/C19）**: Clarityの機能、schema、4象限、Xmind、Attention、Drift、Hook責務を全面再設計せず、既知のrelease／CRLF／Hook／private concurrency統合問題と版適応に変更を限定する。新runner、framework、collector、統一attestation、全組合せmatrixを作らない。

## 検証スコープ（着手時に固定）

### 検証面

- 3repoの隔離した最終candidate、既存のedition／private fixture、Git-free archive、既存Windows workflows。
- publication後のremote main／tag／Release／marketplace metadataと、このMacのhost提供installed metadata。enabledなCodexは実workspaceの新session読込、disabledなClaude Codeは隔離host読込面を使う。
- 実my-vault本文、実Secret、実Xmind provider、Chatwork／Google Chatの実データ同期は検証面に含めない。

### 既存入口

Agenticでは少なくとも次の既存入口を、統合diffに応じて同じcandidateから実行する。

- `python3 scripts/check-release-integrity.py`
- `bash scripts/agentic-regression.sh`
- `node scripts/master-release-gate.mjs --mode offline`
- `node scripts/agentic-archive-gate.mjs`
- `bash scripts/sprint-050-regression.sh --candidate`
- `node scripts/sprint-049-inventory.mjs validate`
- `node scripts/sprint-032-update-gate-test.mjs`
- `node scripts/sprint-051-git-ingest-test.mjs`
- `node scripts/sprint-052-secretary-voice-test.mjs`
- `bash scripts/sprint-010-regression.sh`
- `bash scripts/sprint-012-regression.sh`
- `bash scripts/sprint-015-regression.sh`
- `node scripts/agentic-codex-plugin-test.mjs`
- `git diff --check`

privateとYasashiiは、各PR／repoに既存のClarity、edition／private、release、archive、会話回帰入口を使う。command名と集計は各repoの最終handoffに記録し、新しい横断runnerへ包み直さない。

Windowsでは既存workflowを使い、同じ最終candidateに因果するrunで次を確認する。

- Agentic: Sprint 032の`15/0`、Sprint 051の`--require-windows`、既存Clarity／Harness scanner／conversation migration／logical-write／root identityの関連stepが0 product FAIL。
- private: `private-CW-019`を含む既存private Windows suiteが0 product FAIL。
- Yasashii: 統合後のClarity、edition、update、会話の既存Windows suiteが0 product FAIL。

Macでは64 actor stressを実行しない。低concurrencyの既存回帰だけを実行し、長時間処理前にnode process数を確認する。40超なら不要processを整理してから開始し、実行中60超なら中断する。Playwrightを使う場合は2 workers以下、重い処理は同時3系統以下とし、自分が開始したserver／browser／watcherを終了する。

### 証拠形式（safe harbor）

- 版ごとの開始SHA、最終candidate完全SHA、main／tag／Release SHA、変更path、共通path／保護pathのdigestまたは同等snapshot、実diff。
- 既存commandのexit codeとPASS／FAIL／NOT-RUN、Windows workflow／run／job ID、runner、Node、head SHA、対象step集計。
- Hook manifestのtop-level key、marker／inventory検査、enabledなCodex実sessionとClaude Code隔離host読込面の結果、startup warningの有無。
- 公開後のremote main、tag、Release、artifact、marketplace version／source参照。
- このMacの導入前後のsource、version、scope、enabled、復元元、Codex新sessionで読まれたprivate版／Clarity面、Claude Code projectがdisabledのままであることと隔離読込結果。利用者本文やSecret値は記録しない。
- 2本のone-paste promptの全文と1枚のinfographicのrender、公開guide／Releaseとの版・内容照合。

上記で十分とする。新しい証拠schema、collector、attestation、追加runner、実my-vault本文、実Xmind、実チャット同期、全組合せmatrixを追加の合否条件にしない。UI採点はinfographicのrenderだけを対象とし、製品UIの新しいbrowser評価を要求しない。

## Non-scopeと禁止事項

- Project Clarityの新機能、schema、4モード、Decision／Execution／Validation／Attention／Drift、4象限、Xmind連携、projection、link、scanner、collaboration routingの全面再設計。
- F82〜F84、Chatwork／Google Chat、memory、projects、identity、Notion TaskDB、vault routingの仕様拡大。
- 実my-vault本文のread／copy／migration／初期化／記憶変更、利用者データをcandidateや証拠へ取り込むこと。
- private Clarityをrelease外local overlayとして再構成すること、cache直接編集、既存scope／enabledの変更、他pluginの更新。
- 64 actor stressのMac実行、process上限の緩和、test case／actor／round／assertの削減、timeout延長だけによる緑化。
- 新workflow、runner、framework、collector、統一attestation、approval manifest、外部署名。
- `/Users/taisei/workspace/agentic-harness`または解決後に同一となるpathへのread／write／Git操作／コマンド実行／複製元利用。
- 他者へのメール、チャット、SNS投稿。公開2版のClaude Code用更新成果物を作るところまでとする。

## 完了条件

Generatorは本Sprintだけを実行し、版ごとの変更、commit、candidate SHA、既存回帰、Windows run、publication state、導入前後metadata、案内成果物、known issue、rollback／復元先を`docs/progress/sprint-054.md`へ記録する。3版のどれかが未PASSなら全版公開済みと書かない。

Evaluatorは別のfresh作業単位で、最終candidateと実remote／installed結果を本Acceptance Criteriaおよび既存rubricで評価する。既知FAILを単なる再実行成功や過去runで閉じず、findingを`product`／`verification-infra`に分ける。private concurrencyの基準衝突が製品修正で安全に閉じない場合は`verification-scope-issue`とし、main／release／installへ進めない。
