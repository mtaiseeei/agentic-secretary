#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyInit } from "../plugins/secretary/scripts/lib/clarity-core.mjs";
import { hookEventNeedsClarityCore, serializeHookFailure } from "../plugins/secretary/scripts/lib/clarity-hook.mjs";
import {
  normalizeClarityFilesystemIdentityForTest,
  resolveClarityRoot,
  sameClarityFilesystemIdentityForTest,
  serializeClarityCliFailure,
  withClarityCliEventGitProbe,
  withClarityGitProbeRunnerForTest,
  withClarityRootRequest,
} from "../plugins/secretary/scripts/lib/clarity-root.mjs";
import { safeWritePath } from "../plugins/secretary/scripts/lib/safe-fs.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = realpathSync(mkdtempSync(join(tmpdir(), "clarity-patch-004-")));
const clarityCli = join(sourceRoot, "plugins", "secretary", "scripts", "clarity.mjs");
const clarityHook = join(sourceRoot, "plugins", "secretary", "scripts", "clarity-hook.mjs");
const results = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
let zeroWriteNegatives = 0;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || sourceRoot,
    encoding: "utf8",
    timeout: options.timeout || 30_000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...(options.env || {}) },
    input: options.input,
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
      GIT_TERMINAL_PROMPT: "0",
      GIT_OPTIONAL_LOCKS: "0",
    },
  });
  assert.equal(result.status, 0, `git ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function makeRepo(path) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "README.md"), "# Patch 004 fixture\n");
  git(path, "init", "-q");
  git(path, "add", "README.md");
  git(path, "commit", "-qm", "fixture");
  return path;
}

function hookEvents(root, sessionId) {
  const directory = join(root, ".clarity", "runtime", "hooks", "events", sessionId);
  return existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith(".json")) : [];
}

function gitDirectories(root) {
  const rows = git(root, "rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir").trim().split(/\r?\n/u);
  return { top: rows[0], gitDir: rows[1], commonGitDir: rows[2] };
}

function makeConfigFixture(label, location) {
  const main = makeRepo(join(fixtureRoot, `${label}-main`));
  if (location === "common") {
    const directories = gitDirectories(main);
    return { root: main, configPath: join(directories.commonGitDir, "config"), directories };
  }
  git(main, "config", "extensions.worktreeConfig", "true");
  const linked = join(fixtureRoot, `${label}-linked`);
  git(main, "worktree", "add", "-q", "-b", `${label}-branch`, linked);
  const directories = gitDirectories(linked);
  return { root: linked, configPath: join(directories.gitDir, "config.worktree"), directories };
}

function treeSnapshot(root) {
  const rows = [];
  function visit(path) {
    const stat = lstatSync(path, { bigint: true });
    const rel = relative(root, path).replaceAll("\\", "/") || ".";
    const base = [rel, stat.mode.toString(), stat.dev.toString(), stat.ino.toString()];
    if (stat.isSymbolicLink()) rows.push([...base, "symlink", readlinkSync(path)]);
    else if (stat.isDirectory()) {
      rows.push([...base, "directory"]);
      for (const name of readdirSync(path).sort()) visit(join(path, name));
    } else if (stat.isFile()) rows.push([...base, "file", stat.size.toString(), sha256(readFileSync(path))]);
    else rows.push([...base, "other"]);
  }
  visit(root);
  return sha256(JSON.stringify(rows));
}

function operationSnapshot(root, extraPaths = []) {
  return {
    repo: treeSnapshot(root),
    extras: extraPaths.map((path) => treeSnapshot(path)),
  };
}

function assertNoCanary(output, canaries) {
  const text = typeof output === "string" ? output : JSON.stringify(output);
  for (const canary of canaries) assert.equal(text.includes(canary), false, `absolute path canary leaked: ${canary}`);
}

function expectCode(callback, code) {
  let caught;
  try { callback(); } catch (error) { caught = error; }
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

function installUnsupportedConfig(handle, shape) {
  const outside = join(fixtureRoot, `${basename(handle.root)}-${shape}-outside`);
  mkdirSync(outside);
  if (shape === "symlink") {
    const target = join(outside, "regular-config");
    if (handle.configPath === join(handle.directories.commonGitDir, "config")) renameSync(handle.configPath, target);
    else writeFileSync(target, "[clarity]\n\tpatch004 = safe\n");
    symlinkSync(target, handle.configPath, "file");
    return { outside, canaries: [handle.root, handle.configPath, target] };
  }
  if (shape === "broken-symlink") {
    if (handle.configPath === join(handle.directories.commonGitDir, "config")) rmSync(handle.configPath);
    const target = join(outside, "missing-config");
    symlinkSync(target, handle.configPath, "file");
    return { outside, canaries: [handle.root, handle.configPath, target] };
  }
  const includeTarget = join(outside, "included-config");
  writeFileSync(includeTarget, "[user]\n\tname = must-not-be-adopted\n");
  const section = shape === "includeIf" ? `[includeIf "gitdir:never-match/"]` : "[include]";
  const body = `${section}\n\tpath = ../included-config\n`;
  if (handle.configPath === join(handle.directories.commonGitDir, "config")) appendFileSync(handle.configPath, `\n${body}`);
  else writeFileSync(handle.configPath, body);
  return { outside, canaries: [handle.root, handle.configPath, includeTarget] };
}

function assertUnsupportedViaCli(handle, shape, outside) {
  const before = operationSnapshot(handle.root, [outside.outside]);
  const result = run(process.execPath, [clarityCli, "status", handle.root, "--json"], { env: { CLARITY_TEST_MODE: "0" } });
  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "clarity-git-config-unsupported");
  assert.equal(payload.changed, false);
  assert.match(payload.details.reason, /^git-config-(?:symlink|include|include-if)-unsupported$/u);
  if (shape === "symlink" || shape === "broken-symlink") assert.equal(payload.details.reason, "git-config-symlink-unsupported");
  if (shape === "include") assert.equal(payload.details.reason, "git-config-include-unsupported");
  if (shape === "includeIf") assert.equal(payload.details.reason, "git-config-include-if-unsupported");
  const hook = serializeHookFailure("codex", "SessionStart", Object.assign(new Error(payload.message), { code: payload.code, details: payload.details }));
  assert.match(JSON.stringify(hook), new RegExp(payload.details.reason, "u"));
  assertNoCanary(`${result.stdout}\n${result.stderr}\n${JSON.stringify(hook)}`, outside.canaries);
  assert.deepEqual(operationSnapshot(handle.root, [outside.outside]), before);
  zeroWriteNegatives += 1;
}

function assertSanitizedRootChange(error, canaries) {
  assert.equal(error.code, "clarity-root-changed");
  assert.equal(error.details.changed, false);
  assert.match(error.details.reason, /^[a-z0-9-]+$/u);
  assert.deepEqual(Object.keys(error.details).sort(), ["changed", "reason"]);
  const cli = serializeClarityCliFailure(error);
  assert.equal(cli.code, "clarity-root-changed");
  assert.equal(cli.changed, false);
  assert.equal(cli.details.reason, error.details.reason);
  assert.match(cli.nextAction, /再実行/u);
  const codexHook = serializeHookFailure("codex", "SessionStart", error);
  const claudeHook = serializeHookFailure("claudeCode", "Stop", error);
  assert.match(JSON.stringify(codexHook), /degraded/u);
  assert.match(JSON.stringify(codexHook), /changed:false/u);
  assert.match(JSON.stringify(claudeHook), /manual/u);
  assertNoCanary({ cli, codexHook, claudeHook }, canaries);
}

process.env.CLARITY_TEST_MODE = "1";

try {
  for (const location of ["common", "worktree"]) {
    for (const shape of ["symlink", "broken-symlink", "include", "includeIf"]) {
      const id = `CFG-${location === "common" ? "C" : "W"}-${shape === "symlink" ? "S" : shape === "broken-symlink" ? "B" : shape === "include" ? "I" : "IF"}`;
      await test(id, `${location} ${shape} fails closed before product and Git writes`, () => {
        const handle = makeConfigFixture(`${id.toLowerCase()}-${results.length}`, location);
        const outside = installUnsupportedConfig(handle, shape);
        assertUnsupportedViaCli(handle, shape, outside);
      });
    }
  }

  await test("CFG-POS", "supported regular common and worktree configs keep one bounded Git probe", () => {
    for (const location of ["common", "worktree"]) {
      const handle = makeConfigFixture(`regular-${location}`, location);
      if (location === "worktree") writeFileSync(handle.configPath, "[clarity]\n\tpatch004 = supported\n");
      const stdout = git(handle.root, "rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir");
      const calls = [];
      const before = operationSnapshot(handle.root);
      withClarityGitProbeRunnerForTest((binary, args, options) => {
        calls.push({ binary, args, options });
        return { status: 0, signal: null, stdout, stderr: "" };
      }, () => withClarityRootRequest(() => {
        const rootHandle = resolveClarityRoot(handle.root);
        assert.equal(rootHandle.observation.git.kind, "git");
        assert.doesNotThrow(() => JSON.stringify(rootHandle.observation));
        safeWritePath(rootHandle.root, ".clarity/project.json");
      }));
      assert.equal(calls.length, 1);
      assert.equal(calls[0].options.timeoutMs, 5_000);
      assert.equal(calls[0].options.env.GIT_TERMINAL_PROMPT, "0");
      assert.equal(calls[0].options.env.GIT_OPTIONAL_LOCKS, "0");
      assert.deepEqual(operationSnapshot(handle.root), before);
    }
  });

  await test("HOOK-ALIAS", "Hook records through an ancestor alias but still rejects a root-self symlink", async () => {
    const hookLibrarySource = readFileSync(join(sourceRoot, "plugins", "secretary", "scripts", "lib", "clarity-hook.mjs"), "utf8");
    const hookEntrySource = readFileSync(clarityHook, "utf8");
    assert.equal(hookEventNeedsClarityCore({ event: "PostToolUse" }), false);
    assert.equal(hookEventNeedsClarityCore({ event: "SessionEnd" }), false);
    assert.equal(hookEventNeedsClarityCore({ event: "unknown" }), false);
    assert.equal(hookEventNeedsClarityCore({ event: "SessionStart" }), true);
    assert.equal(hookEventNeedsClarityCore({ event: "PreCompact" }), true);
    assert.equal(hookEventNeedsClarityCore({ event: "Stop", stopHookActive: false }), true);
    assert.equal(hookEventNeedsClarityCore({ event: "Stop", stopHookActive: true }), false);
    assert.doesNotMatch(hookLibrarySource, /from\s+["']\.\/clarity-core\.mjs["']/u);
    assert.match(hookEntrySource, /hookEventNeedsClarityCore\(normalized\)[\s\S]*?await import\("\.\/lib\/clarity-core\.mjs"\)/u);

    const physicalWorkspace = join(fixtureRoot, "hook-physical-workspace");
    mkdirSync(physicalWorkspace);
    const physicalRepo = makeRepo(join(physicalWorkspace, "repo"));
    applyInit(physicalRepo);
    const aliasWorkspace = join(fixtureRoot, "hook-alias-workspace");
    symlinkSync(physicalWorkspace, aliasWorkspace, process.platform === "win32" ? "junction" : "dir");
    const aliasRepo = join(aliasWorkspace, "repo");
    const itemId = JSON.parse(readFileSync(join(physicalRepo, ".clarity", "state.json"), "utf8")).items[0].itemId;
    const cliEventInput = JSON.stringify({
      type: "attention.override",
      itemId,
      actor: "cli-event-prefetch",
      payload: { level: "high", reason: "bounded CLI event probe", rank: 1 },
    });
    const cliEvent = run(process.execPath, [clarityCli, "event", aliasRepo, "--event-json", cliEventInput, "--json"]);
    assert.equal(cliEvent.status, 0, cliEvent.stderr || cliEvent.stdout);
    assert.equal(JSON.parse(cliEvent.stdout).rootPolicy.ancestorAliasCount, 1);
    assert.match(readFileSync(clarityCli, "utf8"), /command === "event"\) await withClarityCliEventGitProbe\(root, execute\)/u);

    const missingRoot = join(fixtureRoot, "cli-event-missing-root");
    const invalidJson = run(process.execPath, [clarityCli, "event", missingRoot, "--event-json", "{", "--json"]);
    assert.equal(invalidJson.status, 2);
    assert.equal(JSON.parse(invalidJson.stderr).code, "usage");
    const missingRootResult = run(process.execPath, [clarityCli, "event", missingRoot, "--event-json", cliEventInput, "--json"]);
    assert.notEqual(missingRootResult.status, 0);
    assert.equal(JSON.parse(missingRootResult.stderr).code, "working-root-unsafe");
    assert.equal(existsSync(missingRoot), false);

    let awaitedCallback = false;
    const priorGitDir = process.env.GIT_DIR;
    const changedDuringAwait = withClarityCliEventGitProbe(physicalRepo, () => { awaitedCallback = true; });
    process.env.GIT_DIR = join(fixtureRoot, "changed-after-probe-start");
    let changedError;
    try { await changedDuringAwait; } catch (error) { changedError = error; }
    finally {
      if (priorGitDir === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = priorGitDir;
    }
    assert.equal(changedError?.code, "clarity-root-changed");
    assert.equal(changedError?.details?.reason, "repo-git-identity-changed");
    assert.equal(awaitedCallback, false);

    const positiveSession = "ancestor-alias-depth-zero";
    const positive = run(process.execPath, [clarityHook], {
      input: `${JSON.stringify({
        host: "codex",
        hook_event_name: "PostToolUse",
        session_id: positiveSession,
        turn_id: "turn-positive",
        cwd: aliasRepo,
        tool_name: "Write",
        tool_input: { file_path: join(aliasRepo, "README.md") },
        tool_response: { exit_code: 0 },
      })}\n`,
    });
    assert.equal(positive.status, 0, positive.stderr || positive.stdout);
    assert.equal(positive.stdout, "");
    assert.equal(positive.stderr, "");
    assert.equal(hookEvents(physicalRepo, positiveSession).length, 1);

    const runLifecycleHook = (hookEventName, extra = {}) => run(process.execPath, [clarityHook], {
      input: `${JSON.stringify({ host: "codex", hook_event_name: hookEventName, session_id: positiveSession, cwd: aliasRepo, ...extra })}\n`,
    });
    const sessionStart = runLifecycleHook("SessionStart", { source: "startup" });
    assert.equal(sessionStart.status, 0, sessionStart.stderr || sessionStart.stdout);
    assert.match(JSON.parse(sessionStart.stdout).hookSpecificOutput.additionalContext, /clarity status \/ attention \/ checkpoint \/ doctor/u);
    const preCompact = runLifecycleHook("PreCompact", { trigger: "auto" });
    assert.equal(preCompact.status, 0, preCompact.stderr || preCompact.stdout);
    assert.equal(preCompact.stdout, "");
    const stop = runLifecycleHook("Stop");
    assert.equal(stop.status, 0, stop.stderr || stop.stdout);
    assert.equal(JSON.parse(stop.stdout).decision, "block");
    const sessionEnd = runLifecycleHook("SessionEnd", { reason: "other" });
    assert.equal(sessionEnd.status, 0, sessionEnd.stderr || sessionEnd.stdout);
    assert.equal(sessionEnd.stdout, "");
    const lifecycleKinds = hookEvents(physicalRepo, positiveSession)
      .map((name) => JSON.parse(readFileSync(join(physicalRepo, ".clarity", "runtime", "hooks", "events", positiveSession, name), "utf8")).kind)
      .sort();
    assert.deepEqual(lifecycleKinds, ["checkpoint-request", "observation", "pre-compact", "session-end-flush", "session-start"]);

    const selfRoot = join(fixtureRoot, "hook-root-self-link");
    symlinkSync(physicalRepo, selfRoot, process.platform === "win32" ? "junction" : "dir");
    const negativeSession = "root-self-symlink";
    const negative = run(process.execPath, [clarityHook], {
      input: `${JSON.stringify({
        host: "codex",
        hook_event_name: "PostToolUse",
        session_id: negativeSession,
        turn_id: "turn-negative",
        cwd: selfRoot,
        tool_name: "Write",
        tool_input: { file_path: join(selfRoot, "README.md") },
        tool_response: { exit_code: 0 },
      })}\n`,
    });
    assert.equal(negative.status, 0, negative.stderr || negative.stdout);
    assert.equal(negative.stdout, "");
    assert.equal(negative.stderr, "");
    assert.deepEqual(hookEvents(physicalRepo, negativeSession), []);
  });

  await test("CFG-CHANGE", "direct regular config bytes change is rejected at the next write boundary", () => {
    for (const location of ["common", "worktree"]) {
      const handle = makeConfigFixture(`direct-bytes-change-${location}`, location);
      if (location === "worktree") writeFileSync(handle.configPath, "[clarity]\n\tpatch004 = before\n");
      const stdout = git(handle.root, "rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir");
      let probes = 0;
      withClarityGitProbeRunnerForTest((binary, args, options) => {
        probes += 1;
        return { status: 0, signal: null, stdout, stderr: "" };
      }, () => withClarityRootRequest(() => {
        const rootHandle = resolveClarityRoot(handle.root);
        appendFileSync(handle.configPath, "\n[clarity-patch004]\n\tchanged = true\n");
        const before = operationSnapshot(handle.root);
        const error = expectCode(() => safeWritePath(rootHandle.root, ".clarity/project.json"), "clarity-root-changed");
        assert.equal(error.details.reason, "repo-git-identity-changed");
        assertSanitizedRootChange(error, [handle.root, handle.configPath, handle.directories.gitDir, handle.directories.commonGitDir]);
        assert.deepEqual(operationSnapshot(handle.root), before);
        zeroWriteNegatives += 1;
      }));
      assert.equal(probes, 1);
    }
  });

  await test("PRIV-ALIAS", "alias target change keeps CLI and Hook errors path-free", () => {
    const first = join(fixtureRoot, "alias-physical-first");
    const second = join(fixtureRoot, "alias-physical-second");
    const firstRepo = makeRepo(join(first, "repo"));
    makeRepo(join(second, "repo"));
    const alias = join(fixtureRoot, "alias-entry");
    symlinkSync(first, alias, process.platform === "win32" ? "junction" : "dir");
    const requested = join(alias, "repo");
    withClarityRootRequest(() => {
      const handle = resolveClarityRoot(requested);
      unlinkSync(alias);
      symlinkSync(second, alias, process.platform === "win32" ? "junction" : "dir");
      const before = { first: treeSnapshot(firstRepo), second: treeSnapshot(join(second, "repo")) };
      const error = expectCode(() => safeWritePath(handle.root, ".clarity/project.json"), "clarity-root-changed");
      assert.equal(error.details.reason, "alias-target-changed");
      assertSanitizedRootChange(error, [first, second, alias, firstRepo, requested]);
      assert.deepEqual({ first: treeSnapshot(firstRepo), second: treeSnapshot(join(second, "repo")) }, before);
      zeroWriteNegatives += 1;
    });
  });

  await test("PRIV-ROOT", "physical root replacement keeps CLI and Hook errors path-free", () => {
    const root = makeRepo(join(fixtureRoot, "replace-root"));
    const displaced = join(fixtureRoot, "replace-root-before");
    withClarityRootRequest(() => {
      const handle = resolveClarityRoot(root);
      renameSync(root, displaced);
      makeRepo(root);
      const before = { current: treeSnapshot(root), previous: treeSnapshot(displaced) };
      const error = expectCode(() => safeWritePath(handle.root, ".clarity/project.json"), "clarity-root-changed");
      assert.equal(error.details.reason, "physical-root-replaced");
      assertSanitizedRootChange(error, [root, displaced, join(root, ".git"), join(displaced, ".git")]);
      assert.deepEqual({ current: treeSnapshot(root), previous: treeSnapshot(displaced) }, before);
      zeroWriteNegatives += 1;
    });
  });

  await test("ID-64", "filesystem identity preserves deterministic values above 2^53", () => {
    const shared = { ino: 18_014_398_509_481_999n, mode: 0o40755n, kind: "directory" };
    const firstDev = 9_007_199_254_740_992n;
    const secondDev = firstDev + 1n;
    assert.equal(Number(firstDev), Number(secondDev), "fixture must collide after Number conversion");
    const first = normalizeClarityFilesystemIdentityForTest({ ...shared, dev: firstDev });
    const firstAgain = normalizeClarityFilesystemIdentityForTest({ ...shared, dev: firstDev });
    const second = normalizeClarityFilesystemIdentityForTest({ ...shared, dev: secondDev });
    assert.deepEqual(first, firstAgain);
    assert.notDeepEqual(first, second);
    assert.equal(sameClarityFilesystemIdentityForTest(first, firstAgain), true);
    assert.equal(sameClarityFilesystemIdentityForTest(first, second), false);
    assert.equal(first.dev, firstDev.toString());
    assert.equal(second.dev, secondDev.toString());
    assert.equal(JSON.stringify(first), JSON.stringify(firstAgain));
    assert.doesNotThrow(() => JSON.stringify([first, second]));
    const zero = expectCode(() => normalizeClarityFilesystemIdentityForTest({ ...shared, dev: 0n }), "clarity-filesystem-identity-unavailable");
    assert.equal(zero.details.changed, false);
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

const failed = results.filter((row) => !row.ok);
process.stdout.write(`SPRINT047_PATCH004_PASS=${results.length - failed.length} FAIL=${failed.length} TOTAL=${results.length} CONFIG_MATRIX=8 DIRECT_BYTES_CHANGES=2 ZERO_WRITE_NEGATIVES=${zeroWriteNegatives} GIT_PROBES_PER_REQUEST=1 TIMEOUT_MS=5000 IDENTITY_PRECISION=PASS CLI_PATH_CANARIES=0 HOOK_PATH_CANARIES=0 WINDOWS_NATIVE=${process.platform === "win32" ? "RUN" : "NOT-RUN"} EXTERNAL_WRITES=0 NETWORK_CALLS=0\n`);
if (failed.length) process.exitCode = 1;
