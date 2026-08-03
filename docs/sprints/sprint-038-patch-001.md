# Sprint 038 Patch 001 — Harness 0.5.1互換とSecretary 0.9.1リリース

- Type: micro
- Risk: standard（配布versionと外部Harness互換参照を更新するが、Secretaryの会話・保存・外部write動作は変更しない）
- 依存: `sprint-038` done。Agentic Harness `0.5.1` のpublic release commit `747a8fbd06000144ca7e27330bf1d32495475fe0` が確認済み。
- 主眼: public Agentic Secretaryを `0.9.1` として一意に構成し、別配布のAgentic Harness `0.5.1` を正確に案内・検査する。

## 背景とmicro判定

Agentic SecretaryはHarness本体を同梱せず、edition metadata、build案内、README、互換検査から
別pluginとして導入済みかを確認する。Harness `0.5.1` 公開後も現行candidateは `0.5.0` と旧commitを参照している。
変更はこの互換参照と同一release surfaceに閉じ、既存の決定的回帰とonline compatibility checkで保護されているためmicroとする。

## 外から見える成果

- public Agentic Secretaryのcurrent releaseが `0.9.1` で一致する。
- build案内と互換診断がAgentic Harness `0.5.1` および完全commit
  `747a8fbd06000144ca7e27330bf1d32495475fe0` を参照する。
- Harnessは従来どおり別pluginであり、Secretary内へコード、custom agent、設定を同梱しない。

## Scope

### A. Agentic Secretary 0.9.1 candidate

- current Claude marketplace、Claude／Codex plugin manifest、CHANGELOG先頭、current release gateを `0.9.1` で一致させる。
- `0.9.1` entryはHarness `0.5.1` 互換参照の更新であり、Secretaryの利用者workspace migrationを要求しないことを示す。
- current candidateを検査するfixture／assertだけを `0.9.1` へ更新し、過去releaseをcurrent扱いする旧assertを残さない。

### B. Harness 0.5.1互換参照

- `plugins/secretary/edition.json` のHarness versionを `0.5.1`、observed full commitを
  `747a8fbd06000144ca7e27330bf1d32495475fe0` とする。
- `plugins/secretary/skills/build/SKILL.md` と `README.md` の対応version、repository、host別install／entry案内を同じ正本へ揃える。
- local regressionと `scripts/check-harness-compat-online.mjs` が、公開先のversion、完全commit、必要な配布surfaceを同じ期待値で検査する。
- Claude CodeとCodexの既存install ID／entry差を維持し、片方の手順へ統一しない。

### C. 配布境界

- Agentic Secretary内へAgentic Harness本体、Harnessのagents／skills／commands、Luna custom agent TOML、runtime config生成処理を追加しない。
- `/Users/taisei/workspace/agentic-harness`、private edition、installed cache、利用者workspace、実Yasashii repoを変更しない。
- Agentic側のEvaluator PASSとrelease完了後、Yasashiiは固定したAgentic Secretary release SHAをoverlay経由で同期し、別Sprint・別評価・別releaseとする。

## Non-scope

- Secretaryの会話契約、保存先、外部connector、update transaction、workspace migrationの変更。
- Harness `custom_agents.enabled`、Luna agent定義、model／effort routingの再実装または同梱。
- `0.9.0`以前のCHANGELOG entry、migration、manifest snapshot、fixture、Sprint／progress／feedback履歴の遡及変更。
- private my-vault版、installed plugin cache、利用者workspace、実Yasashii repoへの反映。
- Evaluator PASS前のpush、tag、GitHub Release、remote publish。

## Acceptance Criteria

1. current marketplace、Claude／Codex manifest、CHANGELOG先頭、current release gateが `0.9.1` で一致する。
2. `edition.json`、build skill、README、互換回帰、online checkがHarness `0.5.1` を参照し、observed commitを完全長
   `747a8fbd06000144ca7e27330bf1d32495475fe0` として一致検査する。
3. Claude Code／Codexのrepository、marketplace、install ID、explicit entryは各hostの既存契約を維持する。
4. plugin配布対象にHarness本体またはLuna custom agent定義が追加されず、Secretaryの導入・更新がHarness設定や利用者workspaceを生成・変更しない。
5. `0.9.0`以前の履歴entry、migration、snapshot、過去Sprint記録の期待値とbytesが不変で、履歴回帰が0 FAILである。
6. local compatibility regression、release integrity／archive／candidate gate、`git diff --check` が0 FAILである。
7. online compatibility checkが公開Agentic Harnessの `0.5.1` と指定full commitを確認する。network未実行をlocal PASSへ読み替えない。
8. private、cache、workspace、実Yasashii、ローカルagentic-harnessの変更が0件である。
9. CHANGELOGまたはrelease記録が「Harnessは別plugin」「workspace migration不要」を明示し、`0.9.1`でSecretary機能が同梱されたとの誤表示がない。
10. 独立Evaluator PASS前のpush／tag／GitHub Releaseが0件で、PASS後の外部releaseはOrchestratorがcandidate、destination、rollbackを確認して行う。

## 軽量評価

Type: microのため、Evaluatorは次の3項目だけを各5点満点、閾値5で採点する。1項目でも5未満ならFAIL。

1. 機能完全性: Secretary `0.9.1` とHarness `0.5.1`／指定full commitが全current surfaceで一致する。
2. 動作安定性: local／online gateが同じ期待値を検査し、host別install案内と配布境界を維持する。
3. 回帰なし: `0.9.0`履歴、migration、Secretary既存回帰、repo境界に変更がない。

常駐UI変更はないためbrowser screenshotは必須にしない。

## Evidence safe harbor

- 変更path一覧と、version／observed commit／install IDの抽出結果。
- local compatibility regression、release gate、履歴回帰、JSON構文検査、`git diff --check` のcommand、exit code、PASS／FAIL件数。
- online checkの取得repository、解決version、観測full commit、exit code。network未実行または失敗はそのまま記録する。
- Harness／custom agent非同梱scan、private／cache／workspace／Yasashii／ローカルagentic-harness変更0件の対象限定記録。

上記で十分とし、新しいcollector、統一attestation、実service書込みを追加の合格条件にしない。

## Release gateと完了条件

- Generatorは本Patchだけを実装し、`docs/progress/sprint-038-patch-001.md` にcandidate、回帰、online結果、not-runを記録する。
- Evaluatorは別作業単位で同一candidateを評価し、`docs/feedback/sprint-038-patch-001.md` に軽量3項目と証跡を書く。
- Evaluator PASS後だけ、Orchestratorがpublic Agentic Secretary `0.9.1` のpush／PR／merge／tag／releaseを許可済み範囲で行う。
- Agentic release後、Yasashiiはoverlayによる別作業単位へ引き渡す。本PatchのPASSだけでYasashii同期済みとは表示しない。
- Evaluator PASSとOrchestratorのstate更新前に完了扱いにしない。
