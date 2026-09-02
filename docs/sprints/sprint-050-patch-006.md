# Sprint 050 Patch 006 — canonical first fileのstate.md限定256 KiB読取

- Type: micro
- Risk: high（読取対象は1経路に限定されるが、Secret非露出とfilesystem封じ込めの安全境界を扱う）
- Base Sprint: `sprint-050`
- 依存: `sprint-050-patch-003` done、`sprint-050-patch-004` done、`sprint-050-patch-005` done
- 対象機能: F73, F74, F80
- 主眼: development-pointerの「最初に読むファイル」が正確に`docs/sprints/state.md`のときだけ、canonical Repo observationが既存metadata上限256 KiBまで安全に読み、その他のfirst fileは64 KiB上限を維持する。

## 分類と理由

本Patchは`Type: micro`とする。変更は同一CLIから使われる同一canonical Repo observationのfirst-file読取に閉じ、既存自動回帰`scripts/sprint-050-patch-003-test.mjs`がこの面のstatus、daily、weekly、Portfolio、安全な未確認理由を直接通している。Clarity init scanner、Current ID parser、他のfirst file、配布や下流同期へは広げない。

Mac miniのinstalled private版でancestor symlink対応がPASSしたことは、`sprint-050-patch-003`の境界が実機で機能したupstream evidenceとして扱う。一方、そのinstalled private版は現行publicのHarness authoritative scannerを含まない古い版である。一般scanが2 MiBを使い切った報告を現行scannerのFAIL証拠にせず、本Patchでscannerを再設計しない。

現行publicの`scanRepositoryImpl()`はHarness authoritative reserved laneをgeneric laneより先に確保し、巨大stateのCurrent bundleをSprint 050 Patch 005回帰で取得できている。この面は製品変更ではなく回帰確認だけとする。

## ゴール

canonical Repoが有効で、development-pointerの最初に読むファイルが正確に`docs/sprints/state.md`を指す場合、64 KiBを超えて256 KiB以下の安全なstateをcanonicalの現在根拠としてread-only観測できるようにする。その他のfirst fileと従来のSecret、binary、symlink、root外、unsafe境界は変えない。

## 含む変更

- [ ] 最初に読むファイルの解決値が正確に`docs/sprints/state.md`の場合だけ、既存のcanonical metadata上限256 KiBを適用する。
- [ ] 上記以外のfirst fileは64 KiB上限を維持し、64 KiB超過を`file-too-large`のまま扱う。
- [ ] 256 KiBを超える`docs/sprints/state.md`は`file-too-large`でfail closedとし、既存の理由付きfallback／未確認表示を維持する。
- [ ] 既存のcanonical Repo observation回帰に、対象stateの境界値と、他file／安全境界のnegative controlを追加する。新しいcase registryや検証基盤は作らない。
- [ ] 既存Windows native CIが同じcandidateの対象回帰を因果的に実行し、platform固有のpath／安全性に回帰がないことを確認できる状態を保つ。既存結線で実行される場合はworkflowを変更しない。

## 不変の安全境界

1. `docs/sprints/state.md`への例外は、相対pathの解決値が正確にその文字列である場合だけとする。`./docs/sprints/state.md`、case違い、backslash表記、追加segment、別名fileを同値扱いしない。
2. sensitive name、Secret-like content、binary、NUL、symlink／junction、absolute path、traversal、root外、missing、directory、unreadableの既存拒否と理由は維持する。state指定はこれらを追越しない。
3. 読取ったstate本文の全文、Secret、absolute local pathをworkspace、Clarity canonical、log、candidate、Evidenceへ複製しない。既存のdigestとboundedな観測結果の意味を広げない。
4. canonical Repo observationはread-onlyで、成功・拒否・fallbackの全経路で`changed:false`、canonical write、Git write、filesystem write、network call、external provider writeを0件に保つ。dirty／staged／untracked、HEAD、branch、remote、existing fileは不変とする。
5. Sprint 050 Patch 003のancestor alias／physical identity、一般working rootの既存拒否、root自身／root内symlink、alias差替えのfail-closedを維持する。
6. Windowsでも同じrepo-relative指定と安全境界を保つ。Windows風文字列を別OSで通した結果だけでWindows verifiedにしない。

## 受け入れ基準（Evaluatorが検証する）

1. 正確に`docs/sprints/state.md`を指す安全なfirst fileは、64 KiB超から256 KiBまで本文を読み取り、`inspected:true`、実際のbyte数、非機密digestを返す。194,857-byte fixtureと256 KiBちょうどの境界値で確認する。
2. 256 KiBを1 byte超える`docs/sprints/state.md`は本文を読まず`file-too-large`となり、availability／freshness／reasonは既存の安全なfallback／未確認契約を維持する。完全coverage、Current、PASSを推測しない。
3. `README.md`等のその他first fileは64 KiBちょうどまで読めるが、64 KiBを1 byte超過すると従来どおり`file-too-large`となる。不変の安全境界1の類似pathは256 KiB例外を受けない。
4. 256 KiB以下のstateでもSecret-like content、binary／NUL、symlink／junction、unsafe path、unreadableがあれば既存理由で拒否し、本文・値・参照先を出力しない。root外canaryとSecret canaryは入出力・tracked file・Evidenceへ露出せず不変である。
5. status、daily、weekly、Portfolioは同じcanonical observationを用い、対象stateを読める場合は同じsource revision／first-file digest／freshnessに収束する。読めない場合は同じ未確認理由を保ち、workspace snapshotだけで最新／aligned／no driftを断定しない。
6. 全positive／negative fixtureで`changed:false`、canonical／filesystem／Git／network／external provider write 0件、dirty／staged／untracked、HEAD、branch、remote、existing file、external canary不変である。
7. `scripts/sprint-050-patch-003-test.mjs`の既存CF／AR意味と回帰数を広げず、上記境界値matrixをfocused回帰として実行し、既存Clarity回帰とともに0 FAILとなる。新しいprimary／CLX／XV／CF／AR／HS／SR case ID、feature割当、registry件数は追加・変更しない。
8. 現行publicのHarness authoritative scannerは製品変更0件のまま、Sprint 050 Patch 005の巨大state／Current bundle／authoritative-before-generic回帰をPASSする。installed private版の過去の2 MiB打切りは現行public scannerのFAILとして採点しない。
9. 同じproduct／test candidateに因果する既存Windows native CIでfocused回帰、関連Clarity回帰、既存Windows安全回帰が0 FAILとなる。因果runがない限りWindows verifiedへ昇格せず、過去run、別SHA、別OSの結果を流用しない。

## Verification scope（着手時に固定）

- OS一時directory内のsynthetic development-pointer／canonical Git Repoで、first fileを正確な`docs/sprints/state.md`にし、64 KiB超ぎ、194,857 bytes、256 KiBちょうど、256 KiB＋1 byteを実行する。安全な値は実際に読めた結果、上限超過は本文非読取の理由を記録する。
- その他first fileの64 KiB／64 KiB＋1 byte、state類似path、Secret、binary／NUL、root内symlink、root外／traversal、unreadable、ancestor alias／physicalをnegative／回帰fixtureとする。
- focused入口は既存`scripts/sprint-050-patch-003-test.mjs`とする。必要なsubcaseは既存case内またはスクリプト内の補助回帰とし、`docs/spec/clarity-acceptance*.md`のcase registryを増やさない。
- 関連回帰は`node scripts/sprint-050-patch-005-test.mjs`を使い、現行scannerのauthoritative lane、Current bundle、generic、ancestor alias、Secret／path境界が0 product FAILであることを確認する。Mac上のWindows専用NOT-RUNはWindows PASSに数えない。
- Windowsは既存`.github/workflows/windows-recording-regression.yml`の`windows-native` jobで同じcandidateに因果する結果を使う。既存結線がfocused入口を含む場合はworkflow／jobを変更せず、新しいjob、workflow、collector、attestationを作らない。

### Evidence safe harbor

- focused回帰のcommand、exit code、fixture class、対象relative path、file size／applied limit、`inspected`または拒否reason、bytes read、digest／canary非露出の結果。
- status／daily／weekly／Portfolioのsource kind、availability、freshness、first-file resultと、before／after filesystem／Git snapshot、`changed:false`、write／network件数0。
- `scripts/sprint-050-patch-005-test.mjs`の実行結果と、現行scanner製品fileの意図しない差分0件の確認。
- 因果的なWindows native CIのworkflow／job／run ID、candidate SHA、OS／Node、focused／関連回帰のPASS／FAIL／NOT-RUN、external operation境界。

上記で十分とする。新しいcollector、統一attestation、実顧客data、実Repo apply、実provider、新しいcase registry、全Clarity suiteの再実行、private／Yasashii同期、release／installを追加条件にしない。

## Non-scope

- `scanRepositoryImpl()`、Harness authoritative reserved lane、generic laneの順序／budget／candidate bundle／state構造抽出の再設計。
- Current IDの曖昧表記、注釈、大文字小文字、非標準ID、複数候補を新しく受理するparser拡張。
- stateの256 KiB上限と他first fileの64 KiB上限の撤廃、任意fileの上限拡大、全Repo／全履歴の無制限読取。
- Secret／binary／symlink／junction／root外／unsafe path／permissionの拒否緩和、任意Markdownの万能Secret parser。
- `docs/spec/clarity-acceptance.md`、`docs/spec/clarity-acceptance-cases.md`、既存rubric、primary／CLX／XV／CF／AR／HS／SRのID・意味・Severity・割当・件数の変更。
- cacheの直接編集、installed private版への上書き、Mac miniの実workspace／実Repoへのapply、実顧客dataの読取・書込み。
- private my-vault／Yasashiiのsource・spec・state・progress・feedback変更、同期、適用、独立評価。public独立PASS後に別Harnessでprivate my-vault、次にYasashiiへ展開する。
- version bump、CHANGELOG、manifest、tag、merge、GitHub Release、Marketplace、install／reinstall、cache、new session、loaded version、release準備。
- Xmind MCP、local `.xmind`、connector、network provider、credit／課金、新しいexternal write。

## 完了条件

Generatorは本micro-patchだけを実装し、対応progressに変更file、対象pathと上限matrix、negative、focused／関連回帰、Windows因果run待ちまたは結果、書込み0件を記録する。

Evaluatorは別の独立作業単位で同じcandidateを評価する。`Type: micro`の軽量評価として機能完全性、動作安定性、回帰なしの3基準だけを採点し、回帰なし5/5を必須とする。受け入れ基準の未実行、安全境界の違反、因果なしのWindows verified昇格が1件でもあればPASSにしない。Orchestratorが`docs/sprints/state.md`に結果を記録した後だけ完了扱いにできる。

public独立PASS後も、private my-vaultへの同期、次のYasashii同期、それぞれの独立評価、release／installは別Harness／別phaseとし、本PatchのPASSに含めない。
