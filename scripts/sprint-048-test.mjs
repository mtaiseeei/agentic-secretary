#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digestPaths, digestTree, evaluatePreWriteGate, validateHandoffTemplate } from "./sprint-048-handoff.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "agentic-s048-"));
const archiveRoot = join(work, "git-free");
const checkoutRoot = join(work, "clean-checkout");
const results = [];
const version = "0.11.0";
const critical = new Set(["PK-001", "PK-002", "PK-004", "PK-005", "PK-007", "PK-010", "PK-011"]);

function json(root, path) { return JSON.parse(readFileSync(join(root, path), "utf8")); }
function text(root, path) { return readFileSync(join(root, path), "utf8"); }
function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repo,
    encoding: "utf8",
    timeout: options.timeout || 180_000,
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, ...(options.env || {}) },
  });
}
function assertRun(result, label) { assert.equal(result.status, 0, `${label}\n${result.stdout}\n${result.stderr}`); }
function registry() {
  const body = text(repo, "docs/spec/clarity-acceptance.md").match(/<!-- clarity-acceptance-registry:start -->\s*```json\s*([\s\S]*?)\s*```/u)?.[1];
  assert(body, "acceptance registry JSON missing");
  return JSON.parse(body).primaryCaseIds["sprint-048"];
}
function copyCandidate(destination) {
  cpSync(repo, destination, {
    recursive: true,
    filter: (source) => {
      const relative = source.slice(repo.length).replace(/^\//u, "");
      return relative !== ".git" && !relative.startsWith(".git/");
    },
  });
}
function expectFailure(fn, code) {
  assert.throws(fn, (error) => error instanceof Error && error.message.startsWith(code), `expected ${code}`);
}
function validator(root) { return run(process.execPath, [join(root, "scripts/sprint-048-validator.mjs"), "--root", root], { cwd: root }); }
function mutateJson(root, path, mutate) {
  const absolute = join(root, path); const original = readFileSync(absolute); const value = JSON.parse(original.toString("utf8"));
  mutate(value); writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
  return () => writeFileSync(absolute, original);
}
async function test(id, title, fn) {
  assert(expected.includes(id), `unexpected target ${id}`);
  assert(!results.some((entry) => entry.id === id), `duplicate target ${id}`);
  try { await fn(); results.push({ id, ok: true }); process.stdout.write(`PASS ${id} ${title}\n`); }
  catch (error) { results.push({ id, ok: false }); process.stdout.write(`FAIL ${id} ${title}: ${error?.stack || error}\n`); }
}

const expected = registry();
assert.deepEqual(expected, Array.from({ length: 12 }, (_, index) => `PK-${String(index + 1).padStart(3, "0")}`));
const upstreamBefore = {
  head: run("git", ["rev-parse", "HEAD"]).stdout.trim(),
  branch: run("git", ["branch", "--show-current"]).stdout.trim(),
  remotes: run("git", ["remote", "-v"]).stdout,
  remoteRefs: run("git", ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/remotes"]).stdout,
};

try {
  await test("PK-001", "Claude manifestは0.11.0のClarity Skill／共通Hookを列挙", () => {
    const manifest = json(repo, "plugins/secretary/.claude-plugin/plugin.json");
    assert.equal(manifest.version, version); assert.equal(manifest.skills, "./skills/"); assert.equal(manifest.hooks, "./hooks/hooks.json");
    assert.match(manifest.description, /技術者向けAI秘書/u);
  });
  await test("PK-002", "Codex manifestはClaudeと同じSkill／Hook treeを列挙", () => {
    const claude = json(repo, "plugins/secretary/.claude-plugin/plugin.json"); const codex = json(repo, "plugins/secretary/.codex-plugin/plugin.json");
    assert.equal(codex.version, version); assert.equal(codex.skills, claude.skills); assert.equal(codex.hooks, claude.hooks);
  });
  await test("PK-003", "両marketplace metadataは同一candidate sourceを指す", () => {
    const claude = json(repo, ".claude-plugin/marketplace.json").plugins[0]; const codex = json(repo, ".agents/plugins/marketplace.json").plugins[0];
    assert.equal(claude.version, version); assert.equal(claude.source, "./plugins/secretary"); assert.equal(codex.source.path, "./plugins/secretary");
    assert.equal(claude.name, codex.name);
  });
  await test("PK-004", "host inventoryは4 surfaceとClarity差分を独立記録", () => {
    const host = json(repo, "plugins/secretary/host-inventory.json");
    assert(host.skills.some((entry) => entry.name === "clarity")); assert.equal(host.clarityHook.commonManifest, "hooks/hooks.json");
    for (const surface of [host.clarityHook.hosts.claudeCode.desktop, host.clarityHook.hosts.claudeCode.cli, host.clarityHook.hosts.codex.app, host.clarityHook.hosts.codex.cli]) {
      assert.deepEqual({ status: surface.status, supported: surface.supported, verified: surface.verified, degraded: surface.degraded }, { status: "supported", supported: true, verified: false, degraded: false });
    }
  });
  await test("PK-005", "Skill inventoryは実treeと双方向一致しmissing／extra／staleを拒否", () => {
    if (!existsSync(archiveRoot)) copyCandidate(archiveRoot);
    assertRun(validator(archiveRoot), "baseline inventory validator");
    let restore = mutateJson(archiveRoot, "plugins/secretary/release-inventory.json", (value) => { value.skills.names = value.skills.names.filter((name) => name !== "clarity"); value.skills.count -= 1; });
    assert.notEqual(validator(archiveRoot).status, 0, "missing inventory fixture must fail"); restore();
    mkdirSync(join(archiveRoot, "plugins/secretary/skills/stale"), { recursive: true }); writeFileSync(join(archiveRoot, "plugins/secretary/skills/stale/SKILL.md"), "# stale\n");
    assert.notEqual(validator(archiveRoot).status, 0, "extra tree fixture must fail"); rmSync(join(archiveRoot, "plugins/secretary/skills/stale"), { recursive: true, force: true });
    restore = mutateJson(archiveRoot, "plugins/secretary/release-inventory.json", (value) => { value.candidateVersion = "0.10.2"; });
    assert.notEqual(validator(archiveRoot).status, 0, "stale version fixture must fail"); restore();
    assertRun(validator(archiveRoot), "restored inventory validator");
  });
  await test("PK-006", "CHANGELOG／README／guideはAgentic source candidate段階を明示", () => {
    assert(text(repo, "plugins/secretary/CHANGELOG.md").startsWith("# 変更履歴\n\n## [0.11.0] - 2026-08-28"));
    assert.equal(readFileSync(join(repo, "plugins/secretary/CHANGELOG.md")).compare(readFileSync(join(repo, "plugins/yasashii-secretary/CHANGELOG.md"))), 0);
    for (const path of ["README.md", "docs/guide/getting-started.md", "docs/guide/project-clarity.md"]) assert.match(text(repo, path), /source candidate/u);
    assert.match(text(repo, "plugins/secretary/CHANGELOG.md"), /Yasashii版とprivate版.*未展開/u);
  });
  await test("PK-007", "existing master regressionは0 FAIL", () => {
    const result = run("bash", ["scripts/agentic-regression.sh"], { timeout: 900_000 });
    assertRun(result, "agentic master regression"); assert.match(result.stdout, /AGENTIC_REGRESSION_PASS=15 FAIL=0/u);
  });
  await test("PK-008", "Git-free archive相当treeでvalidator／Clarity回帰が合格", () => {
    if (!existsSync(archiveRoot)) copyCandidate(archiveRoot);
    assert(!existsSync(join(archiveRoot, ".git"))); assertRun(validator(archiveRoot), "Git-free validator");
    const clarity = run("bash", ["scripts/sprint-047-regression.sh"], { cwd: archiveRoot, timeout: 600_000 });
    assertRun(clarity, "Git-free Clarity regression"); assert.match(clarity.stdout, /SPRINT047_REGRESSION_PASS=25 FAIL=0/u);
    const sourceDigest = digestTree(repo); const archiveDigest = digestTree(archiveRoot);
    assert.deepEqual({ sha256: archiveDigest.sha256, fileCount: archiveDigest.fileCount }, { sha256: sourceDigest.sha256, fileCount: sourceDigest.fileCount });
  });
  await test("PK-009", "同一bytesのclean checkout相当treeでvalidator合格", () => {
    copyCandidate(checkoutRoot);
    assertRun(run("git", ["init", "-q", "-b", "main"], { cwd: checkoutRoot }), "git init"); assertRun(run("git", ["add", "."], { cwd: checkoutRoot }), "git add");
    const env = { GIT_AUTHOR_NAME: "Sprint 048", GIT_AUTHOR_EMAIL: "s048@example.invalid", GIT_COMMITTER_NAME: "Sprint 048", GIT_COMMITTER_EMAIL: "s048@example.invalid" };
    assertRun(run("git", ["commit", "-qm", "candidate fixture"], { cwd: checkoutRoot, env }), "git commit");
    assert.equal(run("git", ["status", "--porcelain"], { cwd: checkoutRoot }).stdout, ""); assertRun(validator(checkoutRoot), "clean checkout validator");
    const checkoutDigest = digestTree(checkoutRoot); const archiveDigest = digestTree(archiveRoot);
    assert.deepEqual({ sha256: checkoutDigest.sha256, fileCount: checkoutDigest.fileCount }, { sha256: archiveDigest.sha256, fileCount: archiveDigest.fileCount });
  });
  await test("PK-010", "host／Xmind live statusは未検証をverifiedへ昇格しない", () => {
    const host = json(repo, "plugins/secretary/host-inventory.json"); const release = json(repo, "plugins/secretary/release-inventory.json");
    const surfaces = [host.clarityHook.hosts.claudeCode.desktop, host.clarityHook.hosts.claudeCode.cli, host.clarityHook.hosts.codex.app, host.clarityHook.hosts.codex.cli];
    assert(surfaces.every((surface) => surface.verified === false));
    assert(release.xmind.editions.every((edition) => typeof edition.defaultEnabled === "boolean" && edition.selected === null && edition.verified === false));
    assert.equal(release.xmind.providers[0].id, "xmind-mcp"); assert.equal(release.xmind.providers[0].priority, 1); assert.equal(release.xmind.providers[1].priority, 2);
    assert.equal(release.xmind.providers[1].explicitApprovalRequired, true); assert.equal(release.xmind.providers[1].writeWithoutApproval, false);
  });
  await test("PK-011", "public upstream／publish／cache／downstreamへの副作用0", () => {
    const release = json(repo, "plugins/secretary/release-inventory.json");
    assert.equal(release.releaseState.sourcePrepared, true); for (const [key, value] of Object.entries(release.releaseState)) if (key !== "sourcePrepared") assert.equal(value, false, key);
    const after = { head: run("git", ["rev-parse", "HEAD"]).stdout.trim(), branch: run("git", ["branch", "--show-current"]).stdout.trim(), remotes: run("git", ["remote", "-v"]).stdout, remoteRefs: run("git", ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/remotes"]).stdout };
    assert.deepEqual(after, upstreamBefore);
  });
  await test("PK-012", "fixed handoff schemaとpre-write gateは正例／負例を安全に判定", () => {
    const template = validateHandoffTemplate(repo); const tree = digestTree(repo); const common = digestPaths(repo, template.commonPaths);
    const protectedDigests = {}; for (const id of template.downstreamOrder) protectedDigests[id] = Object.fromEntries(template.protectedDownstreamPaths[id].map((path) => [path, "b".repeat(64)]));
    const ready = structuredClone(template); ready.publicationStatus = "public-evaluator-pass"; ready.preWriteGate.status = "ready"; ready.acceptedSource = { fullSha: "a".repeat(40), treeSha256: tree.sha256, commonTreeSha256: common.sha256, fileCount: tree.fileCount }; ready.protectedDigests = structuredClone(protectedDigests);
    const positive = evaluatePreWriteGate({ root: repo, template, ready, candidateRoot: repo, observedSha: "a".repeat(40), protectedSnapshot: protectedDigests });
    assert.deepEqual({ status: positive.status, writesDownstream: positive.writesDownstream, protectedVerified: positive.protectedVerified }, { status: "ready", writesDownstream: false, protectedVerified: true });
    const mismatch = structuredClone(protectedDigests); mismatch[template.downstreamOrder[0]][template.protectedDownstreamPaths[template.downstreamOrder[0]][0]] = "c".repeat(64);
    expectFailure(() => evaluatePreWriteGate({ root: repo, template, ready, candidateRoot: repo, observedSha: "a".repeat(40), protectedSnapshot: mismatch }), "protected-digest-mismatch");
    const noExcluded = structuredClone(template); noExcluded.excludedPaths = noExcluded.excludedPaths.filter((path) => path !== ".git/**"); expectFailure(() => validateHandoffTemplate(repo, noExcluded), "handoff-excluded-path-missing");
    for (const unsafe of ["my-vault/05/02/private.md", "plugins/yasashii-secretary/skills/clarity/SKILL.md"]) { const mixed = structuredClone(template); mixed.commonPaths.push(unsafe); expectFailure(() => validateHandoffTemplate(repo, mixed), "handoff-common-path-unsafe"); }
    expectFailure(() => evaluatePreWriteGate({ root: repo, template, ready, candidateRoot: repo, observedSha: "d".repeat(40), protectedSnapshot: protectedDigests }), "stale-source-sha");
    const wrongTree = structuredClone(ready); wrongTree.acceptedSource.treeSha256 = "e".repeat(64); expectFailure(() => evaluatePreWriteGate({ root: repo, template, ready: wrongTree, candidateRoot: repo, observedSha: "a".repeat(40), protectedSnapshot: protectedDigests }), "candidate-tree-mismatch");
    const closed = structuredClone(ready); closed.preWriteGate.status = "closed"; expectFailure(() => evaluatePreWriteGate({ root: repo, template, ready: closed, candidateRoot: repo, observedSha: "a".repeat(40), protectedSnapshot: protectedDigests }), "prewrite-not-ready");
    assert.equal(template.acceptedSource, null); assert.equal(template.preWriteGate.writesDownstream, false);
  });

  const actual = results.map((entry) => entry.id); const missing = expected.filter((id) => !actual.includes(id)); const extra = actual.filter((id) => !expected.includes(id)); const duplicate = actual.filter((id, index) => actual.indexOf(id) !== index); const failed = results.filter((entry) => !entry.ok);
  assert.deepEqual({ missing, extra, duplicate }, { missing: [], extra: [], duplicate: [] }); assert.equal(results.length, 12); assert.equal(failed.length, 0, `failed targets: ${failed.map((entry) => entry.id).join(",")}`);
  assert.equal(results.filter((entry) => critical.has(entry.id) && entry.ok).length, critical.size);
  process.stdout.write(`SPRINT048_PASS=12 FAIL=0 REGISTRY_MISSING=0 REGISTRY_DUPLICATE=0 REGISTRY_EXTRA=0 CRITICAL_PASS=${critical.size} CRITICAL_NOT_RUN=0 AC_EXECUTED=6 AC_NOT_RUN=0\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
