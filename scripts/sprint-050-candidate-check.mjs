#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digestPaths, digestTree, validateHandoffTemplate } from "./sprint-048-handoff.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const option = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const source = resolve(option("--root") || repo);
const outputPath = option("--report") ? resolve(option("--report")) : null;
const work = mkdtempSync(join(tmpdir(), "agentic-s050-candidate-"));
const checkout = join(work, "detached-checkout");
const archive = join(work, "git-free-archive");
const tarPath = join(work, "candidate.tar");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || source,
    encoding: "utf8",
    timeout: options.timeout || 900_000,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", ...(options.env || {}) },
  });
}
function ok(result, label) {
  assert.equal(result.status, 0, `${label}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  return result.stdout.trim();
}
function verifyCandidate(root, label) {
  ok(run(process.execPath, [join(root, "scripts/sprint-048-validator.mjs"), "--root", root], { cwd: root }), `${label} strict validator`);
  ok(run("python3", [join(root, "scripts/check-release-integrity.py")], { cwd: root }), `${label} release integrity`);
  ok(run(process.execPath, [join(root, "scripts/sprint-048-handoff.mjs"), "validate-template", "--root", root], { cwd: root }), `${label} fixed handoff`);
}

try {
  const fullSha = ok(run("git", ["rev-parse", "--verify", "HEAD"]), "candidate SHA");
  assert.match(fullSha, /^[0-9a-f]{40}$/u);
  assert.equal(ok(run("git", ["status", "--porcelain=v1", "--untracked-files=all"]), "candidate clean check"), "", "source candidate must be clean");

  ok(run("git", ["clone", "--quiet", "--no-hardlinks", "--no-checkout", source, checkout], { cwd: work }), "local clean clone");
  ok(run("git", ["checkout", "--quiet", "--detach", fullSha], { cwd: checkout }), "detached checkout");
  assert.equal(ok(run("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: checkout }), "detached checkout clean check"), "");

  mkdirSync(archive);
  ok(run("git", ["archive", "--format=tar", `--output=${tarPath}`, fullSha]), "Git-free archive creation");
  ok(run("tar", ["-xf", tarPath, "-C", archive], { cwd: work }), "Git-free archive extraction");
  assert.equal(existsSync(join(archive, ".git")), false, "archive must not contain .git");

  const template = validateHandoffTemplate(source);
  const sourceTree = digestTree(source);
  const checkoutTree = digestTree(checkout);
  const archiveTree = digestTree(archive);
  assert.deepEqual({ sha256: checkoutTree.sha256, fileCount: checkoutTree.fileCount, paths: checkoutTree.paths }, { sha256: sourceTree.sha256, fileCount: sourceTree.fileCount, paths: sourceTree.paths });
  assert.deepEqual({ sha256: archiveTree.sha256, fileCount: archiveTree.fileCount, paths: archiveTree.paths }, { sha256: sourceTree.sha256, fileCount: sourceTree.fileCount, paths: sourceTree.paths });

  const sourceCommon = digestPaths(source, template.commonPaths);
  const checkoutCommon = digestPaths(checkout, template.commonPaths);
  const archiveCommon = digestPaths(archive, template.commonPaths);
  assert.deepEqual(checkoutCommon, sourceCommon);
  assert.deepEqual(archiveCommon, sourceCommon);

  verifyCandidate(checkout, "clean detached checkout");
  verifyCandidate(archive, "Git-free archive");

  const report = {
    schemaVersion: 1,
    fullSha,
    tree: { sha256: sourceTree.sha256, fileCount: sourceTree.fileCount },
    common: sourceCommon,
    parity: { sortedPathModeBytes: true, fileCount: true, commonPathDigest: true, archiveGitEntries: 0 },
    source: "clean",
    checkout: { detached: true, clean: true },
    archive: { gitFree: true },
    handoff: {
      publicationStatus: template.publicationStatus,
      acceptedSource: template.acceptedSource,
      gate: template.preWriteGate.status,
      writesDownstream: template.preWriteGate.writesDownstream,
      commonPaths: template.commonPaths.length,
      excludedPaths: template.excludedPaths,
      protectedDownstreamPaths: template.protectedDownstreamPaths,
      adapterSeams: template.adapterSeams,
      rollback: template.rollback,
    },
    externalWrites: 0,
    downstreamWrites: 0,
  };
  assert.deepEqual({ publicationStatus: report.handoff.publicationStatus, acceptedSource: report.handoff.acceptedSource, gate: report.handoff.gate, writesDownstream: report.handoff.writesDownstream }, {
    publicationStatus: "pending-public-evaluator-pass", acceptedSource: null, gate: "closed", writesDownstream: false,
  });
  if (outputPath) {
    const { writeFileSync } = await import("node:fs");
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`SPRINT050_CANDIDATE SHA=${fullSha} TREE=${sourceTree.sha256} FILES=${sourceTree.fileCount} COMMON=${sourceCommon.sha256} COMMON_FILES=${sourceCommon.fileCount} CHECKOUT_MATCH=1 ARCHIVE_MATCH=1 ARCHIVE_GIT=0 HANDOFF_GATE=closed DOWNSTREAM_WRITE=0\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
