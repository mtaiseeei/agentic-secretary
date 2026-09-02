#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync,
  realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyInit, inspectRepoIdentity, previewInit } from "../plugins/secretary/scripts/lib/clarity-core.mjs";
import { compareDrift } from "../plugins/secretary/scripts/lib/clarity-drift.mjs";
import { inspectClarityHookRoot } from "../plugins/secretary/scripts/lib/clarity-hook.mjs";
import { inspectLinkIdentity, prepareLink } from "../plugins/secretary/scripts/lib/clarity-link.mjs";
import { buildProjectionBundle } from "../plugins/secretary/scripts/lib/clarity-projection.mjs";
import {
  dailyClarityRollup, observeCanonicalRepo, portfolioRollup, secretaryProjectClarityStatus, weeklyClarityRollup,
} from "../plugins/secretary/scripts/lib/clarity-secretary.mjs";
import {
  clearClarityRootObservation,
  resolveClarityRoot,
  withClarityRootObservation,
} from "../plugins/secretary/scripts/lib/clarity-root.mjs";
import { safeWritePath, workingRoot } from "../plugins/secretary/scripts/lib/safe-fs.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clarityCli = join(sourceRoot, "plugins/secretary/scripts/clarity.mjs");
const acceptance = join(sourceRoot, "docs/spec/clarity-acceptance.md");
const casesPath = join(sourceRoot, "docs/spec/clarity-acceptance-cases.md");
const fixedNow = "2026-08-30T09:00:00.000Z";
const tests = [];
const sha = (value) => createHash("sha256").update(value).digest("hex");

function test(id, label, fn) { tests.push({ id, label, fn }); }
function write(path, value) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); }
function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: options.cwd || sourceRoot, encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, CLARITY_NOW: fixedNow, CC_SECRETARY_NOW: fixedNow, ...(options.env || {}) }, input: options.input });
}
function isWithin(root, path) {
  const rel = relative(resolve(root), resolve(path));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`));
}
function parseWindowsSid(output) {
  const matches = [...new Set(String(output).match(/S-\d+(?:-\d+)+/g) || [])];
  assert.equal(matches.length, 1, "whoami.exe must yield exactly one unique SID");
  return matches[0];
}
function windowsAclPlan(unreadableRoot, backupPath, sid, relativeTarget = "README.md") {
  assert.match(sid, /^S-\d+(?:-\d+)+$/);
  return {
    whoami: { command: "whoami.exe", args: ["/user", "/fo", "csv", "/nh"], cwd: unreadableRoot, shell: false },
    save: { command: "icacls.exe", args: [relativeTarget, "/save", backupPath, "/q"], cwd: unreadableRoot, shell: false },
    deny: { command: "icacls.exe", args: [relativeTarget, "/deny", `*${sid}:(RD)`, "/q"], cwd: unreadableRoot, shell: false },
    restore: { command: "icacls.exe", args: [".", "/restore", backupPath, "/q"], cwd: unreadableRoot, shell: false },
  };
}
function assertWindowsAclPlan(plan, fixtureRoot, unreadableRoot, backupPath, sid, relativeTarget = "README.md") {
  assert.equal(isWithin(fixtureRoot, backupPath), true);
  assert.equal(isWithin(unreadableRoot, backupPath), false);
  assert.deepEqual(plan.whoami, { command: "whoami.exe", args: ["/user", "/fo", "csv", "/nh"], cwd: unreadableRoot, shell: false });
  assert.deepEqual(plan.save, { command: "icacls.exe", args: [relativeTarget, "/save", backupPath, "/q"], cwd: unreadableRoot, shell: false });
  assert.deepEqual(plan.deny, { command: "icacls.exe", args: [relativeTarget, "/deny", `*${sid}:(RD)`, "/q"], cwd: unreadableRoot, shell: false });
  assert.deepEqual(plan.restore, { command: "icacls.exe", args: [".", "/restore", backupPath, "/q"], cwd: unreadableRoot, shell: false });
  const allArgs = Object.values(plan).flatMap((entry) => entry.args);
  assert.equal(allArgs.some((arg) => ["/T", "(F)", "(M)", "(WDAC)", "(WO)", "(D)", "(OI)", "(CI)"].includes(arg.toUpperCase())), false);
}
function runWindowsCommand(spec) {
  return spawnSync(spec.command, spec.args, {
    cwd: spec.cwd,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
  });
}
function commandFailure(stage, result) {
  const detail = result.error instanceof Error ? `${result.error.name}:${result.error.message}` : `status=${String(result.status)} signal=${result.signal || "none"}`;
  return new Error(`${stage} failed (${detail})`);
}
function assertCommandPassed(stage, result) {
  if (result.error || result.status !== 0) throw commandFailure(stage, result);
}
function combinedFailure(primary, cleanupFailures) {
  const failures = [...(primary ? [primary] : []), ...cleanupFailures];
  if (failures.length === 0) return null;
  const summary = failures.map((error, index) => `${index === 0 && primary ? "primary" : "cleanup"}: ${error instanceof Error ? error.message : String(error)}`).join("; ");
  return new AggregateError(failures, summary);
}
function observeWindowsUnreadableRepo(unreadableRoot, fixtureRoot, relativeTarget = "README.md") {
  const targetPath = join(unreadableRoot, ...relativeTarget.split("/"));
  const beforeContent = readFileSync(targetPath);
  const beforeDigest = sha(beforeContent);
  const backupDir = join(fixtureRoot, "windows-acl-backup");
  const backupPath = join(backupDir, "target.acl");
  const whoamiSpec = windowsAclPlan(unreadableRoot, backupPath, "S-1-5-21-1", relativeTarget).whoami;
  const whoamiResult = runWindowsCommand(whoamiSpec);
  assertCommandPassed("whoami", whoamiResult);
  const sid = parseWindowsSid(whoamiResult.stdout);
  const plan = windowsAclPlan(unreadableRoot, backupPath, sid, relativeTarget);
  assertWindowsAclPlan(plan, fixtureRoot, unreadableRoot, backupPath, sid, relativeTarget);
  mkdirSync(backupDir, { recursive: true });

  let primary = null;
  let observation = null;
  try {
    const save = runWindowsCommand(plan.save);
    assertCommandPassed("icacls-save", save);
    assert.equal(existsSync(backupPath), true, "icacls-save must create the fixture-local backup");

    const deny = runWindowsCommand(plan.deny);
    assertCommandPassed("icacls-deny-read-data", deny);

    let readError = null;
    try { readFileSync(targetPath); } catch (error) { readError = error; }
    assert(readError, `${relativeTarget} must be unreadable after the deny ACE`);
    assert(["EACCES", "EPERM"].includes(readError.code), `unexpected denied-read error: ${String(readError.code)}`);

    observation = observeCanonicalRepo(pointerRecord("unreadable", unreadableRoot, relativeTarget));
    assert.equal(observation.availability, "unreadable");
    assert.equal(observation.firstFile.reason, "unreadable");
    assert.equal(observation.reason, "first-file-unreadable");
  } catch (error) {
    primary = error;
  } finally {
    const cleanupFailures = [];
    try {
      const restore = runWindowsCommand(plan.restore);
      if (restore.error || restore.status !== 0) cleanupFailures.push(commandFailure("icacls-restore", restore));
    } catch (error) {
      cleanupFailures.push(new Error(`icacls-restore failed (${error instanceof Error ? `${error.name}:${error.message}` : String(error)})`));
    }
    let afterContent = null;
    try { afterContent = readFileSync(targetPath); }
    catch (error) { cleanupFailures.push(new Error(`post-restore-read failed (${error instanceof Error ? `${error.name}:${error.message}` : String(error)})`)); }
    if (afterContent && sha(afterContent) !== beforeDigest) cleanupFailures.push(new Error(`post-restore ${relativeTarget} digest changed`));
    try { rmSync(backupDir, { recursive: true, force: true }); }
    catch (error) { cleanupFailures.push(new Error(`ACL backup cleanup failed (${error instanceof Error ? `${error.name}:${error.message}` : String(error)})`)); }
    if (existsSync(backupDir)) cleanupFailures.push(new Error("ACL backup cleanup left fixture files behind"));
    const failure = combinedFailure(primary, cleanupFailures);
    if (failure) throw failure;
  }
  return observation;
}
function git(root, ...args) {
  const result = run("git", args, { cwd: root, env: { GIT_AUTHOR_NAME: "Clarity Fixture", GIT_AUTHOR_EMAIL: "clarity@example.invalid", GIT_COMMITTER_NAME: "Clarity Fixture", GIT_COMMITTER_EMAIL: "clarity@example.invalid" } });
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}
function makeRepo(root, { initialized = false } = {}) {
  mkdirSync(root, { recursive: true });
  write(join(root, "README.md"), "# Alias fixture\n\nCurrent canonical state.\n");
  git(root, "init", "-q"); git(root, "add", "README.md"); git(root, "commit", "-qm", "fixture");
  if (initialized) applyInit(root);
  return root;
}
function tree(root) {
  const rows = [];
  function visit(dir) {
    for (const name of readdirSync(dir).sort()) {
      if (name === ".git") continue;
      const path = join(dir, name); const rel = relative(root, path).replaceAll("\\", "/"); const stat = lstatSync(path);
      if (stat.isSymbolicLink()) rows.push([rel, "link", readlinkSync(path)]);
      else if (stat.isDirectory()) visit(path);
      else rows.push([rel, stat.size, sha(readFileSync(path))]);
    }
  }
  visit(root); return sha(JSON.stringify(rows));
}
function gitSnapshot(root) {
  return { status: git(root, "status", "--porcelain=v1"), head: git(root, "rev-parse", "HEAD"), branch: git(root, "symbolic-ref", "--short", "HEAD"), remotes: git(root, "remote", "-v") };
}
function pointerRecord(name, repo, entry = "README.md", updatedAt = "2020-01-01") {
  return { name, scope: "open", markdown: `---\nstatus: active\nprojectType: development-pointer\nupdatedAt: ${updatedAt}\n---\n\n# ${name}\n\n## 正本repo\n\n- 場所: ${repo}\n- 最初に読むファイル: ${entry}\n` };
}
function project(root, name, repo, entry = "README.md") {
  const dir = join(root, "projects/open", name); mkdirSync(dir, { recursive: true }); write(join(dir, "PROJECT.md"), pointerRecord(name, repo, entry).markdown);
}
function expectCode(fn, code) {
  let caught = null; try { fn(); } catch (error) { caught = error; }
  assert(caught, `expected ${code}`); assert.equal(caught.code, code); return caught;
}
function cli(command, root, expected) {
  const result = run(process.execPath, [clarityCli, command, root, "--json"]); assert.equal(result.status, expected === 0 ? 0 : 3, result.stderr || result.stdout); return JSON.parse(expected === 0 ? result.stdout : result.stderr);
}
function registry() {
  const source = readFileSync(acceptance, "utf8"); const body = source.match(/<!-- clarity-acceptance-registry:start -->\s*```json\s*([\s\S]*?)\s*```/u)?.[1]; assert(body); return JSON.parse(body);
}

const fixture = mkdtempSync(join(tmpdir(), "clarity-patch-003-"));
try {
  const physicalWorkspace = join(fixture, "physical-workspace"); mkdirSync(physicalWorkspace);
  const aliasWorkspace = join(fixture, "alias-workspace"); symlinkSync(physicalWorkspace, aliasWorkspace, "dir");
  const physicalRepo = makeRepo(join(physicalWorkspace, "canonical"), { initialized: true });
  const aliasRepo = join(aliasWorkspace, "canonical");
  const peerRepo = makeRepo(join(fixture, "peer-repo"), { initialized: true });
  const secretary = join(fixture, "secretary"); mkdirSync(join(secretary, "projects/open"), { recursive: true });
  project(secretary, "開発案件", aliasRepo);

  test("CF-001", "status reads an aliased local canonical Repo with policy and identity", () => {
    const report = secretaryProjectClarityStatus(secretary, "開発案件"); const observation = report.canonicalObservation;
    assert.equal(observation.availability, "available"); assert.equal(observation.firstFile.inspected, true); assert.equal(observation.repoIdentity.kind, "git"); assert.equal(observation.clarity.status, "initialized"); assert.equal(observation.rootPolicy.source, "clarity-internal-root-resolver"); assert(observation.rootPolicy.ancestorAliasCount >= 1);
  });
  test("CF-002", "snapshot and current canonical evidence stay separate", () => {
    const observation = observeCanonicalRepo(pointerRecord("stale", aliasRepo)); assert.equal(observation.freshness, "current-at-observation"); assert.equal(observation.snapshotFreshness, "stale-snapshot"); assert(observation.observedAt); assert(observation.sourceRevision);
  });
  test("CF-003", "daily weekly and Portfolio share the canonical observation", () => {
    const stateRepo = makeRepo(join(fixture, "canonical-large-state-surface"));
    write(join(stateRepo, "docs/sprints/state.md"), Buffer.alloc(194_857, 0x78));
    const projectName = "大規模state正本案件"; project(secretary, projectName, stateRepo, "docs/sprints/state.md");
    const before = { tree: tree(stateRepo), git: gitSnapshot(stateRepo) };
    try {
      const status = secretaryProjectClarityStatus(secretary, projectName); const portfolio = portfolioRollup(secretary); const daily = dailyClarityRollup(secretary); const weekly = weeklyClarityRollup(secretary);
      const observations = [
        status.canonicalObservation,
        portfolio.projects.find((row) => row.name === projectName)?.canonicalObservation,
        daily.canonicalObservations.find((row) => row.project === projectName)?.observation,
        weekly.canonicalObservations.find((row) => row.project === projectName)?.observation,
      ];
      assert(observations.every(Boolean));
      const digests = observations.map((row) => `${row.sourceRevision}:${row.firstFile.digest}:${row.freshness}`);
      assert.equal(new Set(digests).size, 1); assert(observations.every((row) => row.firstFile.inspected && row.firstFile.bytesRead === 194_857));
      assert(observations.every((row) => row.changed === false && row.canonicalWrites === 0 && row.gitWrites === 0 && row.networkCalls === 0));
      assert.equal(daily.items.length <= 3, true);
    } finally {
      rmSync(join(secretary, "projects/open", projectName), { recursive: true, force: true });
    }
    assert.deepEqual({ tree: tree(stateRepo), git: gitSnapshot(stateRepo) }, before);
  });
  test("CF-004", "remote-only pointers never start network or Git operations", () => {
    const report = observeCanonicalRepo(pointerRecord("remote", "https://example.invalid/org/repo.git")); assert.equal(report.sourceKind, "remote-only"); assert.equal(report.availability, "unavailable"); assert.equal(report.networkCalls, 0); assert.equal(report.gitWrites, 0);
  });
  test("CF-005", "Secret binary large and symlink first files are excluded without content", () => {
    write(join(physicalRepo, ".env"), "API_TOKEN=synthetic-secret-value\n"); write(join(physicalRepo, "blob.bin"), Buffer.from([0, 1, 2])); write(join(physicalRepo, "large.md"), "x".repeat(70 * 1024)); write(join(fixture, "outside.md"), "outside canary\n"); symlinkSync(join(fixture, "outside.md"), join(physicalRepo, "linked.md"));
    const reasons = [".env", "blob.bin", "large.md", "linked.md"].map((entry) => observeCanonicalRepo(pointerRecord(entry, aliasRepo, entry)).firstFile.reason);
    assert.deepEqual(reasons, ["sensitive-name", "binary", "file-too-large", "symlink-not-followed"]); assert(!JSON.stringify(reasons).includes("synthetic-secret-value"));

    const limitRepo = makeRepo(join(fixture, "canonical-first-file-limits"));
    const statePath = join(limitRepo, "docs/sprints/state.md");
    const observe = (entry = "docs/sprints/state.md") => observeCanonicalRepo(pointerRecord(`limit-${entry}`, limitRepo, entry));
    for (const size of [194_857, 256 * 1024]) {
      write(statePath, Buffer.alloc(size, 0x78));
      const report = observe();
      assert.equal(report.firstFile.inspected, true); assert.equal(report.firstFile.bytesRead, size); assert.equal(report.firstFile.digest, sha(Buffer.alloc(size, 0x78)));
    }
    write(statePath, Buffer.alloc((256 * 1024) + 1, 0x78));
    const oversizedState = observe();
    assert.equal(oversizedState.firstFile.inspected, false); assert.equal(oversizedState.firstFile.reason, "file-too-large"); assert.equal(oversizedState.firstFile.size, (256 * 1024) + 1); assert.equal(oversizedState.availability, "stale"); assert.equal(oversizedState.freshness, "current-at-observation");

    write(join(limitRepo, "README.md"), Buffer.alloc(64 * 1024, 0x72));
    const ordinaryAtLimit = observe("README.md");
    assert.equal(ordinaryAtLimit.firstFile.inspected, true); assert.equal(ordinaryAtLimit.firstFile.bytesRead, 64 * 1024);
    write(join(limitRepo, "README.md"), Buffer.alloc((64 * 1024) + 1, 0x72));
    assert.equal(observe("README.md").firstFile.reason, "file-too-large");
    write(join(limitRepo, "docs/sprints/state-copy.md"), Buffer.alloc((64 * 1024) + 1, 0x78));
    assert.equal(observe("docs/sprints/state-copy.md").firstFile.reason, "file-too-large");
    assert.equal(observe("./docs/sprints/state.md").firstFile.reason, "path-unsafe");
    assert.equal(observe("../docs/sprints/state.md").firstFile.reason, "path-unsafe");
    assert.equal(observe(statePath).firstFile.reason, "path-unsafe");
    const backslashState = observe("docs\\sprints\\state.md").firstFile;
    assert.equal(backslashState.inspected, false); assert(["file-too-large", "missing"].includes(backslashState.reason));

    const secretCanary = "synthetic-secret-value";
    write(statePath, `api_key=${secretCanary}\n${"x".repeat(70 * 1024)}`);
    const secretState = observe(); assert.equal(secretState.firstFile.reason, "secret-like-content"); assert.equal(JSON.stringify(secretState).includes(secretCanary), false);
    const nulState = Buffer.alloc(70 * 1024, 0x78); nulState[10] = 0; write(statePath, nulState);
    assert.equal(observe().firstFile.reason, "binary");
    const externalState = join(fixture, "external-state-canary.md"); write(externalState, "external state canary\n"); rmSync(statePath); symlinkSync(externalState, statePath);
    const linkedState = observe(); assert.equal(linkedState.firstFile.reason, "symlink-not-followed"); assert.equal(JSON.stringify(linkedState).includes("external state canary"), false);
    rmSync(statePath); write(statePath, Buffer.alloc(70 * 1024, 0x78));
    if (process.platform === "win32") {
      assert.equal(observeWindowsUnreadableRepo(limitRepo, fixture, "docs/sprints/state.md").firstFile.reason, "unreadable");
    } else {
      chmodSync(statePath, 0o000);
      try { assert.equal(observe().firstFile.reason, "unreadable"); }
      finally { chmodSync(statePath, 0o644); }
    }
  });
  test("CF-006", "missing unsafe unreadable and stale sources remain truthful", () => {
    const missing = observeCanonicalRepo(pointerRecord("missing", join(fixture, "missing")));
    const selfLink = join(fixture, "repo-self-link"); symlinkSync(physicalRepo, selfLink, "dir"); const unsafe = observeCanonicalRepo(pointerRecord("unsafe", selfLink));
    const unreadableRoot = makeRepo(join(fixture, "unreadable"));
    const structuralBackup = join(fixture, "windows-acl-structure", "README.acl");
    const structuralSid = parseWindowsSid('"ignored","S-1-5-21-1"');
    assert.throws(() => parseWindowsSid('"ignored","not-a-sid"'));
    assert.throws(() => parseWindowsSid('"ignored","S-1-5-21-1 S-1-5-21-2"'));
    assertWindowsAclPlan(windowsAclPlan(unreadableRoot, structuralBackup, structuralSid), fixture, unreadableRoot, structuralBackup, structuralSid);
    const structuralFailure = combinedFailure(new Error("probe-failed"), [new Error("restore-failed")]);
    assert(structuralFailure instanceof AggregateError); assert.equal(structuralFailure.errors.length, 2); assert(structuralFailure.message.includes("probe-failed")); assert(structuralFailure.message.includes("restore-failed"));
    let unreadable;
    if (process.platform === "win32") {
      unreadable = observeWindowsUnreadableRepo(unreadableRoot, fixture);
    } else {
      chmodSync(unreadableRoot, 0o000);
      try { unreadable = observeCanonicalRepo(pointerRecord("unreadable", unreadableRoot)); }
      finally { chmodSync(unreadableRoot, 0o755); }
    }
    const stale = observeCanonicalRepo(pointerRecord("stale-entry", aliasRepo, "missing-entry.md"));
    assert.deepEqual([missing.availability, unsafe.availability, unreadable.availability, stale.availability], ["missing", "unsafe", "unreadable", "stale"]); assert([missing, unsafe, unreadable, stale].every((row) => row.changed === false && row.freshness !== "aligned"));
  });
  test("CF-007", "canonical observation preserves filesystem and Git state", () => {
    write(join(physicalRepo, "dirty.txt"), "dirty\n"); write(join(physicalRepo, "staged.txt"), "staged\n"); git(physicalRepo, "add", "staged.txt"); write(join(physicalRepo, "untracked.txt"), "untracked\n");
    const before = { tree: tree(physicalRepo), git: gitSnapshot(physicalRepo) }; const report = portfolioRollup(secretary); const after = { tree: tree(physicalRepo), git: gitSnapshot(physicalRepo) };
    assert.deepEqual(after, before); assert.equal(report.projects[0].canonicalObservation.canonicalWrites, 0); assert.equal(report.projects[0].canonicalObservation.networkCalls, 0);
  });

  const uninitializedPhysical = makeRepo(join(physicalWorkspace, "uninitialized")); const uninitializedAlias = join(aliasWorkspace, "uninitialized");
  test("AR-001", "generic workingRoot remains closed while Clarity internally opts in", () => {
    expectCode(() => workingRoot(uninitializedAlias), "working-root-unsafe"); expectCode(() => workingRoot(uninitializedAlias, { allowAncestorSymlinks: false }), "working-root-unsafe"); const error = cli("link-identity", uninitializedAlias, 3); assert.equal(error.code, "clarity-not-initialized"); assert.equal(error.changed, false);
  });
  test("AR-002", "alias and physical uninitialized identity reach the same next decision", () => {
    assert.equal(cli("link-identity", uninitializedAlias, 3).code, "clarity-not-initialized"); assert.equal(cli("link-identity", uninitializedPhysical, 3).code, "clarity-not-initialized"); assert.equal(cli("link-identity", aliasRepo, 0).projectId, cli("link-identity", physicalRepo, 0).projectId);
  });
  test("AR-003", "Repo Git and Clarity identities match", () => {
    const alias = inspectLinkIdentity(aliasRepo); const physical = inspectLinkIdentity(physicalRepo); assert.equal(alias.projectId, physical.projectId); assert.equal(alias.repositoryIdentity.identityId, physical.repositoryIdentity.identityId); assert.deepEqual(inspectRepoIdentity(aliasRepo), inspectRepoIdentity(physicalRepo));
  });
  test("AR-004", "preview is read-only and apply targets the physical .clarity tree", () => {
    write(join(uninitializedPhysical, "CLARITY.md"), "# Existing unmanaged entry\n");
    const beforeEntry = sha(readFileSync(join(uninitializedPhysical, "CLARITY.md"))); const beforeGit = gitSnapshot(uninitializedPhysical); const beforeAlias = readlinkSync(aliasWorkspace);
    const previewAlias = cli("init", uninitializedAlias, 0); const previewPhysical = cli("init", uninitializedPhysical, 0); assert.equal(previewAlias.changed, false); assert.equal(previewPhysical.changed, false); assert.deepEqual(previewAlias.writes, previewPhysical.writes);
    const result = applyInit(uninitializedAlias); assert.equal(result.status, "initialized-with-root-entry-conflict"); assert(existsSync(join(uninitializedPhysical, ".clarity/project.json"))); assert.equal(sha(readFileSync(join(uninitializedPhysical, "CLARITY.md"))), beforeEntry); assert.equal(readlinkSync(aliasWorkspace), beforeAlias);
    const afterGit = gitSnapshot(uninitializedPhysical); assert.deepEqual({ head: afterGit.head, branch: afterGit.branch, remotes: afterGit.remotes }, { head: beforeGit.head, branch: beforeGit.branch, remotes: beforeGit.remotes }); const withoutOwnedApply = (status) => status.split("\n").filter((row) => row && !row.slice(3).startsWith(".clarity/")).join("\n"); assert.equal(withoutOwnedApply(afterGit.status), withoutOwnedApply(beforeGit.status));
  });
  test("AR-005", "working root itself remains rejected", () => {
    const self = join(fixture, "self-root"); symlinkSync(physicalRepo, self, "dir"); const error = cli("status", self, 3); assert.equal(error.code, "root-self-symlink"); assert.equal(error.changed, false);
  });
  test("AR-006", "internal .clarity symlink never follows the external target", () => {
    const root = makeRepo(join(fixture, "internal-link")); const external = join(fixture, "external-clarity"); mkdirSync(external); write(join(external, "canary"), "safe\n"); symlinkSync(external, join(root, ".clarity"), "dir"); const before = tree(external); const error = cli("status", root, 3); assert.equal(error.code, "root-internal-symlink"); assert.equal(tree(external), before);
  });
  test("AR-007", "broken ancestor alias fails before Clarity inspection", () => {
    const broken = join(fixture, "broken-alias"); symlinkSync(join(fixture, "absent"), broken, "dir"); const error = cli("status", join(broken, "repo"), 3); assert.equal(error.code, "ancestor-symlink-broken"); assert.equal(error.changed, false);
  });
  test("AR-008", "alias replacement is detected before a guarded read or write", () => {
    const parentA = join(fixture, "swap-a"); const parentB = join(fixture, "swap-b"); mkdirSync(parentA); mkdirSync(parentB); const repoA = makeRepo(join(parentA, "repo"), { initialized: true }); makeRepo(join(parentB, "repo"), { initialized: true }); const alias = join(fixture, "swap"); symlinkSync(parentA, alias, "dir"); const requested = join(alias, "repo"); const resolved = resolveClarityRoot(requested); const beforeA = tree(repoA); unlinkSync(alias); symlinkSync(parentB, alias, "dir"); expectCode(() => safeWritePath(resolved.root, ".clarity/project.json"), "clarity-root-changed"); assert.equal(tree(repoA), beforeA);
    const stableRepo = makeRepo(join(fixture, "same-path-repo"), { initialized: true }); const stableObservation = resolveClarityRoot(stableRepo); const displaced = join(fixture, "same-path-repo-old"); renameSync(stableRepo, displaced); makeRepo(stableRepo); const beforeOld = tree(displaced); const beforeNew = tree(stableRepo); expectCode(() => safeWritePath(stableObservation.root, ".clarity/project.json"), "clarity-root-changed"); assert.equal(tree(displaced), beforeOld); assert.equal(tree(stableRepo), beforeNew);

    const interleavedA = join(fixture, "interleaved-a"); const interleavedB = join(fixture, "interleaved-b"); mkdirSync(interleavedA); mkdirSync(interleavedB);
    const interleavedRepoA = makeRepo(join(interleavedA, "repo"), { initialized: true }); const interleavedRepoB = makeRepo(join(interleavedB, "repo"), { initialized: true });
    const aliasOne = join(fixture, "interleaved-alias-1"); const aliasTwo = join(fixture, "interleaved-alias-2"); symlinkSync(interleavedA, aliasOne, "dir"); symlinkSync(interleavedA, aliasTwo, "dir");
    const aliasOneRequest = join(aliasOne, "repo"); const aliasTwoRequest = join(aliasTwo, "repo");
    const aliasOneHandle = resolveClarityRoot(aliasOneRequest); const aliasTwoHandle = resolveClarityRoot(aliasTwoRequest);
    assert.notEqual(aliasOneHandle.observationToken, aliasTwoHandle.observationToken);
    const repeatedAliasTwoHandle = resolveClarityRoot(aliasTwoRequest); assert.equal(repeatedAliasTwoHandle.observationToken, aliasTwoHandle.observationToken);
    const beforeInterleavedA = tree(interleavedRepoA); const beforeInterleavedB = tree(interleavedRepoB);
    unlinkSync(aliasOne); symlinkSync(interleavedB, aliasOne, "dir");
    const readError = expectCode(() => readFileSync(safeWritePath(aliasOneHandle.root, "README.md"), "utf8"), "clarity-root-changed");
    const writeError = expectCode(() => safeWritePath(aliasOneHandle.root, ".clarity/project.json"), "clarity-root-changed");
    assert.equal(readError.details.changed, false); assert.equal(writeError.details.changed, false);
    assert.equal(tree(interleavedRepoA), beforeInterleavedA); assert.equal(tree(interleavedRepoB), beforeInterleavedB);

    clearClarityRootObservation(aliasOneHandle);
    assert.equal(readFileSync(safeWritePath(aliasTwoHandle.root, "README.md"), "utf8").includes("Alias fixture"), true);
    clearClarityRootObservation(aliasTwoHandle); clearClarityRootObservation(repeatedAliasTwoHandle);
    const reused = resolveClarityRoot(aliasOneRequest); assert.equal(reused.root, realpathSync(interleavedRepoB));
    assert.equal(safeWritePath(reused.root, ".clarity/project.json"), join(realpathSync(interleavedRepoB), ".clarity/project.json"));
    clearClarityRootObservation(reused);

    const scopedA = join(fixture, "scoped-a"); const scopedB = join(fixture, "scoped-b"); mkdirSync(scopedA); mkdirSync(scopedB);
    const scopedRepoA = makeRepo(join(scopedA, "repo"), { initialized: true }); const scopedRepoB = makeRepo(join(scopedB, "repo"), { initialized: true });
    const scopedAlias = join(fixture, "scoped-alias"); symlinkSync(scopedA, scopedAlias, "dir"); const scopedRequest = join(scopedAlias, "repo");
    const beforeScopedA = tree(scopedRepoA); const beforeScopedB = tree(scopedRepoB);
    withClarityRootObservation(scopedRequest, (requestHandle) => {
      const nestedHandle = resolveClarityRoot(requestHandle.root); assert.equal(nestedHandle.observationToken, requestHandle.observationToken);
      unlinkSync(scopedAlias); symlinkSync(scopedB, scopedAlias, "dir");
      const scopedRead = expectCode(() => readFileSync(safeWritePath(requestHandle.root, "README.md"), "utf8"), "clarity-root-changed");
      const scopedWrite = expectCode(() => safeWritePath(requestHandle.root, ".clarity/project.json"), "clarity-root-changed");
      assert.equal(scopedRead.details.changed, false); assert.equal(scopedWrite.details.changed, false);
    });
    assert.equal(tree(scopedRepoA), beforeScopedA); assert.equal(tree(scopedRepoB), beforeScopedB);
    assert.equal(previewInit(scopedRepoA).initialized, true);
  });
  test("AR-009", "link bundle contains no alias or physical absolute local path", () => {
    const identity = inspectLinkIdentity(aliasRepo); const peer = inspectLinkIdentity(peerRepo); const request = prepareLink(aliasRepo, { targetProjectId: peer.projectId, targetRepositoryIdentity: peer.repositoryIdentity, localRole: "repo" }); const body = JSON.stringify(request); assert(!body.includes(aliasRepo)); assert(!body.includes(physicalRepo)); assert.equal(identity.changed, false);
  });
  test("AR-010", "alias operations preserve dirty staged untracked HEAD branch and remote", () => {
    const before = gitSnapshot(physicalRepo); inspectLinkIdentity(aliasRepo); buildProjectionBundle(aliasRepo); const after = gitSnapshot(physicalRepo); assert.deepEqual(after, before);
  });
  test("AR-011", "Drift locator symlink stays rejected in read-only comparison", () => {
    const state = JSON.parse(readFileSync(join(physicalRepo, ".clarity/state.json"), "utf8")); const itemId = state.items[0].itemId; write(join(physicalRepo, "decision.md"), "key=email\n"); symlinkSync(join(physicalRepo, "decision.md"), join(physicalRepo, "decision-link.md")); const before = gitSnapshot(physicalRepo); expectCode(() => compareDrift(aliasRepo, { schemaVersion: 1, itemId, decision: { type: "spec-section", locator: { path: "decision-link.md" }, claim: { field: "key", value: "email", markers: ["key=email"] } }, implementation: { type: "file-reference", locator: { path: "README.md" }, claim: { field: "key", value: "email", markers: ["current canonical"] } } }), "drift-path-symlink"); assert.deepEqual(gitSnapshot(physicalRepo), before);
  });
  test("AR-012", "macOS platform aliases remain normalized without user path literals", () => {
    if (process.platform === "darwin") { assert.equal(workingRoot("/tmp"), "/private/tmp"); assert.equal(workingRoot("/var"), "/private/var"); }
    const bodies = ["safe-fs.mjs", "clarity-root.mjs"].map((name) => readFileSync(join(sourceRoot, "plugins/secretary/scripts/lib", name), "utf8")).join("\n"); assert(!bodies.includes("/Users/taisei")); assert(!bodies.includes("ExternalSSD"));
  });
  test("AR-013", "file-target ancestor alias is rejected distinctly", () => {
    const file = join(fixture, "ordinary-file"); write(file, "not a directory\n"); const alias = join(fixture, "file-alias"); symlinkSync(file, alias); const error = cli("status", join(alias, "repo"), 3); assert.equal(error.code, "ancestor-symlink-not-directory"); assert.equal(error.changed, false);
  });
  test("AR-014", "all declared entrypoints share the Clarity internal physical policy and registry", () => {
    const core = previewInit(aliasRepo); const link = inspectLinkIdentity(aliasRepo); const projection = buildProjectionBundle(aliasRepo); const hook = inspectClarityHookRoot(aliasRepo); const observation = secretaryProjectClarityStatus(secretary, "開発案件").canonicalObservation; const root = resolveClarityRoot(aliasRepo);
    assert(core.initialized); assert(link.projectId); assert(projection.digest); assert.equal(hook.root, realpathSync(physicalRepo)); assert.equal(observation.rootPolicy.source, "clarity-internal-root-resolver"); assert.equal(root.policy.source, "clarity-internal-root-resolver");

    // A completed public-core request must release only its own root-observation
    // lease. Retargeting the old alias must not poison a later physical-root
    // request in the same process.
    const lifecycleC = join(fixture, "lifecycle-c"); const lifecycleD = join(fixture, "lifecycle-d"); mkdirSync(lifecycleC); mkdirSync(lifecycleD);
    const lifecycleRepoC = makeRepo(join(lifecycleC, "repo"), { initialized: true }); const lifecycleRepoD = makeRepo(join(lifecycleD, "repo"), { initialized: true });
    const lifecycleAlias = join(fixture, "lifecycle-alias"); symlinkSync(lifecycleC, lifecycleAlias, "dir"); const lifecycleAliasRepo = join(lifecycleAlias, "repo");
    const lifecycleBefore = { c: tree(lifecycleRepoC), d: tree(lifecycleRepoD), cGit: gitSnapshot(lifecycleRepoC), dGit: gitSnapshot(lifecycleRepoD) };
    assert.equal(previewInit(lifecycleAliasRepo).initialized, true); assert.equal(previewInit(lifecycleAliasRepo).initialized, true);
    unlinkSync(lifecycleAlias); symlinkSync(lifecycleD, lifecycleAlias, "dir");
    assert.equal(previewInit(lifecycleRepoC).initialized, true);
    assert.deepEqual({ c: tree(lifecycleRepoC), d: tree(lifecycleRepoD), cGit: gitSnapshot(lifecycleRepoC), dGit: gitSnapshot(lifecycleRepoD) }, lifecycleBefore);

    // The same finally-style lifecycle applies when the public operation fails.
    const failureC = join(fixture, "failure-c"); const failureD = join(fixture, "failure-d"); mkdirSync(failureC); mkdirSync(failureD);
    const failureRepoC = join(failureC, "repo"); const failureRepoD = join(failureD, "repo"); mkdirSync(failureRepoC); mkdirSync(failureRepoD);
    const failureAlias = join(fixture, "failure-alias"); symlinkSync(failureC, failureAlias, "dir"); const failureAliasRepo = join(failureAlias, "repo");
    expectCode(() => applyInit(failureAliasRepo), "no-candidates");
    unlinkSync(failureAlias); symlinkSync(failureD, failureAlias, "dir");
    assert.equal(previewInit(failureRepoC).initialized, false);

    const reg = registry(); const ids = reg.patchCaseIds["sprint-050-patch-003"]; assert.equal(ids.length, 21); assert.equal(new Set(ids).size, 21); assert.deepEqual([...ids].sort(), tests.map((row) => row.id).sort()); assert.equal(Object.keys(reg.patchCaseFeatureAssignments).length, 47); assert(ids.every((id) => reg.patchCaseFeatureAssignments[id]));
    const semantic = readFileSync(casesPath, "utf8"); for (const id of ids) assert(semantic.includes(`| ${id} | Critical |`), id);
  });

  let passed = 0; let failed = 0;
  for (const row of tests) {
    try { clearClarityRootObservation(physicalRepo); row.fn(); passed += 1; process.stdout.write(`PASS ${row.id} ${row.label}\n`); }
    catch (error) { failed += 1; process.stdout.write(`FAIL ${row.id} ${row.label}: ${error instanceof Error ? error.message : String(error)}\n`); }
  }
  process.stdout.write(`SPRINT050_PATCH003_PASS=${passed} FAIL=${failed} TOTAL=${tests.length} EXTERNAL_WRITES=0 NETWORK_CALLS=0\n`);
  if (failed) process.exitCode = 1;
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
