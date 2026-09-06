# Sprint 050 — Project Clarity最終E2Eと全回帰

- Type: main
- Risk: high（全モード、両host、Xmind MCP／local write gate、2 Repo、既存master、fixed handoffを統合評価する）
- 依存: `sprint-049` done
- 含む機能: F64〜F80
- 主眼: 同一public candidateでprimary 250、CLX 20、XV 4、4 E2E、既存master回帰を実行し、public source PASSを固定する。
- Target Case IDs: `ALL_PRIMARY_CASE_IDS`（250）、`ALL_COLLABORATION_CASE_IDS`（20）、`ALL_VISUAL_PROVIDER_CASE_IDS`（4）、E2E-001〜E2E-004
- Case Definition: [clarity-acceptance-cases.md](../spec/clarity-acceptance-cases.md)

## Scope

1. Sprint 041〜048で割り当てたprimary 250 case、Sprint 049 CLX 20件、Sprint 043 XV 4件の全再実行。
2. E2E-001 Standalone→Secretary link、E2E-002 匿名CRM導入PJ fixture、E2E-003 Driftキラー、E2E-004 Morning Brief。
3. Claude Code／Codex別live、Standalone／generic Secretary-local／Linked／Portfolio、Xmind OFF／ON、MCP-first resolver、承認付きlocal fallback。
4. existing master regression、clean checkout、Git-free archive、manifest／inventory／Secret／handoff gate。
5. accepted public SHA／digest／common path／adapter seam／excluded／protected／rollbackの最終候補を算出する。
6. E2E-002は4象限＋将来アイデアと同等branch／area／Itemの匿名fixtureで行う。実顧客fixture、提供PDF、提供Xmindはpublic repoへcopyせず、private my-vault版の別Harnessで再実行する。

## Acceptance Criteria

1. registryのprimary 250、CLX 20、XV 4がそれぞれunique・欠落・extra・割当重複0で実行され、primary／CLXの既存ID／意味／割当が不変で、本契約Acceptance Criteriaの未実行0件、Critical全PASS、Highに主要欠落0である。
2. E2E-001〜004が同一candidateでPASSし、cross-root write、Hook loop、Decision誤確定、task自動作成0件である。
3. Claude Code／Codexを別々にlive検証し、未検証surfaceをverifiedへ昇格しない。
4. public default Xmind OFFと隔離fixtureのONがPASSする。ON時はcapable MCPが`mcp-selected`で常に第1優先、MCP不可／失敗は`fallback-approval-required`・local write 0、承認後だけ`local-selected-after-approval`、拒否／cancelは`stopped`・write 0となる。cloud／localのcreate／update、network、credit／課金、external writeは対象と予想影響を示した別確認なしに実行しない。
5. Xmind MCP、承認済みlocal `.xmind`、Mermaidは左上 🟢 定着・検証／安定している／`#16A34A`、右上 🔵 実行待ち／あとは進めるだけ／`#2563EB`、左下 🟡 暫定実装・要再確認／注意して確認する／`#D97706`、右下 🔴 設計・意思決定／人間の判断が必要／`#DC2626`、上軸「決まっている」／下軸「まだ決まっていない」を一致させ、色だけに依存しない。
6. existing master、Clarity全回帰、clean checkout、Git-free archive、manifest／inventory／Secret scanが0 FAILである。
7. public sourceにprivate／Yasashii固有実装0件で、固定handoff候補のprotected pathとdigestが再現する。
8. push、tag、Release、marketplace、installed cache、Mac mini、実downstream write、外部connector writeが0件である。
9. offline／source public PASS、adapter contract PASS、real Xmind external-liveのverified／NOT-RUN、release／cache／loaded version／downstream未実行を分けて報告する。isolated fakeをreal providerのverifiedに昇格しない。

## Non-scope

- private／Yasashiiへの実適用・評価、external publish、cache更新、Mac mini、Xmind MCPの無許可live。

## Verification scope（着手時に固定）

- registry JSONを機械読込してprimary=250／unique=250、CLX=20／unique=20、XV=4／unique=4と、group間duplicate／missing／extra 0を確認し、そのcase集合だけを全実行する。
- 4 E2E、両host live、4 mode、MCP-first adapter、承認済みlocal Xmind、fixed visual、2 Repo canary、clean／archive、existing masterを同一candidateで行う。real Xmind external-liveはその時点の明示承認がある場合だけ行う。
- Fable静的レビュー、追加collector、統一attestationを合格条件にしない。

### Evidence safe harbor

- case registry coverage report（primary 250／CLX 20／XV 4）、case ID別PASS／FAIL／conditional NOT-RUN、Critical／High集計。
- E2E step／command／URLまたはhost interaction／generated files／screenshot（visual対象）／before-after snapshot。
- suite command／exit／counts、candidate SHA／digest／file count、host／provider status、resolver／approval interaction、handoff digest、external／local write 0 snapshot。

## 完了条件

fresh独立EvaluatorがC19〜C24と既存該当rubricを満たし、4 E2E・全回帰をPASSした後だけ、Orchestratorが
public source Sprintをdoneにする。固定handoffをprivate／Yasashiiの別Harnessへ実際に渡す操作は次の別phaseである。
