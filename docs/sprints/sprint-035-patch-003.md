# Sprint 035 Patch 003 — wizard起動時のGitHub Actions全SPACE発見

- Type: regular patch
- Risk: high（既存Repository Secretを使うGitHub Actions、複数ページAPI取得、run相関、設定保持、Google Chatの認証境界を横断する）
- 主眼: Google Chat設定wizardを開いた時点で、保存済み設定だけを最新候補のように表示せず、既存Repository Secretを使う相関済みGitHub Actionsで参加中の通常スペースを全ページ確認してから、安全な候補一覧を示す。
- 依存: `sprint-035-patch-001` と `sprint-035-patch-002` の合格済みcandidate。両editionで共通wizard、安全境界、IME検索、Git取得契約を維持する。

## 背景と承認済み方針

現在のGoogle Chat設定wizardは、設定済みで開くと保存済みconfigのスペースだけを先に表示し、最新候補を確認するにはGoogleへ接続し直す必要がある。このため、参加後に増えた通常スペースが初期一覧へ現れず、保存済み一覧を現在の全参加スペースと誤解しやすい。

ユーザーは、Agentic、Yasashii、private my-vault editionの全てで次を採用すると決定済みである。

- wizard起動時に保存済み一覧だけを最新一覧として確定表示しない。
- 現在のprivate workspaceに登録済みのGoogle Chat用Repository Secretを使い、GitHub Actionsから最新候補を取得する。
- `spaces.list` は全ページを最後までたどり、`spaceType=SPACE` だけを候補にする。
- 新規候補は未選択、既存選択と保存済み履歴は保持する。
- 完全成功、部分成功、失敗を区別し、どの結果でも既知設定を削除しない。
- 候補更新のためのOAuth再認可を必須にしない。

## 外から見える成果

利用者がGoogle Chat設定wizardを開くと、画面は保存済みスペースだけを「最新一覧」として見せず、既存接続を使って最新の通常スペースを確認する。確認が終わると、以前から選択しているスペースは選択済みのまま、新しく見つかったスペースは未選択で追加される。途中ページや取得全体が失敗しても、既存設定と履歴は失われず、「今回どこまで確認できたか」が分かる。

## Scope

### A. wizard起動時の自動discovery

- 設定済みGoogle Chat wizardのentryを、`既知configの読込 → 今回のGitHub Actions discovery開始 → 今回runの完了待ち → 結果merge → 候補表示` の一続きの体験にする。
- discoveryのterminal結果が出る前に、保存済みconfigだけを最新の選択候補一覧として確定表示しない。待機中は、既存選択を失わないことと最新一覧を確認中であることを示す。
- 既存Repository Secretの存在metadataを確認し、値はローカル、DOM、command引数、環境dump、ログ、fixture、証跡へ出さない。
- 必要なSecretが不足している場合はOAuth再認可へ自動遷移せず、既知設定を保持したまま不足を示して安全に停止する。

### B. 相関済みGitHub Actions discovery

- wizard entryごとに一意なcorrelationを持たせ、dispatch後に開始した対象workflowの今回runだけを採用する。過去run、別branch／別workflow、同時実行、古い成功結果、曖昧なrunを今回結果へ流用しない。
- runのqueue、開始、成功、失敗、cancel、timeoutを区別し、timeout時は待機processを残さない。
- Actions側は既存Repository Secretを使ってGoogle Chat APIをread-onlyで呼び出す。Secret値、OAuth token、認可code、メッセージ本文を結果、artifact、summary、logへ含めない。
- 最新候補を表示するため、SPACEの名前とIDは、今回runに結び付いたprivate Actionsの短期result、wizardのlocal memory、利用者本人へ候補を示すDOMで処理してよい。これは候補表示に必要なspace metadataであり、資格情報やメッセージ本文として扱わない。
- Actionsは `google-chat/spaces-discovery.json` または同等の専用短期resultへ、correlation、結果状態、生成時刻、SPACEの名前／ID／typeだけを出力できる。通常の選択config、同期状態、メッセージ履歴とはpathと用途を分離し、古いresultを今回結果へ流用しない。
- discoveryは専用候補result以外の設定、選択、schedule、履歴、保存済みメッセージを変更しない。候補確定後の既存保存フローだけが、利用者の明示操作により選択設定を変更できる。

### C. 全ページ・SPACE限定

- `spaces.list` の最初のページから始め、`nextPageToken` がなくなるまで全ページを取得する。1ページ目だけ、固定件数、任意のページ上限で成功扱いにしない。
- 各ページのresourceを安定したspace IDで正規化し、`spaceType=SPACE` だけを候補へ入れる。`DIRECT_MESSAGE`、`GROUP_CHAT`、type不明、欠損IDは候補へ入れない。
- page tokenの循環、重複ID、不正応答、途中のAPI失敗を検出し、無限loopや重複候補を作らない。
- 実表示名が取得できないSPACEは、安定したIDを失わず既存の代替表示規則で扱う。追加scopeを要求しない。

### D. complete／partial／failed結果と非破壊merge

- `complete`: 全ページを取得し終えた。全SPACE結果を既知configへID単位でmergeする。
- `partial`: 1ページ以上の有効な今回結果を得たが、後続ページ、応答検証、run結果の一部が完了しなかった。有効と確認できた新規SPACEは候補に加えてよいが、全件確認済みとは表示しない。
- `failed`: 今回runから信頼できるSPACE結果を得られない、またはrun相関が成立しない。既知configだけを保持し、「最新一覧の確認に失敗」と示す。保存済み一覧を全参加一覧とは表示しない。
- 3状態の全てで既知entry、既存選択、順序に関する既存契約、無関係field、schedule、同期状態、履歴を削除・初期化しない。
- 完全結果に現れない既知entryも自動削除・選択解除しない。必要なら「保存済み／今回未確認」と区別し、利用者の明示判断に委ねる。
- 今回初めて見つかったSPACEは全て未選択にする。discoveryだけで同期対象、初回取得対象、schedule対象へ追加しない。
- 同じ結果を再適用しても重複、選択変化、追加差分が出ない冪等性、つまり繰り返しても結果が変わらない性質を持たせる。
- private Actionsの短期resultをprivate workspace内で生成・取得することは許可するが、通常configや履歴へ昇格させない。resultのcorrelationが今回entryと一致しない場合は、内容が新しく見えても採用しない。

### E. wizard UIと既存導線

- complete／partial／failed、既知件数、新規候補件数、今回未確認の有無を、1画面1判断の既存文章設計で示す。
- partial／failedでも検索、既存選択の確認、再試行、戻る／終了を安全に行える。再試行は新しいcorrelationを使う。
- 最新候補確認のための「Googleへ接続し直す」を必須stepにしない。利用者が明示的に再認証を選ぶ既存の回復導線は残すが、通常entryでOAuth画面を開かない。
- 共通wizardのIME composition、focus、caret、checkbox選択保持、desktop／mobile／200%、SPACE／DM表示境界、Google Chatの色・copy・accessibilityを回帰させない。

### F. 3 editionの伝播

- Agenticを共有実装の正本とし、Yasashiiは固定candidateを既存の狭い同期規律で取り込む。wizardのDOM、copy、discovery状態、安全挙動を両editionで一致させる。
- private my-vault editionは別契約 `sprint-040-patch-003` で、my-vault固有Secret名、config schema、workflow、同期挙動を保ったadapterとして同じ結果契約を採用する。

## Non-scope

- 新しいOAuth scope、write／admin scope、サービスアカウント、Domain-Wide Delegation、共通External OAuth app。
- wizard起動時のOAuth再認可、OAuth client再作成、Repository Secret値のローカル読取・再登録・表示。
- SPACEの自動選択、既存選択解除、既知entry削除、同期履歴削除、保存schema／履歴形式／scheduleの再設計。
- Chatwork wizard、Chatwork Token、Chatwork discoveryの挙動変更。
- 実Google Chat API、実OAuth、実Repository Secret更新、実GitHub Actions dispatch、remote push、PR、release。
- Secret値、OAuth token、認可code、Google Chatメッセージ本文を短期result、local memory、DOM、会話、log、screenshot、評価証跡へ出すこと。
- 実環境のspace名／IDをAI会話、通常log、screenshot、評価証跡へ露出すること。最新候補表示に必要なprivate Actions短期result、wizard local memory、利用者本人のDOM内での処理はNon-scopeではない。
- 新しい統一collector、attestation、approval manifest、外部署名、証拠schemaの作成。

## Acceptance Criteria

1. 設定済みwizard entryで、保存済みconfigだけを最新候補として確定表示せず、今回の相関済みActions discoveryがterminal状態になるまで「最新一覧を確認中」と分かる実DOMを示す。OAuth画面とSecret入力を要求しない。
2. dispatch後のworkflow／branch／event／開始時点／correlationが一致する今回runだけを採用する。過去成功run、同時run、別branch、相関不明runを拒否する負fixtureが全て通る。
3. 1、2、3ページ以上のsynthetic API fixtureで全`nextPageToken`をたどり、最終ページまでのSPACEが候補になる。固定page上限、1ページ目だけの成功、token循環、重複IDは成功へ読み替えない。
4. 全ページにSPACE、DIRECT_MESSAGE、GROUP_CHAT、type不明、欠損IDを混在させても、候補はSPACEだけ、ID重複0件、DM／グループDM 0件である。
5. completeでは全ページ結果、partialでは有効な今回pageと未完了表示、failedでは既知設定と失敗表示になる。partial／failedをcompleteまたは全参加一覧と表示しない。
6. complete／partial／failedの全てで既知entry、既存選択、無関係field、schedule、同期状態、保存済み履歴の前後snapshotが一致する。completeに現れない既知entryも削除・解除しない。
7. 新規SPACEは全て未選択であり、discoveryによるwriteは `google-chat/spaces-discovery.json` または同等の専用短期resultに限定される。選択config確定、初回取得、schedule追加、同期状態変更、履歴writeは0件であり、同じ結果の2回適用で追加差分0件である。
8. Secret値、OAuth token、認可code、client JSON全文、メッセージ本文がlocal process引数、DOM、log、fixture出力、Actions相当result、screenshot、証跡へ0件である。SPACEの名前／IDは今回のprivate Actions短期result、wizard local memory、候補表示DOMで処理できるが、実値を会話、通常log、screenshot、評価証跡へ出さない。
9. Actions runのfailed／cancel／timeout、API認証失敗、rate limit、network失敗、途中page失敗で、既存状態を保って再試行できる。timeout後の子process、poll、server残留0件である。
10. 実ブラウザのGoogle Chat wizardをdesktop、390px相当mobile、200%表示で操作し、entry待機、complete、partial、failed、再試行、検索、checkbox、戻る／終了に横overflow、focus消失、未処理例外、console errorが0件である。
11. Sprint 035 Patch 001のIME／選択保持、Patch 002のfast-forward取得、Google Chat OAuth／SPACE／Secret／run相関、Chatwork無回帰、両edition parityの回帰が0 FAILである。
12. 実OAuth、実Google Chat API、実Repository Secret、実Actions、remote writeを行っていない場合は全て `not-run` と別集計し、synthetic／offline成功をlive接続成功へ読み替えない。

## 評価シナリオ

1. 既知の選択済みSPACE、既知の未選択SPACE、新規SPACE、既知だが今回結果にないSPACEを含むcomplete fixtureでentryから候補表示まで操作する。
2. 3ページfixtureの2ページ完了後にAPI失敗を起こし、partial表示、有効結果の追加、既知設定・選択・履歴保持を確認する。
3. dispatch失敗、相関不明、最初のpage失敗、cancel、timeoutをそれぞれ起こし、failed表示と安全な再試行を確認する。
4. DM／グループDM、重複ID、token循環、古いrun、同時runを混ぜ、候補混入・誤相関・無限待機がないことを確認する。
5. desktop、mobile、200%で待機中から結果表示、IME検索、既存／新規checkbox、再試行、終了を操作し、DOM状態とconsoleを記録する。

## Evidence safe harbor

- candidate commit、変更path inventory、実行command、exit、assert数。
- synthetic GitHub Actions/API fixtureのdispatch correlation、採用／拒否run、page番号、`nextPageToken`有無、resource type、専用短期result、complete／partial／failed結果。space名／IDを含む値は全て非機密の合成値にする。
- config、選択、schedule、同期状態、履歴の前後snapshotと、2回適用時の追加差分。
- desktop／mobile／200%の実URL、DOM操作、結果状態、表示候補ID、選択ID、focus、console error、横overflow、screenshots。評価用DOMと画像は合成space名／IDだけを使い、実space metadataを証跡化しない。
- Secret非露出検査、既存回帰、Agentic／Yasashii parityのcommand、exit、assert数。
- 実OAuth／API／Secret／Actions／remote writeの `not-run` 集計。
- 上記を満たせば、実OAuth、実GitHub Actions、実API、外部署名、新しいcollector／統一証跡schemaを追加の合格条件にしない。

## External live gate

本Patchのoffline評価は、synthetic GitHub Actions／Google Chat API fixtureと実DOMのlocal browser操作で完結できる。実Repository Secretの値を読み、実Actionsをdispatchし、実Google Chat APIを呼び、remoteへcommit／pushする必要はない。

live確認が必要になった場合は、対象private test workspace、使用するSecret名、dispatchするworkflow、read-only API範囲、生成物、停止方法、cleanupを示し、操作ごとの明示確認を得る。synthetic成功はlive成功として報告しない。
