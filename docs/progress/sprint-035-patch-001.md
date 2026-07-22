# Sprint 035 Patch 001 — 共通チャットwizardのIME安全な検索

## 着手時点の契約

### 作るもの

- ChatworkとGoogle Chatが共用する検索入力のイベント処理を、IME composition中は画面を再生成せず、確定後に一覧だけ更新する設計へ揃える。
- 英数字、連続入力、Backspace、途中挿入、全削除でも、検索欄のfocus／caretとcheckboxの選択IDを保持する。
- Chatworkのルーム選択、Google Chatの初回スペース選択・設定変更スペース選択を同じ共通処理で保護する。
- Patch専用の自動回帰を追加し、既存のChatwork／Google Chat／共通core／edition境界回帰と合わせて検証する。

### 成功の確認方法

- `compositionstart → 複数input → compositionend` の間に全画面renderが発生しないこと、確定後の表示結果ID、入力値、focus、caret、選択IDを自動回帰で確認する。
- 英数字、Backspace、途中挿入、全削除と、一時的に非表示になった選択済み項目の再表示を自動回帰で確認する。
- synthetic fixtureだけを使って両wizardをlocal browserで操作し、desktop／390px mobile／200%相当の対象導線、console error、横overflowを確認する。
- 実Chatwork／Google API、OAuth、Repository Secret、GitHub Actions、remote writeは実行せず、`not-run` として記録する。

## 着手時点の保護範囲

- Planner所有: `docs/spec.md`、`docs/spec/*.md`、`docs/sprints/sprint-035-patch-001.md`
- オーケストレーター所有: `docs/sprints/state.md`
- repo外: `yasashii-secretary`、`agentic-secretary-my-vault`、`my-vault`
- 既存の未コミット差分は保持し、上記の正本を編集・巻き戻ししない。

## 実装結果

**ステータス:** Generator実装・local自己検証完了。fresh独立Evaluator待ち。

検索欄そのものを入力のたびに作り直さず、結果一覧と識別子だけを部分更新する共通設計へ変更した。
`compositionstart` から `compositionend` までは入力値だけをstateへ保持し、IME確定時に1回だけ一覧を更新する。

### 共通設計

- `common.js` に `bindWizardSearch` を追加した。IME変換中はrenderを抑え、確定後の同値`input`による二重renderも防ぐ。
- Chatworkはルーム一覧、識別子、選択件数だけを更新し、検索inputと画面全体を残す。
- Google Chatは初回スペース選択と設定変更の両方を同じ部分更新関数へ統合した。
- checkboxの選択IDはstateの`Set`を正本にし、検索で非表示になっても保持する。
- OAuth、session、scope、Secret名、保存schema、schedule、可視copy、CSSは変更していない。

## 固定candidateとpath inventory

- 実装candidate commit: `fd104a1488d76624e1d0f8fda0e97d1d40c52657`
- commit message: `[sprint-035-patch-001] IME入力中の共通検索を安定化`
- Yasashii同期対象の共有asset:
  - `plugins/secretary/skills/chatwork/assets/wizard/common.js`
  - `plugins/secretary/skills/chatwork/assets/wizard/app.js`
  - `plugins/secretary/skills/google-chat/assets/wizard/app.js`
- 同期用digest inventory:
  - `scripts/fixtures/sprint-029/yasashii-copy-baseline.json`
  - `adapters/neutral-base.json`
- edition変更宣言: `adapters/agentic-overlay.json`
- Patch回帰・fixture:
  - `scripts/sprint-035-patch-001-ime-test.mjs`
  - `scripts/sprint-035-patch-001-regression.sh`
  - `scripts/start-sprint-035-patch-001-chatwork-fixture.mjs`
- edition固有surface（conversation、diagnosis、report、developer handoff）変更: 0件。
- repo外のYasashii、my-vault、別edition repo変更: 0件。

## 自動回帰

| 対象 | コマンド | 結果 |
|---|---|---:|
| Patch専用IME／検索 | `node scripts/sprint-035-patch-001-ime-test.mjs` | 29 PASS / 0 FAIL |
| Chatwork既存wizard／API | `TMPDIR=/private/tmp bash scripts/sprint-013-regression.sh` | 33 PASS / 0 FAIL（内側35 PASS） |
| Google Chat既存wizard／OAuth／保存 | `TMPDIR=/private/tmp bash scripts/sprint-019-regression.sh` | 12 PASS / 0 FAIL（内側51 PASS） |
| 共通wizard browser式 | `node scripts/sprint-027-browser-expression-test.mjs` | 6 PASS / 0 FAIL |
| Agentic edition境界 | `node scripts/sprint-033-test.mjs` | 20 PASS / 0 FAIL |
| 構文・差分 | `node --check ...`、`git diff --check` | PASS |

統合コマンドは次のとおり。localhost fixtureを使うため、restricted sandboxではloopback bind許可が必要になる。

```bash
TMPDIR=/private/tmp bash scripts/sprint-035-patch-001-regression.sh
```

旧 `sprint-027-regression.sh` のcopy検査には、Agentic版READMEにYasashii時代のGoogle設定文言を要求する既存前提がある。
本Patchでは期待値を追従変更せず、共通browser式回帰と現在のedition境界回帰を直接実行した。

## local browser確認

Browserを使い、合成データだけのloopback fixtureで確認した。console errorは両wizard合計0件。

| wizard | 条件 | URL | 結果 |
|---|---|---|---|
| Chatwork | desktop | `http://127.0.0.1:18835/wizard?direct=rooms` | PASS |
| Chatwork | 390×844 mobile | 同上 | 横overflow 0、最小操作高48px |
| Chatwork | 720×450（200%相当） | 同上 | 横overflow 0、最小操作高48px |
| Google Chat | desktop | `http://127.0.0.1:18836/google-chat.html?direct=settings-spaces` | PASS |
| Google Chat | 390×844 mobile | 同上 | 横overflow 0、最小操作高44px |
| Google Chat | 720×450（200%相当） | 同上 | 横overflow 0、最小操作高44px |

具体操作とDOM結果:

- Chatwork: 選択ID `101,102` を保持したまま `営業` で結果ID `101`。`sale` の中央へ `X` を挿入して
  `saXle`、caret `3/3`、focus保持。全削除後は全件を再表示し、選択IDは `101,102` のまま。
- Google Chat: 選択ID `spaces/space-a,spaces/space-b` を保持したまま `営業` で結果ID
  `spaces/space-a`。`plan` の中央へ `X` を挿入して `plXan`、caret `3/3`、focus保持。
  全削除後は3件を再表示し、選択IDは2件のまま。
- Patch自動回帰では `compositionstart → え → えい → 営業 → compositionend` を両fixtureで再現し、
  composition中render 0回、確定後1回、focus／caret／結果ID／選択IDを検査した。

画面証跡は `/private/tmp/sprint-035-patch-001-browser/` の
`chatwork-{desktop,mobile,200pct-equivalent}.png` と
`google-chat-{desktop,mobile,200pct-equivalent}.png` に保存した。これは一時領域のため、Evaluatorは必要に応じて再取得する。

## 起動方法

Chatwork:

```bash
TMPDIR=/private/tmp node scripts/start-sprint-035-patch-001-chatwork-fixture.mjs 18835
```

Google Chat:

```bash
TMPDIR=/private/tmp node scripts/start-sprint-020-wizard-fixture.mjs 18836
```

## Evaluator確認シナリオ

1. 両URLで2件選択状態から日本語compositionを開始し、変換中に検索input nodeが交換されないことを確認する。
2. 確定後に一覧だけが更新され、focus、caret、入力値、選択IDが保持されることを確認する。
3. 英数字、Backspace、中央挿入、全削除を行い、表示結果IDとstateの選択IDを照合する。
4. desktop、390px、200%相当で横overflow、操作不能、console errorが0件か確認する。
5. 専用回帰、Chatwork、Google Chat、共通browser式、edition境界回帰を実行する。

## 既知事項と外部gate

- Google Chatの部分DOM更新後、Browserのlocatorが1回だけtimeoutした。直後の新しいDOM取得と直接操作では
  正しい入力値・結果・focusを確認でき、console errorは0件だった。製品例外ではなくBrowser操作側の一時的なlocator失効として記録する。
- 実Chatwork API、Google OAuth／API、Repository Secret、GitHub Actions、remote push、releaseはすべて `not-run`。
- synthetic／local browserのPASSを、実接続の成功には読み替えない。

## Generator自己評価

| 軸 | 評価 | 根拠 |
|---|---:|---|
| 完成度 | 5/5 | ChatworkとGoogle Chatの初回・設定変更を共通設計で保護 |
| 安定性 | 5/5 | 専用29件、既存Chatwork／Google Chat、edition回帰が0 FAIL |
| UI品質 | 5/5 | 可視copy／CSS不変、6条件でoverflow・console error 0 |
| 独自性 | 4/5 | wizard別hackを作らず共通composition controllerへ集約 |
| エラー処理 | 5/5 | IME二重input抑止、空検索、非表示選択の復元を回帰化 |
| 回帰保護 | 5/5 | 値・composition・focus／caret・結果ID・選択IDを検査 |

実装とGenerator自己検証は完了した。Sprint完了判定はfresh独立EvaluatorとOrchestratorへ委ねる。
