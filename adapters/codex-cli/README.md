# Codex CLI adapter

Generate the install plan without changing the host:

```bash
node scripts/agentic-codex-install-plan.mjs --host codex-cli --repo "$PWD"
```

The plan uses Codex skills and `AGENTS.md`; it does not invent a Codex plugin marketplace. Applying
the plan changes the selected Codex configuration and requires explicit approval. A real CLI runner
must also prove the synthetic-HOME, digest-matched read-only-plugin, path-scoped permission,
canary-denial, Bash-free minimal-tool, bounded-inspection, success/failure cleanup, and
sanitized-evidence contracts. A sanitized self-report without runner-observed invariants is not a
PASS. Status: `external-live-gate-unavailable`.
