# agentic-secretary upstream mapping

## Identity

- Edition: `agentic-secretary`
- Local checkout: `/Users/taisei/workspace/agentic-secretary`
- Intended GitHub repository: `mtaiseeei/agentic-secretary`
- Neutralization commit: `52016cf10c1c5587fbd83ff2faf3888e29282d5e`
- Common plugin path: `plugins/secretary/`
- Release candidate: `0.8.0`

The local repository retains the complete history from the neutralization commit. No history was
squashed. Its approved `origin` is `https://github.com/mtaiseeei/agentic-secretary.git`.

## Upstream / downstream relationship

`agentic-secretary` is the technical upstream. `yasashii-secretary` is a separate downstream
repository that will consume common-core changes through its own narrow overlay process in Sprint
034. Specs, Sprint records, progress, feedback, evidence, README, and release decisions are owned
by each repository and are not synchronized as common-core files.

## Common core boundary

The following are host- and edition-independent:

- skill semantics and shared commands;
- safety, evidence, workspace, secret, OAuth, and sync rules;
- Chatwork / Google Chat wizard assets, flow, copy, DOM, and OAuth scopes;
- update guard, equal-version / downgrade stop behavior, and `0.8.0` migration identity;
- conversation Markdown minimum and host-independent fixtures / validators.

Edition-specific content is limited to conversation, diagnosis, report, and developer handoff.
Host-specific manifests, discovery, install, root resolution, restart/update instructions, runner,
and validator metadata live under `adapters/`.

## External-operation status

| Operation | Status | Side effect if later approved |
|---|---|---|
| local directory and Git history | completed locally | local files and commits under the approved directory |
| GitHub repository creation | completed as private | repository exists; public setting remains forbidden |
| remote add/change | completed for approved `origin` | later changes still require approval |
| push | completed through the recorded baseline | later commits remain local until separately approved |
| Claude Code Desktop App install | `verified` | 2026-07-22、v0.8.0共通coreの実環境動作をユーザー確認 |
| Claude Code CLI install | `verified` | 2026-07-22、v0.8.0共通coreの実環境動作をユーザー確認 |
| Codex App install | `verified` | 2026-07-22、v0.8.0共通coreを含むprivate downstreamで実利用確認 |
| Codex CLI install | `verified` | 2026-07-22、v0.8.0共通coreの実環境動作をユーザー確認 |
| public setting | not executed | makes the future repository publicly visible |
| release publication | completed for v0.8.0 | release artifact published |

4hostの `verified` はoffline validatorではなく、配布版v0.8.0共通core `891eabc` の実環境動作を
ユーザーが確認したことに基づく。Codex Appでは `agentic-secretary-my-vault` main `056044e` も使用した。
connector認証、OAuth、Repository Secret、GitHub Actions、外部chat同期も実環境で確認済みである。
