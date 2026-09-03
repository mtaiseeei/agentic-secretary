#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digestTree } from "./sprint-048-handoff.mjs";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "agentic-s048-candidate-"));
const checkout = join(work, "checkout");
const archive = join(work, "archive");
const tarPath = join(work, "candidate.tar");
const run = (command, args, cwd, options = {}) => {
  const output = execFileSync(command, args, { cwd, encoding: "utf8", stdio: options.capture ? "pipe" : "inherit", maxBuffer: 256 * 1024 * 1024, timeout: options.timeout || 900_000 });
  return typeof output === "string" ? output.trim() : "";
};

try {
  assert.equal(run("git", ["status", "--porcelain=v1", "--untracked-files=all"], source, { capture: true }), "", "source must be clean before candidate evidence");
  const fullSha = run("git", ["rev-parse", "HEAD"], source, { capture: true });
  assert.match(fullSha, /^[0-9a-f]{40}$/u);
  run("git", ["clone", "--quiet", "--no-hardlinks", source, checkout], source);
  // The checkout remains fully local; normalize only Git metadata so the
  // existing release regression sees the public candidate's canonical origin.
  run("git", ["remote", "set-url", "origin", "https://github.com/mtaiseeei/agentic-secretary.git"], checkout);
  assert.equal(run("git", ["status", "--porcelain=v1"], checkout, { capture: true }), "");
  run("git", ["archive", "--format=tar", "-o", tarPath, fullSha], source);
  mkdirSync(archive);
  run("tar", ["-xf", tarPath, "-C", archive], source);
  assert.equal(existsSync(join(archive, ".git")), false, "Git-free archive unexpectedly contains .git");

  const checkoutTree = digestTree(checkout); const archiveTree = digestTree(archive);
  assert.deepEqual({ sha256: archiveTree.sha256, fileCount: archiveTree.fileCount, paths: archiveTree.paths }, { sha256: checkoutTree.sha256, fileCount: checkoutTree.fileCount, paths: checkoutTree.paths });

  for (const root of [checkout, archive]) {
    run(process.execPath, [join(root, "scripts/sprint-048-validator.mjs"), "--root", root], root);
    run("python3", [join(root, "scripts/check-release-integrity.py"), "--root", root], root);
    run("bash", [join(root, "scripts/sprint-047-regression.sh")], root);
  }
  run("bash", [join(checkout, "scripts/agentic-regression.sh")], checkout);

  process.stdout.write(`SPRINT048_CANDIDATE_CHECK_PASS=10 FAIL=0 SHA=${fullSha} TREE_SHA256=${archiveTree.sha256} FILE_COUNT=${archiveTree.fileCount} CHECKOUT_CLEAN=true ARCHIVE_GIT_FREE=true SAME_BYTES=true VALIDATOR_BOTH=true CLARITY_BOTH=true MASTER_CHECKOUT=true\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
