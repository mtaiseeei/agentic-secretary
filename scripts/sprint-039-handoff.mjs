#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rootIndex = process.argv.indexOf("--root");
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd());
const manifest = JSON.parse(readFileSync(join(root, "adapters", "downstream-identity-handoff.json"), "utf8"));
const missing = manifest.commonPaths.filter((path) => !existsSync(join(root, path)));
if (missing.length) throw new Error(`handoff共通pathが欠落しています: ${missing.join(", ")}`);
const hash = createHash("sha256");
for (const path of [...manifest.commonPaths].sort()) {
  hash.update(`${path}\0`);
  hash.update(readFileSync(join(root, path)));
  hash.update("\0");
}
let gitSha = null;
let baseGitSha = null;
let candidateGitStatus = "git-free";
try {
  const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  candidateGitStatus = dirty ? "dirty" : "clean";
  baseGitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  if (!dirty) gitSha = baseGitSha;
} catch { /* Git-free archiveではnullを正直に返す */ }
if (gitSha && !/^[0-9a-f]{40}$/u.test(gitSha)) throw new Error("Agentic完全SHAを確認できません。");
process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  publicationStatus: manifest.publicationStatus,
  acceptedDownstreamInput: null,
  agenticFullSha: gitSha,
  baseGitSha,
  candidateGitStatus,
  commonTreeSha256: hash.digest("hex"),
  commonPaths: manifest.commonPaths,
  excludedPaths: manifest.excludedPaths,
  protectedDownstreamPaths: manifest.protectedDownstreamPaths,
  previousAccepted: manifest.previousAccepted,
  rollback: manifest.rollback,
}, null, 2)}\n`);
