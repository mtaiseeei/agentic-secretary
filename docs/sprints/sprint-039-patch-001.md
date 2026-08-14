# Sprint 039 Patch 001 — renameのlocal Git checkpointとcommit失敗rollback

- Type: regular patch
- Risk: high（確認済みrenameがworkspace、user-scope guidance、利用者選択コンテンツ、Git履歴を1 transactionで扱うため）
- 主眼: rename成功の必須工程として製品所有path限定のlocal Git checkpointを成立させ、commit段階を含むどの失敗でもworkspace／user-scope／Gitを開始前へ戻す。
- 依存: `sprint-039` done。Agentic製品candidate `3e08eb6d377392440e753bd5073c73d1d63399b6` は当時の契約で独立Evaluator PASS済みだが、fresh Yasashii下流評価が共通renameのcommit段階欠落を再現した。
- UI差分: browser画面の追加はない。name SkillとCLI/libraryのrename transaction、結果表示、回帰、下流handoffを対象とする。

## 背景とPatch判定

Sprint 039契約はcommit失敗時のrollbackを要求していた。しかし受入済み共通CLI/libraryにはrename後の
local Git checkpoint工程がなく、`rename-apply --fail-at commit` は失敗を注入せずexit 0で終了し、
改名済みのdirty workspaceを残す。この状態では「commit失敗でrollbackする」という回帰が、
実際には存在しない工程を検査したことになる。

欠陥はYasashii固有copyやoverlayではなく3 editionが利用する共通renameの意味にあるため、
public Agentic共通コアで修正する。既存Sprint 039を遡及改訂せず通常Patchに分け、Agenticでの
fresh独立Evaluator PASS後だけ新しい完全SHA／common digestを下流へ渡す。

microにはしない。workspace file、user-scope file、Git HEAD／index／working treeを跨ぐ新しい必須工程と、
これまで存在しなかったcommit failure injectionを追加し、checkout／Git-free archiveの両配布面へ
回帰を広げるためである。

## 外から見える成果

利用者が影響を確認して秘書名を変更すると、製品所有のworkspace fileが変わる場合は、
その変更だけを記録したlocal Git checkpointまで完了して初めて成功になる。pushはしない。

checkpointを安全に作れない場合は「改名できた」と表示せず、workspaceとuser-scopeの変更をすべて戻す。
stable identity、過去の作者・履歴、開始前aliases、未選択の利用者コンテンツ、利用者が元から持つGit変更は
開始前のまま残る。

## Scope

### A. rename transactionへlocal checkpointを入れる

- renameはread-only preview、分類別の影響提示、明示確認、所有file更新、構文／整合確認、local checkpoint、完了確認の順で扱う。preview／確認前のwriteは0件とする。
- canonical workspace内の製品所有fileが1件以上変わる場合、local checkpointは`required`である。workspace側の変更が0件で、有効なuser-scope managed blockだけを更新する操作に限り`not-applicable`とし、理由と対象を表示する。必須checkpointを任意扱いや暗黙のskipへ格下げしない。
- checkpoint前に、canonical workspaceの実体path、edition marker、必要正本、Git top-levelが同じ正確なrootを指すことを再検証する。親repo、nested別repo、path文字列の前方一致、cwd、未検証symlinkを代替rootにしない。
- local commitへ含めるのは今回renameが変更したworkspace内の製品所有pathだけとする。利用者が開始前から持つstage／unstaged／untracked変更、未選択B、C履歴、D所有不明、別製品fileを含めない。
- 成功時のlocal commitは1件とし、件名／本文へ旧名、新名、利用者コンテンツ本文を不要に再掲しない。remote、fetch、push、force、branch、tagを操作せず、Git repoを新規初期化しない。

### B. commit段階を含む完全rollback

- transaction開始時に、対象workspace file、選択B、有効なuser-scope managed block、identity、registry、aliases、Git HEAD／index／working treeの必要なpre-stateを、製品所有範囲を越えず復元できる形で保持する。
- file書込み、path guard、symlink／junction、構文／整合確認、stage、commit、commit後確認のどこかが失敗したら、今回のrename変更だけを取り消す。開始前から存在するGit変更や別commitを上書きしない。
- commitが作成される前の失敗では部分stage／dirty renameを残さない。commit作成直後の確認失敗では今回所有commitだけを取り消し、HEAD、index、working tree、対象fileを開始前へ戻す。
- rollback後はstable ID、過去author／履歴、開始前aliases、未選択／選択済み利用者コンテンツ、未作成／disabled routingを開始前snapshotと一致させる。backup、一時file、lock、部分commit、旧名／新名混在を残さない。
- rollback自体を完了できない場合は成功と表示せず、実際に残った範囲、手動で確認する正確なpath、Git状態を示す。通常のcommit failure fixtureは完全rollbackを必須とし、この例外表示で合格させない。
- failure injectionの`commit`段階は実在するcheckpoint工程へ到達してから決定的に失敗し、CLIは非0で終了する。未知のfailure pointは受理せず、`commit`を無視したexit 0を禁止する。

### C. renameの既存意味と境界を維持する

- A=current configは製品所有field／managed blockだけ、B=user contentは明示選択だけを変更する。C=historical authorは保持して成功時だけ旧名をaliasへ追加し、D=unknown conflictは変更しない。file全体、repo全体、同じ文字列の全出現をblind replacementしない。
- rename確認をrouting enable確認へ拡張しない。managed block未作成／disabledのhostは変更せず、有効なblockだけをtransaction対象にする。
- 同名、alias衝突、registry欠落／移動／重複、反対edition、traversal、symlink／junction、read-onlyはcheckpointより前に安全停止し、file／Git変更0件とする。
- 成功後のretry／同じrenameの再実行は追加file変更、alias重複、追加commitを作らない。失敗後のretryはcleanなtransactionとして1回だけ完了する。

### D. 共通コアと下流handoffの再固定

- checkpointとrollbackはAgentic／Yasashii／private my-vaultで同じ意味を持つ共通実装に置き、edition別の安全分岐を作らない。新しい共通helperを追加する場合はhandoffの`commonPaths`へ明示列挙する。
- 既存のdownstream handoffはSprint 039 candidate `3e08eb6d377392440e753bd5073c73d1d63399b6` とcommon digest `7498d3550734ba63b689463f01e2a52e16d2ce3f8eb31cebead16aef2181f883` の履歴として保持する。これを修正版の同期入力と表示しない。
- Generatorは修正candidateとhandoff候補を引き渡せるが、完全SHA／common digestを「accepted」「fixed downstream input」として公開しない。fresh独立Evaluator PASSとstate更新後だけ、cleanな同一candidateから新しい完全SHA／digestを発行する。
- PASS前は実Yasashii repo、private repo、installed cache、利用者workspace、Mac miniへ反映しない。下流は新しい固定handoffを入力に、それぞれ別Sprint／独立評価を行う。
- Yasashii下流で別に観測されたrelease-integrityのSkill count問題は本Patchのpublic product scopeへ含めない。ただしpublic Agenticの正式inventoryは16 Skills、user-facing report surfaceはname Skillを含む21面として完全列挙し、未知項目への差替えを拒否する。件数だけを緩和して通さない。

### E. checkout／archiveで再現できる回帰

- Patch専用回帰は、clean checkoutと同じ配布対象bytesのGit-free archiveから実行できる。archive自身に`.git`を要求せず、local checkpointの実動作は隔離した一時Git fixtureで確認する。
- 独立fixtureは少なくとも、通常成功、確認拒否、workspace変更ありのrequired checkpoint、user-scope-onlyのnot-applicable、開始前dirty／staged／untracked、別root／nested repo、commit前失敗、commit failure injection、commit後確認失敗、rollback後retryを持つ。
- fixtureごとにfile tree、identity、registry、aliases、選択／未選択B、C／D、有効／disabled user-scope、HEAD、index、working tree、commit件数、remote状態を前後比較する。
- base Sprint 039、formal Skill inventory、report schema、release integrity、secret scan、checkout／archive masterを回帰させる。下流固有release-integrity問題を再現するためのfixtureや基準は追加しない。

## Non-scope

- 英語名の候補規則、stable ID schema、AI author表示、名前routing文法、canonical registry schema、onboarding／name Skillの再設計。
- A〜D分類の意味変更、利用者コンテンツの自動選択、履歴author書換え、global search-and-replace。
- user-scope routingの自動enable、managed block以外のHOME内容変更、実HOMEを使う評価。
- remote commit、push、fetch、PR、merge、tag、GitHub Release、marketplace公開、plugin install／update、Mac mini同期。
- 実Yasashii／private my-vault repoへの同期、private固有Notion／vault Skill、下流固有copy／style／README／docsの変更。
- Yasashii側release-integrityのSkill count問題の修正、public formal inventoryを曖昧な最小件数へ緩和すること。
- Git履歴書換え、既存commitのamend、利用者の既存変更を含む一括commit、Git repoの自動作成。
- 新しいcollector、統一attestation、approval manifest、外部署名、実host／実HOME証拠。

## Acceptance Criteria

1. read-only previewはA〜D、checkpointの`required`／`not-applicable`、対象workspace root、所有path、非対象、rollback、pushなしを示し、明示確認前のworkspace／HOME／Git変更が0件である。
2. workspace所有fileが変わる成功caseは、canonical実体path、edition、Git top-levelが一致する正確なrootで、今回の所有pathだけを含むlocal commitを1件作る。既存stage／unstaged／untracked変更と対象外pathは開始前のままである。
3. 成功commitのsubject／bodyに旧名、新名、合成利用者コンテンツ本文が0件で、remote／fetch／push／force／branch／tag操作が0件である。
4. workspace側変更0件のuser-scope-only caseはcheckpointを`not-applicable`と正確に表示し、commitを作らない。workspace変更があるcaseを同状態へ誤分類しない。
5. `rename-apply --fail-at commit`または同等の正式entrypointはcheckpoint工程で決定的に失敗して非0終了し、identity、registry、aliases、A、選択B、有効user-scope、HEAD、index、working treeが開始前snapshotと一致する。dirty rename、部分stage、部分commit、backup、一時fileが0件である。
6. commit前の各主要failure pointとcommit後確認失敗でも今回変更だけをrollbackし、stable ID、過去author／履歴、開始前aliases、未選択B、C、D、未作成／disabled routing、利用者の既存Git変更を保持する。
7. commit failure後のretryは1件の所有commitで正常完了し、alias、file、commitを重複させない。成功後の同じrename再実行は追加差分／追加commit 0件である。
8. 別root、親repo、nested別repo、traversal、symlink／junction、read-only、反対edition、registry異常、同名、alias衝突は安全停止し、workspace／HOME／Git／remote副作用0件である。
9. Aは製品所有fieldだけ、明示選択Bだけを更新し、Cは保持＋成功時alias、Dは不変である。同じfile内の顧客名、自由記述、codeを含むblind replacement 0件を前後bytesで確認する。
10. managed block未作成／disabledのroutingはrenameで有効化されずbytes不変。有効なblockだけがtransactionとrollbackへ含まれる。
11. public Agenticの正式inventoryが16 Skills、report surfaceがname Skillを含む明示21面でPASSし、既知surfaceをunknownへ差し替えて総数を保つnegativeはunexpected／missingを検出してFAILする。下流固有release-integrity countをpublic基準へ混入させない。
12. Patch専用回帰とcommit failure fixtureがclean checkout／Git-free archiveの両方で0 FAILであり、archive内に`.git`やrepo監査evidenceを混ぜない。
13. Sprint 039、onboarding、settings、identity／author、resolver、routing、rename、Windows保存互換、secret scan、formal validator、release integrity、checkout／archive masterの関係回帰が0 FAILである。
14. handoff inventoryは修正に必要な全common pathと除外／保護pathを明示し、実装candidateのfull SHA／common digestを取得できる。fresh独立Evaluator PASS前はそれをaccepted／fixed downstream inputとして公開せず、旧SHA／digestも修正版と表示しない。
15. 実Yasashii／private repo、実HOME、cache、利用者workspace、Mac mini、remote、外部service、releaseへのwriteが0件である。
16. fresh独立Evaluatorが同一candidateを実操作し、C2・C5・C6・C9・C10・C12〜C16の該当閾値を満たし、product finding 0件でPASSする。PASS後だけオーケストレーターがclean candidateの新しい完全SHA／common digestを下流handoffとして固定する。

## 必須回帰

- Patch専用success／failure matrix: required checkpoint、not-applicable、確認拒否、既存dirty／stage／untracked保持、別root／nested repo拒否、commit前／commit／commit後failure、rollback、retry、再実行差分0。
- Sprint 039のidentity、author、managed block、resolver、routing正負case、A〜D分類、P1〜P4回帰。
- formal Codex plugin inventory 16 Skills、report-schema 21面、unknown差替えnegative、release integrity、secret scan。
- checkoutと同じ配布対象bytesのGit-free archiveでPatch専用suiteとarchive master。
- `git diff --check`。

想定command名は次でよい。実装上同等の正式commandへ整理した場合はprogressに対応関係を書く。

- `node scripts/sprint-039-patch-001-test.mjs`
- `bash scripts/sprint-039-patch-001-regression.sh`
- `bash scripts/sprint-039-regression.sh`
- `node scripts/agentic-codex-plugin-test.mjs --root .`
- `python3 scripts/check-report-schema.py --plugin-root plugins/secretary`
- `python3 scripts/check-release-integrity.py --root .`
- `node scripts/master-release-gate.mjs --mode archive --root <git-free-archive>`

## Evidence safe harbor

- 固定開始candidate、評価candidate SHA、clean checkout、Git-free archive、共通path tree digest。
- 各caseのconfirmation、checkpoint status、canonical realpath、Git top-level、所有path一覧、commit subject／body、commit件数、push／remote操作0件。
- file tree、identity、registry、aliases、選択／未選択B、C／D、user-scope、HEAD、index、working treeの前後digest。利用者本文そのものは証拠へ複製しない。
- `commit` failure injectionの到達記録、非0 exit、rollback結果、残存backup／一時file／lock／部分commit 0件、retry結果。
- formal 16 Skills／21 surfacesの明示inventoryとunknown差替えnegative結果。
- checkout／archiveのcommand、exit、PASS／FAIL、`.git`不在、既存回帰、external write `not-run`。
- Evaluator PASS後にだけ発行したAgentic完全SHA／common digestと、それ以前の候補をdownstream inputへ使っていない記録。

上記で十分とし、実HOME、実下流同期、Windows native再実行、新しいcollector、統一attestation、
approval manifest、外部署名を追加の合格条件にしない。

## 評価と完了条件

- regular patchのためmicro軽量評価にはしない。Evaluatorは`docs/spec/rubric.md`の適用基準を採点し、C2・C5・C6・C9・C10・C12〜C16のゼロ許容条件をすべて満たす必要がある。
- Generatorは共通product code、必要なhandoff inventory、決定的回帰だけを変更し、`docs/progress/sprint-039-patch-001.md`へ実装、failure matrix、Git snapshot、checkout／archive、formal inventory、not-runを記録する。
- Evaluatorは別のfresh作業単位で同一candidateを実操作し、`docs/feedback/sprint-039-patch-001.md`へ証拠、finding分類、score、判定を書く。Generator自己評価を合否へ流用しない。
- Evaluator PASSとオーケストレーターのstate更新前に完了扱いにせず、新しい固定下流handoff SHA／digestを公開しない。
- PASS後、オーケストレーターがclean candidateから完全SHA／common digestを固定する。Yasashiiとprivate版はその固定値を入力に別Sprint／独立評価し、本Patchだけで同期済み・release可能とは表示しない。
