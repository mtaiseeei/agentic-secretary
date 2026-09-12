# Sprint 058 progress — Astra instruction audit

## 実装

公開 `agentic-secretary` source（`plugins/secretary/`、manifest 0.13.1）の有効な17 Skills、common rules、Agentic／Yasashii style、workspace templates、runtime collaboration routerを監査し、既存の安全・確認・rollback境界を保った局所修正を行った。

- 現在の依頼をresume bookmarkより先に扱い、resumeは再開要求・関係性・用件欠如のときだけ確認する。無関係なbookmarkは保持し、setup bookmarkはcapability確認後の中断見込み時だけ作成し、作成したものだけclearする。
- Agentic runtime routerでGoogle／Microsoftのread/searchを`secretary`のhost connector read-only handoffへ送り、connect／re-authはsetupへ残した。Chatwork／Google Chatの保存済み履歴とNotion downstreamの所有境界も明示した。routerはSkill選択だけを行い、side effectは0件である。
- dailyで成功／実際のnot connected／未確認／errorを分け、外部connectorが使えなくてもlocal TODOを続ける。指定された外部照会は最初のprobeへ再利用する。
- 明示された単一の可逆設定の同一turn run-once境界は保持し、settingsのsaved宣言をjournal／commit後へ移動した。後段失敗は実影響に沿う`partial`、retryは未完了効果だけとした。明示されたtone／例文は同じturnに反映し、推測する追加内容だけ確認する。
- 全public leafのplugin root案内をNode `path.dirname`／`path.join`と配列引数へ揃えた。空・相対・placeholderはfail-closedで、cwdやhost固有環境変数を推測しない。共通context、style、copy、preferencesは同じplugin実体／workspaceで未変更の間だけ再利用し、変更時は該当fileだけ再読する。
- current-contentを追跡するconversation／collaboration inventory checksumを更新した。accepted candidate、base、handoff、provenanceの固定値、release、installed cache、private repoは変更していない。

## 代表シナリオ

`scripts/sprint-058-test.mjs` は、現在依頼とresume競合、Gmail／Outlook readとGoogle／Microsoft setupの分離、Chatwork／Google Chat保存履歴、対象付き接続診断、Notion downstream handoff、setup bookmark条件、unavailableとnot connected、settings partial、common context、17 leafのWindows-safe root案内、manifest versionの意味を確認する。これはroutingと指示構造のoffline／static checkであり、live LLMや外部connectorの実会話証明ではない。

## 検証

全Nodeまたは間接Node検査は `/private/tmp/astra-secretary-heavy.py` 経由で実行し、最終成功結果は次のとおり。

- `node scripts/sprint-058-test.mjs`: exit 0、`SPRINT058_PASS=8 FAIL=0`、Node 36→36。
- `node scripts/sprint-029-rule-boundary-test.mjs`: exit 0、PASS25／FAIL0／WIZARD5、36→36。
- `node scripts/sprint-049-test.mjs`: exit 0、PASS20／FAIL0、registry欠落・重複・extra 0、side-effect violation 0、36→36。
- `bash scripts/sprint-011-regression.sh`: exit 0、PASS73／FAIL0、36→36。
- `node scripts/sprint-035-test.mjs`: exit 0、PASS15／FAIL0、36→36。
- `node scripts/sprint-032-patch-002-test.mjs`: exit 0、PASS32／FAIL0、36→36。
- `node scripts/sprint-052-secretary-voice-test.mjs`: exit 0、PASS3／FAIL0、36→36。
- `ruby /private/tmp/astra-secretary-frontmatter.rb /Volumes/ExternalSSD/workspace/agentic-secretary`: `RUBY_PSYCH_FRONTMATTER_PASS=17 FAIL=0`。PyYAML版quick validationは依存不在のため`GENERIC_QUICK_VALIDATE=INCOMPLETE`として別記録した。
- parent handoff: `node scripts/sprint-040-test.mjs`: exit 0、`SPRINT040_PASS=15 FAIL=0`。uncertainty保持、内容dedupe、append-only、checkpoint partial→commit-only retry、Secret／path拒否を実runtimeで確認済み。

baselineは Sprint029 の PASS25／FAIL0／WIZARD5、Node 32→32。heavy lock busy exit75は2回発生したが、lockを削除せず軽作業を続け、後で再試行した。この作業でwrapperは16回呼び出した。

## 引き継ぎ

- startup command: `N/A（instruction／runtime CLI audit。UIやdev serverなし）`
- test URL: `N/A`
- canonical audit: `docs/astra-instruction-audit-20260912.md`
- source／installed／公開latestの関係、installed private 0.13.0、source 0.13.1、Harness基準0.5.1と実行環境0.5.4、GitHub release Forbidden／web latest Cache missは監査表に記録した。
- root `AGENTS.md`、`CLAUDE.md`、`docs/harness-guidance.md`、`.harness/config.toml`、`.clarity`、`CLARITY.md`、`docs/sprints/state.md`は保護対象として変更していない。Harness／my-vault所有のseedはdeferredとして記録し、このpublic sourceの修正済みとは扱っていない。
- 独立Evaluatorは実diff、変更した意味面、affected regression、安全assert、未検証のlive範囲を確認する。release、sync、installed cache反映、OAuth、外部write、browser UIは本Sprintの完了条件に含めていない。

## Retry1 — 独立Evaluator追加findingの修正

### 実装内容

- `CONNECTIONS`の接続状態・状況・可否・有無の確認表現を、個別サービスのreadより先に共通接続診断へ送るようにした。
- 明示setupを単独readより先に判定し、Google／Microsoftのsetup結果へ後続readの`followUp`（`order: after-setup`）を保持した。setup完了後に公式connector readへ1回続くことを`secretary/SKILL.md`へ明記した。
- Google Chat／Chatworkの専用導線とrouterの副作用0境界は維持した。
- current-content checksumとして`secretary-router`と`skill-secretary`だけを更新した。固定provenance、root guidance、state／spec／feedbackは変更していない。

### 自己評価（Retry1）

| 基準 | スコア(1-5) | コメント |
|------|------------|---------|
| 機能完全性 | 5 | 接続状態診断、setup優先、setup後read保持、単独read、専用connector導線を検査した。 |
| 動作安定性 | 5 | 変更面のruntime route testとaffected回帰が成功した。 |
| デザイン性 | 4 | UI変更なし。entry指示は段階ロード先と順序を明記した。 |
| 独自性 | 4 | 複合意図を`followUp`の実行順付きroute metadataで表現した。 |
| エラーハンドリング | 5 | setup／readとも副作用0のselection-onlyを保ち、host connectorへの委譲境界を変えていない。 |
| 回帰なし | 5 | Sprint058 route回帰8/0、Sprint049 affected回帰20/0。 |

### 検証

- `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-058-test.mjs`: exit 0、`SPRINT058_PASS=8 FAIL=0 ROUTE_SIDE_EFFECT_VIOLATIONS=0`（Node開始40、終了41）。
- `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-049-test.mjs`: exit 0、`SPRINT049_PASS=20 FAIL=0`、registry／side effect violation 0（Node開始38、終了38）。
- routeの自然文3件と同等Microsoft接続状態診断、既存単独read／setup、Chatwork／Google Chat、各side effect 0を`Sprint058` testで確認した。

### Evaluatorへの引き渡し事項

- 起動方法: `N/A（instruction／runtime CLI audit。UIやdev serverなし）`
- テスト対象URL: `N/A`
- 回帰チェック: `python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-058-test.mjs`、`python3 /private/tmp/astra-secretary-heavy.py node scripts/sprint-049-test.mjs`
- シナリオ: `Googleの接続状態を確認して`／`Microsoftの接続状態を確認して`は`connections-read-only-diagnosis`、`Googleを接続して、予定を見て`は`setup-google`＋`followUp.route=google-read-only-handoff`、`Microsoftを接続してOutlookメールを読んで`は`setup-microsoft`＋`followUp.route=microsoft-read-only-handoff`となり、既存単独read／setupとChatwork／Google Chat専用導線を壊さないこと。

### 既知の課題

- live LLM、host connectorの実接続、OAuth、browser UI、release／cache／downstream反映は契約外で未検証。独立Evaluatorの再評価待ち。
