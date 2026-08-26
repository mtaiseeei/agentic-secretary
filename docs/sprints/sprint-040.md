# Sprint 040 — 明示memory authorizationと3版の内容冪等性

- Type: main
- Risk: high（3版の会話契約、memory／journal／local checkpointの書込み境界、旧確認契約の横断撤去を扱う）
- 依存: `sprint-039-patch-002` done
- 含む機能: F54, F55, F56, F57, F63
- 主眼: 明示された低リスクmemory依頼を一度で完了し、内容の不確実性、訂正、retry、checkpoint失敗でも意味と副作用件数を正しく保つ。

## 承認済み前提

ユーザーは方針検討とFableの敵対的レビューを完了し、Agentic、Yasashii、private my-vaultの3版への反映を明示承認している。
追加質問は行わず、次をSprint前提とする。

1. 「覚えて」はuser-visible scope `memory`への保存依頼として十分であり、decision／topic等の内部分類は製品が決める。
2. sourceとoffline regressionを3版で完成させる。source treeへのローカル反映は承認範囲だが、各repo固有docs／Harness state／private固有値は保護する。
3. push、tag、GitHub Release、marketplace、installed cache、利用者workspace、Mac mini、release後の新session確認は別phaseである。
4. UI変更はない。Evaluatorの合格根拠は実file fixture、会話core、保存シーム、Git failure injection、3版source inventoryのoffline実行とする。

## 外から見える成果

- 「これ覚えて」「Rokunabeだと思う。覚えて」は、memory種別や要約案を聞き返さず同じturnで1回保存される。
- 「覚えといたほうがいいかも」は保存前に確認されるが、「Xだと思う。覚えて」は推量を残して保存される。
- 保存提案への「はい、ただしX」はXへ直した内容をそのturnで保存し、もう一度確認しない。別話題後の「はい」で古い候補は保存されない。
- topicの訂正は旧内容を残した追記になり、同じ内容を何度retryしてもtopic／decision／journal／commitが増えない。
- 保存とjournalの後にlocal commitだけ失敗した場合は部分成功が分かり、retryはcommitだけを完了する。
- 3版の会話surfaceで新契約が有効になり、旧「topicは保存前に一律確認」「exact copy」「明示依頼も別turn確認」が再流入しない。

## Scope

### A. memory authorizationのrun-once

- 低リスクの明示memory依頼は、現在発話をauthorizationとして同じassistant turnに正規シームを1回だけ実行する。
- `memory`は利用者に見える十分なscopeである。decision／topic等の内部分類、保存先file、要約案は内部routeとし、利用者に選ばせない。
- authorizationはrouter、`secretary`、`memory-care`、保存シーム、journal、checkpointへ一方向に引き継ぎ、内部routeで`proposed`へ戻さない。
- Secret、記憶削除、destructive、external、10件以上または件数不明の一括操作、memory外へのscope変更は既存の強い安全分類を優先する。

### B. request hedgeとcontent hedge

- 保存操作自体をぼかすrequest hedgeは`proposed`として、内容とscopeを示す質問前の副作用0件を守る。
- 伝聞、推量、留保、否定、条件、訂正等のcontent hedgeは、現在利用者が保存を明示していればauthorizationを取り消さない。
- 保存要点は情報源・確実性・訂正関係を保持し、確定事実への反転、入力にない因果・担当・期限の追加をしない。
- 会話全文、依頼語、完全verbatim copyは保存しない。要約は意味tupleを保てばよい。
- 依頼語の引用、現在依頼ではない仮定、依頼の取消、過去依頼の照会は従来どおりwrite 0件とする。

### C. pending confirmation

- pendingは同時に1件だけとし、保存予定content、user-visible scope、会話anchorを固定する。
- 同じ話題での単純な了承は固定済み候補へのauthorizationになる。
- 別話題が介在したpendingは失効し、後の短い了承を古い候補へ適用しない。
- 「はい、ただしX」はcontentをXで修正した明示依頼として同じturnで実行し、修正版を再確認しない。

### D. append-only訂正とcontent-based idempotency

- topic訂正は旧内容を編集・削除せず、`訂正: 旧→新（理由）`と同等の意味を持つ新eventとして追記する。
- dedupeはoperation idだけでなく、canonical memory root、memory種別、正規化した意味tuple、訂正関係で判定する。
- 同じ内容は、自然文の表記揺れ、別turn、別operation id、再起動後のretryでもtopic／decision／journal／checkpointを追加しない。
- 否定、条件、情報源、確実性、訂正関係が異なる内容を誤って同一扱いしない。
- 完了済み内容への再依頼は、副作用0件で既保存を利用者へ伝える。

### E. checkpoint partial

- memory本体と必須journalが成功し、local checkpoint commitだけ失敗した状態を`partial`として区別する。
- partialでは保存済みcontentとjournalを保持し、全失敗または全成功と表示しない。
- retryは現在の実fileを確認し、未完了commitだけを行う。memory、journal、索引を再実行しない。
- commit成功後の再retryはfile差分、journal追加、追加commitが0件となる。

### F. conversation-core inventoryと旧契約の負検査

- trackedで機械可読なinventoryを正本化し、surface ID、edition、実path、役割、content digest、現行契約marker、禁止旧markerを持たせる。
- 最低対象はrules／copy、`memory-care`、`secretary`、`settings`、`daily`、`projects`、AGENTS／CLAUDE templates、runtime classifier、memory保存シーム、golden fixture、Sprint 010を含む現役回帰である。
- 実内容から次の現行markerを検査する。
  - `explicit-memory-request=run-once`
  - `content-uncertainty=preserve`
  - `retry-after-checkpoint-failure=commit-only`
- 実内容から次の禁止旧契約を負検査する。単語の完全一致だけでなく、同じ意味の言い換えも対象にする。
  - `topic-save=confirm-first`
  - `save-copy=exact-copy`
  - `explicit-memory-request=next-turn-confirmation`
- file存在やfilenameだけでmarkerを満たしたことにしない。inventoryのdigest不一致、対象漏れ、禁止marker残存をFAILにする。

### G. 3版sourceとoffline regression

- `agentic-secretary` は共通会話coreと保存シームの正本として実装する。
- `yasashii-secretary` は固有文体、overlay、identity、README、repo-owned docsを保ったまま共通契約を反映する。
- `agentic-secretary-my-vault` はprivate固有のNotion／vault routing、root AGENTS、private値、repo-owned docsを保ったまま共通契約を反映する。
- 3版はそれぞれの実source内容、専用fixture、master相当offline回帰を別々に実行する。1版のPASSを他版へ昇格しない。
- source root、base／candidate SHAまたは同等の固定識別、共通対象path、保護path、開始前後digestを記録する。

## Safety boundaries

- 空上書き拒否、記憶削除2段階、path guard、Secret非表示・非保存、所有path限定commit、既存stage保持、push禁止を維持する。
- authorizationの一方向維持は、低リスクmemory保存の内部routeに限る。削除、公開、外部送信、認証、権限、課金、他者通知、一括操作の確認を省略しない。
- topicのappend-only訂正を、過去decision／journalの書換え許可へ広げない。
- private my-vaultのNotion TaskDB正本、property、relation、write前計画、connector write後再読確認を変更しない。
- 3版の同期でrepo-owned docs、Harness正本、edition固有copy、private値を上書き・逆流させない。

## Non-scope

- push、tag、GitHub Release、marketplace更新、version公開、remote変更。
- installed plugin／cacheの更新、利用者workspace migration、Mac mini同期、release後の新session／loaded version確認。
- 会話全文の逐語保存、汎用embedding／semantic search、memory schema全体の再設計。
- TODO／Notion TaskDB／projectへの新しい自動routing、Notion property／relationの変更。
- 記憶削除、archive、外部送信、一括操作、Secret保存の確認境界緩和。
- UI、wizard、Chatwork／Google ChatのOAuth・同期・履歴仕様変更。
- 新しい統一attestation、collector、live cache検査基盤の開発。

## Acceptance Criteria

1. 「これ覚えて」をdecision相当／topic相当の一意な低リスク内容で実行し、内部分類、file、要約案の質問0件、同じassistant turnの保存各1件となる。
2. 「覚えといたほうがいいかも」は質問前write 0件、「Rokunabeだと思う。覚えて」と伝聞内容の明示保存は同じturnのwrite各1件となる。
3. content hedgeの情報源・確実性・否定・条件・訂正関係に欠落・反転・入力にない追加が0件で、会話全文・依頼語・完全verbatim保存が0件である。
4. 依頼語の引用、現在依頼ではない仮定、取消、過去照会はwrite 0件で、保存済み取消は削除2段階を維持する。
5. pendingは同時に1件だけで、同じ話題の了承は1件保存、別話題後の了承は旧候補0件、「はい、ただしX」は修正版1件を同じturnで保存し再確認0件となる。
6. topic訂正は旧内容byte不変、新しい訂正event 1件となり、訂正前後と理由または不確実性を追跡できる。
7. 同じ意味内容を表記違い、別turn、別operation id、再起動後にretryしてもtopic／decision／journal／commitが0件追加である。
8. 否定、条件、情報源、確実性、訂正関係が異なる内容は誤dedupeされず、別の意味として扱われる。
9. memory／journal成功後のcheckpoint failureは`partial`、memoryとjournal各1件、commit 0件となる。retryはcommitだけ1件、再retryは全副作用0件となる。
10. Secret、削除、destructive、external、一括、scope変更の各caseは、必要な停止・確認前の副作用0件である。
11. tracked inventoryがScope Fの全surfaceを列挙し、各entryの実path、役割、edition、digest、markerが実内容と一致する。対象漏れとstale digestが0件である。
12. Agentic、Yasashii、private my-vaultの各sourceで現行marker 3種が存在し、禁止旧marker 3種が実内容上0件である。
13. `memory-care`／`secretary`だけでなく、`settings`／`daily`／`projects`／templates／runtime classifier／保存シーム／golden fixture／Sprint 010回帰がinventoryと負検査に含まれる。
14. 既存のSprint 038 golden setへrequest hedge、content hedge、pending、topic訂正、content retry、checkpoint partialの正負fixtureが加わり、旧「伝聞・訂正は一律write 0」の期待が現在のrequest/content分離へ更新される。
15. Agentic、Yasashii、private my-vaultの専用offline回帰、共通安全回帰、Git checkout／Git-free archive相当gateが各版0 FAILである。1版の結果を他版へ流用しない。
16. 3版の共通対象は同じauthorization、意味保存、idempotencyを持ち、Yasashii固有surfaceとprivate Notion／vault／root AGENTS／repo-owned docsの開始前後digestは不変である。
17. push、tag、GitHub Release、marketplace、cache、利用者workspace、Mac mini、external serviceへの変更が0件である。
18. 結果報告はsource／offline PASS、release未実行、cache未反映、新session未確認を分け、offline PASSをlive反映済みと表示しない。
19. 独立Evaluatorが同じcandidate群を実行し、C2・C5・C6・C13・C14・C15・C18の対象閾値と本ACを満たす。

## Verification scope（着手時に固定）

- 対象環境: Agentic、Yasashii、private my-vaultのローカルsource treeまたは同一bytesの隔離candidate。外部serviceとinstalled cacheは使わない。
- 必須シナリオ: AC1〜19、rubricの必須模擬会話42〜46、既存のSecret／削除／external／一括負例。
- 対象surface: Scope Fのinventory対象と、各版の実memory／journal／checkpointシーム。
- UI: 対象なし。browser操作・screenshotを合格条件にしない。
- 外部操作: remote fetch／push、tag、Release、marketplace、install／update、workspace migration、Mac mini同期は0件。

### Evidence safe harbor

- 各版のsource root、base／candidate識別、変更path、保護path、開始前後digest、`git status --short`。
- 実行command、exit code、PASS／FAIL／NOT-RUN件数、失敗内容。
- case ID、入力、期待／観測authorization、meaning tuple、response state、memory／decision／topic／journal／commitの前後件数とdigest。
- pendingのcontent／scope／anchor／失効、topic訂正の旧内容不変と新event、content keyの同一／差異判定。
- checkpoint failure injection前後、partial応答、retry／再retryのfile／journal／Git snapshot。
- inventory entry、実内容digest、現行marker、禁止旧marker、対象surface総数、漏れ／stale／旧marker件数。
- 3版それぞれのoffline suite集計と、repo-owned／private surfaceの不変digest。
- remote、release、cache、利用者workspace、external serviceを変更していない対象限定snapshot。

上記で十分とし、自然文byte一致、完全verbatim保存、live cache、新session、実利用者workspace、外部service、
新しいcollector／統一attestationを追加の合格条件にしない。

## 完了条件

Generatorは本Sprintだけを実装し、各版のsource候補とoffline回帰を固定して `docs/progress/sprint-040.md` に引き渡す。
Evaluatorは別作業単位で同じcandidate群を実行評価し、`docs/feedback/sprint-040.md` に証拠、各findingの
`product / verification-infra`分類、C18を含む採点、合否を書く。Evaluator PASSとOrchestratorの`state.md`更新前に
Sprint完了扱いにしない。release、cache更新、利用者workspace反映、新session確認は別phaseとして残す。
