#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function failUsage(message) {
  process.stderr.write(`${message}\n`);
  process.stderr.write(
    "Usage: node scripts/generic-skill-validate.mjs --plugin-root <path> --validator <quick_validate.py> [--python <python>] [--pythonpath <path>]\n",
  );
  process.exit(2);
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) failUsage(`Missing value for ${name}`);
  return value;
}

const pluginRootValue = option("--plugin-root");
const validatorValue = option("--validator");
if (!pluginRootValue) failUsage("Missing --plugin-root");
if (!validatorValue) failUsage("Missing --validator");

const pluginRoot = resolve(pluginRootValue);
const skillsRoot = resolve(pluginRoot, "skills");
const validator = resolve(validatorValue);
const python = option("--python") ?? process.env.PYTHON ?? "python3";
const pythonPath = option("--pythonpath");
const env = {
  ...process.env,
  ...(pythonPath ? { PYTHONPATH: resolve(pythonPath) } : {}),
};

if (!existsSync(validator)) {
  process.stdout.write(
    "GENERIC_SKILL_VALIDATE_INCOMPLETE status=validator-unavailable checked=0 passed=0 failed=0\n",
  );
  process.exit(2);
}
if (!existsSync(skillsRoot)) {
  failUsage(`Skills directory not found: ${skillsRoot}`);
}

const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(resolve(skillsRoot, entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort();

if (skillNames.length === 0) failUsage(`No Skills found under: ${skillsRoot}`);

const dependencyCheck = spawnSync(python, ["-c", "import yaml"], {
  env,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (dependencyCheck.error || dependencyCheck.status !== 0) {
  const reason = dependencyCheck.error ? "python-unavailable" : "missing-pyyaml";
  process.stdout.write(
    `GENERIC_SKILL_VALIDATE_INCOMPLETE status=dependency-unavailable dependency=PyYAML reason=${reason} checked=0 passed=0 failed=0 total=${skillNames.length}\n`,
  );
  process.exit(2);
}

let passed = 0;
let failed = 0;

for (const name of skillNames) {
  const result = spawnSync(python, [validator, resolve(skillsRoot, name)], {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!result.error && result.status === 0) {
    passed += 1;
    process.stdout.write(`PASS ${name}\n`);
    continue;
  }

  failed += 1;
  const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? result.error?.message ?? `exit ${result.status}`;
  process.stdout.write(`FAIL ${name}: ${detail}\n`);
}

const status = failed === 0 ? "pass" : "fail";
process.stdout.write(
  `GENERIC_SKILL_VALIDATE_RESULT status=${status} checked=${skillNames.length} passed=${passed} failed=${failed} total=${skillNames.length}\n`,
);
process.exit(failed === 0 ? 0 : 1);
