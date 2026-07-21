# agentic-secretary Codex adapter

This adapter exposes the host-independent plugin core to Codex without inventing a plugin marketplace.

- Treat the repository path `plugins/secretary/` as `SECRETARY_PLUGIN_ROOT`.
- When a shared skill mentions `${CLAUDE_PLUGIN_ROOT}`, resolve that placeholder to the same
  `plugins/secretary/` root. Do not rewrite or duplicate the common skills.
- Read `plugins/secretary/rules/plain-language.md` before producing user-facing secretary output.
- Discover skills from `plugins/secretary/skills/*/SKILL.md`; load only the selected skill and its
  direct references.
- Preserve every confirmation, workspace, secret, OAuth, sync, Git, and update boundary in the
  shared core. Host convenience cannot weaken them.
- Codex has no Claude plugin marketplace in this contract. Do not claim marketplace installation.
- Host installation, `$CODEX_HOME` changes, App reload, or CLI configuration changes require explicit approval.
- A structural validator PASS is not a live conversation PASS. Missing live evidence remains
  `external-live-gate-unavailable` or `unverified`.
