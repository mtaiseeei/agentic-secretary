#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootArg = process.argv.indexOf("--root");
const root = rootArg >= 0
  ? resolve(process.argv[rootArg + 1])
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const handoff = JSON.parse(readFileSync(join(root, "scripts/fixtures/sprint-040/downstream-handoff.json"), "utf8"));
const inventory = JSON.parse(readFileSync(join(root, handoff.inventory), "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
let pass = 0;
let fail = 0;

function check(label, fn) {
  try { fn(); pass += 1; console.log(`PASS ${label}`); }
  catch (error) { fail += 1; console.error(`FAIL ${label}: ${error.message}`); }
}

function git(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function fileDigest(base, path) { return sha(readFileSync(join(base, path))); }

check("inventory schema and required surface IDs", () => {
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(new Set(inventory.surfaces.map((item) => item.id)).size, inventory.surfaces.length);
  for (const id of ["rules-contract", "copy-agentic", "copy-yasashii", "skill-memory-care", "skill-secretary", "skill-settings", "skill-daily", "skill-projects", "template-agents", "template-claude", "runtime-classifier", "memory-seam", "golden-fixture", "golden-runner", "sprint-010-regression", "sprint-040-regression"]) {
    assert.ok(inventory.surfaces.some((item) => item.id === id), id);
  }
});

check("inventory paths are tracked and content digests are current", () => {
  const tracked = existsSync(join(root, ".git"))
    ? new Set(git(root, ["ls-files"]).split("\n"))
    : new Set(inventory.surfaces.map((item) => item.path));
  for (const item of inventory.surfaces) {
    assert.ok(tracked.has(item.path), `tracked:${item.path}`);
    assert.equal(fileDigest(root, item.path), item.sha256, `stale:${item.id}`);
  }
});

for (const edition of handoff.editions) check(`${edition.id}: fixed base, content markers, legacy negatives and protected digests`, () => {
  const sourceHead = git(edition.sourceRoot, ["rev-parse", "HEAD"]);
  if (edition.id === "agentic") {
    assert.equal(git(edition.sourceRoot, ["merge-base", "--is-ancestor", edition.baseHead, sourceHead]), "", `${edition.id}:baseHead-ancestor`);
  } else {
    assert.equal(sourceHead, edition.baseHead, `${edition.id}:baseHead`);
  }
  const surfaces = inventory.surfaces.filter((item) => item.editions.includes(edition.id));
  assert.ok(surfaces.length >= 15, `${edition.id}:surface-count=${surfaces.length}`);
  const bodies = surfaces.map((item) => readFileSync(join(root, item.path), "utf8"));
  const combined = bodies.join("\n");
  for (const marker of inventory.requiredMarkers) assert.ok(combined.includes(marker), `${edition.id}:missing-marker:${marker}`);
  for (const marker of inventory.forbiddenLegacyMarkers) assert.equal(combined.includes(marker), false, `${edition.id}:legacy-marker:${marker}`);
  for (const phrase of inventory.forbiddenLegacyPhrases) assert.equal(combined.includes(phrase), false, `${edition.id}:legacy-phrase:${phrase}`);
  for (const item of edition.protected) {
    assert.ok(existsSync(join(edition.sourceRoot, item.path)), `${edition.id}:protected-missing:${item.path}`);
    assert.equal(fileDigest(edition.sourceRoot, item.path), item.sha256, `${edition.id}:protected-stale:${item.path}`);
  }
  const candidateId = sha(JSON.stringify({
    edition: edition.id,
    baseHead: edition.baseHead,
    surfaces: surfaces.map((item) => [item.path, item.sha256]),
    protected: edition.protected.map((item) => [item.path, item.sha256]),
  }));
  console.log(`SPRINT040_${edition.id.toUpperCase().replaceAll("-", "_")}_SURFACES=${surfaces.length} CANDIDATE=${candidateId}`);
});

check("offline handoff keeps release and live phases not executed", () => {
  for (const item of ["push", "tag", "release", "marketplace", "installed-cache", "workspace-migration", "new-session", "external-service"]) assert.ok(handoff.notExecuted.includes(item));
  assert.equal(handoff.publicationStatus, "source-candidate-offline-only");
});

console.log(`SPRINT040_INVENTORY_PASS=${pass} SPRINT040_INVENTORY_FAIL=${fail}`);
if (fail) process.exitCode = 1;
