#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { loadHostMatrix } from "./lib/agentic-hosts.mjs";

const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const hostId = value("--host");
const repo = resolve(value("--repo") || process.cwd());
const loaded = loadHostMatrix(repo);
if (!hostId || !["codex-app", "codex-cli"].includes(hostId)) {
  process.stderr.write("usage: agentic-codex-install-plan.mjs --host codex-app|codex-cli --repo PATH\n");
  process.exit(2);
}
const skillsRoot = join(repo, "plugins/secretary/skills");
const skills = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => readdirSync(join(skillsRoot, entry.name)).includes("SKILL.md"))
  .map((entry) => entry.name)
  .sort();
const plan = {
  schemaVersion: 1,
  mode: "read-only-plan",
  hostId,
  repository: repo,
  pluginRoot: join(repo, "plugins/secretary"),
  guidanceSource: join(repo, "adapters/codex-common/AGENTS.md"),
  configTemplate: join(repo, "adapters/codex-common/config.toml.example"),
  skills: skills.map((name) => ({
    name,
    source: join(skillsRoot, name),
    destination: `$CODEX_HOME/skills/${name}`,
  })),
  applyStatus: "not-executed",
  externalSideEffectsIfApproved: [
    "create or update entries under the selected Codex skills directory",
    "merge adapter guidance without overwriting existing AGENTS.md",
    "optionally merge config values without overwriting existing config.toml",
    `reload ${hostId}`,
  ],
};
process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
process.stdout.write("PLAN_ONLY no Codex files or settings were changed\n");
