# Sprint 035 Patch 001 評価結果

**判定:** 合格
**評価対象:** Sprint 035 Patch 001 — 共通チャットwizardのIME安全な検索
**評価candidate:** `b94501f`（実装 `fd104a1488d76624e1d0f8fda0e97d1d40c52657` + progress）
**Escalation Recommendation:** none

## 結論

ChatworkとGoogle Chatの6条件（desktop／390px mobile／200%相当）を独立したheadless Chromeで操作し、全条件で合格した。
日本語IMEの `compositionstart → 複数input → compositionend` では、composition中の結果DOM変更0件、画面全体の再描画0件、
確定後の結果更新1件を確認した。検索inputのDOM node、focus、caret、入力値は保持された。

英数字、Backspace、途中挿入、途中削除、全削除でも表示結果IDが検索値と一致し、検索前に選んだ2件のcheckbox IDは、
一時的に非表示になった後も同じ2件のまま復元された。横overflow、操作不能、未処理例外、製品console errorは0件だった。

実Chatwork API、Google OAuth／API、Repository Secret、GitHub Actions、remote writeは契約どおりすべて `not-run` である。
local／syntheticの成功をlive接続成功には読み替えていない。

## スコア

本Patchは `Type: regular patch` のため全rubricを確認した。Patch外の軸は、実装差分0件、引き渡された回帰、
該当する専用安全回帰で開始時点の契約を維持したことを評価した。外部live gateは本Patch契約で明示的にNon-scopeである。

| ID | 基準 | スコア | 閾値 | 判定 | 主な根拠 |
|---|---|---:|---:|---|---|
| C1 | 完成度 | 5/5 | 4 | PASS | 受入基準1〜10をすべて確認 |
| C2 | 構文・整合 | 5/5 | 5 | PASS | 3 wizard asset構文、digest inventory、変更pathを確認 |
| C3 | 機能の実証 | 5/5 | 4 | PASS | 6画面の実DOM、IMEイベント、結果ID、選択IDを記録 |
| C4 | 非エンジニア体験 | 5/5 | 4 | PASS | 検索・一覧・選択・戻る／進むが6条件で操作可能、可視copy不変 |
| C5 | 安全・規律 | 5/5 | 5 | PASS | Secret専用71/71、session／OAuth専用21/21、外部write 0 |
| C6 | 無回帰 | 5/5 | 5 | PASS | 引き渡し統合9/9、Chatwork 35/35、Google Chat 51/51、edition 20/20 |
| C7 | やさしさ | 5/5 | 4 | PASS | copy変更0、既存の1画面1判断と説明を維持 |
| C8 | wizard体験・デザイン | 5/5 | 4 | PASS | screenshot 6枚、overflow 0、操作対象44px以上、Tab移動成立 |
| C9 | 配布チャネル非依存 | 5/5 | 5 | PASS | 配布copy変更0、edition境界回帰20/20 |
| C10 | 更新の安全性 | 5/5 | 5 | PASS | 更新／migration path変更0、差分をwizard検索面へ限定 |
| C11 | Google Chat境界 | 5/5 | 5 | PASS | read-only scope、SPACE限定、DM拒否、cleanup負ケースが合格 |
| C12 | 0.8.0配布準備 | 5/5 | 5 | PASS | manifest／candidate面変更0、Agentic edition回帰20/20 |
| C13 | edition分離・互換 | 5/5 | 5 | PASS | 共通asset inventory更新、edition固有4面の変更0、境界回帰20/20 |
| C14 | 会話のMarkdown可読性 | 5/5 | 5 | PASS | 会話surface変更0。wizard copy／DOMも開始時契約を維持 |

## 証跡

### 実行commandと結果

1. 引き渡されたbaseline:

   ```bash
   TMPDIR=/private/tmp bash scripts/sprint-035-patch-001-regression.sh
   ```

   - restricted sandbox内の初回だけ、localhost bindが `EPERM` となり2項目停止した。製品assertの失敗ではない。
   - loopback許可付きの同一command再実行: `SPRINT035_PATCH001_REGRESSION_PASS=9 ... FAIL=0`、exit 0。
   - 内訳: Patch専用IME 29/29、Chatwork API／search／wizard 35/35、Chatwork wrapper 33/33、
     Google Chat 51/51、Google Chat wrapper 12/12、共通browser式6/6、Agentic edition 20/20。

2. Evaluator独立browser:

   ```bash
   node docs/evidence/sprint-035-patch-001/evaluator-browser-check.mjs \
     --cdp http://127.0.0.1:9235 \
     --chatwork-url 'http://127.0.0.1:18845/?direct=rooms' \
     --google-url 'http://127.0.0.1:18846/?direct=settings-spaces' \
     --evidence docs/evidence/sprint-035-patch-001
   ```

   - `SPRINT035_PATCH001_EVALUATOR_BROWSER_PASS=6 ... FAIL=0`、exit 0。
   - `browser-evidence.json`: `passed=true`、`productBrowserErrors=[]`、`networkFailures=[]`。

3. session／OAuth callback／cancel／Secret cleanupの負ケース:

   ```bash
   TMPDIR=/private/tmp node scripts/sprint-023-security-test.mjs
   ```

   - `SPRINT023_PASS=21 SPRINT023_FAIL=0`、exit 0。
   - Origin、session、Content-Type、method拒否、callback並行／順次再送、token交換と3 Secret登録の一度限り、
     revoke／Secret削除失敗の `cleanup-required`、値非露出を確認。

4. commit前Secret検査と所有path境界:

   ```bash
   TMPDIR=/private/tmp node scripts/sprint-021-git-safety-test.mjs
   ```

   - `PASS=71 FAIL=0`、exit 0。
   - OAuth JSON、認可コード、access／refresh token、Chatwork token、private key、credential URLを拒否し、
     stdout／stderr／local bare remoteへ値を残さないことを確認。

5. candidate差分と構文:

   ```bash
   git diff --name-only 7d17d2d..fd104a1
   node --check plugins/secretary/skills/chatwork/assets/wizard/common.js
   node --check plugins/secretary/skills/chatwork/assets/wizard/app.js
   node --check plugins/secretary/skills/google-chat/assets/wizard/app.js
   git diff --check
   ```

   - 実装変更は共有wizard 3 asset、digest／overlay inventory、Patch専用fixture／回帰だけ。
   - OAuth module、session guard、Secret処理、保存schema、可視copy、CSS、edition固有conversation／report surfaceの変更0件。

### 実URL／DOM／browser操作

| service | mode | URL | IME確定後の表示ID | 選択ID（前→後） | overflow | 最小操作高 | console |
|---|---|---|---|---|---:|---:|---:|
| Chatwork | desktop 1440×900 | `http://127.0.0.1:18845/?direct=rooms` | `101` | `101,102` → `101,102` | 0 | 48px | 0 |
| Chatwork | mobile 390×844 | 同上 | `101` | `101,102` → `101,102` | 0 | 48px | 0 |
| Chatwork | 200%相当 720×450 | 同上 | `101` | `101,102` → `101,102` | 0 | 48px | 0 |
| Google Chat | desktop 1440×900 | `http://127.0.0.1:18846/?direct=settings-spaces` | `spaces/space-a` | `space-a,space-b` → 同一 | 0 | 44px | 0 |
| Google Chat | mobile 390×844 | 同上 | `spaces/space-a` | `space-a,space-b` → 同一 | 0 | 44px | 0 |
| Google Chat | 200%相当 720×450 | 同上 | `spaces/space-a` | `space-a,space-b` → 同一 | 0 | 44px | 0 |

各画面で次を実行した。

- 先頭2件をcheckboxで選択。
- `compositionstart → input(え) → input(えい) → input(営業) → compositionend → 同値input`。
- composition中: 結果mutation 0、`#app`直下mutation 0、検索input node同一、focus／caret `2/2`。
- compositionend後: 結果mutation 1、全画面mutation 0、営業項目1件へ反映。同値inputでmutation数は1のまま。
- Chatwork: `101` → Backspaceで `10` → 中央挿入 `1X01` → 中央削除 `101` → 全削除。
- Google Chat: `space-a` → Backspaceで `space-` → 中央挿入 `spaXce-a` → 中央削除 `space-a` → 全削除。
- 全入力で検索input node、focus、caretを保持。途中挿入は結果0件、削除後は対象1件、全削除後は全件を再表示。
- 検索inputからTab移動し、Chatworkは最初のcheckbox、Google Chatは「選択をすべて外す」へ移動。
- 「次へ」から取得間隔画面へ進み、「戻る」で選択画面へ戻っても選択2 IDを保持。

### スクリーンショット

- `docs/evidence/sprint-035-patch-001/chatwork-desktop.png`
- `docs/evidence/sprint-035-patch-001/chatwork-mobile.png`
- `docs/evidence/sprint-035-patch-001/chatwork-200pct.png`
- `docs/evidence/sprint-035-patch-001/google-chat-desktop.png`
- `docs/evidence/sprint-035-patch-001/google-chat-mobile.png`
- `docs/evidence/sprint-035-patch-001/google-chat-200pct.png`

目視でも、切れ、重なり、横overflow、押せない操作はなかった。mobileでは一覧とCTAが1列に並び、
200%相当でも検索欄、checkbox、details、戻る／進むが画面幅内に収まった。

## 受入基準ごとの判定

1. **6条件の検索継続:** PASS。両wizard × 3表示条件で実DOM操作。
2. **日本語IME:** PASS。composition中の結果／全画面render 0、確定後だけ絞り込み、input node／focus／未確定値を保持。
3. **英数字／Backspace／途中挿入／全削除:** PASS。値、caret、結果IDを全条件で記録。
4. **非表示を往復する選択保持:** PASS。2 IDを選択し、1件表示／0件表示／全件再表示後も同一2 ID。
5. **composition中render 0:** PASS。独立MutationObserverとPatch専用29 assertの両方で確認。
6. **overflow／操作不能／focus／例外／console:** PASS。6条件すべて0件、操作対象44px以上。
7. **既存境界:** PASS。OAuth／session／Secret／SPACE限定／cancel／保存の専用回帰が合格、対象module差分0。
8. **Patch／既存browser／共通core／edition回帰:** PASS。引き渡し統合9/9、独立browser 6/6。
9. **Yasashii同期candidate／inventory:** PASS。candidate `fd104a1`、共有3 asset、digest inventoryを確認。edition固有4面の変更0。
10. **external not-run:** PASS。Chatwork API、Google OAuth／API、Secret、Actions、remote writeはすべて `not-run`。

## 合格した項目

- [product] IME composition中の全画面再描画抑止と確定後反映。
- [product] 英数字、Backspace、中央挿入／削除、全削除のfocus／caret／結果整合。
- [product] 検索で一時非表示になるcheckbox選択IDの保持。
- [product] Chatwork／Google Chatの共通実装とdesktop／mobile／200%の表示・操作性。
- [product] OAuth／session／Secret／SPACE／cancel／edition境界の無回帰。

## 不合格の項目

なし。

## バグ／finding一覧

| # | 重要度 | 対象区分 | 内容 | 合否への影響 |
|---|---|---|---|---|
| 1 | Minor | verification-infra | progress記載の `/wizard?direct=rooms` と `/google-chat.html?direct=settings-spaces` は今回の起動scriptでは `Not found`。実際のfixture URLは `/?direct=...`。 | なし。root URLで実DOM評価を完了 |
| 2 | Minor | verification-infra | `sprint-035-patch-001-ime-test.mjs` の変更asset限定検査は `git diff HEAD` を使うため、commit済みcandidateでは空集合を検査して自明にPASSする。 | なし。Evaluatorが `7d17d2d..fd104a1` の実差分を別途確認 |
| 3 | Minor | verification-infra | 追加確認で実行した旧 `sprint-023-regression.sh` 全体は、現Agentic READMEにYasashii時代のcopyを要求する既知の旧assertを内包しexit 1。Patch引き渡しsuiteではなく、該当session／OAuth製品test自体は21/21で合格。 | なし。製品回帰ではなく旧wrapper期待値の不整合 |

## 改善提案

- progressのfixture URLを起動scriptの実URL `/?direct=...` に合わせる。
- 変更asset限定検査は `HEAD` ではなく、引数で渡すbase commitとcandidate commitの差分を検査する。
- 旧Sprint wrapperのREADME／copy assertをAgentic edition対応にするか、現行のedition-aware gateへ明示的に置き換える。

上記はいずれも検証基盤の改善であり、今回確認した製品挙動の欠陥ではない。自動修正ループの条件にはしない。

## Generator への指示

なし。製品修正は不要。

## 残課題・未実施

- OSの日本語IME候補window自体は撮影していない。契約safe harborどおり、compositionイベント列とDOM状態で確認した。
- 実Chatwork API、Google OAuth／API、Repository Secret、GitHub Actions、remote writeは本PatchのNon-scopeとして `not-run`。

## Evaluator 自己レビュー

- 閾値と合否は一致しているか: yes
- 各PASSに証拠があるか: yes
- 未検証項目をPASS扱いしていないか: yes
- FAIL / incomplete の理由は着手時点の契約・rubricに存在する基準か: yes（FAILなし）
- 要求した証跡は契約・rubricに列挙された証拠形式の範囲内か: yes
- 各finding・各バグに対象区分を付けたか: yes
- rubricが厳しすぎる・このプロダクトに合わない疑いはないか: n-a
- 分類根拠: 製品findingは0件。3件はいずれもfixture URL／自動検査base／旧wrapper期待値という検証基盤側の問題で、製品PASSを覆さない。
- 実装やコード修正へ越境していないか: yes
- Generatorの自己評価を判定根拠として流用していないか: yes
- 変更diffと独立fixture／敵対ケースで確認したか: yes
