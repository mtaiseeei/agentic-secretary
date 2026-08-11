# Sprint 038 Patch 002 — Windowsネイティブの記録・保存操作とSecretary 0.9.2準備

- Type: patch
- Risk: high（記憶・TODO・設定・プロジェクト・成果物の書込みとrollbackを横断し、失敗時の利用者データ保護が必須のため）
- Base Sprint: `sprint-038`
- 依存: `sprint-038-patch-001` done。public Agentic版とYasashii版の `v0.9.1` が公開済みであることをrelease準備時に再確認する。
- 主眼: Windowsの通常のworkspace pathでも、秘書の記録・保存操作がOS固有のshellやpath解釈を理由に失敗せず、既存の安全境界・一括更新・rollback・journal整合を維持する。

## 背景と通常Patch判定

Windowsネイティブ環境で一般プロジェクトを作成すると、プロジェクト本体の書込み後に行うjournal記録が
Windows形式のpathを秘書ディレクトリとして認識できず、「秘書ディレクトリが見つかりません」と失敗する経路がある。
同じ記録・保存境界は、プロジェクト、記憶、TODO、settings、成果物保存の複数フローから利用される。

変更は同一画面・同一コマンドに閉じず、既存回帰だけでWindowsの実行環境を保護できていない。
そのため `Type: micro` ではなく、通常のPatch Sprintとする。

## 外から見える成果

- Windowsのローカルworkspaceで、プロジェクト化、記憶、TODO、設定変更、文書保存を通常どおり完了できる。
- drive letter、空白、日本語を含むWindows pathでも、workspaceを「見つからない」と誤判定しない。
- 失敗時は、利用者データとjournalの片方だけを残さず、完了・部分成功・失敗を実際の状態に合わせて伝える。
- macOSとLinuxの既存利用者は、従来の記録、保存、path guard、Git運用をそのまま利用できる。

## Scope

### A. Windowsネイティブのworkspace path

- drive letterから始まるローカルpathを、有効なworkspaceの絶対pathとして扱う。
- pathに空白、日本語、複数階層があっても、実在する `secretary/` とその管理対象を正しく識別する。
- OS固有のshellが無いこと、または異なるshellがWindows pathを別の意味で解釈することを理由に、秘書の主要操作を利用不能にしない。
- Windows対応を理由にpathを単純な文字列の前方一致で許可せず、実際の書込み先が確認済みworkspaceの内部かを判定する。

### B. 記録・保存操作の一貫性

次の利用者向け操作は、Windows・macOS・Linuxで同じ意味と安全境界を持つ。

- 一般プロジェクトの作成、決定・事実の追記、ライトからフルへの整理、作業文書・確定成果物・旧版の整理、別repo参照、完了、再開。
- 決定、journal、相談要点、timeline、週次ふりかえり、古い月の退避候補と確認後の退避、記憶索引、再開しおり、記憶の保護付き変更・削除。
- TODOの追加、一覧、完了、持ち越し。プロジェクトから追加するTODOも同じ境界で扱う。
- 呼び方を含むsettingsの変更、現役正本の同期、journal、所有変更だけのローカルcommit。
- 単発と一般プロジェクトの作業文書・確定成果物の保存。

### C. 一括更新・journal・rollback

- 本体操作とその成功事実を記録するjournalは、契約上ひとつの操作として整合させる。
- journalを含む必須工程が失敗した場合、その操作が開始前の状態へ戻る契約なら、プロジェクト、記憶、TODO、設定、文書、journal、Git状態の部分更新を残さない。
- 失敗時に副作用が契約上残る操作は、成功済みの範囲と未完了を分け、全体成功と表示しない。
- 同じ依頼のretried実行でjournal、TODO、記憶、commitを重複させない。
- 既存の空上書き拒否、削除2段階、所有pathだけのcommit、push禁止、秘密情報保護を維持する。

### D. 回帰と配布系統

- Windowsネイティブ環境で、通常path、空白・日本語path、境界外path、path traversal、symlinkまたは同等の参照、中途失敗、再実行を検証する。
- macOSとLinuxの既存master回帰を実行し、Windows対応のために既存の安全assertを削除・緩和しない。
- `agentic-secretary` の共通coreを先に実装・独立評価し、PASSした完全SHAだけをYasashiiのoverlay同期元にできる。
- Yasashiiは固定したAgentic SHAから同期し、Yasashii固有copy・identity・README・repo所有docsを保護した別の回帰と独立評価を必須とする。
- `agentic-secretary-my-vault`、installed cache、利用者workspaceは本Patchの変更・反映対象にしない。

### E. Secretary 0.9.2 release準備

- 公開済み `0.7.0`、`0.8.0`、`0.9.0`、`0.9.1` のrelease記録、tag、artifact、migration、fixture、過去のSprint記録を不変とする。
- Windowsの記録・保存互換は後方互換の不具合修正とし、現在candidateを `0.9.2` に一意に揃える。
- marketplace、Claude／Codex manifest、CHANGELOG新entry、edition metadata、READMEの対応環境と更新案内、current release gate、回帰の期待versionを `0.9.2` で整合させる。
- CHANGELOGと利用者向け案内は、Windowsで記録・保存操作が失敗する不具合の修正であること、workspace migrationが不要であることを示す。

## Non-scope

- Chatwork／Google ChatのOAuth、wizard、同期、履歴形式、投稿機能の変更。
- プロジェクトの候補判定、ライト／フルの情報設計、TODO正本、記憶の意味分類、settingsの項目、文書配置規約の再設計。
- 安全な書込みと無関係なすべての外部CLI・wizard・配布toolの汎用的なクロスプラットフォーム再構築。
- Windowsのネットワーク共有pathやWSLとWindows間の全形式の相互変換保証。通常のローカルWindows workspace pathを公式対象とする。
- `agentic-secretary-my-vault`、private機能、Notion TaskDB、private配布判断の変更。
- Evaluator PASS前のpush、tag、GitHub Release、marketplace更新、実plugin install／update。
- Agentic側のPASSだけでYasashii同期・評価・releaseを完了済みと表示すること。

## Acceptance Criteria

1. Windowsのローカルworkspaceで、drive letter、空白、日本語を含むpathを使い、一般プロジェクト作成が完了し、内容入り `PROJECT.md` とjournalが各1件だけ記録される。
2. 同じWindows環境で、プロジェクトの決定・事実追記、フル整理、文書保存・旧版整理・確定成果物、別repo参照、完了・再開、プロジェクト関連TODOが契約どおり成功する。
3. 同じWindows環境で、決定、journal、topic、timeline、weekly、archive、reindex、resume、保護付き記憶変更／削除、TODO追加／一覧／完了／持ち越し、呼び方と通常settings変更、単発成果物保存を実行できる。
4. 主要な記録・保存操作は、WindowsでOS固有のshellの有無やWindows pathの異なる解釈を理由に利用不能にならず、配布Skillの案内がWindowsで実行可能な正規導線を指す。
5. ドライブ直下、workspace外、path traversal、前方一致する別ディレクトリ、最終要素／途中ancestor／基点自体の外向きsymlinkまたはWindowsの同等参照による書込みが、対象外への副作用0件で拒否される。
6. 書込み、journal、索引、commitの主要な中途失敗を注入し、rollback契約を持つ操作ではファイル、journal、Git HEAD、index、working treeが開始前に戻り、部分更新・追加event・部分commitが0件である。
7. 同一操作の再実行で、journal、TODO、記憶、プロジェクト、文書、commitが重複せず、実際の状態と `saved / error / partial` の報告が一致する。
8. macOSとLinuxの既存対応操作、master回帰、archive配布回帰が0 FAILで、path guard、空上書き拒否、削除2段階、所有path限定commit、push 0件、Secret保護のassertが削除・緩和されていない。
9. public Agentic candidateと、固定したAgentic完全SHAから作ったYasashii隔離candidateが同じWindows操作・安全fixtureに合格し、共通coreの対象ファイルが一致する。Yasashii固有copy・identity・README・repo所有docsの開始前後digestは不変である。
10. `agentic-secretary-my-vault`、installed cache、利用者workspace、Chatwork／Google Chat設定・履歴、外部serviceの変更が0件である。
11. 公開済み `0.7.0`〜`0.9.1` の履歴を不変とし、marketplace、Claude／Codex manifest、CHANGELOG新entry、edition metadata、README、current release gateが `0.9.2` で一致する。履歴回帰と現在candidate整合は別結果で検証する。
12. `0.9.2` の利用者向け変更説明が、Windowsの記録・保存互換の不具合修正、workspace migration不要、Agentic先行評価→Yasashii overlay同期の順序を示し、my-vault対応済みと誤表示しない。
13. Windowsネイティブ環境の実行証跡、macOS／Linux回帰、境界拒否、失敗注入、再実行、Yasashii隔離candidate、release integrityの証跡が揃う。Windows path文字列の模擬だけをWindows対応のPASSにしない。
14. 独立Evaluator PASS前のpush、tag、GitHub Release、marketplace更新、実plugin install／updateが0件である。PASS後のrelease phaseでもAgenticとYasashiiのcandidate・宛先・rollback・許可を別々に確認する。

## 検証スコープ（着手時に固定）

- 検証対象の環境・面:
  - Windowsネイティブの回帰実行面。
  - macOSまたはLinuxの現行master／archive回帰実行面。
  - public Agentic candidateと、固定したAgentic SHAから作るYasashii隔離candidate。
- 必須シナリオ:
  1. Windowsでの一般PJ作成→journal記録の問い合わせ再現手順。
  2. Windowsでのプロジェクト操作一式と関連TODO。
  3. Windowsでのmemory／daily／weekly／settings／成果物保存の主要操作。
  4. drive letter、空白／日本語、境界外、path traversal、外向き参照の正負fixture。
  5. 書込み・journal・索引・commit失敗と再実行。
  6. macOS／Linux master回帰、Git archive相当回帰、履歴回帰。
  7. Yasashii隔離candidateへのoverlay同期、固有surface保護、同一Windows回帰。
  8. `0.9.2` current candidate整合、配布系統別release準備、外部write 0件。
- 証拠形式:
  - 各実行環境、OS、実行command、exit code、PASS／FAIL件数、失敗内容。
  - 正負path fixture、操作前後snapshot、journal／TODO／記憶／project／文書／Gitの件数・状態。
  - failure injectionごとのrollback後snapshotと、workspace外canaryの不変記録。
  - Agentic candidate SHA、Yasashii隔離candidateのupstream base、共通coreの一致、downstream-owned surfaceの前後digest。
  - version surfaceの抽出結果、履歴回帰、current release gate、`git diff --check` の結果。

上記で十分とし、新しいcollector、統一attestation、実serviceへの書込み、問い合わせ利用者本人の再度の操作を追加の合格条件にしない。

## Release gateと完了条件

- Generatorは本Patchの範囲だけを実装し、`docs/progress/sprint-038-patch-002.md` に対象フロー、実行環境、起動／回帰command、failure injection、rollback、Yasashii隔離candidate、release準備、not-runを記録する。
- Evaluatorは別作業単位で同一candidateを実行評価し、`docs/feedback/sprint-038-patch-002.md` に証跡、各findingの `product / verification-infra` 分類、合否を記録する。
- Evaluator PASS後だけ、Orchestratorがpublic Agentic `0.9.2` のrelease phaseへ進める。
- Yasashii実repoへの同期とreleaseは、PASSしたAgentic完全SHAを固定した下流側Patch契約、overlay同期、別回帰、独立Evaluator PASS後に行う。
- AgenticのPASSとOrchestratorの `state.md` 更新前に本Patchを完了扱いしない。Yasashiiは下流独立評価前に完了・公開済みと表示しない。
