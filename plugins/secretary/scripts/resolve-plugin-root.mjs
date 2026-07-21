#!/usr/bin/env node

import { existsSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

function fail(message) {
  process.stderr.write(`PLUGIN_ROOT_ERROR ${message}\n`);
  process.exit(2);
}

const args = process.argv.slice(2);
const flagIndex = args.indexOf("--skill-file");
if (flagIndex === -1 || flagIndex === args.length - 1) fail("--skill-file requires an absolute SKILL.md path");

const input = args[flagIndex + 1]?.trim() || "";
if (!input || !isAbsolute(input) || input.includes("${") || input.includes("<")) {
  fail("skill path must be a resolved absolute path");
}
if (!existsSync(input) || !statSync(input).isFile() || basename(input) !== "SKILL.md") {
  fail("skill path must point to an existing SKILL.md file");
}

const skillFile = realpathSync(input);
const skillDirectory = dirname(skillFile);
const skillsRoot = dirname(skillDirectory);
const pluginRoot = dirname(skillsRoot);

if (basename(skillsRoot) !== "skills" || resolve(join(pluginRoot, "skills")) !== resolve(skillsRoot)) {
  fail("SKILL.md must be located at <plugin-root>/skills/<skill-name>/SKILL.md");
}
for (const required of ["edition.json", "rules", "scripts", "skills"]) {
  if (!existsSync(join(pluginRoot, required))) fail(`plugin root is missing ${required}`);
}
if (!existsSync(join(pluginRoot, ".claude-plugin", "plugin.json")) &&
    !existsSync(join(pluginRoot, ".codex-plugin", "plugin.json"))) {
  fail("plugin root has no supported manifest");
}

process.stdout.write(`${realpathSync(pluginRoot)}\n`);
