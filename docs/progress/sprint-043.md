# Sprint 043: Markdown／Mermaid投影とXmind provider

**ステータス:** Generator実装完了、Evaluator待ち

## 実装したこと

- canonical Clarity Stateから、`overview.md`、`attention.md`、`matrix.md`と、`quadrant.mmd`、`structure.mmd`、`dependencies.mmd`、`state-flow.mmd`を決定的に生成する`clarity project`を追加した。同じStateではbyteとdigestが同一で、Item ID由来の小さなjitterにより同じ象限内の重なりを抑える。
- Mermaid象限はq1右上、q2左上、q3左下、q4右下とし、「決まっている／まだ決まっていない」の軸を固定した。4象限すべてにemoji、label、意味文、色を埋め、色だけに依存しない。mindmap構文を使えない場合はflowchartへfallbackし、rendererを実行できない場合もraw `.mmd`とMarkdownを保持して`verified: false`を返す。
- Xmind設定をpublic既定OFFとし、`xmind-setting --enabled on|off`で明示的にON／再OFFできるようにした。設定とruntime capabilityを分離したresolverは、`mcp-selected`、`fallback-approval-required`、`local-selected-after-approval`、`stopped`を返し、providerごとにcapability、priority、selected、reason、verifiedを表示する。
- XmindがONでcreate／read／update／色・配置を扱えるconnected MCPがある場合は、local指定時を含めXmind MCPを必ず第1優先にする。MCP adapterはcreate／read／updateのrequest／response envelopeを固定し、必須2 Sheetと4象限visualをrequestへ付与する。実MCPは呼ばず、isolated fakeだけを評価したため`verified: false`である。
- local `.xmind`は第2優先とした。previewはMCP不使用理由、target、create/update、既存Sheet／branch／entryへの影響、開いたmapの再読込注意、auth／credit見込み、approval digestを返す。preview、拒否、取消、無回答、古い／欠落digestはwrite 0件で、同じpreviewへの明示承認後だけ書き込む。最初からlocal指定でも同じgateを通る。
- local archiveは既知のXMind Zen JSON ZIP構造として、`content.json`、`metadata.json`、`manifest.json`を決定的なZIPへ格納する。マトリクスとProject構造の2 managed Sheet、stable Item ID、座標、色、意味文を持たせ、既存の無関係Sheet、managed Sheet直下の無関係branch、象限内の深い無関係branch、未知ZIP entry、metadata／manifestの未知fieldを保持する。
- archive validatorはZIP entry、JSON、必須2 Sheet、Item ID、visualを内部検査する。ただし自作validatorの成功を実Xmindで開ける証明とはせず、常に`verified: false`、`openability: not-verified-with-xmind-app`と分離した。fixtureは実形式に合わせた展開済みXMind Zen JSON構造で、実顧客dataではなく匿名CRMだけを使う。
- Xmind側の変更は`xmind-propose`でproposalを返すだけで、承認前と拒否／取消時はcanonical State／Eventを変更しない。明示承認時だけ既存Clarity Eventへ対応付け、Stateが変わっていればstale proposalとして止める。
- `clarity` Skillへ投影、provider優先順位、local approval、安全境界、正直な未検証表示の手順を追加した。master回帰はSprint 043 wrapperを入口にし、Sprint 042／041の直接回帰も同時に実行する。

## 実装しなかったこと

実Xmind MCP external-live、実Xmind App／CLI起動、実利用者pathへのlocal `.xmind` write、network、credit消費、connector、push、release、cache、downstream writeは行っていない。HookはSprint 044、Secretary統合、link／sync、実Drift comparator、Portfolio、packagingは後続Sprintのため実装していない。Sprint 019既知debtも変更していない。

## 30 case coverage

| Case群 | 対象 | PASS | FAIL | 条件付きNOT-RUN |
|---|---:|---:|---:|---:|
| Markdown／Mermaid | MM-001〜010 | 10 | 0 | 0 |
| Xmind | XM-001〜015 | 14 | 0 | 1 |
| Idempotency | IM-005 | 1 | 0 | 0 |
| Visual provider | XV-001〜004 | 4 | 0 | 0 |
| 合計 | registryの正確な30 ID | 29 | 0 | 1 |

条件付きNOT-RUNは`XM-007`の実Xmind MCP connected create／read／update external-liveだけである。代替PASSにはしていない。fake MCP境界は`XV-002`で別にPASSし、`verified: false`をassertした。他のAcceptance未実行は0件。registryはprimary 26とvisual 4を直接parseし、missing 0、duplicate 0、extra 0である。

## 起動・手動CLI

server／test URLはない。CLI製品である。Evaluatorは実顧客repoや実Xmindを使わず、OS temp directory内のfixtureで確認する。

```bash
# previewはwrite 0
node plugins/secretary/scripts/clarity.mjs project <repo-root> --json

# Markdown／raw Mermaidだけをroot内へ出力
node plugins/secretary/scripts/clarity.mjs project <repo-root> --apply --json

# Xmindは既定OFF。利用するときだけ明示ON
node plugins/secretary/scripts/clarity.mjs xmind-setting <repo-root> --enabled on --json
node plugins/secretary/scripts/clarity.mjs xmind-resolve <repo-root> --capabilities-json '<JSON>' --json

# localは最初に必ずpreview
node plugins/secretary/scripts/clarity.mjs xmind-local <repo-root> --target .clarity/maps/clarity.xmind --json

# preview内容を人間が確認した場合だけ、同じapprovalDigestを渡す
node plugins/secretary/scripts/clarity.mjs xmind-local <repo-root> --target .clarity/maps/clarity.xmind --apply --approval-digest <sha256> --json

# 明示的に再OFF
node plugins/secretary/scripts/clarity.mjs xmind-setting <repo-root> --enabled off --json
```

## 実行結果

- `node scripts/sprint-043-test.mjs` → `SPRINT043_CASE_PASS=29 FAIL=0 NOT_RUN=1 TOTAL=30`、`SPRINT043_REGISTRY_MISSING=0 DUPLICATE=0 EXTRA=0`。NOT-RUNは`XM-007`だけ。
- `bash scripts/sprint-043-regression.sh` → `SPRINT043_REGRESSION_PASS=6 FAIL=0 CASES=30 EXTERNAL_LIVE_NOT_RUN=1`。
- 同wrapper内`bash scripts/sprint-042-regression.sh` → `SPRINT042_CASE_PASS=35 FAIL=0 TOTAL=35`、registry差分0。
- 同wrapper内`bash scripts/sprint-041-regression.sh` → `SPRINT041_CASE_PASS=43 FAIL=0 TOTAL=43`。
- `python3 scripts/check-release-integrity.py` → `PASS release integrity: manifests and CHANGELOG are consistent`。
- `bash scripts/agentic-regression.sh` → release integrity成功後、既存Sprint 013のloopback server起動がsandboxの`listen EPERM 127.0.0.1`で停止。外部通信禁止を維持し、sandbox外へ昇格していない。Sprint 043／042／041は上記専用wrapperでgreenであり、full masterをgreenとは報告しない。
- `git diff --check` → exit 0。

## Self-evaluation

- C19: canonical Stateから全投影を生成し、stable Item ID／座標／byte、mindmap failure fallback、raw保持、proposal/Event境界を専用caseで確認した。
- C20: Attention Markdownと固定4象限visualに、emoji、label、意味文、色を同時に保持した。日本語表示とrenderer非依存fallbackも確認した。
- C23: public既定OFF、設定とcapability分離、capable connected MCPの絶対優先、全provider state、fake MCP contract、local第2優先を確認した。external-liveだけは未検証のままである。
- C24: root境界、preview／拒否／取消／無回答の0-write、approval digest、既存map保持、Secret非保存、retry byte同一、Sprint 041／042直接回帰を確認した。

## Known issues／正直な未検証

- `XM-007`の実Xmind MCP external-liveは未承認のため条件付きNOT-RUN。create／read／update、実際の色／配置、credit／auth結果は確認していない。
- local `.xmind`は既知のXMind Zen JSON ZIP内部構造を検査済みだが、実Xmind App／CLIでのopenabilityは未検証で`verified: false`。内部validatorのPASSを「Xmindで開ける」とは主張しない。
- Mermaid rendererは実行していない。raw `.mmd`、固定style指定、意味文、Markdown fallbackを検査し、render結果は`verified: false`である。
- full masterは既存loopback bind制限で完走していない。Sprint 043の製品failureには分類せず、専用回帰と直接回帰の結果を根拠とする。

## Evaluatorの具体的な確認手順

1. `bash scripts/sprint-043-regression.sh`を実行し、30 IDが順番どおり29 PASS／0 FAIL／`XM-007`だけNOT-RUN、registry missing／duplicate／extra 0であることを確認する。続けてSprint 042の35件、041の43件が直接PASSすることを確認する。
2. 同じfixtureで`project --apply`を2回実行し、7出力fileのhash／bytesが同一、2回目`changed: false`であることを確認する。各Itemの座標がItem IDから安定し、固定範囲内で重複しないことを確認する。
3. `quadrant.mmd`でq1右上／q2左上／q3左下／q4右下、上下軸、4色、emoji、label、意味文を確認する。mindmap failureを注入し、Project構造だけflowchartへfallbackしてMarkdown／他raw `.mmd`が残ることを確認する。
4. 新規Clarity fixtureでXmind設定がOFF、ON、再OFFとなることをCLIで確認する。ON＋capable connected MCPではlocal指定でもpriority 1のMCPだけがselectedになることを確認する。
5. isolated fake transportでMCP create／read／updateを1回ずつ実行し、request envelopeのcontract、必須2 Sheet、固定visual、response境界、`verified: false`を確認する。実MCPへ置換しない。
6. 展開済みXMind Zen fixtureをOS temp内でpackし、local preview前後のtarget hashが同一であることを確認する。拒否／取消／無回答／digest欠落でも0-writeであることを確認する。テスト内のapproval simulationは製品gate検証であり、実fallback承認には扱わない。
7. temp fixtureだけでapproval digest一致を模擬し、2 managed Sheet、stable Item ID、色／座標／意味文、匿名CRM Sheet、root直下branch、象限内branch、unknown ZIP entry、metadata／manifest保持を読み戻す。retryでarchive bytes同一、2回目`changed: false`を確認する。
8. validatorの`structurallyValid: true`と同時に`verified: false`、`openability: not-verified-with-xmind-app`であることを確認する。実Xmind App／CLIを起動しない。
9. Xmind edit proposal作成前後と拒否後の`.clarity/state.json` bytesが同一でEvent増加0、明示承認後だけ対応するEventが1件増えることを確認する。

## 外部副作用

- external write: **0件**
- 実利用者pathへの`.xmind` write: **0件**
- network／external connector／実Xmind MCP／実Xmind App・CLI: **0回**
- auth／credit消費: **0回／0 credit**
- push／release／cache／downstream write: **0件**
- `.xmind` approval writeを含む製品fixture writeは、すべてテストが作成したOS temp directory内だけ。repoへ置いたのは匿名・展開済みJSON fixtureで、実顧客/PDF/提供Xmindは含めていない。
