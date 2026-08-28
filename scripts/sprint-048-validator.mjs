#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateHandoffTemplate } from "./sprint-048-handoff.mjs";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const VERSION = "0.11.0";
const HOOK_EVENTS = ["SessionStart", "PostToolUse", "PreCompact", "Stop", "SessionEnd"];
const option = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; };
const root = resolve(option("--root") || DEFAULT_ROOT);
const json = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const text = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
let pass = 0;
const check = (condition, message) => { if (condition) pass += 1; else failures.push(message); };

const release = json("plugins/secretary/release-inventory.json");
const claudeMarket = json(".claude-plugin/marketplace.json");
const codexMarket = json(".agents/plugins/marketplace.json");
const claude = json("plugins/secretary/.claude-plugin/plugin.json");
const codex = json("plugins/secretary/.codex-plugin/plugin.json");
const host = json("plugins/secretary/host-inventory.json");
const hooks = json("plugins/secretary/hooks/hooks.json");

check(release.schemaVersion === 1 && release.edition === "agentic-secretary" && release.candidateVersion === VERSION, "release inventory identity/version mismatch");
check(release.publicationStatus === "source-candidate-unverified" && release.releaseState.sourcePrepared === true
  && Object.entries(release.releaseState).filter(([key]) => key !== "sourcePrepared").every(([, value]) => value === false), "release stages must remain source-only");
check(claudeMarket.plugins?.length === 1 && claudeMarket.plugins[0].version === VERSION && claudeMarket.plugins[0].source === "./plugins/secretary", "Claude marketplace mismatch");
check(codexMarket.plugins?.length === 1 && codexMarket.plugins[0].source?.path === "./plugins/secretary", "Codex marketplace mismatch");
check(claude.version === VERSION && codex.version === VERSION && claude.name === codex.name && claude.name === "agentic-secretary", "manifest identity/version mismatch");
check(claude.skills === "./skills/" && codex.skills === "./skills/" && claude.hooks === "./hooks/hooks.json" && codex.hooks === "./hooks/hooks.json", "both manifests must enumerate shared skills and hooks");
check(release.distribution.claudeCode.manifest === "plugins/secretary/.claude-plugin/plugin.json"
  && release.distribution.codex.manifest === "plugins/secretary/.codex-plugin/plugin.json"
  && release.distribution.claudeCode.hooks === release.distribution.codex.hooks, "distribution inventory mismatch");

const actualSkills = readdirSync(join(root, "plugins/secretary/skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, "plugins/secretary/skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name).sort();
check(release.skills.count === actualSkills.length && JSON.stringify(release.skills.names) === JSON.stringify(actualSkills), "release skill inventory differs from actual tree");
check(JSON.stringify(host.skills.map((entry) => entry.name).sort()) === JSON.stringify(actualSkills), "host skill inventory differs from actual tree");
check(actualSkills.includes("clarity") && text("plugins/secretary/skills/clarity/SKILL.md").includes("## plugin root（必須）"), "Clarity Skill is not formally packaged");

const actualHookEvents = Object.keys(hooks.hooks || {});
check(JSON.stringify(actualHookEvents) === JSON.stringify(HOOK_EVENTS) && JSON.stringify(release.clarityHook.events) === JSON.stringify(HOOK_EVENTS), "Clarity Hook event inventory mismatch");
check(host.clarityHook.commonManifest === "hooks/hooks.json" && host.clarityHook.commonRouter === "scripts/clarity-hook.mjs", "host Clarity Hook path mismatch");
const hostSurfaces = [host.clarityHook.hosts.claudeCode.desktop, host.clarityHook.hosts.claudeCode.cli, host.clarityHook.hosts.codex.app, host.clarityHook.hosts.codex.cli];
check(hostSurfaces.every((surface) => surface.status === "supported" && surface.supported === true && surface.verified === false && surface.degraded === false), "unverified host surface was promoted or status fields collapsed");
const degraded = [host.clarityHook.hosts.claudeCode.disabled, host.clarityHook.hosts.codex.untrusted, host.clarityHook.hosts.codex.disabled];
check(degraded.every((surface) => surface.status === "degraded" && surface.degraded === true && surface.verified === false && surface.canonicalWrite === false), "degraded host status is invalid");

const editions = Object.fromEntries(release.xmind.editions.map((entry) => [entry.id, entry]));
check(editions["agentic-secretary"]?.defaultEnabled === false && editions["yasashii-secretary"]?.defaultEnabled === false
  && editions["agentic-secretary-my-vault"]?.defaultEnabled === true && Object.values(editions).every((entry) => entry.selected === null && entry.verified === false), "Xmind edition defaults/status mismatch");
const providers = release.xmind.providers;
check(providers.length === 2 && providers[0].id === "xmind-mcp" && providers[0].priority === 1
  && providers[1].id === "local-native" && providers[1].priority === 2 && providers.every((provider) => provider.selected === false && provider.verified === false), "Xmind provider priority/status mismatch");
check(providers[1].previewRequired === true && providers[1].explicitApprovalRequired === true && providers[1].writeWithoutApproval === false, "local Xmind approval gate mismatch");
check(JSON.stringify(release.xmind.visualContract.quadrants.map(({ position, color }) => [position, color])) === JSON.stringify([
  ["top-left", "#16A34A"], ["top-right", "#2563EB"], ["bottom-left", "#D97706"], ["bottom-right", "#DC2626"]
]), "Xmind four-quadrant visual contract mismatch");

check(text("plugins/secretary/CHANGELOG.md").startsWith("# 変更履歴\n\n## [0.11.0] - 2026-08-28")
  && readFileSync(join(root, "plugins/secretary/CHANGELOG.md")).equals(readFileSync(join(root, "plugins/yasashii-secretary/CHANGELOG.md"))), "CHANGELOG current/legacy mismatch");
check(text("README.md").includes("public source candidateは **0.11.0**") && text("README.md").includes("marketplace公開"), "README candidate stage mismatch");
check(text("docs/guide/getting-started.md").includes("0.11.0 source candidate") && text("docs/guide/getting-started.md").includes("installed cache")
  && text("docs/guide/project-clarity.md").includes("Xmind MCP") && text("docs/guide/project-clarity.md").includes("明示承認"), "guide candidate stage mismatch");

try { validateHandoffTemplate(root); pass += 1; } catch (error) { failures.push(error.message); }
const clarityProductPaths = [
  "plugins/secretary/scripts/clarity.mjs", "plugins/secretary/scripts/clarity-hook.mjs", "plugins/secretary/scripts/clarity-secretary.mjs",
  "plugins/secretary/scripts/lib/clarity-core.mjs", "plugins/secretary/scripts/lib/clarity-drift.mjs", "plugins/secretary/scripts/lib/clarity-hook.mjs",
  "plugins/secretary/scripts/lib/clarity-link.mjs", "plugins/secretary/scripts/lib/clarity-projection.mjs", "plugins/secretary/scripts/lib/clarity-secretary.mjs",
  "plugins/secretary/skills/clarity/SKILL.md", "plugins/secretary/clarity/secretary-adapter.json"
];
const forbidden = /(?:vault\/10_sources|05\/02|plugins\/secretary\/skills\/(?:notion-tasks|task-triage|vault-documents|vault-search)|rules\/copy\/yasashii|rules\/styles\/yasashii)/u;
check(clarityProductPaths.every((path) => !forbidden.test(text(path))), "private/Notion/Yasashii implementation leaked into public Clarity product source");

if (failures.length) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.stderr.write(`SPRINT048_VALIDATOR_PASS=${pass} FAIL=${failures.length}\n`);
  process.exitCode = 1;
} else process.stdout.write(`SPRINT048_VALIDATOR_PASS=${pass} FAIL=0 SKILLS=${actualSkills.length} HOSTS=4\n`);
