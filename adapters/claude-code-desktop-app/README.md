# Claude Code Desktop App adapter

Distribution uses the shared Claude marketplace and plugin manifests. The Desktop App must expose
the Claude Code execution surface; the general Claude Desktop chat / MCP surface is not equivalent.

After publication, install with:

```text
/plugin marketplace add mtaiseeei/agentic-secretary
/plugin install agentic-secretary@agentic-secretary
/secretary
```

Reload the Claude Code workspace after install. The user confirmed real-host operation on
2026-07-22 with the v0.8.0 common core `891eabc`; the current host status is `verified`.
Connector authorization, OAuth, Repository Secrets, GitHub Actions, and external chat sync were
also confirmed in the real environment.
