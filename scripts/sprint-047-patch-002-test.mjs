#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyInit } from "../plugins/secretary/scripts/lib/clarity-core.mjs";
import {
  resolveClarityRoot,
  withClarityGitProbeRunnerForTest,
  withClarityRootRevalidationObserverForTest,
  withClarityRootRevalidationScope,
  withClarityRootRequest,
} from "../plugins/secretary/scripts/lib/clarity-root.mjs";
import { safeWritePath } from "../plugins/secretary/scripts/lib/safe-fs.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = realpathSync(mkdtempSync(join(tmpdir(), "clarity-patch-002-")));
const results = [];
const sha = (value) => createHash("sha256").update(value).digest("hex");
let windows8dot3Status = process.platform === "win32" ? "NOT-RUN:8dot3-unavailable" : "NOT-RUN:not-win32";

function physicalIdentity(path) {
  const stat = statSync(path);
  return {
    dev: String(stat.dev), ino: String(stat.ino), mode: stat.mode,
    kind: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other",
  };
}

function assertSamePhysicalPath(actual, expected) {
  assert.deepEqual(physicalIdentity(actual), physicalIdentity(expected));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || sourceRoot,
    encoding: "utf8",
    timeout: options.timeout || 30_000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...(options.env || {}) },
  });
}

function git(root, ...args) {
  const result = run("git", args, {
    cwd: root,
    env: {
      GIT_AUTHOR_NAME: "Clarity Fixture",
      GIT_AUTHOR_EMAIL: "clarity@example.invalid",
      GIT_COMMITTER_NAME: "Clarity Fixture",
      GIT_COMMITTER_EMAIL: "clarity@example.invalid",
    },
  });
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function makeRepo(path) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "README.md"), "# Git identity fixture\n\nCurrent local source.\n");
  git(path, "init", "-q");
  git(path, "add", "README.md");
  git(path, "commit", "-qm", "fixture");
  return path;
}

function gitProbeOutput(root) {
  return git(root, "rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir");
}

function windowsShortPath(path) {
  const command = `for %I in ("${path.replaceAll('"', '""')}") do @echo %~sI`;
  const result = run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command]);
  if (result.status !== 0) return null;
  const shortPath = result.stdout.trim();
  if (!shortPath || !existsSync(shortPath)) return null;
  assertSamePhysicalPath(shortPath, path);
  return shortPath;
}

function productSnapshot(root) {
  const rows = [];
  function visit(directory) {
    if (!existsSync(directory)) return;
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      const rel = relative(root, path).replaceAll("\\", "/");
      if (stat.isDirectory()) visit(path);
      else rows.push([rel, stat.size, sha(readFileSync(path))]);
    }
  }
  visit(join(root, ".clarity"));
  if (existsSync(join(root, "CLARITY.md"))) rows.push(["CLARITY.md", sha(readFileSync(join(root, "CLARITY.md")))]);
  return sha(JSON.stringify(rows));
}

function residue(root) {
  if (!existsSync(join(root, ".clarity"))) return [];
  const rows = [];
  function visit(directory) {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isDirectory()) visit(path);
      else if (name === "lock.json" || name.includes(".tmp-") || name.startsWith("operation-")) rows.push(relative(root, path));
    }
  }
  visit(join(root, ".clarity"));
  return rows.sort();
}

function expectCode(fn, code) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert(caught, `expected ${code}`);
  assert.equal(caught.code, code, caught.stack);
  return caught;
}

async function test(id, label, callback) {
  try {
    await callback();
    results.push({ id, ok: true });
    process.stdout.write(`PASS ${id} ${label}\n`);
  } catch (error) {
    results.push({ id, ok: false });
    process.stdout.write(`FAIL ${id} ${label}: ${error?.stack || error}\n`);
  }
}

process.env.CLARITY_TEST_MODE = "1";

try {
  await test("GI-001", "one bounded combined Git probe serves a whole request", () => {
    const root = makeRepo(join(fixture, "combined repo 日本語"));
    const stdout = gitProbeOutput(root);
    const calls = [];
    const before = productSnapshot(root);
    withClarityGitProbeRunnerForTest((binary, args, options) => {
      calls.push({ binary, args, options });
      return { status: 0, signal: null, stdout, stderr: "" };
    }, () => withClarityRootRequest(() => {
      const handle = resolveClarityRoot(root);
      assert.equal(handle.observation.git.kind, "git");
      assertSamePhysicalPath(dirname(dirname(safeWritePath(handle.root, ".clarity/events.jsonl"))), root);
      assertSamePhysicalPath(dirname(dirname(safeWritePath(handle.root, ".clarity/state.json"))), root);
      assert.equal(resolveClarityRoot(root).observationToken, handle.observationToken);
    }));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args.slice(-5), ["rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir"]);
    assert.equal(calls[0].options.timeoutMs, 5_000);
    assert.equal(calls[0].options.maxBuffer, 1024 * 1024);
    assert.equal(calls[0].options.env.GIT_TERMINAL_PROMPT, "0");
    assert.equal(calls[0].options.env.GIT_OPTIONAL_LOCKS, "0");
    assert.equal(productSnapshot(root), before);
    assert.deepEqual(residue(root), []);
  });

  await test("GI-002", "request boundaries never reuse a stale Git observation", () => {
    const root = makeRepo(join(fixture, "fresh-request"));
    const stdout = gitProbeOutput(root);
    let calls = 0;
    withClarityGitProbeRunnerForTest(() => {
      calls += 1;
      return { status: 0, signal: null, stdout, stderr: "" };
    }, () => {
      withClarityRootRequest(() => resolveClarityRoot(root));
      withClarityRootRequest(() => resolveClarityRoot(root));
    });
    assert.equal(calls, 2);
  });

  await test("GI-003", "non-Git roots remain a bounded positive without writes", () => {
    const root = join(fixture, "non-git");
    mkdirSync(root);
    writeFileSync(join(root, "README.md"), "# Non Git fixture\n");
    const before = productSnapshot(root);
    let calls = 0;
    withClarityGitProbeRunnerForTest(() => {
      calls += 1;
      return { status: 128, signal: null, stdout: "", stderr: "not recorded" };
    }, () => withClarityRootRequest(() => {
      const handle = resolveClarityRoot(root);
      assert.equal(handle.observation.git.kind, "non-git");
      safeWritePath(handle.root, ".clarity/project.json");
    }));
    assert.equal(calls, 1);
    assert.equal(productSnapshot(root), before);
  });

  await test("GI-004", "malformed and oversized-shape Git output fails before every write", () => {
    const root = makeRepo(join(fixture, "malformed"));
    const top = realpathSync(root);
    const gitDir = realpathSync(join(root, ".git"));
    const malformed = [
      "",
      `${top}\n${gitDir}\n`,
      `${top}\n${gitDir}\n${gitDir}\nextra\n`,
      `${top}\0\n${gitDir}\n${gitDir}\n`,
      `relative\n${gitDir}\n${gitDir}\n`,
      `${top}\n${gitDir}\n${gitDir}`,
      `${"x".repeat(32 * 1024 + 1)}\n${gitDir}\n${gitDir}\n`,
    ];
    for (const stdout of malformed) {
      const before = productSnapshot(root);
      let calls = 0;
      withClarityGitProbeRunnerForTest(() => {
        calls += 1;
        return { status: 0, signal: null, stdout, stderr: "" };
      }, () => expectCode(() => applyInit(root), "clarity-git-output-invalid"));
      assert.equal(calls, 1);
      assert.equal(productSnapshot(root), before);
      assert.deepEqual(residue(root), []);
    }
  });

  await test("GI-005", "Git timeout is not retried or rounded into non-Git", () => {
    const root = makeRepo(join(fixture, "timeout"));
    const before = productSnapshot(root);
    let calls = 0;
    withClarityGitProbeRunnerForTest(() => {
      calls += 1;
      throw Object.assign(new Error("synthetic timeout"), { code: "timeout" });
    }, () => expectCode(() => applyInit(root), "timeout"));
    assert.equal(calls, 1);
    assert.equal(productSnapshot(root), before);
    assert.deepEqual(residue(root), []);
  });

  await test("GI-006", "unexpected Git failure and execution failure remain fail closed", () => {
    const root = makeRepo(join(fixture, "unexpected-failure"));
    for (const runner of [
      () => ({ status: 7, signal: null, stdout: "", stderr: "not recorded" }),
      () => { throw Object.assign(new Error("synthetic execution failure"), { code: "ENOENT" }); },
    ]) {
      const before = productSnapshot(root);
      withClarityGitProbeRunnerForTest(runner, () => expectCode(() => applyInit(root), "clarity-git-identity-unavailable"));
      assert.equal(productSnapshot(root), before);
      assert.deepEqual(residue(root), []);
    }
  });

  await test("GI-007", "non-directory and cross-Repo identity output is rejected", () => {
    const root = makeRepo(join(fixture, "invalid-directory"));
    const peer = makeRepo(join(fixture, "peer-repo"));
    const top = realpathSync(root);
    const ownGit = realpathSync(join(root, ".git"));
    const peerGit = realpathSync(join(peer, ".git"));
    const outputs = [
      `${top}\n${join(root, "README.md")}\n${ownGit}\n`,
      `${top}\n${peerGit}\n${peerGit}\n`,
    ];
    for (const stdout of outputs) {
      const before = productSnapshot(root);
      withClarityGitProbeRunnerForTest(() => ({ status: 0, signal: null, stdout, stderr: "" }), () => {
        const error = expectCode(() => applyInit(root), stdout.includes("README.md") ? "clarity-git-path-unsafe" : "clarity-git-identity-mismatch");
        assert.equal(error.details.changed, false);
      });
      assert.equal(productSnapshot(root), before);
      assert.deepEqual(residue(root), []);
    }
  });

  await test("GI-008", "a newly nested Repo changes parent identity before write", () => {
    const parent = makeRepo(join(fixture, "parent-repo"));
    const root = join(parent, "nested-root");
    mkdirSync(root);
    writeFileSync(join(root, "README.md"), "# Nested root\n");
    const stdout = gitProbeOutput(root);
    const before = productSnapshot(root);
    withClarityGitProbeRunnerForTest(() => ({ status: 0, signal: null, stdout, stderr: "" }), () => withClarityRootRequest(() => {
      const handle = resolveClarityRoot(root);
      assertSamePhysicalPath(handle.observation.git.top, parent);
      git(root, "init", "-q");
      expectCode(() => safeWritePath(handle.root, ".clarity/project.json"), "clarity-root-changed");
    }));
    assert.equal(productSnapshot(root), before);
    assert.deepEqual(residue(root), []);
  });

  await test("GI-009", "linked worktree common config identity changes before write", () => {
    const main = makeRepo(join(fixture, "main-worktree"));
    const linked = join(fixture, "linked-worktree");
    git(main, "worktree", "add", "-q", "-b", "patch-002-linked", linked);
    const stdout = gitProbeOutput(linked);
    const before = productSnapshot(linked);
    withClarityGitProbeRunnerForTest(() => ({ status: 0, signal: null, stdout, stderr: "" }), () => withClarityRootRequest(() => {
      const handle = resolveClarityRoot(linked);
      assert.notDeepEqual(physicalIdentity(handle.observation.git.gitDir), physicalIdentity(handle.observation.git.commonGitDir));
      git(main, "config", "clarity.patch002", "changed");
      expectCode(() => safeWritePath(handle.root, ".clarity/project.json"), "clarity-root-changed");
    }));
    assert.equal(productSnapshot(linked), before);
    assert.deepEqual(residue(linked), []);
  });

  await test("GI-010", "CRLF parsing preserves the same physical Git identity", () => {
    const root = makeRepo(join(fixture, "crlf-output"));
    const stdout = gitProbeOutput(root).replaceAll("\n", "\r\n");
    withClarityGitProbeRunnerForTest(() => ({ status: 0, signal: null, stdout, stderr: "" }), () => withClarityRootRequest(() => {
      const handle = resolveClarityRoot(root);
      assertSamePhysicalPath(handle.observation.git.top, root);
      assertSamePhysicalPath(handle.observation.git.gitDir, join(root, ".git"));
      assertSamePhysicalPath(handle.observation.git.commonGitDir, join(root, ".git"));
    }));
  });

  await test("GI-011", "Windows long and 8.3 spellings resolve to one physical Git identity", () => {
    if (process.platform !== "win32") return;
    const root = makeRepo(join(fixture, "windows long physical identity repo"));
    const longRows = gitProbeOutput(root).trimEnd().split(/\r?\n/u);
    const shortRows = longRows.map(windowsShortPath);
    if (shortRows.some((path) => !path) || shortRows.every((path, index) => path.toLowerCase() === longRows[index].toLowerCase())) return;
    windows8dot3Status = "RUN";
    const stdout = `${shortRows.join("\r\n")}\r\n`;
    const before = productSnapshot(root);
    withClarityGitProbeRunnerForTest(() => ({ status: 0, signal: null, stdout, stderr: "" }), () => withClarityRootRequest(() => {
      const handle = resolveClarityRoot(root);
      assertSamePhysicalPath(handle.observation.git.top, root);
      assertSamePhysicalPath(handle.observation.git.gitDir, join(root, ".git"));
      assertSamePhysicalPath(handle.observation.git.commonGitDir, join(root, ".git"));
      assertSamePhysicalPath(dirname(dirname(safeWritePath(handle.root, ".clarity/project.json"))), root);
    }));
    assert.equal(productSnapshot(root), before);
    assert.deepEqual(residue(root), []);
  });

  await test("GI-012", "one synchronous write boundary shares validation but the next boundary is fresh", () => {
    const main = makeRepo(join(fixture, "write-boundary"));
    const linked = join(fixture, "write-boundary-linked");
    git(main, "worktree", "add", "-q", "-b", "patch-002-write-boundary", linked);
    const stdout = gitProbeOutput(linked);
    const before = productSnapshot(linked);
    const validations = [];
    withClarityGitProbeRunnerForTest(() => ({ status: 0, signal: null, stdout, stderr: "" }), () => {
      withClarityRootRevalidationObserverForTest((row) => validations.push(row), () => withClarityRootRequest(() => {
        const handle = resolveClarityRoot(linked);
        let mutationPath;
        withClarityRootRevalidationScope(handle.root, () => {
          safeWritePath(handle.root, ".clarity/events.jsonl");
          safeWritePath(handle.root, ".clarity/state.json");
          safeWritePath(handle.root, ".clarity/runtime/operation.json");
          mutationPath = safeWritePath(handle.root, "write-boundary.tmp");
          writeFileSync(mutationPath, "one guarded mutation\n");
        });
        assert.equal(validations.length, 1, "one synchronous boundary must run one full validation");
        assert.equal(readFileSync(mutationPath, "utf8"), "one guarded mutation\n");
        rmSync(mutationPath);
        git(main, "config", "clarity.patch002.boundary", "changed");
        expectCode(() => withClarityRootRevalidationScope(handle.root, () => {
          safeWritePath(handle.root, ".clarity/project.json");
        }), "clarity-root-changed");
        assert.equal(validations.length, 2, "the next boundary must not reuse stale validation");
      }));
    });
    assert.equal(productSnapshot(linked), before);
    assert.deepEqual(residue(linked), []);
  });
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

const failed = results.filter((row) => !row.ok);
process.stdout.write(`SPRINT047_PATCH002_PASS=${results.length - failed.length} FAIL=${failed.length} TOTAL=${results.length} GIT_PROBES_PER_REQUEST=1 TIMEOUT_MS=5000 WINDOWS_8DOT3=${windows8dot3Status} EXTERNAL_WRITES=0 NETWORK_CALLS=0\n`);
if (failed.length) process.exitCode = 1;
