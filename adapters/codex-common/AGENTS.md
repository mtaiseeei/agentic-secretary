# agentic-secretary Codex fallback adapter

The formal Codex distribution is `plugins/secretary/.codex-plugin/plugin.json` plus the repository
marketplace at `.agents/plugins/marketplace.json`. Use this file only for repository-local authoring,
isolated tests, or recovery when the formal plugin flow cannot be used.

- Resolve `SECRETARY_PLUGIN_ROOT` from the real absolute path of the selected
  `plugins/secretary/skills/<name>/SKILL.md` through `scripts/resolve-plugin-root.mjs`.
  Never derive it from cwd, an unset environment variable, or a guessed install cache path.
- Read `plugins/secretary/rules/plain-language.md` before producing user-facing secretary output.
- Discover skills from `plugins/secretary/skills/*/SKILL.md`; load only the selected skill and its
  direct references.
- Preserve every confirmation, workspace, secret, OAuth, sync, Git, and update boundary in the
  shared core. Host convenience cannot weaken them.
- Do not present this manual `AGENTS.md` / skills / `config.toml` route as equivalent to an installed
  Codex plugin or as evidence that the formal marketplace path passed.
- Host installation, `$CODEX_HOME` changes, App reload, or CLI configuration changes require explicit approval.
- A structural validator PASS is not a live conversation PASS. Missing live evidence remains
  `external-live-gate-unavailable` or `unverified`.
