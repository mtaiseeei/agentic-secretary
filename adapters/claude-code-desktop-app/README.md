# Claude Code Desktop App adapter

Distribution uses the shared Claude marketplace and plugin manifests. The Desktop App must expose
the Claude Code execution surface; the general Claude Desktop chat / MCP surface is not equivalent.

After publication, install with:

```text
/plugin marketplace add mtaiseeei/agentic-secretary
/plugin install agentic-secretary@agentic-secretary
/secretary
```

Reload the Claude Code workspace after install. Real installation, skill loading, conversation,
wizard launch, boundary, secret, and update checks require separate approval. Until then the live
status is `external-live-gate-unavailable`. An approved driver must run with the shared synthetic
HOME, digest-matched read-only plugin copy, OS sandbox or host path-scoped permission, controlled
canary denial, bounded inspection, and verified cleanup contract.
