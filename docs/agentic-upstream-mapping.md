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
| Claude Code Desktop App install | `external-live-gate-unavailable` | changes installed plugin state |
| Claude Code CLI install | `external-live-gate-unavailable` | changes installed plugin state |
| Codex App install | `external-live-gate-unavailable` | changes installed Codex plugin state |
| Codex CLI install | `external-live-gate-unavailable` | changes installed Codex plugin state |
| public setting | not executed | makes the future repository publicly visible |
| release publication | not executed; Sprint 035 only | publishes a release artifact |

Offline validator success must not change any row above to verified.
