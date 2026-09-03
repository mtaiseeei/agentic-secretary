# Evaluation Rubric

## プロジェクト種別

Claude Codeプラグイン（Markdownのskills、templates、rules、安全なシーム）、一般PJのライト→フル運用、別repo `yasashii-harness` と開発PJ正本への参照導線、
およびChatwork／Google Chat専用のローカル設定wizard。静的整合、スクリプト化した実動作、模擬会話、外部repo境界に加え、
wizardはrunning UIをbrowserで操作し、desktop／mobileのスクリーンショットを証跡にする。

## 合格の基本条件

- Evaluatorは対象スプリントの実物を動かし、実行コマンド、結果、対象ファイル／repo、模擬会話の入力と観測結果を feedback に残す。
- C2・C5・C6・C9・C10・C11・C12・C13・C14・C15・C16・C18 は5/5必須。対象Sprintの保証範囲で、1件でも構文欠陥、secret露出、安全違反、新規回帰、現行面の配布チャネル依存、無確認の高リスク副作用、Google ChatのOAuth／選択スペース境界違反、配布前gateの未達、edition境界違反、会話可読性違反、authorization誤分類、応答状態不整合、意味保存違反、明示memory依頼の再確認・重複保存・checkpoint retry境界違反、または秘書identity／名前routing／rename境界違反があれば不合格。
- Sprint 021は、Google Chatのlocal wizard session memory→`gh` stdin→Repository Secretと、Chatworkの利用者本人によるGitHub Repository Secret画面への直接入力という既存の2導線、および製品管理対象／初回publish inventoryにおける合理的な誤混入を0許容で評価する。Chatwork wizardへToken取得・受領・登録機能を要求しない。利用者が任意のJS／TS／shell／JSONを意図的に特殊構文・難読化・computed／escaped key・偽placeholderへ改変したケースの未検出だけでは不合格にしない。その形式を製品が生成する、または通常導線が実値を残すなら不合格とする。
- 1軸でも閾値を下回ればスプリント全体を不合格にする。
- やさしさの得点で安全・規律・回帰の欠陥を相殺しない。
- Sprint 050 Patch 001はC25を5/5必須とし、ユーザー判断経路のtruthful status、束縛、失効、製品候補分離、downstream write 0の違反を他軸で相殺しない。

## 検証方法

1. **manifest・参照整合**: marketplace / plugin JSON、SKILL frontmatter、name一意、参照先実在、改名後の識別子一致を検査する。
2. **回帰スイート**: Generatorの引き渡しコマンドを実行し、終了コードとassert数、失敗内容を記録する。既知失敗を合格扱いしない。
3. **シームのドライラン**: 一時 `secretary/` で記憶保護、path guard、journal追記、TODO、settings、reindex、timelineを実行する。文字列の存在だけでなく、構造と副作用をassertする。
4. **固定時刻**: `CC_SECRETARY_NOW` を与え、日付ファイル、期間境界、逆時系列、同一入力の同一出力を確認する。
5. **模擬会話**: LLM規律に関わる導線はgrepだけで合格にしない。Evaluatorが実際の指示・応答を記録する。
6. **リポジトリ境界**: `~/workspace/agentic-harness` をコマンド対象・参照元・複製元にせず、編集、checkout、commit、branch、remote変更、生成物作成を行っていないことを実装経路と作業ログから確認する。`yasashii-secretary` に同梱ハーネスが無く、`yasashii-harness` はpublic・`fork=false`の独立downstreamで、GitHubのorigin/upstream remote、fb9c303到達性、yasashii見出しoverlay、宣言的metadata allowlistが成立することを確認する。
7. **参照導線のoffline / online分離**: offline回帰はローカルの案内、`harness@yasashii-harness` を含む3コマンド、同梱不在、壊したfixtureの検出を評価する。online検査はGitHub APIで `mtaiseeei/yasashii-harness` の実在、`private=false`、`fork=false`、owner/name、marketplace `name` / `repository`、plugin `name` / `source` / `repository` / `homepage`、必要なCodex marketplace識別子と3コマンドの整合を評価する。ネットワーク不可をremote健全性のPASSとして数えず、`UNVERIFIED` 等でoffline結果と分離する。Sprint合格にはEvaluatorのonline証跡が必須。
8. **downstream差分境界**: `gentle-overlay/metadata-overrides.json` の対象ファイル・field・期待値がremote manifestsと完全一致し、allowlist外のmetadata変更、スキル本文・agents・runtimeロジック・その他上流由来の実装行の書換・削除が0件であることを、upstream fb9c303との差分と独自回帰で確認する。`yasashii` 見出しの追加は従来どおり許可する。
9. **手動ライブ確認**: サインイン済みClaude環境が利用可能ならプラグインを実際に導入して主要対話を確認する。利用不可なら、未実施項目を明示し、スクリプト＋模擬会話をゲートとする。
10. **wizard browser確認**: running wizardをdesktop幅とmobile幅（768px未満）で操作する。Chatwork roomまたはGoogle Chat spaceの選択、間隔、戻る、キャンセル、確定、0件、エラーを確認し、各幅のスクリーンショットをfeedbackへ残す。全画面に対象サービス名が可視かつaccessible nameとして存在し、primary CTA背景がChatwork `#F03747`／Google Chat `#11BB62`、前景が `#000000`、contrast ratio 4.5:1以上であることをcomputed styleで確認する。HTML/CSS文字列のgrepだけでは合格にしない。
11. **secret非漏洩**: synthetic token／OAuth credentialを使ったfixtureで、Google Chatはlocal wizard sessionのmemoryから `gh` のstdin経由でRepository Secretへ直接登録し、ChatworkはwizardがTokenを取得・受領・登録せず利用者本人を現在のGitHub Repository Secret画面へ案内することを確認する。Chatwork案内は `Name` 欄=`CHATWORK_API_TOKEN`、`Secret` 欄=本人が公式画面で取得したAPI Tokenと具体的に示す。厳格secret（client secret、認可コード、access token、refresh token、OAuth client JSON全文、Chatwork API Token）がtracked files、Git差分・履歴、Actionログ、journal、fixture出力、再読込後も残る製品側DOM、AI会話、エラー、スクリーンショット、評価証跡に0件であることを証明する。Chatwork Tokenの入力欄・製品側への貼り付け要求は0件とし、GitHub Repository Secret画面へ本人が直接入力した値は証跡へ記録しない。client IDは識別子として一時的な認可URLと管理者チェックリストだけ表示可とし、それ以外の永続物では0件にする。認可URL／callback URL自体を証跡へ記録しない。
12. **GitHub Actions検証**: Chatworkの30分／1h／3h／6h／12h／手動のみと、Google Chatの1h／3h／6h／12h／手動のみでscheduleが実際に変わり、両サービスで3hが推奨・初期値、毎時0分回避、手動のみschedule無効、workflow_dispatch、失敗・timeout、競合時の安全な終了を確認する。
13. **Chatwork API境界**: 合成fixtureで0／1／100件、重複message ID、room部分失敗、API100件より前が無い状態を検証する。Sprint 014の実APIは、ユーザーが明示許可した専用private test workspace、Repository Secret、非機密test roomを使い、room一覧取得と1回の同期を確認する。合成fixtureは実API gateの代替にならない。
14. **single-repo境界**: private repo作成、初期commit、初回push、同じrepo内のpluginの利用設定・生成物、秘書、project、Chatwork／Google Chat設定・workflow・履歴を確認する。実API用test workspaceも同じ構成とし、チャット専用repo、永続ローカル専用正本、public remoteを検出した場合は不合格。public配布ソース自体の複製は要求しない。
15. **external live gate**: private test workspace作成、Repository Secret設定、OAuth認可、workflow dispatch、API送信、pushは、それぞれのユーザー明示許可とtest資格情報・非機密test room／space準備を確認してから行う。準備不足は `external-live-gate-unavailable` としてSprint不合格にし、implementation-issueへ誤分類しない。実行後はschedule停止、Secret削除、test対象選択解除を確認し、Google ChatではOAuth grant／tokenのrevokeまで確認する。
16. **live gate証跡**: private状態、Secret名の存在、workflow run ID／状態、件数、commit hash、push／pull、検索状態を記録する。token／OAuth client値、不要な対象名、チャット本文は記録しない。public配布repoにSecret、チャットworkflow、対象設定、履歴が0件であることも確認する。
17. **プロジェクト境界**: 一時 `secretary/` で候補承認／拒否、一般PJライト作成、決定と状態の同時更新、フル昇格、完了／再開、成果物版管理、別repo開発PJポインタを実行する。確認前副作用0件、正本重複0件、path guard、既存build導線を構造とデータでassertする。
18. **配布チャネル非依存**: `git ls-files` を母集団にし、現行正本・公開面・配布物・project guidance・新規Sprint文書で旧配布チャネル固有表現が0件であることを機械検査する。過去のprogress／feedback／評価証跡は監査記録として対象外パスを明示し、無条件のrepo全体grepを合格根拠にしない。画像等の非テキストは表示内容を確認する。
19. **維持項目の正負検査**: 一般化後もMIT、Shin-sibainu/cc-companyの単段クレジット、`forkedFrom`、配布識別子が残ることを確認する。対象外パスへ誤って旧表現を置くだけでは合格しない負テストと、現行対象へ旧表現を再混入させた際に失敗する負テストを行う。
20. **更新診断の無副作用**: clean／customized／台帳なし／最新版確認不能のfixtureで診断し、plugin、workspace、Git、設定、migration、reload／restart実行が0件であることを前後snapshotで確認する。
21. **version・CHANGELOG・台帳**: marketplace／plugin／CHANGELOGのversion整合、不一致検出、最小台帳のfield allowlistを検査する。台帳にファイル本文、差分本文、記憶、会話、外部データ、secret、資格情報が0件であることをsynthetic値で確認する。
22. **実更新の安全境界**: 承認／拒否／キャンセル、clean／customized／unknown-baseline／台帳なし0.2.0、commit不能、migration失敗を操作し、確認前0変更、現状維持の既定、push 0件、dry-run一致、冪等性、検証後だけ成功報告を確認する。
23. **rollback**: plugin更新後、migration途中、検証失敗の各fixtureで、workspaceとpluginの変更範囲を区別し、直前commitと更新前versionから復元または正確な手動手順へ進めることを確認する。
24. **Google Chat OAuth境界**: synthetic OAuth clientでPKCE＋stateを使うloopback成功／拒否／state不一致／callback不一致／Secret登録失敗を操作し、要求scopeのallowlist、厳格secret非露出、認可コード即時交換、確認前副作用0件、再認証時の既存履歴維持、OAuth後キャンセル時のSecret削除とgrant revoke案内を確認する。
25. **Google Chatデータ境界**: `SPACE`／`DIRECT_MESSAGE`／`GROUP_CHAT` を含むfixtureで候補が通常スペースだけになること、初期選択0件、取得実行時のspace type再検証、0件／複数page／thread／同日差分／取得範囲内の編集・削除／添付メタデータ／部分失敗を検証する。DM、group DM、添付本文、未選択spaceは0件でなければならない。差分範囲外の古い編集・削除が反映されない正常仕様も確認する。
26. **Google Chat実API**: Sprint 020ではユーザーが明示許可した組織所有test Cloud project、`Internal` OAuth、専用private test workspace、非機密test spaceで、接続、候補選択、初回取得、3時間schedule相当のworkflow、commit、push／pull、検索を確認する。合成fixtureは実API gateの代替にならない。
27. **wizard copy理解性**: Chatwork／Google Chatの全画面copy inventoryを取り、heading、primary body、label、CTA、details、empty／loading／error／successを画面と状態へ対応づける。primary pathの内部用語scan、必須意味要素、button／heading、detailsの明示的な開閉表示・open状態、DOM構造の自動検査を行い、全文一致だけを合格根拠にしない。running UIをdesktop／mobile／200%相当で操作し、「今すること」「次に起きること」「読む範囲」「保存先」「共同編集者への可視性」「自動取得・保存」「履歴保持」を画面だけから答えられるか確認する。理解テスト3件は、2026-07-18のユーザー本人による人間セッション1件（両サービス5/5、重大誤解0）をEvaluatorが証跡化し、残り2件を独立画面レビューで行う。OSファイル選択自動化は理解度評価の必須条件にせず、実ファイル入力はbrowser/CDP等の機能回帰で別に確認する。
28. **Google Chat Cloud準備と一体型確定**: 「Google Chatを設定したい」からskill会話を開始し、Git repo root、`<repo名>-google-chat` のProject表示名／ID案、Google Workspace組織、必要API、Billing非接続を確認する。`gcloud`あり／なし／導入拒否／導入不可、未ログイン、複数組織、権限不足、Project ID衝突、CLI途中失敗、手動中断をfixtureで操作し、変更前の説明・明示確認、直接リンクへのfallback、途中再開を確認する。JSON取得後だけwizardを開き、Cloud準備画像・重複画面0件、JSON選択→別タブOAuth→自動SPACE選択を確認する。以後はスペース→間隔→安全確認→`この設定で始める` の1回で初回取り込みと自動取得設定を完了し、完了画面のprimaryは `設定を終了する`。手動のみは初回取り込みあり・schedule 0件、自動間隔は追加CTA／再選択／追加設定フロー0件とする。
29. **Google Cloud外部変更gate**: `gcloud`のインストール、Cloud project作成、API有効化、OAuth Client作成等の外部変更は、ユーザーの明示許可と専用test資源がある場合だけlive検証する。通常評価はcommand runner／Cloud応答／公式リンクを合成fixtureで検証し、実行していない外部変更をlive成功と表現しない。live許可がないこと自体は本Patchの不合格理由にせず、外部変更0件を証跡化する。
30. **Git所有変更とsecret検査**: 操作前に無関係なtracked／untracked／staged変更を配置する。製品管理workflow／config／historyと初回publish inventoryに、synthetic OAuth client JSON、Chatwork Token、private key、credential URL、known token field、通常のliteral assignmentを配置する。合理的な誤混入はcommit・push前に拒否され、所有pathだけがcommitされ、既存indexの内容とstage状態がbyte単位で維持されることを確認する。`${{ secrets.NAME }}` 等の正規参照、通常文書、合理的な非機密metadataも同じ実Git経路で誤拒否0件を確認する。
31. **symlinkと削除対象**: 一般filesystemでは最終要素、途中ancestor、root自体の外向きsymlinkをNode／shellの全主要書込みで操作し、副作用0件を確認する。Clarityの指定入口だけは内部root resolverが`allowAncestorSymlinks: true`を明示してancestor aliasを物理rootへ固定できるが、利用者向けflag／設定はなく、root自身／root内symlink、壊れた／directory以外のalias、差替えは拒否する。許可root内のsymlink削除はlinkだけが消え、外部参照先のfile／directory内容とmetadataが不変であることを確認する。
32. **loopback session防御**: Chatwork／Google Chatの全状態変更endpointへ、別Origin、Originなし、session確認値なし／不一致、誤Content-Type、GET、再送を送る。正当な同一session JSON POSTだけが成功し、拒否requestは設定、Secret、OAuth、履歴、Gitへ副作用0件であることを確認する。OAuth callbackは並行・再送でもtoken交換とSecret登録が各1回であることをassertする。
33. **非信頼本文とrun相関**: Google Chat本文・発言者・添付名へ内部marker、HTML comment、Markdown見出し、区切り線を入れ、既存・後続blockの欠落0件と再取得の冪等性を確認する。Actionsはdispatch前run、別branch／workflow、時刻欠落／不正、失敗run＋古い成功runを含むfixtureで、今回run以外を採用しない。
34. **0.6.0→0.7.0更新と両面rollback**: 実際の0.6.0相当plugin／workspace fixtureで診断、確認、dry-run、更新、再実行、reload、migration途中失敗、検証失敗を操作する。成功時は0.7.0整合、失敗時はworkspaceとpluginの両方が0.6.0状態へ戻るか、実行可能な旧版復元手順で戻した結果まで確認する。
35. **validatorとportable回帰**: Claude側validator相当とrepo独自validatorの両方でauthor／`forkedFrom`／MIT／source／versionを確認する。master suiteがSprint 015とSprint 020 Patch 002を実際に実行した証跡を取り、Git checkoutと `.git`なしGit archive相当の両方で対象gateを実行する。
36. **Sprint 032時点のfocus・操作領域・文書整合（履歴回帰）**: running wizardをkeyboardだけで全遷移し、各遷移／非同期結果後のactive element、入力中のfocus保持、主要操作の44px相当hit areaをdesktop／mobile／200%で記録する。当時の `.mcp.json`、onboarding、README、公開ガイドを、当時の現行機能・次候補 `0.8.0`・対応サービスと照合する。公開済み `0.7.0` の履歴文書・fixtureは現行説明へ置換しない。この方法は0.8.0の履歴回帰にだけ使い、現在candidateは方法45で別に検査する。
37. **0.8.0正式release gate（履歴回帰）**: F36〜F51、master offline／online、archive gateの合格後、当時同一だった `0.8.0` release candidateを評価する。Sprint 032では未配布段階のcandidate整合、新規導入、portable gate、既存test branchへの追加外部操作0件を確認する。2 edition公開時の両チャットlive gateと後始末はSprint 035で別途明示許可後に行い、過去 `0.7.0` の合格や合成fixtureで代替しない。この方法の期待値は公開履歴として固定する。
38. **edition境界とGit系譜**: neutral／legacy yasashii／反対edition／混在／不明のfixtureを操作し、許可された状態だけが書き込まれることを確認する。別directory、別repo、merge-base、fetch専用upstream、push URL無効、overlay二回適用の同一digest、未分類差分拒否、wizard DOM／copy／scope parity、旧CHANGELOG byte一致を証拠化する。外部repo／remote／push／公開は該当Sprintの明示許可前に行わない。
39. **未配布段階の0.8.0準備（履歴回帰）**: 当時、新規または未導入状態から0.8.0を導入し、neutral marker、edition付きledger、主要skillを確認する。旧0.7.0 updaterのscanner blockerはpath／件数／副作用0だけで再現または証跡保持し、対応済み、live互換PASS、配布保証へ誤集計しない。fixture削除、安全scan弱体化、external recovery／bootstrap、same-version bridgeが0件で、equal／downgradeは副作用0件で停止する。現在candidateの導入判定には流用しない。
40. **0.8.0 candidate identityと履歴保護（履歴回帰）**: 当時のcandidate／latest／marketplace／plugin manifest／正本・旧raw CHANGELOG／ledger／migration／公開ガイドが `0.8.0` で整合し、公開済み `0.7.0` のmanifest、migration、fixture、評価記録、Git履歴が不変であることを確認する。checkout専用のGit／監査evidence検査と `.git`／監査evidenceを含まないarchive配布検査を分け、同じ配布対象bytesについて両方を0 FAILで完走する。現在candidateのidentityは方法45で別に検査する。
41. **全会話のMarkdown可読性**: rules、skills、templates、commands、edition copy、handoffのinventoryを作り、改行禁止・一行圧縮・平文強制のユーザー向け指示0件を確認する。短い1要点、複数手順、診断、部分失敗、完了、handoffを両editionで実行し、必要な段落／箇条書き、過剰Markdownなし、edition内容差維持をレンダリングで確認する。内部1行recordは理由つきで対象外にする。単純成功に固定3項目や架空の次行動がなく、複数結果・部分失敗には必要な構造があることを確認する。
42. **実会話回帰の安全性とホスト集計**: 実会話runnerについて、子プロセスenvのallowlist（合成credential注入で非伝播を確認）、合成HOME（実HOME非透過。内容一覧の証跡記録を含む）、plugin本体のread-only参照、原則Bashなしの最小ツール許可、workspace内fixtureだけの境界テスト、OS sandboxまたはpath-scoped permissionによる書込み先限定と制御されたworkspace外canaryへの書込みが実際に拒否される実証、成功／失敗両方のcleanup、サニタイズ済み証跡を検証する。canary拒否を実証できない構成でWrite/Editを使うscenarioが自動実行されないこと、外部変更の主張が無限定の「0件」ではなく検査対象を列挙した範囲限定表現であることを確認する。実会話出力の回帰はlive conversation gateとしてoffline回帰・master gateと分離して三値（pass／fail／incomplete）で集計し、未実行・未認証は「未完了（incomplete）」と表示され、offline PASSや構文チェックが実会話の回帰保証として数えられていないこと、「解消済み」「回帰保証」の主張が実行済みの検証に限定されていることを確認する。応答判定は `intent × side effect × response state` と意味保存を使い、固定3項目、固定prefix、自然文byte一致、質問禁止を主条件にしない。証跡のhost・runner・実行面記録、unverifiedホストの別集計、1ホストPASSの非昇格、未検証環境の「対応済み」誤表示0件を確認する。
43. **呼び方と利用者中立性**: Claude Code／Codexのオンボーディング文面で4選択肢、host-task-context→Git→OSの優先順位、任意の過去会話／生session logの直接探索なし、正規化・不適格値除外、出典表示、複数候補の推奨、候補なし、探索結果非保存、保存前確認、未回答の「あなた」を確認する。既存変更は `preferences.md`／`AGENTS.md`／`MEMORY.md` の一致と初回決定ログ不変を実fileで検証する。Unicode、空白、引用符、shell／Markdown風metacharacterを含む合成値でも、新しい値は3正本だけへ反映され、journal本文とGit commit subjectが項目名だけの固定文言になり、値、その一部、値由来表現を含まないことを実Git fixtureで確認する。配布物・現行製品正本scanは対象pathとallowlistを記録し、個人名・端末固有path・私用workspace依存0件、正式な製品所有情報の維持、fixtureの合成人物化を正負fixtureで確認する。
44. **authorization・意味保存・3配布系統**: `explicit / inferred / ambiguous / destructive / external` と副作用 `0 / 1 / partial`、応答 `answered / question / saved / error / partial` のgolden setを実行する。明示低リスクは同じassistant turnで1回、自発提案・曖昧さは質問前0件、高リスクは影響確認前0件、retry／resumeでも同じoperation idの重複0件、応答は実状態と一致することを確認する。依頼語の引用、現在依頼ではない仮定・条件、依頼の取消、過去依頼照会は`explicit=false`でwrite 0件、保存済み取消は削除2段階となる。一方、伝聞・推量・内容訂正を含んでも現在利用者が保存を明示したcaseは`explicit`で、情報源・確実性・訂正関係を保存する。各caseの必須要素、禁止表現、意味tuple（主体、日付・期限、行動、対象、否定・条件、情報源・確実性・訂正関係、行き先）、前後snapshotを比較し、欠落・反転・追加negative fixtureを拒否する。行き先・正本ルールが同じ共通caseだけを3配布系統で比較し、Notion routingはprivate版固有caseとしてresponse stateと保存先を評価、安全境界だけを共通比較する。my-vaultはF57の5点だけを独立評価し、Notion property／relation／TaskDB正本／write後再読確認の無回帰を確認する。
45. **既存会話契約migration・回帰最小差分・release version**: 旧 `secretary/AGENTS.md` を持つfixtureでdry-run、template由来行の完全一致／fingerprint、利用者編集衝突、所有判定不能、atomic適用、rollback、再実行差分0件を確認し、全面上書きと周辺行変更が0件であることをsnapshotで示す。固定3項目等の旧judgeは新契約と衝突するassertだけを置換し、同一suiteのpath guard、timeline決定性、Secret、Git所有範囲、cleanupを維持する。削除・置換・追加assert一覧を記録する。versionは公開済み `0.10.0` とそれ以前の履歴を確認し、既存workspaceのidentity移行欠陥を直す後方互換patch `0.10.1` を一意に解決する。0.7.0〜0.10.0履歴回帰と0.10.1 current gateを別結果で検査し、配布系統別のdestination／artifact／rollback／許可状態を確認する。
46. **明示memory authorization・内容冪等性・inventory**: 「これ覚えて」「Rokunabeだと思う。覚えて」、依頼自体のhedge、伝聞内容の明示保存、topic訂正、pending了承／別話題失効／「はい、ただしX」、同一内容の別operation id retry、checkpoint commit失敗→retryを実file fixtureで操作する。decision／topic／journal／Gitの前後snapshotを比較し、明示依頼は内部分類の再確認0件、content hedgeの反転0件、同じcontentの重複0件、topic訂正はappend-only、commit失敗は`partial`かつretryでcommitだけ1件となることを確認する。tracked inventoryは実内容digestを使い、Agentic／Yasashii／private my-vaultを別々に、現行marker 3種の存在、topic保存前の一律確認・exact copy・明示memory別turn確認の禁止marker 0件、対象surface漏れ0件として検査する。source／offline PASSとrelease／cache／loaded versionを別集計し、未実行live phaseを完了表示しない。

## 必須の模擬会話

対象機能が未実装のスプリントでは該当項目を評価対象外とし、実装された時点から回帰シナリオへ追加する。

1. **決定3本**: 明示保存依頼、自発的な保存提案、曖昧な決定の3本を行う。明示依頼は同じターンに1回保存、自発提案・曖昧さは質問前0件となり、主体・日付・行動の意味が保たれる。
2. **decidedゼロの日**: 決定候補がない会話を締め、内部監査の「0件」報告や架空の次行動を通常出力へ出さない。明確な拾い漏れ候補がある別caseでは、現在用件を妨げない質問になる。
3. **相談文脈**: 明示的なtopic保存依頼は同じターンで要点だけを保存し、自発提案は質問前0件となる。逐語ログと入力にない補足は保存しない。
4. **settings 3設定**: 同一タスクを、既定、明示された可逆変更、値不足の変更で行う。明示値は同じターンで反映し、値不足だけ質問し、許可範囲外の設定を変えない。
5. **先回り提案**: 有用なときだけ1提案となり、無断着手しない。提案が無い単純成功へ固定項目や架空の次行動を足さない。
6. **Chatwork検索found**: pull後の保存済み履歴から該当メッセージを見つけ、room・日付・該当箇所を根拠として返す。
7. **Chatwork検索not found→拒否**: 見つからない時に3択の構造化質問を出し、「同期しない」でworkflow・commit・pushが0件である。
8. **Chatwork検索not found→承認**: 「同期して再検索」でdispatch→完了待ち→成功確認→pull→同条件再検索となる。開始前同期や成功未確認のpullをしない。
9. **同期後もnot found**: 導入前／100件制約／未選択room／keyword／編集・削除／workflow失敗を区別し、「存在しない」と断定しない。
10. **一般PJ候補→拒否**: 複数行動・複数セッションの相談で理由つき確認を出し、「今回はまとめない」でファイル・journal・commitが0件である。
11. **一般PJ候補→承認**: 営業・マーケティング・新規事業の各例で、確認後だけ実内容入りのライト `PROJECT.md` が作られ、現在状況と次の入口から再開できる。
12. **PJ決定とTODO**: 確認済みPJの決定を承認すると当該PJの判断と状態が同時更新され、一般memoryへの本文重複がない。実行項目は既存TODO正本にPJ参照つきで入り、PJ内 `TODO.md` は作られない。
13. **ライト→フル**: 昇格トリガー到達時に理由つき確認を出し、拒否では不変、承認では指示・状態・判断・事実へ分離され、索引と関連リンクが整合する。
14. **別repo開発PJ**: 開発依頼はbuildへ進み、別repo正本を選んだ場合は作成・接続・公開範囲の確認後だけポインタを作る。workspace側に仕様・判断・Sprint状態・成果物を複製しない。
15. **一般PJ完了→再開**: 完了確認後だけcompletedになり、完了日・結果・残件を残して進行中一覧から外れるが検索できる。新作業では自動再開せず、再開確認後だけactiveに戻り、過去の完了記録を保持する。
16. **更新確認だけ**: 「最新版にして」で現在版、最新版、変更点、影響、衝突可能性を説明し、「今回は確認だけ」でplugin／workspace／Git／設定が0変更となる。
17. **customized更新**: 変更済みと不明判定のファイルは「現状を残す」が既定で、明示選択したファイルだけ更新される。無応答・拒否は0変更となる。
18. **台帳なし0.2.0**: 既知基準一致だけを未変更と判断し、それ以外を安全側へ倒してdry-runを示す。再実行では追加変更0件となり、失敗時は復元方法が分かる。
19. **Google Chat未接続**: 「Google Chatを設定したい」で高度な設定であることを示し、現在のGit repoからProject案を作る。`gcloud`がなければ公式・インストール無料・Cloud変更能力・承認後だけ実行を説明し、使えなければ公式の直接リンクへ切り替える。Google Workspace組織、`Internal`、Desktop app、必要API、JSON取得を一操作ずつ進め、資格情報を会話へ貼るよう求めない。JSON取得後だけlocal wizardを開く。
20. **Google Chatスペース選択**: 通常スペース、DM、グループDMが存在する状態で、通常スペースだけを0件初期選択から選べる。確定前キャンセルではSecret、設定、workflow、履歴、commitが0件である。
21. **Google Chat検索not found→拒否／承認**: 拒否ではworkflow・commit・push 0件、承認ではdispatch→待機→成功確認→pull→同条件再検索となり、保持設定や未選択の可能性を残す。
22. **Google Chat再認証**: refresh token失効状態で取得を繰り返さず、原因を日本語で示してloopback再認証へ戻る。成功後も既存スペース選択と履歴が維持される。
23. **チャット設定の初見理解**: ChatworkとGoogle Chatを1回ずつ、技術詳細を開かずに開始→準備→選択→間隔→確認→完了または失敗までたどる。各画面で「今すること」を一文で言い直せ、0件／手動のみでは停止と履歴保持の両方を説明でき、安全同意の意味を落とさない。ユーザー本人の確認済み5/5を1件として証跡化し、残り2件の独立画面レビューと合わせて判断する。
24. **既存stageを持つGit操作**: 無関係なstaged／unstaged変更がある状態でChatwork設定とmemory commitを行い、対象変更だけがcommitされ、既存stageが維持される。secret候補を混ぜた場合は対象commit／pushが0件である。
25. **OAuth callback再送と後始末失敗**: 同じcallbackを並行・順次に再送し、token交換とSecret登録が1回だけである。revoke失敗、Secret削除失敗、両方失敗では `cleanup-required`となり、残対象と次の操作を示す。
26. **Markdown markerを含むGoogle Chat**: 本文、発言者、添付名に内部markerと同じ文字列を含む複数messageを初回・差分で取得し、前後の履歴がすべて検索できる。
27. **0.6.0利用者の更新と復元**: customized file、記憶、一般PJ、両チャット履歴を持つ0.6.0 workspaceを0.7.0へ更新し、再実行差分0件を確認する。検証失敗時はworkspaceとpluginを0.6.0へ戻して主要導線を再確認する。
28. **正式release gate**: 自動回帰とarchive gateの合格後、専用private test workspaceでChatworkとGoogle Chatを同じrelease candidateから設定し、両方のActions、commit、push、検索、再実行、後始末を完了する。
29. **反対editionを検出**: yasashii workspaceへagenticを、agentic workspaceへyasashiiを導入・更新しようとし、検出根拠と停止理由を説明してledger、marker、履歴、Gitが0変更になる。混在・不明も同様に停止し、切替や削除を促さない。
30. **未配布段階の0.8.0導入**: 新規または未導入状態へ `0.8.0` を導入し、plugin path、neutral marker、edition付きledger、主要skillを確認する。旧0.7.0 updaterのblockerは副作用0の未解消状態として示し、external recovery／bootstrapやlive互換成功を案内しない。
31. **同一版とdowngradeを拒否**: `0.8.0 → 0.8.0` と `0.8.0 → 0.7.0` を依頼し、現在版／候補版と停止理由を示す。保護commit、plugin update、workspace書込み、migration、ledger変更、push、same-version bridgeが0件である。
32. **読みやすい複数要素の返答**: agentic／yasashiiで同じ複数手順、複数結果、部分失敗、handoffを返し、改行なしの平文が0件、必要な段落／箇条書きがあり、両editionの内容差が残る。1要点の短い確認は過剰なbulletにならない。
33. **明示低リスク操作**: 「覚えて」「もっとフランクにして」「TODO 3を完了にして」「このPJを完了にして」を対象・行き先が一意な状態で依頼し、同じターンに副作用各1件と過去形の結果が返る。復唱だけの停止、二重承認、重複journal／commitは0件。
34. **曖昧さと高リスク境界**: 保存先が2候補、削除、公開、push、認証、権限、他者通知、大量作成、Secret入り保存を行い、必要な質問または影響確認前の副作用が0件である。Secret値を応答・永続物へ出さない。
35. **現在用件優先**: 再開しおり、決定0件、closed project、内部index要確認が同時にある状態で、現在の明示依頼を先に完了する。内部状態名だけの停止や別フローへの横取りが0件。
36. **my-vault限定5点**: task-triage番号承認の再承認なし、明示保存依頼の質問なし停止0件、日付つき将来行動のlocal TODO誤送0件、Calendar＋vault read-only統合、内部用語ではなく不足一点の質問を確認する。Notion property、relation、TaskDB正本、通常write計画提示、write後再読確認は不変。
37. **3配布系統parity**: agentic、private my-vault、yasashiiで共通golden setを実行し、文体差を残したままintent、副作用、応答状態、保存意味が一致する。同期対象外のrepo-owned fileとprivate値は不変。
38. **explicit誤発火とcontent hedgeの境界**: 依頼語の引用、現在依頼ではない仮定・条件、依頼の取消、過去依頼照会に「覚えて」「記録して」を含め、現在write 0件を確認する。別caseで伝聞・推量・内容訂正に明示保存を加え、同じturnにwrite 1件、情報源・確実性・訂正関係の反転0件を確認する。read-only照会は`answered`、未保存取消は0件、保存済み取消は対象提示後の削除確認待ちとなる。
39. **複合依頼の順序**: 独立した低リスク→external、external→低リスク、相互依存、一括指定の4caseを行う。記載順を守り、確認境界より後は未実行、先行成功は`partial`、相互依存・一括は最初の副作用前0件となる。
40. **既存workspace migration**: template由来旧行だけ、利用者編集あり、所有判定不能、適用済みの4fixtureでdry-runと本実行を行い、全面上書き0件、衝突時0変更、適用時atomic、rollback可能、再実行差分0件、CHANGELOG警告を確認する。
41. **現在candidateと配布先別release確認**: `v0.8.0`／`v0.9.0`／`v0.9.1`／`v0.9.2`／`v0.10.0`／manifest／CHANGELOGを公開履歴として照合し、既存workspaceのidentity移行欠陥を直す後方互換patchから `0.10.1` を解決する。agentic public、yasashii public、private my-vaultのsource SHA、artifact、destination、rollback、再インストール要否、許可状態を別々に確認し、1系統の結果を他へ昇格させない。3版PASS前はrelease／Mac mini同期を未実行とする。
42. **memory scopeと内部分類**: 「これ覚えて」とdecision候補／topic候補をそれぞれ依頼し、利用者に内部分類、file、要約案を選ばせず同じturnで各1回保存する。Secret入り、memory外へのscope変更、一括保存は既存安全境界へ止める。
43. **request hedge／content hedge**: 「覚えといたほうがいいかも」は質問前0件、「Rokunabeだと思う。覚えて」と「田中さんからXと聞いた。覚えて」は同じturnで1件保存とし、推量・伝聞元を確定事実へ変えない。会話全文、依頼語、完全verbatim copyを保存しない。
44. **pendingの一件束縛**: 保存提案への「はい」、別話題後の「はい」、「はい、ただしX」を行う。同じ話題の了承だけが1件保存、別話題後は古い候補0件、修正付き了承は修正版を同じturnで1件保存し、再確認0件となる。
45. **topic訂正と内容retry**: 旧topicへ「XではなくY（理由）」を保存し、旧内容byte不変、訂正event 1件を確認する。同じ意味を表記違い・別operation id・再起動後に再依頼してもtopic／decision／journal／commitが0件追加で、否定・条件・確実性が異なる別内容は誤dedupeしない。
46. **checkpoint partial**: memory本体とjournal成功後のlocal commitを失敗させ、`partial`、保存・journal各1件、commit 0件を確認する。retryは保存・journalを増やさずcommitだけ1件、再retryは全差分0件となる。
47. **canonical freshnessとClarity root alias**: development-pointerを持つsynthetic Secretary workspaceとlocal正本repoで、status／daily／weekly／Portfolioが「最初に読むファイル」、Repo identity／Git current state、Clarity状態、観測時刻、未確認理由をbounded readすることを確認する。remote-only／missing／unsafe／unreadableではsnapshotだけの現在断定とnetworkが0件であることを確認する。別fixtureではworkspace ancestorだけをsymlinkにし、opt-in aliasとphysical pathのidentity／判定一致、preview write 0、物理`.clarity/**`限定apply、root自身／内部／broken／file向き／差替え拒否、一般working rootのnegative control、Drift locator拒否、macOS platform alias回帰を検査する。
48. **Harness-aware initとWindows native**: 2 MiBを超え、`src/`／`scripts/`だけで一般budgetを使い切れるHarness fixtureで、state、spec、Current contract／progress／feedbackをauthoritative reserved laneが先に確保し、意味role、coverage、feedback absent、TBD／missing／invalid／巨大state、Secret／binary／symlinkを区別することを確認する。巨大stateは1 file上限の単純拡大でなくbounded section readで扱う。同じcandidateをWindows native runnerでdrive letter、backslash、空白、日本語、CRLF、case collision、reserved／invalid path参照へ実行し、symlink／junction capabilityを別々にprobeして理由付きSKIP／NOT-RUNへ分離する。別OS上のWindows風文字列だけをnative PASSへ数えない。

個人化された文面の完全一致はassertしない。設定の読込、許可された分岐、既定へのフォールバック、確認フローを評価する。

## 採点基準と閾値

| ID | 基準 | 見るもの | 閾値 |
|---|---|---|---|
| C1 | 完成度 | 対象スプリントの受入基準と外から見える成果 | ≥4 |
| C2 | 構文・整合 | JSON/frontmatter/name/パス/識別子/参照先 | **5** |
| C3 | 機能の実証 | シーム、固定時刻、模擬会話、実データ構造 | ≥4 |
| C4 | 非エンジニア体験 | **既定値**での内容依存応答、標準語彙、進行、エラー説明 | ≥4 |
| C5 | 安全・規律 | 記憶保護、封じ込め、single private repo、承認済みチャット同期例外、secret非漏洩、push同意 | **5** |
| C6 | 無回帰 | 既存＋新規の全回帰が成功 | **5** |
| C7 | やさしさ | 言葉遣い、報告、先回り提案が、規律を緩めず機能する | ≥4 |
| C8 | wizard体験・デザイン | 添付デザイン言語、操作性、responsive、accessibility | ≥4 |
| C9 | 配布チャネル非依存 | 現行正本・公開面・配布物の固有表現0件、一般利用者だけで理解できること、維持項目 | **5** |
| C10 | 更新の安全性 | 診断無副作用、説明後の明示確認、カスタマイズ保護、冪等migration、rollback、push禁止 | **5** |
| C11 | Google Chat境界 | 各社所有Internal OAuth、最小read-only scope、通常スペース限定、秘密非露出、同意済み同期 | **5** |
| C12 | release履歴・現在candidate整合 | 0.7.0〜0.10.0履歴不変、0.10.1一意解決、current version gate、配布先別外部許可 | **5** |
| C13 | edition分離・互換 | Git系譜、別repo、共通path、overlay、衝突停止、旧raw CHANGELOG、公開済み0.8.0履歴、隔離private candidate | **5** |
| C14 | 会話のMarkdown可読性 | 改行、段落、必要な箇条書き、内容依存の構造、edition差維持、過剰Markdownなし | **5** |
| C15 | 会話authorization・意味保存 | intent分類、副作用、応答状態、意味保存、現在用件優先、3配布系統parity、限定Notion変更 | **5** |
| C16 | 秘書identity・名前routing・rename | 英語名、stable ID、AI author、managed block、canonical resolver、同名誤routing 0件、分類preview、rollback | **5** |
| C17 | 既存workspace identity migration | plugin更新との状態分離、read-only診断、製品所有節、台帳、自由記述保持、local checkpoint、完全rollback、冪等性 | **5** |
| C18 | 明示memory authorization・内容冪等性 | memory scope、hedge分離、pending、append-only訂正、content dedupe、checkpoint partial、3版inventory | **5** |
| C19 | Clarity正本・状態モデル | Event／Evidence／State、Decision×Execution、AI推定非確定、4モード | **5** |
| C20 | Attention・Clarity UX | bounded output、結論→理由→根拠→選択、Drift、canonical freshness／未検証表示 | ≥4 |
| C21 | Clarity Hook・host parity | 共通command router、trust／disabled、manual fallback、競合安全、host別live | **5** |
| C22 | federated link・sync・Drift | reciprocal identity、authority、pull、conflict、cross-root write 0 | **5** |
| C23 | projection・Xmind | deterministic Markdown／Mermaid、MCP-first provider、承認付きlocal fallback、fixed visual、proposal | ≥4 |
| C24 | Clarity安全・統合・public-first | 物理root封じ込め、canonical read freshness、Secret／dirty、既存Skill協働、inventory、回帰、固定handoff | **5** |
| C25 | ユーザー判断handoff governance | PASS分離、exact source／feedback／承認束縛、失効、順序、scope、rollback | **5** |
| C26 | Clarity包括scan・Windows native | Harness正本予約枠、state構造／Secret本文分離、意味分類、coverage、generic無回帰、portable path、Windows実run | **5** |

## スコアアンカー

### C1 完成度

- 5: 受入基準をすべて実物で確認し、条件付き項目の判断記録も明確。
- 4: 必須成果はすべて成立。任意の補助面だけ未実施で理由がある。
- 3以下: 必須成果、依存、条件付き判断、または必須external live gateのいずれかが欠ける。→不合格。live gate準備不足は実装不具合と区別する。

### C2 構文・整合【ゼロ許容】

- 5: manifest、SKILL、参照パス、改名後識別子、別repo導線が全て整合し、`harness@yasashii-harness`、remote manifestのname / source / repository / homepage、metadata allowlistの完全一致をonline証跡で確認できる。現行の製品説明に旧配布チャネル固有表現がなく、一般の非エンジニア向けに整合する。
- 4以下: JSON破損、name重複、デッドリンク、PJ正本の二重化、PROJECT／DECISIONS／MEMORY／AGENTS索引の不整合、旧名の実害ある残存、現行対象への旧配布チャネル固有表現の残存、参照先不在、remote manifest不整合、metadata allowlist外変更、schedule表示とworkflow不一致、またはonline未検証のいずれかがある。→不合格。

### C3 機能の実証

- 5: 固定時刻ドライランと該当する模擬会話が全て成功し、PJ候補確認・ライト／フル・別repoポインタを含むデータと副作用の証跡がある。
- 4: 主要シームと模擬会話が成功。補助ケースのみ手動確認で理由がある。
- 3以下: grepや目視だけ、固定時刻未検証、模擬会話未実施、実API必須Sprintでlive gate未実施、またはassert失敗。→不合格。合成fixtureだけで実APIを合格にしない。

### C4 非エンジニア体験

- 5: 既定設定で、単純成功は自然な短文、複数結果・部分失敗は必要な構造となり、一般技術用語、初出補足、進行表示、エラー説明が一貫する。Chatwork／Google Chat wizardは最初の1文で今することが分かり、1画面1判断・1段落1要点、結果が分かるCTA、失敗時の「何が起きたか→次にすること」が全画面で成立する。Chatworkの外部準備後は「この設定画面へアクセスする」の自然な日本語を使い、非エンジニア想定の理解テストで安全上の誤解が0件。
- 4: 軽微な表現差が1〜2箇所あるが、迷わず次の行動を選べ、読む範囲・保存先・可視性・自動取得・履歴保持を誤解しない。
- 3以下: 過度な平易化、長すぎる報告、生英語エラー、進行不明、内部用語が主説明を占める、不自然な直訳、CTA後の結果が分からない、または安全上の意味を説明できない画面が複数ある。→不合格。

### C5 安全・規律【ゼロ許容】

- 5: 記憶保護、純追加、journal限定例外、path guard、single private repo境界、Chatwork／Google Chat以外の外部同期禁止、Google Chatのwizard memory→`gh` stdin→Repository Secret、Chatworkの本人によるGitHub Repository Secret画面への直接入力、両サービスの通常フロー非漏洩、製品管理対象／初回publish inventoryの合理的な誤混入拒否、選択対象限定、同意済みschedule／確認付きmanual pushに違反ゼロ。Chatwork wizardのToken取得・受領・登録機能は0件で、正規参照・通常文書・合理的metadataの誤拒否もない。
- 4以下: 通常フローでのtoken・credential露出、強制検査対象の合理的な誤混入のcommit／push、自発提案または曖昧入力で未確認のPJ作成／昇格／完了／再開／別repo接続、高リスク操作の影響確認漏れ、完了時の自動移動・削除、一般PJの無断repo分離、別repo開発PJ正本のworkspaceへの複製、public配布repoへのSecret／チャットworkflow／対象設定／履歴配置、チャット専用test repo、未選択対象取得、確認なしexternal live gate、同意なしschedule push、未確認の破壊操作、または `~/workspace/agentic-harness` を編集・checkout・commit・branch・remote変更・生成物作成・複製元・コマンド対象のいずれかに使った事実が1件でもある。意図的難読化の未検出だけはこの不合格条件に数えない。→不合格。

### C6 無回帰【ゼロ許容】

- 5: 既存・追加の全assertが成功し、既知の失敗も残らない。
- 4以下: 新規失敗、既知失敗の放置、回帰コマンド未実行のいずれか。→不合格。

### C7 やさしさ

- 5: 有用な場合だけ提案が1つ・根拠つき・選択権を残し、不要なら提案や次行動を作らない。言葉遣いと進行表示が自然で、規律の省略ゼロ。
- 4: 大筋は守るが、提案や説明の自然さに軽微な改善余地がある。
- 3以下: 押しつけ、無断着手、過度な幼稚化、またはやさしさを理由に検証・役割分離を省く。→不合格。

### C8 wizard体験・デザイン

- 5: desktop／mobile／200%相当の実画面で、1 step 1 message、1画面1判断、CTA最大2、画面別の最大情報量、technical detailの段階表示、余白中心の階層、指定palette・4px radius・14px中心が一貫し、keyboard／focus／label／contrastを含む主要操作が迷いなく完了する。detailsは開閉可能と分かる山形アイコン等、closed／open表示、keyboard、visible focus、accessible name、open状態を備える。Google ChatはCloud準備画像や重複画面を持たず、JSON選択から初回取り込み・自動取得設定の一体型フローが追加設定のループなく完了する。Tesla商標・写真・gradient・shadow・scale hoverは0件。
- 4: 必須フローとresponsive・accessibilityは成立し、余白やtypographyに軽微な改善余地が1〜2点ある。
- 3以下: screenshot未取得、running UI未操作、mobile／200%崩れ、操作不能、copy inventoryの欠落、対象サービス名の欠落、指定背景色・黒前景・4.5:1 contrastの不一致、指定外の装飾、青色primary CTAの残存、またはaccessibility欠陥がある。→不合格。

### C9 配布チャネル非依存【ゼロ許容】

- 5: 対象パスを明示した機械検査で旧配布チャネルの固有名称・英字名が0件。期数、授業回、教育課程、参加者であることを利用前提にする説明も目視で0件で、一般の非エンジニアが公開面だけで導入・利用を理解できる。MIT、Shin-sibainu/cc-companyの単段クレジット、`forkedFrom`、既存機能、Git履歴は維持される。
- 4以下: 対象面に固有表現または参加者前提が1件でも残る、一般化で導入手順や機能説明が欠落する、監査記録を改変する、維持対象を削除する、または検査の対象・除外理由が不明確。→不合格。

### C10 更新の安全性【ゼロ許容】

- 5: 診断は完全な読み取り専用。実更新は候補versionが導入済みversionよりsemver上で新しく、説明と明示確認を終えた場合だけで、pushなしの復元地点、現状維持を既定にした個別選択、secret非保存、dry-run一致、migration冪等性、検証、plugin／workspaceを区別したrollbackがすべて成立する。同一版とdowngradeは副作用0件で停止する。
- 4以下: 診断中の副作用、了承前変更、same-version bridge、同一版／downgrade更新、customized／unknownファイルの既定上書き、secretや私的本文の台帳保存、保護commitなしの更新、push、dry-runと本実行の不一致、migration再実行差分、検証前の成功報告、rollback不能の隠蔽のいずれかが1件でもある。→不合格。

### C11 Google Chat境界【ゼロ許容】

- 5: Google Workspace組織所有Cloud projectと `Internal` Audience、Desktop appのPKCE＋state付きloopback、最小read-only scope、memoryからRepository Secretへの直接登録、通常フローの厳格secret非露出、製品管理対象の合理的な誤混入拒否、`SPACE`限定、DM／group DM／添付本文0件、選択対象だけの冪等保存、同意済み3時間推奨scheduleがすべて成立する。個人Googleアカウント、`External`、Test users、公開審査への利用者向け分岐0件。
- 4以下: ShigApps共通External app、サービスアカウント／JSON鍵、write／admin／未使用scope、厳格secretの表示・保存、client IDの永続物保存、DM／group DM／未選択space取得、同日既存投稿消失、添付本文取得、確認前の履歴保存／commit／push、public repo保存、実API未検証のいずれかが1件でもある。→不合格。live gate準備不足は `external-live-gate-unavailable` と区別する。

### C12 release履歴・現在candidate整合【ゼロ許容】

- 5: `0.7.0`〜`0.10.0` の公開記録・fixture・tag・履歴を変えず、公開済み0.10.0と既存workspace identity migrationのpatch分類からcandidate `0.10.1` を一意に解決する。current candidate／全配布面が0.10.1で整合し、Agenticの合格済み完全SHA／digestからYasashiiとprivate my-vault候補を別々に作り、3版PASS後だけreleaseとMac mini同期へ進む順序が成立する。
- 4以下: `0.7.0`〜`0.10.0` の履歴書換え、0.10.1以外の推測candidate、Agentic未合格SHAからの下流同期、1版の結果を他版へ昇格、suite未実行、配布先混同、3版PASS前release／Mac mini同期、無許可のexternal writeのいずれかが1件でもある。→不合格。

### C13 edition分離・互換【ゼロ許容】

- 5: `agentic-secretary` が指定の別directory／別repoで同じGit系譜を継承し、`yasashii-secretary` がfetch専用upstreamと狭いoverlayで追随する。共通path、安全rule、wizard parity、neutral／legacy／反対edition判定、旧raw CHANGELOG一致、公開済み0.8.0履歴、equal／downgrade停止、LICENSE／単段クレジット、公式validatorがすべて証拠化される。private my-vault所有Skillは隔離candidateで独立評価され、PASS前の実downstream変更0件。外部操作は配布系統別に明示許可された範囲だけである。
- 4以下: monorepo／subdirectory化、別初期commitによる履歴作り直し、upstream push可能、overlay範囲超過、wizard差分、安全rule上書き、反対editionへの書込み、旧raw CHANGELOG不一致、旧blockerの偽PASS、same-version bridge、equal／downgradeの副作用、無許可のrepo／remote／push／公開、根拠なしの `forkedFrom` 変更のいずれかが1件でもある。→不合格。

### C14 会話のMarkdown可読性【ゼロ許容】

- 5: 両editionの全ユーザー会話surfaceで、1要点は自然な段落、複数要素は空行付き段落またはMarkdown箇条書きとなる。単純成功に固定3項目や架空の次行動がなく、部分失敗は完了・未完了が区別される。改行禁止・一行圧縮・平文強制の指示0件で、preferencesから無効化できず、editionの思想・対象・内容差が維持される。過剰な見出し、1文ごとのbullet、装飾目的Markdownもない。
- 4以下: 複数要素を連結した改行なし平文、固定項目のための不要情報、改行を好みとして質問する導線、preferencesによる無効化、対象surfaceのinventory漏れ、または可読性改善を理由にedition差を同一化した事実が1件でもある。→不合格。

### C15 会話authorization・意味保存【ゼロ許容】

- 5: `explicit / inferred / ambiguous / destructive / external` の境界がgolden setどおりで、低リスク明示依頼は同じassistant turnに1回、自発提案・曖昧さ・高リスク操作は必要な質問または影響確認前0件となる。依頼語の引用、現在依頼ではない仮定・条件、取消、過去照会は誤発火せず、伝聞・推量・内容訂正を含む明示保存は情報源・確実性・訂正関係を保ち、保存済み取消は削除2段階となる。`answered / question / saved / error / partial` が実副作用と一致し、現在用件が内部状態より優先される。caseごとの必須要素・禁止表現・意味tuple・前後snapshotが期待と一致し、negative fixtureを拒否する。行き先・正本ルールが同じ共通caseだけが3配布系統で同じ意味と安全境界を持ち、Notion routingはprivate版固有期待に従う。
- 4以下: 明示低リスクの二重承認、retryでの重複、引用等の誤write、取消の即時削除、質問なし停止、自発提案・曖昧入力の無断write、高リスク操作の確認漏れ、副作用0件での完了表示、部分成功の全体成功表示、現在用件の横取り、必須要素・意味tuple・snapshotの不一致、negative fixtureの見逃し、異なる正本間の誤parity、my-vaultのNotion過剰変更、またはrepo-owned/private値の同期漏洩が1件でもある。→不合格。

### C16 秘書identity・user-scope routing・rename【ゼロ許容】

- 5: 利用者の呼び方と秘書名が別fieldで、初回／専用Skillの英語名確認、stable IDとAI種別、human／AI author識別が成立する。user-scope managed blockは明示確認後だけ製品所有範囲をatomic更新し、canonical resolverが別repo cwdを誤初期化しない。人間・顧客・author等の同名negative caseは誤routing 0件。renameはread-only分類preview、分類別確認、履歴保持、aliases、再実行差分0件を満たし、workspace所有fileを変える場合は正確なrootから所有path限定local checkpointを作る。commit段階の失敗ではuser-scopeとGit状態を含む全体が開始前へrollbackし、push 0件である。
- 4以下: 呼び方との混同、不適格名保存、確認前HOME write、guidance全面上書き、override優先の誤り、既存block破壊、cwdへの誤onboarding、同名人間の誤routing、盲目的全置換、過去author改変、未確認user-content変更、必須checkpointの欠落／別root commit／対象外path混入、commit失敗のexit 0、部分更新、rollback不能、既存Git状態の破壊、push、stable ID変化のいずれかが1件でもある。→不合格。

### C17 既存workspace identity migration【ゼロ許容】

- 5: plugin更新とローカルmigrationを別状態として報告し、新sessionのread-only診断がidentity未作成／identity-only／完全適用／衝突を区別する。previewと別確認後だけidentity、AGENTS／CLAUDEの製品所有identity管理節、最小台帳を新規導入相当へatomicに揃え、利用者自由記述と既存Git状態を保持する。所有path限定local checkpoint、途中失敗のworkspace／Git完全rollback、成功後再実行0差分・0追加commitが成立し、user-scope routingは別確認のままである。
- 4以下: plugin更新だけの完了表示、確認前write、英語名未確認、既存stable ID再生成、AGENTS／CLAUDE全面上書き、利用者自由記述や他blockの変更、identity／管理節／台帳の部分成功、台帳への私的値保存、別root／対象外pathのcommit、開始前Git変更の破壊、rollback不能、rerun差分／重複commit、user-scope routingの同時有効化、3版PASS前release／Mac mini同期のいずれかが1件でもある。→不合格。

### C18 明示memory authorization・内容冪等性【ゼロ許容】

- 5: 明示された低リスクmemory依頼はuser-visible scope `memory`だけで同じturnに1回保存され、decision／topic、file、要約案の再確認0件。request hedgeとcontent hedgeが分離され、伝聞・推量・留保・訂正の意味を反転しない。pendingは一件束縛・別話題失効・修正付き了承の同turn実行を満たす。topic訂正はappend-only。同じ内容は別operation id／再起動後もmemory／journal／commit重複0件。checkpointだけの失敗は`partial`で、retryはcommitだけを完了する。3版それぞれの実内容inventoryに現行markerがあり、旧topic一律確認・exact copy・別turn確認markerが0件。source／offlineとrelease／cache／loaded versionが分離される。
- 4以下: 明示memory依頼の内部分類確認、content hedgeを理由にした再確認・非保存、推量／伝聞の確定化、pendingの複数候補保持・別話題後実行・修正版再確認、topic上書き、同内容のtopic／decision／journal／commit重複、commit失敗retryでの保存再実行、`partial`の全失敗／全成功表示、inventory対象漏れ、file存在だけのmarker判定、禁止旧marker残存、1版PASSの他版昇格、offline PASSのlive反映済み表示のいずれかが1件でもある。→不合格。

### C19 Clarity正本・状態モデル【ゼロ許容】

- 5: Event／Evidence／Stateが分離され、Stateを決定的にrebuildできる。Decision／Executionの全組合せ、`rolled_back`、`superseded`、`idea`、期限前後`deferred`が仕様どおりで、AI推定・draft・古いproposalが`confirmed`へ昇格しない。4モードは同じcoreとimmutable Project IDを使い、既存正本を複製しない。
- 4以下: quadrantが手入力正本、rebuild非決定、AI推定の確定、Event履歴消失、本文複製、Modeごとの意味分岐、Project ID変化、既存Decision／task／Repo正本の置換が1件でもある。→不合格。

### C20 Attention・Clarity UX

- 5: 「今、人間が考える必要があるのは何か」へ最大3件程度で結論→理由→根拠→選択を返し、Drift、無承認実装、決定済み未実行を正しく優先する。development-pointerではworkspace snapshotと正本repoの観測・時刻・freshnessを分け、正本未確認時に現在状態を断定しない。idea／正常項目は畳み、推定・未検証・根拠不足・source unreachableを断定しない。
- 4: 主要Attentionと選択は成立し、軽微な順序・copy改善だけが残る。
- 3以下: 全件羅列、task一覧化、理由／根拠なし、Drift誤断定、idea優先、Attentionなし時の不安を煽る表示、またはbounded output違反。→不合格。

### C21 Clarity Hook・host parity【ゼロ許容】

- 5: plugin rootの共通`hooks/hooks.json`とClarity専用command router 1組でClaude Code／Codex payloadを正規化し、未初期化no-op、短時間処理、manual fallback、同時発火の破損0、Stop一度限り、compact再開、SessionEnd軽量flushが成立する。Codex trust前skip／disabledとClaude plugin disabledをdegradedとして扱い、両hostを別々にlive検証する。
- 4以下: 他Skill Hook、Hook内LLM／network／重いscan／Xmind／connector／update、memory候補の意味判定、共有JSON競合、Stop loop、trust前実行、manual fallback欠落、1host結果の他host昇格、未検証のverified表示が1件でもある。→不合格。

### C22 federated link・sync・Drift【ゼロ許容】

- 5: prepare／accept／finalizeが双方のID／Repo identity／digestを照合し、pull syncはpreview後に自Repoだけを更新する。ancestor aliasとphysical pathでRepo identityは同一、tracked link bundleのabsolute local pathは0件。authorityが一意で、conflict、stale、schema不一致、deleteを隠さず、last-write-wins／cross-root write／暗黙pushが0件。Driftは双方のEvidenceを示し、root aliasを許可してもsource locator symlinkを拒否し、根拠不足はpossibleに留める。
- 4以下: 相手Repoへの直接write、absolute pathのtracked保存、identity改ざん受理、Primary重複、conflict消去、暗黙network／push、根拠なしDrift確定、履歴消去が1件でもある。→不合格。

### C23 projection・Xmind

- 5: Markdown／Mermaid／選択Xmind providerが同じStateから決定的に生成され、projectionであることが明示される。Xmind integrationのON／OFFとprovider capability／priority／selected／reason／verifiedが分離し、Agentic／Yasashii既定OFF、private既定ON。integration ONでcapable MCPは`mcp-selected`となり、MCP不可／失敗は理由とlocal対象／影響／auth／credit見込みをpreviewした`fallback-approval-required`で止まる。明示承認後だけ`local-selected-after-approval`、拒否／cancelは`stopped`・write 0。MCP／localの2必須Sheet／同等map、stable ID、既存branch保持、edit proposalが成立する。
- 5のfixed visual: MCP、local `.xmind`、利用可能なMermaid styleで、左上 🟢 定着・検証／安定している／`#16A34A`、右上 🔵 実行待ち／あとは進めるだけ／`#2563EB`、左下 🟡 暫定実装・要再確認／注意して確認する／`#D97706`、右下 🔴 設計・意思決定／人間の判断が必要／`#DC2626`、上軸「決まっている」／下軸「まだ決まっていない」を守り、色だけでなくemoji／ラベル／意味文を併記する。Mermaidはq1右上青、q2左上緑、q3左下黄、q4右下赤と一致する。
- 4: 必須projection、provider resolver、承認付きlocal fallback、fixed visualは成立し、明示承認がないreal MCP external-liveだけがtruthful NOT-RUNである。adapter contract／isolated fakeは成立するがreal providerをverifiedにしない。
- 3以下: projectionの正本化、非決定出力、Xmind OFF無視、ONから接続／verified／課金承認を推定、capable MCPよりlocalを優先、MCP不可時の自動local write、preview／confirmの欠落、承認なしexternal／local write、fakeのverified昇格、fixed visualの位置／4色／軸／文字情報不一致、Xmind変更の直接確定、Hook内Xmind／network、localのoffline／無料断定のいずれか1件。→不合格。

### C24 Clarity安全・統合・public-first【ゼロ許容】

- 5: 一般rootのancestor symlink拒否を維持しつつ、Clarityの指定入口だけが内部root resolverからancestor aliasを物理rootへ固定する。適用結果はClarity internal opt-inであることを示し、利用者向けflag／設定と共通filesystemへの緩和は0件。root自身／root内symlink、broken／file向きalias、差替え／identity変更を副作用0件で拒否し、CLI／core／link／projection／Drift／Secretary adapter／Hookのcontainmentが一致する。development-pointerのlocal正本はbounded readされ、freshness／未確認理由が表示される。canonical observationは正本repoへのwrite／Git変更／network 0件、alias apply fixtureは物理rootの宣言済み`.clarity/**`だけを変更する。path／Secret／dirty／stage／schema／lock／retry境界、関連surface inventory、既存回帰が0 FAILである。projects lifecycleとClarity責務が分離し、タスク化は明示委譲だけ。public Evaluator PASS、またはC25を満たす束縛済みユーザー判断のready前は、downstream／release／cache／external write 0件。ただしSprint 050 Patch 004の承認済みexact candidate branch pushと因果的Windows CI／必要時workflow dispatchだけはC26のexternal live gateとして分離する。
- 4以下: ancestor aliasの一般既定許可、root自身／root内symlink追従、alias差替え後write、alias／physical identity不一致、tracked absolute local path、Drift locator symlink追従、stale snapshotだけの現在断定、利用可能local正本の未読、remote-onlyからの自動network、正本repo／Gitへの副作用、private値のpublic混入、対象surface漏れ、task自動作成、project lifecycleのClarity所有、memory二重保存、Harness state置換、自動connector／update、既存dirty破壊、Secret露出、正当なacceptance basisより前の下流反映、release stage混同が1件でもある。→不合格。

### C25 ユーザー判断handoff governance【ゼロ許容】

- 5: `public-evaluator-pass`を回帰させず、ユーザー判断経路は`public-user-decision-risk-accepted`と`evaluatorPass=false`を保つ。accepted product sourceは`5f08d454c05576fcff8ab32c10c00887b4c15a96`と既定tree／common digest、元feedbackはcommit／path／digest／Verdictまで一致する。受容したAC3／C21と、受容していない`XM-007`／別phase残余が分かれ、承認原文は具体的文脈・scope・candidate・順序・失効条件と一体である。`acceptedSource`とPatchの`governanceSource`、private my-vault→Yasashiiの順序、common／excluded／protected path、protected digest、file-scoped rollbackが固定され、Patch評価中の実downstream／release／host／Xmind writeは0件。Patch governanceの独立Evaluator PASSを確認した入力だけがreadyになる。
- 4以下: ユーザー判断をPASS／verifiedへ昇格、state文字列だけからready、自動推測、短い了承の文脈なし採用、別candidate／feedbackへの承認転用、source／tree／common digest／未達／順序／scope変更後もready、撤回・失効承認の再利用、governance commitによるaccepted product source置換、既存PASS経路の破壊、protected／excluded path変更、rollback不能、またはPatch中の実downstream／release／host／Xmind writeが1件でもある。→不合格。

### C26 Clarity包括scan・Windows native【ゼロ許容】

- 5: >2 MiB Harness Repoでもauthoritative reserved laneがstate、spec、Current contract／progress／feedbackをgeneric sourceより先にbounded確認する。state／contract／progress／feedbackの意味が分離し、feedback absent、TBD／missing／invalid／巨大state、Secret／binary／symlinkをcoverage理由へ正直に出す。stateはCurrent ID／status／Next Planned／該当row等の構造と非構造本文を分け、無害なplaceholder・credential field名・過去説明でもCurrent／4 role bundleを保持する。実値らしいSecretが混在しても値・本文・raw-content由来digest・summary・candidate・Evidenceへ露出せず、構造metadataだけを`redacted`／`partial`として返す。state以外のstrict Secret exclusion、bounded section read、非Harness generic、alias／physical determinism、offline preview write 0、synthetic apply所有範囲、Git／network境界を守る。`.github/workflows/windows-recording-regression.yml`の既存`windows-native` job、0.9.2回帰、`timeout-minutes: 10`を維持し、exact candidateのWindows native runでdrive／backslash／空白／日本語／CRLF／case collision／reserved path参照とstate構造抽出を直接PASSする。symlink／junction capabilityを別々にprobeし、macOS／LinuxとSprint 041／050 Patch 003／004回帰も0 FAILである。
- 4以下: generic budgetが正本予約枠を枯渇、state内の無害なfield名・placeholder・履歴説明だけでwhole-fileを除外してCurrent／4 roleを欠落、Secret値・周辺本文・raw digest・summary・candidate・Evidence露出、exact literal allowlist、state以外のSecret exclusion弱体化、progressをEvaluator PASSへ昇格、feedback missingをscan-limitと混同、partialを完全扱い、全file上限または`maxFileBytes`の単純拡大、Secret／binary／symlink読込、非Harness候補回帰、alias／physical不一致、absolute local path混入、POSIX separator／Bash依存、case collisionの黙認、別OSのWindows風文字列だけでWindows verified、symlink／junction capability混同、権限不足caseをPASS偽装、Windows native未実行のまま対応済み表示、既存Windows workflow／0.9.2回帰／timeoutの破壊、macOS／Linuxまたはancestor alias回帰が1件でもある。→不合格。

## Project Clarityの検証方法（safe harbor）

- case本文とE2E手順のrepo内実行正本は`docs/spec/clarity-acceptance-cases.md`、単一割当の正本は`docs/spec/clarity-acceptance.md`と各Sprint契約である。Sprint 041〜048はprimary対象IDだけとし、例外としてSprint 043は最新user decision用XV-001〜004も初回評価する。Sprint 049はCLX 20、Sprint 050はprimary 250／CLX 20／XV 4を全再実行する。
- 隔離temporary Repo／合成HOME、Git checkoutと同一bytesのGit-free archive、固定時刻、failure injection、before／after tree・Git snapshot、JSON parse、content digestを使う。
- HookはClaude Code／Codexの実eventごとにcommand、exit、payload normalization、timing、runtime event、additional context、trust／disabled状態を記録する。1hostの証拠を他へ流用しない。
- UI／projectionは生成Markdown、raw Mermaid／render画像またはSVG／DOM style、Xmind MCP adapter request／response、承認済みnative `.xmind`のvalidation／Sheet／stable ID／styleとスクリーンショットを証拠にする。Xmindはpublic既定OFFを維持し、隔離fixtureでONにしてMCP-first resolverとlocal approval gateを行う。
- Xmind MCP caseはadapter／capability／priority／selected／reason／確認境界を必須実装とする。未接続・無効・能力不足・許可なしのreal external-liveは正直なconditional NOT-RUNでよいが、fallbackは自動writeせずpreview／confirmを評価する。外部write、local write、network、credit消費を合格のために自動実行しない。isolated fakeをreal providerのverified証拠にしない。
- private固有case IDはpublic stageではadapter seam、private literal非混入、固定handoffを評価する。実`05/02/10_sources/Notion`と実顧客fixture／提供PDF／提供Xmindはprivate版の別Harnessで再実行し、public PASSへ偽装しない。`XM-012`／`E2E-002`のpublic評価は同構造の匿名fixtureを使う。
- 実行command、exit code、case ID、期待／観測、fixture root、前後digest、PASS／FAIL／NOT-RUN理由、host／provider状態があれば十分とする。新しいcollector、統一attestation、実顧客data、無許可network／release／downstream writeを追加条件にしない。

## Sprint 050 Patch 003の検証方法（safe harbor）

- synthetic Secretary workspace、local正本Git Repo、remote-only pointer、missing／unsafe／unreadable、Secret／binary／巨大file／内部symlink fixtureでCF-001〜007を実行する。status／daily／weekly／Portfolioごとに観測source、最初に読むファイル、Repo identity／Git current state、Clarity状態、observed at、freshness、excluded／uninspected、unavailable理由を記録する。
- alias/workspace/repoのworkspace ancestorだけをsymlinkにしたfixtureで、一般`workingRoot`のoption省略／falseとClarity内部true、alias／physical、未初期化／初期化済み、preview／applyを実行する。root自身、`.clarity`外向き、broken／file向きancestor、alias差替え／物理identity変更を個別negative fixtureにする。
- Clarity CLI／core／link／projection／Drift／Secretary adapter／Hookの各Repo root入口を直接通し、適用policyの由来、Drift source locator symlink拒否、link bundle absolute local path 0、物理`.clarity/**`以外のwrite 0、dirty／staged／untracked／HEAD／branch／remote不変を確認する。一般`workingRoot`はoption省略／falseのnegative controlとする。
- macOSでは`/var`→`/private/var`、`/tmp`→`/private/tmp`を既存platform alias回帰として確認する。他OSは同aliasを合格条件にせず、host固有home／volume名を実装へ固定していないことをsource scanで確認する。
- 同じcandidateを通常checkout、ancestor alias経由、`.git`なしGit-free archive相当で実行し、actual path／realpath、root identity、case結果、tree digestを記録する。public Patchではsynthetic fixtureだけを使い、実顧客repoへapplyしない。
- command、exit、case ID、expected／observed error code、requested／physical rootの一時的な比較、before／after filesystem・Git snapshot、read件数／byte上限、network／external operation log 0があれば十分とする。新しいcollector、統一attestation、実顧客data、実provider、実downstream、releaseを追加条件にしない。

## Sprint 050 Patch 004の検証方法（safe harbor）

- synthetic Harness Repoで一般fileが2 MiBを超えるfixture、Current IDがvalid／TBD／missing／invalidのfixture、feedback absent、巨大state、Secret／binary／内部symlink、非Harness fixtureを使い、HS-001〜016を実行する。authoritative／generic laneのbudget、coverage、意味role、候補bundleを記録する。
- alias path／physical pathで同じfixtureをpreviewし、候補ID／意味／coverage digest、Repo identity、`changed:false`を比較する。applyはsynthetic fixtureだけで行い、物理Repo内の宣言済みClarity所有path以外のwrite 0、dirty／staged／untracked／HEAD／branch／remote不変を確認する。
- Windows正式runnerではNode-native commandからdrive letter、backslash、空白、日本語、CRLF、case-insensitive collision、reserved／invalid path参照、scanner／init preview／identity／安全negativeを直接実行する。symlink／junctionはcapabilityを別々に観測し、実行できたcaseと理由付きSKIP／NOT-RUNを別集計する。Windows風文字列をmacOSで渡すcaseは補助証拠に留める。
- macOS／Linuxでは同じportable suiteと関連Sprint 041、050 Patch 003を実行する。`.github/workflows/windows-recording-regression.yml`の既存`windows-native` jobへ今回suiteを結線し、0.9.2回帰と`timeout-minutes: 10`を維持する。Windows native PASSが得られるまでは`windowsVerified=false`である。
- Windows external live gateは、ユーザー承認済みのexact candidate branch `origin`通常pushと、そのcandidateを対象にした既存PR CI／必要時workflow dispatchだけである。未実行、認証／runner／dispatch不能、timeoutはverification-infra／`external-live-gate-unavailable`としてtruthful NOT-RUN、runner内candidate因果assertion failureはproduct findingとして分離する。どちらもPASSへ数えない。
- command、exit、case ID、OS／Node、fixture kind、lane coverage、before／after tree・Git snapshot、PASS／FAIL／SKIP／NOT-RUN理由、offline network／external operation 0、許可済みpushのcandidate SHA／branch／run IDがあれば十分とする。新しいcollector、実顧客data、実repo apply、external provider、downstream／release／installを追加条件にしない。

## Sprint 050 Patch 005の検証方法（safe harbor）

- SR-001〜010を、current public sourceの実`docs/sprints/state.md`、同じ無害な履歴説明を128 KiB枠の先頭／中間／末尾へ置くYasashii相当fixture、runtime生成したsynthetic Secret negative、巨大state、TBD／missing／invalid／fallback fixtureで実行する。Actual Secret値はtracked fixture、stdout、snapshot、feedbackへ保存しない。
- stateのCurrent ID／status／Next Planned／該当row、4 role、candidate bundle、coverageを比較する。無害caseはinspected構造を維持し、Secret negativeは値・周辺本文・raw-content digest・summary・candidate・Evidenceへの非露出と、構造metadataだけの`redacted`／`partial`理由を確認する。低エントロピー値について出力digestを候補辞書と照合できないこともnegativeで確認する。
- state以外のspec／contract／progress／feedback／guidanceとgeneric sourceへ同じSecret-like inputを置き、既存strict exclusionが維持されることを確認する。exact placeholder文字列だけを許可するpositiveにはせず、複数のfield名、placeholder形式、inline code、code block、過去説明で意味境界を評価する。
- public source、clean checkout、`.git`なしGit-freeでTargetとSprint 041／047／049／050 Patch 003／004、generic scan、4 role意味分離、ancestor alias、preview write 0、Git／network不変を実行する。public common fixed candidateでは`clarity.mjs`、`clarity-core.mjs`、`clarity-harness-scan.mjs`の3 pathとcandidate identityを記録する。
- Windows Server 2025／Node 22の既存`windows-native` jobで同じTargetと0.9.2回帰を実行し、`timeout-minutes: 10`を維持する。外部writeは既存PR #11の同branch通常pushと因果的Windows CIだけに限定し、merge／release／tag／Marketplace／install／cache／downstream／live apply／実Xmindを行わない。
- command、exit、case ID、fixture class、構造fieldの期待／観測、coverage／redaction reason、sanitized digestの一致／非一致、候補bundle、before／after filesystem・Git、offline network／external operation 0、candidate SHA／branch／Windows run IDがあれば十分とする。Secret実値、raw-content digest、新collector、実顧客data、実downstream write、release操作を追加条件にしない。

## Sprint 050 Patch 001の検証方法（safe harbor）

- 隔離fixtureで既存`public-evaluator-pass` ready入力と、新しい`public-user-decision-risk-accepted` ready入力を各1件成功させる。後者はexact product source、元feedback、残余分類、承認記録、Patch Evaluator PASS、下流順序、common／excluded／protected、rollbackを検査する。
- 負fixtureは少なくとも、state文字列だけ、文脈なしの短い了承、source SHA／tree／common digest差替え、feedback digest／Verdict／残余差替え、別candidate承認、撤回／失効、governance commitのacceptedSource誤代入、下流順序変更、common／excluded／protected／rollback変更、Patch feedback非PASSを個別に実行し、全てclosed／非0 exitとなることを確認する。
- exact `5f08d454...` candidateのclean checkoutまたはGit-free archiveからtree／common digestを再計算し、handoff governance candidateとは別identityとして照合する。元feedbackはcanonical pathのbytesとSHA-256で照合し、内容を書き換えない。
- 実行command、exit、fixture名、期待した拒否code、observed publication status、accepted／governance SHA、前後Git／filesystem snapshot、downstream／remote／release／host／Xmind write 0があれば十分とする。実downstream repo、追加collector、統一attestation、実host live、実Xmind MCP、release操作を合格条件にしない。

## Sprint 039の検証方法（safe harbor）

1. 合成HOMEでCodex AGENTS通常／override／両方、Claude CLAUDE、空file、既存内容、既存・重複managed block、利用者編集、permission失敗を操作し、対象選択、前後digest、rollback、再実行差分0件を記録する。
2. 隔離workspaceで新規／既存identity、別repo cwd、workspace移動・欠落・重複、反対edition、symlink／junction、read-onlyを操作し、canonical解決と誤onboarding 0件を確認する。
3. 希望名、おまかせ、取消、不適格名、直接name Skill、現在名呼びかけ、「名前に聞いて」、人間／顧客／author／引用／コード／曖昧文脈をcase IDつきで実行する。
4. renameの4分類、同名、alias衝突、許可／拒否／一部選択、途中失敗、commit失敗、retryを操作し、preview 0変更、履歴不変、alias連続性、所有path限定local checkpoint、push 0件、rollback、冪等性をfile／Git snapshotで確認する。
5. checkoutとGit archive相当の同一candidateでSkill／manifest validator、secret scan、master回帰、配布対象と下流handoff契約を検査する。

実HOME、installed cache、実下流repo、Mac mini、external publish、歴史的live evidenceを必須にしない。command、exit code、fixture root、case ID、前後digest、期待／観測、not-runがあれば十分とし、新しいcollectorや統一attestationを要求しない。

## Sprint 039 Patch 002の検証方法（safe harbor）

1. 現行`0.10.0` pluginを読み込んだがローカルworkspaceはidentity未導入のfixture、現行name Skillで`identity.json`だけ作成済みのfixture、新規導入相当fixture、利用者編集／marker衝突fixtureを隔離workspaceに作る。fixtureの旧状態は配布済みartifactまたは固定した履歴bytesから再現し、現在templateから都合よく作り直さない。
2. 各fixtureで新session相当の入口を実行し、診断とpreviewの前後でworkspace、Git、合成HOMEのdigestが一致すること、plugin更新済み／ローカル未移行／完全適用済みの表示が実状態と一致することを確認する。
3. identity未導入では希望名、おまかせ、取消、不適格名を、identity-onlyでは既存display name／stable ID／AI種別保持を操作する。名前確認後もmigration別確認前はwrite 0件であることを確認する。
4. apply成功ではidentity、AGENTS／CLAUDE製品所有管理節、最小台帳、local checkpointを前後比較する。利用者自由記述、他managed block、記憶、project、chat、Secret、user-scope、registry、開始前stage／unstaged／untrackedがbyteまたはsnapshotで不変で、所有pathだけが1 commitに含まれることを確認する。
5. file write、整合確認、台帳、stage、commit、commit後確認の代表failureを実行し、workspace tree、HEAD、index、working treeが開始前と一致し、部分file／stage／commit／backup／一時fileが0件であることを確認する。失敗後retryは1回で成功し、成功後rerunは0差分・0追加commitとする。
6. marker重複、利用者編集衝突、edition不一致、symlink／junction、read-only、別Git root、target dirty、Git-free target workspaceは副作用0件で停止する。user-scope routingは移行確認では変わらず、別確認の既存回帰を維持する。
7. clean checkoutと同一candidate bytesのGit-free archiveから、隔離Git workspaceをfixtureとして使ってPatch回帰、formal Skill／manifest、report schema、secret scan、release integrity、関連Sprint回帰、archive masterを実行する。Git-free archive自体にrepo履歴を要求せず、製品sourceの`.git`不在と利用者targetのcheckpoint要件を混同しない。
8. fresh独立Evaluatorは固定candidateを実操作し、Agentic完全SHA、共通digest、共通path、下流除外・保護pathを再計算する。実HOME、実利用者workspace、installed cache、実下流repo、Mac mini、remote、release、外部serviceへのwriteは0件とする。

上記のcommand、exit code、fixture root、case ID、対象path一覧、前後digest、Git commit path一覧、期待／観測、not-runを記録すれば十分である。利用者本文・秘書名・stable ID・Secretの証拠への複製、統一attestation、専用collector、実HOME操作、実downstream反映を追加の合否条件にしない。

## スプリント別の重点

| Sprint | 重点 |
|---|---|
| 008 | 改名整合、独立downstream/origin/upstream境界、参照導線、section 12のonline実在検査、全回帰 |
| 009 | journal純追加、シーム副作用、topics/TODO/reindex、固定時刻、記憶保護 |
| 010 | timeline決定性、節目・締め・相談文脈の模擬会話、daily統合 |
| 011 | 先行規約の整合、preferences v2、settings確認、3設定の模擬会話 |
| 012 | journal原本からの週次、索引退避確認、条件付き機能の判断記録 |
| 013 | single private repo初回push、secret案内、room wizard、初回0/100件、基本検索、desktop/mobile screenshot |
| 014 | schedule全選択、同意済み自動push、確認付きmanual sync、wait/pull/retry、専用private test workspaceの実API、設定変更結果の現在値、配布状態、全回帰 |
| 015 | PJ候補検出と確認前副作用0件、一般PJのライト→フル・完了・再開、決定・状態・TODO・成果物の正本境界、別repo開発PJポインタ、build・Chatworkを含む全回帰 |
| 016 | 現行正本・公開面・配布物の旧配布チャネル固有表現0件、一般の非エンジニア向け整合、MIT・単段クレジット・forkedFrom維持、監査記録例外、全回帰 |
| 017 | manifest／CHANGELOG version整合、最小台帳、更新案内、最新版確認不能、診断中の全副作用0件、全回帰 |
| 018 | 説明後の明示確認、pushなし保護commit、customized個別選択、台帳なし0.2.0、冪等migration、検証、rollback、全回帰 |
| 019 | README高度設定、共通wizard、サービス名明示、サービス別CTA色、両サービス3時間推奨、各社所有Internal OAuth、PKCE＋state、初回ローカル取得、`SPACE`限定選択、日付別Markdown、thread／添付メタデータ、基本検索、desktop／mobile、全回帰 |
| 020 | 3時間推奨schedule、取得範囲内の差分統合、同意済みcommit・push、設定変更、確認付き再取得、再認証、Google Chat実API live gate、OAuth revokeを含む後始末、全回帰 |
| 020-patch-001 | Chatwork／Google Chat全画面copy inventory、primary pathの難語除去、自然な「アクセス」表現、1画面1判断、開閉が分かるtechnical detail、Google Chat本人管理者向け画像ガイド、初回取り込み＋自動取得設定の一体型確定、手動のみschedule 0件、部分失敗の正直な結果、0件／失敗／完了copy、desktop／mobile／200%、人間1＋独立画面レビュー2の理解テスト、実ファイル入力の別回帰、安全意味の欠落0件、全回帰 |
| 020-patch-002 | Google Workspace限定、repo名からのProject案、承認付き`gcloud`準備、直接リンクfallback、途中再開、JSON取得後からのwizard、Cloud準備画像撤去、Sprint 019 OAuth安全動作・020／020-patch-001一体型設定・Chatworkの全回帰 |
| 021 | Google Chatのwizard memory→`gh` stdin→Repository Secret、Chatworkの本人によるGitHub Repository Secret画面への直接入力と製品側Token受領0件、両サービスの非露出、製品管理対象／初回publish inventoryの合理的な誤混入拒否、正規参照／通常文書／合理的metadataの誤拒否0件、所有path限定commit、既存stage維持、push前再検査。意図的難読化の完全検出は採点対象外 |
| 022 | Node／shell全書込みのsymlink境界、linkだけの削除、外部CLI／HTTP timeout、部分副作用0件 |
| 023 | loopback Origin／session確認／Content-Type、OAuth callback一度限り、revoke／Secret削除失敗の正直な状態 |
| 024 | Google Chat marker注入耐性、既存履歴保持、Chatwork／Google Chat Actions runのdispatch因果相関 |
| 025 | 0.7.0 version整合、0.6.0 migration、author／forkedFrom validator、workspace＋plugin rollback |
| 026 | master suiteのSprint 015／020-patch-002実行、全accepted回帰、Git archive相当、失敗集約 |
| 027 | 画面遷移focus、44px操作領域、README／onboarding／`.mcp.json`／公開ガイドの現行整合 |
| 028 | 同一0.7.0候補の全自動gate、専用private test workspaceの両チャットlive gate、検索、冪等再実行、全後始末 |
| 029 | 安全・証拠・文体rule分離、edition可変copy集約、wizard copy除外、表示／動作無変更 |
| 030 | edition config、neutral／legacy marker、ledger schema、反対edition／混在／不明の副作用0件停止、既存workspace無回帰 |
| 031 | `plugins/secretary/` path、全回帰／release gate追随、旧CHANGELOG完全互換、validator、archive |
| 032 | 未配布段階の0.8.0 candidate整合、新規導入、portable gate、旧scanner blockerの正直な未解消記録、追加external write 0件 |
| 032-patch-001 | 全会話surface inventory、改行禁止指示0件、Markdown可読性、edition差維持、Chatwork `Name`／`Secret` 具体案内、secret非露出、browser／全回帰 |
| 032-patch-002 | 一般回答の固定3項目非強制、実会話runnerのenv allowlist・合成HOME・plugin read-only・sandbox／path-scoped permission封じ込めとcanary拒否実証・最小ツール・workspace内fixture・cleanup・検査範囲限定表現、live conversation gateの分離とincomplete集計、完了報告の存在順序必須と負ケース、wizard進捗後戻り0、GitHub用語初出説明、serializer正本参照解決、yasashii `ルーム` 表記、host非依存validator／fixture、host・runner記録とunverified別集計、Chatwork／Google Chat無回帰、全回帰 |
| 033 | 指定の別directory／別repo、共通祖先、agentic技術表現、共通本体＋host adapter分離、4環境（Claude Code Desktop App／CLI、Codex App／CLI）個別の導入・skill読込・会話・wizard起動・境界・secret・更新・validator証跡、未検証誤表示の負テスト、wizard／安全parity、candidate／latest `0.8.0` 整合、external gate操作別許可 |
| 034 | fetch専用upstream、狭いyasashii overlay、同期冪等、未分類差分拒否、repo固有docs非同期、`0.8.0` candidate維持、yasashii限定の `key=value` 表現改善とedition分離テスト |
| 035 | 2 editionの `0.8.0` 全回帰、公式validator、parity、衝突停止、新規導入、会話可読性、系譜、クレジット、公開許可と後始末 |
| 035-patch-004 | public upstream 15 Skillsの正式frontmatter、generic quick_validate 15/15と合成downstream 19/19、PyYAML依存不足の明示、formal／generic validator責務分離、private／cache／利用者workspace無変更 |
| 036 | superseded — Generator着手前にaccount-name候補探索方針が変わり、sprint-037へ置換。旧契約は履歴として保持 |
| 037 | Claude Code／Codexの呼び方4選択肢、host-task-context→Git→OS、候補正規化・除外、出典と推奨、候補なし、探索結果非保存、保存前確認、未回答既定、既存設定の現役3正本同期、初回決定ログ不変、個人・環境固有情報scanと正式所有情報allowlist、全回帰 |
| 037-patch-001 | 呼び方変更の3正本同期、journal／commit subjectの設定値非再掲、metacharacter／Unicode fixture、下流common script byte一致 |
| 038 | explicit／inferred／ambiguous／destructive／external、side effect 0／1／partial、response answered／question／saved／error／partial、引用等の誤発火負例、意味tuple・snapshot・negative fixture、現在用件優先、固定3項目・exact copy旧回帰の衝突assertだけを置換、既存AGENTSのtemplate行限定migration、共通／版固有case分離、隔離private candidate、Fable R1〜R9反映、0.9.0一意解決と配布先別publish確認gate |
| 038-patch-001 | public Agentic版の0.9.1 patch release、Agentic Harness 0.5.1／検査済みfull commitへの互換参照整合、build／README／edition metadata／回帰／online検査の一致、Harness本体・custom agent機構の非同梱、private／cache／利用者workspace無変更 |
| 039 | 秘書英語名、stable ID／AI author、初回＋専用name Skill、user-scope managed block、override優先、canonical resolver、同名negative routing、rename 4分類／rollback／冪等性、隔離HOME、下流handoff |
| 039-patch-001 | renameの所有path限定local Git checkpoint、commit failure injection、workspace／user-scope／Git完全rollback、push 0件、formal inventory維持、PASS後だけの固定下流handoff |
| 039-patch-002 | v0.10.0既存workspace fixture、更新後new-session handoff、identity／AGENTS／CLAUDE／台帳の完全移行、自由記述保持、所有checkpoint、全failure rollback、rerun 0、0.10.1固定下流handoff |
| 040 | 明示memory依頼のrun-once、request／content hedge分離、memory scopeの内部分類非確認、pending一件束縛、topic append-only訂正、content dedupe、checkpoint partial／commit-only retry、3版conversation-core inventory、offline-only検証 |
| 041 | 43件。ST／QM／DE: Standalone init、Event／Evidence／State、4象限、generic Decision seam fixtureの確定とpartial retry |
| 042 | 35件。AT 17／IM 8／UX 10: 合成State／EvidenceによるAttention、migration、bounded Japanese UX、core idempotency |
| 043 | primary 26件＋XV 4件。MM 10／XM 15／IM 1／XV 4: deterministic Markdown／Mermaid、MCP-first resolver、承認付きlocal fallback、fixed visual、map retry |
| 044 | 40件。HC 17／HX 14／HP 7／AT 1／IM 1: 共通Clarity Hook、bounded SessionStart、trust doctor、host parity |
| 045 | 35件。SL 12／PF 11／RG 12: generic Secretary-local、Decision seam再評価、daily／weekly／Portfolio、既存Skill正本回帰 |
| 046 | 34件。LK 16／SY 13／IM 4／PF 1: reciprocal link、pull sync、authority、retry／doctor／stale Portfolio、AT-008／009再評価 |
| 047 | 25件。DR 10／GS 15: Drift Detection、AT-003／004再評価、Git／filesystem／Secret／concurrency hardening |
| 048 | 12件。PK: public packaging、manifest／inventory、clean／archive、host status、固定handoff準備 |
| 049 | CLX追加case: 全関連Skill／router／template／rule／inventoryのClarity-aware協働と責務分離 |
| 050 | primary 250、CLX 20、XV 4、E2E-001〜004、既存master回帰、public fixed handoffの最終判定 |
| 050-patch-004 | HS 16件。Harness authoritative reserved lane、Current正本意味分類、coverage／partial、generic無回帰、Windows native scanner／init／path安全、041／050-patch-003回帰 |
| 050-patch-005 | SR 10件。state構造抽出とSecret本文分離、無害placeholder／履歴説明、raw digest非露出、state外strict exclusion、3 common path固定、portable／Windows／既存Clarity回帰 |

## 差し戻し分類

- `implementation-issue`: 実装が仕様を満たさない。Generatorへ戻す。
- `spec-issue`: 契約・仕様が矛盾または不足。Plannerへ戻す。
- rubric変更はEvaluatorが提案できるが、適用はPlannerだけが行う。

## 更新履歴

- 2026-08-31: Sprint 050 Patch 005としてF81／C26を補強し、SR-001〜010を追加。Harness stateのCurrent／status／Next Planned／table row等の構造化execution truthと非構造本文を分け、無害なcredential field名・placeholder・過去説明でCurrent bundleを失わず、実値らしいSecretは本文・値・raw digest・summary・candidate・Evidenceへ露出しないゼロ許容境界を固定した。state以外のstrict exclusion、bounded read、public common 3 path、Windows Server 2025／Node 22、既存PR #11だけのexternal live gateを維持する。

- 2026-08-31: Sprint 050 Patch 004としてF81、C26、検証方法48、HS-001〜016を追加。包括性を無制限scanでなくHarness正本のreserved laneと定義し、state／contract／progress／feedbackの意味分離、partial coverage、非Harness無回帰を固定した。Windowsはnative runnerのdrive／Unicode／空白／CRLF／case collision、symlink／junction別capability、承認済みcandidate branch pushに束縛したexternal live gateを必須にし、別OS文字列模擬からのverified昇格を禁止した。

- 2026-08-28: Project ClarityのC19〜C24、primary 250 case単一割当、CLX 20、最終E2E／全回帰safe harborを追加。その後の最新user decisionとしてXV 4をprimaryと分けて追加し、Xmind MCP-first、自動local fallback禁止、external／localのpreview／confirm、4象限のfixed visualをC23／Sprint 043／050に反映した。Clarity専用command-only Hook、projects lifecycleとの責務分離、public-first固定handoffは維持する。

- 2026-08-25: Sprint 040としてC18と検証方法46を追加。明示低リスクmemory依頼をuser-visible scope `memory`だけで一度実行し、request hedgeとcontent hedge、pending一件束縛、append-only訂正、内容冪等性、checkpoint partial、3版の実内容inventoryをゼロ許容で評価する。source／offline regressionとrelease／cache／新session確認は別phaseとする。
- 2026-08-14: Sprint 039 Patch 002としてC17とsafe harborを追加。公開済み0.10.0のplugin更新だけでは既存workspaceが新規導入相当にならない欠陥を、read-only診断、preview、別確認、製品所有identity面のatomic migration、所有path限定local checkpoint、workspace／Git rollback、rerun 0で評価する。0.10.1はAgentic→Yasashii／private固定handoff→3版PASS→release／Mac mini同期の順とする。
- 2026-08-03: Sprint 038 Patch 001のHarness互換参照更新に合わせ、公開済み0.9.0を履歴保護しながら0.9.1を現在patch candidateとする。edition metadataを正本にbuild・README・回帰・online検査のHarness情報を照合し、Harness本体・custom agent機構の非同梱と対象外系統の無変更を評価対象にした。
- 2026-07-31: Fable敵対的レビューR1〜R9を反映。内容依存応答、0.7.0／0.8.0履歴と0.9.0 current gateの分離、既存AGENTSのtemplate行限定migration、引用等の誤発火負例、隔離private candidate、共通／版固有parity分離、destructive／大量定義、case必須要素・意味tuple・snapshot・negative fixture、旧回帰の衝突assertだけを置換する証拠を追加した。
- 2026-07-31: Sprint 038の承認済み提案に基づきC15を追加。明示低リスク依頼は発話自体をauthorizationとし、自発提案・曖昧さ・高リスク操作は必要な確認を維持する。固定3項目、原文byte一致、質問禁止を会話合格条件から外し、`intent × side effect × response state`、意味保存、現在用件優先、3配布系統parity、my-vault限定5点を評価対象にした。

- 2026-07-21: ユーザーレビューによるSprint 032 Patch 002の差し戻し（P1: cwd／TMPDIR誘導は封じ込めではない、P2: 実会話出力が回帰に未組み込み）を受け、検証方法42を改訂。封じ込めは合成HOME・plugin read-only・OS sandboxまたはpath-scoped permission・canary拒否の実証まで要求し、canary未実証時のWrite/Edit scenario自動実行禁止と、外部変更主張の検査対象列挙つき範囲限定表現を追加。実会話出力の回帰をlive conversation gateとしてoffline回帰・master gateから分離し、未実行を「未完了（incomplete）」として集計し、実行していない検証を完了済み・回帰保証として数えないことを評価対象にした（constraints §16.7改訂・§16.11新設と対応）。
- 2026-07-20: Sprint 032 Patch 002の契約化に合わせ、検証方法42（実会話回帰の安全性とホスト集計）を追加。実会話runnerのenv allowlist・最小ツール許可・workspace内fixture・cleanup・サニタイズ証跡、完了報告の固定3項目存在順序必須、host・runner・実行面の記録、対応対象と検証済みの別集計、1ホストPASS非昇格を評価対象にした。検証方法41へ「一般回答を固定3項目へ押し込まない」を明記し、Sprint 033を4環境対応、Sprint 034へkey=value表現改善を反映した。
- 2026-07-20: Sprint 032の追加spec-issueとユーザー回答を受け、未配布段階では旧0.7.0利用者向けexternal recovery／bootstrapを作らず、最初の明示配布候補を0.8.0へ直接揃える方針へ改訂。旧blockerを偽PASSにせず、新規導入、portable gate、equal／downgrade停止をC12／C13へ反映した。Repo分割前のSprint 032 Patch 001で全会話のMarkdown可読性とChatwork Secret入力案内をC14として追加した。
- 2026-07-19: Sprint 021の不合格が、通常利用で合理性のない意図的な難読化・computed／escaped key・偽placeholderの完全検出まで要求する仕様不足に起因したため、保証境界を改訂。Google Chatのwizard memory→`gh` stdin→Repository Secretと、Chatworkの本人によるGitHub Repository Secret画面への直接入力という既存の2導線、および製品管理対象／初回publish inventoryの合理的な誤混入は引き続き0許容。Chatwork wizardへToken取得・登録機能を新設せず、任意コードの意図的回避は非ゴールとし、正規参照・通常文書・合理的metadataの誤拒否を評価対象に追加した。
