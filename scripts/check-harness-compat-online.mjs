#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expectedHarnessFromEdition, validateHarnessSnapshot } from "./lib/harness-compat.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const edition = JSON.parse(readFileSync(join(root, "plugins/secretary/edition.json"), "utf8"));
const expected = expectedHarnessFromEdition(edition);

function github(path, raw = false) {
  const accept = raw ? "application/vnd.github.raw+json" : "application/vnd.github+json";
  const result = spawnSync("curl", [
    "--fail", "--silent", "--show-error",
    "--header", `Accept: ${accept}`,
    "--header", "X-GitHub-Api-Version: 2022-11-28",
    `https://api.github.com/${path}`,
  ], { encoding: "utf8", env: { PATH: process.env.PATH || "" } });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `curl exited ${result.status}`);
  return result.stdout;
}

try {
  const base = `repos/${expected.repositorySlug}`;
  const snapshot = {
    commit: JSON.parse(github(`${base}/commits/main`)).sha,
    repo: JSON.parse(github(base)),
    claudeMarketplace: JSON.parse(github(`${base}/contents/.claude-plugin/marketplace.json?ref=main`, true)),
    claudePlugin: JSON.parse(github(`${base}/contents/plugins/harness/.claude-plugin/plugin.json?ref=main`, true)),
    codexMarketplace: JSON.parse(github(`${base}/contents/.agents/plugins/marketplace.json?ref=main`, true)),
    codexPlugin: JSON.parse(github(`${base}/contents/plugins/harness/.codex-plugin/plugin.json?ref=main`, true)),
    readme: github(`${base}/contents/README.md?ref=main`, true),
  };
  const errors = validateHarnessSnapshot(snapshot, expected);
  if (errors.length) {
    process.stderr.write(`HARNESS_ONLINE_FAIL edition=${edition.edition}\n${errors.map((value) => `- ${value}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`HARNESS_ONLINE_PASS edition=${edition.edition} repo=${expected.repositorySlug} commit=${snapshot.commit} version=${expected.version} claude=${expected.claudeMarketplace}/${edition.harness.hosts.claudeCode.installId} codex=${expected.codexMarketplace}/${edition.harness.hosts.codex.installId}\n`);
} catch (error) {
  process.stderr.write(`HARNESS_ONLINE_UNVERIFIED edition=${edition.edition} ${error.message}\n`);
  process.exit(1);
}
