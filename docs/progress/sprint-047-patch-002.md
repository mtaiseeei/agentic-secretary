# Sprint 047 Patch 002 Generator進捗 — Windows並行burstのGit identity discovery

- 開始HEAD: `f4d9ed96935f8e80dcfbd023b6caace80ddcb51c`
- 製品candidate commit: `c22ccc3919279b590e4d91ed1b5c7063ed92b98c`
- 製品candidate tree: `0b6a8ab9e3c90cbfbb3dbd593cec925aa93e74f5`
- 対象: `sprint-047-patch-002`（regular patch、Risk high、Model Tier strong）
- 現在地: public Generator実装と比例したlocal回帰が完了。Windows Server 2025／Node 22の因果的GitHub Actions runとfresh独立Evaluator待ち

## 原因と実装結果

- 変更前は1つのroot requestが`git rev-parse --show-toplevel`と`git rev-parse --absolute-git-dir`を順番に実行していた。各Git commandはboundedなintermediary Node runnerを1つ起動するため、64 process burstの1 roundで最大128 Git process＋128 runner processを起動していた。Windowsで各processが同じ5秒枠を競合し、正しいlocal Repoでもproduct `timeout`になる増幅が根本原因だった。
- 2回の観測を、read-onlyの`git rev-parse --path-format=absolute --show-toplevel --absolute-git-dir --git-common-dir` 1回へ集約した。1 requestあたり1 Git＋1 runnerになり、timeoutは5,000 ms、bufferは1 MiBのままで、延長、retry、batch、stagger、prewarm、共有cacheは追加していない。
- 出力はCRLFを安全に正規化したうえで、改行終端された絶対path 3行だけを受理する。空、欠落、余分な行、NUL、裸のCR、相対path、32 KiB超の行、buffer超過、timeout、実行不能、Repo markerがある状態のunexpected非0を成功またはnon-Gitへ丸めず停止する。
- Git top-level、Git dir、common Git dirは通常directoryであることとfilesystem identityを確認する。通常Repoの`.git` directory、linked worktreeの`.git` control fileと`commondir`の関係を照合し、別Repoの出力を拒否する。
- path文字列の一致はidentity判定に使わない。長いWindows pathと8.3短縮名のように表記が異なっても、device／inode相当、mode、kindが同じ物理実体なら同一とする。marker観測も絶対path文字列ではなくrootからのlevelと物理identityで比較する。
- request内は最初のbounded Git観測を再利用し、write直前はroot、alias chain、Git top／dir／common dir、ancestor `.git` marker chain、common `config`、worktree `config.worktree`、Git discovery環境のidentity／digestをfilesystemから再確認する。request境界を越えると必ず新しいGit probeを実行する。親Repo内に新しい子Repoが作られた場合やconfigが変わった場合はwrite前に停止する。
- Git実行は`GIT_TERMINAL_PROMPT=0`、`GIT_OPTIONAL_LOCKS=0`を維持し、network、credential、fetch／pull／providerを起動しない。エラーはabsolute local pathやGit出力を載せないfail-closed codeへ正規化した。

## 変更path

```text
.github/workflows/windows-recording-regression.yml
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/lib/clarity-root.mjs
scripts/lib/sprint-049-inventory.mjs
scripts/sprint-047-patch-002-test.mjs
docs/progress/sprint-047-patch-002.md
```

Planner正本、`docs/sprints/state.md`、feedback、private my-vault、Yasashii、installed cacheは変更していない。

## Focused root identity case

| Case | 結果 | 検証内容 |
|---|---:|---|
| GI-001 | PASS | 1 requestでcombined probe 1回、5,000 ms／1 MiB、prompt／optional lock無効、write 0 |
| GI-002 | PASS | 2 requestでprobe 2回。request外の古いidentity再利用0 |
| GI-003 | PASS | 正当なnon-Git rootを1回で識別しwrite 0 |
| GI-004 | PASS | 空／欠落／余分な行／NUL／相対path／改行欠落／過大行を全て拒否 |
| GI-005 | PASS | injected timeoutをretryせず`timeout`、write／residue 0 |
| GI-006 | PASS | Repo内unexpected非0と実行不能をfail closed |
| GI-007 | PASS | Git dir非directoryと別Repo identityを拒否 |
| GI-008 | PASS | 親Repoとして観測後に子Repoを作る変更をwrite前に検出 |
| GI-009 | PASS | linked worktreeのcommon config変更をwrite前に検出 |
| GI-010 | PASS | CRLF出力でも3 directoryの物理identityを照合 |
| GI-011 | local NOT-RUN／workflow対象 | Windowsの長いpath／8.3短縮名が別表記かつ同一物理実体である場合に受理。macOSは`WINDOWS_8DOT3=NOT-RUN:not-win32` |

各negativeは`.clarity`製品file、Event／Evidence／State、lock／tempへのproduct write 0をbefore／after digestとresidueでassertし、製品Git commandはread-onlyだけに限定した。focused suiteは11 caseに限定し、新collector、schema、archive gate、深い歴史回帰を追加していない。fixtureは338行、runtime差分は266追加／48削除でfixture側が行数上は大きいため、次のdispatch前にこの事実を明示する。増分はmalformed matrixと副作用0の共通assertを含み、追加caseはGI-011までで停止した。

## 実行済み検証

| command／面 | 結果 |
|---|---|
| `node scripts/sprint-047-patch-002-test.mjs` | 11/11 PASS、probe/request 1、timeout 5,000 ms、external write 0、network 0、Windows 8.3はlocal NOT-RUN |
| `node scripts/sprint-050-patch-003-test.mjs` | root／alias positive・negative 21/21 PASS、external write 0、network 0 |
| `node scripts/sprint-047-patch-001-test.mjs` | logical-write隣接回帰23/23 PASS |
| Patch 001 timing | max lock wait 2,189/15,000 ms、margin 12,811 ms。max lease critical 1,044/30,000 ms、margin 28,956 ms |
| `node scripts/sprint-047-test.mjs` | 25/25 PASS、registry missing／duplicate／extra 0 |
| GS-009 local 1 round | CLI 32＋Hook 32、64/64 exit 0、parse／unique／State rebuild 100%、期待delta各32、rebuild前後residue 0 |
| GS-009 local timing | max canonical lock wait 1,441/15,000 ms、margin 13,559 ms。max lease critical 227/30,000 ms、margin 29,773 ms。round 2,066 ms |
| syntax／inventory／workflow／diff | `node --check` 3 file、JSON parse、inventory 20 surface／67 case digest・marker、Ruby YAML parse、`git diff --check`が全てexit 0 |

ローカルGS-009はmacOS仕様どおり1 roundであり、Windows 3 roundやjob全体時間の代用ではない。Windowsでは既存test本体が`process.platform === "win32"`により3 roundを実行する。

## 維持したthreshold／workflow

- Windows workflow: `windows-native`、`windows-2025`、Node 22、`timeout-minutes: 10`、既存stepとfail-fast順序を維持。
- Windows stress: 3 round ×（CLI 32＋Hook 32）、各round 64/64、parse／unique／期待delta／State rebuild 100%、residue 0を維持。
- lock wait上限15,000 ms、lease上限30,000 ms、job上限10分を変更していない。
- root Git identity timeout 5,000 msを変更していない。
- workflowにはP002 syntax／focused stepだけをP001とSprint 047の間へ追加し、因果的に同じcandidateを検査する。

## 起動／Evaluator handoff

server、DOM、UI、test URLはない。CLI／filesystem／Git processが製品surfaceである。

```bash
node scripts/sprint-047-patch-002-test.mjs
node scripts/sprint-050-patch-003-test.mjs
node scripts/sprint-047-patch-001-test.mjs
node scripts/sprint-047-test.mjs
```

Evaluatorはcandidate SHAを固定し、上記4 commandと今回のcandidateに因果するWindows workflow raw resultだけを確認する。WindowsではP002の`WINDOWS_8DOT3=RUN`または環境側8.3無効による明示NOT-RUNを区別し、GS-009 3 roundのroot identity timeout 0、各round 64/64、各margin正、job全体10分未満をraw timingから判定する。

## NOT-RUN／外部副作用

- Windows Server 2025／Node 22、8.3短縮名、Windows 3 round、root identity timeout実数、job run ID／URL／合計時間: **NOT-RUN**（GitHub Actions待ち）
- fresh独立Evaluator: **NOT-RUN**。本記録はGenerator自己評価でありVerdictではない。
- push、workflow dispatch、PR更新、merge、tag、release、Marketplace、install／update、cache、loaded session、live workspace、実Xmind、connector: **0件**
- private my-vault／Yasashii source／spec／state／progress／feedbackへのwrite: **0件**
- network／GitHub API／credential／remote provider call: **0件**
