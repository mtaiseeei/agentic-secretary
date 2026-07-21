# Codex App adapter

Codex App uses Codex's `AGENTS.md`, skills, and configuration surfaces. It does not use the Claude
plugin marketplace. Generate a read-only plan:

```bash
node scripts/agentic-codex-install-plan.mjs --host codex-app --repo "$PWD"
```

The plan links each shared skill into Codex's skill discovery path and merges the adapter guidance
without overwriting existing guidance or `config.toml`. Applying it and reloading Codex App are
external host changes and were not approved in this Sprint. Status: `external-live-gate-unavailable`.
