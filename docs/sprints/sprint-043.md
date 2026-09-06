# Sprint 043 — Markdown／MermaidとXmind projection

- Type: main
- Risk: high（Xmind MCP外部write／credit境界、local `.xmind`書込み、既存map保持を扱う）
- 依存: `sprint-042` done
- 含む機能: F71, F72
- 主眼: canonical Stateを正本に、可読・決定的なprojectionを生成し、Xmind ON／OFFとprovider能力を安全に扱う。
- Target Case IDs: primary MM-001〜MM-010、XM-001〜XM-015、IM-005（正確な26 ID）＋visual provider XV-001〜XV-004（正確な4 IDはregistry JSON）
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## 承認済み前提

- Xmind integrationはAgentic／Yasashii既定OFF、private my-vault既定ON。設定とprovider capabilityは別状態。
- public既定OFFを変えず隔離fixtureで明示ONにする。ON時はconnected／availableかつ必要capabilityを満たすXmind MCPを第1優先、local native `.xmind`を明示承認後の第2優先とする。
- MCP不可／失敗時はlocalへ自動writeせず、理由／対象file／path／create-update／既存影響／auth／credit見込みをpreviewし、明示承認後だけ実行する。拒否／cancel／無回答はwrite 0件。
- cloud map create／update、network、credit／課金、external writeはprovider／対象／予想影響を示した別確認後だけ。ONは課金許可ではない。

## Scope

1. overview、attention、matrix Markdownと、quadrant、structure、dependency、state flow Mermaid。
2. stable coordinate／jitter、Japanese label、syntax failure fallback、raw `.mmd`保持。
3. Xmind settingsとprovider resolver。ON／OFF、capability／priority／selected／reason／verified、`mcp-selected`／`fallback-approval-required`／`local-selected-after-approval`／`stopped`。
4. MCP create／read／update adapter、承認済みlocal native generation／validation、2必須Sheet／同等map、追加Sheet、stable Item ID。
5. 匿名CRM導入PJ fixtureの4象限＋将来アイデア、同等のbranch／area／Item、既存無関係Sheet／branch保持。
6. 左上 🟢 定着・検証／安定している／`#16A34A`、右上 🔵 実行待ち／あとは進めるだけ／`#2563EB`、左下 🟡 暫定実装・要再確認／注意して確認する／`#D97706`、右下 🔴 設計・意思決定／人間の判断が必要／`#DC2626`、上軸「決まっている」／下軸「まだ決まっていない」、emoji／ラベル／意味文のMCP／local／Mermaid一致。
7. Xmind editからproposal生成、承認／拒否までcanonical State不変。実external-live未承認はadapter contract／isolated fakeで境界を評価し、verifiedと表示しない。

## Acceptance Criteria

1. primary Target Case 26件とXV 4件が適用条件どおりPASSまたは外部許可依存conditional NOT-RUNとなり、本契約Acceptance Criteriaの未実行0件である。承認がないreal external-liveだけをNOT-RUNにでき、provider resolver／fixed visual／承認前write 0は省略できない。
2. 同じStateからMarkdown／Mermaid／選択されたXmind providerが安定生成され、projectionであることを明示する。
3. Agentic default OFF、明示ON、再OFFと、MCP／localのcapability／priority／selected／reason／verifiedを区別し、Clarity coreは継続する。capable MCPがON時に常に第1優先である。
4. MCP不可／失敗時は`fallback-approval-required`で止まり、local対象／影響／auth／credit見込みをpreviewする。承認後だけ`local-selected-after-approval`でcreate／updateし、拒否／cancelは`stopped`・write 0である。local明示指定も同じgateを守る。
5. Xmind MCPと承認済みlocal `.xmind`は2必須Sheet／同等map、stable ID、匿名fixtureの4象限／将来アイデアと同等のbranch／area／Itemを持つ。fixed visualはMCP／local／Mermaidで配置・4色・軸・文字情報が一致し、色だけに依存しない。
6. Xmind editはproposalだけを作り、承認前State変更0、拒否時変更0である。
7. cloud／local create／update、network、credit、external writeを勝手に実行せず、`XM-007`のreal live未実行時は理由とverified=falseを明記する。Hook内Xmind生成／networkは0件。
8. 同じStateからのmap render retryはbyte同一で、projection／Eventを重複させない（`IM-005`）。

## Non-scope

- Xmind serviceへの無許可live操作、Xmindを正本にする同期、Hook内map生成／network、downstream default適用。
- 実顧客fixture、提供PDF、提供Xmindのpublic repoへのcopyとpublic PASSへの利用。これらはprivate my-vault版の別Harnessで再実行する。

## Verification scope（着手時に固定）

- Xmind OFF／ON、MCP connected／disabled／capability不足／failure fixture、local available／unavailable／auth／credit fixture、approval／reject／cancel、native file、匿名CRM導入PJ fixture、既存Xmind編集fixture。
- Target primary 26、XV 4、Sprint 041／042 projection直接回帰。MCP liveは別確認が無ければconditional NOT-RUNだが、adapter contract／isolated fake、truthful status、local approval gateを省略しない。

### Evidence safe harbor

- generated Markdown／`.mmd`／Mermaid render／style・accessibility inspection／承認済みnative `.xmind`、hash、syntax／native validator、Sheet／node／stable ID／4-color inventory。
- resolver state、provider capability／selected／reason／verified、MCP adapter request／response、preview／approval interaction、proposal前後State、既存branch前後比較、external／local write 0 snapshot。新しいcollector／attestationは求めない。

## 完了条件

Evaluatorは生成物を実際に開ける形式で検査し、C20／C23／C24とTarget Caseを評価する。
