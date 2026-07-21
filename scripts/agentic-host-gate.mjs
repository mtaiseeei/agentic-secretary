#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHostMatrix, readJson, summarizeHostRecords, unavailableRecords } from "./lib/agentic-hosts.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const mode = value("--mode") || "offline";
const output = value("--output");
const evidencePath = value("--evidence");
if (mode !== "offline") throw new Error("only --mode offline is available without per-host external approval");

const loaded = loadHostMatrix(root);
const records = evidencePath ? readJson(resolve(evidencePath)) : unavailableRecords(loaded.matrix);
if (!Array.isArray(records)) throw new Error("evidence must be an array of host records");
const summary = summarizeHostRecords(loaded.matrix, records);
const report = {
  ...summary,
  mode,
  structuralValidation: "pass",
  note: "offline adapter validation is not live-host evidence and never promotes an unavailable host",
};
if (output) {
  const target = resolve(output);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`AGENTIC_HOST_GATE structural=pass live=${report.releaseStatus} verified=${report.verifiedHosts.length}/4\n`);
