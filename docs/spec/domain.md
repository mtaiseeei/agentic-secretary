# Domain

本製品のドメインはDBではなく、1つのGitHub repoにある秘書・一般プロジェクト・Chatwork・Google Chatと、別repo開発プロジェクトの関係、
`secretary/` の記憶の意味、外部データを記録へ移す規則である。

## 主要概念

| 概念 | 意味 | 正本／置き場 |
|---|---|---|
| 秘書 | 記憶・整理・下調べ・成果物・開発導線を担うAI役割 | `yasashii-secretary` skills |
| public配布repo | plugin配布ソースと公開ドキュメントの正本。利用者データやChatwork live環境は置かない | `yasashii-secretary` |
| ユーザーワークスペース | 秘書・一般プロジェクト・Chatwork・Google Chatをまとめるprivate GitHub repo | repo root |
| private test workspace | 実利用と同じsingle-repo構成で実APIを評価する専用private GitHub repo | 評価用repo root |
| 秘書ディレクトリ | オンボーディングで生成しgit管理する作業領域 | `secretary/` |
| 一般プロジェクト | 営業・マーケティング・新規事業等、workspace内を正本にして継続管理する仕事 | `secretary/projects/<project>/` |
| 別repo開発プロジェクト | 実装・仕様・判断・進行の正本を独立repoに置く開発仕事 | 外部repo＋workspace内の参照ポインタ |
| 決定 | ユーザーが確定し、確認を経て残す事柄 | 一般事項は `memory/decisions/`、PJ固有事項は当該PJの正本 |
| 活動 | 定義済みシームを通って実際に起きた事実 | `memory/journal/` |
| 相談の文脈 | 結論前の背景・経緯・固有名詞を要点化した案件メモ | `memory/topics/` |
| 中断点 | 今の作業を再開するための一時的な文脈 | `memory/_resume.md` |
| 翌日への申し送り | 次に行う事実として日付に残す項目 | journal の `next` |
| 個人設定 | 役割、言葉遣い、報告、確認方法の明示設定 | `memory/preferences.md` |
| 成果物 | 企画書・調査まとめ等の正本 | 単発は `docs/YYYY/MM/`、一般PJは当該PJ内 |
| 外部データ | SaaSに置いたまま参照するメール・予定等 | 公式コネクタ |
| Chatwork接続 | GitHub上の安全な保管場所（Repository Secret）にあるTokenを使う読取専用接続 | GitHub Actions |
| ルーム選択 | ユーザーが保存対象として明示したルームID集合 | 同じrepoのChatwork設定 |
| Chatwork履歴 | 選択ルームから取得済みのメッセージ | 同じrepoのChatwork履歴領域 |
| 同期状態 | 最終成功、ルームごとの取得位置、失敗理由 | 同じrepoの状態記録 |
| Google Cloud準備 | skill会話が、現在のGit repoに対応する組織所有Cloud project、必要API、`Internal`、Desktop app、接続用JSON取得までを支援する | Google Chat skill＋Google Cloud |
| Google Cloud接続 | 利用組織が所有するCloud projectと `Internal` のユーザーOAuth | Google Cloud＋接続用JSON取得後のローカルwizard |
| Google Chatスペース選択 | ユーザーが保存対象として明示した `SPACE` ID集合。DM／グループDMは含めない | 同じrepoのGoogle Chat設定 |
| Google Chat履歴 | 選択スペースから取得した日付別Markdown。スレッドと添付メタデータを含む | 同じrepoのGoogle Chat履歴領域 |
| Google Chat同期状態 | 最終成功、スペースごとの取得位置、失敗・再認証理由 | 同じrepoのGoogle Chat状態記録 |
| やさしいハーネス | 規律を緩めず開発を進める別製品 | 別repo `yasashii-harness` |
| 配布版 | 利用者が導入・更新判断に使うpluginのversion | marketplaceとplugin manifestの一致値 |
| CHANGELOG | 版ごとの利用者向け変更説明 | public配布repo |
| 管理対象ファイル | pluginが配布・生成し、更新時に基準との差を判定するファイル | plugin配布物またはprivate workspace内の対象path |
| 最小台帳 | 管理対象ファイルの版・基準hash・テンプレート変数だけを持つ更新判断用メタデータ | private workspace内のplugin管理領域 |
| 復元地点 | 実更新の直前に作るpushなしのローカルcommit | private workspace repo |

## 更新の状態モデル

更新は `diagnosis`（読むだけ）と `apply`（明示確認後の実行）を別状態として扱う。

- `diagnosis` は現在版、最新版、CHANGELOG、管理対象ファイルの基準との差、必要操作を読む。最新版を確認できない場合は `latest-unverified` とし、推測で最新版扱いしない。
- `apply` は診断結果が揃い、利用者が実更新を明示了承し、安全な復元地点を作れる場合だけ開始する。
- 管理対象ファイルは `unchanged`、`customized`、`unknown-baseline` に分類する。`customized` と `unknown-baseline` は上書きせず「現状を残す」を既定にする。
- 最小台帳は管理対象path、導入済みversion、配布時の基準hash、明示的に許可した非機密のテンプレート変数だけを持つ。値が私的内容・資格情報に当たり得る変数は保存せず、更新時に要確認として扱う。
- 台帳無し0.2.0は `unknown-baseline` を安全側の既定とし、既知の0.2.0基準と一致を証明できたファイルだけ `unchanged` と判定する。
- migrationは `fromVersion`、`toVersion`、適用済み判定を持ち、dry-runと本実行で同じ対象を示す。再実行時の追加変更は0件でなければならない。
- rollbackはworkspaceを更新直前commitへ戻す範囲と、pluginを更新前versionへ戻す範囲を区別して説明する。どちらかを自動で復元できない場合は、成功と見せず手動手順を示す。

## single-repoワークスペース

```text
<private-workspace-repo>/
├── secretary/
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── inbox/todo.md
│   ├── docs/YYYY/MM/YYYY-MM-DD_<title>.md
│   ├── projects/
│   │   ├── <一般PJ>/PROJECT.md
│   │   └── <別repo開発PJ>/
│   │       ├── AGENTS.md
│   │       └── PROJECT.md
│   └── memory/
│       ├── MEMORY.md
│       ├── preferences.md
│       ├── decisions/YYYY-MM-DD-decisions.md
│       ├── journal/YYYY-MM-DD.md
│       ├── topics/<トピック名>.md
│       └── _resume.md
├── <Chatworkの選択設定・同期状態・履歴>
├── <Google Chatの選択設定・同期状態・履歴>
└── <GitHub Actionsの同期設定>
```

具体的なチャット用ファイル名はGeneratorが決めるが、サービスごとに設定・状態・履歴の役割を分ける。
チャット専用repoやsecretary専用の永続ローカルrepoは作らない。`10_sources/` に相当する汎用外部データ同期層も作らない。
public配布repoはこの構造の保存先にせず、plugin・公開README・配布検査だけを所有する。

## プロジェクト

### 候補と作成境界

候補検出はLLMが会話文脈から行う。次のシグナルのうち少なくとも2つがあり、そのうち1つが
「同じ成果に向けた複数行動」または「別の日・別セッションへの継続」である場合に提案できる。

- 同じ成果に向けた次の行動が2つ以上ある。
- 今日の会話だけでは完了せず、別の日・別セッションへ続く。
- 締切、待ち状態、関係者のいずれかがある。
- 方針判断または成果物が今後も増える。
- 別の会話で同じ案件が繰り返し登場する。

候補検出は作成許可ではない。確認前、拒否、キャンセルではプロジェクト関連のファイル、journal、commitを0件とする。
単発成果物、同じ会話で完了する作業、一つだけのTODOは候補にしない。

### 一般PJのライト運用

```text
secretary/projects/<project>/
└── PROJECT.md
```

`PROJECT.md` は次を持つ。

1. frontmatterの `status`: `active` または `completed`。欠落時は誤って非表示にせず `active` として扱う。
2. `現在の状況（YYYY-MM-DD時点）`: 現フェーズ、直近の変化、待ち、次の入口、要確認事項。
3. `概要`: 誰のために何をするPJか。
4. `ゴールと成功の測り方`: 終了条件と測定可能な判断基準。
5. `Decisions`: 確認済み判断のD-NNN 1行サマリー。未確定事項は入れない。
6. `メモ`: 文書から導出できない恒久的事実・知見。記録日を付け、資格情報を含めない。
7. `関連ドキュメント`: PJ内の作業文書・成果物への参照。

既存情報がある場合はユーザーが指定した最小範囲を読み、空テンプレではなく実際の概要と現状を初期値にする。

### ライト→フル昇格

次のいずれかに達したらその場で昇格を提案し、了承後だけ実行する。

1. Decisionsが10件を超えた。
2. メモが10件を超えた、または `PROJECT.md` が状態以外の内容で読みにくい。
3. PJ固有のガードレール、確認フロー、読む順序が必要になった。
4. PJ直下が10ファイルを超え、索引がないと迷う。

```text
secretary/projects/<project>/
├── CLAUDE.md       # AGENTS.mdへのポインタだけ
├── AGENTS.md       # 指示、Start here、ファイル索引、ガードレール
├── PROJECT.md      # 状態
├── DECISIONS.md    # 判断
├── MEMORY.md       # 恒久的な事実・知見
├── outputs/        # 確定成果物
├── archive/        # 旧版・backup・superseded文書
└── YYYY-MM-DD_*.md # 作業文書
```

フル移行ではライトのDecisionsを `DECISIONS.md` へ、メモを `MEMORY.md` へ移す。
`PROJECT.md` には決定の1行サマリーを残し、メモセクションは削除する。`AGENTS.md` の索引を初期化し、
以後ファイル移動・追加・削除と同じ操作で更新する。別の `INDEX.md` は作らない。

### 役割ごとの正本

- **状態**: `PROJECT.md`。決定を追記した同じ操作で現在状況と日付も更新する。
- **判断**: ライトのDecisionsまたはフルの `DECISIONS.md`。フルでは日付・背景・選択肢・結論・理由・影響範囲を持つ。
- **事実**: ライトのメモまたはフルの `MEMORY.md`。古い・誤りと分かった内容は整理できるが、資格情報は書かない。
- **タスク**: `inbox/todo.md` または接続済みサービス。PJ内に生きた `TODO.md` を作らず、`PROJECT.md` には次の入口と待ちだけを置く。
- **成果物**: 単発は `docs/YYYY/MM/`、一般PJの作業文書はPJ直下、確定版は `outputs/`、旧版は `archive/`。同じ正本を複製しない。

### 別repo開発PJのポインタ運用

開発依頼は既存の `build` から `yasashii-harness` へ接続する。別repoが適切な場合も黙って作らず、
repoの作成・接続・公開範囲を確認する。workspace側は次だけを持つ。

- `AGENTS.md`: 正本repoの場所、最初に読むファイル、workspace側では正本を編集しないという指示。
- `PROJECT.md`: 概要、正本repoへの参照、現在状態の短いスナップショット、最終確認日。

実装仕様、意思決定ログ、Sprint状態、成果物は正本repo側に置き、workspace側へ複製しない。

### 一般PJの完了と再開

- 完了はユーザー確認後だけ行い、同じ `PROJECT.md` の `status` を `completed` にする。ディレクトリ移動・削除は完了操作に含めない。
- 完了時は `PROJECT.md` に具体日、達成した結果、未完・保留・引継ぎがあれば残件として記録する。完了記録は後から検索・再参照できる正本として残す。
- `completed` のPJは通常の進行中一覧、dailyの進行中PJ、同一内容へのプロジェクト候補提案から外す。横断検索、timeline、明示的な参照依頼では引き続き対象にする。
- 完了済みPJに新しい継続作業が生じても自動再開しない。「このプロジェクトを再開しますか？」と確認し、了承後だけ `status: active` に戻す。再開日と理由を現在状況へ追記し、過去の完了日・結果・残件は消さない。
- 完了・再開が成功した事実はjournalへ1回記録できる。確認前、拒否、失敗ではstatus、PROJECT、journal、commitを変更しない。

## 実API live gate

### 評価場所

- 実APIはpublic配布repoではなく、専用private test workspaceで評価する。
- test workspaceも実利用時と同じく、pluginの利用設定・生成物、`secretary/`、通常project、Chatwork／Google Chat設定・workflow・同期状態・履歴を1つのrepoに置く。public配布ソース自体の複製は要求しない。
- チャット専用repo、Secret専用repo、履歴だけのrepoへ分割しない。

### 開始条件

次がすべて揃った場合だけlive gateを開始できる。

1. ユーザーがprivate test workspaceの作成、Repository Secret設定、workflow dispatch、remote push、対象サービスのAPI送信を明示許可している。
2. test用資格情報がRepository Secretへ登録でき、値をrepo本文や証跡へ出さない。
3. 個人情報・業務本文を評価対象にしない非機密test room／spaceが準備されている。
4. test workspaceがprivateで、評価に必要な共同編集者とActions権限だけを持つ。
5. Google Chat評価では、組織所有test Cloud project、`Internal` Audience、Desktop OAuth client、必要API、test user同意が準備されている。

開始条件が欠ける場合は `external-live-gate-unavailable` として未検証にする。Sprintは不合格だが、
合成fixtureの失敗や実装不具合とは扱わない。条件が整った後に同じEvaluator gateを再実行する。

### 伏せ字証跡

証跡に残せるのは、private状態、Repository Secret名の存在、workflow run ID／状態、取得候補件数、
選択test room／spaceの伏せ字識別子、取得件数、commit hash、push／pull成功、検索結果状態である。
token値、OAuth client値、不要な対象名、チャット本文、業務固有名詞は残さない。

### 後始末

- 評価終了後はscheduleを停止し、対象サービスのRepository Secretを削除し、test room／spaceの選択を解除する。
- Google ChatではGoogle側のOAuth grant／tokenもrevokeし、アプリ権限ページで接続が残っていないことを確認する。
- workflow、取得履歴、test workspaceを残す必要がある場合は、目的・保持期間・閲覧者をユーザーへ示す。
- repoや履歴の削除・archiveは別の破壊的操作として、対象と影響を示した後の明示確認でだけ行う。

## 0.7.0〜0.9.1の歴史記録と現在candidate 0.9.2

`0.7.0` と `0.8.0` は監査済みの不変なrelease記録であり、そのmanifest、migration、fixture、評価記録、tag、Git履歴を変更しない。
当時まだ利用者へ明示配布していなかった2 editionの最初の明示配布candidate／latestは `0.8.0` とした。
現在はmanifest、CHANGELOG先頭、公開tag `v0.8.0` が一致するため、`0.8.0` を最高公開版とする。
Sprint 038は後方互換な利用者向け機能追加なので、Semantic Versioningのminor更新を1回適用した `0.9.0` を現在candidateとする。
以下の0.8.0 readinessは履歴回帰として保持し、現在candidateのidentityとgateは別結果で判定する。
その後に公開された `0.9.0` を新たな履歴記録とし、Harness互換参照だけの後方互換な更新は
patch version `0.9.1` を当時のcandidateとした。
`0.9.1` の公開後はこれも履歴記録とし、Windowsの記録・保存互換を直す後方互換patch
`0.9.2` を現在candidateとする。

### Git変更集合

Gitを使う各操作は、次の集合を混ぜずに扱う。

- **既存変更集合**: 操作開始前からworking treeまたはindexにある利用者の変更。内容・stage状態とも操作対象外。
- **所有変更集合**: 初回publish、Chatwork設定、Google Chat設定、記憶commit、更新等、その操作が作成または変更したpath。
- **commit候補集合**: 所有変更集合のうち、secret検査と整合検査に合格し、今回commitすると利用者へ示したpath。
- **push対象**: commit候補集合だけから作られ、検証済みの今回commit。既存branchの別commitを黙って含めない。

検査後にcommit候補集合が変わった場合は、以前の検査結果を流用せず再検査する。失敗時のrollbackは所有変更集合だけへ作用し、
既存変更集合をunstage、復元、削除しない。初回publishでも「repo全体だからすべて所有」と推定せず、配布対象として意図したinventoryを確定する。

### secret値と補助scannerの責任境界

- **secret実値と正本**: OAuth client secret、認可コード、access／refresh token、Chatwork API Token等。継続取得の正本は、現在のprivate repoのRepository Secretである。
- **Google Chat登録導線**: OAuth実値はlocal wizard sessionのmemoryから `gh` のstdin経由でRepository Secretへ直接登録し、利用者のコピー／貼り付けを求めない。
- **Chatwork登録導線**: wizardはAPI Tokenを自動取得・受領・登録しない。利用者本人がChatwork公式画面で取得し、GitHubのRepository Secret画面の `Name` 欄へ `CHATWORK_API_TOKEN`、`Secret` 欄へ取得したAPI Tokenを直接入力する。Token実値をwizard、AI会話、repo本文、ログ、製品側DOMへ入力・貼り付けさせない。
- **通常フローの非露出**: 両サービスとも、実値をrepo・Git履歴・ログ・製品側DOM・会話へ残さない。
- **強制検査対象**: 製品が生成・管理するworkflow／config／historyと、初回publish時に確定したcommit候補inventory。OAuth client JSON、private key、known token field、通常のliteral assignment等、通常利用で合理的に起こり得る誤混入をcommit前に拒否する。
- **安全な参照**: `${{ secrets.NAME }}` 等の、実値を持たず実行時にRepository Secretを参照する正規参照。通常文書と合理的な非機密metadataも含め、補助scannerが誤拒否しない。
- **補助scanner**: 通常フローの設計に追加するdefense-in-depth。任意のユーザー作成コードを理解する万能parserではなく、意図的な特殊構文・難読化・computed／escaped key・偽placeholderの完全検出は保証対象外とする。この非ゴールはサービス別のRepository Secret登録導線と強制検査対象の0露出を緩めない。

### filesystem対象

- **write target**: 現在ユーザーが確認して開いているworking root内の対象。最終要素が未作成でも、最深の既存ancestorから許可rootまでを実体として評価し、外向きsymlinkがあれば作成前に拒否する。
- **delete target**: 通常ファイル／通常ディレクトリ／symlinkを区別する。symlinkはlink objectが許可root内であることを確認し、参照先を辿らずlinkだけを削除する。
- **external target**: 現在のworking rootから見たsymlink参照先と許可root外の実体。別repoは秘書workspaceから扱う間はexternal targetだが、別repo開発PJとして確認され、そのrepo自身をworking rootとして開いた開発作業ではrepo内がwrite targetになる。読取りを含め明示された範囲を超えて変更しない。

### OAuth session状態

- `client-ready`: 接続用JSONをメモリ上で検証済み。まだOAuth画面、Secret、履歴への副作用はない。
- `authorization-pending`: 一意のstate／PKCE／session確認値を持ち、callbackを1回だけ受け付けられる。
- `callback-processing`: 最初の正当なcallbackを処理中。並行・再送callbackは副作用なしで拒否する。
- `connected`: token交換と必要Secret登録が一度だけ完了し、後続の対象選択へ進める。
- `failed`: token交換または登録に失敗。厳格secretを破棄し、残存物を示す。
- `cleanup-required`: Secret、schedule、対象選択、OAuth grant／tokenのいずれかが残り、自動後始末を完了できていない。
- `closed`: 後始末不要または後始末完了。callback再入で状態を戻さない。

### release readiness状態

- `blocked`: F36〜F42、master suite、version整合、Git archive相当のいずれかが未合格。live gateを開始しない。
- `offline-passed`: 自動回帰、online参照検査、archive検査、Sprint 038当時のcandidate `0.9.0` 整合が合格し、同一release candidateを固定できた。
- `live-running`: 専用private test workspaceで両チャットのlive gateを実施中。片方の完了を全体合格にしない。
- `cleanup-required`: live動作は完了したが、schedule、Secret、選択、Google OAuthの後始末が未完了。
- `ready`: 同一release candidateで両チャットのActions、commit、push、pull後検索、冪等再実行と後始末がすべて合格した。

`ready`は過去runや過去commitから引き継がない。候補commitが変わった場合、影響するoffline gateとlive gateを再評価する。
candidate identityは配布対象bytesで決める。Git履歴やrepo所有の監査evidenceを使うcheckout専用検査と、`.git`／監査evidenceを
含まないarchive配布検査は別結果として記録する。checkout専用入力をarchiveへ混ぜず、両方の必須結果が合格した場合だけ
`offline-passed` とする。

### 0.6.0から0.7.0の更新状態

- `diagnosis`: 現在版 `0.6.0`、最新版 `0.7.0`、変更点、影響、復元方法を読み取り専用で示す。
- `protected`: workspaceのpushなし保護地点と、更新前plugin版／scope／取得元を復元情報として確認済み。
- `applying`: 明示確認済みのplugin更新とmigrationを実行中。`0.7.0`適用済みとはまだ記録しない。
- `verified`: plugin版、管理対象、migration、主要導線を検証済み。ここで初めて更新成功とする。
- `rollback-required`: pluginまたはworkspaceの一方でも検証不合格。両方の変更範囲と復元方法を示す。
- `rolled-back`: workspaceとpluginの両方が更新前状態であることを確認済み。片方だけの復元はこの状態にしない。

この状態遷移と対応fixtureは公開済み `0.7.0` の履歴回帰であり、`0.8.0` の期待値へ書き換えない。

### 公開済み0.8.0準備の履歴状態

- `candidate-aligned`: marketplace、plugin manifest、正本／legacy CHANGELOG、edition設定、README、公開ガイドが `0.8.0` で一致する。
- `fresh-install-verified`: 新規または未導入状態から0.8.0を導入し、正本plugin path、neutral marker、edition付きledger、主要skillを確認済み。
- `legacy-live-blocked`: 旧0.7.0 updaterがGoogle Chat標準生成fileをscannerで停止し、plugin update前に副作用0件で止まる。対応済みやlive互換PASSではない。
- `not-newer`: 候補が導入済みversionと同一または古い。理由と両versionを示し、plugin、workspace、Git、設定、ledger、migrationへ副作用0件で停止する。
- `portable-verified`: 同一candidate bytesでcheckout用gateと `.git` なしarchive用gateが合格する。

旧0.7.0利用者向けexternal recovery／bootstrapは状態として持たない。same-version bridge、fixture削除、安全scan弱体化、
公開済みartifactの改変で `legacy-live-blocked` を回避しない。将来この互換を提供する場合は、別のユーザー判断とSprint契約を必要とする。

### 当時のcandidate 0.9.0の状態

- `version-resolved`: marketplace／Claude manifest／Codex manifest／CHANGELOG先頭／公開tagが最高公開版 `0.8.0` で一致し、変更分類が後方互換な機能追加であるため `0.9.0` を一意に得た。
- `candidate-aligned`: current version ownerであるmarketplace、両manifest、正本／legacy CHANGELOGの新entry、edition metadata、公開ガイド、current release gateが `0.9.0` で一致する。
- `history-protected`: `0.7.0`／`0.8.0` のmanifest snapshot、migration、fixture、tag、progress、feedback、履歴assertが不変である。
- `destination-ready`: agentic public、private my-vault、yasashii publicの各配布系統について、source SHA、version、artifact、destination、rollback、再インストール要否が一意である。

version解決入力が一致しない、または変更分類からminor更新を一意に選べない場合は `version-unresolved` とし、publishせずPlannerへ戻す。

### 当時のcandidate 0.9.1の状態

- `version-resolved`: 公開済み `0.9.0` を確認し、Harness互換参照だけの後方互換なpatchとして `0.9.1` を一意に得た。
- `candidate-aligned`: marketplace、両manifest、CHANGELOG新entry、edition metadata、README、build導線、current release gateが `0.9.1` と対応Harness情報で一致する。
- `history-protected`: `0.7.0`／`0.8.0`／`0.9.0` のtag、artifact、fixture、progress、feedback、履歴assertが不変である。
- `destination-ready`: agentic publicと後続するyasashii publicの配布先、source SHA、artifact、rollback、許可状態が別々に一意で、private版・installed cache・利用者workspaceは対象外である。

### 現在candidate 0.9.2の状態

- `version-resolved`: Agentic／Yasashiiの公開済み `0.9.1` を確認し、Windowsの記録・保存互換を直す後方互換patchとして `0.9.2` を一意に得た。
- `candidate-aligned`: marketplace、Claude／Codex manifest、CHANGELOG新entry、edition metadata、README、Windows回帰、current release gateが `0.9.2` で一致する。
- `history-protected`: `0.7.0`〜`0.9.1` のtag、artifact、migration、fixture、progress、feedback、履歴assertが不変である。
- `destination-ready`: AgenticとYasashiiのcandidate、source SHA、artifact、destination、rollback、許可状態が別々に一意で、private my-vault版は対象外である。

## ユーザー会話の構造

ユーザー向けの意味単位を次のように扱う。

- `single-point`: 1要点だけの短い確認や回答。1段落でよく、機械的にbulletへしない。
- `multi-point`: 複数の手順、選択肢、結果、原因、影響、次の行動。空行で分けた段落またはMarkdown箇条書きにする。
- `result-report`: 実行結果に必要な意味だけを示す。単純成功は自然な短文、複数結果・部分失敗は必要な項目へ分け、固定3項目や架空の次行動を持たない。
- `technical-handoff`: agentic／yasashiiの内容差を保ちつつ、再現条件、証拠、残課題等の複数要素を構造化する。

改行有無は個人設定ではなく両edition共通の表示不変条件である。内部record、commit message、index、machine-readable出力の
1行契約は会話構造と分けて扱う。

## 三層記憶

| 層 | 型 | 記録経路 | 記録前確認 |
|---|---|---|---|
| 決定 | `decided` | 明示依頼または確認済み提案→ `remember-decision` → journal副作用 | 明示依頼は発話自体。自発提案・曖昧時は質問 |
| 活動 | `did` / `next` / `note` | 成功したシーム→ journal副作用 | なし。事実の追記だけ |
| 相談文脈 | topic | 明示依頼または要点の確認済み提案→ `topic-add` → journal副作用 | 明示依頼は発話自体。自発提案は質問 |

決定検出はLLM規律に依存するが、決定0件という内部監査結果を通常の締めへ強制表示しない。
決定文は主体・日付・行動・否定・条件の意味を保ち、勝手に膨らませない。原文全文のbyte複製は必須ではない。
相談文脈は会話全文を保存せず、明示された内容または確認済みの要点だけを残す。
確認済みPJに属する決定・文脈は当該PJの正本へ送り、一般memoryへ同じ本文を複写しない。

## journal

### 行の型

- `did`: 実行済みの活動。
- `decided`: 確認済みの決定。decisionファイルと対応する。
- `next`: 翌日以降への申し送り。`_resume.md` の中断点とは別。
- `note`: シームを通った補足事実。自由な逐語ログには使わない。

### 操作規約

- `journal-add <sec> <did|decided|next|note> "<本文>"` は対象日ファイルの末尾にだけ追記する。各シームはOSに依存しない同じ追記契約を共有する。
- 空本文、未知type、安全境界外を非ゼロで拒否する。既存行の更新・削除は提供しない。
- 定義済みシームは本来処理の成功後にだけ追記し、失敗した処理を活動として残さない。
- 日付は `CC_SECRETARY_NOW` で固定可能。曜日は表示しない。

## 決定の純追加モデル

- 初回決定は `memory/decisions/YYYY-MM-DD-decisions.md` へ追記する。
- 変更時は過去行を直さず、新しい日付ファイルに `変更: 「旧決定」(旧日付) → 「新決定」（理由）` の意味を持つ新規行を足す。
- timelineは新しい決定を優先して見せるが、履歴は失わない。
- 確認済みPJ固有の決定は当該PJのDecisionsへ追記し、同じ操作で `PROJECT.md` を更新する。journalの `decided` はプロジェクト名・要約・参照先を持つtimeline用の記録であり、正本の複製ではない。

## MEMORY.md と reindex

- `MEMORY.md` は1行1参照の索引で、上限は200行。
- decisions、preferences、topics を索引し、journal は日次行を並べず月単位1行に畳む。
- reindex はtopics追加・削除にも追従する。
- 200行超過を予測した場合、処理自体は `exit 0` を保ち stderr へ警告し、古い月の退避を提案する。自動退避・自動削除はしない。

## timeline

`timeline <sec> [--from <日付>] [--to <日付>] [--type decisions|journal|all] [--grep <キーワード>]`

- journalとdecisionsを日付キーで読み、逆時系列のMarkdownに整形する。
- 日付範囲とtypeを組み合わせられる。`--grep` は日付だけでは答えられない横断検索を担う。
- 同一入力・同一固定時刻ではbyte単位で同一出力になることを目標とする。
- 保存依頼時だけ既存 `save-deliverable` で成果物化する。

## TODO

- `inbox/todo.md` は既存TODOの正本。
- 追加、完了、持ち越しをシームで扱い、期限は任意フィールド。
- `todo-done` と `todo-carry` は `backup/sprint-007-010-plan` の旧実装をそのまま戻さず、journal統合形として再構成する。
- PJに属するTODOはプロジェクト名または `PROJECT.md` への参照を持てる。PJ内に別の生きたTODO正本を作らない。

## 会話authorizationの状態モデル

### explicit誤発火の除外

「覚えて」「記録して」「設定して」等を含んでも、次は現在の操作依頼ではない。

- 引用: 「『覚えておいて』と言われた」のように発話を引用している。
- 伝聞: 第三者が依頼したと報告しているだけで、現在の利用者が実行を命じていない。
- 仮定・条件: 「もし覚えてと言ったら」のように条件の説明をしている。
- 訂正: 「覚えて、ではなく確認だけ」のように直前の依頼を取り消し、別の意味へ訂正している。
- 取消: 未保存なら副作用0件。保存済みなら即時削除せず、対象提示と明示確認を分ける削除2段階へ進む。
- 過去依頼への照会: 「昨日、覚えてと頼んだ内容は？」のようなread-only照会。

これらは`explicit=false`として副作用0件を守り、照会へ答える、訂正後の内容を扱う、または必要な一点を質問する。

### IntentClass

| 値 | 意味 | 実行境界 |
|---|---|---|
| `explicit` | 操作、対象、行き先が明示され、残る危険が小さい | 発話自体をauthorizationとして同じターンで実行 |
| `inferred` | 秘書が保存・設定・プロジェクト化等を自発提案 | 質問への了承前は副作用0件 |
| `ambiguous` | 対象、日付、行き先、参照先に複数候補が残る | 不足する一点を質問し、副作用0件 |
| `destructive` | 削除、利用者作成内容を失う上書き、戻しにくい変更、10件以上・件数未定の一括・複数repo／宛先にまたがる大量変更 | 対象と影響を示した別確認後だけ実行 |
| `external` | 公開、push、認証、権限、課金、他者通知、曖昧な送信先 | 対象・公開範囲・影響を示した別確認後だけ実行 |

Secretを含む保存依頼は `explicit` でも即時保存へ進めず、Secretを表示・永続化しない安全境界へ送る。
複数分類に当たる場合は、より強い確認を必要とする `destructive` または `external` を優先する。
単一設定値の可逆更新はdestructiveな上書きに含めない。

「同じターン」は、1つのユーザー発話を受け、必要なtool実行を含み、最終応答で終わる1 assistant turnである。
retryやresumeは同じoperation idを引き継ぎ、実行済み副作用を再実行しない。

複合依頼は記載順のoperation列として扱う。独立した低リスク操作が確認境界より前にあればそこまで実行し、`partial`で結果を示す。
確認境界以降は実行しない。相互依存、利用者指定の一括、atomicな結果が必要な場合は、最初の副作用前に全体確認する。

### SideEffectState

- `0`: 永続物、外部状態、journal、commitの変更なし。
- `1`: 契約された操作が1回だけ成功し、必要なシーム副作用も1回だけ完了。
- `partial`: 複合依頼の一部だけが成功。成功範囲と未完了範囲を分け、全体成功にしない。

同じ明示依頼の重複確認を省くことと、同じ副作用を重複実行することは別である。
idempotency（同じ処理を再実行しても重複しない性質）または既存の重複防止を維持する。

### ResponseState

- `answered`: read-only照会、引用・伝聞等の非操作的入力へ、副作用0件で必要な回答を返した。
- `question`: 副作用0件で、不足する回答が分かる質問または選択肢を示した。
- `saved`: 実際の副作用が成功し、種別と行き先を過去形で示した。
- `error`: 副作用が成功していない。起きたことと、利用者が必要なら選べる復旧手段を示した。
- `partial`: 成功済みと未完了を分け、残る影響を示した。

`answered`なのにwriteがある、`question` なのに質問が無い、`saved` なのに副作用0件、`error` を成功風に包む、`partial` を全体成功とする状態は不整合である。

## 意味保存モデル

保存候補から次の意味要素を取り出し、入力との一致を検査する。

- 主体: 誰が行う／決めたか。
- 日付・期限: 明示された日付、相対日付を解決した基準日。
- 行動・対象: 何をする／何を残すか。
- 否定・条件: 「しない」「〜なら」「保留」等。
- 行き先: decision、topic、settings、TODO、Notion TaskDB、project等の正本。

入力にない担当、期限、顧客名、因果、確定状態を補わない。「覚えて」「メモして」等の依頼語や、
保存に不要な会話全文を内容へ混ぜない。自然文の言い換えは許すが、上記の意味を欠落・反転・追加しない。

### golden caseの判定単位

各caseは、case ID、edition、入力、前提、期待IntentClass、SideEffectState、ResponseState、必須応答要素、禁止表現、
意味tuple、変更前snapshot、変更後snapshotを持つ。意味tupleは主体、日付・期限、行動、対象、否定・条件、行き先の順で比較する。
各要素について欠落、反転、入力にない追加を起こすnegative fixtureを持ち、validatorが拒否できることを確認する。
決定的に機械判定できない自然さ等は、Evaluatorが観測文と判定根拠を記録し、未記録の主観判定をPASSにしない。

## my-vaultのタスク正本

`agentic-secretary-my-vault` では、将来の実行行動の正本はNotion TaskDBである。
日付と将来行動を含む「覚えて」等の入力を、キーワードだけでmemory-careやlocal TODOへ送らない。
意味と正本ルールに基づきNotion taskと作業上の注意事項を分ける。

task-triageの番号承認は、候補の内容と対象がその後変わっていない場合、その候補を起票するauthorizationとして
notion-tasksへ引き継ぐ。内容、対象project、TaskDB、relation、公開範囲に意味のある変更があれば再確認する。
通常のNotion直接起票では、既存どおりTaskDB、properties、relation、本文の計画を示して確認し、
connector write後にpageを再読してから成功とする。

Calendarとvaultのread-only横断依頼は、内部でそれぞれの正本へ問い合わせ、出典つきの統合結果を1回返す。
内部のroute名、index名、unlinked等だけで止めず、利用者が決める不足一点を日常語で質問する。

共通coreはIntentClass、SideEffectState、ResponseState、内容依存応答、安全境界を所有する。
`task-triage`、`notion-tasks`、`vault-search`、`vault-documents` とNotion routingはprivate repoが所有する。
Notion TaskDBへ送るcaseは共通parityから外し、my-vault版固有caseとして保存先とresponse stateを評価する。
agentic／yasashiiとの共通比較は、引用等の誤発火防止、確認境界、Secret非露出、未確認外部状態の非成功扱いに限る。

## Chatworkの取得境界

### 初回取得

- 対象はユーザーが選択したroomだけ。
- roomごとにAPIが返せる最新100件以内を取得する。0件は正常な初期状態。
- 100件より前、またはセットアップ以前の履歴を取得済みと見せない。
- message IDが同じ項目は同一メッセージとして扱い、再取得で重複させない。

### 継続取得

- 新しい取得結果を既存履歴へ統合し、過去に取得したメッセージをAPI応答から消えたことだけで削除しない。
- 同期成功時だけ取得位置と最終成功時刻を進める。部分失敗はroom単位で区別し、全成功と見せない。
- room選択解除は「今後取得しない」という意味。取得済み履歴の削除は別の2段階確認を必要とする。
- APIの編集・削除状態を完全復元できるとは約束しない。Git履歴には取得時点の差分が残る。

### 自動取得の間隔

| 表示する選択肢 | 30日換算の概算実行回数 | 実行の意味 |
|---|---:|---|
| 30分ごと | 1,440回 | 毎時17分・47分を起点 |
| 1時間ごと | 720回 | 毎時17分を起点 |
| 3時間ごと（おすすめ・初期値） | 240回 | 3時間ごとの17分を起点。既定推奨 |
| 6時間ごと | 120回 | 6時間ごとの17分を起点 |
| 12時間ごと | 60回 | 12時間ごとの17分を起点 |
| 手動のみ | 0回 | 自動実行なし |

実行回数は回数の概算であり、GitHub Actionsの処理時間ではない。2026年7月時点でGitHub Freeの
非公開リポジトリに含まれる月2,000分は処理時間の枠であり、2,000回の実行枠ではない。
実使用量はプラン、runner、各回の処理時間で変わり、料金・利用枠も変更される可能性がある。
busy roomの最新100件が覆う時間幅は推奨材料にできるが、間隔の最終決定はユーザーが行う。

### 設定変更結果

- 初回設定結果と設定変更結果を区別する。
- 設定変更後は、現在の選択room、現在の頻度、scheduleの有効／無効を表示する。
- 変更前の初回取得件数や旧room一覧を現在結果として再表示しない。取得履歴自体は削除せず、設定結果とは分けて参照する。

### 検索結果の状態

`/chatwork search` は結果を次のいずれかとして扱う。

- `found`: 保存済み履歴に一致し、room・日付・メッセージ根拠を示せる。
- `not-found-locally`: 現在の保存済み履歴には一致しない。存在しないとは断定しない。
- `sync-declined`: ユーザーが手動同期を選ばなかった。
- `room-review-needed`: 対象roomが未選択の可能性がある。
- `sync-failed`: workflow失敗・timeout等で最新性を確認できない。
- `still-not-found`: 同期成功後も一致しないが、導入前履歴、100件制約、キーワード差、編集・削除の可能性が残る。

### 手動同期の状態遷移

1. repoの最新状態をpullする。
2. 保存済み履歴を検索する。
3. `not-found-locally` の場合だけ、同期／中止／room見直しを構造化質問で確認する。
4. 同期承認時だけworkflowを開始し、完了を待つ。
5. 成功確認後にpullし、同じ条件で再検索する。失敗・timeout時は検索結果を最新と見なさない。

## Google Chatの取得境界

### 保存形式と取得境界

Google Chat同期の正本要素は次である。特定の私用workspaceや端末pathを参照せず、この契約だけで実装・検証できるようにする。

- 利用者本人のOAuthでGoogle Chat APIを読む。
- 選択したスペースだけを対象にする。
- スペース別・日付別のMarkdownへ保存する。
- Asia/Tokyoの時刻、発言者、本文、スレッド返信を人が読める形で残す。
- 初回はAPIが返せる履歴をページングし、以後は取得位置から差分を取り込む。
- GitHub Actionsで定期取得し、同じprivate repoへcommit・pushできる。

一方、現在の配布製品では次を意図的に扱わない。

- DM URLの受付とDM履歴。ユーザー回答2Aにより `SPACE` のみ対象とする。
- 使っていない `chat.memberships.readonly` 等の追加scope。
- 資格情報やrefresh tokenの端末表示、`.env` 保存を通常導線にする挙動。
- 古いサービスアカウント設定案内、JSON鍵、スペースへのbot追加。
- 製品外workspace固有の自動取得間隔。本製品はChatworkと揃え、3時間を推奨・初期値にする。
- UTC文字列の日付でファイルを分ける挙動。本製品はAsia/Tokyoの日付境界を使い、日本時間の深夜帯を前日に誤分類しない。
- 同日ファイルの上書きによる既存投稿消失や、誤ったthread取得経路等、現行実装の欠陥になり得る挙動。

### OAuth資格情報と初回取得

- Google Cloud準備はskill会話が担当し、local wizardは接続用JSON選択から開始する。Cloud準備の画像、project作成、API有効化、Audience、Client作成の説明はwizardに持たない。
- Project表示名はGit repo root名＋`-google-chat`。Project IDも同じ初期案を使い、制約・全体重複時だけ調整する。Git repo root、Project案、所属組織、変更内容を確認できない状態ではCloud変更を行わない。
- `gcloud`を使える場合はproject作成とGoogle Chat API／People API有効化までを担当し、`Internal` Audience、Desktop app、JSON取得はProject指定の直接リンクで利用者が行う。`gcloud`を使えない場合は全工程を同じ直接リンク支援へ切り替える。
- 厳格secretはclient secret、認可コード、access token、refresh token、OAuth client JSON全文。永続物へ残さない。
- client IDは識別子であり、一時的なOAuth認可リクエストURLと管理者向けチェックリストでは表示できる。tracked file、Git差分・履歴、ログ、journal、fixture、スクリーンショット、評価証跡、再読込後も残るDOMには保存しない。
- Desktop OAuthはPKCEとstate検証を併用する。loopbackで受け取った認可コードは直ちにtokenへ交換し、認可URLとcallback URLの両方をログ・証跡へ記録しない。
- 初回取得はOAuth直後の同じwizardセッションで、メモリ上のtokenだけを使ってローカル実行する。tokenはセッション終了時に破棄し、2回目以降はRepository Secretを使うGitHub Actionsが担う。
- 初回取得前に、保存対象と「取得結果をこのリポジトリへ保存します（Gitのcommit・push）」を確認し、明示同意を得る。

### OAuth接続状態

- `not-configured`: Cloud projectまたはOAuth clientが未準備。
- `cli-install-confirmation-needed`: `gcloud`がなく、公式ツールの導入内容とCloud変更能力を説明したうえで利用者確認を待っている。
- `cloud-project-confirmation-needed`: repo、Project表示名／ID、Google Workspace組織、必要API、Billing非接続を提示し、作成確認を待っている。
- `cloud-preparing`: CLIまたは公式リンクでprojectとAPIを準備している。完了工程と失敗工程を分ける。
- `browser-step-needed`: `Internal`、Desktop app、JSON取得のいずれか一操作を、Project指定の公式リンクで利用者が行う状態。
- `client-file-ready`: 接続用JSONの取得を利用者が確認し、local wizardを起動できる状態。
- `admin-action-needed`: 組織所有、`Internal`、API access controls、API有効化等を管理者に依頼する必要がある。
- `authorization-needed`: clientは準備済みだが利用者のOAuth同意が未完了。
- `connected`: 必要scopeと3つのRepository Secretが揃い、通常スペース一覧を取得できる。
- `reauthorization-needed`: refresh token失効、同意取消、scope変更、管理者ブロック等で再認証が必要。
- `failed`: rate limit、network、API無効、予期しない応答等。秘密値を表示せず原因を区別する。

`connected` は秘密値の読取や表示で確認せず、Secret名の存在と、最小権限でのAPI疎通結果で判断する。

Cloud準備の再開に保存できるのは、対象repo、Project表示名／ID、Google Workspace組織、完了済み工程、次の工程、確認日時だけ。
OAuth client JSON本文、client secret、認可URL、認可コード、tokenは再開情報へ保存しない。中断後は対象Projectを再確認し、
完了済み工程を無条件に作り直さず、次の未完了工程から再開する。

### スペース選択

- 一覧に出すのは `spaceType=SPACE` だけ。`DIRECT_MESSAGE` と `GROUP_CHAT` は件数の補足にも本文にも出さず、同期対象外として短く説明する。
- 初回取得と継続取得の開始時にも選択済みspace IDの `spaceType` を再確認する。設定ファイルが直編集されても `SPACE` 以外は取得せず、状態記録へ安全な拒否理由だけを残す。
- 初期選択は0件。ユーザーが名前を見て明示選択したspace IDだけをGit管理する。
- space IDは識別子、表示名は表示用とし、名称変更後も同じspace IDを同一対象として扱う。
- 選択解除は今後の取得停止であり、既存履歴削除ではない。

### 初回取得と保存

- 初回はGoogle Chat APIと組織の保持設定が返せる選択スペースのメッセージを、ページ末尾まで取得する。固定件数や固定日数を「全履歴」と呼ばない。
- 0件は正常。スペース単位の403／404／rate limit／network失敗を区別し、成功スペースの結果を全失敗で消さない。
- message resource nameを同一性の基準とし、thread resource nameと `threadReply` で親子関係を表現する。
- 表示時刻はAsia/Tokyo。日付境界も同じtimezoneで決め、UTC日付の切替で別日に誤分類しない。
- 発言者表示名はPeople APIが返せる範囲で補完する。`contacts.readonly` では連絡先にない同僚名を取得できない場合があることをREADMEで説明し、取得不能時は秘密情報を推測せず、同一人物を追える安定した代替表示にする。
- 添付はcontent name、content type、source、利用者向け参照先等のメタデータだけを保存する。添付本文、サムネイル、Driveファイルを複製しない。
- 削除済みメッセージは本文を復元せず、APIが返す削除時刻・種別等のメタデータだけを扱う。

### 継続取得と設定間隔

| 表示する選択肢 | 30日換算の概算実行回数 | 実行の意味 |
|---|---:|---|
| 1時間ごと | 720回 | 毎時0分を避けて実行 |
| 3時間ごと（おすすめ・初期値） | 240回 | Chatworkと同じ既定推奨 |
| 6時間ごと | 120回 | 6時間ごとに実行 |
| 12時間ごと | 60回 | 12時間ごとに実行 |
| 手動のみ | 0回 | 自動実行なし |

- 新しい取得結果はmessage resource name単位で既存の日付ファイルへ統合し、再実行で重複させない。
- 同日に複数回取得しても、以前の投稿やスレッド返信を失わない。
- 編集・削除状態の反映は、その取得実行でAPIが返した範囲に限る。`createTime` による差分範囲より古いメッセージの編集・削除は反映されないことを正常仕様とし、取得済み本文をAPI応答から消えたことだけで削除しない。
- 全選択スペースが成功した場合だけ全体最終成功を進める。部分失敗はスペースごとの取得位置と再試行対象を保つ。
- scheduleのcommit・pushは設定時の明示同意後だけ。手動検索からのworkflowは実行直前に再確認する。

### 検索結果の状態

`/google-chat search` は結果を次のいずれかとして扱う。

- `found`: 保存済み履歴に一致し、スペース・日付・該当箇所を示せる。
- `not-found-locally`: 現在の保存済み履歴には一致しない。Google Chatに存在しないとは断定しない。
- `sync-declined`: ユーザーが取得を選ばなかった。
- `space-review-needed`: 対象スペースが未選択または通常スペースではない可能性がある。
- `reauthorization-needed`: OAuthまたは管理者設定のため最新性を確認できない。
- `sync-failed`: workflow失敗・timeout・API失敗で最新性を確認できない。
- `still-not-found`: 取得成功後も一致しないが、保持設定、API取得範囲、キーワード差、編集・削除等の可能性が残る。

### 確認付き再取得の状態遷移

1. repoの最新状態をpullする。
2. 保存済みGoogle Chat履歴を検索する。
3. `not-found-locally` の場合だけ、取得／中止／スペース見直しを構造化質問で確認する。
4. 承認時だけworkflowを開始し、完了を待つ。`reauthorization-needed` はworkflow再試行より先に再認証を案内する。
5. 成功確認後にpullし、同じ条件で再検索する。失敗・timeout時は検索結果を最新と見なさない。

## preferences.md v2

```markdown
## 基本
- 呼び方:
- お仕事・役割:
- 主に使うサービス:

## 言葉遣い
- 口調: 丁寧（標準） | フランク | きっちり敬語
- 専門用語: ふつう | ことば添え | そのままOK
- 報告の詳しさ: みじかく | くわしく
- 決定の確認: 都度 | まとめて

## 口調のお手本
- NG:
- OK:

## 秘書のメモ
```

既定値は、口調=丁寧（標準）、専門用語=ふつう、報告=みじかく（内容依存）、決定確認=都度。
`pref-set <セクション> <キー> <値>` は指定行だけを更新し、`pref-note-add <本文>` は秘書のメモに追記する。実行方法が異なっても操作名と意味契約を維持する。
利用者が値を明示した単一の可逆変更は重複確認なしで適用し、変更後はjournalへ `did` を追記して節目コミットする。
値不足または秘書側の自発提案では、必要なら例文プレビューを示して確認する。

### 呼び方の状態

- 初回候補は `あなた`、探索で得た `account-name`、ユーザーが入力する `specified-name`、host標準の `other` の4経路。
- 保存するのは候補種別ではなく、確認済みの解決値である。選択への未回答、空回答は `あなた` へ解決し、保存確認が未完了なら書き込まない。
- account-name候補のsource priorityは `host-task-context` → `git-user-name` → `os-user-name`。`host-task-context` は現在タスクへ既に渡された過去会話の記憶、Personalization、Project文脈、現在会話の明示名に限り、任意の過去会話や生session logを直接探索しない。
- 候補値はUnicode NFKC、前後空白除去、連続空白の1個化を行う。空、メール形式、40文字超、数字が可視文字の半数以上、path／UUID／16文字以上のhex／host名等のmachine-like値、case-insensitiveで `bot`、`ci`、`root`、`admin`、`administrator`、`user`、`username`、`unknown`、`nobody`、`runner`、`github-actions`、`build` と一致する汎用名を除外する。OS値はさらにUnicode letterを1文字以上含む場合だけ候補にする。
- 正規化後のcase-fold一致は重複候補としてまとめ、source priorityが高い出典を残す。同一source tierでは、現在会話の明示名、Personalizationのpreferred name、Projectの利用者名、過去会話の記憶の順で推奨する。複数候補は出典を短く添え、最良1件を推奨する。
- host間で利用可能sourceが違っても同じ順序・除外規則でbest effortとする。候補が0件なら `account-name` は利用不能。探索結果、除外値、出典、推奨順位は保存しない。
- 現在値の正本は `memory/preferences.md`。`AGENTS.md` と `memory/MEMORY.md` は現役表示として同期し、3者の部分更新を残さない。
- `memory/decisions/<初回日>-decisions.md` は初回に確認した値の履歴であり、後日の呼び方変更では書き換えない。
- 後日の呼び方変更では、新しい確認済み値を3つの現役正本へだけ反映する。journalは `設定を変更: 呼び方`、Git commit subjectは `設定を変更（呼び方）` とし、値、その一部、値から導いた文字列を含めない。

## 口調プリセットと役割の適用

- `standard`、`friendly`、`formal` の3プリセットを提供し、NG/OK例ペアを設定へ複写できる。
- 関西弁・執事風など濃いキャラクターは同梱しない。
- お仕事・役割は、営業なら商談メモ、講師なら講義資料、経営なら数字のまとめ、のように提案・例示・用語補足の題材へ使う。
- 毎セッション `preferences.md` を読み、output styleだけに依存しない。

## 成果物・外部根拠・コミット

- 単発成果物は `docs/YYYY/MM/YYYY-MM-DD_<title>.md`。一般PJの作業文書は当該PJ直下、確定版は `outputs/`、旧版は `archive/` に置く。frontmatterに `createdAt` と `tags` を持ち、1ファイル1トピック、見出しに固有名詞を入れる。
- 外部根拠はサービス名＋URL/ID＋日付で示し、本文を保存しない。
- 節目コミットのメッセージは何をしたか分かる日本語1行。初回pushと同意済みChatwork schedule以外の予期しないpushは確認する。

## `yasashii-harness` との境界

- `yasashii-secretary` の build は別repoプラグインの存在を確認し、未導入なら3コマンドで案内する。
- 開発PJを別repo正本にする場合、workspace側は参照ポインタだけを所有し、`yasashii-harness`側の仕様・判断・Sprint状態を複製しない。
- `yasashii-harness` が Planner / Generator / Evaluator、`gentle-overlay/`、sync健全性、独自回帰を所有する。
- `mtaiseeei/yasashii-harness` は独立public downstream repoで、GitHub API上 `fork=false`。GitHubのparent relationには依存しない。
- downstreamのremote topologyは、`origin=https://github.com/mtaiseeei/yasashii-harness.git`、読取専用の `upstream=https://github.com/mtaiseeei/agentic-harness.git`。fb9c303がdownstream HEADの履歴から到達可能でなければならない。
- 配布識別は marketplace `yasashii-harness` とplugin `harness` を組み合わせた `harness@yasashii-harness`。marketplace manifestは `repository=mtaiseeei/yasashii-harness`、pluginは `source=./plugins/harness`、plugin manifestの `repository` / `homepage` は `https://github.com/mtaiseeei/yasashii-harness` を指し、必要なCodex marketplace識別子も同じ配布元へ揃える。
- 上流由来行への例外は `gentle-overlay/metadata-overrides.json` に宣言した配布識別metadata fieldだけ。syncは期待値の完全一致とallowlist外変更0件を検査する。
- `yasashii-secretary` 側のoffline回帰は、案内・3コマンドの構造、同梱コピー・agents・旧ベースラインの不在を検査する。online検査はGitHub APIでrepo実在、public、owner/name、`fork=false`、remote manifestのname / source / repository / homepageと3コマンドの整合を確認する。
- ネットワーク不可はonline検査のPASSにしない。offline構造検査の成功と、Evaluatorが取得するonline証跡を別結果として記録する。
- 上流へ返す変更は `yasashii-harness` から直接送らず、`agentic-harness` 側の別branch / PR手順に分離する。

## secretary edition

### EditionId

- `agentic-secretary`
- `yasashii-secretary`

editionは外部plugin IDとworkspace保護の識別に使う。workspace root `secretary/` やskill／command名はedition値にしない。

### WorkspaceEditionState

| 状態 | 条件 | 動作 |
|---|---|---|
| `new` | marker／ledgerなし | 導入editionのneutral markerとedition付きledgerを作成可能 |
| `same-edition` | marker／ledgerが導入editionと一致 | 通常のdiagnose／updateを許可 |
| `legacy-yasashii` | legacy markerまたは旧ledgerだけでyasashiiと一意判定 | yasashiiとして互換読取し、確認済みmigrationだけ許可 |
| `opposite-edition` | 反対editionを一意検出 | 副作用0件で停止 |
| `mixed` | 両editionの痕跡がある | 副作用0件で停止 |
| `unknown` | editionを安全に一意判定できない | 副作用0件で停止 |

neutral markerはmarker versionとEditionIdを持つ。update ledgerは `schemaVersion`、`edition`、既存のversion／保護／migration情報を持つ。
反対editionの情報を現在editionへ書き換えず、将来の明示的migrationが追加できる余地だけを残す。

### EditionConfig

edition configは配布識別子、repository、CHANGELOG／配布URL、ledger path、session directory、保護commit prefix、
Harness導線、4面の可変copyをまとめる。値を取得できない場合は暗黙のyasashii fallbackをせず停止する。
wizard copy、OAuth scope、workspace path、skill／command、migration filenameはconfig対象にしない。

### PluginPathCompatibility

- 新しい正本: `plugins/secretary/CHANGELOG.md`
- legacy read URL: `plugins/yasashii-secretary/CHANGELOG.md`
- invariant: 両fileのbytesとversion entryが一致する

legacy fileはredirectの説明だけに置き換えない。正本と同じ `0.8.0` entryを持つ完全なraw互換contentとし、
`0.7.0` の過去entryは書き換えない。このfile一致だけで旧0.7.0 updaterのlive互換を合格とはみなさない。

### RepositoryTopology

- upstream checkout: `agentic-secretary` の独立local checkout
- upstream GitHub repo: `mtaiseeei/agentic-secretary`
- downstream checkout: `yasashii-secretary` の独立local checkout
- downstream GitHub repo: `mtaiseeei/yasashii-secretary`
- relation: 共通祖先を持つ別repo。monorepo／subdirectoryではない
- downstream remote: `upstream` fetch enabled、push disabled

directory／repo作成、remote変更、push、公開は該当Sprintでユーザーが明示許可するまで未実行状態を正常とする。

## 秘書identityとcanonical workspace

- `display_name`: 利用者が確認した現在の英語名。変更可能。
- `secretary_id`: renameで変わらないstable ID。作者主体とregistryを結ぶ。
- `actor_type`: `ai-secretary`。人間authorとの識別に使う。
- `aliases`: 過去の表示名。履歴照合と連続性説明に使い、旧名だけの呼びかけを自動routingする根拠にはしない。
- `canonical_workspace`: 実体path、edition、marker検証状態を持つ現在の秘書workspace。現在cwdとは別概念。

user-scope managed blockはrouting hintでありidentityやworkspaceの正本ではない。resolverはregistryを読んだ後、
workspace実体境界、edition marker、必要な秘書正本を再検証する。移動、欠落、重複、反対edition、symlink／junction、
改ざん値では書き込まず、利用者が判断できる差分を示す。registryには利用者コンテンツやSecretを入れない。

rename candidateは `current-config`、`user-content`、`historical-author`、`unknown-or-conflict` に分類する。
current-configはtransaction対象、user-contentは個別opt-in、historical-authorは既定保持、unknown-or-conflictは自動変更禁止とする。
