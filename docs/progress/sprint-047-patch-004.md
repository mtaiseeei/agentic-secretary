# Sprint 047 Patch 004 Generator進捗 — Git config binding・root変更error非露出・64-bit identity

- 開始HEAD: `2314caf3966308e7515377e8700c29e9fe0323fd`
- 製品candidate commit: `2d03442960637634dd96655717a482a33b3ed472`
- 製品candidate tree: `a248f66b949544052dd097cf94e682f2691c64d3`
- 実装role: Generator
- 現在地: public sourceの実装と比例したmacOS回帰が完了。Windows Server 2025／Node 22とfresh独立EvaluatorはNOT-RUN

## 実装結果

### Repo-local Git config

- `<common-git-dir>/config`と`<git-dir>/config.worktree`を`existsSync`ではなく`lstat`で分類する。broken symlinkもmissingへ丸めず、通常targetを持つsymlinkと同じ`clarity-git-config-unsupported`／`git-config-symlink-unsupported`で参照先を採用せず停止する。
- regular configはdescriptorを開き、path側identity、descriptor側identity、read後identity、実bytes長を照合する。configのbytes digestはBufferをそのままSHA-256へ入れ、文字列化によるbytes変形を避けた。
- regular configに`[include]`または`[includeIf "..."]`がある場合は、recursive parserやorigin-chain supportへ進まず、`git-config-include-unsupported`／`git-config-include-if-unsupported`で停止する。comment中の文字列は設定として扱わない。
- Git markerから解決できるRepo-local configはread-only Git probe前にも検査するため、broken common configでも一般的なGit失敗へ潰れない。通常Repoは従来どおり1 request 1 probe、timeout 5,000 ms、`GIT_TERMINAL_PROMPT=0`、`GIT_OPTIONAL_LOCKS=0`である。
- 観測後にcommon／worktree regular configのbytesが変わると、次のguarded write境界で`clarity-root-changed`／`repo-git-identity-changed`を返す。古い観測を成功へ再利用しない。

### root変更errorとHook

- `clarity-root-changed`のdetailsから`previousPhysicalRoot`／`currentPhysicalRoot`を除去した。detailsは`changed:false`とallowlist済みreasonだけで、reasonはalias解決先、physical root、ancestor alias、Repo／Git identity、再確認不能を区別する。
- CLI error payloadはroot変更時だけdetailsを再構成し、短い再実行案内を維持する。Claude Code／Codex Hookは内部error objectをserializeせず、degraded／manual fallbackへ安全なcode、reason、`changed:false`だけを添える。
- alias target変更、physical root差替え、Git config bytes変更のfocused fixtureで、旧／新physical root、Git dir、common Git dir、config pathのabsolute canaryがCLI／Hook payloadへ0件であることを確認した。

### filesystem identity

- root、ancestor alias link／target、Git top-level、Git dir、common Git dir、Git marker／configで使う`statSync`／`lstatSync`を`{ bigint: true }`へ変更した。`dev`／`ino`はNumberへ狭めず10進文字列、`mode`は安全範囲のNumber、`kind`は既存enumとして返すためJSON serialize可能である。
- `dev`または`ino`が0の観測は`clarity-filesystem-identity-unavailable`でfail closedにする。directory／file／symlink kindとmodeを含む既存比較意味は維持した。
- test mode限定seamで、`9007199254740992n`と`9007199254740993n`がNumber変換では衝突することを先に確認し、実identity表現とproduction comparatorでは相違として検出されること、同一入力のJSONが決定的であることを証明した。
- `refreshClarityRootAfterOwnedReplacement`へ`rootIdentity` rejectionは追加していない。canonical lock polling、15秒lock wait、30秒leaseも変更していない。

### Windows workflow・inventory・限定privacy cleanup

- 既存`.github/workflows/windows-recording-regression.yml`の同じ`windows-native` jobへPatch004のsyntax stepとfocused suite stepを追加した。`windows-2025`、Node 22、`timeout-minutes: 10`、既存step、GS-009の3 round×（Hook 32＋CLI 32）は削減・緩和していない。
- collaboration inventoryは新しいfocused suite pathと、変更したroot／Hook／workflowのdigestだけを追従した。20 surface／67 caseは不変である。
- PR #11で新規に入ったGenerator所有の`docs/progress/sprint-050-patch-004.md`内のabsolute path 1件だけを`<workspace-alias>/ebino-marketing-hub`へ置換した。alias上の実Repoをread-only previewしたという証拠の意味、HEAD／branch／write 0記録は維持した。

## 変更path

製品candidateの変更は次の9本。

```text
.github/workflows/windows-recording-regression.yml
docs/progress/sprint-050-patch-004.md
plugins/secretary/collaboration-inventory.json
plugins/secretary/scripts/clarity-hook.mjs
plugins/secretary/scripts/clarity.mjs
plugins/secretary/scripts/lib/clarity-hook.mjs
plugins/secretary/scripts/lib/clarity-root.mjs
scripts/lib/sprint-049-inventory.mjs
scripts/sprint-047-patch-004-test.mjs
```

製品codeは187追加／42削除、focused test codeは329追加／0削除。workflowは7追加、inventoryは5追加／5削除、限定privacy文書は1追加／1削除である。製品code 0のverification-only roundではない。

## Patch004 focused結果

`node scripts/sprint-047-patch-004-test.mjs`はcandidate commit後にも再実行し、**13／13 PASS**。

| 領域 | 結果 |
|---|---|
| common config | symlink／broken symlink／include／includeIfの4 negativeが理由付き非0、`changed:false`、実行前後tree一致 |
| `config.worktree` | symlink／broken symlink／include／includeIfの4 negativeが理由付き非0、`changed:false`、実行前後tree一致 |
| regular positive | common／worktreeとも成功。Git probe/request 1、timeout 5,000 ms、prompt／optional lock無効 |
| direct bytes change | common／worktree各1件を次write前に`clarity-root-changed`。古い観測での成功0 |
| zero-write snapshot | config 8、bytes change 2、alias 1、physical root 1の合計12 negativeでRepo全tree、canonical／runtime／tracked artifact、Git metadata、外部canaryのClarity起因差分0 |
| privacy | CLI path canary 0、Hook path canary 0、sanitized reasonと`changed:false`保持 |
| 64-bit identity | Number衝突候補をproduction表現／comparatorで区別、same input安定、JSON serialize成功、zero identity拒否 |
| external | external writes 0、network calls 0 |

## 回帰結果

候補と同じstaged treeで全指定回帰を実行し、commit後にfocused／inventoryを再実行した。

| command | 結果 |
|---|---|
| `node scripts/sprint-047-patch-004-test.mjs` | 13／13 PASS、config matrix 8、direct bytes change 2、zero-write negative 12、Windows native NOT-RUN |
| `node scripts/sprint-047-patch-001-test.mjs` | 23／23 PASS。全failure／rollback／cleanup／lock回帰green |
| `node scripts/sprint-047-patch-002-test.mjs` | 12／12 PASS。Git probe/request 1、timeout 5,000 ms、Windows 8.3はNOT-RUN |
| `node scripts/sprint-047-test.mjs` | 25／25 PASS、Critical 16／16、AC 7／7、Hook 32＋CLI 32、parse／unique／State rebuild 100% |
| Patch003 State oracle（前行GS-009内） | repair前full-State一致PASS、決定的negative `CONFIRMED`、read-only rebuild no-op PASS |
| `node scripts/sprint-050-patch-003-test.mjs` | root／alias 21／21 PASS、external write 0、network 0 |
| `node scripts/sprint-049-inventory.mjs validate` | 20 surface／67 case、markers／digests valid |
| `node --check`（変更した全`.mjs`） | exit 0 |
| workflow YAML parse | `YAML_OK` |
| `git diff --check`／absolute path scan | exit 0／対象path canary 0 |

最終macOS GS-009は64／64 exit 0、canonical／Hook各delta 32、parse／unique／repair前full-State／rebuild 100%、residue 0。local計測はmax canonical lock wait `1247/15000 ms`（margin 13,753 ms）、max lease critical `151/30000 ms`（margin 29,849 ms）、round 2,114 msだった。これはWindows 3 roundまたはjob全体時間の代用ではない。

## 起動・Evaluator handoff

UI／browser／test URLはない。CLI入口は次のとおり。

```bash
node plugins/secretary/scripts/clarity.mjs status <repo-root> --json
node plugins/secretary/scripts/clarity.mjs event <repo-root> --event-json '<JSON>' --json
node plugins/secretary/scripts/clarity-hook.mjs < hook-payload.json
```

Evaluatorは製品candidate `2d03442960637634dd96655717a482a33b3ed472`／tree `a248f66b949544052dd097cf94e682f2691c64d3`を固定する。focused 13件でcommon／worktreeの4形態、regular positive、bytes変更、CLI／Hook canary、64-bit collision proofを確認し、上記5 regression commandとsyntax／YAML／inventoryを実行する。

Windowsは既存同一jobでPatch004、P001、P002、Sprint047を実行し、3 roundそれぞれ64／64、parse／unique／delta／repair前full-State／rebuild 100%、residue 0、max wait <15秒、max lease <30秒、job <10分をraw resultから確認する。process／round／step／上限を減らさない。

## NOT-RUN／残余

- Windows Server 2025／Node 22、Windows 8.3、Windows正式3 round、job合計時間／10分margin: **NOT-RUN**。macOS結果をWindows PASSへ昇格していない。
- fresh独立Evaluator: **NOT-RUN**。本書はGenerator自己評価であり、Sprint PASS／doneを主張しない。
- private my-vault／Yasashii同期・評価: **NOT-RUN**。public PASS前に書いていない。

## 外部副作用

- network／GitHub API／credential／provider／connector／Xmind live call: **0件**
- push／workflow dispatch／PR更新／merge／tag／release／Marketplace／install／update／cache／loaded session: **0件**
- private my-vault／Yasashii／実利用者root／live workspace／実Xmind write: **0件**
- test writeは各suiteが作成・削除したOS temporary fixtureだけ。製品runtimeへnetwork、prompt、credential、fetch／pull処理を追加していない。
