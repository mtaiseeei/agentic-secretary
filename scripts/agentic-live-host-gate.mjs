#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHostMatrix } from "./lib/agentic-hosts.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const hostIndex = args.indexOf("--host");
const hostId = hostIndex >= 0 ? args[hostIndex + 1] : null;
const loaded = loadHostMatrix(root);
if (!hostId || !loaded.entries.has(hostId)) {
  process.stderr.write("usage: agentic-live-host-gate.mjs --host <required-host-id>\n");
  process.exit(2);
}
const adapter = loaded.entries.get(hostId).adapter;
const result = {
  schemaVersion: 1,
  hostId,
  runner: "agentic-live-host-gate",
  surface: adapter.surface,
  status: "external-live-gate-unavailable",
  liveConversationGate: "incomplete",
  installed: false,
  evidence: [],
  reason: "Host installation and real-host execution were not individually approved. No offline result is promoted.",
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = 2;
