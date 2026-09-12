# Sprint 058 — Astra向け指示・Skill横断監査と局所整理

- Type: standard
- Risk: medium（複数の会話・routing・保存指示を同時に整合させるため）
- 関連機能: F52、F63、F80

## ゴール

`plugins/secretary/` を正本とする現在有効な指示を横断監査し、現在の依頼を止める矛盾、広すぎるSkill trigger、無条件の大量読込、古い参照、host非互換な手順を、既存の安全境界を保ったまま整理する。利用者が明示した可逆・低リスクな操作と長い読取作業は必要な進捗を伴って完了まで進み、部分失敗は実際の副作用どおりに報告される状態にする。

## 固定前提と許可

- 利用者はこの2repoの指示・Skill監査、必要な局所修正、offline検証、独立評価を明示許可している。同じ開始確認、可逆な編集ごとの確認、影響を受けた既存testの修正確認を重ねない。
- 削除、利用者内容の破壊的上書き、公開、push、認証、権限変更、課金、他者通知、Secret保存、大量操作等の既存確認境界は維持する。
- source versionは`0.13.1`を維持する。installed Harness `0.5.4`は監査資料であり、Secretary editionが宣言するHarness `0.5.1`を推測で変更しない。installed cache、private repo、rootのdirtyな`AGENTS.md`／`CLAUDE.md`／Harness guidance・configは書き換えない。
- 変更したローカル指示fileに対応するconversation／collaboration inventory等のcurrent-content checksumは、現在内容との整合に必要な範囲で更新できる。固定するSHA／digest／provenanceは、過去のaccepted candidate、base、handoff、公開・同期証跡を指し、current-content checksumを古い値のまま残す意味ではない。

## 含む変更

1. Skill description／本文、共通rules・copy、commands／hooks、templates／workspace adapter、生成・同期定義、静的検査と会話fixtureを、実際の到達経路と所有元まで追跡する。既知15項目を全件 `fixed`／`already-correct`／`not-applicable`／`deferred` のいずれかにし、追加発見も含めて「具体的trigger → 現状の結果 → 正しい結果 → source位置 → 対象edition → disposition」を記録する。
2. 現在の明示依頼を古いresume bookmarkより優先する。bookmarkは再開が依頼された時、現在用件に関係する時、または新しい用件が無い時だけ扱い、setup Skillはhost capability確認前にbookmarkを書かず、無関係なbookmarkを上書きしない。router、`memory-care`、`secretary`の参照番号と意味を一致させる。
3. Skill triggerを狭く明確にする。Google／Microsoft／Notionの接続設定、接続済みデータのread-only参照、Chatwork／Google Chatのlive取得・保存済み履歴検索を区別する。public editionに存在しないprivate専用Skillへ送らず、tool unavailable／未確認を「未接続」と推測しない。read-only connector確認では利用者が実際に求めた照会を最初のprobeとして再利用し、同じ問い合わせを診断用と本処理用に重ねない。connector側が使えなくても独立したlocal TODO等は続行する。
4. 共通指示は短い入口と条件付き参照に整理し、leaf Skillが単独で必要とする安全契約は残す。全rules・copy・preferencesの無条件読込、全taskでの同じ説明の再読、read-only長時間作業における中間連絡の全面禁止を解消する。進捗連絡は作業を止める承認要求にしない。
5. 明示された単一の可逆設定やmemory保存は既存のrun-once契約どおり進める。`settings`／`memory-care`間で再確認を復活させず、永続化前に`saved`と表示しない。journal／checkpoint等の途中失敗は、成功済み・未完了・再開対象を区別した`partial`とし、再試行で副作用を重複させない。
6. 共通coreとhost adapterの所有を明確にし、Windows対象のleaf root解決・実行案内はBashの`case`／`dirname`を必須にしない。staleなversion、model、host、path、節番号を現在の正本と照合して直すが、runtimeやmigration frameworkを再設計しない。
7. exact文字列の重複を維持するためだけの検査は、正本の存在・到達性と意味シナリオを確認する検査へ必要な範囲で更新する。安全assertを削らず、変更したtrigger、優先順位、run-once、partial、条件付き読込、cross-host root解決を現実的なinstruction scenarioで守る。

## Acceptance Criteria

1. 既知15項目と追加発見の追跡記録が揃い、各修正が有効sourceへ結びつく。未解消項目は理由・影響・後続条件を示し、見つからなかったことや別repo所有を修正済みと表示しない。
2. 「前回の続きがある状態で別の現在依頼」「保存済み履歴を検索」「接続設定」「接続済みデータを読む」「予定とlocal TODOを合わせる」「長いread-only監査」の代表会話が正しいSkill／通常応答へ進み、不要なsetup、bookmark write、重複query、無通信、別フローへの横取りがない。tool unavailableと未接続を区別し、connector失敗で独立したlocal処理を捨てない。
3. 明示された可逆な設定変更とmemory保存は重複確認なしで一度だけ完了し、提案・曖昧入力・既存の高リスク操作は従来の確認前副作用0件を保つ。保存工程の代表失敗は早い`saved`表示をせず、`partial`／`error`とretry対象が実状態に一致する。
4. 共通入口は必要なcontextだけを条件付きで読ませ、leaf単独利用でもprivacy、Secret、no-overwrite、external gate、rollbackの安全条件が欠落しない。Agentic向けの技術的に直接的な表現を維持する。
5. Windowsを含む正式hostのroot解決案内に利用不能なshell前提がなく、参照先・version・sectionが現sourceと整合する。host固有事項はadapterに留まり、共通Skill本文の複製を増やさない。
6. 影響を受けた既存の静的／runtime検査と代表instruction scenarioがofflineで0 FAILとなる。独立Evaluatorが実diff、変更した意味面、既存安全assertの保持を確認し、無関係な全suiteやbrowser UI検証を必須にしない。

## 検証スコープ（着手時に固定）

- 対象: `plugins/secretary/` の有効なSkills、rules／copy、commands／hooks、templates／adapters、生成・同期sourceと、それらを拘束する既存検査。root guidanceとinstalled cacheはread-only比較対象とする。
- 必須シナリオ: 現在依頼とresumeの競合、setup／read／saved searchのrouting、connector unavailableとlocal TODOの分離、可逆設定、明示memory、途中失敗、長いread-only作業、Windows root解決、edition所有境界。
- 証拠形式: 監査表、変更pathと因果、実command／exit／件数、scenarioの入力・route・副作用・応答状態、対象外pathのbefore／after一致。これらで十分とし、新しいcollector、attestation、browser UI、live外部writeを要求しない。

## Non-scope

- 新しい秘書機能、UI、runtime framework、migration、配布version、Harness本体の変更。
- `yasashii-secretary`へのrelease-ready upstream同期、過去のaccepted candidate／base／handoffに属するSHA・digest・provenanceの更新、private版、installed cache、実利用者workspaceへの反映。
- commit、stage、push、PR、tag、Release、plugin install、API／OAuth／connector write。

## 完了条件

局所修正と比例したoffline回帰が揃い、fresh独立Evaluatorが受入基準と既存安全境界を実内容でPASSし、Orchestratorがstateへ結果を記録した場合だけ完了する。
