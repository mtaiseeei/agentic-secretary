# Sprint 046: reciprocal link、pull sync、authority／conflict

**ステータス:** Generator実装・自動回帰完了、Evaluator独立評価待ち

## 実装結果

- 開始HEADは`3a8a260a53e31292579cd5fedb58c6a6245ccd31`。Secretary-local ProjectとStandalone外部Repoを、`prepare → accept → finalize`で相互linkできるCLIとcanonical manifestを追加した。既存Clarity Project IDは変更しない。
- Link Request／Acceptance／Finalizationは双方のProject ID、Repo identity、link ID、digest、authority profileを検証する。未初期化Repoはtarget identityをwrite前に検証し、preview後の`--apply`でだけClarityを初期化する。
- reciprocal manifestは`.clarity/links/<link-id>.json`へ保存する。accept／finalizeの再試行は時刻が変わっても元のdigestを返し、manifest／Eventを増やさない。
- local checkoutのabsolute pathはtracked canonicalへ入れず、各Git Repoの`.git/clarity-links.json`だけへ保存する。manual bundleが標準経路であり、link／syncにnetworkは不要である。
- syncは`link-export`、`sync-preview`、`sync-apply`へ分離した。previewはwrite 0、applyは実行したRepo自身の`.clarity/imports/`、`.clarity/projections/linked/`、純追加Eventだけを更新する。相手Repo、remote、branch、Git commitは変更しない。
- authority profileはSecretary Primary、Repo Primary、reference、shared-derivedを区別する。Primary重複、authority claim競合、concurrent revision、stale sequence、newer schema、tombstone、duplicate item、identity／digest改ざんを自動採用せず、last-write-winsを行わない。
- sync conflictはactual previewからAttentionへ変換し、authority conflictをCritical、concurrent sync／tombstoneをHighとして、`level desc → conflict ID asc`で決定的に並べる。Sprint 042の合成fixtureではなく、同じ実2-Repo link／sync fixtureからAT-008／AT-009を再評価した。
- resolutionはSecretary側、Repo側、new Decision、split、defer、unlinkの6種類をProject-level Eventへ残す。splitはrelationを保持し、unlinkは履歴とProject IDを維持して元のStandalone／Secretary-local modeへ戻す。
- `doctor`へmode、schema、Hook、link、projection、lock、Xmind状態を統合した。link doctorはhealthy、stale、unreachable、identity mismatchと修復候補を返す。Secretary Portfolioはlinked Projectのstale状態を表示する。
- rootは処理前とwrite直前に再検証し、nested Secretary-localの所有Git rootを分離した。symlink root、root escape、peer identity差替えを拒否する。
- public版にはgeneric Project／Repo identity、manifest、bundle、projectionだけを実装した。private path、private relation／task実装、顧客本文は含めていない。

## 変更ファイル

- `plugins/secretary/scripts/lib/clarity-link.mjs`
- `plugins/secretary/scripts/lib/clarity-core.mjs`
- `plugins/secretary/scripts/lib/clarity-secretary.mjs`
- `plugins/secretary/scripts/clarity.mjs`
- `plugins/secretary/clarity/schemas/event.schema.json`
- `plugins/secretary/skills/clarity/SKILL.md`
- `scripts/sprint-046-test.mjs`
- `scripts/sprint-046-regression.sh`
- `docs/progress/sprint-046.md`

spec、Sprint契約、state、feedback、release metadata、private downstream、Yasashii実repo、installed cache、marketplaceは変更していない。

## 34 case coverage

| Case群 | 対象 | PASS | FAIL |
|---|---:|---:|---:|
| reciprocal link | LK-001〜016 | 16 | 0 |
| sync／authority／conflict | SY-001〜013 | 13 | 0 |
| retry／doctor | IM-002、IM-003、IM-010、IM-011 | 4 | 0 |
| stale Portfolio | PF-009 | 1 | 0 |
| 合計 | registryの正確な34 ID | 34 | 0 |

`docs/spec/clarity-acceptance.md`のregistry JSONを直接parseし、missing 0、duplicate 0、extra 0を検査した。Critical 19件を含むTarget 34件と、本Sprint Acceptance Criteria 8項目の実行漏れは0件。補助確認のAT-008／AT-009も同じ実link／sync fixtureで2件PASSした。

## 自動検証

```bash
bash scripts/sprint-046-regression.sh
```

- exit 0、`SPRINT046_REGRESSION_PASS=34 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0`。
- Sprint 046 target: 34/34 PASS。AT-008／AT-009 actual sync補助確認: 2/2 PASS。
- 2つの隔離Git Repoで双方のProject ID、Repo identity、link ID、manifest digest、tree、Git commit数、remote一覧をbefore／after比較した。filesystem canaryはunchanged、remote command log 0。
- Sprint 045: 35/35、Sprint 044: 40/40、Sprint 043 fixture: 29 PASS／0 FAIL／external-live 1 NOT-RUN、Sprint 042: 35/35、Sprint 041: 43/43。
- projects: 68/68、daily: 56/56、weekly: 38/38。
- release integrity: PASS。
- `claude plugin validate plugins/secretary --strict`: `Validation passed`。
- Node構文、Event schema JSON parse、`git diff --check`: exit 0。

## 起動・CLI

常駐serverはないためtest URLは非該当。製品surfaceはCLIである。

```bash
# 両方のidentityを確認し、Secretary側でRequestを作る
node plugins/secretary/scripts/clarity.mjs link-identity <clarity-root> --json
node plugins/secretary/scripts/clarity.mjs link-prepare <secretary-project-clarity-root> \
  --target-project-id <project-id> --target-repo-identity-json '<JSON>' --role secretary --json

# 相手Repoでpreviewし、確認後だけapplyする
node plugins/secretary/scripts/clarity.mjs link-accept <external-repo> --input-file <request.json> --json
node plugins/secretary/scripts/clarity.mjs link-accept <external-repo> --input-file <request.json> --apply --json

# finalize後、manual bundleをpreview／applyする
node plugins/secretary/scripts/clarity.mjs link-export <source-root> --link-id <link-id> --json
node plugins/secretary/scripts/clarity.mjs sync-preview <target-root> --input-file <bundle.json> --json
node plugins/secretary/scripts/clarity.mjs sync-apply <target-root> --input-file <bundle.json> --apply --json

# link状態と修復候補
node plugins/secretary/scripts/clarity.mjs link-doctor <clarity-root> --json
node plugins/secretary/scripts/clarity.mjs doctor <clarity-root> --json
```

## Evaluator向け具体scenario

1. 2つの新規隔離Git Repoとroot外canaryを用意する。一方はgeneric Secretary open Project内のClarity、他方は未初期化Standalone Repoとし、双方のProject ID／Repo identity／tree／Git HEAD／remoteを記録する。
2. Secretary側でLink Requestを作り、Secret、absolute path、顧客本文が0であることを確認する。wrong target、request digest改ざんをapply付きで渡し、未初期化Repoを含めwrite 0であることを確認する。
3. accept previewでは初期化0、apply後だけClarityとaccepted manifestが作られることを確認する。finalize前後で双方のID／identity／digestを比較し、accept／finalizeを別時刻で再実行してmanifest／Event／digestが同一であることを確認する。
4. 両Repoへ`.git/clarity-links.json`を作り、canonical manifest／project／bundleにabsolute pathがないことを確認する。peer rootのsymlinkを渡して拒否され、canaryと双方treeが不変であることを確認する。
5. manual bundleで両方向のsync preview／applyを実行する。previewはwrite 0、applyは自Repoのimports／projection／Eventだけを変更し、相手tree、相手Git、remote、canary、Project IDを変えないことを確認する。
6. authority Primary競合とconcurrent revisionをactual bundleで作り、前者がCritical／rank 1／`authority_conflict`、後者がHigh／`sync_conflict`となることを確認する。Sprint 042 fixtureの結果を代用しない。
7. Primary重複、stale sequence、schema 99、unknown field、tombstone、duplicate item、link ID／Repo identity／digest改ざんを個別に実行する。unknown fieldだけはimport／projectionへ保持し、他はwrite 0、last-write-wins 0であることを確認する。
8. 同一bundleを再applyし、import file 1件、Event追加0、tree同一を確認する。conflictをSecretary側、Repo側、new Decision、split、deferで解決し各Eventを確認した後、unlinkで元mode、同一Project ID、履歴保持を確認する。
9. sync直後のdoctorでmode、schema、Hook、healthy link、Xmind OFFを確認する。import時刻を古くし、local mappingを外してbroken原因と3つの修復候補、Secretary Portfolioの`linkStale: true`を確認する。
10. `bash scripts/sprint-046-regression.sh`でTarget 34件とSprint 041〜045、projects／daily／weekly、release integrityを再実行する。

## Known issues／正直な未検証

- Sprint 046の自動targetと関連回帰に製品FAILはない。ただしGeneratorの自己評価であり、EvaluatorのPASS判定ではない。
- 実GitHub read-only取得はユーザー許可がないため未実行。adapter fixtureは`networkCalls: 0`、`verifiedExternal: false`であり、external-live PASSへ昇格していない。
- Sprint 043から継続する`XM-007`実Xmind MCP external-liveはNOT-RUN。Xmind doctor状態はlocal settingsの有無だけを検査し、実Xmind openを主張しない。
- 実private my-vault、Yasashii実repo、実connector、実利用者workspace、Mac mini、installed plugin/cache、marketplace、GitHub remote、push、tag、releaseは未検証・未変更。
- semantic Drift比較、自動fetch／pull／push、PR／remote変更、private adaptation、packaging／releaseはNon-scopeであり実装していない。

## 外部副作用

- network／GitHub／connector／Xmind live call: **0件**
- external Repo／private repo／実利用者workspace write: **0件**
- push／tag／release／remote変更: **0件**
- 実task／relation／customer data write: **0件**
- 書込みは本repoのGenerator所有差分と、終了時に削除したOS temporary fixtureだけ。
