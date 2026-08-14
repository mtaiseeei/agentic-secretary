# Sprint 039 Patch 002 — 既存workspaceの名前オンボーディング完全移行

## 種別

Patch Sprint

## Type

patch

## Base Sprint

sprint-039

## Risk

high

既存利用者のidentity、workspace内guidance、更新台帳、Git履歴を一transactionで扱うため。
microにはしない。複数の製品所有fileと更新導線を跨ぎ、現行の回帰だけでは完全移行を保護していない。

## 理由

公開済み`0.10.0`は、plugin更新により新しいname Skillと処理を読み込めるが、更新前から存在する
ローカルworkspaceを自動では新規導入相当へ揃えない。現行name Skillを直接起動しても
`secretary/identity.json`の作成に留まり、既存AGENTS／CLAUDEのidentity管理節と最小台帳が
未移行のまま残り得る。

そのため「pluginを更新した」状態と「秘書名をworkspace全体へ安全に導入した」状態が一致せず、
作者identity、後続rename、更新診断、別repo呼び出しの前提が部分適用になる。本Patchは
既存利用者向けname onboardingを完全なローカルmigrationとして成立させる。

ユーザー判断は確定済みであり、追加の製品方向質問は不要である。

## ゴール

Plugin更新後の新session、または既存利用者によるname Skill直接起動から、canonical workspaceを
読み取り専用で診断し、変更予定をpreviewする。別の明示確認後だけ、英語名とstable identity、
製品所有のAGENTS／CLAUDE identity管理節、最小台帳を新規導入相当へatomicに移行し、
利用者自由記述と既存Git状態を守ったlocal checkpointを残す。

## 前提

- 現行公開版は`0.10.0`、本修正は後方互換patch candidate `0.10.1` とする。
- 対象はAgentic共通コアである。Agenticのfresh独立Evaluator PASS後だけ固定handoffを発行する。
- Yasashii／private my-vaultは固定handoffから各repoの別Sprint・独立評価で取り込む。
- 3版すべての独立PASS後だけ`0.10.1` releaseとMac mini同期へ進む。受講者向け更新文はrelease後に作る。
- 実HOME、実利用者workspace、installed cache、実下流repo、Mac mini、remote、releaseは本Patchの書込み対象ではない。

## 含む変更

### A. 更新後のnew-session handoff

- Plugin更新完了、reload／新session開始、ローカルidentity migration完了を別状態として扱う。
- 新sessionでcanonical workspaceをread-only診断し、identity面が未導入または部分適用なら、
  「pluginは更新済みだがローカル移行が残っている」と示して既存利用者向けname onboardingを案内する。
- Claude CodeとCodexの正式更新面、およびname Skill直接起動で同じ意味を保つ。host固有の更新操作名は混同しない。
- 利用者が見送った場合はwrite 0件で終了し、完全移行済みとは表示しない。

### B. 既存状態のread-only診断

- canonical workspace、edition marker、必要正本、Git rootを再検証し、cwdだけを根拠に新規onboardingへ送らない。
- 少なくとも次を区別する。
  1. identity未作成。
  2. 現行`0.10.0` name Skillでidentityだけ作成済み。
  3. identity、AGENTS／CLAUDE identity管理節、台帳が新規導入相当。
  4. 利用者編集、marker重複、所有不明、edition／path／Git境界不一致により安全に自動移行できない。
- identityが無い場合だけ、希望の英語名またはおまかせ候補を提示する。不適格な名前は保存しない。
- 正当なidentityがある場合はdisplay name、stable ID、`ai-secretary`種別、作成時刻を保持し、再生成しない。

### C. migration previewと別確認

- previewは完全なread-onlyとし、対象pathごとに追加、更新、維持、衝突を示す。
- preview対象は次のidentity面に限定する。
  - `secretary/identity.json`
  - `secretary/AGENTS.md`内の製品所有identity管理節
  - `secretary/CLAUDE.md`内の製品所有identity管理節
  - editionが定める最小台帳の該当record
- previewは対象path、短い変更理由、local checkpointの要否、rollback、非対象を示す。
  利用者本文、秘書名やstable IDの証拠用複製、Secret、file全文を大量表示しない。
- 英語名の保存確認とmigration apply確認を分ける。名前の了承だけでworkspaceを変更しない。
- migration確認にはuser-scope registry／routing、rename、利用者コンテンツ、既存文書のgrep置換、pushを含めない。

### D. 新規導入相当へのatomic migration

- 別の明示確認後だけ、identity、AGENTS／CLAUDE identity管理節、最小台帳を一transactionで揃える。
- AGENTS／CLAUDEは一意な製品所有marker間だけを追加・更新し、利用者自由記述、他managed block、
  周辺行、改行、file modeを保持する。全面上書きや盲目的な文字列置換を行わない。
- identityは英語display name、stable ID、`ai-secretary`種別、aliases、作成時刻の整合を保つ。
  新しいAI author表示と構造化author metadataがこのidentityを参照できる状態にする。
- 最小台帳は管理対象path、適用version、基準hash等の更新判断metadataだけを扱う。
  秘書名、stable ID、利用者本文、記憶、顧客名、Secretを保存しない。既存の無関係recordを保持する。
- v0.10.1新規オンボーディングも同じidentity関連完成状態を作り、既存workspace移行後との意味差を残さない。

### E. local checkpoint、rollback、冪等性

- workspace変更がある場合、実体path、edition marker、Git top-levelが同じcanonical rootを指すことを再確認する。
- local checkpointは今回のmigrationが変更した製品所有pathだけを含む。開始前のstage／unstaged／untracked、
  対象外path、別repo、利用者自由記述以外の変更を混ぜず、push／fetch／remote／branch／tag操作を行わない。
- file write、構文／identity整合確認、台帳更新、stage、commit、commit後確認のどこかが失敗したら、
  今回のworkspace変更とGit HEAD／index／working treeを開始前へ戻す。開始前の利用者変更を失わない。
- 部分file、identityだけの部分成功、部分stage、部分commit、backup、一時fileを残さない。
  rollbackが完了しなければ成功表示しない。
- 失敗後のretryは一度の完全transactionとして成功できる。成功後の同じ診断・migration再実行は
  file差分、marker重複、台帳重複、stable ID変化、追加commitが0件である。
- target所有pathが開始前から未commit変更を持つ、正確なGit rootを確認できない、target workspace自体が
  Git-freeである等、安全なcheckpointを作れない状態はwrite 0件で停止する。

### F. version、下流handoff、運用gate

- `0.10.1` candidateのmanifest、marketplace、正本／互換CHANGELOG、edition metadata、README、
  current release gateを整合させ、公開済み`0.10.0`以前の記録を変更しない。
- Generatorはcandidateを作れるが、fresh独立Evaluator PASS前にaccepted下流入力として公開しない。
- PASS後の固定handoffはAgentic完全SHA、共通tree digest、宣言済み共通path、下流除外・保護path、
  rollback、publication stateを持つ。Yasashii／privateの実repoを本Patchから変更しない。
- 3版PASS前にtag、GitHub Release、marketplace公開、remote push、installed cache更新、Mac mini同期を行わない。

## 非ゴール

- user-scope registry／routingの自動有効化、確認統合、実HOMEへの書込み。
- rename、過去authorの書換え、B分類の利用者コンテンツ変更、既存文書のgrep一括置換。
- identity以外の会話契約、記憶、プロジェクト、TODO、Chatwork／Google Chat、Notion、Secretのmigration。
- 反対editionの切替、workspace統合、Git repo新規初期化、Git-free target workspaceへのcheckpoint代替。
- Yasashii／private my-vaultの実装・評価・release、実installed cache更新、Mac mini同期。
- 受講者向け更新プロンプトと使い方文の作成。これは3版release後の運用phaseで行う。
- 統一attestation、専用collector、証拠schema等の検証基盤開発。

## 受け入れ基準（Evaluatorが検証する）

1. 現行`0.10.0` plugin更新済み・identity未導入workspace、`identity.json`だけ作成済みworkspace、完全適用済みworkspace、衝突workspaceをread-only診断し、状態、canonical root、edition、未完了理由を正しく区別する。診断前後のworkspace／Git／合成HOME変更は0件である。
2. Plugin更新後の新sessionは、plugin更新とローカルmigrationを別状態で示す。未導入／部分適用ではname onboardingを明示案内し、見送りを完全移行済みと表示しない。Claude Code、Codex、name Skill直接起動で意味が一致する。
3. identity未導入では希望名、おまかせ、取消、不適格名が契約どおりに動く。正当な既存identityではdisplay name、stable ID、`ai-secretary`種別、created timeを再生成せず保持する。
4. migration previewはidentity、AGENTS／CLAUDE製品所有identity管理節、最小台帳を追加・更新・維持・衝突へ分類し、対象path、local checkpoint、rollback、非対象を示す。preview前後の全snapshotは一致する。
5. 英語名の確認後もmigrationの別確認前はwrite 0件である。拒否、取消、無回答ではidentity、guidance、ledger、Git、user-scope、registryが変わらない。
6. 明示確認後の成功caseは、identity、AGENTS／CLAUDE製品所有identity管理節、最小台帳がv0.10.1新規導入相当のidentity関連状態へ揃い、表示名、stable ID、AI種別、AI author参照、管理対象recordが相互に整合する。
7. AGENTS／CLAUDEの利用者自由記述、他managed block、周辺行、改行、modeが保持される。管理節以外のblind replacement、全面上書き、無関係path変更は0件である。
8. 最小台帳はidentity関連の管理対象pathを一意に持ち、適用version／基準metadataが整合する。秘書名、stable ID、利用者本文、顧客名、記憶、Secretの保存と、無関係recordの削除・重複は0件である。
9. 成功caseのlocal checkpointは正確なGit rootから今回変更した所有pathだけを1 commitに含める。開始前のstage／unstaged／untracked、対象外path、remote状態を保持し、push／fetch／remote／branch／tag操作は0件である。
10. file write、整合確認、台帳、stage、commit、commit後確認の代表failureは非0または明確な失敗状態となり、workspace tree、HEAD、index、working treeが開始前snapshotと一致する。部分file／stage／commit、backup、一時fileは0件である。
11. failure後のretryは1回の所有checkpointで正常完了し、成功後の同じmigration再実行はfile差分、marker／ledger重複、stable ID変化、追加commitが0件である。完全適用済みfixtureも0差分である。
12. marker重複、利用者編集衝突、所有不明、edition不一致、symlink／junction、read-only、別Git root、target dirty、Git-free target workspaceは理由を示して副作用0件で停止する。部分成功を全体成功と表示しない。
13. ローカルmigrationの確認ではuser-scope file、registry、routing enabled stateが変わらない。任意の別repo routingは、移行完了後も効果と対象を示した別確認の既存導線だけで有効化される。
14. `0.10.1`が公開済み`0.10.0`から一意に得られる後方互換patch candidateとして、現在のmanifest、marketplace、正本／互換CHANGELOG、edition metadata、README、release gateで整合する。`0.10.0`以前のtag、artifact、entry、migration、fixture、評価記録は不変である。
15. name／onboarding／secretary／update、identity／author、AGENTS／CLAUDE serializer、ledger／migration、resolver／routing／rename、Windows保存互換、safe Git／secret scan、formal Skill／manifest、report schema、release integrityの関係回帰が0 FAILである。
16. clean checkoutと同一candidate bytesのGit-free archiveからPatch専用回帰と対象archive masterを0 FAILで完走する。Git-free archive内の隔離fixtureは一時Git targetを使い、source archive自体の`.git`不在とtarget checkpoint要件を混同しない。
17. handoffはAgentic完全SHA、共通digest、共通path、Yasashii／privateの除外・保護path、rollbackを一意に再計算できる。fresh独立Evaluator PASS前はaccepted input、release、下流反映として表示しない。
18. fresh独立Evaluatorが固定candidateを実操作してC2、C5、C6、C9、C10、C12〜C17の各閾値を満たす。実HOME、実利用者workspace、installed cache、実下流repo、Mac mini、remote、external service、releaseへのwriteは0件である。

## 検証スコープ（着手時に固定）

### 検証対象の環境・面

- 現行`0.10.0`配布物または固定履歴bytesから作る既存workspace fixture。
- 合成HOMEと隔離workspace。apply成功／失敗caseのtargetは一時Git repoを使う。
- clean checkoutと、同一candidate bytesのGit-free archive。
- Plugin更新後new-session handoff、name Skill直接起動、onboarding、update、identity／author、managed section、ledger、Git transaction、release candidate、handoff。
- 実HOME、実利用者workspace、installed cache、実下流repo、Mac mini、remote、外部serviceはsnapshot対象であり書込み対象ではない。

### 必須シナリオ

1. v0.10.0 plugin更新済み・identity未導入。
2. v0.10.0 name Skillでidentityだけ作成済み。
3. v0.10.1新規導入相当／すでに完全適用済み。
4. 希望名、おまかせ、不適格名、取消、migration確認拒否。
5. 利用者自由記述、他managed block、CRLFまたは既存改行、modeを持つAGENTS／CLAUDE。
6. 通常成功、開始前stage／unstaged／untracked保持、所有path限定checkpoint。
7. file write、整合確認、台帳、stage、commit、commit後確認のfailureと全rollback。
8. failure後retry、成功後rerun、完全適用済みrerun。
9. marker重複、利用者編集衝突、edition不一致、symlink／junction、read-only、別root、target dirty、Git-free target。
10. user-scope routingの不変と、別確認導線の回帰。
11. clean checkout／Git-free archiveのPatch回帰、関連回帰、対象archive master。
12. `0.10.1` candidate整合、`0.10.0`履歴保護、固定下流handoff、external write 0。

### 証拠形式（safe harbor）

- 実行commandとexit code、固定candidate完全SHA、fixture root、case ID、期待状態と観測状態。
- workspace tree、対象file、合成HOME、HEAD、index、working tree、commit path一覧、remote状態の前後digestまたは同等snapshot。
- preview／applyの構造化結果と、変更path／非対象path／rollback結果。利用者本文、秘書名、stable ID、Secretは証拠へ複製しない。
- clean checkoutとGit-free archiveそれぞれのPatch回帰、関連回帰、formal／schema／release、対象archive masterの集計。
- handoffのAgentic完全SHA、共通digest、共通path、除外・保護path、publication stateの再計算結果。
- 実HOME、実workspace、cache、下流、Mac mini、remote、release、外部serviceの`not-run`／write 0記録。

上記が揃えば十分である。契約にない統一attestation、専用collector、証拠schema、実HOME操作、
実downstream反映、実release、Mac mini接続を追加の合否条件にしない。

## 適用Rubric

- C2 構文・整合: 5/5
- C5 安全・規律: 5/5
- C6 無回帰: 5/5
- C9 配布チャネル非依存: 5/5
- C10 更新の安全性: 5/5
- C12 release履歴・現在candidate整合: 5/5
- C13 edition分離・互換: 5/5
- C14 会話のMarkdown可読性: 5/5
- C15 会話authorization・意味保存: 5/5
- C16 秘書identity・名前routing・rename: 5/5
- C17 既存workspace identity migration: 5/5

1項目でも閾値未達ならPASSにしない。Evaluatorは各findingを`product`または`verification-infra`へ分類する。
契約safe harborにない証拠形式を合否条件として追加しない。

## Generator／Evaluator handoff

Generatorは本Patchだけを実装し、対応する`docs/progress/sprint-039-patch-002.md`へ、candidate、
変更面、failure matrix、起動／回帰command、fixture、known issue、not-run、下流handoff候補を記録する。
accepted完全SHA／digestやrelease済みとは表示しない。

Evaluatorは別のfresh作業単位で固定candidateを実操作し、対応する
`docs/feedback/sprint-039-patch-002.md`へ証拠、AC判定、Rubric score、finding分類、自分の評価のself-reviewを書く。
Agentic PASSとオーケストレーターのstate更新後だけ、下流repoが使う固定handoffを発行できる。
