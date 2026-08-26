#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const root = resolve(rootIndex >= 0 ? args[rootIndex + 1] : dirname(fileURLToPath(import.meta.url)), rootIndex >= 0 ? "" : "..");
const expectedSkills = [
  "build", "chatwork", "connections", "daily", "google-chat", "memory-care", "name", "onboarding",
  "projects", "secretary", "settings", "setup-google", "setup-microsoft", "setup-notion", "update", "weekly",
];
let passes = 0;

function check(label, callback) {
  callback();
  passes += 1;
  process.stdout.write(`PASS ${label}\n`);
}

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
}

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function skillNames(pluginRoot) {
  const skillsRoot = join(pluginRoot, "skills");
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

function validateFormalDistribution(candidateRoot) {
  const marketplacePath = join(candidateRoot, ".agents/plugins/marketplace.json");
  const pluginRoot = join(candidateRoot, "plugins/secretary");
  const manifestPath = join(pluginRoot, ".codex-plugin/plugin.json");
  assert(existsSync(marketplacePath), "missing formal Codex marketplace");
  assert(existsSync(manifestPath), "missing formal Codex plugin manifest");
  const marketplace = json(marketplacePath);
  const manifest = json(manifestPath);
  assert.equal(marketplace.name, "agentic-secretary");
  assert.equal(marketplace.interface?.displayName, "Agentic Secretary");
  assert.equal(marketplace.plugins?.length, 1);
  assert.deepEqual(marketplace.plugins[0], {
    name: "agentic-secretary",
    source: { source: "local", path: "./plugins/secretary" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  });
  assert.equal(manifest.name, "agentic-secretary");
  assert.equal(manifest.version, "0.10.2");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.repository, "https://github.com/mtaiseeei/agentic-secretary");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.author?.name, "mtaiseeei");
  assert.equal(manifest.interface?.category, "Productivity");
  assert(Array.isArray(manifest.interface?.capabilities));
  assert(Array.isArray(manifest.interface?.defaultPrompt));
  assert.equal(manifest.interface.defaultPrompt.length, 3);
  for (const forbidden of ["apps", "mcpServers", "hooks"]) assert(!(forbidden in manifest));
  assert.deepEqual(skillNames(pluginRoot), expectedSkills);
  return { marketplace, manifest, pluginRoot };
}

check("formal Codex manifest and marketplace satisfy the shared 16-skill contract", () => {
  validateFormalDistribution(root);
});

check("Claude and Codex manifests resolve to the same physical skills tree", () => {
  const claude = json(join(root, "plugins/secretary/.claude-plugin/plugin.json"));
  const codex = json(join(root, "plugins/secretary/.codex-plugin/plugin.json"));
  assert.equal(claude.name, codex.name);
  assert.equal(claude.version, codex.version);
  assert.equal(resolve(root, "plugins/secretary", codex.skills), resolve(root, "plugins/secretary/skills"));
  assert(!existsSync(join(root, ".agents/skills")), "repo-local skills would duplicate the formal bundled skills");
});

check("legacy Claude marketplace or manual skills alone cannot pass formal validation", () => {
  const fixture = mkdtempSync("/private/tmp/agentic-codex-negative-");
  try {
    mkdirSync(join(fixture, ".claude-plugin"), { recursive: true });
    cpSync(join(root, ".claude-plugin/marketplace.json"), join(fixture, ".claude-plugin/marketplace.json"));
    mkdirSync(join(fixture, ".agents/skills/secretary"), { recursive: true });
    writeFileSync(join(fixture, ".agents/skills/secretary/SKILL.md"), "---\nname: secretary\ndescription: legacy-only fixture\n---\n");
    assert.throws(() => validateFormalDistribution(fixture), /missing formal Codex marketplace/);

    mkdirSync(join(fixture, ".agents/plugins"), { recursive: true });
    writeFileSync(join(fixture, ".agents/plugins/marketplace.json"), JSON.stringify({
      name: "agentic-secretary",
      interface: { displayName: "Agentic Secretary" },
      plugins: [{
        name: "agentic-secretary",
        source: { source: "local", path: "./plugins/secretary" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Productivity",
      }],
    }));
    assert.throws(() => validateFormalDistribution(fixture), /missing formal Codex plugin manifest/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

check("Codex CLI ingests the local marketplace with synthetic HOME and CODEX_HOME", () => {
  const fixture = mkdtempSync("/private/tmp/agentic-codex-cli-");
  const codexHome = join(fixture, "codex-home");
  const syntheticHome = join(fixture, "home");
  mkdirSync(codexHome, { recursive: true });
  mkdirSync(syntheticHome, { recursive: true });
  const sourcePlugin = join(root, "plugins/secretary");
  const before = Object.fromEntries(walk(sourcePlugin).map((path) => [path.slice(sourcePlugin.length + 1), digest(path)]));
  const env = {
    PATH: process.env.PATH,
    CODEX_HOME: codexHome,
    HOME: syntheticHome,
    TMPDIR: fixture,
    LANG: "C.UTF-8",
  };
  const runJson = (...commandArgs) => JSON.parse(execFileSync("codex", commandArgs, {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }));
  try {
    const added = runJson("plugin", "marketplace", "add", root, "--json");
    assert.equal(added.marketplaceName, "agentic-secretary");
    assert.equal(added.alreadyAdded, false);

    const available = runJson("plugin", "list", "--available", "--json");
    assert.equal(available.available.length, 1);
    assert.equal(available.available[0].pluginId, "agentic-secretary@agentic-secretary");
    assert.equal(available.available[0].version, "0.10.2");
    assert.equal(available.available[0].installed, false);

    const installed = runJson("plugin", "add", "agentic-secretary@agentic-secretary", "--json");
    assert.equal(installed.version, "0.10.2");
    assert(installed.installedPath.startsWith(`${codexHome}/plugins/cache/`));
    const cachedRoot = resolve(installed.installedPath);
    assert.equal(json(join(cachedRoot, ".codex-plugin/plugin.json")).skills, "./skills/");
    assert.deepEqual(skillNames(cachedRoot), expectedSkills);
    assert.equal(walk(cachedRoot).filter((path) => path.endsWith("/SKILL.md")).length, 16);
    for (const name of expectedSkills) {
      assert.equal(digest(join(cachedRoot, "skills", name, "SKILL.md")), digest(join(sourcePlugin, "skills", name, "SKILL.md")));
    }

    const listed = runJson("plugin", "list", "--json");
    assert.equal(listed.installed.length, 1);
    assert.equal(listed.installed[0].enabled, true);
    assert.equal(listed.installed[0].version, "0.10.2");

    const after = Object.fromEntries(walk(sourcePlugin).map((path) => [path.slice(sourcePlugin.length + 1), digest(path)]));
    assert.deepEqual(after, before, "Codex ingestion modified the source plugin");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
  assert(!existsSync(fixture), "synthetic Codex environment was not cleaned up");
});

process.stdout.write(`AGENTIC_CODEX_PLUGIN_TEST_PASS=${passes} FAIL=0\n`);
