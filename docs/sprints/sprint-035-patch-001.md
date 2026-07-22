# Sprint 035 Patch 001 — 共通チャットwizardのIME安全な検索

- Type: regular patch
- Risk: standard（共有wizardの入力・一覧描画を変更するが、OAuth、同期、保存schema、外部writeは変更しない）
- 主眼: Chatwork／Google Chatの検索欄で日本語IME変換を中断せず、focus、caret、既存選択を保ったまま一覧を絞り込めるようにする。
- 依存: sprint-035 done-by-user-decision。`agentic-secretary` を共通coreの実装正本とし、対応するYasashii Patchは本Patchの固定candidateを同期する。

## 背景

両wizardの検索入力は同じ画面描画経路を使う。現在は入力イベントごとに一覧と検索欄を含む画面全体を再描画するため、
focus／caretの復元があっても、日本語IMEのcomposition中に変換セッションを壊す可能性がある。
ChatworkとGoogle Chatの両方を調査し、同じ原因がある面は共有coreで一度だけ直す。

## 外から見える成果

利用者はChatworkのルーム一覧とGoogle Chatの通常スペース一覧を、日本語IMEでも英数字でも自然に検索できる。
検索語を直したり途中へ文字を挿入しても入力位置が飛ばず、絞り込み前に選んだcheckboxは保持される。

## Scope

- Chatwork／Google Chatで共有するwizardの検索入力、一覧絞り込み、focus／caret復元、checkbox選択保持を調査・修正する。
- composition中は検索欄を含む画面全体を入力イベントごとに再生成せず、確定後の検索結果へ安全に反映する。
- 日本語IMEだけに特化せず、英数字、Backspace、連続入力、途中挿入、検索語の全削除を同じ契約で扱う。
- ChatworkとGoogle Chatで同じ挙動を使い、片方だけの分岐修正やedition別のwizard複製を作らない。
- 既存のOAuth、loopback session、Secret非露出、SPACE／DM境界、選択確定、cancel 0変更、responsive／accessibilityを回帰保護する。
- Yasashiiへ同期できる固定candidateと共有asset inventoryをprogressへ引き渡す。

## Non-scope

- my-vault固有の接続済み判定、room／space discovery、config／workflow adapter。
- wizard step、可視copy、色、OAuth scope、保存schema、履歴形式、同期scheduleの変更。
- Chatwork API、Google OAuth／API、Repository Secret、GitHub Actions、remote push、release。
- yasashii固有copy／identity／配布metadata／repo-owned docsの変更。
- 新しい統一collector、attestation、approval manifest、外部署名の作成。

## 受入基準

1. Chatworkのルーム選択とGoogle Chatの通常スペース選択を、desktop、mobile、200%表示の3条件で実ブラウザ操作し、各条件で検索入力が継続できる。
2. 各wizardで日本語IMEのcomposition開始、変換中の複数input、候補確定を再現し、composition中に検索欄を含む画面全体が再生成されず、未確定文字列とfocusが失われない。確定後は確定文字列で一覧が絞り込まれる。
3. 各wizardで英数字入力、連続入力、Backspace、途中挿入、検索語の全削除を行い、入力値、focus、caret位置が意図した位置に保たれ、結果一覧が検索条件と一致する。
4. 検索前に複数のcheckboxを選択し、選択対象が一時的に非表示になる検索と再表示を行っても選択状態が保持される。絞り込み操作だけで選択解除、重複選択、別項目への選択移動が起きない。
5. composition中の各inputで全画面renderを行わないことを、ブラウザ挙動と自動回帰の両方で確認する。最適化の方法そのものや特定の内部関数名は合格条件にしない。
6. 6条件（2 wizard × desktop／mobile／200%）で、横overflow、操作不能、focus消失、未処理例外、console errorが0件である。
7. Chatwork／Google ChatのDOM、可視copy、OAuth scope、session／CSRF境界、Secret非露出、SPACE限定、cancel 0変更、保存結果はPatch開始時の契約を維持する。
8. Patch専用のIME／検索回帰と既存の両wizard browser回帰、共通core回帰、edition境界回帰が0 FAILである。assertは入力値・composition状態・focus／caret・絞り込み結果・選択IDを検証し、壊れやすい全文文字列一致だけに依存しない。
9. Yasashiiへ同期する共有wizard assetの対象とcandidate commitが明記され、edition固有surfaceに変更がないことをpath inventoryで確認する。
10. 実Chatwork／Google API、OAuth、Secret、Actions、remote writeは0件で `not-run` と表示し、synthetic／local browserの成功をlive接続成功へ読み替えない。

## 評価シナリオ

1. 各wizardで項目を2件以上選択してから、日本語を未確定のまま複数回変換し、確定後の結果と選択保持を確認する。
2. 各wizardで英数字を入力し、caretを文字列途中へ移動して挿入・削除し、値と結果が一致することを確認する。
3. 選択済み項目が検索で消える語と再表示される語を往復し、選択IDが変わらないことを確認する。
4. desktop、390px相当mobile、200%表示でTab移動、検索、checkbox操作、全解除、戻る／進むを行い、consoleを確認する。
5. Patch対象外のOAuth／session／保存／cancel負ケースとedition境界回帰を実行する。

## 証跡のsafe harbor

- 実行command、終了コード、assert数、対象candidate commit、変更path一覧。
- 6条件の実URL、DOM操作記録、入力値、compositionイベント順、focus element、selectionStart／selectionEnd、表示結果ID、選択ID。
- desktop／mobile／200%の各wizard screenshot。IME候補window自体の画像化は必須にせず、compositionイベントとDOM状態の記録でよい。
- browser console error件数、横overflow、既存wizard／共通core／edition回帰の結果。
- 共有asset inventoryとedition固有surfaceの開始前後digest。
- 上記を満たせば、新しいcollector、統一証跡schema、approval manifest、外部署名を追加の必須条件にしない。

## External live gate

本Patchはsynthetic fixtureとlocal browserで完結する。実Chatwork API、Google OAuth／API、Repository Secret、
GitHub Actions、remote push、releaseは行わない。必要になった場合は対象、副作用、cleanupを示した別の明示確認を得る。
