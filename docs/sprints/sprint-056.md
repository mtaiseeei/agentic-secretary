# Sprint 056 — Sprint 055／Stop Hook修正の0.13.0三版公開とこのMacへの正式導入

- Type: standard
- Risk: high（3 repoのcommit／push／main統合／tag／Releaseと、実Macのplugin導入を含む）
- Candidate version: `0.13.0`
- 公開開始HEAD: Agentic `22cc215f76f8eae889d99715f75c76ba5c1e228b`、private `9b269563dd89f6552b0e382cfad724d378d51579`、Yasashii `b80f5da4b173ec2e3b1c6404e21b29f7d99240c5`
- 含む機能: 受入済みF85〜F87、および受入済み`sprint-044-patch-001`のauthorization境界。新機能は追加しない。

## ゴール

独立PASS済みのSprint 055とSprint 044 Patch 001を同じ公開候補に保持し、Agentic、private my-vault、Yasashiiへ版固有差分を守って適応する。三版のsource candidateを個別に評価した後だけ`0.13.0`として公開し、このMacのCodex／Claude Codeへprivate版を正式経路で反映する。

Sprint 055／Patch 001の実装・評価は完了済みであり、本Sprintで再実装または再判定しない。既存証跡を受入入力として保持し、本Sprintの評価は、受入済みbytesの保持、下流適応、配布整合、公開、導入に限定する。

## 利用者承認と固定前提

- 利用者は「Sprint055とHook修正のcommit→3版公開→このMacへの導入まで進める」ことに「はい」と明示承認した。必要な候補commit、通常push、版適応、mainへの通常統合、新しいtag／Release／artifact、正式plugin導入、Codex／Claude Code両host確認まで同じ許可で進め、再質問しない。
- 破壊的操作、force push、既存tag移動、既存Release／artifact／履歴の上書き・削除は承認されていない。
- 三版のremote latestは`v0.12.0`で、`v0.13.0`は未作成である。F85〜F87の後方互換な機能追加を含むため、Semantic Versioningのminor更新`0.13.0`を第一候補とする。開始入力が変わり一意に解決できない場合は公開前に停止する。
- private／Yasashiiの古いlocal mainはcandidateに使わない。上記remote mainから作った隔離candidateを正本入力とする。
- このMacではCodexとClaude Codeがともにprivate `0.12.0`、enabledである。Claude Codeはproject scopeで、Codexのplugin listはscopeを返さないため未観測scopeを推定しない。両hostの観測済みsource／install contextを含む導入前metadataは`/private/tmp/secretary-056-install-baseline.json`を正本とする。

## 実行順序

### Phase A — source candidate gate

1. **Agentic public**: 現在の作業中差分からSprint 055／Patch 001の承認済み製品・直接回帰・Planner／Generator／Evaluator記録だけを対象別にcommitする。実`.clarity/`、`CLARITY.md`、無関係な既存差分をstage／commitしない。remote mainの開始HEADと現在状態を確認し、通常のGit統合で候補を固定する。
2. Agenticの現行配布面だけを`0.13.0`へ揃える。対象はversion／manifest／marketplace、正本と互換CHANGELOG、release inventory、README／更新案内、既存archive／release検査に直接必要なcurrent-version参照である。過去versionのsnapshot、tag、artifact、fixture、履歴assertは変更しない。
3. Agentic候補は、受入済みSprint 055／Patch 001の最終組合せを保持していること、小規模な直接回帰、構文、release integrity、既存の小さいGit-free archive gateで確認し、fresh独立EvaluatorがPhase Aを判定する。
4. Agentic Phase A PASS後だけ、固定した共通内容をprivateへ差分適応する。privateのCLI／core／Hook／Skillには既存固有差分があるため丸ごと上書きせず、Notion／vault／05-first、private Skills／値／root guidance／Xmind／repo正本を保護する。private `sprint-052`の独立Evaluator PASSまでYasashiiへ進まない。
5. private PASS後だけYasashiiへ差分適応する。YasashiiのCLI／core／projection／Hookは開始時にpublicとbyte一致、Skillはedition差分ありという観測を入力にし、共通面を保ちながら会話copy、identity、README／LICENSE／mapping、overlay、repo正本を保護する。Yasashii `sprint-045`をfresh独立評価する。
6. 各版の候補commit／tree、共通path、adapted path、protected pathを固定する。一版のPASS、過去run、Generator自己評価を他版のPASSへ流用しない。

### Phase B — publication／installation gate

三版すべてのPhase A PASS後だけ開始する。

1. 各検証済みtreeをremote mainへ通常統合してpushする。mainで配布bytesが変わった場合は、関係するPhase A検査を再実行する。
2. remote mainのtree一致を確認後、新しい`v0.13.0` tagとReleaseを各版に作成する。tag、Release source、artifact、manifest／marketplace、CHANGELOGの版と内容を一致させる。途中失敗は版ごとに公開状態を分け、「三版公開済み」とまとめない。
3. private `0.13.0`の公開bytesを導入前metadataに記録されたsource／install contextへ保護付きで反映し、Codex／Claude Codeそれぞれの公式CLIまたはhost提供の正式なplugin再導入経路を使う。cache directoryを直接編集しない。Claude Codeはproject scope／enabled trueを保持し、Codexは観測済みsource／install context／enabled trueを保持して、未観測scopeを断定しない。
4. 実my-vaultの通常sessionは起動しない。公式CLI／host metadataと、利用者本文を読まない隔離読込面で、両hostのplugin ID、source、version、enabled、Skill／Hook構文を確認する。host runtime metadataと利用者本文・記憶・設定を区別し、後者には触れない。
5. 正式導入中に新しいHook trust承認が必要と判明した場合は、自動許可やtrust一括変更を行わず、正式UI／auto-reviewが示した対象と影響をOrchestratorへ返して停止する。

## Acceptance Criteria

1. **受入済み内容の保持（C1/C2/C6）**: Agentic候補がSprint 055のF85〜F87とPatch 001の「Hook出力は承認ではない」境界を同時に保持し、両feedbackのPASS記録を変更・再判定していない。小規模直接回帰は0 FAILである。
2. **0.13.0の一意性（C2/C12）**: 三版の公開済み最高版が`0.12.0`、新tag不存在、今回が機能追加であることから`0.13.0`を一意に使う。各版のcurrent manifest／marketplace／CHANGELOG／inventory／案内／archiveが一致し、旧release bytesと履歴の変更は0件である。
3. **public-firstと段階gate（C5/C6/C13）**: Agentic独立PASS→private独立PASS→Yasashii独立PASS→Phase Bの順を守る。各判定はexact candidate commit／treeに結び付き、一版のPASSを他版へ昇格しない。
4. **private差分適応（C5/C13/C24）**: public固定内容を丸ごと上書きせず、private固有のCLI／core／Hook／Skill差分、Notion／vault／05-first、private Skills／値／root guidance、Xmind、spec／state／progress／feedback／evidence／release判断を保持する。実my-vault本文・記憶・自由記述設定のread／writeは0件である。
5. **Yasashii差分適応（C5/C13/C24）**: public共通面の意味を保持しつつ、Skillのedition差分、会話copy、identity、README／LICENSE／mapping、overlay、spec／state／progress／feedback／evidence／release判断を保持する。同期の未分類変更とprivate値混入は0件である。
6. **比例したPhase A検証（C2/C6）**: 三版で、変更面の構文、Sprint 055／Patch 001相当の小規模直接回帰、必要最小の版固有保護検査、release integrity、既存の小さいGit-free archive gateが0 FAILである。既存検査のversion／hash固定は今回の変更に直接因果するものだけ更新する。
7. **公開の因果性（C5/C12/C13）**: 三版のremote main、`v0.13.0` tag、Release、artifact、manifest／marketplaceがPhase Aで検証したtree／配布内容を指す。force push、tag移動、既存Release／asset上書き、履歴削除は0件である。
8. **このMacへの正式導入（C2/C5/C15）**: private公開artifactと導入元bytesが一致し、Codex／Claude Codeでversion `0.13.0`、enabled true、観測済みsource／install context、Skill／Hook読込可能を、公式CLI／host metadataと隔離読込で別々に確認する。Claude Codeはproject scopeを保持する。Codexはscopeを返さないplugin listの実測をそのまま記録し、projectその他のscopeを推定しない。cache直接編集、trust一括変更、通常my-vault session、利用者本文のread／writeは0件である。
9. **作業中差分と秘密の保護（C5）**: 各repoで今回所有するpathだけをcommitし、開始前dirty／staged／untracked、private値、Secret、他pluginを混ぜない。衝突や所有不明はstash／reset／clean／強制解消せず停止する。
10. **正直な状態報告（C1/C5）**: source PASS、版別adaptation PASS、remote main、tag、Release、artifact、installed metadata、隔離host読込を別状態で記録し、NOT-RUN／失敗／disabled／未確認をlive PASSへ昇格しない。

## 検証スコープ（着手時に固定）

### 必須シナリオ

1. Agentic候補でSprint 055／Patch 001の受入済み最終組合せと2つの小規模直接回帰を確認する。
2. 三版で`0.13.0`の現行配布面、CHANGELOG互換、inventory、Git-free archiveを確認する。
3. privateとYasashiiで共通変更の成立と版固有protected surface不変を別々に確認する。
4. 三版のPhase A PASS後、remote main→tag→Release→artifactの対応を版別に確認する。
5. private公開bytesを正式導入し、Codex／Claude Codeを別々にmetadata／隔離読込で確認する。

### 証拠形式（safe harbor）

- 版ごとの開始HEAD、candidate／main／tag完全SHAとtree、変更path、共通／adapted／protected pathのdigestまたは同等snapshot、実diff。
- 実行command、exit code、PASS／FAIL／NOT-RUN、直接回帰の件数、archive内version／manifest／inventoryの照合結果。
- GitHubのremote main、tag、Release、asset名／digest、source参照、marketplace／manifest version。
- 導入前後のplugin ID、source／install context、version、enabled、復元元、およびCodex／Claude Code別の公式CLI／host metadata・隔離読込結果。scopeはhostが実際に返した場合だけ記録し、Claude Codeのproject scopeとCodexの未観測scopeを区別する。利用者本文、Secret、自由記述設定は証拠へ含めない。

上記で十分とする。新しいrunner、collector、統一evidence schema、attestation、approval manifest、全組合せmatrixを追加条件にしない。
既存rubricは本SprintのPhase A／Bで明示したC1／C2／C5／C6／C12／C13／C15／C24の対象面だけへ適用する。C15はこのMacの現在のCodex／Claude Code導入面の版・source／install context・enabled・隔離読込に限定し、旧4 host完全matrixを要求しない。過去rubricにあるWindows native、full suite、旧release全機能の再実行を本Sprintの追加義務にしない。

## Non-scope

- Sprint 055／044 Patch 001の再実装・再評価、新しいClarity機能、schema、projection、Hook lifecycle、trust modelの変更。
- full Sprint 044（100／128並列）、full Sprint 050、64 actor stress、再帰wrapper、新CI／workflow／runner、全suite、全host matrix。
- Windows nativeは今回必須にしない。OS固有の製品コード変更が必要になった場合はscope changeとして止め、旧Sprint 054のWindows条件を自動で持ち込まない。
- 旧Sprint 050 Patch 007の`awaiting-eval`、旧Sprint 044の記録、旧release／tag／artifact／fixture／評価記録の変更。
- repoの実`.clarity/`／`CLARITY.md`、実my-vault本文・記憶・自由記述設定のread／write、外部チャット通知、実Xmind、他plugin更新。
- cache直接編集、trust一括変更、force push、tag移動、Release／asset上書き、履歴削除。
- `/Users/taisei/workspace/agentic-harness`または解決後に同一となるpathへのreadを含む一切の接触。

## 完了条件

各版のGenerator／Evaluatorは自repoのPhase A候補と証拠だけを記録する。三版のPhase Aが独立PASSした後、OrchestratorがPhase Bを実行・別評価し、公開source／tag／Release／artifact一致とこのMacのCodex／Claude Code正式導入を確認してからだけSprint 056を完了できる。
